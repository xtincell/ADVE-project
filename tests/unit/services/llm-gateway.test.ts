import { describe, it, expect, vi } from "vitest";
import { extractJSON, withRetry } from "@/server/services/llm-gateway";

// ---------------------------------------------------------------------------
// extractJSON — robust 3-step parser
// ---------------------------------------------------------------------------

describe("extractJSON", () => {
  it("parses pure JSON object", () => {
    const result = extractJSON('{"foo": "bar", "n": 42}');
    expect(result).toEqual({ foo: "bar", n: 42 });
  });

  it("parses pure JSON array", () => {
    const result = extractJSON('[1, 2, 3]');
    expect(result).toEqual([1, 2, 3]);
  });

  it("parses JSON wrapped in markdown ```json fences", () => {
    const text = "Here is your answer:\n```json\n{\"score\": 7}\n```\nHope this helps!";
    expect(extractJSON(text)).toEqual({ score: 7 });
  });

  it("parses JSON wrapped in plain ``` fences (no language tag)", () => {
    const text = "```\n{\"a\": 1}\n```";
    expect(extractJSON(text)).toEqual({ a: 1 });
  });

  it("extracts JSON from prose with leading text", () => {
    const text = 'Sure, here you go: {"verdict": "good", "confidence": 0.8}';
    expect(extractJSON(text)).toEqual({ verdict: "good", confidence: 0.8 });
  });

  it("handles nested objects with balanced braces inside strings", () => {
    const text = '{"msg": "use { and } carefully", "nested": {"inner": true}}';
    expect(extractJSON(text)).toEqual({
      msg: "use { and } carefully",
      nested: { inner: true },
    });
  });

  it("handles escaped quotes in strings", () => {
    const text = '{"quote": "he said \\"hi\\" loudly"}';
    expect(extractJSON(text)).toEqual({ quote: 'he said "hi" loudly' });
  });

  it("prefers object over array when both appear (object first)", () => {
    const text = '{"first": true} and then [1,2,3]';
    expect(extractJSON(text)).toEqual({ first: true });
  });

  it("picks array if it appears before object", () => {
    const text = "preface [10, 20] then {\"after\": true}";
    expect(extractJSON(text)).toEqual([10, 20]);
  });

  it("throws when no valid JSON is present", () => {
    expect(() => extractJSON("just plain text, no JSON here")).toThrow(/impossible de parser/i);
  });

  it("throws on unbalanced braces", () => {
    expect(() => extractJSON("starting { but never closing")).toThrow();
  });

  it("rejects valid JSON primitives (numbers, strings) — only objects/arrays allowed", () => {
    // A bare number IS valid JSON, but the gateway promises Record<string, unknown> | unknown[]
    expect(() => extractJSON("42")).toThrow();
    expect(() => extractJSON('"just a string"')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// withRetry — exponential backoff
// ---------------------------------------------------------------------------

describe("withRetry", () => {
  it("returns immediately on first-try success without sleeping", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const start = Date.now();
    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 1000 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(Date.now() - start).toBeLessThan(50);
  });

  it("retries the configured number of times then throws the last error", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 1 }),
    ).rejects.toThrow("boom");
    // maxRetries=2 means 1 initial attempt + 2 retries = 3 calls
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("succeeds on a later attempt and returns that value", async () => {
    let calls = 0;
    const fn = vi.fn().mockImplementation(async () => {
      calls++;
      if (calls < 3) throw new Error("transient");
      return "finally";
    });
    const result = await withRetry(fn, { maxRetries: 5, baseDelayMs: 1, maxDelayMs: 1 });
    expect(result).toBe("finally");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("respects maxDelayMs cap on backoff growth", async () => {
    // Force several failures with a small cap; total should be bounded
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const start = Date.now();
    await expect(
      withRetry(fn, { maxRetries: 3, baseDelayMs: 5, maxDelayMs: 10 }),
    ).rejects.toThrow();
    const elapsed = Date.now() - start;
    // 3 retries at <= 10ms each + scheduling slack — well under 200ms
    expect(elapsed).toBeLessThan(200);
  });

  it("uses default options when none provided (maxRetries=2)", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("nope"));
    await expect(withRetry(fn)).rejects.toThrow("nope");
    // 1 initial + 2 default retries = 3
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
