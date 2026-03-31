import { db } from "@/lib/db";

type GuildTier = "APPRENTI" | "COMPAGNON" | "MAITRE" | "ASSOCIE";

// Commission rates by tier (% of mission gross amount)
const TIER_RATES: Record<GuildTier, number> = {
  APPRENTI: 0.60,
  COMPAGNON: 0.65,
  MAITRE: 0.70,
  ASSOCIE: 0.75,
};

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

  // Extract budget from mission's advertis_vector, campaign's advertis_vector, or fall back to 100000 XAF
  const missionVector = mission.advertis_vector as Record<string, unknown> | null;
  const campaignVector = mission.campaign?.advertis_vector as Record<string, unknown> | null;
  const grossAmount =
    (typeof missionVector?.budget === "number" ? missionVector.budget : null) ??
    (typeof campaignVector?.budget === "number" ? campaignVector.budget : null) ??
    100000;

  const talentProfile = await db.talentProfile.findFirst({
    where: { totalMissions: { gt: 0 } },
  });

  const tier = (talentProfile?.tier as GuildTier) ?? "APPRENTI";
  const rate = TIER_RATES[tier];
  const netAmount = grossAmount * rate;
  const commissionAmount = grossAmount - netAmount;

  // Operator fee (10% of commission for licensed operators)
  const operatorFee = commissionAmount * 0.10;

  return {
    missionId,
    userId: talentProfile?.userId ?? "",
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

export async function generatePaymentOrder(commissionId: string): Promise<Record<string, unknown>> {
  const commission = await db.commission.findUniqueOrThrow({
    where: { id: commissionId },
  });

  return {
    commissionId,
    amount: commission.netAmount,
    currency: commission.currency,
    status: "PENDING",
    method: "MOBILE_MONEY",
    generatedAt: new Date().toISOString(),
  };
}
