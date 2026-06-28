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
import { sourceClassifierRouter } from "./routers/source-classifier";
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
import { marketStudyIngestionRouter } from "./routers/market-study-ingestion";
import { deliverableOrchestratorRouter } from "./routers/deliverable-orchestrator";
import { campaignTrackerRouter } from "./routers/campaign-tracker";
import { sequenceVaultRouter } from "./routers/sequence-vault";
import { notoriaRouter } from "./routers/notoria";
import { oracleRouter } from "./routers/oracle";
import { ptahRouter } from "./routers/ptah";
import { imhotepRouter } from "./routers/imhotep";
import { anubisRouter } from "./routers/anubis";
import { mcpBillingRouter } from "./routers/mcp-billing";
import { missionApplicationRouter } from "./routers/mission-applications";
// La Guilde — portail public (ADR-0098) : mur des missions + dépôt marque + inscription guilde
import { laGuildeRouter } from "./routers/laguilde";
// Market Cost (ADR-0099) : base de coûts marché × période
import { marketCostRouter } from "./routers/market-cost";
// Market kill-switch (ADR-0105) : cycle de vie marché (neutralize/reinstate/purge)
import { marketsRouter } from "./routers/markets";
// Argos by LaFusée (ADR-0100) : Hunter reference harvester + projection publique
import { argosRouter } from "./routers/argos";
import { accountsRouter } from "./routers/accounts";
import { operationsOverviewRouter } from "./routers/operations-overview";
import { canonSyncRouter } from "./routers/canon-sync";
import { crmContactsRouter } from "./routers/crm-contacts";
import { errorVaultRouter } from "./routers/error-vault";
import { jehutyRouter } from "./routers/jehuty";
import { connectorsRouter } from "./routers/connectors";
import { paymentRouter } from "./routers/payment";
import { seshatSearchRouter } from "./routers/seshat-search";
import { monetizationRouter } from "./routers/monetization";
import { governanceRouter } from "./routers/governance";
// Phase 18 (ADR-0052) — Brand Tree multi-archétype + CampaignDeliverable matrice 6D
import { brandNodeRouter } from "./routers/brand-node";
import { campaignDeliverableRouter } from "./routers/campaign-deliverable";
// Phase 18-A1-β/γ (audit MATANGA V4) — Tickets modifs + Operator Actions
import { campaignChangeRequestRouter } from "./routers/campaign-change-request";
import { operatorActionRouter } from "./routers/operator-action";
// Phase 18-A1-δ (ADR-0055) — Morning Brief Batch
import { morningBatchRouter } from "./routers/morning-batch";
// Phase 18 résidus — formulaire de session future pour N5-bis/N6-bis/N9/N10/LLM/Cache/18-bis
import { phase18ResidualsRouter } from "./routers/phase18-residuals";
// Phase 18-A1 J5+1 — server-side XLSX parser pour portfolio-bulk-import
import { xlsxParserRouter } from "./routers/xlsx-parser";
// Phase 26 (ADR-0093) — Thot atomized composite action-costing
import { thotRouter } from "./routers/thot";
// Phase 24 (ADR-0094) — canonical I-pillar action database (BrandAction projection)
import { actionsRouter } from "./routers/actions";
import { intentionRouter } from "./routers/intention";
// Blog — CMS natif « Notes de cabinet » du site public UPgraders (public read + operator CRUD)
import { blogRouter } from "./routers/blog";
import { newsletterRouter } from "./routers/newsletter";

export const appRouter = createTRPCRouter({
  // Existing routers
  newsletter: newsletterRouter,
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
  sourceClassifier: sourceClassifierRouter,
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
  // Phase 17 — MarketStudy ingestion (ADR-0037 PR-I/J) — PDF/DOCX/XLSX → KE country+sector
  marketStudyIngestion: marketStudyIngestionRouter,
  // Phase 17b — Deliverable orchestrator (ADR-0050 commit 4 — anciennement ADR-0037) — output-first composition
  deliverableOrchestrator: deliverableOrchestratorRouter,
  // Phase 19 — Campaign tracker L2 Instrumental (ADR-0052 v2) — 6 procedures Vague 1 (Cluster A + B)
  campaignTracker: campaignTrackerRouter,
  sequenceVault: sequenceVaultRouter,
  notoria: notoriaRouter,
  // Phase 21 (ADR-0070) — OracleSection génération unitaire (manual-first)
  oracle: oracleRouter,
  jehuty: jehutyRouter,
  // Phase 9 — Ptah Forge (ADR-0009) — matérialisation des briefs Artemis en assets
  ptah: ptahRouter,
  // Phase 14 — Imhotep Crew Programs (ADR-0019) — orchestrateur matching/talent/team/tier/qc
  imhotep: imhotepRouter,
  // Phase 15 — Anubis Comms (ADR-0020) — orchestrateur broadcast/ad-networks/notification/credentials
  anubis: anubisRouter,
  mcpBilling: mcpBillingRouter,
  missionApplication: missionApplicationRouter,
  // La Guilde — portail public (ADR-0098) : guild marketplace public face
  laGuilde: laGuildeRouter,
  // Market Cost (ADR-0099) : base de coûts marché × période
  marketCost: marketCostRouter,
  // Market kill-switch (ADR-0105) : cycle de vie marché (neutralize/reinstate/purge)
  markets: marketsRouter,
  // Argos by LaFusée (ADR-0100) : Hunter reference harvester + projection publique
  argos: argosRouter,
  accounts: accountsRouter,
  operationsOverview: operationsOverviewRouter,
  canonSync: canonSyncRouter,
  crmContacts: crmContactsRouter,
  // Phase 11 — Error Vault (observabilité runtime)
  errorVault: errorVaultRouter,
  // v4 — External SaaS connectors
  connectors: connectorsRouter,
  // v4 — Payment (CinetPay + Stripe) for intake paywall
  payment: paymentRouter,
  monetization: monetizationRouter,
  // V5.4 — Seshat semantic search (operator console + comparables)
  seshatSearch: seshatSearchRouter,
  // Governance — IntentEmission audit trail + compensating intents
  governance: governanceRouter,
  // Phase 18 (ADR-0052) — Brand Tree multi-archétype : CRUD BrandNode (CORPORATE → MASTER → ... → SKU)
  brandNode: brandNodeRouter,
  // Phase 18 (ADR-0052) — CampaignDeliverable matrice 6D : SKU × pays × format × langue × promo × cluster
  campaignDeliverable: campaignDeliverableRouter,
  // Phase 18-A1-β (audit MATANGA V4 TICKETS MODIFS) — Tickets de modif client
  campaignChangeRequest: campaignChangeRequestRouter,
  // Phase 18-A1-γ (audit MATANGA V4 ACTIONS) — Sous-tâches transverses jour-le-jour
  operatorAction: operatorActionRouter,
  // Phase 18-A1-δ (ADR-0055 audit MATANGA V4 SIGNAUX) — Morning Brief Batch ingestion
  morningBatch: morningBatchRouter,
  // Phase 18 résidus — formulaire opérateur de session future (N5-bis/N6-bis/N9/N10/LLM/Cache/18-bis)
  phase18Residuals: phase18ResidualsRouter,
  // Phase 18-A1 J5+1 — server-side XLSX parser endpoint (résidu calendar-locked shippé NEFER mégasprint)
  xlsxParser: xlsxParserRouter,
  // Phase 26 (ADR-0093) — Thot atomized composite action-costing
  thot: thotRouter,
  // Phase 24 (ADR-0094) — canonical I-pillar action database (BrandAction projection)
  actions: actionsRouter,
  intention: intentionRouter,
  // Blog — CMS natif « Notes de cabinet » du site public UPgraders
  blog: blogRouter,
});

export type AppRouter = typeof appRouter;
