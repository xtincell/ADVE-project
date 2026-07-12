/**
 * Webhook LinkedIn — verrous du contrat de validation :
 *   (1) challengeResponse = HMAC-SHA256 hex (challengeCode, client secret) —
 *       vecteur connu, indépendant de l'implémentation ;
 *   (2) la route répond au GET challenge et refuse sans challengeCode ;
 *   (3) v1 sans persistance : l'événement membre n'écrit RIEN en base
 *       (minimisation RGPD — on ne stocke pas ce qu'on ne consomme pas).
 */
import { describe, it, expect } from "vitest";
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
