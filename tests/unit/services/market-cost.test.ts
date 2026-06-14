import { describe, it, expect } from "vitest";
import { parsePeriod, MARKET_COST_SEED } from "@/server/services/market-cost";
import { INTENT_KINDS, intentKindExists } from "@/server/governance/intent-kinds";
import { INTENT_SLOS } from "@/server/governance/slos";

describe("Market cost — base coûts marché × période (ADR-0094)", () => {
  it("parsePeriod gère année / trimestre / mois", () => {
    expect(parsePeriod("2026").start.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    const q2 = parsePeriod("2026-Q2");
    expect(q2.start.getUTCMonth()).toBe(3); // avril
    expect(q2.end.getUTCMonth()).toBe(5); // juin
    const m = parsePeriod("2026-06");
    expect(m.start.getUTCMonth()).toBe(5);
    expect(m.end.getUTCMonth()).toBe(5);
  });

  it("parsePeriod rejette une période invalide", () => {
    expect(() => parsePeriod("2026-13")).toThrow();
    expect(() => parsePeriod("juin")).toThrow();
    expect(() => parsePeriod("2026-Q9")).toThrow();
  });

  it("le seed baseline couvre 3 pays × 4 métriques × 2 trimestres", () => {
    expect(MARKET_COST_SEED.length).toBe(3 * 4 * 2);
    expect(MARKET_COST_SEED.every((r) => r.p50 > 0 && r.period.startsWith("2026"))).toBe(true);
  });

  it("UPSERT_MARKET_COST_SNAPSHOT est enregistré (THOT) + a un SLO", () => {
    expect(intentKindExists("UPSERT_MARKET_COST_SNAPSHOT")).toBe(true);
    expect(INTENT_KINDS.find((k) => k.kind === "UPSERT_MARKET_COST_SNAPSHOT")?.governor).toBe("THOT");
    expect(INTENT_SLOS.some((s) => s.kind === "UPSERT_MARKET_COST_SNAPSHOT")).toBe(true);
  });
});
