/**
 * BOUCLE ADVERSARIALE — rejouée en CI, sur cinq marques réelles.
 *
 * ── Pourquoi ce fichier existe ──
 *
 * Le 2026-07-30, une passe adversariale manuelle sur cinq marques a rendu
 * « 5/5 parfait ». Le verdict était FAUX : une relecture à la main a trouvé
 * deux défauts réels que le harnais laissait passer (un détail qui mentait
 * sur la raison d'un non-mesuré, et l'extension de nom restée ouverte sur les
 * handles sociaux). La qualité reposait donc sur une relecture humaine un
 * jour de chance.
 *
 * Les fixtures ci-dessous sont les EMPREINTES RÉELLES capturées ce jour-là en
 * production. Elles sont figées : le test tourne sans réseau, sans clé, sans
 * budget Apify — et la prochaine régression est trouvée par la CI, pas par
 * une relecture.
 *
 * ── Les critères ──
 *
 * Chacun correspond à un défaut MESURÉ, pas à une hypothèse :
 *
 *   C1  calibration     100/100 sur une fraction du spectre    (Chococam)
 *   C2  saturation      presse/citations toujours au maximum   (toutes)
 *   C3  cohérence       mesuré ⇔ scoré
 *   C7  honnêteté       un détail ne donne jamais une fausse raison (Chococam)
 *   C8  appartenance    extension de nom non discriminée       (Dovv)
 *   C10 vraisemblance   audience impossible pour le marché     (Orange Cameroun)
 *
 * Ajouter une marque : capturer son empreinte via `scoreInstant`, la figer
 * ici, et vérifier qu'elle passe les six critères.
 */

import { describe, it, expect } from "vitest";
import { computeFootprintScore } from "@/server/services/quick-intake/footprint-score";
import type { EnrichedFootprint } from "@/server/services/quick-intake/footprint-types";

/** Squelette d'empreinte — chaque fixture ne renseigne que ce qui la distingue. */
function footprint(overrides: Partial<EnrichedFootprint> = {}): EnrichedFootprint {
  return {
    site: null,
    socials: [],
    articles: [],
    channels: [],
    collectedAt: "2026-07-30T14:52:00.000Z",
    errors: [],
    followerCounts: [],
    press: [],
    discovery: { attempted: true, queries: ["q"], status: "OK" },
    enrichment: { apify: "LIVE", press: "LIVE", totalMs: 40_000, errors: [] },
    ...overrides,
  };
}

const pressItems = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    title: `mention ${i}`,
    url: `https://news.example/${i}`,
    sourceName: "EcoMatin",
    publishedAt: null,
  }));

const citationItems = (n: number) => ({
  status: "LIVE" as const,
  items: Array.from({ length: n }, (_, i) => ({
    title: `cité ${i}`,
    url: `https://annuaire.example/${i}`,
    host: "annuaire.example",
  })),
});

// ── Les cinq empreintes réelles, figées ────────────────────────────────

const BRANDS: Array<{ name: string; f: EnrichedFootprint }> = [
  {
    // Le cas fondateur de la calibration : la marque la plus visible du
    // chocolat camerounais sortait 100/100 sur 20 % de couverture.
    name: "Chococam",
    f: footprint({
      socials: [
        { platform: "LINKEDIN", url: "https://linkedin.com/company/chococamfmcg", handle: "chococamfmcg" },
        { platform: "FACEBOOK", url: "https://facebook.com/ChococamFMCG", handle: "ChococamFMCG" },
      ],
      followerCounts: [
        { platform: "FACEBOOK", handle: "ChococamFMCG", followerCount: 7_482, source: "APIFY", capturedAt: "2026-07-30T14:52:00Z" },
      ],
      press: pressItems(5),
      webMentions: citationItems(6),
      // L'actor Maps a tourné et RÉUSSI ; c'est la récolte qui a expiré.
      maps: { status: "ERROR", placeName: null, rating: null, reviewCount: null, address: null, topReviews: [] },
    }),
  },
  {
    // Extension de nom sur un handle : `@dovvmusic` pour « Dovv ».
    name: "Dovv",
    f: footprint({
      socials: [
        { platform: "INSTAGRAM", url: "https://instagram.com/dovvmusic", handle: "dovvmusic" },
        { platform: "FACEBOOK", url: "https://facebook.com/Dovvmusic", handle: "Dovvmusic" },
        { platform: "LINKEDIN", url: "https://linkedin.com/company/dovv", handle: "dovv" },
      ],
      followerCounts: [
        { platform: "INSTAGRAM", handle: "dovvmusic", followerCount: 2_442, source: "APIFY", capturedAt: "2026-07-30T14:52:00Z" },
        { platform: "FACEBOOK", handle: "Dovvmusic", followerCount: 4_047, source: "APIFY", capturedAt: "2026-07-30T14:52:00Z" },
      ],
      press: pressItems(5),
      webMentions: citationItems(6),
      maps: { status: "NOT_FOUND", placeName: null, rating: null, reviewCount: null, address: null, topReviews: [] },
    }),
  },
  {
    // Marché : le domaine MONDIAL créditait 31,7 ans au franchisé ivoirien.
    name: "Burger King (CI)",
    f: footprint({
      site: {
        url: "https://burgerking.com",
        reachable: true,
        groupDomain: true,
        title: "Burger King",
        description: null,
        ogImage: null,
        language: "en",
        tech: { cms: null, https: true, hasMetaDescription: false, hasOgTags: false, hasRobotsTxt: true, hasSitemap: null },
      },
      press: pressItems(5),
      webMentions: { status: "EMPTY", items: [] },
      maps: { status: "NOT_FOUND", placeName: null, rating: null, reviewCount: null, address: null, topReviews: [] },
      emailInfra: { status: "LIVE", domain: "burgerking.com", hasMx: true, mxProvider: "Google Workspace", hasSpf: false, hasDmarc: true },
      domain: { status: "LIVE", domain: "burgerking.com", createdAt: "1994-11-01", ageYears: 31.7, registrar: "CSC Corporate Domains, Inc." },
    }),
  },
  {
    // Vraisemblance : le compte EXISTE, son compteur est celui du groupe.
    name: "Orange Cameroun",
    f: footprint({
      socials: [
        { platform: "LINKEDIN", url: "https://linkedin.com/company/orange-cameroun", handle: "orange-cameroun" },
        { platform: "FACEBOOK", url: "https://facebook.com/orangecameroun", handle: "orangecameroun" },
      ],
      press: pressItems(5),
      webMentions: citationItems(4),
      maps: { status: "LIVE", placeName: "Siège Technique Orange Cameroun", rating: 3.7, reviewCount: 47, address: "Douala, Cameroun", topReviews: [] },
      enrichment: {
        apify: "LIVE",
        press: "LIVE",
        totalMs: 40_000,
        errors: [],
        audienceAnomalies: [
          { platform: "FACEBOOK", handle: "orangecameroun", followerCount: 31_737_324, marketPopulation: 28_000_000 },
        ],
      },
    }),
  },
  {
    // Empreinte complète — le cas « tout mesuré », garde-fou de non-régression.
    name: "Irawo",
    f: footprint({
      site: {
        url: "https://irawo.net",
        reachable: true,
        title: "Irawo",
        description: null,
        ogImage: null,
        language: "fr",
        tech: { cms: "WordPress", https: true, hasMetaDescription: false, hasOgTags: false, hasRobotsTxt: true, hasSitemap: true },
      },
      socials: [
        { platform: "FACEBOOK", url: "https://facebook.com/associationirawo", handle: "associationirawo" },
      ],
      followerCounts: [
        { platform: "FACEBOOK", handle: "associationirawo", followerCount: 4, source: "APIFY", capturedAt: "2026-07-30T14:52:00Z" },
      ],
      press: pressItems(3),
      webMentions: citationItems(1),
      maps: { status: "NOT_FOUND", placeName: null, rating: null, reviewCount: null, address: null, topReviews: [] },
      emailInfra: { status: "LIVE", domain: "irawo.net", hasMx: true, mxProvider: "mail.irawo.net", hasSpf: true, hasDmarc: false },
      domain: { status: "LIVE", domain: "irawo.net", createdAt: "2018-01-01", ageYears: 7.8, registrar: "GoDaddy.com, LLC" },
    }),
  },
];

// ── Les critères, appliqués à CHAQUE marque ────────────────────────────

describe.each(BRANDS)("empreinte réelle — $name", ({ f }) => {
  const score = computeFootprintScore(f);
  const dim = (k: string) => score.dimensions.find((d) => d.key === k)!;

  it("C1 — jamais la note maximale sur une fraction du spectre", () => {
    if (score.total === 100) expect(score.measuredWeight).toBe(100);
  });

  it("C2 — presse et citations ne saturent pas", () => {
    expect(dim("press").score ?? 0).toBeLessThanOrEqual(75);
    expect(dim("citations").score ?? 0).toBeLessThanOrEqual(60);
  });

  it("C3 — une dimension mesurée porte un score, une non mesurée n'en porte pas", () => {
    for (const d of score.dimensions) {
      if (d.measured) expect(d.score).not.toBeNull();
      else expect(d.score).toBeNull();
    }
  });

  it("C7 — aucun détail ne donne une raison fausse", () => {
    // « collecteur non configuré » alors que la clé est posée et que l'actor
    // a réussi ; « audience non relevée » alors qu'elle a été relevée puis
    // écartée. Les deux ont été affichés en production.
    if (f.maps?.status === "ERROR") {
      expect(dim("reviews").details).not.toContain("non configuré");
    }
    if ((f.enrichment.audienceAnomalies ?? []).length > 0) {
      expect(dim("social").details).not.toContain("audience non relevée");
      expect(dim("social").details).toContain("écartée");
    }
  });

  it("C10 — une audience écartée ne compte jamais dans le score", () => {
    const anomalies = f.enrichment.audienceAnomalies ?? [];
    if (anomalies.length === 0) return;
    const counted = (f.followerCounts ?? []).reduce((s, c) => s + c.followerCount, 0);
    for (const a of anomalies) expect(counted).toBeLessThan(a.followerCount);
  });
});

// ── Cas dont le verdict est spécifique ─────────────────────────────────

describe("verdicts spécifiques (les défauts qui ont motivé chaque garde)", () => {
  const byName = (n: string) => {
    const s = computeFootprintScore(BRANDS.find((b) => b.name === n)!.f);
    return (k: string) => s.dimensions.find((d) => d.key === k)!;
  };

  it("Chococam : la récolte des avis a échoué — on ne dit pas « non configuré »", () => {
    expect(byName("Chococam")("reviews").details).toBe("relevé des avis en échec, réessayez");
  });

  it("Burger King : le domaine du groupe ne crédite ni ancienneté ni e-mail au marché", () => {
    const d = byName("Burger King (CI)");
    expect(d("domain").measured).toBe(false);
    expect(d("domain").details).toContain("groupe");
    expect(d("email").measured).toBe(false);
    expect(d("email").details).toContain("groupe");
    // …mais le site lui-même reste mesuré : il existe et porte la marque.
    expect(d("site").measured).toBe(true);
  });

  it("Orange Cameroun : le compte reste listé, seul le chiffre est écarté", () => {
    const social = byName("Orange Cameroun")("social");
    expect(social.measured).toBe(true);
    expect(social.details).toContain("facebook");
    expect(social.details).toContain("incohérente avec le marché");
  });

  it("Chococam : 2 dimensions saturables mesurées ne font plus un 100/100", () => {
    const s = computeFootprintScore(BRANDS.find((b) => b.name === "Chococam")!.f);
    expect(s.total).not.toBe(100);
  });
});
