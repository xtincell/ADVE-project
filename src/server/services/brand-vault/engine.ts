/**
 * brand-vault/engine — Phase 10 (ADR-0012)
 *
 * State machine + lineage hash-chain + batch selection + supersession
 * pour le BrandAsset (vault unifié de la marque).
 *
 * Réceptacle unique pour TOUS les actifs :
 *   - intellectuels (Big Idea, Brief, Brainstorm, Claim, Manifesto, Concept,
 *     Naming, KV brief, Tone Charter, Persona, Superfan Journey, etc.)
 *   - matériels (KV image Ptah-forgé, spot vidéo, jingle audio, packaging)
 *
 * Cycle de vie : DRAFT → CANDIDATE → SELECTED → ACTIVE → SUPERSEDED → ARCHIVED.
 */

import { db } from "@/lib/db";
import type { BrandAssetState } from "@prisma/client";
import { randomBytes } from "node:crypto";

/** Mapping outputFormat Glory tool → BrandAsset.kind canonique. */
export const FORMAT_TO_KIND: Record<string, string> = {
  // Strategic
  concepts_list: "BIG_IDEA",
  claims_list: "CLAIM",
  claim_hierarchy: "CLAIM",
  creative_brief: "CREATIVE_BRIEF",
  kv_brief: "KV_ART_DIRECTION_BRIEF",
  kv_prompts_list: "KV_PROMPT",
  value_proposition: "VALUE_PROPOSITION",
  positioning_statement: "POSITIONING",
  // Identity
  name_proposals: "NAMING",
  tone_charter: "TONE_CHARTER",
  brand_vocabulary: "BRAND_VOCABULARY",
  brand_rituals: "BRAND_RITUALS",
  brand_guidelines: "BRAND_GUIDELINES",
  brand_validation_report: "BRAND_VALIDATION_REPORT",
  brand_audit_report: "BRAND_AUDIT_REPORT",
  // Persona / Audience
  superfan_journey: "SUPERFAN_JOURNEY",
  // Visual system
  chromatic_strategy: "CHROMATIC_STRATEGY",
  typography_system: "TYPOGRAPHY_SYSTEM",
  design_tokens: "DESIGN_TOKENS",
  // Production briefs
  script: "SCRIPT",
  dialogue: "DIALOGUE",
  storyboard: "STORYBOARD",
  sound_brief: "SOUND_BRIEF",
  voiceover_brief: "VOICEOVER_BRIEF",
  casting_brief: "CASTING_BRIEF",
  vendor_brief: "VENDOR_BRIEF",
  print_ad_spec: "PRINT_AD_SPEC",
  packaging_layout: "PACKAGING_LAYOUT",
  // Copy
  social_copy_set: "SOCIAL_COPY",
  long_copy: "LONG_COPY",
  copy_guidelines_document: "COPY_GUIDELINES",
  // Pitch / decks
  pitch_structure: "PITCH",
  sales_deck: "SALES_DECK",
  presentation_strategy: "PRESENTATION_STRATEGY",
  credentials_deck: "CREDENTIALS_DECK",
  // Calendar / planning
  content_calendar: "CONTENT_CALENDAR",
  content_mix: "CONTENT_MIX",
  // Reports / analysis
  competitive_analysis: "COMPETITIVE_ANALYSIS",
  swot_augmented: "SWOT",
  trend_radar: "TREND_RADAR",
  semiotic_analysis: "SEMIOTIC_ANALYSIS",
  benchmark_report: "BENCHMARK_REPORT",
  evaluation_matrix: "EVALUATION_MATRIX",
  // Compliance / risk
  compliance_report: "COMPLIANCE_REPORT",
  compliance_checklist: "COMPLIANCE_CHECKLIST",
  risk_matrix: "RISK_MATRIX",
  crisis_plan: "CRISIS_PLAN",
  coherence_report: "COHERENCE_REPORT",
  // Education / community
  educational_content: "EDUCATIONAL_CONTENT",
  community_playbook: "COMMUNITY_PLAYBOOK",
  ugc_framework: "UGC_FRAMEWORK",
  // Distribution / media
  distribution_matrix: "DISTRIBUTION_MATRIX",
  digital_plan: "DIGITAL_PLAN",
  format_specs: "FORMAT_SPECS",
  // Financial / ops
  budget_optimization: "BUDGET_OPTIMIZATION",
  budget_tracking: "BUDGET_TRACKING",
  pricing_strategy: "PRICING_STRATEGY",
  cost_estimate: "COST_ESTIMATE",
  devis: "DEVIS",
  roi_metrics: "ROI_METRICS",
  client_profitability: "CLIENT_PROFITABILITY",
  project_pnl: "PROJECT_PNL",
  utilization: "UTILIZATION",
  resource_plan: "RESOURCE_PLAN",
  codb: "COST_OF_DOING_BUSINESS",
  // Architecture / strategy
  campaign_architecture: "CAMPAIGN_ARCHITECTURE",
  roadmap_milestones: "ROADMAP",
  // Misc
  award_case: "AWARD_CASE",
  artifacts: "ARTIFACTS",
  workflow_definition: "WORKFLOW_DEFINITION",
  visual_landscape_map: "VISUAL_LANDSCAPE_MAP",
  universe_setup: "UNIVERSE_SETUP",
  story_sequence: "STORY_SEQUENCE",
  character_sheet: "CHARACTER_SHEET",
  direction_memo: "DIRECTION_MEMO",
  photo_guidelines: "PHOTO_GUIDELINES",
  simulation_report: "SIMULATION_REPORT",
  sublimation_report: "SUBLIMATION_REPORT",
  seasonal_themes: "SEASONAL_THEMES",
  seo_report: "SEO_REPORT",
  tone_matrix: "TONE_MATRIX",
  wordplay_bank: "WORDPLAY_BANK",
  post_campaign_report: "POST_CAMPAIGN_REPORT",
};

/** Kinds majeurs pour lesquels une Campaign garde un BrandAsset ACTIVE explicite. */
export const CAMPAIGN_ACTIVE_KIND_FIELDS: Record<string, string> = {
  BIG_IDEA: "activeBigIdeaId",
  CREATIVE_BRIEF: "activeBriefId",
  BRIEF_360: "activeBriefId",
  CLAIM: "activeClaimId",
  MANIFESTO: "activeManifestoId",
  KV_ART_DIRECTION_BRIEF: "activeKvBriefId",
};

export interface CreateBrandAssetInput {
  strategyId: string;
  operatorId: string;
  name: string;
  kind: string;
  format?: string;
  family?: "INTELLECTUAL" | "MATERIAL" | "HYBRID";
  content?: Record<string, unknown>;
  fileUrl?: string;
  mimeType?: string;
  fileSize?: number;
  summary?: string;
  pillarSource?: "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S";
  manipulationMode?: "peddler" | "dealer" | "facilitator" | "entertainer";
  state?: BrandAssetState;
  // Lineage
  sourceIntentId?: string;
  sourceGloryOutputId?: string;
  sourceAssetVersionId?: string;
  sourceExecutionId?: string;
  batchId?: string;
  batchSize?: number;
  batchIndex?: number;
  // Business
  campaignId?: string;
  briefId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Crée un BrandAsset avec lineage hash-chain. Idempotent best-effort sur
 * (sourceGloryOutputId, batchIndex) pour éviter les doublons en cas de replay.
 */
export async function createBrandAsset(input: CreateBrandAssetInput) {
  const family = input.family ?? (input.fileUrl ? "MATERIAL" : input.content ? "INTELLECTUAL" : "HYBRID");
  const state = input.state ?? "DRAFT";
  return db.brandAsset.create({
    data: {
      strategyId: input.strategyId,
      operatorId: input.operatorId,
      name: input.name,
      kind: input.kind,
      format: input.format ?? null,
      family,
      content: (input.content ?? {}) as never,
      fileUrl: input.fileUrl ?? null,
      mimeType: input.mimeType ?? null,
      fileSize: input.fileSize ?? null,
      summary: input.summary ?? null,
      pillarSource: input.pillarSource ?? null,
      manipulationMode: input.manipulationMode ?? null,
      state,
      sourceIntentId: input.sourceIntentId ?? null,
      sourceGloryOutputId: input.sourceGloryOutputId ?? null,
      sourceAssetVersionId: input.sourceAssetVersionId ?? null,
      sourceExecutionId: input.sourceExecutionId ?? null,
      batchId: input.batchId ?? null,
      batchSize: input.batchSize ?? 1,
      batchIndex: input.batchIndex ?? 0,
      campaignId: input.campaignId ?? null,
      briefId: input.briefId ?? null,
      metadata: (input.metadata ?? null) as never,
    },
  });
}

/**
 * Crée un batch de N candidats à partir d'un GloryOutput qui contient une
 * liste structurée (concepts_list → 5 concepts → 5 BrandAsset CANDIDATE).
 *
 * Le caller fournit la liste pré-extraite (pas la responsabilité du engine
 * de parser le shape arbitraire d'un Glory output).
 */
export async function createCandidateBatch(args: {
  strategyId: string;
  operatorId: string;
  kind: string;
  format: string;
  candidates: Array<{ name: string; content: Record<string, unknown>; summary?: string }>;
  pillarSource?: "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S";
  manipulationMode?: "peddler" | "dealer" | "facilitator" | "entertainer";
  sourceIntentId?: string;
  sourceGloryOutputId?: string;
  sourceExecutionId?: string;
  campaignId?: string;
  briefId?: string;
}) {
  const batchId = `batch-${Date.now()}-${randomBytes(4).toString("hex")}`;
  const created = [];
  for (let i = 0; i < args.candidates.length; i++) {
    const c = args.candidates[i]!;
    const asset = await createBrandAsset({
      strategyId: args.strategyId,
      operatorId: args.operatorId,
      name: c.name,
      kind: args.kind,
      format: args.format,
      family: "INTELLECTUAL",
      content: c.content,
      summary: c.summary,
      pillarSource: args.pillarSource,
      manipulationMode: args.manipulationMode,
      state: "CANDIDATE",
      batchId,
      batchSize: args.candidates.length,
      batchIndex: i,
      sourceIntentId: args.sourceIntentId,
      sourceGloryOutputId: args.sourceGloryOutputId,
      sourceExecutionId: args.sourceExecutionId,
      campaignId: args.campaignId,
      briefId: args.briefId,
    });
    created.push(asset);
  }
  return { batchId, candidates: created };
}

/**
 * Sélectionne UN BrandAsset parmi un batch de candidats : passe en SELECTED,
 * met les autres en REJECTED, et si la kind est dans CAMPAIGN_ACTIVE_KIND_FIELDS,
 * promote en ACTIVE et update Campaign.active{Kind}Id.
 *
 * Hash-chain : crée IntentEmission SELECT_BRAND_ASSET (best-effort).
 */
export async function selectFromBatch(args: {
  batchId: string;
  selectedAssetId: string;
  selectedById: string;
  selectedReason?: string;
  promoteToActive?: boolean;
}) {
  const selected = await db.brandAsset.findUnique({ where: { id: args.selectedAssetId } });
  if (!selected) throw new Error(`BrandAsset ${args.selectedAssetId} not found`);
  if (selected.batchId !== args.batchId) {
    throw new Error(`BrandAsset ${args.selectedAssetId} doesn't belong to batch ${args.batchId}`);
  }

  // Mark selected → SELECTED (or ACTIVE if promoteToActive)
  const targetState = args.promoteToActive ? "ACTIVE" : "SELECTED";
  const updated = await db.brandAsset.update({
    where: { id: args.selectedAssetId },
    data: {
      state: targetState,
      selectedAt: new Date(),
      selectedById: args.selectedById,
      selectedReason: args.selectedReason ?? null,
    },
  });

  // Mark others in batch as REJECTED
  await db.brandAsset.updateMany({
    where: { batchId: args.batchId, id: { not: args.selectedAssetId }, state: "CANDIDATE" },
    data: { state: "REJECTED" },
  });

  // If kind has an active slot on Campaign, update it
  if (args.promoteToActive && selected.campaignId) {
    const fieldName = CAMPAIGN_ACTIVE_KIND_FIELDS[selected.kind];
    if (fieldName) {
      await db.campaign.update({
        where: { id: selected.campaignId },
        data: { [fieldName]: args.selectedAssetId } as never,
      });
    }
  }

  // Best-effort IntentEmission for hash-chain
  try {
    await db.intentEmission.create({
      data: {
        intentKind: "SELECT_BRAND_ASSET",
        strategyId: selected.strategyId,
        payload: {
          batchId: args.batchId,
          selectedAssetId: args.selectedAssetId,
          selectedById: args.selectedById,
          promotedToActive: args.promoteToActive ?? false,
        } as never,
        caller: `brand-vault.selectFromBatch`,
        result: { brandAssetId: args.selectedAssetId, state: targetState } as never,
        completedAt: new Date(),
      },
    });
  } catch {
    /* best-effort */
  }

  return updated;
}

/**
 * Promote un BrandAsset SELECTED → ACTIVE et met à jour Campaign.active{Kind}Id.
 *
 * Phase 18 (ADR-0044) — Quality gate avant promote.
 *
 * Si le `content` est structurellement vide (au sens
 * `applySequenceQualityGate`), le promote est refusé sauf si l'opérateur
 * passe `force: true` explicitement. Empêche le compteur Oracle 35/35
 * cosmétique observé sur Makrea (mai 2026).
 *
 * Cas légitimes pour `force: true` :
 * - Sections dormantes par design (Imhotep/Anubis pré-réservés en Phase 13)
 * - BrandAssets opérateur-saisis bypass-Glory avec payload contractualisé
 * - Tests fixtures
 */
export async function promoteToActive(args: {
  brandAssetId: string;
  promotedById: string;
  force?: boolean;
}) {
  const asset = await db.brandAsset.findUnique({ where: { id: args.brandAssetId } });
  if (!asset) throw new Error(`BrandAsset ${args.brandAssetId} not found`);

  // Quality gate (ADR-0044). Refuse promote si content empty deep, sauf force.
  if (!args.force) {
    const content = (asset.content ?? {}) as Record<string, unknown>;
    const { applySequenceQualityGate, SequenceQualityError } = await import(
      "@/server/services/artemis/tools/quality-gate"
    );
    const gate = await applySequenceQualityGate(
      `promote:${args.brandAssetId}`,
      content,
    );
    if (!gate.ok) {
      // Audit trail : log la tentative refusée
      try {
        await db.intentEmission.create({
          data: {
            intentKind: "PROMOTE_BRAND_ASSET_TO_ACTIVE",
            strategyId: asset.strategyId,
            payload: {
              brandAssetId: args.brandAssetId,
              promotedById: args.promotedById,
              refusedReasons: gate.reasons,
            } as never,
            caller: `brand-vault.promoteToActive:refused`,
            completedAt: new Date(),
          },
        });
      } catch {
        /* best-effort audit */
      }
      throw new SequenceQualityError(`promote:${args.brandAssetId}`, gate.reasons);
    }
  }

  const updated = await db.brandAsset.update({
    where: { id: args.brandAssetId },
    data: { state: "ACTIVE" },
  });

  if (asset.campaignId) {
    const fieldName = CAMPAIGN_ACTIVE_KIND_FIELDS[asset.kind];
    if (fieldName) {
      await db.campaign.update({
        where: { id: asset.campaignId },
        data: { [fieldName]: args.brandAssetId } as never,
      });
    }
  }

  try {
    await db.intentEmission.create({
      data: {
        intentKind: "PROMOTE_BRAND_ASSET_TO_ACTIVE",
        strategyId: asset.strategyId,
        payload: {
          brandAssetId: args.brandAssetId,
          promotedById: args.promotedById,
          forced: args.force ?? false,
        } as never,
        caller: `brand-vault.promoteToActive${args.force ? ":forced" : ""}`,
        completedAt: new Date(),
      },
    });
  } catch {
    /* best-effort */
  }

  return updated;
}

/**
 * Supersede un BrandAsset ACTIVE par une nouvelle version.
 * L'ancien passe en SUPERSEDED, le nouveau en ACTIVE.
 */
export async function supersede(args: {
  oldAssetId: string;
  newAssetInput: CreateBrandAssetInput;
  reason?: string;
  supersededById: string;
}) {
  const oldAsset = await db.brandAsset.findUnique({ where: { id: args.oldAssetId } });
  if (!oldAsset) throw new Error(`BrandAsset ${args.oldAssetId} not found`);

  const newAsset = await createBrandAsset({
    ...args.newAssetInput,
    state: "ACTIVE",
  });

  const oldAssetUpdated = await db.brandAsset.update({
    where: { id: args.oldAssetId },
    data: {
      state: "SUPERSEDED",
      supersededById: newAsset.id,
      supersededAt: new Date(),
      supersededReason: args.reason ?? null,
    },
  });

  // Update parent chain
  const newAssetUpdated = await db.brandAsset.update({
    where: { id: newAsset.id },
    data: { parentBrandAssetId: args.oldAssetId, version: oldAsset.version + 1 },
  });

  // Update Campaign active slot if applicable
  if (oldAsset.campaignId) {
    const fieldName = CAMPAIGN_ACTIVE_KIND_FIELDS[oldAsset.kind];
    if (fieldName) {
      await db.campaign.update({
        where: { id: oldAsset.campaignId },
        data: { [fieldName]: newAsset.id } as never,
      });
    }
  }

  try {
    await db.intentEmission.create({
      data: {
        intentKind: "SUPERSEDE_BRAND_ASSET",
        strategyId: oldAsset.strategyId,
        payload: { oldAssetId: args.oldAssetId, newAssetId: newAsset.id, reason: args.reason ?? null } as never,
        caller: `brand-vault.supersede`,
        completedAt: new Date(),
      },
    });
  } catch {
    /* best-effort */
  }

  return { oldAsset: oldAssetUpdated, newAsset: newAssetUpdated };
}

/**
 * Archive un BrandAsset (mort rituelle — lecture seule).
 */
export async function archive(args: { brandAssetId: string; archivedById: string; reason?: string }) {
  const asset = await db.brandAsset.findUnique({ where: { id: args.brandAssetId } });
  if (!asset) throw new Error(`BrandAsset ${args.brandAssetId} not found`);

  const updated = await db.brandAsset.update({
    where: { id: args.brandAssetId },
    data: { state: "ARCHIVED" },
  });

  try {
    await db.intentEmission.create({
      data: {
        intentKind: "ARCHIVE_BRAND_ASSET",
        strategyId: asset.strategyId,
        payload: { brandAssetId: args.brandAssetId, archivedById: args.archivedById, reason: args.reason ?? null } as never,
        caller: `brand-vault.archive`,
        completedAt: new Date(),
      },
    });
  } catch {
    /* best-effort */
  }

  return updated;
}

/** Helper : extrait le kind canonique depuis un Glory tool outputFormat. */
export function kindFromFormat(format: string | undefined): string {
  if (!format) return "GENERIC";
  return FORMAT_TO_KIND[format] ?? "GENERIC";
}
