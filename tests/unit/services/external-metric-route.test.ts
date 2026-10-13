import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), cron: vi.fn(), emit: vi.fn(), meter: vi.fn() }));
vi.mock("@/lib/cron-auth", () => ({ verifyCronSecret: mocks.cron }));
vi.mock("@/server/services/anubis/mcp-billing", () => ({ authenticateMcpRequest: mocks.auth, meterMcp: mocks.meter }));
vi.mock("@/server/services/mestor/intents", () => ({ emitIntent: mocks.emit }));
import { POST } from "@/app/api/ingest/metrics/route";
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
});
