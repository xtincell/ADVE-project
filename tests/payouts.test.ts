import { describe, expect, it } from "vitest";
import {
  canTransitionPayout,
  computeMissionDays,
  computePayoutBreakdown,
  estimateGrossFromDailyRate,
  MAX_PAYOUT_GROSS,
  normalizeCommissionRate,
  PAYOUT_STATUSES,
  PAYOUT_TRANSITIONS,
  summarizePayouts,
  type PayoutMoneyLike,
  type PayoutStatus,
} from "@/domain/payout";
import {
  COMMISSION_FAMILY,
  COMMISSION_SCOPE_GLOBAL,
  declaredGrossSchema,
  GUILD_COMMISSION_KEY,
  payoutMethodSchema,
  payoutReferenceSchema,
} from "@/server/payouts";
import { isPlaceholderSource } from "@/server/market";

/**
 * WP-024 — tests PURS des commissions talents : jours facturés, arrondis de
 * la ventilation brut/commission/net, taux relu du référentiel (normalisation
 * — jamais appliqué hors [0, 1)), machine d'états PENDING → APPROVED → PAID,
 * agrégation par devise (XOF et XAF ne s'additionnent jamais) et schémas de
 * frontière. Zéro DB.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const T0 = new Date("2026-07-01T08:00:00Z");
const at = (offsetMs: number) => new Date(T0.getTime() + offsetMs);

describe("computeMissionDays — jours facturés (assignation → livraison)", () => {
  it("retourne null si une des dates manque (brut non dérivable, jamais inventé)", () => {
    expect(computeMissionDays(null, T0)).toBeNull();
    expect(computeMissionDays(T0, null)).toBeNull();
    expect(computeMissionDays(undefined, undefined)).toBeNull();
  });

  it("livrer le jour même = 1 jour (minimum facturable)", () => {
    expect(computeMissionDays(T0, T0)).toBe(1);
    expect(computeMissionDays(T0, at(3 * 60 * 60 * 1000))).toBe(1); // +3 h
  });

  it("un jour entamé est dû (plafond)", () => {
    expect(computeMissionDays(T0, at(DAY_MS))).toBe(1); // 24 h pile
    expect(computeMissionDays(T0, at(DAY_MS + 1))).toBe(2); // 24 h + 1 ms
    expect(computeMissionDays(T0, at(2.5 * DAY_MS))).toBe(3);
    expect(computeMissionDays(T0, at(3 * DAY_MS))).toBe(3);
  });

  it("horloge inversée (livraison antidatée) : plancher 1, jamais négatif", () => {
    expect(computeMissionDays(at(DAY_MS), T0)).toBe(1);
  });
});

describe("estimateGrossFromDailyRate — dailyRate × jours", () => {
  it("multiplie tarif déclaré × jours", () => {
    expect(estimateGrossFromDailyRate(75_000, 3)).toBe(225_000);
    expect(estimateGrossFromDailyRate(75_000, 1)).toBe(75_000);
  });

  it("null si le tarif ou les jours manquent / sont inutilisables", () => {
    expect(estimateGrossFromDailyRate(null, 3)).toBeNull(); // tarif non communiqué
    expect(estimateGrossFromDailyRate(75_000, null)).toBeNull(); // dates manquantes
    expect(estimateGrossFromDailyRate(0, 3)).toBeNull();
    expect(estimateGrossFromDailyRate(-100, 3)).toBeNull();
    expect(estimateGrossFromDailyRate(75_000.5, 3)).toBeNull();
    expect(estimateGrossFromDailyRate(75_000, 0)).toBeNull();
  });
});

describe("normalizeCommissionRate — taux relu du référentiel", () => {
  it("accepte une fraction de [0, 1)", () => {
    expect(normalizeCommissionRate(0.15)).toBe(0.15);
    expect(normalizeCommissionRate(0)).toBe(0); // commission nulle possible
    expect(normalizeCommissionRate(0.999)).toBe(0.999);
  });

  it("refuse tout ce qui n'est pas une fraction — « 15 » saisi au lieu de « 0.15 » est un trou, pas un taux", () => {
    expect(normalizeCommissionRate(15)).toBeNull();
    expect(normalizeCommissionRate(1)).toBeNull(); // 100 % : le talent ne toucherait rien
    expect(normalizeCommissionRate(-0.1)).toBeNull();
    expect(normalizeCommissionRate(Number.NaN)).toBeNull();
    expect(normalizeCommissionRate(Number.POSITIVE_INFINITY)).toBeNull();
    expect(normalizeCommissionRate(null)).toBeNull();
    expect(normalizeCommissionRate(undefined)).toBeNull();
  });
});

describe("computePayoutBreakdown — arrondis & invariant net + commission = brut", () => {
  it("ventile au taux seedé 0.15 (arrondi au plus proche)", () => {
    expect(computePayoutBreakdown(225_000, 0.15)).toEqual({
      amountGross: 225_000,
      commissionRate: 0.15,
      commissionAmount: 33_750,
      amountNet: 191_250,
    });
  });

  it("arrondit la commission au plus proche (demi vers le haut) et préserve le brut", () => {
    // 101 × 0.15 = 15.15 → 15 ; net 86
    expect(computePayoutBreakdown(101, 0.15)).toMatchObject({
      commissionAmount: 15,
      amountNet: 86,
    });
    // 90 × 0.15 = 13.5 → 14 (Math.round) ; net 76
    expect(computePayoutBreakdown(90, 0.15)).toMatchObject({
      commissionAmount: 14,
      amountNet: 76,
    });
    // 1 × 0.15 = 0.15 → 0 ; net 1 (les petits montants ne créent pas de net négatif)
    expect(computePayoutBreakdown(1, 0.15)).toMatchObject({ commissionAmount: 0, amountNet: 1 });
  });

  it("invariant : net + commission = brut, sur un balayage de montants et de taux", () => {
    const rates = [0, 0.08, 0.15, 0.2, 0.25, 0.4, 0.75, 0.999];
    const amounts = [1, 7, 90, 101, 999, 8_000, 59_000, 225_000, 1_144_000, MAX_PAYOUT_GROSS];
    for (const rate of rates) {
      for (const amount of amounts) {
        const breakdown = computePayoutBreakdown(amount, rate);
        expect(breakdown).not.toBeNull();
        expect(breakdown!.amountNet + breakdown!.commissionAmount).toBe(amount);
        expect(breakdown!.commissionAmount).toBeGreaterThanOrEqual(0);
        expect(breakdown!.amountNet).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("refuse les entrées inutilisables (jamais d'ordre faux)", () => {
    expect(computePayoutBreakdown(0, 0.15)).toBeNull();
    expect(computePayoutBreakdown(-100, 0.15)).toBeNull();
    expect(computePayoutBreakdown(100.5, 0.15)).toBeNull();
    expect(computePayoutBreakdown(MAX_PAYOUT_GROSS + 1, 0.15)).toBeNull(); // garde int32
    expect(computePayoutBreakdown(100, 1)).toBeNull();
    expect(computePayoutBreakdown(100, 15)).toBeNull();
    expect(computePayoutBreakdown(100, -0.1)).toBeNull();
  });
});

describe("machine d'états PENDING → APPROVED → PAID (REJECTED terminal)", () => {
  it("autorise exactement les transitions du circuit", () => {
    expect(canTransitionPayout("PENDING", "APPROVED")).toEqual({ ok: true });
    expect(canTransitionPayout("PENDING", "REJECTED")).toEqual({ ok: true });
    expect(canTransitionPayout("APPROVED", "PAID")).toEqual({ ok: true });
  });

  it("refuse sauts et retours, avec une raison FR affichable", () => {
    const refused = [
      ["PENDING", "PAID"], // pas de paiement sans approbation
      ["APPROVED", "PENDING"],
      ["APPROVED", "REJECTED"], // un ordre approuvé ne s'écarte plus
      ["PAID", "PENDING"],
      ["PAID", "APPROVED"],
      ["PAID", "REJECTED"],
      ["REJECTED", "APPROVED"],
      ["REJECTED", "PAID"],
    ] as const;
    for (const [from, to] of refused) {
      const gate = canTransitionPayout(from, to);
      expect(gate.ok).toBe(false);
      if (!gate.ok) expect(gate.reason).toMatch(/circuit d'un gain/);
    }
  });

  it("les états terminaux n'ont aucune sortie", () => {
    expect(PAYOUT_TRANSITIONS.PAID).toEqual([]);
    expect(PAYOUT_TRANSITIONS.REJECTED).toEqual([]);
    // Chaque statut du domaine est couvert par la table de transitions.
    expect(Object.keys(PAYOUT_TRANSITIONS).sort()).toEqual([...PAYOUT_STATUSES].sort());
  });
});

describe("summarizePayouts — agrégation PAR DEVISE (jamais additionnées)", () => {
  const row = (
    status: PayoutStatus,
    currency: string,
    gross: number,
    commission: number,
  ): PayoutMoneyLike => ({
    status,
    currency,
    amountGross: gross,
    commissionAmount: commission,
    amountNet: gross - commission,
  });

  it("vide → tout vide", () => {
    const summary = summarizePayouts([]);
    expect(summary.counts).toEqual({ PENDING: 0, APPROVED: 0, PAID: 0, REJECTED: 0 });
    expect(summary.generatedCommissionByCurrency).toEqual({});
    expect(summary.paidCommissionByCurrency).toEqual({});
    expect(summary.dueNetByCurrency).toEqual({});
    expect(summary.paidNetByCurrency).toEqual({});
  });

  it("XOF et XAF restent des lignes distinctes ; REJECTED sort des totaux ; PAID se sépare du dû", () => {
    const summary = summarizePayouts([
      row("PENDING", "XOF", 100_000, 15_000),
      row("APPROVED", "XOF", 200_000, 30_000),
      row("PAID", "XAF", 225_000, 33_750),
      row("REJECTED", "XOF", 999_999, 150_000), // écarté : dans les compteurs, hors totaux
    ]);
    expect(summary.counts).toEqual({ PENDING: 1, APPROVED: 1, PAID: 1, REJECTED: 1 });
    expect(summary.generatedCommissionByCurrency).toEqual({ XOF: 45_000, XAF: 33_750 });
    expect(summary.paidCommissionByCurrency).toEqual({ XAF: 33_750 });
    expect(summary.dueNetByCurrency).toEqual({ XOF: 255_000 }); // (100k−15k) + (200k−30k)
    expect(summary.paidNetByCurrency).toEqual({ XAF: 191_250 });
  });
});

describe("frontières (schémas Zod) & clés du référentiel", () => {
  it("montant déclaré : vide = null (estimation retenue), espaces tolérés, 9 chiffres max", () => {
    expect(declaredGrossSchema.parse("")).toBeNull();
    expect(declaredGrossSchema.parse("250000")).toBe(250_000);
    expect(declaredGrossSchema.parse("450 000")).toBe(450_000);
    expect(declaredGrossSchema.safeParse("0").success).toBe(false);
    expect(declaredGrossSchema.safeParse("-5").success).toBe(false);
    expect(declaredGrossSchema.safeParse("12,5").success).toBe(false);
    expect(declaredGrossSchema.safeParse("abc").success).toBe(false);
    expect(declaredGrossSchema.safeParse("1234567890").success).toBe(false); // 10 chiffres
  });

  it("rail de paiement : momo | manual uniquement", () => {
    expect(payoutMethodSchema.parse("momo")).toBe("momo");
    expect(payoutMethodSchema.parse("manual")).toBe("manual");
    expect(payoutMethodSchema.safeParse("stripe").success).toBe(false);
  });

  it("référence de transaction : obligatoire, bornée", () => {
    expect(payoutReferenceSchema.parse("  MP240701.1234  ")).toBe("MP240701.1234");
    expect(payoutReferenceSchema.safeParse("ab").success).toBe(false);
    expect(payoutReferenceSchema.safeParse("x".repeat(81)).success).toBe(false);
  });

  it("le taux vient du référentiel : clés stables + placeholder détecté (jamais de taux en dur)", () => {
    expect(COMMISSION_FAMILY).toBe("commission");
    expect(GUILD_COMMISSION_KEY).toBe("guild.rate");
    expect(COMMISSION_SCOPE_GLOBAL).toBe("GLOBAL");
    // La ligne seedée par prisma/seed.mjs est un placeholder à confirmer —
    // détectée par la même règle que le pricing (source contient "placeholder").
    expect(
      isPlaceholderSource(
        "placeholder-operator-to-confirm (legacy sans taux plat : commission-engine 25–40 % par tier talent, Hub-Escrow 20 %→8 % par palier — taux unique v7 à confirmer)",
      ),
    ).toBe(true);
  });
});
