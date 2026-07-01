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

  it("magnific reste disponible sans clé (mock fallback) → jamais différé", async () => {
    expect(await magnificProvider.isAvailable()).toBe(true);
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
