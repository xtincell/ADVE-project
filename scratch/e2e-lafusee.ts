import { db } from "@/lib/db";
import { quickIntakeRouter } from "@/server/trpc/routers/quick-intake";
import { oracleRouter } from "@/server/trpc/routers/oracle";
import { createCallerFactory } from "@/server/trpc/init";
import { runnerFactory } from "@/server/services/oracle-section/runner-factory";

// Simple wait utility
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("=== ADVE End-to-End Test: La Fusée ===");

  // 1. Fetch or create user xtincell@gmail.com
  let user = await db.user.findUnique({ where: { email: "xtincell@gmail.com" } });
  if (!user) {
    user = await db.user.create({
      data: { email: "xtincell@gmail.com", name: "Alexandre", role: "ADMIN" }
    });
    console.log("Created admin user:", user.email);
  } else {
    console.log("Found admin user:", user.email);
  }

  // 2. Setup TRPC Caller
  const callerFactory = createCallerFactory;
  const quickIntakeCaller = callerFactory(quickIntakeRouter)({
    db,
    session: { user },
  } as any);

  const oracleCaller = callerFactory(oracleRouter)({
    db,
    session: { user },
  } as any);

  // 3. Create a quick intake
  console.log("\n1. Starting Quick Intake...");
  const intakeResult = await quickIntakeCaller.start({
    contactName: user.name ?? "Alexandre",
    contactEmail: user.email!,
    companyName: "La Fusée",
    method: "SHORT"
  });
  console.log("Intake started with token:", intakeResult.token);

  // 4. Process Short (Extract ADVE RTIS from text)
  const laFuseeText = `
  La Fusée est une plateforme SaaS experte en branding et stratégie pour les entreprises et créateurs.
  Nous offrons un diagnostic de marque ADVE (Authenticité, Distinction, Valeur, Engagement) propulsé par l'IA.
  Donnez à votre entreprise la structure qu'elle mérite. Vous avez l'intuition et la vision. Nous apportons la clarté et l'exécution.
  Notre modèle économique repose sur des abonnements SaaS et des crédits d'IA pour débloquer des livrables ultra-précis.
  Nous croyons en un web sans conneries, au service d'une exécution brillante.
  Positionnement: L'Oracle de votre stratégie, le copilote de votre branding.
  `;

  console.log("\n2. Processing Short Intake (LLM Extraction)...");
  console.log("This may take 10-30 seconds depending on LLM...");
  const processResult = await quickIntakeCaller.processShort({
    token: intakeResult.token,
    text: laFuseeText
  });
  console.log("Processing complete:", processResult);

  // 5. Convert Intake to Strategy
  console.log("\n3. Converting Intake to Strategy...");
  const intake = await db.quickIntake.findUnique({ where: { shareToken: intakeResult.token } });
  if (!intake) throw new Error("Intake not found");
  
  const strategy = await quickIntakeCaller.convert({
    intakeId: intake.id,
    userId: user.id
  });
  console.log("Strategy created:", strategy.id, "| Status:", strategy.status);

  // 6. Assemble Oracle
  console.log("\n4. Triggering Oracle Assembly...");
  const assembleResult = await oracleCaller.assembleOracle({
    strategyId: strategy.id,
    scope: "ALL"
  });
  console.log("Oracle assembly intent emitted:", assembleResult);

  // Wait for 5 seconds to let async promises settle
  await delay(5000);
  
  // Checking results in the database
  const finalStrategy = await db.strategy.findUnique({
    where: { id: strategy.id },
    include: {
      pillars: true,
      gloryOutputs: true,
      businessContext: true
    }
  });

  console.log("\n=== Final Results ===");
  console.log("Strategy:", finalStrategy?.name);
  console.log("Pillars Count:", finalStrategy?.pillars.length);
  console.log("Glory Outputs Generated:", finalStrategy?.gloryOutputs.length);
  
  if (finalStrategy?.gloryOutputs && finalStrategy.gloryOutputs.length > 0) {
    console.log("✅ Oracle successfully assembled for La Fusée!");
  } else {
    console.log("⚠️ No Glory Outputs were found. The background workers might need more time or a specific cron runner.");
  }

  process.exit(0);
}

main().catch(console.error);
