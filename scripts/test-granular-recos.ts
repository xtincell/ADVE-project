import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { generateADVERecommendations } from "@/server/services/mestor/rtis-cascade";

async function main() {
  console.log("Generating granular recos for pillar D...");
  const result = await generateADVERecommendations("spawt-strategy", "D");
  console.log("Error:", result.error || "none");
  console.log("Total recommendations:", result.recommendations.length);

  // Count by operation type
  const ops: Record<string, number> = {};
  for (const r of result.recommendations) {
    const op = r.operation ?? "SET";
    ops[op] = (ops[op] ?? 0) + 1;
  }
  console.log("Operations:", JSON.stringify(ops));

  for (const r of result.recommendations) {
    const op = r.operation ?? "SET";
    const tgt = r.targetMatch ? ` — target: ${r.targetMatch.value}` : "";
    console.log(`  [${op}] ${r.field} — ${r.impact}${tgt}`);
    console.log(`    ${r.justification.slice(0, 100)}...`);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
