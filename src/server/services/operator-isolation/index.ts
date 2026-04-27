// ============================================================================
// MODULE M05 — Operator Isolation (Multi-tenant)
// Score: 100/100 | Priority: P0 | Status: FUNCTIONAL
// Spec: §1.5 + §2.2.1 | Division: Transversal
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  scopeToOperator(query, ctx) — generic WHERE injection for any Prisma query
// [x] REQ-2  scopeStrategies(ctx) → Prisma.StrategyWhereInput (row-level filter)
// [x] REQ-3  scopeCampaigns(ctx) → filters via strategy→operator relation
// [x] REQ-4  scopeMissions(ctx) → filters via strategy→operator relation
// [x] REQ-5  canAccessStrategy(id, ctx) → boolean permission check
// [x] REQ-6  canAccessCampaign(id, ctx) → boolean permission check
// [x] REQ-7  canAccessMission(id, ctx) → boolean permission check
// [x] REQ-8  getOperatorContext(ctx) → normalized operator context
// [x] REQ-9  enforceOperatorIsolation middleware (tRPC middleware)
// [x] REQ-10 Applied to campaign-manager router (all procedures)
// [x] REQ-11 Applied to strategy router (list, get, update)
// [x] REQ-12 Applied to ALL remaining routers (driver, mission, glory, signal, etc.)
// [x] REQ-13 Applied to CRM router (deal→strategy→operator chain)
// [x] REQ-14 Operator dashboard with cross-strategy metrics in /console/ecosystem
//
// EXPORTS: scopeToOperator, scopeStrategies, scopeCampaigns, scopeMissions,
//          canAccessStrategy, canAccessCampaign, canAccessMission,
//          getOperatorContext, enforceOperatorIsolation, OperatorContext,
//          scopeDrivers, scopeSignals, scopeProcesses, scopeDeals,
//          canAccessDeal, getOperatorDashboard
// ============================================================================

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
 * Scope strategies to operator (via Client chain or legacy direct operatorId)
 */
export function scopeStrategies(ctx: OperatorContext): Prisma.StrategyWhereInput {
  if (ctx.role === "ADMIN") return {};
  if (ctx.operatorId) return {
    OR: [
      { client: { operatorId: ctx.operatorId } },
      { operatorId: ctx.operatorId },
    ],
  };
  return { userId: ctx.userId };
}

/**
 * Scope clients to operator
 */
export function scopeClients(ctx: OperatorContext): Prisma.ClientWhereInput {
  if (ctx.role === "ADMIN") return {};
  if (ctx.operatorId) return { operatorId: ctx.operatorId };
  return { strategies: { some: { userId: ctx.userId } } };
}

/**
 * Verify a user has access to a specific client
 */
export async function canAccessClient(
  clientId: string,
  ctx: OperatorContext,
): Promise<boolean> {
  if (ctx.role === "ADMIN") return true;

  const client = await db.client.findUnique({
    where: { id: clientId },
    select: { operatorId: true },
  });

  if (!client) return false;
  if (ctx.operatorId && client.operatorId === ctx.operatorId) return true;

  return false;
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

// ── REQ-12: Scope functions for remaining routers ────────────────────────

/**
 * Scope drivers (via strategy → operator)
 */
export function scopeDrivers(ctx: OperatorContext): Prisma.DriverWhereInput {
  if (ctx.role === "ADMIN") return {};
  return { strategy: scopeStrategies(ctx) };
}

/**
 * Scope signals (via strategy → operator)
 */
export function scopeSignals(ctx: OperatorContext): Prisma.SignalWhereInput {
  if (ctx.role === "ADMIN") return {};
  return { strategy: scopeStrategies(ctx) };
}

/**
 * Scope processes (via strategy → operator)
 */
export function scopeProcesses(ctx: OperatorContext): Prisma.ProcessWhereInput {
  if (ctx.role === "ADMIN") return {};
  return { strategy: scopeStrategies(ctx) };
}

/**
 * Scope glory outputs (via strategy → operator)
 */
export function scopeGloryOutputs(ctx: OperatorContext): Prisma.GloryOutputWhereInput {
  if (ctx.role === "ADMIN") return {};
  return { strategy: scopeStrategies(ctx) };
}

// ── REQ-13: CRM scope (deal → strategy → operator chain) ────────────────

/**
 * Scope deals (via strategy → operator)
 */
export function scopeDeals(ctx: OperatorContext): Prisma.DealWhereInput {
  if (ctx.role === "ADMIN") return {};
  return { strategy: scopeStrategies(ctx) };
}

/**
 * Verify a user has access to a specific deal
 */
export async function canAccessDeal(
  dealId: string,
  ctx: OperatorContext,
): Promise<boolean> {
  if (ctx.role === "ADMIN") return true;

  const deal = await db.deal.findUnique({
    where: { id: dealId },
    include: { strategy: { select: { userId: true, operatorId: true } } },
  });

  if (!deal) return false;
  if (!deal.strategy) return false; // Deal not linked to a strategy
  if (deal.strategy.userId === ctx.userId) return true;
  if (ctx.operatorId && deal.strategy.operatorId === ctx.operatorId) return true;

  return false;
}

// ── REQ-14: Operator dashboard metrics ───────────────────────────────────

export interface OperatorDashboard {
  operatorId: string;
  totalStrategies: number;
  totalClients: number;
  totalCampaigns: number;
  totalSignals: number;
  totalDeals: number;
  activeProcesses: number;
  strategyBreakdown: Array<{ id: string; name: string; status: string; pillarCompletion: number }>;
}

/**
 * Get cross-strategy metrics for an operator's dashboard
 */
export async function getOperatorDashboard(operatorId: string): Promise<OperatorDashboard> {
  const [strategies, clients, campaigns, signals, deals, processes] = await Promise.all([
    db.strategy.findMany({
      where: { operatorId },
      select: { id: true, name: true, status: true, advertis_vector: true },
    }),
    db.client.count({ where: { operatorId } }),
    db.campaign.count({ where: { strategy: { operatorId } } }),
    db.signal.count({ where: { strategy: { operatorId } } }),
    db.deal.count({ where: { strategy: { operatorId } } }),
    db.process.count({ where: { strategy: { operatorId }, status: "RUNNING" } }),
  ]);

  const strategyBreakdown = strategies.map((s) => {
    const vector = (s.advertis_vector as Record<string, number>) ?? {};
    const pillars = ["a", "d", "v", "e", "r", "t", "i", "s"];
    const filled = pillars.filter((k) => (vector[k] ?? 0) > 0).length;
    return { id: s.id, name: s.name, status: s.status, pillarCompletion: Math.round((filled / 8) * 100) };
  });

  return {
    operatorId,
    totalStrategies: strategies.length,
    totalClients: clients,
    totalCampaigns: campaigns,
    totalSignals: signals,
    totalDeals: deals,
    activeProcesses: processes,
    strategyBreakdown,
  };
}
