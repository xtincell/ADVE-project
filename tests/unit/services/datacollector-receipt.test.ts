/**
 * DC3 Shinkiro — a DataCollector receipt deposited without any collector service.
 * The fixture is the one committed in xtincell/datacollector (same bytes): its
 * fingerprint, computed in Python, is recomputed here in TypeScript.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  canonicalJson, datacollectorReceiptFingerprint, datacollectorReceiptToIngest, readDatacollectorReceipt,
} from "@/domain/datacollector-receipt";

const FIXTURE_FINGERPRINT = "b4e58243ccdeba9ee8fe8f6d9912717026788a67585194a7ed316d8813bd5bec";
type Receipt = Record<string, unknown> & { measures: Array<Record<string, unknown>>; fingerprint: { value: string } };
const fixture = (): Receipt => JSON.parse(readFileSync("tests/fixtures/datacollector/receipt-v1.json", "utf8")) as Receipt;
/** Re-seal after an edit: proves the refusal comes from validation, not from the fingerprint. */
function resealed(edit: (r: Receipt) => void): Receipt {
  const r = fixture(); edit(r); r.fingerprint.value = datacollectorReceiptFingerprint(r); return r;
}
const code = (raw: unknown) => { const read = readDatacollectorReceipt(raw); return read.ok ? "OK" : read.code; };

describe("canonical form shared with the collector", () => {
  it("recomputes the Python fingerprint byte for byte", () => {
    const r = fixture();
    expect(r.fingerprint.value).toBe(FIXTURE_FINGERPRINT);
    expect(datacollectorReceiptFingerprint(r)).toBe(FIXTURE_FINGERPRINT);
  });
  it("writes ECMAScript numbers and sorted keys without whitespace", () => {
    expect(canonicalJson({ b: 80.0, a: [true, null, -0, 1e-7, 1e21], é: "é\n" })).toBe('{"a":[true,null,0,1e-7,1e+21],"b":80,"é":"é\\n"}');
    expect(() => canonicalJson({ x: Number.NaN })).toThrow();
  });
});

describe("strict reading of the versioned envelope", () => {
  it("admits the fixture", () => {
    expect(code(fixture())).toBe("OK");
  });
  it("refuses a pre-1.1 receipt explicitly, readable but unverifiable", () => {
    const { schema: _s, target: _t, tool: _o, measures: _m, fingerprint: _f, ...legacy } = fixture();
    expect(code(legacy)).toBe("RECEIPT_LEGACY_UNVERIFIABLE");
  });
  it.each([
    ["not an object", [], "RECEIPT_NOT_OBJECT"],
    ["another schema version", { ...fixture(), schema: { name: "datacollector/observation-receipt", version: 2 } }, "RECEIPT_SCHEMA_UNSUPPORTED"],
    ["no schema at all", { anything: true }, "RECEIPT_SCHEMA_UNSUPPORTED"],
  ])("refuses %s", (_label, raw, expected) => {
    expect(code(raw)).toBe(expected);
  });
  it("refuses any edit that keeps the old fingerprint", () => {
    for (const edit of [
      (r: Receipt) => { r.measures[0]!.value = 81; },
      (r: Receipt) => { (r.data as Record<string, Record<string, Record<string, unknown>>>).RISK!.web_performance!.strategy = "desktop"; },
      (r: Receipt) => { r.batch_id = "20261110_" + "f".repeat(32); },
    ]) {
      const r = fixture(); edit(r);
      expect(code(r)).toBe("RECEIPT_FINGERPRINT_MISMATCH");
    }
  });
  it("refuses unknown keys and impossible measures even when re-sealed", () => {
    expect(code(resealed((r) => { r.extra = 1; }))).toBe("RECEIPT_INVALID");
    expect(code(resealed((r) => { r.measures.find((m) => m.state === "failed")!.value = 0; }))).toBe("RECEIPT_INVALID");
    expect(code(resealed((r) => { r.measures[0]!.unit = "percent"; }))).toBe("RECEIPT_INVALID");
    expect(code(resealed((r) => { r.measures[0]!.observed_at = "2026-11-10"; }))).toBe("RECEIPT_INVALID");
  });
  it("refuses a re-sealed receipt whose summary or states contradict its measures", () => {
    expect(code(resealed((r) => { (r.collection_summary as Record<string, unknown>).state = "COMPLETE"; }))).toBe("RECEIPT_INCONSISTENT");
    expect(code(resealed((r) => { (r.scope as { requested_sources: string[] }).requested_sources = ["web_performance"]; }))).toBe("RECEIPT_INCONSISTENT");
    expect(code(resealed((r) => { r.measures.push({ ...r.measures[0]! }); }))).toBe("RECEIPT_INCONSISTENT");
    expect(code(resealed((r) => { r.target_entity = "Autre marque"; }))).toBe("RECEIPT_INCONSISTENT");
  });
});

describe("mapping to the existing ADR-0146 admission", () => {
  const read = readDatacollectorReceipt(fixture());
  if (!read.ok) throw new Error(read.code);
  const ingest = datacollectorReceiptToIngest("brand-1", read.receipt);

  it("keeps identity, version, observation date and fingerprint", () => {
    expect(ingest).toMatchObject({
      strategyId: "brand-1", sourceType: "COLLECTOR",
      observationId: "datacollector:20261110_0123456789abcdef0123456789abcdef",
      sourceVersion: "datacollector/1.1.0 · datacollector/observation-receipt@1",
      observedAt: "2026-11-10T09:00:05.654321Z", sourceDigest: FIXTURE_FINGERPRINT,
    });
  });
  it("admits received values only, as provenance cells without AARRR or KPI targets", () => {
    expect(ingest.metrics.map((m) => [m.source, m.metric, m.value, m.observedAt])).toEqual([
      ["web_performance", "performance_score", 80, "2026-11-10T09:00:00.123456Z"],
      ["web_performance", "first_contentful_paint_score", 87.5, "2026-11-10T09:00:00.123456Z"],
      ["community_sentiment", "posts_retrieved", 2, "2026-11-10T09:00:01Z"],
    ]);
    for (const cell of ingest.metrics) {
      expect(cell.stage ?? null).toBeNull(); expect(cell.kpiActivityId ?? null).toBeNull();
    }
  });
  it("keeps every absence as an absence, with its state and code — never zero", () => {
    expect(ingest.unobserved?.map((m) => [m.source, m.metric, m.state, m.errorCode ?? null, m.observedAt ?? null])).toEqual([
      ["web_performance", "speed_index_score", "NOT_PUBLISHED", null, "2026-11-10T09:00:00.123456Z"],
      ["search_visibility", "my_rank", "FAILED", null, null],
      ["search_visibility", "total_results_estimated", "FAILED", null, null],
      ["competitor_social_spy", "followers", "FAILED", "URL_METADATA_ADDRESS", null],
    ]);
    expect(ingest.metrics.some((m) => m.value === 0)).toBe(false);
  });
});
