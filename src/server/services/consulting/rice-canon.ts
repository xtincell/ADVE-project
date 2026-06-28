/**
 * consulting/rice-canon.ts — Barème RICE canon (Intercom) + self-seed.
 *
 * ADR-0109 : les valeurs des libellés RICE sont des données mutables, pas du
 * hardcode. Source de vérité unique du barème (couche service), réutilisée par
 * `prisma/seed-rice-scales.ts`. `buildRiceScaleRows()` est PUR (testable sans DB).
 *
 * `ensureRiceScales` (auto-amorçage idempotent) suit le pattern
 * `action-costing/catalog.ts:ensureActionCostCatalog` (ADR-0119) : le build Vercel
 * ne lance que `migrate deploy`, donc la table est vide en prod — `loadScales`
 * l'amorce à la volée plutôt que de laisser `setRecommendationRice` throw sur la
 * voie libellés.
 */

import type { PrismaClient } from "@prisma/client";

export interface RiceScaleSeedRow {
  dimension: "REACH" | "IMPACT" | "CONFIDENCE" | "EFFORT";
  label: string;
  value: number;
  sortOrder: number;
  note?: string;
}

/** Échelle RICE canonique (Intercom). PUR. */
export function buildRiceScaleRows(): RiceScaleSeedRow[] {
  return [
    // IMPACT — multiplicateur canon Intercom.
    { dimension: "IMPACT", label: "Massive", value: 3, sortOrder: 1 },
    { dimension: "IMPACT", label: "High", value: 2, sortOrder: 2 },
    { dimension: "IMPACT", label: "Medium", value: 1, sortOrder: 3 },
    { dimension: "IMPACT", label: "Low", value: 0.5, sortOrder: 4 },
    { dimension: "IMPACT", label: "Minimal", value: 0.25, sortOrder: 5 },
    // CONFIDENCE — pourcentage de certitude.
    { dimension: "CONFIDENCE", label: "High", value: 1.0, sortOrder: 1, note: "100% — données solides" },
    { dimension: "CONFIDENCE", label: "Medium", value: 0.8, sortOrder: 2, note: "80%" },
    { dimension: "CONFIDENCE", label: "Low", value: 0.5, sortOrder: 3, note: "50% — pari" },
    // REACH — buckets par ordre de grandeur (cibles touchées / période).
    { dimension: "REACH", label: "Massive", value: 10000, sortOrder: 1 },
    { dimension: "REACH", label: "High", value: 1000, sortOrder: 2 },
    { dimension: "REACH", label: "Medium", value: 100, sortOrder: 3 },
    { dimension: "REACH", label: "Low", value: 10, sortOrder: 4 },
    { dimension: "REACH", label: "Minimal", value: 1, sortOrder: 5 },
    // EFFORT — personne-mois.
    { dimension: "EFFORT", label: "XS", value: 0.25, sortOrder: 1, note: "≈ 1 semaine" },
    { dimension: "EFFORT", label: "S", value: 0.5, sortOrder: 2, note: "≈ 2 semaines" },
    { dimension: "EFFORT", label: "M", value: 1, sortOrder: 3, note: "1 mois" },
    { dimension: "EFFORT", label: "L", value: 2, sortOrder: 4, note: "2 mois" },
    { dimension: "EFFORT", label: "XL", value: 3, sortOrder: 5, note: "1 trimestre" },
  ];
}

/** Upsert idempotent du barème canon. Réutilisé par le seed + le self-seed runtime. */
export async function ensureRiceScales(client: Pick<PrismaClient, "riceScale">): Promise<number> {
  const rows = buildRiceScaleRows();
  for (const r of rows) {
    await client.riceScale.upsert({
      where: { dimension_label: { dimension: r.dimension, label: r.label } },
      update: { value: r.value, sortOrder: r.sortOrder, note: r.note ?? null },
      create: { dimension: r.dimension, label: r.label, value: r.value, sortOrder: r.sortOrder, note: r.note ?? null },
    });
  }
  return rows.length;
}
