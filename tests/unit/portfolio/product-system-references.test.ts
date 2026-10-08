import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PillarVFields } from "@/components/cockpit/pillars/pillar-v-fields";
import { resolveProductRef } from "@/domain/product-catalog";

const catalogue = [{ id: "offre-1", nom: "Découverte libre" }, { id: "offre-2", nom: "Découverte approfondie" }];
const system = {
  coreConcept: "Explorer selon ses goûts",
  anchorProductIds: ["offre-1"],
  axes: [{ label: "Local ↔ Ailleurs" }],
  archetypes: [{ name: "Explorateur", relatedProductIds: ["offre-2"] }],
  progressionStages: [{ name: "Débutant" }],
  modes: [{ name: "Découverte", relatedProductIds: ["offre-1"] }],
  artifacts: [{ name: "Titre", relatedProductIds: ["offre-2"] }],
  mechanics: [{ name: "Règle", rule: "La qualité prime." }],
};
function render(productSystem: object, products = catalogue, origin?: string) {
  const html = renderToStaticMarkup(createElement(PillarVFields, { content: {
    produitsCatalogue: products, productSystem,
    ...(origin ? { _fieldProvenance: { productSystem: origin } } : {}),
  }, certainty: null }));
  return html.slice(html.indexOf('class="ck-v-psys"'), html.indexOf('Économie &amp; valeur'));
}

describe("Les relations produit parlent le langage du catalogue", () => {
  it("rend les noms actuels sans réécrire les ids ni le système source", () => {
    const before = structuredClone(system);
    const html = render(system, [{ id: "offre-1", nom: "Libre renommé" }, catalogue[1]!]);
    expect(html).toContain("Libre renommé");
    expect(html).toContain("Découverte approfondie");
    expect(html).not.toContain("offre-1");
    expect(html).not.toContain("offre-2");
    expect(system).toEqual(before);
  });
  it("signale un produit retiré ou ambigu sans choisir le premier homonyme", () => {
    const html = render({ anchorProductIds: ["absent", "Commun"] }, [
      { id: "a", nom: "Commun" }, { id: "b", nom: "Commun" },
    ]);
    expect(html).toContain("Offre à vérifier");
    expect(html).not.toContain(">Commun<");
    expect(html).not.toContain("absent");
  });
  it("relaie l'origine du champ dans ses six dimensions, sans promotion humaine", () => {
    const html = render(system, catalogue, "INFERRED");
    expect(html.match(/Inféré IA/g)).toHaveLength(6);
    expect(html).not.toContain("Origine inconnue");
    expect(html).not.toContain("Déclaré");
    expect(html).not.toContain("Saisi par l");
  });
  it("garde une origine inconnue en l'absence de trace", () => {
    expect(render(system)).toContain("Origine inconnue");
  });
  it("préserve les anciennes règles compactes plutôt que de les convertir en lettres", () => {
    expect(render({ mechanics: ["Une règle historique intacte", null] })).toContain("Une règle historique intacte");
  });
  it("résout un id acquis avant un nom, mais refuse toute ambiguïté de nom ou slug", () => {
    const products = [{ id: "acquis", nom: "Commun" }, { id: "autre", nom: "Commun" },
      { id: "homonyme", nom: "acquis" }];
    expect(resolveProductRef(products, "acquis")?.id).toBe("acquis");
    for (const rows of [products, [...products].reverse()])
      expect(resolveProductRef(rows, "Commun")).toBeNull();
    expect(resolveProductRef([{ nom: "Côte d’or" }, { nom: "Cote d’or" }], "cote-d-or")).toBeNull();
    expect(resolveProductRef([{ id: "same" }, { id: "same" }], "same")).toBeNull();
  });
});
