/**
 * mapFenetreOverton — ADR-0088 Oracle surfacing.
 *
 * Locks that the presentation mapper reads the new-model S shape:
 * S.computed.roadmapRoutes → section.roadmapRoutes, S.computed aggregations →
 * section.computedDashboard, and nested S.fenetreOverton perceptions (not just
 * the top-level legacy shape).
 */

import { describe, it, expect } from "vitest";
import { mapFenetreOverton } from "@/server/services/strategy-presentation/section-mappers";

const sContent = {
  fenetreOverton: {
    perceptionActuelle: "Un bon cabinet parmi d'autres",
    perceptionCible: "La référence qui transforme les marques en icônes",
    ecart: "De déclaratif à prouvé",
    strategieDeplacement: [{ etape: "Prouver", action: "Case studies", canal: "Digital", horizon: "Q1" }],
  },
  roadmap: [{ phase: "Phase 1", objectif: "Prouver", livrables: ["Case studies"], duree: "Mois 1-2" }],
  computed: {
    totalBudget: 10_500_000,
    riskCoverage: 60,
    selectedInitiativeCount: 4,
    coherenceScore: 100,
    budgetByPhase: { SPRINT_90: 6_000_000, PHASE_1: 1_500_000 },
    roadmapRoutes: [
      { key: "CONSERVATIVE", label: "Conservateur", recommended: false, projectedGrowthPct: 18, projectedRevenue: 177_000_000, targetCultIndex: 66, description: "Statu quo." },
      { key: "TARGET", label: "Cible", recommended: true, projectedGrowthPct: 49, projectedRevenue: 223_500_000, targetCultIndex: 72, description: "Activation." },
      { key: "AMBITIOUS", label: "Ambitieux", recommended: false, projectedGrowthPct: 100, projectedRevenue: 300_000_000, targetCultIndex: 79, description: "Superfans." },
    ],
  },
};

const strategy = {
  name: "UPgraders / La Fusée",
  sector: "Conseil",
  advertis_vector: { composite: 120 },
  pillars: [{ key: "s", content: sContent }],
};

describe("mapFenetreOverton (ADR-0088)", () => {
  const out = mapFenetreOverton(strategy);

  it("surfaces the 3 roadmap routes from S.computed", () => {
    expect(out.roadmapRoutes).toHaveLength(3);
    expect(out.roadmapRoutes.map((r) => r.projectedGrowthPct)).toEqual([18, 49, 100]);
    expect(out.roadmapRoutes.find((r) => r.recommended)?.key).toBe("TARGET");
    expect(out.roadmapRoutes[2].projectedRevenue).toBe(300_000_000);
  });

  it("surfaces the computed dashboard aggregations", () => {
    expect(out.computedDashboard).not.toBeNull();
    expect(out.computedDashboard?.totalBudget).toBe(10_500_000);
    expect(out.computedDashboard?.riskCoverage).toBe(60);
    expect(out.computedDashboard?.selectedInitiativeCount).toBe(4);
    expect(out.computedDashboard?.budgetByPhase).toEqual([
      { phase: "SPRINT_90", budget: 6_000_000 },
      { phase: "PHASE_1", budget: 1_500_000 },
    ]);
  });

  it("reads perceptions from the nested S.fenetreOverton shape", () => {
    expect(out.perceptionActuelle).toBe("Un bon cabinet parmi d'autres");
    expect(out.perceptionCible).toContain("référence");
    expect(out.strategieDeplacment[0].etape).toBe("Prouver");
  });

  it("degrades gracefully when computed is absent (legacy rows)", () => {
    const legacy = mapFenetreOverton({ ...strategy, pillars: [{ key: "s", content: { roadmap: [] } }] });
    expect(legacy.roadmapRoutes).toEqual([]);
    expect(legacy.computedDashboard).toBeNull();
  });
});
