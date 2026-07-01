import { describe, it, expect } from "vitest";
import { computeCultIndex, getCultTier, type CultTier } from "@/server/services/cult-index-engine/index";

// ============================================================
// Calcul du Cult Index
// ============================================================
describe("Cult Index Engine — Calcul du Score Composite", () => {
  const allZero = {
    engagementDepth: 0,
    superfanVelocity: 0,
    communityCohesion: 0,
    brandDefenseRate: 0,
    ugcGenerationRate: 0,
    ritualAdoption: 0,
    evangelismScore: 0,
  };

  const allHundred = {
    engagementDepth: 100,
    superfanVelocity: 100,
    communityCohesion: 100,
    brandDefenseRate: 100,
    ugcGenerationRate: 100,
    ritualAdoption: 100,
    evangelismScore: 100,
  };

  it("doit retourner 0 quand toutes les dimensions sont a 0", () => {
    expect(computeCultIndex(allZero)).toBe(0);
  });

  it("doit retourner 100 quand toutes les dimensions sont a 100", () => {
    expect(computeCultIndex(allHundred)).toBe(100);
  });

  it("doit retourner 50 quand toutes les dimensions sont a 50", () => {
    const allFifty = {
      engagementDepth: 50,
      superfanVelocity: 50,
      communityCohesion: 50,
      brandDefenseRate: 50,
      ugcGenerationRate: 50,
      ritualAdoption: 50,
      evangelismScore: 50,
    };
    expect(computeCultIndex(allFifty)).toBe(50);
  });

  it("doit appliquer les poids corrects (engagementDepth = 25%)", () => {
    const onlyEngagement = { ...allZero, engagementDepth: 100 };
    expect(computeCultIndex(onlyEngagement)).toBe(25);
  });

  it("doit appliquer les poids corrects (superfanVelocity = 20%)", () => {
    const onlySuperfan = { ...allZero, superfanVelocity: 100 };
    expect(computeCultIndex(onlySuperfan)).toBe(20);
  });

  it("doit appliquer les poids corrects (communityCohesion = 15%)", () => {
    const onlyCommunity = { ...allZero, communityCohesion: 100 };
    expect(computeCultIndex(onlyCommunity)).toBe(15);
  });

  it("doit appliquer les poids corrects (brandDefenseRate = 15%)", () => {
    const onlyDefense = { ...allZero, brandDefenseRate: 100 };
    expect(computeCultIndex(onlyDefense)).toBe(15);
  });

  it("doit appliquer les poids corrects (ugcGenerationRate = 10%)", () => {
    const onlyUgc = { ...allZero, ugcGenerationRate: 100 };
    expect(computeCultIndex(onlyUgc)).toBe(10);
  });

  it("doit appliquer les poids corrects (ritualAdoption = 10%)", () => {
    const onlyRitual = { ...allZero, ritualAdoption: 100 };
    expect(computeCultIndex(onlyRitual)).toBe(10);
  });

  it("doit appliquer les poids corrects (evangelismScore = 5%)", () => {
    const onlyEvangel = { ...allZero, evangelismScore: 100 };
    expect(computeCultIndex(onlyEvangel)).toBe(5);
  });

  it("la somme des poids doit egaliser 1.0", () => {
    // Chaque dimension a 100 doit produire un total de 100
    expect(computeCultIndex(allHundred)).toBe(100);
    // Verifier individuellement: 25 + 20 + 15 + 15 + 10 + 10 + 5 = 100
    const individualSum =
      computeCultIndex({ ...allZero, engagementDepth: 100 }) +
      computeCultIndex({ ...allZero, superfanVelocity: 100 }) +
      computeCultIndex({ ...allZero, communityCohesion: 100 }) +
      computeCultIndex({ ...allZero, brandDefenseRate: 100 }) +
      computeCultIndex({ ...allZero, ugcGenerationRate: 100 }) +
      computeCultIndex({ ...allZero, ritualAdoption: 100 }) +
      computeCultIndex({ ...allZero, evangelismScore: 100 });
    expect(individualSum).toBe(100);
  });
});

// ============================================================
// Validation des poids
// ============================================================
describe("Cult Index Engine — Validation des Poids", () => {
  it("les 7 dimensions doivent avoir des poids definis", () => {
    const dims = [
      "engagementDepth",
      "superfanVelocity",
      "communityCohesion",
      "brandDefenseRate",
      "ugcGenerationRate",
      "ritualAdoption",
      "evangelismScore",
    ];
    // Verifier que chaque dimension contribue au score
    for (const dim of dims) {
      const input = {
        engagementDepth: 0,
        superfanVelocity: 0,
        communityCohesion: 0,
        brandDefenseRate: 0,
        ugcGenerationRate: 0,
        ritualAdoption: 0,
        evangelismScore: 0,
        [dim]: 100,
      };
      expect(computeCultIndex(input)).toBeGreaterThan(0);
    }
  });
});

// ============================================================
// Classification en Tiers
// ============================================================
describe("Cult Index Engine — Classification en Tiers", () => {
  it("doit retourner GHOST pour un score de 0", () => {
    expect(getCultTier(0)).toBe("GHOST");
  });

  it("doit retourner GHOST pour un score de 20", () => {
    expect(getCultTier(20)).toBe("GHOST");
  });

  it("doit retourner FUNCTIONAL pour un score de 21", () => {
    expect(getCultTier(21)).toBe("FUNCTIONAL");
  });

  it("doit retourner FUNCTIONAL pour un score de 40", () => {
    expect(getCultTier(40)).toBe("FUNCTIONAL");
  });

  it("doit retourner LOVED pour un score de 41", () => {
    expect(getCultTier(41)).toBe("LOVED");
  });

  it("doit retourner LOVED pour un score de 60", () => {
    expect(getCultTier(60)).toBe("LOVED");
  });

  it("doit retourner EMERGING pour un score de 61", () => {
    expect(getCultTier(61)).toBe("EMERGING");
  });

  it("doit retourner EMERGING pour un score de 80", () => {
    expect(getCultTier(80)).toBe("EMERGING");
  });

  it("doit retourner CULT pour un score de 81", () => {
    expect(getCultTier(81)).toBe("CULT");
  });

  it("doit retourner CULT pour un score de 100", () => {
    expect(getCultTier(100)).toBe("CULT");
  });

  it("doit classifier correctement les valeurs limites", () => {
    const boundaries: [number, CultTier][] = [
      [0, "GHOST"],
      [10, "GHOST"],
      [20, "GHOST"],
      [20.5, "FUNCTIONAL"],
      [30, "FUNCTIONAL"],
      [40, "FUNCTIONAL"],
      [40.5, "LOVED"],
      [50, "LOVED"],
      [60, "LOVED"],
      [60.5, "EMERGING"],
      [70, "EMERGING"],
      [80, "EMERGING"],
      [80.5, "CULT"],
      [90, "CULT"],
      [100, "CULT"],
    ];

    for (const [score, expectedTier] of boundaries) {
      expect(getCultTier(score)).toBe(expectedTier);
    }
  });
});

// ============================================================
// Cas limites
// ============================================================
describe("Cult Index Engine — Cas Limites", () => {
  it("doit clamper les valeurs negatives a 0", () => {
    const dims = {
      engagementDepth: -50,
      superfanVelocity: -10,
      communityCohesion: 0,
      brandDefenseRate: 0,
      ugcGenerationRate: 0,
      ritualAdoption: 0,
      evangelismScore: 0,
    };
    const score = computeCultIndex(dims);
    expect(score).toBe(0);
  });

  it("doit clamper les valeurs superieures a 100", () => {
    const dims = {
      engagementDepth: 200,
      superfanVelocity: 150,
      communityCohesion: 100,
      brandDefenseRate: 100,
      ugcGenerationRate: 100,
      ritualAdoption: 100,
      evangelismScore: 100,
    };
    // Les valeurs sont clampees a 100, donc le resultat devrait etre 100
    expect(computeCultIndex(dims)).toBe(100);
  });

  it("doit produire un score arrondi a 2 decimales", () => {
    const dims = {
      engagementDepth: 33,
      superfanVelocity: 67,
      communityCohesion: 45,
      brandDefenseRate: 12,
      ugcGenerationRate: 88,
      ritualAdoption: 5,
      evangelismScore: 91,
    };
    const score = computeCultIndex(dims);
    const decimals = score.toString().split(".")[1];
    if (decimals) {
      expect(decimals.length).toBeLessThanOrEqual(2);
    }
  });

  it("doit etre deterministe (meme entree = meme sortie)", () => {
    const dims = {
      engagementDepth: 55,
      superfanVelocity: 72,
      communityCohesion: 38,
      brandDefenseRate: 90,
      ugcGenerationRate: 25,
      ritualAdoption: 60,
      evangelismScore: 80,
    };
    const results = Array.from({ length: 50 }, () => computeCultIndex(dims));
    const first = results[0];
    for (const r of results) {
      expect(r).toBe(first);
    }
  });

  it("doit classer le score de toutes les dimensions a 0 comme GHOST", () => {
    const dims = {
      engagementDepth: 0,
      superfanVelocity: 0,
      communityCohesion: 0,
      brandDefenseRate: 0,
      ugcGenerationRate: 0,
      ritualAdoption: 0,
      evangelismScore: 0,
    };
    const score = computeCultIndex(dims);
    expect(getCultTier(score)).toBe("GHOST");
  });

  it("doit classer le score de toutes les dimensions a 100 comme CULT", () => {
    const dims = {
      engagementDepth: 100,
      superfanVelocity: 100,
      communityCohesion: 100,
      brandDefenseRate: 100,
      ugcGenerationRate: 100,
      ritualAdoption: 100,
      evangelismScore: 100,
    };
    const score = computeCultIndex(dims);
    expect(getCultTier(score)).toBe("CULT");
  });
});
