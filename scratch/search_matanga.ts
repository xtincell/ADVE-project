import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { db } from "../src/lib/db";

async function main() {
  const users = await db.user.findMany({
    where: {
      OR: [
        { name: { contains: "Matanga", mode: "insensitive" } },
        { email: { contains: "Matanga", mode: "insensitive" } },
      ],
    },
  });
  console.log("Users:", users);

  const operators = await db.operator.findMany({
    where: {
      name: { contains: "Matanga", mode: "insensitive" },
    },
  });
  console.log("Operators:", operators);

  const clients = await db.client.findMany({
    where: {
      name: { contains: "Matanga", mode: "insensitive" },
    },
  });
  console.log("Clients:", clients);

  const strategies = await db.strategy.findMany({
    where: {
      name: { contains: "Matanga", mode: "insensitive" },
    },
  });
  console.log("Strategies:", strategies);
}
main();
