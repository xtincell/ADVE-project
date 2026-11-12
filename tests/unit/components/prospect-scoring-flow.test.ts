// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const hooks = vi.hoisted(() => ({ score: vi.fn(), record: vi.fn(), existing: vi.fn(), candidates: vi.fn(), decide: vi.fn(), hunt: vi.fn() }));
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  useUtils: () => ({ scoreur: { listCandidates: { invalidate: vi.fn() } } }),
  strategy: { list: { useQuery: () => ({ data: [{ id: "existing-source", name: "Marque déjà présente" }], isLoading: false }) } },
  scoreur: {
    scoreProspect: { useMutation: () => ({ mutateAsync: hooks.score, isPending: false }) },
    scoreBrand: { useMutation: () => ({ mutateAsync: hooks.existing, isPending: false }) },
    recordEpreuve: { useMutation: () => ({ mutateAsync: hooks.record, isPending: false }) },
    huntVictories: { useMutation: () => ({ mutateAsync: hooks.hunt, isPending: false }) },
    decideCandidate: { useMutation: () => ({ mutateAsync: hooks.decide, isPending: false }) },
    listCandidates: { useQuery: (...args: unknown[]) => { hooks.candidates(...args); return { data: [], isLoading: false }; } },
    getCanon: { useQuery: () => ({ data: { anchors: [], items: [] } }) },
  },
} }));
vi.mock("@/components/shared/page-header", () => ({ PageHeader: ({ title }: { title: string }) => React.createElement("h1", null, title) }));
import ProspectScoringPage from "@/app/(console)/console/signal/prospect-scoring/page";

const league = { sectorSlug: "restauration", marketScale: "VILLE", countryCode: "CM" };
const verdict = (force: number) => ({ force, tier: "FRAGILE", coveragePct: 20, league, coherence: 0, arenas: [], gates: [], cappedReason: null });
beforeEach(() => {
  vi.stubGlobal("React", React); vi.clearAllMocks();
  hooks.score.mockImplementation(async (input: { name: string }) => ({ strategyId: input.name === "Prospect faible" ? "subject" : "rival-strong",
    footprintStatus: "DEFERRED", verdict: verdict(input.name === "Prospect faible" ? 10 : 80), league, epreuveCount: 1 }));
  hooks.record.mockResolvedValue({ id: "observation", score: { verdict: verdict(20), epreuveCount: 2 } });
  hooks.existing.mockResolvedValue({ verdict: verdict(30), epreuveCount: 1 });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function placePair() {
  render(React.createElement(ProspectScoringPage));
  fireEvent.change(screen.getByPlaceholderText("Nom de la marque *"), { target: { value: "Prospect faible" } });
  fireEvent.click(screen.getByRole("button", { name: "+ Ajouter un concurrent" }));
  fireEvent.change(screen.getAllByPlaceholderText("Nom de la marque *")[1]!, { target: { value: "Concurrent fort" } });
  fireEvent.click(screen.getByRole("button", { name: "Mesurer et placer sur le leaderboard" }));
  await waitFor(() => expect(screen.getByRole("row", { name: /Concurrent fort/ })).toBeTruthy());
}
describe("operator scoring keeps the business subject distinct from display rank", () => {
  it("does not turn the stronger competitor into the prospect or review target", async () => {
    await placePair();
    expect(screen.getByRole("row", { name: /Prospect faible/ }).textContent).toContain("prospect");
    expect(screen.getByRole("row", { name: /Concurrent fort/ }).textContent).not.toContain("prospect");
    expect(hooks.candidates.mock.lastCall?.[0]).toMatchObject({ subjectStrategyId: "subject" });
  });
  it("records a manual sourced observation for the chosen subject without a model action", async () => {
    await placePair();
    fireEvent.change(screen.getByLabelText("Adversaire"), { target: { value: "strategy:rival-strong" } });
    fireEvent.change(screen.getByLabelText("Fait observé"), { target: { value: "Comparaison synthétique de recette" } });
    fireEvent.change(screen.getByLabelText("Source publique"), { target: { value: "https://example.invalid/owned/proof" } });
    fireEvent.change(screen.getByLabelText("Date d’observation"), { target: { value: "2026-10-20" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer l’observation" }));
    await waitFor(() => expect(hooks.record).toHaveBeenCalledTimes(1));
    expect(hooks.record.mock.calls[0]?.[0]).toMatchObject({ strategyId: "subject", opponentStrategyId: "rival-strong", league,
      occurredAt: "2026-10-20T00:00:00.000Z" });
    expect(hooks.record.mock.calls[0]?.[0].source).toContain("https://example.invalid/owned/proof");
    expect(hooks.hunt).not.toHaveBeenCalled();
  });
  it("scores an existing dossier by stable ID without onboarding another copy", async () => {
    render(React.createElement(ProspectScoringPage));
    fireEvent.change(screen.getByLabelText("Marque existante"), { target: { value: "existing-source" } });
    fireEvent.click(screen.getByRole("button", { name: "Calculer depuis les données conservées" }));
    await waitFor(() => expect(hooks.existing).toHaveBeenCalledWith({ strategyId: "existing-source" }));
    expect(hooks.score).not.toHaveBeenCalled();
    expect(screen.getByRole("row", { name: /Marque déjà présente/ })).toBeTruthy();
  });
});
