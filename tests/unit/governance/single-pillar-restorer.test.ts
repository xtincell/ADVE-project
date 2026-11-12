/**
 * HARD — one pillar restorer (ADR-0207, amendement 562).
 *
 * The 420 counter-example and the Notoria withdrawal shared one failure: a
 * caller read an archived `PillarVersion` and wrote its content back itself
 * (REPLACE_FULL), erasing the independent decisions that followed and choosing
 * the archive by date. Restoration now has a single entry,
 * `pillar-gateway/rollback.ts` → gateway `RESTORE_VERSION` (avant / appliqué /
 * courant, conflict refusal, receipts, one-effect identity).
 *
 * This guard keeps it that way:
 *   1. the `RESTORE_VERSION` operation is only built inside the gateway module;
 *   2. no module outside the gateway both reads archived pillar content and
 *      writes a pillar — that is a second restorer.
 * No allowlist: a legitimate new restoration surface calls `rollbackPillar`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");
const GATEWAY_DIR = "src/server/services/pillar-gateway/";

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.tsx?$/.test(full) && !/\.(test|spec)\.tsx?$/.test(full) && !full.endsWith(".d.ts")) yield full;
  }
}

/** Source without comments, so a doc mention never counts as code. */
function code(file: string): string {
  return readFileSync(file, "utf-8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
}

const ARCHIVE_READ = /\.pillarVersion\.find\w*\s*\(/;
const PILLAR_WRITE = /\b(?:writePillar|writePillarAndScore|writePillarsAtomically|withPillarTransaction)\s*\(/;
const RESTORE_OPERATION = /type\s*:\s*["']RESTORE_VERSION["']/;

function outsideGateway(): Array<{ file: string; text: string }> {
  return [...walk(SRC)]
    .map(file => ({ file: relative(ROOT, file).replace(/\\/g, "/"), text: code(file) }))
    .filter(({ file }) => !file.startsWith(GATEWAY_DIR));
}

describe("HARD — single pillar restorer (ADR-0207)", () => {
  it("builds the RESTORE_VERSION operation only inside the gateway module", () => {
    const offenders = outsideGateway().filter(({ text }) => RESTORE_OPERATION.test(text)).map(({ file }) => file);
    expect(offenders, "Restaurer un pilier : appeler rollbackPillar (pillar-gateway/rollback.ts).").toEqual([]);
  });

  it("no module outside the gateway reads an archived version and writes a pillar", () => {
    const offenders = outsideGateway()
      .filter(({ text }) => ARCHIVE_READ.test(text) && PILLAR_WRITE.test(text))
      .map(({ file }) => file);
    expect(offenders, "Second restaurateur détecté : la compensation ciblée passe par rollbackPillar.").toEqual([]);
  });

  it("the history action, the journal and the Notoria withdrawal all enter rollbackPillar", () => {
    const read = (path: string) => code(join(ROOT, path));
    expect(read("src/server/trpc/routers/pillar.ts")).toMatch(/rollbackVersion[\s\S]*?rollbackPillar\(/);
    expect(read("src/server/services/artemis/commandant.ts")).toMatch(/case "ROLLBACK_PILLAR"[\s\S]*?rollbackPillar\(/);
    expect(read("src/server/services/notoria/lifecycle.ts")).toMatch(/export async function revertReco[\s\S]*?rollbackPillar\(/);
  });
});
