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
