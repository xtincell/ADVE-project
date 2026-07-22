/**
 * setNestedValue — l'applicateur de dot-path du gateway (C5) doit indexer les
 * tableaux (`personas[0].name`), pas créer une clé littérale. Régression audit ADVE.
 */
import { describe, it, expect } from "vitest";
import { setNestedValue, tokenizePillarPath } from "@/server/services/pillar-gateway";

describe("tokenizePillarPath", () => {
  it("clé simple / imbriquée / index de tableau", () => {
    expect(tokenizePillarPath("nomMarque")).toEqual(["nomMarque"]);
    expect(tokenizePillarPath("originMyth.elevator")).toEqual(["originMyth", "elevator"]);
    expect(tokenizePillarPath("personas[0].name")).toEqual(["personas", 0, "name"]);
    expect(tokenizePillarPath("matrix[2][1].v")).toEqual(["matrix", 2, 1, "v"]);
  });
});

describe("setNestedValue — indexation de tableau (fix corruption)", () => {
  it("indexe un tableau existant au lieu de créer une clé littérale", () => {
    const obj: Record<string, unknown> = { personas: [{ name: "old", rank: 1 }] };
    setNestedValue(obj, "personas[0].name", "new");
    expect((obj.personas as { name: string }[])[0]!.name).toBe("new");
    // PAS de clé parasite « personas[0] ».
    expect(obj["personas[0]"]).toBeUndefined();
  });
  it("crée un tableau quand le token suivant est un index", () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, "items[0].label", "x");
    expect(Array.isArray(obj.items)).toBe(true);
    expect((obj.items as { label: string }[])[0]!.label).toBe("x");
  });
  it("clé simple + objet imbriqué inchangés (non-régression)", () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, "nomMarque", "Motion19");
    setNestedValue(obj, "originMyth.elevator", "né en 2021");
    expect(obj.nomMarque).toBe("Motion19");
    expect((obj.originMyth as { elevator: string }).elevator).toBe("né en 2021");
  });
});
