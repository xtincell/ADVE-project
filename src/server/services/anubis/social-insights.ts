/**
 * social-insights — métriques PRIVÉES par publication (ADR-0133).
 *
 * Owning Neter : ANUBIS. Consomme les scopes Insights quand la connexion les
 * porte (read_insights pour les Pages FB, instagram_manage_insights pour IG
 * Business — actifs en mode testeurs, App Review groupée pour le public).
 * Connexion sans le scope → on n'appelle PAS l'endpoint et on ne fabrique
 * rien : `SocialPost.insights` reste null (jamais un zéro inventé).
 *
 * Écrit `SocialPost.insights` (JSON par plateforme) et promeut `reach` quand
 * la plateforme fournit la portée réelle. Appelé best-effort par le handler
 * ANUBIS_SYNC_SOCIAL_POSTS après la collecte des publications.
 */

import { db } from "@/lib/db";
import type { ConnectorResult } from "@/domain";
import { decryptTokenPayload } from "@/server/services/oauth-integrations";
import type { SocialTokenPayload } from "./social-connect";

const FETCH_TIMEOUT_MS = 8_000;
const POSTS_MEASURED_PER_SYNC = 25;

export interface InsightsRow {
  platform: string;
  postsMeasured: number;
}

async function guard(url: string): Promise<Record<string, unknown> | "AUTH" | "OUTAGE"> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (res.status === 401 || res.status === 403) return "AUTH";
    if (!res.ok) return "OUTAGE";
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return "OUTAGE";
  }
}

/** Extrait { name → value } d'une réponse Graph insights. */
function metricMap(json: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  const data = (json.data as Array<Record<string, unknown>> | undefined) ?? [];
  for (const m of data) {
    const name = typeof m.name === "string" ? m.name : null;
    const values = (m.values as Array<Record<string, unknown>> | undefined) ?? [];
    const v = values[0]?.value;
    if (name && typeof v === "number" && Number.isFinite(v)) out[name] = v;
  }
  return out;
}

/**
 * Mesure les publications récentes des connexions FB/IG qui portent le scope
 * Insights. Contract P22-1 : DEGRADED INSUFFICIENT_DATA quand aucun compte
 * n'a le scope (l'UI propose « Reconnecter ») — jamais un silence.
 */
export async function enrichRecentPostInsights(
  strategyId: string,
): Promise<ConnectorResult<InsightsRow[]>> {
  const connections = await db.socialConnection.findMany({
    where: { strategyId, status: "ACTIVE", platform: { in: ["FACEBOOK", "INSTAGRAM"] } },
  });
  if (connections.length === 0) return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };

  const rows: InsightsRow[] = [];
  let sawAuthFailure = false;
  let sawOutage = false;
  let anyScoped = false;

  for (const conn of connections) {
    if (!conn.accessToken) { sawAuthFailure = true; continue; }
    const meta = (conn.metadata ?? {}) as Record<string, unknown>;
    const scopes = Array.isArray(meta.scopes) ? meta.scopes.map(String) : [];
    const needed = conn.platform === "FACEBOOK" ? "read_insights" : "instagram_manage_insights";
    if (!scopes.includes(needed)) continue; // pas le scope → pas d'appel, pas d'invention
    anyScoped = true;

    let payload: SocialTokenPayload;
    try {
      payload = decryptTokenPayload<SocialTokenPayload>(conn.accessToken);
    } catch { sawAuthFailure = true; continue; }

    const posts = await db.socialPost.findMany({
      where: { connectionId: conn.id },
      orderBy: [{ publishedAt: "desc" }],
      take: POSTS_MEASURED_PER_SYNC,
      select: { id: true, externalPostId: true, insights: true },
    });

    let measured = 0;
    for (const post of posts) {
      const metrics =
        conn.platform === "FACEBOOK"
          ? "post_impressions,post_impressions_unique,post_clicks"
          : "reach,saved,total_interactions";
      const json = await guard(
        `https://graph.facebook.com/v21.0/${encodeURIComponent(post.externalPostId)}/insights?metric=${metrics}&access_token=${encodeURIComponent(payload.access_token)}`,
      );
      if (json === "AUTH") { sawAuthFailure = true; break; }
      if (json === "OUTAGE") { sawOutage = true; continue; }
      const m = metricMap(json);
      if (Object.keys(m).length === 0) continue;

      const reach =
        conn.platform === "FACEBOOK" ? m.post_impressions_unique ?? null : m.reach ?? null;
      await db.socialPost.update({
        where: { id: post.id },
        data: {
          insights: m,
          ...(reach != null && reach > 0 ? { reach: Math.round(reach) } : {}),
        },
      });
      measured++;
    }
    rows.push({ platform: String(conn.platform), postsMeasured: measured });
  }

  if (rows.length > 0) return { state: "LIVE", data: rows, observedAt: new Date().toISOString() };
  if (!anyScoped) return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };
  if (sawAuthFailure) return { state: "DEGRADED", reason: "AUTH_REVOKED" };
  if (sawOutage) return { state: "DEGRADED", reason: "VENDOR_OUTAGE" };
  return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };
}
