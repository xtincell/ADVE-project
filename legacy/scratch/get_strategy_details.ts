import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../src/lib/db";

async function main() {
  const s = await db.strategy.findUnique({
    where: { id: "demo-strategy-cimencam" }
  });
  console.log("CIMENCAM strategy:", JSON.stringify(s, null, 2));

  const s2 = await db.strategy.findUnique({
    where: { id: "cmqsimrc6000004jpjiw29mmc" }
  });
  console.log("UP.graders strategy:", JSON.stringify(s2, null, 2));
}
main();
