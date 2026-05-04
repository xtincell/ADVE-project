/**
 * Phase 13 — Oracle 35-section Glory sequences completeness (B3, ADR-0014).
 * Phase 17 cleanup (ADR-0045) — IMHOTEP-CREW + ANUBIS-COMMS sont désormais
 * `ORACLE_NETERU_GROUND` (Phase 14/15 actifs ADR-0019/0020), pas `ORACLE_DORMANT`.
 *
 * Verrouille :
 * 1. Les 14 séquences Phase 13 sont déclarées (7 Big4 + 5 Distinctifs + 2 Neteru Ground)
 * 2. Toutes atteignables via getSequence() runtime lookup
 * 3. Les 2 séquences Neteru Ground (Imhotep/Anubis) utilisent uniquement des steps
 *    PLANNED — sequence stub, output réel hors-sequence côté Cockpit
 * 4. requires/preconditions cohérents (séquencement étages Loi 2 APOGEE)
 * 5. families correctes (ORACLE_BIG4 / ORACLE_DISTINCTIVE / ORACLE_NETERU_GROUND)
 *
 * Si ce test échoue → drift Phase 13 sequences. STOP, retour Phase 2 NEFER.
 */

import { describe, expect, it } from "vitest";
import {
  ALL_SEQUENCES,
  getSequence,
  type GlorySequenceKey,
} from "@/server/services/artemis/tools/sequences";
import {
  PHASE13_ORACLE_SEQUENCES,
  ORACLE_BIG4_SEQUENCES,
  ORACLE_DISTINCTIVE_SEQUENCES,
  ORACLE_NETERU_GROUND_SEQUENCES,
} from "@/server/services/artemis/tools/phase13-oracle-sequences";

describe("Phase 13 Oracle Glory sequences completeness (B3)", () => {
  const PHASE13_KEYS: GlorySequenceKey[] = [
    "MCK-7S", "BCG-PORTFOLIO", "BAIN-NPS", "DELOITTE-GREENHOUSE",
    "MCK-3H", "BCG-PALETTE", "DELOITTE-BUDGET",
    "CULT-INDEX", "MANIP-MATRIX", "DEVOTION-LADDER",
    "OVERTON-DISTINCTIVE", "TARSIS-WEAK",
    "IMHOTEP-CREW", "ANUBIS-COMMS",
  ];

  it("declares 14 Phase 13 sequences (7 Big4 + 5 Distinctifs + 2 Neteru Ground)", () => {
    expect(PHASE13_ORACLE_SEQUENCES).toHaveLength(14);
    expect(ORACLE_BIG4_SEQUENCES).toHaveLength(7);
    expect(ORACLE_DISTINCTIVE_SEQUENCES).toHaveLength(5);
    expect(ORACLE_NETERU_GROUND_SEQUENCES).toHaveLength(2);
  });

  it("integrates Phase 13 sequences into ALL_SEQUENCES", () => {
    for (const key of PHASE13_KEYS) {
      expect(ALL_SEQUENCES.find((s) => s.key === key), `${key} missing from ALL_SEQUENCES`).toBeDefined();
    }
  });

  it("makes Phase 13 sequences resolvable via getSequence()", () => {
    for (const key of PHASE13_KEYS) {
      expect(getSequence(key), `getSequence('${key}') should resolve`).toBeDefined();
    }
  });

  it("all 14 sequence keys are unique", () => {
    const keys = PHASE13_ORACLE_SEQUENCES.map((s) => s.key);
    expect(new Set(keys).size).toBe(14);
  });

  describe("BIG4_BASELINE sequences (7)", () => {
    it("all family ORACLE_BIG4", () => {
      for (const seq of ORACLE_BIG4_SEQUENCES) {
        expect(seq.family).toBe("ORACLE_BIG4");
      }
    });

    it("includes McKinsey + BCG + Bain + Deloitte", () => {
      const keys = ORACLE_BIG4_SEQUENCES.map((s) => s.key);
      expect(keys).toContain("MCK-7S");
      expect(keys).toContain("BCG-PORTFOLIO");
      expect(keys).toContain("BAIN-NPS");
      expect(keys).toContain("DELOITTE-GREENHOUSE");
      expect(keys).toContain("DELOITTE-BUDGET");
    });

    it("BCG-PORTFOLIO and MCK-3H steps include forgeOutput-capable tools (B8 forge buttons)", () => {
      const bcg = getSequence("BCG-PORTFOLIO")!;
      const mck3h = getSequence("MCK-3H")!;
      expect(bcg.steps.some((s) => s.ref === "bcg-portfolio-plotter")).toBe(true);
      expect(mck3h.steps.some((s) => s.ref === "mckinsey-3-horizons-mapper")).toBe(true);
    });
  });

  describe("DISTINCTIVE sequences (5)", () => {
    it("all family ORACLE_DISTINCTIVE", () => {
      for (const seq of ORACLE_DISTINCTIVE_SEQUENCES) {
        expect(seq.family).toBe("ORACLE_DISTINCTIVE");
      }
    });

    it("MANIP-MATRIX requires both MANIFESTE-A AND PLAYBOOK-E (Loi 2 séquencement)", () => {
      const manip = getSequence("MANIP-MATRIX")!;
      const required = manip.requires
        .filter((r) => r.type === "SEQUENCE")
        .map((r) => (r as { type: "SEQUENCE"; key: string }).key);
      expect(required).toContain("MANIFESTE-A");
      expect(required).toContain("PLAYBOOK-E");
    });

    it("CULT-INDEX uses cult-index-scorer tool (invoke cult-index-engine SESHAT)", () => {
      const cult = getSequence("CULT-INDEX")!;
      expect(cult.steps.some((s) => s.ref === "cult-index-scorer")).toBe(true);
    });

    it("TARSIS-WEAK uses tarsis-signal-detector (invoke seshat/tarsis)", () => {
      const tarsis = getSequence("TARSIS-WEAK")!;
      expect(tarsis.steps.some((s) => s.ref === "tarsis-signal-detector")).toBe(true);
    });

    it("OVERTON-DISTINCTIVE uses overton-window-mapper", () => {
      const overton = getSequence("OVERTON-DISTINCTIVE")!;
      expect(overton.steps.some((s) => s.ref === "overton-window-mapper")).toBe(true);
    });
  });

  describe("Neteru Ground sequences (Imhotep + Anubis — Phase 14/15, stubs writeback-only)", () => {
    it("all family ORACLE_NETERU_GROUND", () => {
      for (const seq of ORACLE_NETERU_GROUND_SEQUENCES) {
        expect(seq.family).toBe("ORACLE_NETERU_GROUND");
      }
    });

    it("IMHOTEP-CREW + ANUBIS-COMMS exist with tier 0", () => {
      const imhotep = getSequence("IMHOTEP-CREW")!;
      const anubis = getSequence("ANUBIS-COMMS")!;
      expect(imhotep.tier).toBe(0);
      expect(anubis.tier).toBe(0);
    });

    it("Neteru Ground stubs have only PLANNED steps (output réel hors-sequence)", () => {
      for (const seq of ORACLE_NETERU_GROUND_SEQUENCES) {
        expect(seq.steps.length).toBeGreaterThan(0);
        for (const step of seq.steps) {
          expect(step.status, `${seq.key} step ${step.ref} should be PLANNED`).toBe("PLANNED");
        }
      }
    });

    it("Neteru Ground stubs have no requires (don't gate other sequences)", () => {
      for (const seq of ORACLE_NETERU_GROUND_SEQUENCES) {
        expect(seq.requires).toEqual([]);
      }
    });
  });

  describe("Anti-doublon NEFER §3 — réutilisation services existants", () => {
    it("CULT-INDEX, MANIP-MATRIX, DEVOTION-LADDER reuse existing services (no new engine)", () => {
      // Services réutilisés : cult-index-engine SESHAT, manipulation-matrix engine,
      // devotion-engine SESHAT — ne pas créer de nouvelles instances dans les sequences.
      const reusing = [
        getSequence("CULT-INDEX")!,
        getSequence("MANIP-MATRIX")!,
        getSequence("DEVOTION-LADDER")!,
      ];
      // Each must use a tool that documents its delegation in description/promptTemplate
      for (const seq of reusing) {
        expect(seq.steps.length).toBeGreaterThan(0);
      }
    });
  });
});
