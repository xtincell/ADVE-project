export const dynamic = "force-dynamic";
/**
 * Cron Scheduler API Route — Executes pending processes
 * Called by external cron (Vercel Cron, Railway, etc.) every 5 minutes
 *
 * Configuration in vercel.json:
 * { "crons": [{ "path": "/api/cron/scheduler", "schedule": "every 5 minutes" }] }
 */

import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { snapshotAllStrategies } from "@/server/services/advertis-scorer";
import { schedulerAutoTrigger, checkPipelineContention } from "@/server/services/pipeline-orchestrator";
import { collectMarketSignals, type CollectionStrategy } from "@/server/services/market-intelligence/signal-collector";
import { analyzeWeakSignals, buildSearchContext } from "@/server/services/market-intelligence/weak-signal-analyzer";

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // Allow in dev if no secret configured
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    processesExecuted: 0,
    feedbackLoopsRun: 0,
    cultIndexUpdated: 0,
    commissionsProcessed: 0,
    intakesExpired: 0,
    scoreSnapshotsCreated: 0,
    scoreSnapshotsExpired: 0,
    pipelineAutoTriggered: 0,
    daemonsRescheduled: 0,
    contentionBottlenecks: 0,
    marketSignalsCollected: 0,
    weakSignalsDetected: 0,
    errors: [] as string[],
  };

  try {
    // 1. Execute pending TRIGGERED processes (First Value Protocol, etc.)
    const pendingTriggered = await db.process.findMany({
      where: {
        status: "RUNNING",
        type: "TRIGGERED",
        nextRunAt: { lte: new Date() },
      },
    });

    for (const proc of pendingTriggered) {
      try {
        await db.process.update({
          where: { id: proc.id },
          data: {
            status: "COMPLETED",
            lastRunAt: new Date(),
            runCount: proc.runCount + 1,
          },
        });
        results.processesExecuted++;
      } catch (error) {
        results.errors.push(`Process ${proc.id}: ${error instanceof Error ? error.message : "unknown"}`);
      }
    }

    // 2. Execute DAEMON processes (recurring)
    const daemons = await db.process.findMany({
      where: {
        status: "RUNNING",
        type: "DAEMON",
        nextRunAt: { lte: new Date() },
      },
    });

    for (const daemon of daemons) {
      try {
        const frequency = daemon.frequency ?? "daily";
        const nextRun = computeNextRun(frequency);

        // Dispatch market signal collection DAEMONs
        const playbook = daemon.playbook as Record<string, unknown> | null;
        if (playbook?.type === "market_signal_collection" && daemon.strategyId) {
          try {
            const config: CollectionStrategy = {
              strategyId: daemon.strategyId,
              sector: String(playbook.sector ?? ""),
              market: playbook.market ? String(playbook.market) : undefined,
              keywords: Array.isArray(playbook.keywords) ? playbook.keywords as string[] : [],
              competitors: Array.isArray(playbook.competitors) ? playbook.competitors as string[] : [],
              frequency: (playbook.frequency as CollectionStrategy["frequency"]) ?? "DAILY",
            };
            const signals = await collectMarketSignals(config);
            results.marketSignalsCollected += signals.length;

            // Analyze weak signals from collected data
            if (signals.length > 0) {
              const searchContext = await buildSearchContext(daemon.strategyId);
              const weakSignals = await analyzeWeakSignals(signals, searchContext, daemon.strategyId);
              results.weakSignalsDetected += weakSignals.length;
            }
          } catch (err) {
            results.errors.push(`Market collector ${daemon.id}: ${err instanceof Error ? err.message : "unknown"}`);
          }
        }

        await db.process.update({
          where: { id: daemon.id },
          data: {
            lastRunAt: new Date(),
            nextRunAt: nextRun,
            runCount: daemon.runCount + 1,
          },
        });
        results.processesExecuted++;
      } catch (error) {
        results.errors.push(`Daemon ${daemon.id}: ${error instanceof Error ? error.message : "unknown"}`);
      }
    }

    // 3. Execute BATCH processes
    const batches = await db.process.findMany({
      where: {
        status: "RUNNING",
        type: "BATCH",
        nextRunAt: { lte: new Date() },
      },
    });

    for (const batch of batches) {
      try {
        await db.process.update({
          where: { id: batch.id },
          data: {
            status: "COMPLETED",
            lastRunAt: new Date(),
            runCount: batch.runCount + 1,
          },
        });
        results.processesExecuted++;
      } catch (error) {
        results.errors.push(`Batch ${batch.id}: ${error instanceof Error ? error.message : "unknown"}`);
      }
    }

    // 4. Expire stale Quick Intakes (>7 days old, still IN_PROGRESS)
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const expiredResult = await db.quickIntake.updateMany({
        where: {
          status: "IN_PROGRESS",
          createdAt: { lte: sevenDaysAgo },
        },
        data: { status: "EXPIRED" },
      });
      results.intakesExpired = expiredResult.count;
    } catch (error) {
      results.errors.push(`Intake expiry: ${error instanceof Error ? error.message : "unknown"}`);
    }

    // 5. Periodic score snapshots (every 6h) + 90-day retention
    try {
      const lastPeriodicSnapshot = await db.scoreSnapshot.findFirst({
        where: { trigger: "periodic_cron" },
        orderBy: { measuredAt: "desc" },
        select: { measuredAt: true },
      });
      const sixHoursMs = 6 * 60 * 60 * 1000;
      const shouldSnapshot = !lastPeriodicSnapshot ||
        (Date.now() - lastPeriodicSnapshot.measuredAt.getTime()) > sixHoursMs;

      if (shouldSnapshot) {
        const snapResult = await snapshotAllStrategies();
        results.scoreSnapshotsCreated = snapResult.snapshotsCreated;
        results.scoreSnapshotsExpired = snapResult.expiredDeleted;
      }
    } catch (error) {
      results.errors.push(`Score snapshots: ${error instanceof Error ? error.message : "unknown"}`);
    }

    // 6. Check for stale strategies and generate feedback loop signals
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const staleStrategies = await db.strategy.findMany({
      where: {
        status: "ACTIVE",
        updatedAt: { lte: thirtyDaysAgo },
      },
      select: { id: true, name: true },
    });

    for (const strat of staleStrategies) {
      try {
        // Check if we already have a stale signal recently
        const existingSignal = await db.signal.findFirst({
          where: {
            strategyId: strat.id,
            type: "STALE_STRATEGY",
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        });

        if (!existingSignal) {
          await db.signal.create({
            data: {
              strategyId: strat.id,
              type: "STALE_STRATEGY",
              data: { message: `Strategy "${strat.name}" inactive depuis 30+ jours`, severity: "medium" },
            },
          });
          results.feedbackLoopsRun++;
        }
      } catch (error) {
        results.errors.push(`Stale check ${strat.id}: ${error instanceof Error ? error.message : "unknown"}`);
      }
    }

    // 7. Check SLA breaches
    const missionsWithSLA = await db.mission.findMany({
      where: {
        status: "IN_PROGRESS",
        slaDeadline: { lte: new Date() },
      },
      select: { id: true, title: true, strategyId: true },
    });

    for (const mission of missionsWithSLA) {
      try {
        const existingSignal = await db.signal.findFirst({
          where: {
            strategyId: mission.strategyId,
            type: "SLA_BREACH",
            data: { path: ["missionId"], equals: mission.id },
          },
        });

        if (!existingSignal) {
          await db.signal.create({
            data: {
              strategyId: mission.strategyId,
              type: "SLA_BREACH",
              data: { missionId: mission.id, missionTitle: mission.title, severity: "critical" },
            },
          });
        }
      } catch {
        // Ignore duplicate signal errors
      }
    }

    // 8. Pipeline auto-trigger (M36 REQ-6) — execute pending processes with real actions
    try {
      const autoResult = await schedulerAutoTrigger();
      results.pipelineAutoTriggered = autoResult.triggered;
      results.daemonsRescheduled = autoResult.daemonsRescheduled;
      for (const err of autoResult.errors) {
        results.errors.push(`Pipeline auto-trigger: ${err}`);
      }
    } catch (error) {
      results.errors.push(`Pipeline auto-trigger: ${error instanceof Error ? error.message : "unknown"}`);
    }

    // 9. Contention check (M36 REQ-8) — detect resource conflicts
    try {
      const contention = await checkPipelineContention();
      results.contentionBottlenecks = contention.bottlenecks.length;
      if (contention.bottlenecks.length > 0) {
        // Create a signal for each strategy that has contention
        for (const conflict of contention.conflictingDrivers) {
          const driver = await db.driver.findUnique({ where: { id: conflict.driverId }, select: { strategyId: true } });
          if (driver?.strategyId) {
            await db.signal.create({
              data: {
                strategyId: driver.strategyId,
                type: "PIPELINE_CONTENTION",
                data: { driverId: conflict.driverId, processCount: conflict.processCount, processNames: conflict.processNames, severity: "medium" },
              },
            }).catch(() => { /* ignore if signal type not supported */ });
          }
        }
      }
    } catch (error) {
      results.errors.push(`Contention check: ${error instanceof Error ? error.message : "unknown"}`);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
      ...results,
    }, { status: 500 });
  }
}

function computeNextRun(frequency: string): Date {
  const now = new Date();
  switch (frequency) {
    case "hourly":
      return new Date(now.getTime() + 60 * 60 * 1000);
    case "daily":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case "weekly":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "monthly":
      const next = new Date(now);
      next.setMonth(next.getMonth() + 1);
      return next;
    default:
      // Try to parse as cron-like interval "5m", "1h", "1d"
      const match = frequency.match(/^(\d+)(m|h|d)$/);
      if (match) {
        const [, amount, unit] = match;
        const multipliers: Record<string, number> = { m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
        return new Date(now.getTime() + parseInt(amount!) * (multipliers[unit!] ?? 60 * 60 * 1000));
      }
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}
