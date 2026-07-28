/**
 * Anti-drift HARD — aucun workflow GitHub ne porte de clé dupliquée.
 *
 * Une clé répétée dans un step (`env:` deux fois) ne casse ni `tsc`, ni le lint,
 * ni les tests : elle casse le workflow **au moment de le lancer**, avec un
 * `422 … 'env' is already defined`. C'est-à-dire précisément quand on a besoin
 * de livrer. C'est arrivé le 2026-07-28 sur `build-image.yml`, et le workflow
 * de build est resté inlançable jusqu'à ce qu'on tente de s'en servir.
 *
 * **Sans dépendance.** Le premier jet s'appuyait sur `js-yaml` — présent en
 * transitif, sans déclarations de types (`tsc` l'a refusé) et surtout jamais
 * déclaré : un verrou de CI adossé à un paquet qui peut disparaître au prochain
 * bump de dépendances n'est pas un verrou. Le contrôle nécessaire est de toute
 * façon bien plus étroit qu'un parseur complet — on ne valide pas le YAML, on
 * cherche une clé qui revient deux fois dans le même bloc.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const DIR = join(__dirname, "..", "..", "..", ".github", "workflows");

/**
 * Clés dupliquées au sein d'un même bloc (même indentation, même parent).
 *
 * Les corps de scalaires littéraux (`run: |`, `script: >`) sont SAUTÉS : ce
 * sont des shells, pas des mappings — un `env:` qui y figure est du texte, et
 * le compter produirait un faux positif à chaque script un peu long.
 */
function duplicateKeys(src: string): string[] {
  const dups: string[] = [];
  // indentation → clés déjà vues à ce niveau, dans le bloc courant
  const seen = new Map<number, Set<string>>();

  let blockIndent: number | null = null; // indentation du scalaire littéral en cours

  for (const raw of src.split("\n")) {
    const line = raw.replace(/\t/g, "  ");
    if (line.trim() === "" || line.trim().startsWith("#")) continue;

    const indent = line.length - line.trimStart().length;

    // Dans un scalaire littéral : on saute tant qu'on est plus indenté.
    if (blockIndent !== null) {
      if (indent > blockIndent) continue;
      blockIndent = null;
    }

    // Un niveau moins profond ferme les niveaux plus profonds : deux `env:` dans
    // DEUX steps différents sont légitimes, deux dans LE MÊME ne le sont pas.
    for (const lvl of [...seen.keys()]) if (lvl > indent) seen.delete(lvl);

    let body = line.trim();
    // Un élément de liste ouvre un nouveau mapping : `- name:` puis `  env:`.
    if (body === "-" || body.startsWith("- ")) {
      for (const lvl of [...seen.keys()]) if (lvl >= indent) seen.delete(lvl);
      if (body === "-") continue;
      body = body.slice(2).trim();
    }

    const m = /^([A-Za-z_][\w.-]*)\s*:(\s|$)/.exec(body);
    if (!m) continue;
    const key = m[1]!;

    const level = seen.get(indent) ?? new Set<string>();
    if (level.has(key)) dups.push(`${key} (indentation ${indent})`);
    level.add(key);
    seen.set(indent, level);

    // `run: |`, `run: >-` … → le corps qui suit n'est pas un mapping.
    if (/:\s*[|>][+-]?\s*$/.test(body)) blockIndent = indent;
  }
  return dups;
}

describe("workflows GitHub — aucune clé dupliquée", () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));

  it("il y a des workflows à vérifier", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file}`, () => {
      expect(duplicateKeys(readFileSync(join(DIR, file), "utf8"))).toEqual([]);
    });
  }
});

describe("le détecteur détecte", () => {
  it("attrape le défaut exact qui a rendu le build inlançable", () => {
    const casse = [
      "jobs:",
      "  build:",
      "    steps:",
      "      - name: Redeploy",
      "        env:",
      "          A: 1",
      "        env:",
      "          B: 2",
      "        run: echo ok",
    ].join("\n");
    expect(duplicateKeys(casse)).toEqual(["env (indentation 8)"]);
  });

  it("ne se trompe pas sur deux steps qui ont chacun leur `env:`", () => {
    const sain = [
      "jobs:",
      "  build:",
      "    steps:",
      "      - name: un",
      "        env:",
      "          A: 1",
      "      - name: deux",
      "        env:",
      "          B: 2",
    ].join("\n");
    expect(duplicateKeys(sain)).toEqual([]);
  });

  it("ne compte pas les `clé:` qui vivent dans un script shell", () => {
    // Sans cette garde, tout `run: |` un peu long produirait un faux positif —
    // et un verrou qui crie à tort finit désactivé.
    const sain = [
      "steps:",
      "  - name: script",
      "    run: |",
      "      env: pas du yaml",
      "      env: toujours pas",
      "    if: always()",
    ].join("\n");
    expect(duplicateKeys(sain)).toEqual([]);
  });
});
