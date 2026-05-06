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
 * MVP heuristic — vrai algo Overton viendra via ADR enfant `0052-D-overton-algo.md`.
 *
 * Cf. docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md
 */

import { db } from "@/lib/db";
import { tokenize, jaccardSimilarity } from "./coherence";
import {
  type OvertonReadinessResult,
  type OvertonShiftResult,
  type McpContextIngestResult,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────
// Sous-cluster culture.overtonReadiness (PARTIAL/MVP)
// ─────────────────────────────────────────────────────────────────────────

interface EvaluateOvertonReadinessInput {
  readonly strategyId: string;
  readonly operatorId: string;
  readonly campaignId: string;
}

/**
 * MVP heuristic : sentiment Tarsis 30j + saisonnalité sectorielle.
 *
 * Décision rule MVP :
 *   - Si Campaign.overtonHypothesis absente → degradationCode `MISSING_OVERTON_HYPOTHESIS`,
 *     readiness=READY par défaut (non-bloquant).
 *   - Si Tarsis history < 7 entries → degradationCode `INSUFFICIENT_TARSIS_HISTORY`,
 *     readiness=READY par défaut (non-bloquant).
 *   - Sinon : compute proximityScore = compatibilité hypothèse vs sentiment courant.
 *     readiness = TOO_EARLY si <0.3, READY si 0.3-0.7, TOO_LATE si >0.7 (saturé).
 */
export async function evaluateOvertonReadiness(
  input: EvaluateOvertonReadinessInput,
): Promise<OvertonReadinessResult> {
  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, strategyId: true, overtonHypothesis: true },
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
      proximityScore: 0,
      degradationCodes,
    };
  }

  // MVP : pas d'accès Tarsis monitoring (sub-component Seshat à câbler Vague 3).
  // On retourne PARTIAL avec proximityScore=0.5 (médian) + degradationCode.
  degradationCodes.push("INSUFFICIENT_TARSIS_HISTORY");

  return {
    strategyId: input.strategyId,
    campaignId: input.campaignId,
    readiness: "READY",
    reasoning:
      "MVP heuristic — Tarsis monitoring sub-component pas encore câblé (Vague 3). " +
      "Retour conservateur READY pour ne pas bloquer go-live. Promotion `MVP → PRODUCTION` " +
      "via ADR enfant 0052-D-overton-algo.md.",
    proximityScore: 0.5,
    degradationCodes,
  };
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
 * MVP : compare overtonHypothesis (figée pré-LIVE) vs overtonObserved (snapshot
 * post-POST_CAMPAIGN). Calcule vocabulary delta via Jaccard tokens.
 *
 * PRODUCTION (ADR enfant) ajoutera : embeddings sectoriels + sentiment longitudinal
 * + références médias dénombrement.
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
    },
  });
  if (!campaign) throw new Error(`Campaign ${input.campaignId} not found`);
  if (campaign.strategyId !== input.strategyId) {
    throw new Error(`Campaign ${input.campaignId} not in strategy ${input.strategyId}`);
  }

  const degradationCodes: string[] = [];

  if (!campaign.overtonHypothesis) {
    degradationCodes.push("MISSING_OVERTON_HYPOTHESIS");
  }
  if (!campaign.overtonObserved) {
    degradationCodes.push("MISSING_OVERTON_OBSERVED");
  }

  // Si data manquante, retour neutre.
  if (!campaign.overtonHypothesis || !campaign.overtonObserved) {
    return {
      campaignId: input.campaignId,
      overtonShiftScore: 0,
      emergingTokens: [],
      sentimentDelta: null,
      degradationCodes,
    };
  }

  const hypothesis = campaign.overtonHypothesis as Record<string, unknown>;
  const observed = campaign.overtonObserved as Record<string, unknown>;

  const hypothesisTokens = extractSectorTokens(hypothesis.sectorTokens);
  const observedTokens = extractSectorTokens(observed.references);

  // MVP : Jaccard sim entre hypothèse vocab et observed vocab.
  const sim = jaccardSimilarity(hypothesisTokens, observedTokens);

  // Sentiment delta — si présent dans observed, sinon null.
  const sentimentStart = typeof hypothesis.sentimentDepart === "number" ? hypothesis.sentimentDepart : null;
  const sentimentEnd = typeof observed.sentimentFinal === "number" ? observed.sentimentFinal : null;
  const sentimentDelta = sentimentStart !== null && sentimentEnd !== null ? sentimentEnd - sentimentStart : null;

  // emergingTokens = vocabulaire observé qui n'était pas dans hypothèse.
  const hypothesisSet = new Set(hypothesisTokens);
  const emergingTokens = [...new Set(observedTokens)].filter((t) => !hypothesisSet.has(t)).slice(0, 20);

  // overtonShiftScore : signed score combiné. Positif = on a déplacé l'axe.
  const overtonShiftScore = (sentimentDelta ?? 0) * 0.6 + sim * 0.4;

  return {
    campaignId: input.campaignId,
    overtonShiftScore,
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

// MVP PII regexes — heuristic baseline. PRODUCTION = LLM classifier (ADR enfant).
const PII_REGEXES = [
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // phone US-style
  /\b[\w.]+@[\w.]+\.\w{2,}\b/, // email
  /\b\d{16}\b/, // credit card raw
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN US
];

/**
 * Ingest MCP context vers `CampaignContextIngest`. Filtre PII pré-stockage.
 *
 * MVP : 4 regexes baseline. Si match → reject avec piiVerdict=PII_DETECTED_REJECTED.
 * PRODUCTION : LLM classifier + ROC analysis (ADR enfant).
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

  const piiVerdict = classifyPii(input.content.body);

  if (piiVerdict === "PII_DETECTED_REJECTED") {
    return {
      campaignContextIngestId: "",
      piiVerdict,
      stored: false,
      rejectionReason: "PII détecté dans le content body — refus stockage (MVP regex baseline). " +
        "Si faux-positif, retraiter le content via PII redactor avant re-ingest.",
    };
  }

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
      content: input.content as object,
      piiFiltered: true,
      piiVerdict,
    },
    update: {
      content: input.content as object,
      piiFiltered: true,
      piiVerdict,
    },
    select: { id: true },
  });

  return {
    campaignContextIngestId: ingest.id,
    piiVerdict,
    stored: true,
    rejectionReason: null,
  };
}

function classifyPii(body: string): "CLEAN" | "PII_DETECTED_REJECTED" | "PII_REDACTED" {
  for (const re of PII_REGEXES) {
    if (re.test(body)) return "PII_DETECTED_REJECTED";
  }
  return "CLEAN";
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
