import { describe, expect, it } from "vitest";
import {
  buildResetUrl,
  deriveSlug,
  generateResetToken,
  hashResetToken,
  normalizeEmail,
  RESET_TOKEN_TTL_MS,
  resetTokenState,
} from "@/server/identity";

/**
 * WP-022 — règles PURES du module identity (pas de DB) : le contrat du token
 * de réinitialisation (aléa, hash-only en base, TTL 1 h, usage unique) + les
 * normalisations existantes (email, slug). Le cycle complet contre Postgres
 * vit dans tests/identity-smoke.db.test.ts (gated SMOKE_DATABASE_URL).
 */

const T0 = new Date("2026-07-02T10:00:00.000Z");
const afterMs = (ms: number) => new Date(T0.getTime() + ms);

describe("generateResetToken (aléa URL-safe)", () => {
  it("32 octets d'aléa → base64url d'au moins 40 caractères, segment d'URL sûr", () => {
    const token = generateResetToken();
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/); // aucun caractère à encoder
  });

  it("deux tokens ne se répètent jamais", () => {
    const seen = new Set(Array.from({ length: 50 }, () => generateResetToken()));
    expect(seen.size).toBe(50);
  });
});

describe("hashResetToken (empreinte stockée — jamais le clair)", () => {
  it("SHA-256 hex : 64 caractères hexadécimaux", () => {
    expect(hashResetToken("abc")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("déterministe : même token → même empreinte (le lookup en dépend)", () => {
    const token = generateResetToken();
    expect(hashResetToken(token)).toBe(hashResetToken(token));
  });

  it("deux tokens différents → empreintes différentes", () => {
    expect(hashResetToken("token-a")).not.toBe(hashResetToken("token-b"));
  });

  it("l'empreinte ne contient jamais le token clair", () => {
    const token = generateResetToken();
    expect(hashResetToken(token)).not.toContain(token);
  });
});

describe("resetTokenState (TTL 1 h + usage unique)", () => {
  it("le TTL canon est 1 heure", () => {
    expect(RESET_TOKEN_TTL_MS).toBe(60 * 60 * 1000);
  });

  it("non consommé et avant l'échéance → VALID (jusqu'à la dernière milliseconde)", () => {
    const row = { expiresAt: afterMs(RESET_TOKEN_TTL_MS), usedAt: null };
    expect(resetTokenState(row, T0)).toBe("VALID");
    expect(resetTokenState(row, afterMs(RESET_TOKEN_TTL_MS - 1))).toBe("VALID");
  });

  it("à l'instant exact d'expiration et au-delà → EXPIRED", () => {
    const row = { expiresAt: afterMs(RESET_TOKEN_TTL_MS), usedAt: null };
    expect(resetTokenState(row, afterMs(RESET_TOKEN_TTL_MS))).toBe("EXPIRED");
    expect(resetTokenState(row, afterMs(RESET_TOKEN_TTL_MS * 2))).toBe("EXPIRED");
  });

  it("consommé → USED, même si le TTL court encore (usage unique)", () => {
    const row = { expiresAt: afterMs(RESET_TOKEN_TTL_MS), usedAt: afterMs(1000) };
    expect(resetTokenState(row, afterMs(2000))).toBe("USED");
  });

  it("consommé PUIS expiré → USED prime (l'usage est le fait irréversible)", () => {
    const row = { expiresAt: afterMs(1000), usedAt: afterMs(500) };
    expect(resetTokenState(row, afterMs(RESET_TOKEN_TTL_MS * 3))).toBe("USED");
  });
});

describe("buildResetUrl (lien transmis par l'opérateur)", () => {
  it("compose base + /reinitialiser/ + token", () => {
    expect(buildResetUrl("tok-123", "https://exemple.com")).toBe(
      "https://exemple.com/reinitialiser/tok-123",
    );
  });

  it("les slashs de fin de base sont retirés (jamais de double slash)", () => {
    expect(buildResetUrl("tok", "https://exemple.com///")).toBe(
      "https://exemple.com/reinitialiser/tok",
    );
  });

  it("un token base64url traverse tel quel (URL-safe par construction)", () => {
    const token = generateResetToken();
    expect(buildResetUrl(token, "https://exemple.com")).toBe(
      `https://exemple.com/reinitialiser/${token}`,
    );
  });
});

describe("normalizeEmail / deriveSlug (normalisations existantes)", () => {
  it("normalizeEmail : trim + minuscules", () => {
    expect(normalizeEmail("  Fondateur@Marque.CM ")).toBe("fondateur@marque.cm");
  });

  it("deriveSlug : diacritiques et séparateurs aplatis, fallback « marque »", () => {
    expect(deriveSlug("La Fusée Café")).toBe("la-fusee-cafe");
    expect(deriveSlug("!!!")).toBe("marque");
  });
});
