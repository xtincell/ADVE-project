// @vitest-environment jsdom
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mapBudget, mapPropositionValeur } from "@/server/services/strategy-presentation/section-mappers";
import { PillarVFields } from "@/components/cockpit/pillars/pillar-v-fields";
import { PropositionValeur } from "@/components/strategy-presentation/sections/04-proposition-valeur";
import { BudgetDisplay } from "@/components/strategy-presentation/sections/10-budget";
import { Mckinsey3Horizons } from "@/components/strategy-presentation/sections/phase13-sections";

vi.mock("@/components/neteru/ptah-forge-button", () => ({ PtahForgeButton: () => null }));
beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Oracle renders facts consistently across server and browser", () => {
  it("uses the same French number format despite different ambient locales", () => {
    const original = Number.prototype.toLocaleString;
    let ambient = "en-US";
    vi.spyOn(Number.prototype, "toLocaleString").mockImplementation(function(this: number, locales, options) {
      return original.call(this, locales ?? ambient, options);
    });
    const data = { pricing: null, proofPoints: [], guarantees: [], innovationPipeline: [],
      unitEconomics: { cac: 350_000, ltv: 0, ltvCacRatio: null } };
    const server = renderToStaticMarkup(React.createElement(PropositionValeur, { data }));
    ambient = "fr-FR";
    const browser = renderToStaticMarkup(React.createElement(PropositionValeur, { data }));
    expect(server).toBe(browser);
    expect(server).toContain("350 000 FCFA");
    expect(server).toContain("0 FCFA");
  });

  it("refuses an inconsistent economic ratio in all three readers instead of inventing another comparable cohort", () => {
    const ue = { cac: 120, ltv: 350000, ltvCacRatio: 23, margeNette: null, roiEstime: null, budgetCom: null, caVise: null };
    const pages = [
      renderToStaticMarkup(React.createElement(PillarVFields, { content: { unitEconomics: ue }, certainty: null })),
      renderToStaticMarkup(React.createElement(PropositionValeur, { data: { pricing: null, proofPoints: [], guarantees: [], innovationPipeline: [], unitEconomics: ue } })),
      renderToStaticMarkup(React.createElement(BudgetDisplay, { data: { unitEconomics: ue, campaignBudgets: [], totalBudget: null, globalBudget: null, budgetBreakdown: null } })),
    ];
    for (const html of pages) { expect(html).not.toContain(">23x<"); expect(html).not.toMatch(/(2916\.67|2 916,67)x/); }
    expect(pages[0]).toContain("Ratio à requalifier");
  });

  it("carries customer and period qualification from the stored pillar into both export sections and HTML readers", () => {
    const ue = { cac: 120, ltv: 350000, ltvCacRatio: 23, commentaire: "CAC B2C ; LTV B2B. Scénario historique, pas une mesure actuelle." };
    const strategy = { pillars: [{ key: "v", content: { unitEconomics: ue } }], campaigns: [] };
    const value = mapPropositionValeur(strategy), budget = mapBudget(strategy);
    for (const section of [value, budget]) {
      expect(section.unitEconomics?.ltvCacRatio).toBeNull();
      expect(section.unitEconomics?.commentaire).toContain("Ratio à requalifier");
      expect(section.unitEconomics?.commentaire).toContain(ue.commentaire);
    }
    for (const html of [renderToStaticMarkup(React.createElement(PropositionValeur, { data: value })),
      renderToStaticMarkup(React.createElement(BudgetDisplay, { data: budget }))]) {
      expect(html).toContain("Ratio à requalifier"); expect(html).toContain(ue.commentaire);
      expect(html).not.toMatch(/(2916\.67|2 916,67)x/); expect(html).not.toContain(">23x<");
    }
  });

  it("does not turn zero CAC into a free offer or an infinite ratio", () => {
    const html = renderToStaticMarkup(React.createElement(PillarVFields, { content: { unitEconomics: { cac: 0, ltv: 100, ltvCacRatio: 23 } }, certainty: null }));
    expect(html).toContain("0 F"); expect(html).not.toContain("Gratuit"); expect(html).not.toContain(">23x<");
  });

  it("keeps a declared campaign budget of zero different from an unknown amount", () => {
    const html = renderToStaticMarkup(React.createElement(BudgetDisplay, { data: {
      unitEconomics: null, campaignBudgets: [
        { name: "Zero", budget: 0, budgetCurrency: "XAF", status: "DRAFT" },
        { name: "Unknown", budget: null, budgetCurrency: "XAF", status: "DRAFT" },
      ], totalBudget: 0, globalBudget: null, budgetBreakdown: null,
    } }));
    const container = document.createElement("div");
    container.innerHTML = html;
    const rows = container.querySelectorAll("tbody tr");
    expect(rows[0]?.querySelectorAll("td")[1]?.textContent).toBe("0 XAF");
    expect(rows[1]?.querySelectorAll("td")[1]?.textContent).toBe("—");
  });

  it("shows unassigned horizons alongside their partial classification", () => {
    const html = renderToStaticMarkup(React.createElement(Mckinsey3Horizons, { data: { mckinsey3Horizons: {
      h1: { items: ["Sprint"] }, h2: { items: [] }, h3: { items: [] },
      allocation: { h1: 50, h2: 0, h3: 0 },
      unassigned: { label: "Échéances à préciser", items: ["Action sans date"] },
      coverage: { totalCount: 2, classifiedCount: 1, unassignedCount: 1 },
    } } }));
    expect(html).toContain("Action sans date");
    expect(html).toContain("Échéances à préciser");
    expect(html).toContain("1 sur 2");
  });

  it("shows a campaign subtotal with missing coverage instead of a complete zero total", () => {
    const html = renderToStaticMarkup(React.createElement(BudgetDisplay, { data: {
      unitEconomics: null, campaignBudgets: [
        { name: "Zero", budget: 0, budgetCurrency: "XAF", status: "DRAFT" },
        { name: "Unknown", budget: null, budgetCurrency: "XAF", status: "DRAFT" },
      ], totalBudget: null, globalBudget: null, budgetBreakdown: null,
    } }));
    expect(html).toContain("0 XAF chiffrés · 1 budget à préciser");
    expect(html).not.toContain("Total:");
  });

  it("renders each campaign in its declared currency and never relabels euros as francs", () => {
    const html = renderToStaticMarkup(React.createElement(BudgetDisplay, { data: {
      unitEconomics: null, campaignBudgets: [
        { name: "Euros", budget: 20, budgetCurrency: "EUR", status: "DRAFT" },
        { name: "No currency", budget: 0, status: "DRAFT" },
      ], totalBudget: null, globalBudget: null, budgetBreakdown: null,
    } }));
    expect(html).toContain("20 EUR");
    expect(html).toContain("0 · devise à préciser");
    expect(html).not.toContain("20 XAF");
  });
});
