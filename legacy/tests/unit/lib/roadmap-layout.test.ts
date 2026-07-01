import { describe, it, expect } from "vitest";
import { computeRoadmapLayout } from "@/lib/strategy/roadmap-layout";

/** Macro Roadmap layout (ADR-0120 PR-4c) — PUR, déterministe (now injecté). */

describe("roadmap-layout — computeRoadmapLayout", () => {
  const NOW = new Date("2026-02-01T00:00:00Z");

  it("positionne les campagnes proportionnellement dans la fenêtre min→max", () => {
    const layout = computeRoadmapLayout(
      [
        { id: "a", name: "GTM", canonType: "GTM_90", startDate: "2026-01-01", endDate: "2026-04-01" },
        { id: "b", name: "Annuelle", canonType: "ANNUAL", startDate: "2026-01-01", endDate: "2027-01-01" },
      ],
      NOW,
    );
    expect(layout.windowStart).toBe("2026-01-01");
    expect(layout.windowEnd).toBe("2027-01-01");
    const a = layout.bars.find((x) => x.id === "a")!;
    expect(a.leftPct).toBe(0); // commence au début de fenêtre
    expect(a.widthPct).toBeGreaterThan(0);
    expect(a.widthPct).toBeLessThan(100); // ~3 mois sur 12
    expect(layout.nowPct ?? -1).toBeGreaterThan(0); // 1er févr. dans la fenêtre
  });

  it("always-on / sans fin s'étend jusqu'au bout de la fenêtre (endDate null)", () => {
    const layout = computeRoadmapLayout(
      [
        { id: "g", name: "GTM", startDate: "2026-01-01", endDate: "2026-04-01" },
        { id: "ao", name: "Always-on", startDate: "2026-01-01", endDate: null, isAlwaysOn: true },
      ],
      NOW,
    );
    const ao = layout.bars.find((x) => x.id === "ao")!;
    expect(ao.endDate).toBeNull();
    expect(ao.leftPct + ao.widthPct).toBeCloseTo(100, 0);
  });

  it("campagnes sans date → undated, non positionnées", () => {
    const layout = computeRoadmapLayout(
      [
        { id: "d", name: "Datée", startDate: "2026-01-01", endDate: "2026-02-01" },
        { id: "n", name: "Sans date", startDate: null },
      ],
      NOW,
    );
    expect(layout.bars.map((b) => b.id)).toEqual(["d"]);
    expect(layout.undated.map((u) => u.id)).toEqual(["n"]);
  });

  it("aucune campagne datée → layout vide", () => {
    const layout = computeRoadmapLayout([{ id: "n", name: "X", startDate: null }], NOW);
    expect(layout.bars).toHaveLength(0);
    expect(layout.windowStart).toBeNull();
    expect(layout.nowPct).toBeNull();
  });
});
