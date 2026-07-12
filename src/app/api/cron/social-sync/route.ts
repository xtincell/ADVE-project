export const dynamic = "force-dynamic";
/**
 * Cron — Sync sociale quotidienne des marques connectées (plan P1 validé,
 * post-ADR-0128). Pour chaque Strategy ayant ≥1 SocialConnection ACTIVE :
 *   1. audience (FollowerSnapshot source=CONNECTOR — la sync manuelle
 *      « Actualiser l'audience » du hub devient un simple rattrapage) ;
 *   2. publications récentes (SocialPost — métriques publiques par post).
 *
 * Best-effort PAR MARQUE : un échec de connexion n'arrête jamais le lot ;
 * chaque résultat P22-1 est rapporté tel quel (LIVE/DEGRADED/DEFERRED).
 * Précédent : /api/cron/external-feeds (collecte de télémétrie appelée
 * directement depuis le cron — écritures FollowerSnapshot/SocialPost =
 * données d'observation, pas des mutations métier).
 *
 * Déclenchement : Coolify/pm2 — curl quotidien avec CRON_SECRET.
 */
import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import {
  syncStrategySocialFollowers,
  syncStrategySocialPosts,
} from "@/server/services/anubis/social-connect";

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const strategies = await db.socialConnection.groupBy({
      by: ["strategyId"],
      where: { status: "ACTIVE" },
    });

    const results: Array<{
      strategyId: string;
      followers: string;
      posts: string;
    }> = [];

    for (const s of strategies) {
      const [followers, posts] = await Promise.all([
        syncStrategySocialFollowers(s.strategyId).catch(() => ({ state: "DEGRADED" as const, reason: "VENDOR_OUTAGE" as const })),
        syncStrategySocialPosts(s.strategyId).catch(() => ({ state: "DEGRADED" as const, reason: "VENDOR_OUTAGE" as const })),
      ]);
      results.push({
        strategyId: s.strategyId,
        followers: followers.state,
        posts: posts.state,
      });
    }

    return NextResponse.json({
      ok: true,
      brands: results.length,
      live: results.filter((r) => r.followers === "LIVE" || r.posts === "LIVE").length,
      results,
      at: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
