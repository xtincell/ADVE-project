/**
 * Entrypoint exécutable du seed benchmarks média. Run : npm run db:seed:media-benchmarks
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { seedMediaBenchmarks } from "./seed-media-benchmarks";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const n = await seedMediaBenchmarks(prisma);
  console.log(`✓ media benchmarks seeded: ${n} rows → MarketCostSnapshot`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
