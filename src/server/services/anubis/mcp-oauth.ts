/**
 * ANUBIS — serveur OAuth 2.1 du endpoint MCP (ADR-0183).
 *
 * Le connecteur claude.ai (web/mobile) refuse l'auth par header et exige un
 * flux OAuth 2.1 complet : découverte (RFC 8414/9728) → enregistrement
 * dynamique de client (DCR, RFC 7591) → authorization code + PKCE (RFC 7636)
 * → token. Ce module est le cœur DÉTERMINISTE (zéro LLM) de ce flux.
 *
 * Modèle de portée IDENTIQUE à McpApiKey : un token OAuth porte
 * `scopeKind` (SYSTEM|BRAND) + `scopeStrategyId` — résolu au consentement
 * depuis les marques accessibles de l'utilisateur connecté (NextAuth). Le
 * transport `/api/mcp/rpc` applique ensuite le MÊME `enforceBrandScope`.
 *
 * Sécurité : seuls des HASH SHA-256 des tokens/codes sont comparés en base
 * (le secret n'est jamais re-dérivable) ; codes usage-unique + TTL court ;
 * PKCE S256 obligatoire ; redirect_uri validé exactement (anti open-redirect).
 */

import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { normalizeScopeKind } from "@/server/services/anubis/mcp-scope-kind";

// ── Origine publique (derrière Cloudflare/Traefik/Coolify) ───────────────
/**
 * Résout l'origine publique de la requête. Derrière les reverse-proxies de
 * prod, `request.url` est interne — on privilégie `x-forwarded-*` / `host`.
 * Fallback `NEXTAUTH_URL` puis powerupgraders.com.
 */
/**
 * Hôtes d'écoute internes du conteneur — jamais une origine publique valide.
 * Derrière Traefik/Coolify, `request.url` et parfois l'en-tête `host` portent
 * l'adresse de bind (`0.0.0.0:80`) : construire une redirection dessus produit
 * une URL injoignable par le navigateur (incident OAuth 2026-07-27 — Safari :
 * « Non autorisé à utiliser le port réseau limité »).
 */
function isBindAddress(host: string): boolean {
  const h = host.trim().toLowerCase();
  // IPv6 littéral entre crochets (`[::]:80`, `[::1]:3000`) — `split(":")` le
  // découperait à l'intérieur de l'adresse, d'où l'extraction dédiée.
  const bracketed = /^\[([^\]]*)\]/.exec(h);
  const bare = bracketed ? (bracketed[1] ?? "") : (h.split(":")[0] ?? "");
  return bare === "0.0.0.0" || bare === "127.0.0.1" || bare === "localhost" || bare === "::" || bare === "::1";
}

export function resolveOrigin(request: Request): string {
  const h = request.headers;
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const host = h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host")?.trim();
  if (host && !isBindAddress(host)) return `${proto}://${host}`;
  return (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://powerupgraders.com").replace(
    /\/+$/,
    "",
  );
}

/** Métadonnée RFC 9728 — ressource protégée → serveur(s) d'autorisation. */
export function buildProtectedResourceMetadata(origin: string) {
  return {
    resource: `${origin}/api/mcp/rpc`,
    authorization_servers: [origin],
    bearer_methods_supported: ["header"],
  };
}

/** Métadonnée RFC 8414 — serveur d'autorisation OAuth 2.1 (public + PKCE). */
export function buildAuthServerMetadata(origin: string) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/api/mcp/oauth/authorize`,
    token_endpoint: `${origin}/api/mcp/oauth/token`,
    registration_endpoint: `${origin}/api/mcp/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["mcp"],
  };
}

const CODE_TTL_MS = 10 * 60_000; // 10 min
const ACCESS_TTL_MS = 60 * 60_000; // 1 h
const REFRESH_TTL_MS = 30 * 24 * 60 * 60_000; // 30 j

export type OAuthScopeKind = "SYSTEM" | "BRAND";

export interface OAuthScope {
  scopeKind: OAuthScopeKind;
  scopeStrategyId: string | null;
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

/** base64url sans padding (RFC 7636). */
function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Vérifie un PKCE S256 : base64url(sha256(verifier)) === challenge. */
export function verifyPkceS256(verifier: string, challenge: string): boolean {
  if (!verifier || !challenge) return false;
  const computed = base64url(createHash("sha256").update(verifier).digest());
  // comparaison longueur-constante
  if (computed.length !== challenge.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ challenge.charCodeAt(i);
  return diff === 0;
}

// ── Enregistrement dynamique de client (DCR, RFC 7591) ───────────────────

export interface RegisterClientInput {
  clientName?: string;
  redirectUris: string[];
}

export async function registerClient(
  input: RegisterClientInput,
): Promise<{ clientId: string; redirectUris: string[]; clientName: string | null }> {
  const redirectUris = (input.redirectUris ?? []).filter(
    (u) => typeof u === "string" && /^https:\/\//i.test(u),
  );
  if (redirectUris.length === 0) {
    throw new Error("redirect_uris requis (au moins une URI https).");
  }
  const clientId = `lfc_${randomBytes(16).toString("hex")}`;
  const rec = await db.mcpOAuthClient.create({
    data: { clientId, clientName: input.clientName ?? null, redirectUris },
  });
  return { clientId: rec.clientId, redirectUris: rec.redirectUris, clientName: rec.clientName };
}

export async function getClient(clientId: string) {
  if (!clientId) return null;
  return db.mcpOAuthClient.findUnique({ where: { clientId } });
}

/** Un redirect_uri est valide ssi il est EXACTEMENT enregistré (anti open-redirect). */
export function redirectUriAllowed(client: { redirectUris: string[] }, redirectUri: string): boolean {
  return client.redirectUris.includes(redirectUri);
}

// ── Code d'autorisation ──────────────────────────────────────────────────

export interface IssueAuthCodeInput {
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: OAuthScope;
  resource?: string | null;
}

export async function issueAuthCode(input: IssueAuthCodeInput): Promise<string> {
  const code = `lfa_${randomBytes(32).toString("hex")}`;
  await db.mcpOAuthCode.create({
    data: {
      code: sha256(code), // seul le hash est stocké
      clientId: input.clientId,
      userId: input.userId,
      redirectUri: input.redirectUri,
      codeChallenge: input.codeChallenge,
      scopeKind: input.scope.scopeKind,
      scopeStrategyId: input.scope.scopeStrategyId,
      resource: input.resource ?? null,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  return code; // clair renvoyé UNE fois (au redirect vers le client)
}

// ── Émission / rotation de tokens ────────────────────────────────────────

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // secondes
  scope: OAuthScope;
}

async function mintTokens(clientId: string, userId: string, scope: OAuthScope): Promise<IssuedTokens> {
  const accessToken = `lft_${randomBytes(32).toString("hex")}`;
  const refreshToken = `lfr_${randomBytes(32).toString("hex")}`;
  await db.mcpOAuthToken.create({
    data: {
      accessTokenHash: sha256(accessToken),
      refreshTokenHash: sha256(refreshToken),
      clientId,
      userId,
      scopeKind: scope.scopeKind,
      scopeStrategyId: scope.scopeStrategyId,
      expiresAt: new Date(Date.now() + ACCESS_TTL_MS),
      refreshExpiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });
  return { accessToken, refreshToken, expiresIn: Math.floor(ACCESS_TTL_MS / 1000), scope };
}

export interface ExchangeCodeInput {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
}

/** Échange authorization_code → tokens. Valide usage-unique + PKCE + redirect. */
export async function exchangeCode(input: ExchangeCodeInput): Promise<IssuedTokens> {
  const row = await db.mcpOAuthCode.findUnique({ where: { code: sha256(input.code) } });
  if (!row) throw new Error("invalid_grant: code inconnu");
  // Consommation atomique — un code déjà consommé ou expiré est refusé.
  if (row.consumedAt) throw new Error("invalid_grant: code déjà utilisé");
  if (row.expiresAt < new Date()) throw new Error("invalid_grant: code expiré");
  if (row.clientId !== input.clientId) throw new Error("invalid_grant: client_id divergent");
  if (row.redirectUri !== input.redirectUri) throw new Error("invalid_grant: redirect_uri divergent");
  if (!verifyPkceS256(input.codeVerifier, row.codeChallenge)) {
    throw new Error("invalid_grant: PKCE invalide");
  }
  const consumed = await db.mcpOAuthCode.updateMany({
    where: { id: row.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (consumed.count !== 1) throw new Error("invalid_grant: code déjà utilisé (course)");
  return mintTokens(row.clientId, row.userId, {
    scopeKind: normalizeScopeKind(row.scopeKind),
    scopeStrategyId: row.scopeStrategyId,
  });
}

export interface RefreshInput {
  refreshToken: string;
  clientId: string;
}

/** grant_type=refresh_token — rotation : l'ancien refresh est révoqué. */
export async function refreshTokens(input: RefreshInput): Promise<IssuedTokens> {
  const row = await db.mcpOAuthToken.findUnique({
    where: { refreshTokenHash: sha256(input.refreshToken) },
  });
  if (!row || row.revokedAt) throw new Error("invalid_grant: refresh token invalide");
  if (row.clientId !== input.clientId) throw new Error("invalid_grant: client_id divergent");
  if (row.refreshExpiresAt && row.refreshExpiresAt < new Date()) {
    throw new Error("invalid_grant: refresh token expiré");
  }
  await db.mcpOAuthToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
  return mintTokens(row.clientId, row.userId, {
    scopeKind: normalizeScopeKind(row.scopeKind),
    scopeStrategyId: row.scopeStrategyId,
  });
}

// ── Validation d'un access token (côté transport) ────────────────────────

export interface ValidatedToken {
  userId: string;
  scopeKind: OAuthScopeKind;
  scopeStrategyId: string | null;
}

/**
 * Résout un Bearer access token → portée, ou null si invalide/expiré/révoqué.
 * `lastUsedAt` rafraîchi best-effort (jamais bloquant).
 */
export async function validateAccessToken(token: string): Promise<ValidatedToken | null> {
  if (!token || !token.startsWith("lft_")) return null;
  const row = await db.mcpOAuthToken.findUnique({ where: { accessTokenHash: sha256(token) } });
  if (!row || row.revokedAt) return null;
  if (row.expiresAt < new Date()) return null;
  db.mcpOAuthToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return {
    userId: row.userId,
    scopeKind: normalizeScopeKind(row.scopeKind),
    scopeStrategyId: row.scopeStrategyId,
  };
}
