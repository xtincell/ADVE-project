/**
 * audit-strangler-routers.ts
 *
 * Sprint 2.6 — scan src/server/trpc/routers/ et list les routers tagués
 * `lafusee:strangler-active` avec :
 *  - Liste des services importés (non-whitelisted)
 *  - Mutations détectées dans le router
 *  - Intent kinds candidats (existants dans intent-kinds.ts ou à créer)
 *  - Estimation effort de migration
 *
 * Output : roadmap mécanique pour Sprint 3 (Phase 0 router migration).
 *
 * Usage : `npx tsx scripts/audit-strangler-routers.ts > docs/governance/STRANGLER-ROUTERS-AUDIT.md`
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";

const ROOT = join(__dirname, "..");
const ROUTERS_DIR = join(ROOT, "src/server/trpc/routers");
const INTENT_KINDS_PATH = join(ROOT, "src/server/governance/intent-kinds.ts");

const WHITELIST = new Set([
  "mestor",
  "pillar-gateway",
  "audit-trail",
  "operator-isolation",
  "neteru-shared",
  "error-vault",
]);

function read(path: string): string {
  return readFileSync(path, "utf-8");
}

const intentKindsSrc = read(INTENT_KINDS_PATH);
const KIND_RE = /^\s*\{ kind: "([A-Z_0-9]+)"/gm;
const allIntentKinds = new Set<string>();
let m;
while ((m = KIND_RE.exec(intentKindsSrc)) !== null) {
  allIntentKinds.add(m[1]!);
}

interface RouterAudit {
  file: string;
  hasMarker: boolean;
  marker: string;
  serviceImports: string[];
  mutationsCount: number;
  candidateIntentKinds: string[];
  effort: "trivial" | "moderate" | "significant";
}

const audits: RouterAudit[] = [];

for (const entry of readdirSync(ROUTERS_DIR)) {
  if (!entry.endsWith(".ts")) continue;
  const fullPath = join(ROUTERS_DIR, entry);
  const text = read(fullPath);

  const markerMatch = text.match(/lafusee:(strangler-active|governed-active|governance-router|public-auth|public-payment-init)/);
  if (!markerMatch || markerMatch[1] !== "strangler-active") continue;

  // Extract service imports (non-whitelisted)
  const importRe = /from\s+["']@\/server\/services\/([^/"']+)["']?/g;
  const services = new Set<string>();
  let im;
  while ((im = importRe.exec(text)) !== null) {
    const svc = im[1]!;
    if (!WHITELIST.has(svc)) services.add(svc);
  }

  // Count mutations (`.mutation(`)
  const mutationsCount = (text.match(/\.mutation\(/g) ?? []).length;

  // Candidate Intent kinds — derive from service name uppercased
  const candidates: string[] = [];
  for (const svc of services) {
    const prefix = svc.toUpperCase().replace(/-/g, "_");
    for (const k of allIntentKinds) {
      if (k.startsWith(prefix + "_")) candidates.push(k);
    }
  }

  let effort: RouterAudit["effort"] = "trivial";
  if (mutationsCount >= 10) effort = "significant";
  else if (mutationsCount >= 4) effort = "moderate";

  audits.push({
    file: entry,
    hasMarker: true,
    marker: "strangler-active",
    serviceImports: [...services],
    mutationsCount,
    candidateIntentKinds: [...new Set(candidates)],
    effort,
  });
}

audits.sort((a, b) => b.mutationsCount - a.mutationsCount);

// Markdown output
console.log("# STRANGLER ROUTERS AUDIT — Phase 0 migration roadmap\n");
console.log(`Total : **${audits.length} routers strangler-active** détectés.\n`);
console.log(`Auto-généré par \`scripts/audit-strangler-routers.ts\`. Cf. RESIDUAL-DEBT §Phase 0.\n`);

const byEffort = {
  trivial: audits.filter((a) => a.effort === "trivial"),
  moderate: audits.filter((a) => a.effort === "moderate"),
  significant: audits.filter((a) => a.effort === "significant"),
};

console.log(`## Répartition par effort\n`);
console.log(`| Effort | Count | Mutations totales |`);
console.log(`|---|---|---|`);
for (const [e, list] of Object.entries(byEffort)) {
  const totalMut = list.reduce((s, a) => s + a.mutationsCount, 0);
  console.log(`| ${e} | ${list.length} | ${totalMut} |`);
}

console.log(`\n## Significant effort (≥10 mutations)\n`);
for (const a of byEffort.significant) {
  console.log(`### \`${a.file}\` — ${a.mutationsCount} mutations`);
  console.log(`- Services importés : ${a.serviceImports.length > 0 ? a.serviceImports.map((s) => `\`${s}\``).join(", ") : "_(aucun non-whitelisted)_"}`);
  console.log(`- Intent kinds candidats : ${a.candidateIntentKinds.length > 0 ? `${a.candidateIntentKinds.length} kinds disponibles (${a.candidateIntentKinds.slice(0, 3).join(", ")}${a.candidateIntentKinds.length > 3 ? "…" : ""})` : "_aucun — Intent kinds à créer_"}`);
  console.log("");
}

console.log(`\n## Moderate effort (4-9 mutations)\n`);
for (const a of byEffort.moderate) {
  console.log(`- \`${a.file}\` (${a.mutationsCount} mutations) — ${a.serviceImports.length} services importés, ${a.candidateIntentKinds.length} Intent kinds candidats`);
}

console.log(`\n## Trivial effort (≤3 mutations)\n`);
for (const a of byEffort.trivial) {
  console.log(`- \`${a.file}\` (${a.mutationsCount} mutations) — ${a.serviceImports.length} services, ${a.candidateIntentKinds.length} kinds`);
}

console.log(`\n---\n`);
console.log(`**Total routers strangler-active** : ${audits.length}`);
console.log(`**Total mutations à migrer** : ${audits.reduce((s, a) => s + a.mutationsCount, 0)}`);
console.log(`**Intent kinds couvrant les routers** : ${[...new Set(audits.flatMap((a) => a.candidateIntentKinds))].length}`);
