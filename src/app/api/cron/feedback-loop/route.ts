export const dynamic = "force-dynamic";
/**
 * Feedback Loop Cron — Monthly structured questionnaire for strategies in degraded mode (Phase 0-1)
 * Cadence : toutes les 6 h (`scheduled-ops.yml` sixhourly + `ops-daemon.ts`). Le
 * questionnaire est gardé « au plus une fois/30 j » ; le refresh Cult Index a sa propre
 * cadence 7 j (round-14a). round-15b : commentaire « Runs daily » corrigé.
 */

import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
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
          // round-13c : le garde « au plus une fois/30 j » interrogeait le type
          // "MONTHLY_FEEDBACK" alors que le write ci-dessous crée "MONTHLY_FEEDBACK_NEEDED"
          // (aucun code n'écrit jamais "MONTHLY_FEEDBACK") → garde mort → un signal
          // dupliqué créé à CHAQUE run quotidien. Aligné sur le type réellement écrit.
          where: { type: "MONTHLY_FEEDBACK_NEEDED", createdAt: { gte: thirtyDaysAgo } },
          take: 1,
        },
        pillars: true,
      },
    });

    for (const strategy of strategies) {
      // Rafraîchissement du Cult Index (cadence 7 j) — INDÉPENDANT du questionnaire
      // mensuel. round-14a : hissé AU-DESSUS du garde questionnaire ci-dessous, sinon
      // une marque portant un signal MONTHLY_FEEDBACK_NEEDED récent voyait son
      // rafraîchissement cult sauté (cadence 7 j → 30 j), couplage non voulu introduit
      // en révivant le garde (round-13c).
      //
      // Round-12 (fabrication) : l'ancien bloc écrivait un snapshot INVENTÉ — zéros
      // hardcodés sur 4 dimensions, `×200`/`×500` (= le bug d'unités ADR-0126
      // RÉINTRODUIT, alors que le devotion est en % 0-100) → chaque marque dormante
      // héritait d'un ~25/FUNCTIONAL fabriqué. On délègue au SEUL écrivain canonique
      // `calculateAndSnapshot` : math ADR-0126 correcte + exclusion honnête des
      // dimensions non mesurées (jamais un 0 fabriqué). Interdit n°3.
      const lastCultIndex = await db.cultIndexSnapshot.findFirst({
        where: { strategyId: strategy.id },
        orderBy: { measuredAt: "desc" },
      });
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (!lastCultIndex || lastCultIndex.measuredAt < sevenDaysAgo) {
        // Ne rafraîchir que les marques qui ont AU MOINS une donnée de dévotion
        // (sinon calculateAndSnapshot écrirait un 0/GHOST honnête mais inutile).
        const hasDevotion = await db.devotionSnapshot.findFirst({
          where: { strategyId: strategy.id },
          select: { id: true },
        });
        if (hasDevotion) {
          const { calculateAndSnapshot } = await import("@/server/services/cult-index-engine");
          await calculateAndSnapshot(strategy.id);
          cultIndexesUpdated++;
        }
      }

      // Questionnaire mensuel — au plus une fois/30 j (garde round-13c aligné sur le
      // type réellement écrit MONTHLY_FEEDBACK_NEEDED). Ne gouverne QUE le questionnaire.
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
