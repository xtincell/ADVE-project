/**
 * generate-legacy-intent-kinds.ts — Phase 9-suite Tier 2.1 promotion.
 *
 * Pour chaque router strangler, parse les noms de mutations et génère :
 *   - une Intent kind dédiée `LEGACY_<ROUTER>_<MUTATION>` dans
 *     `intent-kinds.ts` (entre les marqueurs `BEGIN/END AUTOGEN`)
 *   - un SLO default dans `slos.ts` (entre marqueurs)
 *
 * Le `auditedProcedure` middleware utilise ensuite ces kinds dédiés
 * (un par mutation) au lieu du `LEGACY_MUTATION` synthétique unique.
 *
 * Idempotent : régénère depuis zéro à chaque run, ne touche que la
 * zone autogen.
 *
 * Run : `npx tsx scripts/generate-legacy-intent-kinds.ts`
 */

import { readFileSync, readdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const ROUTERS_DIR = resolve(__dirname, "..", "src/server/trpc/routers");
const INTENT_KINDS_FILE = resolve(__dirname, "..", "src/server/governance/intent-kinds.ts");
const SLOS_FILE = resolve(__dirname, "..", "src/server/governance/slos.ts");

const BEGIN_MARK = "// ── AUTOGEN: legacy-intent-kinds — DO NOT EDIT MANUALLY ──";
const END_MARK = "// ── /AUTOGEN: legacy-intent-kinds ──";

interface MutationDef {
  router: string;
  mutation: string;
  kind: string;
}

function toScreamingSnake(s: string): string {
  return s
    .replace(/[A-Z]/g, (c) => `_${c}`)
    .replace(/-/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .toUpperCase();
}

function parseRouterMutations(file: string): MutationDef[] {
  const content = readFileSync(file, "utf-8");
  if (!content.includes("lafusee:strangler-active")) return [];

  const router = file.split(/[/\\]/).pop()!.replace(/\.ts$/, "");
  const mutations: MutationDef[] = [];

  // Pattern : lines like `<name>: <something>.mutation(...)` or
  // `<name>:\n    <something>.mutation(...)` etc.
  // We accept lines where a property `<name>:` is followed by a chain
  // that ends in `.mutation(`.
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const m = line.match(/^\s{2,4}(\w+)\s*:\s*/);
    if (!m) continue;
    const name = m[1]!;
    // Look ahead within the next ~8 lines for a `.mutation(` before the
    // next top-level property.
    let foundMutation = false;
    for (let j = i; j < Math.min(i + 12, lines.length); j++) {
      if (j > i && /^\s{2,4}\w+\s*:\s*/.test(lines[j] ?? "")) break;
      if ((lines[j] ?? "").includes(".mutation(")) {
        foundMutation = true;
        break;
      }
    }
    if (!foundMutation) continue;

    const kind = `LEGACY_${toScreamingSnake(router)}_${toScreamingSnake(name)}`;
    if (!mutations.find((mu) => mu.kind === kind)) {
      mutations.push({ router, mutation: name, kind });
    }
  }
  return mutations;
}

function generateIntentKindsBlock(mutations: MutationDef[]): string {
  const lines: string[] = [];
  lines.push(BEGIN_MARK);
  lines.push(`  // ${mutations.length} legacy mutation kinds auto-generated from strangler routers.`);
  lines.push(`  // Source : scripts/generate-legacy-intent-kinds.ts. Re-run after any router mutation rename.`);
  for (const m of mutations) {
    const desc = `Strangler-promoted mutation '${m.mutation}' from router '${m.router}'.`;
    lines.push(`  { kind: "${m.kind}", governor: "INFRASTRUCTURE", handler: "${m.router}", async: false, description: ${JSON.stringify(desc)} },`);
  }
  lines.push(`  ${END_MARK}`);
  return lines.join("\n");
}

function generateSlosBlock(mutations: MutationDef[]): string {
  const lines: string[] = [];
  lines.push(`  ${BEGIN_MARK}`);
  lines.push(`  // ${mutations.length} legacy mutation SLOs (defaults — tighten per-mutation as needed).`);
  for (const m of mutations) {
    lines.push(`  { kind: "${m.kind}", p95LatencyMs: 5_000, errorRatePct: 0.05, costP95Usd: 0 },`);
  }
  lines.push(`  ${END_MARK}`);
  return lines.join("\n");
}

function injectAutogen(file: string, generated: string): boolean {
  const content = readFileSync(file, "utf-8");
  const beginIdx = content.indexOf(BEGIN_MARK);
  if (beginIdx >= 0) {
    // Replace existing block
    const endIdx = content.indexOf(END_MARK, beginIdx);
    if (endIdx < 0) {
      throw new Error(`Found BEGIN_MARK but no END_MARK in ${file}`);
    }
    const before = content.slice(0, beginIdx);
    const after = content.slice(endIdx + END_MARK.length);
    writeFileSync(file, before + generated.trimStart() + after);
    return true;
  }
  // Append before the array closing `]` (either `] as const;` or `];`).
  for (const closing of ["] as const;", "];"]) {
    const closingIdx = content.lastIndexOf(closing);
    if (closingIdx >= 0) {
      const before = content.slice(0, closingIdx);
      const after = content.slice(closingIdx);
      writeFileSync(file, before.trimEnd() + "\n\n" + generated + "\n" + after);
      return true;
    }
  }
  throw new Error(`Could not find closing array bracket in ${file}`);
}

function main() {
  const routerFiles = readdirSync(ROUTERS_DIR)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((f) => resolve(ROUTERS_DIR, f));

  const allMutations: MutationDef[] = [];
  for (const f of routerFiles) {
    allMutations.push(...parseRouterMutations(f));
  }

  // Sort for deterministic output
  allMutations.sort((a, b) => a.kind.localeCompare(b.kind));

  console.log(`[gen-legacy-intent-kinds] ${allMutations.length} mutations from ${routerFiles.length} router files`);

  const intentKindsBlock = generateIntentKindsBlock(allMutations);
  const slosBlock = generateSlosBlock(allMutations);

  injectAutogen(INTENT_KINDS_FILE, intentKindsBlock);
  injectAutogen(SLOS_FILE, slosBlock);

  console.log(`[gen-legacy-intent-kinds] wrote ${INTENT_KINDS_FILE}`);
  console.log(`[gen-legacy-intent-kinds] wrote ${SLOS_FILE}`);
}

main();
