/**
 * Operator Isolation — Row-level security for multi-operator support
 * Ensures each operator can only access their own data
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

interface OperatorContext {
  operatorId: string | null;
  userId: string;
  role: string;
}

/**
 * Build a where clause that enforces operator isolation
 * ADMIN users can see all data; others are scoped to their operator
 */
export function scopeToOperator<T extends Record<string, unknown>>(
  where: T,
  ctx: OperatorContext
): T & { operatorId?: string } {
  if (ctx.role === "ADMIN") return where;
  if (!ctx.operatorId) return where;

  return { ...where, operatorId: ctx.operatorId };
}

/**
 * Scope strategies to operator
 */
export function scopeStrategies(ctx: OperatorContext): Prisma.StrategyWhereInput {
  if (ctx.role === "ADMIN") return {};
  if (ctx.operatorId) return { operatorId: ctx.operatorId };
  return { userId: ctx.userId };
}

/**
 * Scope campaigns (via strategy → operator)
 */
export function scopeCampaigns(ctx: OperatorContext): Prisma.CampaignWhereInput {
  if (ctx.role === "ADMIN") return {};
  return { strategy: scopeStrategies(ctx) };
}

/**
 * Scope missions (via strategy → operator)
 */
export function scopeMissions(ctx: OperatorContext): Prisma.MissionWhereInput {
  if (ctx.role === "ADMIN") return {};
  return { strategy: scopeStrategies(ctx) };
}

/**
 * Verify a user has access to a specific strategy
 */
export async function canAccessStrategy(
  strategyId: string,
  ctx: OperatorContext
): Promise<boolean> {
  if (ctx.role === "ADMIN") return true;

  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { userId: true, operatorId: true },
  });

  if (!strategy) return false;

  // Owner can always access
  if (strategy.userId === ctx.userId) return true;

  // Same operator can access
  if (ctx.operatorId && strategy.operatorId === ctx.operatorId) return true;

  return false;
}

/**
 * Verify a user has access to a specific campaign
 */
export async function canAccessCampaign(
  campaignId: string,
  ctx: OperatorContext
): Promise<boolean> {
  if (ctx.role === "ADMIN") return true;

  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    include: { strategy: { select: { userId: true, operatorId: true } } },
  });

  if (!campaign) return false;
  if (campaign.strategy.userId === ctx.userId) return true;
  if (ctx.operatorId && campaign.strategy.operatorId === ctx.operatorId) return true;

  return false;
}

/**
 * Verify a user has access to a specific mission
 */
export async function canAccessMission(
  missionId: string,
  ctx: OperatorContext
): Promise<boolean> {
  if (ctx.role === "ADMIN") return true;

  const mission = await db.mission.findUnique({
    where: { id: missionId },
    include: { strategy: { select: { userId: true, operatorId: true } } },
  });

  if (!mission) return false;
  if (mission.strategy.userId === ctx.userId) return true;
  if (ctx.operatorId && mission.strategy.operatorId === ctx.operatorId) return true;

  // Freelancers assigned to the mission can access
  if (mission.assigneeId === ctx.userId) return true;

  return false;
}

/**
 * Get operator context from a user
 */
export async function getOperatorContext(userId: string): Promise<OperatorContext> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, operatorId: true },
  });

  return {
    operatorId: user?.operatorId ?? null,
    userId,
    role: user?.role ?? "USER",
  };
}

/**
 * Middleware-style function to enforce operator isolation on tRPC procedures
 */
export function enforceOperatorIsolation(ctx: OperatorContext, strategyOperatorId: string | null): void {
  if (ctx.role === "ADMIN") return;
  if (!ctx.operatorId) return;
  if (strategyOperatorId && strategyOperatorId !== ctx.operatorId) {
    throw new Error("Accès refusé: cette ressource appartient à un autre opérateur");
  }
}
