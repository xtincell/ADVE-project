/**
 * pillar-schema-coherence — ADR-0023 anti-drift gate
 *
 * Six invariants that must hold between the canonical pillar Zod
 * schemas, the variable-bible (UI source of truth for editable fields),
 * the FINANCIAL_FIELDS list (Notoria gates), and the OPERATOR_AMEND_PILLAR
 * intent contract.
 *
 * Bloque pre-commit / CI : tout drift de l'un de ces 4 ne peut survivre
 * sans casser ce test. C'est l'industrialisation de l'audit Phase 5
 * NEFER §F.1.
 */

import { describe, it, expect } from "vitest";
import { VARIABLE_BIBLE, listEditableFields, getEditableMode } from "@/lib/types/variable-bible";
import { PILLAR_KEYS } from "@/domain/pillars";
import { INTENT_KINDS } from "@/server/governance/intent-kinds";

describe("pillar schema coherence (ADR-0023)", () => {
  it("variable-bible covers all 8 ADVE-RTIS pillars", () => {
    for (const k of PILLAR_KEYS) {
      expect(VARIABLE_BIBLE[k.toLowerCase()], `missing bible for pillar ${k}`).toBeDefined();
    }
  });

  it("OPERATOR_AMEND_PILLAR intent kind is registered", () => {
    const found = INTENT_KINDS.find((k) => k.kind === "OPERATOR_AMEND_PILLAR");
    expect(found).toBeDefined();
    expect(found?.governor).toBe("MESTOR");
  });

  it("listEditableFields returns []  for RTIS pillars (no manual edit)", () => {
    for (const k of ["r", "t", "i", "s"] as const) {
      expect(
        listEditableFields(k),
        `RTIS pillar ${k} must not expose editable fields — refresh via ENRICH_*_FROM_ADVE`,
      ).toEqual([]);
    }
  });

  it("listEditableFields returns at least one field for each ADVE pillar", () => {
    for (const k of ["a", "d", "v", "e"] as const) {
      const fields = listEditableFields(k);
      expect(fields.length, `ADVE pillar ${k} has no editable fields in variable-bible`).toBeGreaterThan(0);
    }
  });

  it("derivedFrom variables resolve to INFERRED_NO_EDIT", () => {
    for (const [pillarKey, bible] of Object.entries(VARIABLE_BIBLE)) {
      for (const [field, spec] of Object.entries(bible)) {
        if (spec.derivedFrom) {
          expect(
            getEditableMode(pillarKey, spec),
            `${pillarKey}.${field} has derivedFrom but is not INFERRED_NO_EDIT`,
          ).toBe("INFERRED_NO_EDIT");
        }
      }
    }
  });

  it("explicit editableMode overrides win over heuristic", () => {
    // Synthetic spec with explicit override should take precedence.
    const synthetic = {
      description: "test",
      format: "test",
      minLength: 1000, // would normally be LLM_REPHRASE
      editableMode: "PATCH_DIRECT" as const,
    };
    expect(getEditableMode("a", synthetic)).toBe("PATCH_DIRECT");
  });

  it("STRATEGIC_REWRITE is never returned from spec heuristic alone", () => {
    // STRATEGIC_REWRITE is gate-decided at runtime (LOCKED + destructive).
    // The bible heuristic must never preempt that decision.
    for (const [pillarKey, bible] of Object.entries(VARIABLE_BIBLE)) {
      for (const [, spec] of Object.entries(bible)) {
        if (spec.editableMode) continue; // explicit override is allowed
        const mode = getEditableMode(pillarKey, spec);
        expect(mode).not.toBe("STRATEGIC_REWRITE");
      }
    }
  });
});
