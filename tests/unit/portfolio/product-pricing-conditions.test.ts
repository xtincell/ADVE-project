import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProduitsCatalogueCard } from "@/components/cockpit/field-renderers";
import { PillarVFields } from "@/components/cockpit/pillars/pillar-v-fields";
import { findEmptyArrayCellPaths, isNonFabricableLeaf } from "@/lib/types/pillar-maturity-contracts";
import { mapPropositionValeur } from "@/server/services/strategy-presentation/section-mappers";
import { cataloguePriceLabel, catalogueReferencePrice } from "@/domain/product-catalog";
import { StructuredFieldControl } from "@/components/shared/smart-field-editor";
import { PillarVSchema } from "@/lib/types/pillar-schemas";

const queries = vi.hoisted(() => ({ strategy: vi.fn(), pillars: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {
  strategy: { findUniqueOrThrow: queries.strategy },
  pillar: { findMany: queries.pillars },
} }));

import { generateBudgetPlan } from "@/server/services/budget-allocator";
import { validateCrossReferences } from "@/server/services/cross-validator";

const conditions = "2 500 FCFA HT/mois (2 950 TTC) ; 25 000 FCFA HT/an (29 500 TTC). Offre prévue, publication non reçue.";
const product = {
  nom: "Accès numérique", categorie: "ABONNEMENT", conditionsTarifaires: conditions,
  gainClientConcret: "Accès au service", gainClientAbstrait: "Liberté de découverte",
  lienPromesse: "Découvrir selon son goût", segmentCible: "Mangeurs mobiles",
  phaseLifecycle: "LAUNCH", canalDistribution: ["WEBSITE"],
};

function planFixture(produitsCatalogue: unknown[]) {
  queries.strategy.mockResolvedValue({
    businessContext: {}, client: { sector: "services", country: "CI" },
    drivers: [{ channel: "INSTAGRAM", name: "Découverte", category: "DIGITAL" }],
    pillars: [{ key: "v", content: { produitsCatalogue, unitEconomics: { budgetCom: 100000 } } }],
  });
}

beforeEach(() => vi.clearAllMocks());

describe("Conditions tarifaires du catalogue — contrats de lecture", () => {
  it("conserve périodes, bases fiscales et réserve de publication dans le schéma", () => {
    const parsed = PillarVSchema.shape.produitsCatalogue.element.parse(product);
    expect(parsed).toHaveProperty("conditionsTarifaires", conditions);
    expect(parsed.prix).toBeUndefined();
  });

  it("refuse une condition tarifaire structurée mal typée au lieu de l'effacer", () => {
    expect(PillarVSchema.shape.produitsCatalogue.element.safeParse({ ...product, conditionsTarifaires: 2500 }).success).toBe(false);
  });

  it("affiche les conditions complètes dans le volet et la carte partagée", () => {
    for (const html of [
      renderToStaticMarkup(createElement(PillarVFields, { content: { produitsCatalogue: [product] }, certainty: null })),
      renderToStaticMarkup(createElement(ProduitsCatalogueCard, { produits: [product] })),
    ]) {
      expect(html).toContain("2 500 FCFA HT/mois");
      expect(html).toContain("25 000 FCFA HT/an");
      expect(html).toContain("publication non reçue");
      expect(html).not.toContain("NaN");
    }
  });

  it("rend le gratuit visible dans la carte partagée", () => {
    expect(renderToStaticMarkup(createElement(ProduitsCatalogueCard, { produits: [{ nom: "Libre", prix: 0 }] }))).toContain("Gratuit");
  });

  it("garde le libellé historique sans fabriquer un nombre ni une devise", () => {
    const html = renderToStaticMarkup(createElement(ProduitsCatalogueCard, { produits: [{ nom: "Gold", prix: "2 500 FCFA/mois · 25 000 FCFA/an" }] }));
    expect(html).toContain("2 500 FCFA/mois · 25 000 FCFA/an");
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("XAF");
  });
});

describe("Les conditions ne sont pas un panier moyen ni une preuve de rentabilité", () => {
  it("laisse CA et ROAS inconnus pour un abonnement avec deux périodes", async () => {
    planFixture([{ ...product, prix: 2500 }]);
    const plan = await generateBudgetPlan("fixture");
    expect(plan.kpiProjections.estimatedRevenue).toBeNull();
    expect(plan.kpiProjections.estimatedRoas).toBeNull();
    expect(plan.warnings.join(" ")).toMatch(/panier|ticket/i);
    expect(plan.phases.flatMap(p => p.kpis).filter(k => k.metric === "Panier moyen")).toEqual([]);
  });

  it("ne remplace pas un catalogue absent par un ticket de 10 000", async () => {
    planFixture([]);
    const plan = await generateBudgetPlan("fixture");
    expect(plan.kpiProjections.estimatedRevenue).toBeNull();
    expect(plan.kpiProjections.estimatedRoas).toBeNull();
  });

  it("ne moyenne pas sans pondération des offres à 15 000 et 65 000", async () => {
    planFixture([{ prix: 15000 }, { prix: 65000 }]);
    expect((await generateBudgetPlan("fixture")).kpiProjections.estimatedRevenue).toBeNull();
  });

  it("ne compare pas le CAC au premier montant d'une offre conditionnelle", async () => {
    queries.pillars.mockResolvedValue([{ key: "v", content: { produitsCatalogue: [{ ...product, prix: 2500 }], unitEconomics: { cac: 120 } } }]);
    const check = (await validateCrossReferences("fixture")).find(r => r.ruleId === 18);
    expect(check?.status).toBe("SKIPPED");
    expect(check?.message).toMatch(/condition|comparab|panier/i);
  });
});


describe("Conditions déclarées — garde anti-fabrication et lecteurs dérivés", () => {
  it("ne propose pas de fabriquer les conditions manquantes des offres et gammes", () => {
    const cells = findEmptyArrayCellPaths("v", { produitsCatalogue: [{ nom: "Libre" }], productLadder: [{ tier: "Libre" }] });
    expect(cells.some(c => c.path.endsWith("conditionsTarifaires"))).toBe(false);
    expect(isNonFabricableLeaf({ path: "produitsCatalogue[0].conditionsTarifaires", topKey: "produitsCatalogue", scalarKind: "string" })).toBe(true);
    expect(cells.some(c => c.path.endsWith("gainClientConcret"))).toBe(true);
  });

  it("propage les conditions à la présentation sans perdre mensuel, annuel ou réserve", () => {
    for (const content of [{ produitsCatalogue: [product] }, { productLadder: [{ tier: "Premium", conditionsTarifaires: conditions }] }]) {
      const mapped = mapPropositionValeur({ pillars: [{ key: "v", content }] });
      expect(mapped.pricing?.ladderDescription).toContain(conditions);
      expect(mapped.pricing?.ladderDescription).not.toContain("NaN");
    }
  });

  it("écarte les références ambiguës et conserve une référence simple sans moyenne", () => {
    for (const catalogue of [null, [], [{}], [{ prix: "2500" }], [{ prix: -1 }], [{ prix: NaN }], [{ prix: Infinity }], [{ prix: 2500, conditionsTarifaires: "" }], [{ prix: 2500, conditionsTarifaires: 2500 }], [{ prix: 2500 }, { prix: 5000 }]]) {
      expect(catalogueReferencePrice(catalogue)).toBeNull();
    }
    expect(catalogueReferencePrice([{ prix: 2500 }, { prix: 2500 }])).toBe(2500);
    expect(catalogueReferencePrice([{ prix: 0 }])).toBe(0);
    expect(cataloguePriceLabel({ prix: 0 })).toBe("Gratuit");
    expect(cataloguePriceLabel({ prix: 2500, conditionsTarifaires: "" })).toBe("Conditions tarifaires à vérifier");
  });
});


describe("La gamme relit les conditions du socle produit", () => {
  it("le volet et la présentation suivent le catalogue malgré un ancien prix de gamme", () => {
    const content = {
      produitsCatalogue: [{ ...product, id: "premium" }],
      productLadder: [{ tier: "Premium", produitIds: ["premium"], prix: 999, conditionsTarifaires: "Ancienne copie périmée", cible: "Mangeurs mobiles", description: "Accès", position: 1 }],
    };
    const html = renderToStaticMarkup(createElement(PillarVFields, { content, certainty: null }));
    const mapped = mapPropositionValeur({ pillars: [{ key: "v", content }] });
    expect(html.match(/2 500 FCFA HT\/mois/g)).toHaveLength(2);
    expect(html).not.toContain("Ancienne copie périmée");
    expect(mapped.pricing?.ladderDescription).toContain(conditions);
    expect(mapped.pricing?.ladderDescription).not.toContain("Ancienne copie périmée");
  });

  it("ne masque pas une référence cassée derrière le prix de gamme", () => {
    const mapped = mapPropositionValeur({ pillars: [{ key: "v", content: { produitsCatalogue: [product], productLadder: [{ tier: "Premium", produitIds: ["absent"], prix: 999 }] } }] });
    expect(mapped.pricing?.ladderDescription).toContain("introuvable");
    expect(mapped.pricing?.ladderDescription).not.toContain("999");
  });

  it("signale aussi les références présentes mais mal formées sans réutiliser l'ancien prix", () => {
    for (const produitIds of [null, "absent", [], [42]]) {
      const mapped = mapPropositionValeur({ pillars: [{ key: "v", content: { produitsCatalogue: [product], productLadder: [{ tier: "Premium", produitIds, prix: 999 }] } }] });
      expect(mapped.pricing?.ladderDescription).toContain("Références produit à vérifier");
      expect(mapped.pricing?.ladderDescription).not.toContain("999");
    }
  });
});


describe("Les références de gamme restent réparables manuellement", () => {
  it("rend le nom libre, le produit référencé et le cinquième rang valides dans le schéma", () => {
    const tier = { tier: "Libre professionnel", produitIds: ["libre"], cible: "Restaurateurs", description: "Accès libre", position: 5 };
    expect(PillarVSchema.shape.productLadder.element.safeParse(tier).success).toBe(true);
    const html = renderToStaticMarkup(createElement(StructuredFieldControl, { pillarKey: "v", fieldKey: "productLadder", value: [tier], onChange: () => {} }));
    expect(html).toContain('value="libre"');
    expect(html).not.toContain('max="4"');
    expect(html).toMatch(/<input type="text"[^>]*value="Libre professionnel"/);
    expect(html).not.toContain("Prix"); // Le tarif se modifie dans son produit canonique.
  });
});
