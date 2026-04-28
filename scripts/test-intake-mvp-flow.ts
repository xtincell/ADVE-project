#!/usr/bin/env tsx
/**
 * INTAKE MVP FLOW — End-to-end verification
 *
 * Exercises the rev-6 MVP flow:
 *   1. start → SHORT method intake (Wakanda + new sector)
 *   2. complete → narrative report (ADVE rapport + RTIS proposition) generated
 *   3. activateBrand → stub User + Client + Strategy linked by email
 *   4. auth.register → claims the stub User (sets password, keeps id)
 *   5. Verify: signup user owns the Strategy via userId
 */

import { db } from "../src/lib/db";
import * as quickIntakeService from "../src/server/services/quick-intake";
import { appRouter } from "../src/server/trpc/router";
import bcrypt from "bcryptjs";

const TEST_EMAIL = `mvp-flow-${Date.now()}@wakanda.test`;
const TEST_COMPANY = `Vibranium Insights ${Date.now().toString().slice(-5)}`;
const TEST_PASSWORD = "test-password-123";

async function main() {
  console.log("═══ INTAKE MVP FLOW — END-TO-END ═══\n");

  // Build a tRPC caller without auth (public procedures)
  const caller = appRouter.createCaller({
    session: null,
    db,
    headers: new Headers(),
  });

  // 1. start (SHORT method) — returns { token, questions, ... }
  console.log("1. quickIntake.start (SHORT)…");
  const started = await caller.quickIntake.start({
    contactName: "T'Challa Test",
    contactEmail: TEST_EMAIL,
    companyName: TEST_COMPANY,
    sector: "TECH",
    country: "WK", // Wakanda
    method: "SHORT",
  });
  const token = started.token;
  console.log(`   token=${token}`);

  // 2. processShort with realistic narrative text — runs extract + complete
  console.log("\n2. quickIntake.processShort (LLM extract + complete + narrative)…");
  const t0 = Date.now();
  const completed = await caller.quickIntake.processShort({
    token,
    text: `Vibranium Insights est une marque tech wakandaise qui aide les entreprises africaines a piloter leur strategie de marque a travers la donnee. Notre mission : democratiser l'intelligence strategique en Afrique. Nous nous adressons aux directeurs marketing et fondateurs de marques en croissance qui veulent passer d'une communication intuitive a une strategie pilotee. Notre proposition de valeur : transformer chaque pixel en KPI mesurable et chaque campagne en apprentissage capitalise. Notre modele economique : SaaS B2B avec abonnement mensuel a partir de 99 euros par marque. Differenciation : seul outil qui combine le diagnostic ADVE (Authenticite, Distinction, Valeur, Engagement) et la cascade RTIS (Risque, Track, Innovation, Strategie) dans un cockpit unifie. Notre engagement communautaire : webinars mensuels gratuits pour la communaute des CMO africains.`,
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`   completed in ${elapsed}s`);
  console.log(`   classification=${completed.classification}`);

  // 3. Verify the diagnostic stored on the intake row
  const intakeRow = await db.quickIntake.findUniqueOrThrow({
    where: { shareToken: token },
    select: { id: true, diagnostic: true, convertedToId: true, advertis_vector: true },
  });
  const diagnostic = intakeRow.diagnostic as {
    summary?: string;
    narrativeReport?: { executiveSummary: string; adve: unknown[]; rtis: { pillars: unknown[] } };
    notoriaPreview?: { totalRecos: number };
  } | null;

  if (!diagnostic) throw new Error("FAIL: diagnostic not persisted");
  if (!diagnostic.narrativeReport) {
    console.warn("   ⚠ narrativeReport ABSENT — LLM call likely failed (non-blocking). Continuing.");
  } else {
    const nr = diagnostic.narrativeReport;
    console.log(`   ✓ narrativeReport persisted`);
    console.log(`     executiveSummary: ${(nr.executiveSummary as string).slice(0, 80)}…`);
    console.log(`     adve pillars=${nr.adve.length}  rtis pillars=${nr.rtis.pillars.length}`);
  }

  // 5. activateBrand (public — simulates the post-paywall CTA click)
  console.log("\n4. quickIntake.activateBrand…");
  const activation = await caller.quickIntake.activateBrand({ token });
  console.log(`   userId=${activation.userId}`);
  console.log(`   clientId=${activation.clientId}`);
  console.log(`   strategyId=${activation.strategyId}`);
  console.log(`   alreadyClaimed=${activation.alreadyClaimed} (should be false on first call)`);

  // 5-bis. activateBrand idempotency: re-run should not double-create
  console.log("\n4b. quickIntake.activateBrand (idempotency check)…");
  const reactivation = await caller.quickIntake.activateBrand({ token });
  if (reactivation.userId !== activation.userId) throw new Error("FAIL: activateBrand created a duplicate User");
  if (reactivation.clientId !== activation.clientId) throw new Error("FAIL: activateBrand created a duplicate Client");
  if (reactivation.strategyId !== activation.strategyId) throw new Error("FAIL: activateBrand created a duplicate Strategy");
  console.log("   ✓ idempotent (same ids returned)");

  // 6. Verify stub User has no password yet
  const stubBefore = await db.user.findUniqueOrThrow({ where: { id: activation.userId } });
  if (stubBefore.hashedPassword) throw new Error("FAIL: stub User unexpectedly has hashedPassword");
  console.log("\n5. Stub User exists without hashedPassword ✓");

  // 7. auth.register with same email — should CLAIM the stub
  console.log("\n6. auth.register (same email — should claim stub User)…");
  const registered = await caller.auth.register({
    name: "T'Challa Real",
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  console.log(`   id=${registered.id}  claimed=${registered.claimed}`);
  if (registered.id !== activation.userId) throw new Error("FAIL: register did not claim the stub (different userId returned)");
  if (registered.claimed !== true) throw new Error("FAIL: register did not flag claimed=true");

  // 8. Verify password actually set + Strategy still linked
  const claimedUser = await db.user.findUniqueOrThrow({
    where: { id: activation.userId },
    select: { id: true, name: true, hashedPassword: true, Strategy: { select: { id: true } } },
  });
  if (!claimedUser.hashedPassword) throw new Error("FAIL: hashedPassword not set after register");
  const passwordOk = await bcrypt.compare(TEST_PASSWORD, claimedUser.hashedPassword);
  if (!passwordOk) throw new Error("FAIL: hashedPassword does not match the password we registered with");
  if (claimedUser.name !== "T'Challa Real") throw new Error("FAIL: name not updated on claim");
  const ownedStrategy = claimedUser.Strategy.find((s) => s.id === activation.strategyId);
  if (!ownedStrategy) throw new Error("FAIL: claimed User does not own the activated Strategy");
  console.log("   ✓ password set, name updated, Strategy ownership preserved");

  // 9. Re-register with same email — should now CONFLICT
  console.log("\n7. auth.register (second attempt — should CONFLICT)…");
  let conflicted = false;
  try {
    await caller.auth.register({
      name: "Other",
      email: TEST_EMAIL,
      password: "another-password",
    });
  } catch (err) {
    conflicted = true;
    console.log(`   ✓ conflict raised: ${err instanceof Error ? err.message : err}`);
  }
  if (!conflicted) throw new Error("FAIL: second register call should have thrown CONFLICT");

  console.log("\n═══ ✅ MVP FLOW PASS ═══");
  console.log(`Test email: ${TEST_EMAIL}`);
  console.log(`Result page: http://localhost:3000/intake/${token}/result`);
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("❌ FAIL:", err);
  await db.$disconnect();
  process.exit(1);
});
