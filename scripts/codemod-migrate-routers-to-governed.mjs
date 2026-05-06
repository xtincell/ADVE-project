#!/usr/bin/env node
/**
 * Codemod : migrate strangler routers from auditedProcedure to governedProcedure.
 *
 * Pattern transformations per router :
 *
 * 1. Replace import :
 *    `import { auditedProcedure } from "@/server/governance/governed-procedure";`
 *    → `import { governedProcedure } from "@/server/governance/governed-procedure";`
 *
 * 2. Remove const auditedProtected/auditedAdmin definitions (unused after migration).
 *
 * 3. Replace marker :
 *    `/* lafusee:strangler-active *​/` → `/* lafusee:governed-active *​/`
 *
 * 4. For each mutation chain `<name>: auditedProtected.input(<schema>).mutation(<handler>)` :
 *    → `<name>: governedProcedure({ kind: "LEGACY_<ROUTER>_<NAME>", inputSchema: <schema>, caller: "<router>:<name>" }).mutation(<handler>)`
 *
 * Idempotent : skip routers already migrated (no `lafusee:strangler-active` marker).
 *
 * Edge cases handled :
 *  - `.input().output().mutation()` with output schema
 *  - Multi-line `.input(z.object({...}))`
 *  - `auditedAdmin` (admin-procedure variant)
 *
 * Usage : `node scripts/codemod-migrate-routers-to-governed.mjs [--dry-run] [router-name...]`
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";

const ROUTERS_DIR = join(process.cwd(), "src/server/trpc/routers");
const DRY = process.argv.includes("--dry-run");
const FILTER = process.argv.slice(2).filter((a) => !a.startsWith("--"));

function toScreamingSnake(s) {
  return s
    .replace(/[A-Z]/g, (c) => `_${c}`)
    .replace(/-/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .toUpperCase();
}

function buildLegacyKind(router, mutation) {
  return `LEGACY_${toScreamingSnake(router)}_${toScreamingSnake(mutation)}`;
}

function processRouter(filepath) {
  let text = readFileSync(filepath, "utf-8");
  if (!text.includes("lafusee:strangler-active")) return { skipped: true };

  const router = basename(filepath, ".ts");
  const originalText = text;
  let mutationsCount = 0;

  // Capture procedure variables (auditedProtected, auditedAdmin, etc.)
  const procVarRe = /^const\s+(audited\w+)\s*=\s*auditedProcedure\(([^,]+),\s*"[^"]+"\)\s*;?\s*$/gm;
  const procVars = new Set();
  let m;
  while ((m = procVarRe.exec(text)) !== null) {
    procVars.add(m[1]);
  }

  if (procVars.size === 0) {
    // Router has marker but no auditedProtected/Admin — only marker rename.
    text = text.replace(/lafusee:strangler-active/g, "lafusee:governed-active");
  } else {
    // Pattern : `<name>: <var>.input(...)<other>.mutation(<handler>)`
    // We need to handle multi-line input schemas, so use a manual parser.
    for (const procVar of procVars) {
      const mutationStartRe = new RegExp(
        `(\\s+)(\\w+):\\s*${procVar}\\s*\\n?\\s*\\.input\\(`,
        "g",
      );
      let match;
      const replacements = [];
      while ((match = mutationStartRe.exec(text)) !== null) {
        const startIdx = match.index;
        const mutationName = match[2];
        const indent = match[1];
        const inputStart = match.index + match[0].length;

        // Find balanced parens for .input(...)
        let depth = 1;
        let i = inputStart;
        while (i < text.length && depth > 0) {
          if (text[i] === "(") depth++;
          else if (text[i] === ")") depth--;
          i++;
        }
        const inputEnd = i;
        const inputSchema = text.slice(inputStart, inputEnd - 1).trim();

        // Find next .mutation(
        const restAfterInput = text.slice(inputEnd);
        const mutationMatch = restAfterInput.match(/^\s*(?:\.\w+\([^)]*\)\s*)*\.mutation\(/);
        if (!mutationMatch) continue;

        // Build replacement (only the procedure prefix part)
        const kind = buildLegacyKind(router, mutationName);
        const newPrefix = `${indent}${mutationName}: governedProcedure({\n${indent}  kind: "${kind}",\n${indent}  inputSchema: ${inputSchema},\n${indent}  caller: "${router}:${mutationName}",\n${indent}})`;

        replacements.push({ startIdx, endIdx: inputEnd, newText: newPrefix });
        mutationsCount++;
      }

      // Apply replacements in reverse order to preserve indices
      replacements.sort((a, b) => b.startIdx - a.startIdx);
      for (const r of replacements) {
        text = text.slice(0, r.startIdx) + r.newText + text.slice(r.endIdx);
      }
    }

    // Replace import
    text = text.replace(
      /import\s+\{\s*auditedProcedure\s*\}\s+from\s+"@\/server\/governance\/governed-procedure";\s*\n/,
      'import { governedProcedure } from "@/server/governance/governed-procedure";\n',
    );

    // Remove const auditedProtected/auditedAdmin definitions
    text = text.replace(
      /^const\s+audited\w+\s*=\s*auditedProcedure\([^)]+\)\s*;?\s*\n/gm,
      "",
    );

    // Replace marker
    text = text.replace(/lafusee:strangler-active/g, "lafusee:governed-active");
  }

  if (text === originalText) return { unchanged: true };

  if (DRY) {
    console.log(`[DRY] ${router} : ${mutationsCount} mutations → governedProcedure`);
  } else {
    writeFileSync(filepath, text, "utf-8");
    console.log(`✓ ${router} : ${mutationsCount} mutations migrated`);
  }
  return { ok: true, mutationsCount };
}

const files = readdirSync(ROUTERS_DIR)
  .filter((f) => f.endsWith(".ts"))
  .filter((f) => FILTER.length === 0 || FILTER.includes(basename(f, ".ts")))
  .map((f) => join(ROUTERS_DIR, f));

let totalRouters = 0;
let totalMutations = 0;
let skipped = 0;

for (const file of files) {
  const result = processRouter(file);
  if (result.skipped) {
    skipped++;
    continue;
  }
  if (result.unchanged) continue;
  totalRouters++;
  totalMutations += result.mutationsCount ?? 0;
}

console.log(`\n${DRY ? "[DRY]" : "Done"} : ${totalRouters} routers migrated, ${totalMutations} mutations, ${skipped} skipped (no strangler marker)`);
