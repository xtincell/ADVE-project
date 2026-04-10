import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { scoreStructural } from "@/server/services/advertis-scorer/structural";
import { assessStrategy } from "@/server/services/pillar-maturity/assessor";

async function main() {
  console.log("═══ Contract-Aware Scoring: SPAWT ═══\n");

  const scores = await scoreStructural("strategy", "spawt-strategy");
  const report = await assessStrategy("spawt-strategy");

  let total = 0;
  for (const key of ["a", "d", "v", "e", "r", "t", "i", "s"] as const) {
    const score = scores[key];
    total += score;
    const assessment = report.pillars[key]!;
    const bar = "█".repeat(Math.round(score)) + "░".repeat(25 - Math.round(score));
    console.log(
      `${key.toUpperCase()} ${bar} ${score.toFixed(1)}/25  ` +
      `[${assessment.currentStage}] ${assessment.completionPct}% ` +
      `(${assessment.satisfied.length}/${assessment.satisfied.length + assessment.missing.length})`
    );
  }

  console.log(`\nComposite: ${total.toFixed(1)}/200`);
  console.log(`Glory ready: ${report.gloryReady}`);
  console.log(`Overall stage: ${report.overallStage}`);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
