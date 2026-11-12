/** Dedicated local database only. LIVE Bluesky reads; synthetic media and draft fixtures are labeled. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { argosRouter } from "../src/server/trpc/routers/argos";
import { GET as argosCron } from "../src/app/api/cron/argos-hunt/route";
import { annotationSchema } from "../src/domain/creative-intelligence";
import { argosResearchDossierSchema } from "../src/domain/argos-projection";
import { isTextLLMAvailable } from "../src/server/services/llm-gateway";
import { extractMediaObservations } from "../src/server/services/seshat/creative-intelligence/media-observations";

const url = new URL(process.env.DATABASE_URL ?? "postgresql://invalid");
if (!["localhost", "127.0.0.1"].includes(url.hostname) || !url.pathname.includes("intelligence")) throw new Error("Dedicated local intelligence test database required.");
if (isTextLLMAvailable()) throw new Error("Run this missing-provider fixture without configured LLM credentials.");
const prefix = `verify-acquisition-${Date.now()}`, adminId = `${prefix}-admin`, founderId = `${prefix}-founder`, otherId = `${prefix}-other`;
const strategyId = `${prefix}-brand`, otherStrategyId = `${prefix}-other-brand`;
const caller = (id: string, role: string) => argosRouter.createCaller({ db, session: { user: { id, role, name: "Acquisition verification", email: `${id}@example.test` }, expires: "2030-01-01" }, headers: new Headers() });
const admin = caller(adminId, "ADMIN"), founder = caller(founderId, "FOUNDER"), other = caller(otherId, "FOUNDER");
const annotation = annotationSchema.parse({ hook: "RESULT_FIRST", narrative: "TRANSFORMATION", visual: "OTHER", socialDriver: "UTILITY", evidence: ["hook", "narrative", "visual", "socialDriver"].map(field => ({ field, observation: "LOCAL_TEST_FIXTURE — not a model result", confidence: "LOW" })) });

async function verify() {
  // Prior interrupted runs in this dedicated DB must not consume the two-brand cron window.
  await db.$executeRaw`UPDATE "Strategy" SET "businessContext" = jsonb_set(COALESCE("businessContext", '{}'::jsonb), '{creativeWatchAutomation}', 'false'::jsonb) WHERE "id" LIKE 'verify-acquisition-%'`;
  await db.currency.upsert({ where: { code: "XOF" }, update: {}, create: { code: "XOF", name: "Franc CFA", symbol: "FCFA" } });
  await db.country.upsert({ where: { code: "CI" }, update: { status: "ACTIVE" }, create: { code: "CI", name: "Côte d'Ivoire", currencyCode: "XOF" } });
  const hashedPassword = await bcrypt.hash("LocalVerify-Creative-2026!", 10);
  await db.user.createMany({ data: [{ id: adminId, email: `${adminId}@example.test`, role: "ADMIN", hashedPassword }, { id: founderId, email: `${founderId}@example.test`, role: "FOUNDER", hashedPassword }, { id: otherId, email: `${otherId}@example.test`, role: "FOUNDER", hashedPassword }] });
  await db.strategy.createMany({ data: [{ id: strategyId, name: "Local acquisition verification", userId: founderId, countryCode: "CI", businessContext: { sector: prefix } }, { id: otherStrategyId, name: "Other local acquisition", userId: otherId, countryCode: "CI", businessContext: { sector: prefix } }] });
  const input = { strategyId, provider: "BLUESKY" as const, account: "bsky.app", sector: prefix, countryCode: "CI", limit: 2, youtubeFormat: "VIDEO_UNCLASSIFIED" as const };
  const first = await admin.intelligence.collectSource(input);
  assert.equal(first.state, "LIVE", JSON.stringify(first));
  if (first.state !== "LIVE") throw new Error("Bluesky not live");
  assert(first.receipts.length > 0);
  const before = await db.contentMetricSnapshot.count({ where: { specimen: { strategyId } } });
  const second = await admin.intelligence.collectSource(input);
  assert.equal(second.state, "LIVE");
  assert((await db.contentMetricSnapshot.count({ where: { specimen: { strategyId } } })) > before);
  const nativeRows = await db.contentSpecimen.findMany({ where: { strategyId }, include: { metrics: true } });
  assert(nativeRows.some(s => s.metrics.length >= 2));
  assert(nativeRows.every(s => s.source === "BLUESKY_PUBLIC_API" && s.metrics.every(m => m.views == null && m.paidStatus === "UNKNOWN")));
  assert((await other.intelligence.brandCorpus({ strategyId: otherStrategyId })).every(s => !nativeRows.some(n => n.id === s.id)));
  await assert.rejects(other.intelligence.brandCorpus({ strategyId }), /accès|accéder|propriété|autorisé|interdit/i);
  await assert.rejects(founder.intelligence.collectSource(input));
  assert.equal((await admin.intelligence.collectSource({ ...input, provider: "YOUTUBE", account: "@YouTube" })).state, "DEFERRED_AWAITING_CREDENTIALS");

  const target = nativeRows[0]!;
  const existing = { strategyId, visibility: "BRAND" as const, platform: "OTHER" as const, accountId: target.accountId, externalId: target.externalId, sourceUrl: target.sourceUrl, format: target.format as "TEXT", sector: "conflicting-context", countryCode: "CI", publishedAt: target.publishedAt, source: "LOCAL_TEST_FIXTURE" };
  const atomic = { ...existing, accountId: prefix, externalId: "atomic-rollback", sourceUrl: "https://example.test/atomic", sector: prefix };
  await assert.rejects(admin.intelligence.importExport({ schemaVersion: "creative-source-export-v1", strategyId, items: [{ specimen: atomic }, { specimen: existing }] }), /contexte différent/);
  assert.equal(await db.contentSpecimen.count({ where: { strategyId, externalId: "atomic-rollback" } }), 0);
  await assert.rejects(admin.intelligence.importExport({ schemaVersion: "creative-source-export-v1", strategyId, items: [{ specimen: { ...atomic, strategyId: otherStrategyId } }] }));

  const draft = await db.creativeAnalysis.create({ data: { specimenId: target.id, taxonomyVersion: "creative-v1", method: "MODEL_DRAFT", contentHash: createHash("sha256").update("LOCAL_TEST_FIXTURE").digest("hex"), analysisKey: `${prefix}-draft`, annotation, createdBy: adminId } });
  assert.equal((await admin.intelligence.corpus({ strategyId })).find(s => s.id === target.id)!.analyses.length, 0);
  assert.equal((await admin.intelligence.draftAnalysis({ strategyId, specimenId: target.id, mode: "TEXT", observedText: "LOCAL_TEST_FIXTURE" })).state, "DEFERRED_AWAITING_CREDENTIALS");
  assert.equal((await admin.intelligence.savedDraft({ strategyId, specimenId: target.id }))?.analysisId, draft.id);
  await assert.rejects(founder.intelligence.savedDraft({ strategyId, specimenId: target.id }));
  await admin.intelligence.reviewDraft({ strategyId, analysisId: draft.id, annotation });
  assert.equal(await admin.intelligence.savedDraft({ strategyId, specimenId: target.id }), null);
  assert.equal((await admin.intelligence.corpus({ strategyId })).find(s => s.id === target.id)!.analyses[0]!.method, "MANUAL");
  assert.equal((await db.creativeAnalysis.findUniqueOrThrow({ where: { id: draft.id } })).method, "MODEL_DRAFT");
  await assert.rejects(admin.intelligence.reviewDraft({ strategyId: otherStrategyId, analysisId: draft.id, annotation }), /Brouillon indisponible/);

  const ref = await db.brandRef.create({ data: { slug: prefix, name: "Bluesky — local watch fixture", kind: "RIVAL", countryCode: "CI" } });
  const feed = "https://www.nasa.gov/feed/";
  const rss = await admin.intelligence.collectSource({ ...input, provider: "RSS", account: feed });
  assert.equal(rss.state, "LIVE", JSON.stringify(rss));
  if (rss.state !== "LIVE") throw new Error("RSS not live");
  const rssSpecimen = await db.contentSpecimen.findUniqueOrThrow({ where: { id: rss.receipts[0]!.specimenId } });
  assert.equal(await db.contentMetricSnapshot.count({ where: { specimenId: rssSpecimen.id } }), 0);
  await admin.intelligence.saveWatchlist({ strategyId, watchlist: [{ brandRefId: ref.id, relationship: "ATTENTION", accounts: [{ platform: "OTHER", accountId: target.accountId, url: `https://bsky.app/profile/${encodeURIComponent(target.accountId)}` }, { platform: "OTHER", accountId: rssSpecimen.accountId, url: feed, collection: { provider: "RSS", account: feed } }] }] });
  await admin.intelligence.setWatchAutomation({ strategyId, enabled: true });
  const cronResponse = await argosCron(new Request("http://localhost/api/cron/argos-hunt?mode=corpus", { headers: process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {} }));
  assert.equal(cronResponse.status, 200, await cronResponse.clone().text());
  const cron = await cronResponse.json();
  assert(cron.receipts.some((r: { strategyId: string }) => r.strategyId === strategyId));
  const cronReceipt = cron.receipts.find((r: { strategyId: string }) => r.strategyId === strategyId);
  assert.equal(cronReceipt.result.status, "BATCH_COMPLETED");
  assert.equal(cronReceipt.result.results[0].result.state, "LIVE");
  assert(cronReceipt.result.results.some((r: { provider: string; result: { state: string } }) => r.provider === "RSS" && r.result.state === "LIVE"));
  const cronEmission = await db.intentEmission.findUniqueOrThrow({ where: { id: cronReceipt.intentId } });
  assert.equal(cronEmission.status, "OK");
  assert(cronEmission.completedAt);
  await admin.intelligence.setWatchAutomation({ strategyId, enabled: false });

  const journal = await admin.createManual({ brand: prefix, campaign: "Local contract fixture", sector: prefix, market: "CI", dna: { voice: "LOCAL_TEST_FIXTURE", keyPhrases: ["one", "two"], palette: ["fixture"], visualCodes: [], typography: [], axes: [] }, sources: [{ title: "Local fixture", url: "https://example.test/primary" }] });
  await admin.setVerdict({ id: journal.id, verdict: "PASS" });
  assert(await db.intentEmission.count({ where: { intentKind: "SESHAT_REVIEW_REFERENCE_DOSSIER", status: "OK" } }) > 0);
  const dossier = argosResearchDossierSchema.parse({ schemaVersion: "research-dossier-v1", researcher: { name: "Local fixture verifier" }, researchDate: "2026-10-06", operation: { title: "Local contract fixture", brandEmitter: prefix, sector: prefix, marketPrimary: "CI", emissionYear: 2026 }, sources: [{ url: "https://example.test/primary", title: "Local fixture", accessedDate: "2026-10-06", license: "creator-permission", role: "primary" }], assets: [{ function: "HEADLINE", role: "HERO", kind: "TEXT", url: "", aspectRatio: "1:1", text: "LOCAL_TEST_FIXTURE" }], classification: { patternKind: "TEXT", manipulationMode: "FACILITATOR", funnelStage: "AWARENESS", pillars: ["T"], operationGoals: ["AWARENESS"] }, axes: [{ name: "ATTENTION_PATTERN", value: "LOCAL_TEST_FIXTURE", confidence: 0.2, evidence: "Synthetic fixture for contract validation only" }], performance: { metrics: [] }, summary: "Synthetic local contract fixture; no campaign performance claim.", confidence: "LOW" });
  assert.equal((await admin.projectToStudio({ dossierId: journal.id, dossier })).state, "DEFERRED_AWAITING_CREDENTIALS");
  await assert.rejects(admin.projectToStudio({ dossierId: journal.id, dossier: { ...dossier, operation: { ...dossier.operation, brandEmitter: "wrong-brand" } } }), /correspondre/);

  const dir = await mkdtemp(join(tmpdir(), "creative-media-fixture-"));
  let frameCount = 0;
  try {
    const file = join(dir, "fixture.mp4");
    await promisify(execFile)("ffmpeg", ["-nostdin", "-v", "error", "-f", "lavfi", "-i", "testsrc=size=128x96:rate=10:duration=4", "-c:v", "mpeg4", "-threads", "1", "-pix_fmt", "yuv420p", file], { timeout: 10000 });
    const media = await extractMediaObservations(await readFile(file), "video/mp4");
    assert.equal(media.coverage.method, "SAMPLED_FRAMES");
    assert.equal(media.coverage.audioObserved, false);
    assert(media.images.length >= 4 && media.coverage.frameTimes.length === media.images.length);
    assert(media.coverage.frameTimes.at(-1)! > 3);
    frameCount = media.images.length;
    const nativeSilent = await extractMediaObservations(await readFile(file), "video/mp4", true);
    assert.equal(nativeSilent.coverage.method, "NATIVE_VIDEO"); assert.equal(nativeSilent.coverage.audioObserved, false);
    const withAudio = join(dir, "fixture-audio.mp4");
    await promisify(execFile)("ffmpeg", ["-nostdin", "-v", "error", "-i", file, "-f", "lavfi", "-i", "sine=frequency=440:duration=4", "-c:v", "copy", "-c:a", "aac", "-shortest", withAudio], { timeout: 10000 });
    const audiovisual = await extractMediaObservations(await readFile(withAudio), "video/mp4", true);
    assert.equal(audiovisual.coverage.audioObserved, true); assert.equal(audiovisual.coverage.method, "NATIVE_VIDEO");
  } finally { await rm(dir, { recursive: true, force: true }); }
  console.log(JSON.stringify({ result: "PASS", fixturePrefix: prefix, strategyId, adminEmail: `${adminId}@example.test`, founderEmail: `${founderId}@example.test`, liveProvider: "Bluesky public API", repeatedSnapshots: true, atomicRollback: true, scopeIsolation: true, modelDraftExcludedUntilReview: true, cronStatus: cronResponse.status, cronEmissions: cron.receipts.length, syntheticMediaFrameCount: frameCount, youtube: "DEFERRED_NO_KEY", llm: "DEFERRED_NO_KEY", argosStudio: "DEFERRED_NO_ENDPOINT_OR_CREDENTIAL", remotePublicationTested: false }));
}
async function main() { try { await verify(); } finally {
  if (process.env.CREATIVE_VERIFY_KEEP !== "1") {
    await db.knowledgeEntry.deleteMany({ where: { sector: prefix } });
    await db.contentSpecimen.deleteMany({ where: { strategyId: { in: [strategyId, otherStrategyId] } } });
    await db.gloryOutput.deleteMany({ where: { strategyId } });
    await db.strategy.deleteMany({ where: { id: { in: [strategyId, otherStrategyId] } } });
    await db.user.deleteMany({ where: { id: { in: [adminId, founderId, otherId] } } });
    await db.brandRef.deleteMany({ where: { slug: prefix } });
    await db.campaignReferenceDossier.deleteMany({ where: { brand: prefix } });
  }
  await db.$disconnect();
} }
main().catch(error => { console.error(error); process.exitCode = 1; });
