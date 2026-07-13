/**
 * Anti-drift — cascade de staleness Oracle dans le chemin COMMUN d'écriture
 * pilier (audit 2026-07-13, T4/T5 · ADR-0134 annexe).
 *
 * Historique du bug : `markAllSectionsStale` ne vivait que dans
 * `writePillarAndScore` — les callers bare légitimes de `writePillar`
 * (intake C1, infer-needs-human C2, ai-filler ingestion) mutaient un pilier
 * sans jamais invalider les 35 `OracleSection`. La variante ciblée
 * `markSectionsStale(sectionIds)` était du code mort (zéro caller).
 *
 * Invariants gardés ici :
 *   1. la cascade est dans le corps de `writePillar` (chemin commun), UNE fois ;
 *   2. `writePillarAndScore` ne double-invalide pas ;
 *   3. la variante ciblée déposée ne réapparaît pas sans map pilier→sections ;
 *   4. source-assert uniquement — pas de DB requise (suite gouvernance).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf-8");
}

describe("anti-drift: cascade staleness Oracle (writePillar chemin commun)", () => {
  const gateway = read("src/server/services/pillar-gateway/index.ts");

  it("markAllSectionsStale est appelé DANS writePillar (avant postWriteScore)", () => {
    const writePillarStart = gateway.indexOf("export async function writePillar(");
    const postWriteScoreStart = gateway.indexOf("export async function postWriteScore(");
    expect(writePillarStart).toBeGreaterThan(-1);
    expect(postWriteScoreStart).toBeGreaterThan(writePillarStart);

    const body = gateway.slice(writePillarStart, postWriteScoreStart);
    expect(
      body.includes("markAllSectionsStale"),
      "la cascade Oracle doit vivre dans le corps de writePillar (chemin commun à TOUS les callers)",
    ).toBe(true);
  });

  it("une seule invalidation — writePillarAndScore ne double pas la cascade", () => {
    const calls = gateway.match(/await markAllSectionsStale\(/g) ?? [];
    expect(
      calls.length,
      "exactement UN call markAllSectionsStale dans pillar-gateway (dans writePillar)",
    ).toBe(1);

    const andScoreStart = gateway.indexOf("export async function writePillarAndScore(");
    expect(andScoreStart).toBeGreaterThan(-1);
    const andScoreBody = gateway.slice(
      andScoreStart,
      gateway.indexOf("export async function reconcileCompletionLevelCache("),
    );
    expect(
      andScoreBody.includes("await markAllSectionsStale("),
      "writePillarAndScore hérite de la cascade via writePillar — pas de second call",
    ).toBe(false);
  });

  it("la variante ciblée markSectionsStale(sectionIds) reste déposée (T4)", () => {
    const oracleSection = read("src/server/services/oracle-section/index.ts");
    expect(
      /export async function markSectionsStale\(/.test(oracleSection),
      "markSectionsStale ciblé = code mort déposé — le réintroduire exige une map pilier→sections + caller réel (ADR)",
    ).toBe(false);
  });

  it("l'import du module oracle-section dans le gateway est lazy (anti-cycle)", () => {
    // Un import statique pillar-gateway → oracle-section créerait une arête
    // permanente entre couches ; le call-site utilise un dynamic import.
    const staticImport = /^import .*from "@\/server\/services\/oracle-section"/m.test(gateway);
    expect(staticImport).toBe(false);
    expect(gateway.includes('await import("@/server/services/oracle-section")')).toBe(true);
  });
});
