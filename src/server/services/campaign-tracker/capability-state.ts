/**
 * Campaign Tracker — Capability state (Phase 19, ADR-0052 §2.5 primitive #1).
 *
 * Layer 1 — pas d'IO. Pure types + registry.
 *
 * Chaque sous-cluster L2 expose un état de capacité 4-états qui détermine
 * son comportement runtime sans bloquer les autres sous-clusters :
 *
 *   READY     — toutes deps disponibles, cluster pleinement fonctionnel
 *   PARTIAL   — deps partielles, calculs faits avec ce qu'on a, output flagué
 *               INCOMPLETE_DATA
 *   STUB      — deps absentes, retour DEFERRED_AWAITING_DEPS
 *               (pattern Anubis Credentials Vault, ADR-0021)
 *   DISABLED  — décision opérateur : cluster off pour cette marque/tenant
 *
 * Pattern STUB → MVP → PRODUCTION par sous-cluster (ADR-0052 §2.5 primitive #2)
 * tracé via `lifecycle` aligné sur `Sequence.lifecycle` (ADR-0042).
 *
 * Cf. docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md
 */

export type ClusterCapabilityState = "READY" | "PARTIAL" | "STUB" | "DISABLED";

export type ClusterLifecycle = "STUB" | "MVP" | "PRODUCTION";

export interface ClusterCapability {
  /** Slug du sous-cluster (ex: `trajectory`, `bigIdeaCoherence`). */
  readonly slug: string;
  /** Cluster ADR-0052 (A à H). */
  readonly cluster: "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
  /** État runtime à l'instant t. */
  readonly state: ClusterCapabilityState;
  /** Maturité d'implémentation. */
  readonly lifecycle: ClusterLifecycle;
  /** Description courte (utilisée dans `/console/governance/campaign-tracker`). */
  readonly description: string;
  /** Codes erreur structurés émis par le sous-cluster en cas de PARTIAL/STUB. */
  readonly degradationCodes: readonly string[];
  /**
   * ADR enfant éventuel pour formaliser la promotion `MVP → PRODUCTION`.
   * Cf. ADR-0052 §16 colonne "ADR enfant éventuel".
   */
  readonly childAdr?: string;
}

/**
 * Registry canonique des sous-clusters Phase 19 Vague 1 (Cluster A + B).
 * Vague 2/3 ajouteront leurs sous-clusters via extension de ce registry.
 *
 * Audit anti-drift : `tests/unit/governance/campaign-tracker-cluster-coverage.test.ts`
 * exige qu'au moins une entrée existe pour chaque cluster A→H une fois Vague 3
 * fermée (cf. ADR-0052 §14 §test 5).
 */
export const CLUSTER_CAPABILITIES: readonly ClusterCapability[] = [
  // ── Cluster A — Trajectoire & altitude ──
  {
    slug: "trajectory.snapshot",
    cluster: "A",
    state: "READY",
    lifecycle: "MVP",
    description: "Fige snapshots immutables Campaign au passage READY_TO_LAUNCH → LIVE.",
    degradationCodes: ["MISSING_BIG_IDEA_SNAPSHOT", "MISSING_MANIFESTO_SNAPSHOT", "STAGE_SEQUENCING_VIOLATION"],
  },
  {
    slug: "trajectory.fuelBurnRate",
    cluster: "A",
    state: "READY",
    lifecycle: "MVP",
    description: "Loi 3 — vérifie burn rate vs revenue pacing, recommande pause si flame-out.",
    degradationCodes: ["MISSING_BUDGET", "MISSING_AARR_TARGETS", "INSUFFICIENT_TELEMETRY"],
  },
  {
    slug: "trajectory.regretWindow",
    cluster: "A",
    state: "PARTIAL",
    lifecycle: "MVP",
    description: "Alarmes J+3 / J+7 / J+14 sur dérive KPIs vs aarrTargets.",
    degradationCodes: ["INSUFFICIENT_TELEMETRY", "EARLY_WARNING_DRIFT"],
  },

  // ── Cluster B — Cohérence narrative ──
  {
    slug: "coherence.bigIdeaCoherence",
    cluster: "B",
    state: "READY",
    lifecycle: "MVP",
    description:
      "Score 0..1 d'une CampaignAction vs BigIdea + Manifesto snapshots Campaign. " +
      "MVP heuristic = lexical similarity (Jaccard tokens normalisés). PRODUCTION = LLM eval Glory tool.",
    degradationCodes: ["MISSING_BIG_IDEA_SNAPSHOT", "MISSING_MANIFESTO_SNAPSHOT", "MANIPULATION_DRIFT"],
    childAdr: "0052-B-coherence-llm-evaluator.md",
  },
  {
    slug: "coherence.culturalDebt",
    cluster: "B",
    state: "READY",
    lifecycle: "MVP",
    description: "Mesure gap Manifesto.beliefs[] ↔ CampaignAction claims exécutés. Aggrège bigIdeaCoherenceScore.",
    degradationCodes: ["MISSING_MANIFESTO_SNAPSHOT", "INSUFFICIENT_ACTIONS_SAMPLED"],
  },
  {
    slug: "coherence.mythArc",
    cluster: "B",
    state: "READY",
    lifecycle: "MVP",
    description:
      "Cohérence chronologique inter-campagne pour une Strategy. " +
      "Score similarity entre BigIdea snapshots N et N-1.",
    degradationCodes: ["INSUFFICIENT_CAMPAIGN_HISTORY", "MISSING_BIG_IDEA_SNAPSHOT"],
  },
] as const;

export const CLUSTER_BY_SLUG = new Map(CLUSTER_CAPABILITIES.map((c) => [c.slug, c]));

export function getClusterCapability(slug: string): ClusterCapability | undefined {
  return CLUSTER_BY_SLUG.get(slug);
}

export function isReady(slug: string): boolean {
  return CLUSTER_BY_SLUG.get(slug)?.state === "READY";
}

export function isAvailable(slug: string): boolean {
  const c = CLUSTER_BY_SLUG.get(slug);
  return c?.state === "READY" || c?.state === "PARTIAL";
}

/**
 * Sentinel error code aligné sur le pattern Anubis Credentials Vault
 * (ADR-0021 — `DEFERRED_AWAITING_CREDENTIALS`). Sub-cluster `STUB`
 * retourne ce code structuré au lieu de throw.
 */
export const DEFERRED_AWAITING_DEPS = "DEFERRED_AWAITING_DEPS" as const;
