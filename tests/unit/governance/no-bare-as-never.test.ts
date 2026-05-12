/**
 * Anti-drift — `as never` cast (mode SOFT baseline).
 *
 * Contexte : `as never` est un cast TS-bypass qui désactive le typecheck — il
 * cache du drift cross-module (cf. commit d3af938 manifestoSnapshot où un
 * rename Prisma a échappé au compilateur à cause d'un `as never`).
 *
 * Cible : 0 occurrence. Méthode : fix-by-class incrémental avec remplacement
 * par `as Prisma.InputJsonValue`, `as <DomainEnum>`, ou `as unknown as <Type>`
 * (canonique pour types métier non-index-signature-compatibles).
 *
 * Mode **HARD** depuis 2026-05-12 (baseline=0). La session NEFER complète a
 * éliminé les 195 sites en 25+ commits :
 *   - 195 → 50 : 10 commits fix-by-class par concentration (writePillar,
 *     widenSection, campaign-manager, brand-vault, artemis, etc.)
 *   - 50 → 0  : 2 commits batch long-tail (11 fichiers ×2 sites + 27 fichiers
 *     ×1 site) — patterns canoniques `as Prisma.InputJsonValue`,
 *     `as <PrismaEnum>`, `as Parameters<typeof fn>[0]`, etc.
 *
 * Toute nouvelle introduction de `as never` dans src/ → fail CI immédiat.
 * Cf. NEFER.md §3.3 + memory `feedback_no_parallel_pillar_writes.md`.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");

/**
 * Mode HARD — baseline 0. Toute introduction nouvelle = fail CI.
 *
 * Si une régression doit être ré-introduite temporairement (ex: migration
 * Prisma transitoire qui requiert un cast widening), augmenter cette baseline
 * dans le commit qui ajoute le cast, avec justification dans le commit
 * message. Toute baseline > 0 doit être éliminée dans les 5 commits suivants.
 */
const BASELINE_AS_NEVER_COUNT = 0;

function* walkFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const s = statSync(full);
    if (s.isDirectory()) {
      yield* walkFiles(full);
    } else if (
      s.isFile() &&
      (full.endsWith(".ts") || full.endsWith(".tsx")) &&
      !full.endsWith(".test.ts") &&
      !full.endsWith(".test.tsx") &&
      !full.endsWith(".d.ts")
    ) {
      yield full;
    }
  }
}

function countAsNeverSites(): { count: number; sites: Array<{ file: string; line: number }> } {
  const re = /\bas\s+never\b/g;
  const sites: Array<{ file: string; line: number }> = [];
  for (const file of walkFiles(SRC)) {
    const text = readFileSync(file, "utf-8");
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const line = text.slice(0, m.index).split("\n").length;
      sites.push({
        file: relative(ROOT, file).replace(/\\/g, "/"),
        line,
      });
    }
  }
  return { count: sites.length, sites };
}

describe("anti-drift: no bare `as never` cast", () => {
  it(`count <= baseline (${BASELINE_AS_NEVER_COUNT})`, () => {
    const { count, sites } = countAsNeverSites();
    if (count > BASELINE_AS_NEVER_COUNT) {
      const overshoot = count - BASELINE_AS_NEVER_COUNT;
      const recent = sites.slice(-overshoot - 5).map((s) => `  ${s.file}:${s.line}`).join("\n");
      throw new Error(
        `${count} \`as never\` casts détectés — baseline est ${BASELINE_AS_NEVER_COUNT}, ` +
          `excédent de ${overshoot}.\n` +
          `Derniers sites (potentiellement nouveaux) :\n${recent}\n\n` +
          `→ Remplacer chaque \`as never\` par un cast nommé :\n` +
          `   - JSON Json field → \`as Prisma.InputJsonValue\`\n` +
          `   - Enum → \`as <PrismaEnum>\` ou cast retiré si types match\n` +
          `   - Type métier non-index-compatible → \`as unknown as <Type>\`\n` +
          `   - Function arg avec type local → \`as Parameters<typeof fn>[0]\`\n` +
          `Cf. NEFER.md §3.3 + memory feedback_no_parallel_pillar_writes.md.`,
      );
    }
    expect(count).toBeLessThanOrEqual(BASELINE_AS_NEVER_COUNT);
  });
});
