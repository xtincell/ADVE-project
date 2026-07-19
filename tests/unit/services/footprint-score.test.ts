/**
 * ADR-0121 vague A — score d'empreinte /100 (déterministe, renormalisé).
 * Invariant d'honnêteté : une dimension NON MESURÉE sort du dénominateur ;
 * si rien n'est mesurable le total est null (« non mesuré »), jamais un
 * faux zéro. Une dimension mesurée et faible, elle, compte.
 */

import { describe, it, expect } from "vitest";
import { computeFootprintScore } from "@/server/services/quick-intake/footprint-score";
import { buildFootprintNarrativeTemplate, collectFootprintFacts } from "@/server/services/quick-intake/footprint-narrative";
import type { EnrichedFootprint } from "@/server/services/quick-intake/public-enrichment";

function base(overrides: Partial<EnrichedFootprint> = {}): EnrichedFootprint {
  return {
    site: null,
    socials: [],
    articles: [],
    channels: [],
    collectedAt: "2026-07-10T00:00:00.000Z",
    errors: [],
    followerCounts: [],
    press: [],
    discovery: { attempted: false, queries: [], status: "SKIPPED_DECLARED" },
    enrichment: { apify: "SKIPPED", press: "ERROR", totalMs: 0, errors: [] },
    ...overrides,
  };
}

const site = (tech: Partial<NonNullable<NonNullable<EnrichedFootprint["site"]>["tech"]>> = {}) => ({
  url: "https://cimencam.cm",
  reachable: true,
  title: "Cimencam",
  description: null,
  ogImage: null,
  language: "fr",
  tech: {
    cms: null,
    https: true,
    hasMetaDescription: false,
    hasOgTags: false,
    hasRobotsTxt: null,
    hasSitemap: null,
    ...tech,
  },
});

describe("computeFootprintScore — renormalisation sur le mesuré", () => {
  it("rien de mesurable → total null, jamais un faux zéro", () => {
    const score = computeFootprintScore(base());
    expect(score.total).toBeNull();
    expect(score.measuredWeight).toBe(0);
    expect(score.dimensions.every((d) => !d.measured && d.score === null)).toBe(true);
  });

  it("une seule dimension mesurée → le total EST cette dimension (dénominateur = son poids)", () => {
    const f = base({ site: site({ hasMetaDescription: true, hasOgTags: true, hasSitemap: true, hasRobotsTxt: true }) });
    const score = computeFootprintScore(f);
    const siteDim = score.dimensions.find((d) => d.key === "site")!;
    expect(siteDim.measured).toBe(true);
    expect(siteDim.score).toBe(100); // 40 + 10 https + 15 meta + 10 og + 15 sitemap + 10 robots
    expect(score.measuredWeight).toBe(20);
    expect(score.total).toBe(100); // renormalisé : pas dilué par les 80 points non mesurés
  });

  it("dimension mesurée FAIBLE compte (site injoignable = 0, pas exclu)", () => {
    const f = base({
      site: { url: "https://down.cm", reachable: false, title: null, description: null, ogImage: null, language: null },
    });
    const score = computeFootprintScore(f);
    const siteDim = score.dimensions.find((d) => d.key === "site")!;
    expect(siteDim.measured).toBe(true);
    expect(siteDim.score).toBe(0);
    expect(score.total).toBe(0);
  });

  // Fix prod 2026-07-19 : une découverte qui tourne SANS rien trouver n'est
  // plus « mesurée » — fin des 20 points fabriqués et du libellé « présence
  // détectée » pour une marque inexistante (ADR-0046).
  it("découverte OK mais 0 profil → social NON mesuré, exclu du dénominateur", () => {
    const f = base({ discovery: { attempted: true, queries: ["q"], status: "OK" } });
    const score = computeFootprintScore(f);
    const social = score.dimensions.find((d) => d.key === "social")!;
    expect(social.measured).toBe(false);
    expect(social.score).toBeNull();
    expect(social.details).toBe("aucun profil social détecté");
    expect(score.measuredWeight).toBe(0);
    expect(score.total).toBeNull(); // marque inventée sans site : rien de mesurable
  });

  it("profils détectés sans audience relevée → présence seule, jamais de +20 fabriqué", () => {
    const f = base({
      socials: [
        { platform: "INSTAGRAM", url: "https://instagram.com/marque", handle: "marque" },
        { platform: "FACEBOOK", url: "https://facebook.com/marque", handle: "marque" },
      ],
    });
    const score = computeFootprintScore(f);
    const social = score.dimensions.find((d) => d.key === "social")!;
    expect(social.measured).toBe(true);
    expect(social.score).toBe(30); // 2 profils × 15, audience 0 honnête (pas de fallback 20)
    expect(social.details).toContain("instagram, facebook");
    expect(social.details).toContain("audience non relevée");
    expect(social.details).not.toContain("présence détectée");
  });

  it("relevé d'audience sans profil parsé (connecteur seul) → mesuré sur la preuve du relevé", () => {
    const f = base({
      followerCounts: [
        { platform: "INSTAGRAM", handle: "marque", followerCount: 12_000, source: "CONNECTOR", capturedAt: "2026-07-10T00:00:00Z" },
      ],
    });
    const score = computeFootprintScore(f);
    const social = score.dimensions.find((d) => d.key === "social")!;
    expect(social.measured).toBe(true);
    expect(social.details).toContain("instagram");
    expect(social.details).toContain("abonnés mesurés");
  });

  it("clé absente (DEFERRED) → dimension exclue, pas comptée à 0", () => {
    const f = base({
      site: site(),
      maps: { status: "DEFERRED_NO_KEY", placeName: null, rating: null, reviewCount: null, address: null, topReviews: [] },
      performance: { status: "DEFERRED_NO_KEY", performanceScore: null, lcpMs: null },
    });
    const score = computeFootprintScore(f);
    expect(score.dimensions.find((d) => d.key === "reviews")!.measured).toBe(false);
    expect(score.dimensions.find((d) => d.key === "perf")!.measured).toBe(false);
    expect(score.measuredWeight).toBe(20); // site uniquement
  });

  it("empreinte riche : toutes dimensions mesurées, total pondéré ∈ [0,100]", () => {
    const f = base({
      site: site({ hasMetaDescription: true }),
      socials: [
        { platform: "INSTAGRAM", url: "https://instagram.com/cimencam", handle: "cimencam" },
        { platform: "YOUTUBE", url: "https://youtube.com/@cimencam", handle: "cimencam" },
      ],
      followerCounts: [
        { platform: "INSTAGRAM", handle: "cimencam", followerCount: 85_000, source: "APIFY", capturedAt: "2026-07-10T00:00:00Z" },
      ],
      youtube: { status: "LIVE", handle: "cimencam", channelTitle: "Cimencam", subscriberCount: 15_000, viewCount: 1, videoCount: 10 },
      maps: { status: "LIVE", placeName: "Cimencam", rating: 4.4, reviewCount: 200, address: null, topReviews: [] },
      emailInfra: { status: "LIVE", domain: "cimencam.cm", hasMx: true, mxProvider: "Google Workspace", hasSpf: true, hasDmarc: false },
      domain: { status: "LIVE", domain: "cimencam.cm", createdAt: "2016-01-01", ageYears: 10.5, registrar: "OVH" },
      performance: { status: "LIVE", performanceScore: 55, lcpMs: 3200 },
      press: [{ title: "Cimencam inaugure", url: "https://x.cm/a", sourceName: "EcoMatin", publishedAt: null }],
      enrichment: { apify: "LIVE", press: "LIVE", totalMs: 1200, errors: [] },
    });
    const score = computeFootprintScore(f);
    expect(score.measuredWeight).toBe(100);
    expect(score.total).not.toBeNull();
    expect(score.total!).toBeGreaterThan(40);
    expect(score.total!).toBeLessThanOrEqual(100);
    // Audience 100k → log10(1e5)/6 ≈ 83 → 60 % de la dimension sociale.
    const social = score.dimensions.find((d) => d.key === "social")!;
    expect(social.score!).toBeGreaterThanOrEqual(70); // 30 présence (2 canaux) + ~50 audience
    // Avis : 4.4/5 → 53 + volume log10(200)*25 ≈ 40 (capé) → ~93.
    const reviews = score.dimensions.find((d) => d.key === "reviews")!;
    expect(reviews.score!).toBeGreaterThan(85);
  });

  it("fiche Maps NOT_FOUND = mesuré à 0 (on a cherché, rien trouvé)", () => {
    const f = base({
      maps: { status: "NOT_FOUND", placeName: null, rating: null, reviewCount: null, address: null, topReviews: [] },
    });
    const score = computeFootprintScore(f);
    const reviews = score.dimensions.find((d) => d.key === "reviews")!;
    expect(reviews.measured).toBe(true);
    expect(reviews.score).toBe(0);
  });
});

describe("narratif template (déterministe, fallback du LLM)", () => {
  it("cite le score, la marque et les dimensions non mesurées", () => {
    const f = base({ site: site() });
    f.score = computeFootprintScore(f);
    const text = buildFootprintNarrativeTemplate(f, { companyName: "Cimencam" });
    expect(text).toContain("Cimencam");
    expect(text).toContain(`${f.score.total}/100`);
    expect(text).toContain("non mesurées");
  });

  it("rien de mesuré → phrase honnête « n'a pas pu être mesurée »", () => {
    const f = base();
    f.score = computeFootprintScore(f);
    const text = buildFootprintNarrativeTemplate(f, { companyName: "Marque X" });
    expect(text).toContain("n'a pas pu être mesurée");
  });

  it("collectFootprintFacts ne fabrique rien (DEFERRED omis, NOT_FOUND dit)", () => {
    const f = base({
      maps: { status: "DEFERRED_NO_KEY", placeName: null, rating: null, reviewCount: null, address: null, topReviews: [] },
      ads: { status: "NOT_FOUND", activeAdsCount: null, pageName: null },
    });
    const facts = collectFootprintFacts(f, "Marque X");
    expect(facts.join(" ")).not.toContain("Google Business"); // DEFERRED → silence
    expect(facts.join(" ")).toContain("Aucune publicité Meta active"); // NOT_FOUND → dit
  });
});
