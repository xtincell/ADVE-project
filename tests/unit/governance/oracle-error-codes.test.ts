/**
 * tests/unit/governance/oracle-error-codes.test.ts — anti-drift CI (ADR-0014).
 *
 * Vérifie l'invariant du catalogue OracleError :
 *   - tous les codes matchent le pattern `ORACLE-NNN`
 *   - tous les governors sont dans l'enum (5 valeurs)
 *   - toOracleError fallback marche pour les types non-Oracle
 *   - OracleError.toCausePayload est sérialisable JSON sans cycle
 *   - chaque OracleErrorCode utilisé dans le code source est listé au catalogue
 */

import { describe, it, expect } from "vitest";
import {
  ORACLE_ERROR_CODES,
  OracleError,
  toOracleError,
  isOracleErrorCode,
  lookupOracleEntry,
  type OracleErrorCode,
} from "@/server/services/strategy-presentation/error-codes";

const VALID_GOVERNORS = ["MESTOR", "ARTEMIS", "SESHAT", "THOT", "INFRASTRUCTURE"] as const;

describe("OracleError catalog", () => {
  it("every code matches /^ORACLE-\\d{3}$/", () => {
    for (const code of Object.keys(ORACLE_ERROR_CODES)) {
      expect(code).toMatch(/^ORACLE-\d{3}$/);
    }
  });

  it("every entry has a non-empty fr message and hint", () => {
    for (const [code, entry] of Object.entries(ORACLE_ERROR_CODES)) {
      expect(entry.fr.length, `${code}.fr`).toBeGreaterThan(10);
      expect(entry.hint.length, `${code}.hint`).toBeGreaterThan(10);
    }
  });

  it("every entry's governor is in the canonical enum", () => {
    for (const [code, entry] of Object.entries(ORACLE_ERROR_CODES)) {
      expect(VALID_GOVERNORS, `${code}.governor`).toContain(entry.governor);
    }
  });

  it("every entry has a recoverable boolean", () => {
    for (const [code, entry] of Object.entries(ORACLE_ERROR_CODES)) {
      expect(typeof entry.recoverable, `${code}.recoverable`).toBe("boolean");
    }
  });

  it("isOracleErrorCode validates listed codes and rejects others", () => {
    for (const code of Object.keys(ORACLE_ERROR_CODES)) {
      expect(isOracleErrorCode(code)).toBe(true);
    }
    expect(isOracleErrorCode("ORACLE-9999")).toBe(false);
    expect(isOracleErrorCode("oracle-101")).toBe(false);
    expect(isOracleErrorCode("PTAH-101")).toBe(false);
    expect(isOracleErrorCode(null)).toBe(false);
    expect(isOracleErrorCode(undefined)).toBe(false);
  });

  it("lookupOracleEntry returns the right entry", () => {
    const entry = lookupOracleEntry("ORACLE-101");
    expect(entry.governor).toBe("MESTOR");
    expect(entry.recoverable).toBe(true);
  });
});

describe("OracleError class", () => {
  it("formats message as [code] fr", () => {
    const err = new OracleError("ORACLE-201", { frameworkSlug: "fw-04" });
    expect(err.message).toBe("[ORACLE-201] " + ORACLE_ERROR_CODES["ORACLE-201"].fr);
    expect(err.code).toBe("ORACLE-201");
    expect(err.context.frameworkSlug).toBe("fw-04");
  });

  it("toCausePayload returns a flat JSON-serialisable structure", () => {
    const err = new OracleError("ORACLE-101", { strategyId: "s_abc", count: 3 });
    const payload = err.toCausePayload();
    // Must be safely stringifiable — no circular, no proxies, no functions.
    const json = JSON.stringify(payload);
    expect(json).toContain("ORACLE-101");
    expect(json).toContain("MESTOR");
    expect(JSON.parse(json)).toMatchObject({
      code: "ORACLE-101",
      governor: "MESTOR",
      recoverable: true,
      context: { strategyId: "s_abc", count: 3 },
    });
  });

  it("preserves original cause when provided", () => {
    const root = new Error("kaboom");
    const err = new OracleError("ORACLE-999", {}, { cause: root });
    expect((err as unknown as { cause: unknown }).cause).toBe(root);
  });
});

describe("toOracleError fallback", () => {
  it("returns the same OracleError if already typed", () => {
    const err = new OracleError("ORACLE-201", {});
    expect(toOracleError(err)).toBe(err);
  });

  it("maps ReadinessVetoError → ORACLE-101", () => {
    const fake = Object.assign(new Error("not ready"), {
      name: "ReadinessVetoError",
      blockers: [{ pillarKey: "a", gate: "ORACLE_ENRICH" }],
    });
    const out = toOracleError(fake);
    expect(out.code).toBe("ORACLE-101");
    expect((out.context.blockers as unknown[]).length).toBe(1);
  });

  it("maps CostVetoError → ORACLE-102", () => {
    const fake = Object.assign(new Error("budget"), {
      name: "CostVetoError",
      result: { decision: "VETO", reason: "monthly cap" },
    });
    const out = toOracleError(fake);
    expect(out.code).toBe("ORACLE-102");
  });

  it("falls back to ORACLE-999 for unknown errors", () => {
    const out = toOracleError(new Error("random"));
    expect(out.code).toBe("ORACLE-999");
    expect(out.context.originalMessage).toBe("random");
  });

  it("falls back to ORACLE-999 for non-Error throws (e.g. string)", () => {
    const out = toOracleError("plain string");
    expect(out.code).toBe("ORACLE-999");
    expect(out.context.originalMessage).toBe("plain string");
  });
});

describe("Catalog completeness — codes referenced in code paths", () => {
  // Hard-coded list of codes the implementation actively throws / captures.
  // Update this list when adding a new throw site so the catalog must follow.
  const REFERENCED_CODES: OracleErrorCode[] = [
    "ORACLE-101",
    "ORACLE-102",
    "ORACLE-201",
    "ORACLE-202",
    "ORACLE-205",
    "ORACLE-206",
    "ORACLE-301",
    "ORACLE-303",
    "ORACLE-901",
    "ORACLE-999",
  ];

  it.each(REFERENCED_CODES)("%s is present in the catalog", (code) => {
    expect(ORACLE_ERROR_CODES[code], `Missing entry for referenced ${code}`).toBeDefined();
  });
});
