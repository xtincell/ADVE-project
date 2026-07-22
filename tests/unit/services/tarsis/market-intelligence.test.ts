/**
 * Story fix-rtis-t-pillar-completion — AC6 unit tests
 *
 * Validates:
 *   AC1 — marketReality dérivé des signaux RÉELS ; ABSENT (honnête) si aucun (audit 2026-07-22 : plus de padding placeholder)
 *   AC2 — weakSignalAnalysis is NOT written when weakSignals is empty
 *   AC1-liveness — LLM-provided marketReality is NOT overwritten by CALC fallback
 *   AC2-positive — weakSignalAnalysis IS written when weakSignals is non-empty
 */

import { afterEach, describe, expect, it, vi } from "vitest";

// ── Mocks (must be declared before the import under test) ─────────────────────

const callLLMMock = vi.fn();
const collectMarketSignalsMock = vi.fn();
const analyzeWeakSignalsMock = vi.fn();
const buildSearchContextMock = vi.fn();
const writePillarAndScoreMock = vi.fn();
const dbPillarFindManyMock = vi.fn();
const dbKnowledgeEntryFindManyMock = vi.fn();
const dbKnowledgeEntryCreateMock = vi.fn();
const emitIntentMock = vi.fn();

vi.mock("@/server/services/llm-gateway", () => ({
  callLLM: (...a: unknown[]) => callLLMMock(...a),
}));

vi.mock("@/server/services/seshat/tarsis/signal-collector", () => ({
  collectMarketSignals: (...a: unknown[]) => collectMarketSignalsMock(...a),
}));

vi.mock("@/server/services/seshat/tarsis/weak-signal-analyzer", () => ({
  analyzeWeakSignals: (...a: unknown[]) => analyzeWeakSignalsMock(...a),
  buildSearchContext: (...a: unknown[]) => buildSearchContextMock(...a),
}));

vi.mock("@/server/services/pillar-gateway", () => ({
  writePillarAndScore: (...a: unknown[]) => writePillarAndScoreMock(...a),
}));

vi.mock("@/lib/db", () => ({
  db: {
    pillar: { findMany: (...a: unknown[]) => dbPillarFindManyMock(...a) },
    knowledgeEntry: {
      findMany: (...a: unknown[]) => dbKnowledgeEntryFindManyMock(...a),
      create: (...a: unknown[]) => dbKnowledgeEntryCreateMock(...a),
    },
  },
}));

vi.mock("@/server/services/mestor/intents", () => ({
  emitIntent: (...a: unknown[]) => emitIntentMock(...a),
}));

// ── Import under test (after mocks) ──────────────────────────────────────────

import { runMarketIntelligence } from "@/server/services/seshat/tarsis/index";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SEARCH_CONTEXT = {
  sector: "food",
  market: "CM",
  countryCode: "CM",
  countryName: "Cameroun",
  primaryLanguage: "fr",
  purchasingPowerIndex: 100,
  region: "AFRICA_CENTRAL",
  countryMeta: {},
  keywords: ["food", "market"],
  competitors: [],
};

function setupBaselineMocks() {
  buildSearchContextMock.mockResolvedValue(SEARCH_CONTEXT);
  dbKnowledgeEntryFindManyMock.mockResolvedValue([]); // no sector cache → sectorReused=false
  collectMarketSignalsMock.mockResolvedValue([]); // worst-case: no fresh signals
  analyzeWeakSignalsMock.mockResolvedValue([]); // no weak signals
  dbPillarFindManyMock.mockResolvedValue([]); // no ADVE context
  writePillarAndScoreMock.mockResolvedValue(undefined);
  dbKnowledgeEntryCreateMock.mockResolvedValue(undefined);
}

afterEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("runMarketIntelligence — marketReality dérivé RÉEL, jamais fabriqué (AC1, audit 2026-07-22)", () => {
  it("OMET marketReality (gap honnête) quand le LLM le saute ET qu'aucun signal réel n'existe", async () => {
    setupBaselineMocks(); // collectMarketSignals=[] + analyzeWeakSignals=[] → zéro signal réel
    // LLM response intentionally omits marketReality
    callLLMMock.mockResolvedValue({
      text: JSON.stringify({
        triangulation: { customerInterviews: "test", competitiveAnalysis: "test", trendAnalysis: "test", financialBenchmarks: "test" },
        tamSamSom: { tam: { value: 0, description: "test" }, sam: { value: 0, description: "test" }, som: { value: 0, description: "test" } },
        brandMarketFitScore: 50,
      }),
    });

    const result = await runMarketIntelligence("strat-1");

    // Anti-fabrication : plus de placeholders « Signaux économiques collectés » pour
    // atteindre le min-count du schéma → marketReality reste ABSENT (honnête).
    expect(result.pillarContent.marketReality).toBeUndefined();
  });

  it("OMET marketReality quand la réponse LLM est illisible ET zéro signal réel", async () => {
    setupBaselineMocks();
    callLLMMock.mockResolvedValue({ text: "This is not JSON." });

    const result = await runMarketIntelligence("strat-1");

    expect(result.pillarContent.marketReality).toBeUndefined();
  });

  it("dérive marketReality des SIGNAUX RÉELS quand ils existent (aucun placeholder)", async () => {
    setupBaselineMocks();
    // Signaux marché frais RÉELS (titres) — la source de macroTrends.
    collectMarketSignalsMock.mockResolvedValue([
      { title: "Hausse du prix du blé", sourceType: "RSS", relevance: 0.8, collectedAt: new Date().toISOString() },
      { title: "Nouveau concurrent régional", sourceType: "RSS", relevance: 0.7, collectedAt: new Date().toISOString() },
    ]);
    callLLMMock.mockResolvedValue({ text: JSON.stringify({ brandMarketFitScore: 55 }) });

    const result = await runMarketIntelligence("strat-1");

    const mr = result.pillarContent.marketReality as { macroTrends: string[]; weakSignals: string[] } | undefined;
    expect(mr).toBeDefined();
    // Uniquement les titres RÉELS, pas de padding placeholder.
    expect(mr!.macroTrends).toEqual(["Hausse du prix du blé", "Nouveau concurrent régional"]);
  });
});

describe("runMarketIntelligence — weakSignalAnalysis guard (AC2)", () => {
  it("weakSignalAnalysis is NOT written when analyzeWeakSignals returns empty array", async () => {
    setupBaselineMocks();
    analyzeWeakSignalsMock.mockResolvedValue([]); // explicitly empty
    callLLMMock.mockResolvedValue({ text: JSON.stringify({ brandMarketFitScore: 50 }) });

    const result = await runMarketIntelligence("strat-1");

    expect(result.pillarContent.weakSignalAnalysis).toBeUndefined();
  });

  it("weakSignalAnalysis IS written when analyzeWeakSignals returns non-empty array", async () => {
    setupBaselineMocks();
    const ws = [
      {
        id: "ws-1",
        thesis: "L'inflation alimentaire impacte les marges",
        rawEvent: "Hausse des prix du blé",
        causalChain: [],
        impactCategory: "PRICING",
        brandImpact: "Marges comprimées sur les produits transformés",
        confidence: 0.72,
        urgency: "MEDIUM",
        relatedPillars: ["V"],
        supportingSignals: [],
        recommendedAction: "Réviser la grille tarifaire et diversifier les fournisseurs",
      },
    ];
    analyzeWeakSignalsMock.mockResolvedValue(ws);
    callLLMMock.mockResolvedValue({ text: JSON.stringify({ brandMarketFitScore: 60 }) });

    const result = await runMarketIntelligence("strat-1");

    expect(result.pillarContent.weakSignalAnalysis).toEqual(ws);
  });
});

describe("runMarketIntelligence — CALC fallback does NOT overwrite LLM value (AC1-liveness)", () => {
  it("LLM-provided marketReality is preserved as-is", async () => {
    setupBaselineMocks();
    const providedMR = {
      macroTrends: ["Digitalisation rapide du secteur", "Essor du m-commerce en Afrique subsaharienne", "Pression réglementaire CEMAC"],
      weakSignals: ["Signal précurseur disruption logistique", "Indicateur émergence compétiteur régional"],
    };
    callLLMMock.mockResolvedValue({
      text: JSON.stringify({
        marketReality: providedMR,
        brandMarketFitScore: 75,
      }),
    });

    const result = await runMarketIntelligence("strat-1");

    const mr = result.pillarContent.marketReality as typeof providedMR;
    expect(mr.macroTrends).toEqual(providedMR.macroTrends);
    expect(mr.weakSignals).toEqual(providedMR.weakSignals);
  });
});

// ── AC7 — runMarketIntelligence not called from actualizePillar("T") ──────────
// Static assertion: grep rtis-cascade.ts for the call site to confirm absence.

describe("rtis-cascade.ts T block — AC7 (static assertion)", () => {
  it("does NOT call runMarketIntelligence inside the T block", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.resolve(
      __dirname,
      "../../../../src/server/services/mestor/rtis-cascade.ts",
    );
    const source = await fs.readFile(filePath, "utf-8");

    // Find the T block: from "} else if (pillarKey === \"T\")" to "} else if (pillarKey === \"I\")"
    const tBlockStart = source.indexOf('} else if (pillarKey === "T")');
    const tBlockEnd = source.indexOf('} else if (pillarKey === "I")', tBlockStart);
    expect(tBlockStart).toBeGreaterThan(0);
    expect(tBlockEnd).toBeGreaterThan(tBlockStart);

    const tBlock = source.slice(tBlockStart, tBlockEnd);

    // runMarketIntelligence must NOT be called inside the T block
    expect(tBlock).not.toContain("runMarketIntelligence(");

    // executeProtocoleTrack must be called inside the T block
    expect(tBlock).toContain("executeProtocoleTrack(");
  });
});
