import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import {
  isAdminSession,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/session-token";

const secret = new TextEncoder().encode("secret-de-test-uniquement");
const otherSecret = new TextEncoder().encode("un-autre-secret");

const payload: SessionPayload = {
  userId: "user_1",
  workspaceId: "ws_1",
  role: "OWNER",
  workspaceKind: "BRAND",
};

describe("signSessionToken / verifySessionToken (pur — pas de DB)", () => {
  it("aller-retour : le payload ressort intact", async () => {
    const token = await signSessionToken(payload, secret);
    const decoded = await verifySessionToken(token, secret);
    expect(decoded).toMatchObject(payload);
  });

  it("TTL par défaut = 30 jours", () => {
    expect(SESSION_MAX_AGE_SECONDS).toBe(60 * 60 * 24 * 30);
  });

  it("token expiré → null (jamais de throw)", async () => {
    const token = await signSessionToken(payload, secret, -60); // expiré depuis 1 min
    expect(await verifySessionToken(token, secret)).toBeNull();
  });

  it("mauvais secret → null", async () => {
    const token = await signSessionToken(payload, secret);
    expect(await verifySessionToken(token, otherSecret)).toBeNull();
  });

  it("token malformé ou vide → null", async () => {
    expect(await verifySessionToken("n-importe-quoi", secret)).toBeNull();
    expect(await verifySessionToken("", secret)).toBeNull();
  });

  it("token falsifié (payload modifié après signature) → null", async () => {
    const token = await signSessionToken(payload, secret);
    const [header, , signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...payload, role: "OPERATOR" }),
    ).toString("base64url");
    expect(await verifySessionToken(`${header}.${forged}.${signature}`, secret)).toBeNull();
  });

  it("JWT valide mais payload hors schéma → null (Zod à la frontière)", async () => {
    const now = Math.floor(Date.now() / 1000);
    const missingFields = await new SignJWT({ userId: "user_1" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(secret);
    expect(await verifySessionToken(missingFields, secret)).toBeNull();

    const badRole = await new SignJWT({ ...payload, role: "SUPERADMIN" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(secret);
    expect(await verifySessionToken(badRole, secret)).toBeNull();
  });
});

describe("isAdminSession (règle /admin du middleware)", () => {
  it("OPERATOR → admin, quel que soit le workspace", () => {
    expect(isAdminSession({ ...payload, role: "OPERATOR", workspaceKind: "AGENCY" })).toBe(true);
    expect(isAdminSession({ ...payload, role: "OPERATOR", workspaceKind: "BRAND" })).toBe(true);
  });

  it("OWNER d'une AGENCY → admin ; OWNER d'une BRAND → non", () => {
    expect(isAdminSession({ ...payload, role: "OWNER", workspaceKind: "AGENCY" })).toBe(true);
    expect(isAdminSession({ ...payload, role: "OWNER", workspaceKind: "BRAND" })).toBe(false);
  });

  it("MEMBER / CLIENT → jamais admin", () => {
    expect(isAdminSession({ ...payload, role: "MEMBER", workspaceKind: "AGENCY" })).toBe(false);
    expect(isAdminSession({ ...payload, role: "CLIENT", workspaceKind: "AGENCY" })).toBe(false);
  });
});
