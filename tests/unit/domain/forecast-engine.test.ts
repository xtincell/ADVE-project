/**
 * ADR-0156 — Moteur de forecast déterministe : refus sans donnée, robustesse
 * aux outliers, backtest intégré, calibration. Pur, sans IO.
 */
import { describe, it, expect } from "vitest";
import {
  forecastSeries,
  normalizeDaily,
  slopeDirection,
  calibrateConfidence,
  MIN_SAMPLES,
} from "@/domain/forecast";

const DAY = 86_400_000;
const t0 = Date.UTC(2026, 0, 1);
const series = (vals: number[], stepDays = 3) => vals.map((v, i) => ({ t: t0 + i * stepDays * DAY, v }));

describe("forecastSeries", () => {
  it("refuse de prédire sans donnée suffisante (INSUFFICIENT_DATA, jamais un chiffre fabriqué)", () => {
    const r = forecastSeries(series([100, 110, 120]), { horizonDays: 30 });
    expect(r.status).toBe("INSUFFICIENT_DATA");
    expect(r.points).toHaveLength(0);
  });

  it("refuse un span trop court même avec assez de points", () => {
    const dense = Array.from({ length: 10 }, (_, i) => ({ t: t0 + i * DAY, v: 100 + i }));
    const r = forecastSeries(dense, { horizonDays: 30 }); // span 9 j < 14
    expect(r.status).toBe("INSUFFICIENT_DATA");
  });

  it("projette une tendance linéaire avec pente correcte et backtest quasi nul", () => {
    const r = forecastSeries(series([1000, 1030, 1060, 1090, 1120, 1150, 1180]), { horizonDays: 30 });
    expect(r.status).toBe("OK");
    expect(r.slopePerDay).toBeCloseTo(10, 5);
    expect(r.backtestMape).not.toBeNull();
    expect(r.backtestMape!).toBeLessThan(0.01);
    const last = r.points[r.points.length - 1]!;
    expect(last.v).toBeGreaterThan(1180);
    expect(last.lo).toBeLessThanOrEqual(last.v);
    expect(last.hi).toBeGreaterThanOrEqual(last.v);
  });

  it("est ROBUSTE à un outlier (Theil-Sen — un relevé raté ne casse pas la tendance)", () => {
    const vals = [1000, 1030, 1060, 5, 1120, 1150, 1180]; // relevé raté au milieu
    const r = forecastSeries(series(vals), { horizonDays: 30 });
    expect(r.status).toBe("OK");
    expect(r.slopePerDay).toBeGreaterThan(5);
    expect(r.slopePerDay).toBeLessThan(15);
  });

  it("est déterministe (mêmes points → même sortie)", () => {
    const a = forecastSeries(series([100, 120, 140, 160, 180, 200]), { horizonDays: 30 });
    const b = forecastSeries(series([100, 120, 140, 160, 180, 200]), { horizonDays: 30 });
    expect(a).toEqual(b);
  });

  it("normalizeDaily garde la dernière valeur du jour et trie", () => {
    const pts = [
      { t: t0 + 5 * DAY, v: 3 },
      { t: t0, v: 1 },
      { t: t0 + 3600_000, v: 2 }, // même jour que t0 → remplace
    ];
    const n = normalizeDaily(pts);
    expect(n).toHaveLength(2);
    expect(n[0]!.v).toBe(2);
  });

  it("MIN_SAMPLES est le seuil canon", () => {
    expect(MIN_SAMPLES).toBe(5);
  });
});

describe("slopeDirection / calibrateConfidence", () => {
  it("direction relative à la dernière valeur", () => {
    expect(slopeDirection(10, 1000)).toBe("UP");
    expect(slopeDirection(-10, 1000)).toBe("DOWN");
    expect(slopeDirection(0.1, 1000)).toBe("FLAT");
  });

  it("sans historique résolu → confiance déclarée inchangée", () => {
    expect(calibrateConfidence(0.8, { hits: 0, resolved: 0 })).toBe(0.8);
  });

  it("l'historique observé tire la confiance vers le taux de réussite réel", () => {
    // 2/10 de réussite observée → la confiance déclarée 0.9 doit chuter nettement.
    const c = calibrateConfidence(0.9, { hits: 2, resolved: 10 });
    expect(c).toBeLessThan(0.5);
    expect(c).toBeGreaterThan(0.2);
    // 9/10 observé → une confiance timide 0.5 remonte.
    expect(calibrateConfidence(0.5, { hits: 9, resolved: 10 })).toBeGreaterThan(0.7);
  });
});

describe("single-writer PredictionRecord (verrou HARD, ADR-0156)", () => {
  it("db.predictionRecord.create n'existe QUE dans seshat/prediction", async () => {
    const { execSync } = await import("node:child_process");
    const out = execSync(
      `grep -rln "predictionRecord.create" src/ || true`,
      { encoding: "utf8", cwd: process.cwd() },
    )
      .split("\n")
      .filter(Boolean);
    expect(out).toEqual(["src/server/services/seshat/prediction/index.ts"]);
  });
});
