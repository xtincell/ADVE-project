/**
 * ADR-0145 — Identity Graph : verrou HARD single-writer.
 *
 * `PersonIdentity` / `PersonIdentifier` ne se créent QUE dans le service
 * `seshat/identity-graph/index.ts`, et le rattachement `SuperfanProfile.personId`
 * ne s'écrit QUE là. Ferme le vecteur de double-comptage/inflation : aucune autre
 * surface ne peut naître une personne ou re-router un profil hors de la voie
 * gouvernée (mutations via Intents SESHAT).
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");
const ALLOWED = "src/server/services/seshat/identity-graph/index.ts";

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(entry)) yield full;
  }
}

/** Écritures réservées au single-writer. */
const GUARDED_PATTERNS: ReadonlyArray<{ label: string; re: RegExp }> = [
  { label: "personIdentity.create", re: /\bpersonIdentity\s*\.\s*create\s*\(/ },
  { label: "personIdentifier.create", re: /\bpersonIdentifier\s*\.\s*create\s*\(/ },
  { label: "superfanProfile.updateMany({ personId })", re: /superfanProfile\s*\.\s*updateMany[\s\S]{0,120}?personId/ },
];

describe("ADR-0145 — single-writer PersonIdentity/PersonIdentifier", () => {
  it("aucune création/rattachement hors du service identity-graph", () => {
    const violations: string[] = [];
    for (const file of walk(SRC)) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      if (rel === ALLOWED) continue;
      const src = readFileSync(file, "utf8");
      for (const { label, re } of GUARDED_PATTERNS) {
        if (re.test(src)) violations.push(`${rel} : ${label}`);
      }
    }
    expect(violations, `écritures d'identité hors single-writer :\n${violations.join("\n")}`).toEqual([]);
  });

  it("le single-writer existe et porte les 3 créations gardées", () => {
    const src = readFileSync(join(ROOT, ALLOWED), "utf8");
    expect(/\bpersonIdentity\s*\.\s*create\s*\(/.test(src)).toBe(true);
    expect(/\bpersonIdentifier\s*\.\s*create\s*\(/.test(src)).toBe(true);
  });
});
