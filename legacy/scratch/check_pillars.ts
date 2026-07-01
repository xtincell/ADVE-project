import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { db } from "../src/lib/db";

async function main() {
  const strategies = await db.strategy.findMany({
    include: {
      pillars: {
        select: {
          key: true,
          confidence: true,
          validationStatus: true,
        }
      }
    }
  });
  console.log("Strategies & Pillars:", JSON.stringify(strategies, null, 2));
}
main().catch(console.error);
