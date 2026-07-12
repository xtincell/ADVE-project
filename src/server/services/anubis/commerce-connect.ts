/**
 * commerce-connect — boutique de la marque (Shopify) connectée par le
 * founder (vague « le cockpit ramène tout, l'utilisateur autorise »,
 * 2026-07-12 — même doctrine qu'ADR-0128 pour les réseaux).
 *
 * Owning Neter : ANUBIS (credentials externes, ADR-0021). Zéro LLM.
 *
 * Anti-doublon : réutilise le modèle générique DORMANT
 * `MediaPlatformConnection` (strategyId, platform, accountId, credentials
 * Json, status, lastSyncAt — unique(strategyId, platform, accountId)) —
 * premier écrivain de production, zéro migration. Les agrégats de vente
 * vivent en `Signal type=COMMERCE_METRICS` (modèle existant) : la carte
 * « Ventes & commandes » du Suivi du jour les lit.
 *
 * Doctrine tokens : chiffrés AES-GCM (INTEGRATION_TOKEN_KEY), jamais en
 * clair, jamais renvoyés au client. Le token Shopify offline n'expire pas
 * (révocable par désinstallation de l'app côté boutique).
 */

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { ConnectorResult } from "@/domain";
import {
  decryptTokenPayload,
  encryptTokenPayload,
} from "@/server/services/oauth-integrations";
import { emitIntentTyped } from "@/server/services/mestor/intents";

const FETCH_TIMEOUT_MS = 10_000;
const SHOPIFY_API_VERSION = "2025-01";
export const COMMERCE_PLATFORM = "SHOPIFY";

interface ShopTokenPayload {
  access_token: string;
  obtainedAt: number;
}

export interface ShopStatus {
  connected: boolean;
  shopDomain: string | null;
  shopName: string | null;
  status: string | null;
  lastSyncAt: string | null;
  providerReady: boolean;
}

export function shopifyProviderReady(): boolean {
  return Boolean(process.env.SHOPIFY_OAUTH_CLIENT_ID && process.env.SHOPIFY_OAUTH_CLIENT_SECRET);
}

/**
 * Persiste la connexion boutique via l'Intent gouverné
 * `ANUBIS_COMMERCE_CONNECT_SHOP` (token chiffré AVANT l'émission — jamais un
 * secret en clair dans l'IntentEmission hash-chaînée).
 */
export async function connectShopifyStore(params: {
  strategyId: string;
  shopDomain: string;
  shopName: string | null;
  accessToken: string;
  scopes: string[];
  userId: string;
}): Promise<void> {
  const encrypted = encryptTokenPayload({
    access_token: params.accessToken,
    obtainedAt: Date.now(),
  });
  await emitIntentTyped(
    {
      kind: "ANUBIS_COMMERCE_CONNECT_SHOP",
      strategyId: params.strategyId,
      userId: params.userId,
      shopDomain: params.shopDomain,
      shopName: params.shopName,
      encryptedToken: encrypted,
      scopes: params.scopes,
    },
    { caller: "oauth-callback:commerce" },
  );
}

/** Handler de l'Intent — upsert MediaPlatformConnection (premier écrivain). */
export async function handleCommerceConnectShop(payload: {
  strategyId: string;
  shopDomain: string;
  shopName: string | null;
  encryptedToken: string;
  scopes: string[];
}): Promise<{ shopDomain: string }> {
  await db.mediaPlatformConnection.upsert({
    where: {
      strategyId_platform_accountId: {
        strategyId: payload.strategyId,
        platform: COMMERCE_PLATFORM,
        accountId: payload.shopDomain,
      },
    },
    update: {
      credentials: {
        encryptedToken: payload.encryptedToken,
        shopName: payload.shopName,
        scopes: payload.scopes,
      } as Prisma.InputJsonValue,
      status: "ACTIVE",
    },
    create: {
      strategyId: payload.strategyId,
      platform: COMMERCE_PLATFORM,
      accountId: payload.shopDomain,
      credentials: {
        encryptedToken: payload.encryptedToken,
        shopName: payload.shopName,
        scopes: payload.scopes,
      } as Prisma.InputJsonValue,
      status: "ACTIVE",
    },
  });
  return { shopDomain: payload.shopDomain };
}

/** État de la boutique pour l'UI (zéro secret). */
export async function getShopStatus(strategyId: string): Promise<ShopStatus> {
  const conn = await db.mediaPlatformConnection.findFirst({
    where: { strategyId, platform: COMMERCE_PLATFORM },
    orderBy: { updatedAt: "desc" },
  });
  const creds = (conn?.credentials ?? {}) as Record<string, unknown>;
  return {
    connected: conn?.status === "ACTIVE",
    shopDomain: conn?.accountId ?? null,
    shopName: typeof creds.shopName === "string" ? creds.shopName : null,
    status: conn ? String(conn.status) : null,
    lastSyncAt: conn?.lastSyncAt?.toISOString() ?? null,
    providerReady: shopifyProviderReady(),
  };
}

export async function disconnectShop(strategyId: string): Promise<void> {
  await db.mediaPlatformConnection.updateMany({
    where: { strategyId, platform: COMMERCE_PLATFORM },
    data: { status: "DISCONNECTED", credentials: Prisma.JsonNull },
  });
}

export interface CommerceMetrics {
  shopDomain: string;
  ordersLast7d: number;
  revenueLast7d: number;
  currency: string | null;
  topProducts: Array<{ title: string; quantity: number }>;
  productsCount: number | null;
}

/**
 * Collecte les commandes des 7 derniers jours + top produits et persiste un
 * Signal type=COMMERCE_METRICS (le Suivi du jour lit le dernier). P22-1.
 */
export async function syncStrategyShopifyOrders(
  strategyId: string,
): Promise<ConnectorResult<CommerceMetrics>> {
  const conn = await db.mediaPlatformConnection.findFirst({
    where: { strategyId, platform: COMMERCE_PLATFORM, status: "ACTIVE" },
  });
  if (!conn) return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };
  const creds = (conn.credentials ?? {}) as Record<string, unknown>;
  if (typeof creds.encryptedToken !== "string") {
    return { state: "DEGRADED", reason: "AUTH_REVOKED" };
  }
  let token: ShopTokenPayload;
  try {
    token = decryptTokenPayload<ShopTokenPayload>(creds.encryptedToken);
  } catch {
    return { state: "DEFERRED_AWAITING_CREDENTIALS", connectorId: "INTEGRATION_TOKEN_KEY" };
  }

  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const base = `https://${conn.accountId}/admin/api/${SHOPIFY_API_VERSION}`;
  const headers = { "X-Shopify-Access-Token": token.access_token };

  const guard = async (url: string) => {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (res.status === 401 || res.status === 403) return "AUTH" as const;
      if (!res.ok) return "OUTAGE" as const;
      return (await res.json()) as Record<string, unknown>;
    } catch {
      return "OUTAGE" as const;
    }
  };

  const orders = await guard(
    `${base}/orders.json?status=any&created_at_min=${encodeURIComponent(since)}&limit=250&fields=id,total_price,currency,line_items,created_at`,
  );
  if (orders === "AUTH") {
    await db.mediaPlatformConnection.update({ where: { id: conn.id }, data: { status: "ERROR" } });
    return { state: "DEGRADED", reason: "AUTH_REVOKED" };
  }
  if (orders === "OUTAGE") return { state: "DEGRADED", reason: "VENDOR_OUTAGE" };

  const list = (orders.orders as Array<Record<string, unknown>> | undefined) ?? [];
  let revenue = 0;
  let currency: string | null = null;
  const productTallies = new Map<string, number>();
  for (const o of list) {
    const total = Number(o.total_price);
    if (Number.isFinite(total)) revenue += total;
    if (!currency && typeof o.currency === "string") currency = o.currency;
    for (const li of (o.line_items as Array<Record<string, unknown>> | undefined) ?? []) {
      const title = typeof li.title === "string" ? li.title : "(produit)";
      const qty = Number(li.quantity) || 0;
      productTallies.set(title, (productTallies.get(title) ?? 0) + qty);
    }
  }
  const topProducts = [...productTallies.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([title, quantity]) => ({ title, quantity }));

  // Compteur produits (best-effort — cosmétique).
  let productsCount: number | null = null;
  const count = await guard(`${base}/products/count.json`);
  if (count !== "AUTH" && count !== "OUTAGE" && typeof count.count === "number") {
    productsCount = count.count;
  }

  const metrics: CommerceMetrics = {
    shopDomain: conn.accountId,
    ordersLast7d: list.length,
    revenueLast7d: Math.round(revenue * 100) / 100,
    currency,
    topProducts,
    productsCount,
  };

  await db.signal.create({
    data: {
      strategyId,
      type: "COMMERCE_METRICS",
      data: metrics as unknown as Prisma.InputJsonValue,
    },
  });
  await db.mediaPlatformConnection.update({
    where: { id: conn.id },
    data: { lastSyncAt: new Date() },
  });

  return { state: "LIVE", data: metrics, observedAt: new Date().toISOString() };
}
