/**
 * audit-neteru-narrative.ts
 *
 * Cron CI — flagge les occurrences interdites ("trio", "Trio Divin",
 * "trois Neteru") hors archives + ADRs historiques.
 *
 * Exit code != 0 si finding détecté.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..");

const PROHIBITED_PATTERNS = [
  { pattern: /\bTrio Divin\b/, label: "Trio Divin" },
  { pattern: /\bquartet Neteru\b/i, label: "quartet Neteru" },
  { pattern: /\btrois Neteru\b/i, label: "trois Neteru" },
];

const SCAN_GLOBS = [
  "docs/governance",
  "src/server",
  "src/components",
  "src/app",
  "src/domain",
  "src/lib",
  "CLAUDE.md",
  "README.md",
];

const EXCLUDE_PATHS = [
  "docs/governance/archive",
  "docs/governance/adr/0001-",
  "docs/governance/PANTHEON.md", // contient méta-référence intentionnelle
];

interface Finding {
  file: string;
  line: number;
  match: string;
  pattern: string;
}

function walkDir(dir: string, files: string[] = []): string[] {
  if (!statSafe(dir)) return files;
  const stat = statSync(dir);
  if (stat.isFile()) {
    files.push(dir);
    return files;
  }
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) walkDir(full, files);
    else if (entry.endsWith(".md") || entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

function statSafe(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

function isExcluded(file: string): boolean {
  return EXCLUDE_PATHS.some((ex) => file.includes(ex));
}

function scanFile(file: string): Finding[] {
  const findings: Finding[] = [];
  const content = readFileSync(file, "utf-8");
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    for (const { pattern, label } of PROHIBITED_PATTERNS) {
      const m = line.match(pattern);
      if (m) {
        findings.push({
          file: relative(ROOT, file),
          line: i + 1,
          match: m[0],
          pattern: label,
        });
      }
    }
  }
  return findings;
}

function main() {
  const allFiles: string[] = [];
  for (const glob of SCAN_GLOBS) {
    walkDir(join(ROOT, glob), allFiles);
  }

  const findings: Finding[] = [];
  for (const f of allFiles) {
    if (isExcluded(f)) continue;
    findings.push(...scanFile(f));
  }

  if (findings.length === 0) {
    console.log("✓ audit-neteru-narrative: 0 finding");
    process.exit(0);
  }

  console.error(`✗ audit-neteru-narrative: ${findings.length} finding(s)`);
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line} — ${f.pattern} ("${f.match}")`);
  }
  process.exit(1);
}

main();
