import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  digests: vi.fn(), signals: vi.fn(), pillars: vi.fn(), recommendations: vi.fn(),
  createSignal: vi.fn(), curate: vi.fn(), publish: vi.fn(), transaction: vi.fn(), generateBatch: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: {
  knowledgeEntry: { findMany: mocks.digests },
  signal: { findMany: mocks.signals },
  pillar: { findMany: mocks.pillars },
  recommendation: { findMany: mocks.recommendations },
  $transaction: mocks.transaction,
} }));
vi.mock("@/server/services/notoria/engine", () => ({ generateBatch: mocks.generateBatch }));

import {
  articleNotoriaInputSchema, readArticleBrandInterpretations, triggerArticleNotoria,
} from "@/server/services/jehuty/article-notoria";

const strategyId = "brand-a";
const articleUrl = "https://publisher.example/news/foodies?edition=ci";
const article = { link: articleUrl, title: "Les créateurs culinaires organisent leurs communautés",
  source: "La Presse locale", publishedAt: "2026-11-05T08:00:00.000Z",
  summary: "Des créateurs ont ouvert un rendez-vous public à Abidjan." };
const digest = (extra = {}) => ({ id: "digest-1", market: `brand:${strategyId}`, originStrategyId: null, data: { items: [article] }, ...extra });
const input = { strategyId, articleUrl, userId: "user-a" };
const date = new Date("2026-11-05T09:00:00.000Z");
const signal = (id: string, data: unknown, type = "WEAK_SIGNAL_ALERT", owner = strategyId) =>
  ({ id, strategyId: owner, type, data, createdAt: date });
const receipt = (batchId: string, url = articleUrl) => signal(`receipt-${batchId}`, {
  schema: "gazette-article-notoria-v1", strategyId, batchId, article: { url, digestId: "digest-1" },
}, "JEHUTY_ARTICLE_NOTORIA");
const reco = (id: string, batchId: string, owner = strategyId) => ({
  id, batchId, strategyId: owner, targetPillarKey: "i", targetField: "catalogueParCanal",
  explain: "Examiner un rendez-vous éditorial avec les créateurs partenaires.", status: "PENDING", createdAt: date,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.digests.mockResolvedValue([digest()]);
  mocks.signals.mockResolvedValue([]);
  mocks.pillars.mockResolvedValue([]);
  mocks.recommendations.mockResolvedValue([]);
  mocks.generateBatch.mockResolvedValue({ batchId: "batch-1", totalRecos: 2, errors: [], autoApplied: 0, recosByPillar: {} });
  mocks.transaction.mockImplementation(async (callback) => callback({
    signal: { create: mocks.createSignal }, jehutyCuration: { upsert: mocks.curate },
    recommendation: { updateMany: mocks.publish },
  }));
});

describe("article → Notoria, existing governed endpoint", () => {
  it("requires exactly one stored source, and discards arbitrary content supplied by clients", () => {
    expect(articleNotoriaInputSchema.safeParse({ strategyId }).success).toBe(false);
    expect(articleNotoriaInputSchema.safeParse({ ...input, signalId: "signal-1" }).success).toBe(false);
    expect(articleNotoriaInputSchema.safeParse({ strategyId, articleUrl: "file:///etc/passwd" }).success).toBe(false);
    expect(articleNotoriaInputSchema.parse({ ...input, summary: "Invented client claim" })).toEqual({ strategyId, articleUrl });
    expect(articleNotoriaInputSchema.parse({ strategyId, signalId: "signal-1" })).toEqual({ strategyId, signalId: "signal-1" });
  });

  it("rejects a URL absent from this brand's digest before invoking a generator", async () => {
    mocks.digests.mockResolvedValue([digest({ data: { items: [{ ...article, link: `${articleUrl}-another` }] } })]);
    await expect(triggerArticleNotoria(input)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.generateBatch).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.digests.mock.calls[0]?.[0].where).toMatchObject({ market: `brand:${strategyId}`, entryType: "EXTERNAL_FEED_DIGEST" });
  });

  it.each([
    { market: "brand:b" },
    { originStrategyId: "brand-b" },
    { data: { strategyId: "brand-b", items: [article] } },
  ])("rejects contradictory attribution despite matching URL: %j", async (extra) => {
    mocks.digests.mockResolvedValue([digest(extra)]);
    await expect(triggerArticleNotoria(input)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.generateBatch).not.toHaveBeenCalled();
  });

  it("uses collected article metadata with the canonical pillar-aware mission; makes proposals visible without applying them", async () => {
    await expect(triggerArticleNotoria(input)).resolves.toEqual({ batchId: "batch-1", totalRecos: 2, failedParts: 0 });
    const generation = mocks.generateBatch.mock.calls[0]?.[0];
    expect(generation).toMatchObject({ strategyId, missionType: "SESHAT_OBSERVATION" });
    for (const value of [article.link, article.title, article.summary, article.source, article.publishedAt]) {
      expect(generation.seshatObservation).toContain(value);
    }
    expect(generation.seshatObservation).toContain("hypothèses d'impact");
    const stored = mocks.createSignal.mock.calls[0]?.[0].data;
    expect(stored).toMatchObject({ strategyId, type: "JEHUTY_ARTICLE_NOTORIA", data: {
      batchId: "batch-1", article: { digestId: "digest-1", url: articleUrl, title: article.title },
    } });
    expect(stored.data.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(mocks.curate.mock.calls[0]?.[0]).toMatchObject({
      where: { strategyId_itemType_itemId: { strategyId, itemType: "EXTERNAL", itemId: articleUrl } },
      create: { action: "NOTORIA_TRIGGERED", userId: "user-a" },
    });
    expect(mocks.publish).toHaveBeenCalledWith({
      where: { strategyId, batchId: "batch-1", status: "PENDING", publishedAt: null },
      data: { publishedAt: expect.any(Date), source: "SESHAT", applyPolicy: "requires_review" },
    });
    // Neither accepting a proposal nor forging a BrandDataSource receipt.
    expect(mocks.publish.mock.calls[0]?.[0].data).not.toHaveProperty("status");
    expect(mocks.publish.mock.calls[0]?.[0].data).not.toHaveProperty("sourceReceipts");
  });

  it("retains a bounded source and explicitly missing metadata instead of inventing a news body or publication date", async () => {
    mocks.digests.mockResolvedValue([digest({ data: { items: [{ link: articleUrl, title: "Un titre seul" }] } })]);
    await triggerArticleNotoria(input);
    expect(mocks.generateBatch.mock.calls[0]?.[0].seshatObservation).toContain("Aucun résumé disponible");
    expect(mocks.generateBatch.mock.calls[0]?.[0].seshatObservation).toContain("Non fournie par la source");
    mocks.digests.mockResolvedValue([digest({ data: { items: [{ ...article, summary: "Résumé ".repeat(3000) }] } })]);
    await triggerArticleNotoria(input);
    expect(mocks.generateBatch.mock.calls[1]?.[0].seshatObservation.length).toBeLessThanOrEqual(3900);
    expect(mocks.generateBatch.mock.calls[1]?.[0].seshatObservation).toContain(articleUrl);
  });

  it("surfaces complete generation failure without automatic retry, while retaining its source receipt", async () => {
    mocks.generateBatch.mockResolvedValue({ batchId: "failed-batch", totalRecos: 0, errors: [{ error: "provider unavailable" }] });
    await expect(triggerArticleNotoria(input)).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(mocks.generateBatch).toHaveBeenCalledTimes(1);
    expect(mocks.createSignal.mock.calls[0]?.[0].data.data).toMatchObject({ batchId: "failed-batch", totalRecos: 0, failedParts: 1 });
  });
});

describe("article right page — exact links, no simulated interpretation", () => {
  it("shows explicit URL-linked analyses, excluding same-keyword and prefix matches", async () => {
    mocks.signals.mockResolvedValue([
      signal("direct", { title: "Effet à examiner", content: "Hypothèse pour la marque.", sourceUrl: articleUrl, relatedPillars: ["v", "x"] }),
      signal("array", { title: "Autre lecture", brandImpact: "Piste conditionnelle.", sources: [{ title: "Article", url: articleUrl }] }),
      signal("words-only", { title: article.title, content: articleUrl }),
      signal("prefix", { content: "Autre article", sourceUrl: `${articleUrl}-other` }),
      signal("foreign", { content: "Autre marque", sourceUrl: articleUrl }, "WEAK_SIGNAL_ALERT", "brand-b"),
    ]);
    const result = (await readArticleBrandInterpretations(strategyId, [article])).get(articleUrl)!;
    expect(result.linkedAnalyses.map((row) => row.id)).toEqual(["direct", "array"]);
    expect(result.linkedAnalyses[0]?.pillarKeys).toEqual(["V"]);
    expect(mocks.signals.mock.calls[0]?.[0].where.strategyId).toBe(strategyId);
    expect(result.recommendations).toEqual([]);
  });

  it("recovers all exact receipt batches after unpin/removal, and rejects another brand's recommendations", async () => {
    mocks.signals.mockResolvedValue([receipt("batch-1"), receipt("batch-2"), receipt("batch-1"), receipt("other", `${articleUrl}-other`)]);
    mocks.recommendations.mockResolvedValue([reco("r1", "batch-1"), reco("r2", "batch-2"), reco("foreign", "batch-1", "brand-b"), reco("unrelated", "other")]);
    const result = (await readArticleBrandInterpretations(strategyId, [article])).get(articleUrl)!;
    expect(result.batchIds).toEqual(["batch-1", "batch-2"]);
    expect(result.linkedAnalyses).toEqual([]); // a receipt is not a brand analysis
    expect(result.recommendations.map((row) => row.id)).toEqual(["r1", "r2"]);
    expect(result.recommendations[0]).toMatchObject({ status: "PENDING", targetPillarKey: "I" });
    expect(mocks.recommendations.mock.calls[0]?.[0].where).toEqual({ strategyId, batchId: { in: ["batch-1", "batch-2"] }, publishedAt: { not: null } });
  });

  it("uses readable signal headlines without truncating linked analysis content", async () => {
    const clause = "Les foodies construisent des communautés locales";
    const thesis = `${clause}, ${"une hypothèse à vérifier auprès du public. ".repeat(12)}`;
    const unbroken = "Une observation à confronter aux choix de la marque ".repeat(10);
    mocks.signals.mockResolvedValue([
      signal("clause", { thesis, sourceUrl: articleUrl, pillar: "v" }),
      signal("fallback", { thesis: unbroken, sourceUrl: articleUrl, pillar: "e" }),
    ]);
    const result = (await readArticleBrandInterpretations(strategyId, [article])).get(articleUrl)!;
    expect(result.linkedAnalyses.map(row => row.title)).toEqual([clause, "Point de vigilance — pilier E"]);
    expect(result.linkedAnalyses[0]?.text).toBe(thesis.trim());
    expect(result.linkedAnalyses[1]?.text).toBe(unbroken.trim());
    expect(result.linkedAnalyses.every(row => row.sourceUrl === articleUrl)).toBe(true);
  });

  it("identifies ADVE excerpts as context, preserves inferred/stale provenance and never claims an impact", async () => {
    mocks.pillars.mockResolvedValue([
      { key: "a", content: { promesseFondamentale: "Un bouche-à-oreille vérifiable." }, fieldCertainty: { promesseFondamentale: "INFERRED" }, staleAt: date },
      { key: "e", content: { promesseExperience: "Choisir sans mauvaise surprise." }, fieldCertainty: {}, staleAt: null },
    ]);
    const result = (await readArticleBrandInterpretations(strategyId, [article])).get(articleUrl)!;
    expect(result.brandContext).toEqual([
      { pillarKey: "A", field: "promesseFondamentale", label: "Conviction", text: "Un bouche-à-oreille vérifiable.", source: "ADVE", certainty: "INFERRED", stale: true },
      { pillarKey: "E", field: "promesseExperience", label: "Expérience", text: "Choisir sans mauvaise surprise.", source: "ADVE", stale: false },
    ]);
    expect(result.linkedAnalyses).toEqual([]);
    expect(result.recommendations).toEqual([]);
    expect(mocks.generateBatch).not.toHaveBeenCalled();
  });

  it("performs no queries for an empty or invalid article list", async () => {
    expect((await readArticleBrandInterpretations(strategyId, [{ link: "javascript:alert(1)" }])).size).toBe(0);
    expect(mocks.signals).not.toHaveBeenCalled();
    expect(mocks.pillars).not.toHaveBeenCalled();
  });
});
