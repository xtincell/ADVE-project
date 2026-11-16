import { describe, expect, it } from "vitest";
import { inventoryPillarContent, readAdveStrictShapeInventory } from "@/server/services/pillar-maturity/strict-shape-inventory";
import { salvageMappingContracts, salvageRawResponses } from "@/server/services/quick-intake/salvage-responses";

const review = (pillarKey: "a" | "d" | "v" | "e", content: Record<string, unknown>, extra = {}) =>
  inventoryPillarContent({ strategyId: "owned-synthetic", pillarKey, content, includeStructuralProposals: true, ...extra });

describe("structural preparation is exact, bounded and never writes", () => {
  it("derives exactly six scalar correspondences from the existing salvage contract", () => {
    const pairs = (["a", "d", "v", "e"] as const).flatMap(pillar => salvageMappingContracts(pillar)
      .filter(mapping => mapping.transformation === "SCALAR").map(mapping => [pillar, mapping.sourceKey, mapping.targetKey]));
    expect(pairs).toEqual([
      ["a", "a_noyau", "noyauIdentitaire"], ["a", "a_citation", "citationFondatrice"], ["a", "a_mission", "missionStatement"],
      ["d", "d_positioning", "positionnement"], ["d", "d_promise", "promesseMaitre"], ["v", "v_promise", "promesseDeValeur"],
    ]);
    for (const [pillar, source, target] of pairs) {
      const text = "Déclaration synthétique exactement conservée";
      expect(salvageRawResponses(pillar!, { [source!]: text })[target!]).toBe(text);
      const result = review(pillar as "a", { [source!]: text }).structuralReview!;
      expect(result.candidates[0]?.qualification).toBe("EXACT_REKEY_PROPOSAL");
      expect(result.simulatedRekeys).toBe(1);
      expect(result.after.refusedPaths).toBeLessThanOrEqual(result.before.refusedPaths);
    }
  });
  it("compares shape and maturity in memory without changing frozen source, metadata or validation", () => {
    const content = Object.freeze({ a_mission: "Un texte de mission synthétique intact", _fieldProvenance: Object.freeze({ a_mission: "HUMAN" }) });
    const input = { currentVersion: 7, validationStatus: "DRAFT", fieldCertainty: Object.freeze({ "a.a_mission": "OFFICIAL" }),
      sources: Object.freeze([{ sourceId: "source", field: "a_mission" }]) };
    const before = JSON.stringify({ content, input });
    const result = review("a", content, input);
    expect(result.currentVersion).toBe(7); expect(result.validationStatus).toBe("DRAFT");
    expect(result.structuralReview).toMatchObject({ scope: "IN_MEMORY_STRUCTURE_ONLY", currentVersion: 7, simulatedRekeys: 1 });
    const candidate = result.structuralReview!.candidates[0]!;
    expect(candidate.provenance).toBe("HUMAN");
    expect(candidate.referencesToRemap).toEqual(["_fieldProvenance.a_mission", "fieldCertainty.a.a_mission", "sources[0].field"]);
    expect(candidate.sources).toMatchObject([{ sourceId: "source", receiptHash: null, lookup: "NOT_READ", attachedToPillar: true, citedByFindings: 0 }]);
    expect(result.structuralReview!.after.maturity!.completionPct).toBeGreaterThanOrEqual(result.structuralReview!.before.maturity!.completionPct);
    expect(result.findings.every(finding => finding.excerpt === null)).toBe(true);
    expect(JSON.stringify(result)).not.toContain(content.a_mission);
    expect(JSON.stringify({ content, input })).toBe(before);
    expect(JSON.stringify(result)).not.toContain('"approved"');
  });
  it.each([
    ["different", "TARGET_CONFLICT", 0], [null, "TARGET_CONFLICT", 0], ["", "TARGET_CONFLICT", 0],
    ["Texte exact reçu", "EQUIVALENT_TARGET", 1],
  ])("never replaces an existing target %s", (target, qualification, simulated) => {
    const result = review("d", { d_promise: "Texte exact reçu", promesseMaitre: target }).structuralReview!;
    expect(result.candidates[0]?.qualification).toBe(qualification); expect(result.simulatedRekeys).toBe(simulated);
  });
  it.each([
    [42, "SOURCE_NOT_TEXT"], ["x", "SOURCE_TOO_SHORT"], [" texte reçu ", "TRIMMING_REQUIRED"],
    ["x".repeat(4001), "TRUNCATION_REQUIRED"], ["x".repeat(500), "TARGET_SCHEMA_REFUSED"],
  ])("does not coerce, trim or truncate the source", (source, qualification) => {
    const result = review("a", { a_mission: source }).structuralReview!;
    expect(result.candidates[0]?.qualification).toBe(qualification); expect(result.simulatedRekeys).toBe(0);
    expect(result.after).toEqual(result.before);
  });
  it("does not split lists, synthesize objects, translate enums, invent units or remap IDs", () => {
    const a = review("a", { a_values: "Qualité, intégrité; transmission", archetype: "Créateur" }).structuralReview!;
    expect(a.candidates[0]?.qualification).toBe("SPLITTING_OR_TRUNCATION_REVIEW");
    expect(a.reviewRequired).toContainEqual({ path: "archetype", reason: "TAXONOMY_REVIEW" });
    expect(a.simulatedRekeys).toBe(0);
    const v = review("v", { unitEconomics: { budgetCom: "5 millions" }, v_products: "Un produit, un autre" }).structuralReview!;
    expect(v.reviewRequired).toContainEqual({ path: "unitEconomics.budgetCom", reason: "NUMERIC_UNIT_NOT_ESTABLISHED" });
    expect(v.simulatedRekeys).toBe(0);
    const d = review("d", { personas: [{ id: "client-local" }], d_persona_principal: "Une personne. Une autre phrase." }).structuralReview!;
    expect(d.reviewRequired).toContainEqual({ path: "personas.0.id", reason: "REFERENCE_REMAP_REQUIRED" });
    expect(d.simulatedRekeys).toBe(0);
    const e = review("e", { e_loyalty: "50-70%", e_advocates: "Souvent" }).structuralReview!;
    expect(e.reviewRequired).toEqual([{ path: "e_advocates", reason: "NO_EXACT_MAPPING" }, { path: "e_loyalty", reason: "NO_EXACT_MAPPING" }]);
    expect(e.after).toEqual(e.before);
  });
  it("reports a target conflict even when the source also needs truncation", () => {
    const candidate = review("a", { a_mission: "x".repeat(4001), missionStatement: "Mission conservée" }).structuralReview!.candidates[0]!;
    expect(candidate).toMatchObject({ targetPresent: true, targetRelation: "CONFLICT", qualification: "TRUNCATION_REQUIRED" });
  });
  it("fails before reading rows when PostgreSQL does not confirm read-only isolation", async () => {
    for (const [readOnly, isolation] of [["off", "repeatable read"], ["on", "read committed"]]) {
      const tx = { $executeRaw: async () => 0, $queryRaw: async (sql: TemplateStringsArray) => sql.join("").includes("read_only")
        ? [{ transaction_read_only: readOnly }] : [{ transaction_isolation: isolation }] };
      const client = { $transaction: async (run: (transaction: unknown) => unknown) => run(tx) };
      await expect(readAdveStrictShapeInventory({ includeStructuralProposals: true }, client as never)).rejects.toThrow("confirmed READ ONLY");
    }
  });
});
