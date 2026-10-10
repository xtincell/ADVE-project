// @vitest-environment jsdom
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
