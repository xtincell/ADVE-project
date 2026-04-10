import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { validateAllBindings } from "@/server/services/pillar-maturity/binding-validator";

const report = validateAllBindings();

console.log("═══ ORPHAN BINDINGS (path doesn't exist in schema) ═══\n");
for (const o of report.orphanBindings) {
  console.log(`  ${o.toolSlug}.${o.field} → ${o.path}`);
}

console.log(`\n═══ UNBOUND FIELDS (no binding, not sequence context) ═══\n`);

// Group by field name and count
const unboundCounts = new Map<string, string[]>();
for (const e of report.entries.filter(e => e.classification === "unbound")) {
  if (!unboundCounts.has(e.inputField)) unboundCounts.set(e.inputField, []);
  unboundCounts.get(e.inputField)!.push(e.toolSlug);
}

const sorted = Array.from(unboundCounts.entries()).sort((a, b) => b[1].length - a[1].length);
for (const [field, tools] of sorted) {
  console.log(`  ${field} (${tools.length}x): ${tools.slice(0, 5).join(", ")}${tools.length > 5 ? ` +${tools.length - 5}` : ""}`);
}

console.log(`\n═══ SUMMARY ═══`);
console.log(`Orphan bindings: ${report.orphanBindings.length}`);
console.log(`Unbound fields: ${report.unbound} across ${unboundCounts.size} unique field names`);
console.log(`Coverage: ${report.coveragePct}%`);

process.exit(0);
