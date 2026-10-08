// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmendPillarModal } from "@/components/pillars/amend-pillar-modal";

const transport = vi.hoisted(() => ({
  data: undefined as undefined | {
    version: number; validationStatus: string;
    fields: Array<{ field: string; mode: string; currentValue: unknown; spec: object }>;
  },
  writes: [] as Array<{ input: Record<string, unknown>; callbacks: { onSuccess: (out: unknown) => void } }>,
  previews: [] as Array<{ input: Record<string, unknown>; callbacks: { onSuccess: (out: { proposedValue: string }) => void } }>,
}));
vi.mock("@/lib/trpc/client", () => ({ trpc: { pillar: {
  listEditableFields: { useQuery: () => ({ data: transport.data, isLoading: !transport.data }) },
  amend: { useMutation: () => ({ isPending: false, mutate: (input: Record<string, unknown>, callbacks: typeof transport.writes[number]["callbacks"]) => transport.writes.push({ input, callbacks }) }) },
  previewAmend: { useMutation: () => ({ isPending: false, mutate: (input: Record<string, unknown>, callbacks: typeof transport.previews[number]["callbacks"]) => transport.previews.push({ input, callbacks }) }) },
} } }));
vi.mock("@/components/shared/modal", () => ({ Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? React.createElement("div", { role: "dialog" }, children) : null }));
vi.mock("@/components/shared/confirm-dialog", () => ({ ConfirmDialog: () => null }));
vi.mock("@/lib/types/field-registry", () => ({ hasFieldDef: (_key: string, field: string) => field === "unitEconomics" }));
vi.mock("@/components/shared/smart-field-editor", () => ({ StructuredFieldControl: ({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) => React.createElement("input", {
  "aria-label": "Valeur structurée", value: JSON.stringify(value), onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(JSON.parse(e.target.value)),
}) }));

const props: Parameters<typeof AmendPillarModal>[0] & { onClose: ReturnType<typeof vi.fn<() => void>> } = { open: true, strategyId: "fictional-spawt", pillarKey: "V", onClose: vi.fn<() => void>() };
const view = (patch: Partial<typeof props> = {}) => React.createElement(AmendPillarModal, { ...props, ...patch });
const choose = (field: string) => fireEvent.change(screen.getByRole("combobox"), { target: { value: field } });
// Positions are used for the legacy form before its labels are associated.
const raw = () => screen.getAllByRole("textbox")[0] as HTMLTextAreaElement;
const reason = () => screen.getAllByRole("textbox").at(-1) as HTMLTextAreaElement;
const fill = (value = '{"features":["six questions"]}') => {
  fireEvent.change(raw(), { target: { value } });
  fireEvent.change(reason(), { target: { value: "Directive de recette synthétique" } });
};
const enterPreview = () => {
  fireEvent.click(screen.getByRole("button", { name: "llm rephrase" }));
  fireEvent.change(screen.getByPlaceholderText(/Renforcer le ton/), { target: { value: "Proposition pour ce champ" } });
  fireEvent.click(screen.getByRole("button", { name: "Prévisualiser" }));
};
beforeEach(() => {
  vi.stubGlobal("React", React);
  transport.data = { version: 12, validationStatus: "AI_PROPOSED", fields: [
    { field: "mvp", mode: "PATCH_DIRECT", currentValue: { features: ["cinq questions"] }, spec: {} },
    { field: "packagingExperience", mode: "PATCH_DIRECT", currentValue: { unboxingRitual: "cinq questions" }, spec: {} },
    { field: "unitEconomics", mode: "PATCH_DIRECT", currentValue: { budgetCom: 10 }, spec: {} },
  ] };
  transport.writes = []; transport.previews = []; props.onClose.mockClear();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("amendement : un brouillon ne change jamais de destinataire", () => {
  it("vide la proposition et le motif quand on passe du MVP au packaging", () => {
    render(view()); choose("mvp"); fill(); choose("packagingExperience");
    expect(raw().value).toBe(""); expect(reason().value).toBe("");
    expect((screen.getByRole("button", { name: "Appliquer" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("une réouverture ne réutilise ni champ ni brouillon déjà soumis", () => {
    const page = render(view()); choose("mvp"); fill();
    page.rerender(view({ open: false })); page.rerender(view());
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("");
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });
  it.each([ { strategyId: "fictional-other" }, { pillarKey: "A" as const } ])("un autre contexte ne reprend pas le brouillon : %j", (patch) => {
    const page = render(view()); choose("mvp"); fill(); page.rerender(view(patch));
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("");
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });
  it("changer de mode ne transforme pas un patch en reformulation approuvée", () => {
    render(view()); choose("mvp"); fill(); fireEvent.click(screen.getByRole("button", { name: "llm rephrase" }));
    expect((screen.getAllByRole("textbox")[1] as HTMLTextAreaElement).value).toBe("");
    expect(reason().value).toBe("");
  });
  it("ignore une reformulation arrivée après un changement de champ", () => {
    render(view()); choose("mvp"); enterPreview(); choose("packagingExperience");
    act(() => transport.previews[0]!.callbacks.onSuccess({ proposedValue: "MVP tardif" }));
    expect(screen.getAllByRole("textbox").map(el => (el as HTMLTextAreaElement).value)).toEqual(["", "", ""]);
  });
  it("ignore une reformulation de la précédente ouverture", () => {
    const page = render(view()); choose("mvp"); enterPreview();
    page.rerender(view({ open: false })); page.rerender(view()); choose("mvp");
    act(() => transport.previews[0]!.callbacks.onSuccess({ proposedValue: "ancienne ouverture" }));
    expect(raw().value).toBe("");
  });
  it("la réponse assistée ne remplace pas une proposition saisie entre-temps", () => {
    render(view()); choose("mvp"); enterPreview();
    const proposed = screen.getAllByRole("textbox")[1]!;
    fireEvent.change(proposed, { target: { value: "ma décision manuelle" } });
    act(() => transport.previews[0]!.callbacks.onSuccess({ proposedValue: "réponse tardive" }));
    expect((screen.getAllByRole("textbox")[1] as HTMLTextAreaElement).value).toBe("ma décision manuelle");
  });
  it("garde la version de départ du brouillon lors d’une actualisation de lecture", () => {
    const page = render(view()); choose("mvp"); fill();
    transport.data = { ...transport.data!, version: 13 };
    page.rerender(view()); fireEvent.click(screen.getByRole("button", { name: "Appliquer" }));
    expect(transport.writes[0]!.input.expectedVersion).toBe(12);
    expect(transport.writes[0]!.input.proposedValue).toEqual({ features: ["six questions"] });
  });
  it("une lecture actualisée n’efface pas les cellules du brouillon structuré", () => {
    const page = render(view()); choose("unitEconomics");
    fireEvent.change(screen.getByLabelText("Valeur structurée"), { target: { value: '{"budgetCom":25}' } });
    transport.data = { ...transport.data!, version: 13, fields: transport.data!.fields.map(f => f.field === "unitEconomics" ? { ...f, currentValue: { budgetCom: 30 } } : f) };
    page.rerender(view()); expect((screen.getByLabelText("Valeur structurée") as HTMLInputElement).value).toBe('{"budgetCom":25}');
  });
  it("un reçu d’écriture ancien ne ferme pas une nouvelle ouverture", () => {
    const page = render(view()); choose("mvp"); fill(); fireEvent.click(screen.getByRole("button", { name: "Appliquer" }));
    page.rerender(view({ open: false })); page.rerender(view()); choose("packagingExperience");
    act(() => transport.writes[0]!.callbacks.onSuccess({ status: "OK", output: { version: 13 } }));
    expect(props.onClose).not.toHaveBeenCalled();
  });
  it("un patch explicite garde le bon champ, la bonne marque et la précondition", () => {
    render(view()); choose("mvp"); fill(); fireEvent.click(screen.getByRole("button", { name: "Appliquer" }));
    expect(transport.writes).toHaveLength(1);
    expect(transport.writes[0]!.input).toMatchObject({ strategyId: "fictional-spawt", pillarKey: "V", field: "mvp", mode: "PATCH_DIRECT", expectedVersion: 12, proposedValue: { features: ["six questions"] } });
  });
});
