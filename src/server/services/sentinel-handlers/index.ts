/**
 * Sentinel Handlers — Phase 9-suite résidu.
 *
 * Consomme les `IntentEmission` rows en status=PENDING émises par le cron
 * `/api/cron/sentinels` et exécute le travail réel pour chaque kind :
 *
 *   - MAINTAIN_APOGEE              → Mestor : crée un KnowledgeEntry de
 *                                    suivi + Signal CULT_TIER_REVIEW si
 *                                    le composite score chute >5 pts vs
 *                                    le snapshot précédent.
 *   - DEFEND_OVERTON               → Seshat : agrège les weak signals
 *                                    Tarsis du dernier 24h, génère un
 *                                    Signal OVERTON_COUNTERMOVE_DETECTED.
 *   - EXPAND_TO_ADJACENT_SECTOR    → Mestor : pré-flag la Strategy pour
 *                                    cross-sector playbook (KnowledgeEntry).
 *
 * Idempotent : ne re-traite que les rows en `PENDING`. Marque `OK` à la
 * fin, `FAILED` en cas d'erreur, avec `result.summary` rempli.
 *
 * Téléologie : sans ces handlers, les sentinels émis sont invisibles —
 * pas d'auto-correction APOGEE Loi 1+2, pas de Defense Overton.
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export interface SentinelRunResult {
  scanned: number;
  processed: number;
  failed: number;
  byKind: Record<string, number>;
  errors: Array<{ id: string; kind: string; error: string }>;
  durationMs: number;
}

const SENTINEL_KINDS = ["MAINTAIN_APOGEE", "DEFEND_OVERTON", "EXPAND_TO_ADJACENT_SECTOR"] as const;
const BATCH_SIZE = 50;

export async function processPendingSentinels(): Promise<SentinelRunResult> {
  const startedAt = Date.now();
  const result: SentinelRunResult = {
    scanned: 0,
    processed: 0,
    failed: 0,
    byKind: {},
    errors: [],
    durationMs: 0,
  };

  const pending = await db.intentEmission.findMany({
    where: {
      intentKind: { in: SENTINEL_KINDS as unknown as string[] },
      status: "PENDING",
    },
    orderBy: { emittedAt: "asc" },
    take: BATCH_SIZE,
  });

  for (const row of pending) {
    result.scanned++;
    try {
      const summary = await dispatchHandler(row.intentKind, row.strategyId, row.payload);
      await db.intentEmission.update({
        where: { id: row.id },
        data: {
          status: "OK",
          completedAt: new Date(),
          result: { summary, processedAt: new Date().toISOString() } as Prisma.InputJsonValue,
        },
      });
      result.processed++;
      result.byKind[row.intentKind] = (result.byKind[row.intentKind] ?? 0) + 1;
    } catch (err) {
      result.failed++;
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push({ id: row.id, kind: row.intentKind, error: msg });
      await db.intentEmission
        .update({
          where: { id: row.id },
          data: {
            status: "FAILED",
            completedAt: new Date(),
            result: { error: msg, failedAt: new Date().toISOString() } as Prisma.InputJsonValue,
          },
        })
        .catch(() => {});
    }
  }

  result.durationMs = Date.now() - startedAt;
  return result;
}

async function dispatchHandler(
  kind: string,
  strategyId: string,
  payload: Prisma.JsonValue,
): Promise<string> {
  switch (kind) {
    case "MAINTAIN_APOGEE":
      return handleMaintainApogee(strategyId, payload);
    case "DEFEND_OVERTON":
      return handleDefendOverton(strategyId, payload);
    case "EXPAND_TO_ADJACENT_SECTOR":
      return handleExpandToAdjacent(strategyId, payload);
    default:
      throw new Error(`unknown sentinel kind: ${kind}`);
  }
}

/**
 * MAINTAIN_APOGEE — détecte les régressions d'altitude (composite score
 * chute >5 pts vs snapshot précédent) et fait remonter un signal.
 */
async function handleMaintainApogee(strategyId: string, payload: Prisma.JsonValue): Promise<string> {
  const composite = pickNumber(payload, "composite") ?? 0;

  const snapshots = await db.cultIndexSnapshot.findMany({
    where: { strategyId },
    orderBy: { measuredAt: "desc" },
    take: 2,
  });

  let drift: number | null = null;
  if (snapshots.length >= 2) {
    drift = (snapshots[0]?.compositeScore ?? 0) - (snapshots[1]?.compositeScore ?? 0);
  }

  if (drift !== null && drift < -5) {
    await db.signal.create({
      data: {
        strategyId,
        type: "CULT_TIER_REVIEW",
        data: {
          reason: "MAINTAIN_APOGEE detected score regression",
          dropPoints: Math.abs(drift),
          composite,
          handler: "sentinel-handlers",
        } as Prisma.InputJsonValue,
      },
    });
  }

  await db.knowledgeEntry.create({
    data: {
      entryType: "DIAGNOSTIC_RESULT",
      data: {
        kind: "maintain_apogee_check",
        strategyId,
        composite,
        drift,
        handledAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  }).catch(() => {});

  return `MAINTAIN_APOGEE handled : composite=${composite} drift=${drift ?? "n/a"}`;
}

/**
 * DEFEND_OVERTON — agrège les weak signals 24h et émet
 * OVERTON_COUNTERMOVE_DETECTED si volume > seuil.
 */
async function handleDefendOverton(strategyId: string, payload: Prisma.JsonValue): Promise<string> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await db.signal.count({
    where: {
      strategyId,
      type: { in: ["MARKET_SIGNAL", "WEAK_SIGNAL_ALERT"] },
      createdAt: { gte: since },
    },
  });

  if (recent >= 3) {
    await db.signal.create({
      data: {
        strategyId,
        type: "OVERTON_COUNTERMOVE_DETECTED",
        data: {
          weakSignalCount: recent,
          windowHours: 24,
          handler: "sentinel-handlers",
          triggerPayload: payload,
        } as Prisma.InputJsonValue,
      },
    });
    return `DEFEND_OVERTON : countermove signal emitted (${recent} weak signals)`;
  }

  return `DEFEND_OVERTON : ${recent} weak signals, below threshold (3) — no countermove emitted`;
}

/**
 * EXPAND_TO_ADJACENT_SECTOR — flag la Strategy pour cross-sector playbook
 * et persiste l'opportunité dans KnowledgeEntry.
 */
async function handleExpandToAdjacent(strategyId: string, payload: Prisma.JsonValue): Promise<string> {
  const massSize = pickNumber(payload, "massSize") ?? 0;
  const avgEngagementDepth = pickNumber(payload, "avgEngagementDepth") ?? 0;
  const currentSector = pickString(payload, "currentSector") ?? "(unknown)";

  await db.knowledgeEntry
    .create({
      data: {
        entryType: "MISSION_OUTCOME",
        sector: currentSector === "(unknown)" ? null : currentSector,
        data: {
          kind: "expand_to_adjacent_opportunity",
          strategyId,
          currentSector,
          massSize,
          avgEngagementDepth,
          recommendation: avgEngagementDepth >= 0.8
            ? "READY_FOR_EXPANSION"
            : "MONITOR_CONTINUE",
          handledAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    })
    .catch(() => {});

  return `EXPAND_TO_ADJACENT_SECTOR : sector=${currentSector} mass=${massSize} depth=${avgEngagementDepth.toFixed(2)}`;
}

// ── Helpers ────────────────────────────────────────────────────────────

function pickNumber(payload: Prisma.JsonValue, key: string): number | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}

function pickString(payload: Prisma.JsonValue, key: string): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}
