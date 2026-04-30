/**
 * One-shot patcher : migre `new PrismaClient()` → `new PrismaClient({ adapter })`
 * pour tous les seeds + scripts CLI qui instancient un client Prisma directement.
 *
 * Idempotent : skip les fichiers qui passent déjà un adapter.
 *
 * Phase 12.2 (Prisma 6 → 7). Run : `npx tsx scripts/migrate-prisma-7-clients.ts`.
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";

const ADAPTER_IMPORT = `import { PrismaPg } from "@prisma/adapter-pg";`;
const ADAPTER_INSTANCE_BLOCK = `
function makeClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set — Prisma 7 driver adapter requires it.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
`;

function patchFile(file: string): "patched" | "skipped" | "no-match" {
  const content = readFileSync(file, "utf-8");

  // Already patched ?
  if (content.includes("PrismaPg") || content.includes("adapter:")) {
    return "skipped";
  }

  // Find `new PrismaClient(` (with no args or empty args).
  if (!/new\s+PrismaClient\s*\(\s*\)/.test(content)) {
    return "no-match";
  }

  let patched = content;

  // 1. Inject adapter import after the PrismaClient import line.
  patched = patched.replace(
    /(import\s+\{[^}]*PrismaClient[^}]*\}\s+from\s+["']@prisma\/client["'];?)/,
    `$1\n${ADAPTER_IMPORT}`,
  );

  // 2. Inject the makeClient factory after the imports.
  // We find the last import line and inject after it.
  const importLines = patched.split("\n");
  let lastImportIdx = -1;
  for (let i = 0; i < importLines.length; i++) {
    if (/^import\s/.test(importLines[i] ?? "")) lastImportIdx = i;
  }
  if (lastImportIdx >= 0) {
    importLines.splice(lastImportIdx + 1, 0, ADAPTER_INSTANCE_BLOCK);
    patched = importLines.join("\n");
  }

  // 3. Replace `new PrismaClient()` with `makeClient()`.
  patched = patched.replace(/new\s+PrismaClient\s*\(\s*\)/g, "makeClient()");

  writeFileSync(file, patched);
  return "patched";
}

function main() {
  // Find all .ts files containing `new PrismaClient(`.
  const cmd = `grep -rlE "new PrismaClient\\(" --include="*.ts" prisma/ scripts/ src/ 2>/dev/null || true`;
  const files = execSync(cmd, { encoding: "utf-8" })
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    // Skip src/lib/db.ts — already migrated manually with custom logic.
    .filter((f) => !f.endsWith("src/lib/db.ts"))
    // Skip this script itself.
    .filter((f) => !f.endsWith("scripts/migrate-prisma-7-clients.ts"));

  let patched = 0;
  let skipped = 0;
  let noMatch = 0;
  for (const f of files) {
    const result = patchFile(f);
    if (result === "patched") {
      patched++;
      console.log(`  ✓ ${f}`);
    } else if (result === "skipped") {
      skipped++;
    } else {
      noMatch++;
      console.log(`  ! no-match ${f}`);
    }
  }
  console.log(`[migrate-prisma-7-clients] patched=${patched} skipped=${skipped} no-match=${noMatch} total=${files.length}`);
}

main();
