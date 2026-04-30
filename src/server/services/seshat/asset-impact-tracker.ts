/**
 * Seshat — Asset Impact Tracker (Phase 9 résidu 3).
 *
 * Mesure le delta `cultIndexDeltaObserved` pour chaque `AssetVersion`
 * matérialisée par Ptah, en comparant le `CultIndexSnapshot` le plus
 * proche AVANT le déploiement de l'asset et le snapshot APRÈS (>=24h
 * d'observation par défaut).
 *
 * Téléologie : sans ce tracker, Ptah forge dans le vide — aucune boucle
 * de feedback ne dit quel asset a réellement déplacé l'aiguille
 * superfan/Overton. Avec ce tracker, on apprend par effet réel et on
 * pénalise/promeut les Glory tools selon leur cultIndexDelta moyen.
 *
 * Le service prend un snapshot fresh via `calculateAndSnapshot` si la
 * Strategy concernée n'a pas de snapshot < 24h, garantissant une mesure
 * "after" toujours fraîche.
 *
 * Contrat : idempotent. Une AssetVersion mesurée (cultIndexDeltaObserved
 * non-null) est skip aux runs suivants.
 */

import { db } from "@/lib/db";
import { calculateAndSnapshot } from "@/server/services/cult-index-engine";

export interface ImpactResult {
  scanned: number;
  measured: number;
  skipped: number;
  errors: Array<{ assetVersionId: string; error: string }>;
  durationMs: number;
}

const OBSERVATION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h after asset creation
const MAX_BATCH = 100;

/**
 * Scanne les AssetVersions matures (>=24h, pas encore mesurées) et
 * remplit `cultIndexDeltaObserved`. Doit être appelé périodiquement (cron).
 */
export async function trackAssetImpacts(): Promise<ImpactResult> {
  const startedAt = Date.now();
  const cutoff = new Date(Date.now() - OBSERVATION_WINDOW_MS);
  const result: ImpactResult = {
    scanned: 0,
    measured: 0,
    skipped: 0,
    errors: [],
    durationMs: 0,
  };

  const matureVersions = await db.assetVersion.findMany({
    where: {
      cultIndexDeltaObserved: null,
      createdAt: { lte: cutoff },
      strategyId: { not: null },
    },
    select: { id: true, strategyId: true, createdAt: true },
    take: MAX_BATCH,
  });

  // Group by strategyId so we only refresh the snapshot once per strategy.
  const strategyIds = Array.from(new Set(matureVersions.map((v) => v.strategyId).filter((s): s is string => Boolean(s))));
  const refreshedScores = new Map<string, number>();

  for (const strategyId of strategyIds) {
    try {
      const recent = await db.cultIndexSnapshot.findFirst({
        where: { strategyId, measuredAt: { gte: cutoff } },
        orderBy: { measuredAt: "desc" },
      });
      if (recent) {
        refreshedScores.set(strategyId, recent.compositeScore);
      } else {
        const fresh = await calculateAndSnapshot(strategyId);
        refreshedScores.set(strategyId, fresh.score);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // strategie inaccessible : push errors et continue
      result.errors.push({ assetVersionId: `strategy:${strategyId}`, error: msg });
    }
  }

  for (const v of matureVersions) {
    result.scanned++;
    if (!v.strategyId) {
      result.skipped++;
      continue;
    }
    const after = refreshedScores.get(v.strategyId);
    if (typeof after !== "number") {
      result.skipped++;
      continue;
    }

    try {
      const before = await findBaselineSnapshot(v.strategyId, v.createdAt);
      if (typeof before !== "number") {
        result.skipped++;
        continue;
      }
      const delta = Math.round((after - before) * 100) / 100;
      await db.assetVersion.update({
        where: { id: v.id },
        data: { cultIndexDeltaObserved: delta },
      });
      result.measured++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push({ assetVersionId: v.id, error: msg });
    }
  }

  result.durationMs = Date.now() - startedAt;
  return result;
}

/**
 * Trouve la baseline cult-index snapshot la plus proche AVANT le
 * deployment de l'asset. Retourne null si rien d'antérieur n'existe
 * (asset trop ancien dans l'histoire pré-snapshot).
 */
async function findBaselineSnapshot(
  strategyId: string,
  assetCreatedAt: Date,
): Promise<number | null> {
  const snap = await db.cultIndexSnapshot.findFirst({
    where: { strategyId, measuredAt: { lte: assetCreatedAt } },
    orderBy: { measuredAt: "desc" },
    select: { compositeScore: true },
  });
  return snap?.compositeScore ?? null;
}
