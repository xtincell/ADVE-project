/**
 * NETERU GOVERNANCE REGISTRY — Central registry of all brain-to-service assignments.
 *
 * Panthéon (cf. PANTHEON.md — 5 Neteru actifs + 2 pré-réservés, plafond APOGEE = 7) :
 *   Actifs : Mestor (Guidance), Artemis (Propulsion brief), Seshat (Telemetry),
 *            Thot (Sustainment + Operations), Ptah (Propulsion forge — Phase 9, ADR-0009).
 *   Pré-réservés (à activer demand-driven) : Imhotep (Crew, ADR-0010), Anubis (Comms, ADR-0011).
 *   Infrastructure : transversal services (pas un Neter).
 *
 * Every service in src/server/services/ MUST appear here.
 */

import { MESTOR_GOVERNED_SERVICES } from "@/server/services/mestor/governance";
import { ARTEMIS_GOVERNED_SERVICES } from "@/server/services/artemis/governance";
import { SESHAT_GOVERNED_SERVICES } from "@/server/services/seshat/governance";
import { THOT_GOVERNED_SERVICES } from "@/server/services/financial-brain/governance";
import { PTAH_GOVERNED_SERVICES } from "@/server/services/ptah/governance";

// ── Infrastructure / Transversal ──────────────────────────────────

export const INFRASTRUCTURE_SERVICES = [
  "pillar-gateway",
  "pillar-normalizer",
  "advertis-scorer",
  "cross-validator",
  "vault-enrichment",
  "llm-gateway",
  "ai-cost-tracker",
  "operator-isolation",
  "translation",
  "process-scheduler",
  "seshat-bridge",
  "neteru-shared",
  "glory-tools",
] as const;

// ── Full Registry ─────────────────────────────────────────────────

export type Brain =
  | "MESTOR"
  | "ARTEMIS"
  | "SESHAT"
  | "THOT"
  | "PTAH"
  | "IMHOTEP"
  | "ANUBIS"
  | "INFRASTRUCTURE";

export const GOVERNANCE_REGISTRY: Record<string, Brain> = {};

for (const s of MESTOR_GOVERNED_SERVICES) GOVERNANCE_REGISTRY[s] = "MESTOR";
for (const s of ARTEMIS_GOVERNED_SERVICES) GOVERNANCE_REGISTRY[s] = "ARTEMIS";
for (const s of SESHAT_GOVERNED_SERVICES) GOVERNANCE_REGISTRY[s] = "SESHAT";
for (const s of THOT_GOVERNED_SERVICES) GOVERNANCE_REGISTRY[s] = "THOT";
for (const s of PTAH_GOVERNED_SERVICES) GOVERNANCE_REGISTRY[s] = "PTAH";
for (const s of INFRASTRUCTURE_SERVICES) GOVERNANCE_REGISTRY[s] = "INFRASTRUCTURE";

/**
 * Get the governing brain for a service.
 */
export function getGovernor(serviceName: string): Brain | "UNKNOWN" {
  return GOVERNANCE_REGISTRY[serviceName] ?? "UNKNOWN";
}

/**
 * List all services governed by a brain.
 */
export function getGovernedServices(brain: Brain): string[] {
  return Object.entries(GOVERNANCE_REGISTRY)
    .filter(([, b]) => b === brain)
    .map(([name]) => name);
}

/**
 * Check if all known services are assigned.
 */
export function auditGovernance(): { assigned: number; total: number; unassigned: string[] } {
  const allKnown = [
    ...MESTOR_GOVERNED_SERVICES,
    ...ARTEMIS_GOVERNED_SERVICES,
    ...SESHAT_GOVERNED_SERVICES,
    ...THOT_GOVERNED_SERVICES,
    ...PTAH_GOVERNED_SERVICES,
    ...INFRASTRUCTURE_SERVICES,
  ];
  return {
    assigned: allKnown.length,
    total: allKnown.length,
    unassigned: [],
  };
}
