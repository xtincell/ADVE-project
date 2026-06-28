/**
 * seed-methodology-references.ts — Catalogue de méthodes d'étude (ADR-0110).
 *
 * Le réel d'un bureau d'étude en LIGNES de référence mutables (jamais en code) :
 * familles, tailles types, normes n→MoE, normes T2B. `buildMethodologyRows()`
 * est PUR (testable sans DB).
 */

import type { PrismaClient } from "@prisma/client";

export interface MethodologySeedRow {
  key: string;
  family: "CONCEPT_TEST" | "PRICING" | "CONJOINT" | "TRACKER" | "U_A" | "SEGMENTATION" | "SENSORY";
  label: string;
  typicalN?: number;
  confidenceLevel?: number;
  marginOfErrorPct?: number;
  t2bNormPct?: number;
  outputShape?: string;
  whenToUse?: string;
}

/** Catalogue canon (normes industrie). PUR. */
export function buildMethodologyRows(): MethodologySeedRow[] {
  return [
    {
      key: "CONCEPT_TEST_MONADIC",
      family: "CONCEPT_TEST",
      label: "Test de concept monadique",
      typicalN: 200,
      confidenceLevel: 0.95,
      marginOfErrorPct: 6.9,
      t2bNormPct: 60,
      outputShape: "T2B",
      whenToUse: "Valider l'intérêt d'achat d'un concept isolé (vs norme T2B catégorie).",
    },
    {
      key: "CONCEPT_TEST_SEQUENTIAL_MONADIC",
      family: "CONCEPT_TEST",
      label: "Test de concept séquentiel monadique",
      typicalN: 300,
      confidenceLevel: 0.95,
      marginOfErrorPct: 5.7,
      t2bNormPct: 60,
      outputShape: "T2B",
      whenToUse: "Comparer 2-4 concepts auprès du même répondant.",
    },
    {
      key: "VAN_WESTENDORP",
      family: "PRICING",
      label: "Van Westendorp (PSM)",
      typicalN: 250,
      confidenceLevel: 0.95,
      marginOfErrorPct: 6.2,
      outputShape: "OPP/IPP",
      whenToUse: "Identifier la fourchette de prix acceptable (OPP, IPP).",
    },
    {
      key: "GABOR_GRANGER",
      family: "PRICING",
      label: "Gabor-Granger",
      typicalN: 200,
      confidenceLevel: 0.95,
      marginOfErrorPct: 6.9,
      outputShape: "demand-curve",
      whenToUse: "Estimer l'élasticité prix et le revenu optimal.",
    },
    {
      key: "CBC_CONJOINT",
      family: "CONJOINT",
      label: "Choice-Based Conjoint",
      typicalN: 300,
      confidenceLevel: 0.95,
      marginOfErrorPct: 5.7,
      outputShape: "part-worths",
      whenToUse: "Mesurer l'importance relative des attributs et simuler des parts.",
    },
    {
      key: "BRAND_TRACKER",
      family: "TRACKER",
      label: "Tracker de marque",
      typicalN: 384,
      confidenceLevel: 0.95,
      marginOfErrorPct: 5.0,
      outputShape: "T2B",
      whenToUse: "Suivre notoriété/considération/préférence vague après vague.",
    },
    {
      key: "U_AND_A",
      family: "U_A",
      label: "Usage & Attitudes",
      typicalN: 500,
      confidenceLevel: 0.95,
      marginOfErrorPct: 4.4,
      outputShape: "T2B",
      whenToUse: "Cartographier usages, occasions, attitudes d'une catégorie.",
    },
    {
      key: "SEGMENTATION_KMEANS",
      family: "SEGMENTATION",
      label: "Segmentation (k-means)",
      typicalN: 1000,
      confidenceLevel: 0.95,
      marginOfErrorPct: 3.1,
      outputShape: "segments",
      whenToUse: "Construire des segments actionnables sur attitudes/besoins.",
    },
    {
      key: "SENSORY_CLT",
      family: "SENSORY",
      label: "Test sensoriel (CLT)",
      typicalN: 150,
      confidenceLevel: 0.95,
      marginOfErrorPct: 8.0,
      t2bNormPct: 65,
      outputShape: "T2B",
      whenToUse: "Évaluer goût/texture/odeur en salle (Central Location Test).",
    },
  ];
}

export async function seedMethodologyReferences(prisma: PrismaClient): Promise<number> {
  const rows = buildMethodologyRows();
  for (const r of rows) {
    await prisma.methodologyReference.upsert({
      where: { key: r.key },
      update: {
        family: r.family, label: r.label, typicalN: r.typicalN ?? null,
        confidenceLevel: r.confidenceLevel ?? null, marginOfErrorPct: r.marginOfErrorPct ?? null,
        t2bNormPct: r.t2bNormPct ?? null, outputShape: r.outputShape ?? null, whenToUse: r.whenToUse ?? null,
      },
      create: {
        key: r.key, family: r.family, label: r.label, typicalN: r.typicalN ?? null,
        confidenceLevel: r.confidenceLevel ?? null, marginOfErrorPct: r.marginOfErrorPct ?? null,
        t2bNormPct: r.t2bNormPct ?? null, outputShape: r.outputShape ?? null, whenToUse: r.whenToUse ?? null,
      },
    });
  }
  return rows.length;
}
