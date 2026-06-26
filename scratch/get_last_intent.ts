import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../src/lib/db";

async function main() {
  const last = await db.intentEmission.findFirst({
    where: { intentKind: "RUN_MARKET_RESEARCH" },
    orderBy: { emittedAt: "desc" },
  });

  if (!last) {
    console.log("No intent emission found for RUN_MARKET_RESEARCH");
    return;
  }

  console.log("=== INTENT EMISSION ===");
  console.log("ID:", last.id);
  console.log("Status:", last.status);
  console.log("Emitted At:", last.emittedAt);
  console.log("Payload:", JSON.stringify(last.payload, null, 2));
  console.log("Result (truncated):", JSON.stringify(last.result, null, 2).slice(0, 4000));
}

main().catch(console.error);
