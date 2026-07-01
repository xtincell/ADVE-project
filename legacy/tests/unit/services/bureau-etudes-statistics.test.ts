import { describe, it, expect } from "vitest";
import {
  zForConfidence,
  marginOfErrorPct,
  requiredSampleForMoe,
  waveOnWaveSignificance,
} from "@/server/services/bureau-etudes/statistics";
import { buildMethodologyRows } from "../../../prisma/seed-methodology-references";

/**
 * Statistiques d'étude déterministes (ADR-0110, Bureau d'étude) — PUR, zéro mock.
 */

describe("bureau-etudes/statistics — marge d'erreur & échantillon", () => {
  it("n≈384 → ±5 % à 95 % (norme tracker)", () => {
    const moe = marginOfErrorPct(384);
    expect(moe).not.toBeNull();
    expect(moe!).toBeGreaterThan(4.9);
    expect(moe!).toBeLessThan(5.1);
  });

  it("n ≤ 0 → null", () => {
    expect(marginOfErrorPct(0)).toBeNull();
    expect(marginOfErrorPct(-10)).toBeNull();
  });

  it("taille requise pour ±5 % à 95 % ≈ 385", () => {
    const n = requiredSampleForMoe(5);
    expect(n).toBe(385); // ceil(1.96² × 0.25 / 0.05²) = ceil(384.16)
  });

  it("MoE cible ≤ 0 → null", () => {
    expect(requiredSampleForMoe(0)).toBeNull();
  });

  it("z varie avec le niveau de confiance", () => {
    expect(zForConfidence(0.9)).toBe(1.645);
    expect(zForConfidence(0.95)).toBe(1.96);
    expect(zForConfidence(0.99)).toBe(2.576);
  });
});

describe("bureau-etudes/statistics — significativité inter-vagues", () => {
  it("gros écart sur gros échantillons → significatif", () => {
    // 50% → 60% sur n=1000 chacun
    const cmp = waveOnWaveSignificance(0.5, 1000, 0.6, 1000);
    expect(cmp.delta).toBeCloseTo(0.1, 5);
    expect(cmp.significant).toBe(true);
    expect(cmp.z).not.toBeNull();
  });

  it("petit écart sur petits échantillons → non significatif", () => {
    const cmp = waveOnWaveSignificance(0.5, 50, 0.52, 50);
    expect(cmp.significant).toBe(false);
  });

  it("entrées invalides → z null, non significatif (jamais d'erreur jetée)", () => {
    const cmp = waveOnWaveSignificance(0.5, 0, 0.6, 100);
    expect(cmp.z).toBeNull();
    expect(cmp.significant).toBe(false);
  });
});

describe("bureau-etudes — buildMethodologyRows (seed pur)", () => {
  it("clés uniques, familles valides, tracker n=384/±5 %", () => {
    const rows = buildMethodologyRows();
    const keys = rows.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    const tracker = rows.find((r) => r.key === "BRAND_TRACKER");
    expect(tracker?.typicalN).toBe(384);
    expect(tracker?.marginOfErrorPct).toBe(5.0);
  });
});
