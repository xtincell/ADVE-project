import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
const net = vi.hoisted(() => ({ search: vi.fn(), fetch: vi.fn() }));
vi.mock("@/server/services/seshat/web-search", () => ({ braveWebSearch: net.search }));
vi.mock("@/server/services/artemis/market-research/web-fetcher", () => ({ fetchSourceUrl: net.fetch }));
import { enrichArticlePreview, loadWatchSubjects } from "@/server/services/seshat/external-feeds/brand-feed";

beforeEach(() => vi.resetAllMocks());

describe("ADVE subjects reach the existing Gazette collection", () => {
  it("loads A alongside D/V/E and derives an audience when legacy E fields are absent", async () => {
    const findMany = vi.fn().mockResolvedValue([
      { key: "a", content: { publicCible: "Communication : suiveurs de vidéos food à Abidjan. Partenaires : créateurs food et Local Guides. Clients : restaurateurs." } },
      { key: "d", content: { personas: [{ name: "Grâce", actorRoles: ["COMMUNICATION_AUDIENCE", "USER"] }] } },
      { key: "e", content: { superfanPortrait: { personaRef: "traffic" } } },
    ]);
    const result = await loadWatchSubjects({ pillar: { findMany } } as unknown as PrismaClient, "spawt-strategy-001", {}, "Côte d'Ivoire");
    expect(findMany.mock.calls[0]![0].where.key.in).toContain("a");
    expect(result.source).toBe("DERIVED");
    expect(result.subjects.some(s => s.includes("videos food Abidjan"))).toBe(true);
    expect(result.subjects.some(s => s.includes("restaurateurs"))).toBe(true);
  });

  it("uses manual subjects without depending on DB availability", async () => {
    expect(await loadWatchSubjects({} as PrismaClient, "brand", { watchSubjects: ["Cuisine Abidjan"] }))
      .toEqual({ subjects: ["Cuisine Abidjan"], source: "MANUAL" });
  });
});

describe("bounded publisher previews", () => {
  const article = { title: "Les restaurants changent de modèle", link: "https://press.example/article" };
  it("preserves an actual long image URL and the complete received description", async () => {
    const image = `https://press.example/photo.jpg?signature=${"a".repeat(400)}`;
    const description = "L'expérience des restaurateurs et de leurs communautés. ".repeat(12);
    net.fetch.mockResolvedValue({ ok: true, contentType: "text/html", text: `<meta property="og:image" content="${image}"><meta name="description" content="${description}">` });
    const result = await enrichArticlePreview(article);
    expect(result.imageUrl).toBe(image);
    expect(result.summary).toBe(description.trim());
    expect(net.search).not.toHaveBeenCalled();
    expect(net.fetch).toHaveBeenCalledOnce();
  });

  it("does not discard a useful summary because the image URL is invalid", async () => {
    net.fetch.mockResolvedValue({ ok: true, contentType: "text/html", text: '<meta property="og:image" content="https://["><meta name="description" content="Enquête du journal.">' });
    expect(await enrichArticlePreview(article)).toEqual({ ...article, summary: "Enquête du journal." });
  });

  it("retains a rich RSS excerpt instead of replacing it with shorter metadata", async () => {
    net.fetch.mockResolvedValue({ ok: true, contentType: "text/html", text: '<meta name="description" content="Bref aperçu.">' });
    const original = { ...article, summary: "Une analyse détaillée du marché local avec ses observations et sa conclusion." };
    expect(await enrichArticlePreview(original)).toEqual(original);
  });

  it("skips malformed search hits and preserves the resolved publisher URL even when its preview is unavailable", async () => {
    net.search.mockResolvedValue({ status: "OK", hits: [
      { title: article.title, url: "malformed" },
      { title: article.title, url: "https://unrelated.example/article" },
      { title: article.title, url: article.link },
    ] });
    net.fetch.mockResolvedValue({ ok: false });
    const discovery = "https://news.google.com/rss/articles/test";
    const result = await enrichArticlePreview({ ...article, link: discovery, source: "Le Journal", sourceUrl: "https://press.example" });
    expect(result.link).toBe(article.link);
    expect(result.discoveryUrl).toBe(discovery);
    expect(result.source).toBe("Le Journal");
    expect(net.fetch).toHaveBeenCalledWith(article.link);
    expect(result.summary).toBeUndefined();
    expect(result.imageUrl).toBeUndefined();
  });
});
