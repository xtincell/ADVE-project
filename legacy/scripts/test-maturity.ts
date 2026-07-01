import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { assessStrategy } from "@/server/services/pillar-maturity/assessor";
import { validateAllBindings } from "@/server/services/pillar-maturity/binding-validator";

async function main() {
  // 1. Assess SPAWT strategy maturity
  console.log("═══ SPAWT Strategy Maturity Report ═══\n");
  const report = await assessStrategy("spawt-strategy");

  console.log(`Overall stage: ${report.overallStage}`);
  console.log(`Glory ready: ${report.gloryReady}`);
  console.log(`Total missing: ${report.totalMissing}`);
  console.log(`Total derivable: ${report.totalDerivable}`);
  console.log(`Auto-completable pillars: ${report.autoCompletable}\n`);

  for (const [key, assessment] of Object.entries(report.pillars)) {
    const emoji = assessment.readyForGlory ? "✓" : assessment.currentStage === "ENRICHED" ? "◐" : assessment.currentStage === "INTAKE" ? "○" : "✕";
    console.log(`${emoji} Pillar ${key.toUpperCase()}: ${assessment.currentStage} (${assessment.completionPct}%) — ${assessment.missing.length} missing, ${assessment.derivable.length} derivable`);
    if (assessment.missing.length > 0 && assessment.missing.length <= 5) {
      for (const m of assessment.missing) console.log(`    ↳ ${m}`);
    } else if (assessment.missing.length > 5) {
      for (const m of assessment.missing.slice(0, 3)) console.log(`    ↳ ${m}`);
      console.log(`    ↳ ... +${assessment.missing.length - 3} more`);
    }
  }

  // 2. Validate all Glory bindings
  console.log("\n═══ Binding Validation Report ═══\n");
  const bindings = validateAllBindings();

  console.log(`Tools: ${bindings.totalTools}`);
  console.log(`Input fields: ${bindings.totalInputFields}`);
  console.log(`Pillar-bound: ${bindings.pillarBound} (${Math.round(bindings.pillarBound / bindings.totalInputFields * 100)}%)`);
  console.log(`Sequence context: ${bindings.sequenceContext}`);
  console.log(`Unbound: ${bindings.unbound}`);
  console.log(`Coverage: ${bindings.coveragePct}%`);

  if (bindings.orphanBindings.length > 0) {
    console.log(`\nOrphan bindings (path doesn't exist in schema):`);
    for (const o of bindings.orphanBindings.slice(0, 10)) {
      console.log(`  ✕ ${o.toolSlug}.${o.field} → ${o.path}`);
    }
  }

  if (bindings.missingBindings.length > 0) {
    console.log(`\nUnbound fields (should have a binding):`);
    for (const m of bindings.missingBindings.slice(0, 15)) {
      console.log(`  ? ${m.toolSlug}.${m.field}`);
    }
    if (bindings.missingBindings.length > 15) {
      console.log(`  ... +${bindings.missingBindings.length - 15} more`);
    }
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
