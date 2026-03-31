/**
 * Cron Scheduler API Route — Executes pending processes
 * Called by external cron (Vercel Cron, Railway, etc.) every 5 minutes
 *
 * Configuration in vercel.json:
 * { "crons": [{ "path": "/api/cron/scheduler", "schedule": "every 5 minutes" }] }
 */

import { db } from "@/lib/db";
import { NextResponse } from "next/server";

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

    // 4. Check for stale strategies and generate feedback loop signals
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

    // 5. Check SLA breaches
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
