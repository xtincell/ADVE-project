# SERVICE-MAP — Tous les services backend mappés sur APOGEE

**118 répertoires** sous `src/server/services/` (recompte 2026-07-21) : **117 services métier** classifiés par **Sous-système APOGEE** + **Tier**, et **1 répertoire helper** (`utils/`) hors classification. La reclassification du delta post-Phase 19 (26 services apparus entre les recomptes 2026-07-11 et 2026-07-21) est intégrée aux tables ci-dessous — la section « À classifier » est refermée. Le **Governor Neteru** indique sous quelle gouvernance le service tombe : MESTOR / ARTEMIS / SESHAT / THOT / **PTAH** (Phase 9) / **IMHOTEP** (Phase 14, ADR-0019) / **ANUBIS** (Phase 15, ADR-0020) / INFRASTRUCTURE.

**Cap APOGEE atteint — 7/7 Neteru actifs** depuis Phase 14/15.

Source de vérité : `find src/server/services -mindepth 1 -maxdepth 1 -type d`. Mis à jour avec [APOGEE.md](APOGEE.md) §4 + [PANTHEON.md](PANTHEON.md).

Phase 2.6 du REFONTE-PLAN exige un `manifest.ts` co-localisé pour chaque service métier — **objectif atteint et re-fermé 2026-07-21** : **118/118 manifests** (les 3 manquants `referral/` · `tester-feedback/` · `value-statement/` comblés à la reclassification ; `utils/` en a un aussi depuis). Audit `npm run manifests:audit` clean, zéro warn.

---

## Synthèse globale

| Sous-système | Tier | Count | Governor Neteru |
|---|---|---|---|
| Propulsion (briefs) | M | 19 (incl. `deliverable-orchestrator/` Phase 17b + acteurs Phase 24) | ARTEMIS (+ INFRASTRUCTURE acteurs) |
| Propulsion (forge) | M | 1 (`ptah/` Phase 9 ✅ shipped) | **PTAH** (ADR-0009) |
| Guidance | M | 21 | MESTOR (+ INFRASTRUCTURE) |
| Telemetry | M | 25 | SESHAT (+ INFRASTRUCTURE / THOT) |
| Sustainment | M | 13 | THOT / MESTOR / INFRASTRUCTURE |
| Operations | G | 15 | THOT (extension) / INFRASTRUCTURE |
| Crew Programs | G | 6 satellites + `imhotep/` orchestrateur (Phase 14 ✅) | **IMHOTEP** (ADR-0019, supersedes ADR-0017) |
| Comms | G | 2 satellites + `anubis/` orchestrateur (Phase 15 ✅) | **ANUBIS** (ADR-0020, supersedes ADR-0018) |
| Admin | G | 13 | INFRASTRUCTURE |
| **TOTAL** | | **117 services métier** + 1 helper (`utils/`) = **118 répertoires** | 7 Neteru actifs + INFRASTRUCTURE |

### Imhotep — service Phase 14 ✅ shipped (ADR-0019)

```
src/server/services/imhotep/
├── manifest.ts             # governor: IMHOTEP, 8 capabilities (draftCrewProgram, matchTalentToMission, assembleCrew, evaluateTier, enrollFormation, certifyTalent, qcDeliverable, recommendFormation)
├── index.ts                # handlers orchestrateurs (wrappent matching/talent/team/tier/qc)
├── governance.ts           # gates : missionReadyForCrew, talentProfileExists, budgetCap
└── types.ts                # payloads + back-compat ImhotepCrewProgramPlaceholder Phase 13
```

Dépendances satellites : `matching-engine`, `talent-engine`, `team-allocator`, `tier-evaluator`, `qc-router`, `founder-psychology`, `financial-brain`. **0 nouveau model Prisma** (anti-doublon NEFER §3) — réutilise TalentProfile, Course, Enrollment, TalentCertification, TalentReview, Mission, MissionDeliverable. Page hub : `/console/imhotep/page.tsx`. Router tRPC : `imhotep.ts`.

### Anubis — service Phase 15 ✅ shipped (ADR-0020 + ADR-0021)

```
src/server/services/anubis/
├── manifest.ts             # governor: ANUBIS, 11 capabilities (draftCommsPlan, broadcastMessage, buyAdInventory, segmentAudience, trackDelivery, registerCredential, revokeCredential, testChannel, scheduleBroadcast, cancelBroadcast, fetchDeliveryReport)
├── index.ts                # handlers orchestrateurs
├── governance.ts           # gates : commsPlanExists, broadcastJobExists, adBudgetCap
├── credential-vault.ts     # wraps ExternalConnector model (existant) — pattern ADR-0021
├── types.ts                # payloads + back-compat AnubisCommsPlanPlaceholder Phase 13
└── providers/              # 7 façades feature-flagged (DEFERRED_AWAITING_CREDENTIALS si pas de creds)
    ├── _factory.ts         # createProviderFaçade DRY
    ├── meta-ads.ts         # Meta Ads (Facebook + Instagram)
    ├── google-ads.ts       # Google Ads
    ├── x-ads.ts            # X (Twitter) Ads
    ├── tiktok-ads.ts       # TikTok Ads
    ├── mailgun.ts          # Email transactionnel
    ├── twilio.ts           # SMS
    └── email-fallback.ts   # Dev mode (logs only)
```

Dépendances satellites : `email`, `oauth-integrations`, `advertis-connectors`, `financial-brain`. **4 nouveaux models Prisma** : `CommsPlan`, `BroadcastJob`, `EmailTemplate`, `SmsTemplate`. Réutilise `Notification`, `NotificationPreference`, `WebhookConfig`, `ExternalConnector` existants. Pages : `/console/anubis/page.tsx` (dashboard) + `/console/anubis/credentials/page.tsx` (Credentials Center). Router tRPC : `anubis.ts`.

### Ptah — service Phase 9 ✅ shipped (ADR-0009)

```
src/server/services/ptah/
├── manifest.ts             # governor: MESTOR, acceptsIntents: PTAH_MATERIALIZE_BRIEF, PTAH_RECONCILE_TASK, PTAH_REGENERATE_FADING_ASSET
├── index.ts                # public API + handleIntent dispatcher
├── governance.ts           # cost gates, retry policy, circuit breaker per provider
├── types.ts                # ForgeBrief, ForgeSpec, ForgeProvider interface
├── pricing.ts              # cost table par modèle × provider
├── webhook-handler.ts      # POST /api/ptah/webhook (Magnific callback)
├── task-store.ts           # CRUD GenerativeTask via Prisma (tenantScopedDb)
├── forges/
│   ├── image.ts            # generation → routing par mode + qualité
│   ├── video.ts
│   ├── audio.ts            # TTS / voice clone / SFX / lip-sync / SAM Audio
│   ├── icon.ts             # text-to-icon PNG/SVG
│   ├── refine.ts           # upscale, relight, style transfer
│   ├── transform.ts        # change camera, inpaint, outpaint, bg removal
│   ├── classify.ts         # AI classifier (sync), image-to-prompt
│   ├── stock.ts            # stock library search & ingest (250M+)
│   └── design.ts           # Adobe / Figma / Canva
├── providers/
│   ├── magnific.ts         # client REST + webhook signature verify
│   ├── adobe.ts            # OAuth 2.0 server-to-server, Firefly Services
│   ├── figma.ts            # PAT + REST + Variables API
│   └── canva.ts            # OAuth 2.0 + Connect API (gated par CANVA_ENABLED flag)
├── routing/
│   ├── model-policy.ts     # mirror du pattern model-policy/
│   ├── budget-gate.ts      # délègue à financial-brain.checkCapacity
│   └── provider-selector.ts # choisit provider selon coût/qualité/disponibilité
└── README.md               # doc gouvernance Ptah
```

---

## 1. Propulsion (20 services — Mission Tier)

Génèrent la poussée vers l'apogée. **19 services briefs (incl. `deliverable-orchestrator/` Phase 17b + acteurs Phase 24) + 1 service forge (PTAH)**.

| Service | Rôle propulsion | Governor | Manifest |
|---|---|---|---|
| `artemis/` | Thrust controller — exécute Glory tools, séquences GLORY | ARTEMIS | ✅ existant |
| `glory-tools/` | Catalogue + métadonnées des 56 thrusters (40 legacy + 9 P13 + 4 P14 + 3 P15) | ARTEMIS | ✅ existant |
| `sequence-vault/` | Bibliothèque des séquences GLORY (94 au registre `ALL_SEQUENCES`, recompte 2026-07-11 — skill tree, post Phase 13 ORACLE_*) | ARTEMIS | ✅ existant |
| `pipeline-orchestrator/` | Orchestration topo-triée des séquences | ARTEMIS | ✅ existant |
| `notoria/` | Pipeline production des livrables | ARTEMIS | ✅ existant |
| `driver-engine/` | Drivers d'engagement (E pillar tactics) | ARTEMIS | ✅ existant |
| `campaign-manager/` | Gestion campagnes en vol | ARTEMIS | ✅ existant |
| `campaign-plan-generator/` | Génération plans de campagne | ARTEMIS | ✅ existant |
| `mission-templates/` | Templates de missions standard | ARTEMIS | ✅ existant |
| `implementation-generator/` | Génération plans d'implémentation | ARTEMIS | ✅ existant |
| `guidelines-renderer/` | Rendu brand guidelines (livrable) | ARTEMIS | ✅ existant |
| `value-report-generator/` | Rendu rapport valeur (livrable client) | ARTEMIS | ✅ existant |
| `seshat-bridge/` | **Bridge** Telemetry → Propulsion (signaux qui déclenchent missions) | ARTEMIS | ✅ existant |
| `ptah/` | **Forge orchestrator** — matérialise les briefs en assets (image/video/audio/icon/refine/...) | **PTAH** (ADR-0009) | ✅ existant |
| `deliverable-orchestrator/` | **Output-first composer** (Phase 17b, ADR-0050 — anciennement ADR-0037) — résout DAG briefs depuis kind matériel cible, scan vault, mode PREVIEW | ARTEMIS | ✅ existant |
| `intention/` | Aval de l'ADVE (Phase 24, ADR-0106) : capture l'intention du dirigeant → brief candidat (intention × ADVE, manual-first) | ARTEMIS | ✅ existant |
| `oracle-section/` | OracleSection first-class (Phase 21 F-B/F-C, ADR-0068/0070) : lifecycle 35 sections, lock optimiste, runners | ARTEMIS | ✅ existant |
| `creative-proposal/` | Proposition Créative — gate de génération de production (ADR-0120) : validation → briefs de production depuis les frames canon | INFRASTRUCTURE | ✅ existant |
| `campaign-canon/` | 3 campagnes canon (30-60-90 / annuelle / always-on) depuis le Pilier I + ponctuelles insight-driven (ADR-0119) | INFRASTRUCTURE | ✅ existant |
| `media-plan/` | Plan média structuré (acteur Média, ADR-0115) | INFRASTRUCTURE | ✅ existant |

---

## 2. Guidance (21 services — Mission Tier)

Dirigent la trajectoire. Décisions, validations, plans.

| Service | Rôle guidance | Governor | Manifest |
|---|---|---|---|
| `mestor/` | Computer de guidage central — Intent dispatcher (`emitIntent`) | MESTOR | partiel (`intents.ts:179`) |
| `pillar-gateway/` | Écriture gouvernée des Pillars (`writePillarAndScore`) | MESTOR | ✅ existant |
| `pillar-maturity/` | Évaluation maturity N0-N6 + assessor | MESTOR | ✅ existant |
| `pillar-versioning/` | Versionning des contrats Pillar | MESTOR | ✅ existant |
| `pillar-normalizer/` | Normalisation inputs avant write | MESTOR | ✅ existant |
| `rtis-protocols/` | Protocoles cascade R-T-I-S | MESTOR | ✅ existant |
| `diagnostic-engine/` | Moteur de diagnostic substantiel | MESTOR | ✅ existant |
| `cross-validator/` | Validation cross-pillar cohérence | MESTOR | ✅ existant |
| `vault-enrichment/` | Enrichissement strategy depuis vault | MESTOR | ✅ existant |
| `strategy-presentation/` | Assemblage Oracle 21 sections + catalogue `OracleError` (ADR-0022) | MESTOR | ✅ existant |
| `prompt-registry/` | Registre prompts LLM versionnés | MESTOR | ✅ existant |
| `staleness-propagator/` | Détecte et propage staleness | MESTOR | ✅ existant |
| `campaign-tracker/` | **L2 Instrumental** Campaign module (Phase 19, ADR-0052) — orchestrateur cross-Neteru ; Vague 1 = Cluster A (trajectory + fuelBurnRate + pauseFlameOut) + Cluster B (bigIdeaCoherence + culturalDebt + mythArc). Capability flags 4-états (READY/PARTIAL/STUB/DISABLED) + STUB→MVP→PRODUCTION par sous-cluster. | MESTOR | ✅ existant |
| `auto-promotion/` | Transitions planifiées timer-based (fenêtres de sûreté) — promotions gouvernées non-strategy-scoped | MESTOR | ✅ existant |
| `brand-node/` | Arbre de marque multi-archétype (Phase 18, ADR-0059) : BrandContextNode, resolveEffectivePillars, cascade d'invalidation | MESTOR | ✅ existant |
| `campaign-change-request/` | CampaignChangeRequest (Phase 18-A1) : demandes de changement gouvernées | MESTOR | ✅ existant |
| `campaign-deliverable/` | Matrice 6D CampaignDeliverable (ADR-0059) : CRUD gouverné + RAG override | MESTOR | ✅ existant |
| `consulting/` | Acteur Conseil (ADR-0109/0113) : priorisation RICE déterministe + chaîne de preuve (engagements → hypothèses → évidences → verdict) | INFRASTRUCTURE | ✅ existant |
| `market-lifecycle/` | Kill-switch marché gouverné (ADR-0105) : NEUTRALIZE (FROZEN/SHADOWBANNED) / REINSTATE / PURGE cascade | MESTOR | ✅ existant |
| `morning-batch/` | Morning Brief batch ingestion mail/Slack + validation middle-portal (Phase 18-A1-δ, ADR-0062) | MESTOR | ✅ existant |
| `operator-action/` | OperatorAction (Phase 18-A1) : actions opérateur tracées | MESTOR | ✅ existant |

> Helpers TS dans `strategy-presentation/` (n/a manifest, n/a count) :
> - `error-codes.ts` — catalogue typé `ORACLE-NNN` + classe `OracleError` + `toOracleError` (ADR-0022)
> - `error-capture.ts` — `captureOracleErrorPublic` → error-vault (recursion-safe)
>
> **Note** : `pillar-readiness/` vit dans `src/server/governance/` (5 gates pre-conditions) — pas un service `src/server/services/`, donc hors compte.

---

## 3. Telemetry (25 services — Mission Tier)

Observent, mesurent, archivent. **25 répertoires** ; la table contient 3 lignes supplémentaires (`seshat/tarsis/connector.ts` · `seshat/scan-rate-limit.ts` · `seshat/entity-gate/`) qui sont des **sous-modules de `seshat/`** — documentés ici pour la traçabilité, hors compte.

| Service | Rôle telemetry | Governor | Manifest |
|---|---|---|---|
| `seshat/` | Telemetry processor central + Tarsis sensors + ranker | SESHAT | partiel |
| `jehuty/` | Cross-brand intelligence feed (V5.4) | SESHAT | ✅ existant |
| `knowledge-aggregator/` | Agrégation knowledge graph | SESHAT | ✅ existant |
| `knowledge-capture/` | Capture nouveaux knowledge entries | SESHAT | ✅ existant |
| `knowledge-seeder/` | Seeding knowledge initial | SESHAT | ✅ existant |
| `market-intelligence/` | Intel sectorielle | SESHAT | ✅ existant |
| `sector-intelligence/` | Sector as first-class entity (APOGEE drift 5.2 fix) — **Phase 23 (ADR-0078) confirme canonical Overton home** : campaign-tracker/culture.* délègue ici. Epic 3 Story 3.1 étend l'index pour accepter `ConnectorResult<TarsisSignal>` (data-in / data-out, pure). | SESHAT | ✅ existant |
| `seshat/tarsis/connector.ts` | **Tarsis-monitoring API façade — Phase 23 PENDING (Epic 2 Story 2.2)**. Retourne `ConnectorResult<TarsisSignal>` per pattern P22-1. Credentials via Vault (ADR-0021 + ADR-0079). Cf. ADR-0077, architecture D4. | SESHAT | 🟡 PENDING (Phase 23) |
| `seshat/scan-rate-limit.ts` | Rate-limit PARTAGÉ entre workers des scans frais du scoreur public (table `ScanRateHit`, 6/min/IP, fail-open, purge auto) + résolution IP réelle derrière Cloudflare/Traefik (ADR-0161). Le cache ne consomme jamais. | SESHAT | ✅ shippé (2026-07-19) |
| `seshat/entity-gate/` | Gate adversarial de collecte publique (ADR-0162) : ambiguïté du nom (lexique mots communs) + discriminants du contexte déclaré + verdict déterministe avec preuves + réfutation LLM optionnelle demote-only. Consommé par `quick-intake/public-enrichment` (presse, Brave, Maps, découverte de site). | SESHAT | ✅ shippé (2026-07-20) |
| `source-classifier/` | Reads BrandDataSource → BrandAsset DRAFTs (taxonomie canonique) | SESHAT | ✅ existant |
| `playbook-capitalization/` | Cross-brand learning loop (MISSION drift 5.10) | SESHAT | ✅ existant |
| `audit-trail/` | Trail audit transverse | INFRASTRUCTURE | ✅ existant |
| `ecosystem-engine/` | Moteur métriques cross-tenant | SESHAT | ✅ existant |
| `ai-cost-tracker/` | Tracking coûts LLM par intent | THOT | ✅ existant |
| `cult-index-engine/` | Cult index (mass measurement propellant) | SESHAT | ✅ existant |
| `devotion-engine/` | Devotion ladder calculation | SESHAT | ✅ existant |
| `tier-evaluator/` | Classification LATENT→ICONE | SESHAT | ✅ existant |
| `advertis-scorer/` | Calcul score composite ADVERTIS | SESHAT | ✅ existant |
| `advertis-connectors/` | Connecteurs sources signaux (social, presse) | SESHAT | ✅ existant |
| `feedback-loop/` | Boucle feedback Mestor ↔ Seshat | SESHAT | ✅ existant |
| `feedback-processor/` | Traitement feedbacks structurés | SESHAT | ✅ existant |
| `asset-tagger/` | Tagging automatique assets | SESHAT | ✅ existant |
| `error-vault/` | Collecteur erreurs runtime (server/client/Prisma/NSP/Ptah/cron/webhook) — Phase 11 | SESHAT | ✅ existant |
| `bureau-etudes/` | Acteur Bureau d'étude (ADR-0110/0114) : vagues d'étude time-spine, significativité vague-sur-vague, fusion pondérée par provenance | INFRASTRUCTURE | ✅ existant |
| `community-dashboard/` | Composition lecture seule du suivi communauté (superfans, paliers de dévotion, santé, followers) | SESHAT | ✅ existant |
| `media-perf/` | Ingestion perf média réelle → CampaignAmplification (acteur Média, ADR-0115) — manuel ou connecteur credential-gated (ConnectorResult honnête) | INFRASTRUCTURE | ✅ existant |
| `value-statement/` | Relevé de valeur mensuel déterministe depuis séries persistées (boucle B4 REVENU) — « non mesuré » quand la série est absente, jamais un zéro fabriqué (ADR-0046) | SESHAT | ✅ existant (2026-07-21) |

---

## 4. Sustainment (13 services — Mission Tier)

Maintiennent la mission viable techniquement. Mémoires long terme, transports, gates de capacité, sentinels.

| Service | Rôle sustainment | Governor | Manifest |
|---|---|---|---|
| `llm-gateway/` | Engine controller multi-provider (v4) | INFRASTRUCTURE | ✅ existant |
| `model-policy/` | Résolution gouvernée `purpose → model` (cache + Prisma `ModelPolicy`) | INFRASTRUCTURE | ✅ existant |
| `financial-brain/` | **Thot** — fuel manager, capacity tracking | THOT | ✅ existant |
| `budget-allocator/` | Allocation budget par mission | THOT | ✅ existant |
| `approval-workflow/` | Workflow d'approbation pré-action | MESTOR | ✅ existant |
| `sla-tracker/` | SLO/SLA tracking par Intent kind | INFRASTRUCTURE | ✅ existant |
| `operator-isolation/` | Tenant isolation (default-deny) | INFRASTRUCTURE | ✅ existant |
| `neteru-shared/` | Governance registry central | INFRASTRUCTURE | manifests des autres |
| `brand-vault/` | BrandAsset CRUD engine — vault unifié (ADR-0012, Phase 10) | MESTOR | ✅ existant |
| `strategy-archive/` | 2-phase soft archive + hard purge (`Strategy.archivedAt`) | INFRASTRUCTURE | ✅ existant |
| `sentinel-handlers/` | Handlers cron `/api/cron/sentinels` — consomme IntentEmission PENDING (Loi 4 maintien orbite) | MESTOR | ✅ existant |
| `nsp/` | Neteru Streaming Protocol — transport publish/subscribe vers UI | INFRASTRUCTURE | ✅ existant (stub utilitaire) |
| `market-visibility/` | Substrat read-filter (ADR-0105) : pays SHADOWBANNED + descendants pour le default-deny tenant-scoped (cache TTL 15 s) | INFRASTRUCTURE | ✅ existant |

> `cross-validator/` est compté en Guidance (rôle dominant : validation cross-pillar). Ses invariants techniques sont consommés par Sustainment — pas de double-count.

---

## 5. Operations (15 services — Ground Tier)

Argent, contrats, facturation, monétisation. Sans Operations, pas de business.

| Service | Rôle operations | Governor | Manifest |
|---|---|---|---|
| `commission-engine/` | Calcul commissions UPgraders/agence/creator | THOT | ✅ existant |
| `financial-engine/` | Logique business financière | THOT | ✅ existant |
| `financial-reconciliation/` | Réconciliation transactions | THOT | ✅ existant |
| `mobile-money/` | Intégration paiement mobile (Orange/MTN/Wave) | INFRASTRUCTURE | ✅ existant |
| `payment-providers/` | Registry abstrait providers paiement (`pickProvider()`) | INFRASTRUCTURE | ✅ existant |
| `monetization/` | Pricing localisé marché (FMCG / SaaS / agence — Mission contribution: GROUND_INFRASTRUCTURE) | THOT | ✅ existant |
| `crm-engine/` | Relation client structurée | INFRASTRUCTURE | ✅ existant |
| `upsell-detector/` | Signaux d'upgrade contractuel | SESHAT | ✅ existant |
| `campaign-budget-engine/` | Budgets par campagne | THOT | ✅ existant |
| `data-export/` | Export données structurées (factures, reports) | INFRASTRUCTURE | ✅ existant |
| `escrow-arbitration/` | Séquestre de mission à validation manuelle + payouts mobile money (Guilde, ADR-0116) : hold/release/refund/dispute | INFRASTRUCTURE | ✅ existant |
| `market-cost/` | Base de coûts marché historisés par (pays, secteur, métrique, période) — MarketCostSnapshot (ADR-0099) | THOT | ✅ existant |
| `mission-quote/` | Devis structuré prestataire → marque (Guilde, ADR-0118) : soumission + décision + totaux déterministes | INFRASTRUCTURE | ✅ existant |
| `production/` | Acteur Production (ADR-0111/0112) : fan-out specs de livrable, droits d'usage avec gate d'expiration, devis AICP | INFRASTRUCTURE | ✅ existant |
| `referral/` | Parrainage manual-first (ADR-0157) : codes stables par compte, récompenses arbitrées appliquées à la main par l'opérateur | THOT | ✅ existant (2026-07-21) |

---

## 6. Crew Programs (7 services — Ground Tier)

Talent, formation, matching, QC, psychologie founder, marketplace offre-side. **6 satellites + `imhotep/` orchestrateur**.

| Service | Rôle crew programs | Governor | Manifest |
|---|---|---|---|
| `imhotep/` | **Orchestrateur** — wrappe matching/talent/team/tier/qc, formation Académie (Phase 14, ADR-0019) | **IMHOTEP** | ✅ existant |
| `talent-engine/` | Évaluation, scoring, ranking creators | INFRASTRUCTURE | ✅ existant |
| `matching-engine/` | Match creator ↔ mission | INFRASTRUCTURE | ✅ existant |
| `team-allocator/` | Composition d'équipes optimales | INFRASTRUCTURE | ✅ existant |
| `qc-router/` | Routing quality control | INFRASTRUCTURE | ✅ existant |
| `founder-psychology/` | Mécanise "founder = first superfan" (MISSION drift 5.9) | INFRASTRUCTURE | ✅ existant |
| `talent-services/` | Catalogue offre-side de la Guilde (ADR-0117) : gigs à prix fixe indépendants des missions (pattern Fiverr/Malt supply) | INFRASTRUCTURE | ✅ existant |

---

## 7. Comms (3 services — Ground Tier)

Channels externes vers audience. Ad networks, email, SMS, OAuth flows. **2 satellites + `anubis/` orchestrateur**.

| Service | Rôle comms | Governor | Manifest |
|---|---|---|---|
| `anubis/` | **Orchestrateur** — broadcast multi-canal, ad networks, Credentials Vault (Phase 15, ADR-0020 + ADR-0021) | **ANUBIS** | ✅ existant |
| `email/` | Email transactionnel (Resend / SendGrid / SES + dev fallback console) | ANUBIS | ✅ existant |
| `oauth-integrations/` | OAuth 2.0 Authorization Code flow pour intégrations sortantes (Google, LinkedIn, Meta) | ANUBIS | ✅ existant |

> Provider façades (Meta Ads, Google Ads, X Ads, TikTok Ads, Mailgun, Twilio) sont co-localisées dans `anubis/providers/` — pas comptées comme services distincts (sub-modules de l'orchestrateur).
>
> **Phase 23 PENDING (Epic 2 Story 2.3)** — `anubis/providers/crm-provider.ts` : CRM façade Phase 23 retournant `ConnectorResult<CrmCohortSignal>` per P22-1, avec field-level PII redaction (NFR6) avant que toute cohort row ne quitte le façade. Credentials via Vault (ADR-0021 + ADR-0079).

---

## 8. Admin (13 services — Ground Tier)

Configuration, boot, ingestion système, support, security, collaboration interne.

| Service | Rôle admin | Governor | Manifest |
|---|---|---|---|
| `boot-sequence/` | Initialisation système au démarrage | INFRASTRUCTURE | ✅ existant |
| `process-scheduler/` | Cron + queue intents async | INFRASTRUCTURE | ✅ existant |
| `ingestion-pipeline/` | Pipeline d'ingestion data externe | INFRASTRUCTURE | ✅ existant |
| `quick-intake/` | Pipeline onboarding intake (rev 9) | INFRASTRUCTURE | ✅ existant |
| `brief-ingest/` | Ingestion PDF briefs | MESTOR | ✅ existant |
| `demo-data/` | Seeding pour staging/demo | INFRASTRUCTURE | ✅ existant |
| `country-registry/` | Référentiel pays (devises, langues) | INFRASTRUCTURE | ✅ existant |
| `translation/` | i18n service (P7) | INFRASTRUCTURE | ✅ existant |
| `board-export/` | Export données pour boards externes | INFRASTRUCTURE | ✅ existant |
| `mfa/` | TOTP-based MFA pour role ADMIN (Mission contribution: GROUND_INFRASTRUCTURE) | INFRASTRUCTURE | ✅ existant |
| `collab-doc/` | Persistence layer collaborative StrategyDoc (load/save + optimistic concurrency, futur Yjs CRDT) | INFRASTRUCTURE | ✅ existant |
| `canon/` | Namespace de données canon (ADVE UPgraders 100 %) pour seed + scoring de référence — bibliothèque de données pures | INFRASTRUCTURE | ✅ existant |
| `tester-feedback/` | Canal feedback/bug des testeurs (ADR-0155) : single-writer `Feedback`, tri inbox console | INFRASTRUCTURE | ✅ existant (2026-07-21) |

> Helper hors compte : `utils/` — helpers transverses, pas un service au sens APOGEE.

---

## 9. Verdict — orphelins révélés

Aucun service n'est resté orphelin après Phase 14/15/16, ni après la reclassification 2026-07-21 du delta post-Phase 19 :

- Tous les services financiers + marketplace argent (`financial-*`, `commission-engine`, `mobile-money`, `payment-providers`, `monetization`, `crm-engine`, `upsell-detector`, `campaign-budget-engine`, `data-export`, `escrow-arbitration`, `market-cost`, `mission-quote`, `production`, `referral`) → absorbés par **Operations** (15 services).
- Tous les services humains (`talent-engine`, `matching-engine`, `team-allocator`, `qc-router`, `founder-psychology`, `talent-services`) + `imhotep/` orchestrateur → absorbés par **Crew Programs** (7 services).
- Tous les services de communication externe (`email`, `oauth-integrations`) + `anubis/` orchestrateur → absorbés par **Comms** (3 services).
- Tous les services d'infrastructure (`boot-sequence`, `process-scheduler`, `ingestion-pipeline`, `country-registry`, `translation`, `mfa`, `collab-doc`, `canon`, `tester-feedback`, etc.) → absorbés par **Admin** (13 services).
- Tous les services de mémoire long terme + transport + sentinels + read-filters (`brand-vault`, `strategy-archive`, `nsp`, `sentinel-handlers`, `model-policy`, `market-visibility`) → absorbés par **Sustainment** (13 services).
- Les acteurs Phase 24 (`consulting`, `bureau-etudes`, `production`, `media-perf`/`media-plan`, `creative-proposal`, `intention`) → ventilés par rôle dominant : décision → Guidance, mesure → Telemetry, argent/contrats → Operations, brief → Propulsion.

**Cas particuliers** :

- `seshat-bridge/` — **service pont** entre 2 sous-systèmes (Telemetry → Propulsion). Pattern récurrent où une observation Seshat déclenche une action Artemis. Listé en Propulsion (output) avec governor SESHAT.
- `cross-validator/` — sert à la fois Guidance (validation cross-pillar) et Sustainment (invariants techniques). Listé en Guidance (rôle dominant) — pas de double-count.
- `nsp/` — utilitaire pur de transport (pas une capability métier, pas de manifest). Compté en Sustainment (transport infra transversale).
- `utils/` — helpers TS, pas un service au sens APOGEE. Compté comme répertoire (1) mais pas comme service métier (0). A désormais un `manifest.ts` déclaratif (bibliothèque pure, aucune capability) — reste hors classification.

**Vérification arithmétique (recompte 2026-07-21)** :

```
Propulsion (briefs) 19 + Propulsion (forge) 1 + Guidance 21 + Telemetry 25 + Sustainment 13 + Operations 15 + Crew 7 + Comms 3 + Admin 13
= 117 services métier classifiés
+ 1 helper (utils/)
= 118 répertoires sous src/server/services/  ✅
```

**Manifests Phase 2 — ✅ COMPLETÉ (re-fermé 2026-07-21)** : les **118 répertoires** ont leur `manifest.ts` co-localisé (les 3 manquants `referral/` · `tester-feedback/` · `value-statement/` comblés à la reclassification). Registry runtime (`__generated__/manifest-imports.ts`) recense **118 manifests** validés par `npm run manifests:audit` — clean, zéro warn. Phase 2.6 du REFONTE-PLAN refermée.

---

## 10. Services manquants (à anticiper)

La matrice 8×N est désormais complète depuis Phase 14/15/16. Aucun sous-système n'est vide.

Services restant à anticiper (extension framework) :

| Service attendu | Sous-système | Phase | Justification |
|---|---|---|---|
| `compensating-intents/` | Sustainment | P3+ | Reverse maneuvers Loi 1 (extension `sentinel-handlers`) |
| `cost-gate/` | Sustainment | P3+ | Pillar 6 (Thot active gate dédié — actuellement délégué à `financial-brain.checkCapacity` + `budget-allocator`) |
| `notification/` | Comms | P5+ | Notification center cross-channel (actuellement via `nsp/` transport + `anubis/` broadcast) |

Ces 3 services optionnels arriveront uniquement si pattern d'extraction émerge — ils ne sont pas bloquants pour la complétude APOGEE. La cap 7/7 Neteru actifs reste maintenue (pas de 8ème Neter).

---

## Historique de reclassification

- **2026-07-21** — Le delta post-recensement Phase 19 (26 services : les 23 listés « À classifier » au recompte 2026-07-11 + `referral` · `tester-feedback` · `value-statement` apparus ensuite) est intégré aux tables ci-dessus. Section « À classifier » refermée ; chantier RESIDUAL-DEBT « Reclassification ROUTER-MAP / SERVICE-MAP » clos. Tout nouveau service DOIT être classifié ici dans le même PR (protocole NEFER Phase 6 — pas de retour de la section tampon).
