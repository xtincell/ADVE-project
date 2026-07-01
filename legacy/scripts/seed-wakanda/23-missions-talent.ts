/**
 * WAKANDA SEED — Missions, Deliverables, QualityReviews, Commissions, Talent data
 *
 * 12 missions across brands, ~20 deliverables, 8 QualityReview,
 * 6 DeliverableTracking, 5 Commission, 4 PortfolioItem,
 * 3 TalentCertification, 2 TalentReview
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

export async function seedMissionsTalent(prisma: PrismaClient, brands: Brands, users: WakandaUsers) {
  // ================================================================
  // 12 MISSIONS
  // ================================================================
  const missions = [
    // BLISS (5)
    { id: "wk-mission-bliss-01", title: "Direction artistique Heritage KV", strategyId: brands.bliss.strategy.id, campaignId: IDS.campaignHeritage, driverId: "wk-driver-bliss-ooh", status: "COMPLETED", assigneeId: IDS.talentDA, budget: 350000, createdAt: T.missionsStart },
    { id: "wk-mission-bliss-02", title: "Copywriting Heritage Collection", strategyId: brands.bliss.strategy.id, campaignId: IDS.campaignHeritage, driverId: null, status: "COMPLETED", assigneeId: IDS.talentCopy, budget: 200000, createdAt: T.missionsStart },
    { id: "wk-mission-bliss-03", title: "Shooting photo packshots Heritage", strategyId: brands.bliss.strategy.id, campaignId: IDS.campaignHeritage, driverId: null, status: "COMPLETED", assigneeId: IDS.talentPhoto, budget: 400000, createdAt: daysAfter(T.missionsStart, 3) },
    { id: "wk-mission-bliss-04", title: "Video teaser Vibranium Glow", strategyId: brands.bliss.strategy.id, campaignId: IDS.campaignGlow, driverId: "wk-driver-bliss-video", status: "IN_PROGRESS", assigneeId: IDS.talentVideo, budget: 500000, createdAt: T.glowLaunch },
    { id: "wk-mission-bliss-05", title: "Community management BLISS Q2", strategyId: brands.bliss.strategy.id, campaignId: null, driverId: "wk-driver-bliss-instagram", status: "IN_PROGRESS", assigneeId: IDS.talentCM, budget: 150000, createdAt: daysAfter(T.now, -15) },
    // SHURI (3)
    { id: "wk-mission-shuri-01", title: "UX Design plateforme Shuri Academy", strategyId: brands.shuri.strategy.id, campaignId: null, driverId: null, status: "COMPLETED", assigneeId: IDS.talentUX, budget: 600000, createdAt: daysAfter(T.now, -30) },
    { id: "wk-mission-shuri-02", title: "Copywriting contenu cours IA", strategyId: brands.shuri.strategy.id, campaignId: IDS.campaignSchool, driverId: null, status: "IN_PROGRESS", assigneeId: IDS.talentCopy, budget: 250000, createdAt: daysAfter(T.now, -10) },
    { id: "wk-mission-shuri-03", title: "Visuels campagne Back to School", strategyId: brands.shuri.strategy.id, campaignId: IDS.campaignSchool, driverId: null, status: "DISPATCHED", assigneeId: IDS.talentDA, budget: 300000, createdAt: daysAfter(T.now, -5) },
    // VIBRANIUM (2)
    { id: "wk-mission-vib-01", title: "Design UX app mobile Vibranium", strategyId: brands.vibranium.strategy.id, campaignId: null, driverId: null, status: "COMPLETED", assigneeId: IDS.talentUX, budget: 800000, createdAt: daysAfter(T.now, -45) },
    { id: "wk-mission-vib-02", title: "Illustrations onboarding", strategyId: brands.vibranium.strategy.id, campaignId: null, driverId: null, status: "DRAFT", assigneeId: null, budget: 200000, createdAt: daysAfter(T.now, -3) },
    // BREW (1)
    { id: "wk-mission-brew-01", title: "Identite visuelle refonte Brew", strategyId: brands.brew.strategy.id, campaignId: null, driverId: null, status: "IN_PROGRESS", assigneeId: IDS.talentDA, budget: 450000, createdAt: daysAfter(T.now, -20) },
    // JABARI (1)
    { id: "wk-mission-jabari-01", title: "Photographier collection artisanale", strategyId: brands.jabari.strategy.id, campaignId: null, driverId: null, status: "DISPATCHED", assigneeId: IDS.talentPhoto, budget: 350000, createdAt: daysAfter(T.now, -8) },
  ];

  for (const m of missions) {
    await prisma.mission.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        title: m.title,
        strategyId: m.strategyId,
        campaignId: m.campaignId,
        driverId: m.driverId,
        status: m.status,
        assigneeId: m.assigneeId,
        budget: m.budget,
        description: `Mission : ${m.title}`,
        priority: m.status === "COMPLETED" ? 3 : 5,
        createdAt: m.createdAt,
      },
    });
    track("Mission");
  }

  // ================================================================
  // MISSION DELIVERABLES (~20)
  // ================================================================
  const deliverables = [
    // BLISS-01 DA (3)
    { id: "wk-del-bliss-01a", missionId: "wk-mission-bliss-01", title: "KV principal Heritage 4x3", status: "APPROVED" },
    { id: "wk-del-bliss-01b", missionId: "wk-mission-bliss-01", title: "Declinaisons stories Instagram", status: "APPROVED" },
    { id: "wk-del-bliss-01c", missionId: "wk-mission-bliss-01", title: "Charte graphique campagne Heritage", status: "APPROVED" },
    // BLISS-02 Copy (2)
    { id: "wk-del-bliss-02a", missionId: "wk-mission-bliss-02", title: "Textes KV + taglines Heritage", status: "APPROVED" },
    { id: "wk-del-bliss-02b", missionId: "wk-mission-bliss-02", title: "Script video teaser 30s", status: "APPROVED" },
    // BLISS-03 Photo (2)
    { id: "wk-del-bliss-03a", missionId: "wk-mission-bliss-03", title: "Packshots produits (12 photos)", status: "APPROVED" },
    { id: "wk-del-bliss-03b", missionId: "wk-mission-bliss-03", title: "Photos lifestyle campagne", status: "APPROVED" },
    // BLISS-04 Video (2)
    { id: "wk-del-bliss-04a", missionId: "wk-mission-bliss-04", title: "Video teaser 30s Vibranium Glow", status: "IN_PROGRESS" },
    { id: "wk-del-bliss-04b", missionId: "wk-mission-bliss-04", title: "Making-of behind the scenes", status: "PENDING" },
    // BLISS-05 CM (1)
    { id: "wk-del-bliss-05a", missionId: "wk-mission-bliss-05", title: "Calendrier editorial Q2", status: "IN_PROGRESS" },
    // SHURI-01 UX (3)
    { id: "wk-del-shuri-01a", missionId: "wk-mission-shuri-01", title: "Wireframes plateforme", status: "APPROVED" },
    { id: "wk-del-shuri-01b", missionId: "wk-mission-shuri-01", title: "Design system composants", status: "APPROVED" },
    { id: "wk-del-shuri-01c", missionId: "wk-mission-shuri-01", title: "Prototype interactif Figma", status: "APPROVED" },
    // SHURI-02 Copy (1)
    { id: "wk-del-shuri-02a", missionId: "wk-mission-shuri-02", title: "Contenu module 1 — Introduction IA", status: "IN_PROGRESS" },
    // VIB-01 UX (2)
    { id: "wk-del-vib-01a", missionId: "wk-mission-vib-01", title: "Maquettes app mobile v1", status: "APPROVED" },
    { id: "wk-del-vib-01b", missionId: "wk-mission-vib-01", title: "User flows + documentation", status: "APPROVED" },
    // BREW-01 DA (1)
    { id: "wk-del-brew-01a", missionId: "wk-mission-brew-01", title: "Propositions logo Wakanda Brew", status: "IN_PROGRESS" },
    // JABARI-01 Photo (1)
    { id: "wk-del-jabari-01a", missionId: "wk-mission-jabari-01", title: "Catalogue photo artisanat Jabari", status: "PENDING" },
    // SHURI-03 DA (1)
    { id: "wk-del-shuri-03a", missionId: "wk-mission-shuri-03", title: "Visuels campagne Back to School", status: "PENDING" },
    // VIB-02 (1)
    { id: "wk-del-vib-02a", missionId: "wk-mission-vib-02", title: "Illustrations onboarding app", status: "PENDING" },
  ];

  for (const d of deliverables) {
    await prisma.missionDeliverable.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        missionId: d.missionId,
        title: d.title,
        status: d.status,
        description: `Livrable : ${d.title}`,
        createdAt: T.missionsStart,
      },
    });
    track("MissionDeliverable");
  }

  // ================================================================
  // QUALITY REVIEWS (8)
  // ================================================================
  const reviews = [
    { id: "wk-qr-01", deliverableId: "wk-del-bliss-01a", reviewerId: IDS.userNakia, verdict: "ACCEPTED" as const, overallScore: 9.2, feedback: "KV excellent — respect parfait de la direction artistique Heritage.", reviewType: "FIXER" as const },
    { id: "wk-qr-02", deliverableId: "wk-del-bliss-02a", reviewerId: IDS.userOkoye, verdict: "ACCEPTED" as const, overallScore: 8.8, feedback: "Textes percutants, tagline validee par le client.", reviewType: "PEER" as const },
    { id: "wk-qr-03", deliverableId: "wk-del-bliss-03a", reviewerId: IDS.userAmara, verdict: "ACCEPTED" as const, overallScore: 9.5, feedback: "Photos sublimes — exactement le rendu premium attendu.", reviewType: "CLIENT" as const },
    { id: "wk-qr-04", deliverableId: "wk-del-bliss-04a", reviewerId: IDS.userNakia, verdict: "MINOR_REVISION" as const, overallScore: 7.5, feedback: "Bon montage mais le rythme en debut est un peu lent. Retoucher les 5 premieres secondes.", reviewType: "FIXER" as const },
    { id: "wk-qr-05", deliverableId: "wk-del-shuri-01a", reviewerId: IDS.userShuri, verdict: "ACCEPTED" as const, overallScore: 9.0, feedback: "Wireframes clairs et bien structures. Navigation intuitive.", reviewType: "CLIENT" as const },
    { id: "wk-qr-06", deliverableId: "wk-del-vib-01a", reviewerId: IDS.userTchalla, verdict: "MAJOR_REVISION" as const, overallScore: 6.5, feedback: "Les maquettes ne respectent pas les guidelines Material Design. Revoir la navigation principale.", reviewType: "CLIENT" as const },
    { id: "wk-qr-07", deliverableId: "wk-del-vib-01b", reviewerId: IDS.userNakia, verdict: "ACCEPTED" as const, overallScore: 8.2, feedback: "Documentation complete et bien organisee.", reviewType: "PEER" as const },
    { id: "wk-qr-08", deliverableId: "wk-del-brew-01a", reviewerId: IDS.userRamonda, verdict: "REJECTED" as const, overallScore: 4.5, feedback: "Les propositions ne capturent pas l'esprit artisanal de Wakanda Brew. Trop corporate, manque de chaleur.", reviewType: "CLIENT" as const },
  ];

  for (const qr of reviews) {
    await prisma.qualityReview.upsert({
      where: { id: qr.id },
      update: {},
      create: {
        id: qr.id,
        deliverableId: qr.deliverableId,
        reviewerId: qr.reviewerId,
        verdict: qr.verdict,
        pillarScores: { a: 8, d: 8.5, v: 7, e: 8 } as Prisma.InputJsonValue,
        overallScore: qr.overallScore,
        feedback: qr.feedback,
        reviewType: qr.reviewType,
        reviewDuration: Math.floor(Math.random() * 30) + 10,
        createdAt: daysAfter(T.missionsEnd, 2),
      },
    });
    track("QualityReview");
  }

  // ================================================================
  // DELIVERABLE TRACKING (6)
  // ================================================================
  const trackingDefs = [
    { id: "wk-tracking-01", deliverableId: "wk-del-bliss-01a", status: "COMPLETE" as const, expectedSignals: ["brand_awareness_lift", "social_engagement"], receivedSignals: ["brand_awareness_lift", "social_engagement"] },
    { id: "wk-tracking-02", deliverableId: "wk-del-bliss-02a", status: "COMPLETE" as const, expectedSignals: ["message_recall", "tagline_recognition"], receivedSignals: ["message_recall", "tagline_recognition"] },
    { id: "wk-tracking-03", deliverableId: "wk-del-bliss-03a", status: "COMPLETE" as const, expectedSignals: ["product_interest", "click_through"], receivedSignals: ["product_interest", "click_through"] },
    { id: "wk-tracking-04", deliverableId: "wk-del-bliss-04a", status: "PARTIAL" as const, expectedSignals: ["video_views", "completion_rate", "social_shares"], receivedSignals: ["video_views"] },
    { id: "wk-tracking-05", deliverableId: "wk-del-shuri-01a", status: "COMPLETE" as const, expectedSignals: ["ux_satisfaction", "task_completion"], receivedSignals: ["ux_satisfaction", "task_completion"] },
    { id: "wk-tracking-06", deliverableId: "wk-del-vib-01a", status: "AWAITING_SIGNALS" as const, expectedSignals: ["app_downloads", "onboarding_completion"], receivedSignals: [] },
  ];

  for (const dt of trackingDefs) {
    await prisma.deliverableTracking.upsert({
      where: { id: dt.id },
      update: {},
      create: {
        id: dt.id,
        deliverableId: dt.deliverableId,
        expectedSignals: dt.expectedSignals as Prisma.InputJsonValue,
        receivedSignals: dt.receivedSignals as Prisma.InputJsonValue,
        status: dt.status,
        expiresAt: daysAfter(T.now, 30),
        createdAt: T.missionsEnd,
      },
    });
    track("DeliverableTracking");
  }

  // ================================================================
  // COMMISSIONS (5 for completed missions)
  // ================================================================
  const commissions = [
    // talentId references TalentProfile.userId (not TalentProfile.id)
    { id: "wk-comm-01", missionId: "wk-mission-bliss-01", talentId: "wk-user-kofi-asante", gross: 350000, rate: 0.15, status: "PAID", paidAt: daysAfter(T.missionsEnd, 7) },
    { id: "wk-comm-02", missionId: "wk-mission-bliss-02", talentId: "wk-user-aya-mensah", gross: 200000, rate: 0.12, status: "PAID", paidAt: daysAfter(T.missionsEnd, 7) },
    { id: "wk-comm-03", missionId: "wk-mission-bliss-03", talentId: "wk-user-kwame-fotso", gross: 400000, rate: 0.15, status: "PAID", paidAt: daysAfter(T.missionsEnd, 7) },
    { id: "wk-comm-04", missionId: "wk-mission-shuri-01", talentId: "wk-user-zuri-design", gross: 600000, rate: 0.15, status: "PENDING", paidAt: null },
    { id: "wk-comm-05", missionId: "wk-mission-vib-01", talentId: "wk-user-zuri-design", gross: 800000, rate: 0.15, status: "PENDING", paidAt: null },
  ];

  for (const c of commissions) {
    const commissionAmount = c.gross * c.rate;
    await prisma.commission.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        missionId: c.missionId,
        talentId: c.talentId,
        grossAmount: c.gross,
        commissionRate: c.rate,
        commissionAmount: commissionAmount,
        netAmount: c.gross - commissionAmount,
        currency: "XAF",
        status: c.status,
        paidAt: c.paidAt,
        tierAtTime: c.talentId === "wk-user-kofi-asante" || c.talentId === "wk-user-kwame-fotso" || c.talentId === "wk-user-zuri-design" ? "MAITRE" : "COMPAGNON",
        operatorFee: commissionAmount,
        createdAt: T.missionsEnd,
      },
    });
    track("Commission");
  }

  // ================================================================
  // PORTFOLIO ITEMS (4 — best BLISS work)
  // ================================================================
  const portfolios = [
    { id: "wk-portfolio-01", talentProfileId: IDS.talentDA, deliverableId: "wk-del-bliss-01a", title: "KV Heritage Collection — BLISS by Wakanda", description: "Direction artistique complete du Key Visual Heritage Collection. Campagne primee." },
    { id: "wk-portfolio-02", talentProfileId: IDS.talentCopy, deliverableId: "wk-del-bliss-02a", title: "Copywriting Heritage — 'Revelee. Pas inventee.'", description: "Creation de la tagline et de l'univers linguistique de la campagne Heritage." },
    { id: "wk-portfolio-03", talentProfileId: IDS.talentPhoto, deliverableId: "wk-del-bliss-03a", title: "Packshots Heritage Collection", description: "Photographie packshot premium — rendu luxe avec textures vibranium." },
    { id: "wk-portfolio-04", talentProfileId: IDS.talentUX, deliverableId: "wk-del-shuri-01a", title: "UX Design Shuri Academy Platform", description: "Design complet de la plateforme d'apprentissage — wireframes au prototype." },
  ];

  for (const p of portfolios) {
    await prisma.portfolioItem.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        talentProfileId: p.talentProfileId,
        deliverableId: p.deliverableId,
        title: p.title,
        description: p.description,
        pillarTags: ["a", "d"] as Prisma.InputJsonValue,
        createdAt: T.heritagePost,
      },
    });
    track("PortfolioItem");
  }

  // ================================================================
  // TALENT CERTIFICATIONS (3)
  // ================================================================
  const certs = [
    { id: "wk-cert-01", talentProfileId: IDS.talentDA, name: "Certification Direction Artistique Avancee", category: "CREATIVE" },
    { id: "wk-cert-02", talentProfileId: IDS.talentUX, name: "Certification UX Research & Design", category: "DESIGN" },
    { id: "wk-cert-03", talentProfileId: IDS.talentCopy, name: "Certification Copywriting Strategique", category: "CREATIVE" },
  ];

  for (const cert of certs) {
    await prisma.talentCertification.upsert({
      where: { id: cert.id },
      update: {},
      create: {
        id: cert.id,
        talentProfileId: cert.talentProfileId,
        name: cert.name,
        issuedAt: T.teamAssembled,
        category: cert.category,
      },
    });
    track("TalentCertification");
  }

  // ================================================================
  // TALENT REVIEWS (2)
  // ================================================================
  const talentReviews = [
    { id: "wk-review-01", talentProfileId: IDS.talentDA, reviewerId: IDS.userNakia, period: "2026-Q1", overallScore: 9.2, strengths: ["Vision artistique exceptionnelle", "Respect des delais"], improvements: ["Documentation des fichiers source"] },
    { id: "wk-review-02", talentProfileId: IDS.talentCopy, reviewerId: IDS.userOkoye, period: "2026-Q1", overallScore: 8.5, strengths: ["Creativite linguistique", "Adaptabilite tone of voice"], improvements: ["Relecture ortho plus rigoureuse"] },
  ];

  for (const tr of talentReviews) {
    await prisma.talentReview.upsert({
      where: { id: tr.id },
      update: {},
      create: {
        id: tr.id,
        talentProfileId: tr.talentProfileId,
        reviewerId: tr.reviewerId,
        period: tr.period,
        overallScore: tr.overallScore,
        strengths: tr.strengths as Prisma.InputJsonValue,
        improvements: tr.improvements as Prisma.InputJsonValue,
        createdAt: daysAfter(T.now, -5),
      },
    });
    track("TalentReview");
  }

  console.log("[OK] Missions+Talent: 12 missions, 20 deliverables, 8 QR, 6 tracking, 5 commissions, 4 portfolio, 3 certs, 2 reviews");
}
