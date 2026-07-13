/**
 * Anti-drift — le signal Overton MESURÉ atteint l'Oracle §34 (ADR-0134 §B7,
 * audit 2026-07-13 T1).
 *
 * Historique : `buildOvertonRealSignalForOracle` (Phase 23 Story 3.6) était
 * défini + testé, l'UI rendait `overtonDistinctive.realSignal`… mais la
 * fonction n'avait AUCUN caller de production — branche morte.
 *
 * Invariants :
 *   1. le composer §34 appelle le builder (import lazy anti-cycle) ;
 *   2. garde writeback : rien de déclaré ET pas de mesure OK → `{}` (pas de
 *      BrandAsset fabriqué pour porter un signal vide) ;
 *   3. l'échec transitoire du builder est une omission honnête (try/catch),
 *      jamais un throw qui casserait la composition déterministe ;
 *   4. l'UI §34 rend toujours `realSignal` (la branche n'est plus morte).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf-8");

describe("ADR-0134 §B7 — realSignal §34 câblé", () => {
  const composers = read("src/server/services/strategy-presentation/deterministic-composers.ts");

  it("composeOverton appelle buildOvertonRealSignalForOracle (lazy)", () => {
    const fn = composers.slice(
      composers.indexOf("async function composeOverton"),
      composers.indexOf("function composeTarsisSignals"),
    );
    expect(fn).toContain('await import("./overton-real-signal")');
    expect(fn).toContain("buildOvertonRealSignalForOracle(ctx.strategy.id");
    // Pas d'import statique du module (anti-cycle avec campaign-tracker).
    expect(/^import .*overton-real-signal/m.test(composers)).toBe(false);
  });

  it("garde writeback : vide + non mesuré → {}", () => {
    const fn = composers.slice(
      composers.indexOf("async function composeOverton"),
      composers.indexOf("function composeTarsisSignals"),
    );
    expect(fn).toContain("const hasDeclared = axes.length > 0 || maneuvers.length > 0;");
    expect(fn).toContain('realSignal.state === "OK"');
    expect(fn).toContain("if (!hasDeclared && !hasMeasured) return {};");
  });

  it("échec transitoire = omission honnête (try/catch, realSignal null)", () => {
    const fn = composers.slice(
      composers.indexOf("async function composeOverton"),
      composers.indexOf("function composeTarsisSignals"),
    );
    expect(fn).toContain("} catch {");
    expect(fn).toContain("realSignal = null;");
  });

  it("l'UI §34 rend realSignal (la branche n'est plus morte)", () => {
    const ui = read("src/components/strategy-presentation/sections/phase13-sections.tsx");
    expect(ui).toContain("realSignal");
  });
});
