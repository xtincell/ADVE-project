/**
 * ADR-0121 — Enrichissement public du pilier E (helpers purs + merge).
 * Zéro réseau : on verrouille le déterminisme des briques et l'honnêteté
 * des dégradations (jamais de fabrication — ADR-0046).
 */

import { describe, it, expect } from "vitest";
import {
  normalizeBrandToken,
  mentionsBrand,
  toSocialHandles,
  splitGoogleNewsTitle,
  mergeEnrichedFootprintIntoPillarE,
  type EnrichedFootprint,
} from "@/server/services/quick-intake/public-enrichment";
import type { SocialProfile } from "@/server/services/quick-intake/web-footprint";

function baseEnriched(overrides: Partial<EnrichedFootprint> = {}): EnrichedFootprint {
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
    enrichment: { apify: "SKIPPED", press: "EMPTY", totalMs: 0, errors: [] },
    ...overrides,
  };
}

describe("mentionsBrand (garde anti-faux-positif déterministe)", () => {
  it("insensible casse/diacritiques", () => {
    expect(mentionsBrand("La Fusée décolle au Cameroun", "la fusee")).toBe(true);
    expect(mentionsBrand("CIMENCAM inaugure une usine", "Cimencam")).toBe(true);
  });
  it("rejette les hits qui ne mentionnent pas la marque", () => {
    expect(mentionsBrand("Un autre acteur du ciment", "Cimencam")).toBe(false);
  });
  it("nom vide → false (jamais de match universel)", () => {
    expect(mentionsBrand("N'importe quoi", "")).toBe(false);
    expect(normalizeBrandToken("---")).toBe("");
  });
  // Fix prod 2026-07-19 : match de sous-chaîne → frontière de mot. Une marque
  // « a » scorait 100/100 presse sur des brèves incendie/cancer/football.
  it("frontière de mot : « a » ne matche plus les sous-chaînes ni le « à » français", () => {
    expect(mentionsBrand("Incendie en Gironde : le point sur la situation", "a")).toBe(false);
    expect(mentionsBrand("Cancer : elle témoigne de ses métastases", "a")).toBe(false);
    // « à » se normalise en « a » (NFD) — le token mono-lettre est refusé d'office.
    expect(mentionsBrand("Match Espagne-Argentine à Madrid", "a")).toBe(false);
  });
  it("nom court purement alphabétique (< 3) refusé, avec chiffre accepté en mot entier", () => {
    expect(mentionsBrand("Go Sport ouvre un magasin", "Go")).toBe(false);
    expect(mentionsBrand("La chaîne M6 annonce sa grille", "M6")).toBe(true);
    expect(mentionsBrand("L'autoroute M62 est fermée", "M6")).toBe(false);
  });
  it("mot entier exigé : Motion19 matche Motion19, pas ses sur-chaînes", () => {
    expect(mentionsBrand("Douala : Motion19 équipe le studio", "Motion19")).toBe(true);
    expect(mentionsBrand("Le projet Motion192 est lancé", "Motion19")).toBe(false);
  });
  it("multi-mots : séquence complète de tokens adjacents exigée", () => {
    expect(mentionsBrand("Il regarde la fusée monter", "La Fusée")).toBe(true);
    expect(mentionsBrand("La grande fusée décolle", "La Fusée")).toBe(false);
  });
});

describe("toSocialHandles", () => {
  it("drop WhatsApp, plateformes hors enum Prisma et profils sans handle", () => {
    const socials: SocialProfile[] = [
      { platform: "INSTAGRAM", url: "https://instagram.com/marque", handle: "@marque" },
      { platform: "WHATSAPP", url: "https://wa.me/237600000000", handle: "237600000000" },
      { platform: "FACEBOOK", url: "https://facebook.com/xyz", handle: null },
    ];
    const handles = toSocialHandles(socials);
    expect(handles).toEqual([{ platform: "INSTAGRAM", handle: "marque" }]);
  });
});

describe("splitGoogleNewsTitle", () => {
  it("sépare « Titre - Source »", () => {
    expect(splitGoogleNewsTitle("La marque lève 2 M$ - Jeune Afrique")).toEqual({
      title: "La marque lève 2 M$",
      sourceName: "Jeune Afrique",
    });
  });
  it("titre sans source → sourceName null", () => {
    expect(splitGoogleNewsTitle("Annonce")).toEqual({ title: "Annonce", sourceName: null });
  });
});

describe("mergeEnrichedFootprintIntoPillarE", () => {
  const socials: SocialProfile[] = [
    { platform: "INSTAGRAM", url: "https://instagram.com/marque", handle: "marque", followersHint: 900 },
    { platform: "TIKTOK", url: "https://tiktok.com/@marque", handle: "marque", followersHint: null },
  ];

  it("le compteur RÉEL (Apify) se pose à côté du hint dans webPresence.socials", () => {
    const enriched = baseEnriched({
      socials,
      followerCounts: [
        { platform: "INSTAGRAM", handle: "marque", followerCount: 12450, source: "APIFY", capturedAt: "2026-07-10T00:00:00.000Z" },
      ],
      enrichment: { apify: "LIVE", press: "EMPTY", totalMs: 0, errors: [] },
    });
    const { content } = mergeEnrichedFootprintIntoPillarE({}, enriched);
    const wp = content.webPresence as { socials: Array<Record<string, unknown>> };
    const ig = wp.socials.find((s) => s.platform === "INSTAGRAM")!;
    expect(ig.followerCount).toBe(12450);
    expect(ig.followerSource).toBe("APIFY");
    expect(ig.followersHint).toBe(900); // le hint reste, honnêteté de provenance
  });

  it("DEGRADED garde les hints — aucun followerCount fabriqué", () => {
    const enriched = baseEnriched({
      socials,
      enrichment: { apify: "DEGRADED", press: "EMPTY", totalMs: 0, errors: ["apify: VENDOR_OUTAGE"] },
    });
    const { content, inferredFields } = mergeEnrichedFootprintIntoPillarE({}, enriched);
    const wp = content.webPresence as { socials: Array<Record<string, unknown>> };
    expect(wp.socials.every((s) => s.followerCount === undefined)).toBe(true);
    expect(inferredFields).toEqual([]);
    expect(content.primaryChannel).toBeUndefined();
  });

  it("primaryChannel inféré UNIQUEMENT depuis un compteur réel, jamais depuis un hint", () => {
    const withReal = baseEnriched({
      socials,
      followerCounts: [
        { platform: "TIKTOK", handle: "marque", followerCount: 50_000, source: "APIFY", capturedAt: "2026-07-10T00:00:00.000Z" },
        { platform: "INSTAGRAM", handle: "marque", followerCount: 12_450, source: "APIFY", capturedAt: "2026-07-10T00:00:00.000Z" },
      ],
    });
    const { content, inferredFields } = mergeEnrichedFootprintIntoPillarE({}, withReal);
    expect(content.primaryChannel).toBe("TIKTOK");
    expect(inferredFields).toContain("primaryChannel");
  });

  it("ne JAMAIS écraser un primaryChannel existant", () => {
    const enriched = baseEnriched({
      socials,
      followerCounts: [
        { platform: "TIKTOK", handle: "marque", followerCount: 50_000, source: "APIFY", capturedAt: "2026-07-10T00:00:00.000Z" },
      ],
    });
    const { content, inferredFields } = mergeEnrichedFootprintIntoPillarE({ primaryChannel: "EVENT" }, enriched);
    expect(content.primaryChannel).toBe("EVENT");
    expect(inferredFields).toEqual([]);
  });

  it("presse posée dans webPresence.press ; vide → clé absente (état honnête)", () => {
    const withPress = baseEnriched({
      socials,
      press: [{ title: "La marque lève 2 M$", url: "https://news.example/a", sourceName: "Jeune Afrique", publishedAt: null }],
    });
    const { content } = mergeEnrichedFootprintIntoPillarE({}, withPress);
    expect((content.webPresence as Record<string, unknown>).press).toHaveLength(1);

    const noPress = mergeEnrichedFootprintIntoPillarE({}, baseEnriched({ socials }));
    expect((noPress.content.webPresence as Record<string, unknown>).press).toBeUndefined();
  });

  it("pas de kpis fabriqués (min 6 Zod — ADR-0046 no-magic-fallback)", () => {
    const enriched = baseEnriched({
      socials,
      followerCounts: [
        { platform: "INSTAGRAM", handle: "marque", followerCount: 12_450, source: "APIFY", capturedAt: "2026-07-10T00:00:00.000Z" },
      ],
    });
    const { content } = mergeEnrichedFootprintIntoPillarE({}, enriched);
    expect(content.kpis).toBeUndefined();
  });
});
