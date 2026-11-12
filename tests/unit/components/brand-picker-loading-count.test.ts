// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
const state = vi.hoisted(() => ({ loading: true, error: false }));
vi.mock("@/lib/trpc/client", () => ({ trpc: { strategy: { brandTreeForSelector: { useQuery: () => ({
  data: state.loading || state.error ? undefined : { nodes: [], standaloneStrategies: [] },
  isLoading: state.loading, isError: state.error,
}) } } } }));
vi.mock("@/components/cockpit/strategy-context", () => ({ useStrategy: () => ({
  strategyId: null, strategies: [], setStrategyId: vi.fn(),
}) }));
import { StrategySelector } from "@/components/cockpit/strategy-selector";
beforeEach(() => { vi.stubGlobal("React", React); state.loading = true; state.error = false; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function open() { render(React.createElement(StrategySelector)); fireEvent.click(screen.getByRole("button", { name: "Sélectionner une marque" })); }
it("does not manufacture zero brands during a pending tree read", () => {
  open(); expect(screen.queryByText(/0 sur 0 marque/)).toBeNull();
  expect(screen.getByText("Chargement des marques…")).toBeTruthy();
});
it("does not manufacture zero brands when a tree read fails", () => {
  state.loading = false; state.error = true; open();
  expect(screen.queryByText(/0 sur 0 marque/)).toBeNull();
  expect(screen.getByText("Marques indisponibles")).toBeTruthy();
});
it("retains the real zero count after a successful empty result", () => {
  state.loading = false; open(); expect(screen.getByText(/0 sur 0 marque/)).toBeTruthy();
});
