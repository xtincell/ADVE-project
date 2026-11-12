import { beforeEach, describe, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ actions: vi.fn(), campaigns: vi.fn(), updateAction: vi.fn(), updateProposal: vi.fn(), brief: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {
  creativeProposal: { findUniqueOrThrow: vi.fn(async () => ({ id: "proposal", strategyId: "brand", routeKey: "TARGET", status: "DRAFT" })), update: f.updateProposal },
  brandAction: { findMany: f.actions, update: f.updateAction }, campaign: { findMany: f.campaigns },
  pillar: { findUnique: vi.fn(async () => ({ staleAt: null, content: { computed: { roadmapRoutes: [
    { key: "TARGET", selectionBasis: "CATALOGUE_COVERAGE_RULES_V1", initiativeIds: ["source-action"] },
  ] } } })) },
} }));
vi.mock("@/server/services/campaign-manager", () => ({ generateBriefFromBrandAction: f.brief }));
import { validateCreativeProposal } from "@/server/services/creative-proposal";
beforeEach(() => { vi.clearAllMocks(); f.brief.mockResolvedValue({}); });
describe("production retains the selected action's explicit campaign", () => {
  it("refuses an unclassified action before creating frames, moving it or validating a proposal", async () => {
    f.actions.mockResolvedValue([{ id: "action", sourceInitiativeId: "source-action", status: "PROPOSED", metadata: {}, campaignId: null }]);
    await expect(validateCreativeProposal("proposal")).rejects.toThrow("CAMPAIGN_CLASSIFICATION_REQUIRED");
    expect(f.campaigns).not.toHaveBeenCalled(); expect(f.updateAction).not.toHaveBeenCalled(); expect(f.updateProposal).not.toHaveBeenCalled();
  });
  it("does not attach a punctual action through a missing or foreign campaign", async () => {
    f.actions.mockResolvedValue([{ id: "action", sourceInitiativeId: "source-action", status: "PROPOSED", metadata: { campaignCanonType: "PUNCTUAL" }, campaignId: "foreign" }]);
    f.campaigns.mockResolvedValue([]);
    await expect(validateCreativeProposal("proposal")).rejects.toThrow("PUNCTUAL_CAMPAIGN_REQUIRED");
    expect(f.campaigns).toHaveBeenCalledWith(expect.objectContaining({ where: { strategyId: "brand", id: { in: ["foreign"] }, canonType: "PUNCTUAL" } }));
    expect(f.updateAction).not.toHaveBeenCalled(); expect(f.updateProposal).not.toHaveBeenCalled();
  });
  it("reuses the explicit punctual frame without manufacturing an annual or always-on frame", async () => {
    f.actions.mockResolvedValue([{ id: "action", sourceInitiativeId: "source-action", status: "PROPOSED", metadata: { campaignCanonType: "PUNCTUAL" }, campaignId: "punctual" }]);
    f.campaigns.mockResolvedValue([{ id: "punctual" }]);
    const result = await validateCreativeProposal("proposal", "operator");
    expect(result).toMatchObject({ frames: 1, actionsAttached: 1, briefsGenerated: 1, alreadyValidated: false });
    expect(f.campaigns).toHaveBeenCalledTimes(1);
    expect(f.updateAction).toHaveBeenCalledWith({ where: { id: "action" }, data: { campaignId: "punctual", selected: true, status: "ACCEPTED" } });
  });
});
