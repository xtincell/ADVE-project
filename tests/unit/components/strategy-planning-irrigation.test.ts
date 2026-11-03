// @vitest-environment jsdom
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { model, projection, actions } from "../../fixtures/strategy-planning";
import { generateStrategy, computePillarS } from "@/server/services/rtis-protocols/strategy";
import { PillarSFields } from "@/components/cockpit/pillars/pillar-s-fields";
import { BudgetDisplay } from "@/components/strategy-presentation/sections/10-budget";
import { mapBudget } from "@/server/services/strategy-presentation/section-mappers";
const normalize = (s: string) => s.replace(/[\u00a0\u202f]/g, " ");
describe("Strategy and Oracle show the same qualified plan", () => {
  it("renders the range, five cost categories, numeric zero objectives and six prospective rungs in both surfaces", () => {
    const pillars = { v: { strategyBudgetModel: model }, e: { devotionProjection: projection }, i: { catalogueParCanal: { MIX: actions } } };
    const content = { ...generateStrategy(pillars, "TARGET"), computed: computePillarS(pillars) };
    const oracle = mapBudget({ pillars: [{ key: "s", content }], campaigns: [] });
    const surfaces = [renderToStaticMarkup(React.createElement(PillarSFields, { content, certainty: null })), renderToStaticMarkup(React.createElement(BudgetDisplay, { data: oracle }))].map(normalize);
    for (const html of surfaces) {
      for (const label of ["Budget du scénario", "250", "350", "XOF", "Production", "Média", "Talent", "Logistique", "Technologie", "Parcours d’engagement chiffré", "Spectateurs", "Prescripteurs", "Free audience"]) expect(html).toContain(label);
      expect(html).not.toContain("width:150%"); expect(html).not.toContain("undefined");
    }
    const doc = new DOMParser().parseFromString(surfaces[0]!, "text/html");
    const sprint = doc.querySelector("ol.ck-s-sprint");
    expect(sprint).not.toBeNull();
    expect(sprint?.querySelector("li .ck-s-sprint__action")?.textContent).toBe("Produce launch");
    expect(sprint?.querySelector(".ck-s-sprint__meta")?.textContent).toContain("Budget estimé de l’action");
  });
});
