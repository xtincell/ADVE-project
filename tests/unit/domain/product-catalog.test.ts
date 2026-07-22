/**
 * product-catalog — intégrité du socle produit (ADR-0171).
 *
 * Prouve : les ids sont stables (backfill déterministe, jamais d'écrasement) ;
 * la résolution est tolérante (id OU nom — marche sur les catalogues sans id) ;
 * les références fantômes (gammes/persona×segment/système) sont détectées.
 */
import { describe, it, expect } from "vitest";
import {
  productSlug,
  ensureProductIds,
  resolveProductRef,
  danglingProductRefs,
} from "@/domain/product-catalog";

const CATALOGUE = [
  { nom: "Caméra RX-100", categorie: "PHOTO" },
  { id: "kit-podcast", nom: "Kit Podcast", categorie: "AUDIO" },
  { nom: "Caméra RX-100", categorie: "PHOTO" }, // homonyme → dédup id
];

describe("product-catalog — ids stables & résolution", () => {
  it("productSlug est déterministe et ascii-kebab", () => {
    expect(productSlug("Caméra RX-100")).toBe("camera-rx-100");
    expect(productSlug("  ")).toBe("produit");
  });

  it("ensureProductIds backfill sans écraser + dédup les homonymes", () => {
    const withIds = ensureProductIds(CATALOGUE);
    expect(withIds[1]!.id).toBe("kit-podcast"); // id existant préservé
    expect(withIds[0]!.id).toBe("camera-rx-100");
    expect(withIds[2]!.id).toBe("camera-rx-100-2"); // homonyme dédupliqué
    // idempotent : re-passer ne change rien.
    expect(ensureProductIds(withIds)).toEqual(withIds);
  });

  it("resolveProductRef résout par id, par nom, par slug (tolérant)", () => {
    expect(resolveProductRef(CATALOGUE, "kit-podcast")?.nom).toBe("Kit Podcast"); // par id
    expect(resolveProductRef(CATALOGUE, "Caméra RX-100")?.categorie).toBe("PHOTO"); // par nom
    expect(resolveProductRef(CATALOGUE, "camera-rx-100")?.categorie).toBe("PHOTO"); // par slug
    expect(resolveProductRef(CATALOGUE, "Produit fantôme")).toBeNull();
  });
});

describe("product-catalog — détection des références fantômes", () => {
  it("gammes/persona×segment/système : détecte les refs qui ne résolvent pas", () => {
    const v = {
      produitsCatalogue: CATALOGUE,
      productLadder: [{ tier: "COEUR", produitIds: ["kit-podcast", "produit-inexistant"] }],
      personaSegmentMap: [{ personaName: "Créateur", productNames: ["Caméra RX-100", "Fantôme"] }],
      productSystem: {
        anchorProductIds: ["Kit Podcast"],
        modes: [{ name: "Studio", relatedProductIds: ["kit-podcast"] }],
        artifacts: [{ name: "Badge", relatedProductIds: ["objet-mort"] }],
      },
    };
    const dangling = danglingProductRefs(v);
    const refs = dangling.map((d) => d.ref);
    expect(refs).toContain("produit-inexistant"); // ladder
    expect(refs).toContain("Fantôme"); // personaSegmentMap
    expect(refs).toContain("objet-mort"); // productSystem.artifacts
    // les refs valides ne sont PAS signalées.
    expect(refs).not.toContain("kit-podcast");
    expect(refs).not.toContain("Kit Podcast");
    expect(refs).not.toContain("Caméra RX-100");
    expect(dangling.length).toBe(3);
  });

  it("catalogue vide → aucune fausse alerte", () => {
    expect(danglingProductRefs({ productLadder: [{ produitIds: ["x"] }] })).toEqual([
      { source: "productLadder[0].produitIds", ref: "x" },
    ]);
    expect(danglingProductRefs(null)).toEqual([]);
  });
});
