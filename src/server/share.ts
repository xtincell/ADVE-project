import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getAuthSecretKey } from "@/lib/session-token";
import type { OracleDocument } from "@/domain/oracle";
import { ORACLE_KIND, getLatestDeliverable, parseOracleDocument } from "./deliverables";
import { getLeadReport, type LeadReport } from "./funnel";
import { logAudit } from "./audit";

/**
 * Share — circulation publique des livrables par lien signé (WP-023).
 *
 * Port de l'esprit de legacy `//shared/strategy/[token]` et
 * `//intake/[token]/result`, SANS table : le token est un JWT HS256 signé
 * avec AUTH_SECRET (même clé que la session — les schémas Zod cloisonnent).
 * Chaque usage porte un claim `scope` discriminant : un token de session ne
 * passe jamais pour un token de partage, un token Oracle ne résout jamais un
 * rapport, et réciproquement.
 *
 * Limite assumée V1 (documentée dans l'UI) : stateless ⇒ NON RÉVOCABLE.
 * Un lien émis reste valable 30 jours quoi qu'il arrive — la révocation
 * anticipée exigerait un nonce persistable (table), refusée à ce WP.
 *
 * La partie signature/vérification est PURE (jose + Zod, zéro IO) et testée
 * sans DB dans tests/share.test.ts ; seuls les résolveurs lisent la base.
 */

// ── Constantes & schémas (purs) ────────────────────────────────────────

/** 30 jours — durée de vie des liens de partage (Oracle ET rapport). */
export const SHARE_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

const JWT_ALG = "HS256";

export const ORACLE_SHARE_SCOPE = "share.oracle";
export const RAPPORT_SHARE_SCOPE = "share.rapport";

/** Claims d'un lien de partage d'Oracle : le livrable ET sa marque (anti-mix). */
export const oracleShareClaimsSchema = z.object({
  scope: z.literal(ORACLE_SHARE_SCOPE),
  deliverableId: z.string().min(1),
  brandId: z.string().min(1),
});
export type OracleShareClaims = z.infer<typeof oracleShareClaimsSchema>;

/** Claims d'un lien de rapport ADVE complet du funnel. */
export const rapportShareClaimsSchema = z.object({
  scope: z.literal(RAPPORT_SHARE_SCOPE),
  leadId: z.string().min(1),
});
export type RapportShareClaims = z.infer<typeof rapportShareClaimsSchema>;

// ── Signature / vérification (pures — testables sans DB) ──────────────

async function signShareToken(
  claims: OracleShareClaims | RapportShareClaims,
  secret: Uint8Array,
  maxAgeSeconds: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt(now)
    .setExpirationTime(now + maxAgeSeconds)
    .sign(secret);
}

/** Signe un token de partage d'Oracle (30 j par défaut). */
export async function signOracleShareToken(
  claims: { deliverableId: string; brandId: string },
  secret: Uint8Array,
  maxAgeSeconds: number = SHARE_TOKEN_TTL_SECONDS,
): Promise<string> {
  return signShareToken({ scope: ORACLE_SHARE_SCOPE, ...claims }, secret, maxAgeSeconds);
}

/** Signe un token de rapport ADVE (30 j par défaut). */
export async function signRapportShareToken(
  claims: { leadId: string },
  secret: Uint8Array,
  maxAgeSeconds: number = SHARE_TOKEN_TTL_SECONDS,
): Promise<string> {
  return signShareToken({ scope: RAPPORT_SHARE_SCOPE, ...claims }, secret, maxAgeSeconds);
}

async function verifyShareToken(token: string, secret: Uint8Array): Promise<unknown> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: [JWT_ALG] });
    return payload;
  } catch {
    return null; // signature invalide, token expiré, malformé…
  }
}

/**
 * Vérifie un token de partage d'Oracle : signature + expiration + FORME
 * (scope compris — un token de session ou de rapport est rejeté). Null sur
 * tout token invalide, jamais de throw.
 */
export async function verifyOracleShareToken(
  token: string,
  secret: Uint8Array,
): Promise<OracleShareClaims | null> {
  const payload = await verifyShareToken(token, secret);
  const parsed = oracleShareClaimsSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

/** Idem pour un token de rapport ADVE. */
export async function verifyRapportShareToken(
  token: string,
  secret: Uint8Array,
): Promise<RapportShareClaims | null> {
  const payload = await verifyShareToken(token, secret);
  const parsed = rapportShareClaimsSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

// ── Génération des liens (côté serveur, secret résolu par l'env) ──────

export interface ShareLink {
  /** Chemin relatif — l'origine est résolue côté client (host public inconnu ici). */
  path: string;
  expiresAt: Date;
}

/**
 * Génère le lien public de l'Oracle courant d'une marque — mutation
 * EXPLICITE (bouton « Partager ») : AuditLog `deliverable.share` à chaque
 * génération (jamais le token dans le payload — c'est un secret porteur).
 * Null si aucun Oracle composé (ou contenu illisible) : rien à partager.
 *
 * Le token pointe le Deliverable par id ; la recomposition upsert le même
 * enregistrement ⇒ le lien montre toujours la DERNIÈRE composition.
 */
export async function createOracleShareLink(input: {
  brandId: string;
  workspaceId: string;
  actorId: string;
}): Promise<ShareLink | null> {
  const deliverable = await getLatestDeliverable(input.brandId, ORACLE_KIND);
  if (!deliverable || !parseOracleDocument(deliverable.content)) return null;

  const expiresAt = new Date(Date.now() + SHARE_TOKEN_TTL_SECONDS * 1000);
  const token = await signOracleShareToken(
    { deliverableId: deliverable.id, brandId: input.brandId },
    getAuthSecretKey(),
  );

  await logAudit({
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    action: "deliverable.share",
    entity: "Deliverable",
    entityId: deliverable.id,
    payload: {
      kind: ORACLE_KIND,
      brandId: input.brandId,
      expiresAt: expiresAt.toISOString(),
    },
  });

  return { path: `/partage/oracle/${token}`, expiresAt };
}

/**
 * Lien vers le rapport ADVE complet d'un lead. Pure signature (aucune
 * écriture) : appelable au rendu de /intake/resultat sans violer la doctrine
 * « jamais de mutation au fil d'une visite de page ».
 */
export async function createRapportShareLink(leadId: string): Promise<ShareLink> {
  const expiresAt = new Date(Date.now() + SHARE_TOKEN_TTL_SECONDS * 1000);
  const token = await signRapportShareToken({ leadId }, getAuthSecretKey());
  return { path: `/intake/rapport/${token}`, expiresAt };
}

// ── Résolution (pages publiques → contenu, ou null = lien mort) ───────

export interface SharedOracle {
  document: OracleDocument;
  brandName: string;
  composedAt: Date | null;
}

/**
 * Résout un token de partage → Oracle publiable. Null = lien mort (token
 * expiré/falsifié, livrable disparu, marque incohérente, contenu illisible) —
 * la page publique rend alors sa page morte propre, jamais un doute.
 */
export async function resolveSharedOracle(token: string): Promise<SharedOracle | null> {
  const claims = await verifyOracleShareToken(token, getAuthSecretKey());
  if (!claims) return null;

  const db = getDb();
  const deliverable = await db.deliverable.findUnique({
    where: { id: claims.deliverableId },
    include: { brand: { select: { name: true } } },
  });
  if (!deliverable) return null;
  if (deliverable.brandId !== claims.brandId) return null;
  if (deliverable.kind !== ORACLE_KIND) return null;

  const document = parseOracleDocument(deliverable.content);
  if (!document) return null;

  return {
    document,
    brandName: deliverable.brand.name,
    composedAt: deliverable.composedAt,
  };
}

/**
 * Résout un token de rapport → rapport ADVE complet du lead (recalculé,
 * jamais stocké). Null = lien mort ou lead disparu.
 */
export async function resolveSharedRapport(token: string): Promise<LeadReport | null> {
  const claims = await verifyRapportShareToken(token, getAuthSecretKey());
  if (!claims) return null;
  return getLeadReport(claims.leadId);
}
