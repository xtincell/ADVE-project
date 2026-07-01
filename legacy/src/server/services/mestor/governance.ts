/**
 * MESTOR GOVERNANCE — Registry of all services governed by Mestor (Decision)
 *
 * Mestor owns: strategic decision-making, RTIS cascade, feedback loops,
 * intake flows, and the Notoria recommendation engine.
 */

// ── Core (already in mestor/) ─────────────────────────────────────

export { actualizePillar, generateADVERecommendations, runRTISCascade } from "./rtis-cascade";
export { buildPlan, executeNextStep } from "./hyperviseur";

// ── Governed Services ─────────────────────────────────────────────

// Notoria (shared tool, Mestor is lead)
export async function loadNotoria() {
  return import("@/server/services/notoria");
}

// RTIS protocols
export async function loadRtisProtocols() {
  return import("@/server/services/rtis-protocols");
}

// Feedback system
export async function loadFeedbackLoop() {
  return import("@/server/services/feedback-loop");
}

// Intake flows (L'Oracle)
export async function loadQuickIntake() {
  return import("@/server/services/quick-intake");
}
export async function loadBootSequence() {
  return import("@/server/services/boot-sequence");
}
export async function loadBriefIngest() {
  return import("@/server/services/brief-ingest");
}

// Ingestion pipeline
export async function loadIngestionPipeline() {
  return import("@/server/services/ingestion-pipeline");
}

// ── Governance Manifest ───────────────────────────────────────────

export const MESTOR_GOVERNED_SERVICES = [
  "notoria",
  "rtis-protocols",
  "feedback-loop",
  "feedback-processor",
  "quick-intake",
  "boot-sequence",
  "brief-ingest",
  "ingestion-pipeline",
] as const;

export type MestorService = (typeof MESTOR_GOVERNED_SERVICES)[number];
