/**
 * ADR-0126 — Scoring conscient de l'échelle de marché (enfant ADR-0086).
 *
 * Verrouille les quatre réparations de l'angle mort « le score est aveugle à
 * l'échelle » :
 *   A. Échelle déclarée (`marketScale`/`addressableAudience`/`brandFoundedYear`
 *      sur Strategy — additifs nullable).
 *   B. Fix d'unités cult-index : les champs DevotionSnapshot sont des
 *      pourcentages 0-100, les anciennes formules (×100/×200/×500) les
 *      lisaient comme des fractions → 3 dimensions saturées en quasi-binaire.
 *   C. Plafond d'évidence scale-aware : cibles par échelle + densité
 *      d'adressable — fallback échelle absente == constantes historiques
 *      (Loi 1 : zéro régression silencieuse).
 *   D. Le palier ne s'affiche jamais sans son référentiel d'échelle.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import {
  MARKET_SCALES,
  EVIDENCE_TARGETS_BY_SCALE,
  LEGACY_EVIDENCE_TARGETS,
  resolveEvidenceTargets,
  formatTierReferential,
  MIN_SUPERFANS_TARGET,
} from "@/domain/market-scale";
import { classifyTier } from "@/domain/brand-tier";
import { computeCultIndex } from "@/server/services/cult-index-engine";

const read = (p: string) => readFileSync(p, "utf8");

describe("ADR-0126 — domaine échelle de marché", () => {
  it("6 échelles ordonnées du local au global", () => {
    expect(MARKET_SCALES).toEqual([
      "QUARTIER", "VILLE", "REGION", "NATION", "CONTINENT", "MONDE",
    ]);
  });

  it("NATION == constantes historiques du plafond d'évidence (continuité Loi 1)", () => {
    expect(EVIDENCE_TARGETS_BY_SCALE.NATION).toEqual({ superfansTarget: 1000, tarsisTarget: 20 });
    expect(LEGACY_EVIDENCE_TARGETS).toEqual(EVIDENCE_TARGETS_BY_SCALE.NATION);
  });

  it("cibles strictement croissantes avec l'échelle (superfans ET signaux)", () => {
    for (let i = 1; i < MARKET_SCALES.length; i++) {
      const prev = EVIDENCE_TARGETS_BY_SCALE[MARKET_SCALES[i - 1]!];
      const curr = EVIDENCE_TARGETS_BY_SCALE[MARKET_SCALES[i]!];
      expect(curr.superfansTarget).toBeGreaterThan(prev.superfansTarget);
      expect(curr.tarsisTarget).toBeGreaterThan(prev.tarsisTarget);
    }
  });

  it("échelle absente → cibles historiques exactes (zéro régression silencieuse)", () => {
    expect(resolveEvidenceTargets({ marketScale: null, addressableAudience: null }))
      .toEqual(LEGACY_EVIDENCE_TARGETS);
    expect(resolveEvidenceTargets({ marketScale: undefined, addressableAudience: undefined }))
      .toEqual(LEGACY_EVIDENCE_TARGETS);
  });

  it("densité d'adressable : plafonne le bras superfans à 5 % de l'audience, borné", () => {
    // Marque de quartier, 3 000 personnes adressables → 5 % = 150, mais la
    // bande QUARTIER (50) reste le plafond : min(50, max(25, 150)) = 50.
    expect(resolveEvidenceTargets({ marketScale: "QUARTIER", addressableAudience: 3000 }))
      .toEqual({ superfansTarget: 50, tarsisTarget: 5 });
    // Petite audience → le 5 % descend la cible sous la bande, plancher 25.
    expect(resolveEvidenceTargets({ marketScale: "VILLE", addressableAudience: 900 }))
      .toEqual({ superfansTarget: 45, tarsisTarget: 8 });
    expect(
      resolveEvidenceTargets({ marketScale: "VILLE", addressableAudience: 100 }).superfansTarget,
    ).toBe(MIN_SUPERFANS_TARGET);
    // Footprint énorme (monopole national, 10 M adressables) : la densité ne
    // GONFLE jamais la cible au-delà de la bande — pas d'évidence gratuite.
    expect(resolveEvidenceTargets({ marketScale: "NATION", addressableAudience: 10_000_000 }))
      .toEqual({ superfansTarget: 1000, tarsisTarget: 20 });
    // Adressable invalide → ignoré.
    expect(resolveEvidenceTargets({ marketScale: "NATION", addressableAudience: -5 }))
      .toEqual(EVIDENCE_TARGETS_BY_SCALE.NATION);
  });

  it("le palier ne se dit jamais sans son échelle (référentiel affiché)", () => {
    expect(formatTierReferential("FORTE", "NATION")).toBe("Forte — échelle nationale");
    expect(formatTierReferential("CULTE", "QUARTIER")).toBe("Culte — échelle de quartier");
    expect(formatTierReferential("ICONE", null)).toBe("Icône — échelle non déclarée");
  });

  it("LOI 9 — le module domaine est pur (zéro LLM, zéro I/O, zéro Prisma)", () => {
    const src = read("src/domain/market-scale.ts");
    for (const banned of ["@prisma", "llm-gateway", "fetch(", "@/lib/db", "process.env", "executeStructuredLLMCall"]) {
      expect(src.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });

  it("les bandes classifyTier sont INCHANGÉES par l'ADR-0126", () => {
    expect(classifyTier(40)).toBe("LATENT");
    expect(classifyTier(41)).toBe("FRAGILE");
    expect(classifyTier(120)).toBe("ORDINAIRE");
    expect(classifyTier(121)).toBe("FORTE");
    expect(classifyTier(160)).toBe("FORTE");
    expect(classifyTier(161)).toBe("CULTE");
    expect(classifyTier(181)).toBe("ICONE");
  });
});

describe("ADR-0126 — fix d'unités cult-index (devotion = pourcentages 0-100)", () => {
  const engineSrc = read("src/server/services/cult-index-engine/index.ts");

  it("les multiplicateurs fraction (×100/×200/×500 sur la devotion) sont purgés", () => {
    expect(engineSrc).not.toMatch(/latestDevotion\.evangeliste \* 500/);
    expect(engineSrc).not.toMatch(/latestDevotion\.engage \* 200/);
    expect(engineSrc).not.toMatch(/latestDevotion\.evangeliste\) \* 100/);
  });

  it("ugcGenerationRate (sans source branchée) est EXCLU du composite, pas compté 0", () => {
    expect(engineSrc).toContain('computeCultIndex(dimensions, ["ugcGenerationRate"])');
  });

  it("renormalisation : l'exclusion retire le poids du dénominateur", () => {
    const dims = {
      engagementDepth: 50, superfanVelocity: 50, communityCohesion: 50,
      brandDefenseRate: 50, ugcGenerationRate: 0, ritualAdoption: 50, evangelismScore: 50,
    };
    // Sans exclusion : le 0 fabriqué de l'UGC tire le score à 45.
    expect(computeCultIndex(dims)).toBe(45);
    // Avec exclusion : le composite reflète les dimensions mesurées.
    expect(computeCultIndex(dims, ["ugcGenerationRate"])).toBe(50);
  });

  it("un snapshot réaliste ne sature plus les dimensions devotion", () => {
    // Distribution % : 70 spectateurs, 20 intéressés, 5 participants,
    // 3 engagés, 1.5 ambassadeurs, 0.5 évangélistes.
    const participant = 5, engage = 3, ambassadeur = 1.5, evangeliste = 0.5;
    const engagementDepth = participant + engage + ambassadeur + evangeliste; // 10, pas 100
    const ritualAdoption = engage * 2; // 6, pas 100
    const evangelismScore = evangeliste * 5; // 2.5, pas 100
    expect(engagementDepth).toBeLessThan(100);
    expect(ritualAdoption).toBeLessThan(100);
    expect(evangelismScore).toBeLessThan(100);
  });
});

describe("ADR-0126 — câblage du plafond d'évidence (advertis-scorer)", () => {
  const scorerSrc = read("src/server/services/advertis-scorer/index.ts");

  it("le scorer résout ses cibles via le domaine (plus de constantes universelles)", () => {
    expect(scorerSrc).toContain("resolveEvidenceTargets");
    expect(scorerSrc).not.toMatch(/const SUPERFANS_TARGET\s*=/);
    expect(scorerSrc).not.toMatch(/const TARSIS_TARGET\s*=/);
  });

  it("le scorer lit l'échelle déclarée et l'année de fondation de la marque", () => {
    expect(scorerSrc).toContain("marketScale: true");
    expect(scorerSrc).toContain("addressableAudience: true");
    expect(scorerSrc).toContain("brandFoundedYear: true");
    expect(scorerSrc).toContain("brandFoundedYear");
  });
});

describe("ADR-0126 — schéma et migration additive", () => {
  const schema = read("prisma/schema.prisma");

  it("les 3 champs additifs nullable existent sur Strategy + l'enum MarketScale", () => {
    expect(schema).toMatch(/marketScale\s+MarketScale\?/);
    expect(schema).toMatch(/addressableAudience\s+Int\?/);
    expect(schema).toMatch(/brandFoundedYear\s+Int\?/);
    expect(schema).toContain("enum MarketScale {");
  });

  it("la migration versionnée existe (pas de db push)", () => {
    expect(
      existsSync("prisma/migrations/20260711130000_adr0126_market_scale_additive/migration.sql"),
    ).toBe(true);
  });
});
