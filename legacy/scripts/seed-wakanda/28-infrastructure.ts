/**
 * WAKANDA SEED — Infrastructure
 *
 * AuditLog (12), AICostLog (6), Notification (6),
 * NotificationPreference (2), FileUpload (3), Process (3),
 * OrchestrationPlan (2), OrchestrationStep (8), MestorThread (3),
 * InterventionRequest (1), Conversation (3) + Message (10),
 * QuickIntake (2), BadgeDefinition (3) + UserBadge (4)
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

export async function seedInfrastructure(prisma: PrismaClient, brands: Brands, users: WakandaUsers) {

  // ================================================================
  // AUDIT LOGS (12)
  // ================================================================
  const auditLogs = [
    { id: "wk-audit-01", userId: IDS.userAmara, action: "CREATE" as const, entityType: "Strategy", entityId: IDS.stratBliss, createdAt: T.intakeConverted },
    { id: "wk-audit-02", userId: IDS.userAmara, action: "LOGIN" as const, entityType: "User", entityId: IDS.userAmara, createdAt: T.intake },
    { id: "wk-audit-03", userId: IDS.userNakia, action: "UPDATE" as const, entityType: "Pillar", entityId: "wk-pillar-bliss-a", createdAt: T.bootAD },
    { id: "wk-audit-04", userId: IDS.userOkoye, action: "APPROVE" as const, entityType: "Recommendation", entityId: "wk-reco-bliss-01", createdAt: T.recosReviewed },
    { id: "wk-audit-05", userId: IDS.userWkabi, action: "CREATE" as const, entityType: "Contract", entityId: IDS.contractBliss, createdAt: T.contractSigned },
    { id: "wk-audit-06", userId: IDS.userAmara, action: "APPROVE" as const, entityType: "CampaignBrief", entityId: "wk-brief-heritage-01", createdAt: T.campaignBriefed },
    { id: "wk-audit-07", userId: IDS.userNakia, action: "UPDATE" as const, entityType: "Campaign", entityId: IDS.campaignHeritage, createdAt: T.heritageLive },
    { id: "wk-audit-08", userId: IDS.userShuri, action: "CREATE" as const, entityType: "Strategy", entityId: IDS.stratShuri, createdAt: daysAfter(T.now, -60) },
    { id: "wk-audit-09", userId: IDS.userTchalla, action: "LOGIN" as const, entityType: "User", entityId: IDS.userTchalla, createdAt: daysAfter(T.now, -45) },
    { id: "wk-audit-10", userId: IDS.userMbaku, action: "REJECT" as const, entityType: "Recommendation", entityId: "wk-reco-jabari-01", createdAt: daysAfter(T.now, -15) },
    { id: "wk-audit-11", userId: IDS.userOkoye, action: "UPDATE" as const, entityType: "Campaign", entityId: IDS.campaignGlow, createdAt: T.glowLaunch },
    { id: "wk-audit-12", userId: IDS.userAmara, action: "EXPORT" as const, entityType: "InsightReport", entityId: "wk-insight-03", createdAt: daysAfter(T.now, -3) },
  ];

  for (const log of auditLogs) {
    await prisma.auditLog.upsert({
      where: { id: log.id },
      update: {},
      create: {
        id: log.id,
        userId: log.userId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        ipAddress: "192.168.1.42",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) BLISS-App/1.0",
        createdAt: log.createdAt,
      },
    });
    track("AuditLog");
  }

  // ================================================================
  // AI COST LOGS (6)
  // ================================================================
  const aiCosts = [
    { id: "wk-aicost-01", model: "claude-sonnet-4-20250514", inputTokens: 12500, outputTokens: 3200, cost: 0.08, context: "artemis", strategyId: IDS.stratBliss, createdAt: T.rtisCascade },
    { id: "wk-aicost-02", model: "claude-sonnet-4-20250514", inputTokens: 8200, outputTokens: 2800, cost: 0.06, context: "vault-enrichment", strategyId: IDS.stratBliss, createdAt: T.vaultEnrichment },
    { id: "wk-aicost-03", model: "claude-sonnet-4-20250514", inputTokens: 25000, outputTokens: 8500, cost: 0.18, context: "boot-sequence", strategyId: IDS.stratBliss, createdAt: T.bootStart },
    { id: "wk-aicost-04", model: "claude-sonnet-4-20250514", inputTokens: 18000, outputTokens: 6200, cost: 0.14, context: "rtis-protocols", strategyId: IDS.stratBliss, createdAt: T.rtisCascade },
    { id: "wk-aicost-05", model: "claude-sonnet-4-20250514", inputTokens: 15000, outputTokens: 5000, cost: 0.11, context: "artemis", strategyId: IDS.stratShuri, createdAt: daysAfter(T.now, -20) },
    { id: "wk-aicost-06", model: "claude-sonnet-4-20250514", inputTokens: 9500, outputTokens: 3100, cost: 0.07, context: "boot-sequence", strategyId: IDS.stratVibranium, createdAt: daysAfter(T.now, -45) },
  ];

  for (const ac of aiCosts) {
    await prisma.aICostLog.upsert({
      where: { id: ac.id },
      update: {},
      create: {
        id: ac.id,
        model: ac.model,
        provider: "anthropic",
        inputTokens: ac.inputTokens,
        outputTokens: ac.outputTokens,
        cost: ac.cost,
        currency: "USD",
        context: ac.context,
        strategyId: ac.strategyId,
        createdAt: ac.createdAt,
      },
    });
    track("AICostLog");
  }

  // ================================================================
  // NOTIFICATIONS (6 for BLISS users)
  // ================================================================
  const notifications = [
    { id: "wk-notif-01", userId: IDS.userAmara, channel: "IN_APP" as const, title: "Score ADVERTIS mis a jour", body: "BLISS atteint 200/200 — classification ICONE confirmee.", link: "/cockpit/bliss/scores", isRead: true, readAt: T.scoresValidated },
    { id: "wk-notif-02", userId: IDS.userAmara, channel: "IN_APP" as const, title: "Recommandation appliquee", body: "La recommandation sur le hero's journey a ete appliquee avec succes.", link: "/cockpit/bliss/recommendations", isRead: true, readAt: T.recosReviewed },
    { id: "wk-notif-03", userId: IDS.userOkoye, channel: "IN_APP" as const, title: "Campagne Heritage lancee", body: "La campagne Heritage Collection est maintenant LIVE.", link: `/cockpit/bliss/campaigns/${IDS.campaignHeritage}`, isRead: true, readAt: T.heritageLive },
    { id: "wk-notif-04", userId: IDS.userAmara, channel: "EMAIL" as const, title: "Nouveau signal Jehuty", body: "Signal marche : Concurrence prix segment premium — a consulter.", link: "/cockpit/bliss/jehuty", isRead: false },
    { id: "wk-notif-05", userId: IDS.userOkoye, channel: "IN_APP" as const, title: "Mission terminee", body: "La mission 'Direction artistique Heritage KV' est terminee. QC score : 9.2/10.", link: "/cockpit/bliss/missions", isRead: true, readAt: daysAfter(T.missionsEnd, 1) },
    { id: "wk-notif-06", userId: IDS.userAmara, channel: "IN_APP" as const, title: "Rapport disponible", body: "Le bilan post-campagne Heritage Collection est pret.", link: "/cockpit/bliss/campaigns/heritage/report", isRead: false },
  ];

  for (const n of notifications) {
    await prisma.notification.upsert({
      where: { id: n.id },
      update: {},
      create: {
        id: n.id,
        userId: n.userId,
        channel: n.channel,
        title: n.title,
        body: n.body,
        link: n.link,
        isRead: n.isRead,
        readAt: n.readAt || undefined,
        createdAt: n.readAt || daysAfter(T.now, -2),
      },
    });
    track("Notification");
  }

  // ================================================================
  // NOTIFICATION PREFERENCES (2)
  // ================================================================
  const notifPrefs = [
    { id: "wk-notifpref-amara", userId: IDS.userAmara, channels: { inApp: true, email: true, sms: false, push: true }, digestFrequency: "INSTANT" },
    { id: "wk-notifpref-okoye", userId: IDS.userOkoye, channels: { inApp: true, email: true, sms: false, push: false }, digestFrequency: "DAILY" },
  ];

  for (const pref of notifPrefs) {
    await prisma.notificationPreference.upsert({
      where: { userId: pref.userId },
      update: {},
      create: {
        id: pref.id,
        userId: pref.userId,
        channels: pref.channels as Prisma.InputJsonValue,
        digestFrequency: pref.digestFrequency,
      },
    });
    track("NotificationPreference");
  }

  // ================================================================
  // FILE UPLOADS (3 for BLISS)
  // ================================================================
  const uploads = [
    { id: "wk-upload-01", uploaderId: IDS.userAmara, fileName: "logo-bliss-final.svg", fileUrl: "/uploads/bliss/logo-bliss-final.svg", mimeType: "image/svg+xml", fileSize: 24500, entityType: "Strategy", entityId: IDS.stratBliss },
    { id: "wk-upload-02", uploaderId: IDS.userNakia, fileName: "brief-heritage-v2.pdf", fileUrl: "/uploads/bliss/brief-heritage-v2.pdf", mimeType: "application/pdf", fileSize: 1250000, entityType: "CampaignBrief", entityId: "wk-brief-heritage-01" },
    { id: "wk-upload-03", uploaderId: IDS.userAmara, fileName: "charte-graphique-bliss.pdf", fileUrl: "/uploads/bliss/charte-graphique-bliss.pdf", mimeType: "application/pdf", fileSize: 3800000, entityType: "Strategy", entityId: IDS.stratBliss },
  ];

  for (const up of uploads) {
    await prisma.fileUpload.upsert({
      where: { id: up.id },
      update: {},
      create: {
        id: up.id,
        uploaderId: up.uploaderId,
        fileName: up.fileName,
        fileUrl: up.fileUrl,
        mimeType: up.mimeType,
        fileSize: up.fileSize,
        entityType: up.entityType,
        entityId: up.entityId,
        createdAt: T.docsUploaded,
      },
    });
    track("FileUpload");
  }

  // ================================================================
  // PROCESSES (3)
  // ================================================================
  const processes = [
    { id: "wk-process-01", strategyId: IDS.stratBliss, type: "DAEMON" as const, name: "Social Sync BLISS", description: "Synchronisation automatique des metriques sociales Instagram, TikTok et LinkedIn.", status: "RUNNING" as const, frequency: "HOURLY", runCount: 720 },
    { id: "wk-process-02", strategyId: IDS.stratBliss, type: "TRIGGERED" as const, name: "Score Recalculation", description: "Recalcul des scores ADVERTIS suite a une modification de pilier.", status: "COMPLETED" as const, frequency: null, runCount: 8 },
    { id: "wk-process-03", strategyId: IDS.stratBliss, type: "BATCH" as const, name: "Weekly Report", description: "Generation du rapport hebdomadaire automatise pour le cockpit BLISS.", status: "RUNNING" as const, frequency: "WEEKLY", runCount: 12 },
  ];

  for (const proc of processes) {
    await prisma.process.upsert({
      where: { id: proc.id },
      update: {},
      create: {
        id: proc.id,
        strategyId: proc.strategyId,
        type: proc.type,
        name: proc.name,
        description: proc.description,
        status: proc.status,
        frequency: proc.frequency,
        runCount: proc.runCount,
        lastRunAt: daysAfter(T.now, -1),
        createdAt: T.socialConnected,
      },
    });
    track("Process");
  }

  // ================================================================
  // ORCHESTRATION PLANS (2) + STEPS (8)
  // ================================================================
  // Plan 1: Boot (completed)
  await prisma.orchestrationPlan.upsert({
    where: { id: IDS.orchBootBliss },
    update: {},
    create: {
      id: IDS.orchBootBliss,
      strategyId: IDS.stratBliss,
      phase: "BOOT",
      status: "COMPLETED",
      totalSteps: 4,
      completedSteps: 4,
      estimatedAiCalls: 12,
      startedAt: T.bootStart,
      completedAt: T.bootVE,
      createdAt: T.bootStart,
    },
  });
  track("OrchestrationPlan");

  const bootSteps = [
    { id: "wk-orchstep-boot-01", agent: "AUTO_FILLER", target: "a", description: "Remplissage automatique pilier Authenticite", status: "COMPLETED" },
    { id: "wk-orchstep-boot-02", agent: "AUTO_FILLER", target: "d", description: "Remplissage automatique pilier Distinction", status: "COMPLETED" },
    { id: "wk-orchstep-boot-03", agent: "AUTO_FILLER", target: "v", description: "Remplissage automatique pilier Valeur", status: "COMPLETED" },
    { id: "wk-orchstep-boot-04", agent: "AUTO_FILLER", target: "e", description: "Remplissage automatique pilier Engagement", status: "COMPLETED" },
  ];

  for (const step of bootSteps) {
    await prisma.orchestrationStep.upsert({
      where: { id: step.id },
      update: {},
      create: {
        id: step.id,
        planId: IDS.orchBootBliss,
        agent: step.agent,
        target: step.target,
        description: step.description,
        status: step.status,
        result: { score: 25, duration: "45s" } as Prisma.InputJsonValue,
        startedAt: T.bootStart,
        completedAt: T.bootVE,
        createdAt: T.bootStart,
      },
    });
    track("OrchestrationStep");
  }

  // Plan 2: Active (in progress)
  await prisma.orchestrationPlan.upsert({
    where: { id: IDS.orchActiveBliss },
    update: {},
    create: {
      id: IDS.orchActiveBliss,
      strategyId: IDS.stratBliss,
      phase: "ACTIVE",
      status: "RUNNING",
      totalSteps: 4,
      completedSteps: 2,
      estimatedAiCalls: 8,
      startedAt: T.glowLaunch,
      createdAt: T.glowLaunch,
    },
  });
  track("OrchestrationPlan");

  const activeSteps = [
    { id: "wk-orchstep-active-01", agent: "SCORE", target: "recalculate", description: "Recalcul scores post-Heritage", status: "COMPLETED" },
    { id: "wk-orchstep-active-02", agent: "COMMANDANT", target: "accept_recos", description: "Revue et acceptation recommandations Seshat", status: "COMPLETED" },
    { id: "wk-orchstep-active-03", agent: "ARTEMIS_SEQUENCE", target: "KV", description: "Generation KV Vibranium Glow", status: "RUNNING" },
    { id: "wk-orchstep-active-04", agent: "WAIT_HUMAN", target: "campaign_review", description: "Attente review mi-campagne Glow", status: "PENDING" },
  ];

  for (const step of activeSteps) {
    await prisma.orchestrationStep.upsert({
      where: { id: step.id },
      update: {},
      create: {
        id: step.id,
        planId: IDS.orchActiveBliss,
        agent: step.agent,
        target: step.target,
        description: step.description,
        status: step.status,
        startedAt: step.status !== "PENDING" ? T.glowLaunch : undefined,
        completedAt: step.status === "COMPLETED" ? daysAfter(T.glowLaunch, 3) : undefined,
        createdAt: T.glowLaunch,
      },
    });
    track("OrchestrationStep");
  }

  // ================================================================
  // MESTOR THREADS (3)
  // ================================================================
  const threads = [
    { id: "wk-mestor-01", userId: IDS.userAmara, context: "cockpit", strategyId: IDS.stratBliss, title: "Analyse Heritage Collection", messageCount: 12, lastMessageAt: daysAfter(T.now, -2) },
    { id: "wk-mestor-02", userId: IDS.userOkoye, context: "console", strategyId: IDS.stratBliss, title: "Optimisation Vibranium Glow", messageCount: 8, lastMessageAt: daysAfter(T.now, -1) },
    { id: "wk-mestor-03", userId: IDS.userAmara, context: "intake", strategyId: null, title: "Exploration nouvelle marque", messageCount: 3, lastMessageAt: daysAfter(T.now, -5) },
  ];

  for (const thread of threads) {
    await prisma.mestorThread.upsert({
      where: { id: thread.id },
      update: {},
      create: {
        id: thread.id,
        userId: thread.userId,
        context: thread.context,
        strategyId: thread.strategyId,
        title: thread.title,
        messageCount: thread.messageCount,
        lastMessageAt: thread.lastMessageAt,
        createdAt: T.teamAssembled,
      },
    });
    track("MestorThread");
  }

  // ================================================================
  // INTERVENTION REQUEST (1)
  // ================================================================
  await prisma.interventionRequest.upsert({
    where: { id: "wk-intervention-01" },
    update: {},
    create: {
      id: "wk-intervention-01",
      strategyId: IDS.stratBliss,
      requesterId: IDS.userAmara,
      type: "STRATEGIC_REVIEW",
      priority: "HIGH",
      title: "Revue strategique post-Heritage",
      description: "Demande de revue strategique complete apres la campagne Heritage Collection. Besoin d'ajuster la roadmap Q2 en fonction des resultats et de la concurrence emergente L'Oreal.",
      status: "COMPLETED",
      assigneeId: IDS.userNakia,
      resolvedAt: daysAfter(T.heritagePost, 5),
      resolution: "Revue completee. Roadmap Q2 ajustee : acceleration TikTok Shop + renforcement positionnement vibranium. Budget media realloue.",
      createdAt: T.heritagePost,
    },
  });
  track("InterventionRequest");

  // ================================================================
  // CONVERSATIONS (3) + MESSAGES (10)
  // ================================================================
  const conversations = [
    { id: "wk-conv-01", title: "Campagne Heritage — coordination equipe", strategyId: IDS.stratBliss, channel: "INTERNAL", participants: [IDS.userAmara, IDS.userNakia, IDS.userOkoye] },
    { id: "wk-conv-02", title: "Brief Vibranium Glow — feedback", strategyId: IDS.stratBliss, channel: "INTERNAL", participants: [IDS.userAmara, IDS.userOkoye, IDS.talentDA] },
    { id: "wk-conv-03", title: "Questions facturation Q1", strategyId: IDS.stratBliss, channel: "INTERNAL", participants: [IDS.userAmara, IDS.userWkabi] },
  ];

  for (const conv of conversations) {
    await prisma.conversation.upsert({
      where: { id: conv.id },
      update: {},
      create: {
        id: conv.id,
        title: conv.title,
        strategyId: conv.strategyId,
        channel: conv.channel,
        participants: conv.participants as Prisma.InputJsonValue,
        status: "ACTIVE",
        lastMessageAt: daysAfter(T.now, -1),
        createdAt: T.teamAssembled,
      },
    });
    track("Conversation");
  }

  const messages = [
    // Conv 1 — Heritage coordination
    { id: "wk-msg-01", conversationId: "wk-conv-01", senderId: IDS.userNakia, senderName: "Nakia Okoye", content: "Equipe, le brief Heritage est valide. On lance la production lundi.", createdAt: T.campaignBriefed },
    { id: "wk-msg-02", conversationId: "wk-conv-01", senderId: IDS.userOkoye, senderName: "Okoye Dora", content: "Parfait. J'ai reserve le studio photo pour mercredi et jeudi.", createdAt: hoursAfter(T.campaignBriefed, 2) },
    { id: "wk-msg-03", conversationId: "wk-conv-01", senderId: IDS.userAmara, senderName: "Amara Udaku", content: "Excellent ! N'oubliez pas d'inclure le motif vibranium sur toutes les declinaisons.", createdAt: hoursAfter(T.campaignBriefed, 4) },
    { id: "wk-msg-04", conversationId: "wk-conv-01", senderId: IDS.userNakia, senderName: "Nakia Okoye", content: "Campagne Heritage lancee avec succes ! Les premiers retours sont tres positifs.", createdAt: T.heritageLive },
    // Conv 2 — Glow feedback
    { id: "wk-msg-05", conversationId: "wk-conv-02", senderId: IDS.userOkoye, senderName: "Okoye Dora", content: "Kofi, le brief Vibranium Glow est pret. Tu peux commencer la DA.", createdAt: T.glowLaunch },
    { id: "wk-msg-06", conversationId: "wk-conv-02", senderId: IDS.talentDA, senderName: "Kofi Asante", content: "Recu ! Je propose une direction avec des effets lumineux vibranium sur fond noir.", createdAt: hoursAfter(T.glowLaunch, 5) },
    { id: "wk-msg-07", conversationId: "wk-conv-02", senderId: IDS.userAmara, senderName: "Amara Udaku", content: "J'adore la direction Kofi. On peut ajouter une texture organique pour le cote naturel ?", createdAt: hoursAfter(T.glowLaunch, 8) },
    // Conv 3 — Facturation
    { id: "wk-msg-08", conversationId: "wk-conv-03", senderId: IDS.userAmara, senderName: "Amara Udaku", content: "W'Kabi, est-ce que les factures Q1 sont a jour ?", createdAt: daysAfter(T.now, -5) },
    { id: "wk-msg-09", conversationId: "wk-conv-03", senderId: IDS.userWkabi, senderName: "W'Kabi Kante", content: "Oui, les 3 factures Jan-Mar sont payees. Celle d'Avril sera emise le 15.", createdAt: daysAfter(T.now, -5) },
    { id: "wk-msg-10", conversationId: "wk-conv-03", senderId: IDS.userAmara, senderName: "Amara Udaku", content: "Merci ! Et pour les commissions freelances ?", createdAt: daysAfter(T.now, -4) },
  ];

  for (const msg of messages) {
    await prisma.message.upsert({
      where: { id: msg.id },
      update: {},
      create: {
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        senderName: msg.senderName,
        content: msg.content,
        channel: "INTERNAL",
        createdAt: msg.createdAt,
      },
    });
    track("Message");
  }

  // ================================================================
  // QUICK INTAKES (2)
  // ================================================================
  await prisma.quickIntake.upsert({
    where: { id: IDS.intakeBliss },
    update: {},
    create: {
      id: IDS.intakeBliss,
      contactName: "Amara Udaku",
      contactEmail: "amara@bliss.wk",
      contactPhone: "+237690001234",
      companyName: "BLISS by Wakanda",
      sector: "Cosmetiques & Skincare Premium",
      country: "Wakanda",
      businessModel: "DIRECT_TO_CONSUMER",
      economicModel: "VENTE_DIRECTE",
      positioning: "PREMIUM",
      method: "LONG",
      responses: { q1: "Marque de cosmetiques premium", q2: "Vibranium-infused skincare", q3: "Femmes urbaines 25-45" } as Prisma.InputJsonValue,
      advertis_vector: { a: 18, d: 16, v: 17, e: 18, composite: 69, confidence: 0.65 } as Prisma.InputJsonValue,
      classification: "ORDINAIRE",
      shareToken: "wk-intake-bliss-token",
      status: "CONVERTED",
      convertedToId: IDS.stratBliss,
      completedAt: T.intake,
      createdAt: T.intake,
    },
  });
  track("QuickIntake");

  await prisma.quickIntake.upsert({
    where: { id: IDS.intakePanther },
    update: {},
    create: {
      id: IDS.intakePanther,
      contactName: "Zemo Athletic Director",
      contactEmail: "contact@pantherathletics.wk",
      companyName: "Panther Athletics",
      sector: "Sport & Equipement",
      country: "Wakanda",
      businessModel: "PRODUCT",
      method: "LONG",
      responses: { q1: "Equipement sportif haute performance", q2: "Vibranium-enhanced sportswear" } as Prisma.InputJsonValue,
      shareToken: "wk-intake-panther-token",
      status: "IN_PROGRESS",
      createdAt: daysAfter(T.now, -10),
    },
  });
  track("QuickIntake");

  // ================================================================
  // BADGE DEFINITIONS (3) + USER BADGES (4)
  // ================================================================
  const badges = [
    { id: "wk-badge-def-01", slug: "first-icone", name: "Premier ICONE", description: "Premiere marque a atteindre le score 200/200 ICONE.", category: "ACHIEVEMENT", points: 500 },
    { id: "wk-badge-def-02", slug: "campaign-master", name: "Maitre Campagne", description: "A lance et complete une campagne avec tous les KPIs depasses.", category: "CAMPAIGN", points: 300 },
    { id: "wk-badge-def-03", slug: "community-builder", name: "Batisseur de Communaute", description: "A atteint 10,000 membres de communaute.", category: "COMMUNITY", points: 200 },
  ];

  for (const badge of badges) {
    await prisma.badgeDefinition.upsert({
      where: { slug: badge.slug },
      update: {},
      create: {
        id: badge.id,
        slug: badge.slug,
        name: badge.name,
        description: badge.description,
        category: badge.category,
        criteria: { type: badge.category, threshold: 1 } as Prisma.InputJsonValue,
        points: badge.points,
        isActive: true,
        createdAt: T.teamAssembled,
      },
    });
    track("BadgeDefinition");
  }

  const userBadges = [
    { id: "wk-ubadge-01", userId: IDS.userAmara, badgeId: "wk-badge-def-01", awardedAt: T.scoresValidated },
    { id: "wk-ubadge-02", userId: IDS.userAmara, badgeId: "wk-badge-def-02", awardedAt: T.heritagePost },
    { id: "wk-ubadge-03", userId: IDS.userAmara, badgeId: "wk-badge-def-03", awardedAt: daysAfter(T.now, -5) },
    { id: "wk-ubadge-04", userId: IDS.userOkoye, badgeId: "wk-badge-def-02", awardedAt: T.heritagePost },
  ];

  for (const ub of userBadges) {
    await prisma.userBadge.upsert({
      where: { id: ub.id },
      update: {},
      create: {
        id: ub.id,
        userId: ub.userId,
        badgeId: ub.badgeId,
        awardedAt: ub.awardedAt,
      },
    });
    track("UserBadge");
  }

  console.log("[OK] Infrastructure: 12 audit, 6 AI cost, 6 notif, 2 prefs, 3 uploads, 3 processes, 2 plans, 8 steps, 3 threads, 1 intervention, 3 convos, 10 msgs, 2 intakes, 3 badges, 4 awards");
}
