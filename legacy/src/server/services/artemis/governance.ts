/**
 * ARTEMIS GOVERNANCE — Registry of all services governed by Artemis (Orchestration)
 *
 * Artemis owns: campaign lifecycle, deal pipeline, creative execution,
 * talent matching, quality control, and driver management.
 *
 * This file ensures every Artemis-governed service is importable from one place
 * and provides a governance health check.
 */

// ── Governed Services ─────────────────────────────────────────────

// Campaign lifecycle
export async function loadCampaignManager() {
  return import("@/server/services/campaign-manager");
}

// Budget & financial orchestration (execution-side, Thot validates)
export async function loadBudgetAllocator() {
  return import("@/server/services/budget-allocator");
}
export async function loadCampaignBudgetEngine() {
  return import("@/server/services/campaign-budget-engine");
}

// Campaign planning
export async function loadCampaignPlanGenerator() {
  return import("@/server/services/campaign-plan-generator");
}

// Implementation & drivers
export async function loadImplementationGenerator() {
  return import("@/server/services/implementation-generator");
}
export async function loadDriverEngine() {
  return import("@/server/services/driver-engine");
}
export async function loadGuidelinesRenderer() {
  return import("@/server/services/guidelines-renderer");
}

// CRM & deals
export async function loadCrmEngine() {
  return import("@/server/services/crm-engine");
}
export async function loadUpsellDetector() {
  return import("@/server/services/upsell-detector");
}

// Talent & matching
export async function loadMatchingEngine() {
  return import("@/server/services/matching-engine");
}
export async function loadTalentEngine() {
  return import("@/server/services/talent-engine");
}
export async function loadTierEvaluator() {
  return import("@/server/services/tier-evaluator");
}
export async function loadTeamAllocator() {
  return import("@/server/services/team-allocator");
}

// Quality & orchestration
export async function loadQcRouter() {
  return import("@/server/services/qc-router");
}
export async function loadApprovalWorkflow() {
  return import("@/server/services/approval-workflow");
}
export async function loadPipelineOrchestrator() {
  return import("@/server/services/pipeline-orchestrator");
}
export async function loadSequenceVault() {
  return import("@/server/services/sequence-vault");
}

// Diagnostics
export async function loadDiagnosticEngine() {
  return import("@/server/services/diagnostic-engine");
}

// Mission templates
export async function loadMissionTemplates() {
  return import("@/server/services/mission-templates");
}

// ── Governance Manifest ───────────────────────────────────────────

export const ARTEMIS_GOVERNED_SERVICES = [
  "campaign-manager",
  "campaign-plan-generator",
  "campaign-budget-engine",
  "budget-allocator",
  "implementation-generator",
  "driver-engine",
  "guidelines-renderer",
  "crm-engine",
  "upsell-detector",
  "matching-engine",
  "talent-engine",
  "tier-evaluator",
  "team-allocator",
  "qc-router",
  "approval-workflow",
  "pipeline-orchestrator",
  "sequence-vault",
  "diagnostic-engine",
  "mission-templates",
] as const;

export type ArtemisService = (typeof ARTEMIS_GOVERNED_SERVICES)[number];
