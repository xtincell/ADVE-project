/**
 * seed-brand-moments.ts — Calendrier de prise de parole de marque (ADR-0119).
 *
 * Moments généraux + spécifiques au positionnement, en LIGNES de référence
 * mutables (jamais en dur dans le générateur). `buildBrandMomentRows()` PUR.
 */

import type { PrismaClient } from "@prisma/client";

export interface BrandMomentSeedRow {
  key: string;
  label: string;
  type: "GENERAL" | "POSITIONING";
  month: number;
  dayOfMonth?: number;
  movable?: boolean;
  positioningTag?: string;
}

/** Calendrier canon (Afrique francophone + international). PUR. */
export function buildBrandMomentRows(): BrandMomentSeedRow[] {
  return [
    // ── Généraux (datés ou mobiles) ──
    { key: "NOUVEL_AN", label: "Nouvel An", type: "GENERAL", month: 1, dayOfMonth: 1 },
    { key: "ST_VALENTIN", label: "Saint-Valentin", type: "GENERAL", month: 2, dayOfMonth: 14 },
    { key: "JOURNEE_FEMMES", label: "Journée internationale des droits des femmes", type: "GENERAL", month: 3, dayOfMonth: 8 },
    { key: "RAMADAN", label: "Ramadan", type: "GENERAL", month: 3, movable: true },
    { key: "PAQUES", label: "Pâques", type: "GENERAL", month: 4, movable: true },
    { key: "FETE_TRAVAIL", label: "Fête du Travail", type: "GENERAL", month: 5, dayOfMonth: 1 },
    { key: "FETE_MERES", label: "Fête des mères", type: "GENERAL", month: 5, movable: true },
    { key: "FETE_PERES", label: "Fête des pères", type: "GENERAL", month: 6, movable: true },
    { key: "FETE_MUSIQUE", label: "Fête de la musique", type: "GENERAL", month: 6, dayOfMonth: 21 },
    { key: "RENTREE_SCOLAIRE", label: "Rentrée scolaire (Back-to-School)", type: "GENERAL", month: 9, movable: true },
    { key: "HALLOWEEN", label: "Halloween", type: "GENERAL", month: 10, dayOfMonth: 31 },
    { key: "NOEL", label: "Noël", type: "GENERAL", month: 12, dayOfMonth: 25 },
    { key: "FIN_ANNEE", label: "Fêtes de fin d'année", type: "GENERAL", month: 12, dayOfMonth: 31 },
    // ── Spécifiques au positionnement (taggés) ──
    { key: "NOUVEL_AN_CHINOIS", label: "Nouvel An chinois", type: "POSITIONING", month: 2, movable: true, positioningTag: "CULTUREL" },
    { key: "BLACK_FRIDAY", label: "Black Friday", type: "POSITIONING", month: 11, movable: true, positioningTag: "RETAIL" },
    { key: "CYBER_MONDAY", label: "Cyber Monday", type: "POSITIONING", month: 11, movable: true, positioningTag: "RETAIL" },
    { key: "FETE_NATIONALE", label: "Fête nationale", type: "POSITIONING", month: 0, movable: true, positioningTag: "NATIONAL" },
    { key: "TECH_TUESDAY", label: "Tech Tuesday", type: "POSITIONING", month: 0, movable: true, positioningTag: "TECH" },
    { key: "JOURNEE_MONDIALE_THEME", label: "Journée mondiale (thème de la marque)", type: "POSITIONING", month: 0, movable: true, positioningTag: "THEME" },
  ];
}

export async function seedBrandMoments(prisma: PrismaClient): Promise<number> {
  const rows = buildBrandMomentRows();
  for (const r of rows) {
    await prisma.brandMoment.upsert({
      where: { key: r.key },
      update: { label: r.label, type: r.type, month: r.month, dayOfMonth: r.dayOfMonth ?? null, movable: r.movable ?? false, positioningTag: r.positioningTag ?? null },
      create: { key: r.key, label: r.label, type: r.type, month: r.month, dayOfMonth: r.dayOfMonth ?? null, movable: r.movable ?? false, positioningTag: r.positioningTag ?? null },
    });
  }
  return rows.length;
}
