/**
 * Cleanup duplicate SPAWT strategies and Apple Inc. test strategies
 * Run: npx tsx scripts/cleanup-dup-strategies.ts
 */
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

const DUP_SPAWT = [
  "cmnh5vpf7000101x85doqkik6",
  "cmngoc53d000101746nt1csdj",
  "cmngn4ycq000101pgawf5uj5s",
  "cmnfrallc000101w4mdw3e5yh",
];
const APPLE_INC = [
  "cmndvhfdt00010184lgkn9v6r",
  "cmndvsyo7000601zw03y3qkps",
  "cmnedlidt000601ecdyyya9fa",
  "cmnednyal0001010k7ec66aj7",
  "cmneebb4w000101l80vrh3m9b",
];
const ALL = [...DUP_SPAWT, ...APPLE_INC];

async function del(model: string, fn: () => Promise<{ count: number }>) {
  try {
    const r = await fn();
    if (r.count > 0) console.log(`  ✓ ${model}: ${r.count} deleted`);
  } catch {
    // model may not have strategyId or no records — ignore
  }
}

async function main() {
  console.log("Cleaning up duplicate strategies...\n");

  // Delete all dependent records in order (leaf → root)
  await del("ScoreSnapshot",        () => db.scoreSnapshot.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("DevotionSnapshot",     () => db.devotionSnapshot.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("CohortSnapshot",       () => db.cohortSnapshot.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("CommunitySnapshot",    () => db.communitySnapshot.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("CultIndexSnapshot",    () => db.cultIndexSnapshot.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("GloryOutput",          () => db.gloryOutput.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("InsightReport",        () => db.insightReport.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("Signal",               () => db.signal.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("BrandVariable",        () => db.brandVariable.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("BrandDataSource",      () => db.brandDataSource.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("BrandAsset",           () => db.brandAsset.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("SocialPost",           () => db.socialPost.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("SocialConnection",     () => db.socialConnection.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("PressClipping",        () => db.pressClipping.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("PressRelease",         () => db.pressRelease.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("MarketStudy",          () => db.marketStudy.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("FrameworkResult",      () => db.frameworkResult.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("AttributionEvent",     () => db.attributionEvent.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("SuperfanProfile",      () => db.superfanProfile.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("AmbassadorProgram",    () => db.ambassadorProgram.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("Contract",             () => db.contract.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("Process",              () => db.process.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("MestorThread",         () => db.mestorThread.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("Conversation",         () => db.conversation.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("MediaPlatformConnection", () => db.mediaPlatformConnection.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("InterventionRequest",  () => db.interventionRequest.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("Driver",               () => db.driver.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("Deal",                 () => db.deal.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("Mission",              () => db.mission.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("Campaign",             () => db.campaign.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("Pillar",               () => db.pillar.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("BrandOSConfig",        () => db.brandOSConfig.deleteMany({ where: { strategyId: { in: ALL } } }));
  await del("VariableStoreConfig",  () => db.variableStoreConfig.deleteMany({ where: { strategyId: { in: ALL } } }));

  // Now delete the strategies
  const s = await db.strategy.deleteMany({ where: { id: { in: ALL } } }).catch(e => {
    console.error("Strategy delete blocked:", e.message.substring(0, 300));
    return { count: 0 };
  });
  console.log(`\n✓ Strategies deleted: ${s.count}`);

  const remaining = await db.strategy.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, name: true } });
  console.log("\nRemaining strategies:");
  remaining.forEach(s => console.log("  ", s.name.padEnd(15), s.id));
}

main().catch(console.error).finally(() => db.$disconnect());
