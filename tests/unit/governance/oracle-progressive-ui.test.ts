/**
 * Phase 21 F-F (ADR-0073) — Oracle progressive UI contract
 *
 * Invariants verrouillés :
 *
 * 1. Hook `useOracleStream(strategyId)` exporté depuis `src/hooks/`.
 * 2. Composants UI canoniques exportés depuis `src/components/cockpit/oracle/`.
 * 3. Hook subscribe sur les 6 sub-kinds NSP exhaustivement.
 * 4. Panel consomme `oracle.listSections` + `oracle.generateSection` +
 *    `oracle.retrySection` + `oracle.assembleOracle`.
 * 5. Page `proposition/page.tsx` insère le panel — voie unique (legacy déposé, ADR-0125).
 * 6. SectionCard a précédence stream "generating" > dbStatus pour UI feedback.
 */

import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const HOOK = path.resolve(__dirname, "../../../src/hooks/use-oracle-stream.ts");
const SECTION_CARD = path.resolve(__dirname, "../../../src/components/cockpit/oracle/section-card.tsx");
const LIVE_CONSOLE = path.resolve(__dirname, "../../../src/components/cockpit/oracle/live-console.tsx");
const FAILURE_MODAL = path.resolve(__dirname, "../../../src/components/cockpit/oracle/section-failure-modal.tsx");
const PANEL = path.resolve(__dirname, "../../../src/components/cockpit/oracle/progressive-panel.tsx");
const PROPOSITION_PAGE = path.resolve(__dirname, "../../../src/app/(cockpit)/cockpit/brand/proposition/page.tsx");

const ORACLE_KINDS = [
  "oracle_section_started",
  "oracle_section_completed",
  "oracle_section_failed",
  "oracle_assembler_started",
  "oracle_assembler_progress",
  "oracle_assembler_done",
] as const;

describe("ADR-0073 — useOracleStream hook", () => {
  it("file exists at canonical path", () => {
    expect(fs.existsSync(HOOK)).toBe(true);
  });

  it("subscribes to all 6 NSP sub-kinds exhaustively", () => {
    const src = fs.readFileSync(HOOK, "utf8");
    for (const kind of ORACLE_KINDS) {
      expect(src).toContain(`"${kind}"`);
    }
  });

  it("filters events by strategyId (multi-strategy guard)", () => {
    const src = fs.readFileSync(HOOK, "utf8");
    expect(src).toMatch(/evt\.strategyId\s*!==?\s*strategyId/);
  });

  it("opens EventSource on /api/notifications/stream (not custom path)", () => {
    const src = fs.readFileSync(HOOK, "utf8");
    expect(src).toContain('new EventSource("/api/notifications/stream")');
  });

  it("returns sectionsState Map + assemblerState + log + isStreaming + clearLog", () => {
    const src = fs.readFileSync(HOOK, "utf8");
    expect(src).toMatch(/sectionsState[:\s]/);
    expect(src).toMatch(/assemblerState[:\s]/);
    expect(src).toMatch(/log[:\s]/);
    expect(src).toMatch(/isStreaming[:\s]/);
    expect(src).toMatch(/clearLog[:\s]/);
  });

  it("caps log at MAX_LOG_LINES (no unbounded growth)", () => {
    const src = fs.readFileSync(HOOK, "utf8");
    expect(src).toContain("MAX_LOG_LINES");
    expect(src).toMatch(/length\s*>\s*MAX_LOG_LINES/);
  });
});

describe("ADR-0073 — UI components exist", () => {
  it("OracleSectionCard exported", () => {
    expect(fs.existsSync(SECTION_CARD)).toBe(true);
    const src = fs.readFileSync(SECTION_CARD, "utf8");
    expect(src).toContain("export function OracleSectionCard");
  });

  it("OracleLiveConsole exported", () => {
    expect(fs.existsSync(LIVE_CONSOLE)).toBe(true);
    const src = fs.readFileSync(LIVE_CONSOLE, "utf8");
    expect(src).toContain("export function OracleLiveConsole");
  });

  it("OracleSectionFailureModal exported", () => {
    expect(fs.existsSync(FAILURE_MODAL)).toBe(true);
    const src = fs.readFileSync(FAILURE_MODAL, "utf8");
    expect(src).toContain("export function OracleSectionFailureModal");
  });

  it("OracleProgressivePanel exported", () => {
    expect(fs.existsSync(PANEL)).toBe(true);
    const src = fs.readFileSync(PANEL, "utf8");
    expect(src).toContain("export function OracleProgressivePanel");
  });
});

describe("ADR-0073 — SectionCard precedence stream > dbStatus", () => {
  it("resolveEffectivePhase prefers streamPhase=generating over dbStatus", () => {
    const src = fs.readFileSync(SECTION_CARD, "utf8");
    expect(src).toContain("resolveEffectivePhase");
    // streamPhase generating wins
    expect(src).toMatch(/streamPhase\s*===\s*"generating"\s*\)\s*return\s*"generating"/);
  });

  it("offers FRESH / REGEN / RETRY action modes", () => {
    const src = fs.readFileSync(SECTION_CARD, "utf8");
    expect(src).toContain('"FRESH"');
    expect(src).toContain('"REGEN"');
    expect(src).toContain('"RETRY"');
  });

  it("RETRY mode is used for FAILED and STALE phases", () => {
    const src = fs.readFileSync(SECTION_CARD, "utf8");
    // Cherche les blocs qui retournent mode: "RETRY"
    expect(src).toMatch(/phase\s*===\s*"failed"/);
    expect(src).toMatch(/phase\s*===\s*"stale"/);
  });
});

describe("ADR-0073 — Panel consumes the canonical tRPC + hook surface", () => {
  it("uses oracle.listSections / generateSection / retrySection / assembleOracle", () => {
    const src = fs.readFileSync(PANEL, "utf8");
    expect(src).toContain("oracle.listSections");
    expect(src).toContain("oracle.generateSection");
    expect(src).toContain("oracle.retrySection");
    expect(src).toContain("oracle.assembleOracle");
  });

  it("uses useOracleStream hook (not custom EventSource)", () => {
    const src = fs.readFileSync(PANEL, "utf8");
    expect(src).toContain("useOracleStream(strategyId)");
    expect(src).not.toContain("new EventSource");
  });

  it("scope dropdown offers ALL / MISSING / STALE", () => {
    const src = fs.readFileSync(PANEL, "utf8");
    expect(src).toContain('"ALL"');
    expect(src).toContain('"MISSING"');
    expect(src).toContain('"STALE"');
  });

  it("renders OracleSectionCard + OracleLiveConsole + OracleSectionFailureModal", () => {
    const src = fs.readFileSync(PANEL, "utf8");
    expect(src).toContain("<OracleSectionCard");
    expect(src).toContain("<OracleLiveConsole");
    expect(src).toContain("OracleSectionFailureModal");
  });
});

describe("ADR-0073 — proposition/page.tsx integration", () => {
  it("imports OracleProgressivePanel", () => {
    const src = fs.readFileSync(PROPOSITION_PAGE, "utf8");
    expect(src).toContain("OracleProgressivePanel");
    expect(src).toContain("@/components/cockpit/oracle/progressive-panel");
  });

  it("renders OracleProgressivePanel in the JSX", () => {
    const src = fs.readFileSync(PROPOSITION_PAGE, "utf8");
    expect(src).toContain("<OracleProgressivePanel");
  });

});
