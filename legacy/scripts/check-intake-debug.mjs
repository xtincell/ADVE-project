import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const tokenOrId = process.argv[2] ?? "cmopkkjz1000dpg01yhfiiuxz";

let intake = await db.quickIntake.findUnique({ where: { shareToken: tokenOrId } });
intake = intake ?? await db.quickIntake.findUnique({ where: { id: tokenOrId } });

if (!intake) {
  console.log("NOT FOUND for token or id:", tokenOrId);
  const recents = await db.quickIntake.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, shareToken: true, companyName: true, sector: true, businessModel: true, positioning: true, status: true },
  });
  console.log("Recent intakes:", JSON.stringify(recents, null, 2));
} else {
  console.log("=== INTAKE ===");
  console.log("  id:", intake.id);
  console.log("  shareToken:", intake.shareToken);
  console.log("  companyName:", intake.companyName);
  console.log("  sector:", intake.sector);
  console.log("  country:", intake.country);
  console.log("  businessModel:", intake.businessModel);
  console.log("  positioning:", intake.positioning);
  console.log("  economicModel:", intake.economicModel);
  console.log("  status:", intake.status);
  console.log("  convertedToId:", intake.convertedToId);
  console.log("\n=== RESPONSES ===");
  console.log(JSON.stringify(intake.responses, null, 2));

  if (intake.convertedToId) {
    const pillars = await db.pillar.findMany({
      where: { strategyId: intake.convertedToId },
      select: { key: true, content: true },
    });
    console.log("\n=== PILLAR CONTENT ===");
    for (const p of pillars) {
      console.log(`\n[Pillar ${p.key.toUpperCase()}]`);
      console.log(JSON.stringify(p.content, null, 2));
    }
  }
}
await db.$disconnect();
