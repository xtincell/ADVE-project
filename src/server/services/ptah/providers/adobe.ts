/**
 * Adobe Firefly Services provider — OAuth 2.0 server-to-server.
 *
 * Surface : Photoshop API (compositing, batch export PSD layered),
 * Lightroom API (color grading), Illustrator API (vector ops),
 * Firefly text-to-image, Firefly text-to-vector.
 *
 * Auth flow (OAuth 2.0 server-to-server) :
 *   POST https://ims-na1.adobelogin.com/ims/token/v3
 *     grant_type=client_credentials
 *     client_id=$ADOBE_FIREFLY_CLIENT_ID
 *     client_secret=$ADOBE_FIREFLY_CLIENT_SECRET
 *     scope=openid,AdobeID,read_organizations,firefly_api
 *   → access_token (24h TTL — cache avec margin)
 *
 * Phase 1 : skeleton compilable + estimate. Implémentation REST réelle Phase D
 * (ADR-0009 roadmap) — nécessite credentials production.
 */

import { applyDynamicMultiplier, estimateCostForModel } from "../pricing";
import type { ForgeBrief, ForgeProvider } from "../types";

const ADOBE_IMS = "https://ims-na1.adobelogin.com/ims/token/v3";
const ADOBE_FIREFLY_BASE = "https://firefly-api.adobe.io";

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: CachedToken | null = null;

async function getAccessToken(): Promise<string> {
  const clientId = process.env.ADOBE_FIREFLY_CLIENT_ID;
  const clientSecret = process.env.ADOBE_FIREFLY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Adobe Firefly provider: ADOBE_FIREFLY_CLIENT_ID + ADOBE_FIREFLY_CLIENT_SECRET required.",
    );
  }
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.accessToken;
  }
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "openid,AdobeID,read_organizations,firefly_api",
  });
  const res = await fetch(ADOBE_IMS, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Adobe IMS auth ${res.status}: ${text}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    accessToken: json.access_token,
    expiresAt: now + json.expires_in * 1000,
  };
  return json.access_token;
}

const DEFAULT_MODEL_BY_KIND: Record<string, string> = {
  image: "firefly-v3-image",
  refine: "lightroom-color-grade",
  transform: "photoshop-compose",
  design: "photoshop-compose",
  video: "",
  audio: "",
  icon: "",
  classify: "",
  stock: "",
};

class AdobeProvider implements ForgeProvider {
  readonly name = "adobe" as const;
  readonly externalDomains = [
    "ims-na1.adobelogin.com",
    "firefly-api.adobe.io",
    "image.adobe.io",
  ];

  estimateCost(brief: ForgeBrief): number {
    const model = this.resolveModel(brief);
    const base = estimateCostForModel("adobe", model);
    return applyDynamicMultiplier(base, brief);
  }

  async forge(brief: ForgeBrief, _webhookUrl?: string) {
    const token = await getAccessToken();
    const model = this.resolveModel(brief);
    const endpoint = `/v3/images/generate`; // Adobe Firefly image gen example
    const url = new URL(endpoint, ADOBE_FIREFLY_BASE).toString();

    const body = {
      prompt: brief.briefText,
      ...brief.forgeSpec.parameters,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-api-key": process.env.ADOBE_FIREFLY_CLIENT_ID ?? "",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Adobe Firefly ${res.status}: ${text}`);
    }

    const json = (await res.json()) as {
      jobId?: string;
      jobID?: string;
      output?: { images?: { image?: { presignedUrl?: string } }[] };
    };
    const providerTaskId = json.jobId ?? json.jobID ?? "";

    return {
      providerTaskId,
      providerModel: model,
      estimatedCostUsd: this.estimateCost(brief),
      webhookSecret: "",
    };
  }

  async reconcile(providerTaskId: string, _webhookPayload?: unknown) {
    const token = await getAccessToken();
    const url = new URL(`/v3/jobs/${providerTaskId}`, ADOBE_FIREFLY_BASE).toString();
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Adobe Firefly poll ${res.status}: ${text}`);
    }
    const json = (await res.json()) as {
      status?: string;
      output?: { images?: { image?: { presignedUrl?: string } }[] };
    };
    const urls =
      json.output?.images?.flatMap((i) => (i.image?.presignedUrl ? [i.image.presignedUrl] : [])) ??
      [];
    return {
      resultUrls: urls,
      realisedCostUsd: 0,
      completedAt: new Date(),
    };
  }

  verifyWebhook(_req: { headers: Headers; bodyText: string; expectedSecret: string }): boolean {
    // Adobe Firefly Services Phase 1 : pas de webhook (polling-only).
    return false;
  }

  async isAvailable() {
    return Boolean(
      process.env.ADOBE_FIREFLY_CLIENT_ID && process.env.ADOBE_FIREFLY_CLIENT_SECRET,
    );
  }

  private resolveModel(brief: ForgeBrief): string {
    if (brief.forgeSpec.modelHint) return brief.forgeSpec.modelHint;
    return DEFAULT_MODEL_BY_KIND[brief.forgeSpec.kind] ?? "firefly-v3-image";
  }
}

export const adobeProvider = new AdobeProvider();
