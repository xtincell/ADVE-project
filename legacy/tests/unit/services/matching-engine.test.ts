import { describe, it, expect } from "vitest";
import { applyBinaryFilters } from "@/server/services/matching-engine/filters";

describe("Matching Engine Filters", () => {
  const candidates = [
    {
      tier: "COMPAGNON",
      skills: ["design", "illustration", "branding"],
      channels: ["INSTAGRAM", "FACEBOOK"],
      rate: 50000,
    },
    {
      tier: "MAITRE",
      skills: ["design", "3d-animation"],
      channels: ["TIKTOK"],
      rate: 80000,
    },
    {
      tier: "APPRENTI",
      skills: ["copywriting"],
      channels: ["LINKEDIN"],
      rate: 25000,
    },
  ];

  it("returns all candidates when no criteria are set", () => {
    const result = applyBinaryFilters(candidates, {});
    expect(result).toHaveLength(3);
  });

  it("filters by minimum tier", () => {
    const result = applyBinaryFilters(candidates, { minTier: "MAITRE" });
    expect(result).toHaveLength(1);
    expect(result[0]!.tier).toBe("MAITRE");
  });

  it("filters by required skills", () => {
    const result = applyBinaryFilters(candidates, { requiredSkills: ["design"] });
    expect(result).toHaveLength(2);
  });

  it("filters by max rate", () => {
    const result = applyBinaryFilters(candidates, { maxRate: 30000 });
    expect(result).toHaveLength(1);
    expect(result[0]!.tier).toBe("APPRENTI");
  });

  it("filters by channel", () => {
    const result = applyBinaryFilters(candidates, { channels: ["INSTAGRAM"] });
    expect(result).toHaveLength(1);
    expect(result[0]!.channels).toContain("INSTAGRAM");
  });

  it("combines multiple criteria", () => {
    const result = applyBinaryFilters(candidates, {
      minTier: "COMPAGNON",
      requiredSkills: ["design"],
      maxRate: 60000,
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.tier).toBe("COMPAGNON");
  });

  it("returns empty array when nothing matches", () => {
    const result = applyBinaryFilters(candidates, {
      requiredSkills: ["non-existent-skill"],
    });
    expect(result).toHaveLength(0);
  });
});
