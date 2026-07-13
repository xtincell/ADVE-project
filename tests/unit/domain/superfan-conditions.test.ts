import { describe, it, expect } from "vitest";
import {
  SUPERFAN_CONDITIONS,
  CONDITION_TO_TIER,
  TIER_MIN_DEPTH,
  deriveTierFromConditions,
  conditionFloorDepth,
  isSuperfanCondition,
  metConditions,
} from "@/domain/superfan-conditions";
import { DEVOTION_LADDER_TIERS } from "@/domain/devotion-ladder";

describe("ADR-0141 — superfan à conditions strictes", () => {
  it("les 5 conditions canoniques sont couvertes", () => {
    expect([...SUPERFAN_CONDITIONS]).toEqual([
      "VIEWED",
      "INTERACTED",
      "PAID",
      "RECOMMENDED",
      "SHARED",
    ]);
  });

  it("chaque condition mappe sur un rung canon du Devotion Ladder", () => {
    for (const c of SUPERFAN_CONDITIONS) {
      expect(DEVOTION_LADDER_TIERS).toContain(CONDITION_TO_TIER[c]);
    }
  });

  it("le rung = la condition la plus haute franchie (gate-gated)", () => {
    expect(deriveTierFromConditions([])).toBe("SPECTATEUR");
    expect(deriveTierFromConditions(["VIEWED"])).toBe("SPECTATEUR");
    expect(deriveTierFromConditions(["INTERACTED"])).toBe("PARTICIPANT");
    // « a payé » seul → ENGAGE, même sans interaction.
    expect(deriveTierFromConditions(["PAID"])).toBe("ENGAGE");
    // ordre indifférent — c'est le max qui compte.
    expect(deriveTierFromConditions(["VIEWED", "PAID", "INTERACTED"])).toBe("ENGAGE");
    expect(deriveTierFromConditions(["RECOMMENDED"])).toBe("AMBASSADEUR");
    expect(deriveTierFromConditions(["SHARED", "PAID"])).toBe("EVANGELISTE");
  });

  it("« a payé » plancher à ENGAGE (0.45) mais SOUS le seuil superfan actif (0.65)", () => {
    const floor = conditionFloorDepth(["PAID"]);
    expect(floor).toBe(0.45);
    expect(floor).toBeLessThan(0.65); // payer ≠ porte-parole (anti-inflation ADR-0126)
  });

  it("les planchers de profondeur sont monotones avec le rung", () => {
    let prev = -1;
    for (const tier of DEVOTION_LADDER_TIERS) {
      const d = TIER_MIN_DEPTH[tier];
      expect(d).toBeGreaterThanOrEqual(prev);
      prev = d;
    }
  });

  it("isSuperfanCondition / metConditions filtrent le bruit", () => {
    expect(isSuperfanCondition("PAID")).toBe(true);
    expect(isSuperfanCondition("BOUGHT")).toBe(false);
    // Clé non canonique ignorée, condition valide conservée.
    const noisy = { PAID: { source: "MANUAL" }, NOISE: { source: "x" } } as never;
    expect(metConditions(noisy)).toEqual(["PAID"]);
    expect(metConditions(null)).toEqual([]);
  });
});
