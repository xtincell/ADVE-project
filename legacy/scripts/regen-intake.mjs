#!/usr/bin/env node
/**
 * One-off regeneration helper — re-runs `quickIntakeService.regenerateAnalysis`
 * on a specific intake (by shareToken or id). Used after fixing extraction
 * drift to refresh stale analyses without going through the admin UI.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/regen-intake.mjs <token-or-id>
 */
import { spawn } from "node:child_process";

const token = process.argv[2];
if (!token) {
  console.error("Usage: node scripts/regen-intake.mjs <token-or-id>");
  process.exit(1);
}

// Run via tsx so the TypeScript service code is loaded with the project's
// path aliases + Prisma adapter resolved.
const child = spawn(
  "npx",
  ["tsx", "-e", `
    import { regenerateAnalysis } from "@/server/services/quick-intake";
    import { db } from "@/lib/db";
    const tokenOrId = ${JSON.stringify(token)};
    let intake = await db.quickIntake.findUnique({ where: { shareToken: tokenOrId } });
    intake = intake ?? await db.quickIntake.findUnique({ where: { id: tokenOrId } });
    if (!intake) throw new Error("Intake not found: " + tokenOrId);
    console.log("Regenerating intake", intake.id, "(token=" + intake.shareToken + ")");
    const result = await regenerateAnalysis(intake.shareToken);
    console.log("DONE — strategyId=" + result.strategyId + " classification=" + result.classification);
    await db.$disconnect();
  `],
  { stdio: "inherit", shell: true },
);
child.on("exit", (code) => process.exit(code ?? 0));
