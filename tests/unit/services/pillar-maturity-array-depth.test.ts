/**
 * Phase 2 — « le contrat voit la profondeur ». Le validateur `array_items_complete`
 * exige que CHAQUE item d'un tableau d'objets ait ses feuilles requises renseignées
 * (non vides), au lieu de `min_items` qui laissait passer `[{nom}]` — la cause des
 * « vides » invisibles de la matrice produit (capture opérateur pilier V).
 *
 * Ces tests sont indépendants du canon (contrats synthétiques + contrat V dérivé du
 * schema Zod, stable) : ils verrouillent la MÉCANIQUE, pas les données.
 */
import { describe, it, expect } from "vitest";
import { assessPillar, isFieldSatisfied } from "@/server/services/pillar-maturity/assessor";
import { findEmptyArrayCellPaths, canInferMissingConceptualField } from "@/lib/types/pillar-maturity-contracts";
import { getContract } from "@/server/services/pillar-maturity/contracts-loader";
import type { PillarMaturityContract, FieldRequirement } from "@/lib/types/pillar-maturity";

function contractWith(req: FieldRequirement): PillarMaturityContract {
  return { pillarKey: "v", stages: { INTAKE: [], ENRICHED: [], COMPLETE: [req] } };
}
const REQ: FieldRequirement = {
  path: "cat",
  validator: "array_items_complete",
  derivable: true,
  requiredItemKeys: ["nom", "gain"],
};
const missingCat = (content: Record<string, unknown>) =>
  assessPillar("v", content, contractWith(REQ)).missing.includes("cat");

describe("missing conceptual premises can be proposed pending verification", () => {
  const rites = [{ fromStage: "SPECTATEUR", toStage: "INTERESSE", rituelEntree: "Première découverte proposée" }];
  it("accepts an empty required collection or text but never a malformed proposal", () => {
    expect(canInferMissingConceptualField("e", "ritesDePassage", { ritesDePassage: [] }, rites)).toBe(true);
    expect(canInferMissingConceptualField("e", "primaryChannel", { primaryChannel: "" }, "APP")).toBe(true);
    expect(canInferMissingConceptualField("e", "ritesDePassage", { ritesDePassage: [] }, [{ rituelEntree: "Incomplet" }])).toBe(false);
    expect(canInferMissingConceptualField("e", "ritesDePassage", { ritesDePassage: [] }, [])).toBe(false);
  });
  it("keeps filled decisions, zero, evidence and known non-product exchange", () => {
    expect(canInferMissingConceptualField("e", "primaryChannel", { primaryChannel: "EMAIL" }, "APP")).toBe(false);
    expect(canInferMissingConceptualField("v", "unitEconomics.cac", { unitEconomics: { cac: 0 } }, 100)).toBe(false);
    expect(canInferMissingConceptualField("a", "preuvesAuthenticite", { preuvesAuthenticite: [] }, ["Une preuve inventée"])).toBe(false);
    expect(canInferMissingConceptualField("s", "rejectedFromI", { rejectedFromI: [] }, ["Un rejet inventé"])).toBe(false);
    const row = { personaName: "Partenaire", productNames: [], valueToBrand: ["Trafic"], valueToActor: ["Audience"], actorCosts: ["Temps"], dependencyConditions: ["Participation"] };
    expect(canInferMissingConceptualField("v", "personaSegmentMap[0].productNames", { personaSegmentMap: [row] }, ["Achat fictif"])).toBe(false);
  });
});

describe("array_items_complete — profondeur par item", () => {
  it("item stub (identité seule) → INCOMPLET (c'est le trou que ça ferme)", () => {
    expect(missingCat({ cat: [{ nom: "X" }] })).toBe(true);
  });
  it("item avec toutes ses feuilles requises → satisfait", () => {
    expect(missingCat({ cat: [{ nom: "X", gain: "Y" }] })).toBe(false);
  });
  it("0 / false sont des cellules légitimes (pas vides)", () => {
    expect(missingCat({ cat: [{ nom: "X", gain: 0 }] })).toBe(false);
    expect(missingCat({ cat: [{ nom: "X", gain: false }] })).toBe(false);
  });
  it("tableau vide → INCOMPLET", () => {
    expect(missingCat({ cat: [] })).toBe(true);
  });
  it("un seul item incomplet parmi plusieurs → INCOMPLET (chaque item compte)", () => {
    expect(missingCat({ cat: [{ nom: "X", gain: "Y" }, { nom: "Z" }] })).toBe(true);
  });
  it("item primitif (string) — forme raccourcie listOfStringOr — compte si non vide", () => {
    expect(missingCat({ cat: ["Principe réel"] })).toBe(false);
    expect(missingCat({ cat: [""] })).toBe(true);
  });
  it("sans requiredItemKeys → dégrade en « ≥1 item » (min_items)", () => {
    const req: FieldRequirement = { path: "cat", validator: "array_items_complete", derivable: true };
    expect(assessPillar("v", { cat: [{}] }, contractWith(req)).missing.includes("cat")).toBe(false);
    expect(assessPillar("v", { cat: [] }, contractWith(req)).missing.includes("cat")).toBe(true);
  });
});

describe("intégration — la matrice produit V est profonde dans le contrat dérivé", () => {
  it("accepts an explicitly documented non-product exchange without inventing an offer", () => {
    const req = getContract("v").stages.COMPLETE.find(r => r.path === "personaSegmentMap")!;
    const row = { personaName: "Stand partenaire", productNames: [], valueToBrand: ["Animation et trafic"],
      valueToActor: ["Accès au public"], actorCosts: ["Temps de présence"], dependencyConditions: ["Affluence suffisante"] };
    const content = { personaSegmentMap: [row] };
    expect(isFieldSatisfied(content, req)).toBe(true);
    expect(findEmptyArrayCellPaths("v", content).map(c => c.path)).not.toContain("personaSegmentMap[0].productNames");
    expect(isFieldSatisfied({ personaSegmentMap: [{ personaName: row.personaName, productNames: [] }] }, req)).toBe(false);
    expect(isFieldSatisfied({ personaSegmentMap: [{ ...row, productNames: undefined }] }, req)).toBe(false);
    expect(isFieldSatisfied({ personaSegmentMap: [{ ...row, valueToActor: [] }] }, req)).toBe(false);
    expect(content.personaSegmentMap[0]?.productNames).toEqual([]);
  });
  it("produitsCatalogue = array_items_complete avec les cellules de la matrice en requiredItemKeys", () => {
    const v = getContract("v");
    const cat = v.stages.COMPLETE.find((r) => r.path === "produitsCatalogue");
    expect(cat, "requirement produitsCatalogue absent").toBeTruthy();
    expect(cat!.validator).toBe("array_items_complete");
    // Les cellules value-defining doivent être exigées par item (fini le [{nom}] qui passait).
    for (const cell of ["gainClientConcret", "gainClientAbstrait", "lienPromesse"]) {
      expect(cat!.requiredItemKeys, `cellule requise ${cell}`).toContain(cell);
    }
  });
});
