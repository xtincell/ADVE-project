import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import type { RssItem } from "@/server/services/seshat/external-feeds/rss";

const net = vi.hoisted(() => ({ rss: vi.fn(), search: vi.fn(), fetch: vi.fn() }));
vi.mock("@/server/services/seshat/external-feeds/rss", async importOriginal => ({
  ...await importOriginal<typeof import("@/server/services/seshat/external-feeds/rss")>(), fetchRssText: net.rss,
}));
vi.mock("@/server/services/seshat/web-search", () => ({ braveWebSearch: net.search }));
vi.mock("@/server/services/artemis/market-research/web-fetcher", () => ({ fetchSourceUrl: net.fetch }));
import { buildBrandFeedTopics, getOrBuildBrandFeed, loadWatchSubjects, rankBrandFeedItems } from "@/server/services/seshat/external-feeds/brand-feed";
import { deriveWatchContext } from "@/server/services/seshat/external-feeds/watch-subjects";

const NOW = Date.parse("2026-11-05T12:00:00Z");
const brand = { strategyId: "test-brand", name: "Lumen", countryCode: "FR", sector: "Imaging", extraSubjects: ["photographie Lyon", "Robotique Tokyo"] };
const context = deriveWatchContext({
  pillarA: { publicCible: "Photographes professionnels" },
  pillarD: { personas: [{ actorRoles: ["COMMUNICATION_AUDIENCE"], csp: "photographes", location: "Lyon" }] },
  countryName: "France",
});
const topics = buildBrandFeedTopics(brand, context);
const item = (title: string, ageDays = 1): RssItem => ({
  title, summary: "", link: `https://journal.example/${encodeURIComponent(title)}`, pubDate: new Date(NOW - ageDays * 86_400_000).toISOString(),
});
const xml = (items: RssItem[]) => `<rss><channel>${items.map(i => `<item><title>${i.title}</title><link>${i.link}</link><pubDate>${i.pubDate}</pubDate><description>${i.summary}</description></item>`).join("")}</channel></rss>`;

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  net.rss.mockResolvedValue(null);
  net.fetch.mockResolvedValue({ ok: false });
});
afterEach(() => vi.useRealTimers());

describe("received audience coverage, independent of global sector volume", () => {
  it("reserves actual local coverage despite a flood of global sector and brand news", () => {
    const local = Array.from({ length: 8 }, (_, n) => item(`Photographes de Lyon : rencontre ${n}`, n + 1));
    const global = Array.from({ length: 20 }, (_, n) => item(`Imaging Imaging : salon international ${n}`));
    const mentions = Array.from({ length: 12 }, (_, n) => item(`Lumen annonce un produit ${n}`));
    const selected = rankBrandFeedItems([...global, ...mentions, ...local], topics, { now: NOW });
    expect(selected).toHaveLength(12);
    expect(selected.filter(s => s.relevanceScope === "LOCAL")).toHaveLength(6);
    expect(selected.filter(s => s.relevanceScope === "BRAND")).toHaveLength(6);
    expect(new Set(selected.map(s => s.link)).size).toBe(12);
  });

  it("keeps every available local item when there are fewer than the reserved slots, then exploration", () => {
    const selected = rankBrandFeedItems([
      ...Array.from({ length: 20 }, (_, n) => item(`Imaging Dubai industrie ${n}`)),
      item("Photographes à Lyon : une exposition"), item("Photographie à Lyon : le festival"),
    ], topics, { now: NOW });
    expect(selected.slice(0, 2).map(s => s.relevanceScope)).toEqual(["LOCAL", "LOCAL"]);
    expect(selected.filter(s => s.relevanceScope === "EXPLORATION")).toHaveLength(10);
  });

  it("does not call global results local merely because the search edition is France", () => {
    const selected = rankBrandFeedItems([item("Imaging Dubai industrie"), item("Photographes à Tokyo")], topics, { now: NOW });
    expect(selected).toHaveLength(2);
    expect(selected.every(s => s.relevanceScope !== "LOCAL")).toBe(true);
    expect(selected.find(s => s.title.includes("Dubai"))?.relevanceScope).toBe("EXPLORATION");
  });

  it("does not admit a local weather story just because it mentions the city", () => {
    expect(rankBrandFeedItems([item("La météo à Lyon et en France")], topics, { now: NOW })).toEqual([]);
  });

  it("retains the received excerpt proving locality when syndicated duplicates differ", () => {
    const short = item("Photographes : nouvelle exposition");
    const full = { ...short, summary: "L'exposition ouvre cette semaine à Lyon." };
    const selected = rankBrandFeedItems([short, full], topics, { now: NOW });
    expect(selected).toHaveLength(1);
    expect(selected[0]?.relevanceScope).toBe("LOCAL");
    expect(selected[0]?.summary).toBe(full.summary);
  });

  it("does not use publisher names or unrelated manual keywords to claim local audience relevance", () => {
    const publisherOnly = { ...item("Le budget municipal augmente - Photographes Lyon"), source: "Photographes Lyon", summary: "Le budget municipal augmente - Photographes Lyon Photographes Lyon" };
    expect(rankBrandFeedItems([publisherOnly], topics, { now: NOW })).toEqual([]);
    const unrelated = item("Robotique Tokyo annonce un partenariat à Lyon");
    expect(rankBrandFeedItems([unrelated], topics, { now: NOW })[0]?.relevanceScope).toBe("WATCH");
    const noLocalProof = { ...item("Photographes à Tokyo - Lyon"), source: "Lyon", summary: "Photographes à Tokyo - Lyon Lyon" };
    expect(rankBrandFeedItems([noLocalProof], topics, { now: NOW })[0]?.relevanceScope).toBe("CONTEXT");
  });

  it("recognizes word-family variations without importing a brand-specific vocabulary", () => {
    const c = deriveWatchContext({ pillarA: { publicCible: "Restaurateurs" }, countryName: "France" });
    const t = buildBrandFeedTopics({ name: "Table", sector: null }, c);
    expect(rankBrandFeedItems([item("Les restaurants en France recrutent")], t, { now: NOW })[0]?.relevanceScope).toBe("LOCAL");
  });

  it("keeps compound communities intact and distinguishes national context from a declared city", () => {
    const c = deriveWatchContext({
      pillarA: { publicCible: "Local Guides" },
      pillarD: { personas: [{ csp: "photographes", location: "Établissements situés à Lyon, France" }] },
      countryName: "France",
    });
    const t = buildBrandFeedTopics({ name: "Table", sector: null }, c);
    expect(c.locations).toEqual(["Lyon", "France"]);
    expect(t.find(s => s.kind === "AUDIENCE")?.terms).toEqual(["local guides"]);
    expect(rankBrandFeedItems([item("Les guides religieux à Lyon")], t, { now: NOW })).toEqual([]);
    expect(rankBrandFeedItems([item("Local Guides : rencontre en France")], t, { now: NOW })[0]?.relevanceScope).toBe("CONTEXT");
    expect(rankBrandFeedItems([item("Local Guides : rencontre à Lyon")], t, { now: NOW })[0]?.relevanceScope).toBe("LOCAL");
  });

  it("preserves an explicit watch subject outside the brand country", () => {
    const selected = rankBrandFeedItems([item("Robotique Tokyo : un atelier ouvre")], topics, { now: NOW });
    expect(selected[0]?.relevanceScope).toBe("WATCH");
    expect(selected[0]?.matchedSubjects).toContain("Robotique Tokyo");
    expect(topics.map(t => t.query)).toContain("Robotique Tokyo");
  });

  it("rejects stale/future news, ranks recent local news before archive, and invents no date for undated material", () => {
    const undated = { ...item("Photographes Lyon : exposition sans date"), pubDate: "" };
    const selected = rankBrandFeedItems([
      item("Photographes Lyon : archive trop ancienne", 121),
      item("Photographes Lyon : date future erronée", -3),
      item("Photographes Lyon Imaging photographie : archive", 80),
      item("Photographes Lyon : actualité", 2), undated,
    ], topics, { now: NOW });
    expect(selected.map(s => s.title)).toEqual([
      "Photographes Lyon : actualité", "Photographes Lyon Imaging photographie : archive", undated.title,
    ]);
    expect(selected[2]?.pubDate).toBe("");
  });
});

describe("collector reads ADVE behind the manual editor, without rewriting it", () => {
  function database() {
    return {
      pillar: { findMany: vi.fn().mockResolvedValue([
        { key: "a", content: { publicCible: "Photographes professionnels" } },
        { key: "d", content: { personas: [{ actorRoles: ["COMMUNICATION_AUDIENCE"], csp: "photographes", location: "Lyon" }] } },
      ]) },
      knowledgeEntry: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
    };
  }

  it("uses existing manual choices plus bounded ADVE searches and prioritizes their real local results", async () => {
    const db = database();
    const manual = ["Robotique Tokyo", "Lumen"];
    const watch = await loadWatchSubjects(db as unknown as PrismaClient, brand.strategyId, { watchSubjects: manual });
    expect(watch).toEqual({ source: "MANUAL", subjects: manual });
    net.rss.mockImplementation(async (url: string) => {
      const q = new URL(url).searchParams.get("q") ?? "";
      return q.includes("photographes") ? xml([item("Photographes à Lyon : exposition locale")]) :
        q === "Imaging" ? xml(Array.from({ length: 15 }, (_, n) => item(`Imaging industrie mondiale ${n}`))) : null;
    });
    const result = await getOrBuildBrandFeed(db as unknown as PrismaClient, { ...brand, extraSubjects: watch.subjects });
    expect(db.pillar.findMany).toHaveBeenCalledOnce();
    expect(result.subjects).toContain("Robotique Tokyo");
    expect(result.subjects.some(s => s.includes("photographes") && s.includes("France"))).toBe(true);
    expect(net.rss.mock.calls.length).toBeLessThanOrEqual(16);
    expect(result.articles[0]?.title).toBe("Photographes à Lyon : exposition locale");
    expect(result.articles[0]?.relevanceScope).toBe("LOCAL");
    expect(manual).toEqual(["Robotique Tokyo", "Lumen"]);
    expect(db.knowledgeEntry.create.mock.calls[0]![0].data.data.policyVersion).toBeTruthy();
  });

  it("invalidates the old flat-ranking cache and a cache whose ADVE scope changed", async () => {
    const db = database();
    net.rss.mockResolvedValue(xml([item("Imaging industrie mondiale")]));
    db.knowledgeEntry.findFirst.mockResolvedValue({ data: { items: [{ title: "Old cache" }], subjects: topics.map(t => t.query) }, createdAt: new Date(NOW) });
    expect((await getOrBuildBrandFeed(db as unknown as PrismaClient, brand)).cached).toBe(false);
    const saved = db.knowledgeEntry.create.mock.calls[0]![0].data.data;
    db.knowledgeEntry.findFirst.mockResolvedValue({ data: saved, createdAt: new Date(NOW) });
    net.rss.mockClear();
    expect((await getOrBuildBrandFeed(db as unknown as PrismaClient, brand)).cached).toBe(true);
    expect(net.rss).not.toHaveBeenCalled();
    db.pillar.findMany.mockResolvedValue([{ key: "d", content: { personas: [{ csp: "photographes", location: "Marseille" }] } }]);
    expect((await getOrBuildBrandFeed(db as unknown as PrismaClient, brand)).cached).toBe(false);
    expect(net.rss).toHaveBeenCalled();
  });

  it("never fills a failed collection with fabricated local articles or a stale digest", async () => {
    const db = database();
    net.rss.mockResolvedValue(xml([item("Imaging archive ancienne", 200)]));
    const result = await getOrBuildBrandFeed(db as unknown as PrismaClient, brand);
    expect(result.articles).toEqual([]);
    expect(db.knowledgeEntry.create).not.toHaveBeenCalled();
  });
});
