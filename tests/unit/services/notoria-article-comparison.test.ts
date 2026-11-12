import { describe, it, expect, vi } from "vitest";
import { compareArticleAction, readArticleComparisonScopes, type ArticleComparisonScope } from "@/server/services/notoria/article-comparison";

const scope: ArticleComparisonScope = { id: "campaign-ci", objective: "Respecter le mix éditorial du pilote",
  audience: "Lecteurs foodies d’Abidjan · APPRENTI", channel: "DIGITAL", period: "octobre 2026", evidence: ["brief-v2"],
  references: [{ id: "one", label: "Montrer une sortie", mode: "entertainer" }],
  mix: { entertainer: 50, facilitator: 50, peddler: 0, dealer: 0 } };
const idea = { action: "Comparer deux façons d’utiliser la découverte food d’un créateur", objective: scope.objective };

describe("article actions compare decisions on a documented scope", () => {
  it("counts actual modes before/after one proposed action; predicts a planning change only", () => {
    expect(compareArticleAction(idea, scope, "facilitator")).toMatchObject({ verdict: "BETTER", delta: -50, incumbent: { value: 50 }, candidate: 0,
      unit: "points de pourcentage", basis: "projection", evidence: expect.arrayContaining([expect.stringContaining("Action:one")]) });
    expect(compareArticleAction(idea, scope, "entertainer").verdict).toBe("EQUAL");
    expect(compareArticleAction(idea, { ...scope, mix: { ...scope.mix!, entertainer: 100, facilitator: 0 } }, "facilitator").verdict).toBe("BELOW");
  });
  it("admits an unprecedented action only if its distribution meets the brand’s explicit target", () => {
    expect(compareArticleAction(idea, { ...scope, references: [], mix: { ...scope.mix!, entertainer: 0, facilitator: 100 } }, "facilitator"))
      .toMatchObject({ verdict: "THRESHOLD_MET", threshold: 0, candidate: 0 });
    expect(compareArticleAction(idea, { ...scope, references: [] }, "facilitator").verdict).toBe("BELOW");
  });
  it("withholds a verdict on different objectives or incomplete classification; excludes equivalent actions", () => {
    expect(compareArticleAction({ ...idea, objective: "Augmenter les ventes" }, scope, "facilitator").verdict).toBe("UNASSESSED");
    expect(compareArticleAction(idea, { ...scope, references: [{ id: "one", label: "action sans mode" }] }, "facilitator").verdict).toBe("UNASSESSED");
    expect(compareArticleAction(idea, scope, "entertainer", "one").verdict).toBe("DUPLICATE");
    expect(compareArticleAction({ ...idea, action: "Montrer une sortie !" }, scope).verdict).toBe("DUPLICATE");
  });
  it("loads a validated audience and operator-reviewed mix, retaining only adopted actions in the denominator", async () => {
    const date = new Date("2026-11-01");
    const row = { id: "cam", name: "ouverture", objectives: { description: scope.objective }, startDate: date, endDate: date,
      briefs: [{id: "b", version: 3, content: { briefClient: { cible_principale: "lecteurs" } }}],
      actions: ["APPROVED", "PLANNED"].map((status, i) => ({ status, id: "id-"+i, name: "action "+i, category: "DIGITAL",
        aarrStage: "ACQUISITION", devotionRungTargeted: "APPRENTI", manipulationModeApplied: "entertainer" })) };
    const reader = { campaign: {findMany: vi.fn().mockResolvedValue([row])}, pillar: {findMany: vi.fn().mockResolvedValue([])},
      strategy: {findUnique: vi.fn().mockResolvedValue({manipulationMix: {primary:"entertainer",entertainer:.5,facilitator:.5,peddler:0,dealer:0,review:{status:"HUMAN_REVIEWED",version:3}}})} };
    const load = () => readArticleComparisonScopes("s",reader as never);
    expect((await load())[0]).toMatchObject({audience:"lecteurs · APPRENTI", evidence: expect.arrayContaining(["CampaignBrief:b.v3"]),
      references:[{ id:"id-0", mode:"entertainer" }],mix:scope.mix});
    reader.campaign.findMany.mockResolvedValue([{...row,objectives:{description:"Vendre des repas"}}]);
    expect((await load())[0]).not.toHaveProperty("mix");
    reader.campaign.findMany.mockResolvedValue([{...row,briefs:[]}]);
    expect(await load()).toEqual([]);
    expect(reader.campaign.findMany.mock.calls[0]![0].where.strategyId).toBe("s");
  });
});
