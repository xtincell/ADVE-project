import { describe, it, expect } from "vitest";
import { parseRssItems, buildDigestFromItems } from "@/server/services/seshat/external-feeds/rss";
import { feedSourcesFor } from "@/server/services/seshat/external-feeds/feed-sources";

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel>
  <item><title>Orange lance le mobile money au Cameroun</title><link>https://ex.com/1</link><pubDate>Wed, 10 Jun 2026 10:00:00 GMT</pubDate><description><![CDATA[<b>Lancement</b> du service.]]></description></item>
  <item><title>MTN mobile money en hausse au Cameroun</title><link>https://ex.com/2</link><description>Croissance</description></item>
  <item><title>Wave casse les prix du mobile money</title><link>https://ex.com/3</link></item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
  <entry><title>Fintech Atom test</title><link rel="alternate" href="https://ex.com/a"/><updated>2026-06-10T10:00:00Z</updated><summary>Résumé</summary></entry>
</feed>`;

describe("External feeds — RSS déterministe (ADR-0099 suite)", () => {
  it("parse le RSS 2.0 (titre, lien, description, CDATA nettoyé)", () => {
    const items = parseRssItems(RSS);
    expect(items.length).toBe(3);
    expect(items[0]!.title).toBe("Orange lance le mobile money au Cameroun");
    expect(items[0]!.link).toBe("https://ex.com/1");
    expect(items[0]!.summary).toContain("Lancement");
    expect(items[0]!.summary).not.toContain("<b>");
  });

  it("parse l'Atom (link href)", () => {
    const items = parseRssItems(ATOM);
    expect(items.length).toBe(1);
    expect(items[0]!.title).toBe("Fintech Atom test");
    expect(items[0]!.link).toBe("https://ex.com/a");
  });

  it("ne throw jamais sur entrée vide / invalide", () => {
    expect(parseRssItems("")).toEqual([]);
    expect(parseRssItems("<html>pas du rss</html>")).toEqual([]);
  });

  it("construit un digest déterministe (thèmes récurrents + weak signals)", () => {
    const items = parseRssItems(RSS);
    const digest = buildDigestFromItems(items, { sector: "fintech" });
    // "mobile", "money", "cameroun" apparaissent ≥ 2 fois.
    const trends = digest.macroSignals.map((m) => m.trend);
    expect(trends).toContain("mobile");
    expect(trends).toContain("money");
    expect(digest.weakSignals.length).toBeGreaterThan(0);
    expect(digest.weakSignals[0]!.impactCategory).toBe("fintech");
  });

  it("feedSourcesFor construit une URL Google News RSS sans clé", () => {
    const [src] = feedSourcesFor("CM", "fintech", "Cameroun");
    expect(src!.url).toContain("news.google.com/rss/search");
    expect(src!.url).toContain("gl=CM");
    expect(src!.url).toMatch(/q=fintech/i);
  });
});
