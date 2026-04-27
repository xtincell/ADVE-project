import { createTRPCRouter } from "./init";
import { operatorRouter } from "./routers/operator";
import { advertisScorerRouter } from "./routers/advertis-scorer";
import { quickIntakeRouter } from "./routers/quick-intake";
import { devotionLadderRouter } from "./routers/devotion-ladder";
import { driverRouter } from "./routers/driver";
import { qualityReviewRouter } from "./routers/quality-review";
import { guildTierRouter } from "./routers/guild-tier";
import { guildOrgRouter } from "./routers/guild-org";
import { commissionRouter } from "./routers/commission";
import { membershipRouter } from "./routers/membership";
import { knowledgeGraphRouter } from "./routers/knowledge-graph";
import { deliverableTrackingRouter } from "./routers/deliverable-tracking";
import { processRouter } from "./routers/process";
import { guidelinesRouter } from "./routers/guidelines";
import { matchingRouter } from "./routers/matching";
import { valueReportRouter } from "./routers/value-report";
import { upsellRouter } from "./routers/upsell";
import { bootSequenceRouter } from "./routers/boot-sequence";
import { strategyRouter } from "./routers/strategy";
import { campaignRouter } from "./routers/campaign";
import { missionRouter } from "./routers/mission";
import { signalRouter } from "./routers/signal";
import { guildeRouter } from "./routers/guilde";
import { ambassadorRouter } from "./routers/ambassador";
import { socialRouter } from "./routers/social";
import { mediaBuyingRouter } from "./routers/media-buying";
import { prRouter } from "./routers/pr";
import { marketStudyRouter } from "./routers/market-study";
import { brandVaultRouter } from "./routers/brand-vault";
import { interventionRouter } from "./routers/intervention";
import { messagingRouter } from "./routers/messaging";
// New routers
import { campaignManagerRouter } from "./routers/campaign-manager";
import { frameworkRouter } from "./routers/framework";
import { gloryRouter } from "./routers/glory";
import { crmRouter } from "./routers/crm";
import { cultIndexRouter } from "./routers/cult-index";
import { mobileMoneyRouter } from "./routers/mobile-money";
import { contractRouter } from "./routers/contract";
import { analyticsRouter } from "./routers/analytics";
import { learningRouter } from "./routers/learning";
import { clubRouter } from "./routers/club";
import { eventRouter } from "./routers/event";
import { boutiqueRouter } from "./routers/boutique";
import { editorialRouter } from "./routers/editorial";
import { notificationRouter } from "./routers/notification";
import { stalenessRouter } from "./routers/staleness";
import { pillarRouter } from "./routers/pillar";
import { systemConfigRouter } from "./routers/system-config";
import { ingestionRouter } from "./routers/ingestion";
import { superfanRouter } from "./routers/superfan";
import { marketIntelligenceRouter } from "./routers/market-intelligence";
import { implementationGeneratorRouter } from "./routers/implementation-generator";
import { clientRouter } from "./routers/client";
import { authRouter } from "./routers/auth";
import { translationRouter } from "./routers/translation";
import { sourceInsightsRouter } from "./routers/source-insights";
import { mestorRouter } from "./routers/mestor-router";
import { onboardingRouter } from "./routers/onboarding";
import { attributionRouter } from "./routers/attribution-router";
import { cohortRouter } from "./routers/cohort";
import { marketPricingRouter } from "./routers/market-pricing";
import { publicationRouter } from "./routers/publication";
import { cockpitRouter } from "./routers/cockpit-router";
import { strategyPresentationRouter } from "./routers/strategy-presentation";
import { briefIngestRouter } from "./routers/brief-ingest";
import { sequenceVaultRouter } from "./routers/sequence-vault";
import { notoriaRouter } from "./routers/notoria";
import { jehutyRouter } from "./routers/jehuty";
import { connectorsRouter } from "./routers/connectors";

export const appRouter = createTRPCRouter({
  // Existing routers
  operator: operatorRouter,
  advertisScorer: advertisScorerRouter,
  quickIntake: quickIntakeRouter,
  devotionLadder: devotionLadderRouter,
  driver: driverRouter,
  qualityReview: qualityReviewRouter,
  guildTier: guildTierRouter,
  guildOrg: guildOrgRouter,
  commission: commissionRouter,
  membership: membershipRouter,
  knowledgeGraph: knowledgeGraphRouter,
  deliverableTracking: deliverableTrackingRouter,
  process: processRouter,
  guidelines: guidelinesRouter,
  matching: matchingRouter,
  valueReport: valueReportRouter,
  upsell: upsellRouter,
  bootSequence: bootSequenceRouter,
  strategy: strategyRouter,
  campaign: campaignRouter,
  mission: missionRouter,
  signal: signalRouter,
  guilde: guildeRouter,
  ambassador: ambassadorRouter,
  social: socialRouter,
  mediaBuying: mediaBuyingRouter,
  pr: prRouter,
  marketStudy: marketStudyRouter,
  brandVault: brandVaultRouter,
  intervention: interventionRouter,
  messaging: messagingRouter,
  // New routers
  campaignManager: campaignManagerRouter,
  framework: frameworkRouter,
  glory: gloryRouter,
  crm: crmRouter,
  cultIndex: cultIndexRouter,
  mobileMoney: mobileMoneyRouter,
  contract: contractRouter,
  analytics: analyticsRouter,
  learning: learningRouter,
  club: clubRouter,
  event: eventRouter,
  boutique: boutiqueRouter,
  editorial: editorialRouter,
  notification: notificationRouter,
  staleness: stalenessRouter,
  pillar: pillarRouter,
  systemConfig: systemConfigRouter,
  ingestion: ingestionRouter,
  superfan: superfanRouter,
  marketIntelligence: marketIntelligenceRouter,
  implementationGenerator: implementationGeneratorRouter,
  brandClient: clientRouter,
  auth: authRouter,
  translation: translationRouter,
  sourceInsights: sourceInsightsRouter,
  mestor: mestorRouter,
  onboarding: onboardingRouter,
  attributionEvents: attributionRouter,
  cohort: cohortRouter,
  marketPricing: marketPricingRouter,
  publication: publicationRouter,
  cockpitDashboard: cockpitRouter,
  strategyPresentation: strategyPresentationRouter,
  briefIngest: briefIngestRouter,
  sequenceVault: sequenceVaultRouter,
  notoria: notoriaRouter,
  jehuty: jehutyRouter,
  // v4 — External SaaS connectors
  connectors: connectorsRouter,
});

export type AppRouter = typeof appRouter;
