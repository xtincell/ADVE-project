/**
 * Webhook LinkedIn — verrous du contrat de validation :
 *   (1) challengeResponse = HMAC-SHA256 hex (challengeCode, client secret) —
 *       vecteur connu, indépendant de l'implémentation ;
 *   (2) la route répond au GET challenge et refuse sans challengeCode ;
 *   (3) v1 sans persistance : l'événement membre n'écrit RIEN en base
 *       (minimisation RGPD — on ne stocke pas ce qu'on ne consomme pas).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computeLinkedInChallengeResponse } from "@/server/services/oauth-integrations";

const ROUTE = readFileSync(
  join(process.cwd(), "src/app/api/integrations/linkedin/webhook/route.ts"),
  "utf8",
);

describe("webhook LinkedIn — challenge + doctrine", () => {
  it("(1) HMAC-SHA256 hex conforme (vecteur indépendant)", () => {
    const secret = "test-secret";
    const code = "abc123";
    const expected = createHmac("sha256", secret).update(code).digest("hex");
    expect(computeLinkedInChallengeResponse(code, secret)).toBe(expected);
    expect(computeLinkedInChallengeResponse(code, secret)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("(2) la route gère challengeCode (GET) et la signature X-LI-Signature (POST)", () => {
    expect(ROUTE).toContain("challengeCode");
    expect(ROUTE).toContain("challengeResponse");
    expect(ROUTE).toContain("x-li-signature");
    expect(ROUTE).toContain("timingSafeEqual");
    // Sans secret env → 503 honnête, jamais une signature vide.
    expect(ROUTE).toContain("linkedin_not_configured");
  });

  it("(3) aucune persistance de donnée membre (v1 ACK only)", () => {
    expect(ROUTE).not.toMatch(/from "@\/lib\/db"|prisma|db\./);
  });
});

// ── getPublicBaseUrl — redirect_uri fiable derrière le reverse-proxy ─────────
import { getPublicBaseUrl } from "@/server/services/oauth-integrations";

describe("getPublicBaseUrl (proxy-aware)", () => {
  const make = (url: string, headers: Record<string, string>) =>
    new Request(url, { headers });

  it("honore x-forwarded-proto/host derrière Coolify (https public, http interne)", () => {
    const req = make("http://10.0.1.5:3000/api/integrations/oauth/linkedin/start", {
      "x-forwarded-proto": "https",
      "x-forwarded-host": "powerupgraders.com",
      host: "10.0.1.5:3000",
    });
    expect(getPublicBaseUrl(req)).toBe("https://powerupgraders.com");
  });

  it("force https pour un hôte public même sans header forwarded", () => {
    const req = make("http://powerupgraders.com/api/x", { host: "powerupgraders.com" });
    expect(getPublicBaseUrl(req)).toBe("https://powerupgraders.com");
  });

  it("préserve http pour localhost (dev + CI Golden Path)", () => {
    const req = make("http://localhost:3000/api/x", { host: "localhost:3000" });
    expect(getPublicBaseUrl(req)).toBe("http://localhost:3000");
  });
});

// ── buildAuthorizeUrl — dialectes par provider (fix « Sorry, something went wrong ») ──
import { buildAuthorizeUrl, getProviderConfig } from "@/server/services/oauth-integrations";

describe("buildAuthorizeUrl — dialectes provider", () => {
  const metaEnv = {
    META_APP_ID: "1234567890",
    META_APP_SECRET: "s".repeat(20),
    GOOGLE_CLIENT_ID: "g-client",
    GOOGLE_CLIENT_SECRET: "g-secret",
  };
  const saved: Record<string, string | undefined> = {};
  beforeAll(() => {
    for (const [k, v] of Object.entries(metaEnv)) { saved[k] = process.env[k]; process.env[k] = v; }
  });
  afterAll(() => {
    for (const k of Object.keys(metaEnv)) {
      if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
    }
    delete process.env.META_LOGIN_CONFIG_ID;
  });

  it("Meta : jamais access_type/prompt (dialecte Google) ; scope classique sans config", () => {
    delete process.env.META_LOGIN_CONFIG_ID;
    const config = getProviderConfig("meta")!;
    const url = new URL(buildAuthorizeUrl({ config, redirectUri: "https://x/cb", state: "s" }));
    expect(url.searchParams.get("access_type")).toBeNull();
    expect(url.searchParams.get("prompt")).toBeNull();
    expect(url.searchParams.get("scope")).toBeTruthy();
    expect(url.searchParams.get("config_id")).toBeNull();
  });

  it("Meta + META_LOGIN_CONFIG_ID : config_id envoyé, scope retiré (Login for Business)", () => {
    process.env.META_LOGIN_CONFIG_ID = "111222333";
    const config = getProviderConfig("meta")!;
    const url = new URL(buildAuthorizeUrl({ config, redirectUri: "https://x/cb", state: "s" }));
    expect(url.searchParams.get("config_id")).toBe("111222333");
    expect(url.searchParams.get("scope")).toBeNull();
    delete process.env.META_LOGIN_CONFIG_ID;
  });

  it("Meta + forceReselect : auth_type=reauthorize (impose l'écran de choix de Page)", () => {
    delete process.env.META_LOGIN_CONFIG_ID;
    const config = getProviderConfig("meta")!;
    const withReselect = new URL(buildAuthorizeUrl({ config, redirectUri: "https://x/cb", state: "s", forceReselect: true }));
    expect(withReselect.searchParams.get("auth_type")).toBe("reauthorize");
    const without = new URL(buildAuthorizeUrl({ config, redirectUri: "https://x/cb", state: "s" }));
    expect(without.searchParams.get("auth_type")).toBeNull();
  });

  it("Google : access_type/prompt conservés (il les lit réellement)", () => {
    const config = getProviderConfig("google")!;
    const url = new URL(buildAuthorizeUrl({ config, redirectUri: "https://x/cb", state: "s" }));
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
  });
});
