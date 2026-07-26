/**
 * ADR-0183 — serveur OAuth 2.1 du endpoint MCP : verrous (HARD).
 *
 * Combine des tests de fonctions PURES (PKCE, métadonnées de découverte,
 * validation redirect_uri) et un scan de source des invariants de sécurité
 * (code usage-unique, PKCE obligatoire, tokens hashés, WWW-Authenticate,
 * redirect_uri validé exactement) — pour que la classe ne régresse pas.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAuthServerMetadata,
  buildProtectedResourceMetadata,
  redirectUriAllowed,
  resolveOrigin,
  verifyPkceS256,
} from "@/server/services/anubis/mcp-oauth";

const ROOT = process.cwd();
const src = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

describe("ADR-0183 — PKCE S256", () => {
  it("accepte un couple verifier/challenge valide", () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = base64url(createHash("sha256").update(verifier).digest());
    expect(verifyPkceS256(verifier, challenge)).toBe(true);
  });

  it("rejette un verifier qui ne correspond pas", () => {
    const challenge = base64url(createHash("sha256").update("bon-verifier").digest());
    expect(verifyPkceS256("mauvais-verifier", challenge)).toBe(false);
  });

  it("rejette les entrées vides", () => {
    expect(verifyPkceS256("", "x")).toBe(false);
    expect(verifyPkceS256("x", "")).toBe(false);
  });
});

describe("ADR-0183 — métadonnées de découverte", () => {
  it("resolveOrigin privilégie x-forwarded-* (derrière proxy)", () => {
    const req = new Request("http://internal.local/whatever", {
      headers: { "x-forwarded-proto": "https", "x-forwarded-host": "powerupgraders.com" },
    });
    expect(resolveOrigin(req)).toBe("https://powerupgraders.com");
  });

  it("protected-resource pointe le endpoint rpc + le serveur d'autorisation", () => {
    const m = buildProtectedResourceMetadata("https://powerupgraders.com");
    expect(m.resource).toBe("https://powerupgraders.com/api/mcp/rpc");
    expect(m.authorization_servers).toEqual(["https://powerupgraders.com"]);
  });

  it("authorization-server annonce PKCE S256 + client public + les 3 endpoints", () => {
    const m = buildAuthServerMetadata("https://powerupgraders.com");
    expect(m.code_challenge_methods_supported).toEqual(["S256"]);
    expect(m.token_endpoint_auth_methods_supported).toEqual(["none"]);
    expect(m.authorization_endpoint).toContain("/api/mcp/oauth/authorize");
    expect(m.token_endpoint).toContain("/api/mcp/oauth/token");
    expect(m.registration_endpoint).toContain("/api/mcp/oauth/register");
    expect(m.grant_types_supported).toContain("authorization_code");
    expect(m.grant_types_supported).toContain("refresh_token");
  });
});

describe("ADR-0183 — redirect_uri validé exactement (anti open-redirect)", () => {
  it("n'autorise QUE les URIs enregistrées, au caractère près", () => {
    const client = { redirectUris: ["https://claude.ai/api/mcp/auth_callback"] };
    expect(redirectUriAllowed(client, "https://claude.ai/api/mcp/auth_callback")).toBe(true);
    expect(redirectUriAllowed(client, "https://claude.ai/api/mcp/auth_callback/evil")).toBe(false);
    expect(redirectUriAllowed(client, "https://evil.example/cb")).toBe(false);
  });
});

describe("ADR-0183 — invariants de sécurité (scan source)", () => {
  const service = src("src/server/services/anubis/mcp-oauth.ts");
  const authorize = src("src/app/api/mcp/oauth/authorize/route.ts");
  const rpc = src("src/app/api/mcp/rpc/route.ts");
  const billing = src("src/server/services/anubis/mcp-billing.ts");

  it("les codes et tokens sont stockés HASHÉS (jamais en clair)", () => {
    // Le code stocké est un sha256, l'access/refresh aussi.
    expect(service).toMatch(/code:\s*sha256\(code\)/);
    expect(service).toMatch(/accessTokenHash:\s*sha256\(accessToken\)/);
    expect(service).toMatch(/refreshTokenHash:\s*sha256\(refreshToken\)/);
  });

  it("le code d'autorisation est usage-unique (consommation atomique)", () => {
    expect(service).toContain("consumedAt");
    expect(service).toMatch(/updateMany\(\{[\s\S]*consumedAt:\s*null[\s\S]*data:\s*\{\s*consumedAt/);
  });

  it("l'échange de code vérifie le PKCE + redirect_uri + client_id", () => {
    expect(service).toContain("verifyPkceS256(input.codeVerifier, row.codeChallenge)");
    expect(service).toMatch(/redirectUri !== input\.redirectUri/);
    expect(service).toMatch(/clientId !== input\.clientId/);
  });

  it("le refresh est ROTÉ (l'ancien révoqué)", () => {
    expect(service).toMatch(/revokedAt:\s*new Date\(\)/);
  });

  it("authorize exige PKCE S256 + valide redirect_uri AVANT toute redirection", () => {
    expect(authorize).toContain("redirectUriAllowed(client");
    expect(authorize).toMatch(/codeChallengeMethod !== "S256"/);
    // La portée soumise est RE-vérifiée serveur-side.
    expect(authorize).toContain("resolveScope(");
  });

  it("le transport rpc renvoie WWW-Authenticate (déclenche la découverte OAuth)", () => {
    expect(rpc).toContain("WWW-Authenticate");
    expect(rpc).toContain("resource_metadata");
  });

  it("le Bearer OAuth est validé par hash dans authenticateMcpRequest", () => {
    expect(billing).toContain("validateAccessToken(");
    expect(billing).toMatch(/authz\?\.startsWith\("Bearer "\)/);
  });
});
