import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function makeClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set — Prisma 7 driver adapter requires it.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}


const db = makeClient();

async function main() {
  const strategies = await db.strategy.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      client: { select: { name: true, sector: true } },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
  const clients = await db.client.findMany({
    select: { id: true, name: true, sector: true, status: true, _count: { select: { strategies: true } } },
    orderBy: { name: "asc" },
  });

  console.log(`📚 Strategy: ${strategies.length} rows`);
  for (const s of strategies) {
    const flag = s.status === "ACTIVE" ? "✓" : s.status === "QUICK_INTAKE" ? "?" : "•";
    console.log(`  ${flag} [${s.status}] ${s.name}${s.client ? ` — client="${s.client.name}" sector="${s.client.sector ?? "-"}"` : ""}`);
  }

  console.log(`\n🏢 Client: ${clients.length} rows`);
  for (const c of clients) {
    console.log(`  • [${c.status}] ${c.name} — sector="${c.sector ?? "-"}" strategies=${c._count.strategies}`);
  }
}

main().finally(() => db.$disconnect());
