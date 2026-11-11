import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), cron: vi.fn(), emit: vi.fn(), meter: vi.fn() }));
vi.mock("@/lib/cron-auth", () => ({ verifyCronSecret: mocks.cron }));
vi.mock("@/server/services/anubis/mcp-billing", () => ({ authenticateMcpRequest: mocks.auth, meterMcp: mocks.meter }));
vi.mock("@/server/services/mestor/intents", () => ({ emitIntent: mocks.emit }));
import { POST } from "@/app/api/ingest/metrics/route";
import { readFileSync } from "node:fs";
const payload = () => ({ strategyId: "brand", sourceType: "QUIZ", observationId: "quiz:snapshot:001",
  sourceVersion: "six-questions-v1", observedAt: "2026-10-01T10:00:00Z", period: "2026-10",
  metrics: [{ metric: "quiz_completions", value: 6 }] });
function request(data = payload()) { return new Request("http://localhost/api/ingest/metrics", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data),
}); }
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ ok: true, apiKeyId: "key", scopeKind: "BRAND", scopeStrategyId: "brand" });
  mocks.cron.mockReturnValue(false);
  mocks.emit.mockResolvedValue({ status: "OK", output: { signalId: "signal-1", replayed: false } });
  mocks.meter.mockImplementation(async (_gate, _server, _tool, run) => run());
});
describe("existing metric HTTP route", () => {
  it("emits the receipt intact and keeps an omitted target absent", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ result: { signalId: "signal-1", replayed: false } });
    expect(mocks.emit.mock.calls[0]?.[0]).toMatchObject({ ...payload(), kind: "INGEST_EXTERNAL_METRIC" });
    expect(mocks.emit.mock.calls[0]?.[0].metrics[0]).not.toHaveProperty("target");
    expect(mocks.meter).toHaveBeenCalledOnce();
  });
  it("reports a changed receipt as a metered conflict rather than generic HTTP 500", async () => {
    mocks.emit.mockResolvedValue({ status: "VETOED", reason: "OBSERVATION_CONFLICT", summary: "Donnée différente sous la même identité" });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: "OBSERVATION_CONFLICT" });
    expect(mocks.meter).toHaveBeenCalledOnce();
  });
  it("rejects a malformed month before emission or metering", async () => {
    expect((await POST(request({ ...payload(), period: "2026-99" }))).status).toBe(400);
    expect(mocks.emit).not.toHaveBeenCalled(); expect(mocks.meter).not.toHaveBeenCalled();
  });
  it("keeps foreign-brand scope denial before emission or metering", async () => {
    expect((await POST(request({ ...payload(), strategyId: "foreign" }))).status).toBe(403);
    expect(mocks.emit).not.toHaveBeenCalled(); expect(mocks.meter).not.toHaveBeenCalled();
  });
  it("keeps an unauthenticated refusal and the existing internal cron path", async () => {
    mocks.auth.mockResolvedValue({ ok: false, response: new Response("Unauthorized", { status: 401 }) });
    expect((await POST(request())).status).toBe(401); expect(mocks.emit).not.toHaveBeenCalled();
    mocks.cron.mockReturnValue(true);
    expect((await POST(request())).status).toBe(200); expect(mocks.emit).toHaveBeenCalledOnce();
    expect(mocks.meter).not.toHaveBeenCalled();
  });
  it("answers 401 to an anonymous caller before reading or validating the body", async () => {
    mocks.auth.mockResolvedValue({ ok: false, response: new Response("Unauthorized", { status: 401 }) });
    const malformed = await POST(request({ ...payload(), period: "2026-99" }));
    expect(malformed.status).toBe(401);
    expect(await malformed.text()).not.toMatch(/VALIDATION_FAILED|period/);
    const notJson = new Request("http://localhost/api/ingest/metrics", {
      method: "POST", headers: { "content-type": "application/json" }, body: "{",
    });
    expect((await POST(notJson)).status).toBe(401);
    expect(mocks.emit).not.toHaveBeenCalled(); expect(mocks.meter).not.toHaveBeenCalled();
  });
});

describe("DataCollector receipt deposited on the same route (DC3)", () => {
  const receipt = () => JSON.parse(readFileSync("tests/fixtures/datacollector/receipt-v1.json", "utf8")) as Record<string, unknown>;
  const deposit = (body: unknown) => new Request("http://localhost/api/ingest/metrics", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  it("verifies the receipt and emits the existing intent with its identity and fingerprint", async () => {
    const response = await POST(deposit({ strategyId: "brand", receipt: receipt() }));
    expect(response.status).toBe(200);
    const emitted = mocks.emit.mock.calls[0]?.[0];
    expect(emitted).toMatchObject({ kind: "INGEST_EXTERNAL_METRIC", strategyId: "brand", sourceType: "COLLECTOR",
      observationId: "datacollector:20261110_0123456789abcdef0123456789abcdef",
      sourceDigest: "b4e58243ccdeba9ee8fe8f6d9912717026788a67585194a7ed316d8813bd5bec" });
    expect(emitted.metrics.every((m: { stage?: unknown; kpiActivityId?: unknown }) => !m.stage && !m.kpiActivityId)).toBe(true);
    expect(emitted.unobserved).toHaveLength(4);
    expect(mocks.meter).toHaveBeenCalledOnce();
  });
  it.each([
    ["a legacy receipt", () => { const { schema: _s, fingerprint: _f, measures: _m, target: _t, tool: _o, ...r } = receipt(); return r; }, "RECEIPT_LEGACY_UNVERIFIABLE"],
    ["an edited receipt", () => { const r = receipt(); (r.measures as Array<{ value: unknown }>)[0]!.value = 81; return r; }, "RECEIPT_FINGERPRINT_MISMATCH"],
    ["an unknown schema version", () => ({ ...receipt(), schema: { name: "datacollector/observation-receipt", version: 2 } }), "RECEIPT_SCHEMA_UNSUPPORTED"],
  ])("refuses %s with a typed 400 before emission or metering", async (_label, make, code) => {
    const response = await POST(deposit({ strategyId: "brand", receipt: make() }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: code });
    expect(mocks.emit).not.toHaveBeenCalled(); expect(mocks.meter).not.toHaveBeenCalled();
  });
  it("refuses a deposit with extra keys", async () => {
    expect((await POST(deposit({ strategyId: "brand", receipt: receipt(), period: "2026-11" }))).status).toBe(400);
    expect(mocks.emit).not.toHaveBeenCalled();
  });
  it("keeps the foreign-brand refusal for a deposit", async () => {
    const response = await POST(deposit({ strategyId: "foreign", receipt: receipt() }));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "SCOPE_DENIED" });
    expect(mocks.emit).not.toHaveBeenCalled();
  });
  it("answers 404 for an unknown brand instead of 409 or 500", async () => {
    mocks.auth.mockResolvedValue({ ok: true, apiKeyId: "key", scopeKind: "SYSTEM" });
    mocks.emit.mockResolvedValue({ status: "VETOED", reason: "STRATEGY_NOT_FOUND", summary: "Observation refusée : STRATEGY_NOT_FOUND" });
    const response = await POST(deposit({ strategyId: "missing", receipt: receipt() }));
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: "STRATEGY_NOT_FOUND" });
  });
});
