// @vitest-environment jsdom
import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RtisCascadeModal } from "@/components/cockpit/rtis-cascade-modal";
const f = vi.hoisted(() => ({ success: null as null | ((r: any) => void), result: null as any,
  reset: vi.fn(), refetch: vi.fn(async () => ({})), mutate: vi.fn() }));
vi.mock("@/lib/trpc/client", () => ({ trpc: { pillar: {
  maturityReport: { useQuery: () => ({ data: { pillars: Object.fromEntries(["r", "t", "i", "s"].map(k => [k, { currentStage: "COMPLETE" }])) }, refetch: f.refetch }) },
  cascadeRTIS: { useMutation: (o: any) => { f.success = o.onSuccess; return { mutate: f.mutate, reset: f.reset, data: f.result }; } },
} } }));
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("React", React); f.result = null; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function open() {
  const onCompleted = vi.fn(); render(React.createElement(RtisCascadeModal, { open: true,
    strategyId: "synthetic", onOpenChange: vi.fn(), onCompleted }));
  fireEvent.click(screen.getByRole("button", { name: "Dériver les piliers stratégiques" }));
  return onCompleted;
}
describe("cascade acceptance uses this run's complete response", () => {
  it("does not finish from the pre-existing complete pillars while the new run is pending", () => {
    const done = open(); expect(done).not.toHaveBeenCalled();
    expect(screen.getByText(/Cascade en cours/)).toBeTruthy();
  });
  it.each([
    { label: "empty", results: [] },
    { label: "truncated", results: [{ pillarKey: "R", updated: true }] },
    { label: "failed", results: ["R", "T", "I", "S"].map(k => ({ pillarKey: k, updated: true,
      ...(k === "T" ? { error: "write refused" } : {}) })) },
  ])("does not claim success for $label responses", ({ results }) => {
    const done = open(); act(() => f.success!({ results })); expect(done).not.toHaveBeenCalled();
    expect(screen.getByText("Cascade incomplète.")).toBeTruthy();
  });
  it("acknowledges four saved results without claiming 35 deliverables were validated", () => {
    const done = open(); act(() => f.success!({ results: ["R", "T", "I", "S"].map(k => ({ pillarKey: k, updated: true })) }));
    expect(done).toHaveBeenCalledOnce();
    expect(screen.queryByText(/sans risque|8 piliers sont prêts|sans sections vides/)).toBeNull();
  });
});
