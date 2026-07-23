/**
 * Phase 21 (ADR-0068) — OracleSection coverage + runner binding
 *
 * Invariants verrouillés :
 *
 * 1. SECTION_REGISTRY contient EXACTEMENT 35 sections numérotées 1..35.
 * 2. Chaque section a un `tier` ∈ { CORE, BIG4_BASELINE, DISTINCTIVE } (default CORE).
 * 3. Tier counts respectent ADR-0014 : 23 CORE + 7 BIG4_BASELINE + 5 DISTINCTIVE.
 * 4. Chaque section a un id unique + un `number` qui parse en int 1..35.
 * 5. **Runner binding (mode soft)** — chaque section devrait avoir un runner
 *    résolu via `resolveSectionRunner()`. Mode soft jusqu'à migration complète.
 * 6. Service `oracle-section/` exporte les API publiques attendues.
 */

import { describe, expect, it } from "vitest";

const BASELINE_SECTIONS_WITHOUT_RUNNER = 0; // HARD (audit 2026-07-22 : dette réelle = 0)

describe("ADR-0068 — Oracle section registry coverage", () => {
  it("contains exactly 35 sections", async () => {
    const { SECTION_REGISTRY } = await import("@/server/services/strategy-presentation/types");
    expect(SECTION_REGISTRY).toHaveLength(35);
  });

  it("section numbers form a contiguous 1..35 range", async () => {
    const { SECTION_REGISTRY } = await import("@/server/services/strategy-presentation/types");
    const numbers = SECTION_REGISTRY.map((s) => Number(s.number)).sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 35 }, (_, i) => i + 1));
  });

  it("each section has a unique id", async () => {
    const { SECTION_REGISTRY } = await import("@/server/services/strategy-presentation/types");
    const ids = SECTION_REGISTRY.map((s) => s.id);
    expect(new Set(ids).size).toBe(35);
  });

  it("tier distribution matches ADR-0014 (23 CORE + 7 BIG4_BASELINE + 5 DISTINCTIVE)", async () => {
    const { SECTION_REGISTRY } = await import("@/server/services/strategy-presentation/types");
    const tally = { CORE: 0, BIG4_BASELINE: 0, DISTINCTIVE: 0 };
    for (const s of SECTION_REGISTRY) {
      const t = (s.tier ?? "CORE") as keyof typeof tally;
      tally[t]++;
    }
    expect(tally.CORE).toBe(23);
    expect(tally.BIG4_BASELINE).toBe(7);
    expect(tally.DISTINCTIVE).toBe(5);
  });
});

describe("ADR-0068 — Section runner binding (soft mode)", () => {
  it("resolveSectionRunner is a function", async () => {
    const mod = await import("@/server/services/strategy-presentation/types");
    expect(typeof mod.resolveSectionRunner).toBe("function");
  });

  it("section with runner explicit returns runner directly", async () => {
    const { resolveSectionRunner } = await import("@/server/services/strategy-presentation/types");
    const meta = {
      id: "x",
      number: "01",
      title: "T",
      personas: ["consultant" as const],
      runner: { kind: "FRAMEWORK" as const, ref: "fw-01-brand-archeology" },
    };
    const r = resolveSectionRunner(meta);
    expect(r).toEqual({ kind: "FRAMEWORK", ref: "fw-01-brand-archeology" });
  });

  it("section with sequenceKey legacy derives GLORY_SEQUENCE runner", async () => {
    const { resolveSectionRunner } = await import("@/server/services/strategy-presentation/types");
    const meta = {
      id: "x",
      number: "31",
      title: "T",
      personas: ["consultant" as const],
      sequenceKey: "CULT-INDEX",
    };
    const r = resolveSectionRunner(meta);
    expect(r).toEqual({ kind: "GLORY_SEQUENCE", ref: "CULT-INDEX" });
  });

  it("section without runner nor sequenceKey returns null", async () => {
    const { resolveSectionRunner } = await import("@/server/services/strategy-presentation/types");
    const meta = {
      id: "x",
      number: "01",
      title: "T",
      personas: ["consultant" as const],
    };
    expect(resolveSectionRunner(meta)).toBeNull();
  });

  it("baseline of sections without resolved runner stays under threshold (soft mode)", async () => {
    const { SECTION_REGISTRY, resolveSectionRunner } = await import("@/server/services/strategy-presentation/types");
    const missing = SECTION_REGISTRY.filter((s) => resolveSectionRunner(s) === null);
    expect(missing.length).toBeLessThanOrEqual(BASELINE_SECTIONS_WITHOUT_RUNNER);
    if (missing.length > 0 && process.env.DEBUG_RUNNER_BINDING) {
      console.warn(
        `[ADR-0068] ${missing.length} sections sans runner résolu :\n` +
          missing.map((s) => `  - §${s.number} ${s.title} (${s.id})`).join("\n"),
      );
    }
  });
});

describe("Oracle 35/35 sans LLM — chaque section a un chemin déterministe (round-13b)", () => {
  // Doctrine « Oracle 35/35 sans LLM » (ADR-0091) : `generateOracleSectionHandler`
  // route composer-first UNIQUEMENT si `hasDeterministicComposer(id)` (sinon
  // PURE_MAPPER via section-mappers), et sinon TOMBE sur executeSequence/Framework/
  // Tool (= LLM). Donc toute section NI PURE_MAPPER NI dotée d'un composer route
  // SILENCIEUSEMENT vers le LLM. Sans ce garde, une 36ᵉ section ou un id renommé
  // casserait la doctrine sans test rouge (trou relevé par le sous-agent determinism
  // round-13 : `oracle-section-coverage` figeait le compte/tier/runner mais PAS la
  // couverture composer).
  it("every section is PURE_MAPPER or has a deterministic composer (else silent LLM route)", async () => {
    const { SECTION_REGISTRY, resolveSectionRunner } = await import(
      "@/server/services/strategy-presentation/types"
    );
    const { hasDeterministicComposer } = await import(
      "@/server/services/strategy-presentation/deterministic-composers"
    );
    const llmRouted = SECTION_REGISTRY.filter((s) => {
      const runner = resolveSectionRunner(s);
      const isPureMapper = runner?.kind === "PURE_MAPPER";
      return !isPureMapper && !hasDeterministicComposer(s.id);
    });
    expect(
      llmRouted,
      "Sections routées vers le LLM (ni PURE_MAPPER ni composer) — casse « Oracle 35/35 sans LLM » :\n" +
        llmRouted.map((s) => `  - §${s.number} ${s.title} (${s.id})`).join("\n"),
    ).toEqual([]);
  });

  it("PURE_MAPPER + composer-backed sections together cover exactly the 35", async () => {
    const { SECTION_REGISTRY, resolveSectionRunner } = await import(
      "@/server/services/strategy-presentation/types"
    );
    const { hasDeterministicComposer } = await import(
      "@/server/services/strategy-presentation/deterministic-composers"
    );
    const pureMapper = SECTION_REGISTRY.filter((s) => resolveSectionRunner(s)?.kind === "PURE_MAPPER");
    const composerBacked = SECTION_REGISTRY.filter(
      (s) => resolveSectionRunner(s)?.kind !== "PURE_MAPPER" && hasDeterministicComposer(s.id),
    );
    // Partition exacte : les deux chemins déterministes couvrent l'intégralité.
    expect(pureMapper.length + composerBacked.length).toBe(35);
  });
});

describe("ADR-0068 — oracle-section service public API", () => {
  it("exposes the lifecycle API surface", async () => {
    const mod = await import("@/server/services/oracle-section");
    expect(typeof mod.seedSectionsForStrategy).toBe("function");
    expect(typeof mod.getSectionsForStrategy).toBe("function");
    expect(typeof mod.getSection).toBe("function");
    expect(typeof mod.acquireGenerationLock).toBe("function");
    expect(typeof mod.recordGenerationSuccess).toBe("function");
    expect(typeof mod.recordGenerationFailure).toBe("function");
    expect(typeof mod.releaseGenerationLock).toBe("function");
    expect(typeof mod.markAllSectionsStale).toBe("function");
    // `markSectionsStale` (ciblé) déposé — audit 2026-07-13 T4 (code mort).
    expect((mod as Record<string, unknown>).markSectionsStale).toBeUndefined();
    expect(typeof mod.forgetGenerationProgress).toBe("function");
    expect(typeof mod.snapshotStrategy).toBe("function");
  });

  it("exports OracleTier and OracleSectionStatus types via re-export", async () => {
    // Type-level — we just check the module exposes the type names compile.
    const _check: import("@/server/services/oracle-section").OracleTier = "CORE";
    const _check2: import("@/server/services/oracle-section").OracleSectionStatus = "PENDING";
    expect(_check).toBe("CORE");
    expect(_check2).toBe("PENDING");
  });
});
