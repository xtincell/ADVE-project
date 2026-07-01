/* eslint-disable no-console */
import { regenerateAnalysis } from "@/server/services/quick-intake";
import { db } from "@/lib/db";

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const tokenOrId = args.find((a) => !a.startsWith("--"));
  if (!tokenOrId) {
    console.error("Usage: tsx scripts/regen-intake.ts <token-or-id> [--force]");
    process.exit(1);
  }

  let intake = await db.quickIntake.findUnique({ where: { shareToken: tokenOrId } });
  intake = intake ?? (await db.quickIntake.findUnique({ where: { id: tokenOrId } }));
  if (!intake) throw new Error(`Intake not found: ${tokenOrId}`);

  console.log(`Regenerating intake ${intake.id} (token=${intake.shareToken})${force ? " [FORCE]" : ""}`);
  console.log(`  declared: sector=${intake.sector} businessModel=${intake.businessModel} positioning=${intake.positioning}`);

  const result = await regenerateAnalysis(intake.shareToken, { force });
  console.log(`DONE — strategyId=${result.strategyId} classification=${result.classification}`);
  console.log(`  composite=${result.vector.composite}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
