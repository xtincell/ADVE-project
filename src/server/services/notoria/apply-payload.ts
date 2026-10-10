/**
 * FUNCTION-CALLING RECOMMENDATION EXECUTOR (ADR-0088)
 *
 * Translates a typed `RecommendationPayload` into a *targeted* mutation of the
 * pillar content blobs — addressing risks/initiatives by their stable uuid id
 * rather than re-writing whole text fields. This is the "event sourcing /
 * function calling" path the Core Engine refactor introduces.
 *
 * `applyPayloadToPillars` is PURE (no DB) and unit-tested. `dispatchTypedRecos`
 * loads the pillars, applies the payloads, recomputes S, and writes everything
 * back through the Pillar Gateway (governance preserved — never a raw update).
 */

import { db } from "@/lib/db";
import { PILLAR_STORAGE_KEYS } from "@/domain";
// Lowercase storage-key PillarKey (a..s) — matches writePillarAndScore. NOT the
// uppercase keyof-PILLAR_SCHEMAS PillarKey.
import type { PillarKey } from "@/lib/types/advertis-vector";
import { collectInitiatives, mapInitiativeEntries, ROADMAP_ROUTE_KEYS } from "@/lib/types/pillar-schemas";
import {
  parseRecommendationPayload,
  type RecommendationPayload,
} from "@/lib/types/recommendation-payload";
import type { RouteKey } from "@/lib/strategy/roadmap-routes";
import { withPillarTransaction, type PillarWriteResult } from "@/server/services/pillar-gateway";
import { assertCurrentSourceReceipts, type SourceReceipt } from "@/server/services/ingestion-pipeline/source-usage";

type PillarBlob = Record<string, unknown>;
type PillarMap = Record<string, PillarBlob>;

async function readPillarSnapshot(strategyId: string) {
  const rows = await db.pillar.findMany({
    where: { strategyId, key: { in: [...PILLAR_STORAGE_KEYS] } },
    select: { key: true, content: true, currentVersion: true },
  });
  const pillars: PillarMap = {};
  for (const row of rows) pillars[row.key] = (row.content ?? {}) as PillarBlob;
  const byKey = new Map(rows.map(row => [row.key, row.currentVersion]));
  const versions = Object.fromEntries(PILLAR_STORAGE_KEYS.map(key => [key, byKey.get(key) ?? null]));
  return { pillars, versions };
}

function findInitiativeById(iContent: unknown, id: string): PillarBlob | undefined {
  return (collectInitiatives(iContent) as PillarBlob[]).find((a) => a && typeof a === "object" && a.id === id);
}

/** Mutate every raw source representation; normalized projections are copies. */
function updateInitiativesById(iContent: PillarBlob | undefined, id: string, update: (entry: PillarBlob) => void): number {
  if (!iContent) return 0;
  let found = 0;
  mapInitiativeEntries(iContent, raw => {
    if (raw && typeof raw === "object" && (raw as PillarBlob).id === id) {
      update(raw as PillarBlob);
      found++;
    }
    return raw;
  });
  return found;
}

/**
 * Apply one typed payload to an in-memory pillar map (mutates in place — the
 * initiative/risk objects are references into the nested structure). Returns
 * the set of pillar keys it changed + any warnings (target-not-found, etc.).
 */
export function applyPayloadToPillars(
  pillars: PillarMap,
  payload: RecommendationPayload,
): { changed: Set<string>; warnings: string[] } {
  const changed = new Set<string>();
  const warnings: string[] = [];

  switch (payload.kind) {
    case "SET_RISK_STATUS": {
      const matrix = pillars.r?.probabilityImpactMatrix;
      const risk = Array.isArray(matrix)
        ? (matrix as PillarBlob[]).find((rk) => rk.id === payload.riskId)
        : undefined;
      if (!risk) { warnings.push(`SET_RISK_STATUS: risk ${payload.riskId} not found`); break; }
      risk.status = payload.status;
      changed.add("r");
      break;
    }
    case "LINK_RISK": {
      const found = updateInitiativesById(pillars.i, payload.initiativeId, init => {
        const links = Array.isArray(init.mitigatesRiskIds) ? (init.mitigatesRiskIds as string[]) : [];
        if (!links.includes(payload.riskId)) links.push(payload.riskId);
        init.mitigatesRiskIds = links;
      });
      if (!found) { warnings.push(`LINK_RISK: initiative ${payload.initiativeId} not found`); break; }
      changed.add("i");
      break;
    }
    case "SELECT_INITIATIVE": {
      const found = updateInitiativesById(pillars.i, payload.initiativeId, init => {
        init.status = "SELECTED_FOR_ROADMAP";
        init.timeframe = payload.timeframe;
      });
      if (!found) { warnings.push(`SELECT_INITIATIVE: initiative ${payload.initiativeId} not found`); break; }
      changed.add("i");
      break;
    }
    case "REJECT_INITIATIVE": {
      const found = updateInitiativesById(pillars.i, payload.initiativeId, init => { init.status = "REJECTED"; });
      if (!found) { warnings.push(`REJECT_INITIATIVE: initiative ${payload.initiativeId} not found`); break; }
      changed.add("i");
      break;
    }
    case "ADD_INITIATIVE": {
      const i = (pillars.i ??= {});
      const cat = (i.catalogueParCanal ??= {}) as Record<string, unknown[]>;
      const channel = payload.channel ?? "GENERAL";
      if (!Array.isArray(cat[channel])) cat[channel] = [];
      const existing = findInitiativeById(pillars.i, payload.initiative.id);
      if (existing) {
        if (JSON.stringify(existing) !== JSON.stringify(payload.initiative)) {
          warnings.push(`ADD_INITIATIVE: initiative ${payload.initiative.id} already exists with different content`);
          break;
        }
      } else cat[channel].push(payload.initiative);
      changed.add("i");
      break;
    }
    case "UPDATE_ADVE_FIELD": {
      // Le schéma payload porte la clé MAJUSCULE (ADVE_KEYS) ; la map des
      // piliers est indexée par clé de stockage minuscule. Sans le
      // toLowerCase, l'écriture créait un pilier fantôme "A" jamais persisté.
      const storageKey = payload.pillar.toLowerCase();
      const p = (pillars[storageKey] ??= {});
      p[payload.field] = payload.value;
      changed.add(storageKey);
      break;
    }
    case "SELECT_ROADMAP_ROUTE": {
      // ADR-0089 — l'ambition retenue vit dans S.computed.selectedRouteKey.
      // On l'écrit ici pour que computePillarS (qui relit le S précédent)
      // re-agrège le dashboard sur le jeu de la route choisie au recompute.
      const s = (pillars.s ??= {});
      const computed = (s.computed ??= {}) as Record<string, unknown>;
      computed.selectedRouteKey = payload.routeKey;
      changed.add("s");
      break;
    }
  }

  return { changed, warnings };
}

/**
 * Dispatch typed recommendations: load pillars, apply each payload by id,
 * recompute S if its inputs changed, and persist every touched pillar through
 * the Pillar Gateway. Returns the applied recoIds + warnings.
 */
export async function dispatchTypedRecos(
  strategyId: string,
  recos: Array<{ id: string; proposedValue: unknown; sourceReceipts?: SourceReceipt[]; requiredSourceIds?: string[] }>,
): Promise<{ appliedRecoIds: string[]; warnings: string[] }> {
  const typed = recos
    .map((r) => ({ id: r.id, payload: parseRecommendationPayload(r.proposedValue) }))
    .filter((r): r is { id: string; payload: RecommendationPayload } => r.payload !== null);

  if (typed.length === 0) return { appliedRecoIds: [], warnings: [] };

  const { pillars, versions } = await readPillarSnapshot(strategyId);

  const changed = new Set<string>();
  const warnings: string[] = [];
  const applicableIds: string[] = [];
  for (const { id, payload } of typed) {
    const res = applyPayloadToPillars(pillars, payload);
    res.changed.forEach((k) => changed.add(k));
    if (res.changed.size > 0) applicableIds.push(id);
    warnings.push(...res.warnings);
  }

  const recomputeS = ["i", "r", "t", "s"].some(key => changed.has(key));
  const selectedRouteKey = changed.has("s")
    ? ((pillars.s?.computed ?? {}) as { selectedRouteKey?: RouteKey }).selectedRouteKey : undefined;
  const sourceReceipts = recos.flatMap(r => r.sourceReceipts ?? []);
  const requiredSourceIds = recos.flatMap(r => r.requiredSourceIds ?? []);

  try {
    const results = await withPillarTransaction(strategyId, async (tx, write) => {
      // Documentary locks precede the strategy lock, as in the shared gateway.
      await assertCurrentSourceReceipts(tx, strategyId, sourceReceipts, requiredSourceIds, "UPDATE");
      const written: PillarWriteResult[] = [];
      let firstWrite = true;
      for (const key of changed) {
        if (key === "s") continue; // route choice is composed into the one saved S version below
        written.push(await write({ strategyId, pillarKey: key as PillarKey,
          operation: { type: "REPLACE_FULL", content: pillars[key]! },
          author: { system: "MESTOR", reason: "Notoria: application des recommandations révisées" },
          options: { targetStatus: "AI_PROPOSED", confidenceDelta: 0.05,
            expectedVersion: versions[key] ?? 1, ...(firstWrite ? { expectedPillarVersions: versions } : {}),
            rejectOnProvenanceRefusal: true, sourceReceipts, requiredSourceIds },
        }));
        firstWrite = false;
      }
      if (recomputeS) {
        const { recalculateSynthesisInTransaction } = await import("@/server/services/mestor/rtis-cascade");
        const result = await recalculateSynthesisInTransaction(strategyId, tx, write, { selectedRouteKey,
          writeOptions: { sourceReceipts, requiredSourceIds, ...(firstWrite ? { expectedPillarVersions: versions } : {}) } });
        written.push(result.persisted);
      }
      if (changed.has("i")) {
        const { syncBrandActionsFromBlob } = await import("@/server/services/artemis/action-db/materializer");
        await syncBrandActionsFromBlob(strategyId, tx);
      }
      return written;
    });
    for (const result of results) warnings.push(...result.warnings);
  } catch (err) {
    return { appliedRecoIds: [], warnings: [...warnings, err instanceof Error ? err.message : String(err)] };
  }

  return { appliedRecoIds: applicableIds, warnings };
}

/**
 * ADR-0089 — Sélection directe de l'ambition par l'opérateur (manual-first
 * parity, ADR-0060). Même chemin d'application que les recos typées
 * (`SELECT_ROADMAP_ROUTE` → applyPayloadToPillars → recompute S), sans
 * passer par une row Recommendation. Persisté via le Pillar Gateway —
 * jamais d'update Prisma direct.
 */
export async function selectRoadmapRoute(
  strategyId: string,
  routeKey: (typeof ROADMAP_ROUTE_KEYS)[number],
): Promise<{ selectedRouteKey: string; warnings: string[] }> {
  const { versions } = await readPillarSnapshot(strategyId);
  const { recalculateSynthesisInTransaction } = await import("@/server/services/mestor/rtis-cascade");
  const result = await withPillarTransaction(strategyId, (tx, write) => recalculateSynthesisInTransaction(strategyId, tx, write, {
    selectedRouteKey: routeKey, writeOptions: { expectedPillarVersions: versions },
  }));
  return { selectedRouteKey: routeKey, warnings: result.persisted.warnings };
}
