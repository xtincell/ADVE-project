/**
 * Phase 21 F-E (ADR-0072) — Oracle stream events
 *
 * Invariants verrouillés :
 *
 * 1. NSP `OracleStreamEvent` discriminated union avec 6 sub-kinds canoniques.
 * 2. Naming canon : `oracle_section_*` + `oracle_assembler_*` (pas de variantes).
 * 3. Tous les emitters exportés depuis `oracle-section/stream-events.ts`.
 * 4. Tous les emitters wrappent `nsp.publish` (best-effort, jamais throw).
 * 5. Handler section (`generateOracleSectionHandler`) émet STARTED + COMPLETED
 *    OU FAILED (pas les deux) sur tous les chemins de retour.
 * 6. Handler assembler émet STARTED + PROGRESS+ + DONE sur tous les chemins.
 * 7. NspEvent union étendue pour inclure OracleStreamEvent.
 */

import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const HANDLER = path.resolve(__dirname, "../../../src/server/services/oracle-section/handler.ts");
const ASSEMBLER = path.resolve(__dirname, "../../../src/server/services/oracle-section/assembler.ts");
const STREAM_EVENTS = path.resolve(__dirname, "../../../src/server/services/oracle-section/stream-events.ts");
const NSP_EVENT_TYPES = path.resolve(__dirname, "../../../src/server/services/nsp/event-types.ts");

const CANONICAL_KINDS = [
  "oracle_section_started",
  "oracle_section_completed",
  "oracle_section_failed",
  "oracle_assembler_started",
  "oracle_assembler_progress",
  "oracle_assembler_done",
] as const;

describe("ADR-0072 — NSP OracleStreamEvent contract", () => {
  it("event-types.ts declares all 6 canonical kinds", () => {
    const src = fs.readFileSync(NSP_EVENT_TYPES, "utf8");
    for (const kind of CANONICAL_KINDS) {
      expect(src).toContain(`"${kind}"`);
    }
  });

  it("event-types.ts exports OracleStreamEvent union of 6 sub-types", () => {
    const src = fs.readFileSync(NSP_EVENT_TYPES, "utf8");
    expect(src).toContain("export type OracleStreamEvent");
    expect(src).toContain("OracleSectionStartedEvent");
    expect(src).toContain("OracleSectionCompletedEvent");
    expect(src).toContain("OracleSectionFailedEvent");
    expect(src).toContain("OracleAssemblerStartedEvent");
    expect(src).toContain("OracleAssemblerProgressEvent");
    expect(src).toContain("OracleAssemblerDoneEvent");
  });

  it("NspEvent union includes OracleStreamEvent", () => {
    const src = fs.readFileSync(NSP_EVENT_TYPES, "utf8");
    // NspEvent doit avoir | OracleStreamEvent
    expect(src).toMatch(/NspEvent[\s\S]*OracleStreamEvent/);
  });

  it("nsp/index.ts re-exports the 6 event types + OracleStreamEvent", async () => {
    const file = path.resolve(__dirname, "../../../src/server/services/nsp/index.ts");
    const src = fs.readFileSync(file, "utf8");
    expect(src).toContain("OracleStreamEvent");
    for (const evt of [
      "OracleSectionStartedEvent",
      "OracleSectionCompletedEvent",
      "OracleSectionFailedEvent",
      "OracleAssemblerStartedEvent",
      "OracleAssemblerProgressEvent",
      "OracleAssemblerDoneEvent",
    ]) {
      expect(src).toContain(evt);
    }
  });
});

describe("ADR-0072 — stream-events.ts emitters", () => {
  it("file exists and exports the 6 canonical emitters", async () => {
    expect(fs.existsSync(STREAM_EVENTS)).toBe(true);
    const mod = await import("@/server/services/oracle-section/stream-events");
    expect(typeof mod.emitSectionStarted).toBe("function");
    expect(typeof mod.emitSectionCompleted).toBe("function");
    expect(typeof mod.emitSectionFailed).toBe("function");
    expect(typeof mod.emitAssemblerStarted).toBe("function");
    expect(typeof mod.emitAssemblerProgress).toBe("function");
    expect(typeof mod.emitAssemblerDone).toBe("function");
  });

  it("each emitter wraps nsp.publish (best-effort — never throws)", () => {
    const src = fs.readFileSync(STREAM_EVENTS, "utf8");
    // Toutes les fonctions emit doivent passer par bestEffort()
    for (const fn of [
      "emitSectionStarted",
      "emitSectionCompleted",
      "emitSectionFailed",
      "emitAssemblerStarted",
      "emitAssemblerProgress",
      "emitAssemblerDone",
    ]) {
      const re = new RegExp(`export function ${fn}[\\s\\S]*?bestEffort`);
      expect(src).toMatch(re);
    }
    // bestEffort() doit avoir un try/catch
    expect(src).toMatch(/function bestEffort[\s\S]*try[\s\S]*catch/);
  });

  it("emitters never expose strategyId/userId mutable globals — accept them as args", () => {
    const src = fs.readFileSync(STREAM_EVENTS, "utf8");
    // Pure function pattern — userId + strategyId dans args, pas dans closure
    expect(src).toContain("BaseEmitArgs");
    expect(src).toContain("userId: string");
    expect(src).toContain("strategyId: string");
  });
});

describe("ADR-0072 — Section handler emits stream events", () => {
  it("imports the 3 section emitters", () => {
    const src = fs.readFileSync(HANDLER, "utf8");
    expect(src).toContain("emitSectionStarted");
    expect(src).toContain("emitSectionCompleted");
    expect(src).toContain("emitSectionFailed");
  });

  it("calls emitSectionStarted after lock acquisition", () => {
    // Strip comments to compare order on actual code, not on comment mentions.
    const src = stripComments(fs.readFileSync(HANDLER, "utf8"));
    const lockIdx = src.indexOf("acquireGenerationLock(");
    const startedIdx = src.indexOf("emitSectionStarted(");
    const dispatchIdx = src.indexOf("dispatchRunner(");
    expect(lockIdx).toBeGreaterThan(0);
    expect(startedIdx).toBeGreaterThan(lockIdx);
    expect(dispatchIdx).toBeGreaterThan(startedIdx);
  });

  it("calls emitSectionCompleted on success path AND emitSectionFailed on failure paths", () => {
    const src = fs.readFileSync(HANDLER, "utf8");
    // Au moins 1 emitSectionCompleted + au moins 2 emitSectionFailed (runner fail + persist fail)
    const completedMatches = src.match(/emitSectionCompleted/g) ?? [];
    const failedMatches = src.match(/emitSectionFailed/g) ?? [];
    expect(completedMatches.length).toBeGreaterThanOrEqual(1);
    expect(failedMatches.length).toBeGreaterThanOrEqual(2);
  });
});

describe("ADR-0072 — Assembler emits stream events", () => {
  it("imports the 3 assembler emitters", () => {
    const src = fs.readFileSync(ASSEMBLER, "utf8");
    expect(src).toContain("emitAssemblerStarted");
    expect(src).toContain("emitAssemblerProgress");
    expect(src).toContain("emitAssemblerDone");
  });

  it("emits STARTED before the loop and DONE after the loop", () => {
    const src = stripComments(fs.readFileSync(ASSEMBLER, "utf8"));
    const startedIdx = src.indexOf("emitAssemblerStarted(");
    const loopIdx = src.indexOf("for (const section of targets)");
    // Le 1er DONE est dans le bloc empty-scope (avant boucle) ; le 2ème DONE
    // est après la boucle. On valide que LE DERNIER DONE est après la boucle.
    const doneIdxLast = src.lastIndexOf("emitAssemblerDone(");
    expect(startedIdx).toBeGreaterThan(0);
    expect(loopIdx).toBeGreaterThan(startedIdx);
    expect(doneIdxLast).toBeGreaterThan(loopIdx);
  });

  it("emits PROGRESS at least once per iteration (currentSectionId)", () => {
    const src = fs.readFileSync(ASSEMBLER, "utf8");
    // PROGRESS dans la boucle pour signaler currentSectionId
    expect(src).toContain("emitAssemblerProgress");
    expect(src).toContain("currentSectionId");
  });

  it("emits DONE on empty-scope path too (no early return without DONE)", () => {
    const src = fs.readFileSync(ASSEMBLER, "utf8");
    // 2 occurrences DONE attendues : empty-scope path + after-loop path
    const doneMatches = src.match(/emitAssemblerDone/g) ?? [];
    expect(doneMatches.length).toBeGreaterThanOrEqual(2);
  });
});

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
}

describe("ADR-0072 — Manual-first parity preserved (F-D regression test)", () => {
  it("assembler.ts still does NOT call any LLM/runner primitive directly", () => {
    const src = fs.readFileSync(ASSEMBLER, "utf8");
    const codeOnly = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    for (const pattern of [
      "executeStructuredLLMCall",
      "executeSequence(",
      "executeFramework(",
      "executeTool(",
      "callLLM(",
      "callLLMAndParse(",
    ]) {
      expect(codeOnly, `Pattern interdit présent: ${pattern}`).not.toContain(pattern);
    }
  });
});
