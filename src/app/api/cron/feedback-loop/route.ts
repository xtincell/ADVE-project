/**
 * Feedback Loop Cron — Monthly structured questionnaire for strategies in degraded mode (Phase 0-1)
 * Runs daily, checks for strategies needing monthly feedback questionnaires
 */

import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let questionnairesCreated = 0;
  let cultIndexesUpdated = 0;

  try {
    // Find strategies that haven't had feedback in 30+ days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const strategies = await db.strategy.findMany({
      where: { status: "ACTIVE" },
      include: {
        signals: {
          where: { type: "MONTHLY_FEEDBACK", createdAt: { gte: thirtyDaysAgo } },
          take: 1,
        },
        pillars: true,
      },
    });

    for (const strategy of strategies) {
      // Skip if already got feedback this month
      if (strategy.signals.length > 0) continue;

      // Find stale composites (pillars not updated in 30+ days)
      const stalePillars = strategy.pillars.filter((p) => p.updatedAt < thirtyDaysAgo);

      if (stalePillars.length > 0) {
        // Create a signal requesting monthly feedback
        await db.signal.create({
          data: {
            strategyId: strategy.id,
            type: "MONTHLY_FEEDBACK_NEEDED",
            data: {
              stalePillars: stalePillars.map((p) => p.key),
              message: `${stalePillars.length} pilier(s) non mis à jour: ${stalePillars.map((p) => p.key).join(", ")}`,
              severity: stalePillars.length >= 4 ? "high" : "medium",
            },
          },
        });
        questionnairesCreated++;
      }

      // Auto-update Cult Index for active strategies (weekly)
      const lastCultIndex = await db.cultIndexSnapshot.findFirst({
        where: { strategyId: strategy.id },
        orderBy: { measuredAt: "desc" },
      });

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (!lastCultIndex || lastCultIndex.measuredAt < sevenDaysAgo) {
        // Create a baseline/updated cult index snapshot
        const devotion = await db.devotionSnapshot.findFirst({
          where: { strategyId: strategy.id },
          orderBy: { measuredAt: "desc" },
        });

        if (devotion) {
          const engagementDepth = Math.min(100, (devotion.participant + devotion.engage + devotion.ambassadeur + devotion.evangeliste) * 100);

          await db.cultIndexSnapshot.create({
            data: {
              strategyId: strategy.id,
              engagementDepth,
              superfanVelocity: 0,
              communityCohesion: 0,
              brandDefenseRate: 0,
              ugcGenerationRate: 0,
              ritualAdoption: Math.min(100, devotion.engage * 200),
              evangelismScore: Math.min(100, devotion.evangeliste * 500),
              compositeScore: engagementDepth * 0.25, // Simplified for degraded mode
              tier: engagementDepth * 0.25 <= 20 ? "GHOST" : engagementDepth * 0.25 <= 40 ? "FUNCTIONAL" : "LOVED",
            },
          });
          cultIndexesUpdated++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      questionnairesCreated,
      cultIndexesUpdated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
