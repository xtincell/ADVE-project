/**
 * media-plan/ — Plan média ATL/BTL/TTL + PCA déterministe (ADR-0107, Phase 24).
 *
 * Audité sur la réalité ad-ops (GAM Order/LineItem ; Mediaocean Lumina
 * budgeted→planned→booked→actual ; anatomie du media plan bionic-ads). Le **PCA**
 * (post-campaign analysis : écart prévu vs réalisé, makegood) est calculé
 * **100 % déterministe** par `media-metrics.ts` — zéro LLM, zéro valeur métier
 * codée. Les CPM proviennent des benchmarks seedés (`MarketCostSnapshot`), jamais
 * de constantes. Manual-first : tout est saisi/édité par l'opérateur.
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import * as mm from "@/server/services/campaign-manager/media-metrics";

// ── PCA — cœur pur (déterministe, sans I/O) ─────────────────────────────────

export interface MediaLineInput {
  channel: string;
  category?: string | null;
  plannedImpressions?: number | null;
  plannedGrp?: number | null;
  plannedReachPct?: number | null;
  plannedFrequency?: number | null;
  plannedSpend?: number | null;
  cpm?: number | null;
  actualImpressions?: number | null;
  actualSpend?: number | null;
}

export interface MediaLinePca {
  channel: string;
  category: string | null;
  /** GRP prévu (fourni, sinon dérivé Reach% × Fréquence). */
  plannedGrp: number | null;
  plannedCpm: number | null;
  actualCpm: number | null;
  /** Écart relatif réalisé/prévu sur impressions (%) — négatif = sous-livraison. */
  impressionVariancePct: number | null;
  spendVariancePct: number | null;
  /** Impressions dues en makegood (sous-livraison), sinon 0. */
  makegoodShortfall: number;
}

/** Calcule le PCA d'une ligne média — PUR, déterministe, divisions sûres. */
export function computeLinePca(line: MediaLineInput): MediaLinePca {
  const plannedGrp =
    line.plannedGrp ??
    (line.plannedReachPct != null && line.plannedFrequency != null
      ? mm.grp(line.plannedReachPct, line.plannedFrequency)
      : null);

  const plannedCpm =
    line.cpm ??
    (line.plannedSpend != null && line.plannedImpressions != null
      ? mm.cpm(line.plannedSpend, line.plannedImpressions)
      : null);

  const actualCpm =
    line.actualSpend != null && line.actualImpressions != null
      ? mm.cpm(line.actualSpend, line.actualImpressions)
      : null;

  const impressionVariancePct =
    line.plannedImpressions != null && line.actualImpressions != null
      ? mm.deliveryVariancePct(line.plannedImpressions, line.actualImpressions)
      : null;

  const spendVariancePct =
    line.plannedSpend != null && line.actualSpend != null
      ? mm.deliveryVariancePct(line.plannedSpend, line.actualSpend)
      : null;

  const makegoodShortfall =
    line.plannedImpressions != null && line.actualImpressions != null
      ? mm.makegoodShortfall(line.plannedImpressions, line.actualImpressions)
      : 0;

  return {
    channel: line.channel,
    category: line.category ?? null,
    plannedGrp,
    plannedCpm,
    actualCpm,
    impressionVariancePct,
    spendVariancePct,
    makegoodShortfall,
  };
}

export interface MediaPlanPca {
  planId: string;
  lines: MediaLinePca[];
  totals: {
    plannedImpressions: number;
    actualImpressions: number;
    plannedSpend: number;
    actualSpend: number;
    impressionVariancePct: number | null;
    spendVariancePct: number | null;
    makegoodShortfall: number;
  };
}

/** Agrège le PCA d'un plan (par ligne + totaux). PUR sur les lignes fournies. */
export function computePlanPca(planId: string, lines: MediaLineInput[]): MediaPlanPca {
  const linePcas = lines.map(computeLinePca);
  const sum = (pick: (l: MediaLineInput) => number | null | undefined) =>
    lines.reduce((a, l) => a + (pick(l) ?? 0), 0);
  const plannedImpressions = sum((l) => l.plannedImpressions);
  const actualImpressions = sum((l) => l.actualImpressions);
  const plannedSpend = sum((l) => l.plannedSpend);
  const actualSpend = sum((l) => l.actualSpend);
  return {
    planId,
    lines: linePcas,
    totals: {
      plannedImpressions,
      actualImpressions,
      plannedSpend,
      actualSpend,
      impressionVariancePct: mm.deliveryVariancePct(plannedImpressions, actualImpressions),
      spendVariancePct: mm.deliveryVariancePct(plannedSpend, actualSpend),
      makegoodShortfall: mm.makegoodShortfall(plannedImpressions, actualImpressions),
    },
  };
}

// ── CRUD déterministe (orchestrateurs Prisma minces) ────────────────────────

export async function createMediaPlan(input: {
  campaignId: string;
  name: string;
  objective?: string;
  countryCode?: string;
  currency?: string;
  flightStart?: Date;
  flightEnd?: Date;
}, prisma: PrismaClient | typeof db = db) {
  return prisma.mediaPlan.create({ data: { ...input, status: "PLANNED" } });
}

export async function addMediaPlanLine(input: {
  planId: string;
  channel: string;
  category?: string;
  vendor?: string;
  plannedImpressions?: number;
  plannedGrp?: number;
  plannedReachPct?: number;
  plannedFrequency?: number;
  plannedSpend?: number;
  cpm?: number;
  flightStart?: Date;
  flightEnd?: Date;
}, prisma: PrismaClient | typeof db = db) {
  return prisma.mediaPlanLine.create({ data: input as Prisma.MediaPlanLineUncheckedCreateInput });
}

/** Enregistre le réalisé d'une ligne (post-buy). Passe le plan en RECONCILED si demandé. */
export async function recordLineActuals(input: {
  lineId: string;
  actualImpressions?: number;
  actualSpend?: number;
}, prisma: PrismaClient | typeof db = db) {
  return prisma.mediaPlanLine.update({
    where: { id: input.lineId },
    data: { actualImpressions: input.actualImpressions, actualSpend: input.actualSpend },
  });
}

export async function getMediaPlanPca(planId: string, prisma: PrismaClient | typeof db = db): Promise<MediaPlanPca> {
  const plan = await prisma.mediaPlan.findUniqueOrThrow({ where: { id: planId }, include: { lines: true } });
  return computePlanPca(plan.id, plan.lines);
}

export async function listMediaPlans(campaignId: string, prisma: PrismaClient | typeof db = db) {
  return prisma.mediaPlan.findMany({ where: { campaignId }, include: { lines: true }, orderBy: { createdAt: "desc" } });
}
