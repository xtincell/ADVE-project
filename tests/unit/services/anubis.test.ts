/**
 * Anubis unit tests — Phase 8+ (ADR-0011).
 *
 * Tests les fonctions pures de governance.ts (audience valid + cost
 * per_superfan ratio thresholding) — sans DB. Les capabilities qui
 * touchent DB/email/social sont couvertes par dispatch tests.
 */

import { describe, it, expect } from "vitest";
import {
  AnubisAudienceError,
  AnubisCostPerSuperfanError,
  assertAudienceValid,
} from "@/server/services/anubis/governance";
import { ANUBIS_KINDS, COMMS_CHANNELS } from "@/server/services/anubis/types";

describe("Anubis governance — audience targeting validity (ADR-0011 §3)", () => {
  it("accepts audience with at least one country", () => {
    expect(() =>
      assertAudienceValid({
        strategyId: "s",
        campaignId: "c",
        platform: "META_ADS",
        budget: 1000,
        currency: "XAF",
        durationDays: 14,
        manipulationMode: "facilitator",
        audienceTargeting: { countries: ["WK"] },
        creativeAssetVersionId: "av",
        expectedSuperfans: 100,
      }),
    ).not.toThrow();
  });

  it("rejects audience with empty countries", () => {
    expect(() =>
      assertAudienceValid({
        strategyId: "s",
        campaignId: "c",
        platform: "META_ADS",
        budget: 1000,
        currency: "XAF",
        durationDays: 14,
        manipulationMode: "facilitator",
        audienceTargeting: { countries: [] },
        creativeAssetVersionId: "av",
        expectedSuperfans: 100,
      }),
    ).toThrow(AnubisAudienceError);
  });

  it("rejects ageRange with min < 13", () => {
    expect(() =>
      assertAudienceValid({
        strategyId: "s",
        campaignId: "c",
        platform: "META_ADS",
        budget: 1000,
        currency: "XAF",
        durationDays: 14,
        manipulationMode: "facilitator",
        audienceTargeting: { countries: ["WK"], ageRange: [12, 25] },
        creativeAssetVersionId: "av",
        expectedSuperfans: 100,
      }),
    ).toThrow(/ageRange/);
  });

  it("rejects ageRange where min ≥ max", () => {
    expect(() =>
      assertAudienceValid({
        strategyId: "s",
        campaignId: "c",
        platform: "META_ADS",
        budget: 1000,
        currency: "XAF",
        durationDays: 14,
        manipulationMode: "facilitator",
        audienceTargeting: { countries: ["WK"], ageRange: [40, 30] },
        creativeAssetVersionId: "av",
        expectedSuperfans: 100,
      }),
    ).toThrow(AnubisAudienceError);
  });

  it("accepts a reasonable ageRange", () => {
    expect(() =>
      assertAudienceValid({
        strategyId: "s",
        campaignId: "c",
        platform: "META_ADS",
        budget: 1000,
        currency: "XAF",
        durationDays: 14,
        manipulationMode: "facilitator",
        audienceTargeting: { countries: ["WK"], ageRange: [25, 40] },
        creativeAssetVersionId: "av",
        expectedSuperfans: 100,
      }),
    ).not.toThrow();
  });
});

describe("Anubis governance — cost_per_superfan veto (KPI primaire ADR-0011 §3)", () => {
  it("AnubisCostPerSuperfanError carries projected/benchmark/ratio", () => {
    const err = new AnubisCostPerSuperfanError(50, 20, 2.5);
    expect(err.projected).toBe(50);
    expect(err.benchmark).toBe(20);
    expect(err.ratio).toBe(2.5);
    expect(err.reason).toBe("ANUBIS_COST_PER_SUPERFAN_OVER_BENCHMARK");
    expect(err.message).toContain("50");
    expect(err.message).toContain("20");
  });
});

describe("Anubis types — constants", () => {
  it("ANUBIS_KINDS exposes exactly 5 intent kinds", () => {
    expect(ANUBIS_KINDS).toHaveLength(5);
  });

  it("ANUBIS_KINDS values are unique", () => {
    expect(new Set(ANUBIS_KINDS).size).toBe(ANUBIS_KINDS.length);
  });

  it("COMMS_CHANNELS includes all transactional + social + ad channels", () => {
    expect(COMMS_CHANNELS).toContain("EMAIL");
    expect(COMMS_CHANNELS).toContain("SMS");
    expect(COMMS_CHANNELS).toContain("PUSH");
    expect(COMMS_CHANNELS).toContain("IN_APP");
    expect(COMMS_CHANNELS).toContain("SOCIAL_INSTAGRAM");
    expect(COMMS_CHANNELS).toContain("AD_META");
    expect(COMMS_CHANNELS).toContain("AD_GOOGLE");
    expect(COMMS_CHANNELS).toContain("AD_TIKTOK");
    expect(COMMS_CHANNELS).toContain("AD_X");
  });

  it("COMMS_CHANNELS contains exactly 13 channels", () => {
    expect(COMMS_CHANNELS).toHaveLength(13);
  });
});
