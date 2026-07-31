/**
 * V1 « faits épinglés » — un fait mesuré ne s'évapore jamais.
 *
 * Les deux scénarios de ce fichier se sont produits EN PRODUCTION le
 * 2026-07-31, à une heure d'intervalle, sur la même marque :
 *
 *   1. Rescan v4 : `press: EMPTY` (variance de recherche) → les 3 retombées
 *      réelles gate-validées (CANAL+ Côte d'Ivoire, Mylène Flicka, ANKA)
 *      s'évaporaient du rapport.
 *   2. Rescan v3 : la découverte a élu l'HOMONYME (`irawo.net`, association de
 *      Cotonou) — si un merge naïf avait alors « conservé » la presse
 *      d'irawotalents.com, il aurait contaminé l'entité fausse avec les faits
 *      de la vraie.
 *
 * D'où la double règle : bloc frais vide → hérite du précédent ; site élu
 * différent → zéro report.
 */

import { describe, it, expect } from "vitest";
import { mergeFootprints } from "@/server/services/quick-intake/footprint-merge";
import type { EnrichedFootprint } from "@/server/services/quick-intake/footprint-types";

const PRESS = [
  { title: "IRAWO s'associe avec CANAL+ Côte d'Ivoire", url: "https://x/1", sourceName: "presse", publishedAt: null },
  { title: "Mylène Flicka porte la voix des jeunes étoiles", url: "https://x/2", sourceName: "presse", publishedAt: null },
];

function fp(over: Partial<EnrichedFootprint>): EnrichedFootprint {
  return {
    site: { url: "https://irawotalents.com", reachable: true, title: "Irawo", description: null, ogImage: null, language: "fr" },
    socials: [],
    articles: [],
    channels: [],
    collectedAt: "2026-07-31T00:00:00.000Z",
    errors: [],
    followerCounts: [],
    press: [],
    enrichment: { apify: "LIVE", press: "LIVE", errors: [], totalMs: 0 },
    ...over,
  } as EnrichedFootprint;
}

describe("mergeFootprints — le frais fait foi, le vide hérite", () => {
  it("la presse évaporée par une re-collecte vide est conservée, avec sa capture", () => {
    const previous = fp({ press: PRESS });
    const fresh = fp({ press: [] });
    const merged = mergeFootprints(previous, fresh);
    expect(merged.press).toEqual(PRESS);
  });

  it("une presse fraîche non-vide REMPLACE l'ancienne (l'état actuel fait foi)", () => {
    const nouvelle = [{ title: "Irawo lève des fonds", url: "https://x/3", sourceName: "presse", publishedAt: null }];
    const merged = mergeFootprints(fp({ press: PRESS }), fp({ press: nouvelle }));
    expect(merged.press).toEqual(nouvelle);
  });

  it("une panne Apify ne réefface pas le dernier relevé d'audience réel", () => {
    const counts = [{ platform: "INSTAGRAM", handle: "irawotalents", followerCount: 24156, source: "APIFY", capturedAt: "2026-07-31" }];
    const merged = mergeFootprints(
      fp({ followerCounts: counts as never }),
      fp({ followerCounts: [] }),
    );
    expect(merged.followerCounts).toEqual(counts);
  });

  it("structured/feed absents du frais héritent du précédent (mur anti-bot passager)", () => {
    const structured = { declaredProfiles: [], feedUrl: "https://irawotalents.com/feed/", hasNewsletter: true, newsletterProvider: "MailerLite", schemaTypes: [], events: [], courses: [], hasStructuredData: true };
    const merged = mergeFootprints(fp({ structured: structured as never }), fp({}));
    expect(merged.structured).toEqual(structured);
  });

  it("GARDE D'IDENTITÉ : site élu différent ⇒ zéro report (le cas irawo.net)", () => {
    // Si la découverte élit un autre host, les faits de l'ancienne entité ne
    // doivent PAS contaminer la nouvelle — même s'ils sont « plus riches ».
    const previous = fp({ press: PRESS });
    const fresh = fp({
      site: { url: "https://irawo.net", reachable: true, title: "Association Irawo", description: null, ogImage: null, language: "fr" },
      press: [],
    });
    const merged = mergeFootprints(previous, fresh);
    expect(merged.press).toEqual([]);
    expect(merged.site?.url).toBe("https://irawo.net");
  });

  it("sans précédent, le frais passe tel quel", () => {
    const fresh = fp({ press: PRESS });
    expect(mergeFootprints(null, fresh)).toBe(fresh);
  });
});
