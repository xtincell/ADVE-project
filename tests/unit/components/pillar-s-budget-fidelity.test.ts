// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { PillarSFields } from "@/components/cockpit/pillars/pillar-s-fields";
import { FenetreOverton } from "@/components/strategy-presentation/sections/12-fenetre-overton";
import { mapFenetreOverton } from "@/server/services/strategy-presentation/section-mappers";
import { computePillarS } from "@/server/services/rtis-protocols/strategy";

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("computed S displays the available budget, not an invented complete amount", () => {
  it("keeps explicit zero visible", () => {
    const { container } = render(React.createElement(PillarSFields, { certainty: null,
      content: { computed: { totalBudget: 0 } } }));
    expect(container.querySelector(".ck-s-computed__cells")?.textContent).toContain("0 F");
  });
  it("labels a partial subtotal with unknown budgets, estimates and horizons", () => {
    const computed = computePillarS({ i: { catalogueParCanal: { DIGITAL: [
      { action: "Unknown", status: "SELECTED_FOR_ROADMAP" },
      { action: "Estimate", status: "SELECTED_FOR_ROADMAP", budgetEstime: "LOW" },
    ] } }, r: null, t: null });
    const { container } = render(React.createElement(PillarSFields, { certainty: null, content: { computed } }));
    const text = container.querySelector(".ck-s-computed__cells")?.textContent;
    expect(text).toContain("chiffrés · 1 budget à préciser · 1 estimation");
    expect(text).toContain("Échéances à préciser2");
    expect(text).not.toContain("Budget total");
  });
  it("Oracle carries the same coverage and projection assumptions into its rendered output", () => {
    const computed = computePillarS({ i: { catalogueParCanal: { DIGITAL: [
      { action: "Unknown", status: "SELECTED_FOR_ROADMAP" },
    ] } }, r: null, t: null });
    const data = mapFenetreOverton({ pillars: [{ key: "s", content: { computed } }] });
    const { container } = render(React.createElement(FenetreOverton, { data }));
    expect(container.textContent).toContain("1 budget à préciser");
    expect(container.textContent).toContain("Scénarios hypothétiques");
    expect(container.textContent).toContain("Couverture des risques supposée : 30 %");
    expect(container.textContent).toContain("Indice actuel supposé : 60/100");
    expect(container.textContent).not.toContain("Budget engagé");
  });
});
