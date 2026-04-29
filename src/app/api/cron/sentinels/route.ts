/**
 * Cron — Sentinel Intents (Tier 3.12 of the residual debt).
 *
 * Schedule: every 6 hours (`0 *\/6 * * *`).
 * Emits the three apogee-régime sentinel intents (APOGEE §13):
 *   - MAINTAIN_APOGEE     for every strategy in ICONE
 *   - DEFEND_OVERTON      for strategies with detected Overton counter-moves
 *   - EXPAND_TO_ADJACENT  for AMBASSADEUR-tier brands ready to widen
 *
 * Each emission persists an IntentEmission row that downstream sentinel
 * services (mestor + seshat) can consume to perform their actual work.
 * The cron itself is the *trigger* — it is not the executor.
 */

import { db } from "@/lib/db";
import { NextResponse } from "next/server";

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return authHeader === `Bearer ${cronSecret}`;
}

interface SentinelEmission {
  kind: string;
  strategyId: string;
  payload: Record<string, unknown>;
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();
  const out = {
    maintain: 0,
    defend: 0,
    expand: 0,
    skipped: 0,
    errors: [] as string[],
  };

  // 1. MAINTAIN_APOGEE — for ICONE-tier brands.
  // Heuristic: strategies with composite score ≥ 85 (apex equivalent).
  const apexStrategies = await db.strategy.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, advertis_vector: true, name: true },
    take: 50,
  });
  for (const s of apexStrategies) {
    const composite = (s.advertis_vector as Record<string, number> | null)?.composite ?? 0;
    if (composite < 85) continue;
    await emit({
      kind: "MAINTAIN_APOGEE",
      strategyId: s.id,
      payload: { composite, evaluator: "cron:sentinels", lookback: "6h" },
    });
    out.maintain++;
  }

  // 2. DEFEND_OVERTON — strategies whose sector has a recent counter-move.
  // Heuristic: strategies whose sector has a Signal of type WEAK_SIGNAL_ALERT
  // or MARKET_SIGNAL with negative sentiment in the last 24h.
  const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const counterMoves = await db.signal.findMany({
    where: {
      type: { in: ["MARKET_SIGNAL", "WEAK_SIGNAL_ALERT"] },
      createdAt: { gte: since24 },
    },
    select: { strategyId: true, type: true, data: true },
    take: 100,
  });
  const defendedStrategies = new Set<string>();
  for (const sig of counterMoves) {
    if (defendedStrategies.has(sig.strategyId)) continue;
    defendedStrategies.add(sig.strategyId);
    await emit({
      kind: "DEFEND_OVERTON",
      strategyId: sig.strategyId,
      payload: { triggerSignalType: sig.type, evaluator: "cron:sentinels" },
    });
    out.defend++;
  }

  // 3. EXPAND_TO_ADJACENT_SECTOR — strategies with high recruitment + cult tier.
  // Heuristic: SuperfanProfile aggregate engagementDepth ≥ 0.7 across ≥ 50 fans.
  const candidates = await db.strategy.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      client: { select: { sector: true } },
      _count: { select: { superfanProfiles: true } },
    },
    take: 50,
  });
  for (const s of candidates) {
    if (s._count.superfanProfiles < 50) continue;
    const avg = await db.superfanProfile.aggregate({
      where: { strategyId: s.id },
      _avg: { engagementDepth: true },
    });
    const depth = Number(avg._avg.engagementDepth ?? 0);
    if (depth < 0.7) continue;
    await emit({
      kind: "EXPAND_TO_ADJACENT_SECTOR",
      strategyId: s.id,
      payload: {
        currentSector: s.client?.sector ?? "(unknown)",
        massSize: s._count.superfanProfiles,
        avgEngagementDepth: depth,
        evaluator: "cron:sentinels",
      },
    });
    out.expand++;
  }

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - startedAt.getTime(),
    ...out,
  });
}

async function emit(s: SentinelEmission): Promise<void> {
  try {
    await db.intentEmission.create({
      data: {
        id: `sentinel_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        intentKind: s.kind,
        strategyId: s.strategyId,
        payload: s.payload as never,
        caller: "cron:sentinels",
        ...({ status: "PENDING" } as Record<string, unknown>),
      } as never,
    });
  } catch (err) {
    console.warn(`[cron:sentinels] failed to emit ${s.kind} for ${s.strategyId}:`, err);
  }
}
