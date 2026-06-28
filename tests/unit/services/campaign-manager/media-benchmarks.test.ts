/**
 * media-benchmarks.test.ts — Benchmarks média en base, sourcés (zéro hardcode).
 *
 * PRODUCTION-LEVEL, ZÉRO MOCK : on teste le **constructeur pur** des lignes de
 * référence (aucune I/O, aucun mock) — il garantit que chaque chiffre média porte
 * sa source (nom/URL/année), sa devise, son marché et sa période, et qu'aucune
 * valeur n'est codée dans le moteur. Le moteur média lit ces lignes ; il n'en
 * code aucune.
 */

import { describe, expect, it } from "vitest";
import { buildMediaBenchmarkRows } from "../../../../prisma/seed-media-benchmarks";
import { mediaMetricKey } from "@/server/services/market-cost";

const ROWS = buildMediaBenchmarkRows();

describe("media-benchmarks — données de référence sourcées", () => {
  it("chaque ligne porte source (nom/URL/année), devise, marché, période, confiance", () => {
    expect(ROWS.length).toBeGreaterThan(15);
    for (const r of ROWS) {
      expect(r.countryCode).toMatch(/^[A-Z]{2}$/);
      expect(r.metric).toMatch(/^(CPM|CPC)_/);
      expect(r.period).toMatch(/^\d{4}$/);
      expect(r.currency.length).toBeGreaterThanOrEqual(3);
      expect(r.p50).toBeGreaterThan(0);
      expect(r.source).toBe("SEED");
      expect(r.sourceRef.length).toBeGreaterThan(0);
      expect(r.sourceRef[0]!.url).toMatch(/^https?:\/\//);
      expect(r.sourceRef[0]!.year).toBeGreaterThanOrEqual(2024);
      expect(r.confidence).toBeGreaterThan(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
      // cohérence distribution p10 ≤ p50 ≤ p90 quand présents
      if (r.p10 != null) expect(r.p10).toBeLessThanOrEqual(r.p50);
      if (r.p90 != null) expect(r.p90).toBeGreaterThanOrEqual(r.p50);
    }
  });

  it("les marchés africains sont flaggés PROXY + confiance basse (honnêteté)", () => {
    const africa = ROWS.filter((r) => ["NG", "KE", "ZA", "EG"].includes(r.countryCode));
    expect(africa.length).toBeGreaterThan(0);
    for (const r of africa) {
      expect(r.notes ?? "").toContain("PROXY");
      expect(r.confidence).toBeLessThanOrEqual(0.35);
    }
  });

  it("clés (countryCode, metric, period) uniques (upsert idempotent)", () => {
    const keys = ROWS.map((r) => `${r.countryCode}|${r.metric}|${r.period}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("la clé métrique média est déterministe et canonique", () => {
    expect(mediaMetricKey("tv_broadcast")).toBe("CPM_TV_BROADCAST");
    expect(mediaMetricKey("google", "CPC")).toBe("CPC_GOOGLE");
    // une clé seedée existe bien pour ce canal
    expect(ROWS.some((r) => r.metric === mediaMetricKey("tv_broadcast"))).toBe(true);
  });

  it("constructeur déterministe : même appel → mêmes lignes (hors objets Date)", () => {
    const a = buildMediaBenchmarkRows().map((r) => ({ ...r, periodStart: r.periodStart.toISOString(), periodEnd: r.periodEnd.toISOString() }));
    const b = buildMediaBenchmarkRows().map((r) => ({ ...r, periodStart: r.periodStart.toISOString(), periodEnd: r.periodEnd.toISOString() }));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
