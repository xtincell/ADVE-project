import { describe, expect, it } from "vitest";
import {
  ADVE_PILLARS,
  BRAND_LEVELS,
  compareLevels,
  isAdve,
  PILLARS,
} from "@/domain/pillars";

describe("cascade ADVE → RTIS", () => {
  it("garde l'ordre canonique A D V E R T I S", () => {
    expect(PILLARS).toEqual(["A", "D", "V", "E", "R", "T", "I", "S"]);
  });

  it("distingue socle ADVE et dérivé RTIS", () => {
    expect(ADVE_PILLARS.every(isAdve)).toBe(true);
    expect(isAdve("R" as never)).toBe(false);
  });
});

describe("paliers de marque", () => {
  it("démarre à LATENT (canon v3.3 natif, jamais ZOMBIE)", () => {
    expect(BRAND_LEVELS[0]).toBe("LATENT");
    expect(BRAND_LEVELS).not.toContain("ZOMBIE");
  });

  it("ordonne du sol à l'apex", () => {
    expect(compareLevels("LATENT", "ICONE")).toBeLessThan(0);
    expect(compareLevels("ICONE", "CULTE")).toBeGreaterThan(0);
  });
});
