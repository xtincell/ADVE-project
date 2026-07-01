import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Explicitly set the Brave API Key provided by the user for testing
process.env.BRAVE_API_KEY = "BSA7pcUyq0Bbwp9qWQrzhu1kNhqDE70";

import { triggerMarketStudy } from "../src/server/services/mestor/rtis-cascade";

async function main() {
  const strategyId = "cmqsimrc6000004jpjiw29mmc";
  const operatorId = "cmq0xmczd000004k3nuw6697j";

  console.log("Starting test run of triggerMarketStudy...");
  console.log("Strategy ID:", strategyId);
  console.log("Operator ID:", operatorId);

  try {
    const result = await triggerMarketStudy(strategyId, operatorId);
    console.log("=== SUCCESS ===");
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("=== FAILURE ===");
    console.error(err);
  }
}

main().catch(console.error);
