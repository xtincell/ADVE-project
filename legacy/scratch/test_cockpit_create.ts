import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../src/lib/db";
import { createTRPCRouter } from "../src/server/trpc/init";
import { strategyRouter } from "../src/server/trpc/routers/strategy";

async function main() {
  console.log("=== START COCKPIT CREATE TEST ===");
  
  // 1. Find or create a user & operator to mock session
  let user = await db.user.findFirst({
    where: { email: "system@lafusee.io" }
  });
  if (!user) {
    user = await db.user.create({
      data: {
        email: "system@lafusee.io",
        name: "System",
        role: "ADMIN"
      }
    });
  }

  // Create context for TRPC call
  const ctx = {
    db,
    session: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        operatorId: null
      },
      expires: new Date(Date.now() + 3600 * 1000).toISOString()
    }
  };

  const router = createTRPCRouter({ strategy: strategyRouter });
  const caller = router.createCaller(ctx as any);

  const testBrandName = `Test Cockpit Brand ${Date.now()}`;
  console.log(`Creating test brand: "${testBrandName}"...`);

  try {
    const strategy = await caller.strategy.create({
      name: testBrandName,
      description: "A brand created directly in the cockpit",
      sector: "BTP",
      country: "Cameroun",
      businessContext: {
        businessModel: "PRODUCTION",
        economicModels: ["VOLUME"],
        positioningArchetype: "MAINSTREAM"
      }
    });

    console.log("Strategy created:", strategy.id);

    // 2. Verify that QuickIntake was created
    const quickIntake = await db.quickIntake.findFirst({
      where: { convertedToId: strategy.id }
    });

    if (quickIntake) {
      console.log("✅ QuickIntake created successfully!");
      console.log(`- ID: ${quickIntake.id}`);
      console.log(`- Company Name: ${quickIntake.companyName}`);
      console.log(`- Sector: ${quickIntake.sector}`);
      console.log(`- Country: ${quickIntake.country}`);
      console.log(`- Status: ${quickIntake.status}`);
    } else {
      console.error("❌ Error: QuickIntake not found for strategy!");
    }

    // 3. Verify that BrandDataSource was created
    const dataSource = await db.brandDataSource.findFirst({
      where: { strategyId: strategy.id, sourceType: "MANUAL_INPUT" }
    });

    if (dataSource) {
      console.log("✅ BrandDataSource created successfully!");
      console.log(`- ID: ${dataSource.id}`);
      console.log(`- Source Type: ${dataSource.sourceType}`);
      console.log(`- Certainty: ${dataSource.certainty}`);
      console.log(`- Origin: ${dataSource.origin}`);
      console.log(`- Content:\n${dataSource.rawContent}`);
    } else {
      console.error("❌ Error: BrandDataSource not found for strategy!");
    }

    // Cleanup
    await db.brandDataSource.deleteMany({ where: { strategyId: strategy.id } });
    await db.quickIntake.deleteMany({ where: { convertedToId: strategy.id } });
    await db.pillar.deleteMany({ where: { strategyId: strategy.id } });
    // Let's delete config tables created
    await db.variableStoreConfig.deleteMany({ where: { strategyId: strategy.id } });
    await db.brandOSConfig.deleteMany({ where: { strategyId: strategy.id } });
    await db.deal.deleteMany({ where: { strategyId: strategy.id } });
    await db.strategy.delete({ where: { id: strategy.id } });
    console.log("Cleanup completed.");

  } catch (err) {
    console.error("Test execution failed:", err);
  }

  console.log("=== COCKPIT CREATE TEST COMPLETED ===");
}

main();
