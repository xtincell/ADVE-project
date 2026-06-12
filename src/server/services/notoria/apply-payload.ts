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
import { collectInitiatives, ROADMAP_ROUTE_KEYS } from "@/lib/types/pillar-schemas";
import {
  parseRecommendationPayload,
  type RecommendationPayload,
} from "@/lib/types/recommendation-payload";
import { computePillarS } from "@/server/services/rtis-protocols/strategy";
import { writePillarAndScore } from "@/server/services/pillar-gateway";

type PillarBlob = Record<string, unknown>;
type PillarMap = Record<string, PillarBlob>;

function findInitiativeById(iContent: unknown, id: string): PillarBlob | undefined {
  return (collectInitiatives(iContent) as PillarBlob[]).find((a) => a.id === id);
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
      const init = findInitiativeById(pillars.i, payload.initiativeId);
      if (!init) { warnings.push(`LINK_RISK: initiative ${payload.initiativeId} not found`); break; }
      const links = Array.isArray(init.mitigatesRiskIds) ? (init.mitigatesRiskIds as string[]) : [];
      if (!links.includes(payload.riskId)) links.push(payload.riskId);
      init.mitigatesRiskIds = links;
      changed.add("i");
      break;
    }
    case "SELECT_INITIATIVE": {
      const init = findInitiativeById(pillars.i, payload.initiativeId);
      if (!init) { warnings.push(`SELECT_INITIATIVE: initiative ${payload.initiativeId} not found`); break; }
      init.status = "SELECTED_FOR_ROADMAP";
      init.timeframe = payload.timeframe;
      changed.add("i");
      break;
    }
    case "REJECT_INITIATIVE": {
      const init = findInitiativeById(pillars.i, payload.initiativeId);
      if (!init) { warnings.push(`REJECT_INITIATIVE: initiative ${payload.initiativeId} not found`); break; }
      init.status = "REJECTED";
      changed.add("i");
      break;
    }
    case "ADD_INITIATIVE": {
      const i = (pillars.i ??= {});
      const cat = (i.catalogueParCanal ??= {}) as Record<string, unknown[]>;
      const channel = payload.channel ?? "GENERAL";
      if (!Array.isArray(cat[channel])) cat[channel] = [];
      cat[channel].push(payload.initiative);
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
  recos: Array<{ id: string; proposedValue: unknown }>,
): Promise<{ appliedRecoIds: string[]; warnings: string[] }> {
  const typed = recos
    .map((r) => ({ id: r.id, payload: parseRecommendationPayload(r.proposedValue) }))
    .filter((r): r is { id: string; payload: RecommendationPayload } => r.payload !== null);

  if (typed.length === 0) return { appliedRecoIds: [], warnings: [] };

  const rows = await db.pillar.findMany({
    where: { strategyId, key: { in: [...PILLAR_STORAGE_KEYS] } },
    select: { key: true, content: true },
  });
  const pillars: PillarMap = {};
  for (const row of rows) pillars[row.key] = (row.content ?? {}) as PillarBlob;

  const changed = new Set<string>();
  const warnings: string[] = [];
  for (const { payload } of typed) {
    const res = applyPayloadToPillars(pillars, payload);
    res.changed.forEach((k) => changed.add(k));
    warnings.push(...res.warnings);
  }

  // S is a consequence of I/R/T — recompute whenever any of them changed.
  // ADR-0089 : un changement de S lui-même (SELECT_ROADMAP_ROUTE) déclenche
  // aussi le recompute pour ré-agréger le dashboard sur le jeu sélectionné.
  if (changed.has("i") || changed.has("r") || changed.has("t") || changed.has("s")) {
    const sContent = (pillars.s ??= {});
    sContent.computed = computePillarS(pillars, { roadmap: sContent.roadmap as unknown[] });
    changed.add("s");
  }

  for (const key of changed) {
    const result = await writePillarAndScore({
      strategyId,
      pillarKey: key as PillarKey,
      operation: { type: "REPLACE_FULL", content: pillars[key]! },
      author: { system: "MESTOR", reason: `Notoria function-calling: apply typed recommendation(s) (ADR-0088)` },
      options: { targetStatus: "AI_PROPOSED", confidenceDelta: 0.05 },
    });
    if (!result.success) warnings.push(`Pilier ${key}: ${result.error ?? "écriture échouée"}`);
    else warnings.push(...result.warnings.map((w) => `${key}: ${w}`));
  }

  return { appliedRecoIds: typed.map((t) => t.id), warnings };
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
  const rows = await db.pillar.findMany({
    where: { strategyId, key: { in: [...PILLAR_STORAGE_KEYS] } },
    select: { key: true, content: true },
  });
  const pillars: PillarMap = {};
  for (const row of rows) pillars[row.key] = (row.content ?? {}) as PillarBlob;

  const { warnings } = applyPayloadToPillars(pillars, { kind: "SELECT_ROADMAP_ROUTE", routeKey });

  // Recompute S sur le jeu de la route choisie (lit computed.selectedRouteKey).
  const sContent = (pillars.s ??= {});
  sContent.computed = computePillarS(pillars, { roadmap: sContent.roadmap as unknown[] });

  const result = await writePillarAndScore({
    strategyId,
    pillarKey: "s",
    operation: { type: "REPLACE_FULL", content: sContent },
    author: { system: "MESTOR", reason: `SELECT_ROADMAP_ROUTE: ambition ${routeKey} retenue (ADR-0089)` },
  });
  if (!result.success) warnings.push(`Pilier s: ${result.error ?? "écriture échouée"}`);
  else warnings.push(...result.warnings.map((w) => `s: ${w}`));

  return { selectedRouteKey: routeKey, warnings };
}
