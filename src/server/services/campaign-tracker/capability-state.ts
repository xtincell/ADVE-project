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
    childAdr: "0053-coherence-llm-evaluator.md",
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

  // ── Cluster C — Superfan economy (Vague 2) ──
  {
    slug: "superfan.attribution",
    cluster: "C",
    state: "PARTIAL",
    lifecycle: "MVP",
    description:
      "Modèle paramétrique d'attribution d'évangélistes par CampaignAction (horizon 24 mois). " +
      "Phase 19 heuristic : ratio devotionTransitionsObserved × LTV multiplier (superfan-economy.ts). " +
      "Phase 23 calibration path : pure-TS logistic regression + ROC AUC + RMSE + AttributionResult " +
      "discriminated union (superfan-attribution.ts, Stories 4.1–4.5 + Epic 6 Story 6.1).",
    degradationCodes: ["MISSING_DEVOTION_TRANSITIONS", "INSUFFICIENT_TELEMETRY"],
    // Phase 23 Story 4.3 — retire dangling ref `0054-superfan-attribution-model`
    // per P22-7 (same commit as files touched). ADR-0081 supersedes it.
    childAdr: "0081",
  },
  {
    slug: "superfan.stickiness",
    cluster: "C",
    state: "PARTIAL",
    lifecycle: "MVP",
    description:
      "Cohort longitudinal J+30/J+90/J+180 — taux de rétention via CRM connector (Credentials Vault). " +
      "Phase 23 Story 4.3 wires `crmProvider.fetchCohortSignal` with exhaustive ConnectorResult switch ; " +
      "returns CohortRetentionMeasurement discriminated union (OK | INSUFFICIENT_DATA + typed reason). " +
      "PRODUCTION promotion gated on direction calibration review (Epic 6 Story 6.4).",
    degradationCodes: [
      "DEFERRED_AWAITING_CREDENTIALS",
      "DEGRADED_INSUFFICIENT_DATA",
      "DEGRADED_VENDOR_OUTAGE",
      "DEGRADED_RATE_LIMITED",
      "DEGRADED_AUTH_REVOKED",
      "WINDOW_NOT_REACHED",
      "CAMPAIGN_NOT_FOUND",
      "TENANT_MISMATCH",
    ],
    childAdr: "0081",
  },
  {
    slug: "superfan.crmCapture",
    cluster: "C",
    state: "PARTIAL",
    lifecycle: "MVP",
    description:
      "À POST_CAMPAIGN → ARCHIVED, cross-check le count d'évangélistes locaux (depuis " +
      "devotionTransitionsObserved) contre la cohort CRM via `crmProvider.fetchCohortSignal`. " +
      "Phase 23 Story 4.3 wires CrmCaptureMeasurement discriminated union — divergence " +
      "local/CRM = operator-actionable hint. PRODUCTION : userIds explicites + segment write-back.",
    degradationCodes: [
      "DEFERRED_AWAITING_CREDENTIALS",
      "DEGRADED_INSUFFICIENT_DATA",
      "DEGRADED_VENDOR_OUTAGE",
      "DEGRADED_RATE_LIMITED",
      "DEGRADED_AUTH_REVOKED",
      "NO_EVANGELISTS_DETECTED",
      "CAMPAIGN_NOT_FOUND",
      "TENANT_MISMATCH",
    ],
    childAdr: "0081",
  },

  // ── Cluster D — Signaux faibles & culture (Vague 2) ──
  {
    slug: "culture.overtonReadiness",
    cluster: "D",
    state: "PARTIAL",
    lifecycle: "MVP",
    description:
      "Pré-LIVE evaluator : axe culturel sectoriel ciblé est-il prêt ? " +
      "MVP heuristic = sentiment Tarsis 30j + saisonnalité sectorielle. " +
      "PRODUCTION = algo sophistiqué (ADR enfant).",
    degradationCodes: ["INSUFFICIENT_TARSIS_HISTORY", "MISSING_OVERTON_HYPOTHESIS"],
    childAdr: "0055-overton-algo.md",
  },
  {
    slug: "culture.overtonShift",
    cluster: "D",
    state: "PARTIAL",
    lifecycle: "MVP",
    description:
      "Post-LIVE measurer : déplacement de l'axe culturel mesuré vs hypothèse. " +
      "MVP = vocabulary delta + sentiment delta sectoriel sur 60-day window.",
    degradationCodes: ["MISSING_OVERTON_HYPOTHESIS", "INSUFFICIENT_TARSIS_TELEMETRY"],
  },
  {
    slug: "culture.mcpIngest",
    cluster: "D",
    state: "PARTIAL",
    lifecycle: "MVP",
    description:
      "Ingest contexte founder MCP entrant (Slack/Notion/Drive/GitHub) scopé période campagne. " +
      "Phase 23 Story 3.5 : PII classifier gate via Glory tool `mcp-content-pii-classifier` " +
      "+ regex pre-screen (defense-in-depth). Fail-closed sur classifier failure (NFR6). " +
      "READY transition pending Story 5.3 HYBRID migration of the classifier (strict Zod output).",
    degradationCodes: ["DEFERRED_AWAITING_CREDENTIALS", "PII_CLASSIFIER_NOT_CONFIGURED", "PII_CLASSIFIER_FAIL_CLOSED"],
    childAdr: "0078",
  },
  {
    slug: "culture.tarsisBridge",
    cluster: "D",
    state: "PARTIAL",
    lifecycle: "MVP",
    description:
      "Capture continue Tarsis pendant Campaign LIVE — bridge Seshat→Tarsis MVP câblé. " +
      "openCampaignCaptureSession + closeCampaignCaptureSession persistent dans " +
      "TarsisCaptureSession + update CampaignFieldOp.tarsisCaptureSessionId. " +
      "Signal collector réel (signalsCount + payload aggregation) reste à câbler PRODUCTION.",
    degradationCodes: ["MVP_NO_SIGNAL_COLLECTOR_WIRED", "NO_SESSION_OPEN"],
  },

  // ── Cluster E — Boucles d'apprentissage (Vague 3) ──
  {
    slug: "learnings.oracleReconciler",
    cluster: "E",
    state: "READY",
    lifecycle: "MVP",
    description:
      "Post-campaign, extrait OPERATOR_AMEND_PILLAR_PROPOSAL[] depuis postmortem 12q (Q1/Q2/Q9/Q11). " +
      "MVP fonctionnel : transforme JSON postmortemStructured en proposals reviewable. " +
      "PRODUCTION : Glory tool postmortem-12q LLM produit le postmortemStructured upstream.",
    degradationCodes: ["MISSING_POSTMORTEM_REPORT", "MISSING_POSTMORTEM_STRUCTURED"],
    childAdr: "0056-postmortem-12q.md",
  },
  {
    slug: "learnings.vbEnrichment",
    cluster: "E",
    state: "READY",
    lifecycle: "MVP",
    description:
      "Extrait patterns depuis CampaignAction avec bigIdeaCoherenceScore ≥ 0.7, propose " +
      "VariableBibleEnrichmentProposal[] structurées BIBLE_A/D/V/E selon pillarServed dominant. " +
      "PRODUCTION = LLM analysis cross-campagnes.",
    degradationCodes: ["NO_HIGH_COHERENCE_ACTIONS", "NO_PROPOSALS_GENERATED"],
  },
  {
    slug: "learnings.crewLoop",
    cluster: "E",
    state: "PARTIAL",
    lifecycle: "MVP",
    description:
      "Score CrewPerformance par 12 dimensions via Glory tool LLM `crew-performance-evaluator`. " +
      "Câblage executeTool en place avec fail-safe neutre 50. PRODUCTION : grille calibrée " +
      "+ mapping skillGaps → courses Imhotep.",
    degradationCodes: ["LLM_FALLBACK_ALL_NEUTRAL", "NO_TEAM_MEMBERS"],
    childAdr: "0057-crew-scoring.md",
  },
  {
    slug: "learnings.sequencesPromoter",
    cluster: "E",
    state: "READY",
    lifecycle: "MVP",
    description:
      "Évalue si la sequence runtime mérite promotion DRAFT→STABLE basée sur tierDelta + cultIndexDelta + altitudeRegression. " +
      "MVP : timesReused placeholder=1 (tracker à ship Vague 4).",
    degradationCodes: ["TIMES_REUSED_NOT_TRACKED"],
  },

  // ── Cluster F — Économie agence (Vague 3) ──
  {
    slug: "economics.activityMargins",
    cluster: "F",
    state: "PARTIAL",
    lifecycle: "MVP",
    description:
      "Agrège marges anonymisées cross-clients par category × période × marché (k-anonymity k≥5). " +
      "MVP : agrégation directe sur CampaignAction + check k≥5. " +
      "PRODUCTION : data lake séparé `agency-economics-aggregates` (ADR enfant).",
    degradationCodes: ["K_ANONYMITY_VIOLATION_HIDDEN", "K_ANONYMITY_VIOLATIONS_*"],
    childAdr: "0058-anonymization.md",
  },
  {
    slug: "economics.resourceSaturation",
    cluster: "F",
    state: "PARTIAL",
    lifecycle: "MVP",
    description:
      "Forecast capacity heatmap agency-wide × N semaines + bottlenecks par rôle. " +
      "Bloquant signature nouveau deal si saturationRatio > 0.85. " +
      "MVP : 40h/sem placeholder. PRODUCTION : Imhotep talent-availability-engine.",
    degradationCodes: ["MVP_PLACEHOLDER_CAPACITY_LIMITS", "CAMPAIGN_TEAM_MEMBER_QUERY_FAILED"],
  },

  // ── Cluster G — Souveraineté opérationnelle (Vague 3) ──
  {
    slug: "souverainete.complianceCheck",
    cluster: "G",
    state: "PARTIAL",
    lifecycle: "MVP",
    description:
      "Pré-flight CampaignFieldOp.location → country → règles ARPP/CONAC/ASA. " +
      "MVP : 4 pays + heuristic regex location → country. PRODUCTION : ADR-0037 country-scoped knowledge.",
    degradationCodes: ["MISSING_COUNTRY_CODE", "NO_RULES_REGISTERED_FOR_COUNTRY"],
  },
  {
    slug: "souverainete.credentialsChain",
    cluster: "G",
    state: "READY",
    lifecycle: "MVP",
    description:
      "Snapshot ExternalConnector.id[] utilisés au LIVE — audit chain of custody hashé SHA256. " +
      "Pas de lecture des secrets, uniquement les IDs. PRODUCTION : récupère via Anubis Credentials Vault scope-aware.",
    degradationCodes: ["EXTERNAL_CONNECTOR_QUERY_FAILED"],
  },

  // ── Cluster H — Negative space audit (Vague 3) ──
  {
    slug: "audit.negativeSpace",
    cluster: "H",
    state: "PARTIAL",
    lifecycle: "MVP",
    description:
      "Audit cross-Neteru — détecte 6 catégories de gaps. MVP shippe 3 catégories : " +
      "BRAND_OBLIGATION_UNCOVERED + LADDER_RUNG_ORPHAN + DORMANT_TOOL_HINT. " +
      "3 autres restent PARTIAL : CHANNEL_FIT_GAP, TACTICAL_ACTIVATION_MISSING, ORACLE_RECONCILIATION_PARTIAL.",
    degradationCodes: [
      "CHANNEL_FIT_GAP_NOT_IMPLEMENTED",
      "TACTICAL_ACTIVATION_MISSING_NOT_IMPLEMENTED",
      "ORACLE_RECONCILIATION_PARTIAL_NOT_IMPLEMENTED",
      "MISSING_MANIFESTO_OBLIGATIONS",
    ],
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
