import { describe, expect, it } from "vitest";
import { mapEquipe, mapProductionLivrables, mapTerritoireCreatif } from "@/server/services/strategy-presentation/section-mappers";

const createdAt = new Date("2026-11-04T08:00:00Z");
const failed = { status: "FAILED", attempts: 1, errorCode: "LLM_CALL_FAILED", errorMessage: "Provider unavailable" };

function generation(toolSlug: string, output: unknown) {
  return { toolSlug, output, createdAt };
}

describe("versions reçues dans l’Oracle", () => {
  it("reprend la dernière version exploitable et conserve la direction artistique du pilier D", () => {
    const concept = { concept: "Les foodies recommandent un plat vérifié" };
    const moodboard = { palette: ["terracotta"] };
    const creative = mapTerritoireCreatif({
      pillars: [{ key: "d", content: { directionArtistique: { moodboard } } }],
      gloryOutputs: [generation("concept-generator", failed), generation("concept-generator", concept),
        generation("visual-moodboard-generator", failed), generation("kv-banana-prompt-generator", failed)],
    });
    expect(creative.conceptGenerator).toEqual(concept);
    expect(creative.moodboard).toEqual(moodboard);
    expect(creative.kvPrompts).toBeNull();
  });

  it("exclut les tentatives du catalogue Oracle mais conserve chaque version produite", () => {
    const production = mapProductionLivrables({
      pillars: [], missions: [], gloryOutputs: [
        generation("social-copy-engine", failed), generation("social-copy-engine", { caption: "version 2" }),
        generation("social-copy-engine", { caption: "version 1" }), generation("digital-planner", { status: "PENDING" }),
      ],
    });
    expect(production.gloryOutputsByLayer.CR?.map(row => row.toolSlug)).toEqual(["social-copy-engine", "social-copy-engine"]);
    expect(production.gloryOutputsByLayer.HYBRID).toEqual([]);
  });

  it("préserve un score Berkus historique de zéro et ignore une tentative échouée plus récente", () => {
    const framework = { slug: "fw-25-berkus-team-assessment" };
    const team = mapEquipe({
      campaigns: [], pillars: [], user: {}, frameworkResults: [
        { framework, score: 90, output: failed }, { framework, score: 0, output: null },
      ],
    });
    expect(team.berkus?.teamScore).toBe(0);
  });
});
