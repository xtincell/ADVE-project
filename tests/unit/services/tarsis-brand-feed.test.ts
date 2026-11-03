import { beforeEach, expect, it, vi } from "vitest";
const findFirst = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db: { knowledgeEntry: { findFirst } } }));
import { fetchSectorSignal } from "@/server/services/seshat/tarsis/connector";
beforeEach(() => { vi.resetAllMocks(); });
it("reads the actual brand digest items, retains its receipt date and never turns sector news into earned press", async () => {
  const createdAt = new Date("2026-11-02T10:00:00Z");
  findFirst.mockResolvedValue({ createdAt, data: { items: [{ title: "Marché local", link: "https://example.org/article", source: "Journal" }], weakSignals: [] } });
  const result = await fetchSectorSignal("operator", "food", { strategyId: "brand-a", countryCode: "CI" });
  expect(findFirst.mock.calls[0]![0].where.market).toBe("brand:brand-a");
  expect(result.state).toBe("LIVE");
  if (result.state !== "LIVE") return;
  expect(result.observedAt).toBe(createdAt.toISOString());
  expect(result.data.sectorArticles).toEqual([{ headline: "Marché local", sourceUrl: "https://example.org/article", publication: "Journal", publishedAt: undefined }]);
  expect(result.data.unpaidPress).toEqual([]);
});
it("excludes other brand digests and restricts public fallback to the market", async () => {
  findFirst.mockResolvedValue(null);
  await fetchSectorSignal("operator", "food", { strategyId: "brand-a", countryCode: "CI" });
  const where = findFirst.mock.calls[1]![0].where;
  expect(where.OR).toEqual([{ market: null }, { market: { not: { startsWith: "brand:" } } }]);
  expect(where.countryCode).toBe("CI");
});
it("does not claim a non-URL causal narrative is a source", async () => {
  findFirst.mockResolvedValue({ createdAt: new Date(), data: { weakSignals: [{ event: "Supposition", causalChain: ["Une cause" ] }] } });
  expect(await fetchSectorSignal("operator", "food")).toEqual({ state: "DEGRADED", reason: "INSUFFICIENT_DATA" });
});
