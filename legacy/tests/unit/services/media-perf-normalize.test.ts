import { describe, it, expect } from "vitest";
import { normalizePerfPayload, platformToConnectorType } from "@/server/services/media-perf/normalize";

/** Normalisation perf média (ADR-0115) — PUR, zéro mock. */

describe("media-perf/normalize — normalizePerfPayload", () => {
  it("mappe les champs + dérive CPA/ROAS déterministes", () => {
    const n = normalizePerfPayload({ impressions: 10000, clicks: 200, conversions: 50, spend: 500, revenue: 2000 });
    expect(n.impressions).toBe(10000);
    expect(n.conversions).toBe(50);
    expect(n.mediaCost).toBe(500);
    expect(n.cpa).toBe(10); // 500 / 50
    expect(n.roas).toBe(4); // 2000 / 500
  });

  it("opérande manquant → métrique dérivée null (jamais inventée)", () => {
    const n = normalizePerfPayload({ impressions: 1000, conversions: 10 }); // pas de spend
    expect(n.cpa).toBeNull();
    expect(n.roas).toBeNull();
    expect(n.impressions).toBe(1000);
  });

  it("payload vide → tout null", () => {
    const n = normalizePerfPayload({});
    expect(n.impressions).toBeNull();
    expect(n.mediaCost).toBeNull();
    expect(n.cpa).toBeNull();
  });
});

describe("media-perf/normalize — platformToConnectorType", () => {
  it("mappe les plateformes connues", () => {
    expect(platformToConnectorType("META")).toBe("meta-ads");
    expect(platformToConnectorType("facebook")).toBe("meta-ads");
    expect(platformToConnectorType("GOOGLE_ADS")).toBe("google-ads");
    expect(platformToConnectorType("TikTok")).toBe("tiktok-ads");
    expect(platformToConnectorType("POS")).toBe("pos");
  });
  it("plateforme inconnue → null", () => {
    expect(platformToConnectorType("myspace")).toBeNull();
  });
});
