/**
 * brand-tier-transition/handler.test.ts (ADR-0167) — le handler PERSISTE
 * apogeeTier (dents de la Loi 1), contrairement au STUB PROMOTE_SEQUENCE.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const findUnique = vi.fn();
const update = vi.fn();
vi.mock("@/lib/db", () => ({
  db: { strategy: { findUnique: (...a: unknown[]) => findUnique(...a), update: (...a: unknown[]) => update(...a) } },
}));

import { applyBrandTierTransition } from "@/server/services/brand-tier-transition/handler";

beforeEach(() => {
  findUnique.mockReset();
  update.mockReset();
  update.mockResolvedValue({});
});

describe("applyBrandTierTransition", () => {
  it("promotion : palier de départ OK => persiste apogeeTier + OK", async () => {
    // apogeeTier null, composite 130 => effectiveTier FORTE... non : 130 = FORTE.
    // On promeut ORDINAIRE→FORTE : composite 130 implique FORTE, mais le palier
    // EFFECTIF de départ est calculé sur apogeeTier=null => classifyTier(130)=FORTE.
    // Pour partir d'ORDINAIRE il faut composite en bande ORDINAIRE (100).
    findUnique.mockResolvedValue({ apogeeTier: null, advertis_vector: { composite: 100 } });
    const r = await applyBrandTierTransition({
      kind: "PROMOTE_ORDINAIRE_TO_FORTE",
      strategyId: "s1",
      operatorId: "op1",
      reason: "Score et preuves au rendez-vous.",
    });
    expect(r.status).toBe("OK");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "s1" },
        data: expect.objectContaining({ apogeeTier: "FORTE", apogeeTierReason: "Score et preuves au rendez-vous.", apogeeTierBy: "op1" }),
      }),
    );
    expect(r.output).toMatchObject({ from: "ORDINAIRE", to: "FORTE", direction: "PROMOTE" });
  });

  it("ratchet : apogeeTier officiel prime sur le composite pour le fromTier", async () => {
    // officiel FORTE, composite tombé à 90 (implique ORDINAIRE). Promotion
    // FORTE→CULTE part bien de FORTE (l'officiel), pas d'ORDINAIRE (l'impliqué).
    findUnique.mockResolvedValue({ apogeeTier: "FORTE", advertis_vector: { composite: 90 } });
    const r = await applyBrandTierTransition({
      kind: "PROMOTE_FORTE_TO_CULTE",
      strategyId: "s1",
      operatorId: "op1",
      reason: "Masse culturelle prouvée.",
    });
    expect(r.status).toBe("OK");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ apogeeTier: "CULTE" }) }));
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
    expect(update).not.toHaveBeenCalled();
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
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ apogeeTier: "ORDINAIRE" }) }));
  });

  it("stratégie introuvable => FAILED", async () => {
    findUnique.mockResolvedValue(null);
    const r = await applyBrandTierTransition({ kind: "PROMOTE_ORDINAIRE_TO_FORTE", strategyId: "nope", operatorId: "op1", reason: "x".repeat(10) });
    expect(r.status).toBe("FAILED");
    expect(update).not.toHaveBeenCalled();
  });

  it("kind inconnu => FAILED", async () => {
    findUnique.mockResolvedValue({ apogeeTier: null, advertis_vector: { composite: 100 } });
    const r = await applyBrandTierTransition({ kind: "PROMOTE_BOGUS", strategyId: "s1", operatorId: "op1", reason: "x".repeat(10) });
    expect(r.status).toBe("FAILED");
  });
});
