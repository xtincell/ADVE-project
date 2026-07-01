#!/usr/bin/env tsx
/**
 * audit-mission-drift.ts
 *
 * Verify that every manifest declares its `missionContribution`. Run in CI;
 * fails if any capability ships without a documented link to the canonical
 * mission of La Fusée (cf. docs/governance/MISSION.md §4).
 *
 * Usage:
 *   tsx scripts/audit-mission-drift.ts                  # report only
 *   tsx scripts/audit-mission-drift.ts --fail-on-violation  # exit 1 if drift
 */

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

interface Violation {
  service: string;
  capability: string;
  reason: string;
}

const ROOT = join(process.cwd(), "src/server/services");
const violations: Violation[] = [];
let manifestsScanned = 0;
let capabilitiesScanned = 0;

function scanService(serviceDir: string): void {
  const manifestPath = join(serviceDir, "manifest.ts");
  let stat;
  try {
    stat = statSync(manifestPath);
  } catch {
    return; // no manifest yet (Phase 2 progress tolerated)
  }
  if (!stat.isFile()) return;

  manifestsScanned++;

  // Read source — we don't import (cycle risk + zod side-effects); we
  // pattern-match the source for the declarations we need.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const src: string = require("node:fs").readFileSync(manifestPath, "utf8");

  // Service-level missionContribution (top of manifest).
  const hasManifestMC = /missionContribution\s*:/.test(src);

  // Capabilities entries — each block surrounded by `name:`.
  const capabilityBlocks = src.split(/\bname:\s*["']/g).slice(1);
  for (const block of capabilityBlocks) {
    capabilitiesScanned++;
    const capName = block.split(/["']/)[0]?.slice(0, 80) ?? "?";
    const hasCapMC = /missionContribution\s*:/.test(block.split(/^\s*\}/m)[0] ?? block);
    if (!hasManifestMC && !hasCapMC) {
      violations.push({
        service: serviceDir.replace(ROOT + "/", ""),
        capability: capName,
        reason: "no missionContribution declared (manifest or capability)",
      });
    }
    // GROUND_INFRASTRUCTURE without justification.
    if (/GROUND_INFRASTRUCTURE/.test(block) && !/groundJustification\s*:/.test(block)) {
      violations.push({
        service: serviceDir.replace(ROOT + "/", ""),
        capability: capName,
        reason: "GROUND_INFRASTRUCTURE without groundJustification",
      });
    }
  }
}

function main(): void {
  const services = readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(ROOT, d.name));

  for (const dir of services) scanService(dir);

  console.log(`\n[audit-mission-drift] scanned ${manifestsScanned} manifests, ${capabilitiesScanned} capabilities.`);
  if (violations.length === 0) {
    console.log("✓ no drift detected — every capability has a mission contribution declared.\n");
    process.exit(0);
  }

  console.log(`\n✗ ${violations.length} drift(s) detected:\n`);
  for (const v of violations) {
    console.log(`  [${v.service}] ${v.capability} — ${v.reason}`);
  }

  if (process.argv.includes("--fail-on-violation")) {
    console.log("\nCI failure mode active — exiting 1.\n");
    process.exit(1);
  }
  console.log("\n(report only — pass --fail-on-violation to fail CI)\n");
}

main();
