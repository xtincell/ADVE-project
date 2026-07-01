/**
 * media-plan-pca.test.ts — PCA média déterministe (ADR-0107).
 *
 * PRODUCTION-LEVEL, ZÉRO MOCK : on teste le **cœur PCA pur** (écart prévu/réalisé,
 * makegood, CPM réalisé, GRP dérivé) sur des valeurs réelles, sans aucune I/O ni
 * simulation. Les fonctions DB sont de minces orchestrateurs Prisma vérifiés par
 * le chemin de production réel.
 */

import { describe, expect, it } from "vitest";
import { computeLinePca, computePlanPca } from "@/server/services/media-plan";

describe("computeLinePca — post-buy déterministe", () => {
  it("sous-livraison 100k→80k : variance −20 %, makegood 20k, CPM réalisé", () => {
    const pca = computeLinePca({
      channel: "TV_BROADCAST",
      category: "ATL",
      plannedImpressions: 100_000,
      plannedSpend: 4534, // CPM 45.34 → 100k impr
      actualImpressions: 80_000,
      actualSpend: 4534,
    });
    expect(pca.impressionVariancePct).toBe(-20);
    expect(pca.makegoodShortfall).toBe(20_000);
    expect(pca.actualCpm).toBeCloseTo(56.675, 2); // 4534/80000*1000
    expect(pca.plannedCpm).toBeCloseTo(45.34, 2);
  });

  it("dérive le GRP prévu depuis Reach% × Fréquence quand non fourni", () => {
    const pca = computeLinePca({ channel: "TV_CABLE", plannedReachPct: 60, plannedFrequency: 3.5 });
    expect(pca.plannedGrp).toBe(210);
  });

  it("sur-livraison → makegood 0, variance positive", () => {
    const pca = computeLinePca({ channel: "META", plannedImpressions: 100_000, actualImpressions: 120_000 });
    expect(pca.makegoodShortfall).toBe(0);
    expect(pca.impressionVariancePct).toBe(20);
  });

  it("données manquantes → null (jamais NaN), pas d'invention", () => {
    const pca = computeLinePca({ channel: "OOH" });
    expect(pca.plannedCpm).toBeNull();
    expect(pca.actualCpm).toBeNull();
    expect(pca.impressionVariancePct).toBeNull();
    expect(pca.makegoodShortfall).toBe(0);
  });
});

describe("computePlanPca — agrégat plan", () => {
  it("agrège impressions/dépenses + variance + makegood total", () => {
    const plan = computePlanPca("plan-1", [
      { channel: "TV_BROADCAST", category: "ATL", plannedImpressions: 100_000, plannedSpend: 4534, actualImpressions: 80_000, actualSpend: 4000 },
      { channel: "META", category: "TTL", plannedImpressions: 50_000, plannedSpend: 330, actualImpressions: 60_000, actualSpend: 350 },
    ]);
    expect(plan.totals.plannedImpressions).toBe(150_000);
    expect(plan.totals.actualImpressions).toBe(140_000);
    expect(plan.totals.impressionVariancePct).toBeCloseTo(-6.6667, 2); // (140k-150k)/150k
    expect(plan.totals.makegoodShortfall).toBe(10_000); // sur le total
    expect(plan.lines).toHaveLength(2);
  });

  it("déterministe : même entrée → même PCA (variance nulle)", () => {
    const lines = [{ channel: "CTV", plannedImpressions: 100_000, actualImpressions: 90_000 }];
    const out = new Set<string>();
    for (let i = 0; i < 20; i++) out.add(JSON.stringify(computePlanPca("p", lines)));
    expect(out.size).toBe(1);
  });
});
