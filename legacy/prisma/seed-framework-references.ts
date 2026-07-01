/**
 * seed-framework-references.ts — Catalogue de frameworks (ADR-0113).
 *
 * La métadonnée des frameworks (nom, famille, forme de sortie, quand l'utiliser)
 * en LIGNES de référence mutables — le moteur reste en code. `buildFrameworkRows()` PUR.
 */

import type { PrismaClient } from "@prisma/client";

export interface FrameworkSeedRow {
  key: string;
  family: "STRATEGY" | "PORTFOLIO" | "GROWTH" | "BRAND" | "PRIORITIZATION" | "MEASUREMENT";
  label: string;
  outputShape?: string;
  whenToUse?: string;
}

/** Catalogue canon (BIG4 + frameworks clés). PUR. */
export function buildFrameworkRows(): FrameworkSeedRow[] {
  return [
    { key: "MCKINSEY_7S", family: "STRATEGY", label: "McKinsey 7S", outputShape: "7-levers", whenToUse: "Diagnostiquer l'alignement organisationnel (structure, systèmes, valeurs…)." },
    { key: "BCG_MATRIX", family: "PORTFOLIO", label: "BCG Growth-Share Matrix", outputShape: "2x2-matrix", whenToUse: "Arbitrer un portefeuille produits (vedettes/vaches/dilemmes/poids morts)." },
    { key: "MCKINSEY_3_HORIZONS", family: "GROWTH", label: "McKinsey 3 Horizons", outputShape: "horizons", whenToUse: "Équilibrer cœur de métier, croissance émergente et options futures." },
    { key: "BAIN_NPS", family: "MEASUREMENT", label: "Bain Net Promoter System", outputShape: "score", whenToUse: "Mesurer la recommandation client et la boucle d'amélioration." },
    { key: "ANSOFF_MATRIX", family: "GROWTH", label: "Ansoff Matrix", outputShape: "2x2-matrix", whenToUse: "Cartographier les vecteurs de croissance (produit × marché)." },
    { key: "PORTER_5_FORCES", family: "STRATEGY", label: "Porter 5 Forces", outputShape: "5-forces", whenToUse: "Évaluer l'attractivité structurelle d'un secteur." },
    { key: "CBBE_PYRAMID", family: "BRAND", label: "Keller CBBE Pyramid", outputShape: "pyramid", whenToUse: "Construire l'équité de marque (saillance → résonance)." },
    { key: "RICE", family: "PRIORITIZATION", label: "RICE", outputShape: "score", whenToUse: "Prioriser des initiatives (Reach×Impact×Confidence/Effort)." },
    { key: "MOSCOW", family: "PRIORITIZATION", label: "MoSCoW", outputShape: "buckets", whenToUse: "Trier les exigences (Must/Should/Could/Won't)." },
    { key: "OVERTON_WINDOW", family: "BRAND", label: "Overton Window", outputShape: "axis", whenToUse: "Situer le déplacement culturel sectoriel d'une marque." },
  ];
}

export async function seedFrameworkReferences(prisma: PrismaClient): Promise<number> {
  const rows = buildFrameworkRows();
  for (const r of rows) {
    await prisma.frameworkReference.upsert({
      where: { key: r.key },
      update: { family: r.family, label: r.label, outputShape: r.outputShape ?? null, whenToUse: r.whenToUse ?? null },
      create: { key: r.key, family: r.family, label: r.label, outputShape: r.outputShape ?? null, whenToUse: r.whenToUse ?? null },
    });
  }
  return rows.length;
}
