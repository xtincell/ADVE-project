/** Disposable PostgreSQL only. No provider, scoring or generated prescription. */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
const assisted = vi.hoisted(() => ({ generate: vi.fn(async () => ({
  totalRecos: 0, batchId: "", errors: [] as Array<{ pillarKey: string; error: string }>, autoApplied: 0, recosByPillar: {},
})) }));
vi.mock("@/server/services/advertis-scorer", () => ({ scoreObject: vi.fn() }));
vi.mock("@/server/services/llm-gateway", () => ({ callLLM: vi.fn(() => { throw new Error("NO_PROVIDER_ALLOWED"); }) }));
vi.mock("@/server/services/jehuty/refresh", () => ({ refreshBrandGazette: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
vi.mock("@/server/services/notoria/engine", () => ({ generateBatch: assisted.generate }));
vi.mock("@/server/services/seshat/external-feeds/brand-feed", () => ({
  getOrBuildBrandFeed: vi.fn(async () => ({ articles: [], subjects: [] })),
}));
import { db } from "@/lib/db";
import { detectStrategyDrift } from "@/server/services/feedback-loop";
import { jehutyRouter } from "@/server/trpc/routers/jehuty";
let brand: string, other: string, foreign: string, userId: string, foreignUserId: string, operatorId: string, foreignOperatorId: string;
const ids: string[] = [];
let stamp = Date.now();
async function event(strategyId: string | null, previous: number | string, type = "drift_detected", originStrategyId: string | null = null) {
  const row = await db.knowledgeEntry.create({ data: {
    entryType: "DIAGNOSTIC_RESULT", pillarFocus: "a", originStrategyId,
    data: { type, ...(strategyId ? { strategyId } : {}), previous, current: 8 },
    createdAt: new Date(stamp += 1000),
  } });
  ids.push(row.id);
  return row;
}
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname);
  expect(url.pathname).toBe("/shinkiro_verify");
  const operator = await db.operator.create({ data: {
    name: "Recette de dérive", slug: `drift-${randomUUID()}`, status: "ACTIVE", licenseType: "TRIAL",
    licensedAt: new Date(), licenseExpiry: new Date(Date.now() + 86_400_000),
  } });
  operatorId = operator.id;
  const user = await db.user.create({ data: { email: `drift-${randomUUID()}@example.invalid`, operatorId } });
  userId = user.id;
  const foreignOperator = await db.operator.create({ data: {
    name: "Autre entreprise de recette", slug: `foreign-${randomUUID()}`, status: "ACTIVE", licenseType: "TRIAL",
    licensedAt: new Date(), licenseExpiry: new Date(Date.now() + 86_400_000),
  } });
  foreignOperatorId = foreignOperator.id;
  const foreignUser = await db.user.create({ data: { email: `foreign-${randomUUID()}@example.invalid`, operatorId: foreignOperatorId } });
  foreignUserId = foreignUser.id;
  const brands = await Promise.all(["A", "B"].map((name) => db.strategy.create({ data: {
    name: `Drift ${name} ${randomUUID()}`, userId, operatorId,
    advertis_vector: { a: 8 },
  } })));
  brand = brands[0]!.id; other = brands[1]!.id;
  foreign = (await db.strategy.create({ data: { name: "Marque confidentielle de recette", userId: foreignUserId, operatorId: foreignOperatorId } })).id;
});
afterAll(async () => {
  await db.knowledgeEntry.deleteMany({ where: { OR: [
    { id: { in: ids } }, ...[brand, other, foreign].filter(Boolean).map((strategyId) => ({ data: { path: ["strategyId"], equals: strategyId } })),
  ] } });
  const brandIds = [brand, other, foreign].filter(Boolean);
  await db.scoreSnapshot.deleteMany({ where: { strategyId: { in: brandIds } } });
  await db.jehutyCuration.deleteMany({ where: { strategyId: { in: brandIds } } });
  await db.signal.deleteMany({ where: { strategyId: { in: brandIds } } });
  await db.strategy.deleteMany({ where: { id: { in: brandIds } } });
  await db.user.deleteMany({ where: { id: { in: [userId, foreignUserId].filter(Boolean) } } });
  await db.operator.deleteMany({ where: { id: { in: [operatorId, foreignOperatorId].filter(Boolean) } } });
  await db.$disconnect();
});
describe.sequential("brand-local drift receipt", () => {
  it("never borrows another brand's latest diagnostic, even under the same operator", async () => {
    await event(brand, 10);
    await event(other, 25);
    expect(await detectStrategyDrift(brand, "a")).toMatchObject({ previous: 10, current: 8, driftPercent: -20 });
  });
  it("does not let a prescription, orphan or conflicting attribution hide the last measurement", async () => {
    await event(brand, 16, "prescription");
    await event(null, 20);
    await event(brand, 24, "drift_detected", other);
    expect(await detectStrategyDrift(brand, "a")).toMatchObject({ previous: 10, current: 8, driftPercent: -20 });
  });
  it("returns insufficient evidence for a pillar without a receipt instead of stable zero", async () => {
    expect(await detectStrategyDrift(brand, "d")).toMatchObject({ status: "INSUFFICIENT_DATA", current: null, previous: null, driftPercent: null });
  });
  it("exposes the actual receipt and keeps zero distinct from a missing baseline", async () => {
    const latest = await event(brand, 0);
    expect(await detectStrategyDrift(brand, "a")).toMatchObject({ status: "ZERO_BASELINE", current: 8, previous: 0, driftPercent: null, baselineId: latest.id, baselineAt: latest.createdAt });
  });
  it("refuses malformed numeric evidence instead of coercing it into a percentage", async () => {
    await event(brand, "15");
    expect(await detectStrategyDrift(brand, "a")).toMatchObject({ status: "INSUFFICIENT_DATA", previous: null, driftPercent: null });
    await event(brand, 26);
    expect(await detectStrategyDrift(brand, "a")).toMatchObject({ status: "INSUFFICIENT_DATA", previous: null, driftPercent: null });
  });
  it("keeps agency feeds within accessible portfolios and filters diagnostics before pagination", async () => {
    const owned = await event(brand, 10);
    for (let i = 0; i < 55; i++) await event(foreign, 25);
    const ownedSignal = await db.signal.create({ data: { strategyId: brand, type: "METRIC", data: { title: "Mesure propre" } } });
    const foreignSignal = await db.signal.create({ data: { strategyId: foreign, type: "WEAK_SIGNAL_ALERT", data: { title: "Étranger", affectedStrategyIds: [brand] } } });
    const caller = jehutyRouter.createCaller({ db, headers: undefined, session: { user: { id: userId, role: "USER" }, expires: new Date(Date.now() + 60_000).toISOString() } });
    const agencyFeed = await caller.feed({ limit: 100 });
    expect(agencyFeed.map((item) => item.sourceId)).toContain(ownedSignal.id);
    expect(agencyFeed.map((item) => item.sourceId)).toContain(owned.id);
    expect(agencyFeed.some((item) => item.strategyId === foreign)).toBe(false);
    const brandFeed = await caller.feed({ strategyId: brand, limit: 100 });
    expect(brandFeed.map((item) => item.sourceId)).toContain(owned.id);
    expect(brandFeed.map((item) => item.sourceId)).not.toContain(foreignSignal.id);
    await expect(caller.feed({ strategyId: foreign })).rejects.toThrow("appartient pas");
    const dashboard = await caller.dashboard({ strategyId: brand });
    expect(dashboard.acceptanceRate).toBeNull();
    expect(dashboard.marketHealthScore).toBeNull();
  });
  it("refreshes without generation by default and only uses the existing recommendation engine after explicit opt-in", async () => {
    const { refreshBrandGazette } = await vi.importActual<typeof import("@/server/services/jehuty/refresh")>("@/server/services/jehuty/refresh");
    assisted.generate.mockClear();
    const manual = await refreshBrandGazette(brand);
    expect(manual.sections.find((s) => s.section === "RECOMMENDATION")).toMatchObject({ status: "DEFERRED", count: 0 });
    expect(assisted.generate).not.toHaveBeenCalled();
    await refreshBrandGazette(brand, { withRecos: true });
    expect(assisted.generate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ strategyId: brand, missionType: "SESHAT_OBSERVATION" }));
  });
  it("keeps a failed assisted analysis retryable instead of claiming a running recommendation", async () => {
    const signal = await db.signal.create({ data: { strategyId: brand, type: "METRIC", data: { title: "Observation à examiner" } } });
    const caller = jehutyRouter.createCaller({ db, headers: undefined, session: { user: { id: userId, role: "USER" }, expires: new Date(Date.now() + 60_000).toISOString() } });
    assisted.generate.mockResolvedValueOnce({ batchId: "", totalRecos: 0, recosByPillar: {}, autoApplied: 0, errors: [{ pillarKey: "a", error: "Provider unavailable (fixture)" }] });
    await expect(caller.triggerNotoria({ strategyId: brand, signalId: signal.id })).rejects.toThrow("n’a pas pu produire");
    expect(await db.jehutyCuration.count({ where: { strategyId: brand, itemId: signal.id } })).toBe(0);
    assisted.generate.mockResolvedValueOnce({ batchId: "fixture-batch", totalRecos: 2, recosByPillar: { a: 2 }, autoApplied: 0, errors: [] });
    expect(await caller.triggerNotoria({ strategyId: brand, signalId: signal.id })).toMatchObject({ batchId: "fixture-batch", totalRecos: 2, failedParts: 0 });
    expect(await db.jehutyCuration.count({ where: { strategyId: brand, itemId: signal.id, action: "NOTORIA_TRIGGERED" } })).toBe(1);
  });
});
