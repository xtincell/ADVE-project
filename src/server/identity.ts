import { randomBytes } from "node:crypto";
import { compare, hash } from "bcryptjs";
import type { Prisma, PrismaClient } from "@prisma/client";
import { getDb } from "@/lib/db";
import type { SessionPayload } from "@/lib/session-token";
import { logAudit } from "./audit";

/**
 * Identity — inscription, vérification des credentials, résolution du
 * workspace de session, bootstrap opérateur. Auth maison légère (bcrypt 12 +
 * JWT maison) : pas de NextAuth en v7 tant que credentials suffisent
 * (Google OAuth = extension ultérieure du même module).
 */

const BCRYPT_ROUNDS = 12;

/** Erreur métier typée — les actions la mappent vers des messages FR. */
export class IdentityError extends Error {
  constructor(public readonly code: "EMAIL_TAKEN") {
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
