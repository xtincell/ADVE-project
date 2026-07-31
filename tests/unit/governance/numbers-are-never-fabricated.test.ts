/**
 * V7 — un NOMBRE de la vie réelle ne se fabrique jamais.
 *
 * Résidu inscrit au registre depuis le chantier ADR-0178 : `deriveSchemaRequirements`
 * marquait TOUT champ nombre top-level `derivable: ai_generation`. Deux champs
 * atteignaient donc le LLM :
 *
 *   - `a.turnoverRate` — taux de rotation clients : une donnée d'entreprise
 *     réelle, que personne ne peut deviner ;
 *   - `i.totalActions` — pire encore : `auto-filler.deriveByCalculation` a un
 *     COMPTEUR EXACT (somme des actions du catalogue par canal), rendu mort par
 *     le routage `ai_generation`. Le LLM estimait ce que le code savait compter.
 *
 * Un nombre inventé est une donnée réelle inventée — l'interdit n°3.
 */
import { describe, it, expect } from "vitest";
import { getContract } from "@/server/services/pillar-maturity/contracts-loader";
import { compositeScaleOf } from "@/domain/brand-scores";

describe("les nombres réels ne passent jamais par le LLM", () => {
  it("a.turnoverRate exige un HUMAIN (aucune IA ne connaît votre churn)", () => {
    const req = getContract("a")!.stages.COMPLETE.find((r) => r.path === "turnoverRate");
    if (!req) return; // le champ peut ne pas être requis à ce stade — rien à prouver
    expect(req.derivable, "turnoverRate ne doit pas être dérivable par IA").toBe(false);
  });

  it("i.totalActions est CALCULÉ, pas estimé (son compteur existe)", () => {
    const req = getContract("i")!.stages.COMPLETE.find((r) => r.path === "totalActions");
    if (!req) return;
    expect(req.derivationSource, "totalActions a un compteur déterministe").not.toBe("ai_generation");
  });
});

describe("l'échelle du composite ne se devine pas (V7, piège /100 vs /200)", () => {
  // Le registre le nommait « MED, piège » : l'intake persiste un composite
  // 4 piliers × 25 (/100) sous la MÊME clé que le canon 8 piliers (/200). Une
  // surface qui lirait une ligne d'intake avec `max: 200` afficherait une
  // marque deux fois plus faible qu'elle n'est.
  it("un vecteur d'intake (RTIS à zéro) est sur /100", () => {
    expect(compositeScaleOf({ a: 1.8, d: 23.2, v: 18.7, e: 3.9, r: 0, t: 0, i: 0, s: 0, composite: 47.6 })).toBe(100);
  });

  it("un vecteur canon (au moins un RTIS mesuré) est sur /200", () => {
    expect(compositeScaleOf({ a: 20, d: 20, v: 20, e: 20, r: 15, t: 0, i: 0, s: 0, composite: 95 })).toBe(200);
  });

  it("valeur illisible ⇒ /200 (l'échelle canon, jamais une supposition basse)", () => {
    expect(compositeScaleOf(null)).toBe(200);
    expect(compositeScaleOf("nope")).toBe(200);
  });
});
