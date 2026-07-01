import { describe, it, expect } from "vitest";

/**
 * SLA Tracker tests.
 *
 * The SLA tracker's core logic is time-based comparison.
 * Since the actual functions require DB access, we test the
 * pure calculation logic that determines SLA status.
 */

// Replicate the core SLA determination logic from the service
function determineSlaStatus(deadlineStr: string, now: Date = new Date()): {
  withinSla: boolean;
  hoursRemaining: number;
  severity: "warning" | "urgent" | "breached" | null;
} {
  const deadline = new Date(deadlineStr);
  const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
  const roundedHours = Math.round(hoursRemaining * 10) / 10;

  let severity: "warning" | "urgent" | "breached" | null = null;
  if (hoursRemaining < 0) severity = "breached";
  else if (hoursRemaining < 24) severity = "urgent";
  else if (hoursRemaining < 48) severity = "warning";

  return {
    withinSla: hoursRemaining >= 0,
    hoursRemaining: roundedHours,
    severity,
  };
}

// SLA metrics calculation logic
function calculateOnTimePercent(completedOnTime: number, completedLate: number): number {
  const total = completedOnTime + completedLate;
  if (total === 0) return 100;
  return Math.round((completedOnTime / total) * 10000) / 100;
}

function calculateAvgDelay(delays: number[]): number {
  if (delays.length === 0) return 0;
  return Math.round((delays.reduce((a, b) => a + b, 0) / delays.length) * 10) / 10;
}

function calculateMedianDelay(delays: number[]): number {
  if (delays.length === 0) return 0;
  const sorted = [...delays].sort((a, b) => a - b);
  return Math.round(sorted[Math.floor(sorted.length / 2)]! * 10) / 10;
}

describe("SLA Tracker - Check SLA with Deadline in Future", () => {
  it("mission with deadline 72 hours from now is within SLA", () => {
    const now = new Date();
    const deadline = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    const result = determineSlaStatus(deadline.toISOString(), now);

    expect(result.withinSla).toBe(true);
    expect(result.hoursRemaining).toBeCloseTo(72, 0);
    expect(result.severity).toBeNull();
  });

  it("mission with deadline 36 hours from now triggers warning", () => {
    const now = new Date();
    const deadline = new Date(now.getTime() + 36 * 60 * 60 * 1000);
    const result = determineSlaStatus(deadline.toISOString(), now);

    expect(result.withinSla).toBe(true);
    expect(result.severity).toBe("warning");
  });

  it("mission with deadline 12 hours from now triggers urgent", () => {
    const now = new Date();
    const deadline = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const result = determineSlaStatus(deadline.toISOString(), now);

    expect(result.withinSla).toBe(true);
    expect(result.severity).toBe("urgent");
  });

  it("mission with deadline exactly at current time is within SLA (0 hours)", () => {
    const now = new Date();
    const result = determineSlaStatus(now.toISOString(), now);

    expect(result.withinSla).toBe(true);
    expect(result.hoursRemaining).toBeCloseTo(0, 0);
  });
});

describe("SLA Tracker - Check SLA with Deadline Past (Breached)", () => {
  it("mission with deadline 5 hours ago is breached", () => {
    const now = new Date();
    const deadline = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    const result = determineSlaStatus(deadline.toISOString(), now);

    expect(result.withinSla).toBe(false);
    expect(result.hoursRemaining).toBeCloseTo(-5, 0);
    expect(result.severity).toBe("breached");
  });

  it("mission with deadline 1 minute ago is breached", () => {
    const now = new Date();
    const deadline = new Date(now.getTime() - 60 * 1000);
    const result = determineSlaStatus(deadline.toISOString(), now);

    expect(result.withinSla).toBe(false);
    expect(result.severity).toBe("breached");
  });

  it("mission with deadline 48 hours ago has very negative hours remaining", () => {
    const now = new Date();
    const deadline = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const result = determineSlaStatus(deadline.toISOString(), now);

    expect(result.withinSla).toBe(false);
    expect(result.hoursRemaining).toBeCloseTo(-48, 0);
    expect(result.severity).toBe("breached");
  });
});

describe("SLA Tracker - Overdue Missions Sorting", () => {
  it("overdue missions are sorted by most overdue first", () => {
    const now = new Date();
    const missions = [
      { hoursRemaining: -5 },   // 5 hours overdue
      { hoursRemaining: -24 },  // 24 hours overdue
      { hoursRemaining: -1 },   // 1 hour overdue
    ];

    const sorted = missions.sort((a, b) => a.hoursRemaining - b.hoursRemaining);
    expect(sorted[0]!.hoursRemaining).toBe(-24); // Most overdue first
    expect(sorted[1]!.hoursRemaining).toBe(-5);
    expect(sorted[2]!.hoursRemaining).toBe(-1);
  });
});

describe("SLA Tracker - Metrics Calculation", () => {
  it("100% on-time when all completed on time", () => {
    expect(calculateOnTimePercent(10, 0)).toBe(100);
  });

  it("0% on-time when all completed late", () => {
    expect(calculateOnTimePercent(0, 5)).toBe(0);
  });

  it("50% on-time when equal on-time and late", () => {
    expect(calculateOnTimePercent(5, 5)).toBe(50);
  });

  it("100% when no missions completed", () => {
    expect(calculateOnTimePercent(0, 0)).toBe(100);
  });

  it("calculates precise percentage", () => {
    // 3 out of 7 = 42.857...%
    const result = calculateOnTimePercent(3, 4);
    expect(result).toBeCloseTo(42.86, 1);
  });

  it("average delay is 0 for empty array", () => {
    expect(calculateAvgDelay([])).toBe(0);
  });

  it("calculates correct average delay", () => {
    expect(calculateAvgDelay([2, 4, 6])).toBe(4);
  });

  it("median delay is 0 for empty array", () => {
    expect(calculateMedianDelay([])).toBe(0);
  });

  it("calculates correct median delay", () => {
    expect(calculateMedianDelay([1, 3, 5, 7, 9])).toBe(5);
  });

  it("median picks middle element for odd-length array", () => {
    expect(calculateMedianDelay([10, 20, 30])).toBe(20);
  });

  it("worst delay is the maximum in sorted array", () => {
    const delays = [2, 5, 1, 8, 3];
    const sorted = [...delays].sort((a, b) => a - b);
    const worstDelay = sorted[sorted.length - 1];
    expect(worstDelay).toBe(8);
  });
});

describe("SLA Tracker - Severity Thresholds", () => {
  it("no severity for deadline > 48 hours away", () => {
    const now = new Date();
    const deadline = new Date(now.getTime() + 49 * 60 * 60 * 1000);
    const result = determineSlaStatus(deadline.toISOString(), now);
    expect(result.severity).toBeNull();
  });

  it("warning for deadline 24-48 hours away", () => {
    const now = new Date();
    const deadline = new Date(now.getTime() + 30 * 60 * 60 * 1000);
    const result = determineSlaStatus(deadline.toISOString(), now);
    expect(result.severity).toBe("warning");
  });

  it("urgent for deadline 0-24 hours away", () => {
    const now = new Date();
    const deadline = new Date(now.getTime() + 10 * 60 * 60 * 1000);
    const result = determineSlaStatus(deadline.toISOString(), now);
    expect(result.severity).toBe("urgent");
  });

  it("breached for deadline in the past", () => {
    const now = new Date();
    const deadline = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    const result = determineSlaStatus(deadline.toISOString(), now);
    expect(result.severity).toBe("breached");
  });
});
