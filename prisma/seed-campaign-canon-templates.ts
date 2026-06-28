/**
 * seed-campaign-canon-templates.ts — Définition des 3 campagnes canon (ADR-0119).
 *
 * Ce qu'EST chaque campagne canon (objectifs AARRR, durée, part de budget) en
 * LIGNES de référence mutables. Le générateur lit ces lignes. `buildRows()` PUR.
 */

import type { PrismaClient } from "@prisma/client";

export interface CanonTemplateSeedRow {
  canonType: "GTM_90" | "ANNUAL" | "ALWAYS_ON";
  label: string;
  aarrrPrimary: string;
  aarrrSecondary: string;
  durationDays: number | null;
  isAlwaysOn: boolean;
  budgetShare: number;
  sortOrder: number;
  note?: string;
}

/** Templates canon. PUR. budgetShare somme ≈ 1. */
export function buildCanonTemplateRows(): CanonTemplateSeedRow[] {
  return [
    {
      canonType: "GTM_90",
      label: "Go-to-market 30-60-90",
      aarrrPrimary: "ACQUISITION",
      aarrrSecondary: "ACTIVATION",
      durationDays: 90,
      isAlwaysOn: false,
      budgetShare: 0.4,
      sortOrder: 1,
      note: "Sprint d'ouverture / traction. Phase intensive des 90 premiers jours de l'annuelle.",
    },
    {
      canonType: "ANNUAL",
      label: "Campagne annuelle",
      aarrrPrimary: "REVENUE",
      aarrrSecondary: "RETENTION",
      durationDays: 365,
      isAlwaysOn: false,
      budgetShare: 0.45,
      sortOrder: 2,
      note: "Consolidation/croissance, ancrée sur les moments de prise de parole. Réajustée par le bilan PCA de la 90.",
    },
    {
      canonType: "ALWAYS_ON",
      label: "Always-on (permanent)",
      aarrrPrimary: "REFERRAL",
      aarrrSecondary: "RETENTION",
      durationDays: null,
      isAlwaysOn: true,
      budgetShare: 0.15,
      sortOrder: 3,
      note: "Communauté/contenu permanent. AARRR variable par mois/moment (non figé).",
    },
  ];
}

export async function seedCampaignCanonTemplates(prisma: PrismaClient): Promise<number> {
  const rows = buildCanonTemplateRows();
  for (const r of rows) {
    await prisma.campaignCanonTemplate.upsert({
      where: { canonType: r.canonType },
      update: { label: r.label, aarrrPrimary: r.aarrrPrimary, aarrrSecondary: r.aarrrSecondary, durationDays: r.durationDays, isAlwaysOn: r.isAlwaysOn, budgetShare: r.budgetShare, sortOrder: r.sortOrder, note: r.note ?? null },
      create: { canonType: r.canonType, label: r.label, aarrrPrimary: r.aarrrPrimary, aarrrSecondary: r.aarrrSecondary, durationDays: r.durationDays, isAlwaysOn: r.isAlwaysOn, budgetShare: r.budgetShare, sortOrder: r.sortOrder, note: r.note ?? null },
    });
  }
  return rows.length;
}
