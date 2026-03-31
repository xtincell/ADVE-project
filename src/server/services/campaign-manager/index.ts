/**
 * Campaign Manager 360 — Main Service
 * Orchestrates campaign lifecycle, transitions, budget, AARRR reporting
 */

import { db } from "@/lib/db";
import { canTransition, requiresApproval, getAvailableTransitions, validateGates, type CampaignState } from "./state-machine";
import { ACTION_TYPES, getActionType, getActionsByCategory, type ActionCategory } from "./action-types";

export { canTransition, requiresApproval, getAvailableTransitions } from "./state-machine";
export { ACTION_TYPES, getActionType, getActionsByCategory, getActionsByDriver, searchActions } from "./action-types";

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

/**
 * Calculate campaign budget breakdown by category
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

/**
 * Get campaign team with roles
 */
export async function getCampaignTeam(campaignId: string) {
  return db.campaignTeamMember.findMany({
    where: { campaignId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });
}

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
