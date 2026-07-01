import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { assessStrategy } from "@/server/services/pillar-maturity/assessor";

async function main() {
  const report = await assessStrategy("spawt-strategy");

  for (const [key, assessment] of Object.entries(report.pillars)) {
    if (assessment.missing.length === 0) continue;
    console.log(`\n=== PILLAR ${key.toUpperCase()} (${assessment.currentStage} → needs ${assessment.missing.length} fields) ===`);
    for (const m of assessment.missing) {
      const isDer = assessment.derivable.includes(m) ? "derivable" : "HUMAN";
      console.log(`  - ${m} [${isDer}]`);
    }
  }

  console.log(`\nTotal: ${report.totalMissing} missing, ${report.totalDerivable} derivable`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
