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

export type SupportedProvider =
  | "google"
  | "linkedin"
  | "meta"
  | "instagram"
  | "x"
  | "tiktok"
  | "shopify";

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
    case "instagram": {
      // « Instagram API with Instagram Login » (Business Login, GA 2024) — un
      // flow PROPRE, distinct du provider `meta`/Facebook Login : autorise sur
      // instagram.com, échange sur api.instagram.com, appelle graph.instagram.com.
      // AUCUN concept de config_id ici : `client_id` EST l'Instagram App ID (≠
      // Meta App ID). Répond au blocage « Facebook connecte mais pas Instagram »
      // (2026-07-14) — l'edge FB-Page → instagram_business_account restait vide ;
      // la connexion directe Instagram Business ne dépend plus d'une Page FB.
      // App ID PUBLIC (visible dans l'URL d'autorisation, jamais un secret) —
      // défaut = la valeur fournie par l'opérateur, surchargée par env si besoin.
      // `||` (pas `??`) : une env VIDE ("") retombe aussi sur le défaut.
      const clientId = env.INSTAGRAM_OAUTH_CLIENT_ID || "1274394400786813";
      // Le SECRET, lui, ne vit QUE en env (jamais commité). Sans lui → provider
      // indisponible (l'UI affiche « bientôt disponible », pas un redirect cassé).
      const clientSecret = env.INSTAGRAM_OAUTH_CLIENT_SECRET ?? env.INSTAGRAM_APP_SECRET;
      if (!clientSecret) return null;
      return {
        id: "instagram",
        authorizationEndpoint: "https://www.instagram.com/oauth/authorize",
        tokenEndpoint: "https://api.instagram.com/oauth/access_token",
        clientId,
        clientSecret,
        // Scopes « instagram_business_* » (les « business_* » nus sont dépréciés
        // depuis le 2025-01-27). Basic = profil/médias ; content_publish =
        // publier ; manage_comments/messages = inbox (vague ultérieure).
        defaultScopes: [
          "instagram_business_basic",
          "instagram_business_content_publish",
          "instagram_business_manage_comments",
        ],
        // Instagram délimite les scopes par VIRGULE dans l'URL d'autorisation.
        scopeDelimiter: ",",
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
  /**
   * Meta : force le RÉ-AFFICHAGE de l'écran de sélection Page/actif
   * (`auth_type=reauthorize`). Sans ça, Facebook « re-consent » en silence et
   * l'utilisateur ne peut PAS choisir sa Page — il repart avec ce que Meta
   * a auto-résolu (souvent son profil perso). ON pour toute connexion réseau.
   */
  forceReselect?: boolean;
}): string {
  const clientParam = opts.config.clientIdParam ?? "client_id";
  const params = new URLSearchParams({
    response_type: "code",
    [clientParam]: opts.config.clientId,
    redirect_uri: opts.redirectUri,
    scope: (opts.scopes ?? opts.config.defaultScopes).join(opts.config.scopeDelimiter ?? " "),
    state: opts.state,
  });
  // Google honore access_type/prompt — LES AUTRES NON : Facebook ne définit
  // pas ces paramètres (dialecte Google) et les apps « Facebook Login for
  // Business » sont notoirement strictes post-login ; on n'émet que pour
  // Google, qui les lit réellement.
  if (opts.config.id === "google") {
    params.set("access_type", "offline");
    params.set("prompt", "consent");
  }
  // Meta « Facebook Login for Business » : les apps Business récentes EXIGENT
  // une Configuration (dashboard → Facebook Login for Business →
  // Configurations) passée en config_id — le paramètre scope brut y est
  // rejeté APRÈS login avec la page générique « Sorry, something went
  // wrong ». Env optionnelle : sans META_LOGIN_CONFIG_ID on reste en scope
  // classique (apps Consumer / Facebook Login standard).
  if (opts.config.id === "meta") {
    const configId = process.env.META_LOGIN_CONFIG_ID ?? "";
    if (configId.length > 0) {
      params.set("config_id", configId);
      params.delete("scope");
    }
    // Force l'écran « quelle Page connecter ? » à chaque fois — sinon Facebook
    // auto-résout et l'utilisateur n'a pas le choix (bug rapporté 2026-07-12).
    if (opts.forceReselect) params.set("auth_type", "reauthorize");
  }
  // Instagram Business Login : `enable_fb_login=0` impose le login PUREMENT
  // Instagram (pas d'interstitiel Facebook) — c'est LE point qui débloque les
  // comptes non rattachés à une Page FB. `force_reauth` ré-affiche l'écran de
  // compte pour permettre d'en choisir un autre (parité `forceReselect` Meta).
  if (opts.config.id === "instagram") {
    params.set("enable_fb_login", "0");
    if (opts.forceReselect) params.set("force_reauth", "true");
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

// ── Instagram Business Login — flow dédié (« tout autre code ») ────────
//
// Le token exchange Instagram NE renvoie PAS la forme OAuth standard : la
// réponse est ENVELOPPÉE `{ data: [{ access_token, user_id, permissions }] }`
// (permissions = liste de scopes séparée par des virgules). Le parseur
// ci-dessous déballe l'enveloppe ET tolère une forme plate défensive.

export interface InstagramShortToken {
  access_token: string;
  /** Identifiant utilisateur Instagram (sert d'accountId à la découverte). */
  user_id: string | null;
  /** Permissions accordées, jointes en chaîne (alias `scope` côté TokenResponse). */
  scope: string | null;
}

export function parseInstagramShortTokenResponse(json: unknown): InstagramShortToken | null {
  if (!json || typeof json !== "object") return null;
  const root = json as Record<string, unknown>;
  // Forme canonique enveloppée : { data: [ { access_token, user_id, permissions } ] }.
  const dataArr = Array.isArray(root.data) ? (root.data as Array<Record<string, unknown>>) : null;
  const node = dataArr && dataArr.length > 0 ? dataArr[0]! : root;
  const token = node.access_token;
  if (typeof token !== "string" || token.length === 0) return null;
  const uid = node.user_id;
  const perms = node.permissions;
  return {
    access_token: token,
    user_id: uid == null ? null : String(uid),
    scope: Array.isArray(perms) ? perms.join(",") : typeof perms === "string" ? perms : null,
  };
}

/**
 * Échange le code d'autorisation Instagram contre un token COURT (~1h).
 * POST api.instagram.com/oauth/access_token (client_id/secret + code +
 * redirect_uri) — réponse enveloppée déballée par `parseInstagramShortTokenResponse`.
 */
export async function exchangeInstagramCode(opts: {
  config: ProviderConfig;
  code: string;
  redirectUri: string;
}): Promise<TokenResponse & { user_id: string | null }> {
  const body = new URLSearchParams({
    client_id: opts.config.clientId,
    client_secret: opts.config.clientSecret,
    grant_type: "authorization_code",
    redirect_uri: opts.redirectUri,
    code: opts.code,
  });
  const res = await fetch(opts.config.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Instagram token exchange failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const parsed = parseInstagramShortTokenResponse(await res.json().catch(() => null));
  if (!parsed) throw new Error("Instagram token exchange: réponse inattendue (pas d'access_token)");
  return { access_token: parsed.access_token, scope: parsed.scope ?? undefined, user_id: parsed.user_id };
}

/**
 * Troque le token court Instagram (~1h) contre un long-lived (~60j).
 * GET graph.instagram.com/access_token?grant_type=ig_exchange_token. Best-effort :
 * en cas d'échec on garde le token court (le sync signalera AUTH à expiration).
 */
export async function exchangeInstagramLongLivedToken(
  config: ProviderConfig,
  shortLivedToken: string,
): Promise<TokenResponse | null> {
  if (config.id !== "instagram") return null;
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: config.clientSecret,
    access_token: shortLivedToken,
  });
  try {
    const res = await fetch(`https://graph.instagram.com/access_token?${params.toString()}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as TokenResponse;
  } catch {
    return null;
  }
}

/**
 * Rafraîchit un long-lived Instagram (self-refresh — PAS de refresh_token :
 * on présente le token lui-même). GET graph.instagram.com/refresh_access_token.
 */
export async function refreshInstagramLongLivedToken(
  longLivedToken: string,
): Promise<TokenResponse | null> {
  const params = new URLSearchParams({
    grant_type: "ig_refresh_token",
    access_token: longLivedToken,
  });
  try {
    const res = await fetch(`https://graph.instagram.com/refresh_access_token?${params.toString()}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as TokenResponse;
    return json.access_token ? json : null;
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
