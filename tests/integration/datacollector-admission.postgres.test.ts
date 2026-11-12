/** Run only against a disposable database with migrations applied (local receipt cluster or CI container).
 *
 * DC3 Shinkiro — a DataCollector receipt exported by the local tool is deposited on
 * the existing ADR-0146 route, with no collector service deployed. Real route,
 * real scoped keys (`createApiKey`, hash only in base), real emission spine and
 * real transaction; only the session is neutralised (none).
 *
 * Received contract: admission with identity, version, fingerprint and per-measure
 * provenance; identical replay returns the same receipt; different content under
 * the same identity is refused; an invalid envelope is refused before emission;
 * a key of another brand is refused (403) and an unknown brand answers 404. No
 * pillar, AARRR or KPI write; an absent value is never stored as zero.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
vi.mock("next-auth", () => ({}));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import { createApiKey } from "@/server/services/anubis/mcp-billing";
import { POST } from "@/app/api/ingest/metrics/route";
import { datacollectorReceiptFingerprint } from "@/domain/datacollector-receipt";

const FIXTURE_FINGERPRINT = "b4e58243ccdeba9ee8fe8f6d9912717026788a67585194a7ed316d8813bd5bec";
type Receipt = Record<string, unknown> & { measures: Array<Record<string, unknown>>; fingerprint: { value: string } };
const fixture = (): Receipt => JSON.parse(readFileSync("tests/fixtures/datacollector/receipt-v1.json", "utf8")) as Receipt;

let userId: string, brandId: string, otherBrandId: string;
let brandKey: string, systemKey: string;
const keyIds: string[] = [];
const missingBrand = `missing-${randomUUID()}`;

async function deposit(apiKey: string, strategyId: string, receipt: unknown) {
  const response = await POST(new Request("http://localhost/api/ingest/metrics", {
    method: "POST", headers: { "content-type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ strategyId, receipt }),
  }));
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}
const receipts = (strategyId: string) => db.signal.findMany({ where: { strategyId, type: "EXTERNAL_METRIC" }, orderBy: { createdAt: "asc" } });
const emissions = (strategyId: string) => db.intentEmission.count({ where: { strategyId, intentKind: "INGEST_EXTERNAL_METRIC" } });

beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(url.hostname).toBe("127.0.0.1"); expect(url.pathname).toBe("/shinkiro_verify");
  const ownedLocal = url.port === "55439" && url.username === "shinkiro_fixture";
  const ownedCI = process.env.GITHUB_ACTIONS === "true" && process.env.GITHUB_REPOSITORY === "xtincell/ADVE-project"
    && url.port === "5432" && url.username === "postgres";
  expect(ownedLocal || ownedCI).toBe(true);
  userId = (await db.user.create({ data: { name: "Titulaire de clé — recette DC3", email: `dc3-${randomUUID()}@example.invalid` } })).id;
  brandId = (await db.strategy.create({ data: { name: `Marque fictive DC3 ${randomUUID().slice(0, 8)}`, userId } })).id;
  otherBrandId = (await db.strategy.create({ data: { name: `Autre marque fictive DC3 ${randomUUID().slice(0, 8)}`, userId } })).id;
  const limited = await createApiKey({ name: "Clé d'ingestion limitée à une marque — DC3", server: "ingest", scopeKind: "BRAND", scopeStrategyId: brandId });
  const system = await createApiKey({ name: "Clé d'ingestion système — DC3", server: "ingest", scopeKind: "SYSTEM" });
  brandKey = limited.plaintextKey; systemKey = system.plaintextKey;
  keyIds.push(limited.id, system.id);
});

beforeEach(() => {
  // Nothing exercised here may leave the machine.
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("EXTERNAL_NETWORK_FORBIDDEN_IN_FIXTURE"));
});

afterAll(async () => {
  vi.restoreAllMocks();
  // The metering journal is best effort: let a pending line land before removing keys.
  await new Promise((resolve) => setTimeout(resolve, 200));
  const brands = [brandId, otherBrandId, missingBrand].filter(Boolean);
  await db.signal.deleteMany({ where: { strategyId: { in: brands } } });
  await db.costDecision.deleteMany({ where: { strategyId: { in: brands } } });
  await db.intentEmission.deleteMany({ where: { strategyId: { in: brands } } });
  if (keyIds.length) {
    await db.mcpApiCall.deleteMany({ where: { apiKeyId: { in: keyIds } } });
    await db.mcpApiKey.deleteMany({ where: { id: { in: keyIds } } });
  }
  await db.strategy.deleteMany({ where: { id: { in: [brandId, otherBrandId].filter(Boolean) } } });
  if (userId) await db.user.deleteMany({ where: { id: userId } });
  await db.$disconnect();
});

describe.sequential("DC3 — DataCollector receipt admitted through the existing ingestion", () => {
  it("admits the receipt with identity, version, fingerprint and per-measure provenance, and writes nothing else", async () => {
    const pillarsBefore = await db.pillar.count({ where: { strategyId: brandId } });
    const admitted = await deposit(brandKey, brandId, fixture());
    expect(admitted.status).toBe(200);
    expect(admitted.body.result).toMatchObject({ replayed: false, aarrWritten: 0, kpiWritten: 0,
      observationId: "datacollector:20261110_0123456789abcdef0123456789abcdef" });
    const saved = await receipts(brandId);
    expect(saved).toHaveLength(1);
    const data = saved[0]!.data as Record<string, unknown> & { metrics: Array<Record<string, unknown>>; unobserved: Array<Record<string, unknown>> };
    expect(data).toMatchObject({ sourceType: "COLLECTOR", sourceDigest: FIXTURE_FINGERPRINT,
      sourceVersion: "datacollector/1.1.0 · datacollector/observation-receipt@1", observedAt: "2026-11-10T09:00:05.654Z",
      payloadHash: expect.stringMatching(/^[a-f0-9]{64}$/), applied: [] });
    expect(data.metrics.map((m) => [m.source, m.metric, m.value, m.observedAt])).toEqual([
      ["web_performance", "first_contentful_paint_score", 87.5, "2026-11-10T09:00:00.123456Z"],
      ["web_performance", "performance_score", 80, "2026-11-10T09:00:00.123456Z"],
      ["community_sentiment", "posts_retrieved", 2, "2026-11-10T09:00:01Z"],
    ]);
    // Absent stays absent: no value key, no zero, state and code retained.
    expect(data.unobserved.map((m) => [m.source, m.metric, m.state, m.errorCode ?? null])).toEqual([
      ["competitor_social_spy", "followers", "FAILED", "URL_METADATA_ADDRESS"],
      ["search_visibility", "my_rank", "FAILED", null],
      ["search_visibility", "total_results_estimated", "FAILED", null],
      ["web_performance", "speed_index_score", "NOT_PUBLISHED", null],
    ]);
    expect(data.unobserved.some((m) => "value" in m)).toBe(false);
    expect(data.metrics.some((m) => m.value === 0)).toBe(false);
    expect(await db.pillar.count({ where: { strategyId: brandId } })).toBe(pillarsBefore);
    expect(await db.campaignAARRMetric.count({ where: { campaign: { strategyId: brandId } } })).toBe(0);
    // Governed: one emission on the spine for this brand, closed OK.
    const emission = await db.intentEmission.findFirstOrThrow({ where: { strategyId: brandId, intentKind: "INGEST_EXTERNAL_METRIC" } });
    expect(emission.status).toBe("OK");
  });

  it("returns the same receipt for an identical deposit, without a second signal", async () => {
    const [first] = await receipts(brandId);
    const replay = await deposit(brandKey, brandId, fixture());
    expect(replay.status).toBe(200);
    expect(replay.body.result).toMatchObject({ replayed: true, signalId: first!.id });
    expect(await receipts(brandId)).toHaveLength(1);
  });

  it("refuses a different content under the same collection identity, even correctly sealed", async () => {
    const changed = fixture();
    changed.measures.find((m) => m.metric === "performance_score")!.value = 81;
    changed.fingerprint.value = datacollectorReceiptFingerprint(changed);
    const conflict = await deposit(brandKey, brandId, changed);
    expect(conflict.status).toBe(409);
    expect(conflict.body).toMatchObject({ error: "OBSERVATION_CONFLICT" });
    const saved = await receipts(brandId);
    expect(saved).toHaveLength(1);
    expect((saved[0]!.data as { metrics: Array<{ metric: string; value: number }> }).metrics
      .find((m) => m.metric === "performance_score")!.value).toBe(80);
  });

  it("refuses an invalid envelope with a typed 400 before any emission", async () => {
    const before = await emissions(brandId);
    const tampered = fixture(); tampered.measures[0]!.value = 1;
    const { schema: _s, target: _t, tool: _o, measures: _m, fingerprint: _f, ...legacy } = fixture();
    for (const [receipt, code] of [
      [tampered, "RECEIPT_FINGERPRINT_MISMATCH"],
      [legacy, "RECEIPT_LEGACY_UNVERIFIABLE"],
      [{ ...fixture(), schema: { name: "datacollector/observation-receipt", version: 2 } }, "RECEIPT_SCHEMA_UNSUPPORTED"],
    ] as const) {
      const refused = await deposit(brandKey, brandId, receipt);
      expect(refused.status).toBe(400);
      expect(refused.body).toMatchObject({ error: code });
    }
    expect(await emissions(brandId)).toBe(before);
    expect(await receipts(brandId)).toHaveLength(1);
  });

  it("refuses a key of another brand (403) and answers 404 for an unknown brand", async () => {
    const foreign = await deposit(brandKey, otherBrandId, fixture());
    expect(foreign.status).toBe(403);
    expect(foreign.body).toMatchObject({ error: "SCOPE_DENIED" });
    expect(await receipts(otherBrandId)).toHaveLength(0);
    expect(await emissions(otherBrandId)).toBe(0);

    const unknown = await deposit(systemKey, missingBrand, fixture());
    expect(unknown.status).toBe(404);
    expect(unknown.body).toMatchObject({ error: "STRATEGY_NOT_FOUND" });
    expect(await db.signal.count({ where: { strategyId: missingBrand } })).toBe(0);
  });
});
