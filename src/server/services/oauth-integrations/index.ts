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

export type SupportedProvider = "google" | "linkedin" | "meta" | "x" | "tiktok" | "shopify";

export interface ProviderConfig {
  readonly id: SupportedProvider;
  readonly authorizationEndpoint: string;
  readonly tokenEndpoint: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly defaultScopes: readonly string[];
  /** How to identify the connected user from token response (optional userinfo endpoint). */
  readonly userInfoEndpoint?: string;
  /** PKCE S256 obligatoire (X/Twitter). Le code_verifier voyage en cookie httpOnly, jamais dans le state. */
  readonly usePkce?: boolean;
  /** Nom du paramètre client (TikTok utilise `client_key` au lieu de `client_id`). */
  readonly clientIdParam?: "client_id" | "client_key";
  /** Authentification du token endpoint : corps (défaut) ou header Basic (X confidential client). */
  readonly tokenAuth?: "body" | "basic";
  /** Délimiteur de scopes dans l'URL d'autorisation (TikTok = virgule, Shopify aussi). */
  readonly scopeDelimiter?: " " | ",";
  /** Endpoints par boutique (Shopify) : `{shop}` est remplacé par le domaine
   *  myshopify validé au start — buildAuthorizeUrl/exchangeCode exigent alors
   *  l'option `shop`. */
  readonly perShopEndpoints?: boolean;
}

export function getProviderConfig(provider: string): ProviderConfig | null {
  const env = process.env;
  switch (provider) {
    case "google": {
      // Alias : GOOGLE_CLIENT_ID/SECRET (noms Google Console usuels) acceptés.
      const clientId = env.GOOGLE_OAUTH_CLIENT_ID ?? env.GOOGLE_CLIENT_ID;
      const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET ?? env.GOOGLE_CLIENT_SECRET;
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
      // Alias : LINKEDIN_CLIENT_ID/SECRET acceptés.
      const clientId = env.LINKEDIN_OAUTH_CLIENT_ID ?? env.LINKEDIN_CLIENT_ID;
      const clientSecret = env.LINKEDIN_OAUTH_CLIENT_SECRET ?? env.LINKEDIN_CLIENT_SECRET;
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
      // Alias : META_APP_ID/META_APP_SECRET (noms du dashboard Meta) acceptés.
      const clientId = env.META_OAUTH_CLIENT_ID ?? env.META_APP_ID;
      const clientSecret = env.META_OAUTH_CLIENT_SECRET ?? env.META_APP_SECRET;
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
    // ── Réseaux propres de la marque (connexions founder, ADR-0128) ──────
    case "x": {
      const clientId = env.X_OAUTH_CLIENT_ID;
      const clientSecret = env.X_OAUTH_CLIENT_SECRET;
      if (!clientId || !clientSecret) return null;
      return {
        id: "x",
        authorizationEndpoint: "https://twitter.com/i/oauth2/authorize",
        tokenEndpoint: "https://api.twitter.com/2/oauth2/token",
        clientId,
        clientSecret,
        defaultScopes: ["tweet.read", "users.read", "offline.access"],
        userInfoEndpoint: "https://api.twitter.com/2/users/me",
        usePkce: true,
        tokenAuth: "basic",
      };
    }
    case "tiktok": {
      // Alias : TIKTOK_CLIENT_KEY/TIKTOK_CLIENT_SECRET (noms TikTok Developers).
      const clientId = env.TIKTOK_OAUTH_CLIENT_ID ?? env.TIKTOK_CLIENT_KEY;
      const clientSecret = env.TIKTOK_OAUTH_CLIENT_SECRET ?? env.TIKTOK_CLIENT_SECRET;
      if (!clientId || !clientSecret) return null;
      return {
        id: "tiktok",
        authorizationEndpoint: "https://www.tiktok.com/v2/auth/authorize/",
        tokenEndpoint: "https://open.tiktokapis.com/v2/oauth/token/",
        clientId,
        clientSecret,
        defaultScopes: ["user.info.basic", "user.info.profile", "user.info.stats"],
        clientIdParam: "client_key",
        scopeDelimiter: ",",
      };
    }
    // ── Boutique de la marque (vague « cockpit qui ramène tout ») ────────
    case "shopify": {
      const clientId = env.SHOPIFY_OAUTH_CLIENT_ID;
      const clientSecret = env.SHOPIFY_OAUTH_CLIENT_SECRET;
      if (!clientId || !clientSecret) return null;
      return {
        id: "shopify",
        // `{shop}` = domaine *.myshopify.com STRICTEMENT validé au start.
        authorizationEndpoint: "https://{shop}/admin/oauth/authorize",
        tokenEndpoint: "https://{shop}/admin/oauth/access_token",
        clientId,
        clientSecret,
        // Lecture seule commerce : produits + commandes (jamais write en v1).
        defaultScopes: ["read_products", "read_orders"],
        scopeDelimiter: ",",
        perShopEndpoints: true,
      };
    }
    default:
      return null;
  }
}

// ── PKCE (RFC 7636) ───────────────────────────────────────────────────

export function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

// ── State management (CSRF protection) ────────────────────────────────

interface OAuthState {
  operatorId: string;
  provider: SupportedProvider;
  returnUrl: string;
  nonce: string;
  ts: number;
  /**
   * Connexion « réseaux de la marque » (ADR-0128) : quand `intent === "social"`,
   * le callback écrit des `SocialConnection` scopées à la Strategy au lieu
   * d'une `IntegrationConnection` opérateur. Champs absents = flow legacy.
   */
  intent?: "social" | "commerce";
  strategyId?: string;
  userId?: string;
  /** Boutique Shopify (*.myshopify.com) — flow commerce uniquement. */
  shop?: string;
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

/**
 * Base URL PUBLIQUE de la requête — fiable derrière le reverse-proxy.
 *
 * Derrière Coolify/Traefik, `next start` voit la connexion interne en HTTP :
 * `new URL(request.url).protocol` vaut `http:` alors que le client est en
 * HTTPS. Un `redirect_uri` construit là-dessus (`http://powerupgraders.com/…`)
 * ne matche JAMAIS les URIs déclarées chez Meta/Google/LinkedIn (https) —
 * les trois providers refusent. On honore donc `x-forwarded-proto`/`-host`
 * (posés par le proxy) avec repli sur l'URL brute (dev/CI localhost).
 */
export function getPublicBaseUrl(request: Request): string {
  const url = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    url.host;
  const bare = host.split(":")[0] ?? "";
  const isLocal =
    bare === "localhost" || bare === "127.0.0.1" || bare === "0.0.0.0" || bare.endsWith(".local");
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (isLocal ? url.protocol.replace(":", "") : "https");
  return `${proto}://${host}`;
}

/**
 * Réponse au challenge de validation des webhooks LinkedIn : HMAC-SHA256 hex
 * du `challengeCode` signé avec le client secret de l'app (forme exigée par
 * le portail dev — « Test this URL »). Même primitive pour vérifier la
 * signature `X-LI-Signature` des événements entrants.
 */
export function computeLinkedInChallengeResponse(challengeCode: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(challengeCode).digest("hex");
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

/** Domaine boutique Shopify STRICT : <handle>.myshopify.com uniquement. */
export function isValidShopDomain(shop: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]\.myshopify\.com$/.test(shop);
}

function resolveEndpoint(template: string, config: ProviderConfig, shop?: string): string {
  if (!config.perShopEndpoints) return template;
  if (!shop || !isValidShopDomain(shop)) {
    throw new Error(`${config.id} requires a valid *.myshopify.com shop domain`);
  }
  return template.replace("{shop}", shop);
}

export function buildAuthorizeUrl(opts: {
  config: ProviderConfig;
  redirectUri: string;
  state: string;
  scopes?: readonly string[];
  /** PKCE challenge (S256) — requis quand `config.usePkce`. */
  pkceChallenge?: string;
  /** Domaine *.myshopify.com — requis quand `config.perShopEndpoints`. */
  shop?: string;
}): string {
  const clientParam = opts.config.clientIdParam ?? "client_id";
  const params = new URLSearchParams({
    response_type: "code",
    [clientParam]: opts.config.clientId,
    redirect_uri: opts.redirectUri,
    scope: (opts.scopes ?? opts.config.defaultScopes).join(opts.config.scopeDelimiter ?? " "),
    state: opts.state,
  });
  // Google honore access_type/prompt ; les autres providers les ignorent ou
  // les rejettent (TikTok) — on ne les émet que pour les flows qui les lisent.
  if (opts.config.id === "google" || opts.config.id === "linkedin" || opts.config.id === "meta") {
    params.set("access_type", "offline");
    params.set("prompt", "consent");
  }
  if (opts.config.usePkce) {
    if (!opts.pkceChallenge) throw new Error(`${opts.config.id} requires a PKCE challenge`);
    params.set("code_challenge", opts.pkceChallenge);
    params.set("code_challenge_method", "S256");
  }
  return `${resolveEndpoint(opts.config.authorizationEndpoint, opts.config, opts.shop)}?${params.toString()}`;
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
  /** PKCE verifier — requis quand `config.usePkce`. */
  pkceVerifier?: string;
  /** Domaine *.myshopify.com — requis quand `config.perShopEndpoints`. */
  shop?: string;
}): Promise<TokenResponse> {
  const clientParam = opts.config.clientIdParam ?? "client_id";
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: opts.code,
    [clientParam]: opts.config.clientId,
    redirect_uri: opts.redirectUri,
  });
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };
  if (opts.config.tokenAuth === "basic") {
    headers.Authorization =
      "Basic " + Buffer.from(`${opts.config.clientId}:${opts.config.clientSecret}`).toString("base64");
  } else {
    body.set("client_secret", opts.config.clientSecret);
  }
  if (opts.config.usePkce) {
    if (!opts.pkceVerifier) throw new Error(`${opts.config.id} requires a PKCE verifier`);
    body.set("code_verifier", opts.pkceVerifier);
  }
  const res = await fetch(resolveEndpoint(opts.config.tokenEndpoint, opts.config, opts.shop), {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OAuth token exchange failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<TokenResponse>;
}

/**
 * Échange un user token Meta court (≈1h) contre un long-lived (≈60j).
 * Best-effort : en cas d'échec on garde le token court (le sync signalera
 * AUTH_REVOKED à expiration — jamais de faux succès).
 */
export async function exchangeMetaLongLivedToken(
  config: ProviderConfig,
  shortLivedToken: string,
): Promise<TokenResponse | null> {
  if (config.id !== "meta") return null;
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    fb_exchange_token: shortLivedToken,
  });
  try {
    const res = await fetch(`${config.tokenEndpoint}?${params.toString()}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as TokenResponse;
  } catch {
    return null;
  }
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
