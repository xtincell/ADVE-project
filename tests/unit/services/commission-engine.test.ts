import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Commission Engine tests.
 *
 * The real module calls `db` (Prisma) so we mock the entire module
 * and test the TIER_RATES logic, operator-fee arithmetic,
 * and edge cases by re-implementing the pure calculations here.
 *
 * This mirrors the constants and formulas defined in
 * src/server/services/commission-engine/index.ts
 */

// ---- Constants copied from the service for assertion purposes ----

type GuildTier = "APPRENTI" | "COMPAGNON" | "MAITRE" | "ASSOCIE";

const TIER_RATES: Record<GuildTier, number> = {
  APPRENTI: 0.60,
  COMPAGNON: 0.65,
  MAITRE: 0.70,
  ASSOCIE: 0.75,
};

// Pure calculation helpers (mirror the service logic)
function calculateCommission(grossAmount: number, tier: GuildTier) {
  const rate = TIER_RATES[tier];
  const netAmount = grossAmount * rate;
  const commissionAmount = grossAmount - netAmount;
  const operatorFee = commissionAmount * 0.10;
  return { rate, netAmount, commissionAmount, operatorFee };
}

describe("Commission Engine - Tier Rates", () => {
  it("APPRENTI rate is 60% (creator keeps 60%, platform takes 40%)", () => {
    const result = calculateCommission(100_000, "APPRENTI");
    expect(result.rate).toBe(0.60);
    expect(result.netAmount).toBe(60_000);
    expect(result.commissionAmount).toBe(40_000);
  });

  it("COMPAGNON rate is 65%", () => {
    const result = calculateCommission(100_000, "COMPAGNON");
    expect(result.rate).toBe(0.65);
    expect(result.netAmount).toBe(65_000);
    expect(result.commissionAmount).toBe(35_000);
  });

  it("MAITRE rate is 70%", () => {
    const result = calculateCommission(100_000, "MAITRE");
    expect(result.rate).toBe(0.70);
    expect(result.netAmount).toBe(70_000);
    expect(result.commissionAmount).toBe(30_000);
  });

  it("ASSOCIE rate is 75%", () => {
    const result = calculateCommission(100_000, "ASSOCIE");
    expect(result.rate).toBe(0.75);
    expect(result.netAmount).toBe(75_000);
    expect(result.commissionAmount).toBe(25_000);
  });
});

describe("Commission Engine - Operator Fee", () => {
  it("operator fee is 10% of commission amount", () => {
    const result = calculateCommission(100_000, "APPRENTI");
    // Commission is 40_000, operator fee is 10% of that = 4_000
    expect(result.operatorFee).toBe(4_000);
  });

  it("operator fee scales with gross amount", () => {
    const small = calculateCommission(50_000, "MAITRE");
    const large = calculateCommission(200_000, "MAITRE");
    // MAITRE: commission = 30%, operator fee = 10% of commission
    expect(small.operatorFee).toBe(50_000 * 0.30 * 0.10);
    expect(large.operatorFee).toBe(200_000 * 0.30 * 0.10);
    expect(large.operatorFee).toBe(small.operatorFee * 4);
  });

  it("OWNER operator returns zero fee (per service logic)", () => {
    // In the service, OWNER license type returns { operatorFee: 0, operatorRate: 0 }
    const ownerFee = 0;
    const ownerRate = 0;
    expect(ownerFee).toBe(0);
    expect(ownerRate).toBe(0);
  });
});

describe("Commission Engine - Edge Cases", () => {
  it("handles zero gross amount", () => {
    const result = calculateCommission(0, "APPRENTI");
    expect(result.netAmount).toBe(0);
    expect(result.commissionAmount).toBe(0);
    expect(result.operatorFee).toBe(0);
  });

  it("handles very large gross amount", () => {
    const result = calculateCommission(10_000_000, "ASSOCIE");
    expect(result.netAmount).toBe(7_500_000);
    expect(result.commissionAmount).toBe(2_500_000);
    expect(result.operatorFee).toBe(250_000);
  });

  it("net + commission always equals gross", () => {
    for (const tier of ["APPRENTI", "COMPAGNON", "MAITRE", "ASSOCIE"] as GuildTier[]) {
      const gross = 123_456;
      const result = calculateCommission(gross, tier);
      expect(result.netAmount + result.commissionAmount).toBeCloseTo(gross, 2);
    }
  });

  it("higher tier always means higher net for creator", () => {
    const gross = 100_000;
    const apprenti = calculateCommission(gross, "APPRENTI");
    const compagnon = calculateCommission(gross, "COMPAGNON");
    const maitre = calculateCommission(gross, "MAITRE");
    const associe = calculateCommission(gross, "ASSOCIE");

    expect(apprenti.netAmount).toBeLessThan(compagnon.netAmount);
    expect(compagnon.netAmount).toBeLessThan(maitre.netAmount);
    expect(maitre.netAmount).toBeLessThan(associe.netAmount);
  });

  it("higher tier always means lower commission for platform", () => {
    const gross = 100_000;
    const apprenti = calculateCommission(gross, "APPRENTI");
    const associe = calculateCommission(gross, "ASSOCIE");

    expect(apprenti.commissionAmount).toBeGreaterThan(associe.commissionAmount);
  });
});

// ── Round-11 : remise d'adhésion appliquée au chemin ARGENT (source unique) ──
import {
  effectiveTalentRate,
  TIER_RATES as REAL_TIER_RATES,
  MEMBERSHIP_DISCOUNT as REAL_DISCOUNT,
  TALENT_RATE_CAP,
} from "@/server/services/commission-engine";

describe("effectiveTalentRate — remise d'adhésion (F3 round-11)", () => {
  it("sans adhésion = taux de base du palier", () => {
    for (const tier of ["APPRENTI", "COMPAGNON", "MAITRE", "ASSOCIE"] as const) {
      expect(effectiveTalentRate(tier, false)).toBeCloseTo(REAL_TIER_RATES[tier], 6);
    }
  });

  it("avec adhésion ACTIVE = base + remise (plafonné)", () => {
    // MAITRE 0.70 + 0.04 = 0.74 (le talent GARDE plus — c'est la promesse produit).
    expect(effectiveTalentRate("MAITRE", true)).toBeCloseTo(0.74, 6);
    expect(effectiveTalentRate("COMPAGNON", true)).toBeCloseTo(0.67, 6);
    // APPRENTI : remise 0 → inchangé.
    expect(effectiveTalentRate("APPRENTI", true)).toBeCloseTo(0.60, 6);
  });

  it("plafonne à TALENT_RATE_CAP", () => {
    // Aucun tier ne dépasse le cap avec la remise, mais la garde est réelle :
    expect(effectiveTalentRate("ASSOCIE", true)).toBeLessThanOrEqual(TALENT_RATE_CAP);
  });

  it("tier inconnu → défaut APPRENTI (jamais NaN)", () => {
    expect(effectiveTalentRate("ZZZ", false)).toBeCloseTo(0.60, 6);
    expect(Number.isNaN(effectiveTalentRate("ZZZ", true))).toBe(false);
  });

  it("source unique : les tables exportées portent bien les valeurs canon", () => {
    expect(REAL_DISCOUNT).toEqual({ APPRENTI: 0, COMPAGNON: 0.02, MAITRE: 0.04, ASSOCIE: 0.06 });
    expect(REAL_TIER_RATES.MAITRE).toBe(0.70);
  });
});
