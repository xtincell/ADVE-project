/**
 * Régressions issues de la revue adversariale du chantier « La Fusée compile » (2026-07-22).
 * Verrouille les correctifs : effondrement des actions string, faux-négatif scalaire-dans-record.
 */
import { describe, it, expect } from "vitest";
import { normalizeInitiative, collectNormalizedInitiatives } from "@/lib/types/pillar-schemas";
import { classifyConformanceError, classifyPillarConformance } from "@/lib/types/pillar-conformance";

describe("adversarial — normalizeInitiative tolère la forme compacte (chaîne)", () => {
  it("un item chaîne devient {action: chaîne} (pas {} qui s'effondre)", () => {
    expect(normalizeInitiative("Regarder un guide Academy").action).toBe("Regarder un guide Academy");
  });
  it("des actions string distinctes NE s'effondrent PAS sur un même id vide", () => {
    const list = collectNormalizedInitiatives({ actionsByDevotionLevel: { SPECTATEUR: ["Action A", "Action B"] } });
    expect(list.length).toBe(2);
    expect(new Set(list.map((i) => i.id)).size).toBe(2); // 2 ids distincts, pas 1
  });
});

describe("adversarial — classifieur attrape scalaire-dans-record (F1)", () => {
  it("expected record, received string → SHAPE (bloquant), pas TYPE toléré", () => {
    expect(classifyConformanceError({ path: "x", message: "Invalid input: expected record, received string", code: "invalid_type", expected: "record" })).toBe("SHAPE");
    expect(classifyConformanceError({ path: "x", message: "expected map, received number", code: "invalid_type", expected: "map" })).toBe("SHAPE");
  });
});

/**
 * Round 2 (audit adversarial « TOUT » 2026-07-22) — le gate ne bloque plus la donnée
 * DRAFT valide (invalid_union classé par type reçu) et le normaliseur coerce dans les armes.
 */
describe("adversarial round 2 — invalid_union classé par type RÉEL reçu (E1)", () => {
  it("scalaire dans un union number|objet (charismaScore « 8/10 ») → PAS SHAPE (advisory, rend)", () => {
    const c = classifyPillarConformance("A", { messieFondateur: { charismaScore: "8/10" } });
    // Le placeholder scalaire ne casse pas le rendu → jamais dans SHAPE (bloquant).
    expect(c.shape.some((e) => e.path.includes("charismaScore"))).toBe(false);
  });
  it("le normaliseur coerce une valeur d'union coercible (« 8 » → 8, plus aucune erreur)", () => {
    const c = classifyPillarConformance("A", { messieFondateur: { charismaScore: "8" } });
    expect(c.all.some((e) => e.path.includes("charismaScore"))).toBe(false);
  });
  it("un CONTENEUR non conforme dans un union (array pour number|objet) reste SHAPE (bloquant)", () => {
    const c = classifyPillarConformance("A", { messieFondateur: { charismaScore: [1, 2, 3] } });
    expect(c.shape.some((e) => e.path.includes("charismaScore"))).toBe(true);
  });
});
