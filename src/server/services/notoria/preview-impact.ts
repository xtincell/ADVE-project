/**
 * NOTORIA Score-Impact Preview (ADR-0090) — simulation PURE de l'effet d'une
 * recommandation sur le score composite /200, AVANT toute persistance.
 *
 * Réutilise exactement les mêmes briques que le scorer canonique :
 *   - getStrategyPillarInputsFromContent (contract-aware, advertis-scorer)
 *   - scorePillarStructural (formule Annexe G)
 *   - poids business-context (lookup table)
 *
 * Aucun LLM, aucune écriture. Le delta retourné est le delta de POTENTIEL
 * structurel — le plafond d'évidence (CULTE/ICONE) s'applique identiquement
 * avant/après, il est donc neutre sur le delta et n'est pas recalculé ici.
 */

import { db } from "@/lib/db";
import { PILLAR_KEYS, type PillarKey } from "@/lib/types/advertis-vector";
import { type BusinessContext, getPillarWeightsForContext } from "@/lib/types/business-context";
import { scorePillarStructural } from "@/lib/utils/scoring";
import { getStrategyPillarInputsFromContent } from "@/server/services/advertis-scorer/structural";
import { parseRecommendationPayload } from "@/lib/types/recommendation-payload";
import { applyPayloadToPillars } from "./apply-payload";

type PillarBlob = Record<string, unknown>;
export type PillarContentMap = Partial<Record<PillarKey, PillarBlob | null>>;

export interface ScoreImpactPreview {
  compositeBefore: number;
  compositeAfter: number;
  /** Delta composite /200 (peut être négatif). */
  delta: number;
  perPillar: Partial<Record<PillarKey, { before: number; after: number }>>;
}

// ── Cœur pur ───────────────────────────────────────────────────────────

/** Score structurel ×poids business d'une map de piliers en mémoire. */
export function computeCompositeFromContents(
  contents: PillarContentMap,
  weights: Record<PillarKey, number>,
): { composite: number; pillars: Record<PillarKey, number> } {
  const pillars = {} as Record<PillarKey, number>;
  for (const key of PILLAR_KEYS) {
    const input = getStrategyPillarInputsFromContent(key, (contents[key] ?? null) as Record<string, unknown> | null);
    const structural = scorePillarStructural(input);
    pillars[key] = Math.round(Math.min(25, Math.max(0, structural * weights[key])) * 100) / 100;
  }
  const composite = Math.round(
    PILLAR_KEYS.reduce((sum, k) => sum + pillars[k], 0) * 100,
  ) / 100;
  return { composite, pillars };
}

/**
 * Applique UNE mutation de reco (typée ADR-0088 ou legacy SET/ADD/EXTEND)
 * sur une copie profonde de la map — la map d'entrée n'est jamais mutée.
 */
export function simulateRecoOnContents(
  contents: PillarContentMap,
  reco: {
    targetPillarKey: string;
    targetField: string;
    operation: string;
    proposedValue: unknown;
  },
): PillarContentMap {
  const clone = structuredClone(contents) as Record<string, PillarBlob>;
  for (const k of PILLAR_KEYS) clone[k] ??= {};

  const typed = parseRecommendationPayload(reco.proposedValue);
  if (typed) {
    applyPayloadToPillars(clone, typed);
    return clone as PillarContentMap;
  }

  const pillar = (clone[reco.targetPillarKey.toLowerCase()] ??= {});
  const field = reco.targetField;
  switch (reco.operation) {
    case "ADD":
    case "EXTEND": {
      const existing = pillar[field];
      if (Array.isArray(existing)) {
        pillar[field] = Array.isArray(reco.proposedValue)
          ? [...existing, ...reco.proposedValue]
          : [...existing, reco.proposedValue];
      } else if (existing == null) {
        pillar[field] = Array.isArray(reco.proposedValue)
          ? reco.proposedValue
          : [reco.proposedValue];
      } else {
        pillar[field] = reco.proposedValue;
      }
      break;
    }
    case "REMOVE":
      delete pillar[field];
      break;
    case "SET":
    case "MODIFY":
    default:
      pillar[field] = reco.proposedValue;
      break;
  }
  return clone as PillarContentMap;
}

// ── Wrapper DB ─────────────────────────────────────────────────────────

async function loadContentsAndWeights(strategyId: string): Promise<{
  contents: PillarContentMap;
  weights: Record<PillarKey, number>;
}> {
  const [rows, strategy] = await Promise.all([
    db.pillar.findMany({
      where: { strategyId },
      select: { key: true, content: true },
    }),
    db.strategy.findUnique({
      where: { id: strategyId },
      select: { businessContext: true },
    }),
  ]);

  const contents: PillarContentMap = {};
  for (const row of rows) {
    contents[row.key.toLowerCase() as PillarKey] = (row.content ?? null) as PillarBlob | null;
  }

  const defaultWeights = { a: 1, d: 1, v: 1, e: 1, r: 1, t: 1, i: 1, s: 1 } as Record<PillarKey, number>;
  let weights = defaultWeights;
  try {
    const ctx = strategy?.businessContext as unknown as BusinessContext | null;
    if (ctx?.businessModel && ctx?.positioningArchetype) {
      weights = getPillarWeightsForContext(ctx);
    }
  } catch {
    weights = defaultWeights;
  }
  return { contents, weights };
}

/**
 * Preview l'impact score d'une recommandation persistée (par id) — lit la
 * stratégie, simule, ne persiste RIEN.
 */
export async function previewRecoScoreImpact(
  strategyId: string,
  recoIds: string[],
): Promise<Record<string, ScoreImpactPreview>> {
  const recos = await db.recommendation.findMany({
    where: { id: { in: recoIds }, strategyId },
    select: {
      id: true,
      targetPillarKey: true,
      targetField: true,
      operation: true,
      proposedValue: true,
    },
  });
  if (recos.length === 0) return {};

  const { contents, weights } = await loadContentsAndWeights(strategyId);
  const before = computeCompositeFromContents(contents, weights);

  const out: Record<string, ScoreImpactPreview> = {};
  for (const reco of recos) {
    const simulated = simulateRecoOnContents(contents, reco);
    const after = computeCompositeFromContents(simulated, weights);

    const perPillar: ScoreImpactPreview["perPillar"] = {};
    for (const k of PILLAR_KEYS) {
      if (before.pillars[k] !== after.pillars[k]) {
        perPillar[k] = { before: before.pillars[k], after: after.pillars[k] };
      }
    }
    out[reco.id] = {
      compositeBefore: before.composite,
      compositeAfter: after.composite,
      delta: Math.round((after.composite - before.composite) * 100) / 100,
      perPillar,
    };
  }
  return out;
}

/**
 * Variante in-memory pour la persistance batch (engine.persistBatch) :
 * la map est déjà chargée, on simule chaque reco candidate sans IO.
 */
export function previewCandidateImpact(
  contents: PillarContentMap,
  weights: Record<PillarKey, number>,
  reco: { targetPillarKey: string; targetField: string; operation: string; proposedValue: unknown },
): number {
  const before = computeCompositeFromContents(contents, weights);
  const after = computeCompositeFromContents(simulateRecoOnContents(contents, reco), weights);
  return Math.round((after.composite - before.composite) * 100) / 100;
}

export { loadContentsAndWeights };
