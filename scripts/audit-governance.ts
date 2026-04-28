/**
 * scripts/audit-governance.ts — REFONTE Phase 0 governance auditor.
 *
 * Run: `npm run audit:governance` (or via CI in `governance-audit` job).
 *
 * What it audits (in order of severity):
 *   1. Routers under src/server/trpc/routers/ that import services outside
 *      the Mestor whitelist (mirrors the eslint rule, double-check).
 *   2. Hardcoded ADVE/RTIS pillar literals outside src/domain/.
 *   3. Numbered duplicate folders (`* 2/`, `* 3/`).
 *   4. Lazy `await import("@/server/services/...")` in routers.
 *   5. Manifests missing for services discovered under src/server/services/.
 *
 * Exit code:
 *   - 0 if all checks at the configured severity pass.
 *   - 1 otherwise.
 *
 * Severity escalation roadmap (per REFONTE-PLAN.md):
 *   - Phase 0–1: warns are reported, fail only on 'numbered-duplicates'
 *                and 'unsupported-cycle'.
 *   - End Phase 1: 'hardcoded-pillar-enum' becomes fatal.
 *   - End Phase 3: 'router-bypass' and 'lazy-router-import' become fatal.
 *   - End Phase 4: cycles detected via madge become fatal at CI level.
 *
 * The script does not depend on @typescript-eslint to keep CI cold-start
 * cheap. It uses simple regex/text scans — sufficient for the patterns we
 * care about.
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");

const WHITELIST = new Set([
  "mestor",
  "pillar-gateway",
  "audit-trail",
  "operator-isolation",
  "neteru-shared",
]);

type Severity = "warn" | "error";
type Finding = {
  rule: string;
  severity: Severity;
  file: string;
  line?: number;
  message: string;
};

const findings: Finding[] = [];

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      yield* walk(full);
    } else if (
      e.isFile() &&
      (e.name.endsWith(".ts") || e.name.endsWith(".tsx"))
    ) {
      yield full;
    }
  }
}

function relativeToRoot(p: string): string {
  return path.relative(ROOT, p);
}

async function auditFile(file: string, content: string) {
  const isRouter = file.includes(path.join("server", "trpc", "routers"));
  const isDomain = file.includes(path.join("src", "domain"));

  // (1) router-bypass + (4) lazy-router-import
  if (isRouter) {
    const importRe =
      /(?:from\s+|import\(\s*)["'](?:@\/server\/services\/|.*\/server\/services\/)([^"'/]+)/g;
    let m: RegExpExecArray | null;
    while ((m = importRe.exec(content)) !== null) {
      const service = m[1];
      if (!service) continue;
      if (WHITELIST.has(service)) continue;
      const before = content.slice(0, m.index);
      const line = before.split("\n").length;
      const isLazy = m[0].startsWith("import(");
      findings.push({
        rule: isLazy ? "lazy-router-import" : "router-bypass",
        severity: "warn",
        file: relativeToRoot(file),
        line,
        message: `router imports service '${service}' (whitelist: ${[...WHITELIST].join(", ")})`,
      });
    }
  }

  // (2) hardcoded-pillar-enum
  if (!isDomain) {
    const pillarRe =
      /\[\s*["'](?:A|a)["']\s*,\s*["'](?:D|d)["']\s*,\s*["'](?:V|v)["']\s*,\s*["'](?:E|e)["'](?:\s*,\s*["'](?:R|r)["']\s*,\s*["'](?:T|t)["']\s*,\s*["'](?:I|i)["']\s*,\s*["'](?:S|s)["'])?\s*\]/g;
    let m: RegExpExecArray | null;
    while ((m = pillarRe.exec(content)) !== null) {
      const before = content.slice(0, m.index);
      const line = before.split("\n").length;
      findings.push({
        rule: "hardcoded-pillar-enum",
        severity: "warn",
        file: relativeToRoot(file),
        line,
        message: `hardcoded pillar enum literal — import from '@/domain' instead`,
      });
    }
  }
}

async function auditNumberedDuplicates() {
  async function scan(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (e.name === "node_modules" || e.name === ".next") continue;
      const full = path.join(dir, e.name);
      if (/\s\d+$/.test(e.name)) {
        findings.push({
          rule: "numbered-duplicate-folder",
          severity: "error",
          file: relativeToRoot(full),
          message: `numbered-duplicate folder '${e.name}' — delete or rename`,
        });
      }
      await scan(full);
    }
  }
  await scan(SRC);
}

async function auditServiceManifests() {
  const servicesDir = path.join(SRC, "server", "services");
  let entries;
  try {
    entries = await fs.readdir(servicesDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const manifestPath = path.join(servicesDir, e.name, "manifest.ts");
    try {
      await fs.access(manifestPath);
    } catch {
      findings.push({
        rule: "missing-manifest",
        severity: "warn",
        file: relativeToRoot(path.join(servicesDir, e.name)),
        message: `service '${e.name}' has no manifest.ts (Phase 2)`,
      });
    }
  }
}

async function main() {
  for await (const file of walk(SRC)) {
    const content = await fs.readFile(file, "utf8");
    await auditFile(file, content);
  }
  await auditNumberedDuplicates();
  await auditServiceManifests();

  const errors = findings.filter((f) => f.severity === "error");
  const warns = findings.filter((f) => f.severity === "warn");

  // Report.
  const groups = new Map<string, Finding[]>();
  for (const f of findings) {
    const arr = groups.get(f.rule) ?? [];
    arr.push(f);
    groups.set(f.rule, arr);
  }
  const sortedRules = [...groups.keys()].sort();
  for (const rule of sortedRules) {
    const arr = groups.get(rule)!;
    console.log(`\n[${arr[0]!.severity.toUpperCase()}] ${rule} — ${arr.length} finding(s)`);
    for (const f of arr.slice(0, 50)) {
      const loc = f.line ? `:${f.line}` : "";
      console.log(`  ${f.file}${loc} — ${f.message}`);
    }
    if (arr.length > 50) console.log(`  … and ${arr.length - 50} more`);
  }

  console.log(
    `\nSummary: ${errors.length} error(s), ${warns.length} warn(s) across ${groups.size} rule(s).`,
  );

  if (errors.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
