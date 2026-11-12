/**
 * Bilan de campagne arrêté dans La Barre (point LB4 du programme Shinkiro).
 *
 * La Barre fige chaque version du bilan d'une campagne : identité stable,
 * numéro, date, campagne, marques, texte, note, décision, acteur déclaré,
 * empreinte de la version précédente et la sienne (SHA-256 du JSON aux clés
 * triées, sans les champs `empreinte` et `attestation`). Servie derrière La Fusée,
 * une version porte aussi l'attestation posée à son enregistrement par la session
 * (ADR-0245) ; elle est vérifiée à la réception. Ce module relit cette forme telle que
 * La Barre l'a enregistrée, recalcule l'empreinte et refuse ce qui ne
 * correspond pas. Il ne décide rien : la réception range une preuve, jamais
 * une décision de marque ni une valeur de pilier.
 *
 * Layer 0 : pas d'accès base ni réseau. Jeu commun aux deux dépôts :
 * `tests/fixtures/la-barre/bilan-campagne-v1.json`.
 */
import { createHash } from "node:crypto";
import { z } from "zod";
import { canonicalJson } from "./canonical-json";
import { BarreActorAttestationSchema } from "./barre-actor-attestation";

export const BARRE_CAMPAIGN_REVIEW_SCHEMA = "la-barre/bilan-campagne";
/** Capacité déclarée à La Barre dans `contexte.json`. */
export const BARRE_CAMPAIGN_REVIEW_RECEPTION = "CAMPAIGN_REVIEW_V1";

const HEX = /^[a-f0-9]{64}$/;
// Identifiants de La Barre : texte court, sans caractère de contrôle.
const Ident = z.string().min(1).max(240).regex(/^[^\u0000-\u001f\u007f]+$/);
const NullableText = (max: number) => z.string().max(max).nullable();
const Filled = (max: number) => z.string().max(max).refine((v) => v.trim() !== "", "Texte vide.");

/** Ce que le navigateur envoie : de quoi désigner la version, jamais son texte. */
export const BarreCampaignReviewRequestSchema = z.object({
  campagneId: Ident,
  bilanId: Ident,
  version: z.number().int().min(1).max(10_000),
  empreinte: z.string().regex(HEX),
}).strict();
export type BarreCampaignReviewRequest = z.infer<typeof BarreCampaignReviewRequestSchema>;

const Count = z.number().int().min(0).max(1_000_000);
/**
 * Compte des reprises au moment de l'arrêt (la-barre#27) : facturables au
 * client, à la charge de l'agence, non qualifiées, et écarts écartés à part.
 * Additif : absent des versions arrêtées avant ; aucun montant.
 */
const BarreReviewReprisesSchema = z.object({
  projets: Count, facturables: Count, chargeAgence: Count, nonQualifiees: Count, ecartes: Count,
  parOrigine: z.record(Ident, z.object({
    facturable: z.boolean().nullable(), n: z.number().int().min(1).max(1_000_000),
  }).strict()),
}).strict();

/** La version figée, champ pour champ. Aucune transformation : l'empreinte
 * se calcule sur ce que La Barre a écrit, pas sur une forme nettoyée. */
export const BarreCampaignReviewSchema = z.object({
  schema: z.literal(BARRE_CAMPAIGN_REVIEW_SCHEMA),
  schemaVersion: z.literal(1),
  id: Ident,
  version: z.number().int().min(1).max(10_000),
  arrete_le: z.iso.datetime(),
  campagne: z.object({
    id: Ident, nom: NullableText(300), regime: NullableText(80), occasion: NullableText(120),
    debut: NullableText(40), fin: NullableText(40),
  }).strict(),
  marques: z.array(z.object({ id: Ident, nom: NullableText(300) }).strict()).max(50),
  contenu: Filled(60_000),
  note: Filled(4_000).nullable(),
  /** Compte des reprises (la-barre#27), scellé dans l'empreinte ; absent avant. */
  reprises: BarreReviewReprisesSchema.optional(),
  precedente: z.string().regex(HEX).nullable(),
  decision: Ident,
  qui: Ident,
  acteur: z.object({
    personneId: z.string().max(240).nullable(), nom: NullableText(300), poste: NullableText(120),
    postes: z.array(z.string().max(120)).max(30).optional(),
  }).strict().nullable(),
  empreinte: z.string().regex(HEX),
  /** Posée par La Fusée à l'enregistrement (LB3) ; absente des versions arrêtées avant ou hors de La Fusée. */
  attestation: BarreActorAttestationSchema.optional(),
}).strict().superRefine((review, ctx) => {
  if ((review.version === 1) !== (review.precedente === null)) {
    ctx.addIssue({ code: "custom", path: ["precedente"], message: "Seule la première version n’a pas de précédente." });
  }
  if (review.version > 1 && review.note === null) {
    ctx.addIssue({ code: "custom", path: ["note"], message: "Une nouvelle version dit ce qu’elle change." });
  }
});
export type BarreCampaignReview = z.infer<typeof BarreCampaignReviewSchema>;


/**
 * SHA-256 de la version sans ses champs `empreinte` et `attestation`, comme La
 * Barre la scelle : l'attestation est posée après l'arrêt, elle désigne ce contenu.
 */
export function barreCampaignReviewDigest(review: Record<string, unknown>): string {
  const { empreinte: _sealed, attestation: _attested, ...content } = review;
  return createHash("sha256").update(canonicalJson(content), "utf8").digest("hex");
}

export type BarreReviewRefusal =
  | "REVIEW_NOT_FOUND" | "REVIEW_AMBIGUOUS" | "REVIEW_INVALID"
  | "REVIEW_DIGEST_INVALID" | "REVIEW_DIGEST_MISMATCH" | "REVIEW_CHAIN_MISMATCH" | "REVIEW_ATTESTATION_INVALID";

export const BARRE_REVIEW_REFUSALS: Record<BarreReviewRefusal, { status: number; message: string }> = {
  REVIEW_NOT_FOUND: { status: 404, message: "Cette version du bilan n’est pas dans la base enregistrée de La Barre. Attendez la fin de la sauvegarde, puis transmettez-la de nouveau." },
  REVIEW_AMBIGUOUS: { status: 409, message: "La base de La Barre porte deux fois cette campagne ou cette version. Rapprochez-les avant de transmettre." },
  REVIEW_INVALID: { status: 422, message: "Cette version du bilan n’a pas la forme attendue. Arrêtez-la de nouveau dans La Barre." },
  REVIEW_DIGEST_INVALID: { status: 422, message: "Le bilan enregistré ne correspond plus à son empreinte : il a été modifié après son arrêt. Arrêtez une nouvelle version." },
  REVIEW_DIGEST_MISMATCH: { status: 409, message: "L’empreinte transmise n’est pas celle de la version enregistrée. Rechargez La Barre avant de transmettre." },
  REVIEW_CHAIN_MISMATCH: { status: 409, message: "Cette version ne prolonge pas la précédente : leurs empreintes ne se suivent pas." },
  REVIEW_ATTESTATION_INVALID: { status: 422, message: "L’attestation de cette version n’a pas été posée par La Fusée sur ce contenu. Arrêtez une nouvelle version dans La Barre ouverte depuis La Fusée." },
};

const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

/**
 * Retrouve la version désignée dans la base La Barre enregistrée et la vérifie :
 * identité, forme, empreinte recalculée, empreinte demandée, attestation si elle
 * est présente (`verifyAttestation`, sceau de l'installation) et, si la version
 * précédente est présente, la chaîne des empreintes. Sans vérificateur, une
 * version attestée est refusée : on ne range pas une attestation non vérifiée.
 */
export function locateBarreCampaignReview(data: unknown, request: BarreCampaignReviewRequest,
  verifyAttestation?: (review: Record<string, unknown>) => boolean):
  { ok: true; review: BarreCampaignReview } | { ok: false; code: BarreReviewRefusal } {
  const campagnes = Array.isArray(record(data)?.campagnes) ? record(data)!.campagnes as unknown[] : [];
  const matching = campagnes.map(record).filter((c): c is Record<string, unknown> => c?.id === request.campagneId);
  if (matching.length > 1) return { ok: false, code: "REVIEW_AMBIGUOUS" };
  const versions = Array.isArray(matching[0]?.bilanVersions) ? matching[0]!.bilanVersions as unknown[] : [];
  const rows = versions.map(record).filter((v): v is Record<string, unknown> => v !== null);
  const found = rows.filter((v) => v.version === request.version && v.id === request.bilanId);
  if (found.length > 1) return { ok: false, code: "REVIEW_AMBIGUOUS" };
  const raw = found[0];
  if (!raw) return { ok: false, code: "REVIEW_NOT_FOUND" };
  let digest: string;
  try { digest = barreCampaignReviewDigest(raw); } catch { return { ok: false, code: "REVIEW_INVALID" }; }
  const parsed = BarreCampaignReviewSchema.safeParse(raw);
  if (!parsed.success || parsed.data.campagne.id !== request.campagneId) return { ok: false, code: "REVIEW_INVALID" };
  if (digest !== parsed.data.empreinte) return { ok: false, code: "REVIEW_DIGEST_INVALID" };
  if (parsed.data.empreinte !== request.empreinte) return { ok: false, code: "REVIEW_DIGEST_MISMATCH" };
  if (parsed.data.attestation && !verifyAttestation?.(raw)) return { ok: false, code: "REVIEW_ATTESTATION_INVALID" };
  const previous = rows.filter((v) => v.version === request.version - 1 && v.id === request.bilanId);
  if (previous.length === 1 && previous[0]!.empreinte !== parsed.data.precedente) return { ok: false, code: "REVIEW_CHAIN_MISMATCH" };
  return { ok: true, review: parsed.data };
}
