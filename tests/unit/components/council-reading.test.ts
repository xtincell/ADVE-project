// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const state = vi.hoisted(() => ({ messages: [] as Array<Record<string, unknown>>,
  query: vi.fn(), clear: vi.fn(), result: {} as Record<string, unknown> }));
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  strategy: { getWithScore: { useQuery: () => ({ data: { name: "Marque test" } }) } },
  mestor: {
    assistantHistory: { useQuery: () => ({ data: { messages: state.messages } }) },
    assistantClear: { useMutation: () => ({ mutate: state.clear }) },
    councilDeliberate: { useQuery: (_input: unknown, options: unknown) => {
      state.query(options); return { data: state.result, isLoading: false, error: null };
    } },
  },
} }));
vi.mock("@/components/cockpit/strategy-context", () => ({ useCurrentStrategyId: () => "fixture" }));
vi.mock("@/components/shared/page-header", () => ({ PageHeader: ({ title, children }: { title: string; children: React.ReactNode }) =>
  React.createElement("header", null, React.createElement("h1", null, title), children) }));
vi.mock("@/components/shared/ai-badge", () => ({ AiBadge: () => null }));
import MestorPage from "@/app/(cockpit)/cockpit/mestor/page";
import { CouncilDeliberationPanel } from "@/components/cockpit/council-deliberation-panel";

const answer = "## Décision\n\n- **Source** : inconnue\n\n| Indicateur | Valeur |\n| --- | --- |\n| Mesure | 0 |";
let copy: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("fetch", vi.fn());
  copy = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText: copy } });
  Element.prototype.scrollIntoView = vi.fn();
  state.query.mockClear(); state.clear.mockClear();
  state.messages = [{ id: "u", role: "user", content: "**Texte humain**\n# Littéral", createdAt: new Date(0) },
    { id: "a", role: "assistant", content: answer, createdAt: new Date(1) }];
  state.result = { status: "OK", deliberated: true,
    draft: { position: "**Position proposée**" },
    critiques: Object.fromEntries(["a", "d", "v", "e"].map(key => [key, {
      verdict: "APPROVE", critiques: [{ claim: `Thèse ${key}`, evidence: `Champ ${key}`, severity: "LOW" }],
      missingAngles: [`Angle ${key}`], amendments: [`Amendement ${key}`],
    }])),
    grounding: { expertsWithSources: ["a"], ragUsed: true },
    synthesis: { finalPosition: "**Position retenue**", actionItems: ["Action 1"], dissent: ["Désaccord 1"],
      acceptedCritiques: [{ from: "a", claim: "Critique retenue", resolution: "Motif retenu" }],
      rejectedCritiques: [{ from: "d", claim: "Critique écartée", reason: "Motif écarté" }],
    },
  };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("conseil — lecture fidèle sans génération supplémentaire", () => {
  it("renders stored assistant structure while retaining literal human input and inactive experts", async () => {
    render(React.createElement(MestorPage));
    expect(await screen.findByRole("heading", { name: "Décision" })).toBeTruthy();
    expect(screen.getByRole("table").textContent).toContain("Mesure0");
    expect(screen.getByText("Source").tagName).toBe("STRONG");
    expect(screen.getByText("**Texte humain** # Littéral")).toBeTruthy();
    expect(state.messages[1]!.content).toBe(answer);
    expect(fetch).not.toHaveBeenCalled();
    expect(state.query.mock.calls.every(([options]) => !options.enabled)).toBe(true);
    expect(state.clear).not.toHaveBeenCalled();
  });

  it("copies the original message and waits for clipboard success before acknowledging it", async () => {
    let done!: () => void;
    copy.mockReturnValue(new Promise<void>(resolve => { done = resolve; }));
    const { container } = render(React.createElement(MestorPage));
    await screen.findByRole("button", { name: "Analyse approfondie" });
    const button = container.querySelector("svg.lucide-copy")?.closest("button");
    expect(button).toBeTruthy(); fireEvent.click(button!);
    expect(copy).toHaveBeenCalledWith(answer);
    expect(container.querySelector("svg.lucide-check")).toBeNull();
    await act(async () => done());
    expect(await screen.findByRole("button", { name: "Réponse copiée" })).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not announce a copy when the clipboard rejects it", async () => {
    const rejected = Promise.reject(new Error("clipboard refused"));
    void rejected.catch(() => undefined);
    copy.mockReturnValue(rejected);
    const { container } = render(React.createElement(MestorPage));
    await screen.findByRole("button", { name: "Analyse approfondie" });
    fireEvent.click(container.querySelector("svg.lucide-copy")!.closest("button")!);
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "La réponse n’a pas pu être copiée. Sélectionnez le texte pour la copier.");
    expect(container.querySelector("svg.lucide-check")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows every expert alternative and synthesis explanation without certifying retrieved documents", async () => {
    render(React.createElement(CouncilDeliberationPanel, { strategyId: "fixture", answer }));
    expect(state.query.mock.calls[0]![0].enabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Analyse approfondie" }));
    for (const key of ["a", "d", "v", "e"]) {
      expect(screen.getByText(`Angle ${key}`)).toBeTruthy();
      expect(screen.getByText(`Amendement ${key}`)).toBeTruthy();
    }
    for (const text of ["Critique retenue", "Motif retenu", "Critique écartée", "Motif écarté", "Désaccord 1"])
      expect(screen.getByText(text)).toBeTruthy();
    expect(screen.queryByText(/Vérifiée contre vos documents/)).toBeNull();
    expect(screen.queryByText(/— Valide/)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    await waitFor(() => expect(state.query.mock.calls.at(-1)![0].enabled).toBe(true));
  });
});
