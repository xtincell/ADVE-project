import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sourceFingerprint } from "@/server/services/ingestion-pipeline/source-usage";
import { SOCIAL_PUBLICATION_PACKAGE } from "@/domain/social-publication-package";
import { readAssetBrandObservation } from "@/domain/asset-brand-observation";

const mocks = vi.hoisted(() => ({
  packages: vi.fn(), version: vi.fn(), action: vi.fn(), post: vi.fn(), snapshots: vi.fn(), update: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: {
  brandAsset: { findMany: mocks.packages }, assetVersion: { findFirst: mocks.version, updateMany: mocks.update },
  brandAction: { findFirst: mocks.action }, socialPost: { findFirst: mocks.post }, cultIndexSnapshot: { findFirst: mocks.snapshots },
} }));
import { trackAssetImpacts } from "@/server/services/seshat/asset-impact-tracker";

const NOW = new Date("2026-11-16T12:00:00.000Z");
const publishedAt = new Date("2026-11-13T12:00:00.000Z");
function fixture() {
  const content = {
    schema: SOCIAL_PUBLICATION_PACKAGE,
    calendar: { sourceId: "calendar-1", version: "a".repeat(64), postKey: "post-key", origin: "calendar", date: null },
    brief: { id: "brief-1", version: 2, contentHash: "b".repeat(64) },
    material: { id: "version-1", taskId: "task-1", contentHash: "c".repeat(64), width: 1080, height: 1080,
      author: { provider: "provider", model: "model", generatedAt: "2026-10-01T00:00:00.000Z" } },
    delivery: { encoding: "jpeg-q95-white-v1", contentHash: "d".repeat(64), mimeType: "image/jpeg",
      width: 1080, height: 1080, byteLength: 1000, placement: "FEED" },
    platform: "INSTAGRAM", format: "image", caption: "La marque", hashtags: [], publicationText: "La marque",
  };
  const hash = sourceFingerprint({ rawData: content });
  return {
    packet: { id: "package-1", strategyId: "brand-1", operatorId: "operator-1", sourceAssetVersionId: "version-1",
      content, metadata: { actionId: "action-1", contentHash: hash,
        editorialReview: { userId: "reviewer-1", reviewedAt: "2026-11-12T00:00:00.000Z", contentHash: hash } } },
    version: { id: "version-1", strategyId: "brand-1", operatorId: "operator-1", generativeTaskId: "task-1",
      createdAt: new Date("2026-10-01T00:00:00.000Z"), metadata: { preserved: "provider receipt" } as Record<string, unknown>,
      cultIndexDeltaObserved: 99 as number | null,
      generativeTask: { sourceBrandAssetId: "brief-1", strategyId: "brand-1", operatorId: "operator-1" } },
    action: { id: "action-1", strategyId: "brand-1", metadata: {
      publicationPackageId: "package-1", contentHash: hash,
      socialPublish: { publicationPackageId: "package-1", publicationPackageHash: hash,
        publicationTarget: { connectionId: "connection-1", accountId: "ig-account-1" },
        results: [{ platform: "INSTAGRAM", state: "PUBLISHED", connectionId: "connection-1", externalPostId: "ig-post-1" }] },
    } },
    post: { id: "post-1", strategyId: "brand-1", connectionId: "connection-1", externalPostId: "ig-post-1", publishedAt: publishedAt as Date | null,
      connection: { strategyId: "brand-1", accountId: "ig-account-1", platform: "INSTAGRAM" } },
    snapshots: [
      { id: "at-creation", strategyId: "brand-1", measuredAt: new Date("2026-09-30T12:00:00.000Z"), compositeScore: 1 },
      { id: "before", strategyId: "brand-1", measuredAt: new Date("2026-11-13T11:00:00.000Z"), compositeScore: 20 },
      { id: "too-early", strategyId: "brand-1", measuredAt: new Date("2026-11-14T11:59:59.999Z"), compositeScore: 80 },
      { id: "after", strategyId: "brand-1", measuredAt: new Date("2026-11-14T12:00:00.000Z"), compositeScore: 23.5 },
      { id: "future", strategyId: "brand-1", measuredAt: new Date("2026-11-17T12:00:00.000Z"), compositeScore: 90 },
    ],
  };
}
let state: ReturnType<typeof fixture>;
beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(NOW); state = fixture();
  mocks.packages.mockImplementation(async ({ cursor }) => cursor ? [] : [state.packet]);
  mocks.version.mockImplementation(async ({ where }) =>
    Object.entries(where).every(([key, value]) => state.version[key as keyof typeof state.version] === value) ? state.version : null);
  mocks.action.mockImplementation(async ({ where }) =>
    where.id === state.action.id && where.strategyId === state.action.strategyId ? state.action : null);
  mocks.post.mockImplementation(async ({ where }) => {
    const post = state.post;
    return post.publishedAt && post.publishedAt <= where.publishedAt.lte && post.strategyId === where.strategyId
      && post.connectionId === where.connectionId && where.externalPostId.in.includes(post.externalPostId)
      && Object.entries(where.connection).every(([key, value]) => post.connection[key as keyof typeof post.connection] === value) ? post : null;
  });
  mocks.snapshots.mockImplementation(async ({ where, orderBy }) => state.snapshots
    .filter(s => s.strategyId === where.strategyId && (where.measuredAt.lt ? s.measuredAt < where.measuredAt.lt
      : s.measuredAt >= where.measuredAt.gte && s.measuredAt <= where.measuredAt.lte))
    .sort((a, b) => (orderBy[0].measuredAt === "asc" ? 1 : -1) * (a.measuredAt.getTime() - b.measuredAt.getTime()))[0] ?? null);
  mocks.update.mockImplementation(async ({ where, data }) => {
    if (JSON.stringify(where.metadata.equals) !== JSON.stringify(state.version.metadata)) return { count: 0 };
    state.version.metadata = data.metadata; state.version.cultIndexDeltaObserved = data.cultIndexDeltaObserved;
    return { count: 1 };
  });
});
afterEach(() => vi.useRealTimers());

describe("asset publication / global brand variation", () => {
  it("uses the exact material and real publication date, preserves provenance and legacy metadata", async () => {
    const result = await trackAssetImpacts();
    expect(result).toMatchObject({ scanned: 1, measured: 1, skipped: 0, errors: [] });
    expect(mocks.version).toHaveBeenCalledWith(expect.objectContaining({ where: {
      id: "version-1", strategyId: "brand-1", operatorId: "operator-1", generativeTaskId: "task-1",
    } }));
    expect(mocks.post).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      strategyId: "brand-1", connectionId: "connection-1", externalPostId: { in: ["ig-post-1"] },
      connection: { strategyId: "brand-1", accountId: "ig-account-1", platform: "INSTAGRAM" },
    }) }));
    expect(state.version.metadata.preserved).toBe("provider receipt");
    expect(readAssetBrandObservation(state.version.metadata, "version-1", "brand-1")).toMatchObject({
      delta: 3.5, before: { id: "before", score: 20 }, after: { id: "after", score: 23.5 },
      publication: { packageId: "package-1", actionId: "action-1", socialPostId: "post-1", publishedAt: publishedAt.toISOString() },
    });
    expect(state.version.cultIndexDeltaObserved).toBe(3.5); // replaces an unproven legacy number only after evidence
  });

  it.each(["SCHEDULED", "UNCONFIRMED", "FAILED"])("does not measure an unpublished %s receipt", async stateName => {
    state.action.metadata.socialPublish.results[0]!.state = stateName;
    expect(await trackAssetImpacts()).toMatchObject({ measured: 0, skipped: 1 });
    expect(mocks.post).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each(["", " "])("does not accept a missing network identifier", async externalId => {
    state.action.metadata.socialPublish.results[0]!.externalPostId = externalId;
    expect(await trackAssetImpacts()).toMatchObject({ measured: 0, skipped: 1 });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("waits 24h after late publication even when the material was created months earlier", async () => {
    state.post.publishedAt = new Date("2026-11-16T11:00:00.000Z");
    expect(await trackAssetImpacts()).toMatchObject({ measured: 0, skipped: 1 });
    expect(mocks.snapshots).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
    vi.setSystemTime("2026-11-17T12:00:00.000Z");
    expect(await trackAssetImpacts()).toMatchObject({ measured: 1, errors: [] });
  });
  it("requires the synced publication date, never the action or asset creation date", async () => {
    state.post.publishedAt = null;
    expect(await trackAssetImpacts()).toMatchObject({ measured: 0, skipped: 1 });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each(["strategyId", "operatorId", "generativeTaskId"] as const)("rejects a foreign material %s", async key => {
    state.version[key] = "foreign";
    expect(await trackAssetImpacts()).toMatchObject({ measured: 0, skipped: 1 });
    expect(mocks.action).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects package/material and task/brief mismatches", async () => {
    state.packet.sourceAssetVersionId = "other-material";
    expect(await trackAssetImpacts()).toMatchObject({ measured: 0, skipped: 1 });
    state.packet.sourceAssetVersionId = "version-1"; state.version.generativeTask.sourceBrandAssetId = "other-brief";
    expect(await trackAssetImpacts()).toMatchObject({ measured: 0, skipped: 1 });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("does not borrow a post or connection belonging to another brand", async () => {
    state.post.connection.strategyId = "brand-2";
    expect(await trackAssetImpacts()).toMatchObject({ measured: 0, skipped: 1 });
    state.post.connection.strategyId = "brand-1"; state.post.strategyId = "brand-2";
    expect(await trackAssetImpacts()).toMatchObject({ measured: 0, skipped: 1 });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects a receipt for another selected package or changed package content", async () => {
    state.action.metadata.socialPublish.publicationPackageId = "other-package";
    expect(await trackAssetImpacts()).toMatchObject({ measured: 0, skipped: 1 });
    state.action.metadata.socialPublish.publicationPackageId = "package-1"; state.packet.content.caption = "Changed after review";
    expect(await trackAssetImpacts()).toMatchObject({ measured: 0, skipped: 1 });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each(["before", "after"])("waits for a real %s sample instead of inventing zero", async missing => {
    state.snapshots = state.snapshots.filter(s => missing === "before" ? s.measuredAt >= publishedAt
      : s.measuredAt < new Date(publishedAt.getTime() + 86_400_000));
    expect(await trackAssetImpacts()).toMatchObject({ measured: 0, skipped: 1 });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each([20, 0])("retains observed zero or negative variation (%s)", async afterScore => {
    state.snapshots.find(s => s.id === "after")!.compositeScore = afterScore;
    expect(await trackAssetImpacts()).toMatchObject({ measured: 1, errors: [] });
    expect(state.version.cultIndexDeltaObserved).toBe(afterScore - 20);
  });
  it("does not rewrite an established observation on later runs or reinterpret it with a new snapshot", async () => {
    await trackAssetImpacts(); const proof = structuredClone(state.version.metadata);
    state.snapshots.find(s => s.id === "after")!.compositeScore = 80;
    expect(await trackAssetImpacts()).toMatchObject({ measured: 0, skipped: 1 });
    expect(mocks.update).toHaveBeenCalledTimes(1); expect(state.version.metadata).toEqual(proof);
  });
  it("does not overwrite a concurrent metadata change", async () => {
    mocks.update.mockResolvedValue({ count: 0 });
    expect(await trackAssetImpacts()).toMatchObject({ measured: 0, skipped: 1 });
    expect(state.version.metadata).toEqual({ preserved: "provider receipt" });
  });
  it("continues past a full page of ineligible packages", async () => {
    mocks.packages.mockResolvedValueOnce(Array.from({ length: 100 }, (_, i) => ({ ...state.packet, id: String(i), sourceAssetVersionId: "mismatch" })))
      .mockResolvedValueOnce([state.packet]);
    expect(await trackAssetImpacts()).toMatchObject({ scanned: 101, measured: 1, skipped: 100 });
    expect(mocks.packages).toHaveBeenNthCalledWith(2, expect.objectContaining({ cursor: { id: "99" }, skip: 1 }));
  });
});
