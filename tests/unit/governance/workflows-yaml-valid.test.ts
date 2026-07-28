/**
 * Anti-drift HARD — les workflows GitHub doivent PARSER.
 *
 * Une clé dupliquée dans un step (`env:` deux fois) ne casse ni `tsc`, ni le
 * lint, ni les tests : elle casse le workflow **au moment de le lancer**, avec
 * un 422 « 'env' is already defined » — c'est-à-dire précisément quand on a
 * besoin de livrer. C'est arrivé le 2026-07-28 sur `build-image.yml`.
 *
 * `js-yaml` en mode strict (`json: false`) refuse les clés dupliquées : c'est
 * le seul endroit où ce défaut peut être attrapé avant l'échec de livraison.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { load } from "js-yaml";

const DIR = join(__dirname, "..", "..", "..", ".github", "workflows");

describe("workflows GitHub — YAML valide et sans clé dupliquée", () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));

  it("il y a des workflows à vérifier", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file} parse sans clé en double`, () => {
      const src = readFileSync(join(DIR, file), "utf8");
      // Mode strict : une clé répétée lève (`duplicated mapping key`) au lieu
      // d'écraser silencieusement la première.
      expect(() => load(src, { filename: file, json: false })).not.toThrow();
    });
  }
});
