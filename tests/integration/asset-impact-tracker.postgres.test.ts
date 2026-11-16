/** Real local PostgreSQL; only synthetic fixture rows, no provider or database mock. */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { trackAssetImpacts } from "@/server/services/seshat/asset-impact-tracker";
import { ASSET_OBSERVATION_WINDOW_MS, readAssetBrandObservation } from "@/domain/asset-brand-observation";
import { SOCIAL_PUBLICATION_PACKAGE } from "@/domain/social-publication-package";
import { sourceFingerprint } from "@/server/services/ingestion-pipeline/source-usage";

const suffix = randomUUID(), operatorId = `impact-op-${suffix}`, userId = `impact-user-${suffix}`;
const strategyId = `impact-brand-${suffix}`, foreignId = `impact-foreign-${suffix}`;
const now = Date.now(), publishedAt = new Date(now - 3 * ASSET_OBSERVATION_WINDOW_MS);
const beforeAt = new Date(publishedAt.getTime() - 3600000);
const afterAt = new Date(publishedAt.getTime() + ASSET_OBSERVATION_WINDOW_MS);
const json = (value: unknown) => value as Prisma.InputJsonValue;
let safe = false, connectionId: string, beforeId: string, afterId: string;

beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname);
  expect(url.pathname).toBe("/shinkiro_verify");
  const ownedCI = process.env.GITHUB_ACTIONS === "true" && process.env.GITHUB_REPOSITORY === "xtincell/ADVE-project";
  const ownedLocal = url.port === "55432" || (url.hostname === "127.0.0.1" && url.port === "55439" && url.username === "shinkiro_fixture");
  expect(ownedCI ? url.port === "5432" : ownedLocal).toBe(true);
  expect(url.searchParams.get("schema") ?? "public").toBe("public");
  // The tracker scans globally: refuse to run if another suite left packages.
  expect(await db.brandAsset.count({ where: { format: SOCIAL_PUBLICATION_PACKAGE } })).toBe(0);
  safe = true;
  vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("Unexpected network call in PostgreSQL receipt"); }));
  await db.operator.create({ data: { id: operatorId, name: "Recette mesure locale", slug: operatorId,
    status: "ACTIVE", licenseType: "TRIAL", licensedAt: new Date(), licenseExpiry: new Date(now + 86400000) } });
  await db.user.create({ data: { id: userId, operatorId, email: `${userId}@example.invalid` } });
  await db.strategy.createMany({ data: [strategyId, foreignId].map(id => ({ id, operatorId, userId, name: "Marque de recette isolée" })) });
  connectionId = (await db.socialConnection.create({ data: { strategyId, userId, platform: "INSTAGRAM",
    accountId: "synthetic-ig-account", accountName: "Recette sans compte réel" } })).id;
  const dimensions = { engagementDepth: 0, superfanVelocity: 0, communityCohesion: 0, brandDefenseRate: 0,
    ugcGenerationRate: 0, ritualAdoption: 0, evangelismScore: 0, tier: "ORDINARY" };
  beforeId = (await db.cultIndexSnapshot.create({ data: { strategyId, measuredAt: beforeAt, compositeScore: 20, ...dimensions } })).id;
  afterId = (await db.cultIndexSnapshot.create({ data: { strategyId, measuredAt: afterAt, compositeScore: 23.5, ...dimensions } })).id;
  await db.cultIndexSnapshot.createMany({ data: [
    { strategyId, measuredAt: new Date(now - 40 * 86400000), compositeScore: 1, ...dimensions },
    { strategyId, measuredAt: new Date(afterAt.getTime() - 1), compositeScore: 80, ...dimensions },
    { strategyId: foreignId, measuredAt: afterAt, compositeScore: 100, ...dimensions },
  ] });
});

afterAll(async () => {
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (!safe) { await db.$disconnect(); return; }
  const ids = [strategyId, foreignId];
  await db.brandAction.deleteMany({ where: { strategyId: { in: ids } } });
  await db.socialPost.deleteMany({ where: { strategyId: { in: ids } } });
  await db.socialConnection.deleteMany({ where: { strategyId: { in: ids } } });
  await db.cultIndexSnapshot.deleteMany({ where: { strategyId: { in: ids } } });
  await db.assetVersion.deleteMany({ where: { strategyId: { in: ids } } });
  await db.generativeTask.deleteMany({ where: { strategyId: { in: ids } } });
  await db.brandAsset.deleteMany({ where: { strategyId: { in: ids } } });
  await db.strategy.deleteMany({ where: { id: { in: ids } } });
  await db.user.deleteMany({ where: { id: userId } });
  await db.operator.deleteMany({ where: { id: operatorId } });
  await db.$disconnect();
});

async function packet(options: { state?: string; date?: Date; metadata?: Prisma.InputJsonValue | typeof Prisma.JsonNull; foreignMaterial?: boolean } = {}) {
  const brief = await db.brandAsset.create({ data: { strategyId, operatorId, name: "Brief de recette", kind: "CREATIVE_BRIEF", content: {} } });
  const materialBrand = options.foreignMaterial ? foreignId : strategyId;
  const task = await db.generativeTask.create({ data: { strategyId: materialBrand, operatorId,
    sourceBrandAssetId: brief.id, intentId: randomUUID(), forgeKind: "image", provider: "fixture", providerModel: "fixture",
    promptHash: "a".repeat(64), parameters: {}, pillarSource: "D", manipulationMode: "entertainer",
    estimatedCostUsd: 0, webhookSecret: "synthetic-only", status: "COMPLETED" } });
  const material = await db.assetVersion.create({ data: { strategyId: materialBrand, operatorId, generativeTaskId: task.id,
    kind: "image", url: "/synthetic-unused.png", metadata: options.metadata ?? { preserve: "received image" },
    createdAt: new Date(now - 30 * 86400000), cultIndexDeltaObserved: 99 } });
  const action = await db.brandAction.create({ data: { strategyId, title: "Publication de recette", source: "CALENDAR_PRODUCTION", status: "ACCEPTED" } });
  const content = {
    schema: SOCIAL_PUBLICATION_PACKAGE,
    calendar: { sourceId: "synthetic-calendar", version: "a".repeat(64), postKey: "synthetic-post", origin: "calendar", date: null },
    brief: { id: brief.id, version: 1, contentHash: "b".repeat(64) },
    material: { id: material.id, taskId: task.id, contentHash: "c".repeat(64), width: 1080, height: 1080,
      author: { provider: "fixture", model: "fixture", generatedAt: material.createdAt.toISOString() } },
    delivery: { encoding: "jpeg-q95-white-v1", contentHash: "d".repeat(64), mimeType: "image/jpeg",
      width: 1080, height: 1080, byteLength: 1000, placement: "FEED" },
    platform: "INSTAGRAM", format: "image", caption: "Recette", hashtags: [], publicationText: "Recette",
  };
  const hash = sourceFingerprint({ rawData: content });
  const asset = await db.brandAsset.create({ data: { strategyId, operatorId, name: "Paquet synthétique relu", kind: "SOCIAL_COPY",
    format: SOCIAL_PUBLICATION_PACKAGE, state: "ACTIVE", sourceAssetVersionId: material.id, content: json(content),
    metadata: { actionId: action.id, contentHash: hash, editorialReview: { contentHash: hash, userId, reviewedAt: beforeAt.toISOString() } } } });
  const externalPostId = randomUUID();
  await db.brandAction.update({ where: { id: action.id }, data: { metadata: {
    publicationPackageId: asset.id, contentHash: hash,
    socialPublish: { publicationPackageId: asset.id, publicationPackageHash: hash,
      publicationTarget: { connectionId, accountId: "synthetic-ig-account" },
      results: [{ state: options.state ?? "PUBLISHED", platform: "INSTAGRAM", connectionId, externalPostId }] },
  } } });
  const post = await db.socialPost.create({ data: { strategyId, connectionId, externalPostId, publishedAt: options.date ?? publishedAt } });
  return { material, action, asset, post };
}

describe.sequential("published asset brand comparison — real PostgreSQL receipts", () => {
  it("does not measure an old material with an unpublished receipt or a foreign material", async () => {
    const unpublished = await packet({ state: "UNCONFIRMED" }), foreign = await packet({ foreignMaterial: true });
    expect(await trackAssetImpacts()).toMatchObject({ measured: 0, errors: [] });
    for (const item of [unpublished, foreign]) {
      const material = await db.assetVersion.findUniqueOrThrow({ where: { id: item.material.id } });
      expect(material.cultIndexDeltaObserved).toBe(99);
      expect(readAssetBrandObservation(material.metadata, material.id, material.strategyId!)).toBeNull();
    }
  });

  it("persists exact package / receipt / before-after lineage, using real JSON-null CAS", async () => {
    const item = await packet({ metadata: Prisma.JsonNull });
    expect(await trackAssetImpacts()).toMatchObject({ measured: 1, errors: [] });
    const material = await db.assetVersion.findUniqueOrThrow({ where: { id: item.material.id } });
    expect(material.cultIndexDeltaObserved).toBe(3.5);
    expect(readAssetBrandObservation(material.metadata, material.id, strategyId)).toMatchObject({
      publication: { packageId: item.asset.id, actionId: item.action.id, socialPostId: item.post.id,
        connectionId, externalPostId: item.post.externalPostId, publishedAt: publishedAt.toISOString() },
      before: { id: beforeId, score: 20 }, after: { id: afterId, score: 23.5 }, delta: 3.5,
    });
    expect(await trackAssetImpacts()).toMatchObject({ measured: 0, errors: [] });
    expect((await db.assetVersion.findUniqueOrThrow({ where: { id: material.id } })).metadata).toEqual(material.metadata);
  });

  it("waits for late publication plus 24h and an existing after-sample, never asset creation", async () => {
    const lateDate = new Date(now - 3600000), item = await packet({ date: lateDate });
    expect(await trackAssetImpacts()).toMatchObject({ measured: 0, errors: [] });
    const later = now + 2 * 86400000, clock = vi.spyOn(Date, "now").mockReturnValue(later);
    try {
      expect(await trackAssetImpacts()).toMatchObject({ measured: 0, errors: [] });
      const after = await db.cultIndexSnapshot.create({ data: { strategyId,
        measuredAt: new Date(lateDate.getTime() + ASSET_OBSERVATION_WINDOW_MS), compositeScore: 23.5, tier: "ORDINARY",
        engagementDepth: 0, superfanVelocity: 0, communityCohesion: 0, brandDefenseRate: 0, ugcGenerationRate: 0,
        ritualAdoption: 0, evangelismScore: 0 } });
      expect(await trackAssetImpacts()).toMatchObject({ measured: 1, errors: [] });
      const material = await db.assetVersion.findUniqueOrThrow({ where: { id: item.material.id } });
      expect(material.cultIndexDeltaObserved).toBe(0);
      expect(readAssetBrandObservation(material.metadata, material.id, strategyId)).toMatchObject({
        publication: { publishedAt: lateDate.toISOString() }, before: { id: afterId }, after: { id: after.id }, delta: 0,
      });
    } finally { clock.mockRestore(); }
  });

  it("allows only one persistence under simultaneous runs and preserves unrelated provider metadata", async () => {
    const item = await packet();
    const runs = await Promise.all([trackAssetImpacts(), trackAssetImpacts()]);
    expect(runs.flatMap(run => run.errors)).toEqual([]);
    expect(runs.reduce((total, run) => total + run.measured, 0)).toBe(1);
    const material = await db.assetVersion.findUniqueOrThrow({ where: { id: item.material.id } });
    expect(material.metadata).toMatchObject({ preserve: "received image", brandVariationObservation: { delta: 3.5 } });
    expect(await trackAssetImpacts()).toMatchObject({ measured: 0, errors: [] });
    expect((await db.assetVersion.findUniqueOrThrow({ where: { id: material.id } })).metadata).toEqual(material.metadata);
  });
});
