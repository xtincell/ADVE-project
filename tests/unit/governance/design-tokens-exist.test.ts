/**
 * Anti-drift — un token consommé doit EXISTER.
 *
 * Le DS a trois interdits testés (pas de Reference token dans un composant, pas
 * de palette Tailwind brute, CVA obligatoire au-delà d'un variant). Aucun ne
 * vérifie la seule chose qui casse en silence : consommer un token qui n'est
 * déclaré nulle part.
 *
 * Ce n'est pas théorique. Ont été trouvés vivants (relecture adversariale
 * 2026-07-27) :
 *
 *   - `text-rocket-red` / `bg-rocket-red` — 9 lignes. `--color-rocket-red`
 *     n'existe pas ; le canon est `--color-accent`. Sur
 *     `intelligence/market-studies`, `bg-rocket-red … text-white` donnait un
 *     bouton d'appel à l'action en BLANC SUR TRANSPARENT — illisible.
 *   - `var(--color-on-accent)` — 5 lignes, dont la pastille de notifications.
 *     Le canon est `--color-accent-foreground`.
 *
 * Les deux avaient traversé toutes les passes précédentes : Tailwind ne génère
 * simplement aucune classe pour un token inconnu, `tsc` ne voit rien, le rendu
 * ne jette pas — la couleur est juste absente. Un défaut qui ne fait pas de
 * bruit a besoin d'un test, pas d'une relecture.
 *
 * Portée volontairement étroite : les deux familles fautives (`--color-*` via
 * `var()`, et les utilitaires Tailwind sur un nom de token de couleur). Élargir
 * demanderait de reproduire la résolution Tailwind, ce qui vaudrait moins que
 * ce qu'on gagne ici.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const STYLES = join(ROOT, "src", "styles");
const SCAN_DIRS = [join(ROOT, "src", "components"), join(ROOT, "src", "app")];

function walk(dir: string, exts: string[], out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, exts, out);
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(full);
  }
  return out;
}

/** Toutes les custom properties DÉCLARÉES dans le design system. */
function declaredCustomProperties(): Set<string> {
  const declared = new Set<string>();
  for (const file of walk(STYLES, [".css"])) {
    const css = readFileSync(file, "utf8");
    for (const m of css.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) declared.add(m[1]!);
  }
  return declared;
}

describe("design system — aucun token consommé n'est fantôme", () => {
  const declared = declaredCustomProperties();
  const sources = SCAN_DIRS.flatMap((d) => walk(d, [".tsx", ".ts"]));

  it("le design system déclare bien des tokens (garde anti-scan-vide)", () => {
    expect(declared.size).toBeGreaterThan(50);
    expect(sources.length).toBeGreaterThan(100);
  });

  it("tout `var(--color-*)` utilisé dans un composant est déclaré", () => {
    const offenders: string[] = [];
    for (const file of sources) {
      const src = readFileSync(file, "utf8");
      const lines = src.split("\n");
      for (let i = 0; i < lines.length; i++) {
        for (const m of lines[i]!.matchAll(/var\((--color-[a-zA-Z0-9-]+)/g)) {
          const token = m[1]!;
          if (!declared.has(token)) {
            offenders.push(`${file.replace(`${ROOT}/`, "")}:${i + 1} — ${token} n'est déclaré nulle part`);
          }
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("aucune classe Tailwind ne pointe sur un nom de couleur inconnu du DS", () => {
    // Liste ciblée : les familles qui ont réellement dérivé. On vérifie qu'un
    // `--color-<nom>` existe pour chacune.
    const SUSPECT_NAMES = ["rocket-red", "on-accent", "surface", "bg-subtle", "surface-secondary"];
    const offenders: string[] = [];
    for (const file of sources) {
      const src = readFileSync(file, "utf8");
      const lines = src.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        // Ignorer les commentaires : `rocket-red` reste un mot du vocabulaire
        // visuel (DESIGN-LEXICON), il n'est fautif que comme CLASSE.
        if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;
        for (const name of SUSPECT_NAMES) {
          const re = new RegExp(`\\b(?:bg|text|border|ring|fill|stroke|from|to|via)-${name}(?![a-z0-9-])`);
          if (re.test(line) && !declared.has(`--color-${name}`)) {
            offenders.push(`${file.replace(`${ROOT}/`, "")}:${i + 1} — couleur « ${name} » sans token --color-${name}`);
          }
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("les tokens canon de remplacement existent bien", () => {
    // Si ceux-ci disparaissaient, les corrections ci-dessus deviendraient
    // elles-mêmes fantômes.
    for (const t of ["--color-accent", "--color-accent-foreground", "--color-accent-hover"]) {
      expect(declared.has(t), `${t} manquant`).toBe(true);
    }
  });
});
