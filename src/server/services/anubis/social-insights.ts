/**
 * social-insights — métriques PRIVÉES par publication (ADR-0133).
 *
 * Owning Neter : ANUBIS. Consomme les scopes Insights quand la connexion les
 * porte (read_insights pour les Pages FB, instagram_manage_insights via Meta,
 * instagram_business_manage_insights pour Instagram Login).
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

async function guard(url: string): Promise<Record<string, unknown> | "AUTH" | "OUTAGE" | "RATE_LIMIT"> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (res.status === 401 || res.status === 403) return "AUTH";
    if (res.status === 429) return "RATE_LIMIT";
    const json: unknown = await res.json();
    if (!json || typeof json !== "object" || Array.isArray(json)) return "OUTAGE";
    const body = json as Record<string, unknown>;
    // Graph also returns revoked/expired tokens as HTTP 400 (OAuth code 190).
    const error = body.error;
    if (error && typeof error === "object" && "code" in error && error.code === 190) return "AUTH";
    if (!res.ok) return "OUTAGE";
    return body;
  } catch {
    return "OUTAGE";
  }
}

/** Extrait { name → value } d'une réponse Graph insights. */
function metricMap(json: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  const data: unknown[] = Array.isArray(json.data) ? json.data : [];
  for (const m of data) {
    if (!m || typeof m !== "object") continue;
    const row = m as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name : null;
    const values = Array.isArray(row.values) ? row.values : [];
    const v = values[0]?.value;
    if (name && typeof v === "number" && Number.isFinite(v) && v >= 0) out[name] = v;
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
  let sawRateLimit = false;
  let anyScoped = false;

  for (const conn of connections) {
    const meta = (conn.metadata ?? {}) as Record<string, unknown>;
    const scopes = Array.isArray(meta.scopes) ? meta.scopes.map(String) : [];
    const instagramLogin = conn.platform === "INSTAGRAM" && meta.provider === "instagram";
    const needed = conn.platform === "FACEBOOK" ? "read_insights"
      : instagramLogin ? "instagram_business_manage_insights" : "instagram_manage_insights";
    if (!scopes.includes(needed)) continue; // pas le scope → pas d'appel, pas d'invention
    anyScoped = true;
    if (!conn.accessToken) { sawAuthFailure = true; continue; }

    let payload: SocialTokenPayload;
    try {
      payload = decryptTokenPayload<SocialTokenPayload>(conn.accessToken);
    } catch { sawAuthFailure = true; continue; }
    if (!payload || typeof payload.access_token !== "string" || !payload.access_token.trim()) { sawAuthFailure = true; continue; }

    // Same provider distinction as social-connect / social-inbox / publishing.
    const graphBase = instagramLogin ? "https://graph.instagram.com" : "https://graph.facebook.com/v21.0";

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
        `${graphBase}/${encodeURIComponent(post.externalPostId)}/insights?metric=${metrics}&access_token=${encodeURIComponent(payload.access_token)}`,
      );
      if (json === "AUTH") { sawAuthFailure = true; break; }
      if (json === "OUTAGE") { sawOutage = true; continue; }
      if (json === "RATE_LIMIT") { sawRateLimit = true; break; }
      const m = metricMap(json);
      if (Object.keys(m).length === 0) continue;

      const reach =
        conn.platform === "FACEBOOK" ? m.post_impressions_unique ?? null : m.reach ?? null;
      await db.socialPost.update({
        where: { id: post.id },
        data: {
          insights: m,
          ...(reach != null ? { reach: Math.round(reach) } : {}),
        },
      });
      // Separate telemetry emission. Failure is visible in the spine and does not undo native insights.
      const { openEmission, closeEmission } = await import("@/server/governance/emission-spine");
      const { captureNativeInsights } = await import("@/server/services/seshat/creative-intelligence");
      const emission = await openEmission({ kind: "SESHAT_CAPTURE_NATIVE_CREATIVE_INSIGHTS", strategyId, payload: { postId: post.id }, caller: "anubis:insights" });
      try {
        const captured = await captureNativeInsights(strategyId, post.id, m, new Date());
        await closeEmission({ intentId: emission, status: "OK", result: captured, costUsd: 0 });
      } catch (error) {
        await closeEmission({ intentId: emission, status: "FAILED", result: { error: error instanceof Error ? error.message : "Capture indisponible" } });
      }
      measured++;
    }
    if (measured > 0) rows.push({ platform: String(conn.platform), postsMeasured: measured });
  }

  if (!anyScoped) return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };
  if (sawAuthFailure) return { state: "DEGRADED", reason: "AUTH_REVOKED" };
  if (sawRateLimit) return { state: "DEGRADED", reason: "RATE_LIMITED" };
  if (sawOutage) return { state: "DEGRADED", reason: "VENDOR_OUTAGE" };
  if (rows.length > 0) return { state: "LIVE", data: rows, observedAt: new Date().toISOString() };
  return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };
}
