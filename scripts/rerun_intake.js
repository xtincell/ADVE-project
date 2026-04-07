/**
 * Re-run complete() on an existing intake to test fixes.
 * Resets the intake to IN_PROGRESS, deletes old pillars/strategy, then re-completes.
 *
 * Usage: node scripts/rerun_intake.js <shareToken>
 */
const { PrismaClient } = require("@prisma/client");

(async () => {
  const token = process.argv[2];
  if (!token) {
    console.error("Usage: node scripts/rerun_intake.js <shareToken>");
    process.exit(1);
  }

  const db = new PrismaClient();

  try {
    const intake = await db.quickIntake.findUnique({ where: { shareToken: token } });
    if (!intake) { console.error("Intake not found"); process.exit(1); }

    console.log(`Resetting intake for ${intake.companyName} (${token})...`);
    console.log(`  Method: ${intake.method}`);
    console.log(`  RawText: ${intake.rawText ? intake.rawText.slice(0, 100) + "..." : "NONE"}`);

    // Delete old pillars and strategy
    if (intake.convertedToId) {
      await db.pillar.deleteMany({ where: { strategyId: intake.convertedToId } });
      // Delete deals linked to this intake
      await db.deal.deleteMany({ where: { intakeId: intake.id } });
      await db.strategy.delete({ where: { id: intake.convertedToId } }).catch(() => {});
    }

    // Reset intake to IN_PROGRESS
    await db.quickIntake.update({
      where: { id: intake.id },
      data: {
        status: "IN_PROGRESS",
        advertis_vector: null,
        classification: null,
        diagnostic: null,
        convertedToId: null,
        completedAt: null,
      },
    });

    console.log("Reset done. Now calling complete via API...");

    // Call processShort or complete depending on method
    const base = "http://localhost:3001/api/trpc";
    const headers = { "Content-Type": "application/json" };

    let endpoint, input;
    if (intake.method === "SHORT" && intake.rawText) {
      endpoint = "quickIntake.processShort";
      input = { token, text: intake.rawText };
      console.log("Using processShort (SHORT method with rawText)");
    } else {
      endpoint = "quickIntake.complete";
      input = { token };
      console.log("Using complete (LONG method)");
    }

    const res = await fetch(base, {
      method: "POST",
      headers,
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "call",
        params: { input, path: endpoint, type: "mutation" },
      }),
    });

    const body = await res.text();
    try {
      const json = JSON.parse(body);
      if (json.result?.data) {
        const d = json.result.data;
        console.log("\nResult:");
        console.log(`  Score: ${d.vector?.composite?.toFixed(1)}/100`);
        console.log(`  Classification: ${d.classification}`);
        console.log(`  Strategy: ${d.strategyId}`);

        // Check pillar content
        const pillars = await db.pillar.findMany({ where: { strategyId: d.strategyId } });
        for (const p of pillars) {
          const content = p.content;
          const keys = content ? Object.keys(content) : [];
          console.log(`  Pillar ${p.key.toUpperCase()}: ${keys.length} fields`);
          // Show first key-value to verify content is relevant
          if (keys.length > 0 && content) {
            const firstKey = keys[0];
            const firstVal = content[firstKey];
            const preview = typeof firstVal === "string" ? firstVal.slice(0, 80) : JSON.stringify(firstVal).slice(0, 80);
            console.log(`    ${firstKey}: ${preview}...`);
          }
        }
      } else {
        console.error("Error:", JSON.stringify(json, null, 2).slice(0, 1000));
      }
    } catch {
      console.error("Non-JSON response:", res.status, body.slice(0, 500));
    }
  } finally {
    await db.$disconnect();
  }
})();
