/** Conservative wire validation. Argos-studio remains authority for its full taxonomy. */
import { z } from "zod";
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
