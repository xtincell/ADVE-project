import { createHash, randomBytes } from "node:crypto";
import { compare, hash } from "bcryptjs";
import type { Prisma, PrismaClient } from "@prisma/client";
import { getDb } from "@/lib/db";
import { rootSiteUrl } from "@/lib/hosts";
import type { SessionPayload } from "@/lib/session-token";
import { logAudit } from "./audit";

/**
 * Identity — inscription, vérification des credentials, résolution du
 * workspace de session, bootstrap opérateur, réinitialisation de mot de
 * passe (WP-022) et réglages du compte. Auth maison légère (bcrypt 12 +
 * JWT maison) : pas de NextAuth en v7 tant que credentials suffisent
 * (Google OAuth = extension ultérieure du même module).
 */

const BCRYPT_ROUNDS = 12;

export type IdentityErrorCode =
  | "EMAIL_TAKEN" // email déjà associé à un compte
  | "BAD_PASSWORD" // re-vérification du mot de passe courant échouée
  | "RESET_TOKEN_INVALID" // token inconnu, expiré ou déjà consommé
  | "RESET_REQUEST_USED"; // la demande a déjà servi — plus de lien à émettre

/** Erreur métier typée — les actions la mappent vers des messages FR. */
export class IdentityError extends Error {
  constructor(public readonly code: IdentityErrorCode) {
    super(code);
    this.name = "IdentityError";
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Slug URL-safe dérivé d'un nom : minuscules, sans diacritiques, `-` séparateur. */
export function deriveSlug(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // diacritiques
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return slug || "marque";
}

type DbClient = PrismaClient | Prisma.TransactionClient;

/** Slug de workspace unique : base, puis base-2, base-3… (jamais de collision silencieuse). */
async function uniqueWorkspaceSlug(db: DbClient, base: string): Promise<string> {
  const taken = await db.workspace.findMany({
    where: { OR: [{ slug: base }, { slug: { startsWith: `${base}-` } }] },
    select: { slug: true },
  });
  const takenSet = new Set(taken.map((w) => w.slug));
  if (!takenSet.has(base)) return base;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${base}-${i}`;
    if (!takenSet.has(candidate)) return candidate;
  }
  return `${base}-${randomBytes(3).toString("hex")}`;
}

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  brandName: string;
};

/**
 * Inscription fondateur : User + Workspace(kind=BRAND, slug dérivé du nom de
 * marque) + Membership OWNER + Brand LATENT — une seule transaction, tracée
 * `user.register`. Retourne le payload de session prêt à signer.
 */
export async function registerUser(input: RegisterInput): Promise<SessionPayload> {
  const db = getDb();
  const email = normalizeEmail(input.email);

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new IdentityError("EMAIL_TAKEN");

  const passwordHash = await hash(input.password, BCRYPT_ROUNDS);

  const session = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, name: input.name.trim() || null, passwordHash },
    });
    const slug = await uniqueWorkspaceSlug(tx, deriveSlug(input.brandName));
    const workspace = await tx.workspace.create({
      data: { slug, name: input.brandName.trim(), kind: "BRAND" },
    });
    await tx.membership.create({
      data: { userId: user.id, workspaceId: workspace.id, role: "OWNER" },
    });
    // La marque naît LATENT (défaut schéma) — le diagnostic la fera décoller.
    const brand = await tx.brand.create({
      data: { workspaceId: workspace.id, slug, name: input.brandName.trim() },
    });
    await logAudit(
      {
        workspaceId: workspace.id,
        actorId: user.id,
        action: "user.register",
        entity: "User",
        entityId: user.id,
        payload: { email, workspaceSlug: slug, brandId: brand.id },
      },
      tx,
    );
    return {
      userId: user.id,
      workspaceId: workspace.id,
      role: "OWNER",
      workspaceKind: "BRAND",
    } satisfies SessionPayload;
  });

  // Bootstrap opérateur : best-effort, hors transaction — ne bloque jamais
  // l'inscription d'un client si l'env est incomplet.
  await ensureOperatorAccount().catch((err) => {
    console.error("[identity] ensureOperatorAccount a échoué :", err);
  });

  return session;
}

/** Hash bcrypt d'une valeur jetable — comparé quand l'email est inconnu pour
 *  garder un temps de réponse constant (anti-énumération d'emails). */
const DUMMY_HASH = "$2b$12$9ZM/n4EQPoHYx22KU2heG.tQ.6W/XNh85py3rjR88KiARvrVom4Iy";

/**
 * Vérifie email + mot de passe. Retourne le payload de session, ou null
 * (utilisateur inconnu, pas de mot de passe, mot de passe faux, sans
 * distinction observable).
 */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<SessionPayload | null> {
  const db = getDb();
  const user = await db.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: { id: true, passwordHash: true },
  });

  const ok = await compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user?.passwordHash || !ok) return null;

  return getUserWorkspace(user.id);
}

/**
 * Workspace de session d'un user : sa membership AGENCY d'abord (un opérateur
 * atterrit côté admin), sinon la première membership créée. Null si aucune.
 */
export async function getUserWorkspace(userId: string): Promise<SessionPayload | null> {
  const db = getDb();
  const memberships = await db.membership.findMany({
    where: { userId },
    orderBy: { id: "asc" },
    select: { role: true, workspaceId: true, workspace: { select: { kind: true } } },
  });
  const preferred =
    memberships.find((m) => m.workspace.kind === "AGENCY") ?? memberships[0];
  if (!preferred) return null;
  return {
    userId,
    workspaceId: preferred.workspaceId,
    role: preferred.role,
    workspaceKind: preferred.workspace.kind,
  };
}

/**
 * Compte opérateur bootstrap — permet au premier déploiement d'avoir un accès
 * /admin sans seed manuel. Ne fait RIEN sauf si OPERATOR_EMAIL est défini et
 * absent en base. Crée alors : User (mot de passe = OPERATOR_PASSWORD, sinon
 * aléatoire loggé UNE fois — à changer immédiatement) + Workspace AGENCY
 * « upgraders » + Membership OPERATOR. Tracé `operator.bootstrap`.
 * Appelée à chaque inscription (idempotente, 1 SELECT quand le compte existe).
 */
export async function ensureOperatorAccount(): Promise<void> {
  const operatorEmail = process.env.OPERATOR_EMAIL;
  if (!operatorEmail) return;

  const db = getDb();
  const email = normalizeEmail(operatorEmail);
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return;

  let password = process.env.OPERATOR_PASSWORD;
  if (!password) {
    password = randomBytes(12).toString("base64url");
    // Seule trace du mot de passe généré — volontairement loggée une fois.
    console.warn(
      `[identity] Compte opérateur ${email} créé avec mot de passe généré : ${password} — le changer immédiatement.`,
    );
  }
  const passwordHash = await hash(password, BCRYPT_ROUNDS);

  await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, name: "Opérateur UPgraders", passwordHash },
    });
    const slug = await uniqueWorkspaceSlug(tx, "upgraders");
    const workspace = await tx.workspace.create({
      data: { slug, name: "UPgraders", kind: "AGENCY" },
    });
    await tx.membership.create({
      data: { userId: user.id, workspaceId: workspace.id, role: "OPERATOR" },
    });
    await logAudit(
      {
        workspaceId: workspace.id,
        actorId: user.id,
        action: "operator.bootstrap",
        entity: "User",
        entityId: user.id,
        payload: { email, workspaceSlug: slug },
      },
      tx,
    );
  });
}

// ═══ Réinitialisation de mot de passe (WP-022) ══════════════════════════
//
// Réalité v7 assumée : AUCUN provider email n'est branché. Le flux est donc
// l'acquis « validation manuelle » appliqué à l'auth :
//   1. /mot-de-passe-oublie enregistre la demande (token minté, SEULE son
//      empreinte SHA-256 en base) — réponse identique que le compte existe
//      ou non (anti-énumération, comme verifyCredentials) ;
//   2. l'opérateur voit la file dans /admin/utilisateurs et ÉMET le lien
//      (rotation du hash — le clair ne s'affiche qu'une fois) qu'il transmet
//      par WhatsApp ;
//   3. /reinitialiser/[token] vérifie hash + TTL + usage unique et pose le
//      nouveau mot de passe (bcrypt 12), le tout audité sur la chaîne système.
//
// OUTBOUND_EMAIL (env) est le gate du futur envoi direct — tant qu'aucun
// provider n'est réellement branché, on n'envoie RIEN (jamais de fake envoi).

/** TTL d'un lien de réinitialisation : 1 heure (parité legacy auth router). */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Token opaque URL-safe — 32 octets d'aléa (base64url, ~43 caractères). */
export function generateResetToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Empreinte stockée en base : SHA-256 hex du token clair (jamais le clair —
 *  un dump de base ne donne aucun lien utilisable). */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type ResetTokenState = "VALID" | "USED" | "EXPIRED";

/** Règle pure TTL + usage unique. USED prime sur EXPIRED (l'usage est le
 *  fait irréversible) ; à l'instant exact d'expiration, le token est mort. */
export function resetTokenState(
  row: { expiresAt: Date; usedAt: Date | null },
  now: Date = new Date(),
): ResetTokenState {
  if (row.usedAt) return "USED";
  if (now.getTime() >= row.expiresAt.getTime()) return "EXPIRED";
  return "VALID";
}

/** URL publique du formulaire de réinitialisation — pure (base explicite).
 *  Même base que robots.ts/sitemap.ts : NEXT_PUBLIC_APP_URL, fallback la
 *  racine sous-domaines (lib/hosts, WP-025). */
export function buildResetUrl(
  token: string,
  base: string = process.env.NEXT_PUBLIC_APP_URL ?? rootSiteUrl(),
): string {
  return `${base.replace(/\/+$/, "")}/reinitialiser/${encodeURIComponent(token)}`;
}

/**
 * Enregistre une demande de réinitialisation. Ne révèle JAMAIS si le compte
 * existe (résout sans erreur dans les deux cas). Une seule demande active par
 * compte : les tokens non consommés précédents sont supprimés (ce sont des
 * secrets périmés, pas de la donnée métier — la demande, elle, est auditée).
 * Chaîne d'audit SYSTÈME (workspaceId null) : le demandeur n'a pas de session.
 */
export async function requestPasswordReset(emailRaw: string): Promise<void> {
  const db = getDb();
  const email = normalizeEmail(emailRaw);
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return; // réponse UI identique — anti-énumération d'emails

  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await db.$transaction(async (tx) => {
    await tx.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    const row = await tx.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashResetToken(token), expiresAt },
    });
    await logAudit(
      {
        workspaceId: null,
        actorId: user.id,
        action: "user.password_reset.request",
        entity: "PasswordResetToken",
        entityId: row.id,
        payload: { email },
      },
      tx,
    );
  });

  if (process.env.OUTBOUND_EMAIL) {
    // TODO résiduel (WP-022) : brancher ici un provider d'envoi réel sur
    // OUTBOUND_EMAIL et expédier buildResetUrl(token) au compte. Tant que ce
    // branchement n'existe pas, AUCUN envoi n'est simulé — le canal reste
    // l'émission manuelle du lien par l'opérateur dans /admin/utilisateurs.
    console.warn(
      "[identity] OUTBOUND_EMAIL est configuré mais aucun provider d'envoi n'est branché (résidu WP-022) — le lien reste transmis par l'opérateur.",
    );
  }
  // `token` (clair) est volontairement abandonné ici : sans provider email,
  // seul un lien fraîchement émis par l'opérateur (rotation) est utilisable.
}

/** État d'un token présenté à /reinitialiser/[token] — UNKNOWN = inconnu en
 *  base (l'UI affiche le même message qu'expiré/consommé : rien à énumérer). */
export async function getResetTokenState(token: string): Promise<ResetTokenState | "UNKNOWN"> {
  if (!token || token.length < 20 || token.length > 128) return "UNKNOWN";
  const db = getDb();
  const row = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    select: { expiresAt: true, usedAt: true },
  });
  return row ? resetTokenState(row) : "UNKNOWN";
}

/**
 * Consomme un token valide et pose le nouveau mot de passe (bcrypt 12) —
 * usage unique garanti par flip conditionnel `updateMany` (une course de
 * deux soumissions ne consomme qu'une fois). Audité `user.password_reset.complete`.
 *
 * Résidu documenté : v7 n'a pas de rotation de version de session (JWT
 * stateless 30 j, middleware sans DB par doctrine WP-003) — les sessions déjà
 * ouvertes restent valides jusqu'à leur expiration. Dit en clair dans l'UI.
 */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
  const db = getDb();
  const row = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
  if (!row || resetTokenState(row) !== "VALID") throw new IdentityError("RESET_TOKEN_INVALID");

  const passwordHash = await hash(newPassword, BCRYPT_ROUNDS);

  await db.$transaction(async (tx) => {
    const consumed = await tx.passwordResetToken.updateMany({
      where: { id: row.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (consumed.count === 0) throw new IdentityError("RESET_TOKEN_INVALID"); // course perdue
    await tx.user.update({ where: { id: row.userId }, data: { passwordHash } });
    await logAudit(
      {
        workspaceId: null,
        actorId: row.userId,
        action: "user.password_reset.complete",
        entity: "User",
        entityId: row.userId,
      },
      tx,
    );
  });
}

export type ResetRequestRow = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  expiresAt: Date;
  state: ResetTokenState;
};

/** File des demandes EN ATTENTE (non consommées) pour /admin/utilisateurs —
 *  une demande expirée reste listée : l'opérateur peut ré-émettre un lien. */
export async function listResetRequests(limit = 20): Promise<ResetRequestRow[]> {
  const db = getDb();
  const rows = await db.passwordResetToken.findMany({
    where: { usedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { email: true, name: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    email: row.user.email,
    name: row.user.name,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    state: resetTokenState(row),
  }));
}

/**
 * Émission opérateur du lien : ROTATION du token de la demande (nouveau clair,
 * nouveau hash, TTL repart pour 1 h) — le lien retourné ne s'affiche qu'une
 * fois et invalide tout lien précédemment émis pour cette demande. Refusé si
 * la demande a déjà servi. Audité `user.password_reset.link_issue` (jamais le
 * token ni son hash dans le payload).
 */
export async function issueResetLink(
  requestId: string,
  actorId: string,
): Promise<{ url: string; email: string; expiresAt: Date }> {
  const db = getDb();
  const row = await db.passwordResetToken.findUnique({
    where: { id: requestId },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!row || row.usedAt) throw new IdentityError("RESET_REQUEST_USED");

  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await db.$transaction(async (tx) => {
    const rotated = await tx.passwordResetToken.updateMany({
      where: { id: requestId, usedAt: null },
      data: { tokenHash: hashResetToken(token), expiresAt },
    });
    if (rotated.count === 0) throw new IdentityError("RESET_REQUEST_USED");
    await logAudit(
      {
        workspaceId: null,
        actorId,
        action: "user.password_reset.link_issue",
        entity: "PasswordResetToken",
        entityId: requestId,
        payload: { targetUserId: row.user.id, expiresAt: expiresAt.toISOString() },
      },
      tx,
    );
  });

  return { url: buildResetUrl(token), email: row.user.email, expiresAt };
}

// ═══ Réglages du compte (/reglages, WP-022) ═════════════════════════════

export type AccountOverview = {
  user: { id: string; email: string; name: string | null; createdAt: Date };
  memberships: Array<{
    workspaceId: string;
    workspaceName: string;
    workspaceSlug: string;
    workspaceKind: "AGENCY" | "BRAND";
    role: "OWNER" | "OPERATOR" | "MEMBER" | "CLIENT";
    current: boolean; // workspace de la session en cours
  }>;
};

/** Le compte vu par son titulaire : identité + tous ses espaces et rôles. */
export async function getAccountOverview(session: SessionPayload): Promise<AccountOverview | null> {
  const db = getDb();
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      memberships: {
        orderBy: { id: "asc" },
        select: {
          workspaceId: true,
          role: true,
          workspace: { select: { name: true, slug: true, kind: true } },
        },
      },
    },
  });
  if (!user) return null;
  return {
    user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
    memberships: user.memberships.map((m) => ({
      workspaceId: m.workspaceId,
      workspaceName: m.workspace.name,
      workspaceSlug: m.workspace.slug,
      workspaceKind: m.workspace.kind,
      role: m.role,
      current: m.workspaceId === session.workspaceId,
    })),
  };
}

/** Re-vérification du mot de passe courant (email / mot de passe) — temps
 *  constant via DUMMY_HASH, comme verifyCredentials. */
async function assertCurrentPassword(userId: string, currentPassword: string): Promise<void> {
  const db = getDb();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  const ok = await compare(currentPassword, user?.passwordHash ?? DUMMY_HASH);
  if (!user?.passwordHash || !ok) throw new IdentityError("BAD_PASSWORD");
}

/** Changement du nom affiché — audité avant/après sur la chaîne du workspace
 *  de session (l'acteur agit connecté). */
export async function updateAccountName(session: SessionPayload, nameRaw: string): Promise<void> {
  const db = getDb();
  const name = nameRaw.trim();
  const before = await db.user.findUniqueOrThrow({
    where: { id: session.userId },
    select: { name: true },
  });
  if (before.name === (name || null)) return; // rien à changer, rien à auditer

  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: session.userId }, data: { name: name || null } });
    await logAudit(
      {
        workspaceId: session.workspaceId,
        actorId: session.userId,
        action: "user.profile.update",
        entity: "User",
        entityId: session.userId,
        payload: { field: "name", before: before.name, after: name || null },
      },
      tx,
    );
  });
}

/** Changement d'email — mot de passe courant re-vérifié (l'email est la clé
 *  de connexion), unicité contrôlée, avant/après audité. */
export async function changeUserEmail(
  session: SessionPayload,
  newEmailRaw: string,
  currentPassword: string,
): Promise<void> {
  await assertCurrentPassword(session.userId, currentPassword);

  const db = getDb();
  const email = normalizeEmail(newEmailRaw);
  const current = await db.user.findUniqueOrThrow({
    where: { id: session.userId },
    select: { email: true },
  });
  if (current.email === email) return; // rien à changer

  const taken = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (taken) throw new IdentityError("EMAIL_TAKEN");

  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: session.userId }, data: { email } });
    await logAudit(
      {
        workspaceId: session.workspaceId,
        actorId: session.userId,
        action: "user.email.change",
        entity: "User",
        entityId: session.userId,
        payload: { before: current.email, after: email },
      },
      tx,
    );
  });
}

/** Changement de mot de passe — courant re-vérifié, bcrypt 12, audité SANS
 *  aucun secret dans le payload. Ne déconnecte pas les sessions ouvertes
 *  (résidu documenté — voir resetPasswordWithToken). */
export async function changeUserPassword(
  session: SessionPayload,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await assertCurrentPassword(session.userId, currentPassword);

  const db = getDb();
  const passwordHash = await hash(newPassword, BCRYPT_ROUNDS);
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: session.userId }, data: { passwordHash } });
    await logAudit(
      {
        workspaceId: session.workspaceId,
        actorId: session.userId,
        action: "user.password.change",
        entity: "User",
        entityId: session.userId,
      },
      tx,
    );
  });
}
