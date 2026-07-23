/**
 * Phase 3 — « la notoria remplit la profondeur ». L'enrichissement SURGICAL :
 * une matrice `produitsCatalogue` qui a déjà des items est éclatée en cellules
 * manquantes précises (`produitsCatalogue[2].gainClientConcret`) — la notoria ne
 * remplit QUE les vides des items existants, sans jamais régénérer/écraser le
 * catalogue réel du fondateur (anti-fabrication). Tests PURS (sans DB/LLM).
 */
import { describe, it, expect } from "vitest";
import { expandArrayItemRequirements } from "@/server/services/pillar-maturity/auto-filler";
import { buildExampleForPath, getFieldZod } from "@/lib/types/pillar-maturity-contracts";
import type { FieldRequirement } from "@/lib/types/pillar-maturity";

const matrixReq: FieldRequirement = {
  path: "produitsCatalogue",
  validator: "array_items_complete",
  derivable: true,
  requiredItemKeys: ["nom", "gainClientConcret", "categorie"],
};

describe("expandArrayItemRequirements — enrichissement surgical", () => {
  it("éclate en cellules manquantes des items existants (préserve les valeurs déjà là)", () => {
    const content = {
      produitsCatalogue: [
        { nom: "Cabine A", gainClientConcret: "", categorie: null }, // 2 vides
        { nom: "Cabine B", gainClientConcret: "gagne du temps", categorie: "SERVICE" }, // complet
      ],
    };
    const out = expandArrayItemRequirements([matrixReq], content);
    const paths = out.map((r) => r.path);
    // item 0 : gainClientConcret + categorie vides ; nom rempli → 2 cellules
    expect(paths).toContain("produitsCatalogue[0].gainClientConcret");
    expect(paths).toContain("produitsCatalogue[0].categorie");
    expect(paths).not.toContain("produitsCatalogue[0].nom"); // déjà rempli
    // item 1 complet → aucune cellule
    expect(paths.some((p) => p.startsWith("produitsCatalogue[1]"))).toBe(false);
    // la requirement tableau d'origine n'est PAS renvoyée (remplacée par les cellules)
    expect(paths).not.toContain("produitsCatalogue");
    // les cellules sont des feuilles non_empty dérivables
    expect(out.every((r) => r.validator === "non_empty" && r.derivable)).toBe(true);
  });

  it("tableau VIDE → garde la requirement tableau (le LLM crée les items de zéro)", () => {
    const out = expandArrayItemRequirements([matrixReq], { produitsCatalogue: [] });
    expect(out).toHaveLength(1);
    expect(out[0]!.path).toBe("produitsCatalogue");
    expect(out[0]!.validator).toBe("array_items_complete");
  });

  it("champ absent → garde la requirement tableau", () => {
    const out = expandArrayItemRequirements([matrixReq], {});
    expect(out[0]!.path).toBe("produitsCatalogue");
  });

  it("requirement non-matrice → passthrough inchangé", () => {
    const scalar: FieldRequirement = { path: "promesseDeValeur", validator: "non_empty", derivable: true };
    expect(expandArrayItemRequirements([scalar], {})).toEqual([scalar]);
  });

  it("items primitifs (listOfStringOr) → ignorés (rien à éclater par clé)", () => {
    const req: FieldRequirement = { path: "principes", validator: "array_items_complete", derivable: true, requiredItemKeys: ["principle"] };
    const out = expandArrayItemRequirements([req], { principes: ["Un principe", "Un autre"] });
    // aucun item objet → aucune cellule émise (les strings passent déjà l'assessor)
    expect(out).toHaveLength(0);
  });
});

describe("getFieldZod / buildExampleForPath — shape des cellules (index de tableau)", () => {
  it("résout la shape d'une cellule enum (donne un enum VALIDE au LLM)", () => {
    expect(getFieldZod("v", "produitsCatalogue[0].categorie")).toBeTruthy();
    // exemple = une valeur d'enum réelle du schema (pas un placeholder)
    expect(typeof buildExampleForPath("v", "produitsCatalogue[0].categorie")).toBe("string");
  });
  it("résout une cellule string + une cellule array-of-enum", () => {
    expect(buildExampleForPath("v", "produitsCatalogue[0].gainClientConcret")).toBe("<string>");
    expect(Array.isArray(buildExampleForPath("v", "produitsCatalogue[3].canalDistribution"))).toBe(true);
  });
  it("la résolution du tableau entier reste intacte (non-régression)", () => {
    expect(Array.isArray(buildExampleForPath("v", "produitsCatalogue"))).toBe(true);
  });
});
