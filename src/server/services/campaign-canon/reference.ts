/**
 * campaign-canon/reference.ts — données de référence des campagnes canon (ADR-0119).
 *
 * Source de vérité UNIQUE de ce qu'EST chaque campagne canon (objectifs AARRR,
 * durée, part de budget). Les lignes sont définies en code (pures) et
 * matérialisées en base de façon idempotente via `ensureCanonTemplates`.
 *
 * Pourquoi ici (couche service) et pas seulement dans `prisma/seed-*` : le seed
 * ne tourne PAS au déploiement Vercel (`prisma migrate deploy` seul). Sans cette
 * garantie d'amorçage, `generateCanonicalCampaigns` retournait DEFERRED
 * (« templates non seedés ») et le bouton paraissait inerte. Le générateur
 * appelle `ensureCanonTemplates` quand la table est vide → auto-amorçage
 * déterministe, zéro LLM. Le seed `prisma/` réexporte ces mêmes lignes.
 */

import type { PrismaClient } from "@prisma/client";

export interface CanonTemplateRow {
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

/** Les 3 campagnes canon. PUR. `budgetShare` somme ≈ 1. */
export function buildCanonTemplateRows(): CanonTemplateRow[] {
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

/**
 * Matérialise les templates canon en base (upsert idempotent par `canonType`).
 * Utilisable depuis le runtime (générateur — client = `db`) ET le seed (client =
 * PrismaClient du script). Retourne le nombre de lignes garanties.
 */
export async function ensureCanonTemplates(
  client: Pick<PrismaClient, "campaignCanonTemplate">,
): Promise<number> {
  const rows = buildCanonTemplateRows();
  for (const r of rows) {
    const data = {
      label: r.label,
      aarrrPrimary: r.aarrrPrimary,
      aarrrSecondary: r.aarrrSecondary,
      durationDays: r.durationDays,
      isAlwaysOn: r.isAlwaysOn,
      budgetShare: r.budgetShare,
      sortOrder: r.sortOrder,
      note: r.note ?? null,
    };
    await client.campaignCanonTemplate.upsert({
      where: { canonType: r.canonType },
      update: data,
      create: { canonType: r.canonType, ...data },
    });
  }
  return rows.length;
}
