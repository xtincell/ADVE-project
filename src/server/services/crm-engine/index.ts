/**
 * CRM Engine — Deal management, funnel tracking, Quick Intake conversion
 */

import { db } from "@/lib/db";

type DealStage = "LEAD" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST";

const STAGE_ORDER: DealStage[] = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON"];

/**
 * Auto-create a Deal from a completed Quick Intake
 */
export async function createDealFromIntake(intakeId: string): Promise<string> {
  const intake = await db.quickIntake.findUniqueOrThrow({ where: { id: intakeId } });

  const deal = await db.deal.create({
    data: {
      contactName: intake.contactName,
      contactEmail: intake.contactEmail,
      companyName: intake.companyName,
      stage: "LEAD",
      source: "QUICK_INTAKE",
      intakeId: intake.id,
      value: estimateDealValue(intake.sector, intake.businessModel),
      currency: "XAF",
    },
  });

  // Track funnel entry
  await db.funnelMapping.create({
    data: {
      dealId: deal.id,
      step: "LEAD",
    },
  });

  return deal.id;
}

/**
 * Advance a Deal to the next stage
 */
export async function advanceDeal(dealId: string, notes?: string): Promise<{ stage: DealStage; success: boolean }> {
  const deal = await db.deal.findUniqueOrThrow({ where: { id: dealId } });
  const currentIndex = STAGE_ORDER.indexOf(deal.stage as DealStage);

  if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 1) {
    return { stage: deal.stage as DealStage, success: false };
  }

  const nextStage = STAGE_ORDER[currentIndex + 1] as DealStage;

  // Close current funnel step
  await db.funnelMapping.updateMany({
    where: { dealId, step: deal.stage, exitedAt: null },
    data: { exitedAt: new Date() },
  });

  // Update deal
  await db.deal.update({
    where: { id: dealId },
    data: {
      stage: nextStage,
      notes: notes ?? deal.notes,
      ...(nextStage === "WON" ? { wonAt: new Date() } : {}),
    },
  });

  // Create new funnel step
  await db.funnelMapping.create({
    data: { dealId, step: nextStage },
  });

  return { stage: nextStage, success: true };
}

/**
 * Mark deal as lost
 */
export async function loseDeal(dealId: string, reason: string): Promise<void> {
  await db.deal.update({
    where: { id: dealId },
    data: { stage: "LOST", lostReason: reason },
  });
}

/**
 * Convert a Deal to a Strategy (Brand Instance)
 */
export async function convertDealToStrategy(
  dealId: string,
  userId: string,
  operatorId?: string
): Promise<string> {
  const deal = await db.deal.findUniqueOrThrow({ where: { id: dealId } });

  const strategy = await db.strategy.create({
    data: {
      name: deal.companyName,
      userId,
      operatorId,
      status: "ACTIVE",
    },
  });

  // Link deal to strategy
  await db.deal.update({
    where: { id: dealId },
    data: { strategyId: strategy.id, stage: "WON", wonAt: new Date() },
  });

  // If there was an intake, link it too
  if (deal.intakeId) {
    await db.quickIntake.update({
      where: { id: deal.intakeId },
      data: { convertedToId: strategy.id, status: "CONVERTED" },
    });
  }

  return strategy.id;
}

/**
 * Get pipeline overview
 */
export async function getPipelineOverview() {
  const deals = await db.deal.findMany({
    where: { stage: { not: "LOST" } },
    orderBy: { createdAt: "desc" },
  });

  const pipeline: Record<DealStage, { count: number; totalValue: number }> = {
    LEAD: { count: 0, totalValue: 0 },
    QUALIFIED: { count: 0, totalValue: 0 },
    PROPOSAL: { count: 0, totalValue: 0 },
    NEGOTIATION: { count: 0, totalValue: 0 },
    WON: { count: 0, totalValue: 0 },
    LOST: { count: 0, totalValue: 0 },
  };

  for (const deal of deals) {
    const stage = deal.stage as DealStage;
    pipeline[stage].count++;
    pipeline[stage].totalValue += deal.value ?? 0;
  }

  return pipeline;
}

/**
 * Estimate deal value based on sector and business model
 */
function estimateDealValue(sector?: string | null, businessModel?: string | null): number {
  const baseValues: Record<string, number> = {
    FMCG: 5000000,
    BANQUE: 15000000,
    STARTUP: 2000000,
    TECH: 8000000,
    RETAIL: 4000000,
    HOSPITALITY: 6000000,
    EDUCATION: 3000000,
  };

  const modelMultiplier: Record<string, number> = {
    B2C: 1.0,
    B2B: 1.5,
    B2B2C: 1.3,
    D2C: 0.8,
    MARKETPLACE: 1.2,
  };

  const base = baseValues[sector ?? ""] ?? 5000000;
  const multiplier = modelMultiplier[businessModel ?? ""] ?? 1.0;

  return Math.round(base * multiplier);
}
