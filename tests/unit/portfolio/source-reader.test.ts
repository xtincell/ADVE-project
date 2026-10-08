// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const transport = vi.hoisted(() => ({
  inputs: [] as Array<{ id: string; strategyId: string }>,
  denied: false, checking: false, retry: undefined as undefined | ((count: number, error: { data?: { code?: string } }) => boolean), setStrategyId: vi.fn(), data: {} as Record<string, unknown>,
}));
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  brandNode: { workspace: { useQuery: () => ({ data: transport.data, refetch: vi.fn() }) } },
  ingestion: { getSource: { useQuery: (input: { id: string; strategyId: string }, options: { retry?: typeof transport.retry }) => {
    transport.inputs.push(input); transport.retry = options.retry;
    return { isLoading: false, isFetching: transport.checking, error: transport.denied ? { message: "Document retiré de ce dossier" } : null,
      data: transport.denied ? undefined : { fileName: "Brief partagé", rawContent: `Pièce canonique consultée pour ${input.strategyId}` } };
  } } },
} }));
vi.mock("@/components/cockpit/strategy-context", () => ({ useStrategy: () => ({ setStrategyId: transport.setStrategyId }) }));
vi.mock("@/components/portfolio/PortfolioReferencesForm", () => ({ PortfolioReferencesForm: () => null }));
vi.mock("@/components/shared/modal", () => ({ Modal: ({ children }: { children: React.ReactNode }) => React.createElement("div", { role: "dialog" }, children) }));
import { BrandWorkspace } from "@/components/portfolio/BrandWorkspace";
beforeEach(() => {
  vi.stubGlobal("React", React);
  transport.inputs = []; transport.retry = undefined; transport.denied = false; transport.checking = false; transport.setStrategyId.mockClear();
  const root = { id: "node", name: "Marque de recette", operatorId: "team", strategyId: "owner", sourceRefs: [] };
  transport.data = { root, nodes: [root], barre: null, inheritedFrom: null, referenceIssues: [], sourceStatus: "NOT_CONNECTED",
    strategies: ["owner", "consumer"].map((id) => ({ id, name: id === "owner" ? "Dossier propriétaire" : "Dossier consommateur",
      pillars: [], brandAssets: [], campaigns: [], dataSources: [{ id: "canonical-source", fileName: "Brief partagé", certainty: "DECLARED",
        shared: id === "consumer", ownerBrandName: "Dossier propriétaire", processingStatus: "EXTRACTED", updatedAt: new Date("2026-10-08T00:00:00Z") }],
    })),
  };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const openSources = () => {
  render(React.createElement(BrandWorkspace, { nodeId: "node" }));
  fireEvent.click(screen.getByRole("button", { name: "Sources & liens" }));
};
describe("consultation documentaire depuis le dossier de marque", () => {
  it("ne relance pas un refus d’accès, mais garde les reprises bornées sur erreur temporaire", () => {
    openSources();
    fireEvent.click(screen.getByRole("button", { name: "Consulter Brief partagé dans Dossier consommateur" }));
    expect(transport.retry).toBeTypeOf("function");
    expect(transport.retry?.(0, { data: { code: "FORBIDDEN" } })).toBe(false);
    expect(transport.retry?.(0, { data: { code: "INTERNAL_SERVER_ERROR" } })).toBe(true);
    expect(transport.retry?.(2, {})).toBe(true);
    expect(transport.retry?.(3, {})).toBe(false);
  });
  it("ne montre pas le texte en cache pendant la vérification courante de l’accès", () => {
    openSources(); transport.checking = true;
    fireEvent.click(screen.getByRole("button", { name: "Consulter Brief partagé dans Dossier consommateur" }));
    expect(screen.getByRole("status").textContent).toContain("Chargement");
    expect(screen.queryByRole("textbox", { name: "Texte de référence" })).toBeNull();
  });
  it("ouvre la source partagée dans le dossier consommateur sans changer la marque globale", () => {
    openSources();
    expect(screen.getByText(/Document partagé par Dossier propriétaire/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Consulter Brief partagé dans Dossier consommateur" }));
    expect(transport.inputs.at(-1)).toEqual({ id: "canonical-source", strategyId: "consumer" });
    expect((screen.getByRole("textbox", { name: "Texte de référence" }) as HTMLTextAreaElement).value).toContain("consumer");
    expect(transport.setStrategyId).not.toHaveBeenCalled();
  });
  it("la même pièce dans deux dossiers ne réutilise pas le contexte de la première ouverture", () => {
    openSources();
    fireEvent.click(screen.getByRole("button", { name: "Consulter Brief partagé dans Dossier consommateur" }));
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    fireEvent.click(screen.getByRole("button", { name: "Consulter Brief partagé dans Dossier propriétaire" }));
    expect(transport.inputs.at(-1)).toEqual({ id: "canonical-source", strategyId: "owner" });
    expect((screen.getByRole("textbox", { name: "Texte de référence" }) as HTMLTextAreaElement).value).toContain("owner");
  });
  it("un retrait après la liste affiche le refus de consultation, sans ancien texte", () => {
    openSources(); transport.denied = true;
    fireEvent.click(screen.getByRole("button", { name: "Consulter Brief partagé dans Dossier consommateur" }));
    expect(screen.getByRole("alert").textContent).toContain("Document retiré");
    expect(screen.queryByRole("textbox", { name: "Texte de référence" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
