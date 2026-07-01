# Data Models — Prisma 7 / PostgreSQL

> Source of truth: [prisma/schema.prisma](../../prisma/schema.prisma) (5534 lines).
> Tenant default-deny: [src/server/governance/tenant-scoped-db.ts](../../src/server/governance/tenant-scoped-db.ts).
> Migration history: [prisma/migrations/](../../prisma/migrations/) (37 migrations).

---

## 1. Overview

| Metric | Value |
|---|---|
| Prisma generator | `prisma-client-js` (Prisma 7) |
| Database | PostgreSQL |
| Driver | `@prisma/adapter-pg` (Prisma 7 requires connection via driver adapter — schema datasource is metadata only; URL passed in [src/lib/db.ts](../../src/lib/db.ts)) |
| Models | **180** |
| Enums | **65** |
| Migrations | 37 (latest tracked in [prisma/migrations/](../../prisma/migrations/)) |
| Multi-tenant | `tenantScopedDb` injects `where: { operatorId }` automatically; `GLOBAL_TABLES` whitelist for sectors/country/llm/audit log |

---

## 2. Domain clusters

The 180 models organize into the following clusters. Each anchor links to one or more representative models you can grep for in the schema.

### 2.1 — Identity & tenancy

| Model | Role |
|---|---|
| `User`, `Account`, `Session`, `VerificationToken` | NextAuth v5 standard |
| `Operator` | UPgraders multi-tenant root |
| `Client`, `ClientAllocation` | UPgraders' customers + agency network allocations |
| `MfaSecret` | Multi-factor auth (TOTP) |

### 2.2 — Brand state (the heart)

| Model | Role |
|---|---|
| `Strategy` | Top-level brand context (flat metadata + manipulation mix) |
| `BrandNode`, `BrandContextNode`, `MarketContextNode` | **Brand tree** (Phase 18, ADR-0059) — multi-archétype hierarchy: 9 `BrandNature` (PRODUCT, SERVICE, CHARACTER_IP, FESTIVAL_IP, MEDIA_IP, RETAIL_SPACE, PLATFORM, INSTITUTION, PERSONAL); 7-level FMCG cascade (CORPORATE → MASTER_BRAND → REGIONAL_CLUSTER → REGIONAL_BRAND → PRODUCT_LINE → PRODUCT_VARIANT → SKU) |
| `Pillar`, `PillarVersion` | ADVE (Awareness/Desire/Value/Engagement) + RTIS (Retention/Trust/Innovation/Strategy) — 8 piliers per strategy |
| `BrandAsset` | **Unified vault** (Phase 10, ADR-0012) — `kind` covers BIG_IDEA, CREATIVE_BRIEF, MANIFESTO, ORACLE_DOCUMENT, claim, KV, etc. `BrandAssetState` lifecycle |
| `BrandDataSource`, `IngestedSource`, `BriefIngestionDraft`, `MorningBriefBatch` | Source ingestion + classification ([ADR-0027](../governance/adr/0027-rag-brand-sources-and-classifier.md), [ADR-0032](../governance/adr/0032-source-certainty-and-intake-artifact-persistence.md), [ADR-0062](../governance/adr/0062-morning-brief-batch-validation.md)) |
| `BrandVariable`, `VariableHistory` | Editable variables per the **variable-bible** ([src/lib/types/variable-bible.ts](../../src/lib/types/variable-bible.ts), ~300 entries) |
| `OracleSection`, `OracleSnapshot` | **35-section Oracle** first-class entity (Phase 21 F-B, [ADR-0068](../governance/adr/0068-oracle-section-first-class-entity.md)) with status lifecycle |

### 2.3 — Diagnostic / intake

| Model | Role |
|---|---|
| `QuickIntake` | Public landing intake form (intake.kit) |
| `IntakePayment` | Paid intake unlock (one-shot purchase) |
| `Signal` | Tarsis weak signals + manual operator captures |

### 2.4 — Campaign & deliverables (Phase 19 — L1 Operational + L2 Instrumental)

| Model | Role |
|---|---|
| `Campaign`, `CampaignTemplate` | Top-level campaign |
| `CampaignAction`, `CampaignExecution`, `CampaignAmplification`, `CampaignMilestone` | L1 operational execution graph |
| `CampaignTeamMember`, `CampaignApproval`, `CampaignDependency`, `CampaignLink` | Collaboration + dependency graph |
| `CampaignAsset`, `CampaignBrief`, `CampaignReport` | Deliverables linked to a campaign |
| `BudgetLine`, `Invoice`, `Commission`, `Contract`, `Escrow`, `EscrowCondition` | Financial layer per campaign |
| `CampaignChangeRequest`, `OperatorAction` | Change request workflow (Phase 18 ADR-0059 §A1) |
| `CampaignFieldOp`, `CampaignFieldReport`, `TarsisCaptureSession`, `CampaignContextIngest` | Field operations + Tarsis capture (Phase 19 Vague 2) |
| `CampaignAARRMetric` | AARR funnel metrics (Phase 19 Vague 3, Cluster E) |
| `CampaignDeliverable` | Cross-link asset ↔ campaign (Phase 17b deliverable forge) |
| `Mission`, `MissionDeliverable` | Talent-facing missions (Crew Programs) |

### 2.5 — Glory tools / sequences

| Model | Role |
|---|---|
| `Framework`, `FrameworkExecution`, `FrameworkResult` | 24 frameworks (Artemis briefs) |
| `SequenceExecution` | Sequence runs with `mode` / `lifecycle` (DRAFT/STABLE) / `expiresAt` / `promptHash` (Phase 17a, ADR-0042) |
| `GloryOutput` | Atomic Glory tool outputs |
| `GenerativeTask`, `AssetVersion` | Ptah forge tasks + materialized assets (Phase 9, ADR-0009) |
| `ForgeProviderHealth` | Provider health tracking (Magnific, Adobe, Figma, Canva) |

### 2.6 — Telemetry (Seshat + Tarsis)

| Model | Role |
|---|---|
| `KnowledgeEntry` | Knowledge graph nodes |
| `MarketStudy`, `MarketSource`, `MarketSynthesis`, `MarketDocument`, `MarketBenchmark`, `MarketSizing`, `CostStructure`, `CompetitiveLandscape`, `CompetitorSnapshot` | Sector intelligence + Jehuty |
| `InsightReport`, `AttributionEvent`, `CohortSnapshot`, `ScoreSnapshot`, `CommunitySnapshot`, `DevotionSnapshot` | Analytics + scoring |
| `CultIndexSnapshot`, `SuperfanProfile` | **Cult index** ([ADR-0046](../governance/adr/0046-cult-index-no-magic-fallback.md)) + superfan profiles |
| `AmbassadorProgram`, `AmbassadorMember` | Ambassador tracking |

### 2.7 — Crew Programs (Phase 14, ADR-0019)

| Model | Role |
|---|---|
| `TalentProfile`, `TalentReview`, `TalentCertification` | Talent registry + reviews + certifications |
| `Course`, `Enrollment` | Académie (formation) |
| `QualityReview` | QC workflow |
| `BoutiqueItem`, `BoutiqueOrder` | Formation boutique |
| `ClubMember`, `Event`, `EventRegistration` | Networking events |
| `GuildOrganization`, `GuildOrganizationMetric`, `Membership` | Agency network (`GuildTier` APPRENTI/COMPAGNON/MAITRE/ASSOCIE) |

### 2.8 — Comms (Phase 15, ADR-0020 + ADR-0021)

| Model | Role |
|---|---|
| `CommsPlan`, `BroadcastJob` | Anubis broadcast orchestration |
| `EmailTemplate`, `SmsTemplate`, `NotificationTemplate` | Templates (Handlebars/MJML) |
| `NotificationPreference`, `Notification`, `PushSubscription` | Notification center + Web Push (VAPID/FCM) |
| `WebhookConfig` | Inbound webhook routing |
| `ExternalConnector` | **Credentials Vault** (Phase 15, ADR-0021) — per-operator OAuth tokens for ad networks, MCP servers, etc. |
| `SocialConnection`, `SocialPost`, `MediaPlatformConnection`, `MediaPerformanceSync` | Social + media buying integrations |
| `PressRelease`, `PressDistribution`, `PressClipping`, `MediaContact` | PR module |
| `EditorialArticle`, `EditorialComment` | Editorial calendar |

### 2.9 — Financial / payments

| Model | Role |
|---|---|
| `PaymentOrder`, `PaymentProviderConfig`, `Subscription`, `Deal`, `FunnelMapping` | Sales funnel + recurring billing |
| `IntakePayment` | One-shot intake (Stripe / mobile money) |
| `PricingOverride`, `Currency` | Pricing + multi-currency |
| `AICostLog`, `CostDecision` | LLM cost tracking + Thot cost-gate decisions |

### 2.10 — Governance / audit / replay

| Model | Role |
|---|---|
| `IntentEmission` | **Hash-chained immutable log** (ADR-0005). `(prevHash, selfHash)` per row |
| `IntentEmissionEvent` | 1:N transitions per IntentEmission — NSP SSE replay source |
| `IntentQueue` | Async dispatcher queue |
| `AuditLog` | High-level audit events |
| `ErrorEvent`, `ErrorSeverity`, `ErrorSource` | **Error vault** triage + `oracleIncidents` cluster (ADR-0022) |
| `Phase18ResidualEntry` | Operator-tracked residuals (Phase 18 noyau bouclé — N5-bis, N6-bis, N9, N10, etc.) |
| `OrchestrationPlan`, `OrchestrationStep`, `MestorThread` | Mestor planning & deliberation |
| `Recommendation`, `RecommendationBatch`, `JehutyCuration` | Recommendation pipeline + Jehuty cross-brand intelligence |
| `PromptVersion`, `PromptRegistry`, `ModelPolicy`, `VariableStoreConfig` | Prompt + model registry |
| `BrandOSConfig` | Per-brand OS configuration (feature flags, manipulation mix override, …) |

### 2.11 — MCP infrastructure (Phase 16, ADR-0026)

| Model | Role |
|---|---|
| `McpApiKey` | Outbound API keys for the aggregated MCP server (`/api/mcp`) |
| `McpServerConfig` | Inbound MCP client registrations (Slack/Notion/Drive/Calendar/Figma/GitHub via Credentials Vault) |
| `McpRegistry`, `McpToolInvocation` | Registry of MCP-backed tools + invocation log |
| `IntegrationConnection` | Generic OAuth integration record (used by Higgsfield, Sora, etc. — ADR-0048) |

### 2.12 — Static reference (global tables — exempt from tenant scoping)

| Model | Role |
|---|---|
| `Country` | Country list with seeded countries ([prisma/seed-countries.ts](../../prisma/seed-countries.ts)) |
| `Sector` | Industry sectors |
| `BadgeDefinition`, `UserBadge` | Gamification |
| `Conversation`, `Message` | Internal messaging |
| `PortfolioItem` | Public portfolio cases |
| `FileUpload` | Generic file uploads |
| `TranslationDocument` | i18n content store |

---

## 3. Enum highlights (61 total)

Key enums you will encounter in `where` clauses and switch statements. Full list in [schema.prisma:19-end](../../prisma/schema.prisma).

| Enum | Values | Used by |
|---|---|---|
| `BrandNature` | PRODUCT, SERVICE, CHARACTER_IP, FESTIVAL_IP, MEDIA_IP, RETAIL_SPACE, PLATFORM, INSTITUTION, PERSONAL | `BrandNode`, `Strategy` — Phase 18 archetype |
| `BrandAssetState` | DRAFT, ACTIVE, STALE, ARCHIVED | `BrandAsset` lifecycle |
| `OracleTier` | CORE, BIG4_BASELINE, DISTINCTIVE | `OracleSection` |
| `OracleSectionStatus` | PENDING, GENERATING, COMPLETE, FAILED, STALE | `OracleSection` lifecycle |
| `GuildTier` | APPRENTI, COMPAGNON, MAITRE, ASSOCIE | `TalentProfile` |
| `MissionMode` | DISPATCH, COLLABORATIF | `Mission` |
| `CampaignState` | (multi-state) | `Campaign` |
| `CreativeProductionStatus`, `ClientReviewStatus`, `OperationalPriority`, `ApprovalStatus`, `FieldOpStatus`, `AARRStage` | Campaign workflow |
| `FrameworkLayer`, `FrameworkExecutionStatus` | Framework execution |
| `ChangeRequestImpact`, `ChangeRequestStatus`, `OperatorActionCategory`, `OperatorActionSource` | Change request flow (Phase 18 §A1) |
| `Phase18ResidualCategory`, `Phase18ResidualStatus` | Operator-tracked residuals |
| `SocialPlatform`, `DriverChannel`, `DriverType`, `DriverStatus`, `MediaSyncStatus` | Comms & drivers |
| `NotificationChannel`, `IntakePaymentProvider`, `IntakePaymentStatus`, `PaymentMethod`, `PaymentOrderStatus`, `EscrowStatus`, `ContractStatus` | Payments + notifications |
| `DealStage`, `EnrollmentStatus`, `AmbassadorTier`, `CourseLevel` | Funnel + Académie |
| `AuditAction`, `ErrorSeverity`, `ErrorSource` | Audit + error vault |
| `BriefIngestionClassification`, `BriefIngestionDraftState`, `IngestedSourceKind`, `MorningBriefBatchState` | Source ingestion |
| `IntakeMethod`, `QuickIntakeStatus` | Quick intake |
| `LicenseType`, `OperatorStatus`, `AgencyType`, `AllocationRole`, `MembershipStatus`, `KnowledgeType`, `ProcessType`, `ProcessStatus`, `ReviewVerdict`, `ReviewType`, `TrackingStatus`, `CampaignTeamRole`, `ActionCategory`, `ProductionState` | Misc |

---

## 4. Migration history

37 migrations under [prisma/migrations/](../../prisma/migrations/). The migration name convention is timestamped + descriptive (e.g., `20260507_phase21_fb_oracle_section`).

**Conventions** (from [CLAUDE.md](../../CLAUDE.md#conventions-already-enforced-or-in-flight-via-refonte)):

- Migrations are **versioned** via `prisma migrate dev` (never `db push` after Phase 5).
- Schema changes that affect cross-system invariants require an **ADR** before the migration ships.
- Pre-commit hook re-runs `npx tsx scripts/gen-code-map.ts` to update [CODE-MAP.md](../governance/CODE-MAP.md) whenever a structural model is touched.

---

## 5. Seeds

| Seed | Purpose | Command |
|---|---|---|
| [prisma/seed.ts](../../prisma/seed.ts) | Base seed (operators, users, sectors, …) | `npm run db:seed` |
| [prisma/seed-countries.ts](../../prisma/seed-countries.ts) | Country reference data | `npm run db:seed:countries` |
| [prisma/seed-demo.ts](../../prisma/seed-demo.ts) | Demo dataset | `npm run db:seed:demo` |
| [prisma/seed-e2e.ts](../../prisma/seed-e2e.ts) | E2E test fixture (used by Playwright) | invoked by `npm run test:e2e` |
| [scripts/seed-spawt-complete.ts](../../scripts/seed-spawt-complete.ts) | "Spawt" demo brand full setup | `npm run db:seed:spawt` |
| [scripts/seed-wakanda/index.ts](../../scripts/seed-wakanda/index.ts) | Wakanda multi-brand showcase | `npm run db:seed:wakanda` |
| | All at once | `npm run db:seed:all` |

Purge helpers: [scripts/seed-wakanda/purge.ts](../../scripts/seed-wakanda/purge.ts), [scripts/cleanup-spawt.ts](../../scripts/cleanup-spawt.ts).

---

## 6. Schema conventions

| Convention | Where to look |
|---|---|
| All mutations on tenant-scoped models go through `tenantScopedDb` (no raw `prisma.foo.update`) | [tenant-scoped-db.ts](../../src/server/governance/tenant-scoped-db.ts) |
| `staleAt: DateTime?` is the canonical staleness signal (uniform across BrandAsset/Pillar/OracleSection — ADR-0023 §6 + ADR-0076) | grep `staleAt` |
| Hash-chained immutability on `IntentEmission` — never UPDATE without an ADR | [hash-chain.ts](../../src/server/governance/hash-chain.ts) |
| Cascade deletes follow business ownership (Strategy → Pillar → PillarVersion → BrandAsset…) | schema |
| ADR-0029 (`SetNull` on `QuickIntake.strategyId`) — keep the intake row when the strategy is hard-deleted | [adr/0029](../governance/adr/0029-quickintake-strategy-fk-setnull.md) |
| Anti-doublon: before adding any new model, **grep CODE-MAP.md** for synonyms; if a similar entity exists, extend it via an ADR | [CODE-MAP.md](../governance/CODE-MAP.md) |
