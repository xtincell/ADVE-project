#!/usr/bin/env npx tsx
/**
 * INTAKE E2E TEST — Both routes with real LLM calls
 *
 * Tests the COMPLETE intake flow end-to-end:
 *   Route 1: GUIDED (Questionnaire) — biz + A + D + V + E → complete → result
 *   Route 2: IMPORT (Import intelligent) — text ingest → complete → result
 *
 * Uses real DB + real Anthropic API.
 * Run: npx tsx scripts/test-intake-e2e.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env manually (dotenv can be unreliable with dynamic imports)
for (const envFile of [".env.local", ".env"]) {
  try {
    const content = readFileSync(resolve(__dirname, "..", envFile), "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1]!.trim();
        let val = match[2]!.trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch { /* skip */ }
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY not found in .env");
  process.exit(1);
}

const PASS = "\x1b[32m\u2713\x1b[0m";
const FAIL = "\x1b[31m\u2717\x1b[0m";
const INFO = "\x1b[36m\u25B6\x1b[0m";
let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ${PASS} ${name}${detail ? ` — ${detail}` : ""}`);
    passed++;
  } else {
    console.log(`  ${FAIL} ${name}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();

  try {
    console.log("\n\x1b[35m\u2501\u2501 INTAKE E2E TEST \u2501\u2501\x1b[0m\n");

    // Import services
    const quickIntake = await import("../src/server/services/quick-intake/index");
    const questionBank = await import("../src/server/services/quick-intake/question-bank");

    // ================================================================
    // ROUTE 1: GUIDED (Questionnaire)
    // ================================================================
    console.log(`\n${INFO} \x1b[1mROUTE 1: GUIDED (Questionnaire)\x1b[0m`);
    console.log("  Creating intake...");

    const guided = await quickIntake.start({
      contactName: "Test E2E Guided",
      contactEmail: "guided@test-e2e.com",
      companyName: "TestBrand Guided",
      sector: "FMCG",
      country: "CM",
      businessModel: "PRODUCTION",
      positioning: "PREMIUM",
      method: "GUIDED",
    });

    check("Intake created", !!guided.token, `token: ${guided.token}`);
    check("First questions returned", guided.questions.length > 0, `${guided.questions.length} questions`);

    // Step 1: Business context
    console.log("  Answering business context...");
    const bizResponses: Record<string, unknown> = {};
    for (const q of guided.questions) {
      if (q.type === "select" && q.options?.length) {
        bizResponses[q.id] = q.options[0];
      } else if (q.type === "scale") {
        bizResponses[q.id] = 7;
      } else {
        bizResponses[q.id] = "Reponse test pour " + q.id;
      }
    }

    const biz = await quickIntake.advance({
      token: guided.token,
      responses: { biz: bizResponses },
    });
    check("Biz context saved", biz.nextPillar !== "biz", `next: ${biz.nextPillar}`);

    // Steps 2-5: ADVE pillars
    const advePillars = ["a", "d", "v", "e"];
    for (const pillar of advePillars) {
      console.log(`  Fetching questions for pillar ${pillar.toUpperCase()}...`);

      // Get questions for this pillar
      const intake = await db.quickIntake.findFirst({
        where: { shareToken: guided.token },
        select: { sector: true, positioning: true, responses: true },
      });

      const questions = await questionBank.getAdaptiveQuestions(
        pillar,
        (intake?.responses as Record<string, unknown>) ?? {},
        { sector: intake?.sector ?? undefined, positioning: intake?.positioning ?? undefined },
      );

      check(`Pillar ${pillar.toUpperCase()} questions`, questions.length > 0, `${questions.length} questions (LLM-adaptive)`);

      // Answer all questions
      const pillarResponses: Record<string, unknown> = {};
      for (const q of questions) {
        if (q.type === "select" && q.options?.length) {
          pillarResponses[q.id] = q.options[Math.min(2, q.options.length - 1)];
        } else if (q.type === "scale") {
          pillarResponses[q.id] = 8;
        } else {
          pillarResponses[q.id] = `Notre marque ${pillar.toUpperCase()} se distingue par son excellence et son engagement envers la qualite premium. Nous investissons dans l'innovation continue.`;
        }
      }

      const result = await quickIntake.advance({
        token: guided.token,
        responses: { [pillar]: pillarResponses },
      });

      const expectedNext = advePillars[advePillars.indexOf(pillar) + 1] ?? null;
      check(`Pillar ${pillar.toUpperCase()} saved`, true, `next: ${result.nextPillar ?? "DONE"}`);
    }

    // Complete
    console.log("  Completing intake (scoring + diagnostic)...");
    const guidedResult = await quickIntake.complete(guided.token);

    const gv = guidedResult.vector as Record<string, number>;
    check("Score computed", typeof gv?.composite === "number", `composite: ${gv?.composite}/100`);
    check("Classification assigned", !!guidedResult.classification, guidedResult.classification);
    check("Diagnostic generated", !!guidedResult.diagnostic, `${Object.keys(guidedResult.diagnostic as object).length} fields`);
    check("ADVE scores present", gv?.a >= 0 && gv?.d >= 0 && gv?.v >= 0 && gv?.e >= 0,
      `A:${gv?.a} D:${gv?.d} V:${gv?.v} E:${gv?.e}`);
    check("Score <= 100", (gv?.composite ?? 0) <= 100, `${gv?.composite}/100`);

    // Verify in DB
    const savedGuided = await db.quickIntake.findFirst({
      where: { shareToken: guided.token },
      select: { status: true, classification: true, advertis_vector: true, diagnostic: true },
    });
    check("DB status COMPLETED", savedGuided?.status === "COMPLETED");
    check("DB has classification", !!savedGuided?.classification);
    check("DB has diagnostic", !!savedGuided?.diagnostic);

    // ================================================================
    // ROUTE 2: IMPORT (Import intelligent)
    // ================================================================
    console.log(`\n${INFO} \x1b[1mROUTE 2: IMPORT (Import intelligent)\x1b[0m`);
    console.log("  Creating intake...");

    const imported = await quickIntake.start({
      contactName: "Test E2E Import",
      contactEmail: "import@test-e2e.com",
      companyName: "TestBrand Import",
      sector: "TECH",
      method: "IMPORT",
    });

    check("Import intake created", !!imported.token, `token: ${imported.token}`);

    // Simulate text ingest — advance with raw text as biz context
    console.log("  Ingesting raw text...");
    const rawText = `
AquaPure est une marque d'eau minerale premium fondee en 2020 au Cameroun.
Notre mission: offrir une eau d'une purete exceptionnelle, issue des sources alpines certifiees.
Valeurs: Purete, Innovation, Durabilite, Excellence.
Positionnement: premium, 2x le prix des eaux classiques. Justifie par la qualite de source et l'engagement eco-responsable.
Cible: CSP+ urbains, 25-45 ans, soucieux de leur sante.
Concurrents: Evian, Volvic, Cristaline.
Canal: vente directe D2C + grande distribution selective.
Communaute: 15k followers Instagram, taux d'engagement 4.2%.
Les clients reviennent a 70%+ grace au gout et au packaging premium.
    `;

    // For IMPORT method, we provide all data at once as biz + pillar responses
    await quickIntake.advance({
      token: imported.token,
      responses: {
        biz: { rawText, businessModel: "PRODUCTION", brandNature: "PRODUCT" },
        a: { raw_brand_description: rawText },
        d: { raw_brand_description: rawText },
        v: { raw_brand_description: rawText },
        e: { raw_brand_description: rawText },
      },
    });
    check("Text ingested", true);

    // Complete
    console.log("  Completing import intake (AI extraction + scoring)...");
    const importResult = await quickIntake.complete(imported.token);

    const iv = importResult.vector as Record<string, number>;
    check("Import score computed", typeof iv?.composite === "number", `composite: ${iv?.composite}/100`);
    check("Import classification", !!importResult.classification, importResult.classification);
    check("Import diagnostic", !!importResult.diagnostic);
    check("Import ADVE scores", iv?.a >= 0 && iv?.d >= 0,
      `A:${iv?.a} D:${iv?.d} V:${iv?.v} E:${iv?.e}`);

    // Verify in DB
    const savedImport = await db.quickIntake.findFirst({
      where: { shareToken: imported.token },
      select: { status: true, classification: true },
    });
    check("Import DB status COMPLETED", savedImport?.status === "COMPLETED");

    // ================================================================
    // CLEANUP
    // ================================================================
    console.log(`\n${INFO} \x1b[1mCLEANUP\x1b[0m`);

    // Delete test intakes
    await db.quickIntake.deleteMany({
      where: { contactEmail: { in: ["guided@test-e2e.com", "import@test-e2e.com"] } },
    });
    // Delete test strategies
    await db.strategy.deleteMany({
      where: { name: { in: ["TestBrand Guided", "TestBrand Import"] } },
    });
    console.log("  Test data cleaned up.");

    // ================================================================
    // REPORT
    // ================================================================
    console.log("\n\x1b[35m\u2501\u2501 RESULTS \u2501\u2501\x1b[0m");
    console.log(`  ${PASS} Passed: ${passed}`);
    console.log(`  ${FAIL} Failed: ${failed}`);
    console.log(`  Total:  ${passed + failed}`);
    console.log("");

    if (failed > 0) {
      console.log("\x1b[31m  VERDICT: FAIL\x1b[0m\n");
      process.exit(1);
    } else {
      console.log("\x1b[32m  VERDICT: ALL CLEAR\x1b[0m\n");
    }
  } catch (err) {
    console.error("\n\x1b[31mFATAL ERROR:\x1b[0m", err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
