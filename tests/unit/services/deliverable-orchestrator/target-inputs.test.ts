/**
 * Dette 4.11.a — le compositeur résout chaque entrée obligatoire de l’outil cible
 * (fiche de marque, brief du post, proposition validée, briefs amont) ou expose
 * la liste typée des manques avant tout appel. Une entrée facultative absente
 * reste absente : aucune valeur n’est fabriquée.
 */
import { describe, expect, it } from "vitest";
import type { BrandAssetKind } from "@/domain/brand-asset-kinds";
import { describeMissingProductionInput, summarizeMissingProductionInputs } from "@/domain/production-inputs";
import { resolveRequirements } from "@/server/services/deliverable-orchestrator/resolver";
import {
  planTargetInputs,
  prerequisiteAvailability,
} from "@/server/services/deliverable-orchestrator/target-inputs";
import type { DeliverableComposition, VaultMatchStatus } from "@/server/services/deliverable-orchestrator/types";
import type { ProductionSourceManifest } from "@/domain/production-sources";

function plan(targetKind: Parameters<typeof resolveRequirements>[0], statuses: Partial<Record<BrandAssetKind, VaultMatchStatus>> = {}) {
  const { briefDag, targetSlug } = resolveRequirements(targetKind);
  const composition: DeliverableComposition = {
    targetKind, targetGloryToolSlug: targetSlug, briefDag, estimatedCostUsd: 0, missingPreconditions: [],
    vaultMatches: briefDag.filter(n => n.depth > 0).map(n => {
      const status = statuses[n.kind] ?? "MISSING_GENERATE";
      return { kind: n.kind, status, assetId: status === "MISSING_GENERATE" ? null : `${n.kind}-id`, assetState: null, staleAt: null };
    }),
  };
  return composition;
}
const manifest = (extra: Partial<ProductionSourceManifest> = {}): ProductionSourceManifest =>
  ({ schema: "production-sources/v1", sources: [], creativeProposal: null, ...extra });
const INTERNAL = /\b(Glory|Mestor|Artemis|Ptah|Seshat|ADVERTIS|RTIS|non disponible)\b/;

describe("Entrées obligatoires du livrable cible", () => {
  it("un visuel sans brief du post reprend l’idée directrice préparée par la cascade, jamais un champ vide", () => {
    const composition = plan("KV_VISUAL", { KV_ART_DIRECTION_BRIEF: "ACTIVE_REUSE", BIG_IDEA: "ACTIVE_REUSE", CHROMATIC_STRATEGY: "ACTIVE_REUSE" });
    const result = planTargetInputs({
      composition, brandFile: { chromatic_strategy: "Pêche et bleu nuit" }, manifest: manifest(),
      prepared: [{ kind: "BIG_IDEA", versions: [{ id: "idee", version: 3 }] }, { kind: "CHROMATIC_STRATEGY", versions: [{ id: "palette", version: 7 }] }],
    });
    expect(result.missing).toEqual([]);
    expect(result.values.concept).toContain("Idée directrice");
    expect(result.values.concept).toContain("idee");
    expect(result.values.concept).toContain("version 3");
    // La fiche de marque prime quand elle porte la valeur.
    expect(result.values.chromatic_strategy).toBe("Pêche et bleu nuit");
    expect(result.required).toEqual(expect.arrayContaining(["concept", "chromatic_strategy"]));
    // Aucune entrée facultative inventée : le format absent reste absent et nommé.
    expect(result.values).not.toHaveProperty("format");
    expect(result.optionalAbsent).toContain("format");
  });

  it("le brief du post et la proposition validée sont repris dans l’ordre déclaré", () => {
    const composition = plan("KV_VISUAL", { BIG_IDEA: "ACTIVE_REUSE", CHROMATIC_STRATEGY: "ACTIVE_REUSE", KV_ART_DIRECTION_BRIEF: "ACTIVE_REUSE" });
    const proposal = { id: "p", routeKey: "r", direction: "{\"bigIdea\":\"Le goût d’ici\"}", revision: "2026-11-01", fingerprint: "a".repeat(64) };
    const withProposal = planTargetInputs({ composition, brandFile: {}, manifest: manifest({ creativeProposal: proposal }) });
    expect(withProposal.values.concept).toBe(proposal.direction);
    const calendarBrief = { assetId: "brief", version: 2, fingerprint: "b".repeat(64), name: "Piste 2", text: "texte", platform: "Instagram",
      format: "Story", theme: "Cuisine", angle: "prix", family: "terrain", mode: "NEW" as const };
    const withCalendar = planTargetInputs({ composition, brandFile: {}, manifest: manifest({ calendarBrief }) });
    expect(withCalendar.values).toMatchObject({ format: "Story", campaign_context: "Piste 2", concept: "prix" });
  });

  it("une annonce de portefeuille sans offres dans la fiche de marque est refusée avec la liste typée", () => {
    const composition = plan("BCG_PORTFOLIO", { POSITIONING: "ACTIVE_REUSE" });
    const result = planTargetInputs({ composition, brandFile: { business_units: "", market_growth_rates: "[]" }, manifest: manifest() });
    expect(result.missing).toEqual([
      { code: "MISSING_REQUIRED_INPUT", field: "business_units", label: expect.any(String), expected: [{ from: "BRAND_FILE" }] },
    ]);
    expect(result.values).not.toHaveProperty("business_units");
    expect(result.values).not.toHaveProperty("market_growth_rates");
    const text = describeMissingProductionInput(result.missing[0]!);
    expect(text).toMatch(/fiche de marque/);
    expect(text).not.toMatch(INTERNAL);
  });

  it("un prérequis sans version active ni préparation possible est signalé avant toute cascade", () => {
    const composition = plan("PRINT_AD_SPEC", { BIG_IDEA: "ACTIVE_REUSE", CHROMATIC_STRATEGY: "ACTIVE_REUSE" });
    expect(prerequisiteAvailability(composition).unavailable).toEqual(["CONCEPT"]);
    const result = planTargetInputs({ composition, brandFile: { visual_direction: "Lumière chaude" }, manifest: manifest() });
    expect(result.missing).toContainEqual({ code: "PREREQUISITE_UNAVAILABLE", kind: "CONCEPT" });
    const summary = summarizeMissingProductionInputs(result.missing);
    expect(summary).toMatch(/Concept/);
    expect(summary).not.toMatch(INTERNAL);
    // Le concept reste résolu par l’idée directrice : seul le document manquant bloque.
    expect(result.missing.some(m => m.code === "MISSING_REQUIRED_INPUT")).toBe(false);
  });

  it("un prérequis actif est terminal : ses propres prérequis ne bloquent pas", () => {
    const composition = plan("KV_VISUAL", { KV_ART_DIRECTION_BRIEF: "ACTIVE_REUSE", BIG_IDEA: "ACTIVE_REUSE", CHROMATIC_STRATEGY: "ACTIVE_REUSE" });
    expect(prerequisiteAvailability(composition).unavailable).toEqual([]);
  });
});
