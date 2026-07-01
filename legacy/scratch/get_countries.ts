import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../src/lib/db";

async function main() {
  const countries = await db.country.findMany();
  console.log("Countries in DB:", countries.map(c => ({ code: c.code, name: c.name })));
}
main();
