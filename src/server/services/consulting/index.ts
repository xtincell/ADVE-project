/**
 * consulting/ — Acteur Conseil : priorisation RICE déterministe (ADR-0109).
 *
 * Les FORMULES sont dans `rice.ts` (pures). Ici : la résolution des barèmes depuis
 * la table de référence `RiceScale` (seedée, jamais en dur) + la persistance des
 * entrées/score sur `Recommendation`. Zéro LLM.
 */

import { db } from "@/lib/db";
import { computeRiceScore, resolveScaleValue, type RiceScaleRow } from "./rice";
import { evaluateHypothesis, type EvidenceLike } from "./evidence";

export * from "./rice";
export * from "./evidence";

export interface SetRiceInput {
  recommendationId: string;
  // Voie LIBELLÉS (résolus via RiceScale seedée) …
  reachLabel?: string;
  impactLabel?: string;
  confidenceLabel?: string;
  effortLabel?: string;
  // … ou voie VALEURS BRUTES (override direct, ex. reach = compte réel).
  reach?: number;
  impact?: number;
  confidence?: number;
  effort?: number;
}

async function loadScales(): Promise<RiceScaleRow[]> {
  return db.riceScale.findMany({ select: { dimension: true, label: true, value: true } });
}

/**
 * Renseigne les entrées RICE d'une recommandation puis calcule le score (pur).
 * Les libellés sont résolus depuis `RiceScale` ; une valeur brute prime sur le
 * libellé. La confiance manquante retombe sur la `confidence` de la reco.
 * Renvoie la recommandation mise à jour. Lève si un libellé fourni est introuvable.
 */
export async function setRecommendationRice(input: SetRiceInput) {
  const reco = await db.recommendation.findUniqueOrThrow({
    where: { id: input.recommendationId },
    select: { id: true, confidence: true },
  });
  const scales = await loadScales();

  function resolve(dimension: string, label: string | undefined, raw: number | undefined, fallback?: number): number | null {
    if (typeof raw === "number") return raw;
    if (label) {
      const v = resolveScaleValue(scales, dimension, label);
      if (v === null) throw new Error(`RiceScale introuvable: ${dimension} / "${label}". Barème seedé requis.`);
      return v;
    }
    return fallback ?? null;
  }

  const reach = resolve("REACH", input.reachLabel, input.reach);
  const impact = resolve("IMPACT", input.impactLabel, input.impact);
  const confidence = resolve("CONFIDENCE", input.confidenceLabel, input.confidence, reco.confidence);
  const effort = resolve("EFFORT", input.effortLabel, input.effort);

  const riceScore =
    reach !== null && impact !== null && confidence !== null && effort !== null
      ? computeRiceScore({ reach, impact, confidence, effort })
      : null;

  return db.recommendation.update({
    where: { id: reco.id },
    data: {
      riceReach: reach,
      riceImpact: impact,
      riceConfidence: confidence,
      riceEffort: effort,
      riceScore,
    },
  });
}

// ── Chaîne de preuve (ADR-0113) — hypothèse → évidence → reco ────────────────

export async function createEngagement(input: { strategyId: string; title: string; objective?: string }) {
  return db.consultingEngagement.create({
    data: { strategyId: input.strategyId, title: input.title, objective: input.objective ?? null },
  });
}

export async function addHypothesis(input: { engagementId: string; statement: string }) {
  return db.hypothesis.create({
    data: { engagementId: input.engagementId, statement: input.statement },
  });
}

/**
 * Ajoute une évidence à une hypothèse PUIS recalcule son statut déterministe
 * depuis le poids net de TOUTES ses évidences. Renvoie l'hypothèse mise à jour.
 */
export async function addEvidence(input: {
  hypothesisId: string;
  stance: "SUPPORTS" | "REFUTES";
  weight?: number;
  summary: string;
  sourceType?: string;
  sourceUrl?: string;
  marketSourceId?: string;
}) {
  await db.evidence.create({
    data: {
      hypothesisId: input.hypothesisId,
      stance: input.stance,
      weight: input.weight ?? 0.5,
      summary: input.summary,
      sourceType: input.sourceType ?? null,
      sourceUrl: input.sourceUrl ?? null,
      marketSourceId: input.marketSourceId ?? null,
    },
  });
  return recomputeHypothesis(input.hypothesisId);
}

/** Recalcule statut + netSupport d'une hypothèse depuis ses évidences. Déterministe. */
export async function recomputeHypothesis(hypothesisId: string) {
  const evidence = (await db.evidence.findMany({
    where: { hypothesisId },
    select: { stance: true, weight: true },
  })) as EvidenceLike[];
  const verdict = evaluateHypothesis(evidence);
  return db.hypothesis.update({
    where: { id: hypothesisId },
    data: { status: verdict.status, netSupport: verdict.netSupport },
  });
}

/** Lie une recommandation à une hypothèse (traçabilité du « pourquoi »). */
export async function linkRecommendationToHypothesis(input: { recommendationId: string; hypothesisId: string }) {
  return db.recommendation.update({
    where: { id: input.recommendationId },
    data: { hypothesisId: input.hypothesisId },
  });
}
