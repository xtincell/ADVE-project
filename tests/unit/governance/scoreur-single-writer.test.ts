/**
 * ADR-0147 — Scoreur : verrous HARD.
 *  1. Single-writer : Epreuve / ScoreVerdict / BrandRef ne s'écrivent QUE dans le
 *     service `seshat/scoreur/`.
 *  2. D9 — deux scores jamais fusionnés : le domaine du scoreur ne touche PAS
 *     `STRUCTURAL_WEIGHTS` / `computeComposite` (complétude ADR-0102 intacte).
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");
const SERVICE_DIR = "src/server/services/seshat/scoreur/";

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
  { label: "epreuve.create", re: /\bepreuve\s*\.\s*create\s*\(/ },
  { label: "scoreVerdict.create", re: /\bscoreVerdict\s*\.\s*create\s*\(/ },
  { label: "brandRef.upsert/create", re: /\bbrandRef\s*\.\s*(upsert|create)\s*\(/ },
];

describe("ADR-0147 — single-writer scoreur", () => {
  it("aucune écriture Epreuve/ScoreVerdict/BrandRef hors du service scoreur", () => {
    const violations: string[] = [];
    for (const file of walk(SRC)) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      if (rel.startsWith(SERVICE_DIR)) continue;
      const src = readFileSync(file, "utf8");
      for (const { label, re } of GUARDED) {
        if (re.test(src)) violations.push(`${rel} : ${label}`);
      }
    }
    expect(violations, `écritures scoreur hors single-writer :\n${violations.join("\n")}`).toEqual([]);
  });
});

describe("ADR-0147 D9 — force révélée ≠ complétude structurelle (ADR-0102)", () => {
  it("le domaine scoreur ne référence pas STRUCTURAL_WEIGHTS / computeComposite", () => {
    const scoreurDomain = join(SRC, "domain", "scoreur");
    const violations: string[] = [];
    for (const file of walk(scoreurDomain)) {
      const src = readFileSync(file, "utf8");
      if (/STRUCTURAL_WEIGHTS|computeComposite/.test(src)) {
        violations.push(relative(ROOT, file));
      }
    }
    expect(violations).toEqual([]);
  });

  it("scoring.ts (ADR-0102) conserve STRUCTURAL_WEIGHTS canon { atoms:15, collections:7, crossRefs:3 }", () => {
    const src = readFileSync(join(SRC, "lib", "utils", "scoring.ts"), "utf8");
    expect(src).toMatch(/atoms:\s*15/);
    expect(src).toMatch(/collections:\s*7/);
    expect(src).toMatch(/crossRefs:\s*3/);
  });
});
