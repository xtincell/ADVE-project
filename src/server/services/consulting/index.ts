/**
 * consulting/ — Acteur Conseil : priorisation RICE déterministe (ADR-0109).
 *
 * Les FORMULES sont dans `rice.ts` (pures). Ici : la résolution des barèmes depuis
 * la table de référence `RiceScale` (seedée, jamais en dur) + la persistance des
 * entrées/score sur `Recommendation`. Zéro LLM.
 */

import { db } from "@/lib/db";
import { computeRiceScore, resolveScaleValue, type RiceScaleRow } from "./rice";

export * from "./rice";

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
