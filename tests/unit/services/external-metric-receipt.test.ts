import { beforeEach, describe, expect, it, vi } from "vitest";
import { IngestSchema } from "@/app/api/ingest/metrics/schema";
import { signalObservation } from "@/domain/signal-observation";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(), lock: vi.fn(), campaign: vi.fn(), aarr: vi.fn(),
  update: vi.fn(), create: vi.fn(), activity: vi.fn(), activityUpdate: vi.fn(),
  receipts: vi.fn(), signalCreate: vi.fn(),
}));
vi.mock("@/lib/db", () => {
  const client = {
    $executeRaw: mocks.lock,
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
