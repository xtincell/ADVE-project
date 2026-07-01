/**
 * F-AA — `[object Object]` regression guard
 *
 * Bug observé en production : la page pilier "Offre & Pricing" (V/Valeur)
 * affichait `[object Object], [object Object], [object Object]` pour le
 * champ `economicModels` quand l'array contenait des objets au lieu de
 * strings (drift de format par rapport au schéma `z.array(z.string())`).
 *
 * Cause : `(value as unknown[]).join(", ")` qui appelle `String(item)`
 * sur chaque élément. Pour un objet `{...}` ça donne `"[object Object]"`.
 *
 * Fix structurel : tout `.join(", ")` sur un array potentiellement hétérogène
 * dans `field-renderers.tsx` doit passer par un mapper qui appelle
 * `extractLabel` sur les objets. Le helper `extractLabel` existe déjà
 * dans le même fichier (ligne ~1506) et extrait `name`/`nom`/`title`/etc.
 *
 * Le drift sera ultimement bloqué côté écriture par les outputSchema strict
 * (Phase 21 F-A, ADR-0067) — mais l'UI ne doit jamais crasher le rendu pour
 * autant. Defense en profondeur.
 *
 * Ce test mode HARD verrouille `field-renderers.tsx` contre la réintroduction
 * de patterns unsafe.
 */

import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const FIELD_RENDERERS = path.resolve(
  __dirname,
  "../../../src/components/cockpit/field-renderers.tsx",
);

describe("F-AA — field-renderers no [object Object] regression", () => {
  it("file exists at canonical path", () => {
    expect(fs.existsSync(FIELD_RENDERERS)).toBe(true);
  });

  it("exposes the extractLabel helper", () => {
    const src = fs.readFileSync(FIELD_RENDERERS, "utf8");
    expect(src).toMatch(/function extractLabel\(obj: Record<string, unknown>\)/);
  });

  it("no unsafe `(value as string[]).join(\", \")` pattern (forces extractLabel use)", () => {
    const src = stripComments(fs.readFileSync(FIELD_RENDERERS, "utf8"));
    // Pattern interdit : `(... as string[]).join(", ")` — assume tous les
    // éléments sont des strings sans guard. Drift produit `[object Object]`.
    const matches = src.match(/\(\s*\w+\s+as\s+string\[\]\s*\)\.join\s*\(\s*["'`],\s*["'`]\s*\)/g) ?? [];
    expect(matches.length, `Pattern unsafe trouvé : ${matches.length} occurrence(s)`).toBe(0);
  });

  it("no unsafe `(value as unknown[]).join(\", \")` either", () => {
    const src = stripComments(fs.readFileSync(FIELD_RENDERERS, "utf8"));
    const matches = src.match(/\(\s*\w+\s+as\s+unknown\[\]\s*\)\.join\s*\(\s*["'`],\s*["'`]\s*\)/g) ?? [];
    expect(matches.length).toBe(0);
  });

  it("no unsafe `Object.values(...).join(\", \")` without extractLabel guard", () => {
    const src = stripComments(fs.readFileSync(FIELD_RENDERERS, "utf8"));
    // Pattern interdit : `Object.values(...).join(", ")` direct sans .map(extractLabel).
    // On accepte `Object.values(...).map(...).join(", ")` qui passe par un mapper.
    const lines = src.split("\n");
    const offenders: string[] = [];
    for (const line of lines) {
      // Match `Object.values(<expr>).join(`, mais EXCLUS si `.map(` est entre
      // values() et join(). Approximation suffisante pour grep heuristique.
      if (/Object\.values\([^)]+\)\.join\s*\(/.test(line)) {
        offenders.push(line.trim().slice(0, 200));
      }
    }
    expect(offenders, `Object.values().join() direct trouvé : ${offenders.join("\n")}`).toEqual([]);
  });

  it("array joins on potentially heterogeneous values use extractLabel branch", () => {
    const src = fs.readFileSync(FIELD_RENDERERS, "utf8");
    // Vérifie que les fix F-AA sont en place : safeJoin + extractLabel sur
    // les array-renderings qui peuvent recevoir des objects.
    expect(src).toContain("safeJoin");
    // Le pattern défensif standard (typeof x === \"object\" && x !== null ? extractLabel(...) : String(x))
    // doit apparaître plusieurs fois (~5 occurrences attendues post F-AA).
    const guardMatches = src.match(/typeof x === "object" && x !== null \? extractLabel/g) ?? [];
    expect(guardMatches.length).toBeGreaterThanOrEqual(3);
  });
});

// ── helpers ──

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
}
