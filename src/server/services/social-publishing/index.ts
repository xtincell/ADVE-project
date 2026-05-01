/**
 * social-publishing — Sprint J (Phase 8+ Anubis sub-service).
 *
 * Pousse réellement les posts vers Instagram (Graph API), TikTok
 * (Content Posting API), LinkedIn (UGC API), Facebook (Pages Graph),
 * X/Twitter (v2). Tokens lus depuis IntegrationConnection (oauth-integrations).
 *
 * Anubis.publishSocial délègue ici quand l'env est configuré, sinon le
 * post reste local (DB-only).
 */

import { db } from "@/lib/db";
import { decryptTokenPayload } from "@/server/services/oauth-integrations";

export type SocialPublishPlatform =
  | "INSTAGRAM"
  | "FACEBOOK"
  | "TIKTOK"
  | "LINKEDIN"
  | "TWITTER"
  | "YOUTUBE";

interface SocialPostInput {
  operatorId: string;
  platform: SocialPublishPlatform;
  accountId: string;          // SocialConnection.accountId
  content: string;
  mediaUrl?: string;
  scheduledAt?: Date;
}

interface SocialPostResult {
  ok: boolean;
  externalPostId?: string;
  error?: string;
  scheduled: boolean;
}

const PROVIDER_KEY: Record<SocialPublishPlatform, string> = {
  INSTAGRAM: "meta",       // Instagram Graph API uses Meta tokens
  FACEBOOK:  "meta",
  TIKTOK:    "tiktok",
  LINKEDIN:  "linkedin",
  TWITTER:   "x",
  YOUTUBE:   "youtube",
};

async function getAccessToken(operatorId: string, provider: string): Promise<string | null> {
  const conn = await db.integrationConnection.findFirst({
    where: {
      operatorId,
      provider,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { encryptedTokens: true },
  });
  if (!conn) return null;
  try {
    const payload = decryptTokenPayload<{ access_token: string }>(conn.encryptedTokens);
    return payload.access_token;
  } catch {
    return null;
  }
}

export async function publishToSocial(input: SocialPostInput): Promise<SocialPostResult> {
  if (input.scheduledAt && input.scheduledAt.getTime() > Date.now()) {
    // Schedulé — DB-only, le drop-scheduler-worker reprendra.
    return { ok: true, scheduled: true };
  }
  const provider = PROVIDER_KEY[input.platform];
  const token = await getAccessToken(input.operatorId, provider);
  if (!token) {
    return { ok: false, scheduled: false, error: `No active ${provider} token` };
  }

  switch (input.platform) {
    case "INSTAGRAM":
    case "FACEBOOK":
      return publishMeta(input, token);
    case "TIKTOK":
      return publishTikTok(input, token);
    case "LINKEDIN":
      return publishLinkedIn(input, token);
    case "TWITTER":
      return publishX(input, token);
    case "YOUTUBE":
      return { ok: false, scheduled: false, error: "YouTube requires video upload — use upload-only flow" };
  }
}

async function publishMeta(input: SocialPostInput, token: string): Promise<SocialPostResult> {
  // Instagram Graph: /{ig-user-id}/media (container) → /{ig-user-id}/media_publish
  // Facebook: /{page-id}/feed
  if (input.platform === "FACEBOOK") {
    const body = new URLSearchParams({ message: input.content, access_token: token });
    if (input.mediaUrl) body.set("link", input.mediaUrl);
    const res = await fetch(`https://graph.facebook.com/v19.0/${input.accountId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const d = (await res.json().catch(() => ({}))) as { id?: string; error?: { message: string } };
    if (!res.ok || !d.id) return { ok: false, scheduled: false, error: d.error?.message ?? "facebook fail" };
    return { ok: true, externalPostId: d.id, scheduled: false };
  }
  // Instagram: 2-step (container → publish)
  if (!input.mediaUrl) return { ok: false, scheduled: false, error: "Instagram requires mediaUrl" };
  const c = await fetch(`https://graph.facebook.com/v19.0/${input.accountId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ image_url: input.mediaUrl, caption: input.content, access_token: token }),
  });
  const cData = (await c.json().catch(() => ({}))) as { id?: string };
  if (!c.ok || !cData.id) return { ok: false, scheduled: false, error: "ig container failed" };
  const p = await fetch(`https://graph.facebook.com/v19.0/${input.accountId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ creation_id: cData.id, access_token: token }),
  });
  const pData = (await p.json().catch(() => ({}))) as { id?: string; error?: { message: string } };
  if (!p.ok || !pData.id) return { ok: false, scheduled: false, error: pData.error?.message ?? "ig publish failed" };
  return { ok: true, externalPostId: pData.id, scheduled: false };
}

async function publishTikTok(input: SocialPostInput, token: string): Promise<SocialPostResult> {
  // TikTok Content Posting API — direct post draft (publish requires
  // media upload chunked). Stub : create draft.
  const res = await fetch("https://open.tiktokapis.com/v2/post/publish/inbox/video/init/", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      source_info: { source: "PULL_FROM_URL", video_url: input.mediaUrl ?? "" },
      post_info: { title: input.content.slice(0, 100), privacy_level: "SELF_ONLY" },
    }),
  });
  const d = (await res.json().catch(() => ({}))) as { data?: { publish_id?: string }; error?: { message: string } };
  if (!res.ok || !d.data?.publish_id) {
    return { ok: false, scheduled: false, error: d.error?.message ?? "tiktok fail" };
  }
  return { ok: true, externalPostId: d.data.publish_id, scheduled: false };
}

async function publishLinkedIn(input: SocialPostInput, token: string): Promise<SocialPostResult> {
  // LinkedIn UGC API — text post on organization page
  const body = {
    author: `urn:li:organization:${input.accountId}`,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: input.content },
        shareMediaCategory: "NONE",
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };
  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });
  const id = res.headers.get("x-restli-id");
  const d = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok || !id) return { ok: false, scheduled: false, error: d.message ?? "linkedin fail" };
  return { ok: true, externalPostId: id, scheduled: false };
}

async function publishX(input: SocialPostInput, token: string): Promise<SocialPostResult> {
  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: input.content.slice(0, 280) }),
  });
  const d = (await res.json().catch(() => ({}))) as { data?: { id?: string }; errors?: Array<{ message: string }> };
  if (!res.ok || !d.data?.id) {
    return { ok: false, scheduled: false, error: d.errors?.[0]?.message ?? "x fail" };
  }
  return { ok: true, externalPostId: d.data.id, scheduled: false };
}
