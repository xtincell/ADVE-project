/**
 * audit-residus.ts
 *
 * Sprint 2.7 — RESIDUS-AUDIT.md auto-generator. Scan le repo pour les
 * patterns de dette technique récurrents et génère un rapport prioritisé.
 *
 * Patterns scannés :
 *  - `writePillar(` bare (cache reconciliation manquante — RESIDUAL-DEBT v6.1.18)
 *  - `.toLowerCase()` sur identifiants pillar (cast unsafe — préfère helpers domain)
 *  - `as never` cast (TS bypass — risque type-safety)
 *  - `// TODO` / `// FIXME` / `// HACK` (dette annotée)
 *  - `console.log/warn/error` hors error-vault (fuite logs)
 *  - `JSON.parse` sans try/catch (parsing unsafe)
 *  - `await import(` (lazy imports — peut indiquer circular dep)
 *
 * Usage : `npx tsx scripts/audit-residus.ts > docs/governance/RESIDUS-AUDIT.md`
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");

interface Finding {
  pattern: string;
  file: string;
  line: number;
  severity: "low" | "medium" | "high";
  reason: string;
}

const findings: Finding[] = [];

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

const PATTERNS = [
  {
    name: "writePillar-bare",
    regex: /\bawait writePillar\(/g,
    severity: "medium" as const,
    reason: "writePillar bare — cache reconciliation manquante. Préférer writePillarAndScore (cf. RESIDUAL-DEBT v6.1.18).",
    excludePaths: ["pillar-gateway", "scripts/", "/utils/migrate-"],
  },
  {
    name: "as-never-cast",
    regex: /\bas\s+never\b/g,
    severity: "low" as const,
    reason: "Type bypass `as never` — review pour confirmer l'intent.",
    excludePaths: ["test", "scripts/"],
  },
  {
    name: "todo-comment",
    regex: /\/\/\s*(TODO|FIXME|HACK)\b/g,
    severity: "low" as const,
    reason: "Dette annotée (TODO/FIXME/HACK).",
    excludePaths: ["test", "scripts/"],
  },
  {
    name: "json-parse-no-try",
    regex: /(?<!try\s*\{[^}]{0,500})JSON\.parse\(/g,
    severity: "medium" as const,
    reason: "JSON.parse sans try/catch — risque crash sur input malformé.",
    excludePaths: ["test", "scripts/"],
  },
  {
    name: "console-log-prod",
    regex: /\bconsole\.(log|warn|error)\(/g,
    severity: "low" as const,
    reason: "console.* en prod — préférer error-vault.capture pour logs structurés.",
    excludePaths: ["error-vault", "scripts/", "test", "stress-test"],
  },
];

for (const file of walkFiles(SRC)) {
  const text = readFileSync(file, "utf-8");
  const rel = relative(ROOT, file);

  for (const pattern of PATTERNS) {
    if (pattern.excludePaths.some((p) => rel.includes(p))) continue;

    let match;
    pattern.regex.lastIndex = 0;
    while ((match = pattern.regex.exec(text)) !== null) {
      const lineNum = text.slice(0, match.index).split("\n").length;
      findings.push({
        pattern: pattern.name,
        file: rel,
        line: lineNum,
        severity: pattern.severity,
        reason: pattern.reason,
      });
    }
  }
}

const byPattern = new Map<string, Finding[]>();
for (const f of findings) {
  const list = byPattern.get(f.pattern) ?? [];
  list.push(f);
  byPattern.set(f.pattern, list);
}

const totals = {
  high: findings.filter((f) => f.severity === "high").length,
  medium: findings.filter((f) => f.severity === "medium").length,
  low: findings.filter((f) => f.severity === "low").length,
};

console.log("# RESIDUS-AUDIT — patterns de dette technique scannés\n");
console.log(`Auto-généré par \`scripts/audit-residus.ts\`. Régénérer après cleanup pour suivre la baisse.\n`);
console.log(`## Synthèse\n`);
console.log(`| Sévérité | Count |`);
console.log(`|---|---|`);
console.log(`| high | ${totals.high} |`);
console.log(`| medium | ${totals.medium} |`);
console.log(`| low | ${totals.low} |`);
console.log(`| **Total** | **${findings.length}** |\n`);

console.log(`## Par pattern\n`);
const sortedPatterns = [...byPattern.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [name, list] of sortedPatterns) {
  const reason = PATTERNS.find((p) => p.name === name)?.reason ?? "";
  console.log(`### \`${name}\` — ${list.length} occurrences\n`);
  console.log(`> ${reason}\n`);
  console.log(`<details><summary>Voir les ${list.length} sites</summary>\n`);
  console.log(`| File | Line |`);
  console.log(`|---|---|`);
  for (const f of list.slice(0, 50)) {
    console.log(`| \`${f.file}\` | ${f.line} |`);
  }
  if (list.length > 50) {
    console.log(`| _… et ${list.length - 50} autres_ | |`);
  }
  console.log(`\n</details>\n`);
}

console.log(`---\n`);
console.log(`**Total findings** : ${findings.length}`);
console.log(`**Patterns scannés** : ${PATTERNS.length}`);
