/**
 * HARD — tout Intent kind DISPATCHÉ est CATALOGUÉ (B3, audit adversarial 2026-07-22).
 *
 * # Le trou que ce test verrouille
 *
 * 13 kinds (`ENRICH_R_FROM_ADVE`, `SYNTHESIZE_S`, `PROPOSE_BRAND_ACTIONS`,
 * `CAPTURE_INTENTION`, `PRODUCE_DELIVERABLE`, `INDEX_BRAND_CONTEXT`,
 * `RUN_MARKET_RESEARCH`, `PROCESS_SESHAT_SIGNAL`, …) étaient DISPATCHÉS par le
 * commandant (Q1 tracé via emitIntent) mais absents d'`INTENT_KINDS` + `slos.ts`
 * → ils échappaient au monitoring SLO. Le commandant est le point de dispatch
 * unique (emitIntent → commandant.execute) : tout `case "KIND"` de son switch
 * est un kind réellement dispatché, donc DOIT être catalogué + avoir un SLO.
 *
 * Ce test scanne la source du commandant et exige : dispatch ⊆ INTENT_KINDS,
 * chacun avec un SLO. Mode HARD — un futur `case` non enregistré casse le merge.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { intentKindExists } from "@/server/governance/intent-kinds";
import { SLO_BY_KIND } from "@/server/governance/slos";

const COMMANDANT = join(
  __dirname,
  "..",
  "..",
  "..",
  "src/server/services/artemis/commandant.ts",
);

/**
 * Kinds en forme d'intent (UPPER_SNAKE) apparaissant en `case "…"` dans le
 * dispatcher. Tous les `case` du switch `switch (intent.kind)` sont des kinds ;
 * aucun sous-switch UPPER_SNAKE n'existe aujourd'hui (vérifié à l'écriture).
 * Si un jour un `case` UPPER_SNAKE légitime N'EST PAS un intent (sous-switch),
 * l'ajouter ici avec justification — DENY par défaut (fail-loud).
 */
const NON_INTENT_CASE_ALLOWLIST = new Set<string>([]);

function dispatchedKinds(): string[] {
  const src = readFileSync(COMMANDANT, "utf8");
  const found = new Set<string>();
  for (const m of src.matchAll(/case\s+"([A-Z][A-Z0-9_]+)"\s*:/g)) {
    found.add(m[1]!);
  }
  return [...found].filter((k) => !NON_INTENT_CASE_ALLOWLIST.has(k));
}

describe("dispatch ⊆ INTENT_KINDS (HARD, B3)", () => {
  const kinds = dispatchedKinds();

  it("le scan capture bien le dispatch (garde anti-régression du scanner)", () => {
    // Repères connus — si le scan tombe à 0, le regex a cassé, pas le dispatch.
    expect(kinds.length).toBeGreaterThan(50);
    expect(kinds).toContain("FILL_ADVE");
    expect(kinds).toContain("ENRICH_R_FROM_ADVE");
    expect(kinds).toContain("PROCESS_SESHAT_SIGNAL");
  });

  it("chaque kind dispatché est catalogué dans INTENT_KINDS", () => {
    const missing = kinds.filter((k) => !intentKindExists(k));
    expect(missing, `kinds dispatchés hors INTENT_KINDS : ${missing.join(", ")}`).toEqual([]);
  });

  it("chaque kind dispatché a un SLO apparié (monitoring, Loi 3)", () => {
    const noSlo = kinds.filter((k) => !SLO_BY_KIND.has(k));
    expect(noSlo, `kinds dispatchés sans SLO : ${noSlo.join(", ")}`).toEqual([]);
  });

  it("les 13 kinds régularisés par B3 sont présents + dotés d'un SLO", () => {
    const B3 = [
      "ENRICH_R_FROM_ADVE",
      "ENRICH_T_FROM_ADVE_R_SESHAT",
      "GENERATE_I_ACTIONS",
      "SYNTHESIZE_S",
      "PROPOSE_ADVE_UPDATE_FROM_RT",
      "PROPOSE_BRAND_ACTIONS",
      "PRODUCE_DELIVERABLE",
      "CAPTURE_INTENTION",
      "GENERATE_BRIEF_FROM_INTENTION",
      "VALIDATE_INTENTION_BRIEF",
      "INDEX_BRAND_CONTEXT",
      "RUN_MARKET_RESEARCH",
      "PROCESS_SESHAT_SIGNAL",
    ];
    for (const k of B3) {
      expect(intentKindExists(k), `${k} absent d'INTENT_KINDS`).toBe(true);
      expect(SLO_BY_KIND.has(k), `${k} sans SLO`).toBe(true);
    }
  });
});
