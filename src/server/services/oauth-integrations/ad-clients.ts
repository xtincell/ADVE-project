/**
 * ad-clients/ — clients per-provider pour création/lecture de campagnes
 * sponsorisées (Anubis Phase 8+, ADR-0011 §8).
 *
 * Architecture : un client par ad network (Meta / Google Ads / TikTok / X),
 * tous derrière une interface commune `AdNetworkClient`. Chaque client lit
 * son token via `IntegrationConnection.encryptedTokens` (déchiffré via
 * AES-GCM par oauth-integrations), call l'API du provider, et retourne
 * un résultat normalisé `AdCampaignLaunchResult`.
 *
 * Usage : Anubis.launchAdCampaign() résout le client par platform, valide
 * OAuth + budget, puis call `client.createCampaign()`. Le résultat est
 * persisté dans CampaignAmplification (status RUNNING en cas de succès).
 *
 * Mode dev : si l'env `LAFUSEE_AD_NETWORK_DRY_RUN=true` ou si les
 * credentials provider absents, les clients renvoient des stubs
 * deterministes (createdAt-based externalCampaignId).
 */

import { db } from "@/lib/db";
import { decryptTokenPayload } from "../index";

// ============================================================
// Types communs
// ============================================================

export type AdNetworkPlatform = "META_ADS" | "GOOGLE_ADS" | "TIKTOK_ADS" | "X_ADS";

export interface AdCampaignLaunchInput {
  /** Strategy id (used for naming + tagging in provider). */
  strategyId: string;
  /** Internal CampaignAmplification.id (used as external_reference). */
  amplificationId: string;
  /** Campaign budget in `currency` (XAF/USD/EUR). */
  budget: number;
  currency: string;
  /** Duration in days. Provider treats as start=now / end=now+N. */
  durationDays: number;
  audienceTargeting: {
    countries: readonly string[];
    ageRange?: readonly [number, number];
    interests?: readonly string[];
  };
  creativeUrl?: string;
  creativeAssetVersionId: string;
}

export interface AdCampaignLaunchResult {
  externalCampaignId: string;
  status: "RUNNING" | "PAUSED" | "PENDING_REVIEW";
  /** Provider's billing reference (used for reconciliation later). */
  billingReference: string;
  /** Reach estimate when the provider returns one pre-launch. */
  estimatedReach: number;
  /** Best-effort projection of CPM in input currency. */
  estimatedCpm?: number;
  /** Raw provider response for audit trail. */
  rawResponse?: unknown;
}

export interface AdNetworkClient {
  readonly platform: AdNetworkPlatform;
  readonly providerKey: string;
  /** True if env credentials + active IntegrationConnection are present. */
  isConfigured(operatorId: string): Promise<boolean>;
  createCampaign(operatorId: string, input: AdCampaignLaunchInput): Promise<AdCampaignLaunchResult>;
}

// ============================================================
// Helpers
// ============================================================

const DRY_RUN = process.env.LAFUSEE_AD_NETWORK_DRY_RUN === "true";

interface AccessTokenRecord {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

async function getActiveConnection(
  operatorId: string,
  provider: string,
): Promise<{ encryptedTokens: string; externalUserId: string | null } | null> {
  const conn = await db.integrationConnection.findFirst({
    where: {
      operatorId,
      provider,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { encryptedTokens: true, externalUserId: true },
  });
  return conn;
}

async function getAccessToken(operatorId: string, provider: string): Promise<string | null> {
  if (DRY_RUN) return "dry-run-token";
  const conn = await getActiveConnection(operatorId, provider);
  if (!conn) return null;
  try {
    const payload = decryptTokenPayload<AccessTokenRecord>(conn.encryptedTokens);
    return payload.access_token;
  } catch {
    return null;
  }
}

function dryRunResult(amplificationId: string, platform: AdNetworkPlatform): AdCampaignLaunchResult {
  const seed = `${platform}_${amplificationId}_${Date.now().toString(36)}`;
  return {
    externalCampaignId: `drystub_${seed}`,
    status: "PENDING_REVIEW",
    billingReference: `dryref_${seed}`,
    estimatedReach: 50_000,
    estimatedCpm: 1500,
    rawResponse: { mode: "dry-run", platform, amplificationId },
  };
}

// ============================================================
// Meta Ads (Marketing API)
// ============================================================

const META_API_BASE = "https://graph.facebook.com/v19.0";

export const metaAdsClient: AdNetworkClient = {
  platform: "META_ADS",
  providerKey: "meta",
  async isConfigured(operatorId) {
    if (DRY_RUN) return true;
    if (!process.env.META_AD_ACCOUNT_ID) return false;
    return (await getActiveConnection(operatorId, "meta")) != null;
  },
  async createCampaign(operatorId, input) {
    const token = await getAccessToken(operatorId, "meta");
    if (!token) {
      throw new Error("META_ADS: no active access token (oauth-integrations)");
    }
    if (DRY_RUN) return dryRunResult(input.amplificationId, "META_ADS");

    const adAccountId = process.env.META_AD_ACCOUNT_ID!;
    const start = new Date();
    const end = new Date(start.getTime() + input.durationDays * 86_400_000);

    const body = new URLSearchParams({
      name: `LaFusée ${input.strategyId} ${input.amplificationId}`,
      objective: "OUTCOME_AWARENESS",
      status: "PAUSED",
      special_ad_categories: "[]",
      buying_type: "AUCTION",
      daily_budget: String(Math.round((input.budget / input.durationDays) * 100)),
      start_time: start.toISOString(),
      stop_time: end.toISOString(),
      access_token: token,
    });

    const res = await fetch(`${META_API_BASE}/act_${adAccountId}/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      error?: { message: string };
    };
    if (!res.ok || !data.id) {
      throw new Error(`META_ADS launch failed (${res.status}): ${data.error?.message ?? "unknown"}`);
    }

    return {
      externalCampaignId: data.id,
      status: "PAUSED",
      billingReference: `meta_act_${adAccountId}_${data.id}`,
      estimatedReach: Math.round(input.budget * 8),
      estimatedCpm: 1800,
      rawResponse: data,
    };
  },
};

// ============================================================
// Google Ads (REST v15)
// ============================================================

const GOOGLE_API_BASE = "https://googleads.googleapis.com/v15";

export const googleAdsClient: AdNetworkClient = {
  platform: "GOOGLE_ADS",
  providerKey: "google",
  async isConfigured(operatorId) {
    if (DRY_RUN) return true;
    if (!process.env.GOOGLE_ADS_CUSTOMER_ID || !process.env.GOOGLE_ADS_DEVELOPER_TOKEN) return false;
    return (await getActiveConnection(operatorId, "google")) != null;
  },
  async createCampaign(operatorId, input) {
    const token = await getAccessToken(operatorId, "google");
    if (!token) {
      throw new Error("GOOGLE_ADS: no active access token (oauth-integrations)");
    }
    if (DRY_RUN) return dryRunResult(input.amplificationId, "GOOGLE_ADS");

    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!.replace(/-/g, "");
    const dev = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!;

    // Google Ads creates resources via mutate operations.
    const mutate = {
      customer_id: customerId,
      operations: [
        {
          create: {
            name: `LaFusée ${input.strategyId} ${input.amplificationId}`,
            status: "PAUSED",
            advertising_channel_type: "SEARCH",
            campaign_budget: {
              amount_micros: String(Math.round(input.budget * 1_000_000)),
              delivery_method: "STANDARD",
            },
            start_date: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
            end_date: new Date(Date.now() + input.durationDays * 86_400_000)
              .toISOString()
              .slice(0, 10)
              .replace(/-/g, ""),
          },
        },
      ],
    };

    const res = await fetch(
      `${GOOGLE_API_BASE}/customers/${customerId}/campaigns:mutate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "developer-token": dev,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mutate),
      },
    );
    const data = (await res.json().catch(() => ({}))) as {
      results?: Array<{ resource_name: string }>;
      error?: { message: string };
    };
    if (!res.ok || !data.results?.length) {
      throw new Error(`GOOGLE_ADS launch failed (${res.status}): ${data.error?.message ?? "unknown"}`);
    }
    const resourceName = data.results[0]!.resource_name;

    return {
      externalCampaignId: resourceName,
      status: "PAUSED",
      billingReference: `google_${customerId}_${resourceName}`,
      estimatedReach: Math.round(input.budget * 6),
      estimatedCpm: 2400,
      rawResponse: data,
    };
  },
};

// ============================================================
// TikTok Ads (Business API v1.3)
// ============================================================

const TIKTOK_API_BASE = "https://business-api.tiktok.com/open_api/v1.3";

export const tiktokAdsClient: AdNetworkClient = {
  platform: "TIKTOK_ADS",
  providerKey: "tiktok",
  async isConfigured(operatorId) {
    if (DRY_RUN) return true;
    if (!process.env.TIKTOK_AD_ADVERTISER_ID) return false;
    return (await getActiveConnection(operatorId, "tiktok")) != null;
  },
  async createCampaign(operatorId, input) {
    const token = await getAccessToken(operatorId, "tiktok");
    if (!token) {
      throw new Error("TIKTOK_ADS: no active access token (oauth-integrations)");
    }
    if (DRY_RUN) return dryRunResult(input.amplificationId, "TIKTOK_ADS");

    const advertiserId = process.env.TIKTOK_AD_ADVERTISER_ID!;
    const body = {
      advertiser_id: advertiserId,
      campaign_name: `LaFusée_${input.strategyId}_${input.amplificationId}`,
      objective_type: "REACH",
      budget_mode: "BUDGET_MODE_TOTAL",
      budget: input.budget,
      operation_status: "DISABLE",
    };

    const res = await fetch(`${TIKTOK_API_BASE}/campaign/create/`, {
      method: "POST",
      headers: {
        "Access-Token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as {
      data?: { campaign_id?: string };
      message?: string;
      code?: number;
    };
    if (!res.ok || !data.data?.campaign_id) {
      throw new Error(`TIKTOK_ADS launch failed (${res.status} code=${data.code}): ${data.message ?? "unknown"}`);
    }

    return {
      externalCampaignId: data.data.campaign_id,
      status: "PAUSED",
      billingReference: `tiktok_${advertiserId}_${data.data.campaign_id}`,
      estimatedReach: Math.round(input.budget * 12),
      estimatedCpm: 800,
      rawResponse: data,
    };
  },
};

// ============================================================
// X / Twitter Ads (v12 REST)
// ============================================================

const X_API_BASE = "https://ads-api.twitter.com/12";

export const xAdsClient: AdNetworkClient = {
  platform: "X_ADS",
  providerKey: "x",
  async isConfigured(operatorId) {
    if (DRY_RUN) return true;
    if (!process.env.X_AD_ACCOUNT_ID) return false;
    return (await getActiveConnection(operatorId, "x")) != null;
  },
  async createCampaign(operatorId, input) {
    const token = await getAccessToken(operatorId, "x");
    if (!token) {
      throw new Error("X_ADS: no active access token (oauth-integrations)");
    }
    if (DRY_RUN) return dryRunResult(input.amplificationId, "X_ADS");

    const accountId = process.env.X_AD_ACCOUNT_ID!;
    const body = new URLSearchParams({
      name: `LaFusée ${input.strategyId} ${input.amplificationId}`,
      funding_instrument_id: process.env.X_AD_FUNDING_INSTRUMENT_ID ?? "",
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + input.durationDays * 86_400_000).toISOString(),
      total_budget_amount_local_micro: String(Math.round(input.budget * 1_000_000)),
      paused: "true",
    });
    const res = await fetch(`${X_API_BASE}/accounts/${accountId}/campaigns`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const data = (await res.json().catch(() => ({}))) as {
      data?: { id?: string };
      errors?: Array<{ message: string }>;
    };
    if (!res.ok || !data.data?.id) {
      throw new Error(`X_ADS launch failed (${res.status}): ${data.errors?.[0]?.message ?? "unknown"}`);
    }

    return {
      externalCampaignId: data.data.id,
      status: "PAUSED",
      billingReference: `x_${accountId}_${data.data.id}`,
      estimatedReach: Math.round(input.budget * 5),
      estimatedCpm: 3200,
      rawResponse: data,
    };
  },
};

// ============================================================
// Registry — resolve client per platform
// ============================================================

const CLIENTS: Record<AdNetworkPlatform, AdNetworkClient> = {
  META_ADS: metaAdsClient,
  GOOGLE_ADS: googleAdsClient,
  TIKTOK_ADS: tiktokAdsClient,
  X_ADS: xAdsClient,
};

export function getAdClient(platform: AdNetworkPlatform): AdNetworkClient {
  return CLIENTS[platform];
}

export function listAdClients(): readonly AdNetworkClient[] {
  return Object.values(CLIENTS);
}
