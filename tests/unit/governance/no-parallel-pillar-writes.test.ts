/**
 * Anti-drift — `writePillarAndScore` ne doit JAMAIS être appelé en parallèle.
 *
 * Contexte : le Pillar Gateway (`src/server/services/pillar-gateway/index.ts`)
 * a un contrat séquentiel single-pillar. Chaque write :
 *
 *   1. Propage staleness aux pillars dépendants (cascade A→D→V→E).
 *      → Si parallel, race sur `staleAt` (set par un sibling / cleared par self).
 *   2. Appelle postWriteScore(strategyId) qui re-score TOUTE la strategy.
 *      → Si parallel, 4× scoreObject parallèles = race sur composite write + waste.
 *   3. Publie eventBus.publish("pillar.written").
 *      → Si parallel, downstream handlers peuvent double-process.
 *
 * **Pattern canonique** confirmé dans le repo (narrate-adve.ts, rtis-draft.ts) :
 *   - Parallélise LLM read-only (génération du contenu)
 *   - Séquentialise les writes via `for...of` + `await writePillarAndScore(...)`
 *
 * Ce test détecte les anti-patterns :
 *   - `Promise.all([...].map(async () => await writePillarAndScore(...)))`
 *   - `Promise.allSettled([...].map(async () => await writePillarAndScore(...)))`
 *   - `Promise.all([writePillarAndScore(...), writePillarAndScore(...)])`
 *
 * Cf. revert commit 2026-05-11 (post-8082d1f) — perf gain illusoire pour un
 * risque correctness avéré. Le bottleneck commercial-critique se résoud par
 * LLM parallélisation, pas DB write parallélisation.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");

function* walkFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const s = statSync(full);
    if (s.isDirectory()) {
      yield* walkFiles(full);
    } else if (
      s.isFile() &&
      (full.endsWith(".ts") || full.endsWith(".tsx")) &&
      !full.endsWith(".test.ts") &&
      !full.endsWith(".test.tsx") &&
      !full.endsWith(".d.ts")
    ) {
      yield full;
    }
  }
}

interface Violation {
  file: string;
  line: number;
  snippet: string;
}

function findParallelPillarWrites(): Violation[] {
  // Patterns détectés (multiline) :
  //   Promise.all([...map(... writePillarAndScore ...)])
  //   Promise.allSettled([...map(... writePillarAndScore ...)])
  //   Promise.all([writePillarAndScore(...), writePillarAndScore(...)])
  //
  // Heuristique : Promise.all*( ... writePillarAndScore ... ) — détecte si la
  // chaîne Promise.all*-jusqu'au-closing-bracket contient writePillarAndScore.
  // Faux positifs possibles si writePillar est juste mentionné dans un commentaire
  // inline, mais c'est rare en pratique.

  const violations: Violation[] = [];
  const re = /Promise\.(?:all|allSettled)\s*\(([\s\S]{0,2000}?)\)/g;

  for (const file of walkFiles(SRC)) {
    const text = readFileSync(file, "utf-8");
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const inner = m[1] ?? "";
      // Strip line comments + block comments before checking
      const stripped = inner
        .replace(/\/\/[^\n]*/g, "")
        .replace(/\/\*[\s\S]*?\*\//g, "");
      if (/\bwritePillarAndScore\s*\(/.test(stripped)) {
        const line = text.slice(0, m.index).split("\n").length;
        violations.push({
          file: relative(ROOT, file).replace(/\\/g, "/"),
          line,
          snippet: inner.slice(0, 120).replace(/\n/g, " "),
        });
      }
    }
  }
  return violations;
}

describe("anti-drift: pas de Promise.all sur writePillarAndScore", () => {
  it("aucune parallélisation de writePillarAndScore dans src/", () => {
    const violations = findParallelPillarWrites();
    if (violations.length > 0) {
      const msg = violations
        .map((v) => `  ${v.file}:${v.line} — Promise.all(...${v.snippet}...)`)
        .join("\n");
      throw new Error(
        `${violations.length} parallélisation(s) de writePillarAndScore détectée(s) :\n${msg}\n\n` +
          `→ Le Pillar Gateway est séquentiel single-pillar (cascade staleness + ` +
          `postWriteScore per-strategy + eventBus emit). Pattern canonique :\n` +
          `   for (const pillar of pillars) {\n` +
          `     await writePillarAndScore({ ... });\n` +
          `   }\n\n` +
          `Si la perf est le souci : parallélise les LLM read-only EN AMONT (cf. ` +
          `narrate-adve.ts + rtis-draft.ts) puis writes séquentiels.`,
      );
    }
    expect(violations).toEqual([]);
  });
});
