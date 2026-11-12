import { describe, it, expect } from "vitest";
import type { JehutyFeedItem } from "@/lib/types/jehuty";
import { selectGazetteEdition, gazetteItemTouchesPillar } from "@/lib/jehuty-editorial";
import { mapExternalArticleToFeedItem, mapSignalToFeedItem, signalSourceLinks } from "@/server/services/jehuty/mappers";

describe("Gazette editorial receipt", () => {
  const date = new Date("2026-11-05T12:00:00Z");
  const article = mapExternalArticleToFeedItem({ title: "Une enquête locale", link: "https://presse.example/enquete", source: "Presse", imageUrl: "https://presse.example/photo.jpg" }, "spawt", date, undefined);
  const internal = Array.from({ length: 86 }, (_, i) => ({ ...mapSignalToFeedItem({ id: `signal-${i}`, type: "WEAK_SIGNAL_ALERT", strategyId: "spawt", createdAt: date, data: { thesis: "Une hypothèse interne.", urgency: "CRITICAL", confidence: 0.95 } }, undefined), priority: 1 }));
  it("receives the press article and its image even when 86 internal signals would fill the 80 slots", () => {
    const edition = selectGazetteEdition([...internal, article], 80);
    expect(edition).toHaveLength(80);
    expect(edition[0]).toMatchObject({ externalUrl: article.externalUrl, imageUrl: article.imageUrl });
    expect(internal).toHaveLength(86);
  });
  it("honours an explicit editorial pin ahead of automatic press priority", () => {
    const pinned = { ...internal[0]!, curation: { action: "PINNED" as const } };
    expect(selectGazetteEdition([article, pinned])[0]?.id).toBe(pinned.id);
  });
  it("does not imply a pillar impact from an unrelated ADVE anchor", () => {
    const contextual: JehutyFeedItem = { ...article, articleContext: { articleUrl: article.externalUrl!, linkedAnalyses: [], recommendations: [], batchIds: [], brandContext: [{ pillarKey: "A", field: "publicCible", label: "Public", text: "Le public de la marque", source: "ADVE" as const, stale: false }] } };
    expect(gazetteItemTouchesPillar(contextual, "a")).toBe(false);
    contextual.articleContext!.linkedAnalyses = [{ id: "analysis", title: "Analyse", text: "Observation sourcée", sourceUrl: article.externalUrl!, pillarKeys: ["V"], createdAt: date.toISOString() }];
    expect(gazetteItemTouchesPillar(contextual, "v")).toBe(true);
  });
  it("labels a collection date separately from a publication date", () => {
    expect(article.dateKind).toBe("COLLECTED");
    expect(mapExternalArticleToFeedItem({ title: "Enquête", link: article.externalUrl!, publishedAt: "2026-11-04" }, "spawt", date, undefined).dateKind).toBe("PUBLISHED");
  });
  it("only exposes real HTTP source links and keeps complete long URLs", () => {
    const longUrl = `https://presse.example/article?reference=${"a".repeat(400)}`;
    expect(signalSourceLinks({ sourceUrl: "javascript:alert(1)", sources: [{ url: longUrl, title: "Enquête complète" }, "https://secret:password@private.example/"], evidence: [{ sourceUrl: longUrl, title: "Enquête complète" }] })).toEqual([{ url: longUrl, title: "Enquête complète" }]);
    expect(signalSourceLinks({ thesis: "Presse célèbre", confidence: 0.95 })).toEqual([]);
  });
});
