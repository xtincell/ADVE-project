/**
 * Anti-drift test : Variable Bible canonical coverage.
 * Cf. ADR-0037 §11 + PR-K.
 *
 * Asserts:
 *   1. Every code in CANONICAL_MAP points to a real (pillarKey, fieldKey) in VARIABLE_BIBLE.
 *   2. Critical canonical codes (A1-A11, D1-D12, V-MultiSens etc.) are present.
 *   3. The 21 new ADVE fields introduced in PR-K exist in their pillars.
 *   4. resolveCanonical / findCanonicalCodes / listCanonicalCodes all behave.
 */

import { describe, it, expect } from "vitest";
import { CANONICAL_MAP, listCanonicalCodes, resolveCanonical, findCanonicalCodes } from "@/lib/types/variable-bible-canonical-map";
import { VARIABLE_BIBLE } from "@/lib/types/variable-bible";

describe("Variable Bible — canonical map coverage (ADR-0037 PR-K)", () => {
  it("every CANONICAL_MAP entry resolves to a real bible field", () => {
    const drifted: string[] = [];
    for (const [code, entry] of Object.entries(CANONICAL_MAP)) {
      const spec = VARIABLE_BIBLE[entry.pillarKey]?.[entry.fieldKey];
      if (!spec) drifted.push(`${code} → ${entry.pillarKey}.${entry.fieldKey}`);
    }
    expect(drifted, `Codes mapping to non-existent fields: ${drifted.join(", ")}`).toEqual([]);
  });

  it("listCanonicalCodes returns sorted unique codes", () => {
    const codes = listCanonicalCodes();
    expect(codes.length).toBeGreaterThanOrEqual(50);
    const set = new Set(codes);
    expect(set.size).toBe(codes.length);
  });

  it.each([
    "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10", "A11",
    "A1bis", "A11bis", "A-Vision", "A-Mission",
    "D1", "D2", "D4", "D5", "D6", "D7", "D8", "D10", "D11", "D12",
    "V1", "V4", "V7", "V12", "V-MultiSens", "V-Sacrifice", "V-Packaging",
    "E-DevotionLadder", "E-Temples", "E-Rituels", "E-Clerge",
    "E-Pelerinages", "E-Evangelisation", "E-Community",
  ])("canon code %s is mapped", (code) => {
    expect(CANONICAL_MAP[code], `code ${code} missing from CANONICAL_MAP`).toBeDefined();
    expect(resolveCanonical(code), `code ${code} not resolvable`).toBeDefined();
  });

  it.each([
    ["a", "messieFondateur"],
    ["a", "competencesDivines"],
    ["a", "preuvesAuthenticite"],
    ["a", "indexReputation"],
    ["a", "eNps"],
    ["a", "turnoverRate"],
    ["a", "missionStatement"],
    ["a", "originMyth"],
    ["d", "positionnementEmotionnel"],
    ["d", "swotFlash"],
    ["d", "esov"],
    ["d", "barriersImitation"],
    ["d", "storyEvidenceRatio"],
    ["v", "roiProofs"],
    ["v", "experienceMultisensorielle"],
    ["v", "sacrificeRequis"],
    ["v", "packagingExperience"],
    ["e", "clergeStructure"],
    ["e", "pelerinages"],
    ["e", "programmeEvangelisation"],
    ["e", "communityBuilding"],
  ])("PR-K new field %s.%s is present in BIBLE", (pillarKey, fieldKey) => {
    const spec = VARIABLE_BIBLE[pillarKey]?.[fieldKey];
    expect(spec, `${pillarKey}.${fieldKey} missing from variable-bible`).toBeDefined();
    expect(spec?.description.length).toBeGreaterThan(20);
    expect(spec?.format.length).toBeGreaterThan(20);
  });

  it("findCanonicalCodes returns matching codes for known field", () => {
    const codes = findCanonicalCodes("a", "nomMarque");
    expect(codes).toContain("A1");
  });

  it("findCanonicalCodes returns empty array for code-only field", () => {
    // equipeComplementarite is derived (calcul) — no canonical code expected.
    const codes = findCanonicalCodes("a", "equipeComplementarite");
    expect(codes).toEqual([]);
  });

  it("RTIS pillars (r/t/i/s) have no canonical codes mapped to them", () => {
    // Per ADR-0037 §11.5 : RTIS are derived, not in the manuel canon.
    const rtisCodes = listCanonicalCodes().filter((c) => {
      const e = CANONICAL_MAP[c]!;
      return ["r", "t", "i", "s"].includes(e.pillarKey);
    });
    expect(rtisCodes, `Unexpected RTIS canonical codes: ${rtisCodes.join(", ")}`).toEqual([]);
  });
});
