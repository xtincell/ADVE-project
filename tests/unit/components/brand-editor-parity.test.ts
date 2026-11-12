// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import Editor from "@/app/(cockpit)/cockpit/brand/edit/page";
import { listEditableFields } from "@/lib/types/variable-bible";

const h = vi.hoisted(() => ({
  params: "", strategyId: "brand-a", contextError: false, canOperate: true,
  version: 7, content: {} as Record<string, unknown>,
  writes: vi.fn(), preview: vi.fn(), legacy: vi.fn(), invalidate: vi.fn(), refetch: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(h.params) }));
vi.mock("@/components/cockpit/strategy-context", () => ({
  useCurrentStrategyId: () => h.strategyId,
  useStrategy: () => ({ strategyId: h.strategyId, isLoading: false, isError: h.contextError }),
}));
vi.mock("@/components/cockpit/pillars", () => ({ BESPOKE_PILLAR_RENDERERS: {} }));
vi.mock("@/lib/trpc/client", () => {
  const mutation = (fn = vi.fn()) => ({ useMutation: () => ({ isPending: false, mutate: fn, mutateAsync: fn }) });
  const other = { useQuery: () => ({ data: [], refetch: h.refetch }), ...mutation() };
  return { trpc: {
    auth: { me: { useQuery: () => ({ data: { canOperate: h.canOperate } }) } },
    strategy: { getMyAccess: { useQuery: () => ({ data: { writeZones: ["*"] } }) } },
    useUtils: () => ({ pillar: { listEditableFields: { invalidate: h.invalidate } } }),
    pillar: new Proxy({
      get: { useQuery: () => ({ data: { pillar: { content: h.content, validationStatus: "DRAFT" } }, refetch: h.refetch }) },
      getAll: { useQuery: () => ({ data: { A: { content: h.content } }, refetch: h.refetch }) },
      assess: { useQuery: () => ({ data: { needsHuman: [], optionalFillable: [], completionPct: 0 }, refetch: h.refetch }) },
      readiness: { useQuery: () => ({ data: { byPillar: {} }, refetch: h.refetch }) },
      listEditableFields: { useQuery: ({ pillarKey }: { pillarKey: string }) => ({ data: {
        version: h.version, validationStatus: "DRAFT",
        fields: listEditableFields(pillarKey.toLowerCase()).map(f => ({ ...f, mode: "PATCH_DIRECT", currentValue: h.content[f.field] ?? null })),
      } }) },
      amend: mutation(h.writes), previewAmend: mutation(h.preview), updatePartial: mutation(h.legacy),
    }, { get: (target, key) => target[key as keyof typeof target] ?? other }),
    notoria: new Proxy({}, { get: () => other }),
    ingestion: { listSources: { useQuery: () => ({ data: [] }) } },
  } };
});

beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.clearAllMocks();
  h.params = "strategy=brand-a&focus=a.citationFondatrice&from=glory&seq=existing-sequence";
  h.strategyId = "brand-a"; h.contextError = false; h.canOperate = true; h.version = 7;
  h.content = { citationFondatrice: "Une conviction déjà enregistrée pour cette marque.",
    ikigai: { worldNeed: "Besoin enregistré" }, valeurs: [{ value: "AUTONOMIE", customName: "Valeur existante", rank: 1, justification: "Justification conservée", costOfHolding: "Effort conservé" }] };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("historical brand editor reuses the canonical manual circuit", () => {
  it("keeps eight views and returns to the existing tool surface with its brand and sequence", () => {
    render(React.createElement(Editor));
    expect(screen.getByRole("link", { name: /Retour aux outils/ }).getAttribute("href"))
      .toBe("/console/artemis/tools?strategy=brand-a&seq=existing-sequence");
    expect(screen.getAllByRole("button", { name: /^[ADVERTIS] —/ })).toHaveLength(8);
    expect(screen.queryByRole("button", { name: "Sauvegarder" })).toBeNull();
    expect(h.legacy).not.toHaveBeenCalled(); expect(h.preview).not.toHaveBeenCalled();
  });
  it("edits one explicitly selected field at the version read, never the whole pillar", () => {
    const view = render(React.createElement(Editor));
    fireEvent.click(screen.getByRole("button", { name: /^Revoir / }));
    const dialog = within(screen.getByRole("dialog"));
    expect((dialog.getByRole("combobox") as HTMLSelectElement).value).toBe("citationFondatrice");
    fireEvent.change(dialog.getAllByRole("textbox")[0]!, { target: { value: "Une conviction relue et corrigée explicitement." } });
    fireEvent.change(dialog.getByRole("textbox", { name: "Raison" }), { target: { value: "Correction manuelle de recette" } });
    h.version = 8;
    view.rerender(React.createElement(Editor));
    fireEvent.click(dialog.getByRole("button", { name: "Appliquer" }));
    expect(h.writes).toHaveBeenCalledOnce();
    expect(h.writes.mock.calls[0]![0]).toMatchObject({ strategyId: "brand-a", pillarKey: "A",
      field: "citationFondatrice", mode: "PATCH_DIRECT", expectedVersion: 7,
      proposedValue: "Une conviction relue et corrigée explicitement." });
    expect(h.writes.mock.calls[0]![0]).not.toHaveProperty("content");
    expect(h.preview).not.toHaveBeenCalled(); expect(h.legacy).not.toHaveBeenCalled();
  });
  it("does not count a cancelled draft as a persisted focus answer", () => {
    h.content = {};
    render(React.createElement(Editor));
    fireEvent.click(screen.getByRole("button", { name: /^Revoir / }));
    fireEvent.change(within(screen.getByRole("dialog")).getAllByRole("textbox")[0]!, { target: { value: "Brouillon jamais enregistré" } });
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(screen.getByRole("region", { name: "Champs à revoir" }).textContent).toContain("Valeur absente");
    expect(h.writes).not.toHaveBeenCalled();
  });
  it.each(["a.ikigai.worldNeed", "a.valeurs[0].customName"])("opens the existing structured parent for %s", (path) => {
    h.params = `strategy=brand-a&focus=${path}`;
    render(React.createElement(Editor));
    expect(screen.getByRole("region", { name: "Champs à revoir" }).textContent).toContain("Valeur présente");
    fireEvent.click(screen.getByRole("button", { name: /^Revoir / }));
    expect((screen.getByRole("combobox", { name: "Variable à amender" }) as HTMLSelectElement).value).toBe(path.startsWith("a.ikigai") ? "ikigai" : "valeurs");
    expect(screen.getByRole("dialog").textContent).toContain("éditeur structuré");
    expect(h.writes).not.toHaveBeenCalled();
  });
  it("opens a qualitative voice for strategic correction while keeping strategic analysis read-only", () => {
    h.params = "strategy=brand-a&focus=d.tonDeVoix.onDit,r.swot";
    render(React.createElement(Editor));
    fireEvent.click(screen.getByRole("button", { name: /^Revoir / }));
    const dialog = within(screen.getByRole("dialog"));
    expect((dialog.getByRole("combobox", { name: "Variable à amender" }) as HTMLSelectElement).value).toBe("tonDeVoix");
    expect((dialog.getByRole("button", { name: /patch direct/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((dialog.getByRole("button", { name: /llm rephrase/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(dialog.getByRole("button", { name: /strategic rewrite/ })).toBeDefined();
    fireEvent.click(dialog.getByRole("button", { name: "Fermer" }));
    fireEvent.click(screen.getByRole("button", { name: /^R —/ }));
    expect(screen.getByRole("region", { name: "Champs à revoir" }).textContent).toContain("Champ calculé ou non éditable");
    expect(screen.queryByRole("button", { name: "Modifier" })).toBeNull();
    expect(h.writes).not.toHaveBeenCalled(); expect(h.preview).not.toHaveBeenCalled();
  });
  it("unmounts an unsaved proposal when the selected brand changes", () => {
    const view = render(React.createElement(Editor));
    fireEvent.click(screen.getByRole("button", { name: /^Revoir / }));
    fireEvent.change(within(screen.getByRole("dialog")).getAllByRole("textbox")[0]!, { target: { value: "Secret de la première marque" } });
    h.strategyId = "brand-b"; h.params = "strategy=brand-b&focus=a.citationFondatrice";
    view.rerender(React.createElement(Editor));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Revoir / }));
    expect((within(screen.getByRole("dialog")).getAllByRole("textbox")[0]! as HTMLTextAreaElement).value).not.toContain("Secret de la première marque");
    expect(h.writes).not.toHaveBeenCalled();
  });
  it.each(["strategy", "strategyId"])("never mounts the previous brand for an unresolved explicit %s link", (alias) => {
    h.params = `${alias}=brand-b&focus=a.citationFondatrice`;
    render(React.createElement(Editor));
    expect(screen.queryByRole("button", { name: "Modifier" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Champs à revoir" })).toBeNull();
  });
  it("shows a failed brand resolution without offering to edit the fallback brand", () => {
    h.contextError = true;
    render(React.createElement(Editor));
    expect(screen.getByRole("alert").textContent).toContain("Impossible de charger la marque demandée");
    expect(screen.queryByRole("button", { name: "Modifier" })).toBeNull();
  });
  it("does not present another brand's teaching example as an empty name", () => {
    h.params = "strategy=brand-a&focus=a.nomMarque";
    render(React.createElement(Editor));
    fireEvent.click(screen.getByRole("button", { name: /^Revoir / }));
    expect(screen.queryByPlaceholderText("CIMENCAM")).toBeNull();
    expect((screen.getByPlaceholderText("Saisir la valeur de ce champ") as HTMLTextAreaElement).value).toBe("");
  });
});
