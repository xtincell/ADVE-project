import { describe, it, expect, vi } from "vitest";
import { mapDiagnosticToFeedItem, mapExternalArticleToFeedItem, mapSignalToFeedItem } from "@/server/services/jehuty/mappers";
import { parseRssItems, toFeedItems } from "@/server/services/seshat/external-feeds/rss";
const net = vi.hoisted(() => ({ search: vi.fn(), fetch: vi.fn() }));
vi.mock("@/server/services/seshat/web-search", () => ({ braveWebSearch: net.search }));
vi.mock("@/server/services/artemis/market-research/web-fetcher", () => ({ fetchSourceUrl: net.fetch }));
import { enrichArticlePreview } from "@/server/services/seshat/external-feeds/brand-feed";

describe("Gazette preserves source content through the reader", () => {
  it("never uses a cut paragraph as a headline and preserves its last sentence", () => {
    const observation = "Google Maps restera le principal point de comparaison fonctionnel, ce qui forcera la marque à gagner sur la pertinence communautaire. ".repeat(7) + "Vérifier la recommandation locale.";
    const item = mapSignalToFeedItem({ id: "a", strategyId: "s", type: "WEAK_SIGNAL_ALERT", createdAt: new Date(), data: { thesis: observation, pillar: "v" } }, undefined);
    expect(item.title.length).toBeLessThanOrEqual(110);
    expect(item.title).not.toMatch(/commu$/);
    expect(item.observation).toContain("Vérifier la recommandation locale.");
    expect(item.summary).toMatch(/…$/);
    expect(item.source).not.toContain("WEAK_SIGNAL_ALERT");
  });
  it("keeps diagnosis and prescriptions, not just the diagnostic count", () => {
    const item = mapDiagnosticToFeedItem({ id: "d", pillarFocus: null, createdAt: new Date(), data: { symptoms: 1, diagnosis: [{ pillar: "v", issue: "Marge négative", rootCause: "Coûts supérieurs au revenu" }], prescriptions: ["Revoir les coûts variables"] } }, undefined, "s");
    expect(item.observation).toContain("Coûts supérieurs au revenu");
    expect(item.observation).toContain("Revoir les coûts variables");
  });
  it("preserves the publisher image, summary and URL across RSS and feed mapping", () => {
    const xml = '<rss><item><title>Les restaurants changent de modèle - Presse</title><link>https://press.example/a</link><source url="https://press.example">Presse</source><description>&lt;img src=&quot;https://press.example/img.jpg&quot;&gt;Une enquête sur le modèle local.</description></item></rss>';
    const rss = parseRssItems(xml);
    expect(rss[0]?.imageUrl).toBe("https://press.example/img.jpg");
    const feed = toFeedItems(rss)[0]!;
    expect(feed.sourceUrl).toBe("https://press.example");
    const item = mapExternalArticleToFeedItem(feed, "s", new Date(), undefined);
    expect(item.imageUrl).toBe("https://press.example/img.jpg");
    expect(item.observation).toContain("Une enquête sur le modèle local.");
    expect(item.observation).not.toContain("<img");
    expect(item.externalUrl).toBe(feed.link);
  });
  it("only resolves a Google discovery link to the matching publisher article", async () => {
    net.search.mockResolvedValue({ status: "OK", hits: [{ title: "Les restaurants changent de modèle", url: "https://press.example/report", description: "" }] });
    net.fetch.mockResolvedValue({ ok: true, contentType: "text/html", text: '<meta property="og:image" content="https://press.example/photo.jpg"><meta name="description" content="Résumé reçu du journal.">' });
    const result = await enrichArticlePreview({ title: "Les restaurants changent de modèle", link: "https://news.google.com/rss/articles/test", sourceUrl: "https://press.example" });
    expect(result.link).toBe("https://press.example/report");
    expect(result.discoveryUrl).toContain("news.google.com");
    expect(result.imageUrl).toBe("https://press.example/photo.jpg");
    expect(result.summary).toBe("Résumé reçu du journal.");
    net.fetch.mockClear();
    net.search.mockResolvedValue({ status: "OK", hits: [{ title: "Les restaurants changent de modèle", url: "https://wrong.example/report" }] });
    const original = { title: "Les restaurants changent de modèle", link: "https://news.google.com/rss/articles/test", sourceUrl: "https://press.example" };
    expect(await enrichArticlePreview(original)).toEqual(original);
    expect(net.fetch).not.toHaveBeenCalled();
  });
});
