/**
 * ADR-0150 — canon injectable : un override de jauge / d'items change réellement
 * le verdict (déterministe). Le défaut (aucun canon) préserve le comportement.
 */
import { describe, it, expect } from "vitest";
import {
  thetaToForce,
  itemsTier,
  scoreFromEpreuves,
  GAUGE_BY_SCALE,
  MUST_HAVE_ITEMS,
  type CompiledEpreuve,
  type LeagueKey,
  type MustHaveItem,
} from "@/domain/scoreur";

describe("jauge injectable", () => {
  it("un plancher/icône différent change la force d'un même θ", () => {
    const def = thetaToForce(1500, "NATION");
    const override = thetaToForce(1500, "NATION", {
      ...GAUGE_BY_SCALE,
      NATION: { floor: 1400, icone: 1600 }, // resserrée → 1500 vaut plus haut
    });
    expect(override).toBeGreaterThan(def);
  });
});

describe("items injectables", () => {
  it("retirer un item fait monter le palier atteint par items", () => {
    const met = new Set(["dirigeant-identifiable", "mythe-fondateur"]);
    // Défaut : market-fit (ORDINAIRE) manquant → plafonne à FRAGILE.
    expect(itemsTier(met)).toBe("FRAGILE");
    // Override : on retire market-fit de la liste → ORDINAIRE atteint.
    const without = MUST_HAVE_ITEMS.filter((i) => i.id !== "market-fit");
    expect(itemsTier(met, without)).toBe("ORDINAIRE");
  });
});

describe("scoreFromEpreuves — canon override bout-en-bout", () => {
  const league: LeagueKey = { sectorSlug: "s", marketScale: "NATION", countryCode: null };
  const epreuves: CompiledEpreuve[] = ["A", "D", "V", "E", "T"].map((arena) => ({
    subjectRef: "b", opponentRef: "anc", arena: arena as CompiledEpreuve["arena"],
    result: "WIN", proofWeight: 1, source: "s", occurredAt: "2026-01-01T00:00:00Z",
  }));
  const anchors = { anc: 1500 };

  it("jauge resserrée → force plus haute", () => {
    const base = scoreFromEpreuves({ subjectRef: "b", league, epreuves, anchors, itemsMet: new Set() });
    const boosted = scoreFromEpreuves({
      subjectRef: "b", league, epreuves, anchors, itemsMet: new Set(),
      canon: { gauge: { ...GAUGE_BY_SCALE, NATION: { floor: 1400, icone: 1550 } } },
    });
    expect(boosted.force).toBeGreaterThan(base.force);
  });

  it("liste d'items vide → aucune porte ne plafonne (palier = bande)", () => {
    const noItems: MustHaveItem[] = [];
    const v = scoreFromEpreuves({
      subjectRef: "b", league, epreuves, anchors, itemsMet: new Set(),
      canon: { items: noItems },
    });
    expect(v.cappedReason).toBeNull(); // pas d'item → pas de plafond items
    expect(v.gates).toEqual([]);
  });

  it("défaut (sans canon) = comportement historique reproductible", () => {
    const a = scoreFromEpreuves({ subjectRef: "b", league, epreuves, anchors, itemsMet: new Set() });
    const b = scoreFromEpreuves({ subjectRef: "b", league, epreuves, anchors, itemsMet: new Set(), canon: {} });
    expect(a).toEqual(b);
  });
});
