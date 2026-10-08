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
import { assertAssetSourceCurrent } from "@/server/services/ingestion-pipeline/source-usage";
import { Prisma, type BrandAsset, type BrandAssetState } from "@prisma/client";
import { canAccessStrategy } from "@/server/services/operator-isolation";
import { assertCollaboratorMayEmit } from "@/server/governance/collaborator-firewall";
import { isGodModeEmail } from "@/lib/auth/god-mode";
import { randomBytes } from "node:crypto";
import { PUBLIC_BRAND_FORMAT } from "@/domain/public-brand";

export function assertOrdinaryAsset(format: string | null | undefined) {
  if (format === PUBLIC_BRAND_FORMAT) throw new BrandAssetLifecycleError("PRECONDITION_FAILED",
    "Cette publication se gère depuis Connexions → Page publique, pour conserver son historique.");
}

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
  operatorId: string | null;
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
export async function createBrandAsset(input: CreateBrandAssetInput, client: Prisma.TransactionClient = db): Promise<import("@prisma/client").BrandAsset> {
  assertOrdinaryAsset(input.format);
  // Source-derived assets are committed under the same evidence lock as corrections.
  if (client === db && typeof input.metadata?.sourceDataSourceId === "string") {
    return db.$transaction((tx) => createBrandAsset(input, tx));
  }
  await assertAssetSourceCurrent(client, { strategyId: input.strategyId, metadata: input.metadata });
  const family = input.family ?? (input.fileUrl ? "MATERIAL" : input.content ? "INTELLECTUAL" : "HYBRID");
  const state = input.state ?? "DRAFT";
  return client.brandAsset.create({
    data: {
      strategyId: input.strategyId,
      operatorId: input.operatorId,
      name: input.name,
      kind: input.kind,
      format: input.format ?? null,
      family,
      content: (input.content ?? {}) as Prisma.InputJsonValue,
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
      metadata: (input.metadata ?? null) as Prisma.InputJsonValue,
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

export class BrandAssetLifecycleError extends Error {
  constructor(public readonly code: "FORBIDDEN" | "CONFLICT" | "PRECONDITION_FAILED", message: string) {
    super(message); this.name = "BrandAssetLifecycleError";
  }
}

/**
 * One mutation boundary for manual wrappers and catalogued commands (ADR-0208).
 * Lock order: documentary sources -> strategy -> vault mutex -> campaign -> asset.
 * A correction uses the same source lock before invalidating assets. Never take
 * an asset lock first and then wait for a source held by that correction.
 */
async function withLockedAsset<T>(args: {
  assetId: string; actorId: string; kind: string; strategyId?: string;
  next?: Omit<CreateBrandAssetInput, "operatorId"> & { operatorId?: string | null };
  useSource?: boolean;
}, mutate: (tx: Prisma.TransactionClient, asset: BrandAsset, operatorId: string | null) => Promise<T>): Promise<T> {
  const initial = await db.brandAsset.findUniqueOrThrow({ where: { id: args.assetId } });
  assertOrdinaryAsset(initial.format);
  assertOrdinaryAsset(args.next?.format);
  if ((args.strategyId && initial.strategyId !== args.strategyId)
    || (args.next && args.next.strategyId !== initial.strategyId)) {
    throw new BrandAssetLifecycleError("FORBIDDEN", "ASSET_SCOPE_MISMATCH: cet actif ne relève pas de la marque indiquée.");
  }
  const sourceId = (metadata: unknown) => {
    const meta = metadata as Record<string, unknown> | null;
    return typeof meta?.sourceDataSourceId === "string" ? meta.sourceDataSourceId : null;
  };
  const sourceIds = [...new Set([sourceId(initial.metadata), sourceId(args.next?.metadata)]
    .filter((id): id is string => id !== null))].sort();
  return db.$transaction(async (tx) => {
    if (sourceIds.length) await tx.$queryRaw(Prisma.sql`
      SELECT id FROM "BrandDataSource" WHERE id IN (${Prisma.join(sourceIds)}) ORDER BY id FOR UPDATE`);
    if (sourceIds.length) await tx.$queryRaw(Prisma.sql`
      SELECT id FROM "Strategy" WHERE id=${initial.strategyId}
      OR id IN (SELECT "strategyId" FROM "BrandDataSource" WHERE id IN (${Prisma.join(sourceIds)})) ORDER BY id FOR SHARE`);
    else await tx.$queryRaw`SELECT id FROM "Strategy" WHERE id=${initial.strategyId} FOR SHARE`;
    // Different assets in one batch must contend on the SAME lock.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"brand-vault:" + initial.strategyId}, 0))`;
    if (initial.campaignId) await tx.$queryRaw`SELECT id FROM "Campaign" WHERE id=${initial.campaignId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "BrandAsset" WHERE id=${initial.id} FOR UPDATE`;
    const current = await tx.brandAsset.findUniqueOrThrow({ where: { id: initial.id } });
    if (current.strategyId !== initial.strategyId || current.campaignId !== initial.campaignId
      || current.kind !== initial.kind || current.briefId !== initial.briefId
      || sourceId(current.metadata) !== sourceId(initial.metadata)) {
      throw new BrandAssetLifecycleError("CONFLICT", "ASSET_CHANGED: le dossier de cet actif a changé. Relire avant de décider.");
    }
    const actor = await tx.user.findUnique({ where: { id: args.actorId }, select: { id: true, email: true, operatorId: true, role: true } });
    // Same effective role as authentication; a legacy DB role must not revoke
    // an existing administrator's authority, and the caller cannot supply it.
    const role = isGodModeEmail(actor?.email) ? "ADMIN" : actor?.role;
    if (!actor || !role || !await canAccessStrategy(current.strategyId, { userId: actor.id, operatorId: actor.operatorId, role }, tx)) {
      throw new BrandAssetLifecycleError("FORBIDDEN", "ASSET_ACCESS_DENIED: accès refusé à cet actif.");
    }
    await assertCollaboratorMayEmit({ userId: actor.id, role, strategyId: current.strategyId, kind: args.kind }, tx);
    const strategy = await tx.strategy.findUniqueOrThrow({ where: { id: current.strategyId }, select: { operatorId: true } });
    if (args.next?.operatorId !== undefined && args.next.operatorId !== strategy.operatorId) {
      throw new BrandAssetLifecycleError("FORBIDDEN", "ASSET_SCOPE_MISMATCH: l’équipe du nouvel actif ne correspond pas à la marque.");
    }
    if (current.campaignId) {
      const campaign = await tx.campaign.findUniqueOrThrow({ where: { id: current.campaignId }, select: { strategyId: true } });
      if (campaign.strategyId !== current.strategyId) throw new BrandAssetLifecycleError("PRECONDITION_FAILED", "ASSET_CAMPAIGN_MISMATCH: campagne étrangère.");
    }
    if (args.useSource) await assertAssetSourceCurrent(tx, current);
    return mutate(tx, current, strategy.operatorId);
  });
}

async function assertQuality(assetId: string, content: unknown, force = false) {
  if (force) return;
  const { applySequenceQualityGate, SequenceQualityError } = await import("@/server/services/artemis/tools/quality-gate");
  const gate = await applySequenceQualityGate(`promote:${assetId}`, (content ?? {}) as Record<string, unknown>);
  if (!gate.ok) throw new SequenceQualityError(`promote:${assetId}`, gate.reasons);
}

/** A campaign slot cannot silently displace an active decision. Use supersede. */
async function activateSlot(tx: Prisma.TransactionClient, asset: BrandAsset, replacesId?: string) {
  const field = CAMPAIGN_ACTIVE_KIND_FIELDS[asset.kind];
  if (!asset.campaignId || !field) return;
  const campaign = await tx.campaign.findUniqueOrThrow({ where: { id: asset.campaignId } });
  const current = (campaign as unknown as Record<string, unknown>)[field];
  if (current && current !== asset.id && current !== replacesId) {
    throw new BrandAssetLifecycleError("CONFLICT", "ACTIVE_SLOT_OCCUPIED: remplacer la version en usage avant d’en activer une autre.");
  }
  await tx.campaign.update({ where: { id: campaign.id }, data: { [field]: asset.id } });
}

/** Select one candidate in its own brand/campaign/kind batch; retry is a no-op. */
export async function selectFromBatch(args: {
  batchId: string; selectedAssetId: string; selectedById: string;
  selectedReason?: string; promoteToActive?: boolean; strategyId?: string;
}) {
  return withLockedAsset({ assetId: args.selectedAssetId, actorId: args.selectedById,
    kind: "SELECT_BRAND_ASSET", strategyId: args.strategyId, useSource: true }, async (tx, selected) => {
    if (selected.batchId !== args.batchId) throw new BrandAssetLifecycleError("PRECONDITION_FAILED", "ASSET_BATCH_MISMATCH: cet actif ne fait pas partie de ce lot.");
    if (!["CANDIDATE", "SELECTED", "ACTIVE"].includes(selected.state)) {
      throw new BrandAssetLifecycleError("PRECONDITION_FAILED", `ASSET_TRANSITION_REFUSED: ${selected.state} → SELECTED`);
    }
    // Repeating a selection must not demote ACTIVE to SELECTED.
    if (selected.state === "ACTIVE" || (selected.state === "SELECTED" && !args.promoteToActive)) return selected;
    if (args.promoteToActive) await assertQuality(selected.id, selected.content);
    const updated = await tx.brandAsset.update({ where: { id: selected.id }, data: {
      state: args.promoteToActive ? "ACTIVE" : "SELECTED",
      selectedAt: selected.selectedAt ?? new Date(), selectedById: selected.selectedById ?? args.selectedById,
      selectedReason: selected.selectedReason ?? args.selectedReason ?? null,
    } });
    await tx.brandAsset.updateMany({ where: {
      strategyId: selected.strategyId, campaignId: selected.campaignId, kind: selected.kind,
      batchId: args.batchId, id: { not: selected.id }, state: "CANDIDATE",
    }, data: { state: "REJECTED" } });
    if (args.promoteToActive) await activateSlot(tx, updated);
    return updated;
  });
}

/** DRAFT/SELECTED -> ACTIVE. Force bypasses quality only, never state or source. */
export async function promoteToActive(args: {
  brandAssetId: string; promotedById: string; force?: boolean; strategyId?: string;
}) {
  return withLockedAsset({ assetId: args.brandAssetId, actorId: args.promotedById,
    kind: "PROMOTE_BRAND_ASSET_TO_ACTIVE", strategyId: args.strategyId, useSource: true }, async (tx, asset) => {
    if (asset.state === "ACTIVE") return asset;
    if (!["DRAFT", "SELECTED"].includes(asset.state)) throw new BrandAssetLifecycleError("PRECONDITION_FAILED", `ASSET_TRANSITION_REFUSED: ${asset.state} → ACTIVE`);
    await assertQuality(asset.id, asset.content, args.force);
    const updated = await tx.brandAsset.update({ where: { id: asset.id }, data: { state: "ACTIVE" } });
    await activateSlot(tx, updated);
    return updated;
  });
}

/** Atomic replacement; the old lineage, successor and active slot commit together. */
export async function supersede(args: {
  oldAssetId: string;
  newAssetInput: Omit<CreateBrandAssetInput, "operatorId"> & { operatorId?: string | null };
  reason?: string; supersededById: string; strategyId?: string; intentId?: string;
}) {
  return withLockedAsset({ assetId: args.oldAssetId, actorId: args.supersededById,
    kind: "SUPERSEDE_BRAND_ASSET", strategyId: args.strategyId, next: args.newAssetInput }, async (tx, old, operatorId) => {
    const next = args.newAssetInput;
    if (next.kind !== old.kind || (next.campaignId !== undefined && next.campaignId !== old.campaignId)) {
      throw new BrandAssetLifecycleError("PRECONDITION_FAILED", "ASSET_LINEAGE_MISMATCH: une version conserve la nature et la campagne de son actif.");
    }
    if (args.intentId && old.supersededById) {
      const successor = await tx.brandAsset.findUniqueOrThrow({ where: { id: old.supersededById } });
      const meta = successor.metadata as Record<string, unknown> | null;
      if (meta?.vaultSupersessionIntentId === args.intentId && successor.parentBrandAssetId === old.id) {
        return { oldAsset: old, newAsset: successor };
      }
    }
    if (old.state !== "ACTIVE") throw new BrandAssetLifecycleError("PRECONDITION_FAILED", `ASSET_TRANSITION_REFUSED: ${old.state} → SUPERSEDED`);
    const briefId = next.briefId ?? old.briefId;
    if (briefId) {
      const brief = await tx.campaignBrief.findUniqueOrThrow({ where: { id: briefId }, select: { campaignId: true, campaign: { select: { strategyId: true } } } });
      if (brief.campaign.strategyId !== old.strategyId || brief.campaignId !== old.campaignId) {
        throw new BrandAssetLifecycleError("PRECONDITION_FAILED", "ASSET_BRIEF_MISMATCH: brief étranger à cette campagne.");
      }
    }
    await assertQuality(old.id, next.content);
    const created = await createBrandAsset({ ...next, operatorId, campaignId: old.campaignId ?? undefined,
      briefId: briefId ?? undefined, state: "ACTIVE", sourceIntentId: next.sourceIntentId ?? args.intentId,
      metadata: { ...next.metadata, ...(args.intentId ? { vaultSupersessionIntentId: args.intentId } : {}) },
    }, tx);
    const newAsset = await tx.brandAsset.update({ where: { id: created.id }, data: { parentBrandAssetId: old.id, version: old.version + 1 } });
    const oldAsset = await tx.brandAsset.update({ where: { id: old.id }, data: {
      state: "SUPERSEDED", supersededById: newAsset.id, supersededAt: new Date(), supersededReason: args.reason ?? null,
    } });
    await activateSlot(tx, newAsset, old.id);
    return { oldAsset, newAsset };
  });
}

/** Archiving stale/superseded evidence is allowed; never leaves an active slot dangling. */
export async function archive(args: {
  brandAssetId: string; archivedById: string; reason?: string; strategyId?: string;
}) {
  return withLockedAsset({ assetId: args.brandAssetId, actorId: args.archivedById,
    kind: "ARCHIVE_BRAND_ASSET", strategyId: args.strategyId }, async (tx, asset) => {
    if (asset.state === "ARCHIVED") return asset;
    const updated = await tx.brandAsset.update({ where: { id: asset.id }, data: { state: "ARCHIVED" } });
    const field = CAMPAIGN_ACTIVE_KIND_FIELDS[asset.kind];
    if (asset.campaignId && field) await tx.campaign.updateMany({
      where: { id: asset.campaignId, [field]: asset.id }, data: { [field]: null },
    });
    return updated;
  });
}

/** Helper : extrait le kind canonique depuis un Glory tool outputFormat. */
export function kindFromFormat(format: string | undefined): string {
  if (!format) return "GENERIC";
  return FORMAT_TO_KIND[format] ?? "GENERIC";
}
