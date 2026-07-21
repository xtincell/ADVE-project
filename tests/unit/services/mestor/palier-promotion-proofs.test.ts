/**
 * PALIER_PROMOTION_PROOFS — cœur pur du gate de transition de palier (ADR-0167).
 * Aucune DB : on teste `evaluatePalierTransition` (variance 0). Bandes /200 :
 * LATENT≤40, FRAGILE≤80, ORDINAIRE≤120, FORTE≤160, CULTE≤180, ICONE>180.
 */
import { describe, it, expect } from "vitest";
import {
  evaluatePalierTransition,
  KIND_TRANSITIONS,
  PALIER_TRANSITION_KINDS,
  tierTransitionKind,
  type PalierEvalInput,
} from "@/server/services/mestor/gates/palier-promotion-proofs";

const base: Omit<PalierEvalInput, "kind" | "currentEffectiveTier" | "composite"> = {
  superfanCount: 0,
  evidence: 0,
  superfansTarget: 1000,
  marketScaleDeclared: true,
};

describe("KIND_TRANSITIONS — les 10 kinds dérivés de la cascade", () => {
  it("couvre exactement 10 kinds (5 PROMOTE + 5 DEMOTE)", () => {
    expect(PALIER_TRANSITION_KINDS.size).toBe(10);
    expect(KIND_TRANSITIONS["PROMOTE_ORDINAIRE_TO_FORTE"]).toEqual({ direction: "PROMOTE", fromTier: "ORDINAIRE", toTier: "FORTE" });
    expect(KIND_TRANSITIONS["DEMOTE_ICONE_TO_CULTE"]).toEqual({ direction: "DEMOTE", fromTier: "ICONE", toTier: "CULTE" });
  });

  it("tierTransitionKind résout depuis (palier, direction)", () => {
    expect(tierTransitionKind("ORDINAIRE", "PROMOTE")).toBe("PROMOTE_ORDINAIRE_TO_FORTE");
    expect(tierTransitionKind("FORTE", "DEMOTE")).toBe("DEMOTE_FORTE_TO_ORDINAIRE");
    expect(tierTransitionKind("ICONE", "PROMOTE")).toBeNull(); // apex
    expect(tierTransitionKind("LATENT", "DEMOTE")).toBeNull(); // plancher
  });
});

describe("evaluatePalierTransition — cœur pur du gate", () => {
  it("kind hors périmètre => PASS (ne bloque rien)", () => {
    expect(evaluatePalierTransition({ ...base, kind: "FILL_ADVE", currentEffectiveTier: "FORTE", composite: 50 }).verdict).toBe("PASS");
  });

  it("PROMOTE mérité : composite > borne => PASS", () => {
    const r = evaluatePalierTransition({ ...base, kind: "PROMOTE_ORDINAIRE_TO_FORTE", currentEffectiveTier: "ORDINAIRE", composite: 130 });
    expect(r.verdict).toBe("PASS");
  });

  it("PROMOTE non mérité : composite <= borne => BLOCK chiffré", () => {
    const r = evaluatePalierTransition({ ...base, kind: "PROMOTE_ORDINAIRE_TO_FORTE", currentEffectiveTier: "ORDINAIRE", composite: 118 });
    expect(r.verdict).toBe("BLOCK");
    expect(r.reason).toContain("118");
    expect(r.reason).toContain("120"); // borne FORTE
  });

  it("PROMOTE pile sur la borne => BLOCK (strictement supérieur exigé)", () => {
    const r = evaluatePalierTransition({ ...base, kind: "PROMOTE_ORDINAIRE_TO_FORTE", currentEffectiveTier: "ORDINAIRE", composite: 120 });
    expect(r.verdict).toBe("BLOCK");
  });

  it("fromTier mismatch => BLOCK", () => {
    const r = evaluatePalierTransition({ ...base, kind: "PROMOTE_ORDINAIRE_TO_FORTE", currentEffectiveTier: "FRAGILE", composite: 130 });
    expect(r.verdict).toBe("BLOCK");
    expect(r.reason).toContain("FRAGILE");
  });

  it("expectedFromTier périmé => BLOCK (concurrence optimiste)", () => {
    const r = evaluatePalierTransition({ ...base, kind: "PROMOTE_ORDINAIRE_TO_FORTE", currentEffectiveTier: "FORTE", composite: 170, expectedFromTier: "ORDINAIRE" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.reason).toContain("changé");
  });

  it("PROMOTE apex CULTE : composite plafonné (0 superfan) => BLOCK avec breakdown superfans", () => {
    // FORTE→CULTE : borne 160. Sans preuve le composite est capé à 160 (evidence
    // ceiling), donc <= 160 => refus, avec le détail superfans dans la raison.
    const r = evaluatePalierTransition({ ...base, kind: "PROMOTE_FORTE_TO_CULTE", currentEffectiveTier: "FORTE", composite: 160, superfanCount: 0, evidence: 0.05, superfansTarget: 1000 });
    expect(r.verdict).toBe("BLOCK");
    expect(r.reason).toContain("superfans 0/1000");
    expect(r.reason).toContain("160");
  });

  it("PROMOTE apex sans échelle déclarée : la raison invite à déclarer l'échelle", () => {
    const r = evaluatePalierTransition({ ...base, kind: "PROMOTE_FORTE_TO_CULTE", currentEffectiveTier: "FORTE", composite: 160, marketScaleDeclared: false });
    expect(r.verdict).toBe("BLOCK");
    expect(r.reason).toContain("échelle");
  });

  it("PROMOTE apex ICONE mérité : composite > 180 => PASS", () => {
    const r = evaluatePalierTransition({ ...base, kind: "PROMOTE_CULTE_TO_ICONE", currentEffectiveTier: "CULTE", composite: 185, superfanCount: 800, evidence: 0.6, superfansTarget: 1000 });
    expect(r.verdict).toBe("PASS");
  });

  it("DEMOTE : structural seul => PASS (Loi 1, aucune preuve de score exigée)", () => {
    const r = evaluatePalierTransition({ ...base, kind: "DEMOTE_FORTE_TO_ORDINAIRE", currentEffectiveTier: "FORTE", composite: 30 });
    expect(r.verdict).toBe("PASS");
    expect(r.reason).toContain("Loi 1");
  });

  it("DEMOTE fromTier mismatch => BLOCK", () => {
    const r = evaluatePalierTransition({ ...base, kind: "DEMOTE_FORTE_TO_ORDINAIRE", currentEffectiveTier: "CULTE", composite: 170 });
    expect(r.verdict).toBe("BLOCK");
  });
});
