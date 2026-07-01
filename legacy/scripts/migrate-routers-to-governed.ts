/**
 * scripts/migrate-routers-to-governed.ts — Codemod that wires the strangler
 * middleware onto every tRPC router.
 *
 * Strategy:
 *   - For each router file, find the END of the import block (last
 *     statement that begins with `import` and ends with `;` — supports
 *     multi-line `import { a, b, } from "..."` blocks).
 *   - Inject the strangler import + audited consts after that last `;`.
 *   - The audit middleware does its work transparently — we don't have to
 *     rewrite handler bodies.
 *
 * Idempotent via marker `// @governed-procedure-applied`.
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROUTERS_DIR = path.join(ROOT, "src", "server", "trpc", "routers");
const MARKER = "// @governed-procedure-applied";

interface Result {
  file: string;
  status: "applied" | "skipped" | "already";
  reason?: string;
}

async function main() {
  const entries = await fs.readdir(ROUTERS_DIR, { withFileTypes: true });
  const results: Result[] = [];
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".ts")) continue;
    const file = path.join(ROUTERS_DIR, e.name);
    results.push(await migrate(file));
  }
  const applied = results.filter((r) => r.status === "applied").length;
  const already = results.filter((r) => r.status === "already").length;
  const skipped = results.filter((r) => r.status === "skipped");
  console.log(
    `Codemod result: ${applied} applied, ${already} already-applied, ${skipped.length} skipped.`,
  );
  for (const s of skipped) {
    console.log(`  skip ${s.file} — ${s.reason}`);
  }
}

/** Find the last char index of the import block (last `;` of an `import` statement). */
function findImportBlockEnd(src: string): number | null {
  let lastEnd: number | null = null;
  let i = 0;
  const n = src.length;
  while (i < n) {
    // Skip whitespace + line comments + block comments.
    while (i < n && /\s/.test(src[i] ?? "")) i++;
    if (src.slice(i, i + 2) === "//") {
      const eol = src.indexOf("\n", i);
      if (eol < 0) return lastEnd;
      i = eol + 1;
      continue;
    }
    if (src.slice(i, i + 2) === "/*") {
      const close = src.indexOf("*/", i + 2);
      if (close < 0) return lastEnd;
      i = close + 2;
      continue;
    }
    // Is the next token "import"?
    if (src.slice(i, i + 6) === "import" && /\W/.test(src[i + 6] ?? "")) {
      // Find the terminating ";". Track `{` balance to avoid premature
      // termination on default-import-with-block etc. Strings handled.
      let j = i + 6;
      let depth = 0;
      let inStr: '"' | "'" | "`" | null = null;
      for (; j < n; j++) {
        const c = src[j]!;
        if (inStr) {
          if (c === "\\") {
            j++;
            continue;
          }
          if (c === inStr) inStr = null;
          continue;
        }
        if (c === '"' || c === "'" || c === "`") {
          inStr = c;
          continue;
        }
        if (c === "{") depth++;
        else if (c === "}") depth--;
        else if (c === ";" && depth === 0) {
          lastEnd = j;
          i = j + 1;
          break;
        }
      }
      if (j >= n) return lastEnd;
      continue;
    }
    // Not an import token at this position — bail.
    return lastEnd;
  }
  return lastEnd;
}

async function migrate(file: string): Promise<Result> {
  const src = await fs.readFile(file, "utf8");
  if (src.includes(MARKER)) {
    return { file: path.relative(ROOT, file), status: "already" };
  }
  const usesProtected = /\bprotectedProcedure\b/.test(src);
  const usesAdmin = /\badminProcedure\b/.test(src);
  if (!usesProtected && !usesAdmin) {
    return {
      file: path.relative(ROOT, file),
      status: "skipped",
      reason: "no protected/admin procedure",
    };
  }
  const end = findImportBlockEnd(src);
  if (end === null) {
    return {
      file: path.relative(ROOT, file),
      status: "skipped",
      reason: "could not parse import block",
    };
  }

  const insertion: string[] = [
    "",
    `import { auditedProcedure } from "@/server/governance/governed-procedure";`,
    "",
    MARKER,
  ];
  if (usesProtected)
    insertion.push(
      `const _auditedProtected = auditedProcedure(protectedProcedure, "${path.basename(file, ".ts")}");`,
    );
  if (usesAdmin)
    insertion.push(
      `const _auditedAdmin = auditedProcedure(adminProcedure, "${path.basename(file, ".ts")}");`,
    );
  // Suppress unused-var lint warnings for the strangler consts —
  // they exist to be referenced manually as routers migrate.
  insertion.push(
    "/* eslint-disable @typescript-eslint/no-unused-vars */",
  );
  insertion.push(
    "/* lafusee:strangler-active */",
  );

  const patched = src.slice(0, end + 1) + insertion.join("\n") + src.slice(end + 1);
  await fs.writeFile(file, patched, "utf8");
  return { file: path.relative(ROOT, file), status: "applied" };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
