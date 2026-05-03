import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const dangling = await db.$queryRawUnsafe(`
  SELECT qi.id, qi."shareToken", qi."convertedToId", qi."companyName", qi.status
  FROM "QuickIntake" qi
  LEFT JOIN "Strategy" s ON s.id = qi."convertedToId"
  WHERE qi."convertedToId" IS NOT NULL AND s.id IS NULL
`);

console.log(`Dangling QuickIntake.convertedToId pointers: ${dangling.length}`);
for (const d of dangling) {
  console.log(`  - intake=${d.id} token=${d.shareToken} → deleted strategy=${d.convertedToId} company="${d.companyName}" status=${d.status}`);
}

if (process.argv.includes("--fix") && dangling.length > 0) {
  const ids = dangling.map((d) => d.id);
  const inList = ids.map((x) => `'${x.replaceAll("'", "''")}'`).join(",");
  const n = await db.$executeRawUnsafe(
    `UPDATE "QuickIntake" SET "convertedToId" = NULL WHERE id IN (${inList})`,
  );
  console.log(`\nNullified ${n} dangling pointer(s).`);
}

await db.$disconnect();
