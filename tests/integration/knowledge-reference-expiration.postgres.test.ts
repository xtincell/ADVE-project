import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { isOwnedPostgresTarget } from "../support/owned-postgres-target";

vi.hoisted(() => { process.env.SESHAT_API_URL = ""; });
import { enrichBrief, queryReferences } from "@/server/services/seshat/references";

describe.skipIf(!isOwnedPostgresTarget())("Knowledge reference freshness on disposable PostgreSQL", () => {
  const key = `reference-expiry-${randomUUID()}`;
  const ids: string[] = [];
  beforeAll(async () => {
    const receipt = (avgComposite: number) => ({ metricsVersion: 2, avgComposite, topQuartile: avgComposite,
      coverage: { observedCount: 3, missingCount: 0, totalCount: 3 },
      cohort: { sector: "food", countryCode: "CM", marketScale: "NATION", qualified: true },
    });
    const fixtures = [
      { id: `legacy-${key}`, sourceHash: null, data: { avgComposite: 11, topQuartile: 11 } },
      { id: `agg-benchmark-current-${key}`, sourceHash: "aggregator", data: receipt(22) },
      // Keep sampleSize at three deliberately: expiry itself must reject stale evidence.
      { id: `agg-benchmark-expired-${key}`, sourceHash: "aggregator-expired", data: receipt(33) },
      { id: `foreign-origin-${key}`, sourceHash: null, originStrategyId: `private-${key}`, data: receipt(44) },
      { id: `foreign-json-${key}`, sourceHash: "aggregator", data: { ...receipt(55), strategyId: `private-${key}` } },
      { id: `recipe-${key}`, sourceHash: null, data: { ...receipt(66), schema: "creative-recipe-v1" } },
      { id: `small-${key}`, sourceHash: null, sampleSize: 2, data: receipt(77) },
    ];
    ids.push(...fixtures.map(row => row.id));
    await db.knowledgeEntry.createMany({ data: fixtures.map(row => ({
      entryType: "SECTOR_BENCHMARK" as const, sector: "food", market: key, sampleSize: 3, ...row,
    })) });
  });
  afterAll(async () => {
    try { await db.knowledgeEntry.deleteMany({ where: { id: { in: ids } } }); }
    finally { await db.$disconnect(); }
  });

  it.each(["brief", "query"] as const)("preserves current/null-source references while excluding expired and attributed rows in %s", async kind => {
    const refs = kind === "brief"
      ? await enrichBrief({ channel: key, market: key })
      : await queryReferences({ topic: key, market: key, limit: 20 });
    expect(refs).toHaveLength(2);
    const excerpts = refs.map(row => row.excerpt).join("\n");
    expect(excerpts).toContain("11/200");
    expect(excerpts).toContain("22/200");
    for (const excluded of [33, 44, 55, 66, 77]) expect(excerpts).not.toContain(`${excluded}/200`);
    expect(JSON.stringify(refs)).not.toContain("private-");
    expect(await db.knowledgeEntry.count({ where: { id: { in: ids } } })).toBe(7);
  });
});
