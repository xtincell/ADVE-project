/**
 * pillar-core-engine-coherence — ADR-0088 anti-drift gate (HARD)
 *
 * Locks the relational backbone invariants of the Core Engine refactor:
 *  - Risk/Initiative entities carry stable uuid ids + numeric/status backbone
 *    (strict v2 validators require them).
 *  - Pillar S is a PURE COMPUTED DASHBOARD: it exposes a `computed` block,
 *    accepts no static text input (listEditableFields("s") === []), and its
 *    free-text fields (fenetreOverton + perceptions) are optional, never
 *    required inputs.
 *  - deriveSeverity maps probability×impact onto a stable 0-100 scale.
 *
 * Any regression toward text-as-reference or text-input-on-S breaks this test.
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  RiskEntrySchema,
  RiskEntrySchemaV2,
  PotentialActionSchemaV2,
  PillarSSchema,
  deriveSeverity,
  validatePillarContentV2,
  RISK_STATUSES,
  INITIATIVE_STATUSES,
} from "@/lib/types/pillar-schemas";
import { listEditableFields } from "@/lib/types/variable-bible";
import {
  RecommendationPayloadSchema,
  RECOMMENDATION_PAYLOAD_KINDS,
  parseRecommendationPayload,
} from "@/lib/types/recommendation-payload";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("core-engine relational backbone (ADR-0088)", () => {
  it("RiskEntrySchemaV2 REQUIRES id + severity + status", () => {
    // Legacy-shaped risk (no backbone) passes the lenient schema…
    const legacy = { risk: "x", probability: "HIGH", impact: "HIGH", mitigation: "y" };
    expect(RiskEntrySchema.safeParse(legacy).success).toBe(true);
    // …but is rejected by the strict v2 validator.
    expect(RiskEntrySchemaV2.safeParse(legacy).success).toBe(false);
    expect(
      RiskEntrySchemaV2.safeParse({ ...legacy, id: uuid, severity: 100, status: "UNMITIGATED" }).success,
    ).toBe(true);
  });

  it("PotentialActionSchemaV2 REQUIRES id + status", () => {
    const legacy = { action: "do x", format: "post", objectif: "reach" };
    expect(PotentialActionSchemaV2.safeParse(legacy).success).toBe(false);
    expect(
      PotentialActionSchemaV2.safeParse({ ...legacy, id: uuid, status: "DRAFT" }).success,
    ).toBe(true);
  });

  it("deriveSeverity maps probability×impact onto 0-100", () => {
    expect(deriveSeverity("HIGH", "HIGH")).toBe(100);
    expect(deriveSeverity("LOW", "LOW")).toBe(11);
    expect(deriveSeverity("MEDIUM", "HIGH")).toBe(67);
  });

  it("Pillar S exposes a `computed` dashboard block", () => {
    expect(PillarSSchema.shape).toHaveProperty("computed");
  });

  it("Pillar S accepts NO static text input (fenetreOverton + perceptions optional)", () => {
    // fenetreOverton is optional at the top level…
    expect(PillarSSchema.shape.fenetreOverton instanceof z.ZodOptional).toBe(true);
    // …and S exposes zero operator-editable fields.
    expect(listEditableFields("s")).toEqual([]);
  });

  it("validatePillarContentV2 flags risk entries missing the backbone", () => {
    const rContent = {
      globalSwot: { strengths: ["a", "b", "c"], weaknesses: ["a", "b", "c"], opportunities: ["a", "b", "c"], threats: ["a", "b", "c"] },
      probabilityImpactMatrix: [
        { risk: "no id", probability: "HIGH", impact: "HIGH", mitigation: "m" },
      ],
      mitigationPriorities: [{ action: "a" }, { action: "b" }, { action: "c" }, { action: "d" }, { action: "e" }],
    };
    const res = validatePillarContentV2("R", rContent);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.path.startsWith("probabilityImpactMatrix.0"))).toBe(true);
  });

  it("backbone enum sets are stable", () => {
    expect([...RISK_STATUSES]).toEqual(["UNMITIGATED", "MITIGATED", "ACCEPTED"]);
    expect([...INITIATIVE_STATUSES]).toEqual(["DRAFT", "RECOMMENDED", "SELECTED_FOR_ROADMAP", "REJECTED"]);
  });

  it("RecommendationPayload (function-calling) covers the expected mutation kinds", () => {
    expect([...RECOMMENDATION_PAYLOAD_KINDS].sort()).toEqual(
      ["ADD_INITIATIVE", "LINK_RISK", "REJECT_INITIATIVE", "SELECT_INITIATIVE", "SELECT_ROADMAP_ROUTE", "SET_RISK_STATUS", "UPDATE_ADVE_FIELD"].sort(),
    );
    // discriminated union accepts a valid event…
    expect(RecommendationPayloadSchema.safeParse({ kind: "SET_RISK_STATUS", riskId: "11111111-1111-4111-8111-111111111111", status: "MITIGATED" }).success).toBe(true);
    // …and parseRecommendationPayload returns null for legacy untyped values (fallback path).
    expect(parseRecommendationPayload("just a string")).toBeNull();
    expect(parseRecommendationPayload({ some: "legacy json" })).toBeNull();
  });

  it("SELECT_ROADMAP_ROUTE (ADR-0089) accepts only the 3 canonical route keys", () => {
    expect(RecommendationPayloadSchema.safeParse({ kind: "SELECT_ROADMAP_ROUTE", routeKey: "AMBITIOUS" }).success).toBe(true);
    expect(RecommendationPayloadSchema.safeParse({ kind: "SELECT_ROADMAP_ROUTE", routeKey: "TURBO" }).success).toBe(false);
  });
});
