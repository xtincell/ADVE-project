import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const operators = await db.operator.findMany({ select: { id: true, name: true, slug: true } });
const strategies = await db.strategy.findMany({
  select: {
    id: true,
    name: true,
    operatorId: true,
    userId: true,
    isDummy: true,
    status: true,
    createdAt: true,
    _count: { select: { pillars: true, brandAssets: true, missions: true, dataSources: true } },
  },
  orderBy: [{ isDummy: "desc" }, { createdAt: "asc" }],
});

console.log("=== OPERATORS (" + operators.length + ") ===");
operators.forEach((o) => console.log("  " + o.id + "  slug=" + (o.slug ?? "—") + "  name=" + o.name));

console.log("\n=== STRATEGIES (" + strategies.length + ") ===");
strategies.forEach((s) => {
  const dummy = s.isDummy ? "[DUMMY]" : "       ";
  const counts = "p=" + s._count.pillars + " a=" + s._count.brandAssets + " m=" + s._count.missions + " src=" + s._count.dataSources;
  console.log("  " + dummy + " " + s.id + "  name=" + JSON.stringify(s.name) + "  status=" + (s.status ?? "—") + "  op=" + (s.operatorId ?? "—") + "  " + counts);
});

const dummyCount = strategies.filter((s) => s.isDummy).length;
const realCount = strategies.length - dummyCount;
console.log("\n=== SUMMARY ===");
console.log("  Total: " + strategies.length);
console.log("  Dummy (isDummy=true): " + dummyCount);
console.log("  Real (isDummy=false): " + realCount);

await db.$disconnect();
