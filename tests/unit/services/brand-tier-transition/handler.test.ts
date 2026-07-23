/**
 * brand-tier-transition/handler.test.ts (ADR-0167) — le handler PERSISTE
 * apogeeTier (dents de la Loi 1), contrairement au STUB PROMOTE_SEQUENCE.
 *
 * Round-12 : l'écriture est un `updateMany` conditionné à la valeur d'apogeeTier
 * LUE (verrou optimiste anti-course) — le test assure sur `updateMany`, count 1.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const findUnique = vi.fn();
const updateMany = vi.fn();
vi.mock("@/lib/db", () => ({
  db: { strategy: { findUnique: (...a: unknown[]) => findUnique(...a), updateMany: (...a: unknown[]) => updateMany(...a) } },
}));

import { applyBrandTierTransition } from "@/server/services/brand-tier-transition/handler";

beforeEach(() => {
  findUnique.mockReset();
  updateMany.mockReset();
  updateMany.mockResolvedValue({ count: 1 });
});

describe("applyBrandTierTransition", () => {
  it("promotion : palier de départ OK => persiste apogeeTier + OK", async () => {
    findUnique.mockResolvedValue({ apogeeTier: null, advertis_vector: { composite: 100 } });
    const r = await applyBrandTierTransition({
      kind: "PROMOTE_ORDINAIRE_TO_FORTE",
      strategyId: "s1",
      operatorId: "op1",
      reason: "Score et preuves au rendez-vous.",
    });
    expect(r.status).toBe("OK");
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        // verrou optimiste : where inclut la valeur apogeeTier LUE (null ici).
        where: { id: "s1", apogeeTier: null },
        data: expect.objectContaining({ apogeeTier: "FORTE", apogeeTierReason: "Score et preuves au rendez-vous.", apogeeTierBy: "op1" }),
      }),
    );
    expect(r.output).toMatchObject({ from: "ORDINAIRE", to: "FORTE", direction: "PROMOTE" });
  });

  it("ratchet : apogeeTier officiel prime sur le composite pour le fromTier", async () => {
    findUnique.mockResolvedValue({ apogeeTier: "FORTE", advertis_vector: { composite: 90 } });
    const r = await applyBrandTierTransition({
      kind: "PROMOTE_FORTE_TO_CULTE",
      strategyId: "s1",
      operatorId: "op1",
      reason: "Masse culturelle prouvée.",
    });
    expect(r.status).toBe("OK");
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "s1", apogeeTier: "FORTE" }, data: expect.objectContaining({ apogeeTier: "CULTE" }) }),
    );
  });

  it("fromTier mismatch => VETOED, aucune écriture", async () => {
    findUnique.mockResolvedValue({ apogeeTier: null, advertis_vector: { composite: 30 } }); // LATENT
    const r = await applyBrandTierTransition({
      kind: "PROMOTE_ORDINAIRE_TO_FORTE",
      strategyId: "s1",
      operatorId: "op1",
      reason: "x".repeat(10),
    });
    expect(r.status).toBe("VETOED");
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("course concurrente (count 0) => VETOED FROM_TIER_MISMATCH", async () => {
    findUnique.mockResolvedValue({ apogeeTier: "FORTE", advertis_vector: { composite: 90 } });
    updateMany.mockResolvedValue({ count: 0 }); // un writer concurrent a bougé apogeeTier
    const r = await applyBrandTierTransition({
      kind: "PROMOTE_FORTE_TO_CULTE",
      strategyId: "s1",
      operatorId: "op1",
      reason: "Masse culturelle prouvée.",
    });
    expect(r.status).toBe("VETOED");
    expect(r.reason).toBe("FROM_TIER_MISMATCH");
  });

  it("démotion : abaisse apogeeTier (Loi 1, acte explicite)", async () => {
    findUnique.mockResolvedValue({ apogeeTier: "FORTE", advertis_vector: { composite: 150 } });
    const r = await applyBrandTierTransition({
      kind: "DEMOTE_FORTE_TO_ORDINAIRE",
      strategyId: "s1",
      operatorId: "op1",
      reason: "Régression constatée, détrônement explicite.",
    });
    expect(r.status).toBe("OK");
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ apogeeTier: "ORDINAIRE" }) }));
  });

  it("stratégie introuvable => FAILED", async () => {
    findUnique.mockResolvedValue(null);
    const r = await applyBrandTierTransition({ kind: "PROMOTE_ORDINAIRE_TO_FORTE", strategyId: "nope", operatorId: "op1", reason: "x".repeat(10) });
    expect(r.status).toBe("FAILED");
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("kind inconnu => FAILED", async () => {
    findUnique.mockResolvedValue({ apogeeTier: null, advertis_vector: { composite: 100 } });
    const r = await applyBrandTierTransition({ kind: "PROMOTE_BOGUS", strategyId: "s1", operatorId: "op1", reason: "x".repeat(10) });
    expect(r.status).toBe("FAILED");
  });
});
