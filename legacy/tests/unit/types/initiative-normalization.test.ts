/**
 * Initiative normalization — every I-action collapses into ONE unified extended
 * record (channel on the object, numeric budget derived from budgetEstime), so
 * pillar S aggregates a consistent action database. Guards the canon (which uses
 * qualitative budgetEstime) now produces a non-zero plan budget.
 */
import { describe, it, expect } from "vitest";
import {
  normalizeInitiative,
  collectNormalizedInitiatives,
  BUDGET_ESTIME_FCFA,
} from "@/lib/types/pillar-schemas";
import { UPGRADERS_CANON_PILLARS } from "@/server/services/canon/upgraders-canon";

describe("normalizeInitiative", () => {
  it("derives a numeric budget from budgetEstime when budget is absent", () => {
    const n = normalizeInitiative({ action: "X", budgetEstime: "MEDIUM" }, { channel: "DIGITAL" });
    expect(n.budget).toBe(BUDGET_ESTIME_FCFA.MEDIUM);
    expect(n.channel).toBe("DIGITAL");
    expect(n.budgetEstime).toBe("MEDIUM");
  });

  it("prefers an explicit numeric budget over budgetEstime", () => {
    const n = normalizeInitiative({ action: "X", budget: 1234, budgetEstime: "HIGH" });
    expect(n.budget).toBe(1234);
  });

  it("defaults status/timeframe and carries the container channel", () => {
    const n = normalizeInitiative({ action: "Y" }, { devotionLevel: "AMBASSADEUR" });
    expect(n.status).toBe("DRAFT");
    expect(n.timeframe).toBe("LONG_TERM");
    expect(n.channel).toBe("DEVOTION");
    expect(n.devotionImpact).toBe("AMBASSADEUR");
    expect(n._normalized).toBe(true);
  });

  it("is deterministic and dedups by explicit id across containers", () => {
    const i = {
      catalogueParCanal: { DIGITAL: [{ id: "a1", action: "Same", budgetEstime: "LOW" }] },
      actionsByDevotionLevel: { ENGAGE: [{ id: "a1", action: "Same", budgetEstime: "LOW" }] },
    };
    const list = collectNormalizedInitiatives(i);
    expect(list).toHaveLength(1); // deduped by id
    expect(list[0]!.channel).toBe("DIGITAL"); // catalogue wins
    expect(list[0]!.budget).toBe(BUDGET_ESTIME_FCFA.LOW);
  });
});

describe("canon I — qualitative budgets now flow into a numeric plan", () => {
  it("UPgraders catalogue normalizes to a non-zero total budget", () => {
    const iPillar = UPGRADERS_CANON_PILLARS.find((p) => p.key === "i")!;
    const list = collectNormalizedInitiatives(iPillar.content);
    expect(list.length).toBeGreaterThanOrEqual(8);
    const total = list.reduce((s, a) => s + a.budget, 0);
    expect(total).toBeGreaterThan(0);
    // every record is uniform: has channel + numeric budget + status
    for (const a of list) {
      expect(typeof a.channel).toBe("string");
      expect(typeof a.budget).toBe("number");
      expect(Number.isFinite(a.budget)).toBe(true);
      expect(a.status).toBeTruthy();
    }
  });
});
