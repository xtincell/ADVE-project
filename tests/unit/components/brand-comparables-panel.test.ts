// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  data: undefined as { peerCount: number; medianComposite: number | null; topSimilarity: number } | undefined,
  isLoading: false, error: null as Error | null,
}));
vi.mock("@/lib/trpc/client", () => ({ trpc: { strategy: { comparables: { useQuery: () => state } } } }));
import { BrandComparablesPanel } from "@/components/shared/brand-comparables-panel";

beforeEach(() => { state.data = undefined; state.isLoading = false; state.error = null; });
afterEach(cleanup);
const view = () => render(createElement(BrandComparablesPanel, { strategyId: "owned-brand" }));

describe("comparables distinguish unavailable, absent and privacy-protected results", () => {
  it("shows a loading state without asserting an empty cohort", () => {
    state.isLoading = true; view();
    expect(screen.getByText("Chargement…")).toBeDefined();
    expect(screen.queryByText(/Aucune marque comparable/)).toBeNull();
  });
  it("does not show cached scores or an empty-cohort claim after a failed request", () => {
    state.data = { peerCount: 3, medianComposite: 100, topSimilarity: 0.9 };
    state.error = new Error("private backend diagnostic"); view();
    expect(screen.getByRole("alert").textContent).toContain("Les repères de marques voisines sont indisponibles.");
    expect(screen.queryByText("100/200")).toBeNull();
    expect(screen.queryByText(/Aucune marque comparable/)).toBeNull();
    expect(screen.queryByText(/private backend diagnostic/)).toBeNull();
  });
  it("labels an observed empty cohort separately", () => {
    state.data = { peerCount: 0, medianComposite: null, topSimilarity: 0 }; view();
    expect(screen.getByText(/Aucune marque comparable indexée/)).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("explains that indexed peers can still have too few valid scores", () => {
    state.data = { peerCount: 5, medianComposite: null, topSimilarity: 0.9 }; view();
    expect(screen.getByText(/Moins de 3 scores valides disponibles/)).toBeDefined();
    expect(screen.queryByText(/moins de 3 pairs/)).toBeNull();
  });
  it("renders an explicitly measured zero median", () => {
    state.data = { peerCount: 3, medianComposite: 0, topSimilarity: 0.9 }; view();
    expect(screen.getByText("0/200")).toBeDefined();
    expect(screen.queryByText(/Moins de 3 scores valides/)).toBeNull();
  });
});
