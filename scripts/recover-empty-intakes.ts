/**
 * scripts/recover-empty-intakes.ts
 *
 * Detects QuickIntake rows whose `responses` field has zero substantive
 * content across all phases — these are casualties of the empty-payload
 * bug fixed in commit X. For each casualty:
 *  - Resets `responses` to `{}` (clean slate, drops the orphan empty keys)
 *  - Sets status back to `IN_PROGRESS` so the form can be re-opened
 *  - Detaches and deletes the placeholder Strategy created by `complete()`
 *    when `convertedToId` is set (its pillars/score are all zero — useless)
 *
 * Run with `--apply` to execute. Without it, the script prints what it
 * would do.
 *
 * The function `hasSubstantiveAnswer` is duplicated here intentionally —
 * keeping it server-side AND in this script means a future change to the
 * service won't silently break this recovery tool.
 */

import { Prisma, PrismaClient } from "@prisma/client";

const APPLY = process.argv.includes("--apply");
const ONLY_TOKEN = process.argv.find((a) => a.startsWith("--token="))?.slice("--token=".length);
const db = new PrismaClient();

function hasSubstantiveAnswer(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.some((v) => hasSubstantiveAnswer(v));
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((v) => hasSubstantiveAnswer(v));
  }
  return false;
}

const STRATEGY_CHILD_TABLES: ReadonlyArray<string> = [
  "AmbassadorProgram",
  "AttributionEvent",
  "BrandAsset",
  "BrandDataSource",
  "BrandVariable",
  "Campaign",
  "CohortSnapshot",
  "CommunitySnapshot",
  "Contract",
  "CultIndexSnapshot",
  "Deal",
  "DevotionSnapshot",
  "Driver",
  "FrameworkResult",
  "GloryOutput",
  "InsightReport",
  "JehutyCuration",
  "MarketStudy",
  "MediaPlatformConnection",
  "Mission",
  "OrchestrationPlan",
  "Pillar",
  "PressClipping",
  "PressRelease",
  "Process",
  "Recommendation",
  "RecommendationBatch",
  "ScoreSnapshot",
  "SequenceExecution",
  "Signal",
  "SocialConnection",
  "SocialPost",
  "StrategyDoc",
  "SuperfanProfile",
];

async function purgeStrategy(strategyId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    for (const table of STRATEGY_CHILD_TABLES) {
      await tx.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "strategyId" = $1`, strategyId);
    }
    await tx.$executeRawUnsafe(`DELETE FROM "Strategy" WHERE "id" = $1`, strategyId);
  });
}

async function main() {
  console.log(`[recover-empty-intakes] mode=${APPLY ? "APPLY" : "DRY-RUN"}${ONLY_TOKEN ? ` token=${ONLY_TOKEN}` : ""}`);

  const intakes = await db.quickIntake.findMany({
    where: ONLY_TOKEN
      ? { OR: [{ id: ONLY_TOKEN }, { shareToken: ONLY_TOKEN }] }
      : { status: { in: ["COMPLETED", "CONVERTED", "IN_PROGRESS"] } },
    select: {
      id: true,
      shareToken: true,
      companyName: true,
      status: true,
      responses: true,
      convertedToId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`scanned ${intakes.length} intakes`);

  let casualties = 0;
  for (const intake of intakes) {
    const responses = (intake.responses as Record<string, unknown> | null) ?? {};
    const totalKeys = Object.keys(responses).length;
    const substantiveKeys = Object.entries(responses).filter(([, v]) => hasSubstantiveAnswer(v)).map(([k]) => k);

    if (totalKeys === 0) continue; // pristine intake, nothing to recover
    if (substantiveKeys.length > 0) continue; // has real content, leave alone

    casualties++;
    console.log(
      `\n  CASUALTY: ${intake.id} "${intake.companyName}" (status=${intake.status}, totalKeys=${totalKeys}, substantive=0)` +
        (intake.convertedToId ? `\n    placeholder strategy: ${intake.convertedToId}` : ""),
    );
    if (!APPLY) continue;

    // Detach and purge the placeholder strategy first
    if (intake.convertedToId) {
      await purgeStrategy(intake.convertedToId);
      console.log(`    purged strategy ${intake.convertedToId}`);
    }

    // Critical: pass `Prisma.JsonNull` to actually clear JSON columns.
    // Passing `undefined` is a no-op in Prisma (means "leave as is"); the
    // earlier version of this script left `diagnostic` populated, which let
    // the result page render a phantom report on a recovered intake.
    await db.quickIntake.update({
      where: { id: intake.id },
      data: {
        responses: Prisma.JsonNull,
        status: "IN_PROGRESS",
        convertedToId: null,
        diagnostic: Prisma.JsonNull,
        advertis_vector: Prisma.JsonNull,
      },
    });
    console.log(`    reset intake ${intake.id} to IN_PROGRESS`);
  }

  console.log(`\n━━━ Summary ━━━`);
  console.log(`  ${casualties} casual${casualties === 1 ? "ty" : "ties"} ${APPLY ? "recovered" : "would be recovered"}`);
  if (!APPLY) console.log("\nRe-run with --apply to execute.");
}

main()
  .catch((err) => {
    console.error("[recover-empty-intakes] FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
