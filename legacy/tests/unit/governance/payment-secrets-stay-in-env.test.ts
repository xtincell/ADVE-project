/**
 * ADR-0075 — Payment provider secrets STAY in env vars (never in DB)
 *
 * Le model Prisma `PaymentProviderConfig` a un commentaire explicite :
 *
 *   /// Secrets STAY in env vars (never in DB).
 *
 * Ce test verrouille deux invariants :
 *
 * 1. Les providers paiement (`cinetpay.ts` / `stripe.ts` / `paypal.ts`)
 *    lisent leurs secrets depuis `process.env.*` UNIQUEMENT.
 * 2. La mutation `adminUpdateProviderConfig` rejette les keys secrets-like
 *    dans le payload `config` (api_key, secret, password, token, etc.).
 *
 * Mode HARD — toute violation fait FAIL la CI.
 */

import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const PROVIDERS_DIR = path.resolve(__dirname, "../../../src/server/services/payment-providers");
const MONETIZATION_ROUTER = path.resolve(__dirname, "../../../src/server/trpc/routers/monetization.ts");
const PRISMA_SCHEMA = path.resolve(__dirname, "../../../prisma/schema.prisma");

const FORBIDDEN_DB_PATTERNS = [
  // Toute lecture de secrets depuis le DB serait un drift architectural.
  // Les providers DOIVENT lire process.env.* uniquement.
  "paymentProviderConfig.findUnique",
  "paymentProviderConfig.findFirst",
  ".config.apiKey",
  ".config.secretKey",
  ".config.api_key",
  ".config.secret_key",
  ".config.password",
  ".config.token",
];

describe("ADR-0075 — Payment provider secrets stay in env vars", () => {
  it("Prisma model PaymentProviderConfig has the explicit safety comment", () => {
    const src = fs.readFileSync(PRISMA_SCHEMA, "utf8");
    expect(src).toMatch(/Secrets STAY in env vars[\s\S]{0,40}never in DB/i);
  });

  it("cinetpay provider reads secrets from process.env.* only", () => {
    const file = path.join(PROVIDERS_DIR, "cinetpay.ts");
    const src = fs.readFileSync(file, "utf8");
    expect(src).toContain("process.env.CINETPAY_API_KEY");
    expect(src).toContain("process.env.CINETPAY_SITE_ID");
    // Aucun lookup DB pour les secrets dans le provider.
    for (const pattern of FORBIDDEN_DB_PATTERNS) {
      expect(src, `Pattern interdit dans cinetpay.ts: ${pattern}`).not.toContain(pattern);
    }
  });

  it("stripe provider reads secrets from process.env.* only", () => {
    const file = path.join(PROVIDERS_DIR, "stripe.ts");
    if (!fs.existsSync(file)) return; // tolerance si absent
    const src = fs.readFileSync(file, "utf8");
    expect(src).toContain("process.env.STRIPE_SECRET_KEY");
    for (const pattern of FORBIDDEN_DB_PATTERNS) {
      expect(src, `Pattern interdit dans stripe.ts: ${pattern}`).not.toContain(pattern);
    }
  });

  it("paypal provider reads secrets from process.env.* only", () => {
    const file = path.join(PROVIDERS_DIR, "paypal.ts");
    if (!fs.existsSync(file)) return;
    const src = fs.readFileSync(file, "utf8");
    expect(src).toContain("process.env.PAYPAL_CLIENT_");
    for (const pattern of FORBIDDEN_DB_PATTERNS) {
      expect(src, `Pattern interdit dans paypal.ts: ${pattern}`).not.toContain(pattern);
    }
  });

  it("adminUpdateProviderConfig validates FORBIDDEN_CONFIG_KEYS list", () => {
    const src = fs.readFileSync(MONETIZATION_ROUTER, "utf8");
    expect(src).toContain("FORBIDDEN_CONFIG_KEYS");
    // Les patterns critiques doivent être présents dans la liste.
    for (const key of ["apikey", "secret", "password", "token"]) {
      expect(src.toLowerCase()).toContain(key);
    }
    // Et le throw doit citer ADR-0075 pour la traçabilité.
    expect(src).toContain("ADR-0075");
  });

  it("adminUpdateProviderConfig rejects enabled=true if provider not configured", () => {
    const src = fs.readFileSync(MONETIZATION_ROUTER, "utf8");
    // Vérifie la branche de garde "enabled-but-broken".
    expect(src).toMatch(/Cannot enable.*env vars manquantes/);
    expect(src).toContain("listProviders()");
    expect(src).toContain("status.configured");
  });
});

describe("ADR-0075 — UI guide PaymentProviderGuide", () => {
  const GUIDE_FILE = path.resolve(
    __dirname,
    "../../../src/components/console/payment-provider-guide.tsx",
  );

  it("file exists at canonical path", () => {
    expect(fs.existsSync(GUIDE_FILE)).toBe(true);
  });

  it("exposes the 3-step structure (env vars / enabled / webhook URL)", () => {
    const src = fs.readFileSync(GUIDE_FILE, "utf8");
    expect(src).toContain("1. Configurer les env vars");
    expect(src).toContain("2. Activer le provider");
    expect(src).toContain("3. Webhook URL");
  });

  it("declares guide entries for the 3 supported providers", () => {
    const src = fs.readFileSync(GUIDE_FILE, "utf8");
    expect(src).toContain('id: "CINETPAY"');
    expect(src).toContain('id: "STRIPE"');
    expect(src).toContain('id: "PAYPAL"');
  });

  it("warns explicitly that secrets stay in env vars (never in DB)", () => {
    const src = fs.readFileSync(GUIDE_FILE, "utf8");
    expect(src).toMatch(/uniquement en env vars/i);
    expect(src).toMatch(/Jamais en DB/i);
  });

  it("disables the toggle when the provider is not configured", () => {
    const src = fs.readFileSync(GUIDE_FILE, "utf8");
    // La logique disabled doit inclure le cas "not configured et pas encore enabled".
    expect(src).toMatch(/!props\.configured\s*&&\s*!props\.enabled/);
  });
});
