#!/usr/bin/env -S npx tsx
/**
 * scripts/audit-router-governance.ts — Router Intent governance coverage.
 *
 * ADR-0051 (anciennement ADR-0038, Phase 16-bis APOGEE anti-drift) — concrete containment for
 * the « 86% routers bypass governance » drift surfaced by the May 2026
 * APOGEE audit.
 *
 * Run: `npx tsx scripts/audit-router-governance.ts`.
 *
 * What it counts
 * --------------
 * For every file under `src/server/trpc/routers/*.ts` :
 *   - "GOVERNED" if at least one of `governedProcedure`, `auditedProcedure`,
 *     `mestor.emitIntent` is referenced.
 *   - "BYPASS" otherwise.
 *
 * Failure threshold
 * -----------------
 * The script exits non-zero when the bypass ratio EXCEEDS the canonical
 * ceiling — initially 86% (the May 2026 baseline). Subsequent migration
 * phases tighten the ceiling commit by commit. This way the count cannot
 * silently regress while the long-tail refactor is in flight.
 *
 * Output
 * ------
 * Prints a Markdown summary suitable for paste into REFONTE-PLAN.md and
 * RESIDUAL-DEBT.md, plus a per-router JSON dump on stderr for tooling.
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROUTERS_DIR = path.join(ROOT, "src", "server", "trpc", "routers");

// May 2026 baseline — adjust DOWNWARDS as routers migrate. Never up.
// `auth` is exempt by nature (pre-auth flows cannot traverse Mestor).
// Bypass = neither governedProcedure NOR auditedProcedure NOR emitIntent call.
const BYPASS_CEILING = 0.86;

// Vraie gouvernance — `governedProcedure` ou appel à `mestor.emitIntent`.
const STRICT_GOVERNED_MARKERS = [
  /\bgovernedProcedure\s*\(/,
  /\bmestor\.emitIntent\s*\(/,
  /(?<![A-Za-z0-9_])emitIntent\s*\(/,
];

// Strangler middleware — observabilité audit row mais ne traverse pas Mestor.
// Compté comme « contenu » (audit trail existe) mais distinct des routers
// qui passent par `mestor.emitIntent` ou `governedProcedure` directement.
const AUDITED_MARKER = /\bauditedProcedure\s*\(/;

type RouterClass = "GOVERNED" | "AUDITED" | "BYPASS";

interface RouterStatus {
  file: string;
  cls: RouterClass;
}

async function listRouters(): Promise<string[]> {
  const entries = await fs.readdir(ROUTERS_DIR);
  return entries
    .filter((f) => f.endsWith(".ts") && !f.startsWith("_") && f !== "router.ts")
    .map((f) => path.join(ROUTERS_DIR, f));
}

async function classify(file: string): Promise<RouterStatus> {
  const src = await fs.readFile(file, "utf8");
  if (STRICT_GOVERNED_MARKERS.some((m) => m.test(src))) {
    return { file, cls: "GOVERNED" };
  }
  if (AUDITED_MARKER.test(src)) {
    return { file, cls: "AUDITED" };
  }
  return { file, cls: "BYPASS" };
}

function basenames(statuses: RouterStatus[], cls: RouterClass): string[] {
  return statuses
    .filter((s) => s.cls === cls)
    .map((s) => path.basename(s.file, ".ts"))
    .sort();
}

async function main(): Promise<void> {
  const routers = await listRouters();
  const statuses = await Promise.all(routers.map((r) => classify(r)));
  const total = statuses.length;
  const governed = statuses.filter((s) => s.cls === "GOVERNED").length;
  const audited = statuses.filter((s) => s.cls === "AUDITED").length;
  const bypass = statuses.filter((s) => s.cls === "BYPASS").length;
  const bypassRatio = total === 0 ? 0 : bypass / total;

  const md = [
    "# Router Governance Coverage (ADR-0051 — anciennement ADR-0038)",
    "",
    `- **Total routers**: ${total}`,
    `- **GOVERNED** (governedProcedure / mestor.emitIntent): ${governed} (${((governed / total) * 100).toFixed(1)}%)`,
    `- **AUDITED** (strangler auditedProcedure only — observability, not governance): ${audited} (${((audited / total) * 100).toFixed(1)}%)`,
    `- **BYPASS**: ${bypass} (${(bypassRatio * 100).toFixed(1)}%)`,
    `- **Ceiling (May 2026 baseline)**: ${(BYPASS_CEILING * 100).toFixed(1)}%`,
    "",
    "## GOVERNED routers",
    "",
    basenames(statuses, "GOVERNED").map((n) => `- ${n}`).join("\n"),
    "",
    "## AUDITED-ONLY routers (containment middleware — migrate to governedProcedure)",
    "",
    basenames(statuses, "AUDITED").map((n) => `- ${n}`).join("\n"),
    "",
    "## BYPASS routers (long-tail refactor target — Phase 0 du REFONTE-PLAN)",
    "",
    basenames(statuses, "BYPASS").map((n) => `- ${n}`).join("\n"),
    "",
  ].join("\n");

  process.stdout.write(md);
  process.stderr.write(JSON.stringify(statuses, null, 2) + "\n");

  if (bypassRatio > BYPASS_CEILING) {
    process.stderr.write(
      `\n[FAIL] Bypass ratio ${(bypassRatio * 100).toFixed(1)}% exceeds ceiling ${(BYPASS_CEILING * 100).toFixed(1)}%. Tighten the ceiling or migrate a router.\n`,
    );
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`[fatal] ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(2);
});
