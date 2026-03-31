import { db } from "@/lib/db";
import type { PillarKey } from "@/lib/types/advertis-vector";
import { PILLAR_KEYS } from "@/lib/types/advertis-vector";
import { scorePillarStructural, type PillarScoreInput } from "@/lib/utils/scoring";
import type { ScorableType } from "./index";

/**
 * Deterministic structural scoring per pillar.
 * Formula from Annexe G: score = (atomes/requis * 15) + (collections/totales * 7) + (cross_refs/requises * 3)
 * Max 25 per pillar.
 *
 * This function MUST produce identical results for identical inputs (variance = 0).
 */
export async function scoreStructural(
  type: ScorableType,
  id: string
): Promise<Record<PillarKey, number>> {
  const scores: Record<string, number> = {};

  for (const pillar of PILLAR_KEYS) {
    const input = await getPillarInputs(type, id, pillar);
    scores[pillar] = scorePillarStructural(input);
  }

  return scores as Record<PillarKey, number>;
}

/**
 * Retrieves the structural input counts for a given pillar.
 * Counts atoms (filled fields), collections (complete groups), and cross-references.
 */
async function getPillarInputs(
  type: ScorableType,
  id: string,
  pillar: PillarKey
): Promise<PillarScoreInput> {
  if (type === "strategy") {
    return getStrategyPillarInputs(id, pillar);
  }

  // Default: return empty inputs for types not yet implemented
  return {
    atomesValides: 0,
    atomesRequis: 1,
    collectionsCompletes: 0,
    collectionsTotales: 1,
    crossRefsValides: 0,
    crossRefsRequises: 1,
  };
}

async function getStrategyPillarInputs(
  strategyId: string,
  pillar: PillarKey
): Promise<PillarScoreInput> {
  // Get the pillar content for this strategy
  const pillarContent = await db.pillar.findUnique({
    where: { strategyId_key: { strategyId, key: pillar } },
  });

  if (!pillarContent?.content) {
    return {
      atomesValides: 0,
      atomesRequis: getRequiredAtoms(pillar),
      collectionsCompletes: 0,
      collectionsTotales: getRequiredCollections(pillar),
      crossRefsValides: 0,
      crossRefsRequises: getRequiredCrossRefs(pillar),
    };
  }

  const content = pillarContent.content as Record<string, unknown>;
  const filledFields = Object.values(content).filter(
    (v) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)
  ).length;

  return {
    atomesValides: filledFields,
    atomesRequis: getRequiredAtoms(pillar),
    collectionsCompletes: countCompleteCollections(content, pillar),
    collectionsTotales: getRequiredCollections(pillar),
    crossRefsValides: countCrossRefs(content),
    crossRefsRequises: getRequiredCrossRefs(pillar),
  };
}

// Required counts per pillar (from Annexe H ontology)
function getRequiredAtoms(pillar: PillarKey): number {
  const counts: Record<PillarKey, number> = {
    a: 12, // Vision, mission, mythe fondateur, valeurs, archétype, etc.
    d: 10, // Positionnement, identité visuelle, voix, dialectes
    v: 8,  // Promesse, sacrements, expérience
    e: 10, // Devotion ladder, temples, rituels, clergé
    r: 8,  // SWOT, risques, mitigation, crise
    t: 6,  // KPIs, validation marché, scoring
    i: 8,  // Roadmap, budget, équipe, campagnes
    s: 6,  // Synthèse, bible, playbooks, guidelines
  };
  return counts[pillar];
}

function getRequiredCollections(pillar: PillarKey): number {
  const counts: Record<PillarKey, number> = {
    a: 3, d: 3, v: 2, e: 3, r: 2, t: 2, i: 2, s: 2,
  };
  return counts[pillar];
}

function getRequiredCrossRefs(pillar: PillarKey): number {
  const counts: Record<PillarKey, number> = {
    a: 2, d: 2, v: 2, e: 2, r: 1, t: 1, i: 2, s: 3,
  };
  return counts[pillar];
}

function countCompleteCollections(content: Record<string, unknown>, _pillar: PillarKey): number {
  // Count arrays that have at least 2 items as "complete collections"
  return Object.values(content).filter(
    (v) => Array.isArray(v) && v.length >= 2
  ).length;
}

function countCrossRefs(content: Record<string, unknown>): number {
  // Count fields that reference other entities (strings starting with strategy_, driver_, etc.)
  return Object.values(content).filter(
    (v) => typeof v === "string" && /^(strategy_|driver_|campaign_|mission_)/.test(v)
  ).length;
}
