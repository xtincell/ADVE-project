// @vitest-environment jsdom
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { financialModelFixture } from "../../fixtures/financial-model";
import { PillarVFields } from "@/components/cockpit/pillars/pillar-v-fields";
import { BudgetDisplay } from "@/components/strategy-presentation/sections/10-budget";
import { PropositionValeur } from "@/components/strategy-presentation/sections/04-proposition-valeur";
import { mapBudget, mapPropositionValeur } from "@/server/services/strategy-presentation/section-mappers";
import { sectionDataToBody } from "@/server/services/strategy-presentation/export-oracle";

const normalize = (text: string) => text.replace(/[\u00a0\u202f]/g, " ");
const content = () => ({ financialModel: financialModelFixture(), unitEconomics: { cac: null, ltv: null, ltvCacRatio: null },
  _fieldProvenance: { financialModel: "INFERRED", unitEconomics: "HUMAN" } });
const strategy = () => ({ pillars: [{ key: "v", content: content() }], campaigns: [], gloryOutputs: [] });

describe("Calcul financier commun vers ADVE, Oracle et export", () => {
  it("rend les valeurs déduites du modèle V avec la devise, l’unité et le plafond proposés", () => {
    const html = normalize(renderToStaticMarkup(React.createElement(PillarVFields, { content: content(), certainty: null })));
    for (const value of ["Plafond CAC proposé", "7 000 USD", "LTV contributive sur 12 mois", "84 000 USD", "1 100 %", "14,36 %"]) expect(html).toContain(value);
    expect(html).not.toContain("110 000 %");
  });

  it("conserve les mêmes unités dans le budget Oracle et son texte exporté", () => {
    const data = mapBudget(strategy());
    const html = normalize(renderToStaticMarkup(React.createElement(BudgetDisplay, { data })));
    const text = normalize(sectionDataToBody(data));
    for (const value of ["7 000 USD", "1 100 %", "14,36 %", "2 760 000 USD", "11 700 000 USD"]) {
      expect(html).toContain(value); expect(text).toContain(value);
    }
    expect(html).not.toContain(" XAF"); expect(text).not.toContain("WORKING_MODEL");
  });

  it("propage la qualification de cohorte dans la proposition de valeur", () => {
    const data = mapPropositionValeur(strategy());
    const html = normalize(renderToStaticMarkup(React.createElement(PropositionValeur, { data })));
    expect(html).toContain("Plafond CAC proposé"); expect(html).toContain("7 000 USD");
    expect(html).toContain("Professionnels souscripteurs");
  });
});
