/**
 * WAKANDA SEED — Financial data
 *
 * Invoice (8), Contract (4), Escrow (3), EscrowCondition (5),
 * PaymentOrder (6), Deal (6), FunnelMapping (12), CRMNote (4), CRMActivity (6)
 */

import type { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { IDS, T } from "./constants";
import { track, daysAfter, hoursAfter } from "./helpers";
import type { WakandaUsers } from "./02-users";

interface Brands {
  bliss: { strategy: { id: string } };
  vibranium: { strategy: { id: string } };
  brew: { strategy: { id: string } };
  panther: { strategy: { id: string } };
  shuri: { strategy: { id: string } };
  jabari: { strategy: { id: string } };
}

export async function seedFinancial(prisma: PrismaClient, brands: Brands, users: WakandaUsers) {

  // ================================================================
  // INVOICES (8)
  // ================================================================
  const invoices = [
    // BLISS Jan-Mar PAID
    { id: "wk-invoice-bliss-jan", amount: 2500000, status: "PAID", description: "Honoraires RTIS Janvier 2026 — BLISS by Wakanda", dueDate: new Date("2026-02-15"), paidAt: new Date("2026-02-12"), paymentMethod: "MOBILE_MONEY_ORANGE" },
    { id: "wk-invoice-bliss-feb", amount: 2500000, status: "PAID", description: "Honoraires RTIS Fevrier 2026 — BLISS by Wakanda", dueDate: new Date("2026-03-15"), paidAt: new Date("2026-03-10"), paymentMethod: "MOBILE_MONEY_ORANGE" },
    { id: "wk-invoice-bliss-mar", amount: 2500000, status: "PAID", description: "Honoraires RTIS Mars 2026 — BLISS by Wakanda", dueDate: new Date("2026-04-15"), paidAt: new Date("2026-04-05"), paymentMethod: "BANK_TRANSFER" },
    // BLISS Apr PENDING
    { id: "wk-invoice-bliss-apr", amount: 2500000, status: "PENDING", description: "Honoraires RTIS Avril 2026 — BLISS by Wakanda", dueDate: new Date("2026-05-15"), paidAt: null, paymentMethod: null },
    // SHURI PENDING
    { id: "wk-invoice-shuri-q1", amount: 1500000, status: "PENDING", description: "Formation + Accompagnement Q1 — Shuri Academy", dueDate: new Date("2026-04-30"), paidAt: null, paymentMethod: null },
    // BREW OVERDUE (2)
    { id: "wk-invoice-brew-01", amount: 800000, status: "OVERDUE", description: "Diagnostic initial — Wakanda Brew", dueDate: new Date("2026-03-01"), paidAt: null, paymentMethod: null },
    { id: "wk-invoice-brew-02", amount: 600000, status: "OVERDUE", description: "Identite visuelle phase 1 — Wakanda Brew", dueDate: new Date("2026-03-15"), paidAt: null, paymentMethod: null },
    // CANCELLED
    { id: "wk-invoice-jabari-cancel", amount: 500000, status: "CANCELLED", description: "Diagnostic annule — Jabari Heritage (client a demande report)", dueDate: new Date("2026-02-28"), paidAt: null, paymentMethod: null },
  ];

  for (const inv of invoices) {
    await prisma.invoice.upsert({
      where: { id: inv.id },
      update: {},
      create: {
        id: inv.id,
        amount: inv.amount,
        currency: "XAF",
        status: inv.status,
        description: inv.description,
        dueDate: inv.dueDate,
        paidAt: inv.paidAt,
        paymentMethod: inv.paymentMethod,
        createdAt: daysAfter(inv.dueDate, -30),
      },
    });
    track("Invoice");
  }

  // ================================================================
  // CONTRACTS (4)
  // ================================================================
  const contracts = [
    { id: IDS.contractBliss, strategyId: brands.bliss.strategy.id, title: "Contrat RTIS Premium — BLISS by Wakanda", contractType: "RETAINER", status: "ACTIVE" as const, startDate: T.contractSigned, endDate: new Date("2027-01-27"), value: 30000000, signedAt: T.contractSigned },
    { id: IDS.contractShuri, strategyId: brands.shuri.strategy.id, title: "Contrat Accompagnement Annuel — Shuri Academy", contractType: "PROJECT", status: "ACTIVE" as const, startDate: daysAfter(T.now, -60), endDate: daysAfter(T.now, 305), value: 6000000, signedAt: daysAfter(T.now, -60) },
    { id: "wk-contract-jabari-draft", strategyId: brands.jabari.strategy.id, title: "Contrat Diagnostic — Jabari Heritage (brouillon)", contractType: "ONE_OFF", status: "DRAFT" as const, startDate: daysAfter(T.now, 5), endDate: daysAfter(T.now, 35), value: 1500000, signedAt: null },
    { id: "wk-contract-vib-trial", strategyId: brands.vibranium.strategy.id, title: "Contrat Essai ADVE — Vibranium Tech (termine)", contractType: "TRIAL", status: "COMPLETED" as const, startDate: daysAfter(T.now, -90), endDate: daysAfter(T.now, -30), value: 500000, signedAt: daysAfter(T.now, -90) },
  ];

  for (const c of contracts) {
    await prisma.contract.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        strategyId: c.strategyId,
        title: c.title,
        contractType: c.contractType,
        status: c.status,
        startDate: c.startDate,
        endDate: c.endDate,
        value: c.value,
        signedAt: c.signedAt,
        terms: { billingCycle: "MONTHLY", paymentTerms: "NET_30", autoRenew: c.contractType === "RETAINER" } as Prisma.InputJsonValue,
        createdAt: c.startDate,
      },
    });
    track("Contract");
  }

  // ================================================================
  // ESCROWS (3) + ESCROW CONDITIONS (5)
  // ================================================================
  // BLISS Heritage RELEASED
  await prisma.escrow.upsert({
    where: { id: "wk-escrow-heritage" },
    update: {},
    create: {
      id: "wk-escrow-heritage",
      contractId: IDS.contractBliss,
      amount: 4250000,
      status: "RELEASED",
      heldAt: T.campaignPlanning,
      releasedAt: T.heritagePost,
      reason: "Campagne Heritage terminee — tous les KPIs valides.",
    },
  });
  track("Escrow");

  await prisma.escrowCondition.upsert({ where: { id: "wk-escond-heritage-01" }, update: {}, create: { id: "wk-escond-heritage-01", escrowId: "wk-escrow-heritage", condition: "Livraison de tous les livrables creatifs", met: true, metAt: T.missionsEnd, verifiedBy: IDS.userNakia } });
  await prisma.escrowCondition.upsert({ where: { id: "wk-escond-heritage-02" }, update: {}, create: { id: "wk-escond-heritage-02", escrowId: "wk-escrow-heritage", condition: "Validation du bilan post-campagne", met: true, metAt: T.heritagePost, verifiedBy: IDS.userAmara } });
  track("EscrowCondition", 2);

  // BLISS Glow HELD
  await prisma.escrow.upsert({
    where: { id: "wk-escrow-glow" },
    update: {},
    create: {
      id: "wk-escrow-glow",
      contractId: IDS.contractBliss,
      amount: 6000000,
      status: "HELD",
      heldAt: T.glowLaunch,
      reason: "Campagne Vibranium Glow en cours.",
    },
  });
  track("Escrow");

  await prisma.escrowCondition.upsert({ where: { id: "wk-escond-glow-01" }, update: {}, create: { id: "wk-escond-glow-01", escrowId: "wk-escrow-glow", condition: "Livraison video teaser approuvee", met: false } });
  await prisma.escrowCondition.upsert({ where: { id: "wk-escond-glow-02" }, update: {}, create: { id: "wk-escond-glow-02", escrowId: "wk-escrow-glow", condition: "Atteinte 500K impressions", met: false } });
  track("EscrowCondition", 2);

  // SHURI HELD
  await prisma.escrow.upsert({
    where: { id: "wk-escrow-shuri" },
    update: {},
    create: {
      id: "wk-escrow-shuri",
      contractId: IDS.contractShuri,
      amount: 1500000,
      status: "HELD",
      heldAt: daysAfter(T.now, -30),
      reason: "Premiere tranche accompagnement Shuri Academy.",
    },
  });
  track("Escrow");

  await prisma.escrowCondition.upsert({ where: { id: "wk-escond-shuri-01" }, update: {}, create: { id: "wk-escond-shuri-01", escrowId: "wk-escrow-shuri", condition: "Livraison design plateforme validee", met: true, metAt: daysAfter(T.now, -10), verifiedBy: IDS.userShuri } });
  track("EscrowCondition");

  // ================================================================
  // PAYMENT ORDERS (6)
  // ================================================================
  const payments = [
    { id: "wk-pay-01", amount: 297500, method: "MOBILE_MONEY_ORANGE" as const, status: "COMPLETED" as const, recipientPhone: "+237690001111", recipientName: "Kofi Asante", transactionRef: "OM-2026-030101" },
    { id: "wk-pay-02", amount: 176000, method: "MOBILE_MONEY_ORANGE" as const, status: "COMPLETED" as const, recipientPhone: "+237690002222", recipientName: "Aya Mensah", transactionRef: "OM-2026-030102" },
    { id: "wk-pay-03", amount: 340000, method: "MOBILE_MONEY_MTN" as const, status: "COMPLETED" as const, recipientPhone: "+237670003333", recipientName: "Kwame Fotso", transactionRef: "MTN-2026-030103" },
    { id: "wk-pay-04", amount: 510000, method: "MOBILE_MONEY_MTN" as const, status: "PENDING" as const, recipientPhone: "+237670004444", recipientName: "Zuri Afolabi", transactionRef: null },
    { id: "wk-pay-05", amount: 680000, method: "MOBILE_MONEY_WAVE" as const, status: "PENDING" as const, recipientPhone: "+237650005555", recipientName: "Zuri Afolabi", transactionRef: null },
    { id: "wk-pay-06", amount: 2500000, method: "BANK_TRANSFER" as const, status: "COMPLETED" as const, recipientPhone: null, recipientName: "BLISS by Wakanda SARL", transactionRef: "BT-2026-040501" },
  ];

  for (const p of payments) {
    await prisma.paymentOrder.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        amount: p.amount,
        currency: "XAF",
        method: p.method,
        status: p.status,
        recipientPhone: p.recipientPhone,
        recipientName: p.recipientName,
        transactionRef: p.transactionRef,
        processedAt: p.status === "COMPLETED" ? daysAfter(T.missionsEnd, 7) : undefined,
        createdAt: T.missionsEnd,
      },
    });
    track("PaymentOrder");
  }

  // ================================================================
  // DEALS (6, one per brand)
  // ================================================================
  const deals = [
    { id: IDS.dealBliss, strategyId: brands.bliss.strategy.id, userId: IDS.userAmara, contactName: "Amara Udaku", contactEmail: "amara@bliss.wk", companyName: "BLISS by Wakanda", stage: "WON" as const, value: 30000000, source: "REFERRAL", wonAt: T.contractSigned },
    { id: IDS.dealVibranium, strategyId: brands.vibranium.strategy.id, userId: IDS.userTchalla, contactName: "T'Challa Bassari", contactEmail: "tchalla@vibraniumtech.wk", companyName: "Vibranium Tech", stage: "QUALIFIED" as const, value: 5000000, source: "INBOUND" },
    { id: IDS.dealBrew, strategyId: brands.brew.strategy.id, userId: IDS.userRamonda, contactName: "Ramonda Brewster", contactEmail: "ramonda@wakandabrew.wk", companyName: "Wakanda Brew", stage: "LEAD" as const, value: 2000000, source: "COLD_OUTREACH" },
    { id: IDS.dealPanther, strategyId: brands.panther.strategy.id, userId: null, contactName: "Zemo Athletic Director", contactEmail: "contact@pantherathletics.wk", companyName: "Panther Athletics", stage: "LEAD" as const, value: 3000000, source: "EVENT" },
    { id: IDS.dealShuri, strategyId: brands.shuri.strategy.id, userId: IDS.userShuri, contactName: "Shuri Udaku", contactEmail: "shuri@shuriacademy.wk", companyName: "Shuri Academy", stage: "WON" as const, value: 6000000, source: "REFERRAL", wonAt: daysAfter(T.now, -60) },
    { id: IDS.dealJabari, strategyId: brands.jabari.strategy.id, userId: IDS.userMbaku, contactName: "M'Baku Jabari", contactEmail: "mbaku@jabariheritage.wk", companyName: "Jabari Heritage", stage: "NEGOTIATION" as const, value: 1500000, source: "INBOUND" },
  ];

  for (const d of deals) {
    await prisma.deal.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        strategyId: d.strategyId,
        userId: d.userId,
        contactName: d.contactName,
        contactEmail: d.contactEmail,
        companyName: d.companyName,
        stage: d.stage,
        value: d.value,
        source: d.source,
        wonAt: (d as any).wonAt || undefined,
        createdAt: T.intake,
      },
    });
    track("Deal");
  }

  // ================================================================
  // FUNNEL MAPPING (12, 2-3 per deal)
  // ================================================================
  const funnelMaps = [
    // BLISS (3)
    { id: "wk-funnel-bliss-01", dealId: IDS.dealBliss, step: "LEAD", enteredAt: T.intake, exitedAt: hoursAfter(T.intake, 24), duration: 24 },
    { id: "wk-funnel-bliss-02", dealId: IDS.dealBliss, step: "QUALIFIED", enteredAt: hoursAfter(T.intake, 24), exitedAt: T.contractSigned, duration: 264 },
    { id: "wk-funnel-bliss-03", dealId: IDS.dealBliss, step: "WON", enteredAt: T.contractSigned, exitedAt: null, duration: null },
    // VIBRANIUM (2)
    { id: "wk-funnel-vib-01", dealId: IDS.dealVibranium, step: "LEAD", enteredAt: daysAfter(T.now, -45), exitedAt: daysAfter(T.now, -30), duration: 360 },
    { id: "wk-funnel-vib-02", dealId: IDS.dealVibranium, step: "QUALIFIED", enteredAt: daysAfter(T.now, -30), exitedAt: null, duration: null },
    // BREW (2)
    { id: "wk-funnel-brew-01", dealId: IDS.dealBrew, step: "LEAD", enteredAt: daysAfter(T.now, -20), exitedAt: null, duration: null },
    { id: "wk-funnel-brew-02", dealId: IDS.dealBrew, step: "CONTACTED", enteredAt: daysAfter(T.now, -15), exitedAt: null, duration: null },
    // PANTHER (2)
    { id: "wk-funnel-panther-01", dealId: IDS.dealPanther, step: "LEAD", enteredAt: daysAfter(T.now, -10), exitedAt: null, duration: null },
    { id: "wk-funnel-panther-02", dealId: IDS.dealPanther, step: "CONTACTED", enteredAt: daysAfter(T.now, -5), exitedAt: null, duration: null },
    // SHURI (2)
    { id: "wk-funnel-shuri-01", dealId: IDS.dealShuri, step: "LEAD", enteredAt: daysAfter(T.now, -90), exitedAt: daysAfter(T.now, -75), duration: 360 },
    { id: "wk-funnel-shuri-02", dealId: IDS.dealShuri, step: "WON", enteredAt: daysAfter(T.now, -60), exitedAt: null, duration: null },
    // JABARI (1 — just started)
    { id: "wk-funnel-jabari-01", dealId: IDS.dealJabari, step: "NEGOTIATION", enteredAt: daysAfter(T.now, -8), exitedAt: null, duration: null },
  ];

  for (const fm of funnelMaps) {
    await prisma.funnelMapping.upsert({
      where: { id: fm.id },
      update: {},
      create: {
        id: fm.id,
        dealId: fm.dealId,
        step: fm.step,
        enteredAt: fm.enteredAt,
        exitedAt: fm.exitedAt,
        duration: fm.duration,
      },
    });
    track("FunnelMapping");
  }

  // ================================================================
  // CRM NOTES (4)
  // ================================================================
  const crmNotes = [
    { id: "wk-crmnote-01", dealId: IDS.dealBliss, authorId: IDS.userNakia, content: "Amara tres enthousiaste apres la demo ADVE. Veut demarrer le RTIS complet des que possible. Budget valide en interne.", noteType: "MEETING" },
    { id: "wk-crmnote-02", dealId: IDS.dealVibranium, authorId: IDS.userNakia, content: "T'Challa interesse mais prudent. Veut voir les resultats ADVE avant de s'engager sur le RTIS. Proposer une phase pilote.", noteType: "CALL" },
    { id: "wk-crmnote-03", dealId: IDS.dealBrew, authorId: IDS.userOkoye, content: "Premier contact avec Ramonda au Wakanda Business Forum. Marque artisanale avec potentiel de structuration.", noteType: "EVENT" },
    { id: "wk-crmnote-04", dealId: IDS.dealJabari, authorId: IDS.userNakia, content: "M'Baku hesite entre moderniser et garder l'authenticite. Adapter le discours pour rassurer sur la preservation du patrimoine.", noteType: "GENERAL" },
  ];

  for (const n of crmNotes) {
    await prisma.cRMNote.upsert({
      where: { id: n.id },
      update: {},
      create: {
        id: n.id,
        dealId: n.dealId,
        authorId: n.authorId,
        content: n.content,
        noteType: n.noteType,
        createdAt: daysAfter(T.now, -10),
      },
    });
    track("CRMNote");
  }

  // ================================================================
  // CRM ACTIVITIES (6)
  // ================================================================
  const crmActivities = [
    { id: "wk-crmact-01", dealId: IDS.dealBliss, activityType: "MEETING", description: "Reunion de presentation ADVE avec Amara Udaku", performedBy: IDS.userNakia },
    { id: "wk-crmact-02", dealId: IDS.dealBliss, activityType: "CONTRACT_SENT", description: "Envoi du contrat RTIS Premium pour signature", performedBy: IDS.userWkabi },
    { id: "wk-crmact-03", dealId: IDS.dealVibranium, activityType: "DEMO", description: "Demo plateforme ADVE pour equipe Vibranium Tech", performedBy: IDS.userNakia },
    { id: "wk-crmact-04", dealId: IDS.dealShuri, activityType: "PROPOSAL", description: "Proposition d'accompagnement annuel Shuri Academy", performedBy: IDS.userNakia },
    { id: "wk-crmact-05", dealId: IDS.dealBrew, activityType: "EMAIL", description: "Email de suivi apres rencontre Wakanda Business Forum", performedBy: IDS.userOkoye },
    { id: "wk-crmact-06", dealId: IDS.dealJabari, activityType: "CALL", description: "Appel telephonique avec M'Baku — discussion tarifs et perimetre", performedBy: IDS.userNakia },
  ];

  for (const a of crmActivities) {
    await prisma.cRMActivity.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        dealId: a.dealId,
        activityType: a.activityType,
        description: a.description,
        performedBy: a.performedBy,
        performedAt: daysAfter(T.now, -8),
      },
    });
    track("CRMActivity");
  }

  console.log("[OK] Financial: 8 invoices, 4 contracts, 3 escrows, 6 payments, 6 deals, 12 funnel, 4 notes, 6 activities");
}
