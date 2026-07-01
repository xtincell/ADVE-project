import { db } from "@/lib/db";

async function check() {
  const strategies = await db.strategy.findMany({ where: { name: "SPAWT" }, select: { id: true, name: true, createdAt: true } });
  console.log("Strategies SPAWT:", strategies.length);
  for (const s of strategies) {
    const missions = await db.mission.count({ where: { strategyId: s.id } });
    const drivers = await db.driver.count({ where: { strategyId: s.id } });
    console.log(`  ${s.id}  created:${s.createdAt.toISOString().slice(0, 10)}  missions:${missions}  drivers:${drivers}`);
  }

  const allMissions = await db.mission.findMany({ select: { id: true, title: true, strategyId: true, status: true, assigneeId: true } });
  console.log("\nAll Missions:", allMissions.length);
  for (const m of allMissions) {
    console.log(`  [${m.status}] ${m.title.slice(0, 50)} (assignee:${m.assigneeId ?? "none"})`);
  }

  const talents = await db.talentProfile.findMany({ select: { userId: true, displayName: true, tier: true, totalMissions: true } });
  console.log("\nTalent Profiles:", talents.length);
  for (const t of talents) {
    console.log(`  ${t.displayName} (${t.tier}, ${t.totalMissions} missions)`);
  }

  await db.$disconnect();
}

check();
