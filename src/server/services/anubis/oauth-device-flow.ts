/**
 * Anubis — OAuth 2.1 Device Authorization Grant flow (RFC 8628) +
 * Protected Resource Metadata discovery (RFC 9728).
 *
 * Phase 16 / ADR-0028 — premier connector du repo en device flow (Higgsfield).
 * Pattern réutilisable pour tout futur MCP server externe qui requiert OAuth
 * device flow (Sora MCP, Runway MCP, etc.).
 *
 * Pipeline :
 *   1. discoverOAuthMetadata(mcpEndpoint) →
 *        GET /.well-known/oauth-protected-resource → authorization_servers[]
 *        GET <auth_server>/.well-known/oauth-authorization-server →
 *          { device_authorization_endpoint, token_endpoint, scopes_supported }
 *   2. startDeviceFlow(operatorId, serverName, clientId, scopes) →
 *        POST device_authorization_endpoint
 *          → { device_code, user_code, verification_uri, verification_uri_complete, interval, expires_in }
 *        Persiste device_code + clientId + token_endpoint dans McpRegistry.toolsCache.oauthFlow
 *        Retourne le verification_uri_complete à présenter au user.
 *   3. pollTokenEndpoint(operatorId, serverName) →
 *        POST token_endpoint avec grant_type=urn:ietf:params:oauth:grant-type:device_code
 *          → 200 OK { access_token, refresh_token, expires_in, scope } : persist + status ACTIVE
 *          → 400 authorization_pending : on continue à poller
 *          → 400 access_denied | expired_token : abort
 *   4. refreshIfNeeded(cred) → si expires_at < now+60s, POST token_endpoint refresh_token
 *
 * Sécurité :
 *   - Tokens persistés dans `ExternalConnector.config` (déjà chiffré au repos via pgcrypto, ADR-0021)
 *   - clientId stocké côté server (env var `HIGGSFIELD_OAUTH_CLIENT_ID`) — jamais exposé client
 *   - Pas de PKCE pour device flow (spec OAuth 2.1 dit que device flow n'a pas besoin de PKCE)
 */

import { db } from "@/lib/db";
import { credentialVault } from "./credential-vault";

// ── Types ────────────────────────────────────────────────────────────────

export interface OAuthMetadata {
  /** Issuer URL of the authorization server. */
  issuer: string;
  /** RFC 8628 device authorization endpoint. */
  device_authorization_endpoint: string;
  /** OAuth 2.0 token endpoint. */
  token_endpoint: string;
  /** Scopes supported by the auth server. */
  scopes_supported?: string[];
}

export interface DeviceFlowStartResponse {
  status: "OK";
  serverName: string;
  /** URL complète à ouvrir par l'utilisateur (verification_uri + user_code pré-rempli). */
  verification_uri_complete: string;
  /** Code à entrer manuellement si verification_uri_complete pas accessible. */
  user_code: string;
  /** Intervalle de polling minimum en secondes (RFC 8628 §3.5). */
  interval: number;
  /** Expiration du device_code en secondes. */
  expires_in: number;
}

export interface DeviceFlowPollResponse {
  status: "OK" | "PENDING" | "DENIED" | "EXPIRED" | "ERROR";
  reason?: string;
  /** Présent si status === "OK". */
  expires_at?: string;
}

export interface OAuthCredentialConfig {
  authMode: "oauth-device-flow";
  client_id: string;
  access_token: string;
  refresh_token?: string;
  expires_at: string; // ISO datetime
  token_endpoint: string;
  scopes_granted?: string[];
}

interface OAuthFlowState {
  device_code: string;
  client_id: string;
  token_endpoint: string;
  device_authorization_endpoint: string;
  interval: number;
  expires_at: string;
}

// ── Discovery (RFC 9728) ────────────────────────────────────────────────

/**
 * Découvre les endpoints OAuth d'un MCP server via le manifest
 * /.well-known/oauth-protected-resource → /.well-known/oauth-authorization-server.
 */
export async function discoverOAuthMetadata(mcpEndpoint: string): Promise<OAuthMetadata> {
  const baseUrl = stripPath(mcpEndpoint);

  // Step 1 : Protected Resource Metadata (RFC 9728)
  const prmUrl = `${baseUrl}/.well-known/oauth-protected-resource`;
  const prmRes = await fetch(prmUrl, { headers: { accept: "application/json" } });
  if (!prmRes.ok) {
    throw new Error(`OAuth discovery failed at ${prmUrl}: HTTP ${prmRes.status}`);
  }
  const prm = (await prmRes.json()) as { authorization_servers?: string[] };
  const authServer = prm.authorization_servers?.[0];
  if (!authServer) {
    throw new Error(`OAuth discovery: no authorization_servers found at ${prmUrl}`);
  }

  // Step 2 : Authorization Server Metadata (RFC 8414)
  const asmUrl = `${stripPath(authServer)}/.well-known/oauth-authorization-server`;
  const asmRes = await fetch(asmUrl, { headers: { accept: "application/json" } });
  if (!asmRes.ok) {
    throw new Error(`OAuth discovery failed at ${asmUrl}: HTTP ${asmRes.status}`);
  }
  const asm = (await asmRes.json()) as Partial<OAuthMetadata>;
  if (!asm.device_authorization_endpoint || !asm.token_endpoint) {
    throw new Error(
      `OAuth discovery at ${asmUrl}: missing device_authorization_endpoint or token_endpoint`,
    );
  }

  return {
    issuer: asm.issuer ?? authServer,
    device_authorization_endpoint: asm.device_authorization_endpoint,
    token_endpoint: asm.token_endpoint,
    scopes_supported: asm.scopes_supported,
  };
}

// ── Device flow start ────────────────────────────────────────────────────

/**
 * Démarre le device flow pour un MCP server. Persiste l'état flow dans
 * McpRegistry.toolsCache.oauthFlow pour que le poll puisse le reprendre.
 * Retourne le verification_uri_complete à afficher au user.
 */
export async function startDeviceFlow(args: {
  operatorId: string;
  serverName: string;
  clientId: string;
  scopes?: string[];
}): Promise<DeviceFlowStartResponse> {
  const registry = await db.mcpRegistry.findUnique({
    where: {
      operatorId_direction_serverName: {
        operatorId: args.operatorId,
        direction: "INBOUND",
        serverName: args.serverName,
      },
    },
  });
  if (!registry || !registry.endpoint) {
    throw new Error(
      `MCP server ${args.serverName} not registered (or missing endpoint) for operator ${args.operatorId}`,
    );
  }

  const meta = await discoverOAuthMetadata(registry.endpoint);

  const body = new URLSearchParams({ client_id: args.clientId });
  if (args.scopes && args.scopes.length > 0) body.set("scope", args.scopes.join(" "));

  const res = await fetch(meta.device_authorization_endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(
      `Device authorization request failed at ${meta.device_authorization_endpoint}: HTTP ${res.status}`,
    );
  }

  const dev = (await res.json()) as {
    device_code: string;
    user_code: string;
    verification_uri: string;
    verification_uri_complete?: string;
    interval?: number;
    expires_in: number;
  };

  const interval = Math.max(1, dev.interval ?? 5);
  const expiresAt = new Date(Date.now() + dev.expires_in * 1000).toISOString();

  const flowState: OAuthFlowState = {
    device_code: dev.device_code,
    client_id: args.clientId,
    token_endpoint: meta.token_endpoint,
    device_authorization_endpoint: meta.device_authorization_endpoint,
    interval,
    expires_at: expiresAt,
  };

  // Persiste l'état flow dans McpRegistry.toolsCache (champ Json déjà existant).
  // toolsCache contient {tools, oauthFlow} — on préserve les autres clés.
  const existingCache = (registry.toolsCache ?? {}) as Record<string, unknown>;
  await db.mcpRegistry.update({
    where: { id: registry.id },
    data: {
      toolsCache: { ...existingCache, oauthFlow: flowState } as never,
      status: "SYNCING",
    },
  });

  return {
    status: "OK",
    serverName: args.serverName,
    verification_uri_complete:
      dev.verification_uri_complete ?? `${dev.verification_uri}?user_code=${dev.user_code}`,
    user_code: dev.user_code,
    interval,
    expires_in: dev.expires_in,
  };
}

// ── Device flow poll ─────────────────────────────────────────────────────

/**
 * Poll le token endpoint pour récupérer access_token+refresh_token quand le user
 * a autorisé. Une seule itération — caller doit boucler à `interval` seconds.
 */
export async function pollTokenEndpoint(args: {
  operatorId: string;
  serverName: string;
}): Promise<DeviceFlowPollResponse> {
  const registry = await db.mcpRegistry.findUnique({
    where: {
      operatorId_direction_serverName: {
        operatorId: args.operatorId,
        direction: "INBOUND",
        serverName: args.serverName,
      },
    },
  });
  if (!registry) {
    return { status: "ERROR", reason: `MCP server ${args.serverName} not registered` };
  }

  const cache = (registry.toolsCache ?? {}) as { oauthFlow?: OAuthFlowState };
  const flow = cache.oauthFlow;
  if (!flow) {
    return { status: "ERROR", reason: "no active device flow — call startDeviceFlow first" };
  }
  if (new Date(flow.expires_at).getTime() < Date.now()) {
    return { status: "EXPIRED", reason: "device_code expired — restart device flow" };
  }

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    device_code: flow.device_code,
    client_id: flow.client_id,
  });

  const res = await fetch(flow.token_endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: body.toString(),
  });

  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
  };

  // RFC 8628 §3.5 — error codes pendant polling
  if (!res.ok) {
    if (data.error === "authorization_pending") {
      return { status: "PENDING" };
    }
    if (data.error === "slow_down") {
      return { status: "PENDING", reason: "slow_down" };
    }
    if (data.error === "access_denied") {
      return { status: "DENIED", reason: data.error_description ?? "user denied authorization" };
    }
    if (data.error === "expired_token") {
      return { status: "EXPIRED", reason: "device_code expired" };
    }
    return { status: "ERROR", reason: data.error ?? `HTTP ${res.status}` };
  }

  if (!data.access_token) {
    return { status: "ERROR", reason: "token endpoint returned 200 but no access_token" };
  }

  const expiresInSec = data.expires_in ?? 3600;
  const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();
  const credConfig: OAuthCredentialConfig = {
    authMode: "oauth-device-flow",
    client_id: flow.client_id,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
    token_endpoint: flow.token_endpoint,
    scopes_granted: data.scope ? data.scope.split(/\s+/) : undefined,
  };

  // Persiste dans Credentials Vault (chiffré au repos) + clear flow state.
  await credentialVault.register(
    args.operatorId,
    `mcp:${args.serverName}`,
    credConfig as unknown as Record<string, unknown>,
    true, // activate
  );

  const newCache = { ...((registry.toolsCache ?? {}) as Record<string, unknown>) };
  delete (newCache as { oauthFlow?: unknown }).oauthFlow;
  await db.mcpRegistry.update({
    where: { id: registry.id },
    data: {
      toolsCache: newCache as never,
      credentialRef: `mcp:${args.serverName}`,
      status: "ACTIVE",
      lastSyncAt: new Date(),
    },
  });

  return { status: "OK", expires_at: expiresAt };
}

// ── Refresh ──────────────────────────────────────────────────────────────

/**
 * Refresh transparent : si l'access_token expire dans <60s, refresh via
 * refresh_token. Persiste le nouveau triplet et retourne le nouveau access_token.
 * Si pas de refresh_token (auth server ne le fournit pas) ou refresh échoue,
 * marque le credential ERROR et retourne null.
 *
 * Appelé depuis mcp-client.invokeExternalTool avant chaque call externe.
 */
export async function refreshIfNeeded(args: {
  operatorId: string;
  serverName: string;
  config: Record<string, unknown>;
}): Promise<{ access_token: string; expires_at: string } | null> {
  const cfg = args.config as unknown as Partial<OAuthCredentialConfig>;
  if (cfg.authMode !== "oauth-device-flow" || !cfg.access_token) {
    return null;
  }
  const expiresAt = cfg.expires_at ? new Date(cfg.expires_at).getTime() : 0;
  const needsRefresh = expiresAt - Date.now() < 60_000;

  if (!needsRefresh) {
    return { access_token: cfg.access_token, expires_at: cfg.expires_at ?? "" };
  }

  if (!cfg.refresh_token || !cfg.token_endpoint || !cfg.client_id) {
    await credentialVault.markError(args.operatorId, `mcp:${args.serverName}`, {
      reason: "access_token expired and no refresh_token available — re-run device flow",
    });
    return null;
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: cfg.refresh_token,
    client_id: cfg.client_id,
  });

  try {
    const res = await fetch(cfg.token_endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body: body.toString(),
    });
    if (!res.ok) {
      throw new Error(`refresh failed: HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) throw new Error("refresh returned no access_token");

    const newExpiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString();
    const updated: OAuthCredentialConfig = {
      ...(cfg as OAuthCredentialConfig),
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? cfg.refresh_token,
      expires_at: newExpiresAt,
    };
    await credentialVault.register(
      args.operatorId,
      `mcp:${args.serverName}`,
      updated as unknown as Record<string, unknown>,
      true,
    );
    return { access_token: data.access_token, expires_at: newExpiresAt };
  } catch (err) {
    await credentialVault.markError(args.operatorId, `mcp:${args.serverName}`, {
      reason: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

function stripPath(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return url.replace(/\/+$/, "");
  }
}
