/**
 * Phase 4 — « la profondeur nourrit le RTIS ». L'ancien `slice(8000)` coupait la
 * QUEUE du JSON pilier → un ADVE rempli en profondeur (matrice `produitsCatalogue`)
 * arrivait AMPUTÉ à la dérivation R/T/I/S. La projection profondeur-préservante ne
 * coupe QUE la prose longue par feuille et garde TOUTE l'arborescence.
 */
import { describe, it, expect } from "vitest";
import { projectForContext, serializePillar } from "@/server/services/mestor/rtis-cascade";

describe("projectForContext — prose capée, structure intacte", () => {
  it("cape une string longue (feuille), garde les courtes", () => {
    expect((projectForContext("x".repeat(600), 400) as string).length).toBe(401); // 400 + "…"
    expect(projectForContext("court", 400)).toBe("court");
  });
  it("garde TOUS les items de tableau + l'arborescence imbriquée", () => {
    const v = { arr: [{ a: "1" }, { a: "2" }, { a: "3" }], nested: { x: { y: "z" } } };
    const p = projectForContext(v, 400) as { arr: unknown[]; nested: { x: { y: string } } };
    expect(p.arr).toHaveLength(3);
    expect(p.nested.x.y).toBe("z");
  });
  it("scalaires non-string inchangés", () => {
    expect(projectForContext(42, 400)).toBe(42);
    expect(projectForContext(true, 400)).toBe(true);
    expect(projectForContext(null, 400)).toBe(null);
  });
});

describe("serializePillar — la matrice profonde n'est plus tronquée (Phase 4)", () => {
  it("garde TOUS les produits d'un gros catalogue (l'ex-cap 8000 coupait la queue)", () => {
    const produitsCatalogue = Array.from({ length: 12 }, (_, i) => ({
      nom: `Produit-${i}`,
      longProse: "détail ".repeat(120), // ~840 chars/item → total brut > 8000
      gainClientConcret: `gain ${i}`,
    }));
    const raw = JSON.stringify({ produitsCatalogue }, null, 2);
    expect(raw.length).toBeGreaterThan(8000); // l'ancien cap l'aurait tronqué

    const out = serializePillar("v", { produitsCatalogue });
    // TOUS les produits survivent (aucune queue coupée) — c'est LA garantie Phase 4
    for (let i = 0; i < 12; i++) expect(out, `Produit-${i} manquant`).toContain(`Produit-${i}`);
    expect(out).toContain("gain 11"); // cellule courte du dernier item intacte
    expect(out).toContain("…"); // prose longue capée
  });

  it("pilier vide/non-objet → placeholder honnête", () => {
    expect(serializePillar("v", null)).toContain("Vide");
    expect(serializePillar("v", "texte")).toContain("Vide");
  });
});
