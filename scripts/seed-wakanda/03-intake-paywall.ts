/**
 * WAKANDA SEED — Batch 1: Intake → Paywall → Auth (funnel bout-en-bout).
 *
 * Le funnel public n'était pas irrigué : `QuickIntake` existait (28-infra) mais
 * sans la couche encaissement (`IntakePayment`), abonnement (`Subscription`) ni
 * authentification (`Account`/`Session`). Ce batch ferme la voie
 * intake→ADVE→Oracle→paywall + débloque `checkPaidTier` (un brand payant a une
 * Subscription `active`).
 *
 * Déterministe, zéro LLM. Idempotent (upsert par id `wk-*`).
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { IDS, T, WAKANDA } from "./constants";
import { track, daysAfter } from "./helpers";

export async function seedIntakePaywall(prisma: PrismaClient) {
  // ── Prospects frais (haut de funnel, en plus des 2 intakes 28-infra) ──
  const freshIntakes: Prisma.QuickIntakeCreateInput[] = [
    {
      id: "wk-intake-glow",
      contactName: "Nakia Wright",
      contactEmail: "founder@glowwakanda.wk",
      companyName: "Glow Wakanda",
      sector: "Cosmetiques & Skincare",
      country: "Wakanda",
      businessModel: "DIRECT_TO_CONSUMER",
      method: "SHORT",
      responses: { q1: "Skincare naturel à base de plantes du Mont Bashenga", q2: "Femmes 20-35" } as Prisma.InputJsonValue,
      rawText: "On veut concurrencer BLISS sur le segment accessible. Budget marketing 2M FCFA/mois.",
      advertis_vector: { a: 12, d: 10, v: 11, e: 9, composite: 42, confidence: 0.41 } as Prisma.InputJsonValue,
      classification: "FRAGILE",
      shareToken: "wk-intake-glow-token",
      status: "COMPLETED",
      source: "LANDING_ORGANIC",
      completedAt: daysAfter(T.now, -6),
      createdAt: daysAfter(T.now, -7),
    },
    {
      id: "wk-intake-savane",
      contactName: "Erik Stevens",
      contactEmail: "erik@savanefintech.wk",
      companyName: "Savane Fintech",
      sector: "Fintech / Mobile Money",
      country: "Wakanda",
      businessModel: "B2B2C",
      method: "INGEST_PLUS",
      responses: { q1: "Néobanque pour la diaspora wakandaise", q2: "Transferts transfrontaliers" } as Prisma.InputJsonValue,
      websiteUrl: "https://savane.example.wk",
      shareToken: "wk-intake-savane-token",
      status: "IN_PROGRESS",
      source: "REFERRAL",
      createdAt: daysAfter(T.now, -2),
    },
  ];

  for (const intake of freshIntakes) {
    await prisma.quickIntake.upsert({ where: { id: intake.id! }, update: {}, create: intake });
    track("QuickIntake");
  }

  // ── IntakePayments — paywall (PDF d'appel + Oracle complet) ──────────
  // Réfs aux tokens réels : bliss + panther (28-infra) + glow (ci-dessus).
  const payments: Prisma.IntakePaymentCreateManyInput[] = [
    {
      id: "wk-pay-bliss-pdf",
      reference: "WK-PAY-BLISS-PDF",
      intakeToken: "wk-intake-bliss-token",
      amount: 5000,
      currency: "XAF",
      provider: "CINETPAY",
      status: "PAID",
      tierKey: "INTAKE_PDF",
      providerRef: "cinetpay_wk_bliss_pdf",
      providerEventId: "evt_wk_bliss_pdf",
      paidAt: T.intake,
      createdAt: T.intake,
    },
    {
      id: "wk-pay-bliss-oracle",
      reference: "WK-PAY-BLISS-ORACLE",
      intakeToken: "wk-intake-bliss-token",
      amount: 75000,
      currency: "XAF",
      provider: "CINETPAY",
      status: "PAID",
      tierKey: "ORACLE_FULL",
      providerRef: "cinetpay_wk_bliss_oracle",
      providerEventId: "evt_wk_bliss_oracle",
      paidAt: T.intakeConverted,
      createdAt: T.intakeConverted,
    },
    {
      id: "wk-pay-panther-pdf",
      reference: "WK-PAY-PANTHER-PDF",
      intakeToken: "wk-intake-panther-token",
      amount: 5000,
      currency: "XAF",
      provider: "MOCK",
      status: "PAID",
      tierKey: "INTAKE_PDF",
      paidAt: daysAfter(T.now, -9),
      createdAt: daysAfter(T.now, -10),
    },
    {
      id: "wk-pay-glow-oracle",
      reference: "WK-PAY-GLOW-ORACLE",
      intakeToken: "wk-intake-glow-token",
      amount: 75000,
      currency: "XAF",
      provider: "CINETPAY",
      status: "PENDING",
      tierKey: "ORACLE_FULL",
      createdAt: daysAfter(T.now, -5),
    },
    {
      id: "wk-pay-savane-pdf-failed",
      reference: "WK-PAY-SAVANE-PDF",
      intakeToken: "wk-intake-savane-token",
      amount: 5000,
      currency: "XAF",
      provider: "CINETPAY",
      status: "FAILED",
      tierKey: "INTAKE_PDF",
      failureReason: "INSUFFICIENT_FUNDS",
      createdAt: daysAfter(T.now, -2),
    },
  ];
  await prisma.intakePayment.createMany({ data: payments, skipDuplicates: true });
  track("IntakePayment", payments.length);

  // ── Subscriptions — pourquoi les marques ont accès au Cockpit ────────
  const subs: Array<{
    id: string;
    strategyId: string;
    tierKey: string;
    status: string;
    amount: number;
    periodStartDaysAgo: number;
    cancelAtPeriodEnd?: boolean;
  }> = [
    { id: "wk-sub-bliss", strategyId: IDS.stratBliss, tierKey: "RETAINER_PRO", status: "active", amount: 250000, periodStartDaysAgo: 20 },
    { id: "wk-sub-shuri", strategyId: IDS.stratShuri, tierKey: "RETAINER_BASE", status: "active", amount: 150000, periodStartDaysAgo: 25 },
    { id: "wk-sub-vibranium", strategyId: IDS.stratVibranium, tierKey: "COCKPIT_MONTHLY", status: "active", amount: 50000, periodStartDaysAgo: 12 },
    { id: "wk-sub-brew", strategyId: IDS.stratBrew, tierKey: "COCKPIT_MONTHLY", status: "trialing", amount: 50000, periodStartDaysAgo: 5 },
    { id: "wk-sub-panther", strategyId: IDS.stratPanther, tierKey: "COCKPIT_MONTHLY", status: "past_due", amount: 50000, periodStartDaysAgo: 40 },
    { id: "wk-sub-jabari", strategyId: IDS.stratJabari, tierKey: "COCKPIT_MONTHLY", status: "canceled", amount: 50000, periodStartDaysAgo: 60, cancelAtPeriodEnd: true },
  ];

  for (const s of subs) {
    const start = daysAfter(T.now, -s.periodStartDaysAgo);
    await prisma.subscription.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        providerSubscriptionId: `${s.id}-prov`,
        strategyId: s.strategyId,
        operatorId: IDS.operator,
        tierKey: s.tierKey,
        status: s.status,
        currency: WAKANDA.currency,
        amountPerPeriod: s.amount,
        currentPeriodStart: start,
        currentPeriodEnd: daysAfter(start, 30),
        cancelAtPeriodEnd: s.cancelAtPeriodEnd ?? false,
        cancelledAt: s.status === "canceled" ? daysAfter(start, 15) : null,
        providerSnapshot: { _mocked: true, gateway: "cinetpay-recurring" } as Prisma.InputJsonValue,
        createdAt: start,
      },
    });
    track("Subscription");
  }

  // ── Auth (NextAuth) — OAuth Account + Session pour quelques users ────
  const accounts: Array<{ id: string; userId: string; provider: string }> = [
    { id: "wk-account-amara-google", userId: IDS.userAmara, provider: "google" },
    { id: "wk-account-shuri-google", userId: IDS.userShuri, provider: "google" },
    { id: "wk-account-nakia-github", userId: IDS.userNakia, provider: "github" },
  ];
  for (const a of accounts) {
    await prisma.account.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        userId: a.userId,
        type: "oauth",
        provider: a.provider,
        providerAccountId: `${a.provider}-${a.userId}`,
        access_token: "wk-mock-access-token",
        token_type: "bearer",
        scope: a.provider === "google" ? "openid email profile" : "read:user user:email",
      },
    });
    track("Account");
  }

  const sessions: Array<{ id: string; userId: string }> = [
    { id: "wk-session-amara", userId: IDS.userAmara },
    { id: "wk-session-shuri", userId: IDS.userShuri },
  ];
  for (const sess of sessions) {
    await prisma.session.upsert({
      where: { id: sess.id },
      update: {},
      create: {
        id: sess.id,
        sessionToken: `${sess.id}-token`,
        userId: sess.userId,
        expires: daysAfter(T.now, 30),
      },
    });
    track("Session");
  }

  console.log(
    `[OK] Intake→Paywall: ${freshIntakes.length} prospects + ${payments.length} payments + ${subs.length} subscriptions + ${accounts.length} accounts + ${sessions.length} sessions`,
  );
}
