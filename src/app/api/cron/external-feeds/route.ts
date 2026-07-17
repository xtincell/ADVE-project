export const dynamic = "force-dynamic";
/**
 * Cron — Rafraîchit les digests de feed externe pour toutes les paires
 * pays×secteur prioritaires et les PERSISTE (KnowledgeEntry EXTERNAL_FEED_DIGEST) :
 *   - Trend Tracker chiffré, collecté de façon déterministe (World Bank, sans clé)
 *   - Signaux macro/faibles depuis les vrais flux RSS (fallback LLM qualitatif)
 *
 * Avant ce cron, `refreshAllPriorityPairs()` était du CODE MORT (jamais appelé)
 * malgré son commentaire « used by the daily cron » → le pilier Track (T) n'avait
 * aucune donnée marché fraîche à lire et retombait sur des estimations LLM.
 *
 * Déclenchement :
 *   - Local (serveur pm2) : ping par serve-all.ps1 (HERMESU), 1×/jour.
 *   - Vercel : ajouter { "path": "/api/cron/external-feeds", "schedule": "0 6 * * *" }
 *     dans vercel.json crons.
 * Cadence recommandée : quotidienne (les agrégats macro bougent lentement).
 */
import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { refreshAllPriorityPairs } from "@/server/services/seshat/external-feeds";
import { refreshActiveBrandFeeds } from "@/server/services/seshat/external-feeds/brand-feed";
import { refreshSectorsFromRecentDigests } from "@/server/services/seshat/tarsis/sector-refresh";

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const results = await refreshAllPriorityPairs();
    // ADR-0134 §B6 — APRÈS l'ingestion des digests : registre Sector +
    // rafraîchissement de l'axe Overton sectoriel depuis le RSS réel
    // (le pont Phase 23 a enfin son caller — audit 2026-07-13, T10).
    // Best-effort : un échec ne casse jamais la collecte des feeds.
    const sectors = await refreshSectorsFromRecentDigests().catch(
      () => [] as Awaited<ReturnType<typeof refreshSectorsFromRecentDigests>>,
    );
    // ADR-0143 — préchauffe la veille MULTI-SUJETS par marque (marque + secteur,
    // multi-langue, pertinence déterministe) → le dashboard sert du cache.
    const brandFeeds = await refreshActiveBrandFeeds(db).catch(() => ({ built: 0, skipped: 0 }));
    // Rationalisation 2026-07-16 (audit Seshat) : auto-enregistre un collecteur
    // de signaux marché DAILY pour chaque marque active qui n'en a pas —
    // « chaque marque collecte ce dont elle a besoin » devient structurel, plus
    // dépendant d'un clic opérateur. Gated : seulement si un provider texte est
    // sain (on n'enfile pas des jobs LLM condamnés). Best-effort.
    const { isTextLLMAvailable } = await import("@/server/services/llm-gateway");
    const daemons = isTextLLMAvailable()
      ? await import("@/server/services/seshat/tarsis/daemon-backfill")
          .then((m) => m.ensureSignalDaemonsForActiveStrategies())
          .catch(() => ({ registered: 0, existing: 0, skipped: 0 }))
      : { registered: 0, existing: 0, skipped: 0 };
    // ADR-0156 — moteur prédictif : benchmarks marché auto (répertoire →
    // MarketBenchmark p10/p50/p90), forecasts d'audience du jour (idempotent),
    // et résolution des forecasts échus contre la vérité terrain. Best-effort,
    // 100 % déterministe, zéro LLM.
    const prediction = await (async () => {
      try {
        const { aggregateFootprintBenchmarks } = await import(
          "@/server/services/seshat/brand-registry/benchmark-aggregator"
        );
        const { recordAudienceForecasts, resolveMaturedForecasts } = await import(
          "@/server/services/seshat/prediction"
        );
        const benchmarks = await aggregateFootprintBenchmarks();
        const forecasts = await recordAudienceForecasts();
        const resolutions = await resolveMaturedForecasts();
        return { benchmarks: benchmarks.upserted, forecasts: forecasts.recorded, resolved: resolutions.resolved };
      } catch {
        return { benchmarks: 0, forecasts: 0, resolved: 0 };
      }
    })();
    const summary = {
      pairs: results.length,
      okPairs: results.filter((r) => r.status === "OK").length,
      cached: results.filter((r) => r.mode === "CACHED").length,
      rss: results.filter((r) => r.mode === "RSS").length,
      // ADR-0143 — plus de fallback LLM : RSS vide → macro déterministe seul.
      rssEmpty: results.filter((r) => r.mode === "RSS_EMPTY").length,
      trendTrackerVarsTotal: results.reduce((n, r) => n + (r.trendTrackerVarsCovered ?? 0), 0),
      errors: results.filter((r) => r.error).map((r) => `${r.countryCode}/${r.sector}: ${r.error}`),
      brandFeedsBuilt: brandFeeds.built,
      brandFeedsSkipped: brandFeeds.skipped,
      signalDaemonsRegistered: daemons.registered,
      signalDaemonsExisting: daemons.existing,
      benchmarksUpserted: prediction.benchmarks,
      forecastsRecorded: prediction.forecasts,
      forecastsResolved: prediction.resolved,
      sectorsRefreshed: sectors.filter((s) => s.state === "REFRESHED").length,
      sectorsSkipped: sectors
        .filter((s) => s.state === "SKIPPED")
        .map((s) => `${s.sectorSlug}: ${s.reason ?? "?"}`),
    };
    return NextResponse.json({ ok: true, ...summary, at: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
