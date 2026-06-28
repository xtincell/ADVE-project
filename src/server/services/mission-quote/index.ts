/**
 * mission-quote/ — Devis structuré prestataire → marque (ADR-0118).
 *
 * Lignes détaillées + TVA + total calculés DÉTERMINISTES (zéro LLM). Distinct de
 * la candidature simple (`MissionApplication.proposedRate`) et du devis AICP de
 * production (post-exécution). Le prestataire émet, la marque accepte/rejette.
 */

import { db } from "@/lib/db";

export interface QuoteLine {
  label: string;
  qty: number;
  unitPrice: number;
}

export interface QuoteTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
}

/** Calcule sous-total, TVA et total à partir des lignes. PUR, arrondi 2 décimales. */
export function computeQuoteTotals(lines: QuoteLine[], taxRatePct: number): QuoteTotals {
  const subtotalRaw = lines.reduce((s, l) => {
    const q = Number.isFinite(l.qty) ? l.qty : 0;
    const u = Number.isFinite(l.unitPrice) ? l.unitPrice : 0;
    return s + q * u;
  }, 0);
  const rate = Number.isFinite(taxRatePct) && taxRatePct > 0 ? taxRatePct : 0;
  const subtotal = Math.round(subtotalRaw * 100) / 100;
  const taxAmount = Math.round(subtotalRaw * (rate / 100) * 100) / 100;
  const total = Math.round((subtotalRaw + subtotalRaw * (rate / 100)) * 100) / 100;
  return { subtotal, taxAmount, total };
}

/** Référence de devis lisible, déterministe (pas de hasard) : DEV-<mission8>-<n>. */
export function quoteReference(missionId: string, seq: number): string {
  return `DEV-${missionId.slice(0, 8).toUpperCase()}-${String(seq).padStart(3, "0")}`;
}

async function resolveTalentProfileId(userId: string): Promise<string> {
  const tp = await db.talentProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!tp) throw new Error("Aucun profil talent — inscris-toi à la Guilde d'abord.");
  return tp.id;
}

export async function submitQuote(input: {
  userId: string;
  missionId: string;
  lines: QuoteLine[];
  taxRatePct?: number;
  currency?: string;
  validUntil?: Date;
  notes?: string;
}) {
  const talentProfileId = await resolveTalentProfileId(input.userId);
  const taxRatePct = input.taxRatePct ?? 0;
  const totals = computeQuoteTotals(input.lines, taxRatePct);
  const seq = (await db.missionQuote.count({ where: { missionId: input.missionId } })) + 1;

  return db.missionQuote.create({
    data: {
      missionId: input.missionId,
      talentProfileId,
      reference: quoteReference(input.missionId, seq),
      lines: input.lines as unknown as object,
      subtotal: totals.subtotal,
      taxRatePct,
      taxAmount: totals.taxAmount,
      total: totals.total,
      currency: input.currency ?? "XAF",
      status: "SENT",
      validUntil: input.validUntil ?? null,
      notes: input.notes ?? null,
    },
  });
}

/** Décision marque sur un devis (ACCEPTED/REJECTED). */
export async function decideQuote(input: { quoteId: string; decision: "ACCEPTED" | "REJECTED" }) {
  return db.missionQuote.update({ where: { id: input.quoteId }, data: { status: input.decision } });
}

export async function listQuotesByMission(missionId: string) {
  return db.missionQuote.findMany({
    where: { missionId },
    orderBy: { createdAt: "desc" },
    include: { talentProfile: { select: { displayName: true } } },
  });
}

export async function listMyQuotes(userId: string) {
  const talentProfileId = await resolveTalentProfileId(userId);
  return db.missionQuote.findMany({ where: { talentProfileId }, orderBy: { createdAt: "desc" } });
}
