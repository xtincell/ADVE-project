/**
 * Sprint B — drop-scheduler-worker.ts
 *
 * Picks `Notification` rows with title prefix `[DROP <dropId>]` and
 * `createdAt > NOW() - 5min` (drop pre-staged but not yet sent), shells
 * out the appropriate channel handler. For now: marks the notif as
 * dispatched (readAt set) — actual external send (provider call) can be
 * wired here once SMS/Push/Social client services land (Sprint I/J).
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function makeClient() {
  const cs = process.env.DATABASE_URL;
  if (!cs) throw new Error("DATABASE_URL not set.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: cs }) });
}

async function main() {
  const prisma = makeClient();
  try {
    const now = new Date();
    type N = { id: string; title: string; channel: string; isRead: boolean };
    const drops = (await prisma.notification.findMany({
      where: {
        title: { startsWith: "[DROP " },
        isRead: false,
        createdAt: { gte: new Date(now.getTime() - 5 * 60_000) },
      },
      select: { id: true, title: true, channel: true, isRead: true },
      take: 200,
    })) as N[];

    let dispatched = 0;
    for (const n of drops) {
      // For now: mark as dispatched. External send wired in Sprint I/J.
      await prisma.notification.update({
        where: { id: n.id },
        data: { isRead: true, readAt: now },
      });
      dispatched++;
    }
    console.log(`[drop-worker] ${dispatched} drop notifications dispatched.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error("drop-scheduler-worker FAILED:", e); process.exit(1); });
