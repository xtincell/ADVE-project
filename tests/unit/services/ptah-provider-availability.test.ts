/**
 * Ptah — deferral « ship-able sans clés » (ADR-0021).
 *
 * `materializeBrief` fait un pré-flight `provider.isAvailable()` : si le provider
 * sélectionné n'est pas configuré (credentials absentes), la forge est DIFFÉRÉE
 * (task DEFERRED, retriable) au lieu d'appeler `forge()` qui throwait
 * (adobe/canva/figma sans creds → task FAILED + erreur propagée). Magnific reste
 * toujours disponible (mock fallback sans clé) donc jamais différé.
 *
 * Ce test verrouille le DÉCLENCHEUR du deferral : le contrat `isAvailable()`
 * de chaque provider signale correctement l'absence de credentials.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { magnificProvider } from "@/server/services/ptah/providers/magnific";
import { adobeProvider } from "@/server/services/ptah/providers/adobe";
import { canvaProvider } from "@/server/services/ptah/providers/canva";
import { figmaProvider } from "@/server/services/ptah/providers/figma";
import { manifest } from "@/server/services/ptah/manifest";

// Toutes les env vars de credentials lues par les `isAvailable()` providers.
const CRED_ENV = [
  "ADOBE_FIREFLY_CLIENT_ID",
  "ADOBE_FIREFLY_CLIENT_SECRET",
  "CANVA_ENABLED",
  "CANVA_CLIENT_ID",
  "CANVA_USER_TOKEN_DEV",
  "FIGMA_PAT",
] as const;

describe("Ptah providers — isAvailable() pilote le deferral (ADR-0021)", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    // Déterministe quel que soit l'env ambiant (.env.local / CI) : on retire
    // les credentials pour simuler un déploiement sans clés.
    for (const k of CRED_ENV) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of CRED_ENV) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("magnific SANS clé est indisponible → forge différée (audit 2026-07-16 : le mock picsum était livré comme un vrai asset)", async () => {
    delete process.env.PTAH_ALLOW_MOCK_FORGE;
    expect(await magnificProvider.isAvailable()).toBe(false);
  });

  it("magnific en mode démo EXPLICITE (PTAH_ALLOW_MOCK_FORGE=1) reste disponible", async () => {
    process.env.PTAH_ALLOW_MOCK_FORGE = "1";
    expect(await magnificProvider.isAvailable()).toBe(true);
    delete process.env.PTAH_ALLOW_MOCK_FORGE;
  });

  it("adobe / canva / figma sont indisponibles sans credentials → forge différée", async () => {
    expect(await adobeProvider.isAvailable(), "adobe sans creds doit être indisponible").toBe(false);
    expect(await canvaProvider.isAvailable(), "canva sans creds doit être indisponible").toBe(false);
    expect(await figmaProvider.isAvailable(), "figma sans creds doit être indisponible").toBe(false);
  });

  it("adobe redevient disponible une fois ses credentials saisis (retry)", async () => {
    process.env.ADOBE_FIREFLY_CLIENT_ID = "test-id";
    process.env.ADOBE_FIREFLY_CLIENT_SECRET = "test-secret";
    expect(await adobeProvider.isAvailable()).toBe(true);
  });
});

describe("Ptah materialize output contract", () => {
  const capability = manifest.capabilities.find(c => c.name === "materializeBrief")!;
  const check = (output: unknown) => capability.postconditions![0]!.check(output, { db: null });
  const deferred = { taskId: "fixture-task", provider: "openai", providerModel: "default",
    estimatedCostUsd: 0, status: "DEFERRED" };
  it("accepts a persisted deferred task without presenting it as materialized", () => {
    expect(check(deferred)).toBe(true);
    expect(capability.outputSchema.safeParse(deferred).success).toBe(true);
  });
  it("checks the task inside the manual route's successful Intent envelope", () => {
    expect(check({ status: "OK", output: deferred, sectionId: "fixture" })).toBe(true);
    expect(check({ status: "OK", output: { ...deferred, status: "IN_PROGRESS" } })).toBe(true);
  });
  it.each(["FAILED", "VETOED"])("refuses a %s envelope even with a task-shaped payload", status => {
    expect(check({ status, output: deferred })).toBe(false);
  });
  it.each([{ ...deferred, taskId: "" }, { ...deferred, provider: "" }, { ...deferred, status: "COMPLETED" }])(
    "refuses incomplete or terminal task receipts", output => expect(check(output)).toBe(false));
});
