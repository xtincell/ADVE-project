import { describe, it, expect } from "vitest";
import {
  computeRetroplan,
  resolveActivityDurationDays,
  DEFAULT_ACTIVITY_DURATION_DAYS,
} from "@/server/services/campaign-manager/retroplan";

/** Rétroplanning ancré sur T0 (ADR-0120 PR-4b) — PUR, déterministe, zéro mock. */

describe("retroplan — resolveActivityDurationDays (fixée | dérivée)", () => {
  it("durée FIXÉE si renseignée (>0)", () => {
    expect(resolveActivityDurationDays({ type: "ASSET_CREATION", durationDays: 10 })).toEqual({ days: 10, derived: false });
  });
  it("DÉRIVE par type si non fixée (les 2 options possibles)", () => {
    expect(resolveActivityDurationDays({ type: "ASSET_CREATION" })).toEqual({ days: DEFAULT_ACTIVITY_DURATION_DAYS.ASSET_CREATION, derived: true });
    expect(resolveActivityDurationDays({ type: "FIELD_ACTION", durationDays: null })).toEqual({ days: DEFAULT_ACTIVITY_DURATION_DAYS.FIELD_ACTION, derived: true });
  });
  it("durée ≤ 0 ⇒ dérivée (robustesse)", () => {
    expect(resolveActivityDurationDays({ type: "ASSET_CREATION", durationDays: 0 }).derived).toBe(true);
  });
});

describe("retroplan — computeRetroplan (rebours depuis T0)", () => {
  const T0 = new Date("2026-03-01T00:00:00Z");

  it("enchaîne les activités dans une fenêtre qui SE TERMINE à T0", () => {
    const plan = computeRetroplan(
      [
        { id: "a", order: 0, type: "ASSET_CREATION", durationDays: 5 },
        { id: "b", order: 1, type: "FIELD_ACTION", durationDays: 3 },
      ],
      T0,
    );
    expect(plan.totalDurationDays).toBe(8);
    expect(plan.t0).toBe("2026-03-01");
    expect(plan.startDate).toBe("2026-02-21"); // T0 - 8 j
    const [a, b] = plan.slots;
    expect([a!.startOffsetDays, a!.endOffsetDays]).toEqual([-8, -3]); // 1ère : J-8 → J-3
    expect([b!.startOffsetDays, b!.endOffsetDays]).toEqual([-3, 0]); // dernière finit à T0
    expect(b!.endDate).toBe("2026-03-01");
  });

  it("ignore les activités annulées + dérive les durées manquantes", () => {
    const plan = computeRetroplan(
      [
        { id: "x", order: 0, type: "ASSET_CREATION" }, // dérivée
        { id: "y", order: 1, type: "FIELD_ACTION", status: "CANCELLED" }, // ignorée
      ],
      T0,
    );
    expect(plan.slots).toHaveLength(1);
    expect(plan.slots[0]!.durationDerived).toBe(true);
    expect(plan.totalDurationDays).toBe(DEFAULT_ACTIVITY_DURATION_DAYS.ASSET_CREATION);
  });
});
