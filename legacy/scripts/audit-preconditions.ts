/**
 * scripts/audit-preconditions.ts — Sweep audit for missing readiness
 * gates on capabilities that mutate state derived from pillars.
 *
 * Run: `npx tsx scripts/audit-preconditions.ts`.
 *
 * What it checks
 * --------------
 * For every manifest under src/server/services/<slug>/manifest.ts, the
 * audit emits a finding when:
 *
 *   - the capability declares `LLM_CALL` or `DB_WRITE` side-effects
 *   - the capability input schema includes `strategyId`
 *   - AND `preconditions` is missing or empty
 *
 * That combination is the danger zone identified after the
 * "enrich-oracle no-guard" bug: the capability mutates state derived
 * from pillars without checking if the pillars are in a valid state.
 *
 * Findings are warnings until each is either:
 *   (a) given an explicit `preconditions: [...]` array, or
 *   (b) explicitly opted-out via a comment marker
 *       `// readiness-opt-out: <reason>` immediately above the capability.
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVICES = path.join(ROOT, "src", "server", "services");

interface Finding {
  service: string;
  capability: string;
  reason: string;
  manifestPath: string;
  optOut: boolean;
}

const findings: Finding[] = [];

async function* walkManifests(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (/\s\d+$/.test(e.name)) continue;
    const sub = path.join(dir, e.name);
    const manifestPath = path.join(sub, "manifest.ts");
    try {
      await fs.access(manifestPath);
      yield manifestPath;
    } catch {
      // Recurse one level for nested services.
      yield* walkManifests(sub);
    }
  }
}

function extractCapabilities(src: string): {
  service: string;
  capabilities: { name: string; body: string; lineNo: number; optOut: boolean }[];
} {
  const serviceMatch = src.match(/service:\s*"([a-z0-9_-]+)"/);
  const service = serviceMatch?.[1] ?? "(unknown)";

  const capabilities: { name: string; body: string; lineNo: number; optOut: boolean }[] = [];
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = (lines[i] ?? "").match(/^\s*\{?\s*name:\s*"([a-zA-Z0-9_]+)"\s*,?\s*$/);
    if (!m) continue;
    // Capture surrounding {} block.
    let depth = 0;
    let start = -1;
    for (let j = i; j >= 0; j--) {
      if ((lines[j] ?? "").includes("{")) {
        start = j;
        break;
      }
    }
    let end = -1;
    for (let j = i; j < lines.length; j++) {
      const ln = lines[j] ?? "";
      for (const c of ln) {
        if (c === "{") depth++;
        if (c === "}") depth--;
        if (depth === 0) {
          end = j;
          break;
        }
      }
      if (end >= 0) break;
    }
    if (start < 0 || end < 0) continue;
    const body = lines.slice(start, end + 1).join("\n");

    // Check if the immediately preceding non-blank line carries the
    // opt-out marker.
    let optOut = false;
    for (let j = start - 1; j >= 0; j--) {
      const t = (lines[j] ?? "").trim();
      if (t === "") continue;
      if (t.startsWith("// readiness-opt-out")) optOut = true;
      break;
    }
    capabilities.push({ name: m[1]!, body, lineNo: i + 1, optOut });
  }
  return { service, capabilities };
}

async function main() {
  for await (const manifestPath of walkManifests(SERVICES)) {
    const src = await fs.readFile(manifestPath, "utf8");
    const { service, capabilities } = extractCapabilities(src);
    for (const cap of capabilities) {
      const hasStrategyId = /strategyId\s*:\s*z\.string/.test(cap.body);
      const sideEffects = cap.body.match(/sideEffects:\s*\[([^\]]*)\]/);
      const sideEffectStr = sideEffects?.[1] ?? "";
      const mutates = /LLM_CALL|DB_WRITE|FILE_WRITE/.test(sideEffectStr);
      const hasPreconditions = /preconditions:\s*\[\s*"/.test(cap.body);

      if (hasStrategyId && mutates && !hasPreconditions && !cap.optOut) {
        findings.push({
          service,
          capability: cap.name,
          reason:
            "mutates state with strategyId in input but declares no readiness preconditions",
          manifestPath: path.relative(ROOT, manifestPath),
          optOut: false,
        });
      }
    }
  }

  if (findings.length === 0) {
    console.log("✓ Pre-conditions audit clean.");
    return;
  }

  console.log(
    `[warn] ${findings.length} capability(ies) missing readiness preconditions:\n`,
  );
  const groups = new Map<string, Finding[]>();
  for (const f of findings) {
    const arr = groups.get(f.service) ?? [];
    arr.push(f);
    groups.set(f.service, arr);
  }
  for (const [service, arr] of [...groups.entries()].sort()) {
    console.log(`  ${service}:`);
    for (const f of arr) {
      console.log(`    - ${f.capability} — ${f.reason}`);
      console.log(`      ${f.manifestPath}`);
    }
  }
  console.log(
    "\nResolve by either declaring `preconditions: [...]` on the capability,",
  );
  console.log(
    "or opting out explicitly with `// readiness-opt-out: <reason>`.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
