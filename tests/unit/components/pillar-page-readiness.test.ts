// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PillarPage } from "@/components/cockpit/pillar-page";

const fixture = vi.hoisted(() => ({
  access: { data: { access: "owner", writeZones: ["*"] }, isLoading: false, isError: false, isFetching: false },
  canOperate: false,
  readiness: { data: undefined as any, isLoading: false, isError: false, refetch: vi.fn() },
  get: { data: { pillar: { content: {}, validationStatus: "VALIDATED" } }, isLoading: false, refetch: vi.fn() },
  assess: { data: { currentStage: "COMPLETE", completionPct: 100, enrichedPct: 100, needsHuman: [] as string[], optionalFillable: [] }, refetch: vi.fn() },
}));
vi.mock("@/lib/trpc/client", () => {
  const other = { useQuery: () => ({ data: [], refetch: vi.fn() }), useMutation: () => ({ isPending: false, mutate: vi.fn() }) };
  return { trpc: {
    auth: { me: { useQuery: () => ({ data: { canOperate: fixture.canOperate } }) } },
    strategy: { getMyAccess: { useQuery: () => fixture.access } },
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
vi.mock("@/components/cockpit/pillars", () => ({ BESPOKE_PILLAR_RENDERERS: {} }));
vi.mock("@/components/cockpit/field-renderers", () => ({
  AutoField: () => null, FocusModal: () => null, InlineBadge: () => null,
  isInlineField: () => false, getFieldLabel: (key: string) => key,
}));
vi.mock("@/components/pillars/amend-pillar-modal", () => ({ AmendPillarModal: () => null }));
vi.mock("@/components/cockpit/action-database-panel", () => ({
  ActionDatabasePanel: ({ canWrite = true, canSync = true }: { canWrite?: boolean; canSync?: boolean }) =>
    React.createElement("div", {},
      React.createElement("button", { disabled: !canWrite }, "Choisir une action"),
      React.createElement("button", { disabled: !canSync }, "Synchroniser les actions")),
}));
vi.mock("@/components/pillars/recalculate-rtis-button", () => ({
  RecalculateRtisButton: ({ onComplete, canRecalculate = true }: { onComplete?: () => void; canRecalculate?: boolean }) =>
    React.createElement("button", { onClick: onComplete, disabled: !canRecalculate }, "Recalcul reçu"),
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
  fixture.access.data = { access: "owner", writeZones: ["*"] };
  fixture.access.isLoading = false;
  fixture.access.isError = false;
  fixture.access.isFetching = false;
  fixture.canOperate = false;
  fixture.get.data.pillar.content = {};
  fixture.get.data.pillar.validationStatus = "VALIDATED";
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("PillarPage — current state differs from field population", () => {
  it("does not turn a missing historical projection into zero growth", () => {
    fixture.get.data.pillar.content = { computed: { roadmapRoutes: [
      { key: "TARGET", label: "Cible", recommended: true },
    ] } };
    render(React.createElement(PillarPage, { pageKey: "roadmap" }));
    expect(screen.getByText("Projection à préciser")).toBeTruthy();
    expect(screen.queryByText("+0%")).toBeNull();
    expect(screen.getByText(/hypothèses de travail/)).toBeTruthy();
  });
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

  it.each(["collaborator", "none"])("closes strategic commands for %s even when the user is an operator elsewhere", (access) => {
    fixture.access.data = { access, writeZones: [] };
    fixture.canOperate = true;
    render(React.createElement(PillarPage, { pageKey: "roadmap" }));
    expect((screen.getByRole("button", { name: "Recalcul reçu" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getAllByRole("button", { name: "Retenir cette ambition" }).every(b => (b as HTMLButtonElement).disabled)).toBe(true);
    expect(screen.queryByRole("button", { name: /Enrichir|Générer/ })).toBeNull();
  });

  it.each(["isLoading", "isError", "isFetching"] as const)("does not keep write controls open when brand access is %s", (state) => {
    fixture.access[state] = true;
    render(React.createElement(PillarPage, { pageKey: "roadmap" }));
    expect((screen.getByRole("button", { name: "Recalcul reçu" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("keeps owner's manual choices while hiding the operator-only synchronization", () => {
    render(React.createElement(PillarPage, { pageKey: "potential" }));
    expect((screen.getByRole("button", { name: "Choisir une action" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "Synchroniser les actions" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("keeps delegated calendar choices separate from nondelegable strategic recalculation", () => {
    fixture.access.data = { access: "collaborator", writeZones: ["calendar"] };
    fixture.canOperate = true;
    render(React.createElement(PillarPage, { pageKey: "potential" }));
    expect((screen.getByRole("button", { name: "Choisir une action" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "Synchroniser les actions" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "Recalcul reçu" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("does not offer foundation editing to a read-only collaborator", () => {
    fixture.access.data = { access: "collaborator", writeZones: [] };
    render(React.createElement(PillarPage, { pageKey: "identity" }));
    expect(screen.queryByRole("link", { name: "Modifier" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Modifier" })).toBeNull();
  });

  it("closes route selection as well as recalculation when the plan is locked", () => {
    fixture.get.data.pillar.validationStatus = "LOCKED";
    fixture.canOperate = true;
    render(React.createElement(PillarPage, { pageKey: "roadmap" }));
    expect((screen.getByRole("button", { name: "Recalcul reçu" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getAllByRole("button", { name: "Retenir cette ambition" }).every(b => (b as HTMLButtonElement).disabled)).toBe(true);
  });
});
