/**
 * Phase 21 F-D (ADR-0071) — Manual-first parity enforcement
 *
 * **Invariant bloquant** :
 *
 *   Le handler `ASSEMBLE_ORACLE` NE DOIT JAMAIS appeler directement les
 *   primitives de génération LLM ou de dispatch runner. Il DOIT uniquement
 *   émettre `mestor.emitIntent({ kind: "GENERATE_ORACLE_SECTION", ... })`.
 *
 * Cohérent avec ADR-0060 (LLM as UI orchestrator manual-first) — toute
 * feature LLM a son chemin manuel équivalent. L'Assembler est l'agrégateur
 * du chemin manuel, pas un chemin parallèle.
 *
 * Patterns interdits dans `oracle-section/assembler.ts` :
 *   - executeStructuredLLMCall
 *   - executeSequence
 *   - executeFramework
 *   - executeTool
 *   - callLLM
 *   - callLLMAndParse
 *
 * Test mode HARD (pas de baseline) : toute violation fait FAIL la CI.
 */

import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const ASSEMBLER = path.resolve(
  __dirname,
  "../../../src/server/services/oracle-section/assembler.ts",
);

const FORBIDDEN_PATTERNS = [
  "executeStructuredLLMCall",
  "executeSequence(",
  "executeFramework(",
  "executeTool(",
  "callLLM(",
  "callLLMAndParse(",
];

describe("ADR-0071 — Assembler uses manual-first path only", () => {
  it("file exists at canonical path", () => {
    expect(fs.existsSync(ASSEMBLER)).toBe(true);
  });

  it("does NOT import or call any LLM/runner primitive directly", () => {
    const src = fs.readFileSync(ASSEMBLER, "utf8");

    // Strip block comments (/** ... */) + line comments (//) so the
    // documentation explaining what's forbidden doesn't trip the check.
    const codeOnly = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");

    for (const pattern of FORBIDDEN_PATTERNS) {
      expect(codeOnly, `Pattern interdit présent: ${pattern}`).not.toContain(pattern);
    }
  });

  it("emits GENERATE_ORACLE_SECTION via mestor.emitIntent", () => {
    const src = fs.readFileSync(ASSEMBLER, "utf8");
    expect(src).toContain('kind: "GENERATE_ORACLE_SECTION"');
    expect(src).toContain("emitIntent");
  });

  it("loops over targets (resilient — no early throw on FAILED)", () => {
    const src = fs.readFileSync(ASSEMBLER, "utf8");
    // Le handler boucle sur targets et capture les erreurs par section
    expect(src).toContain("for (const section of targets)");
    expect(src).toContain("try {");
    expect(src).toContain("catch (err)");
  });

  it("supports the 4 scope variants (ALL / MISSING / STALE / explicit list)", () => {
    const src = fs.readFileSync(ASSEMBLER, "utf8");
    expect(src).toContain('case "ALL":');
    expect(src).toContain('case "MISSING":');
    expect(src).toContain('case "STALE":');
    expect(src).toContain("Array.isArray(scope)");
  });

  it("auto-detects mode per section (PENDING→FRESH, COMPLETE→REGEN, FAILED/STALE→RETRY)", () => {
    const src = fs.readFileSync(ASSEMBLER, "utf8");
    expect(src).toContain("autoDetectMode");
    expect(src).toContain('case "PENDING":');
    expect(src).toContain('case "COMPLETE":');
    expect(src).toContain('return "FRESH"');
    expect(src).toContain('return "REGEN"');
    expect(src).toContain('return "RETRY"');
  });

  it("returns a structured summary { total, succeeded, failed, overallStatus, results }", () => {
    const src = fs.readFileSync(ASSEMBLER, "utf8");
    expect(src).toContain("succeeded");
    expect(src).toContain("failed");
    expect(src).toContain("overallStatus");
    expect(src).toContain("results");
  });
});

describe("ADR-0071 — Intent kind + dispatch + tRPC", () => {
  it("Intent kind ASSEMBLE_ORACLE registered with governor=ARTEMIS", async () => {
    const { INTENT_KINDS } = await import("@/server/governance/intent-kinds");
    const entry = INTENT_KINDS.find((k) => k.kind === "ASSEMBLE_ORACLE");
    expect(entry).toBeDefined();
    expect(entry?.governor).toBe("ARTEMIS");
    expect(entry?.handler).toBe("oracle-section");
    expect(entry?.async).toBe(true);
  });

  it("SLO budget present (errorRate ≤ 0.10 — resilient by design)", async () => {
    const { INTENT_SLOS } = await import("@/server/governance/slos");
    const slo = INTENT_SLOS.find((s) => s.kind === "ASSEMBLE_ORACLE");
    expect(slo).toBeDefined();
    expect(slo!.errorRatePct).toBeLessThanOrEqual(0.10);
  });

  it("Mestor commandant ARTEMIS dispatches ASSEMBLE_ORACLE", () => {
    const file = path.resolve(__dirname, "../../../src/server/services/artemis/commandant.ts");
    const src = fs.readFileSync(file, "utf8");
    expect(src).toContain('case "ASSEMBLE_ORACLE"');
    expect(src).toContain("assembleOracleHandler");
  });

  it("intentTouchesPillars returns [] for ASSEMBLE_ORACLE", async () => {
    const { intentTouchesPillars } = await import("@/server/services/mestor/intents");
    const result = intentTouchesPillars({
      kind: "ASSEMBLE_ORACLE",
      strategyId: "s",
      scope: "ALL",
      operatorId: "u",
    });
    expect(result).toEqual([]);
  });

  it("tRPC oracle.assembleOracle mutation registered", () => {
    const file = path.resolve(__dirname, "../../../src/server/trpc/routers/oracle.ts");
    const src = fs.readFileSync(file, "utf8");
    expect(src).toContain("assembleOracle");
    expect(src).toContain('kind: "ASSEMBLE_ORACLE"');
  });
});
