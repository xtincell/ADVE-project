/**
 * Lecture structurée du site — sur des formes RÉELLES rencontrées en
 * production, jamais sur des fixtures taillées pour passer.
 *
 * Signalement opérateur du 2026-07-31 : « les masterclass, formations et
 * newsletter ne sont relevées par aucun collecteur — c'est un problème, le
 * collecteur doit être parfait. » Mesuré le même jour, sur des sites déjà
 * téléchargés à chaque scan :
 *
 *   irawotalents.com → 5 `sameAs`, flux /feed/ (6 entrées), MailerLite
 *   motion19.com     → 0 JSON-LD, Mailchimp
 *   chococam.com     → 0 JSON-LD (page de domaine parqué)
 *   orange.cm        → 0 JSON-LD
 *
 * Le gisement est INÉGAL : ces tests figent autant la richesse que la pauvreté,
 * parce que c'est le cas pauvre qui fait dire des bêtises à un rapport.
 */

import { describe, it, expect } from "vitest";
import { extractStructuredSiteData, parseFeed } from "@/server/services/quick-intake/site-structured-data";

/** Forme WordPress/Yoast — celle d'irawotalents.com, @graph imbriqué. */
const HTML_RICHE = `<!doctype html><html lang="fr"><head>
<title>Irawo</title>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
  {"@type":"WebSite","url":"https://irawotalents.com/"},
  {"@type":"Organization","name":"Irawo","sameAs":[
    "http://www.facebook.com/irawotalents",
    "https://x.com/irawotalents",
    "http://www.instagram.com/irawotalents",
    "https://www.linkedin.com/company/11200805/",
    "https://www.youtube.com/c/irawotalents"]}]}</script>
<link rel="alternate" type="application/rss+xml" title="Flux" href="https://irawotalents.com/feed/" />
</head><body>
<form action="https://assets.mailerlite.com/x"><input type="email" name="fields[email]" /></form>
</body></html>`;

const HTML_PAUVRE = `<!doctype html><html><head><title>Motion19</title>
<meta property="og:title" content="Motion19" /></head><body>
<form action="https://motion19.us1.list-manage.com/subscribe/post"><input type="text" name="EMAIL" /></form>
</body></html>`;

describe("extractStructuredSiteData — ce que la marque déclare", () => {
  it("lit les réseaux revendiqués dans un @graph imbriqué", () => {
    const d = extractStructuredSiteData(HTML_RICHE);
    expect(d.declaredProfiles.map((p) => p.platform).sort()).toEqual([
      "FACEBOOK", "INSTAGRAM", "LINKEDIN", "TWITTER", "YOUTUBE",
    ]);
    // C'est la preuve d'appartenance la plus forte : la marque revendique ces
    // comptes sur son propre domaine. Elle tranche l'homonymie que ni la
    // recherche ni la corroboration ne peuvent lever.
    expect(d.hasStructuredData).toBe(true);
  });

  it("trouve le flux et le fournisseur d'emailing", () => {
    const d = extractStructuredSiteData(HTML_RICHE);
    expect(d.feedUrl).toBe("https://irawotalents.com/feed/");
    expect(d.hasNewsletter).toBe(true);
    expect(d.newsletterProvider).toBe("MailerLite");
  });

  it("reconnaît une newsletter SANS données structurées (cas Motion19)", () => {
    const d = extractStructuredSiteData(HTML_PAUVRE);
    expect(d.hasStructuredData).toBe(false);
    expect(d.declaredProfiles).toEqual([]);
    // Le champ email n'est pas typé `email`, mais le fournisseur est là : une
    // inscription EXISTE. Détecter l'un ou l'autre, pas seulement les deux.
    expect(d.hasNewsletter).toBe(true);
    expect(d.newsletterProvider).toBe("Mailchimp");
  });

  it("ne tombe jamais sur un JSON-LD cassé", () => {
    const d = extractStructuredSiteData(`<script type="application/ld+json">{ pas du json </script>`);
    expect(d.hasStructuredData).toBe(false);
    expect(d.declaredProfiles).toEqual([]);
  });

  it("n'invente RIEN depuis le vocabulaire de la page", () => {
    // « masterclass » dans un menu n'établit pas qu'une masterclass existe.
    // Seul un `@type: Event`/`Course` déclaré compte (ADR-0046).
    const d = extractStructuredSiteData(
      `<html><body><nav><a href="/x">Nos masterclass et formations</a></nav><h1>Événements</h1></body></html>`,
    );
    expect(d.events).toEqual([]);
    expect(d.courses).toEqual([]);
    expect(d.hasStructuredData).toBe(false);
  });

  it("relève événements et formations quand ils sont DÉCLARÉS", () => {
    const d = extractStructuredSiteData(`<script type="application/ld+json">
      [{"@type":"Event","name":"Masterclass Talents 2026","startDate":"2026-09-12","location":{"@type":"Place","name":"Abidjan"}},
       {"@type":"Course","name":"Parcours vente","provider":{"@type":"Organization","name":"Irawo"}}]
    </script>`);
    expect(d.events).toEqual([{ name: "Masterclass Talents 2026", startDate: "2026-09-12", location: "Abidjan" }]);
    expect(d.courses).toEqual([{ name: "Parcours vente", provider: "Irawo" }]);
  });
});

describe("parseFeed — l'activité réelle, telle que publiée", () => {
  const RSS = `<rss><channel>
    <item><title>B&#226;tir des entreprises : Mode d&#8217;emploi</title><link>https://x/1</link><pubDate>Mon, 13 Jul 2026 09:00:00 +0000</pubDate></item>
    <item><title>Irawo re&#231;oit le prix Cartier</title><link>https://x/2</link><pubDate>Mon, 30 Mar 2026 09:00:00 +0000</pubDate></item>
    <item><title>Irawo &#038; LemFi s&#8217;associent</title><link>https://x/3</link><pubDate>Tue, 16 Sep 2025 09:00:00 +0000</pubDate></item>
  </channel></rss>`;

  it("décode les entités numériques — elles vont à l'écran client", () => {
    const f = parseFeed(RSS);
    // WordPress publie l'apostrophe en `&#8217;` et l'esperluette en `&#038;` :
    // sans décodage, le rapport affichait « Irawo &#038; LemFi s&#8217;associent ».
    expect(f.entries[0]!.title).toBe("Bâtir des entreprises : Mode d’emploi");
    expect(f.entries[2]!.title).toBe("Irawo & LemFi s’associent");
  });

  it("date la dernière parution et calcule une cadence médiane", () => {
    const f = parseFeed(RSS);
    expect(f.lastPublishedAt?.slice(0, 10)).toBe("2026-07-13");
    expect(f.medianDaysBetweenPosts).toBeGreaterThan(100);
  });

  it("n'annonce PAS de cadence sous deux parutions datées", () => {
    // Une régularité ne se déduit pas d'un point unique.
    const f = parseFeed(`<rss><channel><item><title>Seul</title><pubDate>Mon, 13 Jul 2026 09:00:00 +0000</pubDate></item></channel></rss>`);
    expect(f.entries).toHaveLength(1);
    expect(f.medianDaysBetweenPosts).toBeNull();
  });

  it("lit aussi l'Atom, et un flux sans dates ne prétend rien", () => {
    const f = parseFeed(`<feed><entry><title>Note</title><link href="https://x/a"/></entry></feed>`);
    expect(f.entries[0]).toMatchObject({ title: "Note", link: "https://x/a" });
    expect(f.lastPublishedAt).toBeNull();
    expect(f.medianDaysBetweenPosts).toBeNull();
  });
});
