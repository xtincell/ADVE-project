/**
 * Campaign Manager 360 — Main Service
 * 92-procedure spec: campaign lifecycle, transitions, budget, AARRR reporting,
 * briefs, reports, links, dependencies, templates, field ops, recommender
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { canTransition, requiresApproval, getAvailableTransitions, validateGates, type CampaignState } from "./state-machine";
import { ACTION_TYPES, getActionType, getActionsByCategory, type ActionCategory } from "./action-types";
import { assertCampaignHasBrief, getCampaignBriefStatus, BriefMissingError } from "./brief-gate";

export { canTransition, requiresApproval, getAvailableTransitions } from "./state-machine";
export { ACTION_TYPES, getActionType, getActionsByCategory, getActionsByDriver, searchActions } from "./action-types";
export { assertCampaignHasBrief, getCampaignBriefStatus, BriefMissingError } from "./brief-gate";

// ============================================================================
// AI HELPER
// ============================================================================

async function callAI(systemPrompt: string, userPrompt: string): Promise<Record<string, unknown>> {
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    const text = msg.content.find((b: { type: string }) => b.type === "text") as { text?: string } | undefined;
    return JSON.parse(text?.text ?? "{}");
  } catch {
    return {};
  }
}

// ============================================================================
// SAFE MATH HELPERS
// ============================================================================

function safeDivide(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sumField(arr: any[], fn: (item: any) => number | null | undefined): number {
  return arr.reduce((sum: number, item: unknown) => sum + (fn(item) ?? 0), 0);
}

// ============================================================================
// CAMPAIGN CRUD
// ============================================================================

let _campaignSeq = 0;

/**
 * Generate campaign code CAMP-YYYY-###
 */
export function generateCampaignCode(): string {
  _campaignSeq += 1;
  const year = new Date().getFullYear();
  const seq = String(_campaignSeq).padStart(3, "0");
  return `CAMP-${year}-${seq}`;
}

/**
 * Dashboard stats: active count, total budget, upcoming launches
 */
export async function getDashboard(strategyId: string) {
  const campaigns = await db.campaign.findMany({
    where: { strategyId },
    include: { milestones: true },
  });

  const activeCampaigns = campaigns.filter(
    (c) => !["ARCHIVED", "CANCELLED", "POST_CAMPAIGN"].includes(c.state)
  );

  const totalBudget = sumField(campaigns, (c) => c.budget);
  const activeBudget = sumField(activeCampaigns, (c) => c.budget);

  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const upcomingLaunches = campaigns.filter(
    (c) => c.state === "READY_TO_LAUNCH" && c.startDate && c.startDate <= thirtyDays
  );

  const byState: Record<string, number> = {};
  for (const c of campaigns) {
    byState[c.state] = (byState[c.state] ?? 0) + 1;
  }

  const overdueMilestones = campaigns.flatMap((c) =>
    c.milestones.filter((m) => !m.completed && m.dueDate < now)
  );

  return {
    totalCampaigns: campaigns.length,
    activeCampaigns: activeCampaigns.length,
    totalBudget,
    activeBudget,
    upcomingLaunches: upcomingLaunches.map((c) => ({
      id: c.id,
      name: c.name,
      startDate: c.startDate,
    })),
    byState,
    overdueMilestones: overdueMilestones.length,
    currency: "XAF",
  };
}

/**
 * Kanban view grouped by state
 */
export async function getKanban(strategyId: string) {
  const campaigns = await db.campaign.findMany({
    where: { strategyId },
    include: { teamMembers: { include: { user: { select: { id: true, name: true, image: true } } } } },
    orderBy: { updatedAt: "desc" },
  });

  const columns: Record<string, Array<{ id: string; name: string; budget: number | null; startDate: Date | null; endDate: Date | null; team: Array<{ id: string; name: string | null; image: string | null }> }>> = {};

  const states: CampaignState[] = [
    "BRIEF_DRAFT", "BRIEF_VALIDATED", "PLANNING", "CREATIVE_DEV",
    "PRODUCTION", "PRE_PRODUCTION", "APPROVAL", "READY_TO_LAUNCH",
    "LIVE", "POST_CAMPAIGN", "ARCHIVED", "CANCELLED",
  ];

  for (const state of states) {
    columns[state] = [];
  }

  for (const c of campaigns) {
    const col = columns[c.state] ?? [];
    col.push({
      id: c.id,
      name: c.name,
      budget: c.budget,
      startDate: c.startDate,
      endDate: c.endDate,
      team: c.teamMembers.map((tm) => ({
        id: tm.user.id,
        name: tm.user.name,
        image: tm.user.image,
      })),
    });
    columns[c.state] = col;
  }

  return { columns };
}

/**
 * Calendar view by launch date
 */
export async function getCalendar(strategyId: string, month: number, year: number) {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const campaigns = await db.campaign.findMany({
    where: {
      strategyId,
      OR: [
        { startDate: { gte: startOfMonth, lte: endOfMonth } },
        { endDate: { gte: startOfMonth, lte: endOfMonth } },
        { AND: [{ startDate: { lte: startOfMonth } }, { endDate: { gte: endOfMonth } }] },
      ],
    },
    include: { milestones: { where: { dueDate: { gte: startOfMonth, lte: endOfMonth } } } },
  });

  const events: Array<{
    id: string;
    name: string;
    type: "campaign_start" | "campaign_end" | "milestone";
    date: Date;
    campaignId: string;
    state: string;
  }> = [];

  for (const c of campaigns) {
    if (c.startDate && c.startDate >= startOfMonth && c.startDate <= endOfMonth) {
      events.push({ id: `${c.id}-start`, name: `${c.name} (Lancement)`, type: "campaign_start", date: c.startDate, campaignId: c.id, state: c.state });
    }
    if (c.endDate && c.endDate >= startOfMonth && c.endDate <= endOfMonth) {
      events.push({ id: `${c.id}-end`, name: `${c.name} (Fin)`, type: "campaign_end", date: c.endDate, campaignId: c.id, state: c.state });
    }
    for (const m of c.milestones) {
      events.push({ id: m.id, name: `${c.name}: ${m.title}`, type: "milestone", date: m.dueDate, campaignId: c.id, state: c.state });
    }
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  return { month, year, events, campaignCount: campaigns.length };
}

/**
 * Multi-field search
 */
export async function searchCampaigns(params: {
  strategyId?: string;
  query?: string;
  state?: string;
  category?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const where: Record<string, unknown> = {};

  if (params.strategyId) where.strategyId = params.strategyId;
  if (params.state) where.state = params.state;
  if (params.query) {
    where.name = { contains: params.query, mode: "insensitive" };
  }
  if (params.startDate || params.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (params.startDate) dateFilter.gte = params.startDate;
    if (params.endDate) dateFilter.lte = params.endDate;
    where.startDate = dateFilter;
  }

  const campaigns = await db.campaign.findMany({
    where: where as never,
    include: {
      actions: params.category ? { where: { category: params.category as never } } : false,
      teamMembers: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // If filtering by category, only return campaigns that have actions in that category
  if (params.category) {
    return campaigns.filter((c) => {
      const actions = c.actions as unknown[];
      return actions && actions.length > 0;
    });
  }

  return campaigns;
}

// ============================================================================
// STATE TRANSITION (existing)
// ============================================================================

/**
 * Transition a campaign to a new state with gate validation
 */
export async function transitionCampaign(
  campaignId: string,
  toState: CampaignState,
  approverId?: string
): Promise<{ success: boolean; error?: string; failedChecks?: string[] }> {
  const campaign = await db.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: { briefs: true, teamMembers: true, milestones: true, assets: true, approvals: true },
  });

  const fromState = campaign.state as CampaignState;

  if (!canTransition(fromState, toState)) {
    return { success: false, error: `Transition ${fromState} → ${toState} non autorisée` };
  }

  if (requiresApproval(fromState, toState) && !approverId) {
    return { success: false, error: `Transition ${fromState} → ${toState} nécessite une approbation` };
  }

  // Gate checks
  const gateContext = {
    hasBrief: campaign.briefs.length > 0,
    hasBudget: campaign.budget != null && campaign.budget > 0,
    hasTimeline: campaign.startDate != null,
    hasTeam: campaign.teamMembers.length > 0,
    allAssetsReady: campaign.assets.length > 0,
    clientApproved: campaign.approvals.some((a) => a.status === "APPROVED" && a.toState === toState),
    launchChecklist: true,
  };

  const { valid, failedChecks } = await validateGates(campaignId, fromState, toState, gateContext);
  if (!valid) {
    return { success: false, error: "Gate checks échoués", failedChecks };
  }

  // Create approval record if needed
  if (requiresApproval(fromState, toState) && approverId) {
    await db.campaignApproval.create({
      data: {
        campaignId,
        approverId,
        fromState: fromState as never,
        toState: toState as never,
        status: "APPROVED",
        decidedAt: new Date(),
      },
    });
  }

  // Perform transition
  await db.campaign.update({
    where: { id: campaignId },
    data: { state: toState as never, status: toState },
  });

  return { success: true };
}

// ============================================================================
// BUDGET (10 procedures)
// ============================================================================

/**
 * Calculate campaign budget breakdown by category (existing, enhanced)
 */
export async function getBudgetBreakdown(campaignId: string) {
  const actions = await db.campaignAction.findMany({ where: { campaignId } });
  const amplifications = await db.campaignAmplification.findMany({ where: { campaignId } });
  const fieldOps = await db.campaignFieldOp.findMany({ where: { campaignId } });

  const actionsBudget = actions.reduce((sum, a) => sum + (a.budget ?? 0), 0);
  const ampliBudget = amplifications.reduce((sum, a) => sum + a.budget, 0);
  const fieldBudget = fieldOps.reduce((sum, f) => sum + (f.budget ?? 0), 0);

  const byCategory: Record<string, number> = {};
  for (const action of actions) {
    const cat = action.category;
    byCategory[cat] = (byCategory[cat] ?? 0) + (action.budget ?? 0);
  }

  return {
    total: actionsBudget + ampliBudget + fieldBudget,
    actions: actionsBudget,
    amplification: ampliBudget,
    fieldOps: fieldBudget,
    byCategory,
    currency: "XAF",
  };
}

/**
 * Budget summary with 8 categories
 */
export async function getBudgetSummary(campaignId: string) {
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  const actions = await db.campaignAction.findMany({ where: { campaignId } });
  const amplifications = await db.campaignAmplification.findMany({ where: { campaignId } });
  const fieldOps = await db.campaignFieldOp.findMany({ where: { campaignId } });

  const categories = {
    media_buying: 0,
    production: 0,
    creative: 0,
    talent_fees: 0,
    logistics: 0,
    technology: 0,
    agency_fees: 0,
    contingency: 0,
  };

  // Distribute amplification costs
  for (const amp of amplifications) {
    categories.media_buying += amp.mediaCost ?? amp.budget * 0.7;
    categories.production += amp.productionCost ?? 0;
    categories.agency_fees += amp.agencyFee ?? 0;
  }

  // ATL actions → media_buying, BTL → logistics/creative, TTL → media_buying + creative
  for (const action of actions) {
    const budget = action.budget ?? 0;
    if (action.category === "ATL") {
      categories.media_buying += budget * 0.6;
      categories.production += budget * 0.3;
      categories.agency_fees += budget * 0.1;
    } else if (action.category === "BTL") {
      categories.creative += budget * 0.3;
      categories.logistics += budget * 0.5;
      categories.talent_fees += budget * 0.2;
    } else {
      categories.media_buying += budget * 0.5;
      categories.creative += budget * 0.3;
      categories.technology += budget * 0.2;
    }
  }

  // Field ops → logistics
  for (const fo of fieldOps) {
    categories.logistics += fo.budget ?? 0;
  }

  const totalAllocated = Object.values(categories).reduce((s, v) => s + v, 0);
  const plannedBudget = campaign.budget ?? 0;
  categories.contingency = Math.max(0, plannedBudget - totalAllocated) * 0.1;

  return {
    campaignId,
    plannedBudget,
    totalAllocated,
    remaining: plannedBudget - totalAllocated,
    categories,
    currency: campaign.budgetCurrency,
  };
}

/**
 * Budget variance: planned vs actual per category
 */
export async function getBudgetVariance(campaignId: string) {
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  const actions = await db.campaignAction.findMany({ where: { campaignId } });
  const amplifications = await db.campaignAmplification.findMany({ where: { campaignId } });

  const planned: Record<string, number> = { ATL: 0, BTL: 0, TTL: 0, amplification: 0 };
  const actual: Record<string, number> = { ATL: 0, BTL: 0, TTL: 0, amplification: 0 };

  for (const action of actions) {
    const cat = action.category;
    planned[cat] = (planned[cat] ?? 0) + (action.budget ?? 0);
    // Actual is derived from executions cost or a fraction of budget if status is completed
    const spendFactor = action.status === "COMPLETED" ? 1.0 : action.status === "IN_PROGRESS" ? 0.5 : 0;
    actual[cat] = (actual[cat] ?? 0) + (action.budget ?? 0) * spendFactor;
  }

  for (const amp of amplifications) {
    planned["amplification"] = (planned["amplification"] ?? 0) + amp.budget;
    const spendFactor = amp.status === "COMPLETED" ? 1.0 : amp.status === "ACTIVE" ? 0.6 : 0;
    actual["amplification"] = (actual["amplification"] ?? 0) + amp.budget * spendFactor;
  }

  const variance: Record<string, { planned: number; actual: number; variance: number; variancePercent: number | null }> = {};
  for (const key of Object.keys(planned)) {
    const p = planned[key] ?? 0;
    const a = actual[key] ?? 0;
    variance[key] = {
      planned: p,
      actual: a,
      variance: p - a,
      variancePercent: safeDivide((p - a) * 100, p),
    };
  }

  return {
    campaignId,
    totalPlanned: campaign.budget ?? 0,
    totalActual: Object.values(actual).reduce((s, v) => s + v, 0),
    variance,
    currency: campaign.budgetCurrency,
  };
}

/**
 * Burn rate forecast based on spend velocity
 */
export async function getBurnForecast(campaignId: string) {
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  const actions = await db.campaignAction.findMany({ where: { campaignId } });
  const amplifications = await db.campaignAmplification.findMany({ where: { campaignId } });

  const totalBudget = campaign.budget ?? 0;

  // Calculate spend to date
  let spentToDate = 0;
  for (const action of actions) {
    const b = action.budget ?? 0;
    if (action.status === "COMPLETED") spentToDate += b;
    else if (action.status === "IN_PROGRESS") spentToDate += b * 0.5;
  }
  for (const amp of amplifications) {
    if (amp.status === "COMPLETED") spentToDate += amp.budget;
    else if (amp.status === "ACTIVE") spentToDate += amp.budget * 0.6;
  }

  const startDate = campaign.startDate ?? new Date();
  const endDate = campaign.endDate ?? new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const totalDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  const elapsedDays = Math.max(1, (now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  const remainingDays = Math.max(0, (endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

  const dailyBurnRate = safeDivide(spentToDate, elapsedDays) ?? 0;
  const projectedTotal = spentToDate + dailyBurnRate * remainingDays;
  const budgetHealthPercent = safeDivide(spentToDate * 100, totalBudget);
  const timeProgressPercent = safeDivide(elapsedDays * 100, totalDays);

  // Budget exhaustion date estimate
  const remainingBudget = totalBudget - spentToDate;
  const daysUntilExhaustion = dailyBurnRate > 0 ? remainingBudget / dailyBurnRate : null;
  const exhaustionDate = daysUntilExhaustion != null
    ? new Date(now.getTime() + daysUntilExhaustion * 24 * 60 * 60 * 1000)
    : null;

  return {
    campaignId,
    totalBudget,
    spentToDate,
    remainingBudget,
    dailyBurnRate: Math.round(dailyBurnRate),
    projectedTotal: Math.round(projectedTotal),
    budgetHealthPercent,
    timeProgressPercent,
    exhaustionDate,
    onTrack: projectedTotal <= totalBudget * 1.1,
    currency: campaign.budgetCurrency,
  };
}

/**
 * Spend breakdown per action line
 */
export async function getSpendByActionLine(campaignId: string) {
  const actions = await db.campaignAction.findMany({
    where: { campaignId },
    include: { executions: true },
  });

  const lines = actions.map((action) => {
    const planned = action.budget ?? 0;
    const spendFactor = action.status === "COMPLETED" ? 1.0 : action.status === "IN_PROGRESS" ? 0.5 : 0;
    const actual = planned * spendFactor;
    const executionCount = action.executions.length;

    return {
      id: action.id,
      name: action.name,
      category: action.category,
      actionType: action.actionType,
      planned,
      actual,
      variance: planned - actual,
      status: action.status,
      executionCount,
      costPerExecution: safeDivide(actual, executionCount),
    };
  });

  return {
    campaignId,
    lines,
    totalPlanned: sumField(lines, (l) => l.planned),
    totalActual: sumField(lines, (l) => l.actual),
    currency: "XAF",
  };
}

/**
 * Cost per KPI (CPA, CPL, CPC, etc.)
 */
export async function getCostPerKPI(campaignId: string) {
  const amplifications = await db.campaignAmplification.findMany({ where: { campaignId } });
  const metrics = await db.campaignAARRMetric.findMany({ where: { campaignId } });

  const totalSpend = sumField(amplifications, (a) => a.budget);
  const totalImpressions = sumField(amplifications, (a) => a.impressions);
  const totalClicks = sumField(amplifications, (a) => a.clicks);
  const totalConversions = sumField(amplifications, (a) => a.conversions);
  const totalReach = sumField(amplifications, (a) => a.reach);
  const totalViews = sumField(amplifications, (a) => a.views);
  const totalEngagements = sumField(amplifications, (a) => a.engagements);

  // Derive leads from ACQUISITION metrics
  const acquisitionMetrics = metrics.filter((m) => m.stage === "ACQUISITION");
  const totalLeads = sumField(acquisitionMetrics, (m) => m.value);

  return {
    campaignId,
    totalSpend,
    CPM: safeDivide(totalSpend * 1000, totalImpressions),
    CPC: safeDivide(totalSpend, totalClicks),
    CPA: safeDivide(totalSpend, totalConversions),
    CPL: safeDivide(totalSpend, totalLeads),
    CPV: safeDivide(totalSpend, totalViews),
    CPE: safeDivide(totalSpend, totalEngagements),
    CPR: safeDivide(totalSpend, totalReach),
    ROAS: (() => {
      const revenueMetrics = metrics.filter((m) => m.stage === "REVENUE");
      const totalRevenue = sumField(revenueMetrics, (m) => m.value);
      return safeDivide(totalRevenue, totalSpend);
    })(),
    currency: "XAF",
  };
}

/**
 * Create budget line
 */
export async function createBudgetLine(data: {
  campaignId: string;
  category: string;
  label: string;
  planned: number;
  actionId?: string;
  notes?: string;
}) {
  return db.budgetLine.create({
    data: {
      campaignId: data.campaignId,
      category: data.category,
      label: data.label,
      planned: data.planned,
      actionId: data.actionId,
      notes: data.notes,
    },
  });
}

/**
 * Update budget line actual spend
 */
export async function updateBudgetLine(id: string, actual: number) {
  return db.budgetLine.update({
    where: { id },
    data: { actual },
  });
}

/**
 * List budget lines for a campaign
 */
export async function listBudgetLines(campaignId: string) {
  return db.budgetLine.findMany({
    where: { campaignId },
    orderBy: { category: "asc" },
  });
}

/**
 * Delete budget line
 */
export async function deleteBudgetLine(id: string) {
  return db.budgetLine.delete({ where: { id } });
}

// ============================================================================
// AARRR REPORTING (existing, enhanced)
// ============================================================================

/**
 * Generate AARRR report for a campaign
 */
export async function generateAARRReport(campaignId: string) {
  const metrics = await db.campaignAARRMetric.findMany({
    where: { campaignId },
    orderBy: { measuredAt: "desc" },
  });

  const stages = ["ACQUISITION", "ACTIVATION", "RETENTION", "REVENUE", "REFERRAL"] as const;
  const report: Record<string, { metrics: Array<{ metric: string; value: number; target: number | null }>; health: number }> = {};

  for (const stage of stages) {
    const stageMetrics = metrics.filter((m) => m.stage === stage);
    const metricsList = stageMetrics.map((m) => ({
      metric: m.metric,
      value: m.value,
      target: m.target,
    }));

    const health = metricsList.length > 0
      ? metricsList.filter((m) => m.target && m.value >= m.target).length / metricsList.length
      : 0;

    report[stage] = { metrics: metricsList, health };
  }

  return report;
}

// ============================================================================
// TEAM (existing)
// ============================================================================

/**
 * Get campaign team with roles
 */
export async function getCampaignTeam(campaignId: string) {
  return db.campaignTeamMember.findMany({
    where: { campaignId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });
}

// ============================================================================
// ACTIONS (existing)
// ============================================================================

/**
 * Create a campaign action from a known action type
 */
export async function createActionFromType(
  campaignId: string,
  actionTypeSlug: string,
  overrides?: { name?: string; budget?: number; startDate?: Date; endDate?: Date }
) {
  const actionType = getActionType(actionTypeSlug);
  if (!actionType) throw new Error(`Type d'action inconnu: ${actionTypeSlug}`);

  // ADR-0034 — brief mandatory gate
  await assertCampaignHasBrief(campaignId);

  return db.campaignAction.create({
    data: {
      campaignId,
      name: overrides?.name ?? actionType.name,
      category: actionType.category as never,
      actionType: actionType.slug,
      budget: overrides?.budget,
      startDate: overrides?.startDate,
      endDate: overrides?.endDate,
      specs: { requiredFields: actionType.requiredFields, drivers: actionType.drivers },
      kpis: { templates: actionType.kpiTemplates },
    },
  });
}

/**
 * Recommend actions based on campaign objectives and ADVE vector
 */
export function recommendActions(
  objectives: string[],
  budget: number,
  preferredDrivers: string[]
): Array<{ slug: string; name: string; category: ActionCategory; relevance: number }> {
  const scored = ACTION_TYPES.map((at) => {
    let relevance = 0;

    // Driver match
    if (at.drivers.some((d) => preferredDrivers.includes(d))) relevance += 30;

    // Category balance (prefer mix)
    relevance += 10;

    // Budget suitability (ATL needs more budget)
    if (at.category === "ATL" && budget > 5000000) relevance += 20;
    if (at.category === "BTL" && budget < 5000000) relevance += 20;
    if (at.category === "TTL") relevance += 15;

    return { slug: at.slug, name: at.name, category: at.category, relevance };
  });

  return scored.sort((a, b) => b.relevance - a.relevance).slice(0, 15);
}

// ============================================================================
// BRIEFS (8 procedures)
// ============================================================================

const BRIEF_TYPES = [
  { id: "creative", label: "Brief Créatif", description: "Brief de direction créative pour l'équipe artistique" },
  { id: "media", label: "Brief Média", description: "Brief de stratégie et plan média" },
  { id: "vendor", label: "Brief Fournisseur", description: "Brief technique pour fournisseurs et prestataires" },
  { id: "production", label: "Brief Production", description: "Brief de production et fabrication" },
  { id: "digital", label: "Brief Digital", description: "Brief pour les actions digitales et social media" },
  { id: "event", label: "Brief Événementiel", description: "Brief pour la conception et production d'événements" },
  { id: "pr", label: "Brief RP", description: "Brief pour les relations presse et publiques" },
  { id: "research", label: "Brief Études", description: "Brief pour études de marché et consumer insights" },
] as const;

async function loadCampaignWithStrategy(campaignId: string, strategyId: string) {
  const [campaign, strategy] = await Promise.all([
    db.campaign.findUniqueOrThrow({
      where: { id: campaignId },
      include: { actions: true, teamMembers: true },
    }),
    db.strategy.findUniqueOrThrow({
      where: { id: strategyId },
      include: { pillars: true },
    }),
  ]);
  return { campaign, strategy };
}

function buildBriefSystemPrompt(briefType: string): string {
  return `Tu es un stratège publicitaire expert, spécialiste du framework ADVE (Authenticité, Distinction, Valeur, Engagement) utilisé par l'agence La Fusée.
Génère un brief ${briefType} structuré en JSON valide. Le brief doit être actionnable, précis, et inspirant.
Réponds UNIQUEMENT avec du JSON valide, sans texte additionnel.`;
}

function buildBriefFallback(briefType: string, campaignName: string, pillars: Array<{ key: string; content: unknown }>): Record<string, unknown> {
  const pillarMap: Record<string, unknown> = {};
  for (const p of pillars) {
    pillarMap[p.key] = p.content;
  }
  return {
    type: briefType,
    campaign: campaignName,
    context: "Brief généré par template heuristique",
    pillars: pillarMap,
    objectives: [],
    targetAudience: {},
    keyMessages: [],
    tone: {},
    deliverables: [],
    timeline: {},
    budget: {},
    kpis: [],
  };
}

/**
 * AI-generate a creative brief from strategy pillars
 */
export async function generateCreativeBrief(campaignId: string, strategyId: string) {
  const { campaign, strategy } = await loadCampaignWithStrategy(campaignId, strategyId);
  const systemPrompt = buildBriefSystemPrompt("créatif");
  const userPrompt = `Campagne: ${campaign.name}
Objectifs: ${JSON.stringify(campaign.objectives)}
Vecteur ADVE: ${JSON.stringify(campaign.advertis_vector)}
Piliers de marque: ${JSON.stringify(strategy.pillars.map((p) => ({ key: p.key, content: p.content })))}
Budget: ${campaign.budget} ${campaign.budgetCurrency}
Période: ${campaign.startDate?.toISOString()} → ${campaign.endDate?.toISOString()}

Génère un brief créatif avec: direction_artistique, concept, tone_of_voice, messages_cles, livrables, contraintes`;

  let content = await callAI(systemPrompt, userPrompt);
  if (!content || Object.keys(content).length === 0) {
    content = buildBriefFallback("creative", campaign.name, strategy.pillars);
  }

  return db.campaignBrief.create({
    data: {
      campaignId,
      title: `Brief Créatif — ${campaign.name}`,
      content: content as never,
      status: "DRAFT",
      targetDriver: "CREATIVE",
      advertis_vector: campaign.advertis_vector as never,
    },
  });
}

/**
 * AI-generate a media brief
 */
export async function generateMediaBrief(campaignId: string, strategyId: string) {
  const { campaign, strategy } = await loadCampaignWithStrategy(campaignId, strategyId);
  const systemPrompt = buildBriefSystemPrompt("média");
  const userPrompt = `Campagne: ${campaign.name}
Objectifs: ${JSON.stringify(campaign.objectives)}
Vecteur ADVE: ${JSON.stringify(campaign.advertis_vector)}
Piliers: ${JSON.stringify(strategy.pillars.map((p) => ({ key: p.key, content: p.content })))}
Budget: ${campaign.budget} ${campaign.budgetCurrency}
Actions prévues: ${JSON.stringify(campaign.actions.map((a) => ({ name: a.name, category: a.category, type: a.actionType })))}

Génère un brief média avec: objectifs_media, cibles, canaux, budget_repartition, calendrier, kpis, contraintes`;

  let content = await callAI(systemPrompt, userPrompt);
  if (!content || Object.keys(content).length === 0) {
    content = buildBriefFallback("media", campaign.name, strategy.pillars);
  }

  return db.campaignBrief.create({
    data: {
      campaignId,
      title: `Brief Média — ${campaign.name}`,
      content: content as never,
      status: "DRAFT",
      targetDriver: "MEDIA",
      advertis_vector: campaign.advertis_vector as never,
    },
  });
}

/**
 * AI-generate a vendor/production brief
 */
export async function generateVendorBrief(campaignId: string, strategyId: string) {
  const { campaign, strategy } = await loadCampaignWithStrategy(campaignId, strategyId);
  const systemPrompt = buildBriefSystemPrompt("fournisseur / prestataire");
  const userPrompt = `Campagne: ${campaign.name}
Objectifs: ${JSON.stringify(campaign.objectives)}
Piliers: ${JSON.stringify(strategy.pillars.map((p) => ({ key: p.key, content: p.content })))}
Budget: ${campaign.budget} ${campaign.budgetCurrency}
Actions terrain: ${JSON.stringify(campaign.actions.filter((a) => a.category === "BTL").map((a) => ({ name: a.name, type: a.actionType })))}

Génère un brief fournisseur avec: contexte, specifications_techniques, quantites, delais, qualite_attendue, budget_indicatif, criteres_selection`;

  let content = await callAI(systemPrompt, userPrompt);
  if (!content || Object.keys(content).length === 0) {
    content = buildBriefFallback("vendor", campaign.name, strategy.pillars);
  }

  return db.campaignBrief.create({
    data: {
      campaignId,
      title: `Brief Fournisseur — ${campaign.name}`,
      content: content as never,
      status: "DRAFT",
      targetDriver: "VENDOR",
      advertis_vector: campaign.advertis_vector as never,
    },
  });
}

/**
 * AI-generate a production brief
 */
export async function generateProductionBrief(campaignId: string, strategyId: string) {
  const { campaign, strategy } = await loadCampaignWithStrategy(campaignId, strategyId);
  const systemPrompt = buildBriefSystemPrompt("production");
  const userPrompt = `Campagne: ${campaign.name}
Objectifs: ${JSON.stringify(campaign.objectives)}
Piliers: ${JSON.stringify(strategy.pillars.map((p) => ({ key: p.key, content: p.content })))}
Budget: ${campaign.budget} ${campaign.budgetCurrency}
Période: ${campaign.startDate?.toISOString()} → ${campaign.endDate?.toISOString()}

Génère un brief production avec: concept_description, format_deliverables, specifications_techniques, planning_production, equipe_requise, budget_production, controle_qualite`;

  let content = await callAI(systemPrompt, userPrompt);
  if (!content || Object.keys(content).length === 0) {
    content = buildBriefFallback("production", campaign.name, strategy.pillars);
  }

  return db.campaignBrief.create({
    data: {
      campaignId,
      title: `Brief Production — ${campaign.name}`,
      content: content as never,
      status: "DRAFT",
      targetDriver: "PRODUCTION",
      advertis_vector: campaign.advertis_vector as never,
    },
  });
}

/**
 * List briefs for a campaign
 */
export async function listBriefs(campaignId: string) {
  return db.campaignBrief.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Update brief content
 */
export async function updateBrief(id: string, content: Record<string, unknown>) {
  const existing = await db.campaignBrief.findUniqueOrThrow({ where: { id } });
  return db.campaignBrief.update({
    where: { id },
    data: {
      content: content as never,
      version: existing.version + 1,
      updatedAt: new Date(),
    },
  });
}

/**
 * Get brief types catalog
 */
export function getBriefTypes() {
  return BRIEF_TYPES.map((bt) => ({ ...bt }));
}

// ============================================================================
// REPORTS (3 procedures)
// ============================================================================

const REPORT_TYPES = [
  "WEEKLY_STATUS",
  "MONTHLY_STATUS",
  "MID_CAMPAIGN",
  "POST_CAMPAIGN",
  "ROI_ANALYSIS",
  "MEDIA_PERFORMANCE",
  "CREATIVE_PERFORMANCE",
] as const;

/**
 * Generate a full report with computed data
 */
export async function generateFullReport(campaignId: string, reportType: string, title: string) {
  if (!REPORT_TYPES.includes(reportType as (typeof REPORT_TYPES)[number])) {
    throw new Error(`Type de rapport invalide: ${reportType}. Types valides: ${REPORT_TYPES.join(", ")}`);
  }

  const [
    campaign,
    budgetData,
    aarrReport,
    team,
    milestones,
    fieldReports,
    amplifications,
    actions,
  ] = await Promise.all([
    db.campaign.findUniqueOrThrow({ where: { id: campaignId } }),
    getBudgetBreakdown(campaignId),
    generateAARRReport(campaignId),
    getCampaignTeam(campaignId),
    db.campaignMilestone.findMany({ where: { campaignId }, orderBy: { dueDate: "asc" } }),
    db.campaignFieldReport.findMany({ where: { campaignId } }),
    db.campaignAmplification.findMany({ where: { campaignId } }),
    db.campaignAction.findMany({ where: { campaignId } }),
  ]);

  // Compute amplification aggregates
  const ampMetrics = {
    totalSpend: sumField(amplifications, (a) => a.budget),
    totalImpressions: sumField(amplifications, (a) => a.impressions),
    totalClicks: sumField(amplifications, (a) => a.clicks),
    totalConversions: sumField(amplifications, (a) => a.conversions),
    totalReach: sumField(amplifications, (a) => a.reach),
    totalViews: sumField(amplifications, (a) => a.views),
    avgCPA: safeDivide(
      sumField(amplifications, (a) => a.budget),
      sumField(amplifications, (a) => a.conversions)
    ),
    avgROAS: safeDivide(
      sumField(amplifications.filter((a) => a.roas != null), (a) => (a.roas ?? 0) * a.budget),
      sumField(amplifications.filter((a) => a.roas != null), (a) => a.budget)
    ),
  };

  // Milestone progress
  const milestoneProgress = {
    total: milestones.length,
    completed: milestones.filter((m) => m.completed).length,
    overdue: milestones.filter((m) => !m.completed && m.dueDate < new Date()).length,
    upcoming: milestones.filter((m) => !m.completed && m.dueDate >= new Date()).length,
  };

  // Field report summary
  const fieldReportSummary = {
    total: fieldReports.length,
    validated: fieldReports.filter((r) => r.status === "VALIDATED").length,
    pending: fieldReports.filter((r) => r.status === "SUBMITTED").length,
  };

  // Action completion
  const actionSummary = {
    total: actions.length,
    completed: actions.filter((a) => a.status === "COMPLETED").length,
    inProgress: actions.filter((a) => a.status === "IN_PROGRESS").length,
    planned: actions.filter((a) => a.status === "PLANNED").length,
    byCategory: {
      ATL: actions.filter((a) => a.category === "ATL").length,
      BTL: actions.filter((a) => a.category === "BTL").length,
      TTL: actions.filter((a) => a.category === "TTL").length,
    },
  };

  const reportData = {
    reportType,
    generatedAt: new Date().toISOString(),
    campaign: {
      id: campaign.id,
      name: campaign.name,
      state: campaign.state,
      budget: campaign.budget,
      currency: campaign.budgetCurrency,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
    },
    budget: budgetData,
    aarrr: aarrReport,
    amplification: ampMetrics,
    milestones: milestoneProgress,
    fieldReports: fieldReportSummary,
    actions: actionSummary,
    team: team.map((t) => ({ name: t.user.name, role: t.role })),
  };

  const summary = `Rapport ${reportType} — ${campaign.name}: Budget ${budgetData.total.toLocaleString()} XAF, ${actionSummary.completed}/${actionSummary.total} actions terminées, ${milestoneProgress.completed}/${milestoneProgress.total} jalons atteints`;

  return db.campaignReport.create({
    data: {
      campaignId,
      title,
      reportType,
      data: reportData as never,
      summary,
    },
  });
}

/**
 * List reports for a campaign
 */
export async function listReports(campaignId: string) {
  return db.campaignReport.findMany({
    where: { campaignId },
    orderBy: { generatedAt: "desc" },
  });
}

// ============================================================================
// LINKS (6 procedures) — stored in campaign JSON or via direct model relations
// ============================================================================

/**
 * Link a mission to a campaign
 */
export async function linkMission(campaignId: string, missionId: string) {
  await db.mission.update({ where: { id: missionId }, data: { campaignId } });
  await db.campaignLink.upsert({
    where: { campaignId_linkedType_linkedId: { campaignId, linkedType: "MISSION", linkedId: missionId } },
    update: {},
    create: { campaignId, linkedType: "MISSION", linkedId: missionId },
  });
  return { success: true, linkedType: "MISSION", linkedId: missionId };
}

/**
 * Link a signal to a campaign
 */
export async function linkSignal(campaignId: string, signalId: string) {
  await db.campaignLink.upsert({
    where: { campaignId_linkedType_linkedId: { campaignId, linkedType: "SIGNAL", linkedId: signalId } },
    update: {},
    create: { campaignId, linkedType: "SIGNAL", linkedId: signalId },
  });
  return { success: true, linkedType: "SIGNAL", linkedId: signalId };
}

/**
 * Link a publication to a campaign
 */
export async function linkPublication(campaignId: string, publicationId: string) {
  await db.campaignLink.upsert({
    where: { campaignId_linkedType_linkedId: { campaignId, linkedType: "PUBLICATION", linkedId: publicationId } },
    update: {},
    create: { campaignId, linkedType: "PUBLICATION", linkedId: publicationId },
  });
  return { success: true, linkedType: "PUBLICATION", linkedId: publicationId };
}

/**
 * Unlink an entity from a campaign
 */
export async function unlinkEntity(campaignId: string, linkedType: string, linkedId: string) {
  const deleted = await db.campaignLink.deleteMany({
    where: { campaignId, linkedType, linkedId },
  });
  if (linkedType === "MISSION") {
    try { await db.mission.update({ where: { id: linkedId }, data: { campaignId: null } }); } catch { /* ok */ }
  }
  return { success: true, removed: deleted.count };
}

/**
 * Get all links for a campaign
 */
export async function getLinks(campaignId: string) {
  const links = await db.campaignLink.findMany({ where: { campaignId }, orderBy: { createdAt: "desc" } });
  return { campaignId, links, count: links.length };
}

/**
 * Get links filtered by type
 */
export async function getLinksByType(campaignId: string, linkedType: string) {
  const links = await db.campaignLink.findMany({ where: { campaignId, linkedType }, orderBy: { createdAt: "desc" } });
  return { campaignId, linkedType, links, count: links.length };
}

// ============================================================================
// DEPENDENCIES (3 procedures)
// ============================================================================

const DEPENDENCY_TYPES = ["BLOCKS", "REQUIRES", "FOLLOWS", "PARALLEL"] as const;

/**
 * List dependencies for a campaign (both outgoing and incoming)
 */
export async function listDependencies(campaignId: string) {
  const [outgoing, incoming] = await Promise.all([
    db.campaignDependency.findMany({
      where: { sourceId: campaignId },
      include: { target: { select: { id: true, name: true, state: true } } },
    }),
    db.campaignDependency.findMany({
      where: { targetId: campaignId },
      include: { source: { select: { id: true, name: true, state: true } } },
    }),
  ]);

  return {
    campaignId,
    outgoing: outgoing.map((d) => ({
      id: d.id,
      depType: d.depType,
      targetId: d.targetId,
      targetName: d.target.name,
      targetState: d.target.state,
    })),
    incoming: incoming.map((d) => ({
      id: d.id,
      depType: d.depType,
      sourceId: d.sourceId,
      sourceName: d.source.name,
      sourceState: d.source.state,
    })),
    totalDependencies: outgoing.length + incoming.length,
  };
}

/**
 * Validate all dependencies for a campaign (checks if blockers are resolved)
 */
export async function validateDependencies(campaignId: string) {
  const deps = await listDependencies(campaignId);
  const blockers: Array<{ depType: string; sourceId: string; sourceName: string; sourceState: string; reason: string }> = [];

  // Check incoming BLOCKS: source must be in POST_CAMPAIGN or ARCHIVED
  for (const dep of deps.incoming) {
    if (dep.depType === "BLOCKS" && !["POST_CAMPAIGN", "ARCHIVED", "CANCELLED"].includes(dep.sourceState)) {
      blockers.push({
        depType: dep.depType,
        sourceId: dep.sourceId,
        sourceName: dep.sourceName,
        sourceState: dep.sourceState,
        reason: `Campagne bloquante "${dep.sourceName}" est encore en état ${dep.sourceState}`,
      });
    }
    if (dep.depType === "REQUIRES" && !["LIVE", "POST_CAMPAIGN", "ARCHIVED"].includes(dep.sourceState)) {
      blockers.push({
        depType: dep.depType,
        sourceId: dep.sourceId,
        sourceName: dep.sourceName,
        sourceState: dep.sourceState,
        reason: `Campagne requise "${dep.sourceName}" n'est pas encore live (état: ${dep.sourceState})`,
      });
    }
    if (dep.depType === "FOLLOWS" && !["LIVE", "POST_CAMPAIGN", "ARCHIVED"].includes(dep.sourceState)) {
      blockers.push({
        depType: dep.depType,
        sourceId: dep.sourceId,
        sourceName: dep.sourceName,
        sourceState: dep.sourceState,
        reason: `Campagne précédente "${dep.sourceName}" n'est pas encore terminée (état: ${dep.sourceState})`,
      });
    }
    // PARALLEL has no blocker constraints
  }

  return {
    campaignId,
    valid: blockers.length === 0,
    blockers,
    dependencyTypes: DEPENDENCY_TYPES,
  };
}

// ============================================================================
// TEMPLATES (2 procedures)
// ============================================================================

/**
 * Create a campaign from a template
 */
export async function createFromTemplate(templateId: string, strategyId: string, name: string) {
  const template = await db.campaignTemplate.findUniqueOrThrow({ where: { id: templateId } });
  const actionTypes = template.actionTypes as Array<{ slug: string; budgetPercent?: number }>;
  const timeline = template.timeline as { durationDays?: number } | null;
  const channels = template.channels as string[] | null;

  const startDate = new Date();
  const durationDays = timeline?.durationDays ?? 90;
  const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // Create the campaign
  const campaign = await db.campaign.create({
    data: {
      name,
      strategyId,
      budget: template.budget,
      budgetCurrency: template.currency,
      startDate,
      endDate,
      state: "BRIEF_DRAFT" as never,
      status: "BRIEF_DRAFT",
      objectives: { templateId, channels, category: template.category } as never,
    },
  });

  // Create actions from template
  for (const at of actionTypes) {
    const actionType = getActionType(at.slug);
    if (!actionType) continue;

    const actionBudget = template.budget && at.budgetPercent
      ? template.budget * at.budgetPercent
      : undefined;

    await db.campaignAction.create({
      data: {
        campaignId: campaign.id,
        name: actionType.name,
        category: actionType.category as never,
        actionType: actionType.slug,
        budget: actionBudget,
        startDate,
        endDate,
        specs: { requiredFields: actionType.requiredFields, drivers: actionType.drivers, fromTemplate: true },
        kpis: { templates: actionType.kpiTemplates },
      },
    });
  }

  return campaign;
}

/**
 * Save a campaign as a reusable template
 */
export async function saveAsTemplate(campaignId: string, name: string, description: string) {
  const campaign = await db.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: { actions: true },
  });

  const totalBudget = campaign.budget ?? 0;
  const actionTypes = campaign.actions.map((a) => ({
    slug: a.actionType,
    category: a.category,
    name: a.name,
    budgetPercent: totalBudget > 0 ? (a.budget ?? 0) / totalBudget : 0,
  }));

  const durationDays = campaign.startDate && campaign.endDate
    ? Math.round((campaign.endDate.getTime() - campaign.startDate.getTime()) / (24 * 60 * 60 * 1000))
    : 90;

  const channelSet = new Set<string>();
  for (const a of campaign.actions) {
    const specs = a.specs as Record<string, unknown> | null;
    const drivers = (specs?.drivers as string[]) ?? [];
    for (const d of drivers) channelSet.add(d);
  }
  const channels = Array.from(channelSet);

  // Determine dominant category
  const catCount: Record<string, number> = {};
  for (const a of campaign.actions) {
    catCount[a.category] = (catCount[a.category] ?? 0) + 1;
  }
  const dominantCategory = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "TTL";

  return db.campaignTemplate.create({
    data: {
      name,
      description,
      category: dominantCategory,
      actionTypes: actionTypes as never,
      budget: campaign.budget,
      currency: campaign.budgetCurrency,
      timeline: { durationDays } as never,
      channels: channels as never,
    },
  });
}

// ============================================================================
// FIELD OPS (5 procedures — 3 existing in CRUD, 2 new list/get)
// ============================================================================

/**
 * List field operations for a campaign
 */
export async function listFieldOps(campaignId: string) {
  return db.campaignFieldOp.findMany({
    where: { campaignId },
    include: { reports: { select: { id: true, status: true, reporterName: true, submittedAt: true } } },
    orderBy: { date: "asc" },
  });
}

/**
 * Get a single field operation with full details
 */
export async function getFieldOp(id: string) {
  return db.campaignFieldOp.findUniqueOrThrow({
    where: { id },
    include: {
      reports: true,
      campaign: { select: { id: true, name: true, state: true } },
    },
  });
}

// ============================================================================
// FIELD REPORTS (6 procedures)
// ============================================================================

/**
 * List field reports for a field operation
 */
export async function listFieldReports(fieldOpId: string) {
  return db.campaignFieldReport.findMany({
    where: { fieldOpId },
    orderBy: { submittedAt: "desc" },
  });
}

/**
 * Validate a field report (validator approves with optional overrides)
 */
export async function validateFieldReport(
  id: string,
  validatorId: string,
  overrides?: Record<string, unknown>
) {
  const report = await db.campaignFieldReport.findUniqueOrThrow({ where: { id } });

  if (report.status === "VALIDATED") {
    throw new Error("Ce rapport terrain est déjà validé");
  }

  const updateData: Record<string, unknown> = {
    status: "VALIDATED",
    validatedBy: validatorId,
    validatedAt: new Date(),
  };

  if (overrides) {
    updateData.validatorOverrides = overrides;

    // Allow overriding AARRR counts
    if (overrides.acquisitionCount != null) updateData.acquisitionCount = overrides.acquisitionCount;
    if (overrides.activationCount != null) updateData.activationCount = overrides.activationCount;
    if (overrides.retentionCount != null) updateData.retentionCount = overrides.retentionCount;
    if (overrides.revenueCount != null) updateData.revenueCount = overrides.revenueCount;
    if (overrides.referralCount != null) updateData.referralCount = overrides.referralCount;
  }

  return db.campaignFieldReport.update({
    where: { id },
    data: updateData as never,
  });
}

/**
 * Get aggregated field report stats for a campaign
 */
export async function getFieldReportStats(campaignId: string) {
  const reports = await db.campaignFieldReport.findMany({ where: { campaignId } });
  const validated = reports.filter((r) => r.status === "VALIDATED");
  const pending = reports.filter((r) => r.status === "SUBMITTED");

  const aarrr = {
    acquisition: sumField(validated, (r) => r.acquisitionCount),
    activation: sumField(validated, (r) => r.activationCount),
    retention: sumField(validated, (r) => r.retentionCount),
    revenue: sumField(validated, (r) => r.revenueCount),
    referral: sumField(validated, (r) => r.referralCount),
  };

  return {
    campaignId,
    totalReports: reports.length,
    validated: validated.length,
    pending: pending.length,
    aarrr,
    reporters: Array.from(new Set(reports.map((r) => r.reporterName))),
    fieldOps: new Set(reports.map((r) => r.fieldOpId)).size,
  };
}

// ============================================================================
// UNIFIED AARRR (3 procedures)
// ============================================================================

/**
 * Unified AARRR that aggregates validated field reports + amplification AARRR data
 */
export async function getUnifiedAARRR(campaignId: string) {
  const [fieldStats, amplifications, aarrMetrics, campaign] = await Promise.all([
    getFieldReportStats(campaignId),
    db.campaignAmplification.findMany({ where: { campaignId } }),
    db.campaignAARRMetric.findMany({ where: { campaignId } }),
    db.campaign.findUniqueOrThrow({ where: { id: campaignId } }),
  ]);

  // Field AARRR (from validated field reports)
  const fieldAARRR = fieldStats.aarrr;

  // Amplification AARRR (from aarrAttribution JSON on each amplification)
  const ampAARRR = { acquisition: 0, activation: 0, retention: 0, revenue: 0, referral: 0 };
  for (const amp of amplifications) {
    const attr = amp.aarrAttribution as Record<string, number> | null;
    if (attr) {
      ampAARRR.acquisition += attr.acquisition ?? 0;
      ampAARRR.activation += attr.activation ?? 0;
      ampAARRR.retention += attr.retention ?? 0;
      ampAARRR.revenue += attr.revenue ?? 0;
      ampAARRR.referral += attr.referral ?? 0;
    }
    // Also count raw amp metrics as acquisition
    ampAARRR.acquisition += amp.conversions ?? 0;
  }

  // Metric-based AARRR (from CampaignAARRMetric records)
  const metricAARRR = { acquisition: 0, activation: 0, retention: 0, revenue: 0, referral: 0 };
  for (const m of aarrMetrics) {
    const stage = m.stage.toLowerCase() as keyof typeof metricAARRR;
    if (stage in metricAARRR) {
      metricAARRR[stage] += m.value;
    }
  }

  // Unified totals
  const unified = {
    acquisition: fieldAARRR.acquisition + ampAARRR.acquisition + metricAARRR.acquisition,
    activation: fieldAARRR.activation + ampAARRR.activation + metricAARRR.activation,
    retention: fieldAARRR.retention + ampAARRR.retention + metricAARRR.retention,
    revenue: fieldAARRR.revenue + ampAARRR.revenue + metricAARRR.revenue,
    referral: fieldAARRR.referral + ampAARRR.referral + metricAARRR.referral,
  };

  // Derived KPIs with safe division
  const totalSpend = sumField(amplifications, (a) => a.budget);
  const costPerAcquisition = safeDivide(totalSpend, unified.acquisition);
  const conversionAcqToAct = safeDivide(unified.activation * 100, unified.acquisition);
  const conversionActToRet = safeDivide(unified.retention * 100, unified.activation);
  const revenuePerCustomer = safeDivide(unified.revenue, unified.activation);
  const viralCoefficient = safeDivide(unified.referral, unified.activation);

  // AARRR targets from campaign
  const targets = campaign.aarrTargets as Record<string, number> | null;

  const stages = ["acquisition", "activation", "retention", "revenue", "referral"] as const;
  const healthByStage: Record<string, { value: number; target: number | null; health: number | null }> = {};
  for (const stage of stages) {
    const target = targets?.[stage] ?? null;
    healthByStage[stage] = {
      value: unified[stage],
      target,
      health: target != null ? safeDivide(unified[stage] * 100, target) : null,
    };
  }

  return {
    campaignId,
    unified,
    breakdown: { field: fieldAARRR, amplification: ampAARRR, metrics: metricAARRR },
    derivedKPIs: {
      costPerAcquisition,
      conversionAcqToAct,
      conversionActToRet,
      revenuePerCustomer,
      viralCoefficient,
      totalSpend,
    },
    healthByStage,
    currency: campaign.budgetCurrency,
  };
}

// ============================================================================
// OPERATION RECOMMENDER (3 procedures)
// ============================================================================

/**
 * Score an action based on context (budget, objectives, funnel stage, sector)
 */
export function scoreAction(
  action: { category?: string; drivers?: string[]; kpiTemplates?: string[]; slug?: string },
  context: { budget?: number; funnelStage?: string; preferredDrivers?: string[]; sector?: string; objectives?: string[] }
): number {
  let score = 0;

  // Budget fit
  const budget = context.budget ?? 0;
  if (action.category === "ATL" && budget > 10000000) score += 25;
  else if (action.category === "ATL" && budget > 5000000) score += 15;
  else if (action.category === "ATL") score += 5;

  if (action.category === "BTL" && budget < 5000000) score += 25;
  else if (action.category === "BTL") score += 15;

  if (action.category === "TTL") score += 20; // Always reasonably scored

  // Driver match
  const drivers = action.drivers ?? [];
  const preferred = context.preferredDrivers ?? [];
  const driverOverlap = drivers.filter((d) => preferred.includes(d)).length;
  score += driverOverlap * 15;

  // Funnel stage alignment
  const funnelMap: Record<string, string[]> = {
    ACQUISITION: ["paid-social-awareness", "ooh-billboard", "tv-spot-30s", "radio-spot-30s", "google-search", "sampling"],
    ACTIVATION: ["landing-page", "email-campaign", "event-activation", "social-reel", "ugc-challenge"],
    RETENTION: ["newsletter", "loyalty-program", "email-campaign", "social-post-organic"],
    REVENUE: ["paid-social-conversion", "google-search", "paid-social-retargeting", "event-popup"],
    REFERRAL: ["referral-program", "ugc-challenge", "contest-giveaway", "pr-influencer-seeding"],
  };

  if (context.funnelStage && action.slug) {
    const stageActions = funnelMap[context.funnelStage] ?? [];
    if (stageActions.includes(action.slug)) score += 30;
  }

  // Sector bonuses
  if (context.sector) {
    const sectorDrivers: Record<string, string[]> = {
      FMCG: ["TV", "OOH", "PACKAGING", "EVENT"],
      TECH: ["WEBSITE", "LINKEDIN", "VIDEO"],
      FASHION: ["INSTAGRAM", "TIKTOK", "EVENT", "PR"],
      FINANCE: ["LINKEDIN", "PRINT", "RADIO", "WEBSITE"],
      FOOD: ["INSTAGRAM", "TIKTOK", "EVENT", "PACKAGING"],
      TELECOM: ["TV", "RADIO", "OOH", "EVENT", "FACEBOOK"],
    };
    const sectorPreferred = sectorDrivers[context.sector] ?? [];
    const sectorOverlap = drivers.filter((d) => sectorPreferred.includes(d)).length;
    score += sectorOverlap * 10;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Get recommended operations for a specific funnel stage
 */
export function getRecommendationsForFunnel(
  funnelStage: string,
  budget: number,
  sector?: string
): Array<{ slug: string; name: string; category: ActionCategory; score: number; drivers: string[] }> {
  const context = { budget, funnelStage, sector };

  const scored = ACTION_TYPES.map((at) => ({
    slug: at.slug,
    name: at.name,
    category: at.category,
    drivers: at.drivers,
    score: scoreAction(
      { category: at.category, drivers: at.drivers, kpiTemplates: at.kpiTemplates, slug: at.slug },
      context
    ),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .filter((a) => a.score > 0)
    .slice(0, 20);
}

// ============================================================================
// REQ-16 — ADVERTIS_VECTOR ALIGNMENT (target vs realized)
// ============================================================================

/**
 * Compare campaign advertis_vector (target set at creation) against the
 * strategy's current advertis_vector (realized via scoring).
 * Returns per-pillar delta + overall alignment score (0-100).
 */
export async function getAdvertisVectorAlignment(campaignId: string): Promise<{
  targetVector: Record<string, number>;
  realizedVector: Record<string, number>;
  pillarDeltas: Array<{ pillar: string; target: number; realized: number; delta: number; pct: number }>;
  alignmentScore: number;
  classification: { target: string; realized: string };
}> {
  const campaign = await db.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    select: { advertis_vector: true, strategyId: true },
  });

  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: campaign.strategyId },
    select: { advertis_vector: true },
  });

  const PILLARS = ["a", "d", "v", "e", "r", "t", "i", "s"];
  const targetVec = (campaign.advertis_vector ?? {}) as Record<string, number>;
  const realizedVec = (strategy.advertis_vector ?? {}) as Record<string, number>;

  const pillarDeltas = PILLARS.map((p) => {
    const target = targetVec[p] ?? 0;
    const realized = realizedVec[p] ?? 0;
    const delta = realized - target;
    const pct = target > 0 ? Math.round((delta / target) * 10000) / 100 : 0;
    return { pillar: p, target, realized, delta: Math.round(delta * 100) / 100, pct };
  });

  // Alignment = 100 - average absolute % deviation across pillars (capped)
  const avgDeviation = pillarDeltas.reduce((sum, d) => sum + Math.abs(d.pct), 0) / PILLARS.length;
  const alignmentScore = Math.max(0, Math.round(100 - avgDeviation));

  const classify = (composite: number) =>
    composite <= 80 ? "ZOMBIE" : composite <= 120 ? "ORDINAIRE" : composite <= 160 ? "FORTE" : composite <= 180 ? "CULTE" : "ICONE";

  return {
    targetVector: targetVec,
    realizedVector: realizedVec,
    pillarDeltas,
    alignmentScore,
    classification: {
      target: classify(targetVec.composite ?? 0),
      realized: classify(realizedVec.composite ?? 0),
    },
  };
}

// ============================================================================
// REQ-17 — DEVOTION OBJECTIVE TRACKING
// ============================================================================

/**
 * Track devotion ladder progression for a campaign.
 * Compares devotionObjective (target: e.g. +5% Engagé→Ambassadeur)
 * against actual AARRR E-pillar metrics (Engagement data).
 */
export async function getDevotionProgression(campaignId: string): Promise<{
  objective: Record<string, unknown>;
  stages: Array<{
    stage: string;
    baseline: number;
    target: number;
    actual: number;
    progressPct: number;
    onTrack: boolean;
  }>;
  overallProgress: number;
}> {
  const campaign = await db.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    select: { devotionObjective: true, aarrTargets: true },
  });

  const objective = (campaign.devotionObjective ?? {}) as Record<string, unknown>;
  const aarrTargets = (campaign.aarrTargets ?? {}) as Record<string, number>;

  // Fetch actual AARRR metrics for this campaign
  const metrics = await db.campaignAARRMetric.findMany({
    where: { campaignId },
    select: { stage: true, metric: true, value: true, target: true },
  });

  // Define the 5 devotion ladder stages mapped from AARRR
  const DEVOTION_STAGES = [
    { stage: "Awareness", aarrStage: "ACQUISITION", key: "awareness" },
    { stage: "Interest", aarrStage: "ACTIVATION", key: "interest" },
    { stage: "Engaged", aarrStage: "RETENTION", key: "engaged" },
    { stage: "Ambassadeur", aarrStage: "REFERRAL", key: "ambassador" },
    { stage: "Revenue", aarrStage: "REVENUE", key: "revenue" },
  ];

  const stages = DEVOTION_STAGES.map((ds) => {
    const stageMetrics = metrics.filter((m) => m.stage === ds.aarrStage);
    const actualTotal = stageMetrics.reduce((sum, m) => sum + (m.value ?? 0), 0);
    const targetTotal = stageMetrics.reduce((sum, m) => sum + (m.target ?? 0), 0)
      || (aarrTargets[ds.key] ?? 0);
    const baseline = (objective[`${ds.key}_baseline`] as number) ?? 0;
    const target = targetTotal || ((objective[`${ds.key}_target`] as number) ?? 0);

    const progressPct = target > 0 ? Math.round((actualTotal / target) * 100) : 0;

    return {
      stage: ds.stage,
      baseline,
      target,
      actual: actualTotal,
      progressPct: Math.min(progressPct, 200), // cap at 200% to allow overperformance
      onTrack: progressPct >= 70, // 70%+ = on track
    };
  });

  const overallProgress = stages.length > 0
    ? Math.round(stages.reduce((sum, s) => sum + s.progressPct, 0) / stages.length)
    : 0;

  return { objective, stages, overallProgress };
}

/**
 * Set or update the devotion objective for a campaign.
 */
export async function setDevotionObjective(
  campaignId: string,
  objective: Record<string, unknown>,
): Promise<{ campaignId: string; devotionObjective: Record<string, unknown> }> {
  const updated = await db.campaign.update({
    where: { id: campaignId },
    data: { devotionObjective: objective as Prisma.InputJsonValue },
    select: { id: true, devotionObjective: true },
  });
  return {
    campaignId: updated.id,
    devotionObjective: (updated.devotionObjective ?? {}) as Record<string, unknown>,
  };
}
