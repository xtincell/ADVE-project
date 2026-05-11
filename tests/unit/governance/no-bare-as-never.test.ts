/**
 * Anti-drift — `as never` cast (mode SOFT baseline).
 *
 * Contexte : `as never` est un cast TS-bypass qui désactive le typecheck — il
 * cache du drift cross-module (cf. commit d3af938 manifestoSnapshot où un
 * rename Prisma a échappé au compilateur à cause d'un `as never`).
 *
 * Cible : 0 occurrence. Méthode : fix-by-class incrémental avec remplacement
 * par `as Prisma.InputJsonValue`, `as <DomainEnum>`, ou `as unknown as <Type>`
 * (canonique pour types métier non-index-signature-compatibles).
 *
 * Mode **SOFT** au commit initial : baseline 50 (mesure post-session NEFER
 * 2026-05-11 qui a éliminé 145/195 sites en 10 commits). Quand baseline
 * tombe à 0, retirer le BASELINE et passer en mode HARD (bloquant CI).
 *
 * Source sites restants : `npx tsx scripts/audit-residus.ts` → section
 * `### as-never-cast`. Cf. RESIDUAL-DEBT.md §as-never-cleanup.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");

/**
 * Baseline au moment de l'introduction du test (2026-05-11). Toute valeur
 * `count > BASELINE` indique une régression à corriger AVANT merge.
 *
 * Quand BASELINE descend à 0, retirer la baseline et passer en `toEqual([])`
 * (mode HARD bloquant).
 */
const BASELINE_AS_NEVER_COUNT = 50;

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

function countAsNeverSites(): { count: number; sites: Array<{ file: string; line: number }> } {
  const re = /\bas\s+never\b/g;
  const sites: Array<{ file: string; line: number }> = [];
  for (const file of walkFiles(SRC)) {
    const text = readFileSync(file, "utf-8");
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const line = text.slice(0, m.index).split("\n").length;
      sites.push({
        file: relative(ROOT, file).replace(/\\/g, "/"),
        line,
      });
    }
  }
  return { count: sites.length, sites };
}

describe("anti-drift: no bare `as never` cast", () => {
  it(`count <= baseline (${BASELINE_AS_NEVER_COUNT})`, () => {
    const { count, sites } = countAsNeverSites();
    if (count > BASELINE_AS_NEVER_COUNT) {
      const overshoot = count - BASELINE_AS_NEVER_COUNT;
      const recent = sites.slice(-overshoot - 5).map((s) => `  ${s.file}:${s.line}`).join("\n");
      throw new Error(
        `${count} \`as never\` casts détectés — baseline est ${BASELINE_AS_NEVER_COUNT}, ` +
          `excédent de ${overshoot}.\n` +
          `Derniers sites (potentiellement nouveaux) :\n${recent}\n\n` +
          `→ Remplacer chaque \`as never\` par un cast nommé :\n` +
          `   - JSON Json field → \`as Prisma.InputJsonValue\`\n` +
          `   - Enum → \`as <PrismaEnum>\` ou cast retiré si types match\n` +
          `   - Type métier non-index-compatible → \`as unknown as <Type>\`\n` +
          `Si le nouveau cast est intentionnel et justifié, **descendre la baseline**\n` +
          `vers count (ne pas augmenter au-dessus).`,
      );
    }
    expect(count).toBeLessThanOrEqual(BASELINE_AS_NEVER_COUNT);
  });

  it("baseline n'est pas trop laxiste (catch oversights)", () => {
    const { count } = countAsNeverSites();
    // Si count < BASELINE - 10, c'est qu'on a élagué sans descendre la baseline.
    // Rappel à descendre BASELINE_AS_NEVER_COUNT pour serrer le filet.
    if (count + 10 < BASELINE_AS_NEVER_COUNT) {
      throw new Error(
        `count actuel (${count}) est ${BASELINE_AS_NEVER_COUNT - count} sous baseline ${BASELINE_AS_NEVER_COUNT}. ` +
          `Descendre BASELINE_AS_NEVER_COUNT à ${count} pour serrer le filet anti-régression.`,
      );
    }
    expect(true).toBe(true);
  });
});
