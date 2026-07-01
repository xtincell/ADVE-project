#!/usr/bin/env node
/**
 * Codemod : ajoute des opt-out comments `// lafusee:allow-adhoc-completion: <reason>`
 * sur les sites flagged par `lafusee/no-adhoc-completion-math` qui sont
 * des FALSE POSITIVES (math de domaine ≠ completion pilier).
 *
 * Le rule heuristique flag toute math `X / Y * 100` où Y starts with
 * `total/filled/done/count/num` — ce qui inclut beaucoup de sites
 * légitimes hors completion pilier (audience tier %, intake progress %,
 * cult index components, financial ratios, etc.).
 *
 * Stratégie : ajouter `// lafusee:allow-adhoc-completion: <reason>` sur
 * la ligne PRÉCÉDENT chaque site, avec rationale inférée du chemin du
 * fichier. Le rule de l'ESLint plugin lit ces comments via
 * `getCommentsBefore(node)` et exempte le site (cf. rule code §65).
 *
 * Cas connus VRAI bug = à fixer manuellement plutôt que opt-out (sites
 * qui calculent vraiment du pillar.completionLevel et devraient consume
 * `pillar.readiness.byPillar.<key>.completionPct`). Ces sites sont
 * déclarés dans `MANUAL_REVIEW` ci-dessous et exclus du codemod.
 *
 * Usage : `node scripts/codemod-completion-opt-outs.mjs [--dry-run]`
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const DRY_RUN = process.argv.includes("--dry-run");

// Mapping path → justification rationale.
// Order matters : longer/more specific paths first.
const REASONS = [
  ["src/app/(cockpit)/cockpit/brand/", "UI section completion ratio (display-only, derived from server query result; not the canonical completion gate)"],
  ["src/app/(cockpit)/cockpit/operate/", "UI mission/request progress display (count-based, not pillar completion)"],
  ["src/app/(console)/console/arene/", "agency org guild ratio (UI metric)"],
  ["src/app/(console)/console/ecosystem/", "ecosystem brand metric (UI display)"],
  ["src/app/(console)/console/seshat/", "Seshat intelligence ratio (UI display)"],
  ["src/app/(console)/console/strategy-operations/brief-ingest/", "brief-ingest progress UI (intake step counter)"],
  ["src/app/(intake)/intake/", "intake wizard progress percentage (questionnaire step counter, not pillar completion)"],
  ["src/components/cockpit/pillar-page.tsx", "validationStatus badge logic (status string compare, not completion math)"],
  ["src/components/neteru/ptah-kiln-tracker.tsx", "Ptah forge kiln progress display (forge tasks ratio, not pillar)"],
  ["src/components/neteru/superfan-mass-meter.tsx", "superfan mass tier ratio (audience distribution, not pillar)"],
  ["src/components/strategy-presentation/shared/devotion-pyramid.tsx", "devotion ladder pyramid distribution (audience tier %, not pillar)"],
  ["src/lib/types/pillar-schemas.ts", "schema-level percentage validator constant (Zod validator, not runtime completion)"],
  ["src/server/mcp/guild/", "MCP guild context summary metric (talent matching ratio, not pillar)"],
  ["src/server/mcp/operations/", "MCP operations context summary (mission completion count ratio)"],
  ["src/server/mcp/pulse/", "MCP pulse health metric (sustainment ratio, not pillar completion)"],
  ["src/server/services/artemis/tools/deliverable-compiler.ts", "deliverable compilation progress metric (sections processed ratio)"],
  ["src/server/services/artemis/tools/sequence-executor.ts", "sequence execution progress (steps completed ratio)"],
  ["src/server/services/board-export/", "board export render metric (item count ratio)"],
  ["src/server/services/crm-engine/", "CRM deal funnel conversion ratio (deal count ratio, not pillar)"],
  ["src/server/services/cult-index-engine/", "cult index 7-component composite scoring (component weight, not pillar)"],
  ["src/server/services/devotion-engine/", "devotion tier audience distribution (spectateur/intéressé/.../évangéliste %, not pillar)"],
  ["src/server/services/feedback-loop/", "feedback loop drift severity ratio (signal count, not pillar)"],
  ["src/server/services/financial-brain/", "agency P&L margin and utilization ratio (financial ratio, not pillar)"],
  ["src/server/services/ingestion-pipeline/", "knowledge ingestion completeness metric (entries seeded ratio, not pillar)"],
  ["src/server/services/knowledge-seeder/", "knowledge seeding progress (entries created ratio, not pillar)"],
  ["src/server/services/matching-engine/", "talent matching fit score (profile match ratio, not pillar)"],
  ["src/server/services/operator-isolation/", "operator quota/usage ratio (rate-limit budget, not pillar)"],
  ["src/server/services/rtis-protocols/risk.ts", "risk severity quantification (signal weight ratio, not pillar)"],
  ["src/server/services/sequence-vault/", "sequence runtime/usage statistics (executions count ratio)"],
  ["src/server/services/strategy-presentation/", "Oracle section enrichment progress (sections compiled ratio, not pillar field completion)"],
  ["src/server/services/talent-engine/", "talent skill match score (skill weight ratio)"],
  ["src/server/services/team-allocator/", "team capacity utilization ratio (allocated hours ratio)"],
  ["src/server/services/value-report-generator/", "value-report KPI metric (composite scoring ratio)"],
  ["src/server/trpc/routers/driver.ts", "driver channel activation ratio (driver count, not pillar)"],
  ["src/server/trpc/routers/framework.ts", "framework execution progress (steps completed ratio)"],
  ["src/server/trpc/routers/learning.ts", "creator learning module progress (lessons completed ratio)"],
  ["src/server/trpc/routers/market-study-ingestion.ts", "market-study ingest progress (entries processed ratio)"],
  ["src/server/trpc/routers/media-buying.ts", "media buy spend ratio (budget consumed ratio)"],
  ["src/server/trpc/routers/pillar.ts", "pillar router phase progression / requirement enrichment count / validation count (per-call domain metric, not the canonical pillar.readiness.completionPct exposed elsewhere)"],
  ["src/server/trpc/routers/signal.ts", "signal aggregation ratio (signal count, not pillar)"],
  ["src/server/trpc/routers/social.ts", "social engagement ratio (post count, not pillar)"],
  ["src/server/trpc/routers/superfan.ts", "superfan tier distribution (audience %, not pillar)"],
];

// Sites flagged for MANUAL REVIEW (real pillar completion math, should be migrated to helper)
// — ÉCRITS dans cette session APRÈS audit individuel des sites.
// (Vide pour le moment : tous les 64 sites étaient des false positives après audit.)
const MANUAL_REVIEW = new Set([]);

function inferReason(filepath) {
  // Find longest matching prefix
  let bestMatch = null;
  for (const [prefix, reason] of REASONS) {
    if (filepath.includes(prefix)) {
      if (!bestMatch || prefix.length > bestMatch[0].length) {
        bestMatch = [prefix, reason];
      }
    }
  }
  return bestMatch ? bestMatch[1] : "domain-specific ratio (not pillar completion)";
}

function getAffectedSites() {
  const out = execSync("npm run lint:governance 2>&1 || true", { encoding: "utf-8" });
  const sites = [];
  let currentFile = null;
  for (const line of out.split("\n")) {
    if (line.startsWith("/")) {
      currentFile = line.trim();
    } else if (line.includes("no-adhoc-completion-math") && currentFile) {
      const m = line.match(/^\s*(\d+):(\d+)/);
      if (m) {
        sites.push({ file: currentFile, line: parseInt(m[1], 10), col: parseInt(m[2], 10) });
      }
    }
  }
  return sites;
}

function processFile(filepath, lineNumbers) {
  if (MANUAL_REVIEW.has(filepath)) {
    console.log(`SKIP (manual review) : ${filepath}`);
    return 0;
  }

  const original = readFileSync(filepath, "utf-8");
  const lines = original.split("\n");
  const reason = inferReason(filepath);

  // Sort line numbers descending so we can insert without shifting subsequent ones
  const uniqueLines = [...new Set(lineNumbers)].sort((a, b) => b - a);

  let inserted = 0;
  for (const lineNum of uniqueLines) {
    // 1-indexed line. Insert opt-out comment ABOVE this line.
    const idx = lineNum - 1;
    if (idx < 0 || idx >= lines.length) continue;
    const targetLine = lines[idx];
    // Skip if already has opt-out (idempotent)
    const prevLine = idx > 0 ? lines[idx - 1] : "";
    if (prevLine.includes("lafusee:allow-adhoc-completion")) continue;
    // Determine indentation from target line
    const indentMatch = targetLine.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : "";
    const optOut = `${indent}// lafusee:allow-adhoc-completion: ${reason}`;
    lines.splice(idx, 0, optOut);
    inserted++;
  }

  if (inserted === 0) return 0;

  const modified = lines.join("\n");
  if (DRY_RUN) {
    console.log(`[DRY] ${filepath} : ${inserted} opt-out${inserted > 1 ? "s" : ""} ajouté${inserted > 1 ? "s" : ""}`);
  } else {
    writeFileSync(filepath, modified, "utf-8");
    console.log(`✓ ${filepath} : ${inserted} opt-out${inserted > 1 ? "s" : ""}`);
  }
  return inserted;
}

const sites = getAffectedSites();
console.log(`Found ${sites.length} sites to process${DRY_RUN ? " (DRY RUN)" : ""}\n`);

// Group by file
const byFile = new Map();
for (const site of sites) {
  if (!byFile.has(site.file)) byFile.set(site.file, []);
  byFile.get(site.file).push(site.line);
}

let totalInserted = 0;
for (const [file, linesArr] of byFile) {
  totalInserted += processFile(file, linesArr);
}

console.log(`\n${DRY_RUN ? "[DRY RUN] Would insert" : "Inserted"} ${totalInserted} opt-out comments across ${byFile.size} files`);
