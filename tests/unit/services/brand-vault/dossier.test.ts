import { describe, expect, it, vi } from "vitest";
import type { BrandAsset, Prisma } from "@prisma/client";
import { assetAuthorship, loadAssetDossier } from "@/server/services/brand-vault/dossier";

describe("DAM provenance", () => {
  it("does not turn an importer into the author or invent Luna for legacy content", () => {
    expect(assetAuthorship({ content: { text: "document" }, depositorName: "Équipe" })).toEqual({ producer: null, provider: null, model: null, generatedAt: null, depositedBy: "Équipe" });
  });
  it("uses the actual Glory engine trace and the actual material engine trace", () => {
    expect(assetAuthorship({ content: {}, gloryOutput: { _meta: { provider: "openai-codex", model: "luna", generatedAt: "2026-11-05" } } })).toMatchObject({ producer: "Glory · Artemis", provider: "openai-codex", model: "luna" });
    expect(assetAuthorship({ content: {}, material: { provider: "higgsfield", providerModel: "received-model" } })).toMatchObject({ producer: "Ptah", provider: "higgsfield", model: "received-model" });
  });
  it("scopes all provenance and usage records to the same brand and preserves unreviewed state", async () => {
    const find = () => vi.fn().mockResolvedValue(null), many = () => vi.fn().mockResolvedValue([]);
    const client = { gloryOutput: { findFirst: find() }, assetVersion: { findFirst: find() }, fileUpload: { findFirst: find() }, brandAsset: { findMany: many() }, generativeTask: { findMany: many() }, campaignDeliverable: { findMany: many() }, campaign: { findFirst: find() }, campaignBrief: { findFirst: find() }, user: { findMany: many() } };
    const asset = { id: "asset", strategyId: "spawt", sourceGloryOutputId: "out", sourceAssetVersionId: "material", parentBrandAssetId: "parent", supersededById: "successor", campaignId: "campaign", briefId: "brief", selectedById: null, selectedAt: null, selectedReason: null, content: {} } as unknown as BrandAsset;
    const result = await loadAssetDossier(client as unknown as Prisma.TransactionClient, asset);
    expect(result.governor).toBe("MESTOR"); expect(result.selection).toEqual({ by: null, at: null, reason: null });
    expect(client.gloryOutput.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "out", strategyId: "spawt" } }));
    expect(client.assetVersion.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "material", strategyId: "spawt" } }));
    expect(client.brandAsset.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ strategyId: "spawt" }) }));
    expect(client.campaignBrief.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "brief", campaign: { strategyId: "spawt" } } }));
    expect(client.campaignDeliverable.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { brandAssetId: "asset", campaign: { strategyId: "spawt" } } }));
  });
});
