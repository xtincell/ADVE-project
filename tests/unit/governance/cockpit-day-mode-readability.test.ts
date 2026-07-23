/**
 * Anti-drift CI — lisibilité du cockpit en mode JOUR (garde J4).
 *
 * Le cockpit porte un mode jour (`CockpitThemeToggle` stampe `data-theme="light"`
 * sur `<html>`, monté UNIQUEMENT dans `(cockpit)/cockpit/layout.tsx`). Les tokens
 * `--color-background` / `--color-surface-*` / `--color-foreground` s'inversent
 * sous `[data-theme="light"]` (cf. `src/styles/tokens/system.css`) ; `text-white`
 * est un blanc LITTÉRAL qui NE s'inverse pas → sur un fond theme-inversant il
 * devient blanc-sur-clair = INVISIBLE en mode jour (bug J4).
 *
 * Le fix (2026-07-23) a remplacé `text-white` par `text-foreground` (inversant)
 * partout où le fond gouvernant est theme-inversant, et n'a GARDÉ `text-white`
 * que sur les fonds à couleur FIXE (`bg-accent`/`bg-success`/`bg-warning`/
 * `bg-error`/`bg-info`/`bg-rocket-red`/… — identiques dans les deux thèmes, blanc
 * lisible). Un ban total de `text-white` serait FAUX (il casserait ces keeps
 * légitimes) : on gèle donc un BASELINE décroissant du nombre de `text-white`
 * cockpit — même discipline que `governed-active-no-new-bypass`.
 *
 * BASELINE = plafond. Il ne peut QUE décroître :
 *   - Nouveau `text-white` cockpit → count > baseline → merge cassé (utiliser
 *     `text-foreground` sur un fond inversant ; si le fond est une couleur fixe,
 *     baisser sciemment le baseline en documentant le keep).
 *   - Nettoyage supplémentaire → count < baseline → mettre à jour le baseline.
 *
 * Les autres portails (`(console)`/`(creator)`/`(agency)`) sont DARK-ONLY (aucun
 * toggle monté) → leur `text-white` est correct et hors périmètre de cette garde.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "../../..");
const COCKPIT_DIR = join(ROOT, "src/app/(cockpit)");

/**
 * Plafond gelé au 2026-07-23 après le fix J4 : 27 `text-white` cockpit
 * subsistants, TOUS sur un fond à couleur fixe (19 `bg-accent`, 5 `bg-success`,
 * 2 `bg-warning`, 1 `bg-info`, 1 `bg-rocket-red` — vérifié). Ne peut que décroître.
 */
const BASELINE = 27;

function walk(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts)$/.test(entry) && !entry.endsWith(".test.tsx")) acc.push(p);
  }
  return acc;
}

describe("cockpit-day-mode-readability — garde J4", () => {
  it("le nombre de `text-white` cockpit ne dépasse pas le baseline (décroissant)", () => {
    const files = walk(COCKPIT_DIR);
    const hits: { file: string; count: number }[] = [];
    let total = 0;
    for (const file of files) {
      const src = readFileSync(file, "utf-8");
      const m = src.match(/\btext-white\b/g);
      if (m && m.length > 0) {
        hits.push({ file: relative(ROOT, file), count: m.length });
        total += m.length;
      }
    }
    if (total > BASELINE) {
      // eslint-disable-next-line no-console
      console.error(
        `[cockpit-day-mode-readability] ${total} text-white (baseline ${BASELINE}). ` +
          `Nouveau text-white sur un fond inversant = invisible en mode jour. ` +
          `Utilise text-foreground (fond inversant) ; garde text-white UNIQUEMENT sur ` +
          `bg-accent/success/warning/error/info fixe (et baisse le baseline).`,
        hits.filter((h) => h.count > 0),
      );
    }
    expect(total).toBeLessThanOrEqual(BASELINE);
  });
});
