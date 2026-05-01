/**
 * Sprint D — Anubis ad-network webhook handler.
 *
 * Endpoint : POST /api/anubis/webhook/{meta,google,tiktok,x}
 * Validates HMAC signature header per provider, extracts the
 * externalCampaignId, calls `media-activation-engine.reconcileWebhook`.
 *
 * Signature secrets :
 *   - META_AD_WEBHOOK_SECRET (meta uses x-hub-signature-256)
 *   - GOOGLE_ADS_WEBHOOK_SECRET (google uses x-goog-signature)
 *   - TIKTOK_AD_WEBHOOK_SECRET (tiktok uses x-tt-signature)
 *   - X_ADS_WEBHOOK_SECRET (x uses x-twitter-webhooks-signature)
 *
 * Replays + duplicates : the reconcileWebhook is idempotent (re-reads
 * provider truth), so duplicate webhooks just trigger a redundant sync.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { reconcileWebhook } from "@/server/services/media-activation-engine";

type Provider = "meta" | "google" | "tiktok" | "x";
const PROVIDERS: readonly Provider[] = ["meta", "google", "tiktok", "x"];

interface SignatureSpec {
  header: string;
  envSecret: string;
  algo: "sha256";
  prefix?: string;
}

const SIG_SPECS: Record<Provider, SignatureSpec> = {
  meta:   { header: "x-hub-signature-256",         envSecret: "META_AD_WEBHOOK_SECRET",     algo: "sha256", prefix: "sha256=" },
  google: { header: "x-goog-signature",            envSecret: "GOOGLE_ADS_WEBHOOK_SECRET",  algo: "sha256" },
  tiktok: { header: "x-tt-signature",              envSecret: "TIKTOK_AD_WEBHOOK_SECRET",   algo: "sha256" },
  x:      { header: "x-twitter-webhooks-signature", envSecret: "X_ADS_WEBHOOK_SECRET",      algo: "sha256", prefix: "sha256=" },
};

function verifySignature(provider: Provider, raw: string, header: string | null): boolean {
  if (!header) return false;
  const spec = SIG_SPECS[provider];
  const secret = process.env[spec.envSecret];
  if (!secret) {
    // Dev mode : no secret configured → accept (logs as untrusted).
    return process.env.NODE_ENV !== "production";
  }
  const expected = crypto.createHmac(spec.algo, secret).update(raw).digest("hex");
  const sig = (spec.prefix && header.startsWith(spec.prefix) ? header.slice(spec.prefix.length) : header).trim();
  if (sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

interface WebhookPayloadShape {
  campaign_id?: string;
  campaignId?: string;
  resource?: string;
  data?: Array<{ id?: string; campaign_id?: string }>;
}

function extractExternalCampaignId(provider: Provider, payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as WebhookPayloadShape;
  if (provider === "meta") {
    if (Array.isArray(p.data)) {
      for (const e of p.data) {
        if (e.id) return e.id;
        if (e.campaign_id) return e.campaign_id;
      }
    }
  }
  if (p.campaign_id) return p.campaign_id;
  if (p.campaignId) return p.campaignId;
  if (typeof p.resource === "string" && p.resource.includes("campaigns/")) {
    const m = p.resource.match(/campaigns\/([^/]+)/);
    if (m) return m[1] ?? null;
  }
  return null;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ provider: string }> }): Promise<Response> {
  const { provider } = await ctx.params;
  if (!PROVIDERS.includes(provider as Provider)) {
    return NextResponse.json({ ok: false, error: "Unknown provider" }, { status: 404 });
  }
  const p = provider as Provider;
  const raw = await req.text();
  const signatureHeader = req.headers.get(SIG_SPECS[p].header);

  if (!verifySignature(p, raw, signatureHeader)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try { payload = JSON.parse(raw); } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const externalId = extractExternalCampaignId(p, payload);
  if (!externalId) {
    return NextResponse.json({ ok: true, ignored: true, reason: "No externalCampaignId in payload" });
  }

  const result = await reconcileWebhook(p, externalId);
  return NextResponse.json({ ok: true, reconciled: result != null, result });
}

export const runtime = "nodejs";
