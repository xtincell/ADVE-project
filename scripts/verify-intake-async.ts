#!/usr/bin/env tsx
/**
 * Vérification locale — F1 async intake (fix prod 2026-07-19).
 *
 * Prouve la machine à états du traitement asynchrone SANS clé LLM (les étages
 * qui exigent un provider dégradent honnêtement — c'est aussi ce qu'on vérifie) :
 *
 *   1. pré-flight LLM down  → processShort rejette en SYNCHRONE (PRECONDITION),
 *                             rien n'est réservé, le texte est conservé
 *   2. claim atomique       → 2 réservations concurrentes : UNE seule gagne
 *   3. transition terminale → FAILED seulement depuis PROCESSING ; un succès
 *                             (COMPLETED) n'est JAMAIS écrasé
 *   4. garde paresseuse     → getByToken répare un PROCESSING > 10 min en
 *                             FAILED "timeout" (via la VRAIE procédure)
 *   5. retry                → advance() sur une row FAILED la rouvre
 *                             (IN_PROGRESS, failureReason nettoyée)
 *
 * Usage : DATABASE_URL=… npx tsx scripts/verify-intake-async.ts   (DB locale)
 */

import { db } from "../src/lib/db";
import { createCallerFactory } from "../src/server/trpc/init";
import { quickIntakeRouter } from "../src/server/trpc/routers/quick-intake";

const TOKEN = `verify-async-${process.pid}`;

function assert(cond: unknown, label: string): void {
  if (!cond) throw new Error(`ÉCHEC — ${label}`);
  console.log(`   ✓ ${label}`);
}

async function main() {
  console.log("═══ VÉRIF F1 — machine à états de l'intake asynchrone ═══\n");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const caller = createCallerFactory(quickIntakeRouter)({ db, session: null } as any);

  await db.quickIntake.deleteMany({ where: { shareToken: TOKEN } });
  const intake = await db.quickIntake.create({
    data: {
      contactName: "Vérif NEFER",
      contactEmail: "verify-async@localhost.invalid",
      companyName: "VerifAsync",
      method: "SHORT",
      responses: {},
      shareToken: TOKEN,
    },
  });
  console.log("1. pré-flight LLM down → rejet synchrone, rien réservé");
  const text = "x".repeat(120);
  let threw = false;
  try {
    await caller.processShort({ token: TOKEN, text });
  } catch (err) {
    threw = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("momentanément indisponible"), "message honnête (analyse indisponible)");
  }
  const afterPreflight = await db.quickIntake.findUnique({ where: { id: intake.id } });
  assert(threw, "processShort a rejeté en synchrone (pas d'ack PROCESSING)");
  assert(afterPreflight?.status === "IN_PROGRESS", "row restée IN_PROGRESS (rien réservé)");
  assert(afterPreflight?.rawText === text, "texte utilisateur conservé malgré le rejet");

  console.log("2. claim atomique — un seul gagnant sur deux submits concurrents");
  const claim = () =>
    db.quickIntake.updateMany({
      where: { id: intake.id, status: { in: ["IN_PROGRESS", "FAILED"] } },
      data: { status: "PROCESSING", failureReason: null },
    });
  const [c1, c2] = await Promise.all([claim(), claim()]);
  assert(c1.count + c2.count === 1, `exactement 1 claim gagnant (${c1.count}+${c2.count})`);

  console.log("3. transitions terminales — FAILED depuis PROCESSING seulement");
  const fail = () =>
    db.quickIntake.updateMany({
      where: { id: intake.id, status: "PROCESSING" },
      data: { status: "FAILED", failureReason: "internal" },
    });
  const f1 = await fail();
  assert(f1.count === 1, "PROCESSING → FAILED passe");
  const f2 = await fail();
  assert(f2.count === 0, "FAILED → FAILED est un no-op (garde where)");
  await db.quickIntake.update({ where: { id: intake.id }, data: { status: "COMPLETED" } });
  const f3 = await fail();
  assert(f3.count === 0, "un COMPLETED n'est JAMAIS écrasé par FAILED");

  console.log("4. garde paresseuse getByToken — PROCESSING > 10 min → FAILED timeout");
  // updatedAt forcé en SQL brut (Prisma @updatedAt bump toute écriture client).
  await db.$executeRaw`UPDATE "QuickIntake" SET "status" = 'PROCESSING', "failureReason" = NULL, "updatedAt" = NOW() - INTERVAL '11 minutes' WHERE "id" = ${intake.id}`;
  const repaired = await caller.getByToken({ token: TOKEN });
  assert(repaired?.status === "FAILED", "getByToken a réparé la row coincée");
  assert(repaired?.failureReason === "timeout", "raison honnête = timeout");

  console.log("5. retry — advance() rouvre une row FAILED");
  const advanced = await caller.advance({
    token: TOKEN,
    responses: { a: { a_vision: "Devenir la référence du test local." } },
  });
  const afterAdvance = await db.quickIntake.findUnique({ where: { id: intake.id } });
  assert(afterAdvance?.status === "IN_PROGRESS", "FAILED → IN_PROGRESS au retour questionnaire");
  assert(afterAdvance?.failureReason === null, "failureReason nettoyée");
  assert(Array.isArray(advanced.questions), "advance sert les questions (banque statique sans LLM)");

  await db.quickIntake.deleteMany({ where: { shareToken: TOKEN } });
  console.log("\n═══ TOUT VERT — machine à états F1 vérifiée sur DB locale ═══");
}

main()
  .catch((err) => {
    console.error("\nÉCHEC VÉRIF:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
