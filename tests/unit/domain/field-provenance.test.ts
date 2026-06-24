/**
 * FieldProvenance — règle de précédence HUMAIN > SOURCE > INFÉRÉ.
 *
 * Verrouille l'invariant opérateur : l'inféré ne peut jamais écraser une valeur
 * humaine ou sourcée ; une source contredisant l'humain part en arbitrage
 * (CHALLENGE), jamais en écriture silencieuse.
 */

import { describe, expect, it } from "vitest";
import {
  FIELD_PROVENANCE_LEVELS,
  provenanceRank,
  coerceProvenance,
  decideOverwrite,
  isFieldProvenance,
} from "@/domain/field-provenance";

describe("FieldProvenance — échelle d'autorité", () => {
  it("ordonne HUMAN > SOURCE > INFERRED > UNKNOWN", () => {
    expect(provenanceRank("HUMAN")).toBeGreaterThan(provenanceRank("SOURCE"));
    expect(provenanceRank("SOURCE")).toBeGreaterThan(provenanceRank("INFERRED"));
    expect(provenanceRank("INFERRED")).toBeGreaterThan(provenanceRank("UNKNOWN"));
  });

  it("coerce les valeurs inconnues/legacy en UNKNOWN", () => {
    expect(coerceProvenance("HUMAN")).toBe("HUMAN");
    expect(coerceProvenance("OFFICIAL")).toBe("UNKNOWN"); // vocab SourceCertainty ≠ provenance
    expect(coerceProvenance(undefined)).toBe("UNKNOWN");
    expect(coerceProvenance(null)).toBe("UNKNOWN");
  });

  it("isFieldProvenance ne reconnaît que les niveaux canon", () => {
    for (const lvl of FIELD_PROVENANCE_LEVELS) expect(isFieldProvenance(lvl)).toBe(true);
    expect(isFieldProvenance("DECLARED")).toBe(false);
    expect(isFieldProvenance("")).toBe(false);
  });
});

describe("decideOverwrite — qui peut écraser quoi", () => {
  it("champ vide/legacy (UNKNOWN) : tout écrit l'emporte", () => {
    expect(decideOverwrite("INFERRED", "UNKNOWN")).toBe("ALLOW");
    expect(decideOverwrite("SOURCE", "UNKNOWN")).toBe("ALLOW");
    expect(decideOverwrite("HUMAN", "UNKNOWN")).toBe("ALLOW");
  });

  it("HUMAN l'emporte toujours", () => {
    expect(decideOverwrite("HUMAN", "HUMAN")).toBe("ALLOW");
    expect(decideOverwrite("HUMAN", "SOURCE")).toBe("ALLOW");
    expect(decideOverwrite("HUMAN", "INFERRED")).toBe("ALLOW");
  });

  it("INFERRED ne peut JAMAIS écraser HUMAN ou SOURCE (DENY)", () => {
    expect(decideOverwrite("INFERRED", "HUMAN")).toBe("DENY");
    expect(decideOverwrite("INFERRED", "SOURCE")).toBe("DENY");
  });

  it("INFERRED peut rafraîchir un INFERRED", () => {
    expect(decideOverwrite("INFERRED", "INFERRED")).toBe("ALLOW");
  });

  it("SOURCE contredisant un HUMAN → CHALLENGE (arbitrage, jamais silencieux)", () => {
    expect(decideOverwrite("SOURCE", "HUMAN")).toBe("CHALLENGE");
  });

  it("SOURCE peut corriger un INFERRED et rafraîchir un SOURCE", () => {
    expect(decideOverwrite("SOURCE", "INFERRED")).toBe("ALLOW");
    expect(decideOverwrite("SOURCE", "SOURCE")).toBe("ALLOW");
  });

  it("aucune combinaison ne renvoie une décision hors {ALLOW,CHALLENGE,DENY}", () => {
    for (const incoming of FIELD_PROVENANCE_LEVELS) {
      for (const existing of FIELD_PROVENANCE_LEVELS) {
        expect(["ALLOW", "CHALLENGE", "DENY"]).toContain(decideOverwrite(incoming, existing));
      }
    }
  });
});
