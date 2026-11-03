import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readOvertonStrategyPlan } from "@/domain/overton-radar-signal";
import { OvertonRadar } from "@/components/neteru/overton-radar";
import { getPillarProductionState, getPillarChipStatus, type PillarReadinessProjection } from "@/components/cockpit/notoria/lib/pillar-chip-status";
const complete: PillarReadinessProjection = { stage: "COMPLETE", completionLevel: "COMPLET", stale: true, rtisCascadeReady: true, validationStatus: "AI_PROPOSED", displayLabel: "Complet" };
it("shows previously produced analyses as stale even when recalculation is permitted", () => {
  expect(getPillarChipStatus(complete).isReadyForCascade).toBe(true);
  expect(getPillarProductionState(complete)).toBe("stale");
  expect(getPillarProductionState({ ...complete, stale: false })).toBe("current");
  expect(getPillarProductionState({ ...complete, stage: "EMPTY", completionLevel: "INCOMPLET", stale: false })).toBe("missing");
});
describe("Overton connections", () => {
  it("keeps the strategic objective visible without pretending observations exist", () => {
    const strategyPlan = readOvertonStrategyPlan({ fenetreOverton: { perceptionActuelle: "Point de départ", perceptionCible: "Cible à atteindre", ecart: "Écart du plan" }, overtonMilestones: [{ phase: "M1", targetPerception: "Première preuve", measurementMethod: "Entretiens" }] }, {}, true);
    const html = renderToStaticMarkup(React.createElement(OvertonRadar, { strategyPlan, signal: { state: "DEGRADED", reason: "INSUFFICIENT_DATA" }, instance: "full" }));
    expect(html).toContain("Cible à atteindre"); expect(html).toContain("Plan à réactualiser"); expect(html).toContain("Entretiens"); expect(html).not.toContain("<svg width=");
  });
  it("does not draw an all-zero brand polygon when only the sector vector exists", () => {
    const html = renderToStaticMarkup(React.createElement(OvertonRadar, { signal: { state: "LIVE", observedAt: "2026-11-03T10:00:00Z", data: { sectorAxis: { tags: { local: .7, partage: .4, prix: .8 }, confidence: .8, samples: 3 }, brandTags: {}, sectorArticles: [{ headline: "Article reçu", sourceUrl: "https://example.org/article", publication: "Journal" }] } }, instance: "full" }));
    expect(html).not.toContain("<polygon"); expect(html).toContain("Article reçu"); expect(html).toContain("https://example.org/article"); expect(html).not.toContain("Alignement</div>");
  });
});
