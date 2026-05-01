/**
 * audit-crew-fit.ts — drift detector for Imhotep matching (ADR-0010 §10).
 *
 * Corrèle Mission.outcome (status FAILED sans veto Thot) avec
 * team.composition (assigneeId / driverSpecialties.specialty) — flagge
 * si pattern de pertes corrélées à un creator/composition particulière.
 *
 * Sortie : tableau `creatorRiskScore` ordonné desc + warning si un
 * creator dépasse `FAIL_RATE_THRESHOLD` sur >=4 missions sur 90 jours.
 *
 * Usage : `npx tsx scripts/audit-crew-fit.ts [--strict]`
 *   --strict : exit 1 si au moins un creator au-dessus du seuil.
 *
 * Cron : weekly (sunday 03:00). Output ingéré par Seshat tarsis.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const FAIL_RATE_THRESHOLD = 0.35; // 35% missions failed on this creator
const MIN_MISSIONS_FOR_SIGNAL = 4;
const WINDOW_DAYS = 90;

function makeClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set — Prisma 7 driver adapter requires it.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

interface CreatorRisk {
  userId: string;
  displayName: string;
  totalMissions: number;
  failedMissions: number;
  failRate: number;
  bucket: string | null;
  lastFailureAt: Date | null;
}

async function audit(): Promise<{ creatorRisks: CreatorRisk[]; warnings: string[] }> {
  const prisma = makeClient();
  try {
    const since = new Date(Date.now() - WINDOW_DAYS * 86400_000);

    type MissionRow = {
      id: string;
      status: string;
      assigneeId: string | null;
      createdAt: Date;
      updatedAt: Date;
    };
    const missions = (await prisma.mission.findMany({
      where: { createdAt: { gte: since } },
      select: { id: true, status: true, assigneeId: true, createdAt: true, updatedAt: true },
    })) as MissionRow[];

    const byUser = new Map<string, { total: number; failed: number; lastFailureAt: Date | null }>();
    for (const m of missions) {
      if (!m.assigneeId) continue;
      const entry = byUser.get(m.assigneeId) ?? { total: 0, failed: 0, lastFailureAt: null };
      entry.total++;
      if (m.status === "FAILED" || m.status === "REJECTED") {
        entry.failed++;
        if (!entry.lastFailureAt || m.updatedAt > entry.lastFailureAt) {
          entry.lastFailureAt = m.updatedAt;
        }
      }
      byUser.set(m.assigneeId, entry);
    }

    const userIds = Array.from(byUser.keys());
    type ProfileRow = {
      userId: string;
      displayName: string;
      driverSpecialties: unknown;
    };
    const profiles = (await prisma.talentProfile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, displayName: true, driverSpecialties: true },
    })) as ProfileRow[];
    const byUserProfile = new Map<string, ProfileRow>(
      profiles.map((p: ProfileRow) => [p.userId, p]),
    );

    const creatorRisks: CreatorRisk[] = [];
    for (const [userId, stats] of byUser.entries()) {
      if (stats.total < MIN_MISSIONS_FOR_SIGNAL) continue;
      const failRate = stats.failed / stats.total;
      const profile = byUserProfile.get(userId);
      const ds = profile?.driverSpecialties as { specialty?: string } | null | undefined;
      creatorRisks.push({
        userId,
        displayName: profile?.displayName ?? "(unknown)",
        totalMissions: stats.total,
        failedMissions: stats.failed,
        failRate: Math.round(failRate * 1000) / 10,
        bucket: ds?.specialty ?? null,
        lastFailureAt: stats.lastFailureAt,
      });
    }
    creatorRisks.sort((a, b) => b.failRate - a.failRate);

    const warnings: string[] = creatorRisks
      .filter((c) => c.failRate / 100 >= FAIL_RATE_THRESHOLD)
      .map(
        (c) =>
          `[CREW-FIT-WARN] ${c.displayName} (${c.userId}) — failRate=${c.failRate}% on ${c.totalMissions} missions (bucket=${c.bucket ?? "n/a"}, lastFailureAt=${c.lastFailureAt?.toISOString() ?? "n/a"})`,
      );

    return { creatorRisks, warnings };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const strict = process.argv.includes("--strict");
  const { creatorRisks, warnings } = await audit();

  console.log(`\n=== audit-crew-fit (window=${WINDOW_DAYS}d, threshold=${Math.round(FAIL_RATE_THRESHOLD * 100)}%) ===\n`);
  if (creatorRisks.length === 0) {
    console.log("[OK] No creators meet the minimum mission count for analysis.");
  } else {
    console.log(`Top creators by failRate:`);
    for (const c of creatorRisks.slice(0, 10)) {
      console.log(
        `  ${c.failRate.toFixed(1).padStart(5)}%  total=${String(c.totalMissions).padStart(3)}  failed=${String(c.failedMissions).padStart(2)}  ${c.displayName.padEnd(30)} [${c.bucket ?? "-"}]`,
      );
    }
  }
  if (warnings.length > 0) {
    console.log(`\nWarnings (${warnings.length}):`);
    for (const w of warnings) console.log(`  ${w}`);
    if (strict) {
      console.error(`\n[strict] ${warnings.length} creator(s) over threshold — exit 1.`);
      process.exit(1);
    }
  } else {
    console.log("\n[OK] No creator over threshold.");
  }
}

main().catch((e) => {
  console.error("audit-crew-fit FAILED:", e);
  process.exit(1);
});
