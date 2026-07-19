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
  console.log("  6 brands · « LA TOTALE » coverage · 3-month timeline");
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

  // Phase 2.5 — Markets (ADR-0105 kill-switch : countryCode ISO-2 réel sur les stratégies)
  const { seedMarkets } = await import("./16-markets");
  await seedMarkets(prisma);

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

  // Phase 4 — Coverage completion « LA TOTALE » (7 batches, cf.
  // docs/scan/wakanda-coverage-plan.md). Toutes les FK parentes (strategies,
  // campaigns, missions, intakes infra) existent à ce stade. Ordre intra-bloc :
  // brand-tree avant deliverables (FK targetNodeId → SKU).
  console.log("\n── Phase 4: Coverage completion « LA TOTALE » ───────────────");
  const { seedIntakePaywall } = await import("./03-intake-paywall");
  await seedIntakePaywall(prisma);

  const { seedFinancialCosting } = await import("./24b-financial-costing");
  await seedFinancialCosting(prisma);

  const { seedSuperfanTracking } = await import("./25b-superfan-tracking");
  await seedSuperfanTracking(prisma);

  const { seedPledgesAndPassports } = await import("./33-pledges-passports");
  await seedPledgesAndPassports(prisma);

  const { seedOracleSections } = await import("./19-oracle-sections");
  await seedOracleSections(prisma);

  const { seedBrandTree } = await import("./18-brand-tree");
  await seedBrandTree(prisma);

  const { seedCampaignDeliverables } = await import("./24c-campaign-deliverables");
  await seedCampaignDeliverables(prisma);

  const { seedMissionsApplications } = await import("./31-missions-applications");
  await seedMissionsApplications(prisma);

  const { seedCommsBroadcast } = await import("./26b-comms-broadcast");
  await seedCommsBroadcast(prisma);

  const { seedMcpConfig } = await import("./29-mcp-config");
  await seedMcpConfig(prisma);

  const { seedArgosDossiers } = await import("./30-argos-dossiers");
  await seedArgosDossiers(prisma);

  const { seedMarketExtended } = await import("./32-market-extended");
  await seedMarketExtended(prisma);

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
