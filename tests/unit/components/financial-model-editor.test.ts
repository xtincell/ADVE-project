// @vitest-environment jsdom
import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StructuredFieldControl } from "@/components/shared/smart-field-editor";
import { FinancialModelEditor, financialModelDraft } from "@/components/shared/financial-model-editor";
import { financialModelFixture } from "../../fixtures/financial-model";

afterEach(cleanup);
describe("Prémisses financières modifiables sans saisir les résultats", () => {
  it("efface une ancienne valeur sans fabriquer zéro et garde la marge en coefficient", () => {
    const onChange = vi.fn();
    render(React.createElement(StructuredFieldControl, { pillarKey: "v", fieldKey: "unitEconomics", value: { margeNette: 0.14 }, onChange }));
    const inputs = screen.getAllByRole("spinbutton");
    const margin = inputs.find(node => (node as HTMLInputElement).value === "14")!;
    expect(margin).toBeDefined();
    fireEvent.change(margin, { target: { value: "18" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ margeNette: 0.18 }));
    fireEvent.change(margin, { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ margeNette: null }));
  });
  it("recalcule le même scénario après une modification de prix sans exposer les reçus techniques", () => {
    function Form() { const [value, setValue] = useState<unknown>(financialModelFixture()); return React.createElement(FinancialModelEditor, { value, onChange: setValue }); }
    render(React.createElement(Form));
    expect(screen.getByLabelText("Prix unitaire")).toBeDefined();
    fireEvent.change(screen.getByLabelText("Prix unitaire"), { target: { value: "16000" } });
    expect(screen.getAllByRole("definition").length).toBeGreaterThan(0);
    expect(document.body.textContent).toContain("8 000 USD");
    expect(document.body.textContent).not.toContain("financial-model-recipe");
    expect(document.body.textContent).not.toContain("contentHash");
  });
  it("prépare une feuille vierge sans montant financier, fiscalité ou délai par défaut", () => {
    const value = financialModelDraft(null) as { breakEven: { price: { value: unknown }; taxBasis?: unknown }; projection: { cashFlow: { revenueDelayMonths: unknown } } };
    expect(value.breakEven.price.value).toBeNull();
    expect(value.breakEven.taxBasis).toBeUndefined();
    expect(value.projection.cashFlow.revenueDelayMonths).toBeNull();
  });
});
