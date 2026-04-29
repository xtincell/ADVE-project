/**
 * oauth-integrations — OAuth 2.0 Authorization Code flow for outbound
 * integrations (Google, LinkedIn, Meta, etc.).
 *
 * Layer 3 (services). Provider configs are env-driven; missing creds
 * cause `getProviderConfig` to return null so the start route can return
 * a friendly "not configured" instead of dispatching a broken redirect.
 *
 * Token persistence: encrypted via AES-GCM (key from env `INTEGRATION_TOKEN_KEY`)
 * and stored in `IntegrationConnection`.
 */

import crypto from "node:crypto";

export type SupportedProvider = "google" | "linkedin" | "meta";

export interface ProviderConfig {
  readonly id: SupportedProvider;
  readonly authorizationEndpoint: string;
  readonly tokenEndpoint: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly defaultScopes: readonly string[];
  /** How to identify the connected user from token response (optional userinfo endpoint). */
  readonly userInfoEndpoint?: string;
}

export function getProviderConfig(provider: string): ProviderConfig | null {
  const env = process.env;
  switch (provider) {
    case "google": {
      const clientId = env.GOOGLE_OAUTH_CLIENT_ID;
      const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET;
      if (!clientId || !clientSecret) return null;
      return {
        id: "google",
        authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenEndpoint: "https://oauth2.googleapis.com/token",
        clientId,
        clientSecret,
        defaultScopes: ["openid", "email", "https://www.googleapis.com/auth/adwords"],
        userInfoEndpoint: "https://www.googleapis.com/oauth2/v3/userinfo",
      };
    }
    case "linkedin": {
      const clientId = env.LINKEDIN_OAUTH_CLIENT_ID;
      const clientSecret = env.LINKEDIN_OAUTH_CLIENT_SECRET;
      if (!clientId || !clientSecret) return null;
      return {
        id: "linkedin",
        authorizationEndpoint: "https://www.linkedin.com/oauth/v2/authorization",
        tokenEndpoint: "https://www.linkedin.com/oauth/v2/accessToken",
        clientId,
        clientSecret,
        defaultScopes: ["r_liteprofile", "r_emailaddress", "rw_organization_admin"],
        userInfoEndpoint: "https://api.linkedin.com/v2/me",
      };
    }
    case "meta": {
      const clientId = env.META_OAUTH_CLIENT_ID;
      const clientSecret = env.META_OAUTH_CLIENT_SECRET;
      if (!clientId || !clientSecret) return null;
      return {
        id: "meta",
        authorizationEndpoint: "https://www.facebook.com/v18.0/dialog/oauth",
        tokenEndpoint: "https://graph.facebook.com/v18.0/oauth/access_token",
        clientId,
        clientSecret,
        defaultScopes: ["pages_show_list", "pages_read_engagement", "ads_management"],
        userInfoEndpoint: "https://graph.facebook.com/me?fields=id,name,email",
      };
    }
    default:
      return null;
  }
}

// ── State management (CSRF protection) ────────────────────────────────

interface OAuthState {
  operatorId: string;
  provider: SupportedProvider;
  returnUrl: string;
  nonce: string;
  ts: number;
}

const STATE_TTL_MS = 10 * 60 * 1000;

export function packState(state: OAuthState, signingKey: string): string {
  const json = JSON.stringify(state);
  const sig = crypto.createHmac("sha256", signingKey).update(json).digest("base64url");
  return Buffer.from(json).toString("base64url") + "." + sig;
}

export function unpackState(packed: string, signingKey: string): OAuthState | null {
  const [b64, sig] = packed.split(".");
  if (!b64 || !sig) return null;
  const json = Buffer.from(b64, "base64url").toString("utf8");
  const expectedSig = crypto.createHmac("sha256", signingKey).update(json).digest("base64url");
  if (expectedSig !== sig) return null;
  try {
    const state = JSON.parse(json) as OAuthState;
    if (Date.now() - state.ts > STATE_TTL_MS) return null;
    return state;
  } catch {
    return null;
  }
}

// ── Token encryption (AES-GCM) ────────────────────────────────────────

function getEncryptionKey(): Buffer {
  const raw = process.env.INTEGRATION_TOKEN_KEY ?? "";
  if (raw.length < 32) {
    throw new Error("INTEGRATION_TOKEN_KEY must be at least 32 characters");
  }
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptTokenPayload(payload: object): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptTokenPayload<T = unknown>(encoded: string): T {
  const key = getEncryptionKey();
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}

// ── Authorize URL builder ─────────────────────────────────────────────

export function buildAuthorizeUrl(opts: {
  config: ProviderConfig;
  redirectUri: string;
  state: string;
  scopes?: readonly string[];
}): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: opts.config.clientId,
    redirect_uri: opts.redirectUri,
    scope: (opts.scopes ?? opts.config.defaultScopes).join(" "),
    state: opts.state,
    access_type: "offline",
    prompt: "consent",
  });
  return `${opts.config.authorizationEndpoint}?${params.toString()}`;
}

// ── Token exchange ────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

export async function exchangeCode(opts: {
  config: ProviderConfig;
  code: string;
  redirectUri: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: opts.code,
    client_id: opts.config.clientId,
    client_secret: opts.config.clientSecret,
    redirect_uri: opts.redirectUri,
  });
  const res = await fetch(opts.config.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OAuth token exchange failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<TokenResponse>;
}

// ── Userinfo (for externalUserId) ─────────────────────────────────────

export async function fetchUserInfo(
  config: ProviderConfig,
  accessToken: string,
): Promise<{ id?: string; email?: string; name?: string } | null> {
  if (!config.userInfoEndpoint) return null;
  const res = await fetch(config.userInfoEndpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => ({}));
  return {
    id: typeof json.id === "string" ? json.id : typeof json.sub === "string" ? json.sub : undefined,
    email: typeof json.email === "string" ? json.email : undefined,
    name: typeof json.name === "string" ? json.name : undefined,
  };
}
