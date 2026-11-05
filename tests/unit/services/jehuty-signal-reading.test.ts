import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ guard: vi.fn(), find: vi.fn(), digests: vi.fn(), context: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { signal: { findFirst: mocks.find }, knowledgeEntry: { findMany: mocks.digests } } }));
vi.mock("@/server/trpc/routers/_strategy-read-guard", () => ({ assertStrategyRead: mocks.guard }));
vi.mock("@/server/services/jehuty/article-notoria", () => ({ readGazetteBrandContext: mocks.context }));

import { readSignalReading } from "@/server/services/jehuty/signal-reading";

const input = { userId: "user-a", strategyId: "brand-a", signalId: "signal-a" };
const url = "https://publisher.example/news/foodies";
const brandContext = { sector: "food", market: "CI", brandIdentity: "Identité historique", positioning: "Position", products: "Palais", riskFactors: "Confiance", countryContext: "Pays CI", brandHealthContext: "" };
const entry = { id: "input-a", title: "Titre conservé", content: "Contenu fourni à l'analyse.", sourceType: "NEWS", sourceUrl: url, collectedAt: "2026-11-05T10:00:00.000Z", kind: "COLLECTED" };
const provenance = { schema: "weak-signal-provenance-v1", producer: "seshat.tarsis.weak-signal-analyzer", kind: "INFERRED", generatedAt: "2026-11-05T11:00:00.000Z", inputSignals: [entry], inputText: "Entrée transmise", brandContext };
const signal = (data: unknown, strategyId = "brand-a") => ({ id: "signal-a", strategyId, type: "WEAK_SIGNAL_ALERT", createdAt: new Date("2026-11-05T11:00:00.000Z"), data });
const article = { link: url, title: "Article exact", summary: "Résumé collecté", source: "Éditeur", imageUrl: "https://publisher.example/image.jpg", publishedAt: "2026-11-05T08:00:00.000Z" };
const digest = (extra = {}) => ({ market: "brand:brand-a", originStrategyId: "brand-a", data: { strategyId: "brand-a", items: [article] }, ...extra });

beforeEach(() => { vi.clearAllMocks(); mocks.guard.mockResolvedValue(undefined); mocks.find.mockResolvedValue(signal({ thesis: "Lecture de la marque", brandImpact: "Impact à examiner", provenance })); mocks.digests.mockResolvedValue([digest()]); mocks.context.mockResolvedValue([{ label: "Conviction", text: "Version actuelle", source: "ADVE" }]); });

describe("Gazette signal reading", () => {
  it("checks access before looking up a signal and scopes both identity and brand", async () => {
    mocks.guard.mockRejectedValueOnce(new Error("FORBIDDEN"));
    await expect(readSignalReading(input)).rejects.toThrow("FORBIDDEN");
    expect(mocks.find).not.toHaveBeenCalled();
    await readSignalReading(input);
    expect(mocks.guard).toHaveBeenCalledWith(input.userId, input.strategyId);
    expect(mocks.find.mock.calls[0]?.[0].where).toEqual({ id: input.signalId, strategyId: input.strategyId });
  });

  it("rejects absent and foreign-brand records without exposing content", async () => {
    for (const value of [null, signal({ thesis: "Private" }, "brand-b")]) {
      mocks.find.mockResolvedValueOnce(value);
      await expect(readSignalReading(input)).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
    expect(mocks.context).not.toHaveBeenCalled();
  });

  it("keeps historical inputs separate from current ADVE and enriches by exact URL only", async () => {
    const result = await readSignalReading(input);
    expect(result).toMatchObject({ provenanceStatus: "TRACEABLE", interpretation: "Lecture de la marque\n\nImpact à examiner", brandContextSnapshot: brandContext,
      currentBrandContext: [{ text: "Version actuelle" }], inputSignals: [{ ...entry, article: { title: article.title, content: article.summary, url } }] });
    expect(mocks.digests.mock.calls[0]?.[0]).toMatchObject({ where: { entryType: "EXTERNAL_FEED_DIGEST", market: "brand:brand-a" }, take: 30 });
  });

  it.each([
    { market: "brand:brand-b" }, { originStrategyId: "brand-b" },
    { data: { strategyId: "brand-b", items: [article] } },
    { data: { items: [{ ...article, link: `${url}/other` }] } },
  ])("rejects contradictory digest scope and same-word articles: %j", async (extra) => {
    mocks.digests.mockResolvedValue([digest(extra)]);
    const result = await readSignalReading(input);
    expect(result.inputSignals[0]).not.toHaveProperty("article");
  });

  it("does not fabricate historical sources from today's ADVE or matching article titles", async () => {
    mocks.find.mockResolvedValue(signal({ thesis: article.title, brandImpact: "Texte intégral historique" }));
    const result = await readSignalReading(input);
    expect(result).toMatchObject({ provenanceStatus: "UNTRACEABLE", inputSignals: [], brandContextSnapshot: null });
    expect(result.currentBrandContext.length).toBe(1);
    expect(mocks.digests).not.toHaveBeenCalled();
  });

  it("exposes an existing legacy URL without pretending to recover the historic input snapshot", async () => {
    mocks.find.mockResolvedValue(signal({ thesis: "Ancienne analyse", sources: [
      { title: "Référence d'origine", url },
      { title: "Autre URL avec même sujet", url: `${url}/other` },
      { title: "URL injectée", url: "javascript:alert(1)" },
      { title: "URL issue du modèle", sourceUrl: url, kind: "INFERRED" },
    ] }));
    const result = await readSignalReading(input);
    expect(result).toMatchObject({ provenanceStatus: "REFERENCED", brandContextSnapshot: null });
    expect(result.inputSignals).toHaveLength(2);
    expect(result.inputSignals[0]).toMatchObject({ title: "Référence d'origine", sourceUrl: url,
      kind: "UNSPECIFIED", sourceType: "REFERENCE", content: "", collectedAt: "",
      article: { url, title: article.title, content: article.summary },
    });
    expect(result.inputSignals[1]).not.toHaveProperty("article");
  });

  it("does not launder inferred model URLs through legacy source references", async () => {
    mocks.find.mockResolvedValue(signal({ thesis: "Hypothèse", provenanceKind: "INFERRED", sources: [{ url }] }));
    const result = await readSignalReading(input);
    expect(result).toMatchObject({ provenanceStatus: "UNTRACEABLE", inputSignals: [] });
    expect(mocks.digests).not.toHaveBeenCalled();
  });

  it("never attaches an article to an inferred input or unsafe URL", async () => {
    mocks.find.mockResolvedValue(signal({ thesis: "Lecture", provenance: { ...provenance, inputSignals: [
      { ...entry, kind: "INFERRED" }, { ...entry, sourceUrl: "javascript:alert(1)" },
    ] } }));
    const result = await readSignalReading(input);
    expect(result.inputSignals.every((row) => !row.sourceUrl && !row.article)).toBe(true);
    expect(mocks.digests).not.toHaveBeenCalled();
  });
});
