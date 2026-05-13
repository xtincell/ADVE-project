/**
 * Phase 21 extension — Intake stream events (NEFER session 2026-05-13)
 *
 * Mirror du test ADR-0072 pour la cascade `complete()` du commercial-critique
 * (cf. `oracle-stream-events.test.ts`). Le founder ne voit plus un spinner
 * 70s : il voit son diagnostic se construire en 5 jalons.
 *
 * Invariants verrouillés :
 *
 * 1. NSP `IntakeStreamEvent` discriminated union avec 6 sub-kinds canoniques.
 * 2. Naming canon : `intake_*` (started/extracted/scored/narrative_done/completed/failed).
 * 3. Tous les emitters exportés depuis `quick-intake/stream-events.ts`.
 * 4. Tous les emitters wrappent `nsp.publish` (best-effort, jamais throw).
 * 5. `complete()` émet `started` après lookup, `failed` dans le catch.
 * 6. Les 4 jalons UI (extracted/scored/narrative_done/completed) sont câblés
 *    dans l'ordre du flow — pas de jalon importé mais jamais émis (drift).
 * 7. NspEvent union inclut IntakeStreamEvent.
 */

import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const INDEX = path.resolve(__dirname, "../../../src/server/services/quick-intake/index.ts");
const STREAM_EVENTS = path.resolve(
  __dirname,
  "../../../src/server/services/quick-intake/stream-events.ts",
);
const NSP_EVENT_TYPES = path.resolve(__dirname, "../../../src/server/services/nsp/event-types.ts");
const NSP_INDEX = path.resolve(__dirname, "../../../src/server/services/nsp/index.ts");

const CANONICAL_KINDS = [
  "intake_started",
  "intake_extracted",
  "intake_scored",
  "intake_narrative_done",
  "intake_completed",
  "intake_failed",
] as const;

const EMITTERS = [
  "emitIntakeStarted",
  "emitIntakeExtracted",
  "emitIntakeScored",
  "emitIntakeNarrativeDone",
  "emitIntakeCompleted",
  "emitIntakeFailed",
] as const;

describe("NSP IntakeStreamEvent contract", () => {
  it("event-types.ts declares all 6 canonical kinds", () => {
    const src = fs.readFileSync(NSP_EVENT_TYPES, "utf8");
    for (const kind of CANONICAL_KINDS) {
      expect(src).toContain(`"${kind}"`);
    }
  });

  it("event-types.ts exports IntakeStreamEvent union of 6 sub-types", () => {
    const src = fs.readFileSync(NSP_EVENT_TYPES, "utf8");
    expect(src).toContain("export type IntakeStreamEvent");
    for (const evt of [
      "IntakeStartedEvent",
      "IntakeExtractedEvent",
      "IntakeScoredEvent",
      "IntakeNarrativeDoneEvent",
      "IntakeCompletedEvent",
      "IntakeFailedEvent",
    ]) {
      expect(src).toContain(evt);
    }
  });

  it("NspEvent union includes IntakeStreamEvent", () => {
    const src = fs.readFileSync(NSP_EVENT_TYPES, "utf8");
    expect(src).toMatch(/NspEvent[\s\S]*IntakeStreamEvent/);
  });

  it("nsp/index.ts re-exports the 6 event types", () => {
    const src = fs.readFileSync(NSP_INDEX, "utf8");
    for (const evt of [
      "IntakeStartedEvent",
      "IntakeExtractedEvent",
      "IntakeScoredEvent",
      "IntakeNarrativeDoneEvent",
      "IntakeCompletedEvent",
      "IntakeFailedEvent",
    ]) {
      expect(src).toContain(evt);
    }
  });
});

describe("quick-intake/stream-events.ts emitters", () => {
  it("file exists and exports the 6 canonical emitters", async () => {
    expect(fs.existsSync(STREAM_EVENTS)).toBe(true);
    const mod = await import("@/server/services/quick-intake/stream-events");
    for (const fn of EMITTERS) {
      expect(typeof (mod as Record<string, unknown>)[fn]).toBe("function");
    }
  });

  it("each emitter wraps nsp.publish (best-effort — never throws)", () => {
    const src = fs.readFileSync(STREAM_EVENTS, "utf8");
    for (const fn of EMITTERS) {
      const re = new RegExp(`export function ${fn}[\\s\\S]*?bestEffort`);
      expect(src).toMatch(re);
    }
    expect(src).toMatch(/function bestEffort[\s\S]*try[\s\S]*catch/);
  });

  it("routing by intakeToken (anonymous pre-conversion — no userId)", () => {
    const src = fs.readFileSync(STREAM_EVENTS, "utf8");
    // BaseEmitArgs must carry intakeToken, not userId
    expect(src).toContain("intakeToken: string");
    expect(src).toContain("BaseEmitArgs");
    expect(src).toContain("publish(args.intakeToken");
  });
});

describe("complete() wires all 5 milestones + failed path", () => {
  it("imports all 6 emitters in complete()", () => {
    const src = fs.readFileSync(INDEX, "utf8");
    for (const fn of EMITTERS) {
      expect(src, `Missing import: ${fn}`).toContain(fn);
    }
  });

  it("emits started after lookup + before try block", () => {
    const src = stripComments(fs.readFileSync(INDEX, "utf8"));
    const lookupIdx = src.indexOf("findUnique");
    const startedIdx = src.indexOf("emitIntakeStarted(");
    const tryIdx = src.indexOf("try {", startedIdx);
    expect(lookupIdx).toBeGreaterThan(0);
    expect(startedIdx).toBeGreaterThan(lookupIdx);
    expect(tryIdx).toBeGreaterThan(startedIdx);
  });

  it("emits the 4 UI milestones in canonical order: extracted → scored → narrative_done → completed", () => {
    const src = stripComments(fs.readFileSync(INDEX, "utf8"));
    const extractedIdx = src.indexOf("emitIntakeExtracted(");
    const scoredIdx = src.indexOf("emitIntakeScored(");
    const narrativeIdx = src.indexOf("emitIntakeNarrativeDone(");
    const completedIdx = src.indexOf("emitIntakeCompleted(");
    expect(extractedIdx, "emitIntakeExtracted must be present").toBeGreaterThan(0);
    expect(scoredIdx).toBeGreaterThan(extractedIdx);
    expect(narrativeIdx).toBeGreaterThan(scoredIdx);
    expect(completedIdx).toBeGreaterThan(narrativeIdx);
  });

  it("emits failed in the catch block (error path coverage)", () => {
    const src = fs.readFileSync(INDEX, "utf8");
    // Le catch doit contenir emitIntakeFailed
    expect(src).toMatch(/catch\s*\(\s*err[\s\S]*?emitIntakeFailed\(/);
  });

  it("filledPillars tracking is wired through the for...of write loop", () => {
    const src = stripComments(fs.readFileSync(INDEX, "utf8"));
    // Le tracker doit être déclaré comme array de strings
    expect(src).toContain("const filledPillars: string[]");
    // Et muté dans le if(...writeGateway) du loop
    expect(src).toMatch(/filledPillars\.push\(pillar\)/);
    // Et passé à emitIntakeExtracted
    expect(src).toMatch(/emitIntakeExtracted\(\s*\{[\s\S]*?filledPillars[\s\S]*?\}/);
  });
});

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
}
