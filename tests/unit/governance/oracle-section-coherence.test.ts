/**
 * oracle-section-coherence — anti-drift gate (audit Oracle 2026-06-11).
 *
 * Verrouille la chaîne de compilation des 35 sections de l'Oracle :
 *
 *  A. Zéro doublon de slug dans EXTENDED_GLORY_TOOLS (NEFER interdit #1).
 *     Le bug d'origine : superfan-journey-mapper / engagement-rituals-designer
 *     définis 2× — getGloryTool (first-match) servait la version legacy sans
 *     outputSchema et la section §33 Devotion Ladder restait vide.
 *  B. Chaque step GLORY ACTIVE des 12 séquences Oracle (BIG4 + DISTINCTIVE)
 *     pointe vers un tool existant (bug d'origine : "competitive-map-builder"
 *     n'a jamais existé → steps FAILED silencieux).
 *  C. Les outputKeys déclarés de chaque step sont réellement produits par le
 *     tool (outputSchema top-level keys, ou clés du contrat JSON du prompt,
 *     ou `content` pour les tools freeform sans schema — legacy parse).
 *  D. Les clés consommées par les writebacks de enrich-oracle sont produites
 *     par leur séquence (bug d'origine : DELOITTE-BUDGET consommait
 *     budget_optimization/vendor_brief jamais produits → section vide).
 *  E. SECTION_REGISTRY : 35 sections, ids uniques, refs PURE_MAPPER résolues.
 *  F. Smoke + data-driven : les 21 mappers CORE ne crashent ni sur stratégie
 *     riche ni sur stratégie vide, et les mappers historiquement HS
 *     (catalogue-actions, swot-externe, croissance, proposition-valeur,
 *     signaux, profil-superfan) sont pilotés par les données pilier
 *     (output riche ≠ output vide).
 */

import { describe, it, expect } from "vitest";
import {
  ORACLE_BIG4_SEQUENCES,
  ORACLE_DISTINCTIVE_SEQUENCES,
} from "@/server/services/artemis/tools/phase13-oracle-sequences";
import { EXTENDED_GLORY_TOOLS } from "@/server/services/artemis/tools/registry";
import { SECTION_REGISTRY } from "@/server/services/strategy-presentation/types";
import * as mappers from "@/server/services/strategy-presentation/section-mappers";
import { buildExampleFromZod } from "@/lib/types/pillar-maturity-contracts";
import { PILLAR_SCHEMAS } from "@/lib/types/pillar-schemas";

const ORACLE_SEQUENCES = [...ORACLE_BIG4_SEQUENCES, ...ORACLE_DISTINCTIVE_SEQUENCES];

// Source : SECTION_ENRICHMENT writebacks (enrich-oracle.ts). Toute évolution
// d'un writeback DOIT mettre à jour cette table — c'est le contrat section.
const WRITEBACK_KEYS: Record<string, string[]> = {
  "MCK-7S": ["seven_s_map"],
  "BCG-PORTFOLIO": ["bcg_quadrants", "portfolio_health_score"],
  "BAIN-NPS": ["nps_score", "promoters_pct", "drivers"],
  "DELOITTE-GREENHOUSE": ["team_profiles", "complementarity_score", "brand_culture_audit"],
  "MCK-3H": ["h1", "h2", "h3", "allocation_percentages"],
  "BCG-PALETTE": ["augmented_swot", "evaluations", "matrix_summary"],
  "DELOITTE-BUDGET": ["total_budget", "allocation_by_deliverable", "brief"],
  "CULT-INDEX": ["cult_index_score", "tier", "components"],
  "MANIP-MATRIX": ["evaluations", "matrix_summary"],
  "DEVOTION-LADDER": ["devotion_levels", "current_distribution", "rituals_by_level", "manifesto_extract"],
  "OVERTON-DISTINCTIVE": ["axes", "maneuvers"],
  "TARSIS-WEAK": ["signals", "top_3_priority"],
};

const toolBySlug = new Map((EXTENDED_GLORY_TOOLS as Array<{ slug: string }>).map((t) => [t.slug, t as Record<string, unknown>]));

function producedKeys(tool: Record<string, unknown>): Set<string> {
  const out = new Set<string>();
  const schema = tool.outputSchema as { shape?: Record<string, unknown> } | undefined;
  if (schema?.shape) {
    Object.keys(schema.shape).forEach((k) => out.add(k));
    return out;
  }
  const tpl = String(tool.promptTemplate ?? "");
  const m = tpl.match(/\{[\s\S]*\}/);
  if (m) for (const km of m[0].matchAll(/"([a-zA-Z0-9_]+)"\s*:/g)) out.add(km[1]!);
  // Legacy parse (engine.ts) : texte freeform wrappé sous `content`.
  out.add("content");
  return out;
}

describe("Oracle 35 sections — chaîne de compilation (audit 2026-06-11)", () => {
  it("A. zéro doublon de slug dans EXTENDED_GLORY_TOOLS", () => {
    const counts = new Map<string, number>();
    for (const t of EXTENDED_GLORY_TOOLS as Array<{ slug: string }>) {
      counts.set(t.slug, (counts.get(t.slug) ?? 0) + 1);
    }
    const dups = [...counts.entries()].filter(([, n]) => n > 1);
    expect(dups, `slugs dupliqués : ${JSON.stringify(dups)}`).toEqual([]);
  });

  it("B. chaque step GLORY ACTIVE des séquences Oracle pointe vers un tool existant", () => {
    for (const seq of ORACLE_SEQUENCES) {
      for (const step of seq.steps) {
        if (step.type !== "GLORY" || step.status !== "ACTIVE") continue;
        expect(toolBySlug.has(step.ref), `[${seq.key}] tool inexistant : ${step.ref}`).toBe(true);
      }
    }
  });

  it("C. les outputKeys déclarés des steps GLORY ACTIVE sont produits par leur tool", () => {
    for (const seq of ORACLE_SEQUENCES) {
      for (const step of seq.steps) {
        if (step.type !== "GLORY" || step.status !== "ACTIVE") continue;
        const tool = toolBySlug.get(step.ref);
        if (!tool) continue; // couvert par B
        const produced = producedKeys(tool);
        for (const k of step.outputKeys) {
          expect(produced.has(k), `[${seq.key}] step ${step.ref} déclare "${k}" — jamais produit (schema/prompt : ${[...produced].slice(0, 10).join(",")})`).toBe(true);
        }
      }
    }
  });

  it("D. les clés consommées par les writebacks enrich-oracle sont produites par leur séquence", () => {
    for (const seq of ORACLE_SEQUENCES) {
      const expected = WRITEBACK_KEYS[seq.key];
      expect(expected, `séquence ${seq.key} absente de WRITEBACK_KEYS — synchroniser le test avec enrich-oracle`).toBeDefined();
      const produced = new Set<string>();
      for (const step of seq.steps) {
        if (step.status !== "ACTIVE") continue;
        if (step.type === "GLORY") {
          const tool = toolBySlug.get(step.ref);
          if (tool) producedKeys(tool).forEach((k) => produced.add(k));
        } else {
          // ARTEMIS/SESHAT/MESTOR/CALC/SEQUENCE : on fait confiance aux
          // outputKeys déclarés (executeArtemisStep spread les outputFields).
          step.outputKeys.forEach((k) => produced.add(k));
        }
      }
      for (const k of expected!) {
        expect(produced.has(k), `[${seq.key}] writeback consomme "${k}" — jamais produit par la séquence`).toBe(true);
      }
    }
  });

  it("E. SECTION_REGISTRY : 35 sections, ids uniques, refs PURE_MAPPER résolues", () => {
    expect(SECTION_REGISTRY).toHaveLength(35);
    const ids = SECTION_REGISTRY.map((s) => s.id);
    expect(new Set(ids).size).toBe(35);
    for (const meta of SECTION_REGISTRY) {
      if (meta.runner?.kind === "PURE_MAPPER") {
        expect(
          typeof (mappers as Record<string, unknown>)[meta.runner.ref],
          `[${meta.id}] mapper "${meta.runner.ref}" introuvable dans section-mappers`,
        ).toBe("function");
      }
    }
  });
});

describe("Oracle mappers CORE — smoke + data-driven (audit 2026-06-11)", () => {
  const RELS = {
    user: { name: "Alexandre", email: "x@y.z", image: null },
    operator: { name: "UPgraders", slug: "upgraders" },
    client: null,
    drivers: [], campaigns: [], missions: [], signals: [], gloryOutputs: [],
    devotionSnapshots: [], cultIndexSnapshots: [], superfanProfiles: [],
    communitySnapshots: [], scoreSnapshots: [], contracts: [],
    brandVariables: [], frameworkResults: [],
    createdAt: new Date("2025-01-01"),
    status: "ACTIVE",
  };

  const strat = (rich: boolean) => ({
    id: "audit", name: "Marque Test", sector: "Agroalimentaire", country: "Cameroun",
    businessContext: {}, advertis_vector: { composite: 120, confidence: 0.7 },
    pillars: rich
      ? Object.entries(PILLAR_SCHEMAS).map(([k, schema]) => ({
          key: k.toLowerCase(),
          content: buildExampleFromZod(schema, 0, 4),
          confidence: 0.8,
        }))
      : [],
    ...RELS,
  });

  const vector = { a: 15, d: 15, v: 15, e: 15, r: 15, t: 15, i: 15, s: 15, composite: 120, confidence: 0.7 };

  const ALL_MAPPERS: Array<[string, (s: unknown) => unknown]> = [
    ["mapExecutiveSummary", (s) => (mappers as any).mapExecutiveSummary(s, vector, "FORTE")],
    ["mapContexteDefi", (s) => (mappers as any).mapContexteDefi(s)],
    ["mapPlateformeStrategique", (s) => (mappers as any).mapPlateformeStrategique(s)],
    ["mapPropositionValeur", (s) => (mappers as any).mapPropositionValeur(s)],
    ["mapTerritoireCreatif", (s) => (mappers as any).mapTerritoireCreatif(s)],
    ["mapExperienceEngagement", (s) => (mappers as any).mapExperienceEngagement(s)],
    ["mapSwotInterne", (s) => (mappers as any).mapSwotInterne(s)],
    ["mapSwotExterne", (s) => (mappers as any).mapSwotExterne(s)],
    ["mapSignauxOpportunites", (s) => (mappers as any).mapSignauxOpportunites(s)],
    ["mapCatalogueActions", (s) => (mappers as any).mapCatalogueActions(s)],
    ["mapPlanActivation", (s) => (mappers as any).mapPlanActivation(s)],
    ["mapFenetreOverton", (s) => (mappers as any).mapFenetreOverton(s)],
    ["mapMediasDistribution", (s) => (mappers as any).mapMediasDistribution(s)],
    ["mapProductionLivrables", (s) => (mappers as any).mapProductionLivrables(s)],
    ["mapProfilSuperfan", (s) => (mappers as any).mapProfilSuperfan(s)],
    ["mapKpisMesure", (s) => (mappers as any).mapKpisMesure(s)],
    ["mapCroissanceEvolution", (s) => (mappers as any).mapCroissanceEvolution(s)],
    ["mapBudget", (s) => (mappers as any).mapBudget(s)],
    ["mapTimelineGouvernance", (s) => (mappers as any).mapTimelineGouvernance(s)],
    ["mapEquipe", (s) => (mappers as any).mapEquipe(s)],
    ["mapConditionsEtapes", (s) => (mappers as any).mapConditionsEtapes(s)],
    ["mapAuditDiagnostic", (s) => (mappers as any).mapAuditDiagnostic(s)],
  ];

  it("F1. aucun mapper ne crash — stratégie riche ET stratégie vide", () => {
    const rich = strat(true);
    const empty = strat(false);
    for (const [name, fn] of ALL_MAPPERS) {
      expect(() => fn(rich), `${name} crash sur stratégie riche`).not.toThrow();
      expect(() => fn(empty), `${name} crash sur stratégie vide`).not.toThrow();
    }
  });

  it("F2. les mappers historiquement HS sont pilotés par les données pilier", () => {
    // Avant l'audit 2026-06-11, ces mappers lisaient des champs inexistants
    // (i.parCanal, t.competitors, s.growthLoops, v.pricing, e.devotionJourney…)
    // et rendaient 100% de boilerplate quel que soit le contenu pilier.
    const DATA_DRIVEN = [
      "mapCatalogueActions",
      "mapSwotExterne",
      "mapSignauxOpportunites",
      "mapCroissanceEvolution",
      "mapPropositionValeur",
      "mapProfilSuperfan",
      "mapTimelineGouvernance",
    ];
    const rich = strat(true);
    const empty = strat(false);
    for (const [name, fn] of ALL_MAPPERS) {
      if (!DATA_DRIVEN.includes(name)) continue;
      const r = JSON.stringify(fn(rich));
      const e = JSON.stringify(fn(empty));
      expect(r === e, `${name} rend un output IDENTIQUE avec piliers pleins et piliers vides — mapper déconnecté des données`).toBe(false);
    }
  });

  it("F3. conditions-etapes ne fabrique JAMAIS de contrat fictif", () => {
    const out = (mappers as any).mapConditionsEtapes(strat(false)) as { contracts: unknown[] };
    expect(out.contracts).toEqual([]);
  });
});
