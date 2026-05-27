/**
 * Campaign Tracker — Signaux faibles & culture (Phase 19, ADR-0052 Cluster D).
 *
 * Layer 4 — orchestrate Layer 2/3.
 *
 * Sous-clusters Vague 2 (4) :
 *   - culture.overtonReadiness — pré-LIVE evaluator (PARTIAL/MVP heuristic)
 *   - culture.overtonShift     — post-LIVE measurer (PARTIAL/MVP)
 *   - culture.mcpIngest        — ingest contexte founder MCP entrant (PARTIAL/MVP)
 *   - culture.tarsisBridge     — capture session Tarsis (STUB — deps Seshat tarsis-monitoring)
 *
 * MVP heuristic — vrai algo Overton viendra via ADR enfant `0055-overton-algo.md`.
 *
 * Cf. docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md
 */

import { db } from "@/lib/db";
import { tokenize, jaccardSimilarity } from "./coherence";
import {
  type OvertonReadiness,
  type OvertonReadinessResult,
  type OvertonShiftResult,
  type McpContextIngestResult,
} from "./types";
import { executeTool } from "@/server/services/artemis/tools/engine";

// ─────────────────────────────────────────────────────────────────────────
// Sous-cluster culture.overtonReadiness (PARTIAL/MVP)
// ─────────────────────────────────────────────────────────────────────────

interface EvaluateOvertonReadinessInput {
  readonly strategyId: string;
  readonly operatorId: string;
  readonly campaignId: string;
}

/**
 * Phase 23 (ADR-0078, Epic 3 Story 3.3) — delegates to `sector-intelligence/`.
 *
 * Decision rule :
 *   - Campaign.overtonHypothesis absent → degradationCode
 *     `MISSING_OVERTON_HYPOTHESIS`, readiness=READY par défaut (non-bloquant),
 *     proximityScore=null (no fabricated 0).
 *   - Sector axis absent dans `sector-intelligence/` → degradationCode
 *     `INSUFFICIENT_SECTOR_AXIS`, readiness=READY conservateur,
 *     proximityScore=null. Le médian fabriqué 0.5 hérité de Phase 19 est
 *     supprimé (no-magic-fallback ADR-0046, pattern P22-2).
 *   - Sector axis présent → compute proximityScore via dot-product entre
 *     hypothesis tags et sector axis tags. readiness derived :
 *     TOO_EARLY si <0.3, READY si 0.3-0.7, TOO_LATE si >0.7.
 */
export async function evaluateOvertonReadiness(
  input: EvaluateOvertonReadinessInput,
): Promise<OvertonReadinessResult> {
  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: {
      id: true,
      strategyId: true,
      overtonHypothesis: true,
      strategy: { select: { businessContext: true } },
    },
  });
  if (!campaign) throw new Error(`Campaign ${input.campaignId} not found`);
  if (campaign.strategyId !== input.strategyId) {
    throw new Error(`Campaign ${input.campaignId} not in strategy ${input.strategyId}`);
  }

  const degradationCodes: string[] = [];

  if (!campaign.overtonHypothesis) {
    degradationCodes.push("MISSING_OVERTON_HYPOTHESIS");
    return {
      strategyId: input.strategyId,
      campaignId: input.campaignId,
      readiness: "READY",
      reasoning: "Pas d'hypothèse Overton déclarée — readiness par défaut READY (non-bloquant).",
      proximityScore: null,
      degradationCodes,
    };
  }

  const sectorSlug = extractSectorSlugFromStrategy(campaign.strategy?.businessContext);
  if (!sectorSlug) {
    degradationCodes.push("MISSING_SECTOR_SLUG");
    return {
      strategyId: input.strategyId,
      campaignId: input.campaignId,
      readiness: "READY",
      reasoning:
        "Strategy.businessContext.sector indisponible — sector axis non résolvable. Readiness conservateur READY.",
      proximityScore: null,
      degradationCodes,
    };
  }

  const { getSectorAxis } = await import("@/server/services/sector-intelligence");
  const axis = await getSectorAxis(sectorSlug);
  if (!axis || axis.samples === 0) {
    degradationCodes.push("INSUFFICIENT_SECTOR_AXIS");
    return {
      strategyId: input.strategyId,
      campaignId: input.campaignId,
      readiness: "READY",
      reasoning:
        "Sector axis indisponible — Tarsis signal pas encore agrégé pour ce secteur. " +
        "Readiness conservateur READY ; promotion MVP → PRODUCTION gated on real sector axis " +
        "(cf. ADR-0078). Pattern P22-2 : proximityScore=null (no fabricated median).",
      proximityScore: null,
      degradationCodes,
    };
  }

  const hypothesis = campaign.overtonHypothesis as Record<string, unknown>;
  const hypothesisTags = parseHypothesisTags(hypothesis);
  const proximityScore = computeProximity(hypothesisTags, axis.tags);
  const readiness: OvertonReadiness = proximityScore < 0.3 ? "TOO_EARLY" : proximityScore > 0.7 ? "TOO_LATE" : "READY";
  return {
    strategyId: input.strategyId,
    campaignId: input.campaignId,
    readiness,
    reasoning:
      `Sector axis vector + hypothesis vector dot-product = ${proximityScore.toFixed(3)} ` +
      `(samples=${axis.samples}, confidence=${axis.confidence.toFixed(2)}). ADR-0078 canonical Overton home.`,
    proximityScore,
    degradationCodes,
  };
}

/**
 * Read the canonical sector slug for a Strategy. Phase 23 uses
 * `Strategy.businessContext.sector` (consistent with
 * `services/playbook-capitalization/`). When the sector cannot be resolved,
 * returns null — the caller surfaces an honest INSUFFICIENT_DATA branch
 * rather than falling back to a default sector (no-magic-fallback ADR-0046).
 */
function extractSectorSlugFromStrategy(businessContext: unknown): string | null {
  if (businessContext && typeof businessContext === "object" && !Array.isArray(businessContext)) {
    const ctx = businessContext as Record<string, unknown>;
    if (typeof ctx.sector === "string" && ctx.sector.length > 0) {
      return ctx.sector;
    }
  }
  return null;
}

/**
 * Extract a tag vector from an arbitrary `overtonHypothesis` JSON. Tries
 * `axe` object first (canonical Phase 19 shape), falls back to `sectorTokens`
 * array (treats each token as a tag with weight 1).
 */
function parseHypothesisTags(hypothesis: Record<string, unknown>): Record<string, number> {
  const axe = hypothesis.axe;
  if (axe && typeof axe === "object" && !Array.isArray(axe)) {
    const tags: Record<string, number> = {};
    for (const [k, v] of Object.entries(axe as Record<string, unknown>)) {
      if (typeof v === "number") tags[k] = Math.max(0, Math.min(1, v));
    }
    return tags;
  }
  const tokens = hypothesis.sectorTokens;
  if (Array.isArray(tokens)) {
    const tags: Record<string, number> = {};
    for (const t of tokens) {
      if (typeof t === "string") tags[t] = 1;
    }
    return tags;
  }
  return {};
}

/**
 * Cosine-like proximity between two tag vectors, returning a value in [0, 1].
 * Returns 0 when either side is empty (the caller has already returned
 * INSUFFICIENT_DATA in that case, so this branch is unreachable in practice).
 */
function computeProximity(a: Record<string, number>, b: Record<string, number>): number {
  const allTags = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const tag of allTags) {
    const va = a[tag] ?? 0;
    const vb = b[tag] ?? 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / Math.sqrt(normA * normB);
}

// ─────────────────────────────────────────────────────────────────────────
// Sous-cluster culture.overtonShift (PARTIAL/MVP)
// ─────────────────────────────────────────────────────────────────────────

interface MeasureOvertonShiftInput {
  readonly strategyId: string;
  readonly operatorId: string;
  readonly campaignId: string;
}

/**
 * Phase 23 (ADR-0078, Epic 3 Story 3.2) — delegates to `sector-intelligence/`.
 *
 * **Phase 23 corrige le placebo Jaccard du Phase 19 MVP.** Le score est désormais
 * calculé via `sector-intelligence.computeBrandDeflection(brandTags, sectorAxis)`
 * — l'algorithme à base de vecteurs canonique du `Sector` model.
 *
 * Decision rule :
 *   - Manual operator-tagged delta (FR26 peer to FR13) : si une action de la
 *     campagne porte `overtonDeltaManual` non-null, c'est le delta brut qui
 *     prévaut sur l'algorithmique. La discrimination est tracée via le
 *     `degradationCodes` (`MANUAL_OPERATOR_DELTA`).
 *   - Algorithmic path : compute brand tags from hypothesis, sector axis from
 *     sector-intelligence.getSectorAxis, then computeBrandDeflection. Score =
 *     deflectionMagnitude signed by alignment direction.
 *   - INSUFFICIENT_DATA → `overtonShiftScore: null` (no fabricated 0,
 *     pattern P22-2).
 */
export async function measureOvertonShift(
  input: MeasureOvertonShiftInput,
): Promise<OvertonShiftResult> {
  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: {
      id: true,
      strategyId: true,
      overtonHypothesis: true,
      overtonObserved: true,
      strategy: { select: { businessContext: true } },
    },
  });
  if (!campaign) throw new Error(`Campaign ${input.campaignId} not found`);
  if (campaign.strategyId !== input.strategyId) {
    throw new Error(`Campaign ${input.campaignId} not in strategy ${input.strategyId}`);
  }

  const degradationCodes: string[] = [];

  // Phase 23 (Story 3.7) — Manual operator-tagged delta peer mode (FR26).
  // If at least one action of the campaign carries `overtonDeltaManual`, take
  // the latest non-null value as the operator-supplied score. The auditable
  // `MANUAL_OPERATOR_DELTA` code in degradationCodes documents the source.
  const manualActions = await db.campaignAction.findMany({
    where: { campaignId: input.campaignId, overtonDeltaManual: { not: null } },
    select: { overtonDeltaManual: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 1,
  });
  if (manualActions.length > 0 && manualActions[0]!.overtonDeltaManual !== null) {
    degradationCodes.push("MANUAL_OPERATOR_DELTA");
    return {
      campaignId: input.campaignId,
      overtonShiftScore: manualActions[0]!.overtonDeltaManual,
      emergingTokens: [],
      sentimentDelta: null,
      degradationCodes,
    };
  }

  if (!campaign.overtonHypothesis) {
    degradationCodes.push("MISSING_OVERTON_HYPOTHESIS");
  }
  if (!campaign.overtonObserved) {
    degradationCodes.push("MISSING_OVERTON_OBSERVED");
  }
  const sectorSlug = extractSectorSlugFromStrategy(campaign.strategy?.businessContext);
  if (!sectorSlug) {
    degradationCodes.push("MISSING_SECTOR_SLUG");
  }

  if (!campaign.overtonHypothesis || !campaign.overtonObserved || !sectorSlug) {
    // P22-2 : honest insufficient-data branch — overtonShiftScore=null, not 0.
    return {
      campaignId: input.campaignId,
      overtonShiftScore: null,
      emergingTokens: [],
      sentimentDelta: null,
      degradationCodes,
    };
  }

  const { getSectorAxis, computeBrandDeflection } = await import(
    "@/server/services/sector-intelligence"
  );
  const axis = await getSectorAxis(sectorSlug);
  if (!axis || axis.samples === 0) {
    degradationCodes.push("INSUFFICIENT_SECTOR_AXIS");
    return {
      campaignId: input.campaignId,
      overtonShiftScore: null,
      emergingTokens: [],
      sentimentDelta: null,
      degradationCodes,
    };
  }

  const hypothesis = campaign.overtonHypothesis as Record<string, unknown>;
  const observed = campaign.overtonObserved as Record<string, unknown>;

  const brandTags = parseHypothesisTags(hypothesis);
  const deflection = computeBrandDeflection(brandTags, axis);

  // Signed score : positive when brand pulls sector toward its hypothesis,
  // negative when sector resists. Magnitude scaled to [-1, 1] envelope.
  const signedScore = (1 - deflection.alignment) * Math.tanh(deflection.deflectionMagnitude);

  // Sentiment delta — extract from the JSON payload when present, null otherwise.
  const sentimentStart = typeof hypothesis.sentimentDepart === "number" ? hypothesis.sentimentDepart : null;
  const sentimentEnd = typeof observed.sentimentFinal === "number" ? observed.sentimentFinal : null;
  const sentimentDelta = sentimentStart !== null && sentimentEnd !== null ? sentimentEnd - sentimentStart : null;

  // Emerging tokens : observed vocabulary minus hypothesis vocabulary
  // (kept for backward compatibility with Phase 19 consumers — the Jaccard
  // similarity math itself is dropped per ADR-0078, but listing the tokens
  // that appeared is a useful UI affordance and doesn't require an algorithm).
  const hypothesisTokens = extractSectorTokens(hypothesis.sectorTokens);
  const observedTokens = extractSectorTokens(observed.references);
  const hypothesisSet = new Set(hypothesisTokens);
  const emergingTokens = [...new Set(observedTokens)].filter((t) => !hypothesisSet.has(t)).slice(0, 20);

  return {
    campaignId: input.campaignId,
    overtonShiftScore: signedScore,
    emergingTokens,
    sentimentDelta,
    degradationCodes,
  };
}

function extractSectorTokens(payload: unknown): readonly string[] {
  if (typeof payload === "string") return tokenize(payload);
  if (Array.isArray(payload)) {
    return payload
      .filter((t): t is string => typeof t === "string")
      .flatMap((t) => tokenize(t));
  }
  return [];
}

// ─────────────────────────────────────────────────────────────────────────
// Sous-cluster culture.mcpIngest (PARTIAL/MVP)
// ─────────────────────────────────────────────────────────────────────────

interface IngestMcpContextInput {
  readonly strategyId: string;
  readonly operatorId: string;
  readonly campaignId: string;
  readonly source: "slack" | "notion" | "drive" | "github" | "manual";
  readonly sourceId: string;
  readonly content: {
    readonly title?: string;
    readonly body: string;
    readonly author?: string;
    readonly timestamp?: string;
    readonly originalUrl?: string;
  };
}

// Fast-path PII regex pre-screen — hard-reject obvious patterns before incurring LLM cost.
// 4 baseline patterns from Phase 19 ; kept as fail-fast defense-in-depth (NFR6).
const PII_REGEXES = [
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // phone US-style
  /\b[\w.]+@[\w.]+\.\w{2,}\b/, // email
  /\b\d{16}\b/, // credit card raw
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN US
];

/**
 * Phase 23 (ADR-0078, Epic 3 Story 3.5) — PII classifier gate via Glory tool.
 *
 * Two-stage classifier :
 *  1. Fast-path regex pre-screen on 4 patterns (defense-in-depth, sub-millisecond).
 *  2. LLM classifier via `mcp-content-pii-classifier` Glory tool (semantic
 *     detection : postal addresses, government IDs, medical mentions, etc.).
 *
 * **NFR6 invariant — fail-closed.** If the classifier throws, returns an
 * unknown verdict, or fails Zod validation (Phase 21 F-A `executeStructuredLLMCall`
 * wrapper), this function returns `PII_DETECTED_REJECTED` — NEVER silently
 * persists unclassified content. The PII redaction discipline is non-negotiable.
 *
 * **Phase 23 + Phase 25 evolution.** Story 5.3 migrates the Glory tool to
 * `executionType: "HYBRID"` ; this consumer is HYBRID-transparent (it accepts
 * the same `{ verdict, redactedContent, rejectionReason }` output shape from
 * either LLM or manual path).
 */
async function classifyPiiViaGloryTool(
  strategyId: string,
  source: string,
  body: string,
): Promise<{
  verdict: "CLEAN" | "PII_DETECTED_REJECTED" | "PII_REDACTED";
  redactedContent?: string;
  rejectionReason?: string;
}> {
  // Stage 1 : regex pre-screen.
  for (const re of PII_REGEXES) {
    if (re.test(body)) {
      return {
        verdict: "PII_DETECTED_REJECTED",
        rejectionReason:
          "PII détecté par regex baseline pré-screening (NFR6 fail-fast) — pattern matched before LLM classifier invocation",
      };
    }
  }

  // Stage 2 : LLM classifier via Glory tool.
  try {
    const result = await executeTool("mcp-content-pii-classifier", strategyId, {
      content_body: body,
      source_type: source,
    });
    const output = result.output as {
      verdict?: string;
      redactedContent?: string;
      rejectionReason?: string;
    };
    const verdict = output.verdict;
    if (verdict === "CLEAN") {
      return { verdict: "CLEAN" };
    }
    if (verdict === "PII_REDACTED" && typeof output.redactedContent === "string") {
      return {
        verdict: "PII_REDACTED",
        redactedContent: output.redactedContent,
      };
    }
    if (verdict === "PII_DETECTED_REJECTED") {
      return {
        verdict: "PII_DETECTED_REJECTED",
        rejectionReason: output.rejectionReason ?? "Classifier returned PII_DETECTED_REJECTED without reason",
      };
    }
    // Unknown verdict OR PII_REDACTED with no redactedContent → fail-closed.
    return {
      verdict: "PII_DETECTED_REJECTED",
      rejectionReason: `Classifier returned unparseable verdict ${JSON.stringify(verdict)} — fail-closed per NFR6`,
    };
  } catch (err) {
    // Classifier transient failure → fail-closed per NFR6.
    return {
      verdict: "PII_DETECTED_REJECTED",
      rejectionReason: `PII classifier transient failure : ${err instanceof Error ? err.message : String(err)} — fail-closed per NFR6`,
    };
  }
}

/**
 * Ingest MCP context vers `CampaignContextIngest`. Filtre PII pré-stockage via
 * Glory tool `mcp-content-pii-classifier` (Phase 23 Story 3.5).
 *
 * Three-state PII verdict :
 *  - CLEAN                  → persist content as-is
 *  - PII_REDACTED           → persist with body replaced by classifier's redactedContent
 *  - PII_DETECTED_REJECTED  → refuse persistence, return rejection reason
 *
 * Fail-closed on classifier failure (NFR6 invariant).
 *
 * Idempotent via @@unique [campaignId, source, sourceId] : re-ingest = no-op
 * (Prisma upsert pattern).
 */
export async function ingestMcpContextToCampaign(
  input: IngestMcpContextInput,
): Promise<McpContextIngestResult> {
  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, strategyId: true },
  });
  if (!campaign) throw new Error(`Campaign ${input.campaignId} not found`);
  if (campaign.strategyId !== input.strategyId) {
    throw new Error(`Campaign ${input.campaignId} not in strategy ${input.strategyId}`);
  }

  const classification = await classifyPiiViaGloryTool(
    input.strategyId,
    input.source,
    input.content.body,
  );

  if (classification.verdict === "PII_DETECTED_REJECTED") {
    return {
      campaignContextIngestId: "",
      piiVerdict: "PII_DETECTED_REJECTED",
      stored: false,
      rejectionReason:
        classification.rejectionReason ??
        "PII détecté dans le content body — refus stockage. Si faux-positif, retraiter le content via PII redactor avant re-ingest.",
    };
  }

  // Persistable content : either CLEAN (raw body) or PII_REDACTED (replace body with redactedContent).
  const contentToStore =
    classification.verdict === "PII_REDACTED" && classification.redactedContent
      ? { ...input.content, body: classification.redactedContent }
      : input.content;

  // Upsert pattern (idempotent via @@unique constraint).
  const ingest = await db.campaignContextIngest.upsert({
    where: {
      campaignId_source_sourceId: {
        campaignId: input.campaignId,
        source: input.source,
        sourceId: input.sourceId,
      },
    },
    create: {
      campaignId: input.campaignId,
      strategyId: input.strategyId,
      source: input.source,
      sourceId: input.sourceId,
      content: contentToStore as object,
      piiFiltered: true,
      piiVerdict: classification.verdict,
    },
    update: {
      content: contentToStore as object,
      piiFiltered: true,
      piiVerdict: classification.verdict,
    },
    select: { id: true },
  });

  return {
    campaignContextIngestId: ingest.id,
    piiVerdict: classification.verdict,
    stored: true,
    rejectionReason: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Sous-cluster culture.tarsisBridge (PARTIAL/MVP — promotion STUB → MVP via Seshat)
// ─────────────────────────────────────────────────────────────────────────

interface OpenTarsisCaptureForFieldOpInput {
  readonly strategyId: string;
  readonly operatorId: string;
  readonly campaignId: string;
  readonly campaignFieldOpId: string;
}

interface OpenTarsisCaptureForFieldOpResult {
  readonly campaignFieldOpId: string;
  readonly tarsisCaptureSessionId: string;
  readonly capturedAt: string;
  readonly degradationCodes: readonly string[];
}

/**
 * Ouvre une TarsisCaptureSession liée à une CampaignFieldOp et update le pointer
 * `CampaignFieldOp.tarsisCaptureSessionId`.
 *
 * Promotion STUB → MVP via API Seshat Tarsis `openCampaignCaptureSession`.
 * Idempotent : re-call sur une fieldOp avec session ACTIVE retourne l'existante.
 */
export async function openTarsisCaptureForFieldOp(
  input: OpenTarsisCaptureForFieldOpInput,
): Promise<OpenTarsisCaptureForFieldOpResult> {
  const fieldOp = await db.campaignFieldOp.findUnique({
    where: { id: input.campaignFieldOpId },
    select: {
      id: true,
      campaignId: true,
      tarsisCaptureSessionId: true,
      campaign: { select: { strategyId: true } },
    },
  });
  if (!fieldOp) throw new Error(`CampaignFieldOp ${input.campaignFieldOpId} not found`);
  if (fieldOp.campaignId !== input.campaignId) {
    throw new Error(`FieldOp ${fieldOp.id} not in campaign ${input.campaignId}`);
  }
  if (fieldOp.campaign.strategyId !== input.strategyId) {
    throw new Error(`FieldOp ${fieldOp.id} not in strategy ${input.strategyId}`);
  }

  const { openCampaignCaptureSession } = await import("@/server/services/seshat/tarsis");
  const session = await openCampaignCaptureSession({
    strategyId: input.strategyId,
    campaignId: input.campaignId,
    campaignFieldOpId: input.campaignFieldOpId,
  });

  // Update pointer si nécessaire (idempotent — pas de write si déjà set sur la même session).
  if (fieldOp.tarsisCaptureSessionId !== session.sessionId) {
    await db.campaignFieldOp.update({
      where: { id: input.campaignFieldOpId },
      data: { tarsisCaptureSessionId: session.sessionId },
    });
  }

  return {
    campaignFieldOpId: input.campaignFieldOpId,
    tarsisCaptureSessionId: session.sessionId,
    capturedAt: session.capturedAt,
    degradationCodes: [],
  };
}

interface CloseTarsisCaptureForFieldOpInput {
  readonly strategyId: string;
  readonly operatorId: string;
  readonly campaignFieldOpId: string;
  readonly finalSignalsCount?: number;
  readonly finalPayload?: Record<string, unknown>;
}

interface CloseTarsisCaptureForFieldOpResult {
  readonly campaignFieldOpId: string;
  readonly tarsisCaptureSessionId: string | null;
  readonly closedAt: string | null;
  readonly signalsCount: number;
  readonly degradationCodes: readonly string[];
}

/**
 * Ferme la TarsisCaptureSession associée à une CampaignFieldOp.
 *
 * MVP : signal aggregation laissée à PRODUCTION (signal-collector / weak-signal-analyzer
 * Seshat à câbler). Permet de marquer la session CLOSED pour audit.
 */
export async function closeTarsisCaptureForFieldOp(
  input: CloseTarsisCaptureForFieldOpInput,
): Promise<CloseTarsisCaptureForFieldOpResult> {
  const fieldOp = await db.campaignFieldOp.findUnique({
    where: { id: input.campaignFieldOpId },
    select: {
      id: true,
      tarsisCaptureSessionId: true,
      campaign: { select: { strategyId: true } },
    },
  });
  if (!fieldOp) throw new Error(`CampaignFieldOp ${input.campaignFieldOpId} not found`);
  if (fieldOp.campaign.strategyId !== input.strategyId) {
    throw new Error(`FieldOp ${fieldOp.id} not in strategy ${input.strategyId}`);
  }

  if (!fieldOp.tarsisCaptureSessionId) {
    return {
      campaignFieldOpId: fieldOp.id,
      tarsisCaptureSessionId: null,
      closedAt: null,
      signalsCount: 0,
      degradationCodes: ["NO_SESSION_OPEN"],
    };
  }

  const { closeCampaignCaptureSession } = await import("@/server/services/seshat/tarsis");
  const result = await closeCampaignCaptureSession({
    sessionId: fieldOp.tarsisCaptureSessionId,
    finalSignalsCount: input.finalSignalsCount,
    finalPayload: input.finalPayload,
  });

  return {
    campaignFieldOpId: fieldOp.id,
    tarsisCaptureSessionId: result.sessionId,
    closedAt: result.closedAt,
    signalsCount: result.signalsCount,
    degradationCodes: ["MVP_NO_SIGNAL_COLLECTOR_WIRED"],
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Phase 23 (ADR-0078, Epic 3 Story 3.4) — culture.tarsisBridge via connector
// ─────────────────────────────────────────────────────────────────────────

export interface BridgeTarsisToSectorInput {
  readonly strategyId: string;
  readonly operatorId: string;
  /** The campaign whose sector axis we're refreshing. */
  readonly campaignId: string;
}

export interface BridgeTarsisToSectorResult {
  readonly campaignId: string;
  readonly sectorSlug: string | null;
  /** Phase 23 connector state surfaced for operator-observable diagnostics. */
  readonly connectorState: "LIVE" | "DEFERRED_AWAITING_CREDENTIALS" | "DEGRADED" | "SKIPPED";
  readonly bridgedAt: string;
  readonly degradationCodes: readonly string[];
}

/**
 * Phase 23 Epic 3 Story 3.4 — pulls Tarsis signal via the
 * `services/seshat/tarsis/connector` façade and feeds it to
 * `sector-intelligence.refreshSectorOvertonFromConnector`. **This is the only
 * point in the campaign-tracker service that imports the Tarsis connector
 * directly** ; sector-intelligence/ stays pure data-in/data-out per
 * architecture D2 + one-way import discipline.
 *
 * State handling :
 *   - Sector slug missing on Strategy → SKIPPED + MISSING_SECTOR_SLUG.
 *   - Tarsis connector DEFERRED → SKIPPED with state propagated, honest UI
 *     degradation downstream (sub-clusters see no fresh sector axis).
 *   - Tarsis connector DEGRADED → SKIPPED with reason in degradationCodes.
 *   - Tarsis connector LIVE → sector-intelligence updates the axis,
 *     `connectorState: "LIVE"` returned.
 *
 * Idempotent : re-call on the same sector within the freshness window is a
 * cheap re-fetch + DB upsert (sector-intelligence handles uniqueness).
 */
export async function bridgeTarsisToSectorIntelligence(
  input: BridgeTarsisToSectorInput,
): Promise<BridgeTarsisToSectorResult> {
  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: {
      id: true,
      strategyId: true,
      strategy: { select: { businessContext: true } },
    },
  });
  if (!campaign) throw new Error(`Campaign ${input.campaignId} not found`);
  if (campaign.strategyId !== input.strategyId) {
    throw new Error(`Campaign ${input.campaignId} not in strategy ${input.strategyId}`);
  }

  const bridgedAt = new Date().toISOString();
  const sectorSlug = extractSectorSlugFromStrategy(campaign.strategy?.businessContext);
  if (!sectorSlug) {
    return {
      campaignId: input.campaignId,
      sectorSlug: null,
      connectorState: "SKIPPED",
      bridgedAt,
      degradationCodes: ["MISSING_SECTOR_SLUG"],
    };
  }

  // The connector module is imported dynamically here because Phase 23
  // campaign-tracker → seshat/tarsis is a one-way dependency materialized at
  // exactly this seam (architecture §Architectural Boundaries).
  const { fetchSectorSignal } = await import("@/server/services/seshat/tarsis/connector");
  const signals = await fetchSectorSignal(input.operatorId, sectorSlug);

  // Inject the result into sector-intelligence — it handles the three
  // ConnectorResult states exhaustively per P22-1 and returns a discriminated
  // REFRESHED / SKIPPED outcome.
  const { refreshSectorOvertonFromConnector } = await import(
    "@/server/services/sector-intelligence"
  );
  const refresh = await refreshSectorOvertonFromConnector({ slug: sectorSlug, signals });

  if (refresh.state === "REFRESHED") {
    return {
      campaignId: input.campaignId,
      sectorSlug,
      connectorState: "LIVE",
      bridgedAt,
      degradationCodes: [],
    };
  }
  // SKIPPED : surface the upstream connector state for the operator.
  return {
    campaignId: input.campaignId,
    sectorSlug,
    connectorState:
      signals.state === "DEFERRED_AWAITING_CREDENTIALS"
        ? "DEFERRED_AWAITING_CREDENTIALS"
        : signals.state === "DEGRADED"
          ? "DEGRADED"
          : "SKIPPED",
    bridgedAt,
    degradationCodes: [refresh.reason],
  };
}
