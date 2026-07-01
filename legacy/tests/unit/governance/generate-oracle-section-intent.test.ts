/**
 * Phase 21 F-C (ADR-0070) — GENERATE_ORACLE_SECTION Intent contract
 *
 * Invariants verrouillés :
 *
 * 1. Intent kind enregistré dans `INTENT_KINDS` (intent-kinds.ts) avec
 *    governor=ARTEMIS, handler=oracle-section, async=true.
 * 2. SLO budget cohérent (p95 ≤ 25s, cost p95 ≤ 0.10$, errorRate ≤ 0.05).
 * 3. Mestor commandant ARTEMIS dispatch case présent.
 * 4. Intent payload TS bien typé (kind + strategyId + sectionId + mode + operatorId).
 * 5. tRPC router `oracle` exposé dans appRouter.
 * 6. Handler exporté depuis `oracle-section/handler.ts`.
 * 7. `intentTouchesPillars` retourne `[]` (génération n'affecte pas piliers ADVE).
 */

import { describe, expect, it } from "vitest";

describe("ADR-0070 — GENERATE_ORACLE_SECTION Intent contract", () => {
  it("Intent kind registered in INTENT_KINDS with governor=ARTEMIS handler=oracle-section async=true", async () => {
    const { INTENT_KINDS } = await import("@/server/governance/intent-kinds");
    const entry = INTENT_KINDS.find((k) => k.kind === "GENERATE_ORACLE_SECTION");
    expect(entry).toBeDefined();
    expect(entry?.governor).toBe("ARTEMIS");
    expect(entry?.handler).toBe("oracle-section");
    expect(entry?.async).toBe(true);
  });

  it("SLO budget present and reasonable (p95 ≤ 25s, cost ≤ 0.10$)", async () => {
    const { INTENT_SLOS } = await import("@/server/governance/slos");
    const slo = INTENT_SLOS.find((s) => s.kind === "GENERATE_ORACLE_SECTION");
    expect(slo).toBeDefined();
    expect(slo!.p95LatencyMs).toBeLessThanOrEqual(25_000);
    expect(slo!.costP95Usd).toBeLessThanOrEqual(0.10);
    expect(slo!.errorRatePct).toBeLessThanOrEqual(0.05);
  });

  it("Mestor commandant ARTEMIS dispatch handles GENERATE_ORACLE_SECTION", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const file = path.resolve(__dirname, "../../../src/server/services/artemis/commandant.ts");
    const src = fs.readFileSync(file, "utf8");
    expect(src).toContain('case "GENERATE_ORACLE_SECTION"');
    expect(src).toContain("generateOracleSectionHandler");
  });

  it("Handler exported from oracle-section/handler.ts", async () => {
    const mod = await import("@/server/services/oracle-section/handler");
    expect(typeof mod.generateOracleSectionHandler).toBe("function");
  });

  it("tRPC oracle router registered in appRouter", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const file = path.resolve(__dirname, "../../../src/server/trpc/router.ts");
    const src = fs.readFileSync(file, "utf8");
    expect(src).toContain('import { oracleRouter }');
    expect(src).toContain("oracle: oracleRouter");
  });

  it("intentTouchesPillars returns [] for GENERATE_ORACLE_SECTION (does not mutate pillars)", async () => {
    const { intentTouchesPillars } = await import("@/server/services/mestor/intents");
    const result = intentTouchesPillars({
      kind: "GENERATE_ORACLE_SECTION",
      strategyId: "test",
      sectionId: 1,
      mode: "FRESH",
      operatorId: "op",
    });
    expect(result).toEqual([]);
  });

  it("Intent payload TS shape — kind + strategyId + sectionId + mode + operatorId", () => {
    // Type-level check via a literal that compiles only if shape is correct.
    const payload: import("@/server/services/mestor/intents").Intent = {
      kind: "GENERATE_ORACLE_SECTION",
      strategyId: "s",
      sectionId: 7,
      mode: "RETRY",
      operatorId: "u",
    };
    expect(payload.kind).toBe("GENERATE_ORACLE_SECTION");
  });
});

describe("ADR-0070 — Handler logic guards", () => {
  it("oracle-section/handler imports services from right paths", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const file = path.resolve(__dirname, "../../../src/server/services/oracle-section/handler.ts");
    const src = fs.readFileSync(file, "utf8");
    expect(src).toContain("acquireGenerationLock");
    expect(src).toContain("recordGenerationSuccess");
    expect(src).toContain("recordGenerationFailure");
    expect(src).toContain("resolveSectionRunner");
    expect(src).toContain("SECTION_REGISTRY");
  });

  it("handler dispatches all 3 runner kinds (GLORY_SEQUENCE / FRAMEWORK / GLORY_TOOL)", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const file = path.resolve(__dirname, "../../../src/server/services/oracle-section/handler.ts");
    const src = fs.readFileSync(file, "utf8");
    expect(src).toContain('runner.kind === "GLORY_SEQUENCE"');
    expect(src).toContain('runner.kind === "FRAMEWORK"');
    expect(src).toContain('runner.kind === "GLORY_TOOL"');
  });

  it("handler normalizes LLMStructuredCallError → ZOD_VALIDATION_FAILED errorCode", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const file = path.resolve(__dirname, "../../../src/server/services/oracle-section/handler.ts");
    const src = fs.readFileSync(file, "utf8");
    expect(src).toContain('"LLMStructuredCallError"');
    expect(src).toContain('"ZOD_VALIDATION_FAILED"');
  });

  it("handler validates mode vs current status (FRESH blocked by COMPLETE, RETRY only on FAILED/STALE)", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const file = path.resolve(__dirname, "../../../src/server/services/oracle-section/handler.ts");
    const src = fs.readFileSync(file, "utf8");
    expect(src).toContain('"FRESH_BLOCKED_BY_COMPLETE"');
    expect(src).toContain('"RETRY_BLOCKED_WRONG_STATUS"');
    expect(src).toContain('"ALREADY_GENERATING"');
  });
});
