#!/usr/bin/env node
/**
 * Codemod : remplace les hardcoded pillar enum literals par imports canoniques.
 *
 * Patterns ciblés (exact match de la règle ESLint `lafusee/no-hardcoded-pillar-enum`) :
 *   - `["A","D","V","E","R","T","I","S"]` (avec ou sans whitespace) → `PILLAR_KEYS`
 *   - `["A","D","V","E"]` → `ADVE_KEYS`
 *   - `["a","d","v","e","r","t","i","s"]` → `PILLAR_STORAGE_KEYS`
 *   - `["a","d","v","e"]` → `ADVE_STORAGE_KEYS`
 *
 * Stratégie de remplacement :
 *   - Si `as const` suit l'array → remplace toute l'expression par le named export
 *     (déjà readonly tuple).
 *   - Sinon → remplace par `[...EXPORT]` pour préserver la mutabilité d'array.
 *
 * Ajout d'import :
 *   - Si fichier importe déjà depuis `@/domain` → étend la liste named imports.
 *   - Sinon → ajoute `import { ... } from "@/domain";` après le dernier import existant.
 *
 * Exemptions :
 *   - `src/domain/**` (canon home)
 *   - `eslint-plugin-lafusee/**` (rule definition)
 *   - `tests/**` (fixtures peuvent garder hardcoded)
 *
 * Usage : `node scripts/codemod-pillar-enum.mjs [--dry-run]`
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const DRY_RUN = process.argv.includes("--dry-run");

// Patterns ESLint (literal-exact) avec mapping vers named export
const PATTERNS = [
  {
    regex: /\[\s*"A"\s*,\s*"D"\s*,\s*"V"\s*,\s*"E"\s*,\s*"R"\s*,\s*"T"\s*,\s*"I"\s*,\s*"S"\s*\]/g,
    name: "PILLAR_KEYS",
  },
  {
    regex: /\[\s*"A"\s*,\s*"D"\s*,\s*"V"\s*,\s*"E"\s*\]/g,
    name: "ADVE_KEYS",
  },
  {
    regex: /\[\s*"a"\s*,\s*"d"\s*,\s*"v"\s*,\s*"e"\s*,\s*"r"\s*,\s*"t"\s*,\s*"i"\s*,\s*"s"\s*\]/g,
    name: "PILLAR_STORAGE_KEYS",
  },
  {
    regex: /\[\s*"a"\s*,\s*"d"\s*,\s*"v"\s*,\s*"e"\s*\]/g,
    name: "ADVE_STORAGE_KEYS",
  },
];

function isExempt(filepath) {
  return (
    filepath.includes("/src/domain/") ||
    filepath.includes("/eslint-plugin-lafusee/") ||
    filepath.includes("/tests/") ||
    filepath.includes("/__tests__/") ||
    filepath.includes("/scripts/")
  );
}

// Collect lint output to find affected files
function getAffectedFiles() {
  const out = execSync("npm run lint:governance 2>&1 || true", { encoding: "utf-8" });
  const files = new Set();
  let currentFile = null;
  for (const line of out.split("\n")) {
    if (line.startsWith("/")) {
      currentFile = line.trim();
    } else if (line.includes("no-hardcoded-pillar-enum") && currentFile) {
      files.add(currentFile);
    }
  }
  return [...files].filter((f) => !isExempt(f));
}

function processFile(filepath) {
  const original = readFileSync(filepath, "utf-8");
  let modified = original;
  const usedNames = new Set();

  for (const { regex, name } of PATTERNS) {
    modified = modified.replace(regex, (match, _offset, fullStr) => {
      // Check if `as const` follows the array
      const idx = fullStr.indexOf(match, _offset);
      const after = fullStr.slice(idx + match.length).trimStart();
      const hasAsConst = after.startsWith("as const");
      usedNames.add(name);
      if (hasAsConst) {
        // Replace `[...] as const` with just NAME (already readonly tuple)
        return `${name}__AS_CONST_PLACEHOLDER__`;
      }
      return `[...${name}]`;
    });
  }

  // Now strip the `as const` after our placeholder
  modified = modified.replace(/(\w+)__AS_CONST_PLACEHOLDER__\s+as const/g, "$1");

  if (modified === original) return null;

  // Add or extend @/domain import
  const importLine = `import { ${[...usedNames].sort().join(", ")} } from "@/domain";`;
  const existingDomainImport = modified.match(/^import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+["']@\/domain["'];?\s*$/m);

  if (existingDomainImport) {
    // Extend existing import
    const existing = existingDomainImport[1].split(",").map((s) => s.trim()).filter(Boolean);
    const merged = [...new Set([...existing, ...usedNames])].sort().join(", ");
    modified = modified.replace(
      existingDomainImport[0],
      `import { ${merged} } from "@/domain";`,
    );
  } else {
    // Insert new import after the last existing import
    const lastImportMatch = modified.match(/^(import[\s\S]*?from\s+["'][^"']+["'];?\s*\n)+/);
    if (lastImportMatch) {
      const insertPos = lastImportMatch.index + lastImportMatch[0].length;
      modified = modified.slice(0, insertPos) + importLine + "\n" + modified.slice(insertPos);
    } else {
      // No imports at all — prepend
      modified = importLine + "\n\n" + modified;
    }
  }

  if (DRY_RUN) {
    console.log(`[DRY] ${filepath} : ${[...usedNames].join(", ")}`);
  } else {
    writeFileSync(filepath, modified, "utf-8");
    console.log(`✓ ${filepath} : ${[...usedNames].join(", ")}`);
  }

  return usedNames;
}

const affected = getAffectedFiles();
console.log(`Found ${affected.length} files to process${DRY_RUN ? " (DRY RUN)" : ""}\n`);

let totalChanges = 0;
for (const file of affected) {
  const result = processFile(file);
  if (result) totalChanges++;
}

console.log(`\n${DRY_RUN ? "[DRY RUN] Would modify" : "Modified"} ${totalChanges} files`);
