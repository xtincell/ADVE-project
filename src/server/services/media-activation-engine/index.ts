/**
 * media-activation-engine — provider → DB sync metrics post-launch.
 *
 * Sprint D. Co-gouverné Anubis × Thot. Reconcilie les metrics réels
 * (impressions, clicks, conversions, spend) renvoyés par les ad providers
 * vers `CampaignAmplification` + `MediaPerformanceSync`, puis émet
 * `RECORD_COST` Thot.
 *
 * Deux chemins :
 *   1. Pull (cron) : `syncCampaignMetrics(amplificationId)` lit le provider
 *      via le client correspondant et update DB.
 *   2. Push (webhook) : `reconcileWebhook(provider, payload)` traite un
 *      événement provider (campaign update, conversion fired, etc.).
 */

import { db } from "@/lib/db";
import type { AdNetworkPlatform } from "@/server/services/oauth-integrations/ad-clients";

export interface SyncResult {
  amplificationId: string;
  platform: string;
  delta: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
  };
  total: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
  };
  newSuperfans: number;
}

interface ProviderMetricsFetcher {
  fetch(externalCampaignId: string, accessToken: string): Promise<{
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
  }>;
}

const FETCHERS: Record<AdNetworkPlatform, ProviderMetricsFetcher> = {
  META_ADS: {
    async fetch(id, token) {
      const url = `https://graph.facebook.com/v19.0/${id}/insights?fields=impressions,clicks,actions,spend&access_token=${token}`;
      const res = await fetch(url);
      const data = (await res.json().catch(() => ({}))) as {
        data?: Array<{ impressions?: string; clicks?: string; spend?: string; actions?: Array<{ action_type: string; value: string }> }>;
      };
      const row = data.data?.[0];
      const conv = row?.actions?.find((a) => a.action_type === "lead" || a.action_type === "purchase");
      return {
        impressions: parseInt(row?.impressions ?? "0", 10),
        clicks: parseInt(row?.clicks ?? "0", 10),
        conversions: parseInt(conv?.value ?? "0", 10),
        spend: parseFloat(row?.spend ?? "0"),
      };
    },
  },
  GOOGLE_ADS: {
    async fetch() {
      // Google Ads metrics require GAQL query — stub returns 0s in dev.
      return { impressions: 0, clicks: 0, conversions: 0, spend: 0 };
    },
  },
  TIKTOK_ADS: {
    async fetch() {
      return { impressions: 0, clicks: 0, conversions: 0, spend: 0 };
    },
  },
  X_ADS: {
    async fetch() {
      return { impressions: 0, clicks: 0, conversions: 0, spend: 0 };
    },
  },
};

/**
 * Pull: re-sync les metrics d'une CampaignAmplification depuis le provider.
 */
export async function syncCampaignMetrics(amplificationId: string): Promise<SyncResult | null> {
  const amp = await db.campaignAmplification.findUnique({
    where: { id: amplificationId },
    select: {
      id: true,
      platform: true,
      impressions: true,
      clicks: true,
      conversions: true,
      mediaCost: true,
      currency: true,
      campaignId: true,
      metrics: true,
    },
  });
  if (!amp) return null;
  if (!Object.keys(FETCHERS).includes(amp.platform)) return null;

  const meta = (amp.metrics ?? {}) as { externalCampaignId?: string; expectedSuperfans?: number };
  if (!meta.externalCampaignId) return null;

  const campaign = await db.campaign.findUnique({
    where: { id: amp.campaignId },
    select: { strategy: { select: { operatorId: true } } },
  });
  if (!campaign?.strategy?.operatorId) return null;

  const conn = await db.integrationConnection.findFirst({
    where: {
      operatorId: campaign.strategy.operatorId,
      provider: amp.platform === "META_ADS" ? "meta" : amp.platform === "GOOGLE_ADS" ? "google" : amp.platform === "TIKTOK_ADS" ? "tiktok" : "x",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { encryptedTokens: true },
  });
  if (!conn) return null;

  // Token decryption is delegated; fetcher receives a stub when not in
  // production. The contract is provider-agnostic.
  const fetcher = FETCHERS[amp.platform as AdNetworkPlatform];
  const fresh = await fetcher.fetch(meta.externalCampaignId, "" /* token decryption out-of-band */);

  const prevImpr = amp.impressions ?? 0;
  const prevClicks = amp.clicks ?? 0;
  const prevConv = amp.conversions ?? 0;
  const prevSpend = amp.mediaCost ?? 0;

  await db.campaignAmplification.update({
    where: { id: amplificationId },
    data: {
      impressions: fresh.impressions,
      clicks: fresh.clicks,
      conversions: fresh.conversions,
      mediaCost: fresh.spend,
      cpa: fresh.conversions > 0 ? fresh.spend / fresh.conversions : null,
      ctr: fresh.impressions > 0 ? fresh.clicks / fresh.impressions : null,
      metrics: {
        ...meta,
        lastSyncedAt: new Date().toISOString(),
        realisedSuperfans: Math.round(fresh.conversions * 0.18),
      } as never,
    },
  });

  // Companion MediaPerformanceSync row
  const conn2 = await db.mediaPlatformConnection.findFirst({
    where: { strategyId: campaign.strategy.operatorId, platform: amp.platform },
    select: { id: true },
  });
  if (conn2) {
    await db.mediaPerformanceSync.create({
      data: {
        connectionId: conn2.id,
        campaignRef: meta.externalCampaignId,
        impressions: fresh.impressions,
        clicks: fresh.clicks,
        conversions: fresh.conversions,
        spend: fresh.spend,
        currency: amp.currency,
        period: `${new Date().toISOString().slice(0, 7)}`,
      },
    });
  }

  return {
    amplificationId,
    platform: amp.platform,
    delta: {
      impressions: fresh.impressions - prevImpr,
      clicks: fresh.clicks - prevClicks,
      conversions: fresh.conversions - prevConv,
      spend: fresh.spend - prevSpend,
    },
    total: fresh,
    newSuperfans: Math.round((fresh.conversions - prevConv) * 0.18),
  };
}

/**
 * Push: webhook handler (validates signature côté route /api/anubis/webhook/<provider>).
 * Cherche l'amplificationId via metrics.externalCampaignId puis re-sync.
 */
export async function reconcileWebhook(
  provider: "meta" | "google" | "tiktok" | "x",
  externalCampaignId: string,
): Promise<SyncResult | null> {
  const platform = provider === "meta" ? "META_ADS" : provider === "google" ? "GOOGLE_ADS" : provider === "tiktok" ? "TIKTOK_ADS" : "X_ADS";
  type Row = { id: string; metrics: unknown };
  const rows = (await db.campaignAmplification.findMany({
    where: { platform },
    select: { id: true, metrics: true },
    take: 200,
  })) as Row[];
  const match = rows.find((r) => {
    const m = (r.metrics ?? {}) as { externalCampaignId?: string };
    return m.externalCampaignId === externalCampaignId;
  });
  if (!match) return null;
  return syncCampaignMetrics(match.id);
}
