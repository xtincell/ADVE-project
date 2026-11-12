// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RecalculateRtisButton } from "@/components/pillars/recalculate-rtis-button";

const fixture = vi.hoisted(() => ({ result: {} as Record<string, unknown>, mutate: vi.fn() }));
vi.mock("@/lib/trpc/client", () => ({ trpc: { pillar: { actualize: {
  useMutation: (options: { onSuccess: (result: unknown) => void }) => ({
    isPending: false,
    mutate: (input: unknown) => { fixture.mutate(input); options.onSuccess(fixture.result); },
  }),
} } } }));
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("React", React); fixture.result = {}; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function load(canRecalculate = true, onComplete = vi.fn()) {
  render(React.createElement(RecalculateRtisButton, { strategyId: "fixture", pillarKey: "S", canRecalculate, onComplete } as any));
  return { button: screen.getByRole("button", { name: /Recalculer/ }), onComplete };
}

describe("manual recalculation — saved proposal and actionable refusal", () => {
  it("does not emit a mutation from a read-only control", () => {
    const { button } = load(false);
    fireEvent.click(button);
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(fixture.mutate).not.toHaveBeenCalled();
  });

  it("announces the saved proposal without presenting population as an approval", () => {
    fixture.result = { updated: true, version: 4, maturityStage: "INTAKE", maturityCompletionPct: 35 };
    const { button, onComplete } = load();
    fireEvent.click(button);
    expect(screen.getByRole("status").textContent).toContain("Plan recalculé et sauvegardé — proposition à relire");
    expect(screen.queryByText(/INTAKE|stage |35%/)).toBeNull();
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it.each([
    ["SYNTHESIS_CHOICE_REQUIRED: internal ids", "Retenez d’abord"],
    ["PILLAR_SOURCE_VERSION_CONFLICT: a old 3 current 4", "sources ont changé"],
    ["Pilier s est LOCKED — seul un OPERATOR peut le modifier", "verrouillé"],
    ["FIELD_PROVENANCE_REFUSED: source protected", "décision humaine"],
    ["Uncaught database connection: private detail", "n’a pas pu être sauvegardé"],
  ])("renders a business refusal for %s and does not refresh as a success", (error, hint) => {
    fixture.result = { updated: false, error };
    const { button, onComplete } = load();
    fireEvent.click(button);
    expect(screen.getByRole("alert").textContent).toContain(hint);
    expect(screen.getByRole("alert").textContent).not.toContain(error);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("does not invent a success when no updated flag was received", () => {
    const { button, onComplete } = load();
    fireEvent.click(button);
    expect(screen.getByRole("alert").textContent).toContain("n’a pas pu être sauvegardé");
    expect(onComplete).not.toHaveBeenCalled();
  });
});
