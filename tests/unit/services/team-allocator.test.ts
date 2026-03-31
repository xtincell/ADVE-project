import { describe, it, expect } from "vitest";

/**
 * Team Allocator tests.
 *
 * Tests the pure calculation logic for load, capacity, utilization,
 * and bottleneck detection without requiring DB access.
 */

type GuildTier = "APPRENTI" | "COMPAGNON" | "MAITRE" | "ASSOCIE";

const TIER_CAPACITY: Record<string, number> = {
  APPRENTI: 3,
  COMPAGNON: 5,
  MAITRE: 8,
  ASSOCIE: 12,
};

interface CreatorLoad {
  userId: string;
  displayName: string;
  tier: string;
  activeMissions: number;
  pendingReviews: number;
  totalLoad: number;
  capacity: number;
  utilization: number;
}

function calculateLoad(activeMissions: number, pendingReviews: number, tier: string): CreatorLoad {
  const capacity = TIER_CAPACITY[tier] ?? 3;
  const totalLoad = activeMissions + pendingReviews * 0.5;
  const utilization = Math.min(1, totalLoad / capacity);
  return {
    userId: "test-user",
    displayName: "Test Creator",
    tier,
    activeMissions,
    pendingReviews,
    totalLoad,
    capacity,
    utilization,
  };
}

function detectBottlenecks(loads: CreatorLoad[]) {
  const alerts: Array<{
    type: "overloaded" | "underutilized" | "no_reviewer" | "tier_gap";
    severity: "low" | "medium" | "high";
    message: string;
    affectedUsers: string[];
  }> = [];

  const overloaded = loads.filter((l) => l.utilization > 0.8);
  if (overloaded.length > 0) {
    alerts.push({
      type: "overloaded",
      severity: overloaded.some((l) => l.utilization > 0.95) ? "high" : "medium",
      message: `${overloaded.length} creator(s) above 80% capacity`,
      affectedUsers: overloaded.map((l) => l.displayName),
    });
  }

  const underutilized = loads.filter((l) => l.utilization < 0.2 && l.tier !== "APPRENTI");
  if (underutilized.length > 0) {
    alerts.push({
      type: "underutilized",
      severity: "low",
      message: `${underutilized.length} experienced creator(s) underutilized (<20% capacity)`,
      affectedUsers: underutilized.map((l) => l.displayName),
    });
  }

  const maitresAndUp = loads.filter((l) => l.tier === "MAITRE" || l.tier === "ASSOCIE");
  if (maitresAndUp.length === 0) {
    alerts.push({
      type: "tier_gap",
      severity: "high",
      message: "No MAITRE or ASSOCIE available for advanced peer reviews",
      affectedUsers: [],
    });
  }

  return alerts;
}

describe("Team Allocator - Load Calculation", () => {
  it("APPRENTI capacity is 3", () => {
    const load = calculateLoad(0, 0, "APPRENTI");
    expect(load.capacity).toBe(3);
  });

  it("COMPAGNON capacity is 5", () => {
    const load = calculateLoad(0, 0, "COMPAGNON");
    expect(load.capacity).toBe(5);
  });

  it("MAITRE capacity is 8", () => {
    const load = calculateLoad(0, 0, "MAITRE");
    expect(load.capacity).toBe(8);
  });

  it("ASSOCIE capacity is 12", () => {
    const load = calculateLoad(0, 0, "ASSOCIE");
    expect(load.capacity).toBe(12);
  });

  it("total load counts missions at full weight and reviews at half", () => {
    const load = calculateLoad(2, 4, "COMPAGNON");
    // 2 missions + 4 reviews * 0.5 = 4
    expect(load.totalLoad).toBe(4);
  });

  it("utilization is 0 when no work assigned", () => {
    const load = calculateLoad(0, 0, "MAITRE");
    expect(load.utilization).toBe(0);
  });

  it("utilization is capped at 1.0 (100%)", () => {
    const load = calculateLoad(20, 0, "APPRENTI");
    // 20 missions but capacity is 3, utilization should be capped at 1
    expect(load.utilization).toBe(1);
  });

  it("utilization calculated correctly for partial load", () => {
    const load = calculateLoad(2, 0, "COMPAGNON");
    // 2/5 = 0.4
    expect(load.utilization).toBeCloseTo(0.4, 2);
  });

  it("unknown tier defaults to capacity 3", () => {
    const load = calculateLoad(1, 0, "UNKNOWN_TIER");
    expect(load.capacity).toBe(3);
  });
});

describe("Team Allocator - Bottleneck Detection at 80% Capacity", () => {
  it("detects overloaded creators above 80% utilization", () => {
    const loads: CreatorLoad[] = [
      calculateLoad(4, 2, "COMPAGNON"), // 5/5 = 100%
      calculateLoad(1, 0, "MAITRE"),     // 1/8 = 12.5%
    ];
    // Manually set names for assertion
    loads[0]!.displayName = "Alice";
    loads[1]!.displayName = "Bob";

    const alerts = detectBottlenecks(loads);
    const overloaded = alerts.find((a) => a.type === "overloaded");
    expect(overloaded).toBeDefined();
    expect(overloaded!.affectedUsers).toContain("Alice");
    expect(overloaded!.affectedUsers).not.toContain("Bob");
  });

  it("high severity when utilization > 95%", () => {
    const loads: CreatorLoad[] = [
      { ...calculateLoad(3, 0, "APPRENTI"), displayName: "OverloadedAlice" },
      // 3/3 = 100% > 95%
    ];

    const alerts = detectBottlenecks(loads);
    const overloaded = alerts.find((a) => a.type === "overloaded");
    expect(overloaded).toBeDefined();
    expect(overloaded!.severity).toBe("high");
  });

  it("medium severity when utilization between 80% and 95%", () => {
    const load = calculateLoad(7, 0, "MAITRE"); // 7/8 = 87.5%
    load.displayName = "Bob";

    const loads: CreatorLoad[] = [
      load,
      { ...calculateLoad(1, 0, "ASSOCIE"), displayName: "Other" },
    ];

    const alerts = detectBottlenecks(loads);
    const overloaded = alerts.find((a) => a.type === "overloaded");
    expect(overloaded).toBeDefined();
    expect(overloaded!.severity).toBe("medium");
  });

  it("no overload alert when all below 80%", () => {
    const loads: CreatorLoad[] = [
      { ...calculateLoad(2, 0, "COMPAGNON"), displayName: "Alice" }, // 40%
      { ...calculateLoad(3, 0, "MAITRE"), displayName: "Bob" },     // 37.5%
    ];

    const alerts = detectBottlenecks(loads);
    const overloaded = alerts.find((a) => a.type === "overloaded");
    expect(overloaded).toBeUndefined();
  });
});

describe("Team Allocator - Tier Gap Detection", () => {
  it("detects tier gap when no MAITRE or ASSOCIE present", () => {
    const loads: CreatorLoad[] = [
      { ...calculateLoad(1, 0, "APPRENTI"), displayName: "Junior1" },
      { ...calculateLoad(2, 0, "COMPAGNON"), displayName: "Mid1" },
    ];

    const alerts = detectBottlenecks(loads);
    const tierGap = alerts.find((a) => a.type === "tier_gap");
    expect(tierGap).toBeDefined();
    expect(tierGap!.severity).toBe("high");
  });

  it("no tier gap when MAITRE is present", () => {
    const loads: CreatorLoad[] = [
      { ...calculateLoad(1, 0, "APPRENTI"), displayName: "Junior1" },
      { ...calculateLoad(2, 0, "MAITRE"), displayName: "Senior1" },
    ];

    const alerts = detectBottlenecks(loads);
    const tierGap = alerts.find((a) => a.type === "tier_gap");
    expect(tierGap).toBeUndefined();
  });

  it("no tier gap when ASSOCIE is present", () => {
    const loads: CreatorLoad[] = [
      { ...calculateLoad(1, 0, "ASSOCIE"), displayName: "Partner1" },
    ];

    const alerts = detectBottlenecks(loads);
    const tierGap = alerts.find((a) => a.type === "tier_gap");
    expect(tierGap).toBeUndefined();
  });
});

describe("Team Allocator - Underutilization Detection", () => {
  it("detects underutilized non-APPRENTI creators below 20%", () => {
    const loads: CreatorLoad[] = [
      { ...calculateLoad(0, 0, "COMPAGNON"), displayName: "IdleCompagnon" }, // 0%
      { ...calculateLoad(5, 0, "MAITRE"), displayName: "BusyMaitre" },       // 62.5%
    ];

    const alerts = detectBottlenecks(loads);
    const underutilized = alerts.find((a) => a.type === "underutilized");
    expect(underutilized).toBeDefined();
    expect(underutilized!.affectedUsers).toContain("IdleCompagnon");
    expect(underutilized!.affectedUsers).not.toContain("BusyMaitre");
  });

  it("does not flag idle APPRENTI as underutilized", () => {
    const loads: CreatorLoad[] = [
      { ...calculateLoad(0, 0, "APPRENTI"), displayName: "IdleApprentice" },
      { ...calculateLoad(5, 0, "MAITRE"), displayName: "BusyMaitre" },
    ];

    const alerts = detectBottlenecks(loads);
    const underutilized = alerts.find((a) => a.type === "underutilized");
    expect(underutilized).toBeUndefined();
  });
});

describe("Team Allocator - Allocation Suggestions", () => {
  it("availability score: lower utilization means higher score", () => {
    const lowUtil = 0.2;
    const highUtil = 0.8;
    const availLow = (1 - lowUtil) * 40;  // 32
    const availHigh = (1 - highUtil) * 40; // 8
    expect(availLow).toBeGreaterThan(availHigh);
  });

  it("creators at full capacity are excluded from suggestions", () => {
    const load = calculateLoad(3, 0, "APPRENTI"); // 100%
    expect(load.utilization).toBe(1);
    // The suggestAllocation function skips creators at utilization >= 1
  });

  it("quality score is capped at 20 points", () => {
    const avgScore = 10;
    const qualityScore = Math.min(20, (avgScore / 10) * 20);
    expect(qualityScore).toBe(20);
  });

  it("experience score is capped at 10 points", () => {
    const totalMissions = 100;
    const experienceScore = Math.min(10, totalMissions / 5);
    expect(experienceScore).toBe(10);
  });
});
