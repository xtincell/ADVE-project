/**
 * canon-conformance — la loi « pas de corruption de forme dans un canon seed » (ADR-0172).
 *
 * Le gate anti-corruption (pillar-conformance) classe les divergences au schéma strict :
 * SHAPE (un objet/tableau attendu là où on reçoit un scalaire — casse le rendu) est la
 * SEULE classe bloquante ; enum FR non-canonique / placeholder / champ manquant sont des
 * advisories DRAFT tolérés (les forcer fabriquerait — interdit NEFER n°3).
 *
 * Cette suite verrouille : (1) les 4 canons seed n'ont AUCUNE corruption de forme sur
 * A→I (S est computed, exclu) ; (2) le classifieur distingue bien SHAPE vs advisory ;
 * (3) le gate `assertPillarConforms` jette sur une vraie corruption.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { MOTION19_CANON_PILLARS } from "@/server/services/canon/motion19-canon";
import { SPAWT_CANON_PILLARS } from "@/server/services/canon/spawt-canon";
import { UPGRADERS_CANON_PILLARS } from "@/server/services/canon/upgraders-canon";
import { LAFUSEE_CANON_PILLARS } from "@/server/services/canon/lafusee-canon";
import {
  classifyPillarConformance,
  classifyConformanceError,
  assertPillarConforms,
} from "@/lib/types/pillar-conformance";
import { validatePillarContent, type PillarKey } from "@/lib/types/pillar-schemas";

const CANONS = {
  motion19: MOTION19_CANON_PILLARS,
  spawt: SPAWT_CANON_PILLARS,
  upgraders: UPGRADERS_CANON_PILLARS,
  lafusee: LAFUSEE_CANON_PILLARS,
} as const;

describe("canon-conformance — zéro corruption de forme (SHAPE) sur les 4 canons seed", () => {
  for (const [name, pillars] of Object.entries(CANONS)) {
    for (const p of pillars) {
      // S inclus : les formes computed héritées sont couvertes par unions (F3 de la
      // revue adversariale — plus de SHAPE corruption S non gardée).
      const key = p.key.toUpperCase() as PillarKey;
      it(`${name}/${key} : aucune corruption de forme`, () => {
        const c = classifyPillarConformance(key, p.content);
        // Message d'échec lisible : liste les SHAPE si régression.
        expect(c.shape, c.shape.map((e) => `${e.path}: ${e.message}`).join(" | ")).toHaveLength(0);
      });
    }
  }
});

describe("canon-conformance — le classifieur distingue SHAPE vs advisory", () => {
  it("SHAPE : un objet/tableau attendu là où on reçoit un scalaire", () => {
    // objet attendu, string reçue
    expect(classifyConformanceError({ path: "x", message: "Invalid input: expected object, received string", code: "invalid_type", expected: "object" })).toBe("SHAPE");
    // tableau attendu, string reçue
    expect(classifyConformanceError({ path: "x", message: "Invalid input: expected array, received string", code: "invalid_type", expected: "array" })).toBe("SHAPE");
    // union sans arme satisfaite
    expect(classifyConformanceError({ path: "x", message: "Invalid input", code: "invalid_union" })).toBe("SHAPE");
  });
  it("advisories : enum FR, placeholder numérique, longueur, champ manquant", () => {
    expect(classifyConformanceError({ path: "x", message: "Invalid option", code: "invalid_value" })).toBe("ENUM");
    expect(classifyConformanceError({ path: "x", message: "expected number, received string", code: "invalid_type", expected: "number" })).toBe("TYPE");
    expect(classifyConformanceError({ path: "x", message: "Le positionnement doit faire ≤200 caractères", code: "too_big" })).toBe("LENGTH");
    expect(classifyConformanceError({ path: "x", message: "Invalid input: expected string, received undefined", code: "invalid_type", expected: "string" })).toBe("MISSING");
  });
});

describe("canon-conformance — le gate jette sur une vraie corruption de forme", () => {
  it("assertPillarConforms throw quand un scalaire remplace un objet requis", () => {
    // pilier A : sousPromesses est en D ; on corrompt `ikigai` (objet requis) en string.
    const corrupt = { ...(MOTION19_CANON_PILLARS.find((p) => p.key === "a")!.content as object), ikigai: "pas un objet" };
    expect(() => assertPillarConforms("A", corrupt, "test")).toThrow(/corruption\(s\) structurelle/);
  });
  it("assertPillarConforms ne jette PAS sur une forme compacte légitime (union ADR-0168)", () => {
    // `taboos` accepte string[] OU objet[] ; une liste de phrases est valide.
    const c = classifyPillarConformance("E", { ...(MOTION19_CANON_PILLARS.find((p) => p.key === "e")!.content as object) });
    expect(c.shape).toHaveLength(0);
  });
});

describe("canon-conformance — validatePillarContent expose code/expected (classification robuste)", () => {
  it("les erreurs portent un code Zod exploitable", () => {
    const schema = z.object({ n: z.number() });
    const r = schema.safeParse({ n: "x" });
    expect(r.success).toBe(false);
    // sanity : le pilier expose bien code+expected pour la classification.
    const res = validatePillarContent("A", { archetype: "Sage" }); // manque des requis
    expect(res.success).toBe(false);
    expect(res.errors?.some((e) => e.code)).toBe(true);
  });
});
