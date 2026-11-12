/**
 * Historique des identités du catalogue (ADR-0205, amendement 568).
 *
 * Prouve : un identifiant retiré n'est jamais réattribué par ressemblance de nom
 * (slug) à un nouveau produit ; une référence à un produit retiré ne bascule pas
 * vers un homonyme ; l'historique des entrées, retraits, réintroductions et
 * renommages se lit depuis les versions archivées, avec l'écriture qui les a
 * produits, sans identité déduite ni attribution devinée.
 */
import { describe, it, expect } from "vitest";
import {
  catalogueIdentityHistory,
  ensureProductIds,
  rebindProductRefs,
  retiredCatalogueIdentities,
  type CatalogueArchive,
} from "@/domain/product-catalog";

const write = (n: number, extra: Partial<CatalogueArchive["write"]> = {}): CatalogueArchive["write"] => ({
  at: `2026-11-0${n}T10:00:00.000Z`, author: "OPERATOR:u1", reason: `Écriture ${n}`, intentId: `intent-${n}`,
  compensatedFrom: null, ...extra,
});

describe("identité d'un produit retiré", () => {
  it("ne réattribue pas l'identifiant d'un produit retiré à un nouvel homonyme", () => {
    const products = ensureProductIds<Record<string, unknown>>([{ nom: "Palais" }], [{ id: "autre", nom: "Autre" }], ["palais", "autre"]);
    expect(products[0]!.id).toBe("palais-2");
  });

  it("conserve un identifiant fourni explicitement, même réservé (le refus appartient à l'écrivain)", () => {
    const products = ensureProductIds<Record<string, unknown>>([{ id: "palais", nom: "Palais" }], [], ["palais"]);
    expect(products[0]!.id).toBe("palais");
  });

  it("recense les identités retirées et réserve tous les identifiants de l'historique", () => {
    const history = [[], [{ id: "palais", nom: "Palais" }, { id: "autre", nom: "Autre" }, { nom: "Sans id" }], [{ id: "autre", nom: "Autre renommé" }]];
    const current = [{ id: "autre", nom: "Autre renommé" }];
    const result = retiredCatalogueIdentities(history, current);
    expect([...result.reservedIds].sort()).toEqual(["autre", "palais"]);
    expect(result.retired).toEqual([{ id: "palais", nom: "Palais" }, { nom: "Sans id" }]);
  });

  it("ne rattache pas une référence au produit retiré, par id ou par nom, à un homonyme", () => {
    const previous = [{ id: "autre", nom: "Autre" }];
    const products = [{ id: "autre", nom: "Autre" }, { id: "palais-2", nom: "Palais" }];
    const content = {
      productLadder: [{ tier: "Gamme", produitIds: ["Palais", "palais", "Autre"] }],
      productSystem: { anchorProductIds: ["Palais"] },
    };
    const rebound = rebindProductRefs(content, previous, products, [{ id: "palais", nom: "Palais" }]);
    expect(rebound.productLadder).toEqual([{ tier: "Gamme", produitIds: ["Palais", "palais", "autre"] }]);
    expect(rebound.productSystem).toEqual({ anchorProductIds: ["Palais"] });
  });
});

describe("historique lisible du catalogue", () => {
  const a = { id: "a", nom: "Produit A" }, b = { id: "b", nom: "Produit B" };

  it("lit entrée, retrait, renommage et réintroduction avec l'écriture de chacun", () => {
    const archives: CatalogueArchive[] = [
      { version: 1, catalogue: undefined, write: write(1) },
      { version: 2, catalogue: [a, b], write: write(2) },
      { version: 3, catalogue: [a], write: write(3) },
      { version: 4, catalogue: [{ ...a, nom: "Produit A relu" }], write: write(4, { author: "OPERATOR:u2", intentId: "rollback", compensatedFrom: "intent-2" }) },
    ];
    const history = catalogueIdentityHistory(archives, { version: 5, catalogue: [{ ...a, nom: "Produit A relu" }, b] });
    expect(history.events).toEqual([
      { kind: "APPEARED", productId: "a", name: "Produit A", previousName: null, fromVersion: 1, toVersion: 2, write: write(1), proof: null },
      { kind: "APPEARED", productId: "b", name: "Produit B", previousName: null, fromVersion: 1, toVersion: 2, write: write(1), proof: null },
      { kind: "RETIRED", productId: "b", name: "Produit B", previousName: null, fromVersion: 2, toVersion: 3, write: write(2), proof: null },
      { kind: "RENAMED", productId: "a", name: "Produit A relu", previousName: "Produit A", fromVersion: 3, toVersion: 4, write: write(3), proof: null },
      { kind: "REINTRODUCED", productId: "b", name: "Produit B", previousName: "Produit B", fromVersion: 4, toVersion: 5,
        write: write(4, { author: "OPERATOR:u2", intentId: "rollback", compensatedFrom: "intent-2" }), proof: "RESTORATION" },
    ]);
    expect(history.retiredIds).toEqual([]);
    expect(history.unattributed).toEqual([]);
  });

  it("qualifie un identifiant réapparu sans restauration comme repris sans preuve", () => {
    const history = catalogueIdentityHistory([
      { version: 1, catalogue: [a], write: write(1) },
      { version: 2, catalogue: [], write: write(2) },
    ], { version: 3, catalogue: [{ id: "a", nom: "Homonyme" }] });
    expect(history.events.at(-1)).toMatchObject({ kind: "REINTRODUCED", productId: "a", name: "Homonyme", previousName: "Produit A", proof: "NONE" });
  });

  it("n'attribue aucune écriture quand une version manque ou se répète, et date la présence initiale sans l'inventer", () => {
    const history = catalogueIdentityHistory([
      { version: 3, catalogue: [a], write: write(3) },
      { version: 5, catalogue: [a, b], write: write(5) },
      { version: 5, catalogue: [a], write: write(6) },
    ], { version: 6, catalogue: [] });
    expect(history.events).toEqual([
      { kind: "APPEARED", productId: "a", name: "Produit A", previousName: null, fromVersion: null, toVersion: 3, write: null, proof: null },
      { kind: "APPEARED", productId: "b", name: "Produit B", previousName: null, fromVersion: 3, toVersion: 5, write: null, proof: null },
      { kind: "RETIRED", productId: "b", name: "Produit B", previousName: null, fromVersion: 5, toVersion: 5, write: null, proof: null },
      { kind: "RETIRED", productId: "a", name: "Produit A", previousName: null, fromVersion: 5, toVersion: 6, write: null, proof: null },
    ]);
    expect(history.unattributed).toEqual([{ fromVersion: 3, toVersion: 5 }, { fromVersion: 5, toVersion: 5 }, { fromVersion: 5, toVersion: 6 }]);
    expect(history.retiredIds).toEqual(["a", "b"]);
  });

  it("compte les produits sans identifiant sans les rapprocher par nom ni par position", () => {
    const history = catalogueIdentityHistory([
      { version: 1, catalogue: [{ nom: "Legacy" }], write: write(1) },
      { version: 2, catalogue: "forme inattendue", write: write(2) },
    ], { version: 3, catalogue: [{ nom: "Legacy" }, { id: " ", nom: "Blanc" }, a] });
    expect(history.events).toEqual([
      { kind: "APPEARED", productId: "a", name: "Produit A", previousName: null, fromVersion: 2, toVersion: 3, write: write(2), proof: null },
    ]);
    expect(history.unidentified).toEqual({ current: 2, archivedVersions: 1 });
  });
});
