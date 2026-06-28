import { describe, it, expect } from "vitest";
import { allConditionsMet } from "@/server/services/escrow-arbitration";

/** Escrow d'arbitrage (ADR-0116) — helper pur, zéro mock. */

describe("escrow-arbitration — allConditionsMet", () => {
  it("toutes remplies → true", () => {
    expect(allConditionsMet([{ met: true }, { met: true }])).toBe(true);
  });
  it("au moins une non remplie → false", () => {
    expect(allConditionsMet([{ met: true }, { met: false }])).toBe(false);
  });
  it("liste vide → true (aucune condition bloquante)", () => {
    expect(allConditionsMet([])).toBe(true);
  });
});
