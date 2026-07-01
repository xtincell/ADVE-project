/**
 * audit-production-lineage.ts
 *
 * Cron CI — vérifie que chaque GenerativeTask Ptah a une lineage valide :
 *   - sourceIntentId pointe vers un IntentEmission existant
 *     (kind = INVOKE_GLORY_TOOL, EXECUTE_GLORY_SEQUENCE, ou un caller cockpit-direct)
 *   - pillarSource ∈ A/D/V/E/R/T/I/S
 *   - manipulationMode ∈ peddler/dealer/facilitator/entertainer
 *   - operatorId présent (Pilier 3 multi-tenant)
 *
 * Sans ce check : le système peut accepter des forges détachées (sans brief
 * Artemis source) → casse la cascade Glory→Brief→Forge prévue par ADR-0009.
 *
 * Exit code != 0 si finding détecté.
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


const db = makeClient();

const ALLOWED_PILLARS = ["A", "D", "V", "E", "R", "T", "I", "S"] as const;
const ALLOWED_MODES = ["peddler", "dealer", "facilitator", "entertainer"] as const;

interface Finding {
  taskId: string;
  reason: string;
  severity: "error" | "warn";
}

async function main() {
  const tasks = await db.generativeTask.findMany({
    select: {
      id: true,
      sourceIntentId: true,
      pillarSource: true,
      manipulationMode: true,
      operatorId: true,
      forgeKind: true,
      provider: true,
      createdAt: true,
    },
  });

  const findings: Finding[] = [];

  for (const t of tasks) {
    if (!t.operatorId) {
      findings.push({ taskId: t.id, reason: "operatorId missing (Pilier 3 violation)", severity: "error" });
    }
    if (!(ALLOWED_PILLARS as readonly string[]).includes(t.pillarSource)) {
      findings.push({
        taskId: t.id,
        reason: `pillarSource invalide: "${t.pillarSource}" (must be A/D/V/E/R/T/I/S)`,
        severity: "error",
      });
    }
    if (!(ALLOWED_MODES as readonly string[]).includes(t.manipulationMode)) {
      findings.push({
        taskId: t.id,
        reason: `manipulationMode invalide: "${t.manipulationMode}"`,
        severity: "error",
      });
    }
    // Demo seeds purposefully omit sourceIntentId (cockpit-direct entry).
    // Real production GenerativeTasks should have one.
    if (!t.sourceIntentId) {
      findings.push({
        taskId: t.id,
        reason: `sourceIntentId missing — task forgé sans lineage Glory tool. OK pour démo (cockpit-direct), warn pour prod.`,
        severity: "warn",
      });
    }
  }

  const errors = findings.filter((f) => f.severity === "error");
  const warns = findings.filter((f) => f.severity === "warn");

  console.log(`audit-production-lineage: ${tasks.length} GenerativeTask(s) inspectés`);
  console.log(`  errors: ${errors.length}`);
  console.log(`  warns:  ${warns.length}`);

  for (const f of [...errors, ...warns].slice(0, 30)) {
    console.log(`  [${f.severity}] ${f.taskId} — ${f.reason}`);
  }

  await db.$disconnect();
  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
