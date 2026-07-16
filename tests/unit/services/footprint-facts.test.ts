/**
 * buildFootprintFacts — la preuve derrière le /100 (jamais un score nu).
 * Pur, fixtures, zéro IO.
 */
import { describe, it, expect } from "vitest";
import { buildFootprintFacts, parseFootprintFacts } from "@/server/services/quick-intake/footprint-facts";
import type { EnrichedFootprint } from "@/server/services/quick-intake/footprint-types";

function baseFootprint(overrides: Partial<EnrichedFootprint> = {}): EnrichedFootprint {
  return {
    site: null,
    socials: [],
    articles: [],
    channels: [],
    collectedAt: "2026-07-16T00:00:00Z",
    errors: [],
    followerCounts: [],
    press: [],
    discovery: { attempted: false, queries: [], status: "SKIPPED_DECLARED" },
    enrichment: { apify: "SKIPPED", press: "EMPTY", totalMs: 0, errors: [] },
    ...overrides,
  } as EnrichedFootprint;
}

describe("buildFootprintFacts", () => {
  it("réseaux : compte détecté SANS audience → followerCount null (jamais un faux zéro)", () => {
    const facts = buildFootprintFacts(
      baseFootprint({
        socials: [
          { platform: "INSTAGRAM", url: "https://instagram.com/spawt", handle: "spawt" },
          { platform: "FACEBOOK", url: "https://facebook.com/spawt", handle: "spawt" },
        ],
      }),
    );
    expect(facts.socials).toHaveLength(2);
    expect(facts.socials[0]).toMatchObject({ platform: "INSTAGRAM", handle: "spawt", followerCount: null, source: null });
  });

  it("réseaux : audience mesurée rattachée au bon handle", () => {
    const facts = buildFootprintFacts(
      baseFootprint({
        socials: [{ platform: "INSTAGRAM", url: "https://instagram.com/spawt", handle: "spawt" }],
        followerCounts: [
          { platform: "INSTAGRAM", handle: "spawt", followerCount: 1753, source: "APIFY", capturedAt: "2026-07-16T00:00:00Z" },
        ],
      }),
    );
    expect(facts.socials[0]).toMatchObject({ followerCount: 1753, source: "APIFY" });
  });

  it("relevé mesuré sans profil parsé correspondant → quand même présent", () => {
    const facts = buildFootprintFacts(
      baseFootprint({
        followerCounts: [
          { platform: "TIKTOK", handle: "marque", followerCount: 500, source: "CONNECTOR", capturedAt: "2026-07-16T00:00:00Z" },
        ],
      }),
    );
    expect(facts.socials).toHaveLength(1);
    expect(facts.socials[0]).toMatchObject({ platform: "TIKTOK", followerCount: 500 });
  });

  it("presse : titres + liens repris tels quels (max 8)", () => {
    const press = Array.from({ length: 10 }, (_, i) => ({
      title: `Mention ${i}`,
      url: `https://news.example/${i}`,
      sourceName: "Journal",
      publishedAt: null,
    }));
    const facts = buildFootprintFacts(baseFootprint({ press, enrichment: { apify: "SKIPPED", press: "LIVE", totalMs: 0, errors: [] } }));
    expect(facts.press).toHaveLength(8);
    expect(facts.press[0]).toMatchObject({ title: "Mention 0", url: "https://news.example/0", sourceName: "Journal" });
  });

  it("blocs non-LIVE omis (jamais une absence de mesure présentée comme un fait)", () => {
    const facts = buildFootprintFacts(
      baseFootprint({
        domain: { status: "SKIPPED", domain: null, createdAt: null, ageYears: null, registrar: null },
        emailInfra: { status: "SKIPPED", domain: null, hasMx: false, mxProvider: null, hasSpf: false, hasDmarc: false },
        performance: { status: "DEFERRED_NO_KEY", performanceScore: null, lcpMs: null },
        maps: { status: "NOT_FOUND", placeName: null, rating: null, reviewCount: null, address: null, topReviews: [] },
      }),
    );
    expect(facts.domain).toBeNull();
    expect(facts.email).toBeNull();
    expect(facts.performance).toBeNull();
    expect(facts.reviews).toBeNull();
  });

  it("blocs LIVE projetés avec leurs valeurs réelles", () => {
    const facts = buildFootprintFacts(
      baseFootprint({
        domain: { status: "LIVE", domain: "spawt.ci", createdAt: "2019-04-01", ageYears: 7, registrar: "OVH" },
        emailInfra: { status: "LIVE", domain: "spawt.ci", hasMx: true, mxProvider: "Google Workspace", hasSpf: true, hasDmarc: false },
        maps: { status: "LIVE", placeName: "SPAWT Abidjan", rating: 4.5, reviewCount: 120, address: null, topReviews: [] },
      }),
    );
    expect(facts.domain).toMatchObject({ domain: "spawt.ci", ageYears: 7, registrar: "OVH" });
    expect(facts.email).toMatchObject({ hasMx: true, mxProvider: "Google Workspace", hasSpf: true, hasDmarc: false });
    expect(facts.reviews).toMatchObject({ placeName: "SPAWT Abidjan", rating: 4.5, reviewCount: 120 });
  });

  it("round-trip JSON : persisté puis re-hydraté sans perte", () => {
    const facts = buildFootprintFacts(
      baseFootprint({
        socials: [{ platform: "INSTAGRAM", url: "https://instagram.com/x", handle: "x" }],
        press: [{ title: "T", url: "https://u", sourceName: null, publishedAt: null }],
      }),
    );
    const rehydrated = parseFootprintFacts(JSON.parse(JSON.stringify(facts)));
    expect(rehydrated).toEqual(facts);
  });

  it("parseFootprintFacts : legacy/illisible → null (le cache retombe sur un scan frais)", () => {
    expect(parseFootprintFacts(null)).toBeNull();
    expect(parseFootprintFacts(undefined)).toBeNull();
    expect(parseFootprintFacts([])).toBeNull();
    expect(parseFootprintFacts({ pas: "des facts" })).toBeNull();
  });
});
