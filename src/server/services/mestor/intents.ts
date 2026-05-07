import { ADVE_STORAGE_KEYS } from "@/domain";

/**
 * MESTOR — Intent Contract
 *
 * The single typed entry point for any work that affects pillars,
 * recommendations, deliverables, or strategy state.
 *
 * Architecture (NETERU quartet):
 *   trigger → mestor.emitIntent(intent) → artemis.commandant.execute(intent)
 *           ├─ consults Seshat for context (read-only)
 *           └─ consults Thot for capacity (veto/downgrade if needed)
 *
 * Intent kinds map 1:1 to the user-visible orchestration verbs.
 * The dispatcher (artemis/commandant.ts) decides which underlying tool
 * (Notoria mission, Glory sequence, Artemis framework) implements each kind.
 *
 * No tool is called directly from outside this module. Callers emit Intents.
 */

import type { PillarKey } from "@/lib/types/advertis-vector";

// ── Phase enum ────────────────────────────────────────────────────────

export type StrategyLifecyclePhase =
  | "INTAKE"      // Public quick-intake, ADVE only, no R/T
  | "BOOT"        // Post-paywall, full 8-pillar onboarding
  | "OPERATING"   // Running brand, R+T cycles, deliverables
  | "GROWTH";     // Mature brand, optimization phase

// ── Action parameters for I generation ────────────────────────────────

export interface ActionParams {
  /** Optional touchpoint hint — limits I generation to this channel family */
  touchpoint?: "DIGITAL" | "ATL" | "BTL" | "TTL" | "OWNED" | "EARNED";
  /** AARRR pirate metrics intent */
  aarrrIntent?: "ACQUISITION" | "ACTIVATION" | "RETENTION" | "REFERRAL" | "REVENUE";
  /** Persona slug to filter actions */
  persona?: string;
  /** Optional SKU / product line filter */
  sku?: string;
  /** Budget envelope hint (Thot may downgrade). null = no constraint */
  budgetMax?: number | null;
  /** Locality scope */
  locality?: string;
  /** Time window */
  timing?: { start?: string; end?: string };
}

// ── Intent (typed union) ──────────────────────────────────────────────

export type Intent =
  // ── ADVE filling, by phase ──
  | {
      kind: "FILL_ADVE";
      phase: StrategyLifecyclePhase;
      strategyId: string;
      sources?: {
        responses?: Record<string, Record<string, unknown>>;
        extractedValues?: Record<string, Record<string, unknown>>;
      };
    }
  // ── R/T cascade ──
  | { kind: "ENRICH_R_FROM_ADVE"; strategyId: string }
  | { kind: "ENRICH_T_FROM_ADVE_R_SESHAT"; strategyId: string; seshatRefs?: string[] }
  // ── Bidirectional update from R+T discoveries ──
  | {
      kind: "PROPOSE_ADVE_UPDATE_FROM_RT";
      strategyId: string;
      trigger: "DRIFT" | "MANUAL" | "SIGNAL" | "FEEDBACK";
    }
  // ── I generation (structured actions) ──
  | { kind: "GENERATE_I_ACTIONS"; strategyId: string; params?: ActionParams }
  // ── S synthesis from selected actions ──
  | { kind: "SYNTHESIZE_S"; strategyId: string; selectedActionIds?: string[] }
  // ── Deliverable production (PILLAR sequences) ──
  | {
      kind: "PRODUCE_DELIVERABLE";
      strategyId: string;
      target: string; // GlorySequenceKey — kept loose to avoid cross-import cycles
      depth: "PREVIEW" | "FULL";
    }
  // ── Seshat indexing (post-intake/boot) ──
  | {
      kind: "INDEX_BRAND_CONTEXT";
      strategyId: string;
      scope: "INTAKE_ONLY" | "FULL";
    }
  // ── Seshat single-source indexing (operator upload → BRAND_SOURCE chunks) ──
  | {
      kind: "INDEX_BRAND_SOURCE";
      strategyId: string;
      sourceId: string;
    }
  // ── Seshat market study ingestion (ADR-0037 PR-I) ──────────────────
  | {
      kind: "INGEST_MARKET_STUDY";
      // strategyId is "(global)" sentinel for sector-wide studies not tied to a brand.
      strategyId: string;
      payload: {
        sha256: string;
        countryCode: string;
        sector: string;
        uploadedBy: string;
        // The full extraction (post-operator-edit). Persisted directly via persister.
        extraction: unknown; // MarketStudyExtraction (Zod-validated upstream)
        sourceUrl?: string;
      };
    }
  | {
      kind: "RE_EXTRACT_MARKET_STUDY";
      strategyId: string;
      rawEntryId: string;
    }
  // ── Seshat market research (LLM-driven, ADR-0037 PR-I extension) ──
  // Operator opens a query, optionally provides source URLs ; Seshat
  // runs the LLM, parses the structured-market-study/v1 output, and
  // persists it as a MarketStudy entry (cross-brand reusable via
  // (countryCode, sector) indexes — same shape as INGEST_MARKET_STUDY).
  | {
      kind: "RUN_MARKET_RESEARCH";
      strategyId: string; // "(global)" sentinel allowed
      payload: {
        query: string;
        countryCode: string;
        sector: string;
        sourceUrls?: string[];
        uploadedBy: string;
        brandNature?: string;
        cascadeLevel?: string;
      };
    }
  // ── Tarsis external feeds (ADR-0037 PR-G) ──────────────────────────
  | {
      kind: "FETCH_EXTERNAL_FEED";
      strategyId: string; // "(global)" sentinel for cross-strategy refresh
      countryCode: string;
      sector: string;
    }
  // ── Source classifier — propose 1→N BrandAsset DRAFTs from a source ──
  | {
      kind: "CLASSIFY_BRAND_SOURCE";
      strategyId: string;
      sourceId: string;
    }
  | {
      kind: "PROPOSE_VAULT_FROM_SOURCE";
      strategyId: string;
      sourceId: string;
      operatorId: string;
    }
  // ── External signal (Tarsis) → re-evaluate ──
  | {
      kind: "PROCESS_SESHAT_SIGNAL";
      strategyId: string;
      signal: { kind: string; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; payload: unknown };
    }
  // ── Oracle sequence run via the governed path (audit trail + Seshat ctx) ──
  // Phase 17 (ADR-0039) — Renommé depuis `RUN_ORACLE_FRAMEWORK`. Sequence
  // devient l'unité publique unique d'Artemis. Frameworks isolés passent
  // par `WRAP-FW-<slug>` via `wrapFrameworkAsSequence` helper.
  | {
      kind: "RUN_ORACLE_SEQUENCE";
      strategyId: string;
      /** GlorySequenceKey — kept loose to avoid cross-import cycles. */
      sequenceKey: string;
      input: Record<string, unknown>;
    }
  // ── Sequence lifecycle promotion (governance, ADR-0042) ──
  // Promeut une sequence DRAFT → STABLE → DEPRECATED. Validation strict
  // côté handler : pas de promotion arrière sans justification + ADR.
  // Recalcule + stocke `promptHash` au moment de la promotion vers STABLE.
  | {
      kind: "PROMOTE_SEQUENCE_LIFECYCLE";
      /** Sentinel "(governance)" car gouvernance non-strategy-scopée. */
      strategyId: string;
      sequenceKey: string;
      fromLifecycle: "DRAFT" | "STABLE" | "DEPRECATED";
      toLifecycle: "DRAFT" | "STABLE" | "DEPRECATED";
      operatorId: string;
      justification: string;
    }
  // ── Governance — LLM model-policy update (non-strategy-scoped) ──
  // strategyId is the sentinel "(governance)" for system-wide intents so
  // the IntentEmission table key stays a non-null string.
  | {
      kind: "UPDATE_MODEL_POLICY";
      strategyId: string;
      purpose: "final-report" | "agent" | "intermediate" | "intake-followup" | "extraction";
      anthropicModel: string;
      ollamaModel: string | null;
      allowOllamaSubstitution: boolean;
      pipelineVersion?: "V1" | "V2" | "V3";
      notes?: string | null;
      updatedBy: string | null;
    }
  // ── Ptah Forge (Phase 9, ADR-0009) — matérialisation des briefs Artemis ──
  | {
      kind: "PTAH_MATERIALIZE_BRIEF";
      strategyId: string;
      operatorId: string;
      sourceIntentId: string;
      brief: {
        briefText: string;
        forgeSpec: {
          kind: "image" | "video" | "audio" | "icon" | "refine" | "transform" | "classify" | "stock" | "design";
          providerHint?: "magnific" | "adobe" | "figma" | "canva";
          modelHint?: string;
          parameters: Record<string, unknown>;
        };
        // Canonical uppercase PillarKey (from src/domain/pillars.ts), pas la variante storage lowercase.
        pillarSource: "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S";
        manipulationMode: "peddler" | "dealer" | "facilitator" | "entertainer";
      };
      overrideMixViolation?: boolean;
    }
  | {
      kind: "PTAH_RECONCILE_TASK";
      strategyId: string;
      taskId: string;
      webhookPayload: unknown;
    }
  | {
      kind: "PTAH_REGENERATE_FADING_ASSET";
      strategyId: string;
      operatorId: string;
      assetVersionId: string;
    }
  // ── Phase 17 (ADR-0037) — Deliverable Forge output-first composition ──
  // Sync dispatcher : prend un BrandAsset.kind matériel cible, remonte le DAG
  // des briefs requis (via GloryToolForgeOutput.requires), scanne le vault
  // pour réutilisation, construit une GlorySequence runtime ad-hoc dispatchée
  // via sequence-executor existant. Re-émet INVOKE_GLORY_TOOL +
  // PTAH_MATERIALIZE_BRIEF + PROMOTE_BRAND_ASSET_TO_ACTIVE existants.
  // Le service deliverable-orchestrator + handler runtime arrivent au commit 3.
  | {
      kind: "COMPOSE_DELIVERABLE";
      strategyId: string;
      operatorId: string;
      /** BrandAsset.kind matériel cible (KV_VISUAL, VIDEO_SPOT, PRINT_AD_SPEC, …). */
      targetKind: string;
      /** Optional campaign scope (les BrandAssets produits hériteront du campaignId). */
      campaignId?: string;
      /** Override le manipulationMode hérité de Strategy.manipulationMix.primary. */
      overrideManipulationMode?: "peddler" | "dealer" | "facilitator" | "entertainer";
      /** Mode preview : retourne le DAG résolu + estimation coût sans dispatcher. */
      previewOnly?: boolean;
    }
  // ── Phase 14 — Imhotep full activation (ADR-0019, supersedes ADR-0017). ──
  // 6ème Neter ACTIF. Orchestrateur des satellites matching/talent/team/tier/qc.
  | {
      kind: "IMHOTEP_DRAFT_CREW_PROGRAM";
      strategyId: string;
      operatorId: string;
      sector?: string;
    }
  | {
      kind: "IMHOTEP_MATCH_TALENT_TO_MISSION";
      strategyId: string;
      operatorId: string;
      missionId: string;
      minMatchScore?: number;
      limit?: number;
    }
  | {
      kind: "IMHOTEP_ASSEMBLE_CREW";
      strategyId: string;
      operatorId: string;
      missionId: string;
      rolesRequired?: readonly string[];
      budgetCapUsd?: number;
    }
  | {
      kind: "IMHOTEP_EVALUATE_TIER";
      strategyId: string;
      operatorId: string;
      talentProfileId: string;
    }
  | {
      kind: "IMHOTEP_ENROLL_FORMATION";
      strategyId: string;
      operatorId: string;
      userId: string;
      courseId: string;
    }
  | {
      kind: "IMHOTEP_CERTIFY_TALENT";
      strategyId: string;
      operatorId: string;
      talentProfileId: string;
      certificationName: string;
      category: string;
      expiresAt?: string;
      metadata?: Record<string, unknown>;
    }
  | {
      kind: "IMHOTEP_QC_DELIVERABLE";
      strategyId: string;
      operatorId: string;
      deliverableId: string;
      reviewerId?: string;
    }
  | {
      kind: "IMHOTEP_RECOMMEND_FORMATION";
      strategyId: string;
      operatorId: string;
      userId: string;
      skillGap?: string;
    }
  // ── Phase 15 — Anubis full activation (ADR-0020, supersedes ADR-0018). ──
  // 7ème Neter ACTIF. Orchestrateur broadcast / ad networks / credentials vault.
  | {
      kind: "ANUBIS_DRAFT_COMMS_PLAN";
      strategyId: string;
      operatorId: string;
      audience?: string;
    }
  | {
      kind: "ANUBIS_BROADCAST_MESSAGE";
      strategyId: string;
      operatorId: string;
      commsPlanId: string;
      channels: readonly string[];
    }
  | {
      kind: "ANUBIS_BUY_AD_INVENTORY";
      strategyId: string;
      operatorId: string;
      campaignId: string;
      provider: string;
      budgetUsd: number;
      adCopy: string;
    }
  | {
      kind: "ANUBIS_SEGMENT_AUDIENCE";
      strategyId: string;
      operatorId: string;
      rules: Record<string, unknown>;
    }
  | {
      kind: "ANUBIS_TRACK_DELIVERY";
      strategyId: string;
      operatorId: string;
      broadcastJobId: string;
    }
  | {
      kind: "ANUBIS_REGISTER_CREDENTIAL";
      strategyId: string;
      operatorId: string;
      connectorType: string;
      config: Record<string, unknown>;
    }
  | {
      kind: "ANUBIS_REVOKE_CREDENTIAL";
      strategyId: string;
      operatorId: string;
      connectorType: string;
    }
  | {
      kind: "ANUBIS_TEST_CHANNEL";
      strategyId: string;
      operatorId: string;
      connectorType: string;
    }
  | {
      kind: "ANUBIS_SCHEDULE_BROADCAST";
      strategyId: string;
      operatorId: string;
      commsPlanId: string;
      scheduledFor: string;
    }
  | {
      kind: "ANUBIS_CANCEL_BROADCAST";
      strategyId: string;
      operatorId: string;
      broadcastJobId: string;
    }
  // ── ADR-0023 — Operator amend pillar (ADVE only) ───────────────────
  // Manual edition of an ADVE pillar field by an operator. RTIS pillars
  // are intentionally excluded at the type level — they are derived and
  // refreshed via ENRICH_*_FROM_ADVE intents, never amended manually.
  | {
      kind: "OPERATOR_AMEND_PILLAR";
      strategyId: string;
      operatorId: string;
      /** ADVE only — type-level constraint. R/T/I/S go through ENRICH_*. */
      pillarKey: "a" | "d" | "v" | "e";
      mode: "PATCH_DIRECT" | "LLM_REPHRASE" | "STRATEGIC_REWRITE";
      /** Dot-path inside Pillar.content (e.g. "nomMarque", "personas[0].name"). */
      field: string;
      /** Used by PATCH_DIRECT and STRATEGIC_REWRITE. */
      proposedValue?: unknown;
      /** Used by LLM_REPHRASE — natural language operator intent. */
      rephrasePrompt?: string;
      /** Mandatory; ≥20 chars when mode === "STRATEGIC_REWRITE". */
      reason: string;
      /** STRATEGIC_REWRITE only — required when amending a LOCKED pillar. */
      overrideLocked?: boolean;
      /** Optimistic concurrency. Pillar.version (Pillar.updatedAt fallback). */
      expectedVersion?: number;
    }
  | {
      kind: "ANUBIS_FETCH_DELIVERY_REPORT";
      strategyId: string;
      operatorId: string;
      broadcastJobId: string;
    }
  // ── Anubis MCP bidirectionnel (ADR-0026) — Sprint 3 v6.18.17 ───────
  | {
      kind: "ANUBIS_MCP_REGISTER_SERVER";
      strategyId: string;
      operatorId: string;
      direction: "INBOUND" | "OUTBOUND";
      serverName: string;
      endpoint?: string;
      credentialRef?: string;
    }
  | {
      kind: "ANUBIS_MCP_SYNC_REGISTRY";
      strategyId: string;
      operatorId: string;
      serverName: string;
    }
  | {
      kind: "ANUBIS_MCP_INVOKE_TOOL";
      strategyId: string;
      operatorId: string;
      serverName: string;
      toolName: string;
      inputs: Record<string, unknown>;
      intentId?: string;
    }
  // ── Anubis OAuth 2.1 device flow (ADR-0048) — Sprint 3 v6.18.17 ────
  | {
      kind: "ANUBIS_OAUTH_DEVICE_FLOW_START";
      strategyId: string;
      operatorId: string;
      serverName: string;
      clientId: string;
      scopes?: string[];
    }
  | {
      kind: "ANUBIS_OAUTH_DEVICE_FLOW_POLL";
      strategyId: string;
      operatorId: string;
      serverName: string;
    }
  // ── Auto-promotion (ADR-0054) — Sprint 9 v6.18.22 ──────────────────
  | {
      kind: "AUTO_PROMOTION_EVALUATE";
      strategyId: string; // "(governance)" sentinel
      operatorId: string;
      dryRun?: boolean;
    }
  | {
      kind: "TOGGLE_QUALITY_GATE_MODE";
      strategyId: string; // "(governance)" sentinel
      operatorId: string;
      mode: "SOFT" | "HARD";
      reason: string;
    }
  // ── ADR-0028 — Strategy archive 2-phase ────────────────────────────
  // Soft archive (restorable) → hard purge (BFS cascade, irreversible).
  // strategyId in payload disambiguates the target ; operatorId tracked for
  // audit trail (auditedAdmin gate already enforces ADMIN role at tRPC).
  | {
      kind: "OPERATOR_ARCHIVE_STRATEGY";
      strategyId: string;
      operatorId: string;
      reason?: string;
    }
  | {
      kind: "OPERATOR_RESTORE_STRATEGY";
      strategyId: string;
      operatorId: string;
    }
  | {
      kind: "OPERATOR_PURGE_ARCHIVED_STRATEGY";
      strategyId: string;
      operatorId: string;
      /** Anti-foot-gun: caller must echo strategy name uppercase to confirm. */
      confirmName: string;
    }
  // ── ADR-0033 — Atomic purge + re-ingest of an intake-origin source ──
  // Deletes the BrandDataSource (origin="intake:<id>"), the INTAKE_REPORT
  // BrandAsset, resets ADVE Pillar.content (A/D/V/E only — RTIS untouched
  // since they're derived), then re-runs extraction from QuickIntake
  // responses. Atomic via Prisma $transaction. Anti-foot-gun via confirmName.
  | {
      kind: "INTAKE_SOURCE_PURGE_AND_REINGEST";
      strategyId: string;
      operatorId: string;
      /** The BrandDataSource.id to purge (must have origin="intake:..."). */
      sourceId: string;
      /** Caller must echo brand name uppercase to confirm. */
      confirmName: string;
    }
  // ── Phase 18 (ADR-0052) — Brand Tree CRUD ──────────────────────────
  // Tous les Intents BrandNode incluent `strategyId` comme audit pivot
  // (Mestor IntentEmission contract). Pour un nœud CORPORATE/MASTER pure (sans
  // Strategy directe), le caller passe le strategyId d'un descendant existant
  // ou de l'opérateur — utilisé seulement pour traçabilité hash-chain.
  | {
      kind: "OPERATOR_CREATE_BRAND_NODE";
      strategyId: string; // audit pivot
      operatorId: string;
      clientId?: string | null;
      parentNodeId?: string | null;
      name: string;
      slug: string;
      nodeKind: string;
      nodeNature:
        | "PRODUCT" | "SERVICE" | "CHARACTER_IP" | "FESTIVAL_IP" | "MEDIA_IP"
        | "RETAIL_SPACE" | "PLATFORM" | "INSTITUTION" | "PERSONAL";
      nodeRole?: string[];
      countryCode?: string | null;
      clusterTag?: string | null;
      /** Optional link to existing Strategy (operationnel REGIONAL_BRAND/SKU). */
      attachStrategyId?: string | null;
    }
  | {
      kind: "OPERATOR_UPDATE_BRAND_NODE";
      strategyId: string; // audit pivot
      operatorId: string;
      nodeId: string;
      patches: {
        name?: string;
        slug?: string;
        clusterTag?: string | null;
        countryCode?: string | null;
        nodeRole?: string[];
        lifecycle?: string;
        inheritanceLocked?: boolean;
        pillarOverrides?: unknown;
      };
    }
  | {
      kind: "OPERATOR_DELETE_BRAND_NODE";
      strategyId: string; // audit pivot
      operatorId: string;
      nodeId: string;
      reason?: string;
    }
  | {
      kind: "OPERATOR_MOVE_BRAND_NODE";
      strategyId: string; // audit pivot
      operatorId: string;
      nodeId: string;
      newParentNodeId: string | null;
      reason?: string;
    }
  | {
      kind: "OPERATOR_ATTACH_STRATEGY_TO_NODE";
      strategyId: string; // the strategy being attached (pivot natural here)
      operatorId: string;
      nodeId: string;
    }
  | {
      kind: "OPERATOR_TAG_NODE_ROLE";
      strategyId: string; // audit pivot
      operatorId: string;
      nodeId: string;
      action: "ADD" | "REMOVE";
      role: string;
    }
  // ── Phase 18 (ADR-0052) — CampaignDeliverable matrice 6D ───────────
  | {
      kind: "OPERATOR_CREATE_CAMPAIGN_DELIVERABLE";
      strategyId: string; // pivot via Campaign.strategyId
      operatorId: string;
      campaignId: string;
      targetNodeId: string;
      countryCode?: string | null;
      clusterTag?: string | null;
      deliverableType: string;
      language?: string;
      promoTag?: string | null;
      dueDate?: string | null; // ISO
      notes?: string | null;
    }
  | {
      kind: "OPERATOR_UPDATE_CAMPAIGN_DELIVERABLE";
      strategyId: string; // pivot
      operatorId: string;
      deliverableId: string;
      patches: {
        status?: string;
        dueDate?: string | null;
        deliveredAt?: string | null;
        validatedAt?: string | null;
        notes?: string | null;
        brandAssetId?: string | null;
        delegatedToOperatorId?: string | null;
      };
    }
  | {
      kind: "OPERATOR_DELETE_CAMPAIGN_DELIVERABLE";
      strategyId: string; // pivot
      operatorId: string;
      deliverableId: string;
    }
  | {
      kind: "OPERATOR_OVERRIDE_RAG";
      strategyId: string; // pivot
      operatorId: string;
      /** Soit campaign, soit deliverable — exactement l'un des deux non-null. */
      campaignId?: string | null;
      deliverableId?: string | null;
      /** GREEN | AMBER | RED | null (= clear override, retour au calculé). */
      ragOverride: "GREEN" | "AMBER" | "RED" | null;
      reason: string;
    }
  // ── Phase 18-A1-β (audit MATANGA V4 TICKETS MODIFS) ────────────────
  | {
      kind: "OPERATOR_CREATE_CHANGE_REQUEST";
      strategyId: string; // audit pivot
      operatorId: string;
      campaignDeliverableId: string;
      requestedByName: string;
      description: string;
      impact: "COSMETIC" | "MINOR" | "MAJOR" | "OUT_OF_SCOPE";
      assignedToUserId?: string | null;
    }
  | {
      kind: "OPERATOR_UPDATE_CHANGE_REQUEST";
      strategyId: string;
      operatorId: string;
      ticketId: string;
      patches: {
        status?: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "REJECTED" | "ESCALATED";
        assignedToUserId?: string | null;
        resolutionNotes?: string | null;
        description?: string;
        impact?: "COSMETIC" | "MINOR" | "MAJOR" | "OUT_OF_SCOPE";
      };
    }
  | {
      kind: "OPERATOR_RESOLVE_CHANGE_REQUEST";
      strategyId: string;
      operatorId: string;
      ticketId: string;
      resolutionNotes: string;
      newBriefVersionId?: string | null;
    }
  | {
      kind: "OPERATOR_ESCALATE_CHANGE_REQUEST";
      strategyId: string;
      operatorId: string;
      ticketId: string;
      escalationNotes: string;
    }
  // ── Phase 18-A1-γ (audit MATANGA V4 ACTIONS) ───────────────────────
  | {
      kind: "OPERATOR_CREATE_ACTION";
      strategyId: string; // audit pivot
      operatorId: string;
      label: string;
      context?: string | null;
      priority?: "CRITIQUE" | "HAUTE" | "MOYENNE" | "BASSE";
      category?: "BEFORE_DEPARTURE" | "SYSTEM" | "FOLLOWUPS" | "PRODUCTION" | "OTHER";
      source?: "GMAIL" | "SLACK" | "WHATSAPP" | "VERBAL" | "BRIEF" | "SYSTEM" | "OTHER";
      campaignId?: string | null;
      deliverableIds?: string[];
      assigneeUserId?: string | null;
      dueDate?: string | null; // ISO
    }
  | {
      kind: "OPERATOR_UPDATE_ACTION";
      strategyId: string;
      operatorId: string;
      actionId: string;
      patches: {
        label?: string;
        context?: string | null;
        priority?: "CRITIQUE" | "HAUTE" | "MOYENNE" | "BASSE";
        category?: "BEFORE_DEPARTURE" | "SYSTEM" | "FOLLOWUPS" | "PRODUCTION" | "OTHER";
        source?: "GMAIL" | "SLACK" | "WHATSAPP" | "VERBAL" | "BRIEF" | "SYSTEM" | "OTHER";
        campaignId?: string | null;
        deliverableIds?: string[];
        assigneeUserId?: string | null;
        dueDate?: string | null;
      };
    }
  | {
      kind: "OPERATOR_TOGGLE_ACTION_DONE";
      strategyId: string;
      operatorId: string;
      actionId: string;
      done: boolean;
    }
  | {
      kind: "OPERATOR_DELETE_ACTION";
      strategyId: string;
      operatorId: string;
      actionId: string;
    }
  // ── Phase 18-A1-δ (ADR-0055 Morning Brief Batch) ────────────────────
  | {
      kind: "MORNING_BRIEF_BATCH_PREVIEW";
      strategyId: string;
      operatorId: string;
      rawInput: string;
    }
  | {
      kind: "BRIEF_BATCH_PERSIST_DRAFTS";
      strategyId: string;
      operatorId: string;
      batchId: string;
    }
  | {
      kind: "BRIEF_DRAFT_UPDATE_FIELDS";
      strategyId: string;
      operatorId: string;
      draftId: string;
      classification?: "NEW_BRIEF" | "UPDATE_OF_BRIEF" | "NON_BRIEF" | "OPS_ACTION" | "AMBIGUOUS";
      resolvedNodeId?: string | null;
      resolvedNodePath?: string[];
      resolvedCampaignId?: string | null;
      payload?: unknown;
      state?: "PENDING_REVIEW" | "ACCEPTED" | "REJECTED" | "EDITED";
      reviewNotes?: string | null;
    }
  | {
      kind: "BRIEF_DRAFT_REQUEST_REANALYSIS";
      strategyId: string;
      operatorId: string;
      draftId: string;
    }
  | {
      kind: "MORNING_BRIEF_BATCH_CONFIRM";
      strategyId: string;
      operatorId: string;
      batchId: string;
      draftIds: string[];
    }
  | {
      kind: "OPERATOR_CREATE_INGESTED_SOURCE";
      strategyId: string;
      operatorId: string;
      sourceKind?: "EMAIL" | "SLACK" | "WHATSAPP" | "MANUAL_PASTE" | "FILE_UPLOAD";
      externalId?: string | null;
      sourceUrl?: string | null;
      sender?: string | null;
      subject?: string | null;
      rawSnippet: string;
      language?: string | null;
    }
  | {
      kind: "OPERATOR_CREATE_BRIEF_DRAFT";
      strategyId: string;
      operatorId: string;
      batchId: string;
      sourceId: string;
      classification: "NEW_BRIEF" | "UPDATE_OF_BRIEF" | "NON_BRIEF" | "OPS_ACTION" | "AMBIGUOUS";
      resolvedNodeId?: string | null;
      resolvedNodePath?: string[];
      payload: unknown;
    };

// ── Intent result (returned by Artemis.commandant.execute) ───────────

/**
 * IntentResult<T = unknown> — generic result envelope.
 *
 * Phase 0 migration prerequisite (Sprint 2.5, v6.18.16) : type generic
 * sur `output` permet aux routers tRPC de migrer vers emitIntent sans
 * perdre la type-safety du contrat client.
 *
 * Pattern d'usage post-migration :
 * ```ts
 * const result = await emitIntent<MyOutput>({ kind: "...", ... });
 * if (result.status === "OK") return result.output;  // typed as MyOutput
 * ```
 */
export interface IntentResult<T = unknown> {
  intentKind: Intent["kind"];
  strategyId: string;
  status: "OK" | "DOWNGRADED" | "VETOED" | "FAILED" | "QUEUED";
  /** Human-readable summary for audit trail */
  summary: string;
  /** Tool used to fulfill the intent (notoria | sequence | framework | ...) */
  tool?: string;
  /** Tool-specific output payload */
  output?: T;
  /** Reason if VETOED or DOWNGRADED */
  reason?: string;
  /** Downstream intent emitted as side-effect (e.g. INDEX after FILL_ADVE) */
  spawnedIntents?: Intent[];
  /** Cost estimate (Thot reconciliation) */
  estimatedCost?: { amount: number; currency: string };
  startedAt: string;
  completedAt: string;
}

/**
 * emitIntentTyped<T> — typed wrapper around emitIntent that asserts the
 * output type and throws if status !== OK. Used by router-level migrations
 * to preserve client tRPC contract.
 *
 * Phase 0 migration helper (Sprint 2.5, v6.18.16).
 *
 * Usage :
 * ```ts
 * .mutation(async ({ ctx, input }) => {
 *   const operatorId = await resolveOperatorId(ctx.session.user.id);
 *   return emitIntentTyped<DraftCrewProgramResult>({
 *     kind: "IMHOTEP_DRAFT_CREW_PROGRAM",
 *     strategyId: input.strategyId,
 *     operatorId,
 *     sector: input.sector,
 *   }, { caller: "imhotep-router:draftCrewProgram" });
 * })
 * ```
 */
export async function emitIntentTyped<T>(
  intent: Intent,
  options: { caller: string },
): Promise<T> {
  const result = await emitIntent(intent, options);
  if (result.status !== "OK") {
    const reason = result.reason ?? result.summary ?? "intent failed";
    throw new Error(`[emitIntentTyped] ${result.intentKind} returned ${result.status}: ${reason}`);
  }
  return result.output as T;
}

// ── Audit log entry ───────────────────────────────────────────────────

export interface IntentEmissionRecord {
  id: string;
  intentKind: Intent["kind"];
  strategyId: string;
  payload: Intent;
  result: IntentResult | null;
  emittedAt: string;
  caller: string; // module that emitted (e.g. "quick-intake", "boot-sequence", "tarsis")
}

// ── Type guards ───────────────────────────────────────────────────────

export function isFillAdveIntent(
  i: Intent,
): i is Extract<Intent, { kind: "FILL_ADVE" }> {
  return i.kind === "FILL_ADVE";
}

export function isProduceDeliverableIntent(
  i: Intent,
): i is Extract<Intent, { kind: "PRODUCE_DELIVERABLE" }> {
  return i.kind === "PRODUCE_DELIVERABLE";
}

export function intentTouchesPillars(intent: Intent): PillarKey[] {
  switch (intent.kind) {
    case "FILL_ADVE":
    case "PROPOSE_ADVE_UPDATE_FROM_RT":
      return [...ADVE_STORAGE_KEYS];
    case "ENRICH_R_FROM_ADVE":
      return ["r"];
    case "ENRICH_T_FROM_ADVE_R_SESHAT":
      return ["t"];
    case "GENERATE_I_ACTIONS":
      return ["i"];
    case "SYNTHESIZE_S":
      return ["s"];
    case "PRODUCE_DELIVERABLE":
    case "INDEX_BRAND_CONTEXT":
    case "INDEX_BRAND_SOURCE":
    case "CLASSIFY_BRAND_SOURCE":
    case "PROPOSE_VAULT_FROM_SOURCE":
    case "INGEST_MARKET_STUDY": // ADR-0037 PR-I — affects pillar T indirectly via cross-brand KB
    case "RE_EXTRACT_MARKET_STUDY":
    case "RUN_MARKET_RESEARCH": // Same cross-brand pillar-T-feeding behavior as INGEST_MARKET_STUDY
    case "FETCH_EXTERNAL_FEED":
    case "PROCESS_SESHAT_SIGNAL":
    case "RUN_ORACLE_SEQUENCE":
    case "PROMOTE_SEQUENCE_LIFECYCLE":
    case "UPDATE_MODEL_POLICY":
    case "PTAH_MATERIALIZE_BRIEF":
    case "PTAH_RECONCILE_TASK":
    case "PTAH_REGENERATE_FADING_ASSET":
    // Phase 14 — Imhotep full activation (ADR-0019). Crew Programs n'altère pas
    // les pillars ADVE-RTIS directement (orchestrateur de talent/QC/formation).
    case "IMHOTEP_DRAFT_CREW_PROGRAM":
    case "IMHOTEP_MATCH_TALENT_TO_MISSION":
    case "IMHOTEP_ASSEMBLE_CREW":
    case "IMHOTEP_EVALUATE_TIER":
    case "IMHOTEP_ENROLL_FORMATION":
    case "IMHOTEP_CERTIFY_TALENT":
    case "IMHOTEP_QC_DELIVERABLE":
    case "IMHOTEP_RECOMMEND_FORMATION":
    // Phase 15 — Anubis full activation (ADR-0020). Comms n'altère pas les pillars
    // directement (orchestrateur de broadcast/ad networks/credentials/notifications).
    case "ANUBIS_DRAFT_COMMS_PLAN":
    case "ANUBIS_BROADCAST_MESSAGE":
    case "ANUBIS_BUY_AD_INVENTORY":
    case "ANUBIS_SEGMENT_AUDIENCE":
    case "ANUBIS_TRACK_DELIVERY":
    case "ANUBIS_REGISTER_CREDENTIAL":
    case "ANUBIS_REVOKE_CREDENTIAL":
    case "ANUBIS_TEST_CHANNEL":
    case "ANUBIS_SCHEDULE_BROADCAST":
    case "ANUBIS_CANCEL_BROADCAST":
    case "AUTO_PROMOTION_EVALUATE":
    case "TOGGLE_QUALITY_GATE_MODE":
    case "ANUBIS_FETCH_DELIVERY_REPORT":
    case "ANUBIS_MCP_REGISTER_SERVER":
    case "ANUBIS_MCP_SYNC_REGISTRY":
    case "ANUBIS_MCP_INVOKE_TOOL":
    case "ANUBIS_OAUTH_DEVICE_FLOW_START":
    case "ANUBIS_OAUTH_DEVICE_FLOW_POLL":
    // Phase 17 (ADR-0037) — Deliverable Forge dispatcher. Le composer consomme
    // les piliers ADVE en lecture seule pour résoudre le DAG ; les mutations
    // vault sont déléguées en aval à PTAH_MATERIALIZE_BRIEF +
    // PROMOTE_BRAND_ASSET_TO_ACTIVE existants (chacun déjà handled). Pas de
    // pillar mutation directe ici.
    case "COMPOSE_DELIVERABLE":
      return [];
    case "OPERATOR_AMEND_PILLAR":
      return [intent.pillarKey];
    case "OPERATOR_ARCHIVE_STRATEGY":
    case "OPERATOR_RESTORE_STRATEGY":
    case "OPERATOR_PURGE_ARCHIVED_STRATEGY":
      return [];
    // ADR-0033 — re-extracts ADVE pillars from intake responses.
    case "INTAKE_SOURCE_PURGE_AND_REINGEST":
      return [...ADVE_STORAGE_KEYS];
    // Phase 18 (ADR-0052) — Brand Tree + CampaignDeliverable : aucun pillar touché
    // (pure structure / production tracking). Résolution piliers en lecture seule
    // via resolveEffectivePillars() helper en Phase 18 noyau.
    case "OPERATOR_CREATE_BRAND_NODE":
    case "OPERATOR_UPDATE_BRAND_NODE":
    case "OPERATOR_DELETE_BRAND_NODE":
    case "OPERATOR_MOVE_BRAND_NODE":
    case "OPERATOR_ATTACH_STRATEGY_TO_NODE":
    case "OPERATOR_TAG_NODE_ROLE":
    case "OPERATOR_CREATE_CAMPAIGN_DELIVERABLE":
    case "OPERATOR_UPDATE_CAMPAIGN_DELIVERABLE":
    case "OPERATOR_DELETE_CAMPAIGN_DELIVERABLE":
    case "OPERATOR_OVERRIDE_RAG":
      return [];
    // Phase 18-A1-β/γ — Change Requests + Operator Actions : pure structure / production tracking
    case "OPERATOR_CREATE_CHANGE_REQUEST":
    case "OPERATOR_UPDATE_CHANGE_REQUEST":
    case "OPERATOR_RESOLVE_CHANGE_REQUEST":
    case "OPERATOR_ESCALATE_CHANGE_REQUEST":
    case "OPERATOR_CREATE_ACTION":
    case "OPERATOR_UPDATE_ACTION":
    case "OPERATOR_TOGGLE_ACTION_DONE":
    case "OPERATOR_DELETE_ACTION":
      return [];
    // Phase 18-A1-δ — Morning Brief Batch : pure ingestion + production tracking, aucun pillar touché.
    case "MORNING_BRIEF_BATCH_PREVIEW":
    case "BRIEF_BATCH_PERSIST_DRAFTS":
    case "BRIEF_DRAFT_UPDATE_FIELDS":
    case "BRIEF_DRAFT_REQUEST_REANALYSIS":
    case "MORNING_BRIEF_BATCH_CONFIRM":
    case "OPERATOR_CREATE_INGESTED_SOURCE":
    case "OPERATOR_CREATE_BRIEF_DRAFT":
      return [];
  }
}

// ── Pre-flight gate: MANIPULATION_COHERENCE (ADR-0038, Phase 16-bis) ──

/**
 * Extract the requested manipulationMode + override flag from any Intent
 * payload that carries one. Returns `null` for kinds that do not declare
 * a manipulation mode — the gate is then skipped (NOT_APPLICABLE).
 */
function extractManipulationMode(intent: Intent): {
  mode: "peddler" | "dealer" | "facilitator" | "entertainer";
  override: boolean;
} | null {
  if (intent.kind === "PTAH_MATERIALIZE_BRIEF") {
    return {
      mode: intent.brief.manipulationMode,
      override: Boolean(intent.overrideMixViolation),
    };
  }
  // Glory tools / sequences carry the mode in their payload too — kept loose
  // here to avoid coupling to the GloryTool registry. Forge / sequence
  // executors should read the verdict from `manipulation-coherence` directly
  // when they have richer context (cf. sequence-executor.ts).
  return null;
}

async function preflightManipulationCoherence(
  intent: Intent,
): Promise<{ status: "OK" | "DOWNGRADED" | "VETOED"; reason: string } | null> {
  const extracted = extractManipulationMode(intent);
  if (!extracted) return null;
  const { applyManipulationCoherenceGate } = await import("./gates/manipulation-coherence");
  const verdict = await applyManipulationCoherenceGate({
    strategyId: intent.strategyId,
    mode: extracted.mode,
    overrideMixViolation: extracted.override,
    intentKind: intent.kind,
  });
  if (verdict.status === "VETOED") {
    return { status: "VETOED", reason: verdict.reason };
  }
  if (verdict.status === "DOWNGRADED") {
    return { status: "DOWNGRADED", reason: verdict.reason };
  }
  return { status: "OK", reason: "" };
}

// ── emitIntent — single entry point ───────────────────────────────────

/**
 * Emit an intent. Mestor logs it, optionally consults Thot, then hands off
 * to Artemis.commandant.execute().
 *
 * In passthrough mode (Phase 0), the dispatcher routes to existing tools
 * with no behavior change. Subsequent phases enrich the dispatch logic.
 */
export async function emitIntent(
  intent: Intent,
  options: { caller: string } = { caller: "unknown" },
): Promise<IntentResult> {
  const startedAt = new Date().toISOString();

  // Lazy imports to avoid circular dependencies
  const { db } = await import("@/lib/db");
  const { execute } = await import("@/server/services/artemis/commandant");

  // Persist emission (best-effort — never block the dispatch)
  let emissionId: string | null = null;
  try {
    const row = await db.intentEmission.create({
      data: {
        intentKind: intent.kind,
        strategyId: intent.strategyId,
        payload: intent as never,
        caller: options.caller,
      },
    });
    emissionId = row.id;
  } catch (err) {
    console.warn(
      "[mestor.emitIntent] could not persist IntentEmission (table may not exist yet):",
      err instanceof Error ? err.message : err,
    );
  }

  // ── ADR-0038 Phase 16-bis — MANIPULATION_COHERENCE pre-flight ────────
  // Extracts manipulationMode from Intent payload (when applicable) and
  // verifies it sits inside Strategy.manipulationMix. VETOED stops dispatch ;
  // DOWNGRADED records a warning and continues (operator override).
  const mixCheck = await preflightManipulationCoherence(intent);
  if (mixCheck && mixCheck.status === "VETOED") {
    const result: IntentResult = {
      intentKind: intent.kind,
      strategyId: intent.strategyId,
      status: "VETOED",
      summary: mixCheck.reason,
      startedAt,
      completedAt: new Date().toISOString(),
      reason: "MANIPULATION_COHERENCE",
    };
    if (emissionId) {
      try {
        await db.intentEmission.update({
          where: { id: emissionId },
          data: { result: result as never, status: "VETOED", completedAt: new Date() },
        });
      } catch {
        /* best-effort */
      }
    }
    return result;
  }

  // Dispatch to Artemis
  let result: IntentResult;
  try {
    result = await execute(intent);
  } catch (err) {
    result = {
      intentKind: intent.kind,
      strategyId: intent.strategyId,
      status: "FAILED",
      summary: err instanceof Error ? err.message : String(err),
      startedAt,
      completedAt: new Date().toISOString(),
    };
  }

  // Update emission record with result
  if (emissionId) {
    try {
      await db.intentEmission.update({
        where: { id: emissionId },
        data: { result: result as never, completedAt: new Date() },
      });
    } catch {
      /* best-effort */
    }
  }

  // Fire-and-forget spawned intents (Artemis-decided side-effects — async indexing,
  // PILLAR sequences in preview mode, etc.). The caller's response is NOT delayed.
  if (result.spawnedIntents && result.spawnedIntents.length > 0) {
    const spawnCaller = `${options.caller}>spawn`;
    for (const child of result.spawnedIntents) {
      // Don't await — let them run in the background
      void emitIntent(child, { caller: spawnCaller }).catch((err) => {
        console.warn(
          `[mestor.emitIntent] spawned intent ${child.kind} failed:`,
          err instanceof Error ? err.message : err,
        );
      });
    }
  }

  return result;
}
