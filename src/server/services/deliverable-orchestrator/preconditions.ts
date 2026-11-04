import {readMixDecision} from "@/domain/production-mix";
import { db } from "@/lib/db";
import { ADVE_KEYS, ADVE_STORAGE_KEYS } from "@/domain";
import { evaluatePillarReadiness } from "@/server/governance/pillar-readiness";

// ── Pre-conditions Loi 2 (séquencement étages APOGEE) ───────────────────

/**
 * Vérifie que la strategy a :
 *   1. `manipulationMix.primary` défini
 *   2. Au moins une fondation exploitable par Glory selon les règles de maturité
 *
 * Retourne la liste des conditions manquantes (vide = compose autorisé).
 */
export async function checkLawTwoPreconditions(strategyId: string): Promise<string[]> {
  const missing: string[] = [];

  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { manipulationMix: true, status: true },
  });

  if (!strategy) {
    return ["STRATEGY_NOT_FOUND"];
  }

  if (["ARCHIVED", "DELETED"].includes(strategy.status)) return ["STRATEGY_ARCHIVED"];
  // manipulationMix est JSON ; on cherche `.primary` non-null.
  const mix = readMixDecision(strategy.manipulationMix);
  if (!mix.primary || (mix.percent && !mix.percent[mix.primary])) {
    missing.push("MISSING_MANIPULATION_MIX_PRIMARY");
  }

  // « Actif » au sens de la Loi 2 : au moins une fondation réellement prête
  // pour Glory. Aucun état ACTIVE n'existe sur Pillar (il appartient au coffre).
  const rows = await db.pillar.findMany({ where: { strategyId, key: { in: [...ADVE_STORAGE_KEYS] } },
    select: { key:true, content:true, validationStatus:true, completionLevel:true, staleAt:true } });
  const ready = ADVE_KEYS.some(key => {
    const row = rows.find(p => p.key.toUpperCase() === key);
    return row && evaluatePillarReadiness(row,key).gates.GLORY_SEQUENCE.ok;
  });
  if (!ready) {
    missing.push("MISSING_ACTIVE_ADVE_PILLAR");
  }

  return missing;
}
