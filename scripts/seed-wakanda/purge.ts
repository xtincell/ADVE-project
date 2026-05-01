/**
 * WAKANDA MEGA SEED — Purge Script
 *
 * Cascade-deletes ALL demo data anchored to the "wakanda-digital" operator.
 * Safe to run if nothing exists (returns 0 deleted).
 * Does NOT touch non-demo data.
 *
 * Usage: npx tsx scripts/seed-wakanda/purge.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { IDS } from "./constants";

function makeClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set — Prisma 7 driver adapter requires it.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}


const prisma = makeClient();

async function purge() {
  console.log("============================================================");
  console.log("  WAKANDA PURGE — Removing all demo data");
  console.log("============================================================\n");

  const operator = await prisma.operator.findUnique({
    where: { id: IDS.operator },
  });

  if (!operator) {
    console.log("[OK] No Wakanda operator found — nothing to purge.\n");
    return;
  }

  const strategyIds = (
    await prisma.strategy.findMany({
      where: { operatorId: operator.id },
      select: { id: true },
    })
  ).map((s) => s.id);

  const userIds = (
    await prisma.user.findMany({
      where: { operatorId: operator.id },
      select: { id: true },
    })
  ).map((u) => u.id);

  const campaignIds = (
    await prisma.campaign.findMany({
      where: { strategyId: { in: strategyIds } },
      select: { id: true },
    })
  ).map((c) => c.id);

  const missionIds = (
    await prisma.mission.findMany({
      where: { strategyId: { in: strategyIds } },
      select: { id: true },
    })
  ).map((m) => m.id);

  const deliverableIds = (
    await prisma.missionDeliverable.findMany({
      where: { missionId: { in: missionIds } },
      select: { id: true },
    })
  ).map((d) => d.id);

  const contractIds = (
    await prisma.contract.findMany({
      where: { strategyId: { in: strategyIds } },
      select: { id: true },
    })
  ).map((c) => c.id);

  const escrowIds = (
    await prisma.escrow.findMany({
      where: { contractId: { in: contractIds } },
      select: { id: true },
    })
  ).map((e) => e.id);

  const dealIds = (
    await prisma.deal.findMany({
      where: { strategyId: { in: strategyIds } },
      select: { id: true },
    })
  ).map((d) => d.id);

  const pressReleaseIds = (
    await prisma.pressRelease.findMany({
      where: { strategyId: { in: strategyIds } },
      select: { id: true },
    })
  ).map((p) => p.id);

  const socialConnectionIds = (
    await prisma.socialConnection.findMany({
      where: { strategyId: { in: strategyIds } },
      select: { id: true },
    })
  ).map((s) => s.id);

  const marketStudyIds = (
    await prisma.marketStudy.findMany({
      where: { strategyId: { in: strategyIds } },
      select: { id: true },
    })
  ).map((m) => m.id);

  const ambassadorProgramIds = (
    await prisma.ambassadorProgram.findMany({
      where: { strategyId: { in: strategyIds } },
      select: { id: true },
    })
  ).map((a) => a.id);

  const courseIds = (
    await prisma.course.findMany({
      where: { id: { startsWith: "wk-" } },
      select: { id: true },
    })
  ).map((c) => c.id);

  const eventIds = (
    await prisma.event.findMany({
      where: { id: { startsWith: "wk-" } },
      select: { id: true },
    })
  ).map((e) => e.id);

  const articleIds = (
    await prisma.editorialArticle.findMany({
      where: { id: { startsWith: "wk-" } },
      select: { id: true },
    })
  ).map((a) => a.id);

  const mediaPlatformIds = (
    await prisma.mediaPlatformConnection.findMany({
      where: { strategyId: { in: strategyIds } },
      select: { id: true },
    })
  ).map((m) => m.id);

  const orchestrationPlanIds = (
    await prisma.orchestrationPlan.findMany({
      where: { strategyId: { in: strategyIds } },
      select: { id: true },
    })
  ).map((o) => o.id);

  const conversationIds = (
    await prisma.conversation.findMany({
      where: { strategyId: { in: strategyIds } },
      select: { id: true },
    })
  ).map((c) => c.id);

  const talentProfileIds = (
    await prisma.talentProfile.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    })
  ).map((t) => t.id);

  const pillarIds = (
    await prisma.pillar.findMany({
      where: { strategyId: { in: strategyIds } },
      select: { id: true },
    })
  ).map((p) => p.id);

  const frameworkResultIds = (
    await prisma.frameworkResult.findMany({
      where: { strategyId: { in: strategyIds } },
      select: { id: true },
    })
  ).map((f) => f.id);

  const driverIds = (
    await prisma.driver.findMany({
      where: { strategyId: { in: strategyIds } },
      select: { id: true },
    })
  ).map((d) => d.id);

  const guildIds = (
    await prisma.guildOrganization.findMany({
      where: { id: { startsWith: "wk-" } },
      select: { id: true },
    })
  ).map((g) => g.id);

  const boutiqueItemIds = (
    await prisma.boutiqueItem.findMany({
      where: { id: { startsWith: "wk-" } },
      select: { id: true },
    })
  ).map((b) => b.id);

  const counts: Record<string, number> = {};
  function d(model: string, result: { count: number }) {
    if (result.count > 0) counts[model] = result.count;
  }

  // Execute cascade delete in a transaction
  await prisma.$transaction(async (tx) => {
    // Phase 4 reverse — Neteru wake-up (governance trail, forge, market, oracle, error vault)
    // Must run BEFORE Strategy delete since most filter by strategyId.
    d("IntentEmission", await tx.intentEmission.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    // IntentEmissionEvent cascades via FK onDelete: Cascade, so no separate delete needed.
    d("IntentQueue", await tx.intentQueue.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("CostDecision", await tx.costDecision.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("AssetVersion", await tx.assetVersion.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("GenerativeTask", await tx.generativeTask.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("BrandAction", await tx.brandAction.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("BrandContextNode", await tx.brandContextNode.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("OracleSnapshot", await tx.oracleSnapshot.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("StrategyDoc", await tx.strategyDoc.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("ErrorEvent", await tx.errorEvent.deleteMany({ where: { OR: [{ id: { startsWith: "wk-err-" } }, { strategyId: { in: strategyIds } }] } }));
    d("MarketContextNode", await tx.marketContextNode.deleteMany({ where: { id: { startsWith: "wk-mctx-" } } }));
    d("MarketDocument", await tx.marketDocument.deleteMany({ where: { id: { startsWith: "wk-mdoc-" } } }));
    d("CompetitiveLandscape", await tx.competitiveLandscape.deleteMany({ where: { id: { startsWith: "wk-land-" } } }));
    d("CostStructure", await tx.costStructure.deleteMany({ where: { id: { startsWith: "wk-cost-" } } }));
    d("MarketSizing", await tx.marketSizing.deleteMany({ where: { id: { startsWith: "wk-sizing-" } } }));
    d("MarketBenchmark", await tx.marketBenchmark.deleteMany({ where: { id: { startsWith: "wk-bench-" } } }));
    d("Sector", await tx.sector.deleteMany({ where: { id: { startsWith: "wk-sector-" } } }));
    // ForgeProviderHealth: global lookup table (4 rows by provider name) — leave intact, upsert handles re-seed.

    // Phase 5 reverse — Imhotep + Anubis wake-up (volume thresholds)
    d("IntegrationConnection", await tx.integrationConnection.deleteMany({ where: { operatorId: operator.id } }));

    // Phase 3 reverse — Infrastructure records
    d("OrchestrationStep", await tx.orchestrationStep.deleteMany({ where: { planId: { in: orchestrationPlanIds } } }));
    d("OrchestrationPlan", await tx.orchestrationPlan.deleteMany({ where: { id: { in: orchestrationPlanIds } } }));
    d("Message", await tx.message.deleteMany({ where: { conversationId: { in: conversationIds } } }));
    d("Conversation", await tx.conversation.deleteMany({ where: { id: { in: conversationIds } } }));
    d("MestorThread", await tx.mestorThread.deleteMany({ where: { userId: { in: userIds } } }));
    d("InterventionRequest", await tx.interventionRequest.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("AuditLog", await tx.auditLog.deleteMany({ where: { userId: { in: userIds } } }));
    d("AICostLog", await tx.aICostLog.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("Notification", await tx.notification.deleteMany({ where: { userId: { in: userIds } } }));
    d("NotificationPreference", await tx.notificationPreference.deleteMany({ where: { userId: { in: userIds } } }));
    d("FileUpload", await tx.fileUpload.deleteMany({ where: { uploaderId: { in: userIds } } }));
    d("Process", await tx.process.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("UserBadge", await tx.userBadge.deleteMany({ where: { userId: { in: userIds } } }));
    d("BadgeDefinition", await tx.badgeDefinition.deleteMany({ where: { id: { startsWith: "wk-" } } }));
    d("TranslationDocument", await tx.translationDocument.deleteMany({ where: { id: { startsWith: "wk-" } } }));
    d("QuickIntake", await tx.quickIntake.deleteMany({ where: { id: { startsWith: "wk-" } } }));

    // Phase 3 reverse — Content & Media
    d("EditorialComment", await tx.editorialComment.deleteMany({ where: { articleId: { in: articleIds } } }));
    d("EditorialArticle", await tx.editorialArticle.deleteMany({ where: { id: { in: articleIds } } }));
    d("BoutiqueOrder", await tx.boutiqueOrder.deleteMany({ where: { itemId: { in: boutiqueItemIds } } }));
    d("BoutiqueItem", await tx.boutiqueItem.deleteMany({ where: { id: { in: boutiqueItemIds } } }));
    d("MediaPerformanceSync", await tx.mediaPerformanceSync.deleteMany({ where: { connectionId: { in: mediaPlatformIds } } }));
    d("MediaPlatformConnection", await tx.mediaPlatformConnection.deleteMany({ where: { id: { in: mediaPlatformIds } } }));
    d("PressClipping", await tx.pressClipping.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("PressDistribution", await tx.pressDistribution.deleteMany({ where: { pressReleaseId: { in: pressReleaseIds } } }));
    d("PressRelease", await tx.pressRelease.deleteMany({ where: { id: { in: pressReleaseIds } } }));
    d("MediaContact", await tx.mediaContact.deleteMany({ where: { id: { startsWith: "wk-" } } }));
    d("SocialPost", await tx.socialPost.deleteMany({ where: { connectionId: { in: socialConnectionIds } } }));
    d("SocialConnection", await tx.socialConnection.deleteMany({ where: { id: { in: socialConnectionIds } } }));

    // Phase 3 reverse — Community
    d("EventRegistration", await tx.eventRegistration.deleteMany({ where: { eventId: { in: eventIds } } }));
    d("Event", await tx.event.deleteMany({ where: { id: { in: eventIds } } }));
    d("Enrollment", await tx.enrollment.deleteMany({ where: { courseId: { in: courseIds } } }));
    d("Course", await tx.course.deleteMany({ where: { id: { in: courseIds } } }));
    d("ClubMember", await tx.clubMember.deleteMany({ where: { userId: { in: userIds } } }));
    d("AmbassadorMember", await tx.ambassadorMember.deleteMany({ where: { programId: { in: ambassadorProgramIds } } }));
    d("AmbassadorProgram", await tx.ambassadorProgram.deleteMany({ where: { id: { in: ambassadorProgramIds } } }));
    d("SuperfanProfile", await tx.superfanProfile.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("CommunitySnapshot", await tx.communitySnapshot.deleteMany({ where: { strategyId: { in: strategyIds } } }));

    // Phase 3 reverse — Intelligence
    d("MarketSynthesis", await tx.marketSynthesis.deleteMany({ where: { studyId: { in: marketStudyIds } } }));
    d("MarketSource", await tx.marketSource.deleteMany({ where: { studyId: { in: marketStudyIds } } }));
    d("MarketStudy", await tx.marketStudy.deleteMany({ where: { id: { in: marketStudyIds } } }));
    d("CompetitorSnapshot", await tx.competitorSnapshot.deleteMany({ where: { id: { startsWith: "wk-" } } }));
    d("InsightReport", await tx.insightReport.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("AttributionEvent", await tx.attributionEvent.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("CohortSnapshot", await tx.cohortSnapshot.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("KnowledgeEntry", await tx.knowledgeEntry.deleteMany({ where: { id: { startsWith: "wk-" } } }));

    // Phase 3 reverse — Financial
    d("EscrowCondition", await tx.escrowCondition.deleteMany({ where: { escrowId: { in: escrowIds } } }));
    d("Escrow", await tx.escrow.deleteMany({ where: { id: { in: escrowIds } } }));
    d("PaymentOrder", await tx.paymentOrder.deleteMany({ where: { id: { startsWith: "wk-" } } }));
    d("Commission", await tx.commission.deleteMany({ where: { missionId: { in: missionIds } } }));
    d("Invoice", await tx.invoice.deleteMany({ where: { id: { startsWith: "wk-" } } }));
    d("Contract", await tx.contract.deleteMany({ where: { id: { in: contractIds } } }));
    d("FunnelMapping", await tx.funnelMapping.deleteMany({ where: { dealId: { in: dealIds } } }));
    d("CRMActivity", await tx.cRMActivity.deleteMany({ where: { dealId: { in: dealIds } } }));
    d("CRMNote", await tx.cRMNote.deleteMany({ where: { dealId: { in: dealIds } } }));
    d("Deal", await tx.deal.deleteMany({ where: { id: { in: dealIds } } }));

    // Phase 3 reverse — Missions & Talent
    d("DeliverableTracking", await tx.deliverableTracking.deleteMany({ where: { deliverableId: { in: deliverableIds } } }));
    d("QualityReview", await tx.qualityReview.deleteMany({ where: { deliverableId: { in: deliverableIds } } }));
    d("MissionDeliverable", await tx.missionDeliverable.deleteMany({ where: { id: { in: deliverableIds } } }));
    d("Mission", await tx.mission.deleteMany({ where: { id: { in: missionIds } } }));

    // Phase 3 reverse — Campaigns
    d("CampaignFieldReport", await tx.campaignFieldReport.deleteMany({ where: { campaignId: { in: campaignIds } } }));
    d("CampaignFieldOp", await tx.campaignFieldOp.deleteMany({ where: { campaignId: { in: campaignIds } } }));
    d("CampaignAARRMetric", await tx.campaignAARRMetric.deleteMany({ where: { campaignId: { in: campaignIds } } }));
    d("CampaignLink", await tx.campaignLink.deleteMany({ where: { campaignId: { in: campaignIds } } }));
    d("CampaignDependency", await tx.campaignDependency.deleteMany({ where: { OR: [{ sourceId: { in: campaignIds } }, { targetId: { in: campaignIds } }] } }));
    d("CampaignReport", await tx.campaignReport.deleteMany({ where: { campaignId: { in: campaignIds } } }));
    d("CampaignAsset", await tx.campaignAsset.deleteMany({ where: { campaignId: { in: campaignIds } } }));
    d("CampaignApproval", await tx.campaignApproval.deleteMany({ where: { campaignId: { in: campaignIds } } }));
    d("CampaignMilestone", await tx.campaignMilestone.deleteMany({ where: { campaignId: { in: campaignIds } } }));
    d("CampaignTeamMember", await tx.campaignTeamMember.deleteMany({ where: { campaignId: { in: campaignIds } } }));
    d("CampaignAmplification", await tx.campaignAmplification.deleteMany({ where: { campaignId: { in: campaignIds } } }));
    d("CampaignExecution", await tx.campaignExecution.deleteMany({ where: { campaignId: { in: campaignIds } } }));
    d("CampaignAction", await tx.campaignAction.deleteMany({ where: { campaignId: { in: campaignIds } } }));
    d("BudgetLine", await tx.budgetLine.deleteMany({ where: { campaignId: { in: campaignIds } } }));
    d("CampaignBrief", await tx.campaignBrief.deleteMany({ where: { campaignId: { in: campaignIds } } }));
    d("Campaign", await tx.campaign.deleteMany({ where: { id: { in: campaignIds } } }));

    // Phase 3 reverse — Recommendations & Signals
    d("JehutyCuration", await tx.jehutyCuration.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("Recommendation", await tx.recommendation.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("RecommendationBatch", await tx.recommendationBatch.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("Signal", await tx.signal.deleteMany({ where: { strategyId: { in: strategyIds } } }));

    // Phase 2 reverse — Brand data
    d("FrameworkExecution", await tx.frameworkExecution.deleteMany({ where: { resultId: { in: frameworkResultIds } } }));
    d("FrameworkResult", await tx.frameworkResult.deleteMany({ where: { id: { in: frameworkResultIds } } }));
    d("GloryOutput", await tx.gloryOutput.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("SequenceExecution", await tx.sequenceExecution.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("DriverGloryTool", await tx.driverGloryTool.deleteMany({ where: { driverId: { in: driverIds } } }));
    d("Driver", await tx.driver.deleteMany({ where: { id: { in: driverIds } } }));
    d("BrandAsset", await tx.brandAsset.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("BrandDataSource", await tx.brandDataSource.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("VariableHistory", await tx.variableHistory.deleteMany({ where: { variable: { strategyId: { in: strategyIds } } } }));
    d("BrandVariable", await tx.brandVariable.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("VariableStoreConfig", await tx.variableStoreConfig.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("BrandOSConfig", await tx.brandOSConfig.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("ScoreSnapshot", await tx.scoreSnapshot.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("DevotionSnapshot", await tx.devotionSnapshot.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("CultIndexSnapshot", await tx.cultIndexSnapshot.deleteMany({ where: { strategyId: { in: strategyIds } } }));
    d("PillarVersion", await tx.pillarVersion.deleteMany({ where: { pillarId: { in: pillarIds } } }));
    d("Pillar", await tx.pillar.deleteMany({ where: { id: { in: pillarIds } } }));
    d("Strategy", await tx.strategy.deleteMany({ where: { id: { in: strategyIds } } }));

    // Phase 1 reverse — Users & Operator
    d("GuildOrganizationMetric", await tx.guildOrganizationMetric.deleteMany({ where: { guildOrganizationId: { in: guildIds } } }));
    d("TalentCertification", await tx.talentCertification.deleteMany({ where: { talentProfileId: { in: talentProfileIds } } }));
    d("TalentReview", await tx.talentReview.deleteMany({ where: { talentProfileId: { in: talentProfileIds } } }));
    d("PortfolioItem", await tx.portfolioItem.deleteMany({ where: { talentProfileId: { in: talentProfileIds } } }));
    d("Membership", await tx.membership.deleteMany({ where: { talentProfileId: { in: talentProfileIds } } }));
    d("TalentProfile", await tx.talentProfile.deleteMany({ where: { id: { in: talentProfileIds } } }));
    d("GuildOrganization", await tx.guildOrganization.deleteMany({ where: { id: { in: guildIds } } }));
    d("CampaignTemplate", await tx.campaignTemplate.deleteMany({ where: { id: { startsWith: "wk-" } } }));
    d("User", await tx.user.deleteMany({ where: { id: { in: userIds } } }));
    d("ClientAllocation", await tx.clientAllocation.deleteMany({ where: { clientId: { startsWith: "wk-" } } }));
    d("Client", await tx.client.deleteMany({ where: { id: { startsWith: "wk-" } } }));
    d("Operator", await tx.operator.deleteMany({ where: { id: IDS.operator } }));
  });

  // Print summary
  const sorted = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  let total = 0;
  for (const [model, count] of sorted) {
    console.log(`  [DEL] ${model.padEnd(28)} ${String(count).padStart(4)}`);
    total += count;
  }
  console.log(`\n  Total records deleted: ${total}`);
  console.log("  Wakanda data purged successfully.\n");
}

purge()
  .catch((e) => {
    console.error("PURGE FAILED:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
