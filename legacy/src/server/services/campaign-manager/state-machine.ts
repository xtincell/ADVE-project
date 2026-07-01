/**
 * Campaign Manager 360 — State Machine
 * 12 campaign states with gate reviews and allowed transitions
 */

export type CampaignState =
  | "BRIEF_DRAFT"
  | "BRIEF_VALIDATED"
  | "PLANNING"
  | "CREATIVE_DEV"
  | "PRODUCTION"
  | "PRE_PRODUCTION"
  | "APPROVAL"
  | "READY_TO_LAUNCH"
  | "LIVE"
  | "POST_CAMPAIGN"
  | "ARCHIVED"
  | "CANCELLED";

interface Transition {
  from: CampaignState;
  to: CampaignState;
  requiresApproval: boolean;
  gateChecks?: string[];
}

const TRANSITIONS: Transition[] = [
  { from: "BRIEF_DRAFT", to: "BRIEF_VALIDATED", requiresApproval: true, gateChecks: ["brief_complete", "budget_defined"] },
  { from: "BRIEF_VALIDATED", to: "PLANNING", requiresApproval: false },
  { from: "PLANNING", to: "CREATIVE_DEV", requiresApproval: true, gateChecks: ["timeline_set", "team_assigned"] },
  { from: "CREATIVE_DEV", to: "PRODUCTION", requiresApproval: false },
  { from: "PRODUCTION", to: "PRE_PRODUCTION", requiresApproval: false },
  { from: "PRE_PRODUCTION", to: "APPROVAL", requiresApproval: false, gateChecks: ["all_assets_ready"] },
  { from: "APPROVAL", to: "READY_TO_LAUNCH", requiresApproval: true, gateChecks: ["client_approved"] },
  { from: "READY_TO_LAUNCH", to: "LIVE", requiresApproval: true, gateChecks: ["launch_checklist_complete"] },
  { from: "LIVE", to: "POST_CAMPAIGN", requiresApproval: false },
  { from: "POST_CAMPAIGN", to: "ARCHIVED", requiresApproval: false },
  // Cancellation from any active state
  { from: "BRIEF_DRAFT", to: "CANCELLED", requiresApproval: false },
  { from: "BRIEF_VALIDATED", to: "CANCELLED", requiresApproval: true },
  { from: "PLANNING", to: "CANCELLED", requiresApproval: true },
  { from: "CREATIVE_DEV", to: "CANCELLED", requiresApproval: true },
  { from: "PRODUCTION", to: "CANCELLED", requiresApproval: true },
  { from: "PRE_PRODUCTION", to: "CANCELLED", requiresApproval: true },
  { from: "APPROVAL", to: "CANCELLED", requiresApproval: true },
  { from: "READY_TO_LAUNCH", to: "CANCELLED", requiresApproval: true },
  { from: "LIVE", to: "CANCELLED", requiresApproval: true },
  // Rollback transitions
  { from: "APPROVAL", to: "CREATIVE_DEV", requiresApproval: true },
  { from: "APPROVAL", to: "PRODUCTION", requiresApproval: true },
];

export function canTransition(from: CampaignState, to: CampaignState): boolean {
  return TRANSITIONS.some((t) => t.from === from && t.to === to);
}

export function getTransition(from: CampaignState, to: CampaignState): Transition | undefined {
  return TRANSITIONS.find((t) => t.from === from && t.to === to);
}

export function getAvailableTransitions(from: CampaignState): CampaignState[] {
  return TRANSITIONS.filter((t) => t.from === from).map((t) => t.to);
}

export function requiresApproval(from: CampaignState, to: CampaignState): boolean {
  const transition = getTransition(from, to);
  return transition?.requiresApproval ?? true;
}

export function getGateChecks(from: CampaignState, to: CampaignState): string[] {
  const transition = getTransition(from, to);
  return transition?.gateChecks ?? [];
}

/**
 * Validate gate checks for a campaign transition
 */
export async function validateGates(
  campaignId: string,
  from: CampaignState,
  to: CampaignState,
  context: { hasBrief: boolean; hasBudget: boolean; hasTimeline: boolean; hasTeam: boolean; allAssetsReady: boolean; clientApproved: boolean; launchChecklist: boolean }
): Promise<{ valid: boolean; failedChecks: string[] }> {
  const gates = getGateChecks(from, to);
  const failedChecks: string[] = [];

  for (const gate of gates) {
    switch (gate) {
      case "brief_complete":
        if (!context.hasBrief) failedChecks.push("brief_complete");
        break;
      case "budget_defined":
        if (!context.hasBudget) failedChecks.push("budget_defined");
        break;
      case "timeline_set":
        if (!context.hasTimeline) failedChecks.push("timeline_set");
        break;
      case "team_assigned":
        if (!context.hasTeam) failedChecks.push("team_assigned");
        break;
      case "all_assets_ready":
        if (!context.allAssetsReady) failedChecks.push("all_assets_ready");
        break;
      case "client_approved":
        if (!context.clientApproved) failedChecks.push("client_approved");
        break;
      case "launch_checklist_complete":
        if (!context.launchChecklist) failedChecks.push("launch_checklist_complete");
        break;
    }
  }

  return { valid: failedChecks.length === 0, failedChecks };
}
