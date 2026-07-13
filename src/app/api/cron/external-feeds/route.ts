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
import { refreshAllPriorityPairs } from "@/server/services/seshat/external-feeds";
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
    const summary = {
      pairs: results.length,
      okPairs: results.filter((r) => r.status === "OK").length,
      cached: results.filter((r) => r.mode === "CACHED").length,
      rss: results.filter((r) => r.mode === "RSS").length,
      llm: results.filter((r) => r.mode === "LLM").length,
      trendTrackerVarsTotal: results.reduce((n, r) => n + (r.trendTrackerVarsCovered ?? 0), 0),
      errors: results.filter((r) => r.error).map((r) => `${r.countryCode}/${r.sector}: ${r.error}`),
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
