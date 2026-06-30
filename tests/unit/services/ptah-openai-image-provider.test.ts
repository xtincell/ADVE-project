/**
 * Ptah — OpenAI = générateur d'image EXCLUSIF (décision opérateur 2026-06-30).
 *
 * Verrouille :
 *   1. le provider `openai` est enregistré + SYNCHRONE (forge inline, pas de webhook) ;
 *   2. `isAvailable()` suit `OPENAI_API_KEY` (pilote le deferral ADR-0021) ;
 *   3. la GÉNÉRATION d'image (kind image/icon) route EXCLUSIVEMENT vers openai ;
 *   4. sans clé, aucun provider image n'est dispo → `NoAvailableProviderError`
 *      (que `materializeBrief` convertit en forge DIFFÉRÉE, pas en crash).
 */

import { describe, it, expect, afterEach, vi } from "vitest";

// selectProvider lit ForgeProviderHealth (DB) pour l'état du circuit → mock à null.
vi.mock("@/server/services/ptah/task-store", async (orig) => {
  const actual = await orig<typeof import("@/server/services/ptah/task-store")>();
  return { ...actual, getProviderHealth: vi.fn(async () => null) };
});

import { getProvider } from "@/server/services/ptah/providers";
import {
  selectProvider,
  NoAvailableProviderError,
} from "@/server/services/ptah/routing/provider-selector";
import type { ForgeBrief, ForgeKind } from "@/server/services/ptah/types";

function brief(kind: ForgeKind): ForgeBrief {
  return {
    briefText: "Visuel de marque test",
    forgeSpec: { kind, parameters: {} },
    pillarSource: "D",
    manipulationMode: "facilitator",
  };
}

const SAVED = process.env.OPENAI_API_KEY;

describe("Ptah — OpenAI image provider exclusif", () => {
  afterEach(() => {
    if (SAVED === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = SAVED;
  });

  it("openai est enregistré + synchrone", () => {
    const p = getProvider("openai");
    expect(p.name).toBe("openai");
    expect(p.sync).toBe(true);
  });

  it("isAvailable() suit OPENAI_API_KEY", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    expect(await getProvider("openai").isAvailable()).toBe(true);
    delete process.env.OPENAI_API_KEY;
    expect(await getProvider("openai").isAvailable()).toBe(false);
  });

  it("image ET icon routent EXCLUSIVEMENT vers openai (clé présente)", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    expect((await selectProvider(brief("image"))).name).toBe("openai");
    expect((await selectProvider(brief("icon"))).name).toBe("openai");
  });

  it("sans clé, génération d'image → NoAvailableProviderError (→ forge différée en amont)", async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(selectProvider(brief("image"))).rejects.toBeInstanceOf(NoAvailableProviderError);
  });

  it("les autres médias (édition/vidéo/audio) ne routent PAS vers openai", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    // refine = édition d'image (upscale) → Magnific, pas génération.
    expect((await selectProvider(brief("refine"))).name).not.toBe("openai");
  });
});
