# SERVICE-MAP — Tous les services backend mappés sur APOGEE

**90 répertoires** sous `src/server/services/` (recensement Phase 15 — incl. `imhotep/`, `anubis/`, `ptah/`, `error-vault/` et services Phase 13). Dont **89 services métier** classifiés par **Sous-système APOGEE** + **Tier**, et **1 répertoire helper** (`utils/`) hors classification. Le **Governor Neteru** indique sous quelle gouvernance le service tombe : MESTOR / ARTEMIS / SESHAT / THOT / **PTAH** (Phase 9) / **IMHOTEP** (Phase 14, ADR-0019) / **ANUBIS** (Phase 15, ADR-0020) / INFRASTRUCTURE.

**Cap APOGEE atteint — 7/7 Neteru actifs** depuis Phase 14/15.

Source de vérité : `find src/server/services -mindepth 1 -maxdepth 1 -type d`. Mis à jour avec [APOGEE.md](APOGEE.md) §4 + [PANTHEON.md](PANTHEON.md).

Phase 2 du REFONTE-PLAN exige un `manifest.ts` co-localisé pour chaque service métier — la colonne **Manifest** indique l'état attendu (à créer ou existant).

---

## Synthèse globale

| Sous-système | Tier | Count | Governor Neteru |
|---|---|---|---|
| Propulsion (briefs) | M | 13 | ARTEMIS |
| Propulsion (forge) | M | 1 (`ptah/` Phase 9 ✅ shipped) | **PTAH** (ADR-0009) |
| Guidance | M | 12 | MESTOR |
| Telemetry | M | 21 | SESHAT |
| Sustainment | M | 12 | THOT / MESTOR / INFRASTRUCTURE |
| Operations | G | 10 | THOT (extension) / INFRASTRUCTURE |
| Crew Programs | G | 5 satellites + `imhotep/` orchestrateur (Phase 14 ✅) | **IMHOTEP** (ADR-0019, supersedes ADR-0017) |
| Comms | G | 2 satellites + `anubis/` orchestrateur (Phase 15 ✅) | **ANUBIS** (ADR-0020, supersedes ADR-0018) |
| Admin | G | 11 | INFRASTRUCTURE |
| **TOTAL** | | **89 services métier** + 1 helper (`utils/`) = **90 répertoires** | 7 Neteru actifs + INFRASTRUCTURE |

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

## 1. Propulsion (14 services — Mission Tier)

Génèrent la poussée vers l'apogée. **13 services briefs (ARTEMIS) + 1 service forge (PTAH)**.

| Service | Rôle propulsion | Governor | Manifest |
|---|---|---|---|
| `artemis/` | Thrust controller — exécute Glory tools, séquences GLORY | ARTEMIS | à créer |
| `glory-tools/` | Catalogue + métadonnées des 56 thrusters (40 legacy + 9 P13 + 4 P14 + 3 P15) | ARTEMIS | à créer |
| `sequence-vault/` | Bibliothèque des 57 séquences GLORY (skill tree, post Phase 13 ORACLE_*) | ARTEMIS | à créer |
| `pipeline-orchestrator/` | Orchestration topo-triée des séquences | ARTEMIS | à créer |
| `notoria/` | Pipeline production des livrables | ARTEMIS | à créer |
| `driver-engine/` | Drivers d'engagement (E pillar tactics) | ARTEMIS | à créer |
| `campaign-manager/` | Gestion campagnes en vol | ARTEMIS | à créer |
| `campaign-plan-generator/` | Génération plans de campagne | ARTEMIS | à créer |
| `mission-templates/` | Templates de missions standard | ARTEMIS | à créer |
| `implementation-generator/` | Génération plans d'implémentation | ARTEMIS | à créer |
| `guidelines-renderer/` | Rendu brand guidelines (livrable) | ARTEMIS | à créer |
| `value-report-generator/` | Rendu rapport valeur (livrable client) | ARTEMIS | à créer |
| `seshat-bridge/` | **Bridge** Telemetry → Propulsion (signaux qui déclenchent missions) | ARTEMIS | à créer |
| `ptah/` | **Forge orchestrator** — matérialise les briefs en assets (image/video/audio/icon/refine/...) | **PTAH** (ADR-0009) | ✅ existant |

---

## 2. Guidance (12 services — Mission Tier)

Dirigent la trajectoire. Décisions, validations, plans.

| Service | Rôle guidance | Governor | Manifest |
|---|---|---|---|
| `mestor/` | Computer de guidage central — Intent dispatcher (`emitIntent`) | MESTOR | partiel (`intents.ts:179`) |
| `pillar-gateway/` | Écriture gouvernée des Pillars (`writePillarAndScore`) | MESTOR | à créer |
| `pillar-maturity/` | Évaluation maturity N0-N6 + assessor | MESTOR | à créer |
| `pillar-versioning/` | Versionning des contrats Pillar | MESTOR | à créer |
| `pillar-normalizer/` | Normalisation inputs avant write | MESTOR | à créer |
| `rtis-protocols/` | Protocoles cascade R-T-I-S | MESTOR | à créer |
| `diagnostic-engine/` | Moteur de diagnostic substantiel | MESTOR | à créer |
| `cross-validator/` | Validation cross-pillar cohérence | MESTOR | à créer |
| `vault-enrichment/` | Enrichissement strategy depuis vault | MESTOR | à créer |
| `strategy-presentation/` | Assemblage Oracle 21 sections + catalogue `OracleError` (ADR-0022) | MESTOR | à créer |
| `prompt-registry/` | Registre prompts LLM versionnés | MESTOR | à créer |
| `staleness-propagator/` | Détecte et propage staleness | MESTOR | à créer |

> Helpers TS dans `strategy-presentation/` (n/a manifest, n/a count) :
> - `error-codes.ts` — catalogue typé `ORACLE-NNN` + classe `OracleError` + `toOracleError` (ADR-0022)
> - `error-capture.ts` — `captureOracleErrorPublic` → error-vault (recursion-safe)
>
> **Note** : `pillar-readiness/` vit dans `src/server/governance/` (5 gates pre-conditions) — pas un service `src/server/services/`, donc hors compte.

---

## 3. Telemetry (21 services — Mission Tier)

Observent, mesurent, archivent.

| Service | Rôle telemetry | Governor | Manifest |
|---|---|---|---|
| `seshat/` | Telemetry processor central + Tarsis sensors + ranker | SESHAT | partiel |
| `jehuty/` | Cross-brand intelligence feed (V5.4) | SESHAT | à créer |
| `knowledge-aggregator/` | Agrégation knowledge graph | SESHAT | à créer |
| `knowledge-capture/` | Capture nouveaux knowledge entries | SESHAT | à créer |
| `knowledge-seeder/` | Seeding knowledge initial | SESHAT | à créer |
| `market-intelligence/` | Intel sectorielle | SESHAT | à créer |
| `sector-intelligence/` | Sector as first-class entity (APOGEE drift 5.2 fix) | SESHAT | ✅ existant |
| `source-classifier/` | Reads BrandDataSource → BrandAsset DRAFTs (taxonomie canonique) | SESHAT | à créer |
| `playbook-capitalization/` | Cross-brand learning loop (MISSION drift 5.10) | SESHAT | ✅ existant |
| `audit-trail/` | Trail audit transverse | INFRASTRUCTURE | à créer |
| `ecosystem-engine/` | Moteur métriques cross-tenant | SESHAT | à créer |
| `ai-cost-tracker/` | Tracking coûts LLM par intent | THOT | à créer |
| `cult-index-engine/` | Cult index (mass measurement propellant) | SESHAT | à créer |
| `devotion-engine/` | Devotion ladder calculation | SESHAT | à créer |
| `tier-evaluator/` | Classification ZOMBIE→ICONE | SESHAT | à créer |
| `advertis-scorer/` | Calcul score composite ADVERTIS | SESHAT | à créer |
| `advertis-connectors/` | Connecteurs sources signaux (social, presse) | SESHAT | à créer |
| `feedback-loop/` | Boucle feedback Mestor ↔ Seshat | SESHAT | à créer |
| `feedback-processor/` | Traitement feedbacks structurés | SESHAT | à créer |
| `asset-tagger/` | Tagging automatique assets | SESHAT | à créer |
| `error-vault/` | Collecteur erreurs runtime (server/client/Prisma/NSP/Ptah/cron/webhook) — Phase 11 | SESHAT | ✅ existant |

---

## 4. Sustainment (12 services — Mission Tier)

Maintiennent la mission viable techniquement. Mémoires long terme, transports, gates de capacité, sentinels.

| Service | Rôle sustainment | Governor | Manifest |
|---|---|---|---|
| `llm-gateway/` | Engine controller multi-provider (v4) | INFRASTRUCTURE | à créer |
| `model-policy/` | Résolution gouvernée `purpose → model` (cache + Prisma `ModelPolicy`) | INFRASTRUCTURE | à créer |
| `financial-brain/` | **Thot** — fuel manager, capacity tracking | THOT | à créer |
| `budget-allocator/` | Allocation budget par mission | THOT | à créer |
| `approval-workflow/` | Workflow d'approbation pré-action | MESTOR | à créer |
| `sla-tracker/` | SLO/SLA tracking par Intent kind | INFRASTRUCTURE | à créer |
| `operator-isolation/` | Tenant isolation (default-deny) | INFRASTRUCTURE | à créer |
| `neteru-shared/` | Governance registry central | INFRASTRUCTURE | manifests des autres |
| `brand-vault/` | BrandAsset CRUD engine — vault unifié (ADR-0012, Phase 10) | MESTOR | ✅ existant |
| `strategy-archive/` | 2-phase soft archive + hard purge (`Strategy.archivedAt`) | INFRASTRUCTURE | à créer |
| `sentinel-handlers/` | Handlers cron `/api/cron/sentinels` — consomme IntentEmission PENDING (Loi 4 maintien orbite) | MESTOR | ✅ existant |
| `nsp/` | Neteru Streaming Protocol — transport publish/subscribe vers UI | INFRASTRUCTURE | n/a (utilitaire pur) |

> `cross-validator/` est compté en Guidance (rôle dominant : validation cross-pillar). Ses invariants techniques sont consommés par Sustainment — pas de double-count.

---

## 5. Operations (10 services — Ground Tier)

Argent, contrats, facturation, monétisation. Sans Operations, pas de business.

| Service | Rôle operations | Governor | Manifest |
|---|---|---|---|
| `commission-engine/` | Calcul commissions UPgraders/agence/creator | THOT | à créer |
| `financial-engine/` | Logique business financière | THOT | à créer |
| `financial-reconciliation/` | Réconciliation transactions | THOT | à créer |
| `mobile-money/` | Intégration paiement mobile (Orange/MTN/Wave) | INFRASTRUCTURE | à créer |
| `payment-providers/` | Registry abstrait providers paiement (`pickProvider()`) | INFRASTRUCTURE | à créer |
| `monetization/` | Pricing localisé marché (FMCG / SaaS / agence — Mission contribution: GROUND_INFRASTRUCTURE) | THOT | ✅ existant |
| `crm-engine/` | Relation client structurée | INFRASTRUCTURE | à créer |
| `upsell-detector/` | Signaux d'upgrade contractuel | SESHAT | à créer |
| `campaign-budget-engine/` | Budgets par campagne | THOT | à créer |
| `data-export/` | Export données structurées (factures, reports) | INFRASTRUCTURE | à créer |

---

## 6. Crew Programs (6 services — Ground Tier)

Talent, formation, matching, QC, psychologie founder. **5 satellites + `imhotep/` orchestrateur**.

| Service | Rôle crew programs | Governor | Manifest |
|---|---|---|---|
| `imhotep/` | **Orchestrateur** — wrappe matching/talent/team/tier/qc, formation Académie (Phase 14, ADR-0019) | **IMHOTEP** | ✅ existant |
| `talent-engine/` | Évaluation, scoring, ranking creators | INFRASTRUCTURE | à créer |
| `matching-engine/` | Match creator ↔ mission | INFRASTRUCTURE | à créer |
| `team-allocator/` | Composition d'équipes optimales | INFRASTRUCTURE | à créer |
| `qc-router/` | Routing quality control | INFRASTRUCTURE | à créer |
| `founder-psychology/` | Mécanise "founder = first superfan" (MISSION drift 5.9) | INFRASTRUCTURE | ✅ existant |

---

## 7. Comms (3 services — Ground Tier)

Channels externes vers audience. Ad networks, email, SMS, OAuth flows. **2 satellites + `anubis/` orchestrateur**.

| Service | Rôle comms | Governor | Manifest |
|---|---|---|---|
| `anubis/` | **Orchestrateur** — broadcast multi-canal, ad networks, Credentials Vault (Phase 15, ADR-0020 + ADR-0021) | **ANUBIS** | ✅ existant |
| `email/` | Email transactionnel (Resend / SendGrid / SES + dev fallback console) | ANUBIS | à créer |
| `oauth-integrations/` | OAuth 2.0 Authorization Code flow pour intégrations sortantes (Google, LinkedIn, Meta) | ANUBIS | à créer |

> Provider façades (Meta Ads, Google Ads, X Ads, TikTok Ads, Mailgun, Twilio) sont co-localisées dans `anubis/providers/` — pas comptées comme services distincts (sub-modules de l'orchestrateur).

---

## 8. Admin (11 services — Ground Tier)

Configuration, boot, ingestion système, support, security, collaboration interne.

| Service | Rôle admin | Governor | Manifest |
|---|---|---|---|
| `boot-sequence/` | Initialisation système au démarrage | INFRASTRUCTURE | à créer |
| `process-scheduler/` | Cron + queue intents async | INFRASTRUCTURE | à créer |
| `ingestion-pipeline/` | Pipeline d'ingestion data externe | INFRASTRUCTURE | à créer |
| `quick-intake/` | Pipeline onboarding intake (rev 9) | INFRASTRUCTURE | à créer |
| `brief-ingest/` | Ingestion PDF briefs | MESTOR | à créer |
| `demo-data/` | Seeding pour staging/demo | INFRASTRUCTURE | à créer |
| `country-registry/` | Référentiel pays (devises, langues) | INFRASTRUCTURE | à créer |
| `translation/` | i18n service (P7) | INFRASTRUCTURE | à créer |
| `board-export/` | Export données pour boards externes | INFRASTRUCTURE | à créer |
| `mfa/` | TOTP-based MFA pour role ADMIN (Mission contribution: GROUND_INFRASTRUCTURE) | INFRASTRUCTURE | ✅ existant |
| `collab-doc/` | Persistence layer collaborative StrategyDoc (load/save + optimistic concurrency, futur Yjs CRDT) | INFRASTRUCTURE | ✅ existant |

> Helper hors compte : `utils/` — helpers transverses, pas un service au sens APOGEE.

---

## 9. Verdict — orphelins révélés

Aucun service n'est resté orphelin après Phase 14/15 et Phase 16 :

- Tous les services financiers (`financial-*`, `commission-engine`, `mobile-money`, `payment-providers`, `monetization`, `crm-engine`, `upsell-detector`, `campaign-budget-engine`, `data-export`) → absorbés par **Operations** (10 services).
- Tous les services humains (`talent-engine`, `matching-engine`, `team-allocator`, `qc-router`, `founder-psychology`) + `imhotep/` orchestrateur → absorbés par **Crew Programs** (6 services).
- Tous les services de communication externe (`email`, `oauth-integrations`) + `anubis/` orchestrateur → absorbés par **Comms** (3 services).
- Tous les services d'infrastructure (`boot-sequence`, `process-scheduler`, `ingestion-pipeline`, `country-registry`, `translation`, `mfa`, `collab-doc`, etc.) → absorbés par **Admin** (11 services).
- Tous les services de mémoire long terme + transport + sentinels (`brand-vault`, `strategy-archive`, `nsp`, `sentinel-handlers`, `model-policy`) → absorbés par **Sustainment** (12 services).

**Cas particuliers** :

- `seshat-bridge/` — **service pont** entre 2 sous-systèmes (Telemetry → Propulsion). Pattern récurrent où une observation Seshat déclenche une action Artemis. Listé en Propulsion (output) avec governor SESHAT.
- `cross-validator/` — sert à la fois Guidance (validation cross-pillar) et Sustainment (invariants techniques). Listé en Guidance (rôle dominant) — pas de double-count.
- `nsp/` — utilitaire pur de transport (pas une capability métier, pas de manifest). Compté en Sustainment (transport infra transversale).
- `utils/` — helpers TS, pas un service au sens APOGEE. Compté comme répertoire (1) mais pas comme service métier (0).

**Vérification arithmétique** :

```
Propulsion 14 + Guidance 12 + Telemetry 21 + Sustainment 12 + Operations 10 + Crew 6 + Comms 3 + Admin 11
= 89 services métier classifiés
+ 1 helper (utils/)
= 90 répertoires sous src/server/services/  ✅
```

**Manifests requis Phase 2** : 89 services métier × 1 manifest. Quelques services ont déjà un manifest partiel ou complet (`mestor/`, `seshat/`, `ptah/`, `imhotep/`, `anubis/`, `brand-vault/`, `error-vault/`, `sentinel-handlers/`, `monetization/`, `founder-psychology/`, `mfa/`, `collab-doc/`, `playbook-capitalization/`, `sector-intelligence/`). Le reste (~75 services) constitue le travail concret de Phase 2.6 du REFONTE-PLAN.

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
