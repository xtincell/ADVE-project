/**
 * Anti-drift CI test — ADR file numbering uniqueness.
 *
 * Vérifie qu'aucune paire de fichiers ADR ne partage le même préfixe 4-digit.
 * Pattern de prévention contre les collisions causées par PRs en parallèle
 * (cf. CHANGELOG v6.18.4 résolution 0028/0034 + v6.18.8 résolution
 * 0037/0038/0039). Mentionné comme résidu attendu depuis v6.18.4.
 *
 * Convention : `docs/governance/adr/<NNNN>-<slug>.md` où NNNN est unique.
 * NEFER §3 interdit absolu n°3 — drift narratif silencieux.
 */

import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const ADR_DIR = join(__dirname, "../../../docs/governance/adr");
const ADR_NUMBER_PREFIX = /^(\d{4})-/;

describe("adr-uniqueness — anti-drift ADR numbering", () => {
  it("aucune paire d'ADRs ne partage le même préfixe 4-digit", () => {
    const files = readdirSync(ADR_DIR).filter((f) => f.endsWith(".md"));
    const byNumber = new Map<string, string[]>();

    for (const file of files) {
      const match = file.match(ADR_NUMBER_PREFIX);
      if (!match) continue;
      const number = match[1]!;
      const list = byNumber.get(number) ?? [];
      list.push(file);
      byNumber.set(number, list);
    }

    const collisions = [...byNumber.entries()].filter(([, files]) => files.length > 1);

    if (collisions.length > 0) {
      const report = collisions
        .map(([num, files]) => `  ADR-${num} : ${files.join(", ")}`)
        .join("\n");
      throw new Error(
        `ADR numbering collisions détectées (${collisions.length} paire${collisions.length > 1 ? "s" : ""}) :\n${report}\n\n` +
          `Pattern de résolution canonique (cf. CHANGELOG v6.18.4 + v6.18.8) :\n` +
          `  1. Identifier le premier-arrivé via 'git log --diff-filter=A --format="%h %ai" -- <path>'.\n` +
          `  2. 'git mv' du second-arrivé vers le prochain numéro libre (first-come keep).\n` +
          `  3. Ajouter note "Renumérotation YYYY-MM-DD" en tête de l'ADR renommé.\n` +
          `  4. Propager cross-refs (CLAUDE.md, CHANGELOG, LEXICON, src/**, tests/**).`,
      );
    }

    expect(collisions).toHaveLength(0);
  });

  it("tous les fichiers ADR suivent le pattern <NNNN>-<slug>.md", () => {
    const files = readdirSync(ADR_DIR).filter((f) => f.endsWith(".md"));
    const malformed = files.filter((f) => !ADR_NUMBER_PREFIX.test(f));

    expect(malformed).toEqual([]);
  });

  it("les numéros ADR forment une séquence sans trou hors renumérotations documentées", () => {
    const files = readdirSync(ADR_DIR).filter((f) => f.endsWith(".md"));
    const numbers = files
      .map((f) => f.match(ADR_NUMBER_PREFIX)?.[1])
      .filter((n): n is string => Boolean(n))
      .map((n) => parseInt(n, 10))
      .sort((a, b) => a - b);

    expect(numbers.length).toBeGreaterThan(0);
    const max = numbers[numbers.length - 1]!;
    const expected = Array.from({ length: max }, (_, i) => i + 1);
    const missing = expected.filter((n) => !numbers.includes(n));

    // Trous autorisés (renumérotations documentées) : 0028 et 0034 ont été
    // renumérotés vers 0048/0049 (v6.18.4) ; 0037-output-first et 0039-rtis
    // ont été renumérotés vers 0050/0051 (v6.18.8). Les anciens numéros ont
    // été libérés mais leurs slots restent occupés par les "first-come keep"
    // (0028 = strategy-archive, 0034 = console-namespace, 0037 =
    // country-scoped, 0039 = sequence-as-unique). Aucun trou attendu.
    expect(missing).toEqual([]);
  });
});
