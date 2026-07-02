import { describe, expect, it } from "vitest";
import {
  aggregatePaymentsByMonth,
  computeSimpleMrr,
  groupByMissionStatus,
  monthKey,
  monthlyAmountOver30Days,
  totalEstimatedByCurrency,
} from "@/server/agency";
import { MISSION_STATUSES } from "@/domain/campaign";

/**
 * Cœur PUR de la profondeur espace agence (WP-018) — agrégation mensuelle des
 * paiements, MRR simple normalisé 30 j, totaux d'actions par devise, groupage
 * missions. Zéro DB : mêmes garanties de pureté que agency-fleet.test.ts.
 * Doctrine transverse vérifiée partout : deux devises ne s'additionnent
 * JAMAIS entre elles, et un montant non dérivable ne devient jamais un chiffre.
 */

describe("monthKey — clé de mois UTC, indépendante du fuseau du serveur", () => {
  it("prend le mois UTC (pas le mois local)", () => {
    expect(monthKey(new Date("2026-01-31T23:30:00.000Z"))).toBe("2026-01");
    expect(monthKey(new Date("2026-02-01T00:00:00.000Z"))).toBe("2026-02");
  });

  it("padde le mois sur deux chiffres", () => {
    expect(monthKey(new Date("2026-09-15T12:00:00.000Z"))).toBe("2026-09");
    expect(monthKey(new Date("2026-10-01T00:00:00.000Z"))).toBe("2026-10");
  });

  it("frontière d'année : le 31 décembre reste en décembre", () => {
    expect(monthKey(new Date("2025-12-31T23:59:59.999Z"))).toBe("2025-12");
  });
});

describe("aggregatePaymentsByMonth — totaux mensuels PAR DEVISE, ventilés par workspace", () => {
  const at = (iso: string) => new Date(iso);

  it("aucun paiement → [] (pas de mois vides inventés)", () => {
    expect(aggregatePaymentsByMonth([])).toEqual([]);
  });

  it("deux devises le même mois restent deux totaux distincts", () => {
    const rows = aggregatePaymentsByMonth([
      { workspaceId: "w1", amount: 8000, currency: "XOF", createdAt: at("2026-07-01T10:00:00Z") },
      { workspaceId: "w1", amount: 100, currency: "EUR", createdAt: at("2026-07-02T10:00:00Z") },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.month).toBe("2026-07");
    expect(rows[0]!.count).toBe(2);
    expect(rows[0]!.totals).toEqual({ XOF: 8000, EUR: 100 });
  });

  it("XOF et XAF (à parité) ne se mélangent pas non plus", () => {
    const rows = aggregatePaymentsByMonth([
      { workspaceId: "w1", amount: 5000, currency: "XOF", createdAt: at("2026-07-01T00:00:00Z") },
      { workspaceId: "w2", amount: 5000, currency: "XAF", createdAt: at("2026-07-01T00:00:00Z") },
    ]);
    expect(rows[0]!.totals).toEqual({ XOF: 5000, XAF: 5000 });
  });

  it("mois les plus récents d'abord", () => {
    const rows = aggregatePaymentsByMonth([
      { workspaceId: "w1", amount: 1, currency: "XOF", createdAt: at("2026-05-10T00:00:00Z") },
      { workspaceId: "w1", amount: 2, currency: "XOF", createdAt: at("2026-07-10T00:00:00Z") },
      { workspaceId: "w1", amount: 3, currency: "XOF", createdAt: at("2026-06-10T00:00:00Z") },
    ]);
    expect(rows.map((r) => r.month)).toEqual(["2026-07", "2026-06", "2026-05"]);
  });

  it("ventile par workspace (ordre stable par id) avec comptes et totaux propres", () => {
    const rows = aggregatePaymentsByMonth([
      { workspaceId: "w2", amount: 3000, currency: "XOF", createdAt: at("2026-07-05T00:00:00Z") },
      { workspaceId: "w1", amount: 8000, currency: "XOF", createdAt: at("2026-07-01T00:00:00Z") },
      { workspaceId: "w1", amount: 2000, currency: "XOF", createdAt: at("2026-07-20T00:00:00Z") },
    ]);
    expect(rows[0]!.byWorkspace).toEqual([
      { workspaceId: "w1", count: 2, totals: { XOF: 10000 } },
      { workspaceId: "w2", count: 1, totals: { XOF: 3000 } },
    ]);
  });
});

describe("monthlyAmountOver30Days — normalisation 30 j (arrondi entier)", () => {
  it("une période de 30 j rend le montant tel quel", () => {
    expect(monthlyAmountOver30Days(8000, 30)).toBe(8000);
  });

  it("un trimestre (92 j) est ramené à son équivalent 30 j", () => {
    expect(monthlyAmountOver30Days(92000, 92)).toBe(30000);
  });

  it("arrondit à l'entier (unités mineures)", () => {
    expect(monthlyAmountOver30Days(100, 92)).toBe(33); // 32.6086… → 33
  });
});

describe("computeSimpleMrr — Σ paiements réels des abonnements actifs, jamais de projection", () => {
  it("vide → tout vide", () => {
    expect(computeSimpleMrr([])).toEqual({ byCurrency: {}, contributions: [], unresolved: [] });
  });

  it("plan hors catalogue → unresolved avec sa raison, aucun chiffre", () => {
    const mrr = computeSimpleMrr([
      {
        workspaceId: "w1",
        workspaceName: "Client A",
        plan: "legacy-gold",
        payment: { amount: 9999, currency: "XOF" },
      },
    ]);
    expect(mrr.byCurrency).toEqual({});
    expect(mrr.contributions).toEqual([]);
    expect(mrr.unresolved).toHaveLength(1);
    expect(mrr.unresolved[0]!.plan).toBe("legacy-gold");
    expect(mrr.unresolved[0]!.reason).toContain("hors catalogue");
  });

  it("paiement d'activation introuvable → unresolved, jamais un montant estimé", () => {
    const mrr = computeSimpleMrr([
      { workspaceId: "w1", workspaceName: "Client A", plan: "cockpit", payment: null },
    ]);
    expect(mrr.byCurrency).toEqual({});
    expect(mrr.unresolved[0]!.reason).toContain("introuvable");
  });

  it("cockpit (30 j) : le montant payé EST le mensuel", () => {
    const mrr = computeSimpleMrr([
      {
        workspaceId: "w1",
        workspaceName: "Client A",
        plan: "cockpit",
        payment: { amount: 8000, currency: "XOF" },
      },
    ]);
    expect(mrr.contributions[0]!).toMatchObject({
      plan: "cockpit",
      amount: 8000,
      monthly: 8000,
      currency: "XOF",
    });
    expect(mrr.byCurrency).toEqual({ XOF: 8000 });
  });

  it("retainer (92 j) : normalisé 30 j, et les devises restent séparées", () => {
    const mrr = computeSimpleMrr([
      {
        workspaceId: "w1",
        workspaceName: "Client A",
        plan: "retainer",
        payment: { amount: 92000, currency: "XOF" },
      },
      {
        workspaceId: "w2",
        workspaceName: "Client B",
        plan: "cockpit",
        payment: { amount: 8000, currency: "XAF" },
      },
      {
        workspaceId: "w3",
        workspaceName: "Client C",
        plan: "cockpit",
        payment: { amount: 8000, currency: "XAF" },
      },
    ]);
    expect(mrr.byCurrency).toEqual({ XOF: 30000, XAF: 16000 });
    expect(mrr.unresolved).toEqual([]);
  });
});

describe("totalEstimatedByCurrency — budget flotte par devise + « à estimer » compté", () => {
  it("vide → aucun total, rien à estimer", () => {
    expect(totalEstimatedByCurrency([])).toEqual({ byCurrency: {}, unestimated: 0 });
  });

  it("somme par devise, ignore les actions annulées", () => {
    const totals = totalEstimatedByCurrency([
      { status: "PLANNED", estimatedCost: 10000, costCurrency: "XOF" },
      { status: "BRIEFED", estimatedCost: 5000, costCurrency: "XAF" },
      { status: "CANCELLED", estimatedCost: 99999, costCurrency: "XOF" },
    ]);
    expect(totals).toEqual({ byCurrency: { XOF: 10000, XAF: 5000 }, unestimated: 0 });
  });

  it("coût null OU devise nulle → « à estimer », jamais un montant sans devise", () => {
    const totals = totalEstimatedByCurrency([
      { status: "PLANNED", estimatedCost: null, costCurrency: null },
      { status: "PLANNED", estimatedCost: 4000, costCurrency: null }, // inutilisable
      { status: "PLANNED", estimatedCost: 3000, costCurrency: "XOF" },
    ]);
    expect(totals).toEqual({ byCurrency: { XOF: 3000 }, unestimated: 2 });
  });
});

describe("groupByMissionStatus — ordre canon du circuit, groupes vides présents", () => {
  it("rend TOUTES les étapes dans l'ordre canon, même vides", () => {
    const groups = groupByMissionStatus([]);
    expect(groups.map((g) => g.status)).toEqual([...MISSION_STATUSES]);
    expect(groups.every((g) => g.rows.length === 0)).toBe(true);
  });

  it("répartit par étape en préservant l'ordre d'entrée dans chaque groupe", () => {
    const rows = [
      { id: "m1", status: "OPEN" },
      { id: "m2", status: "VALIDATED" },
      { id: "m3", status: "OPEN" },
      { id: "m4", status: "DELIVERED" },
    ];
    const groups = groupByMissionStatus(rows);
    expect(groups[0]).toEqual({ status: "OPEN", rows: [rows[0], rows[2]] });
    expect(groups[1]).toEqual({ status: "ASSIGNED", rows: [] });
    expect(groups[2]).toEqual({ status: "DELIVERED", rows: [rows[3]] });
    expect(groups[3]).toEqual({ status: "VALIDATED", rows: [rows[1]] });
  });
});
