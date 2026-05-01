/**
 * Anubis governance gates.
 *
 * Pre-flight checks Anubis-specific (au-delà des Mestor governedProcedure cross-cutting).
 */

import { db } from "@/lib/db";

export class CommsPlanNotFoundError extends Error {
  constructor(public readonly commsPlanId: string) {
    super(`CommsPlan ${commsPlanId} not found`);
    this.name = "CommsPlanNotFoundError";
  }
}

export class BroadcastJobNotFoundError extends Error {
  constructor(public readonly broadcastJobId: string) {
    super(`BroadcastJob ${broadcastJobId} not found`);
    this.name = "BroadcastJobNotFoundError";
  }
}

export class AdBudgetExceededError extends Error {
  constructor(
    public readonly campaignId: string,
    public readonly requestedUsd: number,
    public readonly capUsd: number,
  ) {
    super(`Ad inventory request $${requestedUsd} exceeds cap $${capUsd} for campaign ${campaignId}`);
    this.name = "AdBudgetExceededError";
  }
}

export async function assertCommsPlanExists(commsPlanId: string): Promise<void> {
  const plan = await db.commsPlan.findUnique({ where: { id: commsPlanId } });
  if (!plan) throw new CommsPlanNotFoundError(commsPlanId);
}

export async function assertBroadcastJobExists(broadcastJobId: string): Promise<void> {
  const job = await db.broadcastJob.findUnique({ where: { id: broadcastJobId } });
  if (!job) throw new BroadcastJobNotFoundError(broadcastJobId);
}

/** Soft cap : per-broadcast spend ceiling (Thot pre-flight will tighten). */
export const SOFT_BROADCAST_BUDGET_CAP_USD = 10_000;
