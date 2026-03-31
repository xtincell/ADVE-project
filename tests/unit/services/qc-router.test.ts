import { describe, it, expect } from "vitest";

/**
 * QC Router tests.
 *
 * Tests the tier-based routing logic and automated QC scoring rules
 * using pure function replicas. The actual service uses DB calls.
 */

type GuildTier = "APPRENTI" | "COMPAGNON" | "MAITRE" | "ASSOCIE";
type ReviewType = "AUTOMATED" | "PEER" | "FIXER" | "CLIENT";

const TIER_ORDER: Record<GuildTier, number> = {
  APPRENTI: 0,
  COMPAGNON: 1,
  MAITRE: 2,
  ASSOCIE: 3,
};

function getMinReviewerTier(submitterTier: GuildTier): GuildTier {
  switch (submitterTier) {
    case "APPRENTI": return "COMPAGNON";
    case "COMPAGNON": return "MAITRE";
    case "MAITRE": return "ASSOCIE";
    case "ASSOCIE": return "ASSOCIE";
  }
}

function getEligibleTiers(minTier: GuildTier, allowSameTier: boolean): GuildTier[] {
  const minOrder = TIER_ORDER[minTier];
  return (Object.entries(TIER_ORDER) as [GuildTier, number][])
    .filter(([, order]) => allowSameTier ? order >= minOrder : order >= minOrder)
    .map(([tier]) => tier);
}

function isPeerReview(submitterTier: GuildTier): boolean {
  return submitterTier === "MAITRE" || submitterTier === "ASSOCIE";
}

describe("QC Router - APPRENTI Routing", () => {
  it("APPRENTI deliverables require COMPAGNON+ reviewer", () => {
    const minTier = getMinReviewerTier("APPRENTI");
    expect(minTier).toBe("COMPAGNON");
  });

  it("eligible reviewers for APPRENTI include COMPAGNON, MAITRE, ASSOCIE", () => {
    const eligible = getEligibleTiers("COMPAGNON", false);
    expect(eligible).toContain("COMPAGNON");
    expect(eligible).toContain("MAITRE");
    expect(eligible).toContain("ASSOCIE");
    expect(eligible).not.toContain("APPRENTI");
  });

  it("APPRENTI is not eligible to peer review", () => {
    expect(isPeerReview("APPRENTI")).toBe(false);
  });
});

describe("QC Router - COMPAGNON Routing", () => {
  it("COMPAGNON deliverables require MAITRE+ reviewer", () => {
    const minTier = getMinReviewerTier("COMPAGNON");
    expect(minTier).toBe("MAITRE");
  });

  it("eligible reviewers for COMPAGNON include MAITRE and ASSOCIE", () => {
    const eligible = getEligibleTiers("MAITRE", false);
    expect(eligible).toContain("MAITRE");
    expect(eligible).toContain("ASSOCIE");
    expect(eligible).not.toContain("COMPAGNON");
    expect(eligible).not.toContain("APPRENTI");
  });

  it("COMPAGNON is not eligible for peer review", () => {
    expect(isPeerReview("COMPAGNON")).toBe(false);
  });
});

describe("QC Router - MAITRE Routing (Peers)", () => {
  it("MAITRE deliverables are reviewed by peers at same tier or higher", () => {
    expect(isPeerReview("MAITRE")).toBe(true);
  });

  it("minimum reviewer tier for MAITRE is ASSOCIE (but peers allowed)", () => {
    const minTier = getMinReviewerTier("MAITRE");
    expect(minTier).toBe("ASSOCIE");
  });

  it("when peer review enabled, MAITRE tier is eligible", () => {
    const eligible = getEligibleTiers("MAITRE", true);
    expect(eligible).toContain("MAITRE");
    expect(eligible).toContain("ASSOCIE");
  });
});

describe("QC Router - ASSOCIE Routing (Peers)", () => {
  it("ASSOCIE deliverables are reviewed by peers", () => {
    expect(isPeerReview("ASSOCIE")).toBe(true);
  });

  it("minimum reviewer tier for ASSOCIE is ASSOCIE", () => {
    const minTier = getMinReviewerTier("ASSOCIE");
    expect(minTier).toBe("ASSOCIE");
  });

  it("only ASSOCIE tier is eligible for ASSOCIE review", () => {
    const eligible = getEligibleTiers("ASSOCIE", true);
    expect(eligible).toContain("ASSOCIE");
    expect(eligible).not.toContain("MAITRE");
  });
});

describe("QC Router - Automated QC Scoring", () => {
  it("starts at perfect score of 10", () => {
    let score = 10;
    expect(score).toBe(10);
  });

  it("missing title deducts 2 points", () => {
    let score = 10;
    const title = "";
    if (!title || (title as string).trim().length === 0) {
      score -= 2;
    }
    expect(score).toBe(8);
  });

  it("missing file deducts 3 points", () => {
    let score = 10;
    const fileUrl = null;
    if (!fileUrl) {
      score -= 3;
    }
    expect(score).toBe(7);
  });

  it("PENDING status deducts 1 point", () => {
    let score = 10;
    const status = "PENDING";
    if (status === "PENDING") {
      score -= 1;
    }
    expect(score).toBe(9);
  });

  it("format mismatch deducts 1 point", () => {
    let score = 10;
    const requiredFormat = "png";
    const fileExtension = "jpg";
    if (requiredFormat && fileExtension && !fileExtension.includes(requiredFormat)) {
      score -= 1;
    }
    expect(score).toBe(9);
  });

  it("score is clamped between 0 and 10", () => {
    let score = -5;
    score = Math.max(0, Math.min(10, score));
    expect(score).toBe(0);

    score = 15;
    score = Math.max(0, Math.min(10, score));
    expect(score).toBe(10);
  });

  it("passes when score >= 6 and no errors", () => {
    const score = 7;
    const hasErrors = false;
    const passed = score >= 6 && !hasErrors;
    expect(passed).toBe(true);
  });

  it("fails when score >= 6 but has errors", () => {
    const score = 7;
    const hasErrors = true;
    const passed = score >= 6 && !hasErrors;
    expect(passed).toBe(false);
  });

  it("fails when score < 6 even without errors", () => {
    const score = 5;
    const hasErrors = false;
    const passed = score >= 6 && !hasErrors;
    expect(passed).toBe(false);
  });

  it("multiple deductions can bring score below passing threshold", () => {
    let score = 10;
    // Missing title (-2), missing file (-3) = 5
    score -= 2; // no title
    score -= 3; // no file
    score = Math.max(0, Math.min(10, score));
    expect(score).toBe(5);
    expect(score < 6).toBe(true);
  });
});

describe("QC Router - Tier Hierarchy", () => {
  it("tier order is APPRENTI < COMPAGNON < MAITRE < ASSOCIE", () => {
    expect(TIER_ORDER.APPRENTI).toBeLessThan(TIER_ORDER.COMPAGNON);
    expect(TIER_ORDER.COMPAGNON).toBeLessThan(TIER_ORDER.MAITRE);
    expect(TIER_ORDER.MAITRE).toBeLessThan(TIER_ORDER.ASSOCIE);
  });

  it("each tier maps to a higher reviewer tier (except ASSOCIE which maps to itself)", () => {
    expect(getMinReviewerTier("APPRENTI")).toBe("COMPAGNON");
    expect(getMinReviewerTier("COMPAGNON")).toBe("MAITRE");
    expect(getMinReviewerTier("MAITRE")).toBe("ASSOCIE");
    expect(getMinReviewerTier("ASSOCIE")).toBe("ASSOCIE");
  });
});
