/**
 * ADR-0154 — Prospect Scoring : verrous HARD.
 *  1. Single-writer `EpreuveCandidate` (seul `scoreur/candidates.ts`).
 *  2. Quarantaine étanche : le chemin de SCORING (`compilateur`/`index`) ne
 *     référence jamais `epreuveCandidate` → une victoire non revue ne peut pas
 *     entrer dans un score.
 *  3. `victory-hunt` n'écrit jamais `Epreuve` ni n'appelle `recordEpreuve`.
 *  4. Garde `sourceUrl` obligatoire (auto-REJECT) présente dans `candidates`.
 *  5. Manual-first : `decideCandidate` passe par `recordEpreuve` (voie unique).
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");
const CANDIDATES = "src/server/services/seshat/scoreur/candidates.ts";

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(entry)) yield full;
  }
}

const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

describe("ADR-0154 — single-writer EpreuveCandidate", () => {
  it("aucune écriture epreuveCandidate hors de candidates.ts", () => {
    const re = /\bepreuveCandidate\s*\.\s*(create|createMany|update|updateMany|upsert|delete)\s*\(/;
    const violations: string[] = [];
    for (const file of walk(SRC)) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      if (rel === CANDIDATES) continue;
      if (re.test(readFileSync(file, "utf8"))) violations.push(rel);
    }
    expect(violations, `écritures hors single-writer :\n${violations.join("\n")}`).toEqual([]);
  });
});

describe("ADR-0154 — quarantaine étanche (le score ne lit jamais la quarantaine)", () => {
  it("compilateur + scoreBrand ne référencent jamais epreuveCandidate", () => {
    for (const rel of [
      "src/server/services/seshat/scoreur/compilateur.ts",
      "src/server/services/seshat/scoreur/index.ts",
    ]) {
      expect(read(rel), `${rel} référence la quarantaine`).not.toMatch(/epreuveCandidate/i);
    }
  });
});

describe("ADR-0154 — hunt n'écrit jamais Epreuve", () => {
  it("victory-hunt.ts ne contient ni epreuve.create ni recordEpreuve", () => {
    const src = read("src/server/services/seshat/argos/victory-hunt.ts");
    expect(src).not.toMatch(/\bepreuve\s*\.\s*create\s*\(/);
    expect(src).not.toMatch(/\brecordEpreuve\b/);
    // ...mais il passe bien par la quarantaine (createCandidates).
    expect(src).toMatch(/createCandidates/);
  });
});

describe("ADR-0154 — garde sourceUrl obligatoire (auto-REJECT)", () => {
  it("candidates.ts auto-rejette une candidate sans source", () => {
    const src = read(CANDIDATES);
    expect(src).toMatch(/hasSource/);
    expect(src).toMatch(/"REJECTED"/);
    // la garde précède le status PENDING.
    expect(src).toMatch(/hasSource\s*\?\s*"PENDING"\s*:\s*"REJECTED"/);
  });
});

describe("ADR-0154 — manual-first (recordEpreuve reste la voie unique)", () => {
  it("decideCandidate (APPROVE) passe par recordEpreuve", () => {
    const src = read(CANDIDATES);
    expect(src).toMatch(/import\s*\{[^}]*recordEpreuve[^}]*\}\s*from\s*"\.\/index"/);
    expect(src).toMatch(/recordEpreuve\s*\(/);
  });
});
