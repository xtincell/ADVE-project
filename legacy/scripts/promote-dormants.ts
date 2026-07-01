import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const STRATEGY_ID = "cmo7cezu10004abjoxu205mnj";

async function main() {
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: STRATEGY_ID },
    select: { operatorId: true },
  });
  if (!strategy.operatorId) throw new Error("no operator");

  const dormants = [
    { sectionId: "imhotep-crew-program-dormant", content: { imhotepCrewProgramPlaceholder: "Phase 7+ activation pending" } },
    { sectionId: "anubis-comms-dormant", content: { anubisCommsPlaceholder: "Phase 8+ activation pending" } },
  ];

  for (const d of dormants) {
    const existing = await db.brandAsset.findFirst({
      where: {
        strategyId: STRATEGY_ID,
        kind: "GENERIC",
        metadata: { path: ["sectionId"], equals: d.sectionId },
      },
    });
    if (existing) {
      await db.brandAsset.update({
        where: { id: existing.id },
        data: { state: "ACTIVE", content: d.content as never },
      });
      console.log(`UPDATED ${d.sectionId}: ${existing.id} → ACTIVE`);
    } else {
      const created = await db.brandAsset.create({
        data: {
          strategyId: STRATEGY_ID,
          operatorId: strategy.operatorId,
          name: `Oracle section: ${d.sectionId}`,
          kind: "GENERIC",
          family: "INTELLECTUAL",
          content: d.content as never,
          state: "ACTIVE",
          summary: `Oracle 35-section ${d.sectionId} (Phase 13 dormant)`,
          metadata: { source: "oracle-enrich", sectionId: d.sectionId, phase: 13 } as never,
        },
      });
      console.log(`CREATED ${d.sectionId}: ${created.id} → ACTIVE`);
    }
  }

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
