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
  previews: [] as Array<{ input: Record<string, unknown>; callbacks: { onSuccess: (out: {
    proposedValue: unknown;
    source: "llm_rephrase" | "passthrough_no_schema" | "passthrough_zod_failed";
    warning?: string;
  }) => void } }>,
  sourceHash: "a".repeat(64), sourceChecking: false, sourceDenied: false, sourceText: "Six questions prévues",
}));
vi.mock("@/lib/trpc/client", () => ({ trpc: { pillar: {
  listEditableFields: { useQuery: () => ({ data: transport.data, isLoading: !transport.data }) },
  amend: { useMutation: () => ({ isPending: false, mutate: (input: Record<string, unknown>, callbacks: typeof transport.writes[number]["callbacks"]) => transport.writes.push({ input, callbacks }) }) },
  previewAmend: { useMutation: () => ({ isPending: false, mutate: (input: Record<string, unknown>, callbacks: typeof transport.previews[number]["callbacks"]) => transport.previews.push({ input, callbacks }) }) },
}, ingestion: {
  listSources: { useQuery: () => ({ data: [{ id: "document-a", fileName: "Brief de recette" }], isLoading: false, isFetching: false }) },
  getSource: { useQuery: () => ({ isLoading: false, isFetching: transport.sourceChecking,
    error: transport.sourceDenied ? { message: "Document retiré de ce dossier" } : null,
    data: { id: "document-a", fileName: "Brief de recette", rawContent: transport.sourceText, contentHash: transport.sourceHash } }) },
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
  transport.sourceHash = "a".repeat(64); transport.sourceChecking = false; transport.sourceDenied = false;
  transport.sourceText = "Six questions prévues";
});

const readDocument = () => {
  fireEvent.click(screen.getByRole("button", { name: "Ajouter un document" }));
  fireEvent.click(screen.getByRole("button", { name: "Consulter Brief de recette" }));
};
const citeDocument = () => {
  readDocument();
  fireEvent.click(screen.getByRole("button", { name: "Utiliser cette version comme référence" }));
};
describe("manual documentary references stay with the draft actually read", () => {
  it("opens a catalogued rewrite as a structured manual correction without a model preview", () => {
    transport.data!.fields[2]!.spec = { editableMode: "STRATEGIC_REWRITE" };
    render(view()); choose("unitEconomics");
    expect((screen.getByRole("textbox", { name: "Valeur structurée" }) as HTMLInputElement).value).toBe('{"budgetCom":10}');
    expect((screen.getByRole("button", { name: /patch direct/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /llm rephrase/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(transport.previews).toHaveLength(0);
    expect(transport.writes).toHaveLength(0);
  });
  it("only an explicit citation attaches the exact reader fingerprint to the existing amendment", () => {
    render(view()); choose("mvp"); fill(); citeDocument();
    fireEvent.click(screen.getByRole("button", { name: "Appliquer" }));
    expect(transport.writes[0]!.input).toMatchObject({ expectedVersion: 12,
      sourceReceipts: [{ sourceId: "document-a", contentHash: "a".repeat(64) }] });
    expect(transport.previews).toHaveLength(0);
  });
  it("consulting then closing does not attach a reference or lose the manual draft", () => {
    render(view()); choose("mvp"); fill(); readDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    fireEvent.click(screen.getByRole("button", { name: "Appliquer" }));
    expect(transport.writes[0]!.input.proposedValue).toEqual({ features: ["six questions"] });
    expect(transport.writes[0]!.input.sourceReceipts).toBeUndefined();
  });
  it.each(["checking", "denied"])("does not cite cached content while access is %s", (state) => {
    render(view()); choose("mvp"); fill();
    transport.sourceChecking = state === "checking"; transport.sourceDenied = state === "denied";
    readDocument();
    expect((screen.getByRole("button", { name: "Utiliser cette version comme référence" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("textbox", { name: "Texte de référence" })).toBeNull();
    expect(transport.writes).toHaveLength(0);
  });
  it("a refetch never replaces the cited source or pillar version under an existing draft", () => {
    const page = render(view()); choose("mvp"); fill(); citeDocument();
    transport.sourceHash = "b".repeat(64); transport.data = { ...transport.data!, version: 13 };
    page.rerender(view()); fireEvent.click(screen.getByRole("button", { name: "Appliquer" }));
    expect(transport.writes[0]!.input).toMatchObject({ expectedVersion: 12,
      sourceReceipts: [{ sourceId: "document-a", contentHash: "a".repeat(64) }] });
  });
  it("removing a reference is explicit and does not discard the correction", () => {
    render(view()); choose("mvp"); fill(); citeDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retirer la référence Brief de recette" }));
    fireEvent.click(screen.getByRole("button", { name: "Appliquer" }));
    expect(transport.writes[0]!.input.sourceReceipts).toBeUndefined();
    expect(transport.writes[0]!.input.proposedValue).toEqual({ features: ["six questions"] });
  });
  it("does not cite a document with no readable text", () => {
    render(view()); choose("mvp"); transport.sourceText = "   "; readDocument();
    expect((screen.getByRole("button", { name: "Utiliser cette version comme référence" }) as HTMLButtonElement).disabled).toBe(true);
    expect(transport.writes).toHaveLength(0);
  });
  it("only an explicit second reading replaces an old citation, without duplicating it", () => {
    render(view()); choose("mvp"); fill(); citeDocument();
    transport.sourceHash = "b".repeat(64); citeDocument();
    fireEvent.click(screen.getByRole("button", { name: "Appliquer" }));
    expect(transport.writes[0]!.input.sourceReceipts).toEqual([{ sourceId: "document-a", contentHash: "b".repeat(64) }]);
  });
  it.each(["field", "brand", "mode", "reopen"])("a %s change does not reuse a documentary reference", (context) => {
    const page = render(view()); choose("mvp"); fill(); citeDocument();
    if (context === "field") choose("packagingExperience");
    if (context === "brand") { page.rerender(view({ strategyId: "fictional-other" })); choose("mvp"); }
    if (context === "mode") {
      fireEvent.click(screen.getByRole("button", { name: "llm rephrase" }));
      fireEvent.click(screen.getByRole("button", { name: /patch direct/ }));
    }
    if (context === "reopen") { page.rerender(view({ open: false })); page.rerender(view()); choose("mvp"); }
    fill(); fireEvent.click(screen.getByRole("button", { name: "Appliquer" }));
    expect(transport.writes[0]!.input.sourceReceipts).toBeUndefined();
  });
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
    act(() => transport.previews[0]!.callbacks.onSuccess({ proposedValue: "MVP tardif", source: "llm_rephrase" }));
    expect(screen.getAllByRole("textbox").map(el => (el as HTMLTextAreaElement).value)).toEqual(["", "", ""]);
  });
  it("ignore une reformulation de la précédente ouverture", () => {
    const page = render(view()); choose("mvp"); enterPreview();
    page.rerender(view({ open: false })); page.rerender(view()); choose("mvp");
    act(() => transport.previews[0]!.callbacks.onSuccess({ proposedValue: "ancienne ouverture", source: "llm_rephrase" }));
    expect(raw().value).toBe("");
  });
  it("la réponse assistée ne remplace pas une proposition saisie entre-temps", () => {
    render(view()); choose("mvp"); enterPreview();
    const proposed = screen.getAllByRole("textbox")[1]!;
    fireEvent.change(proposed, { target: { value: "ma décision manuelle" } });
    act(() => transport.previews[0]!.callbacks.onSuccess({ proposedValue: "réponse tardive", source: "llm_rephrase" }));
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

describe("la prévisualisation distingue une reformulation d'un repli brut", () => {
  const refuse = (source: "passthrough_no_schema" | "passthrough_zod_failed", index = 0) => {
    act(() => transport.previews[index]!.callbacks.onSuccess({
      source, proposedValue: "Proposition pour ce champ", warning: "Fixture transport refused: no model executed",
    }));
  };

  it.each(["passthrough_no_schema", "passthrough_zod_failed"] as const)("signale %s sans remplir ni appliquer une consigne brute", (source) => {
    render(view()); choose("mvp"); enterPreview(); refuse(source);
    expect(screen.getByRole("alert").textContent).toMatch(/reformulation/i);
    expect(screen.getByRole("alert").textContent).toMatch(/saisie.*conservée/i);
    expect(screen.getByRole("alert").textContent).not.toMatch(/Fixture|passthrough|schema|Zod/i);
    expect((screen.getByLabelText("Valeur proposée") as HTMLTextAreaElement).value).toBe("");
    expect((screen.getByRole("button", { name: "Appliquer" }) as HTMLButtonElement).disabled).toBe(true);
    expect(transport.writes).toHaveLength(0);
  });

  it("préserve la décision manuelle après échec et la laisse appliquer sans autre preview", () => {
    render(view()); choose("mvp");
    fireEvent.click(screen.getByRole("button", { name: "llm rephrase" }));
    fireEvent.change(screen.getByLabelText("Valeur proposée"), { target: { value: '{"features":["décision humaine"]}' } });
    fireEvent.change(reason(), { target: { value: "Décision manuelle conservée" } });
    enterPreview(); refuse("passthrough_zod_failed");
    expect((screen.getByLabelText("Valeur proposée") as HTMLTextAreaElement).value).toBe('{"features":["décision humaine"]}');
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Appliquer" }));
    expect(transport.previews).toHaveLength(1);
    expect(transport.writes).toHaveLength(1);
    expect(transport.writes[0]!.input).toMatchObject({ expectedVersion: 12, proposedValue: { features: ["décision humaine"] } });
  });

  it("reprend explicitement après refus et ne remplit qu'un résultat généré sans l'appliquer", () => {
    render(view()); choose("mvp"); enterPreview(); refuse("passthrough_zod_failed");
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Prévisualiser" }));
    expect(screen.queryByRole("alert")).toBeNull();
    act(() => transport.previews[1]!.callbacks.onSuccess({ source: "llm_rephrase", proposedValue: { features: ["résultat reçu"] } }));
    expect((screen.getByLabelText("Valeur proposée") as HTMLTextAreaElement).value).toBe(JSON.stringify({ features: ["résultat reçu"] }, null, 2));
    expect(transport.writes).toHaveLength(0);
  });

  it.each(["field", "brand", "mode", "reopen"])("ignore un refus arrivé dans le précédent contexte %s", (context) => {
    const page = render(view()); choose("mvp"); enterPreview();
    if (context === "field") choose("packagingExperience");
    if (context === "brand") { page.rerender(view({ strategyId: "fictional-other" })); choose("mvp"); }
    if (context === "mode") fireEvent.click(screen.getByRole("button", { name: /patch direct/ }));
    if (context === "reopen") { page.rerender(view({ open: false })); page.rerender(view()); choose("mvp"); }
    refuse("passthrough_zod_failed");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(transport.writes).toHaveLength(0);
    expect((screen.getByLabelText("Valeur proposée") as HTMLTextAreaElement).value).toBe("");
  });
});
