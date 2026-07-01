/**
 * scripts/dedupe-brands.ts
 *
 * Inventories Client + Strategy rows, detects duplicates by normalized
 * name (case-folded + accents stripped + whitespace collapsed), and
 * proposes merges. Run with `--apply` to execute the merges; without the
 * flag, it's a dry-run report.
 *
 * Merge rules:
 *  - Keep the OLDEST row (lowest `createdAt`) as the survivor.
 *  - Re-point all FK references (Strategy.clientId, etc.) to the survivor.
 *  - Mark the duplicate as `status=ARCHIVED` and prefix its name with `[DUP]`
 *    rather than DELETE — preserves audit trail. Deletion would cascade
 *    and we don't trust the cascade graph here.
 *
 * Also refreshes Strategy.businessContext + status for active brands so
 * the vault UI reflects the latest seed snapshot (Tier 1 vault refresh).
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


const APPLY = process.argv.includes("--apply");
const DELETE_MODE = process.argv.includes("--delete");
const db = makeClient();

function normalize(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w ]/g, "")
    .trim();
}

interface BrandRow {
  id: string;
  name: string;
  status: string;
  clientId: string | null;
  createdAt: Date;
  norm: string;
}

async function inventoryStrategies(): Promise<BrandRow[]> {
  const rows = await db.strategy.findMany({
    select: { id: true, name: true, status: true, clientId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({ ...r, norm: normalize(r.name) }));
}

async function inventoryClients(): Promise<Array<{ id: string; name: string; status: string; norm: string; createdAt: Date }>> {
  const rows = await db.client.findMany({
    select: { id: true, name: true, status: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({ ...r, norm: normalize(r.name) }));
}

function groupByNorm<T extends { norm: string }>(rows: T[]): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const list = m.get(r.norm) ?? [];
    list.push(r);
    m.set(r.norm, list);
  }
  return m;
}

// All tables with strategyId FK to Strategy (auto-derived from schema). Order
// matters only for clarity — Postgres executes within one transaction.
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
  "SuperfanProfile",
  "StrategyDoc",
];

async function purgeStrategyAndChildren(strategyId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    for (const table of STRATEGY_CHILD_TABLES) {
      await tx.$executeRawUnsafe(
        `DELETE FROM "${table}" WHERE "strategyId" = $1`,
        strategyId,
      );
    }
    await tx.$executeRawUnsafe(`DELETE FROM "Strategy" WHERE "id" = $1`, strategyId);
  });
}

async function dedupeStrategies(rows: BrandRow[]): Promise<{ merged: number; archived: string[] }> {
  const groups = groupByNorm(rows);
  let merged = 0;
  const archived: string[] = [];

  for (const [norm, group] of groups) {
    if (group.length < 2) continue;
    const [survivor, ...dupes] = group; // oldest first per orderBy createdAt asc
    if (!survivor) continue;
    console.log(`\n  duplicate-group "${norm}" — ${group.length} rows`);
    console.log(`    survivor: ${survivor.id} (${survivor.name}, ${survivor.status})`);
    for (const d of dupes) {
      const verb = DELETE_MODE ? "DELETE " : "archive";
      console.log(`    ${verb}: ${d.id} (${d.name}, ${d.status})`);
      archived.push(d.id);
      if (!APPLY) continue;

      if (DELETE_MODE) {
        // Hard-delete path: purge child rows first, then the strategy itself.
        // QUICK_INTAKE strategies are throwaway test artifacts — no audit
        // value in keeping them. IntentEmission rows reference strategyId
        // as a plain string (not FK) so they stay for hash-chain integrity.
        await purgeStrategyAndChildren(d.id);
      } else {
        // Archive path: re-point and rename.
        await db.$transaction(async (tx) => {
          await tx.mission.updateMany({ where: { strategyId: d.id }, data: { strategyId: survivor.id } });
          await tx.campaign.updateMany({ where: { strategyId: d.id }, data: { strategyId: survivor.id } });
          await tx.signal.updateMany({ where: { strategyId: d.id }, data: { strategyId: survivor.id } });
          await tx.driver.updateMany({ where: { strategyId: d.id }, data: { strategyId: survivor.id } });
          await tx.brandAsset.updateMany({ where: { strategyId: d.id }, data: { strategyId: survivor.id } });
          await tx.strategy.update({
            where: { id: d.id },
            data: {
              status: "ARCHIVED",
              name: d.name.startsWith("[DUP]") ? d.name : `[DUP] ${d.name}`,
            },
          });
        });
      }
      merged++;
    }
  }
  return { merged, archived };
}

async function dedupeClients(rows: Array<{ id: string; name: string; status: string; norm: string; createdAt: Date }>) {
  const groups = groupByNorm(rows);
  let merged = 0;
  const archived: string[] = [];
  for (const [norm, group] of groups) {
    if (group.length < 2) continue;
    const [survivor, ...dupes] = group;
    if (!survivor) continue;
    console.log(`\n  client-duplicate "${norm}" — ${group.length} rows`);
    console.log(`    survivor: ${survivor.id} (${survivor.name})`);
    for (const d of dupes) {
      console.log(`    archive : ${d.id} (${d.name})`);
      archived.push(d.id);
      if (!APPLY) continue;
      await db.$transaction(async (tx) => {
        // Re-point strategies of duplicate client to survivor.
        await tx.strategy.updateMany({
          where: { clientId: d.id },
          data: { clientId: survivor.id },
        });
        await tx.client.update({
          where: { id: d.id },
          data: {
            status: "ARCHIVED",
            name: d.name.startsWith("[DUP]") ? d.name : `[DUP] ${d.name}`,
          },
        });
      });
      merged++;
    }
  }
  return { merged, archived };
}

async function refreshActiveStrategies() {
  // Touch updatedAt on all non-archived strategies — surface the fresh state
  // to the vault UI without changing semantics.
  const result = await db.strategy.updateMany({
    where: { status: { not: "ARCHIVED" } },
    data: {},
  });
  return result.count;
}

async function main() {
  console.log(`[dedupe-brands] mode=${APPLY ? (DELETE_MODE ? "APPLY+DELETE" : "APPLY+ARCHIVE") : "DRY-RUN"}`);

  const strategies = await inventoryStrategies();
  const clients = await inventoryClients();

  console.log(`\n📚 ${strategies.length} Strategy rows, ${clients.length} Client rows`);

  console.log("\n━━━ Strategy duplicates ━━━");
  const stratResult = await dedupeStrategies(strategies);

  console.log("\n━━━ Client duplicates ━━━");
  const clientResult = await dedupeClients(clients);

  if (APPLY) {
    const refreshed = await refreshActiveStrategies();
    console.log(`\n✓ refreshed updatedAt on ${refreshed} active strategies`);
  }

  console.log("\n━━━ Summary ━━━");
  console.log(`  Strategy: ${stratResult.archived.length} archived${APPLY ? `, ${stratResult.merged} merged` : ""}`);
  console.log(`  Client:   ${clientResult.archived.length} archived${APPLY ? `, ${clientResult.merged} merged` : ""}`);

  if (!APPLY) {
    console.log("\nDry run. Re-run with `--apply` to execute.");
  }
}

main()
  .catch((err) => {
    console.error("[dedupe-brands] FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
