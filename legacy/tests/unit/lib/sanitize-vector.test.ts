/**
 * Anti-drift CI — `sanitizeVector` re-validation post-load DB (ADR-0045 / ADR-0046).
 *
 * Source-of-truth fix Sprint B.1 : tout vector lu de DB passe par
 * `sanitizeVector` avant d'atteindre les mappers / l'UI. Régression Makrea
 * (Distinction 27.33, Strategy 25.93 dirty en DB) ne doit jamais réafficher
 * de valeurs hors-bornes côté Oracle.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { sanitizeVector } from "@/lib/types/advertis-vector";

describe("sanitizeVector — happy path (clean DB)", () => {
  it("returns vector unchanged when valid", () => {
    const valid = {
      a: 22, d: 24, v: 18, e: 20, r: 22, t: 19, i: 21, s: 23,
      composite: 169, confidence: 0.85,
    };
    const { vector, sanitized, violations } = sanitizeVector(valid);
    expect(sanitized).toBe(false);
    expect(violations).toEqual([]);
    expect(vector).toEqual(valid);
  });

  it("accepts pillar exactly at bounds [0, 25]", () => {
    const edge = {
      a: 0, d: 25, v: 12.5, e: 22, r: 18, t: 14, i: 21, s: 13,
      composite: 125.5, confidence: 0,
    };
    const { sanitized } = sanitizeVector(edge);
    expect(sanitized).toBe(false);
  });
});

describe("sanitizeVector — Makrea regression (ADR-0045)", () => {
  it("clamps Distinction 27.33 → 25 + Strategy 25.93 → 25 (out-of-bounds)", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const dirty = {
      a: 24.36, d: 27.33, v: 24, e: 21.85, r: 22.5, t: 18.58, i: 22, s: 25.93,
      composite: 186.67, confidence: 0.9,
    };
    const { vector, sanitized, violations } = sanitizeVector(dirty, { strategyId: "makrea" });
    expect(sanitized).toBe(true);
    expect(vector.d).toBe(25);
    expect(vector.s).toBe(25);
    expect(vector.composite).toBe(186.67); // composite still in [0, 200] — kept as-is
    expect(violations.length).toBeGreaterThan(0);
  });

  it("logs warning with strategyId context", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    warnSpy.mockClear();
    const dirty = { a: 24, d: 27, v: 24, e: 22, r: 22, t: 18, i: 22, s: 25, composite: 184, confidence: 0.9 };
    sanitizeVector(dirty, { strategyId: "test-id-unique" });
    expect(warnSpy).toHaveBeenCalled();
    const message = warnSpy.mock.calls.at(-1)?.[0] as string;
    expect(message).toContain("test-id-unique");
    expect(message).toContain("dirty AdvertisVector");
  });
});

describe("sanitizeVector — composite cap [0, 200]", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("clamps composite > 200", () => {
    const dirty = { a: 25, d: 25, v: 25, e: 25, r: 25, t: 25, i: 25, s: 25, composite: 250, confidence: 0.9 };
    const { vector, sanitized } = sanitizeVector(dirty);
    expect(sanitized).toBe(true);
    expect(vector.composite).toBe(200);
  });

  it("clamps composite < 0", () => {
    const dirty = { a: 0, d: 0, v: 0, e: 0, r: 0, t: 0, i: 0, s: 0, composite: -10, confidence: 0.5 };
    const { vector, sanitized } = sanitizeVector(dirty);
    expect(sanitized).toBe(true);
    expect(vector.composite).toBe(0);
  });
});

describe("sanitizeVector — confidence cap [0, 1]", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("clamps confidence > 1", () => {
    const dirty = { a: 1, d: 1, v: 1, e: 1, r: 1, t: 1, i: 1, s: 1, composite: 8, confidence: 1.5 };
    const { vector, sanitized } = sanitizeVector(dirty);
    expect(sanitized).toBe(true);
    expect(vector.confidence).toBe(1);
  });

  it("clamps confidence < 0", () => {
    const dirty = { a: 1, d: 1, v: 1, e: 1, r: 1, t: 1, i: 1, s: 1, composite: 8, confidence: -0.1 };
    const { vector, sanitized } = sanitizeVector(dirty);
    expect(sanitized).toBe(true);
    expect(vector.confidence).toBe(0);
  });
});

describe("sanitizeVector — defensive parsing of non-numeric / null fields", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("treats NaN / Infinity as 0 (corrupted numeric data)", () => {
    const dirty = { a: NaN, d: Infinity, v: 12, e: 12, r: 12, t: 12, i: 12, s: 12, composite: 96, confidence: 0.5 };
    const { vector, sanitized } = sanitizeVector(dirty);
    expect(sanitized).toBe(true);
    expect(vector.a).toBe(0);
    expect(vector.d).toBe(0); // Infinity is not a valid finite number → fallback 0
  });

  it("treats string fields as 0", () => {
    const dirty = { a: "hello", d: 12, v: 12, e: 12, r: 12, t: 12, i: 12, s: 12, composite: 84, confidence: 0.5 };
    const { vector, sanitized } = sanitizeVector(dirty as never);
    expect(sanitized).toBe(true);
    expect(vector.a).toBe(0);
  });

  it("treats null vector as all zeros", () => {
    const { vector, sanitized } = sanitizeVector(null);
    expect(sanitized).toBe(true);
    expect(vector.a).toBe(0);
    expect(vector.composite).toBe(0);
    expect(vector.confidence).toBe(0);
  });

  it("treats missing fields as 0", () => {
    const partial = { a: 22 };
    const { vector, sanitized } = sanitizeVector(partial as never);
    expect(sanitized).toBe(true);
    expect(vector.a).toBe(22);
    expect(vector.d).toBe(0);
    expect(vector.composite).toBe(0);
  });
});
