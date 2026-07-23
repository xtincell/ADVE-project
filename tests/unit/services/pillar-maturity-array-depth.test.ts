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
import { assessPillar } from "@/server/services/pillar-maturity/assessor";
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
