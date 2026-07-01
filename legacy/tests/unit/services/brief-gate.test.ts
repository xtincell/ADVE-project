import { describe, it, expect, vi } from "vitest";
import { BriefMissingError } from "@/server/services/campaign-manager/brief-gate";

// Mock db before importing brief-gate (it imports db at top level)
vi.mock("@/lib/db", () => ({
  db: {},
}));

import {
  assertCampaignHasBrief,
  getCampaignBriefStatus,
} from "@/server/services/campaign-manager/brief-gate";

// Minimal Prisma client mock factory — only the .campaign.findUnique surface
// is used by brief-gate; the rest is irrelevant.
type FakeCampaign = {
  id: string;
  name?: string;
  activeBriefId: string | null;
  briefs: Array<{ id: string; title?: string; briefType?: string | null; status?: string; version?: number }>;
};

function makeDb(campaign: FakeCampaign | null) {
  return {
    campaign: {
      findUnique: vi.fn(async () => campaign),
    },
  } as unknown as Parameters<typeof assertCampaignHasBrief>[1];
}

describe("ADR-0049 — brief mandatory gate", () => {
  describe("assertCampaignHasBrief", () => {
    it("throw BriefMissingError when campaign does not exist", async () => {
      const db = makeDb(null);
      await expect(assertCampaignHasBrief("missing", db)).rejects.toBeInstanceOf(BriefMissingError);
    });

    it("throw BriefMissingError when no brief and no activeBriefId", async () => {
      const db = makeDb({ id: "c1", name: "Acme launch", activeBriefId: null, briefs: [] });
      await expect(assertCampaignHasBrief("c1", db)).rejects.toBeInstanceOf(BriefMissingError);
    });

    it("pass silently when activeBriefId is set (even with empty briefs[])", async () => {
      const db = makeDb({ id: "c1", activeBriefId: "ba_active", briefs: [] });
      await expect(assertCampaignHasBrief("c1", db)).resolves.toBeUndefined();
    });

    it("pass silently when at least one CampaignBrief exists", async () => {
      const db = makeDb({
        id: "c1",
        activeBriefId: null,
        briefs: [{ id: "b1" }],
      });
      await expect(assertCampaignHasBrief("c1", db)).resolves.toBeUndefined();
    });

    it("BriefMissingError carries campaignId and code BRIEF_MISSING", async () => {
      const db = makeDb({ id: "c1", name: "Acme", activeBriefId: null, briefs: [] });
      try {
        await assertCampaignHasBrief("c1", db);
        throw new Error("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(BriefMissingError);
        const err = e as BriefMissingError;
        expect(err.code).toBe("BRIEF_MISSING");
        expect(err.campaignId).toBe("c1");
        expect(err.message).toContain("Acme");
      }
    });
  });

  describe("getCampaignBriefStatus", () => {
    it("returns hasBrief=false when campaign missing", async () => {
      const db = makeDb(null);
      const s = await getCampaignBriefStatus("missing", db);
      expect(s).toEqual({ hasBrief: false, briefCount: 0, activeBriefId: null, primaryBrief: null });
    });

    it("returns primary brief when briefs exist", async () => {
      const db = makeDb({
        id: "c1",
        activeBriefId: null,
        briefs: [
          { id: "b1", title: "Creative brief", briefType: "CREATIVE", status: "DRAFT", version: 2 },
          { id: "b0", title: "Older", briefType: "MEDIA", status: "DRAFT", version: 1 },
        ],
      });
      const s = await getCampaignBriefStatus("c1", db);
      expect(s.hasBrief).toBe(true);
      expect(s.briefCount).toBe(2);
      expect(s.primaryBrief?.id).toBe("b1");
      expect(s.primaryBrief?.briefType).toBe("CREATIVE");
    });

    it("hasBrief is true when only activeBriefId is set", async () => {
      const db = makeDb({ id: "c1", activeBriefId: "ba_active", briefs: [] });
      const s = await getCampaignBriefStatus("c1", db);
      expect(s.hasBrief).toBe(true);
      expect(s.activeBriefId).toBe("ba_active");
      expect(s.primaryBrief).toBeNull();
    });
  });
});
