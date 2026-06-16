/**
 * Anti-drift — `writePillar` bare hors pillar-gateway interdit.
 *
 * Contexte (RESIDUAL-DEBT v6.1.18) : `writePillar` direct écrit le contenu mais
 * **ne réconcilie pas** Pillar.completionLevel cache. Symptôme : la cascade
 * RTIS / les chips Notoria / la readiness gate divergent du contenu réel.
 *
 * **Tous les callers DOIVENT passer par `writePillarAndScore`** (cf.
 * `src/server/services/pillar-gateway/index.ts:582`) qui wrappe writePillar +
 * postWriteScore + reconcileCompletionLevelCache + eventBus.publish.
 *
 * **Sites légitimes restants** :
 *   - `src/server/services/pillar-gateway/index.ts:583` — l'implémentation
 *     interne de `writePillarAndScore` qui appelle `writePillar(request)`.
 *
 * Tout autre site est une régression (Phase 21 mégasprint cleanup).
 *
 * Mode HARD (baseline=0) — ce test bloque le merge si un seul nouveau caller
 * bare apparaît. Pour ré-introduire un caller bare avec rationale, ajouter
 * une exception explicite dans la liste `ALLOWED_BARE_CALLERS` ci-dessous
 * avec justification dans le commentaire.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");

/**
 * Sites où `await writePillar(` bare est légitime — justification obligatoire.
 * Format : POSIX path relatif au repo root + numéro de ligne.
 */
const ALLOWED_BARE_CALLERS: ReadonlyArray<{ file: string; line: number; reason: string }> = [
  {
    file: "src/server/services/pillar-gateway/index.ts",
    line: 593,
    reason: "Implémentation interne de writePillarAndScore — appelle writePillar puis cache reconcile + scoring + event.",
  },
  {
    file: "src/server/trpc/routers/quick-intake.ts",
    line: 58,
    reason:
      "seedPillarFromIntake (reroute C1, P2-b) — bare writePillar VOLONTAIRE : préserve l'advertis_vector calculé à l'intake. writePillarAndScore recalculerait le score depuis le contenu brut partiel → régression du score affiché. Validation Zod + PillarVersion + cascade staleness + author trail sont appliqués (le gap C1) ; le reconcile completionLevel + le score se font sur la prochaine écriture réelle / l'activation.",
  },
];

interface BareCall {
  file: string;
  line: number;
}

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

function findBareCallers(): BareCall[] {
  const out: BareCall[] = [];
  const re = /\bawait writePillar\(/g;
  for (const file of walkFiles(SRC)) {
    const text = readFileSync(file, "utf-8");
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const line = text.slice(0, m.index).split("\n").length;
      out.push({
        file: relative(ROOT, file).replace(/\\/g, "/"),
        line,
      });
    }
  }
  return out;
}

describe("anti-drift: no bare writePillar()", () => {
  it("no bare `await writePillar(` outside the allowlist", () => {
    const callers = findBareCallers();
    const unexpected = callers.filter(
      (c) =>
        !ALLOWED_BARE_CALLERS.some(
          (a) => a.file === c.file && a.line === c.line,
        ),
    );

    if (unexpected.length > 0) {
      const msg = unexpected
        .map((c) => `  ${c.file}:${c.line}`)
        .join("\n");
      throw new Error(
        `${unexpected.length} bare \`await writePillar(\` callers détectés hors allowlist :\n${msg}\n\n` +
          `→ Remplacer par \`writePillarAndScore\` (cf. ADR-0066 / RESIDUAL-DEBT v6.1.18).\n` +
          `→ Si bare est intentionnel, ajouter l'entrée dans ALLOWED_BARE_CALLERS avec rationale.`,
      );
    }
    expect(unexpected).toEqual([]);
  });

  it("allowlist entries actually exist (no stale exception)", () => {
    const callers = findBareCallers();
    const stale = ALLOWED_BARE_CALLERS.filter(
      (a) => !callers.some((c) => c.file === a.file && c.line === a.line),
    );
    if (stale.length > 0) {
      const msg = stale.map((s) => `  ${s.file}:${s.line} (${s.reason})`).join("\n");
      throw new Error(
        `${stale.length} entrées ALLOWED_BARE_CALLERS pointent sur des sites qui n'existent plus — purger :\n${msg}`,
      );
    }
    expect(stale).toEqual([]);
  });
});
