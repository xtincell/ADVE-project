/**
 * WAKANDA MEGA SEED — Main Orchestrator
 *
 * Creates a complete fictional ecosystem in Wakanda with 6 brands,
 * freelancers, missions, superfans, Jehuty journal, invoices — everything.
 * BLISS is the hero brand at 200/200 ICONE with 3 months of live activity.
 *
 * Usage:  npx tsx scripts/seed-wakanda/index.ts
 * Purge:  npx tsx scripts/seed-wakanda/purge.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { printSummary } from "./helpers";

function makeClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set — Prisma 7 driver adapter requires it.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}


const prisma = makeClient();

async function main() {
  console.log("============================================================");
  console.log("  WAKANDA MEGA SEED");
  console.log("  6 brands · 5500+ records · 142/146 models · 3-month timeline");
  console.log("  Phase 4: Neteru wake-up (Mestor/Ptah/Seshat/Thot)");
  console.log("  Phase 5: Imhotep + Anubis wake-up (volume thresholds)");
  console.log("============================================================\n");

  const start = Date.now();

  // Phase 1 — Infrastructure
  console.log("── Phase 1: Infrastructure ──────────────────────────────────");
  const { seedOperator } = await import("./01-operator");
  const { operator, clients } = await seedOperator(prisma);

  const { seedUsers } = await import("./02-users");
  const users = await seedUsers(prisma, operator);

  // Phase 2 — Brands (sequential for deterministic IDs)
  console.log("\n── Phase 2: Brands ─────────────────────────────────────────");
  const { seedBliss } = await import("./10-bliss");
  const bliss = await seedBliss(prisma, operator, clients, users);

  const { seedVibraniumTech } = await import("./11-vibranium-tech");
  const vibranium = await seedVibraniumTech(prisma, operator, clients, users);

  const { seedWakandaBrew } = await import("./12-wakanda-brew");
  const brew = await seedWakandaBrew(prisma, operator, clients, users);

  const { seedPantherAthletics } = await import("./13-panther-athletics");
  const panther = await seedPantherAthletics(prisma, operator, clients, users);

  const { seedShuriAcademy } = await import("./14-shuri-academy");
  const shuri = await seedShuriAcademy(prisma, operator, clients, users);

  const { seedJabariHeritage } = await import("./15-jabari-heritage");
  const jabari = await seedJabariHeritage(prisma, operator, clients, users);

  const brands = { bliss, vibranium, brew, panther, shuri, jabari };

  // Phase 3 — Cross-brand systems
  console.log("\n── Phase 3: Cross-brand systems ─────────────────────────────");
  const { seedRecommendations } = await import("./20-recommendations");
  await seedRecommendations(prisma, brands);

  const { seedJehutyFeed } = await import("./21-jehuty-feed");
  await seedJehutyFeed(prisma, brands, users);

  const { seedCampaigns } = await import("./22-campaigns");
  await seedCampaigns(prisma, brands, users);

  const { seedMissionsTalent } = await import("./23-missions-talent");
  await seedMissionsTalent(prisma, brands, users);

  const { seedFinancial } = await import("./24-financial");
  await seedFinancial(prisma, brands, users);

  const { seedCommunity } = await import("./25-community");
  await seedCommunity(prisma, brands, users);

  const { seedIntelligence } = await import("./26-intelligence");
  await seedIntelligence(prisma, brands);

  const { seedContentMedia } = await import("./27-content-media");
  await seedContentMedia(prisma, brands, users);

  const { seedInfrastructure } = await import("./28-infrastructure");
  await seedInfrastructure(prisma, brands, users);

  // Phase 4 — Neteru wake-up (Mestor / Ptah / Seshat / Thot)
  console.log("\n── Phase 4: Neteru wake-up ──────────────────────────────────");
  const { seedGovernanceTrail } = await import("./29-governance-trail");
  await seedGovernanceTrail(prisma, brands);

  const { seedForge } = await import("./30-forge");
  await seedForge(prisma, brands);

  const { seedMarketContext } = await import("./31-market-context");
  await seedMarketContext(prisma, brands);

  const { seedOracleStrategy } = await import("./32-oracle-strategy");
  await seedOracleStrategy(prisma, brands);

  const { seedErrorVault } = await import("./33-error-vault");
  await seedErrorVault(prisma, brands);

  const { seedSnapshotsTimeseries } = await import("./34-snapshots-timeseries");
  await seedSnapshotsTimeseries(prisma, brands);

  // Phase 5 — Dormant Neteru wake-up (Imhotep + Anubis : seuils ADR-0010/0011)
  console.log("\n── Phase 5: Imhotep + Anubis activation thresholds ─────────");
  const { seedImhotepWakeup } = await import("./35-imhotep-wakeup");
  await seedImhotepWakeup(prisma, brands);

  const { seedAnubisWakeup } = await import("./36-anubis-wakeup");
  await seedAnubisWakeup(prisma, brands);

  // Phase 6 — Auth plumberie + infra config (Sprint L)
  console.log("\n── Phase 6: Auth + Infra config ─────────────────────────────");
  const { seedAuthInfra } = await import("./37-auth-infra");
  await seedAuthInfra(prisma, brands);

  // Summary
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  printSummary();
  console.log(`  Completed in ${elapsed}s`);
  console.log("  All demo data marked isDummy=true");
  console.log("  Purge: npx tsx scripts/seed-wakanda/purge.ts\n");
}

main()
  .catch((e) => {
    console.error("SEED FAILED:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
