import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../src/lib/db";

async function main() {
  const strategies = await db.strategy.findMany({
    include: {
      pillars: true
    }
  });
  console.log("Strategies count:", strategies.length);
  for (const s of strategies) {
    const pillarA = s.pillars.find(p => p.key === "a");
    const content = (pillarA?.content as any) ?? {};
    const brandName = content.nomMarque ?? s.name;
    console.log(`- Strategy ID: ${s.id}, Name: ${s.name}, BrandName: ${brandName}, Status: ${s.status}`);
  }
}

main();
