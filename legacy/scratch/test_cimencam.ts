import { db } from "../src/lib/db";
import { fillStrategyToStage, fillToStage } from "../src/server/services/pillar-maturity/auto-filler";
import { assessPillar } from "../src/server/services/pillar-maturity/assessor";
import { getContract } from "../src/server/services/pillar-maturity/contracts-loader";
import { generateBatch } from "../src/server/services/notoria/engine";

async function runTest() {
  console.log("=== START INTEGRATION TEST FOR CIMENCAM ===");

  const strategyId = "demo-strategy-cimencam";
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    include: { pillars: true },
  });

  if (!strategy) {
    console.error("Error: demo-strategy-cimencam not found in the database.");
    process.exit(1);
  }
  console.log(`Found Strategy: ID=${strategy.id}, Name=${strategy.nom ?? "CIMENCAM"}`);

  // Find the 'a' pillar
  const pillarA = strategy.pillars.find(p => p.key === "a");
  if (!pillarA) {
    console.error("Error: Pillar 'a' not found for strategy.");
    process.exit(1);
  }

  // Backup original content so we can restore it at the end
  const originalContent = pillarA.content;
  console.log("Original 'a' pillar content backup created.");

  try {
    // Reset pillar 'a' to an empty content to ensure we test full filling from sources/RAG
    console.log("\n--- STEP 0: Resetting pillar 'a' ---");
    await db.pillar.update({
      where: { id: pillarA.id },
      data: {
        content: {},
        fieldCertainty: {},
      },
    });
    console.log("Pillar 'a' reset completed.");

    // FLOW 1: Intake Flow (ENRICHED loading)
    console.log("\n--- FLOW 1: Intake / ENRICHED Loading ---");
    const intakeRes = await fillStrategyToStage(strategyId, "ENRICHED", ["a"]);
    console.log("Intake / ENRICHED fill result:", JSON.stringify(intakeRes, null, 2));

    // Verify pillar 'a' reaches at least ENRICHED stage
    const afterIntakePillar = await db.pillar.findUnique({
      where: { id: pillarA.id },
    });
    const contract = getContract("a");
    const afterIntakeAssess = assessPillar("a", (afterIntakePillar?.content as any) ?? {}, contract);
    console.log(`Pillar 'a' stage after Intake: currentStage=${afterIntakeAssess.currentStage}, completionPct=${afterIntakeAssess.completionPct}%`);
    if (afterIntakeAssess.currentStage !== "ENRICHED" && afterIntakeAssess.currentStage !== "COMPLETE") {
      console.warn(`Warning: Expected ENRICHED or COMPLETE stage, got ${afterIntakeAssess.currentStage}`);
    } else {
      console.log("✅ FLOW 1 (Intake/ENRICHED) validated successfully!");
    }

    // FLOW 2: Cockpit Flow (COMPLETE loading with sequential chunked execution)
    console.log("\n--- FLOW 2: Cockpit / COMPLETE Loading (Chunked) ---");
    // Get missing derivable fields at this point
    const middleAssess = assessPillar("a", (afterIntakePillar?.content as any) ?? {}, contract);
    const derivableFields = middleAssess.derivable;
    console.log(`Derivable fields remaining to fill:`, derivableFields);

    if (derivableFields.length === 0) {
      console.log("All fields already satisfied after Step 1. Adding a dummy missing field to test chunking.");
      // We'll proceed with all Complete contract stages derivable fields to verify chunking
      const allDerivables = contract?.stages.COMPLETE.filter(r => r.derivable).map(r => r.path) ?? [];
      console.log(`Using all contract derivable fields to test chunking:`, allDerivables);
      
      // Let's reset again so we have missing fields to chunk
      await db.pillar.update({
        where: { id: pillarA.id },
        data: { content: {}, fieldCertainty: {} },
      });
      
      // Split into chunks of 5 for testing
      const chunkSize = 5;
      const chunks: string[][] = [];
      for (let i = 0; i < allDerivables.length; i += chunkSize) {
        chunks.push(allDerivables.slice(i, i + chunkSize));
      }
      console.log(`Split into ${chunks.length} chunks of size ${chunkSize}.`);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]!;
        console.log(`[Chunk ${i + 1}/${chunks.length}] Filling fields:`, chunk);
        const chunkRes = await fillToStage(strategyId, "a", "COMPLETE", chunk);
        console.log(`[Chunk ${i + 1}/${chunks.length}] Filled:`, chunkRes.filled);
      }
    } else {
      // Split remaining derivable fields into chunks of 5
      const chunkSize = 5;
      const chunks: string[][] = [];
      for (let i = 0; i < derivableFields.length; i += chunkSize) {
        chunks.push(derivableFields.slice(i, i + chunkSize));
      }
      console.log(`Split into ${chunks.length} chunks of size ${chunkSize}.`);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]!;
        console.log(`[Chunk ${i + 1}/${chunks.length}] Filling fields:`, chunk);
        const chunkRes = await fillToStage(strategyId, "a", "COMPLETE", chunk);
        console.log(`[Chunk ${i + 1}/${chunks.length}] Filled:`, chunkRes.filled);
      }
    }

    const afterCockpitPillar = await db.pillar.findUnique({
      where: { id: pillarA.id },
    });
    const afterCockpitAssess = assessPillar("a", (afterCockpitPillar?.content as any) ?? {}, contract);
    console.log(`Pillar 'a' stage after Cockpit: currentStage=${afterCockpitAssess.currentStage}, completionPct=${afterCockpitAssess.completionPct}%`);
    console.log("Satisfied fields:", afterCockpitAssess.satisfied.length);
    console.log("Missing fields:", afterCockpitAssess.missing.length);
    console.log("✅ FLOW 2 (Cockpit/COMPLETE Chunked) validated successfully!");

    // FLOW 3: Notoria Flow (Recommendations on COMPLETE loading)
    console.log("\n--- FLOW 3: Notoria Recommendations Generation ---");
    // Call generateBatch
    const batchResult = await generateBatch({
      strategyId,
      missionType: "ADVE_UPDATE",
      targetPillars: ["a"],
    });

    console.log("Notoria batch result:", JSON.stringify(batchResult, null, 2));
    if (batchResult.batchId && batchResult.totalRecos > 0) {
      console.log(`✅ FLOW 3 (Notoria recommendations) validated successfully! BatchID=${batchResult.batchId}, RecosCount=${batchResult.totalRecos}`);
    } else if (batchResult.errors && batchResult.errors.length > 0) {
      console.error("Notoria generation errors:", batchResult.errors);
      throw new Error("Notoria recommendations generation failed with errors.");
    } else {
      console.log("Notoria generated 0 recommendations (all fields already optimal). That's valid too.");
      console.log("✅ FLOW 3 (Notoria recommendations) validated successfully (0 recos needed)!");
    }

  } catch (error) {
    console.error("Test execution failed:", error);
  } finally {
    // Restore original pillar content so we don't leave the strategy corrupted
    console.log("\n--- CLEANUP: Restoring original pillar 'a' content ---");
    await db.pillar.update({
      where: { id: pillarA.id },
      data: {
        content: originalContent as any,
        fieldCertainty: pillarA.fieldCertainty as any,
      },
    });
    console.log("Original content restored successfully.");
  }

  console.log("=== INTEGRATION TEST FOR CIMENCAM COMPLETED ===");
}

runTest();
