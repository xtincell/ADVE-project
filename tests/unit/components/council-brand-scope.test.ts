// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const state = vi.hoisted(() => ({ id: "spawt" as string | null, brandLoading: false,
  brandError: false, historyLoading: false, historyError: false, clear: vi.fn() }));
const rows = (id: string) => id === "peak" ? [] : [
  { id: id + "-u", role: "user", content: id + " question", createdAt: new Date(0) },
  { id: id + "-a", role: "assistant", content: id + " réponse", createdAt: new Date(1) },
];
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  strategy: { getWithScore: { useQuery: ({ id }: { id: string }) => ({ data: { name: id, composite: 4 } }) } },
  mestor: {
    assistantHistory: { useQuery: ({ strategyId }: { strategyId: string }) => ({
      data: state.historyLoading || state.historyError ? undefined : { messages: rows(strategyId) },
      isLoading: state.historyLoading, error: state.historyError ? new Error("store unavailable") : null,
    }) },
    assistantClear: { useMutation: () => ({ mutate: state.clear }) },
    councilDeliberate: { useQuery: () => ({ data: undefined, isLoading: false, error: null }) },
  },
} }));
vi.mock("@/components/cockpit/strategy-context", () => ({
  useCurrentStrategyId: () => state.id,
  useStrategy: () => ({ strategyId: state.id, isLoading: state.brandLoading, isError: state.brandError }),
}));
vi.mock("@/components/shared/page-header", () => ({ PageHeader: ({ title, children }: { title: string; children: React.ReactNode }) =>
  React.createElement("header", null, React.createElement("h1", null, title), children) }));
vi.mock("@/components/shared/ai-badge", () => ({ AiBadge: () => null }));
import MestorPage from "@/app/(cockpit)/cockpit/mestor/page";

beforeEach(() => {
  vi.stubGlobal("React", React); vi.stubGlobal("fetch", vi.fn());
  Element.prototype.scrollIntoView = vi.fn();
  state.id = "spawt"; state.brandLoading = false; state.brandError = false;
  state.historyLoading = false; state.historyError = false; state.clear.mockClear();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("conseil — le fil appartient à la marque sélectionnée", () => {
  it("hydrates each brand's actual history when switching without deleting or generating", async () => {
    const view = render(React.createElement(MestorPage));
    await screen.findByText("spawt réponse");
    state.id = "bonnet"; view.rerender(React.createElement(MestorPage));
    await screen.findByText("bonnet réponse");
    expect(screen.queryByText("spawt réponse")).toBeNull();
    state.id = "spawt"; view.rerender(React.createElement(MestorPage));
    await screen.findByText("spawt réponse");
    expect(screen.queryByText("bonnet réponse")).toBeNull();
    expect(fetch).not.toHaveBeenCalled(); expect(state.clear).not.toHaveBeenCalled();
  });

  it("does not carry another brand's responses into a genuinely empty history", async () => {
    const view = render(React.createElement(MestorPage)); await screen.findByText("spawt réponse");
    state.id = "peak"; view.rerender(React.createElement(MestorPage));
    expect(screen.queryByText("spawt réponse")).toBeNull();
    expect(await screen.findByText("Bienvenue sur votre assistant")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled(); expect(state.clear).not.toHaveBeenCalled();
  });

  it("keeps an unsent draft out of another brand's input", async () => {
    const view = render(React.createElement(MestorPage)); await screen.findByText("spawt réponse");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Question destinée à SPAWT" } });
    state.id = "bonnet"; view.rerender(React.createElement(MestorPage));
    await screen.findByText("bonnet réponse");
    expect(screen.getByRole("textbox")).toHaveProperty("value", "");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not label an unfinished brand query as no brand selected", () => {
    state.id = null; state.brandLoading = true;
    render(React.createElement(MestorPage));
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.queryByText("Aucune marque sélectionnée")).toBeNull();
  });

  it("distinguishes a failed brand query from absence", () => {
    state.id = null; state.brandError = true; render(React.createElement(MestorPage));
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.queryByText("Aucune marque sélectionnée")).toBeNull();
  });

  it("does not offer a new conversation while its existing history is loading", () => {
    state.historyLoading = true; render(React.createElement(MestorPage));
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.queryByText("Bienvenue sur votre assistant")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull(); expect(fetch).not.toHaveBeenCalled();
  });

  it("does not turn an unreadable history into an empty conversation", () => {
    state.historyError = true; render(React.createElement(MestorPage));
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.queryByText("Bienvenue sur votre assistant")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull(); expect(fetch).not.toHaveBeenCalled();
  });
});
