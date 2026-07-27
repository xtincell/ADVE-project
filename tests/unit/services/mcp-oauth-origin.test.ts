/**
 * `resolveOrigin` — l'origine publique ne doit JAMAIS être l'adresse de bind
 * du conteneur (incident OAuth 2026-07-27).
 *
 * Derrière Traefik/Coolify, `request.url` et parfois l'en-tête `host` portent
 * `0.0.0.0:80`. Une redirection construite dessus est injoignable par le
 * navigateur (Safari : « Non autorisé à utiliser le port réseau limité »), ce
 * qui cassait le flux du connecteur claude.ai à l'étape /login.
 */

import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { resolveOrigin } from "@/server/services/anubis/mcp-oauth";

const req = (headers: Record<string, string>) => new Request("http://0.0.0.0:80/api/mcp/oauth/authorize", { headers });

describe("resolveOrigin — origine publique", () => {
  const saved = { nextauth: process.env.NEXTAUTH_URL, base: process.env.NEXT_PUBLIC_BASE_URL };

  beforeEach(() => {
    process.env.NEXTAUTH_URL = "https://powerupgraders.com";
    delete process.env.NEXT_PUBLIC_BASE_URL;
  });
  afterEach(() => {
    if (saved.nextauth === undefined) delete process.env.NEXTAUTH_URL;
    else process.env.NEXTAUTH_URL = saved.nextauth;
    if (saved.base === undefined) delete process.env.NEXT_PUBLIC_BASE_URL;
    else process.env.NEXT_PUBLIC_BASE_URL = saved.base;
  });

  it("privilégie x-forwarded-host + x-forwarded-proto (cas nominal derrière le proxy)", () => {
    expect(
      resolveOrigin(req({ "x-forwarded-host": "powerupgraders.com", "x-forwarded-proto": "https", host: "0.0.0.0:80" })),
    ).toBe("https://powerupgraders.com");
  });

  it("ne retombe JAMAIS sur une adresse de bind, même si `host` la porte", () => {
    for (const bind of ["0.0.0.0:80", "127.0.0.1:3000", "localhost:80", "[::]:80"]) {
      const origin = resolveOrigin(req({ host: bind }));
      expect(origin).toBe("https://powerupgraders.com");
      expect(origin).not.toContain("0.0.0.0");
      expect(origin).not.toContain("localhost");
    }
  });

  it("prend le premier maillon d'une chaîne x-forwarded-host", () => {
    expect(resolveOrigin(req({ "x-forwarded-host": "powerupgraders.com, interne.local" }))).toBe(
      "https://powerupgraders.com",
    );
  });

  it("accepte un hôte public réel porté par `host` seul", () => {
    expect(resolveOrigin(req({ host: "lafuseev6.powerupgraders.com", "x-forwarded-proto": "https" }))).toBe(
      "https://lafuseev6.powerupgraders.com",
    );
  });

  it("retombe sur NEXT_PUBLIC_BASE_URL si NEXTAUTH_URL est absent, sans slash final", () => {
    delete process.env.NEXTAUTH_URL;
    process.env.NEXT_PUBLIC_BASE_URL = "https://powerupgraders.com/";
    expect(resolveOrigin(req({ host: "0.0.0.0:80" }))).toBe("https://powerupgraders.com");
  });
});
