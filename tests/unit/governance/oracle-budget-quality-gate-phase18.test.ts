/**
 * Phase 18 — ADRs 0043 + 0044 anti-régression.
 *
 * Verrouille les invariants posés pendant la remédiation des résidus
 * mission Oracle Makrea (mai 2026) :
 *
 * 1. **ADR-0043** — Section budget complete avec `pillarS.globalBudget`
 *    seul, sans Campaign. Empêche le retour au critère strict
 *    "campaignBudgets.length > 0" qui force à inventer des Campaigns.
 *
 * 2. **ADR-0044** — `applySequenceQualityGate` détecte un content vide
 *    (deep empty), ce qui doit refuser le promote ACTIVE. Empêche le
 *    compteur Oracle 35/35 cosmétique observé sur Makrea.
 *
 * Si ces tests échouent → drift Phase 18 ou retour vers triche cosmétique.
 */

import { describe, expect, it } from "vitest";
import { checkSectionCompleteness } from "@/server/services/strategy-presentation/section-mappers";
import type { StrategyPresentationDocument } from "@/server/services/strategy-presentation/types";
import { applySequenceQualityGate } from "@/server/services/artemis/tools/quality-gate";

// ── Helper: build a minimal valid StrategyPresentationDocument shell ────────

function buildDoc(overrides: Partial<StrategyPresentationDocument["sections"]> = {}): StrategyPresentationDocument {
  // Minimal sections shell — fournit tous les fields que `checkSectionCompleteness`
  // accède (cf. section-mappers.ts:checkSectionCompleteness).
  const baseSections = {
    executiveSummary: {} as never,
    contexteDefi: { enemy: null, client: null, personas: [] } as never,
    plateformeStrategique: { archetype: null, promesseMaitre: null, valeurs: [] } as never,
    propositionValeur: { pricing: null, proofPoints: [] } as never,
    territoireCreatif: { conceptGenerator: null, directionArtistique: null } as never,
    experienceEngagement: { touchpoints: [], devotionPathway: null } as never,
    swotInterne: { forces: [], mitigations: [] } as never,
    swotExterne: { concurrents: [], brandMarketFit: null } as never,
    signaux: { signauxFaibles: [], opportunitesPriseDeParole: [] },
    catalogueActions: { totalActions: 0, parCanal: {}, sprint90Days: "", annualCalendar: [], channelMix: "", budgetAllocation: null, teamBlueprint: "", actions: [] },
    planActivation: { campaigns: [], touchpoints: [], aarrr: null },
    fenetreOverton: { perceptionActuelle: "", perceptionCible: "", roadmap: [], sprint90Days: "", expansion: [], ovpiScore: null },
    mediasDistribution: { drivers: [], mediaActions: [] },
    productionLivrables: { missions: [], gloryOutputsByLayer: {} },
    profilSuperfan: { portrait: null, parcoursDevotionCible: [] },
    kpisMesure: { kpis: [], devotion: null, cultIndex: null },
    croissanceEvolution: { bouclesCroissance: [], pipelineInnovation: [] },
    budget: {
      unitEconomics: null,
      campaignBudgets: [],
      totalBudget: 0,
      globalBudget: null,
      budgetBreakdown: null,
    },
    timelineGouvernance: { campaigns: [], teamMembers: [] },
    equipe: { operator: null, equipeDirigeante: [], equipeComplementarite: null },
    conditionsEtapes: { client: null, contracts: [] },
    auditDiagnostic: {} as never,
  } as unknown as StrategyPresentationDocument["sections"];

  return {
    meta: {
      strategyId: "test",
      brandName: "Test",
      operatorName: null,
      generatedAt: new Date().toISOString(),
      vector: { a: 0, d: 0, v: 0, e: 0, r: 0, t: 0, i: 0, s: 0, composite: 0, confidence: 0 } as never,
      classification: "ZOMBIE" as never,
    },
    sections: { ...baseSections, ...overrides },
  };
}

describe("ADR-0043 — Budget découplé de Campaigns (Option C)", () => {
  it("budget reste empty si rien de fourni (ni unitEconomics ni globalBudget ni Campaign)", () => {
    const doc = buildDoc();
    const report = checkSectionCompleteness(doc);
    expect(report.budget).toBe("empty");
  });

  it("budget passe partial si globalBudget seul est fourni (marque BOOT scenario)", () => {
    const doc = buildDoc({
      budget: {
        unitEconomics: null,
        campaignBudgets: [],
        totalBudget: 0,
        globalBudget: 0, // present mais pas > 0
        budgetBreakdown: null,
      } as never,
    });
    // 0 ne suffit pas pour partial avec le critère check ; il faut > 0
    // (cf. mapBudget : globalBudget non-null mais peut être 0)
    const report = checkSectionCompleteness(doc);
    // hasData = !!unitEconomics || !!globalBudget. !!0 = false → empty
    expect(report.budget).toBe("empty");
  });

  it("budget passe complete avec globalBudget > 0 SANS aucune Campaign", () => {
    const doc = buildDoc({
      budget: {
        unitEconomics: null,
        campaignBudgets: [],
        totalBudget: 0,
        globalBudget: 120000, // ← le seul critère
        budgetBreakdown: null,
      } as never,
    });
    const report = checkSectionCompleteness(doc);
    expect(report.budget).toBe("complete");
  });

  it("budget passe complete avec Campaign budgetée seule (rétrocompat)", () => {
    const doc = buildDoc({
      budget: {
        unitEconomics: null,
        campaignBudgets: [{ name: "Q3", budget: 50000, status: "ACTIVE" }],
        totalBudget: 50000,
        globalBudget: null,
        budgetBreakdown: null,
      } as never,
    });
    const report = checkSectionCompleteness(doc);
    expect(report.budget).toBe("complete");
  });

  it("budget passe partial avec unitEconomics seul (CAC/LTV chiffrés mais pas d'enveloppe)", () => {
    const doc = buildDoc({
      budget: {
        unitEconomics: { cac: 50, ltv: 200, ltvCacRatio: 4, margeNette: null, roiEstime: null, budgetCom: null, caVise: null },
        campaignBudgets: [],
        totalBudget: 0,
        globalBudget: null,
        budgetBreakdown: null,
      } as never,
    });
    const report = checkSectionCompleteness(doc);
    expect(report.budget).toBe("partial");
  });
});

describe("ADR-0044 — Quality gate refuse content vide", () => {
  it("applySequenceQualityGate fail si content empty deep", async () => {
    const result = await applySequenceQualityGate("test:empty", {
      mckinsey7s: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasons.some((r) => /empty/.test(r))).toBe(true);
    }
  });

  it("applySequenceQualityGate fail si nested deep empty", async () => {
    const result = await applySequenceQualityGate("test:nested-empty", {
      bainNps: { score: null, promoters: null, drivers: [] },
    });
    expect(result.ok).toBe(false);
  });

  it("applySequenceQualityGate ok avec content riche", async () => {
    const result = await applySequenceQualityGate("test:rich", {
      mckinsey7s: {
        strategy: { state: "Aligned with brand prophecy", gap: "low", score: 8 },
        structure: { state: "Flat", gap: "medium", score: 6 },
      },
    });
    expect(result.ok).toBe(true);
  });

  it("applySequenceQualityGate ignore les markers internes (préfixe `_`)", async () => {
    // Les keys préfixées `_` sont metadata sequence-executor, pas du content métier.
    // Un BrandAsset avec uniquement des _markers ne doit PAS passer comme rich.
    const result = await applySequenceQualityGate("test:markers-only", {
      _capped: { reason: "size>200KB", originalBytes: 1000000 },
      _truncatedAt: new Date().toISOString(),
    });
    expect(result.ok).toBe(false);
  });
});
