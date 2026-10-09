// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PillarPage } from "@/components/cockpit/pillar-page";

const fixture = vi.hoisted(() => ({
  readiness: { data: undefined as any, isLoading: false, isError: false, refetch: vi.fn() },
  get: { data: { pillar: { content: {}, validationStatus: "VALIDATED" } }, isLoading: false, refetch: vi.fn() },
  assess: { data: { currentStage: "COMPLETE", completionPct: 100, enrichedPct: 100, needsHuman: [] as string[], optionalFillable: [] }, refetch: vi.fn() },
}));
vi.mock("@/lib/trpc/client", () => {
  const other = { useQuery: () => ({ data: [], refetch: vi.fn() }), useMutation: () => ({ isPending: false, mutate: vi.fn() }) };
  return { trpc: {
    useUtils: () => ({ pillar: { listEditableFields: { invalidate: vi.fn() } } }),
    pillar: new Proxy({
      readiness: { useQuery: () => fixture.readiness },
      get: { useQuery: () => fixture.get },
      assess: { useQuery: () => fixture.assess },
    }, { get: (target, key) => target[key as keyof typeof target] ?? other }),
    notoria: new Proxy({}, { get: () => other }),
  } };
});
vi.mock("@/components/cockpit/strategy-context", () => ({ useCurrentStrategyId: () => "strategy-fixture" }));
vi.mock("@/components/cockpit/use-can-operate", () => ({ useCanOperate: () => false }));
vi.mock("@/components/cockpit/pillars", () => ({ BESPOKE_PILLAR_RENDERERS: {} }));
vi.mock("@/components/cockpit/field-renderers", () => ({
  AutoField: () => null, FocusModal: () => null, InlineBadge: () => null,
  isInlineField: () => false, getFieldLabel: (key: string) => key,
}));
vi.mock("@/components/pillars/amend-pillar-modal", () => ({ AmendPillarModal: () => null }));
vi.mock("@/components/cockpit/action-database-panel", () => ({ ActionDatabasePanel: () => null }));
vi.mock("@/components/pillars/recalculate-rtis-button", () => ({
  RecalculateRtisButton: ({ onComplete }: { onComplete?: () => void }) =>
    React.createElement("button", { onClick: onComplete }, "Recalcul reçu"),
}));

function current(stale = false) {
  return { byPillar: { S: {
    stage: "COMPLETE", completionPct: 100, stale,
    displayLabel: stale ? "Périmé" : "Validé", validationStatus: "VALIDATED",
    gates: { DISPLAY_AS_COMPLETE: { ok: !stale } },
  } } };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  fixture.readiness.data = current();
  fixture.readiness.isLoading = false;
  fixture.readiness.isError = false;
  fixture.assess.data.needsHuman = [];
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("PillarPage — current state differs from field population", () => {
  it("shows a stale complete pillar as stale, even with a stored approval and 100% fields", () => {
    fixture.readiness.data = current(true);
    render(React.createElement(PillarPage, { pageKey: "roadmap" }));
    expect(screen.getByRole("status").textContent).toBe("Périmé");
    expect(screen.queryByText("Complet")).toBeNull();
    expect(screen.queryByText("Valide")).toBeNull();
    expect(screen.getByText("Champs renseignés")).toBeTruthy();
    expect(screen.getAllByText("100%")).toHaveLength(2);
  });

  it("does not infer an approval from a population assessment while readiness is loading", () => {
    fixture.readiness.data = undefined;
    fixture.readiness.isLoading = true;
    render(React.createElement(PillarPage, { pageKey: "roadmap" }));
    expect(screen.getByRole("status").textContent).toBe("État en cours de lecture");
    expect(screen.queryByText("Complet")).toBeNull();
    expect(screen.queryByText("Valide")).toBeNull();
  });

  it("does not reuse an old successful status after the current read failed", () => {
    fixture.readiness.isError = true;
    render(React.createElement(PillarPage, { pageKey: "roadmap" }));
    expect(screen.getByRole("status").textContent).toBe("État à vérifier");
    expect(screen.queryByText("Validé")).toBeNull();
  });

  it("does not replace an absent central verdict with an optimistic assessment", () => {
    fixture.readiness.data = { byPillar: {} };
    render(React.createElement(PillarPage, { pageKey: "roadmap" }));
    expect(screen.getByRole("status").textContent).toBe("État à vérifier");
    expect(screen.queryByText("Complet")).toBeNull();
  });

  it("shows the received central approval separately from the field count", () => {
    render(React.createElement(PillarPage, { pageKey: "roadmap" }));
    expect(screen.getByRole("status").textContent).toBe("Validé");
    expect(screen.getByText("Champs renseignés")).toBeTruthy();
  });

  it("keeps a foundation page with required manual fields on the same current verdict", () => {
    fixture.assess.data.needsHuman = ["archetype"];
    fixture.readiness.data = { byPillar: { A: current(true).byPillar.S } };
    render(React.createElement(PillarPage, { pageKey: "identity" }));
    expect(screen.getByRole("status").textContent).toBe("Périmé");
    expect(screen.getByText(/1 champ essentiel à saisir/)).toBeTruthy();
    expect(screen.queryByText("Complet")).toBeNull();
  });

  it("rereads the current state and content after a recalculation completes", () => {
    render(React.createElement(PillarPage, { pageKey: "roadmap" }));
    fireEvent.click(screen.getByRole("button", { name: "Recalcul reçu" }));
    expect(fixture.get.refetch).toHaveBeenCalledTimes(1);
    expect(fixture.assess.refetch).toHaveBeenCalledTimes(1);
    expect(fixture.readiness.refetch).toHaveBeenCalledTimes(1);
  });
});
