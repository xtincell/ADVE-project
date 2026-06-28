import { describe, it, expect } from "vitest";
import {
  computeRiceScore,
  resolveScaleValue,
  sortByRice,
  categoricalImpactToRiceLabel,
} from "@/server/services/consulting/rice";
import { buildRiceScaleRows } from "../../../prisma/seed-rice-scales";

/**
 * RICE déterministe (ADR-0109, acteur Conseil) — PUR, zéro mock, zéro LLM.
 */

describe("consulting/rice — computeRiceScore", () => {
  it("calcule (reach × impact × confidence) / effort", () => {
    // (1000 × 2 × 0.8) / 2 = 800
    expect(computeRiceScore({ reach: 1000, impact: 2, confidence: 0.8, effort: 2 })).toBe(800);
  });

  it("arrondit à 2 décimales (tri stable)", () => {
    // (100 × 1 × 0.5) / 3 = 16.666… → 16.67
    expect(computeRiceScore({ reach: 100, impact: 1, confidence: 0.5, effort: 3 })).toBe(16.67);
  });

  it("effort ≤ 0 → null (jamais Infinity)", () => {
    expect(computeRiceScore({ reach: 100, impact: 1, confidence: 1, effort: 0 })).toBeNull();
    expect(computeRiceScore({ reach: 100, impact: 1, confidence: 1, effort: -1 })).toBeNull();
  });

  it("entrée non finie → null", () => {
    expect(computeRiceScore({ reach: NaN, impact: 1, confidence: 1, effort: 1 })).toBeNull();
  });
});

describe("consulting/rice — resolveScaleValue", () => {
  const rows = buildRiceScaleRows().map((r) => ({ dimension: r.dimension, label: r.label, value: r.value }));

  it("résout un libellé seedé (insensible à la casse)", () => {
    expect(resolveScaleValue(rows, "IMPACT", "Massive")).toBe(3);
    expect(resolveScaleValue(rows, "IMPACT", "high")).toBe(2);
    expect(resolveScaleValue(rows, "CONFIDENCE", "High")).toBe(1.0);
    expect(resolveScaleValue(rows, "EFFORT", "M")).toBe(1);
  });

  it("libellé inconnu → null (jamais d'invention)", () => {
    expect(resolveScaleValue(rows, "IMPACT", "Gigantic")).toBeNull();
  });
});

describe("consulting/rice — sortByRice", () => {
  it("trie par score décroissant, non-scorés en queue", () => {
    const sorted = sortByRice([
      { id: "a", riceScore: 10 },
      { id: "b", riceScore: null },
      { id: "c", riceScore: 50 },
    ]);
    expect(sorted.map((x) => x.id)).toEqual(["c", "a", "b"]);
  });
});

describe("consulting/rice — categoricalImpactToRiceLabel", () => {
  it("mappe LOW/MEDIUM/HIGH", () => {
    expect(categoricalImpactToRiceLabel("HIGH")).toBe("High");
    expect(categoricalImpactToRiceLabel("LOW")).toBe("Low");
    expect(categoricalImpactToRiceLabel("MEDIUM")).toBe("Medium");
    expect(categoricalImpactToRiceLabel("whatever")).toBe("Medium");
  });
});

describe("consulting/rice — buildRiceScaleRows (seed pur)", () => {
  it("couvre les 4 dimensions, couples (dimension,label) uniques", () => {
    const rows = buildRiceScaleRows();
    const dims = new Set(rows.map((r) => r.dimension));
    expect(dims).toEqual(new Set(["REACH", "IMPACT", "CONFIDENCE", "EFFORT"]));
    const keys = rows.map((r) => `${r.dimension}/${r.label}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
