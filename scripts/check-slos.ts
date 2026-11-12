#!/usr/bin/env tsx
/**
 * check-slos.ts — mesure des SLO déclarés, depuis le conteneur de production.
 *
 * Lancé toutes les 6 h par la tâche planifiée Coolify `slo-check` de l'application
 * La Fusée : `node check-slos.cjs`, bundle construit par le Dockerfile, avec la
 * `DATABASE_URL` du conteneur. GitHub Actions ne joint pas la base de production
 * et ne mesure plus (6.27.585). En local : `npx tsx scripts/check-slos.ts`.
 *
 * Fenêtre glissante (`--rolling-days=N`, 7 par défaut) sur `IntentEmission` ;
 * budgets importés de `src/server/governance/slos.ts`, donc embarqués dans le
 * bundle (l'image ne contient pas `src/`). Comparaison et mise en forme :
 * `src/server/governance/slo-measure.ts`.
 *
 * Sortie : toujours une ligne de résumé datée sur stdout ; `--report` affiche
 * avant elle le détail par kind en Markdown. Aucune marque, aucun secret.
 *
 * Codes de sortie :
 *   0  mesuré, chaque SLO mesuré est tenu ;
 *   1  mesuré, au moins un SLO dépassé ;
 *   2  mesure impossible (DATABASE_URL absente, base injoignable, requête en
 *      erreur, option invalide). Seul un dépassement mesuré sort en 1.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { INTENT_SLOS } from "../src/server/governance/slos";
import {
  describeMeasureFailure,
  formatSloFailure,
  formatSloSummary,
  measureSlo,
  sloExitCode,
  type SloExitCode,
  type SloMeasurement,
} from "../src/server/governance/slo-measure";

const rollingArg = process.argv.find((a) => a.startsWith("--rolling-days="))?.split("=")[1] ?? "7";
const ROLLING_DAYS = /^\d+$/.test(rollingArg) ? Number(rollingArg) : Number.NaN;
const REPORT = process.argv.includes("--report");

let prisma: PrismaClient | undefined;

function makeClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL absente");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

function printReport(measurements: readonly SloMeasurement[]): void {
  const breached = measurements.filter((m) => m.breaches.length > 0);
  console.log(`# Rapport SLO — fenêtre glissante de ${ROLLING_DAYS} j\n`);
  console.log(`Kinds mesurés : ${measurements.length}`);
  console.log(`Dépassés      : ${breached.length}\n`);
  for (const m of measurements) {
    console.log(`## ${m.kind}`);
    console.log(`- Échantillon : ${m.sample}`);
    console.log(`- Latence p95 : ${m.p95LatencyMs} ms`);
    console.log(`- Erreurs     : ${(m.errorRate * 100).toFixed(2)} %`);
    console.log(`- Coût p95    : ${m.costP95Usd.toFixed(4)} $`);
    if (m.breaches.length > 0) {
      console.log(`- Dépassements :`);
      for (const b of m.breaches) console.log(`  - ${b}`);
    } else {
      console.log(`- Tenu`);
    }
    console.log("");
  }
}

async function run(at: Date): Promise<SloExitCode> {
  if (!Number.isInteger(ROLLING_DAYS) || ROLLING_DAYS < 1) {
    console.log(formatSloFailure(at, rollingArg, `--rolling-days invalide : ${rollingArg}`));
    return 2;
  }
  if (INTENT_SLOS.length === 0) {
    console.log(formatSloFailure(at, ROLLING_DAYS, "aucun SLO déclaré dans slos.ts"));
    return 2;
  }

  const client = (prisma = makeClient());
  const since = new Date(at.getTime() - ROLLING_DAYS * 24 * 3600 * 1000);

  // Kinds émis dans la fenêtre : une requête, puis le détail des seuls kinds dotés d'un SLO.
  const emitted = await client.intentEmission.groupBy({
    by: ["intentKind"],
    where: { emittedAt: { gte: since } },
  });
  const emittedKinds = new Set(emitted.map((e) => e.intentKind));

  const measurements: SloMeasurement[] = [];
  for (const slo of INTENT_SLOS) {
    if (!emittedKinds.has(slo.kind)) continue;
    const rows = await client.intentEmission.findMany({
      where: { intentKind: slo.kind, emittedAt: { gte: since } },
      select: { startedAt: true, completedAt: true, status: true, costUsd: true },
    });
    const measurement = measureSlo(
      slo,
      rows.map((r) => ({ ...r, costUsd: r.costUsd === null ? null : Number(r.costUsd.toString()) })),
    );
    if (measurement) measurements.push(measurement);
  }

  if (REPORT) printReport(measurements);
  console.log(formatSloSummary({ at, rollingDays: ROLLING_DAYS, declared: INTENT_SLOS.length, measurements }));
  return sloExitCode(measurements);
}

async function main(): Promise<void> {
  const at = new Date();
  let code: SloExitCode;
  try {
    code = await run(at);
  } catch (err) {
    console.log(formatSloFailure(at, rollingArg, describeMeasureFailure(err)));
    code = 2;
  }
  await prisma?.$disconnect().catch(() => undefined);
  process.exit(code);
}

void main();
