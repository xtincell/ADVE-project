export const dynamic = "force-dynamic";
/**
 * Cron — Sync sociale des marques connectées (P1 validé, étendu ADR-0133).
 *
 * Deux modes (le même endpoint sert deux cadences ops) :
 *   - `?mode=publish` (cadence courte, ~15 min) : publie UNIQUEMENT les
 *     actions calendrier planifiées arrivées à échéance (BrandAction
 *     SCHEDULED + metadata.socialPublish.pending) — chaque publication est
 *     RÉ-ÉMISE via mestor.emitIntent (spine + cost-gate, jamais un bypass).
 *   - défaut (cadence quotidienne) : tout — audience (FollowerSnapshot),
 *     publications (SocialPost), Insights privés best-effort (scope-gated),
 *     inbox commentaires (SocialInboxItem), ventes Shopify, PUIS les
 *     publications dues.
 *
 * Best-effort PAR MARQUE : un échec de connexion n'arrête jamais le lot ;
 * chaque résultat P22-1 est rapporté tel quel (LIVE/DEGRADED/DEFERRED).
 *
 * Déclenchement : Coolify/pm2 — curl avec CRON_SECRET (quotidien plein +
 * toutes les 15 min en mode publish).
 */
import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import {
  syncStrategySocialFollowers,
  syncStrategySocialPosts,
} from "@/server/services/anubis/social-connect";
import { syncStrategyShopifyOrders } from "@/server/services/anubis/commerce-connect";

const DEGRADED = { state: "DEGRADED" as const, reason: "VENDOR_OUTAGE" as const };

/** Publications planifiées arrivées à échéance — ré-émission gouvernée. */
async function runDuePublications(): Promise<Array<{ brandActionId: string; status: string }>> {
  const { listDueScheduledPublications } = await import("@/server/services/anubis/social-publish");
  const { emitIntentTyped } = await import("@/server/services/mestor/intents");
  const due = await listDueScheduledPublications();
  const out: Array<{ brandActionId: string; status: string }> = [];
  for (const job of due) {
    try {
      await emitIntentTyped(
        {
          kind: "ANUBIS_PUBLISH_SOCIAL_POST",
          strategyId: job.input.strategyId,
          userId: job.input.userId,
          targets: job.input.targets,
          text: job.input.text,
          linkUrl: job.input.linkUrl,
          imageUrl: job.input.imageUrl,
          scheduleAt: null,
          brandActionId: job.brandActionId,
        },
        { caller: "cron:social-sync:publish" },
      );
      out.push({ brandActionId: job.brandActionId, status: "EMITTED" });
    } catch (err) {
      out.push({
        brandActionId: job.brandActionId,
        status: `FAILED: ${err instanceof Error ? err.message.slice(0, 120) : "?"}`,
      });
    }
  }
  return out;
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const mode = new URL(request.url).searchParams.get("mode");

  try {
    // ── Cadence courte : uniquement les publications dues ──
    if (mode === "publish") {
      const published = await runDuePublications();
      return NextResponse.json({
        ok: true,
        mode: "publish",
        due: published.length,
        published,
        at: new Date().toISOString(),
      });
    }

    // ── Cadence quotidienne : collecte complète ──
    const [social, shops] = await Promise.all([
      db.socialConnection.groupBy({ by: ["strategyId"], where: { status: "ACTIVE" } }),
      db.mediaPlatformConnection.groupBy({
        by: ["strategyId"],
        where: { status: "ACTIVE", platform: "SHOPIFY" },
      }),
    ]);
    const strategies = [...new Set([...social, ...shops].map((r) => r.strategyId))]
      .map((strategyId) => ({ strategyId }));

    const results: Array<{
      strategyId: string;
      followers: string;
      posts: string;
      insights: string;
      inbox: string;
      commerce: string;
      community: string;
    }> = [];

    for (const s of strategies) {
      const [followers, posts, commerce] = await Promise.all([
        syncStrategySocialFollowers(s.strategyId).catch(() => DEGRADED),
        syncStrategySocialPosts(s.strategyId).catch(() => DEGRADED),
        syncStrategyShopifyOrders(s.strategyId).catch(() => DEGRADED),
      ]);
      // Insights + inbox APRÈS la collecte des posts (ils s'appuient dessus).
      const { enrichRecentPostInsights } = await import("@/server/services/anubis/social-insights");
      const { syncStrategyInbox } = await import("@/server/services/anubis/social-inbox");
      const [insights, inbox] = await Promise.all([
        enrichRecentPostInsights(s.strategyId).catch(() => DEGRADED),
        syncStrategyInbox(s.strategyId).catch(() => DEGRADED),
      ]);
      // Mesure communautaire APRÈS toute la collecte du jour (ADR-0134) —
      // ré-émise via le spine (emitIntent), jamais un appel service direct :
      // chaîne community → devotion → cult sur la donnée fraîche.
      const community = await (async () => {
        try {
          const { emitIntentTyped } = await import("@/server/services/mestor/intents");
          const out = await emitIntentTyped<{ capture: { state: string } }>(
            { kind: "SESHAT_CAPTURE_COMMUNITY_SNAPSHOT", strategyId: s.strategyId },
            { caller: "cron:social-sync:community" },
          );
          return { state: out.capture.state };
        } catch {
          return DEGRADED;
        }
      })();
      results.push({
        strategyId: s.strategyId,
        followers: followers.state,
        posts: posts.state,
        insights: insights.state,
        inbox: inbox.state,
        commerce: commerce.state,
        community: community.state,
      });
    }

    const published = await runDuePublications();

    return NextResponse.json({
      ok: true,
      brands: results.length,
      live: results.filter((r) => r.followers === "LIVE" || r.posts === "LIVE").length,
      results,
      publishedDue: published,
      at: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
