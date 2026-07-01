import { describe, it, expect } from "vitest";
import {
  computeLineVariance,
  variancePct,
  rollupBySection,
  rollupTotals,
  type AicpLineLike,
} from "@/server/services/production/aicp";
import { buildAicpSectionRows } from "../../../prisma/seed-aicp-sections";

/** Devis AICP triple planned/actual/variance (ADR-0112) — PUR, zéro mock. */

describe("production/aicp — variance ligne", () => {
  it("actual − planned, arrondi", () => {
    expect(computeLineVariance(1000, 1200)).toBe(200);
    expect(computeLineVariance(1000, 850.5)).toBe(-149.5);
  });
  it("non réalisé → null", () => {
    expect(computeLineVariance(1000, null)).toBeNull();
  });
  it("variancePct, planned=0 → null", () => {
    expect(variancePct(1000, 1100)).toBe(10);
    expect(variancePct(0, 100)).toBeNull();
  });
});

describe("production/aicp — rollups", () => {
  const lines: AicpLineLike[] = [
    { sectionCode: "B", plannedAmount: 1000, actualAmount: 1200 },
    { sectionCode: "B", plannedAmount: 500, actualAmount: null },
    { sectionCode: "C", plannedAmount: 800, actualAmount: 800 },
  ];

  it("rollupBySection agrège planned/actual/variance par section", () => {
    const r = rollupBySection(lines);
    const b = r.find((x) => x.sectionCode === "B")!;
    expect(b.planned).toBe(1500);
    expect(b.actual).toBe(1200); // seule la ligne réalisée compte dans actual
    expect(b.variance).toBe(1200 - 1500);
    const c = r.find((x) => x.sectionCode === "C")!;
    expect(c.variance).toBe(0);
  });

  it("rollupTotals : totaux planned/actual/variance + pct", () => {
    const t = rollupTotals(lines);
    expect(t.plannedTotal).toBe(2300);
    expect(t.actualTotal).toBe(2000);
    expect(t.varianceTotal).toBe(-300);
    expect(t.variancePct).toBeCloseTo(-13.04, 1);
  });

  it("aucun réalisé → actual/variance null", () => {
    const t = rollupTotals([{ sectionCode: "A", plannedAmount: 500, actualAmount: null }]);
    expect(t.plannedTotal).toBe(500);
    expect(t.actualTotal).toBeNull();
    expect(t.varianceTotal).toBeNull();
  });
});

describe("production — buildAicpSectionRows (seed pur)", () => {
  it("codes uniques A→P, familles cohérentes", () => {
    const rows = buildAicpSectionRows();
    const codes = rows.map((r) => r.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toContain("A");
    expect(codes).toContain("K"); // honoraires réalisateur
    expect(rows.every((r) => r.label.length > 0)).toBe(true);
  });
});
