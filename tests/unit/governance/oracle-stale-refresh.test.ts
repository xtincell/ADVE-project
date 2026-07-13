/**
 * Anti-drift — refresh nocturne des sections Oracle STALE (ADR-0137, audit T6).
 *
 * La cascade de staleness (ADR-0134) marque COMPLETE→STALE mais rien ne
 * régénérait automatiquement. Le cron ops-sweep ré-assemble scope=STALE.
 *
 * Invariants :
 *   1. l'étape existe dans ops-sweep et émet ASSEMBLE_ORACLE scope=STALE via
 *      le spine (emitIntent), jamais un dispatch inline ;
 *   2. ciblé : uniquement les stratégies AVEC sections STALE (groupBy), pas de
 *      balayage à vide ;
 *   3. skip honnête si la stratégie n'a pas d'operator (pas de contexte) ;
 *   4. le résultat est remonté au rapport du cron.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf-8");

describe("ADR-0137 — refresh STALE Oracle (cron ops-sweep)", () => {
  const cron = read("src/app/api/cron/ops-sweep/route.ts");

  it("émet ASSEMBLE_ORACLE scope=STALE via le spine", () => {
    expect(cron).toContain('kind: "ASSEMBLE_ORACLE"');
    expect(cron).toContain('scope: "STALE"');
    expect(cron).toContain('caller: "cron:ops-sweep:oracle-stale"');
    expect(cron).toContain("emitIntent");
  });

  it("ciblé : groupBy sur les sections STALE (pas de balayage à vide)", () => {
    expect(cron).toContain("oracleSection.groupBy");
    expect(cron).toContain('where: { status: "STALE" }');
    expect(cron).toContain("if (staleGroups.length > 0)");
  });

  it("skip honnête sans operator + résultat remonté au rapport", () => {
    expect(cron).toContain("oracleRefresh.skipped");
    expect(cron).toContain("oracleStaleRefresh: oracleRefresh");
  });
});
