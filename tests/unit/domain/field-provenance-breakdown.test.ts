/**
 * `computeProvenanceBreakdown` — la provenance cesse d'être décorative.
 *
 * Audit MCP 2026-07-27 §6 : « `_fieldProvenance` existe et ne sert à rien ». Sur
 * le pilier A de SPAWT, `doctrine`/`prophecy`/`originMyth` sont marqués INFERRED,
 * et pourtant le pilier est servi scoré 17,4 sans le moindre signal — un lecteur
 * ne peut pas distinguer un socle réel d'un socle généré.
 *
 * Deux invariants tenus ici :
 *   1. **`null` n'est pas 0.** Un pilier sans provenance tracée rend
 *      `declaredRatio: null` (« non tracé »), jamais 0 — qui se lirait « tout est
 *      inféré » et serait un mensonge sur des piliers antérieurs au garde.
 *   2. **Compter n'est pas noter.** Cette fonction n'entre pas dans le score :
 *      `scoring.ts` est le canon FIGÉ d'une complétude structurelle (ADR-0102).
 *      Pondérer le score par la provenance est un changement de doctrine —
 *      décision opérateur + ADR, jamais un effet de bord d'un affichage.
 */

import { describe, expect, it } from "vitest";
import { computeProvenanceBreakdown } from "@/domain/field-provenance";

describe("computeProvenanceBreakdown", () => {
  it("« non tracé » se dit null, jamais 0", () => {
    for (const empty of [null, undefined, {}, "nope", 42, []]) {
      const b = computeProvenanceBreakdown(empty);
      expect(b.declaredRatio).toBeNull();
      expect(b.tracked).toBe(0);
      expect(b.inferredFields).toEqual([]);
    }
  });

  it("compte le déclaré (HUMAN + SOURCE) contre l'inféré", () => {
    const b = computeProvenanceBreakdown({
      nomMarque: "HUMAN",
      secteur: "SOURCE",
      doctrine: "INFERRED",
      prophecy: "INFERRED",
    });
    expect(b.tracked).toBe(4);
    expect(b.counts).toEqual({ HUMAN: 1, SOURCE: 1, INFERRED: 2, UNKNOWN: 0 });
    expect(b.declaredRatio).toBe(0.5);
  });

  it("nomme les champs inférés — c'est la liste de travail de l'opérateur", () => {
    const b = computeProvenanceBreakdown({
      prophecy: "INFERRED",
      doctrine: "INFERRED",
      originMyth: "INFERRED",
      nomMarque: "HUMAN",
    });
    // Triés : une sortie stable est diffable d'un run à l'autre.
    expect(b.inferredFields).toEqual(["doctrine", "originMyth", "prophecy"]);
  });

  it("un socle entièrement généré est visible comme tel (ratio 0, pas null)", () => {
    const b = computeProvenanceBreakdown({ a: "INFERRED", b: "INFERRED" });
    expect(b.declaredRatio).toBe(0);
    expect(b.tracked).toBe(2);
  });

  it("une valeur de provenance inconnue tombe en UNKNOWN sans jeter", () => {
    const b = computeProvenanceBreakdown({ x: "N'IMPORTE_QUOI", y: null, z: "HUMAN" });
    expect(b.counts.UNKNOWN).toBe(2);
    expect(b.counts.HUMAN).toBe(1);
    // UNKNOWN n'est pas du déclaré : 1 déclaré sur 3 tracés.
    expect(b.declaredRatio).toBeCloseTo(1 / 3);
  });
});
