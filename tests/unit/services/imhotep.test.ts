/**
 * Imhotep unit tests — Phase 7+ (ADR-0010).
 *
 * Tests les fonctions pures du module governance.ts (devotion-potential
 * weighting, manipulation fit detection, reranking) — sans DB.
 *
 * Les capabilities orchestrées (matchCreator/composeTeam/etc.) sont
 * couvertes par les tests d'intégration `imhotep-anubis-dispatch.test.ts`.
 */

import { describe, it, expect } from "vitest";
import {
  buildMatchReasons,
  getDevotionInSector,
  hasManipulationFit,
  weightDevotionPotential,
  rerankByDevotionPotential,
} from "@/server/services/imhotep/governance";
import { IMHOTEP_KINDS } from "@/server/services/imhotep/types";

describe("Imhotep governance — devotion-potential weighting (ADR-0010 §3)", () => {
  describe("getDevotionInSector", () => {
    it("returns 0 when driverSpecialties is null", () => {
      expect(getDevotionInSector(null, "Cosmetiques")).toBe(0);
      expect(getDevotionInSector(undefined, "Cosmetiques")).toBe(0);
      expect(getDevotionInSector({}, "Cosmetiques")).toBe(0);
    });

    it("returns 0 when devotionFootprint is missing", () => {
      expect(getDevotionInSector({ specialty: "creative-direction" }, "Cosmetiques")).toBe(0);
    });

    it("returns 0 when sector is not in footprint", () => {
      expect(
        getDevotionInSector({ devotionFootprint: { Cosmetiques: 500 } }, "Fintech"),
      ).toBe(0);
    });

    it("returns the footprint value when sector matches", () => {
      expect(
        getDevotionInSector({ devotionFootprint: { Cosmetiques: 1200, Fintech: 300 } }, "Cosmetiques"),
      ).toBe(1200);
    });

    it("handles non-object payloads safely", () => {
      expect(getDevotionInSector("invalid", "Cosmetiques")).toBe(0);
      expect(getDevotionInSector(42, "Cosmetiques")).toBe(0);
    });
  });

  describe("hasManipulationFit", () => {
    it("returns true when mode is in strengths", () => {
      expect(
        hasManipulationFit({ manipulationStrengths: ["facilitator", "entertainer"] }, "facilitator"),
      ).toBe(true);
    });

    it("returns false when mode is missing", () => {
      expect(
        hasManipulationFit({ manipulationStrengths: ["facilitator"] }, "peddler"),
      ).toBe(false);
    });

    it("returns false on null/empty", () => {
      expect(hasManipulationFit(null, "facilitator")).toBe(false);
      expect(hasManipulationFit({}, "facilitator")).toBe(false);
    });
  });

  describe("weightDevotionPotential", () => {
    it("preserves raw score when no devotion or fit", () => {
      expect(weightDevotionPotential(50, 0, false)).toBe(50);
    });

    it("adds manipulation bonus (+20) when fit", () => {
      expect(weightDevotionPotential(50, 0, true)).toBe(70);
    });

    it("adds devotion bonus (capped at 30)", () => {
      // log10(1+1)*12 ≈ 3.6 → bonus = 4
      expect(weightDevotionPotential(50, 1, false)).toBeGreaterThanOrEqual(53);
      // Big footprint → log10(10001)*12 ≈ 48 → capped at 30
      expect(weightDevotionPotential(50, 10_000, false)).toBe(80);
    });

    it("caps total at 100", () => {
      expect(weightDevotionPotential(95, 100_000, true)).toBe(100);
    });

    it("rounds the result", () => {
      const r = weightDevotionPotential(50, 50, false);
      expect(Number.isInteger(r)).toBe(true);
    });
  });

  describe("buildMatchReasons", () => {
    it("includes devotion footprint when > 0", () => {
      const reasons = buildMatchReasons([], 320, true, "facilitator");
      expect(reasons.some((r) => r.includes("devotion footprint sector=320"))).toBe(true);
    });

    it("includes manipulation strength when fit", () => {
      const reasons = buildMatchReasons([], 0, true, "entertainer");
      expect(reasons.some((r) => r.includes("manipulation strength: entertainer"))).toBe(true);
    });

    it("warns about manipulation gap", () => {
      const reasons = buildMatchReasons([], 0, false, "peddler");
      expect(reasons.some((r) => r.includes("⚠ manipulation gap: peddler"))).toBe(true);
    });

    it("preserves base reasons", () => {
      const reasons = buildMatchReasons(["base reason 1", "base reason 2"], 0, false, null);
      expect(reasons).toContain("base reason 1");
      expect(reasons).toContain("base reason 2");
    });
  });

  describe("rerankByDevotionPotential", () => {
    it("sorts candidates by matchScore desc", () => {
      const candidates = [
        { matchScore: 50, talentProfileId: "a", userId: "u1", displayName: "A", tier: "APPRENTI", devotionInSector: 0, manipulationFit: false, reasons: [] },
        { matchScore: 80, talentProfileId: "b", userId: "u2", displayName: "B", tier: "MAITRE", devotionInSector: 0, manipulationFit: false, reasons: [] },
        { matchScore: 65, talentProfileId: "c", userId: "u3", displayName: "C", tier: "COMPAGNON", devotionInSector: 0, manipulationFit: false, reasons: [] },
      ];
      const result = rerankByDevotionPotential(candidates);
      expect(result.map((c) => c.matchScore)).toEqual([80, 65, 50]);
    });

    it("does not mutate the input array", () => {
      const candidates = [
        { matchScore: 50, talentProfileId: "a", userId: "u1", displayName: "A", tier: "APPRENTI", devotionInSector: 0, manipulationFit: false, reasons: [] },
        { matchScore: 80, talentProfileId: "b", userId: "u2", displayName: "B", tier: "MAITRE", devotionInSector: 0, manipulationFit: false, reasons: [] },
      ];
      rerankByDevotionPotential(candidates);
      expect(candidates[0]?.matchScore).toBe(50); // input unchanged
    });
  });

  describe("IMHOTEP_KINDS const", () => {
    it("exposes exactly 5 intent kinds", () => {
      expect(IMHOTEP_KINDS).toHaveLength(5);
    });

    it("kinds are unique", () => {
      expect(new Set(IMHOTEP_KINDS).size).toBe(IMHOTEP_KINDS.length);
    });
  });
});
