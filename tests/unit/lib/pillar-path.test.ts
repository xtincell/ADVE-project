/**
 * pillar-path — la mécanique de chemin ADVE profonde, unifiée (Phase 0 du
 * chantier « remplissage profond »). L'assessor lisait en `split(".")`
 * object-only : aveugle aux cellules de matrice (`produitsCatalogue[2].nom`).
 * `resolvePillarPath` + `getNestedArray` sont la lecture array-index-aware
 * partagée. L'écriture (`setNestedValue`) reste couverte par les tests du
 * gateway (re-export) — ici on prouve la LECTURE profonde.
 */
import { describe, it, expect } from "vitest";
import { resolvePillarPath, getNestedArray, setNestedValue } from "@/lib/pillar-path";

describe("resolvePillarPath — lecture profonde (dot-path + index de tableau)", () => {
  const content: Record<string, unknown> = {
    nomMarque: "Motion19",
    originMyth: { elevator: "né en 2021" },
    produitsCatalogue: [
      { nom: "Cabine A", gainClientConcret: "gagne du temps" },
      { nom: "Cabine B" },
    ],
    gamification: { niveaux: [{ recompense: "badge" }, { recompense: "trophée" }] },
  };

  it("résout une clé simple", () => {
    expect(resolvePillarPath(content, "nomMarque")).toBe("Motion19");
  });
  it("résout un objet imbriqué", () => {
    expect(resolvePillarPath(content, "originMyth.elevator")).toBe("né en 2021");
  });
  it("résout une cellule de matrice (index de tableau + feuille) — le débloqueur", () => {
    expect(resolvePillarPath(content, "produitsCatalogue[0].gainClientConcret")).toBe("gagne du temps");
    expect(resolvePillarPath(content, "produitsCatalogue[1].nom")).toBe("Cabine B");
  });
  it("résout une feuille imbriquée dans un tableau imbriqué dans un objet", () => {
    expect(resolvePillarPath(content, "gamification.niveaux[1].recompense")).toBe("trophée");
  });
  it("retourne undefined quand une cellule manque (pas de crash)", () => {
    expect(resolvePillarPath(content, "produitsCatalogue[1].gainClientConcret")).toBeUndefined();
    expect(resolvePillarPath(content, "produitsCatalogue[9].nom")).toBeUndefined();
    expect(resolvePillarPath(content, "absent.chemin.profond")).toBeUndefined();
  });
  it("retourne le tableau entier quand le chemin s'arrête dessus", () => {
    expect(resolvePillarPath(content, "produitsCatalogue")).toHaveLength(2);
  });
});

describe("getNestedArray — copie du tableau à un dot-path", () => {
  const content: Record<string, unknown> = {
    personas: [{ name: "Alex", jobsToBeDone: ["filmer", "monter"] }],
  };
  it("renvoie une COPIE du tableau top-level", () => {
    const arr = getNestedArray(content, "personas");
    expect(arr).toHaveLength(1);
    arr.push({ name: "X" });
    expect((content.personas as unknown[]).length).toBe(1); // copie, pas la ref
  });
  it("renvoie un tableau imbriqué dans un élément de tableau", () => {
    expect(getNestedArray(content, "personas[0].jobsToBeDone")).toEqual(["filmer", "monter"]);
  });
  it("renvoie [] quand absent ou non-tableau", () => {
    expect(getNestedArray(content, "absent")).toEqual([]);
    expect(getNestedArray(content, "personas[0].name")).toEqual([]); // scalaire → []
  });
});

describe("aller-retour write→read profond (cohérence set/resolve)", () => {
  it("écrit puis relit une cellule de matrice créée de zéro", () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, "produitsCatalogue[0].nom", "Cabine A");
    setNestedValue(obj, "produitsCatalogue[0].gainClientConcret", "gain X");
    expect(resolvePillarPath(obj, "produitsCatalogue[0].nom")).toBe("Cabine A");
    expect(resolvePillarPath(obj, "produitsCatalogue[0].gainClientConcret")).toBe("gain X");
    expect(Array.isArray(obj.produitsCatalogue)).toBe(true);
  });
});
