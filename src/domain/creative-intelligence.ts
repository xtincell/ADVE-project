/** ADR-0194 — versioned observations, never a causal or brand-force score. */
import { z } from "zod";

export const TAXONOMY_VERSION = "creative-v1";
export const RECIPE_SCHEMA = "creative-recipe-v1";
export const platformSchema = z.enum(["TIKTOK", "YOUTUBE", "INSTAGRAM", "FACEBOOK", "LINKEDIN", "OTHER"]);
export const visibilitySchema = z.enum(["PUBLIC", "BRAND"]);
const text = z.string().trim().min(1).max(200);
const url = z.url().max(2000).refine(v => new URL(v).protocol === "https:", "Une URL HTTPS est requise.");
export const specimenInputSchema = z.object({
  strategyId: z.string().min(1).optional(), visibility: visibilitySchema,
  platform: platformSchema, accountId: text, externalId: text,
  sourceUrl: url, mediaUrl: url.optional(), caption: z.string().max(10000).optional(),
  format: z.enum(["SHORT_VIDEO", "LONG_VIDEO", "VIDEO_UNCLASSIFIED", "IMAGE", "TEXT"]),
  sector: text, countryCode: z.string().regex(/^[A-Z]{2}$/),
  publishedAt: z.coerce.date(), source: text,
}).refine(v => v.visibility === "BRAND" ? !!v.strategyId : !v.strategyId, "Un contenu privé doit être rattaché à une marque ; un contenu public ne porte pas de marque privée.");

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable();
export const metricValuesSchema = z.object({
  observedAt: z.coerce.date(),
  views: count.optional(), reach: count.optional(), likes: count.optional(),
  comments: count.optional(), shares: count.optional(), followersAtObservation: count.optional(),
  paidStatus: z.enum(["ORGANIC", "PAID", "UNKNOWN"]).default("UNKNOWN"),
  source: text, sourceUrl: url,
}).refine(v => [v.views, v.reach, v.likes, v.comments, v.shares].some(x => x != null), "Au moins une mesure observée est requise.");
export const metricInputSchema = metricValuesSchema.safeExtend({ strategyId: z.string().optional(), specimenId: text });

export const annotationSchema = z.object({
  hook: z.enum(["CURIOSITY", "CONTRARIAN", "QUESTION", "DEMONSTRATION", "CONFESSION", "RESULT_FIRST", "OTHER"]),
  narrative: z.enum(["PROBLEM_SOLUTION", "TRANSFORMATION", "CHALLENGE", "REVELATION", "COMPARISON", "LOOP", "OTHER"]),
  visual: z.enum(["POV", "TALKING_HEAD", "MACRO", "SPLIT_SCREEN", "SCREENSHOT", "REACTION", "OTHER"]),
  socialDriver: z.enum(["IDENTITY", "DEBATE", "ASPIRATION", "UTILITY", "HUMOUR", "PARTICIPATION", "OTHER"]),
  durationSeconds: z.number().positive().max(86400).optional(),
  evidence: z.array(z.object({
    field: z.enum(["hook", "narrative", "visual", "socialDriver"]),
    observation: z.string().trim().min(1).max(1200),
    startSeconds: z.number().nonnegative().optional(), endSeconds: z.number().nonnegative().optional(),
    confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
  }).refine(v => v.endSeconds == null || (v.startSeconds != null && v.endSeconds >= v.startSeconds), "Intervalle temporel invalide.")).min(4).max(20),
  caveats: z.array(z.string().max(400)).max(10).default([]),
}).superRefine((v, ctx) => {
  for (const field of ["hook", "narrative", "visual", "socialDriver"] as const) {
    if (!v.evidence.some(e => e.field === field)) ctx.addIssue({ code: "custom", message: `Observation manquante : ${field}` });
  }
  if (v.durationSeconds != null && v.evidence.some(e => (e.endSeconds ?? e.startSeconds ?? 0) > v.durationSeconds!)) ctx.addIssue({ code: "custom", message: "Observation hors de la durée du contenu." });
});
export const analysisInputSchema = z.object({
  strategyId: z.string().optional(), specimenId: text, annotation: annotationSchema,
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
});
export const recipeInputSchema = z.object({
  strategyId: z.string().optional(), sector: text, countryCode: z.string().regex(/^[A-Z]{2}$/),
  platform: platformSchema, format: specimenInputSchema.shape.format,
  hook: annotationSchema.shape.hook, narrative: annotationSchema.shape.narrative, visual: annotationSchema.shape.visual,
  metric: z.enum(["views", "reach"]).default("views"), asOf: z.coerce.date(),
});
export const watchlistSchema = z.array(z.object({
  brandRefId: text, relationship: z.enum(["COMMERCIAL", "ATTENTION", "INSPIRATION"]),
  accounts: z.array(z.object({ platform: platformSchema, accountId: text, url })).max(12),
})).max(30);
export type Annotation = z.infer<typeof annotationSchema>;
export type RecipeInput = z.infer<typeof recipeInputSchema>;

export interface Observation {
  externalId?: string;
  specimenId: string; accountId: string; platform: string; format: string; sector: string; countryCode: string;
  publishedAt: Date; observedAt: Date; value: number | null; paidStatus: string; metricId: string;
  analysisId?: string; annotation?: Annotation;
}
export const median = (values: number[]): number | null => {
  const a = values.filter(Number.isFinite).toSorted((x, y) => x - y);
  return a.length ? (a[Math.floor((a.length - 1) / 2)]! + a[Math.floor(a.length / 2)]!) / 2 : null;
};
const age = (o: Observation) => (o.observedAt.getTime() - o.publishedAt.getTime()) / 86400000;
const contentIdentity = (o: Observation) => o.externalId == null ? o.specimenId : JSON.stringify([o.platform, o.accountId, o.externalId]);
export function normalizedPerformance(target: Observation, corpus: Observation[]) {
  const result = (reason: string, n = 0) => ({ ratio: null as number | null, expected: null as number | null, n, reason, method: "prior-account-median-age-v1", baselineMetricIds: [] as string[] });
  if (target.value == null || target.value < 0 || age(target) < 0 || target.paidStatus !== "ORGANIC") return result("UNMEASURED_OR_PAID_UNKNOWN");
  if (target.format === "VIDEO_UNCLASSIFIED") return result("UNCLASSIFIED_VIDEO_FORMAT");
  // One comparable snapshot per prior post; no self, no future observation/publication.
  const candidates = corpus.filter(o => contentIdentity(o) !== contentIdentity(target) && o.accountId === target.accountId && o.platform === target.platform && o.format === target.format && o.sector === target.sector && o.countryCode === target.countryCode && o.paidStatus === "ORGANIC" && o.value != null && o.value >= 0 && o.publishedAt < target.publishedAt && o.observedAt <= target.observedAt && age(o) >= 0 && Math.abs(age(o) - age(target)) <= Math.max(0.5, age(target) * 0.2));
  const unique = new Map<string, Observation>();
  for (const o of candidates.toSorted((a, b) => Math.abs(age(a) - age(target)) - Math.abs(age(b) - age(target)))) if (!unique.has(contentIdentity(o))) unique.set(contentIdentity(o), o);
  const prior = [...unique.values()].toSorted((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()).slice(0, 30);
  if (prior.length < 5) return result("INSUFFICIENT_BASELINE", prior.length);
  const expected = median(prior.map(o => o.value!));
  if (expected == null || expected <= 0) return result("ZERO_BASELINE", prior.length);
  return { ratio: target.value / expected, expected, n: prior.length, reason: "OBSERVED_ASSOCIATION", method: "prior-account-median-age-v1", baselineMetricIds: prior.map(o => o.metricId) };

}

/** Both established D forms, read-only. */
export function declaredCompetitorNames(pillarD?: Record<string, unknown> | null): string[] {
  const values: unknown[] = [pillarD?.concurrents, pillarD?.paysageConcurrentiel].flatMap(v => Array.isArray(v) ? v : []);
  return [...new Set(values.map(v => typeof v === "string" ? v.trim() : v && typeof v === "object" ? String((v as Record<string, unknown>).nom ?? (v as Record<string, unknown>).name ?? "").trim() : "").filter(Boolean))];
}

export function evaluatePattern(input: RecipeInput, corpus: Observation[]) {
  const scoped = corpus.filter(o => o.sector === input.sector && o.countryCode === input.countryCode && o.platform === input.platform && o.format === input.format && o.observedAt <= input.asOf && o.publishedAt <= input.asOf);
  const latest = new Map<string, Observation>();
  for (const o of scoped.toSorted((a, b) => b.observedAt.getTime() - a.observedAt.getTime())) if (!latest.has(contentIdentity(o))) latest.set(contentIdentity(o), o);
  const rows = [...latest.values()].filter(o => o.annotation && o.analysisId).map(o => ({ o, baseline: normalizedPerformance(o, scoped), matches: o.annotation!.hook === input.hook && o.annotation!.narrative === input.narrative && o.annotation!.visual === input.visual }));
  const eligible = rows.filter(r => r.baseline.ratio != null);
  const examples = eligible.filter(r => r.matches), controls = eligible.filter(r => !r.matches);
  const independentAccounts = new Set(examples.map(r => r.o.accountId)).size;
  const split = [...eligible].sort((a, b) => a.o.publishedAt.getTime() - b.o.publishedAt.getTime());
  const cutoff = split[Math.floor(split.length * 0.7)]?.o.publishedAt ?? input.asOf;
  const summarize = (rs: typeof eligible) => ({ n: rs.length, medianRatio: median(rs.map(r => r.baseline.ratio!)) });
  const temporal = (matches: boolean, holdout: boolean) => summarize(eligible.filter(r => r.matches === matches && (holdout ? r.o.publishedAt >= cutoff : r.o.publishedAt < cutoff)));
  const weeks = [1, 0].map(offset => {
    const end = new Date(input.asOf.getTime() - offset * 7 * 86400000), start = new Date(end.getTime() - 7 * 86400000);
    const period = rows.filter(r => r.o.publishedAt >= start && r.o.publishedAt < end);
    return { start: start.toISOString(), end: end.toISOString(), annotatedContents: period.length, matchingContents: period.filter(r => r.matches).length, independentAccounts: new Set(period.filter(r => r.matches).map(r => r.o.accountId)).size, adoptionInObservedCorpus: period.length ? period.filter(r => r.matches).length / period.length : null };
  });
  return {
    status: examples.length >= 5 && controls.length >= 5 && independentAccounts >= 3 ? "OBSERVED" : "CANDIDATE",
    examples: summarize(examples), controls: summarize(controls), independentAccounts,
    holdout: { cutoff: cutoff.toISOString(), training: { examples: temporal(true, false), controls: temporal(false, false) }, validation: { examples: temporal(true, true), controls: temporal(false, true) } },
    trend: weeks, coverage: { observedContents: latest.size, annotatedContents: rows.length, normalizedContents: eligible.length },
    evidence: eligible.map(r => ({ specimenId: r.o.specimenId, analysisId: r.o.analysisId!, metricId: r.o.metricId, role: r.matches ? "EXAMPLE" : "COUNTEREXAMPLE", observedRatio: r.baseline.ratio, baseline: r.baseline })),
    limitations: ["Association observée, causalité non établie.", "Échantillon collecté, représentativité du marché inconnue.", "La taille d'audience à publication n'est pas estimée à partir de celle observée aujourd'hui.", "La validation temporelle est descriptive ; aucun test de significativité ni correction de comparaisons multiples."],
  };
}
