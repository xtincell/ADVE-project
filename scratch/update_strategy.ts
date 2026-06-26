import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../src/lib/db";

async function main() {
  const strategyId = "cmqsimrc6000004jpjiw29mmc";
  const strategy = await db.strategy.findUnique({ where: { id: strategyId } });
  if (!strategy) {
    console.error("Strategy not found!");
    return;
  }
  const currentCtx = (strategy.businessContext as Record<string, any>) || {};
  const updatedCtx = {
    ...currentCtx,
    sector: "Ciment",
    country: "Cameroun"
  };

  await db.strategy.update({
    where: { id: strategyId },
    data: {
      countryCode: "CM",
      description: "Production et distribution de ciment au Cameroun",
      businessContext: updatedCtx
    }
  });

  console.log("Strategy updated successfully!");
}

main();
