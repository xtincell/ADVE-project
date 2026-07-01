/**
 * seed-aicp-sections.ts — Taxonomie de devis AICP A→X (ADR-0112).
 *
 * Le plan de coût standardisé de la production publicitaire (AICP bid form) en
 * LIGNES de référence mutables, jamais en code. `buildAicpSectionRows()` PUR.
 */

import type { PrismaClient } from "@prisma/client";

export interface AicpSectionSeedRow {
  code: string;
  label: string;
  family: "PRE_PROD" | "CREW" | "LOCATION" | "ART" | "EQUIPMENT" | "STUDIO" | "POST" | "FEES" | "INSURANCE" | "MISC";
  sortOrder: number;
}

/** Sections AICP canon (bid form). PUR. */
export function buildAicpSectionRows(): AicpSectionSeedRow[] {
  return [
    { code: "A", label: "Pré-production & wrap (main d'œuvre)", family: "PRE_PROD", sortOrder: 1 },
    { code: "B", label: "Main d'œuvre équipe de tournage", family: "CREW", sortOrder: 2 },
    { code: "C", label: "Lieux & déplacements", family: "LOCATION", sortOrder: 3 },
    { code: "D", label: "Accessoires, costumes, animaux", family: "ART", sortOrder: 4 },
    { code: "E", label: "Studio & construction de décors", family: "STUDIO", sortOrder: 5 },
    { code: "F", label: "Main d'œuvre département artistique", family: "ART", sortOrder: 6 },
    { code: "G", label: "Matériaux & construction décors", family: "ART", sortOrder: 7 },
    { code: "H", label: "Location d'équipement", family: "EQUIPMENT", sortOrder: 8 },
    { code: "I", label: "Pellicule / stockage média", family: "EQUIPMENT", sortOrder: 9 },
    { code: "J", label: "Divers (tournage)", family: "MISC", sortOrder: 10 },
    { code: "K", label: "Honoraires réalisateur / création", family: "FEES", sortOrder: 11 },
    { code: "L", label: "Assurances", family: "INSURANCE", sortOrder: 12 },
    { code: "M", label: "Post-production : montage & finition", family: "POST", sortOrder: 13 },
    { code: "N", label: "Post-production : son & musique", family: "POST", sortOrder: 14 },
    { code: "O", label: "Talents / casting (cachets)", family: "FEES", sortOrder: 15 },
    { code: "P", label: "Frais de production (overhead)", family: "FEES", sortOrder: 16 },
  ];
}

export async function seedAicpSections(prisma: PrismaClient): Promise<number> {
  const rows = buildAicpSectionRows();
  for (const r of rows) {
    await prisma.aicpSectionReference.upsert({
      where: { code: r.code },
      update: { label: r.label, family: r.family, sortOrder: r.sortOrder },
      create: { code: r.code, label: r.label, family: r.family, sortOrder: r.sortOrder },
    });
  }
  return rows.length;
}
