/**
 * Story refactor-t-pillar-vault-seshat-pipeline — Task 4.1
 *
 * Tests: scanVaultForMarketIntelligence + ingestVaultToKnowledgeEntry
 *   AC2 — vault scan finds ACTIVE/CANDIDATE market-relevant BrandAssets
 *   AC2 — ingestVaultToKnowledgeEntry writes EXTERNAL_FEED_DIGEST for TREND_RADAR
 *   AC2 — idempotency: no duplicate create when fresh entry already exists
 */

import { afterEach, describe, expect, it, vi } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

const dbBrandAssetFindManyMock = vi.fn();
const dbKnowledgeEntryFindFirstMock = vi.fn();
const dbKnowledgeEntryCreateMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    brandAsset: {
      findMany: (...a: unknown[]) => dbBrandAssetFindManyMock(...a),
    },
    knowledgeEntry: {
      findFirst: (...a: unknown[]) => dbKnowledgeEntryFindFirstMock(...a),
      create: (...a: unknown[]) => dbKnowledgeEntryCreateMock(...a),
    },
  },
}));

// domain/brand-asset-kinds has no side effects — not mocked
vi.mock("@/domain/brand-asset-kinds", async (importOriginal) => {
  return importOriginal();
});

// ── Import under test ─────────────────────────────────────────────────────────

import {
  scanVaultForMarketIntelligence,
  ingestVaultToKnowledgeEntry,
} from "@/server/services/seshat/tarsis/vault-bridge";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SEARCH_CTX = {
  sector: "food",
  market: "CM",
  countryCode: "CM",
} as const;

const TREND_RADAR_ASSET = {
  id: "asset-1",
  kind: "TREND_RADAR",
  content: { signals: ["signal A"] },
  name: "Radar tendances 2026",
  summary: "Tendances alimentation Cameroun",
  state: "ACTIVE",
};

const MCK_7S_ASSET = {
  id: "asset-2",
  kind: "MCK_7S",
  content: { strategy: "premium positioning" },
  name: "McKinsey 7S analyse",
  summary: null,
  state: "CANDIDATE",
};

afterEach(() => {
  vi.clearAllMocks();
});

// ── scanVaultForMarketIntelligence ─────────────────────────────────────────────

describe("scanVaultForMarketIntelligence", () => {
  it("returns hasData=true and correct count when TREND_RADAR asset exists", async () => {
    dbBrandAssetFindManyMock.mockResolvedValue([TREND_RADAR_ASSET]);

    const result = await scanVaultForMarketIntelligence("strat-1");

    expect(result.hasData).toBe(true);
    expect(result.vaultAssetCount).toBe(1);
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0]!.kind).toBe("TREND_RADAR");
    expect(result.assets[0]!.id).toBe("asset-1");
  });

  it("returns hasData=false when no market-relevant assets exist", async () => {
    dbBrandAssetFindManyMock.mockResolvedValue([]);

    const result = await scanVaultForMarketIntelligence("strat-1");

    expect(result.hasData).toBe(false);
    expect(result.vaultAssetCount).toBe(0);
    expect(result.assets).toHaveLength(0);
  });

  it("queries with correct kind filter and state filter", async () => {
    dbBrandAssetFindManyMock.mockResolvedValue([]);

    await scanVaultForMarketIntelligence("strat-42");

    const call = dbBrandAssetFindManyMock.mock.calls[0]![0];
    expect(call.where.strategyId).toBe("strat-42");
    expect(call.where.state.in).toContain("ACTIVE");
    expect(call.where.state.in).toContain("CANDIDATE");
    expect(call.where.kind.in).toContain("TREND_RADAR");
    expect(call.where.kind.in).toContain("MCK_7S");
  });
});

// ── ingestVaultToKnowledgeEntry ───────────────────────────────────────────────

describe("ingestVaultToKnowledgeEntry — TREND_RADAR writes EXTERNAL_FEED_DIGEST", () => {
  it("creates an EXTERNAL_FEED_DIGEST entry for a TREND_RADAR asset", async () => {
    dbKnowledgeEntryFindFirstMock.mockResolvedValue(null); // no existing entry
    dbKnowledgeEntryCreateMock.mockResolvedValue({ id: "ke-1" });

    const result = await ingestVaultToKnowledgeEntry("strat-1", SEARCH_CTX, [TREND_RADAR_ASSET]);

    expect(result.created).toBe(1);
    expect(dbKnowledgeEntryCreateMock).toHaveBeenCalledOnce();
    const createArg = dbKnowledgeEntryCreateMock.mock.calls[0]![0];
    expect(createArg.data.entryType).toBe("EXTERNAL_FEED_DIGEST");
    expect(createArg.data.sector).toBe("food");
    expect(createArg.data.countryCode).toBe("CM");
    const data = createArg.data.data as Record<string, unknown>;
    expect(Array.isArray(data.macroSignals)).toBe(true);
    expect((data.macroSignals as unknown[]).length).toBeGreaterThan(0);
    expect(data._vaultAssetId).toBe("asset-1");
    expect(data._source).toBe("vault-bridge");
  });

  it("creates a SECTOR_BENCHMARK entry for a MCK_7S asset", async () => {
    dbKnowledgeEntryFindFirstMock.mockResolvedValue(null);
    dbKnowledgeEntryCreateMock.mockResolvedValue({ id: "ke-2" });

    await ingestVaultToKnowledgeEntry("strat-1", SEARCH_CTX, [MCK_7S_ASSET]);

    const createArg = dbKnowledgeEntryCreateMock.mock.calls[0]![0];
    expect(createArg.data.entryType).toBe("SECTOR_BENCHMARK");
    expect(createArg.data.data._vaultAssetId).toBe("asset-2");
    expect(createArg.data.data.frameworkKind).toBe("MCK_7S");
  });
});

describe("ingestVaultToKnowledgeEntry — idempotency", () => {
  it("skips create when a fresh entry already exists for the vault asset", async () => {
    // Simulate fresh entry already ingested
    dbKnowledgeEntryFindFirstMock.mockResolvedValue({ id: "ke-existing" });

    const result = await ingestVaultToKnowledgeEntry("strat-1", SEARCH_CTX, [TREND_RADAR_ASSET]);

    expect(result.created).toBe(0);
    expect(dbKnowledgeEntryCreateMock).not.toHaveBeenCalled();
  });

  it("creates entries for assets that have no existing entry", async () => {
    // First asset: no existing entry → create
    // Second asset: existing entry → skip
    dbKnowledgeEntryFindFirstMock
      .mockResolvedValueOnce(null) // TREND_RADAR — not yet ingested
      .mockResolvedValueOnce({ id: "ke-existing" }); // MCK_7S — already ingested

    dbKnowledgeEntryCreateMock.mockResolvedValue({ id: "ke-new" });

    const result = await ingestVaultToKnowledgeEntry("strat-1", SEARCH_CTX, [
      TREND_RADAR_ASSET,
      MCK_7S_ASSET,
    ]);

    expect(result.created).toBe(1);
    expect(dbKnowledgeEntryCreateMock).toHaveBeenCalledOnce();
  });
});
