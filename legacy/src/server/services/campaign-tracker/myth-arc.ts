/**
 * Campaign Tracker — Myth arc cohesion (Phase 19, ADR-0052 Cluster B).
 *
 * Layer 4 — orchestrate Layer 2/3.
 *
 * Sous-cluster myth-arc : cohérence narrative chronologique inter-campagne
 * pour une Strategy. Score similarity entre BigIdea snapshots N et N-1.
 *
 * MVP : Jaccard tokens sur BigIdea snapshot content (BrandAsset.content figé).
 * PRODUCTION : embeddings.
 *
 * Cf. docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md
 */

import { db } from "@/lib/db";
import { jaccardSimilarity, tokenize } from "./coherence";
import {
  type MythArcCohesionResult,
  type MythArcCohesionPair,
} from "./types";

interface EvaluateMythArcCohesionInput {
  readonly strategyId: string;
  readonly operatorId: string;
  readonly fromDate?: Date;
  readonly toDate?: Date;
}

const CONTINUITY_THRESHOLD = 0.18; // Jaccard ≥ 0.18 = chapitre N développe N-1 (heuristic MVP)

/**
 * Évalue la cohésion narrative entre les campagnes consécutives d'une Strategy.
 *
 * Retourne :
 *   - pairs : array de paires (N, N-1) avec similarity + continuityFlag
 *   - globalContinuityScore : moyenne des similarities (null si <2 campagnes)
 *   - degradationCodes : si manque history ou snapshots
 */
export async function evaluateMythArcCohesion(
  input: EvaluateMythArcCohesionInput,
): Promise<MythArcCohesionResult> {
  const where: { strategyId: string; startDate?: { gte?: Date; lte?: Date } } = {
    strategyId: input.strategyId,
  };
  if (input.fromDate || input.toDate) {
    where.startDate = {};
    if (input.fromDate) where.startDate.gte = input.fromDate;
    if (input.toDate) where.startDate.lte = input.toDate;
  }

  const campaigns = await db.campaign.findMany({
    where,
    orderBy: { startDate: "asc" as const },
    select: {
      id: true,
      startDate: true,
      bigIdeaSnapshotBrandAssetId: true,
      bigIdeaSnapshotContent: true,
    },
  });

  const degradationCodes: string[] = [];

  if (campaigns.length < 2) {
    degradationCodes.push("INSUFFICIENT_CAMPAIGN_HISTORY");
    return {
      strategyId: input.strategyId,
      pairs: [],
      globalContinuityScore: null,
      degradationCodes,
    };
  }

  // Strict: snapshot manquant → flag degradation. On utilise quand même le
  // BrandAsset.content live en fallback pour ne pas perdre de signal.
  const missingSnapshots = campaigns.filter((c) => !c.bigIdeaSnapshotBrandAssetId).length;
  if (missingSnapshots > 0) {
    degradationCodes.push("MISSING_BIG_IDEA_SNAPSHOT");
  }

  const tokensByCampaignId = new Map<string, readonly string[]>();
  const textByCampaignId = new Map<string, string>();
  for (const c of campaigns) {
    const text = await resolveCampaignBigIdeaText(c);
    tokensByCampaignId.set(c.id, tokenize(text));
    textByCampaignId.set(c.id, text);
  }

  // ADR-0052-B §2 — bascule lexical Jaccard → LLM via Strategy.evaluatorMode.
  let evaluatorMode: "lexical" | "llm" = "lexical";
  try {
    const s = await db.strategy.findUnique({
      where: { id: input.strategyId },
      select: { evaluatorMode: true },
    });
    if (s?.evaluatorMode === "llm") evaluatorMode = "llm";
  } catch {
    // Fallback lexical.
  }

  const pairs: MythArcCohesionPair[] = [];
  for (let i = 1; i < campaigns.length; i++) {
    const cN = campaigns[i];
    const cPrior = campaigns[i - 1];
    if (!cN || !cPrior) continue;

    let similarity: number;
    if (evaluatorMode === "llm") {
      similarity = await evaluatePairLLM(
        input.strategyId,
        textByCampaignId.get(cN.id) ?? "",
        textByCampaignId.get(cPrior.id) ?? "",
      );
    } else {
      const tokensN = tokensByCampaignId.get(cN.id) ?? [];
      const tokensPrior = tokensByCampaignId.get(cPrior.id) ?? [];
      similarity = jaccardSimilarity(tokensN, tokensPrior);
    }

    pairs.push({
      campaignNId: cN.id,
      campaignPriorId: cPrior.id,
      similarity,
      continuityFlag: similarity >= CONTINUITY_THRESHOLD,
    });
  }

  const validPairs = pairs.filter((p) => !Number.isNaN(p.similarity));
  const globalContinuityScore =
    validPairs.length > 0
      ? validPairs.reduce((acc, p) => acc + p.similarity, 0) / validPairs.length
      : null;

  return {
    strategyId: input.strategyId,
    pairs,
    globalContinuityScore,
    degradationCodes,
  };
}

/**
 * Glory tool LLM dispatch — `myth-arc-cohesion-evaluator` (PHASE19_TOOLS, ADR-0052-B §2).
 * Évalue similarity entre 2 chapitres consécutifs via LLM eval (vs Jaccard MVP).
 */
async function evaluatePairLLM(
  strategyId: string,
  chapterNText: string,
  chapterPriorText: string,
): Promise<number> {
  try {
    const { executeTool } = await import("@/server/services/artemis/tools/engine");
    const { output } = await executeTool("myth-arc-cohesion-evaluator", strategyId, {
      chapter_n_big_idea: chapterNText,
      chapter_n_minus_1_big_idea: chapterPriorText,
      manifesto_anchor: "", // pillarBindings dans registry pull a.noyauIdentitaire automatiquement
    });
    const sim = typeof output.similarity === "number" ? output.similarity : 0;
    return Math.max(0, Math.min(1, sim));
  } catch {
    // Fail-safe : retombe sur Jaccard si LLM échoue.
    return jaccardSimilarity(tokenize(chapterNText), tokenize(chapterPriorText));
  }
}

async function resolveCampaignBigIdeaText(c: {
  bigIdeaSnapshotBrandAssetId: string | null;
  bigIdeaSnapshotContent: unknown;
}): Promise<string> {
  // Préférer snapshot immutable. Fallback sur BrandAsset.content live.
  if (c.bigIdeaSnapshotContent) {
    return typeof c.bigIdeaSnapshotContent === "string"
      ? c.bigIdeaSnapshotContent
      : JSON.stringify(c.bigIdeaSnapshotContent);
  }
  if (!c.bigIdeaSnapshotBrandAssetId) return "";
  try {
    const ba = await db.brandAsset.findUnique({
      where: { id: c.bigIdeaSnapshotBrandAssetId },
      select: { content: true },
    });
    if (!ba?.content) return "";
    return typeof ba.content === "string" ? ba.content : JSON.stringify(ba.content);
  } catch {
    return "";
  }
}
