import { ADVE_STORAGE_KEYS, type BrandTier } from "@/domain";

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
  | {
      // Phase 24 — additive, brand-aware action proposal (generate-more + brief).
      // Manual-first parity: MANUAL mode is deterministic, LLM mode degrades to
      // DEFERRED without a provider. Rows land status=PROPOSED for operator select.
      kind: "PROPOSE_BRAND_ACTIONS";
      strategyId: string;
      mode: "LLM" | "MANUAL";
      channel?: string;
      count?: number;
      briefIntention?: string;
      budgetMax?: number;
      manualActions?: Array<{ title: string; channel?: string; description?: string; budget?: number }>;
      via?: "BRIEF" | "GENERATE_MORE" | "MANUAL";
      operatorId?: string;
    }
  // ── Phase 24 (ADR-0106) — Intention : porte d'entrée du cycle de vie ──
  // CAPTURE = déterministe. GENERATE_BRIEF = seule porte LLM légitime (croise
  // l'intention × ADVE), parité MANUAL + dégradation DEFERRED. VALIDATE = gate
  // cohérence déterministe. Aucun pilier ADVE muté (le brief est en aval).
  | {
      kind: "CAPTURE_INTENTION";
      strategyId: string;
      type: "PRODUCT_LAUNCH" | "REPOSITION" | "MARKET_ENTRY" | "CAMPAIGN" | "PLATFORM" | "PARTNERSHIP" | "OTHER";
      title: string;
      description: string;
      operatorId?: string;
    }
  | {
      kind: "GENERATE_BRIEF_FROM_INTENTION";
      strategyId: string;
      intentionId: string;
      mode: "LLM" | "MANUAL";
      manualBrief?: unknown;
      operatorId?: string;
    }
  | {
      kind: "VALIDATE_INTENTION_BRIEF";
      strategyId: string;
      intentionId: string;
      override?: boolean;
      operatorId?: string;
    }
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
  // ── Artemis market research action (LLM-driven, ADR-0037 PR-I extension) ──
  // Action gouvernée par Artemis (Propulsion phase brief — NEFER §3.2 :
  // actions/séquences = Artemis). Operator opens a query, optionally provides
  // source URLs ; Artemis runs the LLM, parses the structured-market-study/v1
  // output, et chaîne `ingestStructuredMarketStudy` (Seshat) pour persister
  // (cascade Artemis → Seshat). Cross-brand reusable via (countryCode, sector)
  // indexes — même shape downstream que INGEST_MARKET_STUDY.
  // Glory tool wrapper : `market-research-runner` (artemis/tools/market-research-tools.ts).
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
  // ── Phase 21 (ADR-0070) — OracleSection génération unitaire ──
  // Manual-first parity (ADR-0060) : l'Assembler global est une boucle sur
  // ce kind ; aucun chemin parallèle inline. Le handler `oracle-section`
  // gère lock, dispatch via runner, executeStructuredLLMCall, transitions.
  | {
      kind: "GENERATE_ORACLE_SECTION";
      strategyId: string;
      /** Numéro 1..35 (cf. SECTION_REGISTRY). */
      sectionId: number;
      /**
       * - FRESH  : section est PENDING (jamais générée). Refuse si déjà COMPLETE.
       * - REGEN  : ré-génère même si déjà COMPLETE (operator demande).
       * - RETRY  : reprend après FAILED ou STALE (logged distinctement audit).
       */
      mode: "FRESH" | "REGEN" | "RETRY";
      operatorId: string;
    }
  // ── Phase 21 (ADR-0071) — Oracle Assembler manual-first orchestrator ──
  // Boucle sur GENERATE_ORACLE_SECTION × N. Le handler NE TOUCHE JAMAIS
  // executeStructuredLLMCall / executeSequence / executeFramework / executeTool
  // directement — uniquement emitIntent({ kind: "GENERATE_ORACLE_SECTION", ... }).
  // Test bloquant `assembler-uses-manual-path.test.ts` enforce l'invariant.
  | {
      kind: "ASSEMBLE_ORACLE";
      strategyId: string;
      /**
       * Scope de l'orchestration :
       *   - "ALL"      : toutes les 35 sections (REGEN forcé sur les COMPLETE).
       *   - "MISSING"  : uniquement PENDING (FRESH).
       *   - "STALE"    : uniquement STALE + FAILED (RETRY).
       *   - number[]   : sectionIds explicites (mode auto-détecté par section).
       */
      scope: "ALL" | "MISSING" | "STALE" | readonly number[];
      operatorId: string;
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
  // ── Anubis réseaux de la marque — founder OAuth (ADR-0128) ─────────
  | {
      kind: "ANUBIS_SOCIAL_CONNECT_ACCOUNT";
      strategyId: string;
      userId: string;
      provider: "meta" | "instagram" | "google" | "linkedin" | "x" | "tiktok";
      /** Tokens déjà chiffrés AES-GCM — aucun secret en clair dans l'émission. */
      accounts: Array<{
        platform: "FACEBOOK" | "INSTAGRAM" | "YOUTUBE" | "LINKEDIN" | "TWITTER" | "TIKTOK";
        accountId: string;
        accountName: string;
        handle: string | null;
        followerCount: number | null;
        followingCount: number | null;
        /** Profil public de la marque (bio/site/catégorie/volumes) — non-secret. */
        profile: import("@/server/services/anubis/social-connect").AccountProfile | null;
        encryptedTokens: string;
        tokenExpiresAt: string | null;
      }>;
      scopes: string[];
    }
  // ── Anubis suite sociale pilotable (ADR-0133) ─────────────────────
  // NB : ANUBIS_SYNC_INBOX / ANUBIS_REPLY_COMMENT ne vivent QUE via
  // governedProcedure (handler inline router, même lane que SYNC_FOLLOWERS)
  // — seul PUBLISH est aussi ré-émis par le cron (emitIntentTyped).
  | {
      kind: "ANUBIS_PUBLISH_SOCIAL_POST";
      strategyId: string;
      userId: string;
      targets: string[];
      text: string;
      linkUrl?: string | null;
      imageUrl?: string | null;
      scheduleAt?: string | null;
      brandActionId?: string | null;
      /** Brief créatif intégré (direction pour illustrer). */
      brief?: string | null;
      /** Copy du visuel (texte DANS l'image). */
      visualCopy?: string | null;
    }
  // ── ADR-0146 — ingestion métrique externe agnostique (quiz/app/CRM/email/terrain) ──
  // Émis par l'endpoint raw /api/ingest/metrics (token MCP scopé) OU le cron
  // interne (CRON_SECRET). N'écrit AUCUN pilier — CampaignAARRMetric /
  // MissionActivity.kpiActual / Signal type=EXTERNAL_METRIC uniquement.
  | {
      kind: "INGEST_EXTERNAL_METRIC";
      strategyId: string;
      operatorId: string;
      /** Source agnostique de la remontée (n'importe quelle marque, n'importe quel canal). */
      sourceType: "QUIZ" | "APP" | "CRM" | "EMAIL" | "FIELD" | "WEBHOOK" | "MANUAL";
      /** Étiquette libre lisible (ex. "quizz.spawt.online"). */
      sourceLabel?: string | null;
      /** Cible AARRR : requis pour écrire une CampaignAARRMetric. */
      campaignId?: string | null;
      /** Cible KPI d'activité de mission (garde de portée sur strategyId). */
      missionId?: string | null;
      /** Période comptable "YYYY-MM" (défaut : mois courant UTC). */
      period?: string | null;
      /** Cellules de mesure — chacune routée indépendamment, jamais fabriquée. */
      metrics: Array<{
        /** Étage du funnel AARRR — route vers CampaignAARRMetric si + campaignId. */
        stage?: "ACQUISITION" | "ACTIVATION" | "RETENTION" | "REVENUE" | "REFERRAL" | null;
        metric: string;
        value: number;
        target?: number | null;
        /** MissionActivity.id à mettre à jour (kpiActual = value). */
        kpiActivityId?: string | null;
      }>;
    }
  // ── ADR-0134 — mesure communautaire réelle (chaîne community→devotion→cult) ──
  // Émis par le cron social-sync quotidien (emitIntentTyped, caller
  // "cron:social-sync:community"). Pure mesure : lit FollowerSnapshot/
  // SocialPost/SocialInboxItem, écrit CommunitySnapshot + snapshots dérivés.
  | {
      kind: "SESHAT_CAPTURE_COMMUNITY_SNAPSHOT";
      strategyId: string;
    }
  // ── ADR-0135 — attribution des transitions de dévotion observées ──
  // Émis par le cron social-sync après l'actualisation des superfans.
  // Reconstruit CampaignAction.devotionTransitionsObserved (temporal join).
  | {
      kind: "SESHAT_ATTRIBUTE_DEVOTION_TRANSITIONS";
      strategyId: string;
    }
  // ── ADR-0126/0134 — naissance + actualisation gouvernées des SuperfanProfile ──
  // Deux portes du MÊME kind : tRPC `superfan.register` (geste opérateur,
  // governedProcedure inline) et ce chemin emitIntent (cron — mise à jour des
  // profils DÉJÀ nés depuis l'inbox, source SOCIAL, jamais de création).
  // Écriture unique : `seshat/superfan-ingest.registerSuperfanProfile`.
  | {
      kind: "SESHAT_REGISTER_SUPERFAN";
      strategyId: string;
      platform: string;
      handle: string;
      segment: import("@/domain/devotion-ladder").DevotionLadderTier;
      engagementDepth: number;
      interactions?: number;
      lastActiveAt?: string;
      source: "MANUAL" | "CRM" | "CAMPAIGN" | "SOCIAL";
      displayName?: string | null;
      // ADR-0141 — conditions strictes franchies + preuve (gate « a payé » inclus).
      conditions?: import("@/domain/superfan-conditions").SuperfanConditionMap;
    }
  // ── Anubis boutique de la marque — Shopify OAuth founder (vague 2026-07-12) ──
  | {
      kind: "ANUBIS_COMMERCE_CONNECT_SHOP";
      strategyId: string;
      userId: string;
      shopDomain: string;
      shopName: string | null;
      /** Token offline déjà chiffré AES-GCM — aucun secret en clair. */
      encryptedToken: string;
      scopes: string[];
    }
  // ── Anubis apps mobiles de la marque — liens App Store / Play Store ──
  | {
      kind: "ANUBIS_LINK_MOBILE_APP";
      strategyId: string;
      userId: string;
      /** URLs publiques de fiche (aucun secret) — null délie le store. */
      appStoreUrl: string | null;
      playStoreUrl: string | null;
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
  // ── ADR-0105 — Market kill-switch (cycle de vie marché sur Country) ──
  // Le marché = Country.code (ISO-2). strategyId porte une sentinelle
  // "MARKET:<code>" (pivot d'audit hash-chain — pas une vraie stratégie ;
  // IntentEmission.strategyId est un String dénormalisé, pas une FK).
  | {
      kind: "NEUTRALIZE_MARKET";
      strategyId: string;
      operatorId: string;
      countryCode: string;
      mode: "FREEZE" | "SHADOWBAN";
      reason?: string;
    }
  | {
      kind: "REINSTATE_MARKET";
      strategyId: string;
      operatorId: string;
      countryCode: string;
    }
  | {
      kind: "PURGE_MARKET";
      strategyId: string;
      operatorId: string;
      countryCode: string;
      /** Anti-foot-gun: caller must echo the country code to confirm. */
      confirmCode: string;
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
    }
  // ── Phase 23 (ADR-0080) — Pivot sub-cluster lifecycle promotion ─────
  // Parameterized over the 7 pivot sub-cluster slugs. Handler refuses
  // transitions that violate STUB→PARTIAL→MVP→PRODUCTION ordering.
  // `toState === "PRODUCTION"` requires `calibrationSnapshotRef` —
  // pre-flight Mestor gate `calibration-snapshot-required.ts` enforces
  // (cf. ADR-0080 §3 + Epic 6 Story 6.3). Mirrors the
  // `PROMOTE_SEQUENCE_LIFECYCLE` precedent (ADR-0042).
  | {
      kind: "PROMOTE_PIVOT_SUBCLUSTER";
      /** Sentinel "(governance)" car gouvernance non-strategy-scopée. */
      strategyId: string;
      operatorId: string;
      subClusterSlug:
        | "superfan.attribution"
        | "superfan.stickiness"
        | "superfan.crmCapture"
        | "culture.overtonShift"
        | "culture.overtonReadiness"
        | "culture.tarsisBridge"
        | "culture.mcpIngest";
      fromState: "STUB" | "PARTIAL" | "MVP";
      toState: "PARTIAL" | "MVP" | "PRODUCTION";
      /**
       * REQUIRED when toState === "PRODUCTION". Points to a
       * RUN_ATTRIBUTION_CALIBRATION IntentEmission.id whose payload is the
       * calibration snapshot that justifies the promotion (P22-6 — snapshot
       * is IntentEmission payload, zero new Prisma table). Refused at
       * Mestor pre-flight gate if absent or pointing to an invalid emission.
       */
      calibrationSnapshotRef?: string;
      /** Operator rationale, free-form. Persists in IntentEmission.payload. */
      reason: string;
    }
  // ── ADR-0167 — Transitions de palier APOGEE (moteur de trajectoire) ──
  // Les 10 kinds PROMOTE/DEMOTE (LATENT↔FRAGILE↔ORDINAIRE↔FORTE↔CULTE↔ICONE)
  // font transiter Strategy.apogeeTier (ratchet officiel). Gate pré-flight
  // PALIER_PROMOTION_PROOFS (composite > seuil + preuves apex). Handler
  // brand-tier-transition. DEMOTE = compensateur explicite (Loi 1).
  | {
      kind:
        | "PROMOTE_LATENT_TO_FRAGILE"
        | "PROMOTE_FRAGILE_TO_ORDINAIRE"
        | "PROMOTE_ORDINAIRE_TO_FORTE"
        | "PROMOTE_FORTE_TO_CULTE"
        | "PROMOTE_CULTE_TO_ICONE"
        | "DEMOTE_FRAGILE_TO_LATENT"
        | "DEMOTE_ORDINAIRE_TO_FRAGILE"
        | "DEMOTE_FORTE_TO_ORDINAIRE"
        | "DEMOTE_CULTE_TO_FORTE"
        | "DEMOTE_ICONE_TO_CULTE";
      strategyId: string;
      operatorId: string;
      /** Justification opérateur, persistée dans IntentEmission.payload + apogeeTierReason. */
      reason: string;
      /** Concurrence optimiste : palier effectif affiché à l'opérateur. */
      expectedFromTier?: BrandTier;
      /** Preuve citée par l'opérateur (documentaire, non requise par le gate). */
      evidenceRef?: string;
      /** Rempli par la voie compensateur (governance.compensate). */
      compensatedFrom?: string;
    }
  // ── Phase 23 (ADR-0081) — Attribution model calibration run ─────────
  // Runs the pure-TS logistic regression in
  // `services/campaign-tracker/superfan-attribution.ts` against real
  // campaign history (mode AUTO) or skips fit using operator-supplied
  // coefficients (mode MANUAL_COEFFICIENTS — manual-first parity ADR-0060,
  // FR25 peer to FR6). Streams progress over NSP SSE (15s heartbeat,
  // bestEffort per ADR-0072). The emission payload IS the calibration
  // snapshot — fields `{ modelVersion, coefficients, rocAuc, rmse,
  // sampleSize, dataWindow, computedAt }` per ADR-0081 §3 — referenceable
  // by PROMOTE_PIVOT_SUBCLUSTER.calibrationSnapshotRef.
  | {
      kind: "RUN_ATTRIBUTION_CALIBRATION";
      strategyId: string;
      operatorId: string;
      /** Optional subset of campaigns to fit on. Default = all campaigns under the strategy. */
      campaignIds?: readonly string[];
      /**
       * - AUTO                 : fit logistic regression via gradient descent.
       * - MANUAL_COEFFICIENTS  : skip fit, use operator-supplied coefficients
       *                          and only compute ROC AUC / RMSE for review.
       */
      mode: "AUTO" | "MANUAL_COEFFICIENTS";
      /** REQUIRED when mode === "MANUAL_COEFFICIENTS". */
      operatorCoefficients?: Record<string, number>;
    }
  // ── Phase 23 Epic 3 Story 3.7 (ADR-0078 + ADR-0060) — Manual operator-tagged
  // Overton delta. Manual-first peer (FR26) to the algorithmic embeddings path
  // (FR13). Persists CampaignAction.overtonDeltaManual ; the IntentEmission row
  // created by emitIntent IS the audit trail for source="MANUAL_OPERATOR" — no
  // separate model needed. Downstream measureOvertonShift consumes the manual
  // value when non-null and stamps degradationCodes with MANUAL_OPERATOR_DELTA.
  | {
      kind: "OPERATOR_TAG_OVERTON_DELTA";
      strategyId: string;
      operatorId: string;
      campaignActionId: string;
      /** Range [-1, 1] — same envelope as algorithmic overtonShiftScore. */
      overtonDeltaManual: number;
      /** Free-form operator rationale (optional but recommended for audit). */
      reason?: string;
      /** Source discriminator persisted in IntentEmission.payload for audit. */
      source: "MANUAL_OPERATOR";
    }
  // ── Phase 26 (ADR-0093) — Thot atomized composite action-costing ──
  | {
      kind: "THOT_ESTIMATE_ACTION_COST";
      /** Owning strategy, or "(global)" sentinel for ad-hoc catalog estimates. */
      strategyId: string;
      /** ActionCostTemplate.actionKey (e.g. PHOTO_SESSION_HALF_DAY). */
      templateKey: string;
      /** Market to price for (ISO 3166-1 alpha-2). */
      zoneCode: string;
      qualityTier?: "BASIC" | "STANDARD" | "PREMIUM";
      /** Optional provider whose ProviderCostRate overrides market rates. */
      providerId?: string;
      marginPct?: number;
      contingencyPct?: number;
      taxRatePct?: number;
      /** Per-atom overrides keyed by component label. */
      componentOverrides?: Record<string, { quantity?: number; disabled?: boolean }>;
      /** When set, persist the result back onto this BrandAction. */
      brandActionId?: string;
      operatorId?: string;
    }
  | {
      kind: "THOT_UPSERT_ZONE_INDEX";
      /** "(global)" sentinel — the cost catalog is cross-brand. */
      strategyId: string;
      /** ZoneIndexFamily (validated runtime). */
      family: string;
      zoneCode: string;
      key: string;
      value: number;
      currency?: string;
      unit?: string;
      sourceRef?: string;
      validFrom?: string;
      operatorId?: string;
    }
  | {
      kind: "THOT_UPSERT_PROVIDER_RATE";
      /** "(global)" sentinel — provider rates are cross-brand. */
      strategyId: string;
      /** TALENT | GUILD | EXTERNAL. */
      providerKind: string;
      providerId: string;
      providerLabel?: string;
      /** CostDriver (validated runtime). */
      driver: string;
      roleKey?: string;
      zoneCode?: string;
      rate: number;
      /** CostUnit (validated runtime). Default DAY. */
      unit?: string;
      currency?: string;
      sourceRef?: string;
      operatorId?: string;
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
  /**
   * Non-blocking advisory warnings surfaced by pre-flight gates (e.g.
   * BRIEF_VS_ADVE_COHERENCE C6). The dispatch proceeded; these are flagged to
   * the operator for manual follow-up (ADR-0060 parity). Distinct from
   * VETOED/DOWNGRADED status.
   */
  warnings?: string[];
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
    case "PROPOSE_BRAND_ACTIONS":
      return ["i"];
    case "SYNTHESIZE_S":
      return ["s"];
    // Phase 24 (ADR-0106) — Intention : aval de l'ADVE, ne mute aucun pilier.
    case "CAPTURE_INTENTION":
    case "GENERATE_BRIEF_FROM_INTENTION":
    case "VALIDATE_INTENTION_BRIEF":
      return [];
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
    // ADR-0128 — connexion réseaux de la marque : pure persistence de
    // credentials + snapshots d'observation, aucune mutation de pilier.
    case "ANUBIS_SOCIAL_CONNECT_ACCOUNT":
    case "ANUBIS_COMMERCE_CONNECT_SHOP":
    // Liens App Store / Play Store — pure persistence de connecteurs, zéro pilier.
    case "ANUBIS_LINK_MOBILE_APP":
    // ADR-0133 — publication sociale : comms, zéro pilier (inbox/réponse =
    // governedProcedure inline, hors union typée comme SYNC_FOLLOWERS).
    case "ANUBIS_PUBLISH_SOCIAL_POST":
    // ADR-0134 — mesure communautaire : écrit CommunitySnapshot + snapshots
    // dérivés (devotion/cult), jamais un pilier.
    case "SESHAT_CAPTURE_COMMUNITY_SNAPSHOT":
    // ADR-0135 — attribution : écrit CampaignAction.devotionTransitionsObserved,
    // jamais un pilier.
    case "SESHAT_ATTRIBUTE_DEVOTION_TRANSITIONS":
    // ADR-0126/0134 — écrit un SuperfanProfile (mesure), jamais un pilier.
    case "SESHAT_REGISTER_SUPERFAN":
    // ADR-0146 — ingestion métrique externe : écrit CampaignAARRMetric /
    // MissionActivity.kpiActual / Signal, jamais un pilier ADVE.
    case "INGEST_EXTERNAL_METRIC":
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
    // ADR-0105 — market kill-switch : opère sur Country, ne touche aucun pillar.
    case "NEUTRALIZE_MARKET":
    case "REINSTATE_MARKET":
    case "PURGE_MARKET":
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
    // Phase 21 (ADR-0070) — OracleSection génération : écrit OracleSection.payload,
    // ne mute pas les piliers ADVE-RTIS (lecture seule via loadStrategyContext).
    case "GENERATE_ORACLE_SECTION":
      return [];
    // Phase 21 (ADR-0071) — Oracle Assembler : orchestrate GENERATE_ORACLE_SECTION
    // × N. Aucun pillar muté directement (chaque sous-Intent est noop pillar).
    case "ASSEMBLE_ORACLE":
      return [];
    // Phase 23 (ADR-0080 + ADR-0081) — Pivot sub-cluster lifecycle promotion +
    // attribution calibration. Aucun pillar ADVE-RTIS muté directement —
    // ces Intents instrumentent les pivots mission (superfans × Overton) en
    // lecture seule sur les piliers, écriture sur `capability-state.ts` lifecycle
    // (PROMOTE) et sur IntentEmission.payload (RUN_ATTRIBUTION_CALIBRATION snapshot).
    case "PROMOTE_PIVOT_SUBCLUSTER":
    case "RUN_ATTRIBUTION_CALIBRATION":
      return [];
    // Phase 23 Epic 3 Story 3.7 — manual operator-tagged Overton delta.
    // Écrit `CampaignAction.overtonDeltaManual` ; aucun pillar ADVE-RTIS
    // muté directement (la mesure dérivée du delta est computée à la demande
    // par `measureOvertonShift`, pas persistée sur les piliers).
    case "OPERATOR_TAG_OVERTON_DELTA":
      return [];
    // Phase 26 (ADR-0093) — Thot atomized action-costing : écrit ActionCostEstimate
    // + stamp BrandAction.estimatedCost* + catalogue ZoneIndex/ProviderCostRate.
    // Aucun pillar ADVE-RTIS muté (estimation financière, lecture des piliers).
    case "THOT_ESTIMATE_ACTION_COST":
    case "THOT_UPSERT_ZONE_INDEX":
    case "THOT_UPSERT_PROVIDER_RATE":
      return [];
    // ADR-0167 — Transitions de palier APOGEE : écrivent Strategy.apogeeTier
    // (ratchet officiel) ; aucun pilier ADVE-RTIS muté. Ce groupe est le garde
    // d'exhaustivité runtime des 10 kinds (le switch n'a pas de `default`).
    case "PROMOTE_LATENT_TO_FRAGILE":
    case "PROMOTE_FRAGILE_TO_ORDINAIRE":
    case "PROMOTE_ORDINAIRE_TO_FORTE":
    case "PROMOTE_FORTE_TO_CULTE":
    case "PROMOTE_CULTE_TO_ICONE":
    case "DEMOTE_FRAGILE_TO_LATENT":
    case "DEMOTE_ORDINAIRE_TO_FRAGILE":
    case "DEMOTE_FORTE_TO_ORDINAIRE":
    case "DEMOTE_CULTE_TO_FORTE":
    case "DEMOTE_ICONE_TO_CULTE":
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

/**
 * Phase 23 Epic 6 Story 6.3 — CALIBRATION_SNAPSHOT_REQUIRED pre-flight.
 *
 * For `PROMOTE_PIVOT_SUBCLUSTER` Intents, delegates to the gate which refuses a
 * PRODUCTION promotion lacking a valid `calibrationSnapshotRef` (pointing to a
 * succeeded `RUN_ATTRIBUTION_CALIBRATION` emission). Returns a VETO signal or null.
 */
async function preflightCalibrationSnapshot(
  intent: Intent,
): Promise<{ status: "VETOED"; reason: string } | null> {
  if (intent.kind !== "PROMOTE_PIVOT_SUBCLUSTER") return null;
  const { calibrationSnapshotRequiredGate } = await import("./gates/calibration-snapshot-required");
  const verdict = await calibrationSnapshotRequiredGate({
    kind: intent.kind,
    toState: intent.toState,
    calibrationSnapshotRef: intent.calibrationSnapshotRef,
  });
  if (verdict.verdict === "BLOCK") {
    return { status: "VETOED", reason: verdict.reason };
  }
  return null;
}

/**
 * ADR-0167 — PALIER_PROMOTION_PROOFS pre-flight. Pour les 10 kinds de
 * transition de palier, refuse (VETOED) une promotion non méritée (score sous
 * le seuil, preuves apex insuffisantes) ou une transition depuis un mauvais
 * palier. Miroir de `preflightCalibrationSnapshot`. Lecture seule.
 */
async function preflightPalierPromotionProofs(
  intent: Intent,
): Promise<{ status: "VETOED"; reason: string } | null> {
  const { PALIER_TRANSITION_KINDS, palierPromotionProofsGate } = await import(
    "./gates/palier-promotion-proofs"
  );
  if (!PALIER_TRANSITION_KINDS.has(intent.kind)) return null;
  const verdict = await palierPromotionProofsGate({
    kind: intent.kind,
    strategyId: intent.strategyId,
    expectedFromTier: "expectedFromTier" in intent ? intent.expectedFromTier : undefined,
  });
  if (verdict.verdict === "BLOCK") {
    return { status: "VETOED", reason: verdict.reason };
  }
  return null;
}

/**
 * C6 (PROPAGATION-MAP §6b) — BRIEF_VS_ADVE_COHERENCE pre-flight.
 *
 * For `PTAH_MATERIALIZE_BRIEF` (the production frontier — a brief about to be
 * forged into a concrete asset), checks the brief text against the brand's ADVE
 * noyau via the deterministic coherence gate. WARN is **non-blocking** : the
 * forge proceeds, the warning is surfaced on `IntentResult.warnings` for the
 * operator (manual-first parity, ADR-0060). Returns the warning reason or null.
 */
async function preflightBriefVsAdveCoherence(
  intent: Intent,
): Promise<string | null> {
  if (intent.kind !== "PTAH_MATERIALIZE_BRIEF") return null;
  try {
    const { briefVsAdveCoherenceGate } = await import("./gates/brief-vs-adve-coherence");
    const verdict = await briefVsAdveCoherenceGate(
      { strategyId: intent.strategyId, brief: { content: intent.brief.briefText } },
      {},
    );
    return verdict.verdict === "WARN" ? verdict.reason : null;
  } catch {
    // Advisory gate — never block dispatch on an internal error.
    return null;
  }
}

/**
 * ADR-0105 — MARKET_STATUS pre-flight. Refuse toute mutation ciblant une
 * stratégie dont le marché est FROZEN/SHADOWBANNED. Les Intents du kill-switch
 * marché (NEUTRALIZE/REINSTATE/PURGE_MARKET) sont exemptés — ils opèrent SUR le
 * marché. Renvoie un signal VETO ou null.
 */
async function preflightMarketStatus(
  intent: Intent,
): Promise<{ status: "VETOED"; reason: string } | null> {
  if (
    intent.kind === "NEUTRALIZE_MARKET" ||
    intent.kind === "REINSTATE_MARKET" ||
    intent.kind === "PURGE_MARKET"
  ) {
    return null;
  }
  const { marketStatusGate } = await import("./gates/market-status");
  const verdict = await marketStatusGate(intent.strategyId);
  if (verdict.verdict === "BLOCK") return { status: "VETOED", reason: verdict.reason };
  return null;
}

// ── emitIntent — single entry point ───────────────────────────────────

/**
 * ADR-0124 — Thot cost-gate sur le chemin bus (Loi 3, parité chemin tRPC).
 *
 * L'operatorId vient des options du caller OU du payload de l'Intent (nombre
 * de kinds le portent déjà : OPERATOR_AMEND_PILLAR, IMHOTEP_*, …). Sans
 * operator résolvable, la gate est sautée — même semantics que
 * `evaluateCostGateForIntent` côté governed-procedure (le budget est
 * per-operator ; rien d'honnête à gater sans operator).
 */
async function evaluateBusCostGate(
  intent: Intent,
  emissionId: string,
  operatorId: string | null,
): Promise<import("@/server/governance/cost-gate").CostDecisionResult | null> {
  if (!operatorId) return null;
  // Lazy imports — registry agrège les manifests services (cycle sinon).
  const { findCapability, getManifest } = await import("@/server/governance/registry");
  const handler = findCapability(intent.kind);
  if (!handler) return null;
  const manifest = getManifest(handler.service);
  if (!manifest) return null;
  const capability = manifest.capabilities.find((c) => c.name === handler.capability);
  if (!capability) return null;
  if (!capability.costEstimateUsd || capability.costEstimateUsd <= 0) return null;

  const { db } = await import("@/lib/db");
  const { assertCostGate, CostVetoError, persistCostDecision } = await import(
    "@/server/governance/cost-gate"
  );
  const { makeDefaultCapacityReader } = await import(
    "@/server/governance/default-capacity-reader"
  );
  const reader = makeDefaultCapacityReader(db);
  try {
    const decision = await assertCostGate(
      { intentId: emissionId, intentKind: intent.kind, operatorId, capability, manifest },
      reader,
    );
    await persistCostDecision(db, emissionId, intent.kind, operatorId, decision, capability);
    return decision;
  } catch (err) {
    if (err instanceof CostVetoError) {
      await persistCostDecision(db, emissionId, intent.kind, operatorId, err.result, capability);
      return err.result;
    }
    throw err;
  }
}

/** Extrait l'operatorId du payload quand le kind le porte (string non vide). */
function extractOperatorId(intent: Intent): string | null {
  if ("operatorId" in intent) {
    const v = (intent as { operatorId?: unknown }).operatorId;
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

/**
 * Emit an intent. Mestor logs it (émission hash-chaînée via le spine canonique,
 * ADR-0124), consulte Thot (cost-gate), passe les pre-flight gates, then hands
 * off to Artemis.commandant.execute().
 *
 * # Invariants (ADR-0124 — parité totale avec le chemin governed-procedure)
 *
 * - **Q1 fail-closed** : émission impossible à persister ⇒ AUCUN dispatch.
 *   Le résultat est FAILED reason=EMISSION_PERSIST_FAILED. Pas de trace ⇒
 *   pas de mutation (fin du best-effort historique).
 * - **Loi 1** : la row est hash-chaînée (prevHash/selfHash) par `openEmission`.
 * - **Loi 3** : cost-gate Thot quand un operatorId est résolvable (options ou
 *   payload) ET que la capability manifest déclare un coût — VETO refuse le
 *   dispatch, DOWNGRADE laisse passer et marque l'émission DOWNGRADED.
 * - **Q2** : la fermeture publie l'événement terminal (completed/failed/
 *   vetoed/downgraded) — la boucle d'observation Seshat couvre ce chemin.
 * - Le verdict DOWNGRADED du manipulation-gate n'est plus avalé : warning sur
 *   le résultat + incrément `Strategy.mixViolationOverrideCount`.
 */
export async function emitIntent(
  intent: Intent,
  options: { caller: string; operatorId?: string } = { caller: "unknown" },
): Promise<IntentResult> {
  const startedAt = new Date().toISOString();

  // Lazy imports to avoid circular dependencies
  const { db } = await import("@/lib/db");
  const { execute } = await import("@/server/services/artemis/commandant");
  const { openEmission, closeEmission } = await import(
    "@/server/governance/emission-spine"
  );

  // Fermeture best-effort : la mutation a déjà eu lieu — un échec d'écriture
  // de la complétion ne détruit pas le résultat, il laisse la row PENDING
  // (le cron staleness la flaggera — échec de trace visible, pas silencieux).
  const close = async (
    emissionId: string,
    result: IntentResult,
    status: "OK" | "FAILED" | "VETOED" | "DOWNGRADED" | "QUEUED",
  ): Promise<void> => {
    try {
      await closeEmission({ intentId: emissionId, result, status });
    } catch (err) {
      console.error(
        `[mestor.emitIntent] could not close emission ${emissionId} (${intent.kind}) — row left PENDING:`,
        err instanceof Error ? err.message : err,
      );
    }
  };

  // ── Q1 fail-closed — émission hash-chaînée AVANT toute délibération ──
  let emissionId: string;
  try {
    emissionId = await openEmission({
      kind: intent.kind,
      strategyId: intent.strategyId,
      payload: intent,
      caller: options.caller,
    });
  } catch (err) {
    console.error(
      "[mestor.emitIntent] EMISSION_PERSIST_FAILED — refusing dispatch (Q1 fail-closed):",
      err instanceof Error ? err.message : err,
    );
    return {
      intentKind: intent.kind,
      strategyId: intent.strategyId,
      status: "FAILED",
      summary: `Emission could not be persisted — dispatch refused (no trace ⇒ no mutation). ${err instanceof Error ? err.message : String(err)}`,
      reason: "EMISSION_PERSIST_FAILED",
      startedAt,
      completedAt: new Date().toISOString(),
    };
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
    await close(emissionId, result, "VETOED");
    return result;
  }
  // DOWNGRADED (override opérateur) — plus jamais avalé : tracé sur le
  // compteur stratégique + surfacé en warning après dispatch (ADR-0124).
  const mixDowngradeReason = mixCheck?.status === "DOWNGRADED" ? mixCheck.reason : null;
  if (mixDowngradeReason) {
    await db.strategy
      .update({
        where: { id: intent.strategyId },
        data: { mixViolationOverrideCount: { increment: 1 } },
      })
      .catch(() => {
        /* pivot MARKET:<code> ou stratégie absente — compteur non applicable */
      });
  }

  // ── ADR-0080/0081 Phase 23 Epic 6 — CALIBRATION_SNAPSHOT_REQUIRED pre-flight ──
  // For PROMOTE_PIVOT_SUBCLUSTER → PRODUCTION, refuse dispatch unless a valid
  // calibrationSnapshotRef points to a succeeded RUN_ATTRIBUTION_CALIBRATION
  // emission (FR24, P22-4). Runs before the handler — defense-in-depth on top of
  // the handler-entry check in lifecycle.ts.
  const calibCheck = await preflightCalibrationSnapshot(intent);
  if (calibCheck) {
    const result: IntentResult = {
      intentKind: intent.kind,
      strategyId: intent.strategyId,
      status: "VETOED",
      summary: calibCheck.reason,
      startedAt,
      completedAt: new Date().toISOString(),
      reason: "CALIBRATION_SNAPSHOT_REQUIRED",
    };
    await close(emissionId, result, "VETOED");
    return result;
  }

  // ── ADR-0167 — PALIER_PROMOTION_PROOFS pre-flight (transitions de palier) ──
  const palierCheck = await preflightPalierPromotionProofs(intent);
  if (palierCheck) {
    const result: IntentResult = {
      intentKind: intent.kind,
      strategyId: intent.strategyId,
      status: "VETOED",
      summary: palierCheck.reason,
      startedAt,
      completedAt: new Date().toISOString(),
      reason: "PALIER_PROMOTION_PROOFS",
    };
    await close(emissionId, result, "VETOED");
    return result;
  }

  // ── ADR-0105 — MARKET_STATUS pre-flight (op-gate marché gelé/shadowbanné) ──
  const marketCheck = await preflightMarketStatus(intent);
  if (marketCheck) {
    const result: IntentResult = {
      intentKind: intent.kind,
      strategyId: intent.strategyId,
      status: "VETOED",
      summary: marketCheck.reason,
      startedAt,
      completedAt: new Date().toISOString(),
      reason: "MARKET_STATUS",
    };
    await close(emissionId, result, "VETOED");
    return result;
  }

  // ── ADR-0124 — Thot cost-gate (Loi 3) — parité chemin governed-procedure ──
  const operatorId = options.operatorId ?? extractOperatorId(intent);
  const costDecision = await evaluateBusCostGate(intent, emissionId, operatorId);
  if (costDecision?.decision === "VETO") {
    const result: IntentResult = {
      intentKind: intent.kind,
      strategyId: intent.strategyId,
      status: "VETOED",
      summary: costDecision.reason,
      startedAt,
      completedAt: new Date().toISOString(),
      reason: "COST_GATE",
    };
    await close(emissionId, result, "VETOED");
    return result;
  }

  // ── C6 — BRIEF_VS_ADVE_COHERENCE advisory pre-flight (non-blocking) ──
  // Computed before dispatch, surfaced on the result after (WARN never stops
  // the forge — it flags the divergence for the operator).
  const briefCoherenceWarning = await preflightBriefVsAdveCoherence(intent);

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

  // Surface the C6 coherence advisory on the result (non-blocking).
  if (briefCoherenceWarning) {
    result.warnings = [...(result.warnings ?? []), briefCoherenceWarning];
  }
  // Surface manipulation-gate DOWNGRADE + cost-gate DOWNGRADE (non-blocking).
  if (mixDowngradeReason) {
    result.warnings = [...(result.warnings ?? []), `MANIPULATION_COHERENCE downgraded: ${mixDowngradeReason}`];
  }
  if (costDecision?.decision === "DOWNGRADE") {
    result.warnings = [...(result.warnings ?? []), `COST_GATE downgraded: ${costDecision.reason}`];
  }

  // Statut de la ROW d'émission : un dispatch OK sous downgrade (Thot ou
  // manipulation) est marqué DOWNGRADED — même règle que le chemin
  // governed-procedure. Le statut du RÉSULTAT rendu au caller reste celui du
  // handler (les flows emitIntentTyped ne cassent pas sur un override assumé).
  const gateDowngraded = mixDowngradeReason !== null || costDecision?.decision === "DOWNGRADE";
  const emissionStatus =
    result.status === "OK" && gateDowngraded ? "DOWNGRADED" : result.status;
  await close(emissionId, result, emissionStatus);

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
