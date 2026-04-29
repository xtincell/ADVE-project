/**
 * scripts/engage-strangler.ts
 *
 * Sweeps all routers under src/server/trpc/routers/ and replaces the
 * "underscore-prefixed unused strangler" pattern with a real strangler
 * engagement on every mutation.
 *
 * Pattern detected (line-by-line):
 *   const _auditedProtected = auditedProcedure(protectedProcedure, "X");
 *   → const auditedProtected = auditedProcedure(protectedProcedure, "X");
 *
 * Then for each route declaration like:
 *   <key>: protectedProcedure\n
 *     [.input(...)\n]
 *     ...
 *     .mutation(...)
 * we rewrite the leading `protectedProcedure` to `auditedProtected`.
 *
 * Works for adminProcedure → auditedAdmin and operatorProcedure → auditedOperator
 * (latter only if the strangler was declared).
 *
 * Output: list of files modified + total mutations migrated.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { globSync } from "tinyglobby";

const ROOT = "src/server/trpc/routers";

const PROC_MAP = {
  protectedProcedure: "auditedProtected",
  adminProcedure: "auditedAdmin",
  operatorProcedure: "auditedOperator",
} as const;

type ProcType = keyof typeof PROC_MAP;
const PROC_TYPES = Object.keys(PROC_MAP) as ProcType[];

let totalRouters = 0;
let totalMutations = 0;
let totalRouterChanges = 0;

const files = globSync(`${ROOT}/**/*.ts`);
for (const file of files) {
  const src = readFileSync(file, "utf8");
  let out = src;

  // Step 1: detect declared strangler vars (with underscore) — make them real.
  const declaredAliases: Partial<Record<ProcType, string>> = {};
  for (const proc of PROC_TYPES) {
    const alias = PROC_MAP[proc];
    const declRe = new RegExp(
      `(?:const|let)\\s+_${alias}\\s*=\\s*auditedProcedure\\(\\s*${proc}\\s*,`,
      "g",
    );
    if (declRe.test(out)) {
      out = out.replace(
        new RegExp(`(?:const|let)\\s+_${alias}\\b`, "g"),
        `const ${alias}`,
      );
      declaredAliases[proc] = alias;
    }
  }

  if (Object.keys(declaredAliases).length === 0) continue;

  // Step 2: drop the eslint-disable + the @governed-procedure-applied marker.
  out = out.replace(
    /\s*\/\* eslint-disable @typescript-eslint\/no-unused-vars \*\/\n/g,
    "\n",
  );
  out = out.replace(/\s*\/\/ @governed-procedure-applied\n/g, "\n");

  // Step 3: walk endpoint declarations and replace base-procedure for mutations.
  // We split into route-declaration blocks separated by top-level "  <name>:" lines.
  // Simpler: regex over the full source for blocks ending in .mutation(...).
  for (const proc of PROC_TYPES) {
    const alias = declaredAliases[proc];
    if (!alias) continue;
    // Match: <name>: <proc>\n      .input(...)? <stuff> .mutation
    // Or: <name>: <proc>.mutation(
    // Use a non-greedy span up to the next ".mutation(" within reasonable scope.
    // Constraint: the span must not contain another "<proc>" or end with ":" key.
    const re = new RegExp(
      `(\\b\\w+:\\s+)${proc}(\\b)((?:(?!\\b(?:${PROC_TYPES.join("|")})\\b)[\\s\\S]){0,3000}?\\.mutation\\()`,
      "g",
    );
    const before = out;
    out = out.replace(re, (_match, prefix, _word, body) => {
      totalMutations++;
      return `${prefix}${alias}${body}`;
    });
    if (out !== before) totalRouterChanges++;
  }

  if (out !== src) {
    writeFileSync(file, out, "utf8");
    totalRouters++;
    console.log(`  modified ${file}`);
  }
}

console.log(`\n[engage-strangler] ${totalRouters} routers updated, ${totalMutations} mutations migrated.`);
