/**
 * SESHAT GOVERNANCE — Registry of all services governed by Seshat (Observation)
 *
 * Seshat owns: knowledge graph, intelligence, monitoring, metrics,
 * staleness tracking, audit trails, and data export.
 *
 * Jehuty (intelligence feed) is Seshat's press organ — shared tool.
 */

// ── Governed Services ─────────────────────────────────────────────

// Knowledge graph
export async function loadKnowledgeCapture() {
  return import("@/server/services/knowledge-capture");
}
export async function loadKnowledgeAggregator() {
  return import("@/server/services/knowledge-aggregator");
}
export async function loadKnowledgeSeeder() {
  return import("@/server/services/knowledge-seeder");
}

// Intelligence & metrics
export async function loadCultIndexEngine() {
  return import("@/server/services/cult-index-engine");
}
export async function loadDevotionEngine() {
  return import("@/server/services/devotion-engine");
}
export async function loadEcosystemEngine() {
  return import("@/server/services/ecosystem-engine");
}

// Monitoring & tracking
export async function loadSlaTracker() {
  return import("@/server/services/sla-tracker");
}
export async function loadStalenessObserver() {
  return import("@/server/services/staleness-propagator");
}

// Data & presentation
export async function loadDataExport() {
  return import("@/server/services/data-export");
}
export async function loadStrategyPresentation() {
  return import("@/server/services/strategy-presentation");
}
export async function loadAssetTagger() {
  return import("@/server/services/asset-tagger");
}
export async function loadValueReportGenerator() {
  return import("@/server/services/value-report-generator");
}

// Audit
export async function loadAuditTrail() {
  return import("@/server/services/audit-trail");
}

// Pillar observation
export async function loadPillarMaturity() {
  return import("@/server/services/pillar-maturity");
}
export async function loadPillarVersioning() {
  return import("@/server/services/pillar-versioning");
}

// Jehuty (Seshat's press organ — shared tool)
export async function loadJehuty() {
  return import("@/server/services/jehuty");
}

// ── Governance Manifest ───────────────────────────────────────────

export const SESHAT_GOVERNED_SERVICES = [
  "knowledge-capture",
  "knowledge-aggregator",
  "knowledge-seeder",
  "cult-index-engine",
  "devotion-engine",
  "ecosystem-engine",
  "sla-tracker",
  "staleness-propagator",
  "data-export",
  "strategy-presentation",
  "asset-tagger",
  "value-report-generator",
  "audit-trail",
  "pillar-maturity",
  "pillar-versioning",
  "jehuty",
] as const;

export type SeshatService = (typeof SESHAT_GOVERNED_SERVICES)[number];
