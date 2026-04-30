# CODE-MAP — Knowledge graph du repo

**Auto-généré par `scripts/gen-code-map.ts` à chaque commit.** Ne pas éditer à la main.

> **Avant d'ajouter une entité métier (model Prisma, service, router, page, glory tool, sequence, intent kind), GREP CE FICHIER avec les mots-clés synonymes. Si entité similaire existe → étendre, ne pas doubler.** Sinon → ADR obligatoire avec justification.

Régénération : `npx tsx scripts/gen-code-map.ts`. Régénéré pre-commit via husky.

---

## Synonymes & patterns à connaître (anti-drift)

Ces correspondances évitent la réinvention :

| Mot du métier | Entité dans le code | Notes |
|---|---|---|
| **vault** / "vault de marque" / "asset rangé" | `BrandAsset` (Phase 10, ADR-0012) | Réceptacle unifié — intellectuel + matériel |
| **SuperAsset** | `BrandAsset.kind=BIG_IDEA/CREATIVE_BRIEF/...` | Pas de table SuperAsset — terme conceptuel |
| **forge** / "asset forgé" / "image générée" | `AssetVersion` (Phase 9 Ptah) + `BrandAsset` matériel | AssetVersion = forge brut, BrandAsset = vault catalogué |
| **brief créatif** / "brief 360" | `BrandAsset.kind=CREATIVE_BRIEF/BRIEF_360` + `CampaignBrief` lié | CampaignBrief = pointer business, BrandAsset = contenu |
| **big idea active** | `Campaign.activeBigIdeaId` → `BrandAsset (kind=BIG_IDEA, state=ACTIVE)` | 1 ACTIVE par kind par Campaign |
| **prompt KV** / "kv-prompt" | Glory tool `kv-banana-prompt-generator` (brief→forge) → `BrandAsset.kind=KV_PROMPT` → Ptah Nano Banana → `AssetVersion` |
| **plan d'orchestration** | `OrchestrationPlan` |
| **mission** | `Mission` (commercial creative delivery) — distinct de "brand mission" (APOGEE) |
| **livrable** | `MissionDeliverable` ou `SequenceExecution` |
| **devotion / superfan** | `DevotionSnapshot` + `Strategy.cultIndex` |
| **calendrier campagne** | `CampaignMilestone` + `CampaignAction` |
| **AARRR funnel** | `CampaignAARRMetric` + `CampaignAction.aarrStage` |
| **forge multimodale Magnific/Adobe/Figma/Canva** | `GenerativeTask` + provider `src/server/services/ptah/providers/` |
| **manipulation mode** | `Strategy.manipulationMix` + `BrandAsset.manipulationMode` + `GenerativeTask.manipulationMode` |
| **ROI superfan** | `expectedSuperfans` / `realisedSuperfans` sur GenerativeTask + `cultIndexDeltaObserved` AssetVersion |

---

## Prisma — 146 models, 46 enums

### Models

- **Account** (13 fields)
- **Session** (5 fields)
- **VerificationToken** (3 fields)
- **User** (24 fields)
- **Operator** (24 fields)
- **ClientAllocation** (11 fields)
- **Client** (16 fields)
- **Strategy** (60 fields)
- **Campaign** (42 fields)
- **Mission** (22 fields)
- **MissionDeliverable** (11 fields)
- **TalentProfile** (23 fields)
- **Signal** (9 fields)
- **SequenceExecution** (22 fields)
- **GloryOutput** (12 fields)
- **BrandAsset** (47 fields) — BrandAsset = vault de la marque, réceptacle unique pour TOUS les actifs.  Couvre deux familles :  - Actifs **intellectue
- **Pillar** (17 fields)
- **PillarVersion** (9 fields)
- **BrandDataSource** (14 fields)
- **Invoice** (14 fields)
- **Driver** (20 fields)
- **DriverGloryTool** (4 fields)
- **GuildOrganization** (15 fields)
- **QualityReview** (12 fields)
- **PortfolioItem** (10 fields)
- **Process** (20 fields)
- **Commission** (18 fields)
- **Membership** (11 fields)
- **DevotionSnapshot** (12 fields)
- **KnowledgeEntry** (14 fields)
- **DeliverableTracking** (10 fields)
- **Conversation** (14 fields)
- **Message** (12 fields)
- **QuickIntake** (27 fields)
- **CampaignAction** (22 fields)
- **CampaignExecution** (18 fields)
- **CampaignAmplification** (25 fields)
- **CampaignTeamMember** (8 fields)
- **CampaignMilestone** (12 fields)
- **CampaignApproval** (13 fields)
- **CampaignAsset** (14 fields)
- **CampaignBrief** (15 fields)
- **CampaignReport** (8 fields)
- **CampaignDependency** (7 fields)
- **CampaignLink** (7 fields)
- **BudgetLine** (12 fields)
- **CampaignFieldOp** (18 fields)
- **CampaignFieldReport** (28 fields)
- **CampaignAARRMetric** (9 fields)
- **Framework** (14 fields)
- **FrameworkExecution** (12 fields)
- **FrameworkResult** (13 fields)
- **CultIndexSnapshot** (13 fields)
- **SuperfanProfile** (12 fields)
- **CommunitySnapshot** (10 fields)
- **BrandVariable** (9 fields)
- **VariableHistory** (8 fields)
- **ScoreSnapshot** (8 fields)
- **SocialConnection** (16 fields)
- **SocialPost** (17 fields)
- **MediaPlatformConnection** (11 fields)
- **MediaPerformanceSync** (15 fields)
- **PressRelease** (12 fields)
- **PressDistribution** (9 fields)
- **PressClipping** (13 fields)
- **MediaContact** (11 fields)
- **Contract** (16 fields)
- **Escrow** (10 fields)
- **EscrowCondition** (7 fields)
- **PaymentOrder** (14 fields)
- **IntakePayment** (14 fields)
- **Subscription** (15 fields) — Subscription for monthly tiers (COCKPIT_MONTHLY / RETAINER_*).
- **Deal** (18 fields)
- **FunnelMapping** (7 fields)
- **MarketStudy** (12 fields)
- **MarketSource** (10 fields)
- **MarketSynthesis** (8 fields)
- **CompetitorSnapshot** (10 fields)
- **InsightReport** (9 fields)
- **AttributionEvent** (13 fields)
- **CohortSnapshot** (11 fields)
- **AmbassadorProgram** (11 fields)
- **AmbassadorMember** (12 fields)
- **Course** (14 fields)
- **Enrollment** (10 fields)
- **TalentCertification** (8 fields)
- **TalentReview** (10 fields)
- **ClubMember** (7 fields)
- **Event** (14 fields)
- **EventRegistration** (7 fields)
- **BoutiqueItem** (11 fields)
- **EditorialArticle** (13 fields)
- **TranslationDocument** (10 fields)
- **AuditLog** (11 fields)
- **AICostLog** (11 fields)
- **McpApiKey** (10 fields)
- **BrandOSConfig** (8 fields)
- **CampaignTemplate** (12 fields)
- **InterventionRequest** (13 fields)
- **CRMNote** (6 fields)
- **CRMActivity** (7 fields)
- **BoutiqueOrder** (12 fields)
- **EditorialComment** (6 fields)
- **McpServerConfig** (10 fields)
- **GuildOrganizationMetric** (10 fields)
- **NotificationPreference** (7 fields)
- **Notification** (9 fields)
- **WebhookConfig** (10 fields)
- **FileUpload** (10 fields)
- **BadgeDefinition** (11 fields)
- **UserBadge** (6 fields)
- **MestorThread** (9 fields)
- **VariableStoreConfig** (7 fields)
- **OrchestrationPlan** (13 fields)
- **OrchestrationStep** (17 fields)
- **Recommendation** (35 fields)
- **RecommendationBatch** (17 fields)
- **JehutyCuration** (9 fields)
- **PromptVersion** (8 fields)
- **ExternalConnector** (13 fields)
- **IntentEmission** (17 fields)
- **IntentEmissionEvent** (10 fields)
- **IntentQueue** (10 fields)
- **Currency** (8 fields)
- **Country** (11 fields)
- **OracleSnapshot** (7 fields)
- **IntegrationConnection** (9 fields)
- **ModelPolicy** (11 fields) — Governance — `purpose → model` resolution policy used by the LLM Gateway.  Each row maps an operational purpose (e.g. "f
- **MfaSecret** (6 fields)
- **MarketBenchmark** (18 fields)
- **MarketSizing** (14 fields)
- **CostStructure** (11 fields)
- **CompetitiveLandscape** (11 fields)
- **MarketDocument** (12 fields)
- **BrandContextNode** (16 fields)
- **MarketContextNode** (10 fields)
- **BrandAction** (24 fields)
- **CostDecision** (12 fields) — Cost gate decision per Intent — Thot's audit trail (separate from IntentEmission so Thot's reasoning is queryable indepe
- **Sector** (10 fields) — Sector — first-class entity. Overton lives within a sector. Each sector has its own cultural axis modelable as orientati
- **StrategyDoc** (9 fields) — CRDT doc for real-time collab on long-form pillar / Oracle text. Phase 5 (NSP + Yjs). Stored as opaque BLOB; client reco
- **PricingOverride** (12 fields) — Per-tier per-market price override. Allows admins to adjust SPU values OR direct local-currency amounts without code cha
- **PaymentProviderConfig** (7 fields) — Provider configuration (non-secret) — let admins toggle providers, set the standard country override, etc., without env 
- **GenerativeTask** (29 fields) — GenerativeTask — un asset à matérialiser via Ptah. Linéage : sourceIntentId pointe vers l'IntentEmission INVOKE_GLORY_TO
- **AssetVersion** (18 fields) — AssetVersion — version d'un asset, chaîne parent→upscale→relight.
- **ForgeProviderHealth** (12 fields) — ForgeProviderHealth — état circuit breaker per-provider.
- **ErrorEvent** (26 fields)

### Enums

- **OperatorStatus** : ACTIVE | SUSPENDED | CHURNED
- **LicenseType** : OWNER | LICENSED | TRIAL
- **AgencyType** : HOLDING | COMMUNICATION | RELATIONS_PUBLIQUES | MEDIA_BUYING | DIGITAL | EVENEMENTIEL | PRODUCTION | CUSTOM
- **AllocationRole** : LEAD | SUPPORT | SPECIALIST
- **GuildTier** : APPRENTI | COMPAGNON | MAITRE | ASSOCIE
- **DriverChannel** : INSTAGRAM | FACEBOOK | TIKTOK | LINKEDIN | WEBSITE | PACKAGING | EVENT | PR | PRINT | VIDEO | RADIO | TV | OOH | CUSTOM
- **DriverType** : DIGITAL | PHYSICAL | EXPERIENTIAL | MEDIA
- **DriverStatus** : ACTIVE | INACTIVE | ARCHIVED
- **ProcessType** : DAEMON | TRIGGERED | BATCH
- **ProcessStatus** : RUNNING | PAUSED | STOPPED | COMPLETED
- **ReviewVerdict** : ACCEPTED | MINOR_REVISION | MAJOR_REVISION | REJECTED | ESCALATED
- **ReviewType** : AUTOMATED | PEER | FIXER | CLIENT
- **MissionMode** : DISPATCH | COLLABORATIF
- **MembershipStatus** : ACTIVE | OVERDUE | CANCELLED | EXEMPT
- **KnowledgeType** : DIAGNOSTIC_RESULT | MISSION_OUTCOME | BRIEF_PATTERN | CREATOR_PATTERN | SECTOR_BENCHMARK | CAMPAIGN_TEMPLATE | FEEDBACK_VALIDATED
- **TrackingStatus** : AWAITING_SIGNALS | PARTIAL | COMPLETE | EXPIRED
- **QuickIntakeStatus** : IN_PROGRESS | COMPLETED | CONVERTED | EXPIRED
- **IntakeMethod** : GUIDED | IMPORT | LONG | SHORT | INGEST | INGEST_PLUS
- **BrandNature** : PRODUCT | SERVICE | CHARACTER_IP | FESTIVAL_IP | MEDIA_IP | RETAIL_SPACE | PLATFORM | INSTITUTION | PERSONAL
- **CampaignState** : BRIEF_DRAFT | BRIEF_VALIDATED | PLANNING | CREATIVE_DEV | PRODUCTION | PRE_PRODUCTION | APPROVAL | READY_TO_LAUNCH | LIVE | POST_CAMPAIGN | ARCHIVED | CANCELLED
- **ActionCategory** : ATL | BTL | TTL
- **ProductionState** : DEVIS | BAT | EN_PRODUCTION | LIVRAISON | INSTALLE | TERMINE | ANNULE
- **ApprovalStatus** : PENDING | APPROVED | REJECTED | REVISION_REQUESTED
- **FieldOpStatus** : PLANNED | IN_PROGRESS | COMPLETED | CANCELLED
- **AARRStage** : ACQUISITION | ACTIVATION | RETENTION | REVENUE | REFERRAL
- **FrameworkLayer** : IDENTITY | VALUE | EXPERIENCE | VALIDATION | EXECUTION | MEASUREMENT | GROWTH | EVOLUTION | SURVIVAL
- **FrameworkExecutionStatus** : PENDING | RUNNING | COMPLETED | FAILED
- **SocialPlatform** : INSTAGRAM | FACEBOOK | TIKTOK | LINKEDIN | TWITTER | YOUTUBE
- **MediaSyncStatus** : ACTIVE | PAUSED | ERROR | DISCONNECTED
- **ContractStatus** : DRAFT | ACTIVE | COMPLETED | TERMINATED | DISPUTED
- **EscrowStatus** : HELD | RELEASED | DISPUTED | REFUNDED
- **PaymentMethod** : MOBILE_MONEY_ORANGE | MOBILE_MONEY_MTN | MOBILE_MONEY_WAVE | BANK_TRANSFER | CASH
- **PaymentOrderStatus** : PENDING | PROCESSING | COMPLETED | FAILED | CANCELLED
- **IntakePaymentProvider** : CINETPAY | STRIPE | PAYPAL | MOCK | ADMIN_BYPASS
- **IntakePaymentCurrency** : XAF | XOF | EUR | USD | MAD | NGN | GHS | TND | CDF | WKD
- **IntakePaymentStatus** : PENDING | PAID | FAILED
- **DealStage** : LEAD | QUALIFIED | PROPOSAL | NEGOTIATION | WON | LOST
- **CourseLevel** : BEGINNER | INTERMEDIATE | ADVANCED | EXPERT
- **EnrollmentStatus** : ENROLLED | IN_PROGRESS | COMPLETED | DROPPED
- **AmbassadorTier** : BRONZE | SILVER | GOLD | PLATINUM | DIAMOND
- **AuditAction** : CREATE | UPDATE | DELETE | LOGIN | LOGOUT | APPROVE | REJECT | ESCALATE | EXPORT
- **CampaignTeamRole** : ACCOUNT_DIRECTOR | ACCOUNT_MANAGER | STRATEGIC_PLANNER | CREATIVE_DIRECTOR | ART_DIRECTOR | COPYWRITER | MEDIA_PLANNER | MEDIA_BUYER | SOCIAL_MANAGER | PRODUCTION_MANAGER | PROJECT_MANAGER | DATA_ANALYST | CLIENT
- **NotificationChannel** : IN_APP | EMAIL | SMS | PUSH
- **BrandAssetState** : DRAFT | CANDIDATE | SELECTED | ACTIVE | SUPERSEDED | ARCHIVED | REJECTED
- **ErrorSeverity** : TRACE | DEBUG | INFO | WARN | ERROR | CRITICAL
- **ErrorSource** : SERVER | CLIENT | PRISMA | NSP | PTAH | STRESS_TEST | CRON | WEBHOOK | UNKNOWN

---

## Services backend — 84

- `src/server/services/advertis-connectors/` ✓ manifest
- `src/server/services/advertis-scorer/` ✓ manifest
- `src/server/services/ai-cost-tracker/` ✓ manifest
- `src/server/services/approval-workflow/` ✓ manifest
- `src/server/services/artemis/` ✓ manifest
- `src/server/services/asset-tagger/` ✓ manifest
- `src/server/services/audit-trail/` ✓ manifest
- `src/server/services/board-export/` ✓ manifest
- `src/server/services/boot-sequence/` ✓ manifest
- `src/server/services/brand-vault/`
- `src/server/services/brief-ingest/` ✓ manifest
- `src/server/services/budget-allocator/` ✓ manifest
- `src/server/services/campaign-budget-engine/` ✓ manifest
- `src/server/services/campaign-manager/` ✓ manifest
- `src/server/services/campaign-plan-generator/` ✓ manifest
- `src/server/services/collab-doc/` ✓ manifest
- `src/server/services/commission-engine/` ✓ manifest
- `src/server/services/country-registry/` ✓ manifest
- `src/server/services/crm-engine/` ✓ manifest
- `src/server/services/cross-validator/` ✓ manifest
- `src/server/services/cult-index-engine/` ✓ manifest
- `src/server/services/data-export/` ✓ manifest
- `src/server/services/demo-data/` ✓ manifest
- `src/server/services/devotion-engine/` ✓ manifest
- `src/server/services/diagnostic-engine/` ✓ manifest
- `src/server/services/driver-engine/` ✓ manifest
- `src/server/services/ecosystem-engine/` ✓ manifest
- `src/server/services/email/` ✓ manifest
- `src/server/services/error-vault/`
- `src/server/services/feedback-loop/` ✓ manifest
- `src/server/services/feedback-processor/` ✓ manifest
- `src/server/services/financial-brain/` ✓ manifest
- `src/server/services/financial-engine/` ✓ manifest
- `src/server/services/financial-reconciliation/` ✓ manifest
- `src/server/services/founder-psychology/` ✓ manifest
- `src/server/services/glory-tools/` ✓ manifest
- `src/server/services/guidelines-renderer/` ✓ manifest
- `src/server/services/implementation-generator/` ✓ manifest
- `src/server/services/ingestion-pipeline/` ✓ manifest
- `src/server/services/jehuty/` ✓ manifest
- `src/server/services/knowledge-aggregator/` ✓ manifest
- `src/server/services/knowledge-capture/` ✓ manifest
- `src/server/services/knowledge-seeder/` ✓ manifest
- `src/server/services/llm-gateway/` ✓ manifest
- `src/server/services/market-intelligence/` ✓ manifest
- `src/server/services/matching-engine/` ✓ manifest
- `src/server/services/mestor/` ✓ manifest
- `src/server/services/mfa/` ✓ manifest
- `src/server/services/mission-templates/` ✓ manifest
- `src/server/services/mobile-money/` ✓ manifest
- `src/server/services/model-policy/` ✓ manifest
- `src/server/services/monetization/` ✓ manifest
- `src/server/services/neteru-shared/` ✓ manifest
- `src/server/services/notoria/` ✓ manifest
- `src/server/services/oauth-integrations/` ✓ manifest
- `src/server/services/operator-isolation/` ✓ manifest
- `src/server/services/payment-providers/` ✓ manifest
- `src/server/services/pillar-gateway/` ✓ manifest
- `src/server/services/pillar-maturity/` ✓ manifest
- `src/server/services/pillar-normalizer/` ✓ manifest
- `src/server/services/pillar-versioning/` ✓ manifest
- `src/server/services/pipeline-orchestrator/` ✓ manifest
- `src/server/services/playbook-capitalization/` ✓ manifest
- `src/server/services/process-scheduler/` ✓ manifest
- `src/server/services/prompt-registry/` ✓ manifest
- `src/server/services/ptah/` ✓ manifest
- `src/server/services/qc-router/` ✓ manifest
- `src/server/services/quick-intake/` ✓ manifest
- `src/server/services/rtis-protocols/` ✓ manifest
- `src/server/services/sector-intelligence/` ✓ manifest
- `src/server/services/sequence-vault/` ✓ manifest
- `src/server/services/seshat/` ✓ manifest
- `src/server/services/seshat-bridge/` ✓ manifest
- `src/server/services/sla-tracker/` ✓ manifest
- `src/server/services/staleness-propagator/` ✓ manifest
- `src/server/services/strategy-presentation/` ✓ manifest
- `src/server/services/talent-engine/` ✓ manifest
- `src/server/services/team-allocator/` ✓ manifest
- `src/server/services/tier-evaluator/` ✓ manifest
- `src/server/services/translation/` ✓ manifest
- `src/server/services/upsell-detector/` ✓ manifest
- `src/server/services/utils/`
- `src/server/services/value-report-generator/` ✓ manifest
- `src/server/services/vault-enrichment/` ✓ manifest

---

## tRPC routers — 75

- `advertis-scorer` (`src/server/trpc/routers/advertis-scorer.ts`)
- `ambassador` (`src/server/trpc/routers/ambassador.ts`)
- `analytics` (`src/server/trpc/routers/analytics.ts`)
- `attribution-router` (`src/server/trpc/routers/attribution-router.ts`)
- `auth` (`src/server/trpc/routers/auth.ts`)
- `boot-sequence` (`src/server/trpc/routers/boot-sequence.ts`)
- `boutique` (`src/server/trpc/routers/boutique.ts`)
- `brand-vault` (`src/server/trpc/routers/brand-vault.ts`)
- `brief-ingest` (`src/server/trpc/routers/brief-ingest.ts`)
- `campaign` (`src/server/trpc/routers/campaign.ts`)
- `campaign-manager` (`src/server/trpc/routers/campaign-manager.ts`)
- `client` (`src/server/trpc/routers/client.ts`)
- `club` (`src/server/trpc/routers/club.ts`)
- `cockpit-router` (`src/server/trpc/routers/cockpit-router.ts`)
- `cohort` (`src/server/trpc/routers/cohort.ts`)
- `commission` (`src/server/trpc/routers/commission.ts`)
- `connectors` (`src/server/trpc/routers/connectors.ts`)
- `contract` (`src/server/trpc/routers/contract.ts`)
- `crm` (`src/server/trpc/routers/crm.ts`)
- `cult-index` (`src/server/trpc/routers/cult-index.ts`)
- `deliverable-tracking` (`src/server/trpc/routers/deliverable-tracking.ts`)
- `devotion-ladder` (`src/server/trpc/routers/devotion-ladder.ts`)
- `driver` (`src/server/trpc/routers/driver.ts`)
- `editorial` (`src/server/trpc/routers/editorial.ts`)
- `error-vault` (`src/server/trpc/routers/error-vault.ts`)
- `event` (`src/server/trpc/routers/event.ts`)
- `framework` (`src/server/trpc/routers/framework.ts`)
- `glory` (`src/server/trpc/routers/glory.ts`)
- `governance` (`src/server/trpc/routers/governance.ts`)
- `guidelines` (`src/server/trpc/routers/guidelines.ts`)
- `guild-org` (`src/server/trpc/routers/guild-org.ts`)
- `guild-tier` (`src/server/trpc/routers/guild-tier.ts`)
- `guilde` (`src/server/trpc/routers/guilde.ts`)
- `implementation-generator` (`src/server/trpc/routers/implementation-generator.ts`)
- `ingestion` (`src/server/trpc/routers/ingestion.ts`)
- `intervention` (`src/server/trpc/routers/intervention.ts`)
- `jehuty` (`src/server/trpc/routers/jehuty.ts`)
- `knowledge-graph` (`src/server/trpc/routers/knowledge-graph.ts`)
- `learning` (`src/server/trpc/routers/learning.ts`)
- `market-intelligence` (`src/server/trpc/routers/market-intelligence.ts`)
- `market-pricing` (`src/server/trpc/routers/market-pricing.ts`)
- `market-study` (`src/server/trpc/routers/market-study.ts`)
- `matching` (`src/server/trpc/routers/matching.ts`)
- `media-buying` (`src/server/trpc/routers/media-buying.ts`)
- `membership` (`src/server/trpc/routers/membership.ts`)
- `messaging` (`src/server/trpc/routers/messaging.ts`)
- `mestor-router` (`src/server/trpc/routers/mestor-router.ts`)
- `mission` (`src/server/trpc/routers/mission.ts`)
- `mobile-money` (`src/server/trpc/routers/mobile-money.ts`)
- `monetization` (`src/server/trpc/routers/monetization.ts`)
- `notification` (`src/server/trpc/routers/notification.ts`)
- `notoria` (`src/server/trpc/routers/notoria.ts`)
- `onboarding` (`src/server/trpc/routers/onboarding.ts`)
- `operator` (`src/server/trpc/routers/operator.ts`)
- `payment` (`src/server/trpc/routers/payment.ts`)
- `pillar` (`src/server/trpc/routers/pillar.ts`)
- `pr` (`src/server/trpc/routers/pr.ts`)
- `process` (`src/server/trpc/routers/process.ts`)
- `ptah` (`src/server/trpc/routers/ptah.ts`)
- `publication` (`src/server/trpc/routers/publication.ts`)
- `quality-review` (`src/server/trpc/routers/quality-review.ts`)
- `quick-intake` (`src/server/trpc/routers/quick-intake.ts`)
- `sequence-vault` (`src/server/trpc/routers/sequence-vault.ts`)
- `seshat-search` (`src/server/trpc/routers/seshat-search.ts`)
- `signal` (`src/server/trpc/routers/signal.ts`)
- `social` (`src/server/trpc/routers/social.ts`)
- `source-insights` (`src/server/trpc/routers/source-insights.ts`)
- `staleness` (`src/server/trpc/routers/staleness.ts`)
- `strategy` (`src/server/trpc/routers/strategy.ts`)
- `strategy-presentation` (`src/server/trpc/routers/strategy-presentation.ts`)
- `superfan` (`src/server/trpc/routers/superfan.ts`)
- `system-config` (`src/server/trpc/routers/system-config.ts`)
- `translation` (`src/server/trpc/routers/translation.ts`)
- `upsell` (`src/server/trpc/routers/upsell.ts`)
- `value-report` (`src/server/trpc/routers/value-report.ts`)

---

## Pages — 172 (par deck)

### Agency (12)

- `/agency`
- `/agency/campaigns`
- `/agency/clients`
- `/agency/clients/[clientId]`
- `/agency/commissions`
- `/agency/contracts`
- `/agency/intake`
- `/agency/knowledge`
- `/agency/messages`
- `/agency/missions`
- `/agency/revenue`
- `/agency/signals`

### Cockpit (32)

- `/cockpit`
- `/cockpit/brand/assets`
- `/cockpit/brand/deliverables`
- `/cockpit/brand/deliverables/[key]`
- `/cockpit/brand/diagnostic`
- `/cockpit/brand/edit`
- `/cockpit/brand/engagement`
- `/cockpit/brand/guidelines`
- `/cockpit/brand/identity`
- `/cockpit/brand/jehuty`
- `/cockpit/brand/market`
- `/cockpit/brand/notoria`
- `/cockpit/brand/offer`
- `/cockpit/brand/positioning`
- `/cockpit/brand/potential`
- `/cockpit/brand/proposition`
- `/cockpit/brand/roadmap`
- `/cockpit/brand/rtis`
- `/cockpit/brand/rtis/synthese`
- `/cockpit/brand/sources`
- `/cockpit/insights/attribution`
- `/cockpit/insights/benchmarks`
- `/cockpit/insights/diagnostics`
- `/cockpit/insights/reports`
- `/cockpit/messages`
- `/cockpit/mestor`
- `/cockpit/new`
- `/cockpit/operate/briefs`
- `/cockpit/operate/campaigns`
- `/cockpit/operate/campaigns/[id]`
- `/cockpit/operate/missions`
- `/cockpit/operate/requests`

### Console (89)

- `/console`
- `/console/academie`
- `/console/academie/boutique`
- `/console/academie/certifications`
- `/console/academie/content`
- `/console/academie/courses`
- `/console/arene/academie`
- `/console/arene/academie/boutique`
- `/console/arene/academie/certifications`
- `/console/arene/academie/content`
- `/console/arene/academie/courses`
- `/console/arene/club`
- `/console/arene/events`
- `/console/arene/guild`
- `/console/arene/matching`
- `/console/arene/orgs`
- `/console/artemis`
- `/console/artemis/campaigns`
- `/console/artemis/drivers`
- `/console/artemis/interventions`
- `/console/artemis/media`
- `/console/artemis/missions`
- `/console/artemis/pr`
- `/console/artemis/scheduler`
- `/console/artemis/skill-tree`
- `/console/artemis/social`
- `/console/artemis/tools`
- `/console/artemis/vault`
- `/console/config`
- `/console/config/integrations`
- `/console/config/system`
- `/console/config/templates`
- `/console/config/thresholds`
- `/console/config/variables`
- `/console/ecosystem`
- `/console/ecosystem/metrics`
- `/console/ecosystem/operators`
- `/console/ecosystem/scoring`
- `/console/fusee/campaigns`
- `/console/fusee/drivers`
- `/console/fusee/glory`
- `/console/fusee/interventions`
- `/console/fusee/media`
- `/console/fusee/missions`
- `/console/fusee/pr`
- `/console/fusee/scheduler`
- `/console/fusee/social`
- `/console/governance/error-vault`
- `/console/governance/intents`
- `/console/governance/model-policy`
- `/console/messages`
- `/console/mestor`
- `/console/mestor/insights`
- `/console/mestor/plans`
- `/console/mestor/recos`
- `/console/oracle/boot`
- `/console/oracle/boot/[sessionId]`
- `/console/oracle/brands`
- `/console/oracle/brands/[strategyId]`
- `/console/oracle/brief-ingest`
- `/console/oracle/clients`
- `/console/oracle/clients/[strategyId]`
- `/console/oracle/diagnostics`
- `/console/oracle/ingestion`
- `/console/oracle/intake`
- `/console/oracle/proposition`
- `/console/seshat/attribution`
- `/console/seshat/intelligence`
- `/console/seshat/jehuty`
- `/console/seshat/knowledge`
- `/console/seshat/market`
- `/console/seshat/search`
- `/console/seshat/signals`
- `/console/seshat/tarsis`
- `/console/signal/attribution`
- `/console/signal/intelligence`
- `/console/signal/knowledge`
- `/console/signal/market`
- `/console/signal/signals`
- `/console/signal/tarsis`
- `/console/socle/commissions`
- `/console/socle/contracts`
- `/console/socle/escrow`
- `/console/socle/invoices`
- `/console/socle/pipeline`
- `/console/socle/pricing`
- `/console/socle/revenue`
- `/console/socle/transactions`
- `/console/socle/value-reports`

### Creator (23)

- `/creator`
- `/creator/community/events`
- `/creator/community/guild`
- `/creator/earnings/history`
- `/creator/earnings/invoices`
- `/creator/earnings/missions`
- `/creator/earnings/qc`
- `/creator/learn/adve`
- `/creator/learn/cases`
- `/creator/learn/drivers`
- `/creator/learn/resources`
- `/creator/messages`
- `/creator/missions/active`
- `/creator/missions/available`
- `/creator/missions/collab`
- `/creator/profile/drivers`
- `/creator/profile/portfolio`
- `/creator/profile/skills`
- `/creator/progress/metrics`
- `/creator/progress/path`
- `/creator/progress/strengths`
- `/creator/qc/peer`
- `/creator/qc/submitted`

### Launchpad (7)

- `/intake`
- `/intake/[token]`
- `/intake/[token]/ingest`
- `/intake/[token]/ingest-plus`
- `/intake/[token]/result`
- `/intake/[token]/short`
- `/score`

### Public (9)

- `/changelog`
- `/forgot-password`
- `/login`
- `/page.tsx`
- `/register`
- `/reset-password`
- `/shared/strategy/[token]`
- `/status`
- `/unauthorized`

---

## Glory tools — 104 (par layer)

### Layer CR (30)

- `concept-generator` (concepts_list)
- `script-writer` (script)
- `long-copy-craftsman` (long_copy)
- `dialogue-writer` (dialogue)
- `claim-baseline-factory` (claims_list)
- `print-ad-architect` (print_ad_spec)
- `social-copy-engine` (social_copy_set)
- `storytelling-sequencer` (story_sequence)
- `wordplay-cultural-bank` (wordplay_bank)
- `brief-creatif-interne` (creative_brief)
- `music-sound-brief` (sound_brief)
- `tone-of-voice-designer` (tone_charter)
- `manifesto-writer` (manifesto)
- `engagement-rituals-designer` (brand_rituals)
- `storyboard-generator` (storyboard)
- `casting-brief-generator` (casting_brief)
- `voiceover-brief-generator` (voiceover_brief)
- `seo-copy-optimizer` (seo_report)
- `naming-generator` (name_proposals)
- `influencer-brief-generator` (influencer_brief)
- `claim-architect` (claim_hierarchy)
- `tone-matrix` (tone_matrix)
- `vocabulary-builder` (brand_vocabulary)
- `message-templater` (message_templates)
- `copy-guidelines` (copy_guidelines_document)
- `lsi-universe-setup` (universe_setup)
- `lsi-symbol-alchemy` (artifacts)
- `lsi-distribution-matrix` (distribution_matrix)
- `lsi-morpho-semantic` (morpho_semantic_definition)
- `lsi-character-sheet` (character_sheet)

### Layer DC (25)

- `campaign-architecture-planner` (campaign_architecture)
- `creative-evaluation-matrix` (evaluation_matrix)
- `idea-killer-saver` (idea_triage)
- `multi-team-coherence-checker` (coherence_report)
- `client-presentation-strategist` (presentation_strategy)
- `creative-direction-memo` (direction_memo)
- `pitch-architect` (pitch_structure)
- `award-case-builder` (award_case)
- `kv-banana-prompt-generator` (kv_prompts_list · brief→forge)
- `competitive-analysis-builder` (competitive_analysis)
- `value-proposition-builder` (value_proposition)
- `sales-deck-builder` (sales_deck)
- `superfan-journey-mapper` (superfan_journey)
- `insight-synthesizer` (insights)
- `ideation-workshop-facilitator` (ideation_output)
- `strategic-diagnostic` (swot_augmented)
- `milestone-roadmap-builder` (roadmap_milestones)
- `kv-art-direction-brief` (kv_brief)
- `kv-review-validator` (kv_validation)
- `launch-timeline-planner` (launch_timeline)
- `migration-playbook-generator` (migration_playbook)
- `credentials-deck-builder` (credentials_deck)
- `brand-guardian` (brand_validation_report)
- `coherence-checker` (coherence_report)
- `lsi-sublimation` (sublimation_report)

### Layer HYBRID (36)

- `campaign-360-simulator` (simulation_report)
- `production-budget-optimizer` (budget_optimization)
- `vendor-brief-generator` (vendor_brief)
- `devis-generator` (devis)
- `content-calendar-strategist` (content_calendar)
- `approval-workflow-manager` (workflow_definition)
- `brand-guardian-system` (compliance_report)
- `client-education-module` (educational_content)
- `benchmark-reference-finder` (benchmark_report)
- `post-campaign-reader` (post_campaign_report)
- `digital-planner` (digital_plan)
- `brand-audit-scanner` (brand_audit_report)
- `pricing-strategy-advisor` (pricing_strategy)
- `community-playbook-generator` (community_playbook)
- `risk-matrix-builder` (risk_matrix)
- `crisis-communication-planner` (crisis_plan)
- `compliance-checklist-generator` (compliance_checklist)
- `market-sizing-estimator` (market_size)
- `trend-radar-builder` (trend_radar)
- `resource-allocation-planner` (resource_plan)
- `kpi-framework-builder` (kpi_framework)
- `format-declination-engine` (format_specs)
- `naming-legal-checker` (legal_check)
- `ugc-framework-builder` (ugc_framework)
- `media-plan-builder` (media_plan)
- `seasonal-theme-planner` (seasonal_themes)
- `content-mix-optimizer` (content_mix)
- `roi-calculator` (roi_metrics)
- `hourly-rate-calculator` (hourly_rates)
- `codb-calculator` (codb)
- `service-margin-analyzer` (margins)
- `campaign-cost-estimator` (cost_estimate)
- `budget-tracker` (budget_tracking)
- `project-pnl-calculator` (project_pnl)
- `client-profitability-analyzer` (client_profitability)
- `utilization-rate-tracker` (utilization)

### Layer BRAND (13)

- `semiotic-brand-analyzer` (semiotic_analysis)
- `visual-landscape-mapper` (visual_landscape_map)
- `visual-moodboard-generator` (moodboard_directions)
- `chromatic-strategy-builder` (chromatic_strategy)
- `typography-system-architect` (typography_system)
- `logo-type-advisor` (logotype_direction)
- `logo-validation-protocol` (logo_validation_report)
- `design-token-architect` (design_tokens)
- `motion-identity-designer` (motion_identity)
- `brand-guidelines-generator` (brand_guidelines)
- `photography-style-guide` (photo_guidelines)
- `iconography-system-builder` (icon_system)
- `packaging-layout-advisor` (packaging_layout)

**Brief-to-forge tools (Phase 9 ADR-0009)** : 1

---

## Glory sequences — 43 (par family)

### PILLAR (10)

- `MANIFESTE-A` — Le Manifeste
- `BRANDBOOK-D` — Le Brandbook
- `OFFRE-V` — L'Offre Commerciale
- `PLAYBOOK-E` — Le Playbook Engagement
- `AUDIT-R` — L'Audit Interne
- `ETUDE-T` — L'Étude de Marché
- `BRAINSTORM-I` — Le Brainstorm 360
- `ROADMAP-S` — La Roadmap Stratégique
- `POSITIONING` — Cristallisation du Positionnement
- `PERSONA-MAP` — Cartographie des Personas

### PRODUCTION (15)

- `BRAND` — Identité Visuelle
- `KV` — Key Visual de Campagne
- `SPOT-VIDEO` — Spot Pub Vidéo / TV
- `SPOT-RADIO` — Spot Radio / Audio
- `ADS-META-CARROUSEL` — Ads Meta — 3 options copy + visuels
- `PRINT-AD` — Annonce Presse
- `OOH` — Affichage Extérieur
- `SOCIAL-POST` — Post Social Unitaire
- `STORY-ARC` — Arc Narratif Multi-Contenus
- `WEB-COPY` — Contenu Web / Landing Page
- `NAMING` — Naming Marque / Produit
- `PACKAGING` — Direction Packaging
- `MESSAGING` — Identité Verbale
- `MASCOTTE` — Creation de Mascotte
- `CHARACTER-LSI` — Character Design LSI

### STRATEGIC (10)

- `CAMPAIGN-360` — Campagne 360°
- `LAUNCH` — Lancement Produit / Marque
- `REBRAND` — Rebranding
- `PITCH` — Pitch & Compétition
- `ANNUAL-PLAN` — Planning Annuel Éditorial
- `BRAND-AUDIT` — Audit de Marque Existante
- `MEDIA-PLAN` — Plan Médias
- `CONTENT-CALENDAR` — Calendrier Éditorial
- `CAMPAIGN-SINGLE` — Campagne Mono-Canal
- `QUARTERLY-REVIEW` — Bilan Trimestriel

### OPERATIONAL (8)

- `OPS` — Opérations Production
- `GUARD` — Brand Governance
- `EVAL` — Post-Campagne & Awards
- `INFLUENCE` — Campagne Influenceurs / KOL
- `COST-SERVICE` — Coût du Service
- `COST-CAMPAIGN` — Coût de Campagne
- `PROFITABILITY` — Rentabilité Client / Projet
- `RETAINER-REPORT` — Rapport Retainer

---

## Intent kinds — 56 (par governor)

### MESTOR (34)

- `FILL_ADVE` → mestor (sync) — Fill ADVE pillars from sources.…
- `RUN_RTIS_CASCADE` → mestor (sync) — Run R→T→I→S cascade on a strategy.…
- `GENERATE_RECOMMENDATIONS` → notoria (sync) — Generate Notoria recos for a strategy.…
- `APPLY_RECOMMENDATIONS` → notoria (sync) — Apply accepted recos.…
- `BUILD_PLAN` → mestor (sync) — Build an action plan for a touchpoint/AARRR slice.…
- `RUN_BOOT_SEQUENCE` → boot-sequence (async) — Post-paywall full ADVE+RTIS bootstrap.…
- `RUN_QUICK_INTAKE` → quick-intake (sync) — Public rev-9 intake.…
- `LIFT_INTAKE_TO_STRATEGY` → mestor (async) — Auto-lift a complete quick-intake into a Strategy + first ADVE→RTIS cascade.…
- `CORRECT_INTENT` → mestor (sync) — Append a correction referencing a previous (immutable) intent. The original row …
- `PROMOTE_ZOMBIE_TO_FRAGILE` → mestor (sync) — Mechanize transition palier ZOMBIE → FRAGILE (substance achieved).…
- `PROMOTE_FRAGILE_TO_ORDINAIRE` → mestor (sync) — Mechanize transition palier FRAGILE → ORDINAIRE (basic propulsion stable).…
- `PROMOTE_ORDINAIRE_TO_FORTE` → mestor (sync) — Mechanize transition palier ORDINAIRE → FORTE (distinction leveraged).…
- `PROMOTE_FORTE_TO_CULTE` → mestor (sync) — Mechanize transition palier FORTE → CULTE (cult formation begins).…
- `PROMOTE_CULTE_TO_ICONE` → mestor (sync) — Mechanize transition palier CULTE → ICONE (cult crystallizes into icon, Overton …
- `MAINTAIN_APOGEE` → mestor (async) — Sentinel: maintain ICONE state, refresh evangelist mass, rebuke dilution drift.…
- `EXPAND_TO_ADJACENT_SECTOR` → mestor (async) — Sentinel: expand the cult mass to adjacent sectors via cross-sector playbook.…
- `DEDUCE_ADVE_FROM_OFFER` → quick-intake (sync) — From a brief offer paragraph, deduce a structured ADVE (4 pillars, scoring, narr…
- `ROLLBACK_PILLAR` → pillar-gateway (sync) — Rollback a previous WRITE_PILLAR — restores the pre-write content + score.…
- `ROLLBACK_ADVE` → mestor (sync) — Rollback a FILL_ADVE — restores ADVE to pre-fill state.…
- `ROLLBACK_RTIS_CASCADE` → mestor (sync) — Rollback a RUN_RTIS_CASCADE — clears R/T/I/S writes.…
- `DISCARD_RECOMMENDATIONS` → notoria (sync) — Discard pending recos generated by GENERATE_RECOMMENDATIONS.…
- `REVERT_RECOMMENDATIONS` → notoria (sync) — Revert recos previously applied via APPLY_RECOMMENDATIONS.…
- `DEMOTE_FRAGILE_TO_ZOMBIE` → mestor (sync) — Compensator for PROMOTE_ZOMBIE_TO_FRAGILE.…
- `DEMOTE_ORDINAIRE_TO_FRAGILE` → mestor (sync) — Compensator for PROMOTE_FRAGILE_TO_ORDINAIRE.…
- `DEMOTE_FORTE_TO_ORDINAIRE` → mestor (sync) — Compensator for PROMOTE_ORDINAIRE_TO_FORTE.…
- `DEMOTE_CULTE_TO_FORTE` → mestor (sync) — Compensator for PROMOTE_FORTE_TO_CULTE.…
- `DEMOTE_ICONE_TO_CULTE` → mestor (sync) — Compensator for PROMOTE_CULTE_TO_ICONE.…
- `PTAH_MATERIALIZE_BRIEF` → ptah (async) — Matérialise un ForgeBrief Artemis en asset concret via le provider sélectionné (…
- `PTAH_RECONCILE_TASK` → ptah (sync) — Compensating intent — réconcilie un GenerativeTask depuis un webhook provider : …
- `PTAH_REGENERATE_FADING_ASSET` → ptah (async) — Sentinel (régime apogée, Loi 4) : régénère un asset dont l'engagement a chuté >3…
- `SELECT_BRAND_ASSET` → brand-vault (sync) — Sélectionne un BrandAsset parmi un batch de candidats CANDIDATE → SELECTED (et R…
- `PROMOTE_BRAND_ASSET_TO_ACTIVE` → brand-vault (sync) — Promote un BrandAsset SELECTED en ACTIVE et update Campaign.active{Kind}Id (BigI…
- `SUPERSEDE_BRAND_ASSET` → brand-vault (sync) — Remplace un BrandAsset ACTIVE par une nouvelle version. L'ancien passe SUPERSEDE…
- `ARCHIVE_BRAND_ASSET` → brand-vault (sync) — Archive un BrandAsset (mort rituelle — lecture seule). Lineage préservée.…

### SESHAT (6)

- `RANK_PEERS` → seshat (sync) — Generic peer ranking via context-store ranker.…
- `SEARCH_BRAND_CONTEXT` → seshat (sync) — Search across strategies / find peers / search within a strategy.…
- `JEHUTY_FEED_REFRESH` → jehuty (sync) — Refresh Jehuty feed (signals + recos + diagnostics).…
- `JEHUTY_CURATE` → jehuty (sync) — Pin / dismiss / trigger curation on Jehuty feed item.…
- `HYPERVISEUR_PEER_INSIGHTS` → seshat (sync) — Cross-brand peer insights for the Console hyperviseur.…
- `DEFEND_OVERTON` → seshat (async) — Sentinel: detect competitor Overton counter-moves, propose Mestor responses.…

### ARTEMIS (5)

- `ENRICH_ORACLE` → strategy-presentation (async) — Enrich the 21 Oracle sections via Mestor→Artemis→Seshat pipeline.…
- `EXPORT_ORACLE` → strategy-presentation (async) — Export Oracle as PDF or Markdown.…
- `INVOKE_GLORY_TOOL` → glory-tools (sync) — Invoke a single atomic GLORY tool.…
- `EXECUTE_GLORY_SEQUENCE` → artemis (async) — Run the Artemis sequenceur over a curated chain of GLORY tools.…
- `EXPORT_RTIS_PDF` → value-report-generator (async) — Generate paid ADVE+RTIS PDF deliverable (shareable, brand-customized).…

### INFRASTRUCTURE (7)

- `SCORE_PILLAR` → advertis-scorer (sync) — Score a pillar without writing — used by validation flows.…
- `WRITE_PILLAR` → pillar-gateway (sync) — Atomic write+score+staleness propagation.…
- `LEGACY_MUTATION` → infrastructure (sync) — Synthetic kind logged by the strangler middleware for not-yet-migrated mutations…
- `COMPUTE_LOYALTY_SCORE` → loyalty-extension (sync) — Plugin: compute loyalty score from SuperfanProfile + DevotionSnapshot for a stra…
- `UPDATE_MODEL_POLICY` → model-policy (sync) — Update the purpose→model resolution policy used by the LLM Gateway. Hash-chained…
- `CAPTURE_ERROR_EVENT` → error-vault (sync) — Capture une erreur runtime (server/client/Prisma/NSP/Ptah/cron/webhook/stress-te…
- `RESOLVE_ERROR_EVENT` → error-vault (sync) — Marque un ErrorEvent comme résolu (ou false-positive connu — auto-resolve futurs…

### THOT (4)

- `CHECK_CAPACITY` → financial-brain (sync) — Check operator capacity before LLM call.…
- `RECORD_COST` → financial-brain (sync) — Record realised cost.…
- `VETO_INTENT` → financial-brain (sync) — Veto / downgrade an intent for budget reasons.…
- `ACTIVATE_RETAINER` → monetization (sync) — Activate a retainer subscription tier (BASE / PRO / ENTERPRISE) for an operator/…

---

## Lectures associées (gouvernance narrative)

- [PANTHEON.md](PANTHEON.md) — les 7 Neteru et leur rôle
- [APOGEE.md](APOGEE.md) — framework de pilotage de trajectoire
- [LEXICON.md](LEXICON.md) — vocabulaire normatif (BrandAsset, SuperAsset, etc.)
- [MISSION.md](MISSION.md) — north star anti-drift
- [MANIPULATION-MATRIX.md](MANIPULATION-MATRIX.md) — 4 modes d'engagement audience
- [SERVICE-MAP.md](SERVICE-MAP.md) — services par sous-système APOGEE
- [PAGE-MAP.md](PAGE-MAP.md) — pages par deck
- [ROUTER-MAP.md](ROUTER-MAP.md) — routers tRPC par sous-système
- [INTENT-CATALOG.md](INTENT-CATALOG.md) — intents complet avec SLOs
- [adr/](adr/) — décisions architecturales historiques
