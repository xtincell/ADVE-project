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

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(),
  pillarFind: vi.fn(), write: vi.fn(), finish: vi.fn(), lock: vi.fn() }));
vi.mock("@/server/services/pillar-gateway", () => {
  const tx = { $queryRaw: mocks.lock, brandAction: { findFirst: mocks.findFirst, findMany: mocks.findMany, update: mocks.update },
    pillar: { findUnique: mocks.pillarFind } };
  return { withPillarTransaction: async (_strategyId: string, run: (tx: unknown, write: unknown) => Promise<unknown>) => run(tx, mocks.write) };
});
import { setBrandActionStatus } from "@/server/services/artemis/action-db/set-status";
beforeEach(() => { vi.resetAllMocks(); mocks.update.mockResolvedValue({}); });

describe("setBrandActionStatus — refusal boundaries", () => {
  it("refuses an action outside the requested brand instead of reporting zero successful changes", async () => {
    mocks.findFirst.mockResolvedValue(null);
    await expect(setBrandActionStatus({ strategyId: "s1", op: { type: "SELECT", actionId: "foreign", selected: true } })).rejects.toThrow(/ACTION_NOT_FOUND/);
    expect(mocks.findFirst).toHaveBeenCalledWith({ where: { id: "foreign", strategyId: "s1" } });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each(["EXECUTED", "CANCELLED"])("does not rearm a %s task", async status => {
    mocks.findFirst.mockResolvedValue({ id: "a1", status, selected: true });
    await expect(setBrandActionStatus({ strategyId: "s1", op: { type: "TIMING", actionId: "a1", timingStart: "2026-12-01T00:00:00Z" } })).rejects.toThrow(/ACTION_TERMINAL/);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("clearing the deadline of an unchosen proposal leaves it unarmed", async () => {
    mocks.findFirst.mockResolvedValue({ id: "a1", status: "PROPOSED", selected: false });
    await setBrandActionStatus({ strategyId: "s1", op: { type: "TIMING", actionId: "a1", timingStart: null } });
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: "a1" }, data: { timingStart: null, status: "PROPOSED" } });
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
