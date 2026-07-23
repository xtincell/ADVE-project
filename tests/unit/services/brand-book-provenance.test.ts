/**
 * C3 (audit 2026-07-22) — provenance d'ingestion brand book selon le mode.
 *
 * Le persister écrivait TOUS les champs en `SOURCE` (fait observé), y compris
 * ceux extraits par le LLM (jugements). Désormais le mode d'extraction porté par
 * l'Intent décide : STRUCTURED (parseur déterministe) → SOURCE ; LLM (jugement)
 * → INFERRED (à valider). Défaut conservateur = INFERRED.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  writePillar: vi.fn(),
  createAsset: vi.fn(),
}));

vi.mock("@/server/services/pillar-gateway", () => ({
  writePillarAndScore: mocks.writePillar,
}));
vi.mock("@/server/services/brand-vault/engine", () => ({
  createBrandAsset: mocks.createAsset,
}));

import { persistBrandBookExtraction } from "@/server/services/brand-book-ingestion/persister";
import type { BrandBookExtraction } from "@/server/services/brand-book-ingestion/schema";

const SAMPLE: BrandBookExtraction = {
  identity: { brandName: "Acme", mission: "Rendre le café accessible" },
  distinction: { positioning: "Le café de quartier", masterPromise: "Toujours frais" },
} as BrandBookExtraction;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.writePillar.mockResolvedValue({ success: true });
  mocks.createAsset.mockResolvedValue({ id: "asset-1" });
});

function provenancesPassed(): string[] {
  return mocks.writePillar.mock.calls.flatMap((c) => {
    const opts = (c[0] as { options?: { fieldProvenance?: Record<string, string> } }).options;
    return Object.values(opts?.fieldProvenance ?? {});
  });
}

describe("C3 — provenance d'ingestion par mode d'extraction", () => {
  it("STRUCTURED → tous les champs en SOURCE (fait observé déterministe)", async () => {
    await persistBrandBookExtraction({
      strategyId: "s1",
      operatorId: "op1",
      extraction: SAMPLE,
      extractionMode: "STRUCTURED",
    });
    const provs = provenancesPassed();
    expect(provs.length).toBeGreaterThan(0);
    expect(provs.every((p) => p === "SOURCE")).toBe(true);
  });

  it("LLM → tous les champs en INFERRED (jugement à valider)", async () => {
    await persistBrandBookExtraction({
      strategyId: "s1",
      operatorId: "op1",
      extraction: SAMPLE,
      extractionMode: "LLM",
    });
    const provs = provenancesPassed();
    expect(provs.length).toBeGreaterThan(0);
    expect(provs.every((p) => p === "INFERRED")).toBe(true);
  });

  it("mode absent → INFERRED (défaut conservateur — ne prétend jamais un fait)", async () => {
    await persistBrandBookExtraction({ strategyId: "s1", operatorId: "op1", extraction: SAMPLE });
    const provs = provenancesPassed();
    expect(provs.every((p) => p === "INFERRED")).toBe(true);
  });
});
