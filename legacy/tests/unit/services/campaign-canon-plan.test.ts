import { describe, it, expect } from "vitest";
import {
  planCanonicalCampaigns,
  canonTypeForTimeframe,
  tierBudgetMultiplier,
  type CanonTemplateLite,
} from "@/server/services/campaign-canon/plan";
import { buildCanonTemplateRows } from "../../../prisma/seed-campaign-canon-templates";
import { buildBrandMomentRows } from "../../../prisma/seed-brand-moments";

/** Planificateur de campagnes canon (ADR-0119) — PUR, déterministe, zéro mock. */

const TEMPLATES: CanonTemplateLite[] = buildCanonTemplateRows().map((t) => ({
  canonType: t.canonType, label: t.label, aarrrPrimary: t.aarrrPrimary, aarrrSecondary: t.aarrrSecondary,
  durationDays: t.durationDays, isAlwaysOn: t.isAlwaysOn, budgetShare: t.budgetShare,
}));
const START = new Date("2026-01-01T00:00:00Z");

describe("campaign-canon — canonTypeForTimeframe", () => {
  it("mappe le timeframe → campagne canon", () => {
    expect(canonTypeForTimeframe("SPRINT_90")).toBe("GTM_90");
    expect(canonTypeForTimeframe("PHASE_1")).toBe("ANNUAL");
    expect(canonTypeForTimeframe("PHASE_2")).toBe("ANNUAL");
    expect(canonTypeForTimeframe("LONG_TERM")).toBe("ALWAYS_ON");
    expect(canonTypeForTimeframe(null)).toBe("ANNUAL");
  });
});

describe("campaign-canon — tierBudgetMultiplier", () => {
  it("croît avec le tier (LATENT→ICONE), borné", () => {
    expect(tierBudgetMultiplier(0)).toBe(0.7);
    expect(tierBudgetMultiplier(5)).toBe(0.95);
    expect(tierBudgetMultiplier(99)).toBe(1.05); // borné à 7
  });
});

describe("campaign-canon — planCanonicalCampaigns", () => {
  it("produit 3 campagnes, dates + always-on corrects", () => {
    const plan = planCanonicalCampaigns({ initiatives: [], templates: TEMPLATES, tierOrdinal: 0, startDate: START, globalBudget: 1_000_000 });
    expect(plan).toHaveLength(3);
    const gtm = plan.find((p) => p.canonType === "GTM_90")!;
    const annual = plan.find((p) => p.canonType === "ANNUAL")!;
    const always = plan.find((p) => p.canonType === "ALWAYS_ON")!;
    expect(gtm.endDate).toEqual(new Date("2026-04-01T00:00:00Z")); // +90j
    expect(annual.endDate).toEqual(new Date("2027-01-01T00:00:00Z")); // +365j
    expect(always.endDate).toBeNull(); // permanent
    expect(always.isAlwaysOn).toBe(true);
  });

  it("répartit les initiatives par timeframe + somme les budgets (× multiplicateur tier)", () => {
    const plan = planCanonicalCampaigns({
      initiatives: [
        { id: "a", timeframe: "SPRINT_90", budgetMax: 100_000 },
        { id: "b", timeframe: "SPRINT_90", budgetMax: 50_000 },
        { id: "c", timeframe: "PHASE_1", budgetMax: 200_000 },
        { id: "d", timeframe: "LONG_TERM", budgetMin: 30_000 },
      ],
      templates: TEMPLATES,
      tierOrdinal: 0, // ×0.7
      startDate: START,
    });
    const gtm = plan.find((p) => p.canonType === "GTM_90")!;
    expect(gtm.actionIds.sort()).toEqual(["a", "b"]);
    expect(gtm.recommendedBudget).toBe(Math.round(150_000 * 0.7)); // 105000
    const annual = plan.find((p) => p.canonType === "ANNUAL")!;
    expect(annual.actionIds).toEqual(["c"]);
    const always = plan.find((p) => p.canonType === "ALWAYS_ON")!;
    expect(always.actionIds).toEqual(["d"]);
  });

  it("sans budget d'initiative → part du budget global × share", () => {
    const plan = planCanonicalCampaigns({ initiatives: [], templates: TEMPLATES, tierOrdinal: 7, startDate: START, globalBudget: 1_000_000 });
    const gtm = plan.find((p) => p.canonType === "GTM_90")!; // share 0.4 × 1.05
    expect(gtm.recommendedBudget).toBe(Math.round(1_000_000 * 0.4 * 1.05));
  });
});

describe("campaign-canon — seeds purs", () => {
  it("templates : 3 canonType uniques, budgetShare somme ≈ 1", () => {
    const rows = buildCanonTemplateRows();
    expect(new Set(rows.map((r) => r.canonType)).size).toBe(3);
    const sum = rows.reduce((s, r) => s + r.budgetShare, 0);
    expect(sum).toBeCloseTo(1, 2);
  });
  it("moments : clés uniques, généraux + positionnement présents", () => {
    const rows = buildBrandMomentRows();
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
    expect(rows.some((r) => r.key === "RAMADAN" && r.movable)).toBe(true);
    expect(rows.some((r) => r.key === "BLACK_FRIDAY" && r.type === "POSITIONING")).toBe(true);
    expect(rows.some((r) => r.key === "RENTREE_SCOLAIRE")).toBe(true);
  });
});
