/**
 * Oracle — composers déterministes des sections 22-35 (fallback sans LLM).
 *
 * Vérifie sur une stratégie fixture (db mockée) :
 *   - chaque section 22-35 a un composer enregistré ;
 *   - le composer produit la shape EXACTE que le composant React consomme
 *     (mckinsey7s.strategy.state, bcgPortfolio.stars, crewProgram.status…) ;
 *   - zéro LLM : aucun composer n'importe le llm-gateway ;
 *   - déterminisme : deux exécutions → contenus identiques (hors _composedAt) ;
 *   - honnêteté : sans données mesurées, cult-index/devotion/tarsis rendent {}
 *     (EmptyState UI) au lieu d'inventer.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock DB ────────────────────────────────────────────────────────────

const FIXTURE_STRATEGY = {
  id: "strat-fixture-1",
  name: "CIMENCAM",
  businessContext: { sector: "Matériaux de construction", country: "CM" },
  manipulationMix: { peddler: 0.1, dealer: 0.2, facilitator: 0.4, entertainer: 0.3 },
  pillars: [
    {
      key: "a",
      content: {
        nomMarque: "CIMENCAM",
        secteur: "Matériaux de construction",
        valeurs: [
          { valeur: "Solidité", justification: "40 ans de constructions qui tiennent", rang: 1 },
          { valeur: "Proximité", justification: "1200 points de vente au Cameroun", rang: 2 },
        ],
        equipeDirigeante: [
          { nom: "A. Mbarga", role: "DG", competences: ["industrie", "finance"] },
          { nom: "C. Etoa", role: "Dir. Marketing", competences: ["DIGITAL", "retail"] },
        ],
      },
    },
    {
      key: "d",
      content: {
        positionnement: "Premier cimentier du Cameroun, 60% de parts de marché.",
        tonDeVoix: { personnalite: ["solide", "proche", "fier"] },
        paysageConcurrentiel: [{ nom: "Dangote" }, { nom: "Medcem" }],
        personas: [
          { nom: "Bâtisseur", motivations: ["fiabilité", "prix maîtrisé"], barriers: ["accès crédit"] },
        ],
      },
    },
    {
      key: "v",
      content: {
        sacrements: [{ nom: "Ciment 42.5" }, { nom: "Ciment 32.5" }],
      },
    },
    {
      key: "e",
      content: {
        touchpoints: [{ canal: "WhatsApp" }, { canal: "Points de vente" }],
        rituels: [{ nom: "Tournée des chantiers" }],
        conversionTriggers: [{ fromLevel: "participant", toLevel: "engage" }],
      },
    },
    { key: "r", content: {} },
    {
      key: "t",
      content: {
        marketReality: { macroTrends: ["urbanisation", "autoconstruction"], weakSignals: ["ciment vert"] },
      },
    },
    {
      key: "i",
      content: {
        catalogueParCanal: {
          DIGITAL: [
            { id: "i1", action: "Campagne WhatsApp bâtisseurs", status: "SELECTED_FOR_ROADMAP", timeframe: "SPRINT_90", budgetEstime: "LOW" },
          ],
          EVENT: [
            { id: "i2", action: "Salon du BTP Douala", status: "SELECTED_FOR_ROADMAP", timeframe: "PHASE_2", budgetEstime: "HIGH" },
          ],
        },
        innovationsProduit: [{ nom: "Ciment bas carbone" }],
      },
    },
    {
      key: "s",
      content: {
        visionStrategique: "Devenir la référence patrimoniale du bâti camerounais.",
        roadmap: [{ phase: "Phase 1", objectif: "Ciment 42.5 leader régional" }],
        fenetreOverton: {
          perceptionActuelle: "Un cimentier industriel parmi d'autres",
          perceptionCible: "Le bâtisseur du patrimoine camerounais",
          ecart: "Passer du produit à l'institution",
          strategieDeplacment: [{ etape: "Prouver", action: "Documenter 40 ans d'ouvrages" }],
        },
      },
    },
  ],
  cultIndexSnapshots: [
    {
      compositeScore: 42.5,
      tier: "EMERGENT",
      engagementDepth: 0.4,
      superfanVelocity: 0.2,
      communityCohesion: 0.5,
      brandDefenseRate: 0.3,
      ugcGenerationRate: 0.1,
      ritualAdoption: 0.35,
      evangelismScore: 0.25,
      measuredAt: new Date("2026-06-01T00:00:00Z"),
    },
  ],
  devotionSnapshots: [
    {
      spectateur: 50,
      interesse: 25,
      participant: 12,
      engage: 8,
      ambassadeur: 4,
      evangeliste: 1,
      devotionScore: 31,
      measuredAt: new Date("2026-06-01T00:00:00Z"),
    },
  ],
  signals: [
    {
      type: "TARSIS_WEAK_SIGNAL",
      data: { description: "Montée du ciment bas carbone en CEMAC", category: "REGULATION", impact: 7, horizon: "J+180", action: "Pré-qualifier une gamme verte", confidence: 0.7 },
      createdAt: new Date("2026-06-05T00:00:00Z"),
    },
  ],
  campaigns: [
    {
      name: "Bâtisseurs 2026",
      budget: 25_000_000,
      status: "ACTIVE",
      budgetLines: [{ category: "MEDIA", planned: 10_000_000, currency: "XAF" }],
    },
  ],
  _count: { superfanProfiles: 12 },
};

const findUniqueMock = vi.fn();
const brandAssetFindFirst = vi.fn();
const brandAssetCreate = vi.fn();
const brandAssetUpdate = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    strategy: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
    brandAsset: {
      findFirst: (...args: unknown[]) => brandAssetFindFirst(...args),
      create: (...args: unknown[]) => brandAssetCreate(...args),
      update: (...args: unknown[]) => brandAssetUpdate(...args),
    },
  },
}));

import {
  composeSectionDeterministic,
  hasDeterministicComposer,
  isAnyLLMProviderConfigured,
} from "@/server/services/strategy-presentation/deterministic-composers";
import { SECTION_REGISTRY } from "@/server/services/strategy-presentation/types";

const PHASE13_IDS = SECTION_REGISTRY.filter((s) => Number(s.number) >= 22).map((s) => s.id);

function metaFor(id: string) {
  const meta = SECTION_REGISTRY.find((s) => s.id === id);
  if (!meta) throw new Error(`section ${id} absente du registry`);
  return meta;
}

beforeEach(() => {
  vi.clearAllMocks();
  findUniqueMock.mockImplementation((args: { select?: unknown; include?: unknown }) => {
    // loadComposerContext (include) → fixture complète ;
    // draftCrewProgram/draftCommsPlan (select id+name) → ligne minimale.
    if (args && typeof args === "object" && "include" in args && args.include) {
      return Promise.resolve(FIXTURE_STRATEGY);
    }
    return Promise.resolve({ id: FIXTURE_STRATEGY.id, name: FIXTURE_STRATEGY.name, operatorId: "op-1" });
  });
  brandAssetFindFirst.mockResolvedValue(null);
  brandAssetCreate.mockResolvedValue({ id: "asset-1" });
});

describe("composers déterministes — couverture 22-35", () => {
  it("chaque section 22-35 du registry a un composer", () => {
    expect(PHASE13_IDS.length).toBe(14);
    for (const id of PHASE13_IDS) {
      expect(hasDeterministicComposer(id), `composer manquant: ${id}`).toBe(true);
    }
  });

  it("isAnyLLMProviderConfigured reflète les env vars", () => {
    expect(typeof isAnyLLMProviderConfigured()).toBe("boolean");
  });

  it("le module ne dépend d'AUCUN llm-gateway (zéro LLM par construction)", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(
      "src/server/services/strategy-presentation/deterministic-composers.ts",
      "utf8",
    );
    expect(src).not.toMatch(/llm-gateway|callLLM|executeStructuredLLMCall|executeSequence|executeFramework|executeTool\(/);
  });
});

describe("shapes consommées par les composants §22-35", () => {
  it("§24 mckinsey7s : 7 dimensions {state,gap,recommendation,score}", async () => {
    const r = await composeSectionDeterministic("strat-fixture-1", metaFor("mckinsey-7s"));
    const content = r!.payload.content as Record<string, Record<string, { state: string; score: number }>>;
    const s7 = content.mckinsey7s!;
    for (const d of ["strategy", "structure", "systems", "shared_values", "style", "staff", "skills"]) {
      expect(s7[d], `dimension ${d}`).toBeDefined();
      expect(typeof s7[d]!.state).toBe("string");
      expect(typeof s7[d]!.score).toBe("number");
    }
    // Données fixture réelles → valeurs ancrées, pas de boilerplate
    expect(s7.shared_values!.state).toContain("Solidité");
  });

  it("§25 bcgPortfolio : 4 quadrants + jamais de 'dogs' auto-accusés", async () => {
    const r = await composeSectionDeterministic("strat-fixture-1", metaFor("bcg-portfolio"));
    const content = r!.payload.content as { bcgPortfolio: Record<string, unknown[]>; bcgHealthScore: number };
    expect(content.bcgPortfolio.cash_cows!.length).toBeGreaterThan(0);
    expect(content.bcgPortfolio.question_marks!.length).toBe(1); // Ciment bas carbone
    expect(content.bcgPortfolio.dogs).toEqual([]);
  });

  it("§26 bainNps : proxy déterministe depuis la Devotion Ladder", async () => {
    const r = await composeSectionDeterministic("strat-fixture-1", metaFor("bain-nps"));
    const nps = (r!.payload.content as { bainNps: { score: number; methode: string } }).bainNps;
    // (ambassadeur 4 + evangeliste 1 − spectateur 50) / 100 = −45
    expect(nps.score).toBe(-45);
    expect(nps.methode).toContain("Devotion");
  });

  it("§28 mckinsey3Horizons : allocation somme à ~100", async () => {
    const r = await composeSectionDeterministic("strat-fixture-1", metaFor("mckinsey-3-horizons"));
    const m3h = (r!.payload.content as { mckinsey3Horizons: { allocation: Record<string, number> } }).mckinsey3Horizons;
    const sum = Object.values(m3h.allocation).reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThanOrEqual(99);
    expect(sum).toBeLessThanOrEqual(101);
  });

  it("§31 cultIndex : lit le snapshot mesuré (confidence 0.8) + tier cohérent avec le score", async () => {
    const r = await composeSectionDeterministic("strat-fixture-1", metaFor("cult-index"));
    const ci = (r!.payload.content as { cultIndex: { score: number; tier: string } }).cultIndex;
    expect(ci.score).toBe(42.5);
    // Le fixture stocke un tier sale "EMERGENT" (bande 61-80) sur un score de
    // 42.5 (bande LOVED 41-60). `resolveCultIndexTier` n'honore le tier stocké
    // que s'il concorde avec la bande du score — sinon le score fait foi. Le
    // Cult Index ne peut donc jamais surévaluer la maturité (audit galileo).
    expect(ci.tier).toBe("LOVED");
    expect(r!.confidence).toBe(0.8);
  });

  it("§32 manipulationMatrix : 4 modes + mode dominant du mix déclaré", async () => {
    const r = await composeSectionDeterministic("strat-fixture-1", metaFor("manipulation-matrix"));
    const mm = (r!.payload.content as { manipulationMatrix: { evaluations: unknown[]; summary: { dominantMode: string } } }).manipulationMatrix;
    expect(mm.evaluations).toHaveLength(4);
    expect(mm.summary.dominantMode).toBe("facilitator");
  });

  it("§34 overtonDistinctive : axes depuis la fenêtre Overton S réelle", async () => {
    const r = await composeSectionDeterministic("strat-fixture-1", metaFor("overton-distinctive"));
    const od = (r!.payload.content as { overtonDistinctive: { axes: Array<{ current_position: string }> } }).overtonDistinctive;
    expect(od.axes.length).toBeGreaterThan(0);
    expect(od.axes[0]!.current_position).toContain("cimentier");
  });

  it("§35 tarsisWeakSignals : signaux réels mappés", async () => {
    const r = await composeSectionDeterministic("strat-fixture-1", metaFor("tarsis-weak-signals"));
    const tw = (r!.payload.content as { tarsisWeakSignals: { signals: Array<{ description: string }> } }).tarsisWeakSignals;
    expect(tw.signals[0]!.description).toContain("bas carbone");
  });

  it("§22 crewProgram + §23 commsPlan : drafts Neteru réels (déterministes)", async () => {
    const crew = await composeSectionDeterministic("strat-fixture-1", metaFor("imhotep-crew-program"));
    const crewContent = crew!.payload.content as { crewProgram: { status: string; summary: string; rolesRequired: string[] } };
    expect(crewContent.crewProgram.status).toBe("DRAFT");
    expect(crewContent.crewProgram.rolesRequired.length).toBeGreaterThan(0);
    // round-14c : summary composé depuis le pilier réel (nom de marque), sans réf
    // ADR interne (livrable CLIENT Oracle §22, ADR-0123) ni « placeholder » template.
    expect(crewContent.crewProgram.summary).toMatch(/Programme équipe pour/);
    expect(crewContent.crewProgram.summary).not.toMatch(/ADR-\d/);

    const comms = await composeSectionDeterministic("strat-fixture-1", metaFor("anubis-plan-comms"));
    const commsContent = comms!.payload.content as { commsPlan: { summary: string; channels: string[] } };
    expect(commsContent.commsPlan.channels).toContain("WhatsApp");
    expect(commsContent.commsPlan.summary).toMatch(/Plan de diffusion pour/);
    expect(commsContent.commsPlan.summary).not.toMatch(/ADR-\d/);
  });
});

describe("déterminisme + honnêteté + writeback", () => {
  it("deux exécutions produisent un contenu identique (hors _composedAt)", async () => {
    const a = await composeSectionDeterministic("strat-fixture-1", metaFor("mckinsey-7s"));
    const b = await composeSectionDeterministic("strat-fixture-1", metaFor("mckinsey-7s"));
    const strip = (c: Record<string, unknown>) => {
      const { _composedAt, ...rest } = c;
      void _composedAt;
      return rest;
    };
    expect(strip(a!.payload.content)).toEqual(strip(b!.payload.content));
  });

  it("sans snapshot mesuré, cult-index rend {} (EmptyState honnête, pas d'invention)", async () => {
    findUniqueMock.mockImplementation((args: { include?: unknown }) => {
      if (args && typeof args === "object" && "include" in args && args.include) {
        return Promise.resolve({ ...FIXTURE_STRATEGY, cultIndexSnapshots: [] });
      }
      return Promise.resolve({ id: FIXTURE_STRATEGY.id, name: FIXTURE_STRATEGY.name, operatorId: "op-1" });
    });
    const r = await composeSectionDeterministic("strat-fixture-1", metaFor("cult-index"));
    const { _provenance, _composedAt, ...visible } = r!.payload.content;
    void _provenance; void _composedAt;
    expect(visible).toEqual({});
  });

  it("le writeback BrandAsset est émis avec metadata.sectionId + provenance", async () => {
    await composeSectionDeterministic("strat-fixture-1", metaFor("mckinsey-7s"));
    expect(brandAssetCreate).toHaveBeenCalledTimes(1);
    const arg = brandAssetCreate.mock.calls[0]![0] as { data: { kind: string; metadata: { sectionId: string }; content: { _provenance: string } } };
    expect(arg.data.kind).toBe("MCK_7S");
    expect(arg.data.metadata.sectionId).toBe("mckinsey-7s");
    expect(arg.data.content._provenance).toBe("DETERMINISTIC_COMPOSE");
  });
});
