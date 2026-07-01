import { describe, it, expect } from "vitest";
import {
  shapeCommunityDashboard,
  latestFollowerPerPlatform,
  type ShapeInput,
} from "@/server/services/community-dashboard";

const EMPTY: ShapeInput = {
  superfanCounts: { total: 0, active: 0, evangelistes: 0 },
  velocity: { newActive: 0, previousActive: 0, periodDays: 30 },
  devotionRow: null,
  communityRow: null,
  followerRows: [],
};

describe("shapeCommunityDashboard — honest empty state", () => {
  it("no data → hasAnyData false, null sections, ratio 0, velocity flat", () => {
    const d = shapeCommunityDashboard(EMPTY);
    expect(d.hasAnyData).toBe(false);
    expect(d.devotion).toBeNull();
    expect(d.community).toBeNull();
    expect(d.followers).toBeNull();
    expect(d.superfans.ratio).toBe(0);
    expect(d.superfans.velocity.trend).toBe("flat");
  });
});

describe("shapeCommunityDashboard — superfan KPIs", () => {
  it("computes activation ratio = active/total %", () => {
    const d = shapeCommunityDashboard({
      ...EMPTY,
      superfanCounts: { total: 200, active: 50, evangelistes: 10 },
    });
    expect(d.superfans.ratio).toBe(25);
    expect(d.hasAnyData).toBe(true);
  });

  it("velocity trend: up when newActive > previousActive", () => {
    const d = shapeCommunityDashboard({
      ...EMPTY,
      superfanCounts: { total: 10, active: 8, evangelistes: 2 },
      velocity: { newActive: 12, previousActive: 5, periodDays: 30 },
    });
    expect(d.superfans.velocity.delta).toBe(7);
    expect(d.superfans.velocity.trend).toBe("up");
  });

  it("velocity trend: down when newActive < previousActive", () => {
    const d = shapeCommunityDashboard({
      ...EMPTY,
      velocity: { newActive: 2, previousActive: 9, periodDays: 30 },
    });
    expect(d.superfans.velocity.trend).toBe("down");
  });
});

describe("shapeCommunityDashboard — sections", () => {
  it("maps devotion distribution + iso measuredAt", () => {
    const measuredAt = new Date("2026-06-01T00:00:00Z");
    const d = shapeCommunityDashboard({
      ...EMPTY,
      devotionRow: {
        spectateur: 0.4, interesse: 0.25, participant: 0.15, engage: 0.1,
        ambassadeur: 0.07, evangeliste: 0.03, devotionScore: 0.62, measuredAt,
      },
    });
    expect(d.devotion?.distribution.evangeliste).toBe(0.03);
    expect(d.devotion?.measuredAt).toBe(measuredAt.toISOString());
    expect(d.hasAnyData).toBe(true);
  });

  it("aggregates follower totals and sorts platforms desc", () => {
    const d = shapeCommunityDashboard({
      ...EMPTY,
      followerRows: [
        { platform: "INSTAGRAM", followerCount: 1200 },
        { platform: "TIKTOK", followerCount: 3400 },
      ],
    });
    expect(d.followers?.totalFollowers).toBe(4600);
    expect(d.followers?.byPlatform[0]?.platform).toBe("TIKTOK"); // sorted desc
  });
});

describe("latestFollowerPerPlatform", () => {
  it("keeps the most-recent row per platform (input sorted desc)", () => {
    const out = latestFollowerPerPlatform([
      { platform: "INSTAGRAM", followerCount: 1500, capturedAt: new Date("2026-06-10") },
      { platform: "TIKTOK", followerCount: 900, capturedAt: new Date("2026-06-09") },
      { platform: "INSTAGRAM", followerCount: 1000, capturedAt: new Date("2026-05-01") }, // stale dup
    ]);
    expect(out).toHaveLength(2);
    expect(out.find((r) => r.platform === "INSTAGRAM")?.followerCount).toBe(1500);
  });
});
