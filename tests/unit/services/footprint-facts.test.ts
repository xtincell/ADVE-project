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

/**
 * Ambiguïté IRRÉDUCTIBLE (audit 2026-07-30). Mesuré : « Irawo » scoré sans
 * secteur ni pays retombe sur une association homonyme — au nom EXACT, donc
 * aucune règle d'extension ne peut trancher. Le rapport doit l'ANNONCER au
 * lieu de laisser croire à une certitude.
 */
describe("undiscriminated — le rapport dit quand il ne peut pas trancher", () => {
  const withGate = (discriminants: string[]) =>
    buildFootprintFacts({
      site: null, socials: [], articles: [], channels: [],
      collectedAt: "2026-07-30T00:00:00Z", errors: [], followerCounts: [], press: [],
      discovery: { attempted: true, queries: [], status: "OK" },
      enrichment: { apify: "SKIPPED", press: "EMPTY", totalMs: 0, errors: [] },
      entityGate: {
        ambiguousName: false, ambiguityReason: null, discriminants,
        judge: "DETERMINISTIC_ONLY",
        filtered: { press: 0, discovery: 0, maps: 0, site: 0, citations: 0, adversarial: 0 },
      },
    });

  it("aucun discriminant → le rapport le déclare", () => {
    expect(withGate([]).undiscriminated).toBe(true);
  });

  it("un secteur ou un pays suffit à lever la déclaration", () => {
    expect(withGate(["cameroun"]).undiscriminated).toBe(false);
  });
});

/**
 * Projection des signaux longtemps collectés puis tus (2026-07-31).
 *
 * Le rapport possédait ces faits — citations publiques, recherches associées,
 * Wikipédia, publicités Meta — et ne les montrait jamais : la projection ne
 * les portait pas. « La restitution est plus pauvre que la collecte. »
 *
 * L'invariant testé ici est la distinction que l'écran ne doit JAMAIS
 * confondre : `undefined` = le collecteur n'a pas tourné (rien à dire) ·
 * `null` = il a tourné et n'a rien trouvé (négatif mesuré, honnête).
 */
describe("projection des faits de première impression", () => {
  const withSignals = (over: Partial<EnrichedFootprint>) =>
    buildFootprintFacts({
      site: null, socials: [], articles: [], channels: [],
      collectedAt: "2026-07-31T00:00:00Z", errors: [], followerCounts: [], press: [],
      discovery: { attempted: true, queries: [], status: "OK" },
      enrichment: { apify: "SKIPPED", press: "EMPTY", totalMs: 0, errors: [] },
      ...over,
    });

  it("citations : projetées quand la recherche a tourné", () => {
    const facts = withSignals({
      webMentions: {
        status: "LIVE",
        items: [{ title: "Chococam cité", url: "https://a.example/x", host: "a.example" }],
      },
    });
    expect(facts.citations).toHaveLength(1);
    expect(facts.citations?.[0]?.host).toBe("a.example");
  });

  it("collecteur non exécuté → champ ABSENT (jamais « rien trouvé »)", () => {
    const facts = withSignals({});
    expect(facts.citations).toBeUndefined();
    expect(facts.wikipedia).toBeUndefined();
    expect(facts.ads).toBeUndefined();
    expect(facts.searchSuggestions).toBeUndefined();
  });

  it("Wikipédia : page absente MESURÉE → null, jamais undefined", () => {
    const facts = withSignals({
      wikipedia: {
        state: "LIVE",
        observedAt: "2026-07-31T00:00:00Z",
        data: { hasPage: false, title: null, extract: null, url: null, lang: "fr" },
      },
    });
    expect(facts.wikipedia).toBeNull();
  });

  it("Wikipédia : page trouvée → titre et lien projetés", () => {
    const facts = withSignals({
      wikipedia: {
        state: "LIVE",
        observedAt: "2026-07-31T00:00:00Z",
        data: {
          hasPage: true, title: "Chococam",
          extract: "Chocolatier camerounais.", url: "https://fr.wikipedia.org/wiki/Chococam", lang: "fr",
        },
      },
    });
    expect(facts.wikipedia?.title).toBe("Chococam");
    expect(facts.wikipedia?.url).toContain("wikipedia.org");
  });

  it("publicités : aucune campagne trouvée → null ; campagnes actives → compte", () => {
    expect(withSignals({ ads: { status: "NOT_FOUND", activeAdsCount: null, pageName: null } }).ads).toBeNull();
    const live = withSignals({ ads: { status: "LIVE", activeAdsCount: 4, pageName: "Chococam" } });
    expect(live.ads?.activeAdsCount).toBe(4);
  });

  it("un snapshot persisté SANS ces champs reste lisible (rétro-compat)", () => {
    const legacy = parseFootprintFacts({ socials: [], press: [] });
    expect(legacy).not.toBeNull();
    expect(legacy?.citations).toBeUndefined();
  });
});
