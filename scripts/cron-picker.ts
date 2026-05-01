/**
 * Sprint B — cron-picker.ts
 *
 * Daemon que lit `Process` rows avec `nextRunAt <= NOW()` + `status=STOPPED`
 * et `playbook.command` non-null, exécute la commande et met à jour
 * lastRunAt + nextRunAt + runCount.
 *
 * Usage : `npx tsx scripts/cron-picker.ts` (single pass) ou
 *         `npx tsx scripts/cron-picker.ts --watch` (boucle 60s).
 *
 * À déployer côté Vercel Cron / GitHub Actions / Kubernetes CronJob.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { spawn } from "node:child_process";

function makeClient() {
  const cs = process.env.DATABASE_URL;
  if (!cs) throw new Error("DATABASE_URL not set.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: cs }) });
}

function computeNextRun(frequency: string | null): Date | null {
  if (!frequency) return null;
  const now = new Date();
  const m = frequency.match(/^every\s+(\d+)\s*(m|h|d)$/i);
  if (m) {
    const amount = parseInt(m[1]!, 10);
    const unit = m[2]!.toLowerCase();
    const ms = unit === "m" ? amount * 60_000 : unit === "h" ? amount * 3_600_000 : amount * 86_400_000;
    return new Date(now.getTime() + ms);
  }
  switch (frequency.toLowerCase()) {
    case "hourly":  return new Date(now.getTime() + 3_600_000);
    case "daily":   return new Date(now.getTime() + 86_400_000);
    case "weekly":  return new Date(now.getTime() + 7 * 86_400_000);
    case "monthly": return new Date(now.getTime() + 30 * 86_400_000);
    default:        return null;
  }
}

async function execCommand(cmd: string): Promise<{ ok: boolean; durationMs: number; stderr: string }> {
  const start = Date.now();
  const [bin, ...args] = cmd.split(/\s+/);
  return new Promise((resolve) => {
    const child = spawn(bin!, args, { env: { ...process.env }, stdio: ["ignore", "inherit", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    child.on("close", (code) => {
      resolve({ ok: code === 0, durationMs: Date.now() - start, stderr: stderr.slice(0, 2000) });
    });
  });
}

async function pickAndExec(prisma: PrismaClient): Promise<number> {
  const now = new Date();
  type Row = { id: string; name: string; frequency: string | null; playbook: unknown };
  const rows = (await prisma.process.findMany({
    where: { nextRunAt: { lte: now }, status: "STOPPED", type: "BATCH" },
    select: { id: true, name: true, frequency: true, playbook: true },
    take: 25,
  })) as Row[];

  let executed = 0;
  for (const row of rows) {
    const playbook = (row.playbook ?? {}) as { command?: string; kind?: string };
    if (!playbook.command || playbook.kind !== "audit-cron") continue;

    await prisma.process.update({
      where: { id: row.id },
      data: { status: "RUNNING", lastRunAt: now, runCount: { increment: 1 } },
    });

    const result = await execCommand(playbook.command);

    await prisma.process.update({
      where: { id: row.id },
      data: {
        status: "STOPPED",
        nextRunAt: computeNextRun(row.frequency),
        playbook: {
          ...playbook,
          lastResult: { ok: result.ok, durationMs: result.durationMs, ranAt: now.toISOString() },
          lastStderr: result.stderr,
        },
      },
    });
    executed++;
    console.log(`[picker] ${row.name} → ${result.ok ? "OK" : "FAIL"} in ${result.durationMs}ms`);
  }
  return executed;
}

async function main() {
  const watch = process.argv.includes("--watch");
  const prisma = makeClient();
  try {
    if (!watch) {
      const n = await pickAndExec(prisma);
      console.log(`[picker] one-shot pass — ${n} processes executed.`);
      return;
    }
    console.log("[picker] watch mode — polling every 60s. Ctrl+C to stop.");
    while (true) {
      try {
        await pickAndExec(prisma);
      } catch (e) {
        console.error("[picker] iteration failed:", e);
      }
      await new Promise((r) => setTimeout(r, 60_000));
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error("cron-picker FAILED:", e); process.exit(1); });
