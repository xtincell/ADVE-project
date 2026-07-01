import { describe, it, expect } from "vitest";
import {
  BUSINESS_MODELS,
  ECONOMIC_MODELS,
  POSITIONING_ARCHETYPES,
  BUSINESS_MODEL_KEYS,
  ECONOMIC_MODEL_KEYS,
  POSITIONING_ARCHETYPE_KEYS,
  BusinessContextSchema,
  getPillarWeightsForContext,
  getChannelModifiersForContext,
  type BusinessContext,
} from "@/lib/types/business-context";

describe("Business Context Taxonomies", () => {
  it("should have 12 business model families", () => {
    expect(BUSINESS_MODEL_KEYS).toHaveLength(12);
  });

  it("should have 10 economic models", () => {
    expect(ECONOMIC_MODEL_KEYS).toHaveLength(10);
  });

  it("should have 7 positioning archetypes", () => {
    expect(POSITIONING_ARCHETYPE_KEYS).toHaveLength(7);
  });

  it("each business model should have subtypes", () => {
    for (const [key, model] of Object.entries(BUSINESS_MODELS)) {
      expect(model.subtypes.length).toBeGreaterThan(0);
      expect(model.label).toBeTruthy();
    }
  });

  it("luxury positioning archetypes should be positional goods", () => {
    expect(POSITIONING_ARCHETYPES.ULTRA_LUXE.positionalGood).toBe(true);
    expect(POSITIONING_ARCHETYPES.LUXE.positionalGood).toBe(true);
    expect(POSITIONING_ARCHETYPES.MAINSTREAM.positionalGood).toBe(false);
    expect(POSITIONING_ARCHETYPES.LOW_COST.positionalGood).toBe(false);
  });

  it("premium and masstige should have partial positional good", () => {
    expect(POSITIONING_ARCHETYPES.PREMIUM.positionalGood).toBe("partial");
    expect(POSITIONING_ARCHETYPES.MASSTIGE.positionalGood).toBe("partial");
  });
});

describe("BusinessContextSchema validation", () => {
  const validContext: BusinessContext = {
    businessModel: "PRODUCTION",
    economicModels: ["VENTE_DIRECTE"],
    positioningArchetype: "PREMIUM",
    salesChannel: "DIRECT",
    positionalGoodFlag: false,
    premiumScope: "FULL",
  };

  it("should validate a minimal valid context", () => {
    const result = BusinessContextSchema.safeParse(validContext);
    expect(result.success).toBe(true);
  });

  it("should validate a context with free layer", () => {
    const ctx = {
      ...validContext,
      freeLayer: {
        whatIsFree: "Basic plan",
        whatIsPaid: "Pro features",
        conversionLever: "feature_gate",
      },
    };
    const result = BusinessContextSchema.safeParse(ctx);
    expect(result.success).toBe(true);
  });

  it("should reject empty economic models array", () => {
    const ctx = { ...validContext, economicModels: [] };
    const result = BusinessContextSchema.safeParse(ctx);
    expect(result.success).toBe(false);
  });

  it("should reject invalid business model key", () => {
    const ctx = { ...validContext, businessModel: "INVALID" };
    const result = BusinessContextSchema.safeParse(ctx);
    expect(result.success).toBe(false);
  });
});

describe("getPillarWeightsForContext", () => {
  it("should return weights for luxury D2C brand", () => {
    const ctx: BusinessContext = {
      businessModel: "PRODUCTION",
      economicModels: ["VENTE_DIRECTE"],
      positioningArchetype: "LUXE",
      salesChannel: "DIRECT",
      positionalGoodFlag: true,
      premiumScope: "FULL",
    };

    const weights = getPillarWeightsForContext(ctx);

    // Luxury should boost A and D significantly
    expect(weights.a).toBeGreaterThan(1.2);
    expect(weights.d).toBeGreaterThan(1.3);
    // All weights should be between 0.5 and 2.0
    for (const w of Object.values(weights)) {
      expect(w).toBeGreaterThanOrEqual(0.5);
      expect(w).toBeLessThanOrEqual(2.0);
    }
  });

  it("should return weights for SaaS freemium brand", () => {
    const ctx: BusinessContext = {
      businessModel: "FREEMIUM_AD",
      economicModels: ["FREEMIUM", "ABONNEMENT"],
      positioningArchetype: "VALUE",
      salesChannel: "DIRECT",
      positionalGoodFlag: false,
      premiumScope: "NONE",
    };

    const weights = getPillarWeightsForContext(ctx);

    // SaaS should boost V (value) and E (engagement/retention)
    expect(weights.v).toBeGreaterThan(1.3);
    expect(weights.e).toBeGreaterThan(1.1);
  });

  it("should return weights for marketplace", () => {
    const ctx: BusinessContext = {
      businessModel: "PLATEFORME",
      economicModels: ["COMMISSION"],
      positioningArchetype: "MAINSTREAM",
      salesChannel: "HYBRID",
      positionalGoodFlag: false,
      premiumScope: "NONE",
    };

    const weights = getPillarWeightsForContext(ctx);

    // Marketplace should boost E heavily (two-sided engagement)
    expect(weights.e).toBeGreaterThan(1.2);
  });

  it("should apply D2C overlay boosting authenticity", () => {
    const baseCtx: BusinessContext = {
      businessModel: "DISTRIBUTION",
      economicModels: ["VENTE_DIRECTE"],
      positioningArchetype: "MAINSTREAM",
      salesChannel: "INTERMEDIATED",
      positionalGoodFlag: false,
      premiumScope: "NONE",
    };

    const d2cCtx: BusinessContext = {
      ...baseCtx,
      salesChannel: "DIRECT",
    };

    const baseWeights = getPillarWeightsForContext(baseCtx);
    const d2cWeights = getPillarWeightsForContext(d2cCtx);

    // D2C should boost authenticity compared to intermediated
    expect(d2cWeights.a).toBeGreaterThan(baseWeights.a);
  });
});

describe("getChannelModifiersForContext", () => {
  it("should boost packaging and events for luxury", () => {
    const ctx: BusinessContext = {
      businessModel: "PRODUCTION",
      economicModels: ["VENTE_DIRECTE"],
      positioningArchetype: "LUXE",
      salesChannel: "DIRECT",
      positionalGoodFlag: true,
      premiumScope: "FULL",
    };

    const mods = getChannelModifiersForContext(ctx);

    expect(mods["PACKAGING"]).toBeGreaterThan(0);
    expect(mods["EVENT"]).toBeGreaterThan(0);
  });

  it("should boost website and linkedin for SaaS", () => {
    const ctx: BusinessContext = {
      businessModel: "ABONNEMENT",
      economicModels: ["ABONNEMENT"],
      positioningArchetype: "PREMIUM",
      salesChannel: "DIRECT",
      positionalGoodFlag: false,
      premiumScope: "NONE",
    };

    const mods = getChannelModifiersForContext(ctx);

    expect(mods["WEBSITE"]).toBeGreaterThan(0);
    expect(mods["LINKEDIN"]).toBeGreaterThan(0);
  });

  it("should boost facebook and tiktok for low-cost", () => {
    const ctx: BusinessContext = {
      businessModel: "DISTRIBUTION",
      economicModels: ["LOW_COST"],
      positioningArchetype: "LOW_COST",
      salesChannel: "INTERMEDIATED",
      positionalGoodFlag: false,
      premiumScope: "NONE",
    };

    const mods = getChannelModifiersForContext(ctx);

    expect(mods["FACEBOOK"]).toBeGreaterThan(0);
    expect(mods["TIKTOK"]).toBeGreaterThan(0);
  });
});
