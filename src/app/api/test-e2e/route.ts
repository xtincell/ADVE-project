export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";
import { quickIntakeRouter } from "@/server/trpc/routers/quick-intake";
import { oracleRouter } from "@/server/trpc/routers/oracle";
import { createCallerFactory } from "@/server/trpc/init";

export async function GET(request: Request) {
  // E2E harness writes to the DB (creates users/intakes/strategies) — must never
  // be reachable anonymously in production. 404 hides its existence.
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const output: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    output.push(msg);
  };

  try {
    log("=== ADVE End-to-End Test: La Fusée ===");

    let user = await db.user.findUnique({ where: { email: "xtincell@gmail.com" } });
    if (!user) {
      user = await db.user.create({
        data: { email: "xtincell@gmail.com", name: "Alexandre", role: "ADMIN" }
      });
      log("Created admin user: " + user.email);
    } else {
      log("Found admin user: " + user.email);
    }

    const callerFactory = createCallerFactory;
    const quickIntakeCaller = callerFactory(quickIntakeRouter)({
      db,
      session: { user },
    } as any);

    const oracleCaller = callerFactory(oracleRouter)({
      db,
      session: { user },
    } as any);

    log("\n1. Starting Quick Intake...");
    const intakeResult = await quickIntakeCaller.start({
      contactName: user.name ?? "Alexandre",
      contactEmail: user.email!,
      companyName: "La Fusée",
      method: "SHORT"
    });
    log("Intake started with token: " + intakeResult.token);

    const laFuseeText = `
    La Fusée est une plateforme SaaS experte en branding et stratégie pour les entreprises et créateurs.
    Nous offrons un diagnostic de marque ADVE (Authenticité, Distinction, Valeur, Engagement) propulsé par l'IA.
    Donnez à votre entreprise la structure qu'elle mérite. Vous avez l'intuition et la vision. Nous apportons la clarté et l'exécution.
    Notre modèle économique repose sur des abonnements SaaS et des crédits d'IA pour débloquer des livrables ultra-précis.
    Nous croyons en un web sans conneries, au service d'une exécution brillante.
    Positionnement: L'Oracle de votre stratégie, le copilote de votre branding.
    `;

    log("\n2. Processing Short Intake (LLM Extraction)...");
    const processResult = await quickIntakeCaller.processShort({
      token: intakeResult.token,
      text: laFuseeText
    });
    log("Processing complete: " + JSON.stringify(processResult));

    log("\n3. Converting Intake to Strategy...");
    const intake = await db.quickIntake.findUnique({ where: { shareToken: intakeResult.token } });
    if (!intake) throw new Error("Intake not found");
    
    const strategy = await quickIntakeCaller.convert({
      intakeId: intake.id,
      userId: user.id
    });
    log("Strategy created: " + strategy.id + " | Status: " + strategy.status);

    log("\n4. Triggering Oracle Assembly...");
    const assembleResult = await oracleCaller.assembleOracle({
      strategyId: strategy.id,
      scope: "ALL"
    });
    log("Oracle assembly intent emitted: " + JSON.stringify(assembleResult));

    log("\n5. Skipping Intent Processing in API (will trigger cron instead)");
    // await processRunnerIntents(10);
    log("Intent processing round 1 complete.");

    // Return current status
    const finalStrategy = await db.strategy.findUnique({
      where: { id: strategy.id },
      include: {
        pillars: true,
        gloryOutputs: true,
      }
    });

    log("\n=== Final Results ===");
    log("Strategy: " + finalStrategy?.name);
    log("Pillars Count: " + finalStrategy?.pillars.length);
    log("Glory Outputs Generated: " + finalStrategy?.gloryOutputs.length);

    return NextResponse.json({ success: true, logs: output, strategy: finalStrategy });
  } catch (error: any) {
    log("ERROR: " + error.message);
    return NextResponse.json({ success: false, logs: output, error: error.message }, { status: 500 });
  }
}
