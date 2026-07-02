import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { signSessionToken, type SessionPayload } from "@/lib/session-token";
import {
  ORACLE_SHARE_SCOPE,
  RAPPORT_SHARE_SCOPE,
  SHARE_TOKEN_TTL_SECONDS,
  signOracleShareToken,
  signRapportShareToken,
  verifyOracleShareToken,
  verifyRapportShareToken,
} from "@/server/share";

/**
 * Tokens de partage (WP-023) — tests PURS : jose + Zod, aucune DB.
 * Le contrat : signature/expiration/forme vérifiées, scope discriminant
 * (session ≠ partage Oracle ≠ rapport), null sur tout token douteux.
 */

const secret = new TextEncoder().encode("secret-de-test-uniquement");
const otherSecret = new TextEncoder().encode("un-autre-secret");

const oracleClaims = { deliverableId: "del_1", brandId: "brand_1" };
const rapportClaims = { leadId: "lead_1" };

describe("tokens de partage Oracle (sign/verify purs)", () => {
  it("aller-retour : claims intacts + scope posé", async () => {
    const token = await signOracleShareToken(oracleClaims, secret);
    const decoded = await verifyOracleShareToken(token, secret);
    expect(decoded).toMatchObject({ scope: ORACLE_SHARE_SCOPE, ...oracleClaims });
  });

  it("TTL par défaut = 30 jours", () => {
    expect(SHARE_TOKEN_TTL_SECONDS).toBe(60 * 60 * 24 * 30);
  });

  it("token expiré → null (jamais de throw)", async () => {
    const token = await signOracleShareToken(oracleClaims, secret, -60); // expiré depuis 1 min
    expect(await verifyOracleShareToken(token, secret)).toBeNull();
  });

  it("mauvais secret → null", async () => {
    const token = await signOracleShareToken(oracleClaims, secret);
    expect(await verifyOracleShareToken(token, otherSecret)).toBeNull();
  });

  it("token malformé ou vide → null", async () => {
    expect(await verifyOracleShareToken("n-importe-quoi", secret)).toBeNull();
    expect(await verifyOracleShareToken("", secret)).toBeNull();
  });

  it("token falsifié (payload réécrit après signature) → null", async () => {
    const token = await signOracleShareToken(oracleClaims, secret);
    const [header, , signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({
        scope: ORACLE_SHARE_SCOPE,
        deliverableId: "del_VOLE",
        brandId: "brand_VOLE",
      }),
    ).toString("base64url");
    expect(await verifyOracleShareToken(`${header}.${forged}.${signature}`, secret)).toBeNull();
  });

  it("JWT valide mais claims incomplets → null (Zod à la frontière)", async () => {
    const now = Math.floor(Date.now() / 1000);
    const missingBrand = await new SignJWT({
      scope: ORACLE_SHARE_SCOPE,
      deliverableId: "del_1",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(secret);
    expect(await verifyOracleShareToken(missingBrand, secret)).toBeNull();
  });
});

describe("tokens de rapport ADVE (sign/verify purs)", () => {
  it("aller-retour : claims intacts + scope posé", async () => {
    const token = await signRapportShareToken(rapportClaims, secret);
    const decoded = await verifyRapportShareToken(token, secret);
    expect(decoded).toMatchObject({ scope: RAPPORT_SHARE_SCOPE, ...rapportClaims });
  });

  it("token expiré → null", async () => {
    const token = await signRapportShareToken(rapportClaims, secret, -60);
    expect(await verifyRapportShareToken(token, secret)).toBeNull();
  });

  it("mauvais secret → null", async () => {
    const token = await signRapportShareToken(rapportClaims, secret);
    expect(await verifyRapportShareToken(token, otherSecret)).toBeNull();
  });

  it("leadId vide → null (min 1 imposé par le schéma)", async () => {
    const token = await signRapportShareToken({ leadId: "" }, secret);
    expect(await verifyRapportShareToken(token, secret)).toBeNull();
  });
});

describe("cloisonnement des scopes (même secret AUTH_SECRET partout)", () => {
  it("un token Oracle ne résout JAMAIS un rapport, et réciproquement", async () => {
    const oracleToken = await signOracleShareToken(oracleClaims, secret);
    const rapportToken = await signRapportShareToken(rapportClaims, secret);
    expect(await verifyRapportShareToken(oracleToken, secret)).toBeNull();
    expect(await verifyOracleShareToken(rapportToken, secret)).toBeNull();
  });

  it("un JWT de SESSION (même secret) n'est jamais un token de partage", async () => {
    const session: SessionPayload = {
      userId: "user_1",
      workspaceId: "ws_1",
      role: "OWNER",
      workspaceKind: "BRAND",
    };
    const sessionToken = await signSessionToken(session, secret);
    expect(await verifyOracleShareToken(sessionToken, secret)).toBeNull();
    expect(await verifyRapportShareToken(sessionToken, secret)).toBeNull();
  });

  it("un token de partage forgé avec le mauvais scope littéral → null", async () => {
    const now = Math.floor(Date.now() / 1000);
    const wrongScope = await new SignJWT({ scope: "share.autre", ...oracleClaims })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(secret);
    expect(await verifyOracleShareToken(wrongScope, secret)).toBeNull();
    expect(await verifyRapportShareToken(wrongScope, secret)).toBeNull();
  });
});
