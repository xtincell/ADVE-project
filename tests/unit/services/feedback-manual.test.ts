import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  findSignal: vi.fn(), score: vi.fn(), capture: vi.fn(), llm: vi.fn(), emit: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: { signal: { findUniqueOrThrow: mocks.findSignal } } }));
vi.mock("@/server/services/advertis-scorer", () => ({ scoreObject: mocks.score }));
vi.mock("@/server/services/knowledge-capture", () => ({ captureEvent: mocks.capture }));
vi.mock("@/server/services/llm-gateway", () => ({ callLLM: mocks.llm }));
vi.mock("@/server/services/mestor/intents", () => ({ emitIntent: mocks.emit }));
import { processSignal } from "@/server/services/feedback-loop";
describe("manual signal processing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findSignal.mockResolvedValue({ id: "signal-a", strategyId: "brand-a", strategy: { advertis_vector: { a: 20 } } });
    mocks.score.mockResolvedValue({ a: 8 });
    mocks.capture.mockResolvedValue(undefined);
    mocks.llm.mockResolvedValue({ text: '{"actions":["Action non demandée"]}' });
  });
  it("retains a severe alert without calling a provider, creating a prescription or launching an agent", async () => {
    const result = await processSignal("signal-a");
    expect(result).toEqual([expect.objectContaining({
      signalId: "signal-a", strategyId: "brand-a", pillar: "a", previousScore: 20,
      currentScore: 8, severity: "critical", diagnostic: null, prescriptionId: null,
    })]);
    expect(mocks.llm).not.toHaveBeenCalled();
    expect(mocks.emit).not.toHaveBeenCalled();
    expect(mocks.capture).toHaveBeenCalledTimes(1);
    expect(mocks.capture).toHaveBeenCalledWith("DIAGNOSTIC_RESULT", expect.objectContaining({
      data: expect.objectContaining({ strategyId: "brand-a", type: "drift_detected", previous: 20, current: 8 }),
    }), "brand-a");
  });
  it.each([undefined, null, "20", 26, NaN])("does not turn an invalid previous score (%s) into a measurement", async (previous) => {
    mocks.findSignal.mockResolvedValue({ id: "signal-a", strategyId: "brand-a", strategy: { advertis_vector: { a: previous } } });
    expect(await processSignal("signal-a")).toEqual([]);
    expect(mocks.capture).not.toHaveBeenCalled();
    expect(mocks.llm).not.toHaveBeenCalled();
  });
  it("does not invent a decline when a recalculated pillar is missing", async () => {
    mocks.score.mockResolvedValue({});
    expect(await processSignal("signal-a")).toEqual([]);
    expect(mocks.capture).not.toHaveBeenCalled();
  });
});
