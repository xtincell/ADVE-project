/** Destructive fixture test: explicitly local PostgreSQL only, no vendor keys. */
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { argosRouter } from "../src/server/trpc/routers/argos";
import { analyticsRouter } from "../src/server/trpc/routers/analytics";
import { loadScopedCompetitors } from "../src/server/services/seshat/creative-intelligence/competition";
import { annotationSchema } from "../src/domain/creative-intelligence";
import { readArchivedMedia } from "../src/server/services/seshat/creative-intelligence/media-archive";
import { refreshCreativeWatchlist } from "../src/server/services/seshat/creative-intelligence/watch-collection";
import { GET as argosCron } from "../src/app/api/cron/argos-hunt/route";

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
  const reviewedPrivate = await admin.intelligence.review({ strategyId, recipeId: privateRecipe.id, publish: false });
  assert.equal((await founder.intelligence.conditionalPerformance({ strategyId, specimenId: privateSpecimen.id })).state, "INSUFFICIENT_DATA");
  await assert.rejects(other.intelligence.conditionalPerformance({ strategyId, specimenId: privateSpecimen.id }), /Accès refusé/);
  const trajectory = await founder.intelligence.patternTrajectory({ strategyId, recipeId: reviewed.id });
  assert(trajectory.series.every(s => s.state === "INSUFFICIENT_DATA"));
  assert.equal((await founder.intelligence.similarRecipes({ strategyId, recipeId: reviewed.id })).state, "DEFERRED_AWAITING_CREDENTIALS");
  assert.equal((await admin.intelligence.indexPatterns({ strategyId, recipeIds: [reviewed.id] })).state, "DEFERRED_AWAITING_CREDENTIALS");
  // Explicit synthetic vectors exercise persistence/query isolation, not a provider claim.
  for (const [i, recipeId] of [reviewed.id, reviewedPrivate.id].entries()) await db.brandContextNode.create({ data: { id: `${prefix}-vector-${i}`, kind: "CREATIVE_RECIPE", strategyId, sourceId: recipeId, payload: { recipeId, fixture: true }, embedding: [1, 0.1], embeddingDim: 2, embeddingModel: "LOCAL_TEST_FIXTURE", embeddingProvider: "LOCAL_TEST_FIXTURE", embeddedAt: new Date() } });
  assert.equal((await founder.intelligence.similarRecipes({ strategyId, recipeId: reviewed.id })).neighbours[0]?.recipeId, reviewedPrivate.id);
  await assert.rejects(other.intelligence.similarRecipes({ strategyId: otherStrategyId, recipeId: reviewedPrivate.id }), /indisponible/);
  const ref = await db.brandRef.create({ data: { kind: "RIVAL", slug: prefix, name: "Fixture competitor", sectorSlug: prefix, countryCode: "CI" } });
  await admin.intelligence.saveWatchlist({ strategyId, watchlist: [{ brandRefId: ref.id, relationship: "ATTENTION", accounts: [{ platform: "TIKTOK", accountId: `${prefix}-one`, url: "https://example.test/one" }] }] });
  assert.equal((await db.strategy.findUniqueOrThrow({ where: { id: strategyId } })).businessContext && ((await db.strategy.findUniqueOrThrow({ where: { id: strategyId } })).businessContext as { sector: string }).sector, prefix);
  assert.equal((await founder.intelligence.watchlist({ strategyId })).length, 1);
  await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`creative-watch:${strategyId}`}))`;
    assert.deepEqual(await refreshCreativeWatchlist(strategyId, null), { state: "ALREADY_RUNNING" });
  });

  await analytics.recordCompetitor({ sector: prefix, market: "CI", countryCode: "CI", name: "Public rival", brandRefId: ref.id, visibility: "PUBLIC", source: "https://example.test/public" });
  await analytics.recordCompetitor({ strategyId, sector: prefix, market: "CI", countryCode: "CI", name: "Private rival", brandRefId: ref.id, visibility: "BRAND", source: "https://example.test/private" });
  await analytics.recordCompetitor({ strategyId: otherStrategyId, sector: prefix, market: "CI", countryCode: "CI", name: "Other private rival", visibility: "BRAND", source: "https://example.test/other" });
  assert.deepEqual((await loadScopedCompetitors(strategyId)).map(r => r.name).sort(), ["Private rival", "Public rival"]);
  await assert.rejects(analytics.recordCompetitor({ strategyId, sector: prefix, market: "CI", countryCode: "CI", name: "Unsafe public", visibility: "PUBLIC", source: "https://example.test/unsafe" }));

  const asset = await db.brandAsset.create({ data: { strategyId, name: "Local creative fixture", kind: "SOCIAL_COPY", family: "INTELLECTUAL" } });
  const deadline = new Date(Date.now() + 5000);
  const application = await admin.intelligence.startTrial({ strategyId, recipeId: reviewed.id, applicationKey: randomUUID(), hypothesis: "Le résultat immédiat améliorera les vues", variant: "Gros plan adapté à notre propre produit", primaryMetric: "views", baselineValue: 100, targetValue: 200, deadline, assetId: asset.id });
  const outcomeSpecimen = await admin.intelligence.importSpecimen({ ...base, visibility: "BRAND", strategyId, accountId: prefix, externalId: "outcome", publishedAt: new Date(), sourceUrl: `https://example.test/${prefix}/outcome` });
  await assert.rejects(admin.intelligence.resolve({ strategyId, applicationId: application.id, specimenId: outcomeSpecimen.id, metricId: "unbound" }), /Confirmer d'abord/);
  await admin.intelligence.bindPublication({ strategyId, applicationId: application.id, specimenId: outcomeSpecimen.id, assetId: asset.id, evidenceUrl: outcomeSpecimen.sourceUrl, attestation: "Publication locale de vérification rattachée à cet actif de test." });
  await new Promise(resolve => setTimeout(resolve, Math.max(0, deadline.getTime() - Date.now()) + 100));
  const outcomeMetric = await admin.intelligence.recordMetric({ strategyId, specimenId: outcomeSpecimen.id, observedAt: new Date(), views: 250, paidStatus: "ORGANIC", source: base.source, sourceUrl: outcomeSpecimen.sourceUrl });
  const resolved = await admin.intelligence.resolve({ strategyId, applicationId: application.id, specimenId: outcomeSpecimen.id, metricId: outcomeMetric.id });
  assert.equal((resolved.outcome as { hit: boolean }).hit, true);
  assert(resolved.resolvedAt);
  const conflictingMetric = await admin.intelligence.recordMetric({ strategyId, specimenId: outcomeSpecimen.id, observedAt: new Date(), views: 300, paidStatus: "ORGANIC", source: base.source, sourceUrl: outcomeSpecimen.sourceUrl });
  await assert.rejects(admin.intelligence.resolve({ strategyId, applicationId: application.id, specimenId: outcomeSpecimen.id, metricId: conflictingMetric.id }), /déjà un autre résultat/);
  let archiveVerified = false;
  if (process.env.CREATIVE_VERIFY_ARCHIVE === "1") {
    const directory = await mkdtemp(join(tmpdir(), "creative-runtime-archive-"));
    const previousKey = process.env.CREATIVE_MEDIA_ENCRYPTION_KEY, previousDir = process.env.CREATIVE_MEDIA_ARCHIVE_DIR;
    process.env.CREATIVE_MEDIA_ENCRYPTION_KEY = randomBytes(32).toString("hex"); process.env.CREATIVE_MEDIA_ARCHIVE_DIR = directory;
    try {
      const rightsEvidenceUrl = "https://commons.wikimedia.org/wiki/File:The_Earth_seen_from_Apollo_17.jpg";
      const specimen = await admin.intelligence.importSpecimen({ ...base, format: "IMAGE", platform: "OTHER", strategyId, visibility: "BRAND", accountId: "NASA", externalId: `${prefix}-archive`, publishedAt: now, sourceUrl: rightsEvidenceUrl, mediaUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/The_Earth_seen_from_Apollo_17.jpg/960px-The_Earth_seen_from_Apollo_17.jpg" });
      const stored = await admin.intelligence.archiveMedia({ strategyId, specimenId: specimen.id, rights: "PUBLIC_DOMAIN", rightsEvidenceUrl, rightsNote: "NASA public-domain photograph; local verification only; deleted after this test.", retainUntil: new Date(Date.now() + 3600000) });
      assert.equal(stored.state, "LIVE");
      const archive = await readArchivedMedia(specimen.id, strategyId); assert(archive);
      const record = await db.contentSpecimen.findUniqueOrThrow({ where: { id: specimen.id } });
      const receipt = record.mediaArchive as { objectKey: string; contentHash: string; retainUntil: string };
      assert.equal(createHash("sha256").update(archive.bytes).digest("hex"), receipt.contentHash);
      assert(!(await readFile(join(directory, `${receipt.objectKey}.enc`))).includes(archive.bytes));
      const projected = (await founder.intelligence.brandCorpus({ strategyId })).find(s => s.id === specimen.id)!;
      assert(!JSON.stringify(projected.mediaArchive).includes(receipt.objectKey));
      await assert.rejects(admin.intelligence.removeMedia({ strategyId: otherStrategyId, specimenId: specimen.id, reason: "Wrong brand must not remove this file." }));
      const expired = new Date(Date.now() - 1000);
      await db.contentSpecimen.update({ where: { id: specimen.id }, data: { mediaArchive: { ...receipt, retainUntil: expired.toISOString() }, mediaRetentionUntil: expired } });
      await assert.rejects(readArchivedMedia(specimen.id, strategyId), /droits de conservation/);
      const response = await argosCron(new Request("http://localhost/api/cron/argos-hunt?mode=retention", { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } }));
      assert.equal(response.status, 200);
      assert((await response.json()).retention.receipts.some((r: { specimenId: string; state: string }) => r.specimenId === specimen.id && r.state === "PURGED"));
      await assert.rejects(readFile(join(directory, `${receipt.objectKey}.enc`)), { code: "ENOENT" });
      archiveVerified = true;
    } finally {
      if (previousKey === undefined) delete process.env.CREATIVE_MEDIA_ENCRYPTION_KEY; else process.env.CREATIVE_MEDIA_ENCRYPTION_KEY = previousKey;
      if (previousDir === undefined) delete process.env.CREATIVE_MEDIA_ARCHIVE_DIR; else process.env.CREATIVE_MEDIA_ARCHIVE_DIR = previousDir;
      await rm(directory, { recursive: true, force: true });
    }
  }
  await db.country.update({ where: { code: "CI" }, data: { status: "FROZEN" } });
  await assert.rejects(admin.intelligence.importSpecimen({ ...base, visibility: "PUBLIC", accountId: prefix, externalId: "frozen", publishedAt: now, sourceUrl: `https://example.test/${prefix}/frozen` }), /actif/);
  await db.country.update({ where: { code: "CI" }, data: { status: "ACTIVE" } });
  assert(await db.intentEmission.count({ where: { intentKind: "SESHAT_RESOLVE_RECIPE_APPLICATION", strategyId, status: "OK" } }) > 0);
  console.log(JSON.stringify({ result: "PASS", database: "local PostgreSQL", archiveVerified, fixturePrefix: prefix, surfaces: ["governed tRPC", "public projection", "brand isolation", "competitor isolation", "immutable snapshots", "recipe review", "publication binding", "immutable application outcome", "semantic neighbours (synthetic vectors)", "conditional abstention", "trajectory coverage", "concurrent watch lease", "frozen-market veto"], adminEmail: `${adminId}@example.test`, founderEmail: `${founderId}@example.test`, strategyId }));
}

async function verify() {
try { await main(); } finally {
  if (process.env.CREATIVE_VERIFY_KEEP !== "1") {
    await db.recipeApplication.deleteMany({ where: { strategyId: { in: [strategyId, otherStrategyId] } } });
    await db.knowledgeEntry.deleteMany({ where: { sector: prefix } });
    await db.contentSpecimen.deleteMany({ where: { sector: prefix } });
    await db.competitorSnapshot.deleteMany({ where: { sector: prefix } });
    await db.brandAsset.deleteMany({ where: { strategyId: { in: [strategyId, otherStrategyId] } } });
    await db.strategy.deleteMany({ where: { id: { in: [strategyId, otherStrategyId] } } });
    await db.user.deleteMany({ where: { id: { in: [adminId, founderId, otherId] } } });
    await db.brandRef.deleteMany({ where: { slug: prefix } });
  }
  await db.country.update({ where: { code: "CI" }, data: { status: "ACTIVE" } });
  await db.$disconnect();
}
}
void verify().catch(error => { console.error(error); process.exitCode = 1; });
