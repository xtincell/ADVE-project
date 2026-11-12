import { FinancialWorkingModelSchema } from "@/domain/financial-document";

const amount = (value: number) => ({ value, qualification: "ASSUMPTION" as const,
  note: "Prémisse de recette ; aucune dépense ou vente observée.", sources: [] });

export const financialModelFixture = () => FinancialWorkingModelSchema.parse({
  schema: "adve-financial-working-model-v1", source: { sourceId: "financial-model-recipe", contentHash: "a".repeat(64) },
  breakEven: {
    schema: "adve-break-even-model-v1", title: "Modèle de recette", currency: "USD", period: "MONTH",
    scope: "Coûts inclus au scénario de fonctionnement, sans résultat observé.",
    payer: "Professionnels souscripteurs", payerPersonaId: "payer-fixture", unit: "abonnements actifs pendant un mois", taxBasis: "HT",
    price: amount(15000), fixedCosts: [{ label: "Technique", ...amount(215000) }, { label: "Communication", ...amount(100000) }],
    variableCosts: [{ label: "Diffusion", ...amount(2000) }, { label: "Service", ...amount(6000) }],
    exclusions: ["Financement et impôts hors périmètre de cette recette."], assumptions: ["Prévisions sans ventes constatées."],
  },
  projection: {
    monthlyVolumes: Array.from({ length: 12 }, (_, n) => amount((n + 1) * 10)),
    unitsPerPayerMonth: amount(1), annualRetentionRate: amount(1), ltvHorizonMonths: 12,
    acquisitionPaybackCeilingMonths: 1, marketingFixedCostIndexes: [1], marketingVariableCostIndexes: [0],
    cashFlow: { openingCash: amount(0), revenueDelayMonths: 0, costDelayMonths: 0, note: "Encaissements et paiements au même mois, sans dettes antérieures : hypothèse de recette." },
    note: "Trajectoire annuelle de recette et plafond de récupération proposé, pas une mesure d’acquisition.",
  },
});
