/**
 * ADR-0149 — Scoreur à force révélée : cœur déterministe (tests purs).
 * Acceptance C3 : θ reproductibles (2 runs = même sortie), palier gaté, couverture.
 */
import { describe, it, expect } from "vitest";
import {
  fitBradleyTerry,
  winProbability,
  toPairwise,
  thetaToForce,
  scoreFromEpreuves,
  computeCoherence,
  itemsTier,
  type CompiledEpreuve,
  type LeagueKey,
} from "@/domain/scoreur";

describe("Bradley-Terry — jauge par ancres", () => {
  it("battre une ancre haute tire θ au-dessus du défaut", () => {
    const out = fitBradleyTerry({
      nodes: ["moi", "anchor-fort"],
      anchors: { "anchor-fort": 1800 },
      pairwise: toPairwise([
        { subjectRef: "moi", opponentRef: "anchor-fort", result: "WIN", proofWeight: 1 },
      ]),
    }, { defaultTheta: 1500 });
    expect(out.theta["moi"]!).toBeGreaterThan(1500);
    expect(out.theta["anchor-fort"]!).toBe(1800); // ancre fixée
  });

  it("perdre contre une ancre haute tire θ en dessous", () => {
    const out = fitBradleyTerry({
      nodes: ["moi", "anchor-fort"],
      anchors: { "anchor-fort": 1800 },
      pairwise: toPairwise([
        { subjectRef: "moi", opponentRef: "anchor-fort", result: "LOSS", proofWeight: 1 },
      ]),
    }, { defaultTheta: 1500 });
    expect(out.theta["moi"]!).toBeLessThan(1500);
  });

  it("déterministe : 2 runs = même sortie", () => {
    const input = {
      nodes: ["a", "b", "anchor"],
      anchors: { anchor: 1600 },
      pairwise: toPairwise([
        { subjectRef: "a", opponentRef: "anchor", result: "WIN" as const, proofWeight: 1 },
        { subjectRef: "b", opponentRef: "anchor", result: "LOSS" as const, proofWeight: 1 },
      ]),
    };
    expect(fitBradleyTerry(input)).toEqual(fitBradleyTerry(input));
  });

  it("peu d'épreuves ⇒ RD large ; plus d'épreuves ⇒ RD resserré", () => {
    const few = fitBradleyTerry({
      nodes: ["x", "anc"], anchors: { anc: 1600 },
      pairwise: toPairwise([{ subjectRef: "x", opponentRef: "anc", result: "WIN", proofWeight: 1 }]),
    });
    const many = fitBradleyTerry({
      nodes: ["x", "anc"], anchors: { anc: 1600 },
      pairwise: toPairwise(Array.from({ length: 20 }, () => ({ subjectRef: "x", opponentRef: "anc", result: "WIN" as const, proofWeight: 1 }))),
    });
    expect(few.rd["x"]!).toBeGreaterThan(many.rd["x"]!);
  });

  it("winProbability : 0.5 à égalité, monotone", () => {
    expect(winProbability(1500, 1500)).toBeCloseTo(0.5, 6);
    expect(winProbability(1900, 1500)).toBeGreaterThan(0.9);
  });
});

describe("jauge θ→force", () => {
  it("clampée [0, 40] et scale-aware", () => {
    expect(thetaToForce(500, "NATION")).toBe(0);
    expect(thetaToForce(99999, "NATION")).toBe(40);
    // Même θ vaut plus de force à petite échelle (jauge plus basse).
    expect(thetaToForce(1500, "QUARTIER")).toBeGreaterThan(thetaToForce(1500, "MONDE"));
  });
});

describe("scoreFromEpreuves — verdict complet", () => {
  const league: LeagueKey = { sectorSlug: "foodtech", marketScale: "VILLE", countryCode: "CI" };
  const anchors = { "item-e-mass-floor": 1600, rival: 1450 };
  const epreuves: CompiledEpreuve[] = [
    { subjectRef: "brand", opponentRef: "rival", arena: "D", result: "WIN", proofWeight: 1, source: "trends", occurredAt: "2026-01-01T00:00:00Z" },
    { subjectRef: "brand", opponentRef: "rival", arena: "V", result: "WIN", proofWeight: 1, source: "avis", occurredAt: "2026-01-01T00:00:00Z" },
    { subjectRef: "brand", opponentRef: "item-e-mass-floor", arena: "E", result: "LOSS", proofWeight: 1, source: "identity", occurredAt: "2026-01-01T00:00:00Z" },
  ];

  it("reproductible : 2 runs = même verdict (acceptance)", () => {
    const a = scoreFromEpreuves({ subjectRef: "brand", league, epreuves, anchors, itemsMet: new Set() });
    const b = scoreFromEpreuves({ subjectRef: "brand", league, epreuves, anchors, itemsMet: new Set() });
    expect(a).toEqual(b);
  });

  it("couverture = arènes mesurées / 5 (D,V,E = 60%)", () => {
    const v = scoreFromEpreuves({ subjectRef: "brand", league, epreuves, anchors, itemsMet: new Set() });
    expect(v.coveragePct).toBe(60);
  });

  it("chaque arène trace ses épreuves (wins/losses/count)", () => {
    const v = scoreFromEpreuves({ subjectRef: "brand", league, epreuves, anchors, itemsMet: new Set() });
    const d = v.arenas.find((a) => a.arena === "D")!;
    expect(d.wins).toBe(1);
    expect(d.epreuveCount).toBe(1);
    const a = v.arenas.find((x) => x.arena === "A")!;
    expect(a.epreuveCount).toBe(0); // absente → force 0, RD large
    expect(a.force).toBe(0);
  });

  it("palier = min(bande, items) : items non franchis plafonnent", () => {
    // Force élevée mais aucun item → palier plafonné à LATENT (items).
    const strong: CompiledEpreuve[] = ["A", "D", "V", "E", "T"].map((arena) => ({
      subjectRef: "brand", opponentRef: "anchor-high", arena: arena as CompiledEpreuve["arena"],
      result: "WIN", proofWeight: 1, source: "s", occurredAt: "2026-01-01T00:00:00Z",
    }));
    const v = scoreFromEpreuves({
      subjectRef: "brand", league, epreuves: strong,
      anchors: { "anchor-high": 1590 }, itemsMet: new Set(),
    });
    expect(v.tier).toBe("LATENT"); // aucun item → items=LATENT → min plafonne
    expect(v.cappedReason).not.toBeNull();
  });
});

describe("items — escalade stricte", () => {
  it("un trou dans un palier inférieur stoppe la montée", () => {
    // market-fit (ORDINAIRE) manquant → ne peut dépasser FRAGILE même si CULTE items présents.
    const met = new Set(["dirigeant-identifiable", "masse-superfan", "duel-cadre-overton"]);
    expect(itemsTier(met)).toBe("FRAGILE");
  });
  it("tous les items d'un palier + inférieurs → ce palier", () => {
    const met = new Set(["dirigeant-identifiable", "mythe-fondateur", "market-fit"]);
    expect(itemsTier(met)).toBe("ORDINAIRE");
  });
});

describe("cohérence R", () => {
  it("faible dispersion → R haut ; forte dispersion → R bas", () => {
    const flat = computeCoherence([
      { arena: "A", theta: 1, rd: 1, force: 30, epreuveCount: 2, wins: 2, losses: 0 },
      { arena: "D", theta: 1, rd: 1, force: 30, epreuveCount: 2, wins: 2, losses: 0 },
    ]);
    const spread = computeCoherence([
      { arena: "A", theta: 1, rd: 1, force: 40, epreuveCount: 2, wins: 2, losses: 0 },
      { arena: "D", theta: 1, rd: 1, force: 0, epreuveCount: 2, wins: 0, losses: 2 },
    ]);
    expect(flat).toBeGreaterThan(spread);
  });
});

