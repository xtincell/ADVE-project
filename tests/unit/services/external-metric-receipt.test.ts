import { beforeEach, describe, expect, it, vi } from "vitest";
import { IngestSchema } from "@/app/api/ingest/metrics/schema";
import { signalObservation } from "@/domain/signal-observation";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(), lock: vi.fn(), campaign: vi.fn(), aarr: vi.fn(),
  update: vi.fn(), create: vi.fn(), activity: vi.fn(), activityUpdate: vi.fn(),
  receipts: vi.fn(), signalCreate: vi.fn(), strategy: vi.fn(),
}));
vi.mock("@/lib/db", () => {
  const client = {
    $executeRaw: mocks.lock,
    strategy: { findUnique: mocks.strategy },
    campaign: { findUnique: mocks.campaign },
    campaignAARRMetric: { findFirst: mocks.aarr, findMany: mocks.aarr, update: mocks.update, create: mocks.create },
    missionActivity: { findUnique: mocks.activity, update: mocks.activityUpdate },
    signal: { findFirst: mocks.receipts, findMany: mocks.receipts, create: mocks.signalCreate },
  };
  mocks.transaction.mockImplementation(async (run: (tx: typeof client) => unknown) => run(client));
  return { db: { ...client, $transaction: mocks.transaction } };
});
import { ingestExternalMetric } from "@/server/services/anubis/metric-ingest";
type Ingest = Parameters<typeof ingestExternalMetric>[0];
const payload = () => ({
  strategyId: "brand", sourceType: "QUIZ" as const, sourceLabel: "Quiz de recette",
  observationId: "quiz:snapshot:001", sourceVersion: "six-questions-v1",
  observedAt: "2026-10-01T10:00:00.000Z", period: "2026-10",
  metrics: [{ metric: "quiz_completions", value: 6 }],
});
const intent = (data: Record<string, unknown> = {}) => ({
  kind: "INGEST_EXTERNAL_METRIC", operatorId: "operator", ...payload(), ...data,
}) as unknown as Ingest;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.receipts.mockResolvedValue([]);
  mocks.strategy.mockResolvedValue({ id: "brand" });
  mocks.aarr.mockResolvedValue([]);
  mocks.campaign.mockResolvedValue({ strategyId: "brand" });
  mocks.signalCreate.mockResolvedValue({ id: "signal-1" });
  mocks.update.mockResolvedValue({ id: "metric-1" }); mocks.create.mockResolvedValue({ id: "metric-1" });
});

describe("external observations retain their producer receipt", () => {
  it("preserves the identity, source version and actual observation time", () => {
    expect(IngestSchema.parse(payload())).toMatchObject({
      observationId: "quiz:snapshot:001", sourceVersion: "six-questions-v1",
      observedAt: "2026-10-01T10:00:00.000Z",
    });
  });
  it.each(["2026-00", "2026-13", "2026-99"])("rejects invalid accounting period %s", (period) => {
    expect(IngestSchema.safeParse({ ...payload(), period }).success).toBe(false);
  });
  it.each(["observationId", "sourceVersion", "observedAt"])("rejects a partial receipt missing %s", (key) => {
    const data: Record<string, unknown> = payload(); delete data[key];
    expect(IngestSchema.safeParse(data).success).toBe(false);
  });
  it("keeps a legacy receipt unknown instead of inventing identity or time", () => {
    const legacy = IngestSchema.parse({ strategyId: "brand", sourceType: "APP", metrics: [{ metric: "dau", value: 0 }] });
    expect(legacy.observationId).toBeUndefined(); expect(legacy.observedAt).toBeUndefined();
  });
  it("rejects unsupported fields instead of silently losing an observation version", () => {
    expect(IngestSchema.safeParse({ ...payload(), sourceVerison: "typo" }).success).toBe(false);
  });
});

describe("receipt-aware admission through the existing handler", () => {
  it("records a producer receipt and protects effects with a transaction", async () => {
    const result = await ingestExternalMetric(intent());
    expect(result.status).toBe("OK"); expect(mocks.transaction).toHaveBeenCalledOnce();
    const record = mocks.signalCreate.mock.calls[0]?.[0].data;
    expect(record).toMatchObject({ strategyId: "brand", type: "EXTERNAL_METRIC", data: {
      observationId: "quiz:snapshot:001", sourceVersion: "six-questions-v1",
      observedAt: "2026-10-01T10:00:00.000Z",
    } });
    expect(record.data.payloadHash).toMatch(/^[a-f0-9]{64}$/);
  });
  it("returns the retained receipt on replay without another signal or metric write", async () => {
    await ingestExternalMetric(intent());
    const retained = mocks.signalCreate.mock.calls[0]![0].data;
    mocks.receipts.mockResolvedValue([{ id: "signal-1", data: retained.data }]);
    vi.clearAllMocks();
    const replay = await ingestExternalMetric(intent());
    expect(replay.output).toMatchObject({ signalId: "signal-1", replayed: true });
    expect(mocks.signalCreate).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
  });
  it("refuses a changed payload under the same identity before any effect", async () => {
    await ingestExternalMetric(intent());
    const retained = mocks.signalCreate.mock.calls[0]![0].data;
    mocks.receipts.mockResolvedValue([{ id: "signal-1", data: retained.data }]);
    vi.clearAllMocks();
    const changed = await ingestExternalMetric(intent({ metrics: [{ metric: "quiz_completions", value: 7 }] }));
    expect(changed.status).toBe("VETOED"); expect(changed.reason).toBe("OBSERVATION_CONFLICT");
    expect(mocks.signalCreate).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
  });
  it("recognizes the same snapshot when the producer changes the order of its cells", async () => {
    const metrics = [{ metric: "z_count", value: 1 }, { metric: "ä_count", value: 2 }];
    await ingestExternalMetric(intent({ metrics }));
    const retained = mocks.signalCreate.mock.calls[0]![0].data;
    mocks.receipts.mockResolvedValue([{ id: "signal-1", data: retained.data }]);
    vi.clearAllMocks();
    expect((await ingestExternalMetric(intent({ metrics: [...metrics].reverse() }))).output)
      .toMatchObject({ signalId: "signal-1", replayed: true });
    expect(mocks.signalCreate).not.toHaveBeenCalled();
  });
  it("preserves a manually supplied target when the observation omits it", async () => {
    mocks.aarr.mockResolvedValue([{ id: "metric-1", value: 5, target: 20, measuredAt: new Date("2026-09-30T10:00:00Z") }]);
    await ingestExternalMetric(intent({ campaignId: "campaign", metrics: [{ stage: "ACTIVATION", metric: "quiz_completions", value: 6 }] }));
    expect(mocks.update.mock.calls[0]?.[0].data).not.toHaveProperty("target");
  });
  it("refuses an ambiguous legacy metric instead of choosing one row to overwrite", async () => {
    mocks.aarr.mockResolvedValue([{ id: "metric-1" }, { id: "metric-2" }]);
    const result = await ingestExternalMetric(intent({ campaignId: "campaign", metrics: [{ stage: "ACTIVATION", metric: "quiz_completions", value: 6 }] }));
    expect(result.output).toMatchObject({ aarrWritten: 0, skipped: [{ metric: "quiz_completions", reason: expect.stringContaining("ambigu") }] });
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
  });
});

it("makes a real measurement readable with its version, without claiming causality", () => {
  const observation = signalObservation({ type: "EXTERNAL_METRIC", data: payload() });
  expect(observation.observation).toContain("quiz_completions : 6");
  expect(observation.observation).toContain("six-questions-v1");
  expect(observation.observation).toContain("2026-10-01T10:00:00.000Z");
  expect(observation.observation).not.toMatch(/croissance démontrée|cause démontrée/i);
});

describe("collector receipts and declared absences (ADR-0146, DC3 amendment)", () => {
  // Hashes produced by the 563 admission for receipts without the new optional
  // fields: a replay of an already retained observation must keep matching it.
  it("keeps the exact legacy payload hashes", async () => {
    await ingestExternalMetric(intent({ metrics: [{ metric: "quiz_completions", value: 6 },
      { stage: "ACTIVATION", metric: "b", value: 2, target: 5, kpiActivityId: null }] }));
    await ingestExternalMetric(intent({ observationId: undefined, sourceVersion: undefined, observedAt: undefined, period: "2026-09",
      metrics: [{ metric: "quiz_completions", value: 6 }, { stage: "ACTIVATION", metric: "b", value: 2, target: 5, kpiActivityId: null }] }));
    expect(mocks.signalCreate.mock.calls.map((call) => call[0].data.data.payloadHash)).toEqual([
      "670449e501bca37044cfb7907c621086535ea5a0b51cd13e567d9cd7584dd34e",
      "501d20c3f707967664cf27ae7e51be6700a7fd8e6eeb203721640ff17004aa54",
    ]);
  });
  it("accepts a COLLECTOR receipt whose only content is a declared absence", () => {
    const parsed = IngestSchema.safeParse({ ...payload(), sourceType: "COLLECTOR", metrics: [],
      unobserved: [{ metric: "followers", state: "FAILED", errorCode: "URL_METADATA_ADDRESS", source: "competitor_social_spy" }] });
    expect(parsed.success).toBe(true);
    expect(IngestSchema.safeParse({ ...payload(), metrics: [], unobserved: [] }).success).toBe(false);
  });
  it("binds a producer digest to an identified observation only", () => {
    const digest = "a".repeat(64);
    expect(IngestSchema.safeParse({ ...payload(), sourceDigest: digest }).success).toBe(true);
    expect(IngestSchema.safeParse({ ...payload(), observationId: undefined, sourceVersion: undefined, observedAt: undefined,
      sourceDigest: digest }).success).toBe(false);
    expect(IngestSchema.safeParse({ ...payload(), sourceDigest: "A".repeat(64) }).success).toBe(false);
  });
  it("retains absences and cell provenance without writing a value, and hashes them", async () => {
    const result = await ingestExternalMetric(intent({ sourceType: "COLLECTOR", campaignId: "campaign", sourceDigest: "b".repeat(64),
      metrics: [{ metric: "performance_score", value: 80, source: "web_performance", subject: "https://example.test/",
        unit: "score_0_100", observedAt: "2026-10-01T09:00:00.123456Z" }],
      unobserved: [{ metric: "followers", state: "NOT_PUBLISHED", source: "competitor_social_spy", unit: "count",
        observedAt: "2026-10-01T09:00:02Z" }] }));
    expect(result.status).toBe("OK");
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.activityUpdate).not.toHaveBeenCalled();
    const data = mocks.signalCreate.mock.calls[0]![0].data.data;
    expect(data.metrics).toEqual([{ stage: null, metric: "performance_score", value: 80, kpiActivityId: null,
      source: "web_performance", subject: "https://example.test/", unit: "score_0_100", observedAt: "2026-10-01T09:00:00.123456Z" }]);
    expect(data.unobserved).toEqual([{ metric: "followers", state: "NOT_PUBLISHED", source: "competitor_social_spy",
      unit: "count", observedAt: "2026-10-01T09:00:02Z" }]);
    expect(data.sourceDigest).toBe("b".repeat(64));
    expect(JSON.stringify(data.unobserved)).not.toContain('"value"');
    expect(result.summary).toContain("1 mesure(s) sans valeur");
  });
  it("refuses a cell observed after reception", async () => {
    const result = await ingestExternalMetric(intent({ metrics: [{ metric: "x", value: 1, observedAt: "2999-01-01T00:00:00Z" }] }));
    expect(result).toMatchObject({ status: "VETOED", reason: "OBSERVATION_IN_FUTURE" });
    expect(mocks.signalCreate).not.toHaveBeenCalled();
  });
  it("refuses an unknown brand before any effect instead of failing on a foreign key", async () => {
    mocks.strategy.mockResolvedValue(null);
    const result = await ingestExternalMetric(intent());
    expect(result).toMatchObject({ status: "VETOED", reason: "STRATEGY_NOT_FOUND" });
    expect(mocks.signalCreate).not.toHaveBeenCalled();
  });
  it("renders absences as such, never as zero, with the receipt digest", () => {
    const observation = signalObservation({ type: "EXTERNAL_METRIC", data: { ...payload(), sourceType: "COLLECTOR",
      sourceDigest: "c".repeat(64), metrics: [{ metric: "performance_score", value: 80, source: "web_performance" }],
      unobserved: [{ metric: "followers", state: "FAILED", errorCode: "URL_METADATA_ADDRESS", source: "competitor_social_spy" },
        { metric: "speed_index_score", state: "NOT_PUBLISHED", source: "web_performance" },
        { metric: "my_rank", state: "NOT_REQUESTED", source: "search_visibility" }] } }).observation;
    expect(observation).toContain("performance_score : 80 — web_performance.");
    expect(observation).toContain("followers : échec de la source (URL_METADATA_ADDRESS) — competitor_social_spy.");
    expect(observation).toContain("speed_index_score : valeur non publiée — web_performance.");
    expect(observation).toContain("my_rank : non demandée — search_visibility.");
    expect(observation).toContain("c".repeat(64));
    expect(observation).not.toMatch(/followers : 0|speed_index_score : 0/);
  });
});
