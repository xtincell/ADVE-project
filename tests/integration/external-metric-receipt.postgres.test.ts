/** Real transactions and receipts; fixtures only in the dedicated verification DB. */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
import { db } from "@/lib/db";
import { ingestExternalMetric } from "@/server/services/anubis/metric-ingest";
import { campaignManagerRouter } from "@/server/trpc/routers/campaign-manager";
type Ingest = Parameters<typeof ingestExternalMetric>[0];
let userId: string;
const brands: string[] = [];
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname);
  expect(url.pathname).toBe("/shinkiro_verify");
  userId = (await db.user.create({ data: { email: `metric-receipt-${randomUUID()}@example.invalid`, role: "ADMIN" } })).id;
});
afterAll(async () => {
  const scope = { strategyId: { in: brands } };
  const campaigns = await db.campaign.findMany({ where: scope, select: { id: true } });
  await db.signal.deleteMany({ where: scope });
  await db.campaignAARRMetric.deleteMany({ where: { campaignId: { in: campaigns.map((c) => c.id) } } });
  await db.mission.deleteMany({ where: scope });
  await db.campaign.deleteMany({ where: scope });
  await db.strategy.deleteMany({ where: { id: { in: brands } } });
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
});
async function fixture() {
  const brand = await db.strategy.create({ data: { name: "Observation — recette isolée", userId } });
  brands.push(brand.id);
  const campaign = await db.campaign.create({ data: { name: "Campagne de recette", strategyId: brand.id } });
  const mission = await db.mission.create({ data: { title: "Mission de recette", strategyId: brand.id, campaignId: campaign.id } });
  const activity = await db.missionActivity.create({ data: { title: "Activité de recette", missionId: mission.id, kpiActual: 1 } });
  const intent: Ingest = { kind: "INGEST_EXTERNAL_METRIC", operatorId: userId, strategyId: brand.id,
    sourceType: "QUIZ", sourceLabel: "Quiz isolé", observationId: `quiz:${randomUUID()}`,
    sourceVersion: "six-questions-v1", observedAt: "2026-10-01T10:00:00.000Z",
    campaignId: campaign.id, missionId: mission.id, period: "2026-10",
    metrics: [{ stage: "ACTIVATION", metric: "quiz_completions", value: 6, kpiActivityId: activity.id }],
  };
  return { brand, campaign, mission, activity, intent };
}
async function receipts(strategyId: string) {
  return db.signal.findMany({ where: { strategyId, type: "EXTERNAL_METRIC" }, orderBy: { createdAt: "asc" } });
}
function caller() {
  return campaignManagerRouter.createCaller({ db, headers: undefined, session: {
    user: { id: userId, role: "ADMIN" }, expires: new Date(Date.now() + 60_000).toISOString(),
  } });
}

describe.sequential("external observation admission on PostgreSQL", () => {
  it("retains the six-question producer version and returns one receipt on replay", async () => {
    const f = await fixture();
    const first = await ingestExternalMetric(f.intent), replay = await ingestExternalMetric(f.intent);
    expect(first.status).toBe("OK"); expect(replay.status).toBe("OK");
    expect(replay.output).toMatchObject({ ...(first.output as object), replayed: true });
    const saved = await receipts(f.brand.id);
    expect(saved).toHaveLength(1);
    expect(saved[0]?.data).toMatchObject({ observationId: f.intent.observationId, sourceVersion: "six-questions-v1",
      observedAt: f.intent.observedAt, payloadHash: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(await db.campaignAARRMetric.count({ where: { campaignId: f.campaign.id } })).toBe(1);
    expect((await db.missionActivity.findUniqueOrThrow({ where: { id: f.activity.id } })).kpiActual).toBe(6);
  });
  it("rejects changed data or source version under a retained identity", async () => {
    const f = await fixture(); await ingestExternalMetric(f.intent);
    for (const change of [{ sourceVersion: "six-questions-v2" }, { metrics: [{ stage: "ACTIVATION" as const, metric: "quiz_completions", value: 7 }] }]) {
      const result = await ingestExternalMetric({ ...f.intent, ...change });
      expect(result).toMatchObject({ status: "VETOED", reason: "OBSERVATION_CONFLICT" });
    }
    expect(await receipts(f.brand.id)).toHaveLength(1);
    expect((await db.campaignAARRMetric.findFirstOrThrow({ where: { campaignId: f.campaign.id } })).value).toBe(6);
  });
  it("serializes simultaneous delivery of one receipt without duplicate effects", async () => {
    const f = await fixture();
    // Deliberate concurrency in an isolated fixture proves the lock's effect.
    const results = await Promise.all(Array.from({ length: 5 }, () => ingestExternalMetric(f.intent)));
    expect(results.every((r) => r.status === "OK")).toBe(true);
    expect(new Set(results.map((r) => (r.output as { signalId: string }).signalId)).size).toBe(1);
    expect(results.filter((r) => !(r.output as { replayed: boolean }).replayed)).toHaveLength(1);
    expect(await receipts(f.brand.id)).toHaveLength(1);
    expect(await db.campaignAARRMetric.count({ where: { campaignId: f.campaign.id } })).toBe(1);
  });
  it("rolls back both metric and KPI writes if the receipt cannot persist, then accepts the retry", async () => {
    const f = await fixture(), suffix = randomUUID().replaceAll("-", "");
    const fn = `shk_metric_receipt_${suffix}`, trigger = `${fn}_trigger`;
    expect(f.brand.id).toMatch(/^[a-z0-9]+$/);
    await db.$executeRawUnsafe(`CREATE FUNCTION ${fn}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."strategyId" = '${f.brand.id}' THEN RAISE EXCEPTION 'isolated receipt failure'; END IF; RETURN NEW; END $$`);
    let installed = false;
    try {
      await db.$executeRawUnsafe(`CREATE TRIGGER ${trigger} BEFORE INSERT ON "Signal" FOR EACH ROW EXECUTE FUNCTION ${fn}()`);
      installed = true;
      await expect(ingestExternalMetric(f.intent)).rejects.toThrow();
      expect(await receipts(f.brand.id)).toHaveLength(0);
      expect(await db.campaignAARRMetric.count({ where: { campaignId: f.campaign.id } })).toBe(0);
      expect((await db.missionActivity.findUniqueOrThrow({ where: { id: f.activity.id } })).kpiActual).toBe(1);
    } finally {
      if (installed) await db.$executeRawUnsafe(`DROP TRIGGER ${trigger} ON "Signal"`);
      await db.$executeRawUnsafe(`DROP FUNCTION ${fn}()`);
    }
    expect((await ingestExternalMetric(f.intent)).status).toBe("OK");
    expect(await receipts(f.brand.id)).toHaveLength(1);
  });
  it("preserves the operator's target on omission and honors an explicit null on a newer observation", async () => {
    const f = await fixture();
    const row = await db.campaignAARRMetric.create({ data: { campaignId: f.campaign.id, stage: "ACTIVATION",
      metric: "quiz_completions", value: 1, target: 20, period: "2026-10", measuredAt: new Date("2026-09-30T10:00:00Z") } });
    await ingestExternalMetric(f.intent);
    expect((await db.campaignAARRMetric.findUniqueOrThrow({ where: { id: row.id } })).target).toBe(20);
    await ingestExternalMetric({ ...f.intent, observationId: `quiz:${randomUUID()}`, observedAt: "2026-10-02T10:00:00Z",
      metrics: [{ stage: "ACTIVATION", metric: "quiz_completions", value: 7, target: null }] });
    expect((await db.campaignAARRMetric.findUniqueOrThrow({ where: { id: row.id } })).target).toBeNull();
  });
  it("retains an older receipt without replacing a newer metric or KPI", async () => {
    const f = await fixture(); await ingestExternalMetric(f.intent);
    const old = await ingestExternalMetric({ ...f.intent, observationId: `quiz:${randomUUID()}`,
      observedAt: "2026-09-30T10:00:00Z", metrics: [{ ...f.intent.metrics[0]!, value: 2 }] });
    expect(old.output).toMatchObject({ aarrWritten: 0, kpiWritten: 0 });
    expect(await receipts(f.brand.id)).toHaveLength(2);
    expect((await db.campaignAARRMetric.findFirstOrThrow({ where: { campaignId: f.campaign.id } })).value).toBe(6);
    expect((await db.missionActivity.findUniqueOrThrow({ where: { id: f.activity.id } })).kpiActual).toBe(6);
  });
  it("keeps foreign campaign and activity untouched while retaining only scoped provenance", async () => {
    const f = await fixture(), foreign = await fixture();
    const result = await ingestExternalMetric({ ...f.intent, campaignId: foreign.campaign.id,
      metrics: [{ ...f.intent.metrics[0]!, kpiActivityId: foreign.activity.id }] });
    expect(result.output).toMatchObject({ aarrWritten: 0, kpiWritten: 0 });
    expect(await receipts(f.brand.id)).toHaveLength(1); expect(await receipts(foreign.brand.id)).toHaveLength(0);
    expect(await db.campaignAARRMetric.count({ where: { campaignId: foreign.campaign.id } })).toBe(0);
    expect((await db.missionActivity.findUniqueOrThrow({ where: { id: foreign.activity.id } })).kpiActual).toBe(1);
  });
  it("does not invent identity or observation time for a legacy delivery", async () => {
    const f = await fixture();
    await ingestExternalMetric({ ...f.intent, observationId: undefined, sourceVersion: undefined, observedAt: undefined });
    const saved = (await receipts(f.brand.id))[0]!;
    expect(saved.data).toMatchObject({ observationId: null, sourceVersion: null, observedAt: null });
  });
  it("keeps a dated metric when a subsequent legacy delivery has unknown observation time", async () => {
    const f = await fixture(); await ingestExternalMetric(f.intent);
    const result = await ingestExternalMetric({ ...f.intent, observationId: undefined, sourceVersion: undefined,
      observedAt: undefined, metrics: [{ ...f.intent.metrics[0]!, value: 2 }] });
    expect(result.output).toMatchObject({ aarrWritten: 0, kpiWritten: 0 });
    expect((await db.campaignAARRMetric.findFirstOrThrow({ where: { campaignId: f.campaign.id } })).value).toBe(6);
    expect((await db.missionActivity.findUniqueOrThrow({ where: { id: f.activity.id } })).kpiActual).toBe(6);
  });
  it("keeps ambiguous historical rows intact instead of overwriting the first match", async () => {
    const f = await fixture();
    await db.campaignAARRMetric.createMany({ data: [1, 2].map((value) => ({ campaignId: f.campaign.id,
      stage: "ACTIVATION" as const, metric: "quiz_completions", value, period: "2026-10" })) });
    const result = await ingestExternalMetric({ ...f.intent, metrics: [{ stage: "ACTIVATION", metric: "quiz_completions", value: 6 }] });
    expect(result.output).toMatchObject({ aarrWritten: 0 });
    const rows = await db.campaignAARRMetric.findMany({ where: { campaignId: f.campaign.id }, orderBy: { value: "asc" } });
    expect(rows.map((r) => r.value)).toEqual([1, 2]);
  });
  it("distinguishes receipt time from an old observation on the actual mission reader", async () => {
    const f = await fixture();
    await ingestExternalMetric({ ...f.intent, observedAt: "2026-08-01T10:00:00Z" });
    const view = await caller().getMissionCockpit({ campaignId: f.campaign.id, missionId: f.mission.id });
    const source = view.sources.find((s) => s.key === "QUIZ")!;
    expect(source.connected).toBe(true);
    expect(source.note).toContain("Dernière réception"); expect(source.note).toContain("antérieure à 30 jours");
  });
  it("keeps the unknown observation date visible for a legacy source", async () => {
    const f = await fixture();
    await ingestExternalMetric({ ...f.intent, observationId: undefined, sourceVersion: undefined, observedAt: undefined });
    const view = await caller().getMissionCockpit({ campaignId: f.campaign.id, missionId: f.mission.id });
    expect(view.sources.find((s) => s.key === "QUIZ")?.note).toContain("Date d'observation inconnue");
  });
  it("refuses a mission from another campaign before combining their sources", async () => {
    const f = await fixture(), other = await fixture();
    await expect(caller().getMissionCockpit({ campaignId: f.campaign.id, missionId: other.mission.id }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
