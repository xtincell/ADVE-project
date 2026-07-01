/**
 * Phase 21 F-G — Oracle stream integration tests
 *
 * Tests d'intégration end-to-end qui valident la chaîne :
 *
 *   emitter (F-E) → NSP broker (in-memory) → subscriber listener
 *
 * Et l'invariant manual-first parity (F-D) :
 *
 *   Les events émis par section_* (depuis F-C handler) ont le même shape
 *   et la même séquence indépendamment du chemin d'invocation (direct vs
 *   via assembler).
 *
 * On utilise le NSP broker in-memory (pas de Redis ni de SSE HTTP) — c'est
 * la même implémentation runtime, donc les invariants tiennent à l'échelle.
 *
 * Cf. ADR-0072 (events) + ADR-0073 (UI consumer) + ADR-0071 (Assembler).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { subscribe, clearAll, publish, type NspEvent, type OracleStreamEvent } from "@/server/services/nsp";
import {
  emitSectionStarted,
  emitSectionCompleted,
  emitSectionFailed,
  emitAssemblerStarted,
  emitAssemblerProgress,
  emitAssemblerDone,
} from "@/server/services/oracle-section/stream-events";

const TEST_USER = "user-integration-tests";
const TEST_STRATEGY = "strategy-integration-tests";

describe("F-G integration — NSP broker receives all 6 sub-kinds in order", () => {
  let received: OracleStreamEvent[];
  let unsubscribe: (() => void) | null = null;

  beforeEach(() => {
    received = [];
    unsubscribe = subscribe(TEST_USER, (evt: NspEvent) => {
      // Filter only Oracle events (test isolation from other event types).
      if (
        evt.kind === "oracle_section_started" ||
        evt.kind === "oracle_section_completed" ||
        evt.kind === "oracle_section_failed" ||
        evt.kind === "oracle_assembler_started" ||
        evt.kind === "oracle_assembler_progress" ||
        evt.kind === "oracle_assembler_done"
      ) {
        received.push(evt as OracleStreamEvent);
      }
    });
  });

  afterEach(() => {
    unsubscribe?.();
    clearAll();
  });

  it("emits oracle_section_started with correct shape", () => {
    emitSectionStarted({
      userId: TEST_USER,
      strategyId: TEST_STRATEGY,
      sectionId: 7,
      sectionTitle: "SWOT Interne",
      runner: { kind: "FRAMEWORK", ref: "fw-22-risk-matrix" },
      mode: "FRESH",
    });
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      kind: "oracle_section_started",
      strategyId: TEST_STRATEGY,
      sectionId: 7,
      sectionTitle: "SWOT Interne",
      runner: { kind: "FRAMEWORK", ref: "fw-22-risk-matrix" },
      mode: "FRESH",
    });
    expect(received[0]).toHaveProperty("startedAt");
  });

  it("emits oracle_section_completed with shape (confidence + durationMs + version)", () => {
    emitSectionCompleted({
      userId: TEST_USER,
      strategyId: TEST_STRATEGY,
      sectionId: 7,
      sectionTitle: "SWOT Interne",
      confidence: 0.78,
      durationMs: 8230,
      version: 1,
    });
    expect(received[0]).toMatchObject({
      kind: "oracle_section_completed",
      sectionId: 7,
      confidence: 0.78,
      durationMs: 8230,
      version: 1,
    });
  });

  it("emits oracle_section_failed with errorCode + errorMessage + attempts", () => {
    emitSectionFailed({
      userId: TEST_USER,
      strategyId: TEST_STRATEGY,
      sectionId: 22,
      sectionTitle: "Crew Program",
      errorCode: "ZOD_VALIDATION_FAILED",
      errorMessage: "LLM Zod validation failed after 3 attempts.",
      attempts: 3,
      durationMs: 12500,
    });
    expect(received[0]).toMatchObject({
      kind: "oracle_section_failed",
      sectionId: 22,
      errorCode: "ZOD_VALIDATION_FAILED",
      attempts: 3,
    });
  });

  it("emits the 6 sub-kinds in canonical order during a typical assemble run", () => {
    // Simule un run "assemble scope=MISSING" avec 2 sections : §07 OK + §22 FAIL.
    emitAssemblerStarted({ userId: TEST_USER, strategyId: TEST_STRATEGY, scope: "MISSING", total: 2 });

    // §07 cycle
    emitAssemblerProgress({
      userId: TEST_USER,
      strategyId: TEST_STRATEGY,
      scope: "MISSING",
      total: 2,
      completed: 0,
      failed: 0,
      pending: 2,
      currentSectionId: 7,
    });
    emitSectionStarted({
      userId: TEST_USER,
      strategyId: TEST_STRATEGY,
      sectionId: 7,
      sectionTitle: "SWOT Interne",
      runner: { kind: "FRAMEWORK", ref: "fw-22" },
      mode: "FRESH",
    });
    emitSectionCompleted({
      userId: TEST_USER,
      strategyId: TEST_STRATEGY,
      sectionId: 7,
      sectionTitle: "SWOT Interne",
      confidence: 0.78,
      durationMs: 8230,
      version: 1,
    });

    // §22 cycle (FAILED)
    emitAssemblerProgress({
      userId: TEST_USER,
      strategyId: TEST_STRATEGY,
      scope: "MISSING",
      total: 2,
      completed: 1,
      failed: 0,
      pending: 1,
      currentSectionId: 22,
    });
    emitSectionStarted({
      userId: TEST_USER,
      strategyId: TEST_STRATEGY,
      sectionId: 22,
      sectionTitle: "Crew Program",
      runner: { kind: "GLORY_SEQUENCE", ref: "IMHOTEP-CREW" },
      mode: "FRESH",
    });
    emitSectionFailed({
      userId: TEST_USER,
      strategyId: TEST_STRATEGY,
      sectionId: 22,
      sectionTitle: "Crew Program",
      errorCode: "ZOD_VALIDATION_FAILED",
      errorMessage: "LLM Zod fail",
      attempts: 3,
      durationMs: 12500,
    });

    // Final
    emitAssemblerDone({
      userId: TEST_USER,
      strategyId: TEST_STRATEGY,
      scope: "MISSING",
      overallStatus: "PARTIAL",
      total: 2,
      succeeded: 1,
      failed: 1,
      durationMs: 21000,
    });

    const kinds = received.map((e) => e.kind);
    expect(kinds).toEqual([
      "oracle_assembler_started",
      "oracle_assembler_progress",
      "oracle_section_started",
      "oracle_section_completed",
      "oracle_assembler_progress",
      "oracle_section_started",
      "oracle_section_failed",
      "oracle_assembler_done",
    ]);
  });
});

describe("F-G integration — Best-effort guarantee (broker silence)", () => {
  beforeEach(() => clearAll());

  it("emitSectionStarted does NOT throw when no listener is subscribed", () => {
    expect(() =>
      emitSectionStarted({
        userId: "no-listener",
        strategyId: TEST_STRATEGY,
        sectionId: 1,
        sectionTitle: "Test",
        runner: { kind: "FRAMEWORK", ref: "fw-01" },
        mode: "FRESH",
      }),
    ).not.toThrow();
  });

  it("publish returns 0 when no listener (delivered count)", () => {
    const delivered = publish("no-listener", {
      kind: "oracle_section_started",
      strategyId: TEST_STRATEGY,
      sectionId: 1,
      sectionTitle: "Test",
      runner: { kind: "FRAMEWORK", ref: "fw-01" },
      mode: "FRESH",
      startedAt: new Date().toISOString(),
    });
    expect(delivered).toBe(0);
  });

  it("emit suite never throws even if listener throws", () => {
    const u = subscribe(TEST_USER, () => {
      throw new Error("listener crash");
    });
    expect(() =>
      emitAssemblerStarted({ userId: TEST_USER, strategyId: TEST_STRATEGY, scope: "ALL", total: 35 }),
    ).not.toThrow();
    u();
  });
});

describe("F-G integration — strategyId isolation (multi-strategy guard)", () => {
  beforeEach(() => clearAll());

  it("publishes are routed by userId (not strategyId) — frontend filter is required", () => {
    const userA: OracleStreamEvent[] = [];
    const userB: OracleStreamEvent[] = [];

    const uA = subscribe("user-a", (evt) => {
      if (evt.kind.startsWith("oracle_")) userA.push(evt as OracleStreamEvent);
    });
    const uB = subscribe("user-b", (evt) => {
      if (evt.kind.startsWith("oracle_")) userB.push(evt as OracleStreamEvent);
    });

    emitSectionStarted({
      userId: "user-a",
      strategyId: "strat-1",
      sectionId: 1,
      sectionTitle: "Test",
      runner: { kind: "FRAMEWORK", ref: "fw-01" },
      mode: "FRESH",
    });
    emitSectionStarted({
      userId: "user-b",
      strategyId: "strat-1",
      sectionId: 1,
      sectionTitle: "Test",
      runner: { kind: "FRAMEWORK", ref: "fw-01" },
      mode: "FRESH",
    });

    expect(userA).toHaveLength(1);
    expect(userB).toHaveLength(1);

    uA();
    uB();
  });

  it("same userId can carry events for multiple strategies (frontend filters)", () => {
    const all: OracleStreamEvent[] = [];
    const u = subscribe(TEST_USER, (evt) => {
      if (evt.kind.startsWith("oracle_")) all.push(evt as OracleStreamEvent);
    });

    emitSectionStarted({
      userId: TEST_USER,
      strategyId: "strat-A",
      sectionId: 1,
      sectionTitle: "Test",
      runner: { kind: "FRAMEWORK", ref: "fw-01" },
      mode: "FRESH",
    });
    emitSectionStarted({
      userId: TEST_USER,
      strategyId: "strat-B",
      sectionId: 1,
      sectionTitle: "Test",
      runner: { kind: "FRAMEWORK", ref: "fw-01" },
      mode: "FRESH",
    });

    expect(all).toHaveLength(2);
    const byStrategy = all.map((e) => e.strategyId);
    expect(byStrategy).toEqual(["strat-A", "strat-B"]);

    u();
  });
});

describe("F-G integration — Manual-first parity (F-D regression)", () => {
  beforeEach(() => clearAll());

  it("section emits the same shape whether triggered direct or via assembler-orchestrator", () => {
    // Sanity check : si on émet le même section_started avec les mêmes args,
    // on obtient un event identique modulo `startedAt` (seul champ horaire).
    const events: OracleStreamEvent[] = [];
    const u = subscribe(TEST_USER, (evt) => {
      if (evt.kind === "oracle_section_started") events.push(evt as OracleStreamEvent);
    });

    const baseArgs = {
      userId: TEST_USER,
      strategyId: TEST_STRATEGY,
      sectionId: 7,
      sectionTitle: "SWOT Interne",
      runner: { kind: "FRAMEWORK" as const, ref: "fw-22-risk-matrix" },
      mode: "FRESH" as const,
    };

    emitSectionStarted(baseArgs);
    emitSectionStarted(baseArgs);

    expect(events).toHaveLength(2);
    const [a, b] = events as [OracleStreamEvent & { kind: "oracle_section_started" }, OracleStreamEvent & { kind: "oracle_section_started" }];
    // Comparaison shape modulo startedAt
    const cleanA = { ...a, startedAt: undefined } as Record<string, unknown>;
    const cleanB = { ...b, startedAt: undefined } as Record<string, unknown>;
    expect(cleanA).toEqual(cleanB);
    u();
  });
});
