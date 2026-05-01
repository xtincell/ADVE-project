/**
 * Sync wrapper — appelle `syncCampaignMetrics` pour chaque
 * `CampaignAmplification` avec status=RUNNING. Lancé hourly par le
 * cron-picker (cf. register-imhotep-anubis-cron.ts).
 *
 * Mode `--strict` : exit 1 si > N% des campagnes ont échoué la sync.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { syncCampaignMetrics } from "@/server/services/media-activation-engine";

function makeClient() {
  const cs = process.env.DATABASE_URL;
  if (!cs) throw new Error("DATABASE_URL not set.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: cs }) });
}

async function main() {
  const strict = process.argv.includes("--strict");
  const prisma = makeClient();
  let attempted = 0, succeeded = 0, failed = 0;
  try {
    type Row = { id: string };
    const running = (await prisma.campaignAmplification.findMany({
      where: { status: "RUNNING" },
      select: { id: true },
      take: 200,
    })) as Row[];

    for (const r of running) {
      attempted++;
      try {
        const result = await syncCampaignMetrics(r.id);
        if (result) {
          succeeded++;
          if (result.delta.conversions > 0) {
            console.log(
              `[sync] ${r.id} +${result.delta.conversions} conv, +${result.delta.spend.toFixed(2)} spend, +${result.newSuperfans} superfans`,
            );
          }
        } else {
          failed++;
        }
      } catch (e) {
        failed++;
        console.error(`[sync] ${r.id} failed:`, (e as Error).message);
      }
    }

    const failRate = attempted === 0 ? 0 : failed / attempted;
    console.log(
      `\n[sync-campaigns] attempted=${attempted} ok=${succeeded} failed=${failed} (failRate=${(failRate * 100).toFixed(1)}%)`,
    );
    if (strict && failRate > 0.5) {
      console.error("[strict] failRate > 50% — exit 1.");
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error("sync-anubis-campaigns FAILED:", e); process.exit(1); });
