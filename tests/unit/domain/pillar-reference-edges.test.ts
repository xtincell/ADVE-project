/**
 * pillar-reference-edges — les arêtes de référence inter-piliers résolvent ou non
 * (ADR-0174, Lot 3). Généralise le motif produit (rule 31) aux liens par nom + FK UUID.
 */
import { describe, it, expect } from "vitest";
import { findDanglingReferences } from "@/domain/pillar-reference-edges";

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

describe("pillar-reference-edges — FK UUID (backbone ADR-0088)", () => {
  it("mitigatesRiskIds pointant dans le vide = dangle", () => {
    const d = findDanglingReferences({
      R: { probabilityImpactMatrix: [{ id: "risk-1" }] },
      I: { actions: [{ id: "a1", mitigatesRiskIds: ["risk-1", "risk-INEXISTANT"] }] },
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
  it("S.selectedFromI.sourceInitiativeId → I.actions[].id", () => {
    const d = findDanglingReferences({
      I: { actions: [{ id: "a1" }] },
      S: { selectedFromI: [{ sourceInitiativeId: "a1", action: "x" }, { sourceInitiativeId: "ghost", action: "y" }] },
    });
    expect(d.some((r) => r.ref === "ghost")).toBe(true);
    expect(d.some((r) => r.ref === "a1")).toBe(false);
  });
  it("pool cible vide → pas de faux positif FK (on ne peut pas juger)", () => {
    const d = findDanglingReferences({ I: { actions: [{ id: "a1", mitigatesRiskIds: ["risk-x"] }] } }); // pas de R
    expect(d).toHaveLength(0);
  });
  it("strategieDeplacement.riskId → R.overtonBlockers[].id (arête rendue possible)", () => {
    const d = findDanglingReferences({
      R: { overtonBlockers: [{ risk: "r", blockingPerception: "p", mitigation: "m", id: "blk-1" }] },
      S: { strategieDeplacement: { riskId: "blk-ghost" } },
    });
    expect(d.some((r) => r.source === "S.strategieDeplacement.riskId")).toBe(true);
  });
});
