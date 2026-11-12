/**
 * pillar-reference-edges — les arêtes de référence inter-piliers résolvent ou non
 * (ADR-0174, Lot 3). Généralise le motif produit (rule 31) aux liens par nom + FK UUID.
 */
import { describe, it, expect } from "vitest";
import { assessPillarReferences, findDanglingReferences } from "@/domain/pillar-reference-edges";

describe("pillar-reference-edges — liens par nom (persona)", () => {
  it("personaSegmentMap.personaName qui ne matche aucun persona = dangle", () => {
    const d = findDanglingReferences({
      D: { personas: [{ name: "Le vidéaste pro" }] },
      V: { personaSegmentMap: [{ personaName: "Un persona fantôme" }] },
    });
    expect(d.some((r) => r.source.startsWith("V.personaSegmentMap") && r.ref === "Un persona fantôme")).toBe(true);
  });
  it("matching tolérant aux accents/casse → résout", () => {
    const d = findDanglingReferences({
      D: { personas: [{ name: "Le Créatif Équipé" }] },
      V: { personaSegmentMap: [{ personaName: "le creatif equipe" }] },
    });
    expect(d).toHaveLength(0);
  });
  it("superfanPortrait.personaRef non résolu = dangle", () => {
    const d = findDanglingReferences({
      D: { personas: [{ name: "Le pro" }] },
      E: { superfanPortrait: { personaRef: "inconnu" } },
    });
    expect(d.some((r) => r.source === "E.superfanPortrait.personaRef")).toBe(true);
  });
});

describe("Reference coverage — missing evidence stays separate from broken links", () => {
  it("keeps the legacy empty-pool deferral but exposes its coverage", () => {
    const bag = { I: { catalogueParCanal: { WEB: [{ mitigatesRiskIds: ["risk-x"], targetsPersonaIds: ["persona-x"], hypothesisId: "hyp-x" }] } } };
    const assessed = assessPillarReferences(bag);
    expect(findDanglingReferences(bag)).toEqual([]);
    expect(assessed.checkedCount).toBe(0);
    expect(assessed.deferred.map(row => row.ref)).toEqual(["risk-x", "persona-x", "hyp-x"]);
    expect(assessed.deferred.every(row => row.reason === "TARGET_IDS_MISSING")).toBe(true);
  });

  it("preserves strict synthesis checks for absent targets and sprint references", () => {
    const bag = { S: {
      selectedFromI: [{ sourceInitiativeId: "action-a" }],
      rejectedFromI: [{ sourceInitiativeId: "action-b" }],
      sprint90Days: [{ sourceInitiativeId: "action-c" }],
      fenetreOverton: { strategieDeplacement: [{ riskId: "blocker-x", hypothesisId: "hyp-x" }] },
    } };
    const tolerant = assessPillarReferences(bag);
    expect(tolerant.dangling).toEqual([]);
    expect(tolerant.deferred.map(row => row.ref)).toEqual(["action-a", "action-b", "blocker-x"]);
    const strict = assessPillarReferences(bag, { strictS: true });
    expect(strict.deferred).toEqual([]);
    expect(strict.checkedCount).toBe(5);
    expect(strict.dangling.map(row => row.ref)).toEqual(["action-a", "action-b", "action-c", "blocker-x", "hyp-x"]);
    expect(findDanglingReferences(bag, { strictS: true })).toEqual(strict.dangling);
  });

  it("does not silently discard malformed array elements or rewrite the input", () => {
    const bag = { D: { personas: [{ id: "persona-a" }] },
      I: { actionsByDevotionLevel: { ENGAGE: [{ targetsPersonaIds: ["persona-a", 42, ""] }] } } };
    const before = structuredClone(bag);
    const assessed = assessPillarReferences(bag);
    expect(assessed.checkedCount).toBe(1);
    expect(assessed.dangling).toEqual([]);
    expect(assessed.deferred).toHaveLength(2);
    expect(assessed.deferred.every(row => row.reason === "INVALID_REFERENCE_SHAPE")).toBe(true);
    expect(bag).toEqual(before);
  });
});

describe("pillar-reference-edges — FK UUID (backbone ADR-0088)", () => {
  it("mitigatesRiskIds pointant dans le vide = dangle (via catalogueParCanal, catalogue primaire)", () => {
    const d = findDanglingReferences({
      R: { probabilityImpactMatrix: [{ id: "risk-1" }] },
      // catalogueParCanal = record<canal, action[]> — LE catalogue primaire (était omis).
      I: { catalogueParCanal: { INSTAGRAM: [{ id: "a1", mitigatesRiskIds: ["risk-1", "risk-INEXISTANT"] }] } },
    });
    expect(d.some((r) => r.ref === "risk-INEXISTANT")).toBe(true);
    expect(d.some((r) => r.ref === "risk-1")).toBe(false); // résout
  });
  it("ids lisibles résolvent aussi bien que des UUID (matching par chaîne)", () => {
    const d = findDanglingReferences({
      R: { probabilityImpactMatrix: [{ id: "risk-m19-001" }] },
      I: { actionsByDevotionLevel: { SPECTATEUR: [{ id: "M1", mitigatesRiskIds: ["risk-m19-001"] }] } },
    });
    expect(d).toHaveLength(0);
  });
  it("S.selectedFromI.sourceInitiativeId → I.actions[].id (catalogue résout, ghost dangle)", () => {
    const d = findDanglingReferences({
      I: { catalogueParCanal: { WEB: [{ id: "a1" }] } },
      S: { selectedFromI: [{ sourceInitiativeId: "a1", action: "x" }, { sourceInitiativeId: "ghost", action: "y" }] },
    });
    expect(d.some((r) => r.ref === "ghost")).toBe(true);
    expect(d.some((r) => r.ref === "a1")).toBe(false); // action de catalogue résout (n'était PAS collectée avant)
  });
  it("pool cible vide → pas de faux positif FK (on ne peut pas juger)", () => {
    const d = findDanglingReferences({ I: { catalogueParCanal: { X: [{ id: "a1", mitigatesRiskIds: ["risk-x"] }] } } }); // pas de R
    expect(d).toHaveLength(0);
  });
  it("S.fenetreOverton.strategieDeplacement[].riskId → R.overtonBlockers[].id (arête enfin déclenchable)", () => {
    const d = findDanglingReferences({
      R: { overtonBlockers: [{ risk: "r", blockingPerception: "p", mitigation: "m", id: "blk-1" }] },
      // Chemin RÉEL du schéma (array dans fenetreOverton), pas l'ancien objet à S.strategieDeplacement.
      S: { fenetreOverton: { strategieDeplacement: [{ riskId: "blk-ghost" }] } },
    });
    expect(d.some((r) => r.source.startsWith("S.fenetreOverton.strategieDeplacement") && r.ref === "blk-ghost")).toBe(true);
  });
});
