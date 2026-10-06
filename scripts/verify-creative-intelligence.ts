/** Destructive fixture test: explicitly local PostgreSQL only, no vendor keys. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { argosRouter } from "../src/server/trpc/routers/argos";
import { analyticsRouter } from "../src/server/trpc/routers/analytics";
import { loadScopedCompetitors } from "../src/server/services/seshat/creative-intelligence/competition";
import { annotationSchema } from "../src/domain/creative-intelligence";

const connection = new URL(process.env.DATABASE_URL ?? "postgresql://invalid");
if (!["localhost", "127.0.0.1"].includes(connection.hostname) || !connection.pathname.includes("intelligence")) throw new Error("Use a dedicated local intelligence test database.");
const prefix = `verify-creative-${Date.now()}`;
const adminId = `${prefix}-admin`, founderId = `${prefix}-founder`, otherId = `${prefix}-other`;
const strategyId = `${prefix}-brand`, otherStrategyId = `${prefix}-other-brand`;
const annotation = annotationSchema.parse({ hook: "RESULT_FIRST", narrative: "TRANSFORMATION", visual: "MACRO", socialDriver: "UTILITY", evidence: ["hook", "narrative", "visual", "socialDriver"].map(field => ({ field, observation: "Fixture locale documentée", confidence: "MEDIUM" })) });
const now = new Date();
const base = { platform: "TIKTOK" as const, format: "SHORT_VIDEO" as const, countryCode: "CI", sector: prefix, source: "LOCAL_TEST_FIXTURE" };
const context = (id: string, role: string) => ({ db, session: { user: { id, role, name: "Local verification", email: `${id}@example.test` }, expires: "2030-01-01" }, headers: new Headers() });
const admin = argosRouter.createCaller(context(adminId, "ADMIN"));
const founder = argosRouter.createCaller(context(founderId, "FOUNDER"));
const other = argosRouter.createCaller(context(otherId, "FOUNDER"));
const analytics = analyticsRouter.createCaller(context(adminId, "ADMIN"));

async function main() {
  await db.currency.upsert({ where: { code: "XOF" }, update: {}, create: { code: "XOF", name: "Franc CFA", symbol: "FCFA" } });
  await db.country.upsert({ where: { code: "CI" }, update: { status: "ACTIVE" }, create: { code: "CI", name: "Côte d'Ivoire", currencyCode: "XOF" } });
  const hashedPassword = await bcrypt.hash("LocalVerify-Creative-2026!", 10);
  await db.user.createMany({ data: [
    { id: adminId, email: `${adminId}@example.test`, role: "ADMIN", hashedPassword },
    { id: founderId, email: `${founderId}@example.test`, role: "FOUNDER", hashedPassword },
    { id: otherId, email: `${otherId}@example.test`, role: "FOUNDER", hashedPassword },
  ] });
  await db.strategy.createMany({ data: [
    { id: strategyId, name: "Creative verification", userId: founderId, countryCode: "CI", businessContext: { sector: prefix } },
    { id: otherStrategyId, name: "Other verification", userId: otherId, countryCode: "CI", businessContext: { sector: prefix } },
  ] });
  for (const account of ["one", "two", "three"]) for (let i = 0; i < 12; i++) {
    const publishedAt = new Date(now.getTime() - (40 - i) * 86400000);
    const sourceUrl = `https://example.test/${prefix}/${account}/${i}`;
    const s = await admin.intelligence.importSpecimen({ ...base, visibility: "PUBLIC", accountId: `${prefix}-${account}`, externalId: String(i), sourceUrl, publishedAt });
    const metric = { specimenId: s.id, observedAt: new Date(publishedAt.getTime() + 86400000), views: i >= 6 && i % 2 === 0 ? 500 : 100, paidStatus: "ORGANIC" as const, source: base.source, sourceUrl };
    const first = await admin.intelligence.recordMetric(metric);
    const replay = await admin.intelligence.recordMetric(metric);
    assert.equal(replay.id, first.id, "Snapshot replay must be idempotent");
    await admin.intelligence.annotate({ specimenId: s.id, contentHash: "a".repeat(64), annotation: { ...annotation, hook: i % 2 === 0 ? "RESULT_FIRST" : "QUESTION" } });
  }
  const recipe = await admin.intelligence.discover({ ...base, hook: annotation.hook, narrative: annotation.narrative, visual: annotation.visual, metric: "views", asOf: new Date() });
  assert.equal(recipe.data.evaluation.status, "OBSERVED");
  assert.equal((await admin.intelligence.publicRecipes()).some(r => r.id === recipe.id), false);
  const reviewed = await admin.intelligence.review({ recipeId: recipe.id, publish: true });
  assert((await admin.intelligence.publicRecipes()).some(r => r.id === reviewed.id));
  const projection = (await admin.intelligence.publicRecipes()).find(r => r.id === reviewed.id)!;
  assert(!JSON.stringify(projection).includes("baselineMetricIds"));

  const privateSpecimen = await admin.intelligence.importSpecimen({ ...base, visibility: "BRAND", strategyId, accountId: prefix, externalId: "private", publishedAt: now, sourceUrl: `https://example.test/${prefix}/private` });
  assert((await founder.intelligence.brandCorpus({ strategyId })).some(s => s.id === privateSpecimen.id));
  await assert.rejects(other.intelligence.brandCorpus({ strategyId }), /Accès refusé/);
  await assert.rejects(founder.intelligence.recordMetric({ strategyId, specimenId: privateSpecimen.id, observedAt: now, views: 1, paidStatus: "ORGANIC", source: base.source, sourceUrl: privateSpecimen.sourceUrl }));
  await assert.rejects(admin.intelligence.recordMetric({ strategyId: otherStrategyId, specimenId: privateSpecimen.id, observedAt: now, views: 1, paidStatus: "ORGANIC", source: base.source, sourceUrl: privateSpecimen.sourceUrl }), /indisponible/);
  const privateRecipe = await admin.intelligence.discover({ ...base, strategyId, hook: annotation.hook, narrative: annotation.narrative, visual: annotation.visual, metric: "views", asOf: new Date() });
  await assert.rejects(admin.intelligence.review({ strategyId, recipeId: privateRecipe.id, publish: true }), /publiques/);
  const ref = await db.brandRef.create({ data: { kind: "RIVAL", slug: prefix, name: "Fixture competitor", sectorSlug: prefix, countryCode: "CI" } });
  await admin.intelligence.saveWatchlist({ strategyId, watchlist: [{ brandRefId: ref.id, relationship: "ATTENTION", accounts: [{ platform: "TIKTOK", accountId: `${prefix}-one`, url: "https://example.test/one" }] }] });
  assert.equal((await db.strategy.findUniqueOrThrow({ where: { id: strategyId } })).businessContext && ((await db.strategy.findUniqueOrThrow({ where: { id: strategyId } })).businessContext as { sector: string }).sector, prefix);
  assert.equal((await founder.intelligence.watchlist({ strategyId })).length, 1);

  await analytics.recordCompetitor({ sector: prefix, market: "CI", countryCode: "CI", name: "Public rival", visibility: "PUBLIC", source: "https://example.test/public" });
  await analytics.recordCompetitor({ strategyId, sector: prefix, market: "CI", countryCode: "CI", name: "Private rival", visibility: "BRAND", source: "https://example.test/private" });
  await analytics.recordCompetitor({ strategyId: otherStrategyId, sector: prefix, market: "CI", countryCode: "CI", name: "Other private rival", visibility: "BRAND", source: "https://example.test/other" });
  assert.deepEqual((await loadScopedCompetitors(strategyId)).map(r => r.name).sort(), ["Private rival", "Public rival"]);
  await assert.rejects(analytics.recordCompetitor({ strategyId, sector: prefix, market: "CI", countryCode: "CI", name: "Unsafe public", visibility: "PUBLIC", source: "https://example.test/unsafe" }));

  const deadline = new Date(Date.now() + 5000);
  const application = await admin.intelligence.startTrial({ strategyId, recipeId: reviewed.id, applicationKey: randomUUID(), hypothesis: "Le résultat immédiat améliorera les vues", variant: "Gros plan adapté à notre propre produit", primaryMetric: "views", baselineValue: 100, targetValue: 200, deadline });
  const outcomeSpecimen = await admin.intelligence.importSpecimen({ ...base, visibility: "BRAND", strategyId, accountId: prefix, externalId: "outcome", publishedAt: new Date(), sourceUrl: `https://example.test/${prefix}/outcome` });
  await new Promise(resolve => setTimeout(resolve, Math.max(0, deadline.getTime() - Date.now()) + 100));
  const outcomeMetric = await admin.intelligence.recordMetric({ strategyId, specimenId: outcomeSpecimen.id, observedAt: new Date(), views: 250, paidStatus: "ORGANIC", source: base.source, sourceUrl: outcomeSpecimen.sourceUrl });
  const resolved = await admin.intelligence.resolve({ strategyId, applicationId: application.id, specimenId: outcomeSpecimen.id, metricId: outcomeMetric.id });
  assert.equal((resolved.outcome as { hit: boolean }).hit, true);
  assert(resolved.resolvedAt);
  await db.country.update({ where: { code: "CI" }, data: { status: "FROZEN" } });
  await assert.rejects(admin.intelligence.importSpecimen({ ...base, visibility: "PUBLIC", accountId: prefix, externalId: "frozen", publishedAt: now, sourceUrl: `https://example.test/${prefix}/frozen` }), /actif/);
  await db.country.update({ where: { code: "CI" }, data: { status: "ACTIVE" } });
  assert(await db.intentEmission.count({ where: { intentKind: "SESHAT_RESOLVE_RECIPE_APPLICATION", strategyId, status: "OK" } }) > 0);
  console.log(JSON.stringify({ result: "PASS", database: "local PostgreSQL", fixturePrefix: prefix, surfaces: ["governed tRPC", "public projection", "brand isolation", "competitor isolation", "immutable snapshots", "recipe review", "application outcome", "frozen-market veto"], adminEmail: `${adminId}@example.test`, founderEmail: `${founderId}@example.test`, strategyId }));
}

async function verify() {
try { await main(); } finally {
  if (process.env.CREATIVE_VERIFY_KEEP !== "1") {
    await db.recipeApplication.deleteMany({ where: { strategyId: { in: [strategyId, otherStrategyId] } } });
    await db.knowledgeEntry.deleteMany({ where: { sector: prefix } });
    await db.contentSpecimen.deleteMany({ where: { sector: prefix } });
    await db.competitorSnapshot.deleteMany({ where: { sector: prefix } });
    await db.strategy.deleteMany({ where: { id: { in: [strategyId, otherStrategyId] } } });
    await db.user.deleteMany({ where: { id: { in: [adminId, founderId, otherId] } } });
    await db.brandRef.deleteMany({ where: { slug: prefix } });
  }
  await db.country.update({ where: { code: "CI" }, data: { status: "ACTIVE" } });
  await db.$disconnect();
}
}
void verify().catch(error => { console.error(error); process.exitCode = 1; });
