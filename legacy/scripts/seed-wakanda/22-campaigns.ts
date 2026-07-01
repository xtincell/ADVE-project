/**
 * WAKANDA SEED — Campaigns across brands
 *
 * 5 campaigns + 1 template with full lifecycle data
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

export async function seedCampaigns(prisma: PrismaClient, brands: Brands, users: WakandaUsers) {

  // ================================================================
  // CAMPAIGN 1 — BLISS "Heritage Collection" (POST_CAMPAIGN)
  // ================================================================
  await prisma.campaign.upsert({
    where: { id: IDS.campaignHeritage },
    update: {},
    create: {
      id: IDS.campaignHeritage,
      name: "Heritage Collection",
      strategyId: brands.bliss.strategy.id,
      status: "COMPLETED",
      state: "POST_CAMPAIGN",
      budget: 8500000,
      budgetCurrency: "XAF",
      startDate: T.heritageLive,
      endDate: T.heritagePost,
      code: "CAMP-2026-001",
      objectives: { primary: "Lancer la gamme Heritage et installer le positionnement premium", kpis: ["500K impressions", "15% taux engagement", "1200 ventes coffret"] } as Prisma.InputJsonValue,
      aarrTargets: { acquisition: 5000, activation: 2000, retention: 800, revenue: 4200000, referral: 150 } as Prisma.InputJsonValue,
      createdAt: T.campaignBriefed,
    },
  });
  track("Campaign");

  // Brief
  await prisma.campaignBrief.upsert({
    where: { id: "wk-brief-heritage-01" },
    update: {},
    create: {
      id: "wk-brief-heritage-01",
      campaignId: IDS.campaignHeritage,
      title: "Brief creatif Heritage Collection",
      content: { objective: "Raconter l'histoire de 14 generations de beaute wakandaise", tone: "Luxueux, mystique, chaleureux", target: "Femmes urbaines 25-40 ans, CSP+", keyMessage: "14 generations. Un seul eclat.", deliverables: ["KV principal", "Video teaser 30s", "Declinaisons social", "PLV boutique"] } as Prisma.InputJsonValue,
      status: "APPROVED",
      version: 2,
      briefType: "CREATIVE",
      createdAt: T.campaignBriefed,
    },
  });
  track("CampaignBrief");

  // 5 CampaignActions (ATL/BTL/TTL)
  const heritageActions = [
    { id: "wk-action-heritage-01", name: "Affichage OOH Biryongo", category: "ATL" as const, actionType: "OOH_BILLBOARD", budget: 2500000, aarrStage: "ACQUISITION", startDate: T.heritageLive, endDate: T.heritagePost },
    { id: "wk-action-heritage-02", name: "Campagne Instagram Stories", category: "TTL" as const, actionType: "SOCIAL_PAID", budget: 1800000, aarrStage: "ACQUISITION", startDate: T.heritageLive, endDate: T.heritagePost },
    { id: "wk-action-heritage-03", name: "Video TikTok Teaser", category: "TTL" as const, actionType: "SOCIAL_ORGANIC", budget: 500000, aarrStage: "ACTIVATION", startDate: daysAfter(T.heritageLive, -3), endDate: T.heritagePost },
    { id: "wk-action-heritage-04", name: "Soiree lancement Heritage", category: "BTL" as const, actionType: "EVENT", budget: 1500000, aarrStage: "ACTIVATION", startDate: T.heritageLive, endDate: T.heritageLive },
    { id: "wk-action-heritage-05", name: "PLV et merchandising boutiques", category: "BTL" as const, actionType: "PLV", budget: 800000, aarrStage: "REVENUE", startDate: daysAfter(T.heritageLive, -2), endDate: T.heritagePost },
  ];

  for (const a of heritageActions) {
    await prisma.campaignAction.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        campaignId: IDS.campaignHeritage,
        name: a.name,
        category: a.category,
        actionType: a.actionType,
        budget: a.budget,
        status: "COMPLETED",
        aarrStage: a.aarrStage,
        startDate: a.startDate,
        endDate: a.endDate,
        createdAt: T.campaignPlanning,
      },
    });
    track("CampaignAction");
  }

  // 4 CampaignExecution
  const heritageExecs = [
    { id: "wk-exec-heritage-01", actionId: "wk-action-heritage-01", title: "Production KV OOH 4x3", state: "TERMINE" as const, executionType: "OOH", vendor: "Wakanda Print Co", devisAmount: 850000 },
    { id: "wk-exec-heritage-02", actionId: "wk-action-heritage-02", title: "Creation visuels Instagram", state: "TERMINE" as const, executionType: "PHOTO_PROD", vendor: null, devisAmount: 350000 },
    { id: "wk-exec-heritage-03", actionId: "wk-action-heritage-03", title: "Tournage video teaser", state: "TERMINE" as const, executionType: "VIDEO_PROD", vendor: "Wakanda Films", devisAmount: 420000 },
    { id: "wk-exec-heritage-04", actionId: "wk-action-heritage-04", title: "Organisation soiree lancement", state: "TERMINE" as const, executionType: "EVENT", vendor: "Biryongo Events", devisAmount: 1200000 },
  ];

  for (const e of heritageExecs) {
    await prisma.campaignExecution.upsert({
      where: { id: e.id },
      update: {},
      create: {
        id: e.id,
        actionId: e.actionId,
        campaignId: IDS.campaignHeritage,
        title: e.title,
        productionState: e.state,
        executionType: e.executionType,
        vendor: e.vendor,
        devisAmount: e.devisAmount,
        createdAt: T.missionsStart,
      },
    });
    track("CampaignExecution");
  }

  // 3 CampaignAmplification
  const heritageAmps = [
    { id: "wk-amp-heritage-01", platform: "INSTAGRAM", budget: 1200000, impressions: 320000, clicks: 12800, conversions: 640, cpa: 1875, roas: 3.2, status: "COMPLETED", mediaType: "DIGITAL_AD" },
    { id: "wk-amp-heritage-02", platform: "TIKTOK", budget: 600000, impressions: 450000, clicks: 18000, conversions: 360, cpa: 1667, roas: 2.8, status: "COMPLETED", mediaType: "DIGITAL_AD" },
    { id: "wk-amp-heritage-03", platform: "META_ADS", budget: 400000, impressions: 180000, clicks: 5400, conversions: 162, cpa: 2469, roas: 2.1, status: "COMPLETED", mediaType: "DIGITAL_AD" },
  ];

  for (const amp of heritageAmps) {
    await prisma.campaignAmplification.upsert({
      where: { id: amp.id },
      update: {},
      create: {
        id: amp.id,
        campaignId: IDS.campaignHeritage,
        platform: amp.platform,
        budget: amp.budget,
        impressions: amp.impressions,
        clicks: amp.clicks,
        conversions: amp.conversions,
        cpa: amp.cpa,
        roas: amp.roas,
        status: amp.status,
        mediaType: amp.mediaType,
        startDate: T.heritageLive,
        endDate: T.heritagePost,
        createdAt: T.heritageLive,
      },
    });
    track("CampaignAmplification");
  }

  // 4 CampaignMilestone (all completed)
  const heritageMilestones = [
    { id: "wk-ms-heritage-01", title: "Brief valide", dueDate: T.campaignBriefed, phase: "BRIEF_VALIDATED" },
    { id: "wk-ms-heritage-02", title: "Production terminee", dueDate: T.missionsEnd, phase: "PRODUCTION" },
    { id: "wk-ms-heritage-03", title: "Lancement campagne", dueDate: T.heritageLive, phase: "LIVE" },
    { id: "wk-ms-heritage-04", title: "Bilan post-campagne", dueDate: T.heritagePost, phase: "POST_CAMPAIGN" },
  ];

  for (const ms of heritageMilestones) {
    await prisma.campaignMilestone.upsert({
      where: { id: ms.id },
      update: {},
      create: {
        id: ms.id,
        campaignId: IDS.campaignHeritage,
        title: ms.title,
        dueDate: ms.dueDate,
        completed: true,
        completedAt: ms.dueDate,
        phase: ms.phase,
        status: "COMPLETED",
        createdAt: T.campaignPlanning,
      },
    });
    track("CampaignMilestone");
  }

  // 2 CampaignApproval (approved)
  const heritageApprovals = [
    { id: "wk-approval-heritage-01", fromState: "BRIEF_DRAFT" as const, toState: "BRIEF_VALIDATED" as const, approvalType: "BRIEF", approverId: IDS.userAmara },
    { id: "wk-approval-heritage-02", fromState: "APPROVAL" as const, toState: "READY_TO_LAUNCH" as const, approvalType: "LAUNCH", approverId: IDS.userNakia },
  ];

  for (const ap of heritageApprovals) {
    await prisma.campaignApproval.upsert({
      where: { id: ap.id },
      update: {},
      create: {
        id: ap.id,
        campaignId: IDS.campaignHeritage,
        approverId: ap.approverId,
        fromState: ap.fromState,
        toState: ap.toState,
        status: "APPROVED",
        approvalType: ap.approvalType,
        decidedAt: T.campaignPlanning,
        createdAt: T.campaignPlanning,
      },
    });
    track("CampaignApproval");
  }

  // 6 BudgetLine
  const heritageBudget = [
    { id: "wk-bl-heritage-01", category: "PRODUCTION", label: "Production KV et video", planned: 1600000, actual: 1620000 },
    { id: "wk-bl-heritage-02", category: "MEDIA", label: "Achat media digital", planned: 2200000, actual: 2200000 },
    { id: "wk-bl-heritage-03", category: "MEDIA", label: "Affichage OOH", planned: 2500000, actual: 2500000 },
    { id: "wk-bl-heritage-04", category: "TALENT", label: "Honoraires freelances", planned: 800000, actual: 750000 },
    { id: "wk-bl-heritage-05", category: "LOGISTICS", label: "Evenement lancement", planned: 1200000, actual: 1280000 },
    { id: "wk-bl-heritage-06", category: "CONTINGENCY", label: "Reserve imprevus", planned: 200000, actual: 150000 },
  ];

  for (const bl of heritageBudget) {
    await prisma.budgetLine.upsert({
      where: { id: bl.id },
      update: {},
      create: {
        id: bl.id,
        campaignId: IDS.campaignHeritage,
        category: bl.category,
        label: bl.label,
        planned: bl.planned,
        actual: bl.actual,
        createdAt: T.campaignPlanning,
      },
    });
    track("BudgetLine");
  }

  // 2 CampaignFieldOp
  const heritageFieldOps = [
    { id: "wk-fieldop-heritage-01", name: "Activation centre commercial Biryongo", location: "Biryongo Mall, Wakanda City", date: T.heritageLive, status: "COMPLETED" as const, teamSize: 8, budget: 450000 },
    { id: "wk-fieldop-heritage-02", name: "Pop-up marche artisanal", location: "Marche Central, Biryongo", date: daysAfter(T.heritageLive, 3), status: "COMPLETED" as const, teamSize: 5, budget: 250000 },
  ];

  for (const fo of heritageFieldOps) {
    await prisma.campaignFieldOp.upsert({
      where: { id: fo.id },
      update: {},
      create: {
        id: fo.id,
        campaignId: IDS.campaignHeritage,
        name: fo.name,
        location: fo.location,
        date: fo.date,
        status: fo.status,
        teamSize: fo.teamSize,
        budget: fo.budget,
        createdAt: T.campaignPlanning,
      },
    });
    track("CampaignFieldOp");
  }

  // 2 CampaignFieldReport
  for (let i = 0; i < 2; i++) {
    await prisma.campaignFieldReport.upsert({
      where: { id: `wk-fieldreport-heritage-${i + 1}` },
      update: {},
      create: {
        id: `wk-fieldreport-heritage-${i + 1}`,
        fieldOpId: heritageFieldOps[i].id,
        campaignId: IDS.campaignHeritage,
        reporterName: i === 0 ? "Okoye Dora" : "Nakia Okoye",
        data: { ambiance: "Excellente", frequentation: i === 0 ? 1200 : 680, echantillonsDistribues: i === 0 ? 500 : 300, ventesDirectes: i === 0 ? 85 : 42 } as Prisma.InputJsonValue,
        status: "VALIDATED",
        acquisitionCount: i === 0 ? 500 : 300,
        acquisitionLabel: "Echantillons distribues",
        activationCount: i === 0 ? 85 : 42,
        activationLabel: "Ventes directes",
        submittedAt: daysAfter(T.heritageLive, i + 1),
      },
    });
    track("CampaignFieldReport");
  }

  // 5 CampaignAARRMetric
  const heritageAarr = [
    { id: "wk-aarr-heritage-01", stage: "ACQUISITION" as const, metric: "impressions_totales", value: 950000, target: 500000, period: "2026-03" },
    { id: "wk-aarr-heritage-02", stage: "ACTIVATION" as const, metric: "coffrets_vendus", value: 1247, target: 1200, period: "2026-03" },
    { id: "wk-aarr-heritage-03", stage: "RETENTION" as const, metric: "reachat_30j", value: 0.68, target: 0.60, period: "2026-03" },
    { id: "wk-aarr-heritage-04", stage: "REVENUE" as const, metric: "ca_genere", value: 4850000, target: 4200000, period: "2026-03" },
    { id: "wk-aarr-heritage-05", stage: "REFERRAL" as const, metric: "parrainages", value: 178, target: 150, period: "2026-03" },
  ];

  for (const m of heritageAarr) {
    await prisma.campaignAARRMetric.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        campaignId: IDS.campaignHeritage,
        stage: m.stage,
        metric: m.metric,
        value: m.value,
        target: m.target,
        period: m.period,
        measuredAt: T.heritagePost,
      },
    });
    track("CampaignAARRMetric");
  }

  // 1 CampaignReport (final)
  await prisma.campaignReport.upsert({
    where: { id: "wk-report-heritage-final" },
    update: {},
    create: {
      id: "wk-report-heritage-final",
      campaignId: IDS.campaignHeritage,
      title: "Bilan final Heritage Collection",
      reportType: "POST_CAMPAIGN",
      data: { roi: 3.1, budgetUtilise: 8500000, caGenere: 4850000, nps: 72, impressions: 950000, conversions: 1162, topAction: "Affichage OOH Biryongo" } as Prisma.InputJsonValue,
      summary: "Campagne Heritage Collection reussie. Tous les KPIs depasses sauf le NPS (72 vs 75 cible). ROI global de 3.1x. L'affichage OOH a ete le canal le plus performant en notoriete.",
      generatedAt: T.heritagePost,
    },
  });
  track("CampaignReport");

  // 2 CampaignLink
  await prisma.campaignLink.upsert({
    where: { campaignId_linkedType_linkedId: { campaignId: IDS.campaignHeritage, linkedType: "SIGNAL", linkedId: "wk-signal-bliss-14" } },
    update: {},
    create: { id: "wk-link-heritage-01", campaignId: IDS.campaignHeritage, linkedType: "SIGNAL", linkedId: "wk-signal-bliss-14" },
  });
  await prisma.campaignLink.upsert({
    where: { campaignId_linkedType_linkedId: { campaignId: IDS.campaignHeritage, linkedType: "SIGNAL", linkedId: "wk-signal-bliss-11" } },
    update: {},
    create: { id: "wk-link-heritage-02", campaignId: IDS.campaignHeritage, linkedType: "SIGNAL", linkedId: "wk-signal-bliss-11" },
  });
  track("CampaignLink", 2);

  // 5 CampaignAsset
  const heritageAssets = [
    { id: "wk-casset-heritage-01", name: "KV Heritage 4x3", fileUrl: "/demo/bliss/heritage-kv-4x3.jpg", assetType: "KEY_VISUAL", category: "VISUAL" },
    { id: "wk-casset-heritage-02", name: "Video Teaser 30s", fileUrl: "/demo/bliss/heritage-teaser.mp4", assetType: "VIDEO", category: "VIDEO" },
    { id: "wk-casset-heritage-03", name: "Declinaison Instagram Stories", fileUrl: "/demo/bliss/heritage-stories.zip", assetType: "PRINT", category: "SOCIAL" },
    { id: "wk-casset-heritage-04", name: "PLV Presentoir", fileUrl: "/demo/bliss/heritage-plv.pdf", assetType: "PRINT", category: "PLV" },
    { id: "wk-casset-heritage-05", name: "Photo Packshot Coffret", fileUrl: "/demo/bliss/heritage-packshot.jpg", assetType: "KEY_VISUAL", category: "PHOTO" },
  ];

  for (const ca of heritageAssets) {
    await prisma.campaignAsset.upsert({
      where: { id: ca.id },
      update: {},
      create: {
        id: ca.id,
        campaignId: IDS.campaignHeritage,
        name: ca.name,
        fileUrl: ca.fileUrl,
        assetType: ca.assetType,
        category: ca.category,
        createdAt: T.missionsEnd,
      },
    });
    track("CampaignAsset");
  }

  // 6 CampaignTeamMember
  const heritageTeam = [
    { userId: IDS.userNakia, role: "ACCOUNT_DIRECTOR" as const },
    { userId: IDS.userOkoye, role: "ACCOUNT_MANAGER" as const },
    { userId: IDS.userAmara, role: "CLIENT" as const },
    { userId: "wk-user-kofi-asante", role: "ART_DIRECTOR" as const },
    { userId: "wk-user-aya-mensah", role: "COPYWRITER" as const },
    { userId: "wk-user-kwame-fotso", role: "PRODUCTION_MANAGER" as const },
  ];

  for (let i = 0; i < heritageTeam.length; i++) {
    await prisma.campaignTeamMember.upsert({
      where: { campaignId_userId: { campaignId: IDS.campaignHeritage, userId: heritageTeam[i].userId } },
      update: {},
      create: {
        id: `wk-team-heritage-${i + 1}`,
        campaignId: IDS.campaignHeritage,
        userId: heritageTeam[i].userId,
        role: heritageTeam[i].role,
        createdAt: T.teamAssembled,
      },
    });
    track("CampaignTeamMember");
  }

  // ================================================================
  // CAMPAIGN 2 — BLISS "Vibranium Glow" (LIVE)
  // ================================================================
  await prisma.campaign.upsert({
    where: { id: IDS.campaignGlow },
    update: {},
    create: {
      id: IDS.campaignGlow,
      name: "Vibranium Glow",
      strategyId: brands.bliss.strategy.id,
      status: "ACTIVE",
      state: "LIVE",
      budget: 12000000,
      budgetCurrency: "XAF",
      startDate: T.glowLaunch,
      endDate: daysAfter(T.now, 30),
      code: "CAMP-2026-002",
      objectives: { primary: "Lancer le Serum Vibranium Glow comme hero product", kpis: ["1M impressions", "20K ventes", "2500 abonnes app"] } as Prisma.InputJsonValue,
      createdAt: T.campaignPlanning,
    },
  });
  track("Campaign");

  // Brief
  await prisma.campaignBrief.upsert({
    where: { id: "wk-brief-glow-01" },
    update: {},
    create: {
      id: "wk-brief-glow-01",
      campaignId: IDS.campaignGlow,
      title: "Brief creatif Vibranium Glow",
      content: { objective: "Positionner le serum comme produit iconique", tone: "Scientifique-mystique, confiant", target: "Femmes 25-35 early adopters beaute tech", keyMessage: "Le vibranium revele votre lumiere." } as Prisma.InputJsonValue,
      status: "APPROVED",
      briefType: "CREATIVE",
      createdAt: daysAfter(T.campaignPlanning, 5),
    },
  });
  track("CampaignBrief");

  // 8 CampaignActions
  const glowActions = [
    { id: "wk-action-glow-01", name: "Campagne Instagram Reels", category: "TTL" as const, actionType: "SOCIAL_PAID", budget: 2000000, status: "IN_PROGRESS" },
    { id: "wk-action-glow-02", name: "TikTok Creators Challenge", category: "TTL" as const, actionType: "INFLUENCER", budget: 1500000, status: "IN_PROGRESS" },
    { id: "wk-action-glow-03", name: "OOH Metro Biryongo", category: "ATL" as const, actionType: "OOH_TRANSIT", budget: 3000000, status: "IN_PROGRESS" },
    { id: "wk-action-glow-04", name: "Activation boutique flagship", category: "BTL" as const, actionType: "RETAIL", budget: 1000000, status: "IN_PROGRESS" },
    { id: "wk-action-glow-05", name: "Push notification app BLISS", category: "TTL" as const, actionType: "DIGITAL_CRM", budget: 200000, status: "IN_PROGRESS" },
    { id: "wk-action-glow-06", name: "Email sequence lancement", category: "TTL" as const, actionType: "EMAIL", budget: 150000, status: "IN_PROGRESS" },
    { id: "wk-action-glow-07", name: "LinkedIn Thought Leadership", category: "TTL" as const, actionType: "SOCIAL_ORGANIC", budget: 300000, status: "PLANNED" },
    { id: "wk-action-glow-08", name: "Partenariat presse beaute", category: "ATL" as const, actionType: "PR", budget: 500000, status: "IN_PROGRESS" },
  ];

  for (const a of glowActions) {
    await prisma.campaignAction.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        campaignId: IDS.campaignGlow,
        name: a.name,
        category: a.category,
        actionType: a.actionType,
        budget: a.budget,
        status: a.status,
        startDate: T.glowLaunch,
        endDate: daysAfter(T.now, 30),
        createdAt: T.campaignPlanning,
      },
    });
    track("CampaignAction");
  }

  // 6 CampaignExecution for Glow
  const glowExecs = [
    { id: "wk-exec-glow-01", actionId: "wk-action-glow-01", title: "Production visuels Reels", state: "TERMINE" as const },
    { id: "wk-exec-glow-02", actionId: "wk-action-glow-02", title: "Selection creators TikTok", state: "EN_PRODUCTION" as const },
    { id: "wk-exec-glow-03", actionId: "wk-action-glow-03", title: "Impression affiches metro", state: "INSTALLE" as const },
    { id: "wk-exec-glow-04", actionId: "wk-action-glow-04", title: "Amenagement corner boutique", state: "EN_PRODUCTION" as const },
    { id: "wk-exec-glow-05", actionId: "wk-action-glow-05", title: "Setup push notifications", state: "TERMINE" as const },
    { id: "wk-exec-glow-06", actionId: "wk-action-glow-08", title: "Dossier presse", state: "LIVRAISON" as const },
  ];

  for (const e of glowExecs) {
    await prisma.campaignExecution.upsert({
      where: { id: e.id },
      update: {},
      create: {
        id: e.id,
        actionId: e.actionId,
        campaignId: IDS.campaignGlow,
        title: e.title,
        productionState: e.state,
        createdAt: T.glowLaunch,
      },
    });
    track("CampaignExecution");
  }

  // 6 CampaignMilestone for Glow
  const glowMilestones = [
    { id: "wk-ms-glow-01", title: "Brief valide", dueDate: daysAfter(T.campaignPlanning, 5), completed: true, status: "COMPLETED" },
    { id: "wk-ms-glow-02", title: "Production creative terminee", dueDate: daysAfter(T.glowLaunch, -3), completed: true, status: "COMPLETED" },
    { id: "wk-ms-glow-03", title: "Lancement J-Day", dueDate: T.glowLaunch, completed: true, status: "COMPLETED" },
    { id: "wk-ms-glow-04", title: "Review mi-campagne", dueDate: daysAfter(T.now, 5), completed: false, status: "IN_PROGRESS" },
    { id: "wk-ms-glow-05", title: "Optimisation phase 2", dueDate: daysAfter(T.now, 15), completed: false, status: "PENDING" },
    { id: "wk-ms-glow-06", title: "Bilan final", dueDate: daysAfter(T.now, 30), completed: false, status: "PENDING" },
  ];

  for (const ms of glowMilestones) {
    await prisma.campaignMilestone.upsert({
      where: { id: ms.id },
      update: {},
      create: {
        id: ms.id,
        campaignId: IDS.campaignGlow,
        title: ms.title,
        dueDate: ms.dueDate,
        completed: ms.completed,
        completedAt: ms.completed ? ms.dueDate : undefined,
        status: ms.status,
        createdAt: T.campaignPlanning,
      },
    });
    track("CampaignMilestone");
  }

  // 8 CampaignTeamMember for Glow
  const glowTeam = [
    { userId: IDS.userNakia, role: "ACCOUNT_DIRECTOR" as const },
    { userId: IDS.userOkoye, role: "ACCOUNT_MANAGER" as const },
    { userId: IDS.userAmara, role: "CLIENT" as const },
    { userId: IDS.userWkabi, role: "DATA_ANALYST" as const },
    { userId: "wk-user-kofi-asante", role: "CREATIVE_DIRECTOR" as const },
    { userId: "wk-user-aya-mensah", role: "COPYWRITER" as const },
    { userId: "wk-user-fatou-diallo", role: "PRODUCTION_MANAGER" as const },
    { userId: "wk-user-issa-ndiaye", role: "SOCIAL_MANAGER" as const },
  ];

  for (let i = 0; i < glowTeam.length; i++) {
    await prisma.campaignTeamMember.upsert({
      where: { campaignId_userId: { campaignId: IDS.campaignGlow, userId: glowTeam[i].userId } },
      update: {},
      create: {
        id: `wk-team-glow-${i + 1}`,
        campaignId: IDS.campaignGlow,
        userId: glowTeam[i].userId,
        role: glowTeam[i].role,
        createdAt: T.glowLaunch,
      },
    });
    track("CampaignTeamMember");
  }

  // 10 BudgetLine for Glow
  const glowBudget = [
    { id: "wk-bl-glow-01", category: "MEDIA", label: "Instagram Ads", planned: 2000000, actual: 1200000 },
    { id: "wk-bl-glow-02", category: "MEDIA", label: "TikTok Creators", planned: 1500000, actual: 800000 },
    { id: "wk-bl-glow-03", category: "MEDIA", label: "OOH Metro", planned: 3000000, actual: 3000000 },
    { id: "wk-bl-glow-04", category: "PRODUCTION", label: "Production creative", planned: 1500000, actual: 1350000 },
    { id: "wk-bl-glow-05", category: "TALENT", label: "Freelances creatifs", planned: 1000000, actual: 600000 },
    { id: "wk-bl-glow-06", category: "LOGISTICS", label: "Activation retail", planned: 1000000, actual: 450000 },
    { id: "wk-bl-glow-07", category: "TECHNOLOGY", label: "Push notifications + CRM", planned: 350000, actual: 200000 },
    { id: "wk-bl-glow-08", category: "AGENCY_FEE", label: "Fee agence", planned: 800000, actual: 800000 },
    { id: "wk-bl-glow-09", category: "PRODUCTION", label: "Dossier presse", planned: 500000, actual: 300000 },
    { id: "wk-bl-glow-10", category: "CONTINGENCY", label: "Reserve", planned: 350000, actual: 0 },
  ];

  for (const bl of glowBudget) {
    await prisma.budgetLine.upsert({
      where: { id: bl.id },
      update: {},
      create: {
        id: bl.id,
        campaignId: IDS.campaignGlow,
        category: bl.category,
        label: bl.label,
        planned: bl.planned,
        actual: bl.actual,
        createdAt: T.campaignPlanning,
      },
    });
    track("BudgetLine");
  }

  // 2 CampaignDependency (Heritage → Glow)
  await prisma.campaignDependency.upsert({
    where: { sourceId_targetId: { sourceId: IDS.campaignHeritage, targetId: IDS.campaignGlow } },
    update: {},
    create: {
      id: "wk-dep-heritage-glow-01",
      sourceId: IDS.campaignHeritage,
      targetId: IDS.campaignGlow,
      depType: "SEQUENCED",
      createdAt: T.campaignPlanning,
    },
  });
  track("CampaignDependency");

  // ================================================================
  // CAMPAIGN 3 — SHURI "Back to School" (PLANNING)
  // ================================================================
  await prisma.campaign.upsert({
    where: { id: IDS.campaignSchool },
    update: {},
    create: {
      id: IDS.campaignSchool,
      name: "Back to School",
      strategyId: brands.shuri.strategy.id,
      status: "ACTIVE",
      state: "PLANNING",
      budget: 3000000,
      budgetCurrency: "XAF",
      startDate: daysAfter(T.now, 20),
      endDate: daysAfter(T.now, 60),
      code: "CAMP-2026-003",
      createdAt: daysAfter(T.now, -10),
    },
  });
  track("Campaign");

  await prisma.campaignBrief.upsert({
    where: { id: "wk-brief-school-01" },
    update: {},
    create: {
      id: "wk-brief-school-01",
      campaignId: IDS.campaignSchool,
      title: "Brief Rentree Shuri Academy",
      content: { objective: "Recruter 500 nouveaux etudiants pour la rentree", tone: "Motivant, accessible, moderne", target: "Jeunes 18-28 ans, diplomes ou en reconversion" } as Prisma.InputJsonValue,
      status: "APPROVED",
      briefType: "CREATIVE",
      createdAt: daysAfter(T.now, -8),
    },
  });
  track("CampaignBrief");

  const schoolActions = [
    { id: "wk-action-school-01", name: "Campagne LinkedIn Education", category: "TTL" as const, actionType: "SOCIAL_PAID", budget: 1000000 },
    { id: "wk-action-school-02", name: "Webinaire portes ouvertes", category: "BTL" as const, actionType: "EVENT", budget: 500000 },
    { id: "wk-action-school-03", name: "Affichage universites", category: "BTL" as const, actionType: "OOH_POSTER", budget: 800000 },
  ];

  for (const a of schoolActions) {
    await prisma.campaignAction.upsert({
      where: { id: a.id },
      update: {},
      create: { id: a.id, campaignId: IDS.campaignSchool, name: a.name, category: a.category, actionType: a.actionType, budget: a.budget, status: "PLANNED", createdAt: daysAfter(T.now, -5) },
    });
    track("CampaignAction");
  }

  // 4 TeamMembers
  const schoolTeam = [
    { userId: IDS.userShuri, role: "CLIENT" as const },
    { userId: IDS.userNakia, role: "ACCOUNT_DIRECTOR" as const },
    { userId: "wk-user-aya-mensah", role: "COPYWRITER" as const },
    { userId: "wk-user-issa-ndiaye", role: "SOCIAL_MANAGER" as const },
  ];
  for (let i = 0; i < schoolTeam.length; i++) {
    await prisma.campaignTeamMember.upsert({
      where: { campaignId_userId: { campaignId: IDS.campaignSchool, userId: schoolTeam[i].userId } },
      update: {},
      create: { id: `wk-team-school-${i + 1}`, campaignId: IDS.campaignSchool, userId: schoolTeam[i].userId, role: schoolTeam[i].role },
    });
    track("CampaignTeamMember");
  }

  // 4 BudgetLine
  const schoolBudget = [
    { id: "wk-bl-school-01", category: "MEDIA", label: "LinkedIn Ads", planned: 1000000, actual: 0 },
    { id: "wk-bl-school-02", category: "LOGISTICS", label: "Webinaire", planned: 500000, actual: 0 },
    { id: "wk-bl-school-03", category: "MEDIA", label: "Affichage", planned: 800000, actual: 0 },
    { id: "wk-bl-school-04", category: "PRODUCTION", label: "Visuels creatifs", planned: 700000, actual: 0 },
  ];
  for (const bl of schoolBudget) {
    await prisma.budgetLine.upsert({
      where: { id: bl.id },
      update: {},
      create: { id: bl.id, campaignId: IDS.campaignSchool, category: bl.category, label: bl.label, planned: bl.planned, actual: bl.actual },
    });
    track("BudgetLine");
  }

  // ================================================================
  // CAMPAIGN 4 — VIBRANIUM "Financial Freedom" (BRIEF_DRAFT)
  // ================================================================
  await prisma.campaign.upsert({
    where: { id: IDS.campaignFreedom },
    update: {},
    create: {
      id: IDS.campaignFreedom,
      name: "Financial Freedom",
      strategyId: brands.vibranium.strategy.id,
      status: "DRAFT",
      state: "BRIEF_DRAFT",
      budget: 5000000,
      budgetCurrency: "XAF",
      code: "CAMP-2026-004",
      createdAt: daysAfter(T.now, -3),
    },
  });
  track("Campaign");

  await prisma.campaignBrief.upsert({
    where: { id: "wk-brief-freedom-01" },
    update: {},
    create: {
      id: "wk-brief-freedom-01",
      campaignId: IDS.campaignFreedom,
      title: "Brief Financial Freedom",
      content: { objective: "Democratiser l'acces a l'epargne digitale au Wakanda", tone: "Confiant, simple, inclusif", target: "Jeunes actifs 22-35 ans, premier emploi" } as Prisma.InputJsonValue,
      status: "DRAFT",
      briefType: "CREATIVE",
      createdAt: daysAfter(T.now, -3),
    },
  });
  track("CampaignBrief");

  // 2 TeamMembers
  await prisma.campaignTeamMember.upsert({
    where: { campaignId_userId: { campaignId: IDS.campaignFreedom, userId: IDS.userTchalla } },
    update: {},
    create: { id: "wk-team-freedom-01", campaignId: IDS.campaignFreedom, userId: IDS.userTchalla, role: "CLIENT" },
  });
  await prisma.campaignTeamMember.upsert({
    where: { campaignId_userId: { campaignId: IDS.campaignFreedom, userId: IDS.userNakia } },
    update: {},
    create: { id: "wk-team-freedom-02", campaignId: IDS.campaignFreedom, userId: IDS.userNakia, role: "ACCOUNT_DIRECTOR" },
  });
  track("CampaignTeamMember", 2);

  // ================================================================
  // CAMPAIGN 5 — WAKANDA BREW "Harvest Festival" (POST_CAMPAIGN)
  // ================================================================
  await prisma.campaign.upsert({
    where: { id: IDS.campaignHarvest },
    update: {},
    create: {
      id: IDS.campaignHarvest,
      name: "Harvest Festival",
      strategyId: brands.brew.strategy.id,
      status: "COMPLETED",
      state: "POST_CAMPAIGN",
      budget: 2000000,
      budgetCurrency: "XAF",
      startDate: daysAfter(T.now, -45),
      endDate: daysAfter(T.now, -30),
      code: "CAMP-2026-005",
      createdAt: daysAfter(T.now, -60),
    },
  });
  track("Campaign");

  await prisma.campaignReport.upsert({
    where: { id: "wk-report-harvest-final" },
    update: {},
    create: {
      id: "wk-report-harvest-final",
      campaignId: IDS.campaignHarvest,
      title: "Bilan Harvest Festival",
      reportType: "POST_CAMPAIGN",
      data: { roi: 1.8, budgetUtilise: 1950000, frequentation: 3200, ventesDirectes: 850000, nps: 65 } as Prisma.InputJsonValue,
      summary: "Festival recolte Wakanda Brew : bonne frequentation mais ROI en dessous de l'objectif. Le format evenementiel a bien fonctionne pour la notoriete locale.",
      generatedAt: daysAfter(T.now, -28),
    },
  });
  track("CampaignReport");

  const harvestActions = [
    { id: "wk-action-harvest-01", name: "Stand degustation festival", category: "BTL" as const, actionType: "EVENT", budget: 800000, status: "COMPLETED" },
    { id: "wk-action-harvest-02", name: "Affichage local marche", category: "BTL" as const, actionType: "OOH_POSTER", budget: 300000, status: "COMPLETED" },
    { id: "wk-action-harvest-03", name: "Campagne Facebook locale", category: "TTL" as const, actionType: "SOCIAL_PAID", budget: 500000, status: "COMPLETED" },
  ];
  for (const a of harvestActions) {
    await prisma.campaignAction.upsert({
      where: { id: a.id },
      update: {},
      create: { id: a.id, campaignId: IDS.campaignHarvest, name: a.name, category: a.category, actionType: a.actionType, budget: a.budget, status: a.status, createdAt: daysAfter(T.now, -55) },
    });
    track("CampaignAction");
  }

  // 2 BudgetLine for Harvest
  await prisma.budgetLine.upsert({ where: { id: "wk-bl-harvest-01" }, update: {}, create: { id: "wk-bl-harvest-01", campaignId: IDS.campaignHarvest, category: "LOGISTICS", label: "Festival stand", planned: 1000000, actual: 950000 } });
  await prisma.budgetLine.upsert({ where: { id: "wk-bl-harvest-02" }, update: {}, create: { id: "wk-bl-harvest-02", campaignId: IDS.campaignHarvest, category: "MEDIA", label: "Affichage + Facebook", planned: 1000000, actual: 1000000 } });
  track("BudgetLine", 2);

  // ================================================================
  // CAMPAIGN TEMPLATE
  // ================================================================
  await prisma.campaignTemplate.upsert({
    where: { id: "wk-template-lancement" },
    update: {},
    create: {
      id: "wk-template-lancement",
      name: "Lancement Produit Wakanda",
      description: "Template standard pour le lancement d'un nouveau produit au Wakanda. Inclut les phases teasing, lancement, et soutien.",
      category: "PRODUCT_LAUNCH",
      actionTypes: ["OOH_BILLBOARD", "SOCIAL_PAID", "INFLUENCER", "EVENT", "PR", "EMAIL"] as Prisma.InputJsonValue,
      budget: 10000000,
      timeline: { teasing: "2 semaines", lancement: "1 semaine", soutien: "4 semaines" } as Prisma.InputJsonValue,
      channels: ["INSTAGRAM", "TIKTOK", "OOH", "EVENT", "PR"] as Prisma.InputJsonValue,
      createdAt: T.teamAssembled,
    },
  });
  track("CampaignTemplate");

  console.log("[OK] Campaigns: 5 campaigns + 1 template (full lifecycle data)");
}
