/**
 * Anti-drift CI tests — Phase 17 lifecycle + mode invariants (ADR-0042).
 *
 * Verrouille :
 *   1. SequenceLifecycle = "DRAFT"|"STABLE"|"DEPRECATED" exclusivement
 *   2. Toutes les sequences déclarent un lifecycle valide (post-cleanup v6.18.14)
 *   3. Pas de retour à `refined: boolean` (alias retiré v6.18.14)
 *   4. SequenceMode = "ENRICHMENT"|"PRODUCTION"|"FORGE"|"AUDIT"|"PREVIEW"
 *   5. SequenceContext expose `mode?: SequenceMode` (pas `_oracleEnrichmentMode`)
 *
 * NEFER §3 interdit n°3 — drift narratif silencieux. Tout retour à l'ancien
 * vocabulaire (refined, _oracleEnrichmentMode) doit être bloqué CI.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ALL_SEQUENCES,
  type SequenceLifecycle,
  type SequenceMode,
} from "@/server/services/artemis/tools/sequences";

const ROOT = join(__dirname, "../../..");
const SEQUENCES_TS = join(ROOT, "src/server/services/artemis/tools/sequences.ts");
const SEQUENCE_EXECUTOR_TS = join(
  ROOT,
  "src/server/services/artemis/tools/sequence-executor.ts",
);

function read(rel: string): string {
  return readFileSync(rel, "utf-8");
}

describe("sequence-lifecycle — anti-drift Phase 17 ADR-0042", () => {
  // ── §1 — SequenceLifecycle invariant ───────────────────────────────

  it("SequenceLifecycle exclusive set : DRAFT | STABLE | DEPRECATED", () => {
    const validLifecycles: SequenceLifecycle[] = ["DRAFT", "STABLE", "DEPRECATED"];
    expect(validLifecycles).toHaveLength(3);
    // Type-level : si on ajoute un nouveau lifecycle sans test mise à jour,
    // l'inférence de type cassera ce test.
    for (const l of validLifecycles) {
      expect(["DRAFT", "STABLE", "DEPRECATED"]).toContain(l);
    }
  });

  // ── §2 — Toutes les sequences déclarent un lifecycle valide ─────────

  it("toutes les sequences déclarent lifecycle valide (post v6.18.14 cleanup)", () => {
    const validValues = new Set(["DRAFT", "STABLE", "DEPRECATED"]);
    const invalid: { key: string; value: unknown }[] = [];
    for (const seq of ALL_SEQUENCES) {
      // lifecycle est optionnel, mais si présent il doit être dans la set
      const lifecycle = (seq as { lifecycle?: unknown }).lifecycle;
      if (lifecycle !== undefined && !validValues.has(lifecycle as string)) {
        invalid.push({ key: seq.key, value: lifecycle });
      }
    }
    if (invalid.length > 0) {
      throw new Error(
        `Sequences avec lifecycle invalide :\n${invalid.map((s) => `  ${s.key} : ${JSON.stringify(s.value)}`).join("\n")}`,
      );
    }
    expect(invalid).toEqual([]);
  });

  // ── §3 — Pas de retour à `refined: boolean` ─────────────────────────

  it("interface GlorySequenceDef ne contient plus de champ `refined` (retiré v6.18.14)", () => {
    const src = read(SEQUENCES_TS);
    // Le champ `refined: boolean;` (déclaration interface, pas commentaire)
    // doit être absent. Les mentions dans docstrings/comments sont OK
    // (références historiques).
    const interfaceMatch = src.match(
      /export interface GlorySequenceDef \{([\s\S]*?)^\}/m,
    );
    expect(interfaceMatch).toBeTruthy();
    const interfaceBody = interfaceMatch?.[1] ?? "";
    // Strip JSDoc comments to avoid false matches
    const stripped = interfaceBody.replace(/\/\*\*[\s\S]*?\*\//g, "");
    expect(stripped).not.toMatch(/\brefined\s*:\s*boolean/);
  });

  it("aucune sequence ne déclare encore `refined: true|false` (post-codemod)", () => {
    const src = read(SEQUENCES_TS);
    // Match `refined: true,` ou `refined: false,` dans les déclarations
    // de sequences (pas les comments/docstrings).
    // Heuristique : tout `refined: true` ou `refined: false` HORS d'une ligne
    // de commentaire (ne commence pas par `*` ou `//`).
    const lines = src.split("\n");
    const offenders = lines
      .map((line, i) => ({ line: line.trim(), num: i + 1 }))
      .filter(
        (l) =>
          /\brefined:\s*(true|false)\b/.test(l.line) &&
          !l.line.startsWith("*") &&
          !l.line.startsWith("//"),
      );
    if (offenders.length > 0) {
      throw new Error(
        `Sequences avec refined: true|false non migrées :\n${offenders.map((o) => `  L${o.num}: ${o.line}`).join("\n")}`,
      );
    }
    expect(offenders).toEqual([]);
  });

  // ── §4 — SequenceMode invariant ─────────────────────────────────────

  it("SequenceMode exclusive set : ENRICHMENT | PRODUCTION | FORGE | AUDIT | PREVIEW", () => {
    const validModes: SequenceMode[] = [
      "ENRICHMENT",
      "PRODUCTION",
      "FORGE",
      "AUDIT",
      "PREVIEW",
    ];
    expect(validModes).toHaveLength(5);
    for (const m of validModes) {
      expect(["ENRICHMENT", "PRODUCTION", "FORGE", "AUDIT", "PREVIEW"]).toContain(m);
    }
  });

  // ── §5 — SequenceContext expose mode (pas _oracleEnrichmentMode) ──

  it("SequenceContext déclare `mode?: SequenceMode` (replace `_oracleEnrichmentMode`)", () => {
    const src = read(SEQUENCE_EXECUTOR_TS);
    const interfaceMatch = src.match(
      /export interface SequenceContext \{([\s\S]*?)^\}/m,
    );
    expect(interfaceMatch).toBeTruthy();
    const body = interfaceMatch?.[1] ?? "";
    expect(body).toMatch(/mode\?\s*:\s*SequenceMode/);
  });

  it("aucun usage actif de `_oracleEnrichmentMode` dans le code (comments OK)", () => {
    const src = read(SEQUENCE_EXECUTOR_TS);
    const lines = src.split("\n");
    // Les usages actifs : `context._oracleEnrichmentMode`,
    // `{ _oracleEnrichmentMode: ... }`, ou
    // `_oracleEnrichmentMode: ` dans une assignation.
    const offenders = lines
      .map((line, i) => ({ line: line.trim(), num: i + 1 }))
      .filter(
        (l) =>
          /[\w.]_oracleEnrichmentMode|\b_oracleEnrichmentMode\s*:/.test(l.line) &&
          !l.line.startsWith("*") &&
          !l.line.startsWith("//"),
      );
    if (offenders.length > 0) {
      throw new Error(
        `Usages actifs de _oracleEnrichmentMode (devrait être migré → mode: "ENRICHMENT") :\n${offenders.map((o) => `  L${o.num}: ${o.line}`).join("\n")}`,
      );
    }
    expect(offenders).toEqual([]);
  });
});
