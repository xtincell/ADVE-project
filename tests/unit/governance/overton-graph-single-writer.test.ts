/**
 * ADR-0146 — Overton Graph : verrou HARD single-writer. Positions, arêtes acteur
 * et transitions de zone ne se créent QUE dans `seshat/overton-graph/index.ts`.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");
const ALLOWED = "src/server/services/seshat/overton-graph/index.ts";

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(entry)) yield full;
  }
}

const GUARDED: ReadonlyArray<{ label: string; re: RegExp }> = [
  { label: "overtonPosition.create", re: /\bovertonPosition\s*\.\s*create\s*\(/ },
  { label: "overtonActorLink.create", re: /\bovertonActorLink\s*\.\s*create\s*\(/ },
  { label: "overtonZoneTransition.create", re: /\bovertonZoneTransition\s*\.\s*create\s*\(/ },
];

describe("ADR-0146 — single-writer Overton Graph", () => {
  it("aucune création hors du service overton-graph", () => {
    const violations: string[] = [];
    for (const file of walk(SRC)) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      if (rel === ALLOWED) continue;
      const src = readFileSync(file, "utf8");
      for (const { label, re } of GUARDED) {
        if (re.test(src)) violations.push(`${rel} : ${label}`);
      }
    }
    expect(violations, `écritures Overton hors single-writer :\n${violations.join("\n")}`).toEqual([]);
  });

  it("le single-writer porte les 3 créations gardées", () => {
    const src = readFileSync(join(ROOT, ALLOWED), "utf8");
    expect(/\bovertonPosition\s*\.\s*create\s*\(/.test(src)).toBe(true);
    expect(/\bovertonZoneTransition\s*\.\s*create\s*\(/.test(src)).toBe(true);
  });
});
