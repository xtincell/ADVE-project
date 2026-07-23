/**
 * B2 (audit 2026-07-22) — handler GOUVERNÉ du statut/planning BrandAction.
 *
 * La logique déterministe (déplacée du routeur `actions.*` vers le handler
 * `SET_BRAND_ACTION_STATUS`) : SELECT/TIMING scopés strategyId ; AUTOSCHEDULE
 * étale par cadence en PRÉSERVANT les publications sociales armées + le
 * terminé/annulé (leur échéance EST la donnée — les re-étaler ferait publier le
 * CRON aux mauvaises dates).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  updateMany: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    brandAction: {
      updateMany: mocks.updateMany,
      findMany: mocks.findMany,
      update: mocks.update,
    },
  },
}));

import { setBrandActionStatus } from "@/server/services/artemis/action-db/set-status";

beforeEach(() => vi.clearAllMocks());

describe("setBrandActionStatus — SELECT/TIMING scopés strategyId", () => {
  it("SELECT écrit selected + status ACCEPTED, scopé strategyId", async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 });
    const r = await setBrandActionStatus({
      strategyId: "s1",
      op: { type: "SELECT", actionId: "a1", selected: true },
    });
    expect(r).toEqual({ op: "SELECT", updated: 1 });
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "a1", strategyId: "s1" },
      data: { selected: true, status: "ACCEPTED" },
    });
  });

  it("TIMING null → désarme (status ACCEPTED)", async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 });
    const r = await setBrandActionStatus({
      strategyId: "s1",
      op: { type: "TIMING", actionId: "a1", timingStart: null },
    });
    expect(r.updated).toBe(1);
    const arg = mocks.updateMany.mock.calls[0]![0] as { data: { timingStart: unknown; status: string } };
    expect(arg.data.timingStart).toBeNull();
    expect(arg.data.status).toBe("ACCEPTED");
  });
});

describe("setBrandActionStatus — AUTOSCHEDULE préserve les publications armées", () => {
  it("saute socialPublish + EXECUTED/CANCELLED, étale le reste par cadence", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "armed", status: "SCHEDULED", metadata: { socialPublish: true } },
      { id: "done", status: "EXECUTED", metadata: null },
      { id: "a", status: "ACCEPTED", metadata: null },
      { id: "b", status: "ACCEPTED", metadata: {} },
    ]);
    mocks.update.mockResolvedValue({});

    const r = await setBrandActionStatus({
      strategyId: "s1",
      op: { type: "AUTOSCHEDULE", startDate: "2026-08-01T00:00:00.000Z", cadenceDays: 7 },
    });

    // 2 planifiées (a, b), 2 préservées (armed + done).
    expect(r.updated).toBe(2);
    expect(r.protectedPublications).toBe(2);
    expect(mocks.update).toHaveBeenCalledTimes(2);
    // 'a' à startDate, 'b' à startDate + 7 j.
    const first = mocks.update.mock.calls[0]![0] as { where: { id: string }; data: { timingStart: Date } };
    const second = mocks.update.mock.calls[1]![0] as { where: { id: string }; data: { timingStart: Date } };
    expect(first.where.id).toBe("a");
    expect(first.data.timingStart.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(second.where.id).toBe("b");
    expect(second.data.timingStart.toISOString()).toBe("2026-08-08T00:00:00.000Z");
    // JAMAIS la publication armée.
    const touchedIds = mocks.update.mock.calls.map((c) => (c[0] as { where: { id: string } }).where.id);
    expect(touchedIds).not.toContain("armed");
  });
});
