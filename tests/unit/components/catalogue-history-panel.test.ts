// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CatalogueHistoryPanel } from "@/components/cockpit/catalogue-history-panel";

const fixture = vi.hoisted(() => ({ enabled: [] as boolean[], data: undefined as unknown }));
vi.mock("@/lib/trpc/client", () => ({ trpc: { pillar: { getCatalogueHistory: { useQuery: (_input: unknown, opts: { enabled: boolean }) => {
  fixture.enabled.push(opts.enabled);
  return { data: opts.enabled ? fixture.data : undefined, isLoading: false, error: null };
} } } } }));

const write = (at: string, extra: Record<string, unknown> = {}) => ({ at, author: "OPERATOR:u1", reason: "Recette", intentId: "i", intentKind: "WRITE_PILLAR", compensatedFrom: null, ...extra });
beforeEach(() => {
  vi.stubGlobal("React", React); fixture.enabled = [];
  fixture.data = { currentVersion: 3, retiredIds: [], unattributed: [], unidentified: { current: 1, archivedVersions: 0 }, events: [
    { kind: "APPEARED", productId: "palais", name: "Palais", previousName: null, fromVersion: null, toVersion: 1, write: null, proof: null },
    { kind: "RETIRED", productId: "palais", name: "Palais", previousName: null, fromVersion: 1, toVersion: 2, write: write("2026-11-10T09:00:00.000Z"), proof: null },
    { kind: "REINTRODUCED", productId: "palais", name: "Palais", previousName: "Palais", fromVersion: 2, toVersion: 3,
      write: write("2026-11-11T09:00:00.000Z", { intentKind: "ROLLBACK_PILLAR", compensatedFrom: "i" }), proof: "RESTORATION" },
  ] };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("historique du catalogue — lecture à l'ouverture", () => {
  it("ne lit rien tant que l'historique est fermé", () => {
    render(React.createElement(CatalogueHistoryPanel, { strategyId: "fixture" }));
    expect(fixture.enabled.every(e => e === false)).toBe(true);
    expect(screen.queryByText("Réintroduction")).toBeNull();
  });

  it("dit qui a retiré puis réintroduit le produit, par quelle voie et avec quel identifiant", () => {
    const view = render(React.createElement(CatalogueHistoryPanel, { strategyId: "fixture" }));
    const details = view.container.querySelector("details")!;
    details.open = true; fireEvent(details, new Event("toggle"));
    const items = screen.getAllByRole("listitem").map(li => li.textContent);
    expect(items).toHaveLength(3);
    expect(items[0]).toContain("Réintroduction");
    expect(items[0]).toContain("restauration d’une version conservée");
    expect(items[0]).toContain("version 2 → 3");
    expect(items[1]).toContain("Retrait");
    expect(items[1]).toContain("Modification de l’équipe");
    expect(items[2]).toContain("Présent dès la plus ancienne version conservée.");
    expect(items[2]).toContain("Écriture non conservée");
    expect(items.every(text => text?.includes("palais"))).toBe(true);
    expect(screen.getByText(/1 produit\(s\) du catalogue actuel sans identifiant/)).toBeTruthy();
    expect(view.container.textContent).not.toMatch(/ROLLBACK_PILLAR|WRITE_PILLAR|OPERATOR:/);
  });
});
