/**
 * escrow-arbitration/ — Séquestre de mission à validation manuelle (ADR-0116).
 *
 * Doctrine opérateur : le paiement Guilde est ASYNCHRONE et gouverné par un
 * escrow à **validation manuelle** par UPgraders et ses agents arbitres, dans une
 * interface dédiée. Ce service câble ce flux : HOLD (séquestre) → conditions
 * vérifiées par l'arbitre → RELEASE (libère + émet un payout momo) ou REFUND
 * (rejette). 100 % déterministe, zéro LLM. Les virements momo automatiques n'étant
 * pas disponibles, le payout est CAPTURÉ MANUELLEMENT : la libération crée un
 * `PaymentOrder` PENDING réel, que l'opérateur passe COMPLETED en enregistrant la
 * référence de transaction (preuve du virement). Jamais marqué payé sans preuve.
 */

import { db } from "@/lib/db";
import type { PaymentMethod, EscrowStatus, PaymentOrderStatus } from "@prisma/client";
import { detectProvider } from "@/server/services/mobile-money";

export interface EscrowConditionLike {
  met: boolean;
}

/** Vrai ssi toutes les conditions sont remplies. PUR. Liste vide → true. */
export function allConditionsMet(conditions: EscrowConditionLike[]): boolean {
  return conditions.every((c) => c.met);
}

/** Met des fonds sous séquestre pour une mission (status HELD). */
export async function holdEscrowForMission(input: {
  missionId: string;
  amount: number;
  currency?: string;
  commissionId?: string;
  conditions?: string[];
}) {
  // Idempotence : un seul séquestre actif (HELD) par mission (et par commission
  // si fournie). L'endpoint arbitre `hold` n'est pas one-shot ; sans garde, un
  // double-clic créerait des escrows HELD dupliqués sur la même mission.
  const existing = await db.escrow.findFirst({
    where: {
      missionId: input.missionId,
      commissionId: input.commissionId ?? null,
      status: "HELD",
    },
    include: { conditions: true },
  });
  if (existing) return existing;

  return db.escrow.create({
    data: {
      missionId: input.missionId,
      commissionId: input.commissionId ?? null,
      amount: input.amount,
      currency: input.currency ?? "XAF",
      status: "HELD",
      conditions: input.conditions?.length
        ? { create: input.conditions.map((condition) => ({ condition })) }
        : undefined,
    },
    include: { conditions: true },
  });
}

/** L'arbitre marque une condition comme remplie. */
export async function meetEscrowCondition(input: { conditionId: string; verifiedBy: string }) {
  return db.escrowCondition.update({
    where: { id: input.conditionId },
    data: { met: true, metAt: new Date(), verifiedBy: input.verifiedBy },
  });
}

const PAYMENT_METHOD_BY_PREFIX: Record<string, PaymentMethod> = {
  WAVE: "MOBILE_MONEY_WAVE",
  MTN: "MOBILE_MONEY_MTN",
  ORANGE: "MOBILE_MONEY_ORANGE",
};

/**
 * Libération arbitrée du séquestre. RELEASED + émet un `PaymentOrder` momo PENDING
 * vers le talent (jamais marqué payé sans preuve provider) + marque la commission
 * payée. Déterministe. `force` permet à l'arbitre de libérer malgré des conditions
 * non remplies (tracé via `reason`).
 */
export async function releaseEscrow(input: { escrowId: string; arbitratedBy: string; force?: boolean; reason?: string }) {
  const escrow = await db.escrow.findUniqueOrThrow({
    where: { id: input.escrowId },
    include: { conditions: true, mission: { select: { assigneeId: true } } },
  });
  if (escrow.status !== "HELD" && escrow.status !== "DISPUTED") {
    throw new Error(`Escrow ${input.escrowId} n'est pas libérable (status=${escrow.status}).`);
  }
  if (!input.force && !allConditionsMet(escrow.conditions)) {
    throw new Error("Conditions non remplies — libération refusée (utilise force avec justification pour outrepasser).");
  }

  // Claim atomique de la transition d'état (audit adversarial 2026-07-22) — deux
  // arbitrages concurrents (ou un double-clic) passaient TOUS DEUX le check HELD puis
  // créaient chacun un PaymentOrder PENDING = double payout (le 1er orphelin mais
  // capturable). On revendique HELD/DISPUTED → RELEASED d'abord ; seul le gagnant
  // (count === 1) poursuit et crée le payout.
  const claim = await db.escrow.updateMany({
    where: { id: input.escrowId, status: { in: ["HELD", "DISPUTED"] } },
    data: {
      status: "RELEASED",
      releasedAt: new Date(),
      arbitratedBy: input.arbitratedBy,
      reason: input.reason ?? escrow.reason,
    },
  });
  if (claim.count !== 1) {
    throw new Error(`Escrow ${input.escrowId} déjà libéré (course concurrente).`);
  }

  // Destinataire du payout : le talent assigné (téléphone momo).
  let recipientPhone: string | null = null;
  let recipientName: string | null = null;
  if (escrow.mission?.assigneeId) {
    const talent = await db.talentProfile.findUnique({
      where: { userId: escrow.mission.assigneeId },
      select: { payoutPhone: true, displayName: true },
    });
    recipientPhone = talent?.payoutPhone ?? null;
    recipientName = talent?.displayName ?? null;
  }

  // detectProvider = préfixe E.164 (le regex sur des lettres DANS le numéro ne
  // matchait jamais → tout étiqueté WAVE). PAYMENT_METHOD_BY_PREFIX conservé pour
  // la table, indexée par le provider détecté.
  const method: PaymentMethod =
    (recipientPhone && PAYMENT_METHOD_BY_PREFIX[detectProvider(recipientPhone) ?? "WAVE"]) || "MOBILE_MONEY_WAVE";

  // F2 (round-11) : dedup payout PAR COMMISSION. `generatePaymentOrder`
  // (commission-engine) a cette garde depuis le round-8 ; `releaseEscrow` la
  // manquait → `generatePaymentOrder(C)` PUIS `releaseEscrow(escrow lié à C)`
  // créaient DEUX ordres PENDING pour la même commission, tous deux capturables
  // → double payout. Réutiliser l'ordre non-FAILED existant.
  if (escrow.commissionId) {
    const existingPayout = await db.paymentOrder.findFirst({
      where: { commissionId: escrow.commissionId, status: { not: "FAILED" } },
      orderBy: { createdAt: "desc" },
    });
    if (existingPayout) {
      const updatedEscrow = await db.escrow.update({
        where: { id: input.escrowId },
        data: { paymentOrderId: existingPayout.id },
      });
      await db.commission.update({ where: { id: escrow.commissionId }, data: { status: "PAID", paidAt: new Date() } }).catch(() => {});
      return { escrow: updatedEscrow, paymentOrder: existingPayout };
    }
  }

  // Payout RÉEL credential/SDK-gated → PENDING honnête (jamais COMPLETED sans preuve).
  const payout = await db.paymentOrder.create({
    data: {
      commissionId: escrow.commissionId ?? null,
      amount: escrow.amount,
      currency: escrow.currency,
      method,
      status: "PENDING",
      recipientPhone,
      recipientName,
      failureReason: recipientPhone ? null : "Aucun numéro momo talent — payout en attente de configuration.",
    },
  });

  // La transition d'état a déjà été revendiquée atomiquement ci-dessus ; on ne
  // pose plus que le lien vers le payout créé par le gagnant.
  const updated = await db.escrow.update({
    where: { id: input.escrowId },
    data: { paymentOrderId: payout.id },
  });

  if (escrow.commissionId) {
    await db.commission.update({ where: { id: escrow.commissionId }, data: { status: "PAID", paidAt: new Date() } }).catch(() => {});
  }

  return { escrow: updated, paymentOrder: payout };
}

/** Rejet arbitré : remboursement marque (REFUNDED). */
export async function refundEscrow(input: { escrowId: string; arbitratedBy: string; reason: string }) {
  const escrow = await db.escrow.findUniqueOrThrow({ where: { id: input.escrowId }, select: { status: true } });
  if (escrow.status === "RELEASED") throw new Error("Escrow déjà libéré — remboursement impossible.");
  return db.escrow.update({
    where: { id: input.escrowId },
    data: { status: "REFUNDED", arbitratedBy: input.arbitratedBy, reason: input.reason, releasedAt: new Date() },
  });
}

/** Flag litige (DISPUTED) — met l'escrow en file d'arbitrage. */
export async function disputeEscrow(input: { escrowId: string; reason: string }) {
  return db.escrow.update({
    where: { id: input.escrowId },
    data: { status: "DISPUTED", reason: input.reason },
  });
}

/** File d'arbitrage pour la console (escrows + conditions + mission). */
export async function listEscrows(input?: { status?: EscrowStatus }) {
  return db.escrow.findMany({
    where: input?.status ? { status: input.status } : undefined,
    include: { conditions: true, mission: { select: { id: true, title: true, assigneeId: true } } },
    orderBy: { heldAt: "desc" },
  });
}

// ── Capture manuelle des payouts (ADR-0116) ──────────────────────────────────
// Les virements momo automatiques ne sont pas disponibles → l'opérateur capture
// le paiement à la main : il paie via Wave/MTN/Orange, puis enregistre la
// référence de transaction ici. L'ordre passe PENDING → COMPLETED. Zéro SDK,
// zéro stub : un PaymentOrder réel, complété par preuve opérateur.

/** File des payouts (ordres de paiement) pour la console. */
export async function listPayouts(input?: { status?: PaymentOrderStatus }) {
  return db.paymentOrder.findMany({
    where: input?.status ? { status: input.status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

/** Capture manuelle : l'opérateur confirme le virement (référence) → COMPLETED. */
export async function captureManualPayout(input: { paymentOrderId: string; transactionRef: string; capturedBy: string }) {
  const order = await db.paymentOrder.findUniqueOrThrow({ where: { id: input.paymentOrderId }, select: { status: true } });
  if (order.status === "COMPLETED") throw new Error("Payout déjà capturé.");
  return db.paymentOrder.update({
    where: { id: input.paymentOrderId },
    data: {
      status: "COMPLETED",
      transactionRef: input.transactionRef,
      providerRef: input.transactionRef,
      processedAt: new Date(),
      failureReason: null,
    },
  });
}

/** Marque un payout en échec (numéro invalide, virement refusé…). */
export async function markPayoutFailed(input: { paymentOrderId: string; reason: string }) {
  return db.paymentOrder.update({
    where: { id: input.paymentOrderId },
    data: { status: "FAILED", failureReason: input.reason },
  });
}
