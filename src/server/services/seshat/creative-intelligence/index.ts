/** Seshat telemetry, not the canonical Argos-studio documentary library (SHK-0002). */
import { createHash } from "node:crypto";
import { Prisma, type PrismaClient, type RecipeApplication } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  annotationSchema, evaluatePattern, normalizedPerformance, specimenInputSchema, metricInputSchema,
  analysisInputSchema, recipeInputSchema, watchlistSchema, RECIPE_SCHEMA, TAXONOMY_VERSION,
  type Observation,
} from "@/domain/creative-intelligence";

type Store = Prisma.TransactionClient;
const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v, (_key, value) => value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value)).digest("hex");
function fail(message: string): never { throw new TRPCError({ code: "BAD_REQUEST", message }); }
function notFound(): never { throw new TRPCError({ code: "NOT_FOUND", message: "Élément indisponible dans ce périmètre." }); }
const scope = (strategyId?: string): Prisma.ContentSpecimenWhereInput => strategyId
  ? { OR: [{ visibility: "PUBLIC", strategyId: null }, { visibility: "BRAND", strategyId }] }
  : { visibility: "PUBLIC", strategyId: null };

export async function assertActiveMarket(store: Store, countryCode: string) {
  const country = await store.country.findUnique({ where: { code: countryCode }, select: { status: true } });
  if (!country || country.status !== "ACTIVE") fail("Le marché doit être actif et référencé.");
}
async function getSpecimen(store: Store, id: string, strategyId?: string) {
  return await store.contentSpecimen.findFirst({ where: { id, ...scope(strategyId) } }) ?? notFound();
}
async function assertWritableSpecimen(store: Store, id: string, strategyId?: string) {
  const specimen = await getSpecimen(store, id, strategyId);
  // Brand-scoped mutations cannot rewrite or annotate a shared public observation.
  if (strategyId && specimen.strategyId !== strategyId) notFound();
  await assertActiveMarket(store, specimen.countryCode);
  return specimen;
}

export async function importSpecimen(input: z.infer<typeof specimenInputSchema>, store: Store = db) {
  input = specimenInputSchema.parse(input);
  if (input.publishedAt > new Date()) fail("La publication ne peut pas être dans le futur.");
  await assertActiveMarket(store, input.countryCode);
  if (input.strategyId) {
    const strategy = await store.strategy.findUnique({ where: { id: input.strategyId }, select: { countryCode: true } });
    if (!strategy || strategy.countryCode !== input.countryCode) fail("Le pays doit correspondre à la marque.");
  }
  const identityKey = hash([input.visibility, input.strategyId ?? "", input.platform, input.accountId, input.externalId]);
  const existing = await store.contentSpecimen.findUnique({ where: { identityKey } });
  if (existing) {
    if (existing.sourceUrl !== input.sourceUrl || existing.publishedAt.getTime() !== input.publishedAt.getTime() || existing.format !== input.format || existing.sector !== input.sector || existing.countryCode !== input.countryCode) fail("Identité déjà importée avec un contexte différent.");
    return existing;
  }
  // Unique identity arbitrates concurrent/retried imports; observations are never overwritten.
  const row = await store.contentSpecimen.upsert({ where: { identityKey }, create: { ...input, identityKey }, update: {} });
  if (row.sourceUrl !== input.sourceUrl || row.publishedAt.getTime() !== input.publishedAt.getTime() || row.format !== input.format || row.sector !== input.sector || row.countryCode !== input.countryCode) fail("Import concurrent avec un contexte différent.");
  return row;
}

export async function recordMetric(input: z.infer<typeof metricInputSchema>, store: Store = db) {
  input = metricInputSchema.parse(input);
  const specimen = await assertWritableSpecimen(store, input.specimenId, input.strategyId);
  if (input.observedAt < specimen.publishedAt || input.observedAt > new Date()) fail("La mesure doit suivre la publication et précéder maintenant.");
  const { strategyId: _scope, ...data } = input;
  const observationKey = hash(data);
  return store.contentMetricSnapshot.upsert({ where: { observationKey }, create: { ...data, observationKey }, update: {} });
}

export async function annotateSpecimen(input: z.infer<typeof analysisInputSchema>, userId: string, store: Store = db) {
  input = analysisInputSchema.parse(input);
  await assertWritableSpecimen(store, input.specimenId, input.strategyId);
  const annotation = annotationSchema.parse(input.annotation);
  const analysisKey = hash([input.specimenId, TAXONOMY_VERSION, input.contentHash, annotation]);
  return store.creativeAnalysis.upsert({
    where: { analysisKey }, update: {},
    create: { specimenId: input.specimenId, analysisKey, taxonomyVersion: TAXONOMY_VERSION, method: "MANUAL", contentHash: input.contentHash, annotation: json(annotation), createdBy: userId },
  });
}

async function observations(store: Store, strategyId: string | undefined, asOf: Date, metric: "views" | "reach", context: { sector?: string; countryCode?: string; platform?: string; format?: string } = {}) {
  const specimens = await store.contentSpecimen.findMany({
    where: { ...scope(strategyId), ...context, publishedAt: { lte: asOf } }, orderBy: { publishedAt: "desc" }, take: 1000,
    include: {
      metrics: { where: { observedAt: { lte: asOf } }, orderBy: { observedAt: "desc" }, take: 30 },
      analyses: { where: { taxonomyVersion: TAXONOMY_VERSION, createdAt: { lte: asOf } }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const rows: Observation[] = [];
  for (const s of specimens) {
    const analysis = s.analyses[0], annotation = annotationSchema.safeParse(analysis?.annotation);
    for (const m of s.metrics) rows.push({ specimenId: s.id, externalId: s.externalId, accountId: s.accountId, platform: s.platform, format: s.format, sector: s.sector, countryCode: s.countryCode, publishedAt: s.publishedAt, observedAt: m.observedAt, value: m[metric], paidStatus: m.paidStatus, metricId: m.id, ...(analysis && annotation.success ? { analysisId: analysis.id, annotation: annotation.data } : {}) });
  }
  return { rows, specimens };
}

const recipeDataSchema = z.object({
  schema: z.literal(RECIPE_SCHEMA), family: z.string(), revision: z.number().int(),
  strategyId: z.string().optional(), visibility: z.enum(["PUBLIC", "BRAND"]),
  context: recipeInputSchema, evaluation: z.custom<ReturnType<typeof evaluatePattern>>(),
  published: z.boolean(), reviewedBy: z.string().optional(), reviewedAt: z.string().optional(),
});
type RecipeData = z.infer<typeof recipeDataSchema>;
function parseRecipe(v: unknown): RecipeData {
  const parsed = recipeDataSchema.safeParse(v);
  return parsed.success ? parsed.data : notFound();
}
async function getRecipe(store: Store, id: string, strategyId?: string) {
  const row = await store.knowledgeEntry.findFirst({
    where: { id, entryType: "BRIEF_PATTERN", OR: [{ originStrategyId: null }, ...(strategyId ? [{ originStrategyId: strategyId }] : [])] },
  });
  if (!row) notFound();
  const data = parseRecipe(row.data);
  if (data.strategyId && data.strategyId !== strategyId) notFound();
  return { row, data };
}

// Family-scoped transaction lock prevents two callers assigning the same revision.
async function appendRecipe(data: Omit<RecipeData, "revision">, evidence: ReturnType<typeof evaluatePattern>["evidence"], client: PrismaClient) {
  return client.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.family}))`;
    const previous = await tx.knowledgeEntry.findMany({ where: { entryType: "BRIEF_PATTERN", sourceHash: data.family }, orderBy: { createdAt: "desc" } });
    for (const row of previous) {
      const parsed = recipeDataSchema.safeParse(row.data);
      if (parsed.success) {
        const { revision: _revision, ...payload } = parsed.data;
        if (hash(payload) === hash(data)) return { ...row, data: parsed.data };
      }
    }
    const revision = 1 + Math.max(0, ...previous.map(r => recipeDataSchema.safeParse(r.data)).filter(r => r.success).map(r => r.data!.revision));
    const row = await tx.knowledgeEntry.create({ data: {
      entryType: "BRIEF_PATTERN", sourceHash: data.family, originStrategyId: data.strategyId ?? null,
      sector: data.context.sector, countryCode: data.context.countryCode, channel: data.context.platform,
      data: json({ ...data, revision }), sampleSize: data.evaluation.examples.n,
    } });
    if (evidence.length) await tx.patternEvidence.createMany({ data: evidence.map(e => ({ ...e, recipeId: row.id, baseline: json(e.baseline) })) });
    return { ...row, data: { ...data, revision } };
  });
}

export async function discoverRecipe(input: z.infer<typeof recipeInputSchema>, client: PrismaClient = db) {
  input = recipeInputSchema.parse(input);
  if (input.asOf > new Date()) fail("La date d'analyse ne peut pas être future.");
  await assertActiveMarket(client, input.countryCode);
  const { rows } = await observations(client, input.strategyId, input.asOf, input.metric, { sector: input.sector, countryCode: input.countryCode, platform: input.platform, format: input.format });
  const evaluation = evaluatePattern(input, rows);
  const { asOf: _date, ...familyContext } = input;
  const family = hash(familyContext);
  return appendRecipe({ schema: RECIPE_SCHEMA, family, strategyId: input.strategyId, visibility: input.strategyId ? "BRAND" : "PUBLIC", context: input, evaluation, published: false }, evaluation.evidence, client);
}

export async function reviewRecipe(id: string, strategyId: string | undefined, publish: boolean, userId: string, client: PrismaClient = db) {
  const { data } = await getRecipe(client, id, strategyId);
  await assertActiveMarket(client, data.context.countryCode);
  if (publish && (data.visibility !== "PUBLIC" || data.strategyId || data.evaluation.status !== "OBSERVED")) fail("Seules les recettes publiques étayées peuvent être publiées.");
  const evidence = await client.patternEvidence.findMany({ where: { recipeId: id }, include: { specimen: { select: { visibility: true, strategyId: true } } } });
  if (publish && evidence.some(e => e.specimen.visibility !== "PUBLIC" || e.specimen.strategyId)) fail("Une preuve privée empêche la publication.");
  const { revision: _old, ...copy } = data;
  return appendRecipe({ ...copy, published: publish, reviewedBy: userId, reviewedAt: new Date().toISOString() }, evidence.map(e => ({ specimenId: e.specimenId, analysisId: e.analysisId, metricId: e.metricId, role: e.role, observedRatio: e.observedRatio, baseline: e.baseline as ReturnType<typeof normalizedPerformance> })), client);
}

export async function listRecipes(strategyId?: string, store: Store = db, publicOnly = false) {
  const rows = await store.knowledgeEntry.findMany({
    where: { entryType: "BRIEF_PATTERN", data: { path: ["schema"], equals: RECIPE_SCHEMA }, OR: [{ originStrategyId: null }, ...(strategyId && !publicOnly ? [{ originStrategyId: strategyId }] : [])] },
    orderBy: { createdAt: "desc" }, take: 200,
  });
  rows.sort((a, b) => {
    const left = recipeDataSchema.safeParse(a.data), right = recipeDataSchema.safeParse(b.data);
    return left.success && right.success ? right.data.revision - left.data.revision : 0;
  });
  const seen = new Set<string>();
  const results = [];
  const invisible = await store.country.findMany({ where: { status: { in: ["SHADOWBANNED", "PURGED"] } }, select: { code: true } });
  for (const row of rows) {
    const parsed = recipeDataSchema.safeParse(row.data);
    if (!parsed.success) continue;
    const data = parsed.data;
    if (invisible.some(c => c.code === data.context.countryCode) || seen.has(data.family)) continue;
    seen.add(data.family);
    if (data.strategyId && data.strategyId !== strategyId) continue;
    if (publicOnly && (data.visibility !== "PUBLIC" || data.strategyId || !data.published || !data.reviewedBy)) continue;
    // Explicit projection: no raw annotations, private IDs, evidence rows, or frozen customer briefs.
    const evidence = await store.patternEvidence.findMany({ where: { recipeId: row.id, ...(publicOnly ? { specimen: { visibility: "PUBLIC", strategyId: null } } : {}) }, take: 30, select: { role: true, specimen: { select: { sourceUrl: true } } } });
    results.push({ id: row.id, family: data.family, revision: data.revision, context: data.context, published: data.published, reviewed: !!data.reviewedBy, sources: evidence.map(e => ({ url: e.specimen.sourceUrl, role: e.role })), evaluation: {
      status: data.evaluation.status, examples: data.evaluation.examples, controls: data.evaluation.controls,
      independentAccounts: data.evaluation.independentAccounts, holdout: data.evaluation.holdout,
      coverage: data.evaluation.coverage, trend: data.evaluation.trend, limitations: data.evaluation.limitations,
    } });
  }
  return results;
}

/** Coverage-qualified hypotheses: absence in a collected sample is not market whitespace. */
export async function creativeOpportunities(strategyId: string, store: Store = db) {
  const strategy = await store.strategy.findUnique({ where: { id: strategyId }, select: { businessContext: true, countryCode: true } }) ?? notFound();
  const sector = (strategy.businessContext as { sector?: string } | null)?.sector;
  const watch = watchlistSchema.safeParse((strategy.businessContext as Record<string, unknown> | null)?.creativeWatchlist ?? []);
  const accounts = new Set(watch.success ? watch.data.flatMap(w => w.accounts.map(a => `${a.platform}:${a.accountId}`)) : []);
  const { specimens } = await observations(store, strategyId, new Date(), "views", { ...(sector ? { sector } : {}), ...(strategy.countryCode ? { countryCode: strategy.countryCode } : {}) });
  const recipes = (await listRecipes(strategyId, store)).filter(r => r.reviewed && r.context.sector === sector && r.context.countryCode === strategy.countryCode);
  return recipes.map(r => {
    const cohort = specimens.filter(s => s.platform === r.context.platform && s.format === r.context.format);
    const own = cohort.filter(s => s.strategyId === strategyId), rivals = cohort.filter(s => s.visibility === "PUBLIC" && accounts.has(`${s.platform}:${s.accountId}`));
    const matching = (s: typeof specimens[number]) => {
      const a = annotationSchema.safeParse(s.analyses[0]?.annotation);
      return a.success && a.data.hook === r.context.hook && a.data.narrative === r.context.narrative && a.data.visual === r.context.visual;
    };
    const ownMatches = own.filter(matching).length, rivalMatches = rivals.filter(matching).length;
    const promising = r.evaluation.examples.medianRatio != null && r.evaluation.controls.medianRatio != null && r.evaluation.examples.medianRatio > Math.max(1, r.evaluation.controls.medianRatio);
    return { recipeId: r.id, pattern: [r.context.hook, r.context.narrative, r.context.visual], ownObservedContents: own.length, ownMatchingContents: ownMatches, rivalObservedContents: rivals.length, rivalMatchingContents: rivalMatches, suggestion: own.length && ownMatches === 0 && r.evaluation.status === "OBSERVED" && promising ? "TEST_CANDIDATE" : "COLLECT_MORE", limitation: "Écart dans le corpus collecté uniquement ; couverture des comptes et de leur paid media incomplète." };
  });
}

export async function corpusOverview(strategyId?: string, store: Store = db) {
  const { rows, specimens } = await observations(store, strategyId, new Date(), "views");
  const invisible = await store.country.findMany({ where: { status: { in: ["SHADOWBANNED", "PURGED"] } }, select: { code: true } });
  return specimens.filter(s => !invisible.some(c => c.code === s.countryCode)).slice(0, 100).map(s => ({
    ...s, performance: rows.find(o => o.specimenId === s.id) ? normalizedPerformance(rows.find(o => o.specimenId === s.id)!, rows) : { ratio: null, reason: "UNMEASURED" },
  }));
}

export async function saveWatchlist(strategyId: string, watchlist: z.infer<typeof watchlistSchema>, store: Store = db) {
  watchlist = watchlistSchema.parse(watchlist);
  if (new Set(watchlist.map(w => w.brandRefId)).size !== watchlist.length) fail("Une marque ne peut apparaître qu'une fois dans la veille.");
  const strategy = await store.strategy.findUnique({ where: { id: strategyId }, select: { businessContext: true, countryCode: true } }) ?? notFound();
  if (!strategy.countryCode) fail("La marque doit avoir un pays.");
  await assertActiveMarket(store, strategy.countryCode);
  const refs = await store.brandRef.findMany({ where: { id: { in: watchlist.map(w => w.brandRefId) } }, select: { id: true } });
  if (refs.length !== watchlist.length) fail("Une référence de marque est inconnue.");
  // Preserve other business-context fields even when another operator edits them concurrently.
  await store.$executeRaw`UPDATE "Strategy" SET "businessContext" = jsonb_set(COALESCE("businessContext", '{}'::jsonb), '{creativeWatchlist}', ${JSON.stringify(watchlist)}::jsonb), "updatedAt" = NOW() WHERE "id" = ${strategyId}`;
  return watchlist;
}

export const applyRecipeSchema = z.object({
  strategyId: z.string().min(1), recipeId: z.string().min(1), applicationKey: z.string().uuid(),
  hypothesis: z.string().trim().min(10).max(2000), variant: z.string().trim().min(3).max(2000),
  primaryMetric: z.enum(["views", "reach", "likes", "comments", "shares"]),
  baselineValue: z.number().nonnegative(), targetValue: z.number().positive(), deadline: z.coerce.date(),
  actionId: z.string().optional(), assetId: z.string().optional(),
});
export async function applyRecipe(input: z.infer<typeof applyRecipeSchema>, store: Store = db) {
  input = applyRecipeSchema.parse(input);
  const checkedReplay = (application: RecipeApplication) => {
    if (application.strategyId !== input.strategyId || application.recipeId !== input.recipeId || application.hypothesis !== input.hypothesis || application.variant !== input.variant || application.primaryMetric !== input.primaryMetric || application.baselineValue !== input.baselineValue || application.targetValue !== input.targetValue || application.deadline.getTime() !== input.deadline.getTime() || application.assetId !== (input.assetId ?? null) || application.actionId !== (input.actionId ?? null)) fail("Clé d'essai déjà utilisée.");
    return application;
  };
  const existing = await store.recipeApplication.findUnique({ where: { applicationKey: input.applicationKey } });
  if (existing) return checkedReplay(existing);
  const { row, data } = await getRecipe(store, input.recipeId, input.strategyId);
  if (!data.reviewedBy) fail("La recette doit être revue avant application.");
  const strategy = await store.strategy.findUnique({ where: { id: input.strategyId }, select: { countryCode: true } }) ?? notFound();
  if (!strategy.countryCode) fail("La marque doit avoir un pays.");
  await assertActiveMarket(store, strategy.countryCode);
  if (input.deadline <= new Date()) fail("L'échéance doit être future.");
  if (input.actionId && !await store.campaignAction.findFirst({ where: { id: input.actionId, campaign: { strategyId: input.strategyId } }, select: { id: true } })) notFound();
  if (input.assetId && !await store.brandAsset.findFirst({ where: { id: input.assetId, strategyId: input.strategyId }, select: { id: true } })) notFound();
  // Another writer may win after the initial read; validate the database winner too.
  return checkedReplay(await store.recipeApplication.upsert({ where: { applicationKey: input.applicationKey }, update: {}, create: { ...input, frozenRecipe: json({ recipeId: row.id, ...data }) } }));
}

export async function resolveApplication(input: { strategyId: string; applicationId: string; specimenId: string; metricId: string }, store: Store = db) {
  const app = await store.recipeApplication.findFirst({ where: { id: input.applicationId, strategyId: input.strategyId } }) ?? notFound();
  if (app.resolvedAt) return app;
  const s = await assertWritableSpecimen(store, input.specimenId, input.strategyId);
  if (s.publishedAt < app.createdAt || s.publishedAt > app.deadline) fail("La publication doit se situer entre la déclaration et l'échéance de l'essai.");
  const m = await store.contentMetricSnapshot.findFirst({ where: { id: input.metricId, specimenId: s.id, observedAt: { gte: app.deadline } } }) ?? notFound();
  const value = m[app.primaryMetric as "views" | "reach" | "likes" | "comments" | "shares"];
  if (value == null) fail("La mesure principale n'est pas disponible.");
  const outcome = { value, baselineValue: app.baselineValue, targetValue: app.targetValue, hit: value >= app.targetValue, delta: value - app.baselineValue, metricId: m.id, observedAt: m.observedAt.toISOString(), paidStatus: m.paidStatus, attribution: "OBSERVED_NOT_CAUSAL" };
  await store.recipeApplication.updateMany({ where: { id: app.id, resolvedAt: null }, data: { resolvedAt: new Date(), resultSpecimenId: s.id, outcome: json(outcome) } });
  return store.recipeApplication.findUniqueOrThrow({ where: { id: app.id } });
}

export async function recipeContext(strategyId: string, store: Store = db): Promise<string> {
  const strategy = await store.strategy.findUnique({ where: { id: strategyId }, select: { businessContext: true, countryCode: true } });
  const sector = (strategy?.businessContext as { sector?: string } | null)?.sector;
  const recipes = (await listRecipes(strategyId, store)).filter(r => r.reviewed && r.context.sector === sector && r.context.countryCode === strategy?.countryCode).slice(0, 5);
  return recipes.length ? "\nRECETTES EMPIRIQUES REVUES — inspiration à adapter à ADVE, association et non causalité.\n" + recipes.map(r => JSON.stringify(r)).join("\n") + "\nHYPOTHÈSES D'ESSAIS (couverture limitée)\n" + JSON.stringify(await creativeOpportunities(strategyId, store)) : "";
}

/** Persist only values actually returned by the authenticated native Insights API. */
export async function captureNativeInsights(strategyId: string, postId: string, metrics: Record<string, number>, observedAt: Date, store: Store = db) {
  const post = await store.socialPost.findFirst({ where: { id: postId, strategyId }, include: { connection: true, strategy: { select: { countryCode: true, businessContext: true } } } });
  const sector = (post?.strategy.businessContext as { sector?: string } | null)?.sector;
  if (!post?.publishedAt || !post.permalinkUrl?.startsWith("https:") || !post.strategy.countryCode || !sector) return { captured: false, reason: "MISSING_CONTEXT" };
  const platform = post.connection.platform;
  if (platform !== "FACEBOOK" && platform !== "INSTAGRAM") return { captured: false, reason: "UNSUPPORTED_SOURCE" };
  const specimen = await importSpecimen({ strategyId, visibility: "BRAND", platform, accountId: post.connection.accountId, externalId: post.externalPostId, sourceUrl: post.permalinkUrl, format: post.mediaType?.toLowerCase().includes("video") ? "SHORT_VIDEO" : "IMAGE", sector, countryCode: post.strategy.countryCode, publishedAt: post.publishedAt, source: "NATIVE_INSIGHTS" }, store);
  await store.contentSpecimen.updateMany({ where: { id: specimen.id, socialPostId: null }, data: { socialPostId: post.id } });
  const reach = platform === "FACEBOOK" ? metrics.post_impressions_unique : metrics.reach;
  if (reach == null) return { captured: false, reason: "UNMEASURED" };
  // Impressions are not video views. Only the native unique-reach counter is mapped.
  await recordMetric({ strategyId, specimenId: specimen.id, observedAt, reach, paidStatus: "UNKNOWN", source: "NATIVE_INSIGHTS", sourceUrl: post.permalinkUrl }, store);
  return { captured: true, specimenId: specimen.id };
}
