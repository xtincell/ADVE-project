/**
 * src/server/services/sequence-vault/cache.ts
 *
 * Phase 17 (ADR-0041, F6) — Cache sequence-level avec invalidation par
 * `pillar.updatedAt`. Ferme F6 (cache framework-only dans enrich-oracle.ts
 * ne couvre pas les Glory sequences → re-runs ~$5 inutiles).
 *
 * Implémentation v1 : store in-memory process-local (Map). Suffisant pour
 * les sessions courtes du process Node Next.js. Migration vers persistence
 * Prisma `SequenceExecution` (table existante avec colonnes additionnelles
 * `expiresAt` / `mode` / `lifecycle` / `promptHash`) prévue en Chantier C-bis
 * avec migration `sequence-execution-cache`.
 *
 * Invariant clé : invalidation par `pillar.updatedAt`. Si le moindre pilier
 * source d'une sequence est plus récent que le timestamp de cache, le hit
 * est invalidé. Ça évite de servir des outputs périmés après un
 * `OPERATOR_AMEND_PILLAR` ou une `RTIS_CASCADE`.
 */

import { db } from "@/lib/db";

interface CacheEntry {
  output: Record<string, unknown>;
  cachedAt: number; // ms epoch
  expiresAt?: number; // ms epoch (optional TTL)
  mode?: string;
  promptHash?: string;
  // Snapshot des pillar.updatedAt au moment du cache, pour invalidation rapide.
  pillarSnapshots?: Record<string, number>;
}

const _store = new Map<string, CacheEntry>();

function makeKey(strategyId: string, sequenceKey: string, mode?: string): string {
  return `${strategyId}::${sequenceKey}::${mode ?? "default"}`;
}

export interface GetCachedSequenceOptions {
  /** TTL max age en ms. Si l'entry est plus vieille, miss. */
  maxAgeMs?: number;
  /**
   * Liste de pillarKey lowercase à vérifier contre `pillar.updatedAt`.
   * Si l'un des piliers a un `updatedAt` postérieur à `cachedAt`, miss.
   * Default : aucune vérification (cache pillar-agnostic, simpliste).
   */
  invalidateIfPillarsChanged?: ReadonlyArray<string>;
  mode?: string;
}

/**
 * Cherche un cache hit pour la sequence. Retourne `null` si miss
 * (cache absent, expiré, invalidé par pillar update plus récent).
 */
export async function getCachedSequence(
  strategyId: string,
  sequenceKey: string,
  options: GetCachedSequenceOptions = {},
): Promise<Record<string, unknown> | null> {
  const key = makeKey(strategyId, sequenceKey, options.mode);
  const entry = _store.get(key);
  if (!entry) return null;

  const now = Date.now();

  // TTL absolu (expiresAt) ou max age relatif
  if (entry.expiresAt && entry.expiresAt < now) {
    _store.delete(key);
    return null;
  }
  if (options.maxAgeMs && now - entry.cachedAt > options.maxAgeMs) {
    _store.delete(key);
    return null;
  }

  // Invalidation par pillar update plus récent
  if (options.invalidateIfPillarsChanged && options.invalidateIfPillarsChanged.length > 0) {
    const pillars = await db.pillar.findMany({
      where: {
        strategyId,
        key: { in: options.invalidateIfPillarsChanged as string[] },
      },
      select: { key: true, updatedAt: true },
    });
    for (const p of pillars) {
      const ts = p.updatedAt.getTime();
      if (ts > entry.cachedAt) {
        _store.delete(key);
        return null;
      }
    }
  }

  return entry.output;
}

export interface CacheSequenceExecutionOptions {
  /** TTL ms à partir de maintenant. Si absent, pas d'expiration. */
  ttlMs?: number;
  mode?: string;
  promptHash?: string;
  /** Snapshot pillar.updatedAt au moment du cache (pour invalidation). */
  pillarSnapshots?: Record<string, number>;
}

/**
 * Stocke l'output d'une sequence dans le cache. Idempotent — un nouveau
 * call avec la même key écrase l'ancienne entry.
 */
export async function cacheSequenceExecution(
  strategyId: string,
  sequenceKey: string,
  output: Record<string, unknown>,
  options: CacheSequenceExecutionOptions = {},
): Promise<void> {
  const key = makeKey(strategyId, sequenceKey, options.mode);
  const now = Date.now();
  _store.set(key, {
    output,
    cachedAt: now,
    expiresAt: options.ttlMs ? now + options.ttlMs : undefined,
    mode: options.mode,
    promptHash: options.promptHash,
    pillarSnapshots: options.pillarSnapshots,
  });
}

/**
 * Vide le cache pour un strategyId (toutes ses sequences). Utilisé par
 * les flows reset (ex: rollback strategie) ou par tests.
 */
export function invalidateStrategyCache(strategyId: string): number {
  let removed = 0;
  for (const key of _store.keys()) {
    if (key.startsWith(`${strategyId}::`)) {
      _store.delete(key);
      removed++;
    }
  }
  return removed;
}

/**
 * Vide le cache complet (utilisé par tests).
 */
export function _resetSequenceCache(): void {
  _store.clear();
}

/**
 * Stats introspection (utilisée par audits + UI cockpit).
 */
export function getSequenceCacheStats(): {
  entries: number;
  byStrategyId: Record<string, number>;
} {
  const byStrategyId: Record<string, number> = {};
  for (const key of _store.keys()) {
    const sid = key.split("::")[0];
    if (sid) byStrategyId[sid] = (byStrategyId[sid] ?? 0) + 1;
  }
  return { entries: _store.size, byStrategyId };
}
