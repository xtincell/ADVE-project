import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { db } from "../src/lib/db";

async function main() {
  const strategies = await db.strategy.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      countryCode: true,
      businessContext: true,
    }
  });
  console.log("Strategies:", JSON.stringify(strategies, null, 2));
}
main();
