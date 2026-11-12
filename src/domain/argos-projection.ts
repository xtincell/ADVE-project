/**
 * Projection vers Argos-studio (SHK-0002) : contrat research-dossier-v1, slug, version et issues.
 * Conservative wire validation. Argos-studio remains authority for its full taxonomy.
 */
import { z } from "zod";
import type { ConnectorDegradationReason } from "./connector-result";
const text = z.string().trim().min(1).max(4000);
const index = z.number().int().nonnegative();
const attribution = z.enum(["PROVEN_CAUSAL", "CORRELATED", "ESTIMATED", "CLAIMED"]);
const goal = z.enum(["DIRECT_SALE", "AWARENESS", "CONSIDERATION", "CONVERSION", "RETENTION", "ADVOCACY", "BRAND_WORLD_BUILDING", "CATEGORY_DEFINITION", "CRISIS_RESPONSE", "RECRUITMENT"]);
const license = z.enum(["free-to-use", "press-kit", "fair-use", "creator-permission", "paid-license"]);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const https = z.url().max(2000).refine(v => { const u = new URL(v); return u.protocol === "https:" && !u.username && !u.password; });
export const argosResearchDossierSchema = z.object({
  schemaVersion: z.literal("research-dossier-v1"),
  researcher: z.object({ name: text, contact: z.email().optional(), toolUsed: text.optional() }), researchDate: date,
  operation: z.object({ title: text, brandEmitter: text, agencyCreator: text.optional(), sector: text, marketPrimary: text, marketsSecondary: z.array(text).max(30).default([]), emissionYear: z.number().int().min(1900).max(2100), campaignParent: text.optional() }),
  sources: z.array(z.object({ url: https, title: text, publisher: text.optional(), publishedDate: date.optional(), accessedDate: date, license, excerpt: text.optional(), role: z.enum(["primary", "secondary", "context"]) })).min(1).max(30),
  assets: z.array(z.object({ function: text, role: z.enum(["HERO", "PRIMARY", "DECLINATION", "COMPANION", "EXTRACTED"]), kind: z.enum(["IMAGE", "VIDEO", "AUDIO", "TEXT", "EMBED_YOUTUBE", "EMBED_VIMEO"]), url: z.string().max(2000), posterUrl: https.optional(), aspectRatio: z.enum(["1:1", "4:3", "3:4", "16:9", "9:16", "21:9", "4:5"]), text: text.optional(), format: text.optional(), caption: text.optional(), alt: text.optional(), durationSec: z.number().positive().optional(), sourceIndex: index.optional(), sourceLicense: license.optional() })).min(1).max(30),
  classification: z.object({ patternKind: z.enum(["IMAGE", "VIDEO", "AUDIO", "TEXT", "SPATIAL", "DIGITAL_INTERACTION", "MIXED", "BRAND_SYSTEM", "PERFORMANCE_LIVE", "EDITORIAL_LONG_FORM", "OBJECT", "SERVICE_SIGNATURE", "PERSONAL_BRAND", "RITUAL"]), manipulationMode: z.enum(["PEDDLER", "DEALER", "FACILITATOR", "ENTERTAINER"]), funnelStage: z.enum(["AWARENESS", "CONSIDERATION", "CONVERSION", "RETENTION", "ADVOCACY"]), pillars: z.array(z.enum(["A", "D", "V", "E", "R", "T", "I", "S"])).min(1).max(8), operationGoals: z.array(goal).min(1).max(10) }),
  axes: z.array(z.object({ name: text, value: text, confidence: z.number().min(0).max(1), evidence: text, sourceIndex: index.optional() })).min(1).max(30),
  performance: z.object({ composite: z.number().min(0).max(100).optional(), primaryGoals: z.array(goal).max(10).optional(), metrics: z.array(z.object({ kind: text, value: z.number(), displayValue: text.optional(), goal, scope: z.enum(["OPERATION", "ASSET"]), scopedAssetIndex: index.optional(), attribution, source: text, sourceIndex: index.optional(), measuredAtYearMonth: z.string().regex(/^\d{4}-\d{2}$/).optional() })).max(50).default([]), overallAttribution: attribution.optional(), rationale: text.optional() }),
  victoryTypes: z.array(text).max(30).default([]), filiations: z.array(z.object({ direction: z.enum(["inspires", "inspired_by"]), targetSlug: text, targetTitle: text.optional(), relationshipType: text, evidence: text.optional(), confidence: z.number().min(0).max(1).optional() })).max(30).default([]),
  summary: z.string().min(20).max(10000), patternObservation: z.string().min(20).max(10000).optional(), significance: z.string().min(20).max(10000).optional(), confidence: z.enum(["HIGH", "MEDIUM", "LOW", "ESTIMATED"]).default("MEDIUM"),
}).superRefine((v, ctx) => {
  if (v.assets.filter(a => a.role === "HERO").length !== 1) ctx.addIssue({ code: "custom", message: "Un seul actif HERO requis." });
  for (const a of v.assets) {
    if (a.kind === "TEXT" ? !a.text?.trim() : !https.safeParse(a.url).success) ctx.addIssue({ code: "custom", message: "Actif sans texte ou média HTTPS valide." });
  }
  for (const r of [...v.assets, ...v.axes, ...v.performance.metrics]) if (r.sourceIndex != null && r.sourceIndex >= v.sources.length) ctx.addIssue({ code: "custom", message: "Index de source hors bornes." });
  for (const m of v.performance.metrics) if (m.scope === "ASSET" && (m.scopedAssetIndex == null || m.scopedAssetIndex >= v.assets.length)) ctx.addIssue({ code: "custom", message: "Index d'actif hors bornes." });
  if (JSON.stringify(v).length > 100000) ctx.addIssue({ code: "custom", message: "Dossier trop volumineux." });
});
export const projectArgosInput = z.object({ dossierId: z.string().min(1), dossier: argosResearchDossierSchema });

// ── Projection vers Argos-studio : slug, version, issues (SHK-0002, F14) ──────

/**
 * Slug que la bibliothèque attribue à un dossier : `generateSlug` + `slugify`
 * d'Argos-studio (`app/src/lib/research-dossier.ts`, `app/src/lib/utils.ts`) —
 * `marque-titre-année`, accents retirés, coupé à 80 caractères sans retouche.
 * Sert seulement à lire la version courante avant un amendement ; le reçu du
 * studio porte le slug faisant foi. Distinct de `seshat/argos/uid.ts` (refs du
 * journal, 60 caractères).
 */
export function argosStudioSlug(operation: { brandEmitter: string; title: string; emissionYear: number }): string {
  return `${operation.brandEmitter}-${operation.title}-${operation.emissionYear}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Version courante d'une fiche : ETag de `GET /api/v1/references/{slug}?format=dossier`
 * (horodatage ISO entre guillemets). Le studio compare `If-Match` à cette valeur
 * sans ses guillemets ; une marque faible `W/` ajoutée par un intermédiaire est
 * donc retirée. Rend la valeur seule, ou null si l'en-tête est absent ou illisible.
 */
export function parseArgosStudioVersion(etag: string | null | undefined): string | null {
  const match = etag?.trim().match(/^(?:W\/)?"([^"\\\r\n]{1,100})"$/);
  return match ? match[1]! : null;
}

/** Motif précis d'une projection non aboutie, en plus de la raison commune du connecteur. */
export const ARGOS_PROJECTION_DETAILS = [
  /** 400/422 : le studio refuse le contrat du dossier ; rien n'est enregistré. */
  "REMOTE_CONTRACT_REJECTED",
  /** 409 : la fiche a changé entre la lecture de sa version et l'écriture ; rien n'est écrasé. */
  "VERSION_CONFLICT",
  /** 409 : la visibilité demandée contredit celle de la fiche. */
  "VISIBILITY_CONFLICT",
  /** 409 à la lecture : fiche ancienne sans dossier d'origine, version illisible. */
  "SOURCE_DOSSIER_UNAVAILABLE",
  /** Lecture de version hors contrat (ETag absent, 404 non conforme). */
  "VERSION_UNREADABLE",
  /** Adresse du connecteur refusée (HTTPS public, sans paramètres ni identifiants). */
  "ENDPOINT_REFUSED",
] as const;
export type ArgosProjectionDetail = (typeof ARGOS_PROJECTION_DETAILS)[number];

/** Effet de l'écriture, déduit du reçu : création, amendement, ou même contenu rejoué. */
export type ArgosProjectionChange = "CREATED" | "AMENDED" | "UNCHANGED";

export type ArgosProjectionOutcome =
  | { state: "LIVE"; change: ArgosProjectionChange; receipt: { slug: string } }
  | { state: "DEFERRED_AWAITING_CREDENTIALS" }
  | { state: "DEGRADED"; reason: ConnectorDegradationReason; detail?: ArgosProjectionDetail };

const DETAIL_MESSAGE: Record<ArgosProjectionDetail, string> = {
  REMOTE_CONTRACT_REJECTED: "La bibliothèque refuse le contenu du dossier ; rien n'a été enregistré.",
  VERSION_CONFLICT: "La fiche a changé dans la bibliothèque pendant la projection ; rien n'a été écrasé. Relancez la projection : elle relira la version courante.",
  VISIBILITY_CONFLICT: "La visibilité demandée contredit celle de la fiche ; elle se change dans Argos-studio, pas par une projection.",
  SOURCE_DOSSIER_UNAVAILABLE: "Cette fiche ancienne n'a pas conservé son dossier d'origine : sa version ne peut pas être lue, la projection ne l'amende pas.",
  VERSION_UNREADABLE: "La bibliothèque n'a pas donné de version lisible pour cette fiche ; la projection s'est arrêtée avant d'écrire.",
  ENDPOINT_REFUSED: "L'adresse du connecteur Argos-studio est refusée : HTTPS public, sans paramètres ni identifiants.",
};

const REASON_MESSAGE: Record<ConnectorDegradationReason, string> = {
  VENDOR_OUTAGE: "La bibliothèque n'a pas répondu (délai, réseau ou erreur serveur) ; l'enregistrement n'est pas confirmé.",
  RATE_LIMITED: "La bibliothèque limite les envois pour l'instant ; réessayez plus tard.",
  AUTH_REVOKED: "La bibliothèque refuse la clé du connecteur ; vérifiez-la dans les connexions.",
  INSUFFICIENT_DATA: "La réponse de la bibliothèque est incomplète ; l'enregistrement n'est pas confirmé.",
  MISSING_PREREQUISITE: "Un prérequis manque pour projeter ce dossier.",
};

/** Phrase opérateur pour l'issue d'une projection (console, journal). */
export function describeArgosProjection(outcome: ArgosProjectionOutcome): string {
  switch (outcome.state) {
    case "LIVE":
      return outcome.change === "CREATED"
        ? `Fiche « ${outcome.receipt.slug} » créée dans la bibliothèque.`
        : outcome.change === "AMENDED"
          ? `Fiche « ${outcome.receipt.slug} » amendée depuis sa version courante.`
          : `Fiche « ${outcome.receipt.slug} » déjà à jour : même contenu, rien n'a changé.`;
    case "DEFERRED_AWAITING_CREDENTIALS":
      return "Connecteur Argos-studio non configuré : rien n'a été envoyé.";
    case "DEGRADED":
      return outcome.detail ? DETAIL_MESSAGE[outcome.detail] : REASON_MESSAGE[outcome.reason];
  }
}
