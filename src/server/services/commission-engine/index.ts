import { db } from "@/lib/db";
import type { PaymentMethod } from "@prisma/client";
import { detectProvider } from "@/server/services/mobile-money";

type GuildTier = "APPRENTI" | "COMPAGNON" | "MAITRE" | "ASSOCIE";

// Commission rates by tier (part GARDÉE par le talent — % du gross de la mission).
// Source de vérité UNIQUE (le router commission.ts les importe — plus de doublon).
export const TIER_RATES: Record<GuildTier, number> = {
  APPRENTI: 0.60,
  COMPAGNON: 0.65,
  MAITRE: 0.70,
  ASSOCIE: 0.75,
};

// Remise d'adhésion : une adhésion ACTIVE augmente la part gardée par le talent
// (remise sur la commission plateforme — promesse produit, cf. CHANGELOG membership).
export const MEMBERSHIP_DISCOUNT: Record<GuildTier, number> = {
  APPRENTI: 0.00,
  COMPAGNON: 0.02,
  MAITRE: 0.04,
  ASSOCIE: 0.06,
};

export const TALENT_RATE_CAP = 0.85; // plafond de la part talent

/**
 * Taux EFFECTIF gardé par le talent = base tier + remise si adhésion active,
 * plafonné. Round-11 : `engineCalculate` (chemin ARGENT) ignorait la remise
 * alors que `getAdjustedRate` (affichage) la montrait → le bénéfice membre était
 * vaporware (talent sous-crédité). Un seul point de vérité pour les deux.
 */
export function effectiveTalentRate(tier: string, hasActiveMembership: boolean): number {
  const t = (tier in TIER_RATES ? tier : "APPRENTI") as GuildTier;
  return Math.min(TIER_RATES[t] + (hasActiveMembership ? MEMBERSHIP_DISCOUNT[t] : 0), TALENT_RATE_CAP);
}

interface CommissionResult {
  missionId: string;
  userId: string;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  tierAtTime: GuildTier;
  operatorFee: number;
}

export async function calculate(missionId: string): Promise<CommissionResult> {
  const mission = await db.mission.findUniqueOrThrow({
    where: { id: missionId },
    include: { deliverables: true, campaign: true },
  });

  // Budget priority: mission.budget (DB field) > advertis_vector > campaign budget > 100000 XAF fallback
  const missionVector = mission.advertis_vector as Record<string, unknown> | null;
  const campaignVector = mission.campaign?.advertis_vector as Record<string, unknown> | null;
  const grossAmount =
    (typeof mission.budget === "number" ? mission.budget : null) ??
    (typeof missionVector?.budget === "number" ? missionVector.budget : null) ??
    (typeof mission.campaign?.budget === "number" ? mission.campaign.budget : null) ??
    (typeof campaignVector?.budget === "number" ? campaignVector.budget : null) ??
    100000;

  // Find the talent assigned to THIS mission (not random talent with missions)
  let talentProfile = null;
  let hasActiveMembership = false;
  if (mission.assigneeId) {
    talentProfile = await db.talentProfile.findUnique({
      where: { userId: mission.assigneeId },
      include: { memberships: { where: { status: "ACTIVE" }, take: 1 } },
    });
    hasActiveMembership = (talentProfile?.memberships?.length ?? 0) > 0;
  }

  const tier = (talentProfile?.tier as GuildTier) ?? "APPRENTI";
  // Round-11 : applique la remise d'adhésion au chemin ARGENT (était ignorée).
  const rate = effectiveTalentRate(tier, hasActiveMembership);
  const netAmount = grossAmount * rate;
  const commissionAmount = grossAmount - netAmount;

  // Operator fee (10% of commission for licensed operators)
  const operatorFee = commissionAmount * 0.10;

  return {
    missionId,
    userId: mission.assigneeId ?? talentProfile?.userId ?? "",
    grossAmount,
    commissionRate: rate,
    commissionAmount,
    netAmount,
    tierAtTime: tier,
    operatorFee,
  };
}

/**
 * Calculate operator fee for a commission (for licensed operators, not UPgraders).
 * Ready but not activated in V1 — returns 0 for OWNER operators.
 */
export async function calculateOperatorFee(
  commissionId: string
): Promise<{ operatorFee: number; operatorRate: number }> {
  const commission = await db.commission.findUniqueOrThrow({
    where: { id: commissionId },
    include: {
      mission: {
        include: {
          strategy: {
            include: { operator: true },
          },
        },
      },
    },
  });

  const operator = commission.mission.strategy.operator;
  if (!operator || operator.licenseType === "OWNER") {
    return { operatorFee: 0, operatorRate: 0 };
  }

  const operatorRate = operator.commissionRate; // e.g. 0.10 = 10%
  const operatorFee = commission.grossAmount * operatorRate;

  // Persist the fee
  await db.commission.update({
    where: { id: commissionId },
    data: { operatorFee },
  });

  return { operatorFee, operatorRate };
}

/**
 * Crée un VRAI ordre de payout (`PaymentOrder` persisté) pour une commission —
 * status PENDING, destinataire = téléphone momo du talent. La capture du paiement
 * est ensuite MANUELLE (l'opérateur confirme la transaction). Plus de stub JSON.
 */
export async function generatePaymentOrder(commissionId: string) {
  // Idempotence (audit round-8) : `PaymentOrder` n'a pas d'unique sur
  // `commissionId` → deux appels (double-clic / retry opérateur) créaient DEUX
  // ordres PENDING capturables = talent payé DEUX FOIS. On renvoie l'ordre
  // non-FAILED existant plutôt que d'en créer un doublon. (La course concurrente
  // pure reste tracée RESIDUAL-DEBT — même famille que commission.calculate.)
  const existing = await db.paymentOrder.findFirst({
    where: { commissionId, status: { not: "FAILED" } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  const commission = await db.commission.findUniqueOrThrow({ where: { id: commissionId } });
  const talent = await db.talentProfile.findUnique({
    where: { userId: commission.talentId },
    select: { payoutPhone: true, displayName: true },
  });
  const phone = talent?.payoutPhone ?? null;
  // Le provider se détecte par PRÉFIXE E.164 (detectProvider), pas en cherchant
  // « MTN »/« ORANGE » DANS le numéro (jamais présent → tout tombait sur WAVE).
  const method = (phone ? `MOBILE_MONEY_${detectProvider(phone) ?? "WAVE"}` : "MOBILE_MONEY_WAVE") as PaymentMethod;

  return db.paymentOrder.create({
    data: {
      commissionId,
      amount: commission.netAmount,
      currency: commission.currency,
      method,
      status: "PENDING",
      recipientPhone: phone,
      recipientName: talent?.displayName ?? null,
      failureReason: phone ? null : "Aucun numéro momo talent — à compléter avant capture.",
    },
  });
}
