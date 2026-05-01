/**
 * Q6A — register the Imhotep + Anubis weekly audits with the process-scheduler.
 *
 * Idempotent : si les processes existent déjà (par name), ils sont mis à
 * jour ; sinon créés. À lancer une fois post-deploy ou via un seed boot.
 *
 * Usage : `npx tsx scripts/register-imhotep-anubis-cron.ts`
 *
 * Cf. RUNBOOKS.md §R-CREW + §R-ANUBIS.
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

interface CronJob {
  name: string;
  description: string;
  frequency: string;
  command: string;
  governor: "IMHOTEP" | "ANUBIS";
}

const JOBS: readonly CronJob[] = [
  {
    name: "audit-crew-fit-weekly",
    description:
      "ADR-0010 §10 drift detector — flagge creators avec failRate ≥ 35% sur ≥ 4 missions / 90 jours. Output ingéré par Seshat Tarsis.",
    frequency: "weekly",
    command: "npx tsx scripts/audit-crew-fit.ts",
    governor: "IMHOTEP",
  },
  {
    name: "audit-anubis-conversion-weekly",
    description:
      "ADR-0011 §10 drift detector — flagge campaignAmplification avec costPerSuperfan ≥ 2× benchmark sectoriel sur 30 jours.",
    frequency: "weekly",
    command: "npx tsx scripts/audit-anubis-conversion.ts",
    governor: "ANUBIS",
  },
  {
    name: "anubis-sync-campaign-metrics-hourly",
    description:
      "ADR-0011 §8 — pull metrics provider (Meta/Google/TikTok/X) pour toutes les CampaignAmplification status=RUNNING et update CampaignAmplification + MediaPerformanceSync. Complément des webhooks (push) — utile pour les providers où les webhooks ne sont pas configurés.",
    frequency: "hourly",
    command: "npx tsx scripts/sync-anubis-campaigns.ts",
    governor: "ANUBIS",
  },
];

function computeFirstRun(frequency: string): Date {
  // Weekly = 7 days from now. Boot-time scheduler will refine this.
  if (frequency === "weekly") {
    const next = new Date();
    next.setDate(next.getDate() + 7);
    next.setHours(3, 0, 0, 0);
    return next;
  }
  return new Date();
}

async function main() {
  const prisma = makeClient();
  try {
    let created = 0;
    let updated = 0;
    for (const job of JOBS) {
      const existing = await prisma.process.findFirst({
        where: { name: job.name },
        select: { id: true },
      });
      if (existing) {
        await prisma.process.update({
          where: { id: existing.id },
          data: {
            description: job.description,
            frequency: job.frequency,
            type: "BATCH",
            status: "STOPPED",
            playbook: {
              command: job.command,
              governor: job.governor,
              kind: "audit-cron",
              source: "register-imhotep-anubis-cron.ts",
            },
            nextRunAt: computeFirstRun(job.frequency),
          },
        });
        updated++;
      } else {
        await prisma.process.create({
          data: {
            name: job.name,
            description: job.description,
            frequency: job.frequency,
            type: "BATCH",
            status: "STOPPED",
            priority: 7,
            playbook: {
              command: job.command,
              governor: job.governor,
              kind: "audit-cron",
              source: "register-imhotep-anubis-cron.ts",
            },
            nextRunAt: computeFirstRun(job.frequency),
          },
        });
        created++;
      }
    }
    console.log(
      `[OK] Imhotep + Anubis cron registered. created=${created}, updated=${updated}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("register-imhotep-anubis-cron FAILED:", e);
  process.exit(1);
});
