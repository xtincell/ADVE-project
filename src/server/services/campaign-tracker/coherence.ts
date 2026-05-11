/**
 * Campaign Tracker — Cohérence narrative (Phase 19, ADR-0052 Cluster B).
 *
 * Layer 4 — orchestrate Layer 2/3.
 *
 * Sous-clusters Vague 1 :
 *   - coherence.bigIdeaCoherence — score 0..1 d'une CampaignAction vs BigIdea + Manifesto
 *   - coherence.culturalDebt     — agrège bigIdeaCoherenceScore + lexical drift sur claims
 *
 * MVP heuristic : Jaccard similarity sur tokens normalisés. PRODUCTION =
 * Glory tool LLM `big-idea-coherence-checker` (sera créé ADR enfant).
 *
 * Cf. docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md
 */

import { db } from "@/lib/db";
import {
  type BigIdeaCoherenceResult,
  type CulturalDebtResult,
  ManipulationDriftError,
  MissingSnapshotError,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────
// Pure helpers (testables sans DB)
// ─────────────────────────────────────────────────────────────────────────

const STOPWORDS_FR = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "à", "au", "aux",
  "ce", "ces", "cet", "cette", "que", "qui", "quoi", "ne", "pas", "plus", "très",
  "pour", "par", "avec", "sans", "sur", "sous", "en", "dans", "se", "son", "sa", "ses",
  "il", "elle", "ils", "elles", "on", "nous", "vous", "je", "tu", "me", "te", "lui",
  "est", "sont", "été", "être", "avoir", "fait", "faire", "dire", "dit", "tout",
]);

/**
 * Tokenise un texte en lowercase + supprime stopwords + supprime tokens <2 chars.
 * Suffisant pour MVP heuristic — PRODUCTION utilisera embeddings.
 */
export function tokenize(text: string): readonly string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 2 && !STOPWORDS_FR.has(t));
}

/**
 * Jaccard similarity entre 2 sets de tokens : |A ∩ B| / |A ∪ B|.
 * Retourne 0..1 (0 = no intersection, 1 = identique).
 */
export function jaccardSimilarity(tokensA: readonly string[], tokensB: readonly string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const t of setA) if (setB.has(t)) intersection += 1;
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export function intersectionSize(tokensA: readonly string[], tokensB: readonly string[]): number {
  const setB = new Set(tokensB);
  let n = 0;
  for (const t of new Set(tokensA)) if (setB.has(t)) n += 1;
  return n;
}

/**
 * Compte combien de "beliefs" du Manifesto sont touchés par les tokens
 * d'une action (au moins 1 mot-clé fort partagé).
 */
export function manifestoBeliefsHit(
  beliefs: readonly string[],
  actionTokens: readonly string[],
): number {
  const actionSet = new Set(actionTokens);
  let hit = 0;
  for (const belief of beliefs) {
    const beliefTokens = tokenize(belief);
    if (beliefTokens.some((t) => actionSet.has(t))) hit += 1;
  }
  return hit;
}

// ─────────────────────────────────────────────────────────────────────────
// Sous-cluster bigIdeaCoherence
// ─────────────────────────────────────────────────────────────────────────

interface CheckBigIdeaCoherenceInput {
  readonly strategyId: string;
  readonly operatorId: string;
  readonly campaignActionId: string;
  readonly forceMethod?: "lexical" | "llm";
}

/**
 * Score la cohérence d'une CampaignAction vs les snapshots immutables BigIdea
 * + Manifesto figés sur la Campaign parente.
 *
 * MVP : Jaccard tokens. PRODUCTION : LLM eval Glory tool.
 *
 * Persiste CampaignAction.bigIdeaCoherenceScore.
 *
 * Détecte aussi `manipulationDrift` : true si CampaignAction.manipulationModeApplied
 * dévie de Strategy.manipulationMix.allowed[] snapshot. Throw ManipulationDriftError
 * si Strategy.strictModeGates inclut "MANIPULATION_COHERENCE_PER_ACTION".
 */
export async function checkBigIdeaCoherence(
  input: CheckBigIdeaCoherenceInput,
): Promise<BigIdeaCoherenceResult> {
  const action = await db.campaignAction.findUnique({
    where: { id: input.campaignActionId },
    select: {
      id: true,
      campaignId: true,
      name: true,
      specs: true,
      manipulationModeApplied: true,
    },
  });
  if (!action) throw new Error(`CampaignAction ${input.campaignActionId} not found`);

  const campaign = await db.campaign.findUnique({
    where: { id: action.campaignId },
    select: {
      id: true,
      strategyId: true,
      bigIdeaSnapshotBrandAssetId: true,
      manifestoSnapshotBrandAssetId: true,
      bigIdeaSnapshotContent: true,
      manifestoSnapshotContent: true,
      manipulationMixSnapshot: true,
    },
  });
  if (!campaign) throw new Error(`Campaign ${action.campaignId} not found`);
  if (campaign.strategyId !== input.strategyId) {
    throw new Error(`Action ${action.id} not in strategy ${input.strategyId}`);
  }

  if (!campaign.bigIdeaSnapshotBrandAssetId) {
    throw new MissingSnapshotError(campaign.id, "bigIdea");
  }

  // Charger les contenus snapshots — préférer le snapshot figé (immutable post-LIVE) ;
  // fallback vers BrandAsset.content live si snapshot vide.
  const bigIdeaText = extractTextFromContent(campaign.bigIdeaSnapshotContent)
    || (await loadBrandAssetText(campaign.bigIdeaSnapshotBrandAssetId));
  const manifestoText = extractTextFromContent(campaign.manifestoSnapshotContent)
    || (campaign.manifestoSnapshotBrandAssetId
      ? await loadBrandAssetText(campaign.manifestoSnapshotBrandAssetId)
      : "");

  const actionText = composeActionText(action);

  // ADR-0052-B §1 — Strategy.evaluatorMode bascule lexical → llm.
  // forceMethod input override (test/debug). Default = lit Strategy.evaluatorMode.
  const method = await resolveMethod(campaign.strategyId, input.forceMethod);

  const manipulationDrift = detectManipulationDrift(
    action.manipulationModeApplied,
    campaign.manipulationMixSnapshot,
  );

  let score: number;
  let diagnostic: BigIdeaCoherenceResult["diagnostic"];
  let rationale: string | null = null;
  let redFlags: readonly string[] = [];
  let alignmentSignals: readonly string[] = [];

  if (method === "llm") {
    // PRODUCTION : Glory tool LLM dispatch.
    const llmResult = await executeBigIdeaCoherenceLLM(
      campaign.strategyId,
      bigIdeaText,
      manifestoText,
      actionText,
      action.manipulationModeApplied,
      campaign.manipulationMixSnapshot,
    );
    score = llmResult.score;
    rationale = llmResult.rationale;
    redFlags = llmResult.redFlags;
    alignmentSignals = llmResult.alignmentSignals;
    diagnostic = null; // diagnostic Jaccard non pertinent en mode LLM
  } else {
    // MVP : Jaccard lexical similarity.
    const bigIdeaTokens = tokenize(bigIdeaText);
    const actionTokens = tokenize(actionText);
    score = jaccardSimilarity(bigIdeaTokens, actionTokens);
    const manifestoBeliefs = extractManifestoBeliefs(manifestoText);
    const beliefsHit = manifestoBeliefsHit(manifestoBeliefs, actionTokens);
    diagnostic = {
      bigIdeaTokens: bigIdeaTokens.length,
      actionTokens: actionTokens.length,
      intersectionTokens: intersectionSize(bigIdeaTokens, actionTokens),
      manifestoBeliefsHit: beliefsHit,
    };
  }

  // Persist score (idempotent — re-run met à jour la valeur).
  await db.campaignAction.update({
    where: { id: action.id },
    data: { bigIdeaCoherenceScore: score },
  });

  // Strict-mode gate : refuse drift si activé.
  if (manipulationDrift) {
    const mix = campaign.manipulationMixSnapshot as unknown as { allowed?: readonly string[] } | null;
    const allowed = mix?.allowed ?? [];
    const strict = await isStrictModeGateEnabled(campaign.strategyId, "MANIPULATION_COHERENCE_PER_ACTION");
    if (strict) {
      throw new ManipulationDriftError(action.id, action.manipulationModeApplied ?? "unknown", allowed);
    }
  }

  return {
    campaignActionId: action.id,
    score,
    method,
    diagnostic,
    manipulationDrift,
    rationale,
    redFlags,
    alignmentSignals,
  };
}

async function resolveMethod(
  strategyId: string,
  forceMethod: "lexical" | "llm" | undefined,
): Promise<"lexical" | "llm"> {
  if (forceMethod) return forceMethod;
  try {
    const s = await db.strategy.findUnique({
      where: { id: strategyId },
      select: { evaluatorMode: true },
    });
    return s?.evaluatorMode === "llm" ? "llm" : "lexical";
  } catch {
    return "lexical";
  }
}

interface LLMCoherenceResult {
  readonly score: number;
  readonly rationale: string;
  readonly redFlags: readonly string[];
  readonly alignmentSignals: readonly string[];
}

/**
 * Glory tool LLM dispatch — `big-idea-coherence-checker` (PHASE19_TOOLS, ADR-0052-B).
 * Pattern aligné `executeTool` (engine.ts) qui résout le slug dans EXTENDED_GLORY_TOOLS,
 * exécute le LLM, et retourne le JSON parsé.
 */
async function executeBigIdeaCoherenceLLM(
  strategyId: string,
  bigIdeaText: string,
  manifestoText: string,
  actionText: string,
  manipulationModeApplied: string | null,
  manipulationMixSnapshot: unknown,
): Promise<LLMCoherenceResult> {
  try {
    const { executeTool } = await import("@/server/services/artemis/tools/engine");
    const allowed = extractAllowedModes(manipulationMixSnapshot);
    const { output } = await executeTool("big-idea-coherence-checker", strategyId, {
      big_idea_text: bigIdeaText,
      manifesto_text: manifestoText,
      action_text: actionText,
      manipulation_mode_applied: manipulationModeApplied ?? "unknown",
      manipulation_mix_allowed: allowed.join(", "),
    });
    return parseLLMCoherenceOutput(output);
  } catch (err) {
    // Fail-safe : en cas d'erreur LLM, on retombe sur Jaccard lexical (best effort).
    const tokens = jaccardSimilarity(tokenize(bigIdeaText), tokenize(actionText));
    return {
      score: tokens,
      rationale: `LLM eval failed (${err instanceof Error ? err.message : "unknown"}). Fallback Jaccard lexical.`,
      redFlags: ["LLM_FALLBACK"],
      alignmentSignals: [],
    };
  }
}

function extractAllowedModes(snapshot: unknown): readonly string[] {
  if (!snapshot || typeof snapshot !== "object") return [];
  const mix = snapshot as Record<string, unknown>;
  return Array.isArray(mix.allowed) ? (mix.allowed as string[]) : [];
}

function parseLLMCoherenceOutput(output: Record<string, unknown>): LLMCoherenceResult {
  const score = typeof output.score === "number" ? Math.max(0, Math.min(1, output.score)) : 0;
  const rationale = typeof output.rationale === "string" ? output.rationale : "";
  const redFlags = Array.isArray(output.redFlags)
    ? output.redFlags.filter((s): s is string => typeof s === "string")
    : [];
  const alignmentSignals = Array.isArray(output.alignmentSignals)
    ? output.alignmentSignals.filter((s): s is string => typeof s === "string")
    : [];
  return { score, rationale, redFlags, alignmentSignals };
}

async function loadBrandAssetText(brandAssetId: string): Promise<string> {
  try {
    const ba = await db.brandAsset.findUnique({
      where: { id: brandAssetId },
      select: { content: true },
    });
    if (!ba) return "";
    return extractTextFromContent(ba.content);
  } catch {
    return "";
  }
}

/**
 * Extract text from a BrandAsset.content Json field.
 * Heuristic : flatten to a single string by JSON.stringify if not a primitive.
 * MVP suffisant pour Jaccard tokens — PRODUCTION utilisera schema-aware extractor.
 */
function extractTextFromContent(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (typeof content === "object") return JSON.stringify(content);
  return String(content);
}

function composeActionText(action: { name: string; specs: unknown }): string {
  const parts: string[] = [action.name];
  if (action.specs && typeof action.specs === "object") {
    const specs = action.specs as Record<string, unknown>;
    for (const key of ["headline", "body", "claim", "callToAction", "tagline", "description"]) {
      const v = specs[key];
      if (typeof v === "string") parts.push(v);
    }
  }
  return parts.join(" ");
}

function extractManifestoBeliefs(manifestoText: string): readonly string[] {
  if (!manifestoText) return [];
  // Heuristic MVP : split par lignes/sentences, garde celles >20 chars.
  return manifestoText
    .split(/[.\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 20)
    .slice(0, 12);
}

function detectManipulationDrift(
  applied: string | null,
  mixSnapshot: unknown,
): boolean {
  if (!applied) return false;
  if (!mixSnapshot || typeof mixSnapshot !== "object") return false;
  const mix = mixSnapshot as Record<string, unknown>;
  const allowed = Array.isArray(mix.allowed) ? mix.allowed : mix.primary ? [mix.primary] : [];
  if (allowed.length === 0) return false;
  return !allowed.includes(applied);
}

async function isStrictModeGateEnabled(strategyId: string, gateName: string): Promise<boolean> {
  try {
    const strategy = await db.strategy.findUnique({
      where: { id: strategyId },
      select: { strictModeGates: true },
    });
    const gates = strategy?.strictModeGates as unknown;
    if (Array.isArray(gates)) return gates.includes(gateName);
    return false;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Sous-cluster culturalDebt
// ─────────────────────────────────────────────────────────────────────────

interface RecomputeCulturalDebtInput {
  readonly strategyId: string;
  readonly operatorId: string;
  readonly campaignId: string;
}

/**
 * Mesure le gap entre Manifesto.beliefs[] et CampaignAction claims exécutés.
 *
 * MVP formula :
 *   culturalDebtScore = 1 - mean(bigIdeaCoherenceScore non-null sur CampaignAction)
 *
 * 0 = parfait alignement, 1 = totalement détourné. Si <3 actions sampled,
 * retourne degradationCode INSUFFICIENT_ACTIONS_SAMPLED.
 *
 * PRODUCTION : pondération par budget action + lexical drift Manifesto sur
 * fenêtre temporelle.
 */
export async function recomputeCulturalDebt(
  input: RecomputeCulturalDebtInput,
): Promise<CulturalDebtResult> {
  // Phase 18 (ADR-0059 BrandNode + ADR-0052 Campaign tracker) — le model
  // a été renommé de `manifestoSnapshotAssetVersionId` à
  // `manifestoSnapshotBrandAssetId` pour s'aligner sur BrandAsset (Phase 10
  // BrandVault). Cette référence avait survécu, faisant échouer
  // recomputeCulturalDebt avec PrismaClientValidationError.
  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: {
      id: true,
      strategyId: true,
      manifestoSnapshotBrandAssetId: true,
    },
  });
  if (!campaign) throw new Error(`Campaign ${input.campaignId} not found`);
  if (campaign.strategyId !== input.strategyId) {
    throw new Error(`Campaign ${input.campaignId} not in strategy ${input.strategyId}`);
  }

  const degradationCodes: string[] = [];

  if (!campaign.manifestoSnapshotBrandAssetId) {
    degradationCodes.push("MISSING_MANIFESTO_SNAPSHOT");
  }

  const actions = await db.campaignAction.findMany({
    where: {
      campaignId: campaign.id,
      bigIdeaCoherenceScore: { not: null },
    },
    select: { id: true, bigIdeaCoherenceScore: true },
  });

  const actionsSampled = actions.length;
  if (actionsSampled < 3) {
    degradationCodes.push("INSUFFICIENT_ACTIONS_SAMPLED");
  }

  const meanCoherenceScore =
    actionsSampled > 0
      ? actions.reduce((acc, a) => acc + (Number(a.bigIdeaCoherenceScore) || 0), 0) / actionsSampled
      : null;

  const culturalDebtScore = meanCoherenceScore !== null ? 1 - meanCoherenceScore : 1;

  return {
    campaignId: campaign.id,
    culturalDebtScore: Math.max(0, Math.min(1, culturalDebtScore)),
    meanCoherenceScore,
    actionsSampled,
    degradationCodes,
  };
}
