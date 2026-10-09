# SERVICE-MAP — Tous les services backend mappés sur APOGEE

**123 répertoires** sous `src/server/services/` (recompte 2026-10-06) : **122 services métier/enregistrements** et **1 helper** (`utils/`). Les rôles restent classifiés par sous-système ci-dessous. Le recensement des chemins est généré dans [CODE-MAP.md](CODE-MAP.md) ; ces nombres ne mesurent pas la maturité ni l'exécution réelle.

Ajouts au relevé du 21 juillet : `brand-bible/` (composition du livre de marque), `brand-theme/` (thème des livrables), `brand-tier-transition/` (transition gouvernée de palier). Ces trois modules sont des extensions de services existants, sans nouveau Neter.

**Cap APOGEE atteint — 7/7 Neteru actifs** depuis Phase 14/15.

Source de vérité : `find src/server/services -mindepth 1 -maxdepth 1 -type d`. Mis à jour avec [APOGEE.md](APOGEE.md) §4 + [PANTHEON.md](PANTHEON.md).

**436 livré — état de validation, extension du service existant** :
`pillar-gateway/validation-status.ts` partage inspection de composition et décision
de validation entre les deux routes existantes. Contrat ENRICHED/COMPLETE + schéma
S strict, version relue, acteur/portée et sources contrôlés sous verrou ; S/Strategy
atomiques et confiance conservée. cross-validator/staleness-propagator acceptent
le lecteur transactionnel, sans second service ; assessor expose son test de
champ existant. Le contrôle initial des projets issus des initiatives réutilise
ce helper. Aucun provider dans l’approbation S, aucun nouveau service/Neter/kind.
Quatorze PostgreSQL ciblés verts et cinq cas natifs synthétiques reçus ; suites
locales complètes et gauntlet final verts, fixture nettoyée ; stress/réception globale et autres consommateurs
restent ouverts. Source 80e2122f/CI/image/runtime 436 reçus ; lecture réelle SPAWT
S existant/non approuvable reçue, conflit de contrats à réconcilier. Postmerge
documentaire et couverture globale distincts.
[ADR-0214 Proposed](adr/0214-synthesis-approval-preserves-confidence.md) ·
[réception](RECEPTION-VALIDATION-SYNTHESE.md).

Couverture physique des manifests au 2026-10-06 : **120/123 répertoires**. `creative-intelligence/manifest.ts` réexporte le manifest du moteur sous Seshat, car le registre découvre les manifests racines. Les trois extensions ci-dessus ne portent pas de manifest co-localisé ; leur rattachement aux services parents reste à vérifier dans le registre de gouvernance. Le relevé 118/118 du 2026-07-21 est historique et ne décrit plus tout le répertoire.

---

## Synthèse globale

| Sous-système | Tier | Count | Governor Neteru |
|---|---|---|---|
| Propulsion (briefs) | M | 19 (incl. `deliverable-orchestrator/` Phase 17b + acteurs Phase 24) | ARTEMIS (+ INFRASTRUCTURE acteurs) |
| Propulsion (forge) | M | 1 (`ptah/` Phase 9 ✅ shipped) | **PTAH** (ADR-0009) |
| Guidance | M | 24 | MESTOR (+ INFRASTRUCTURE) |
| Telemetry | M | 27 | SESHAT (+ INFRASTRUCTURE / THOT) |
| Sustainment | M | 13 | THOT / MESTOR / INFRASTRUCTURE |
| Operations | G | 15 | THOT (extension) / INFRASTRUCTURE |
| Crew Programs | G | 6 satellites + `imhotep/` orchestrateur (Phase 14 ✅) | **IMHOTEP** (ADR-0019, supersedes ADR-0017) |
| Comms | G | 2 satellites + `anubis/` orchestrateur (Phase 15 ✅) | **ANUBIS** (ADR-0020, supersedes ADR-0018) |
| Admin | G | 13 | INFRASTRUCTURE |
| **TOTAL** | | **122 services métier/enregistrements** + 1 helper (`utils/`) = **123 répertoires** | 7 Neteru actifs + INFRASTRUCTURE |

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

### Ptah — service Phase 9 existant ; code 6.27.428 livré

Code 434 reçu au runtime, ADR-0213 Proposed/métier partiel : helper resumption dans Ptah existant,
reprise de la même tâche par reçu original vérifié et réservation avant réseau.
Reprise/brief nouveau stricts au tRPC, hybride refusé avant effet ; reçu COMPLETED
contient les IDs AssetVersion existants/scopés, exigés non vides par manifest/schema.
Tracker monté dans la page existante sous son layout opérateur ; configuration
globale et fournisseur réels restent à recevoir. Sceau v2 canonique/temps sous
verrou du spine commun, sans second journal ni nouveau service. Deux rouges
émission/trois rouges reprise, 270/14 PostgreSQL puis Ptah ciblé 47 cas
verts. Prérequis auth 433 séparé : affectation courante dans la session, trois
rouges/verts, marque native retrouvée. Types finaux exit 0 ; CLI sur 1 002 lignes
avec fenêtre 1 000 bornée/--all reçu. Reprise même tâche DEFERRED HTTP 200/refus
reçu altéré HTTP 412 locaux reçus, dirigeant sans affectation sans Reprendre.
Anciens compteurs natifs invalides écartés, nouvelle pagination 20 puis 22 uniques
reçue. Tracker EN/ZH rendu/FR restauré, pas forge intégralement traduite.
Types/lints/cycles/gouvernance finaux verts après découplage, 1620/166 ; stress isolé exit 0,
46 HTTP reçus/235 non reçus/0 échec, hors native protégée/Glory phase 3/fournisseur réel,
fixtures nettoyées. Harnais général non réparé, stress antérieur aux dernières
gardes et dates ; suite canonique 4 180/399 et PG 270/14 finaux post-découplage
reçus, CI/runtime 434 reçus, parcours restants
en attente. emittedAt logique ne prouve pas l’heure métier ou la fraîcheur de
l’historique. startedAt réel distinct après verrou, horloge future 60 s : cinq
PostgreSQL verts après un rouge, closeEmission/durée/hash relus, pas SLO global.
Native tracker 434 refusée 403, compte non affecté.435 livré : seul listForges
réutilise getOperatorContext canonique et le dossier explicitement choisi pour
ADMIN effectif ; canResume selon affectation actuelle. Mutations/autres lectures
restent strictes, aucune équipe/droit/rôle nouveau. 51 PG ciblés verts après deux
rouges. Native locale par URL connue sur deux dossiers/deux équipes : chacun sa
tâche, canResume=false, lecture seule sans bouton ni secret ; Actualiser HTTP 200/
zéro exception, fenêtre complète. Copie FR finale relue, fixture nettoyée ;
sélecteur local 0/0 historique. Gauntlet 435 cinq exit 0, gouvernance 1620/166/24 warnings
préexistants et PG complet seul 274/14/Ptah 51 inclus reçus. CI 435 : 4 180/399 unitaires et
274/14 PG/image/runtime reçus. Native SPAWT listForges HTTP 200/zéro ligne, 403 disparu ;
fenêtre complète : 63 réponses/aucune ≥500/zéro exception/log. Liste du sélecteur reçue après
chargement ; passage par son lien vers le portefeuille groupe FrieslandCampina
non pilotable reçu en lecture seule, portée/ambiguïtés rendues, sans métriques
isolées. Production/reprise réelle non reçue ; reload local tronqué et bornes
tardives production, sans SLO déduit.
[Réception partielle](RECEPTION-PTAH-REPRISE.md).

ADR-0009 décrit la fondation historique. Réception antérieure au 2026-10-09 : résultat
checkpointé puis admission atomique versions/coffre/coût/COMPLETED ; webhook et
sync passent par PTAH_RECONCILE_TASK. Les références campagne/brief/actif source
traversent les entrées et producteurs jusqu’à la tâche, avec contrôle partagé
avant fournisseur/admission ; tâche historique de régénération contrôlée.
Le reçu de demande racine ou enveloppé accepte DEFERRED sans faux 500.
Suites finales : 4 167 unitaires/230 PostgreSQL/1 617 gouvernance vertes,
types/lints sans erreur, 24 warnings préexistants, zéro cycle. MCP/tRPC/Oracle
HTTP 200/DEFERRED et replay reçus sur fixtures locales synthétiques, zéro fournisseur.

Source cdd9f6c0, CI 37862693091/image 37862922982 et runtime exact 428 reçus le
9 octobre à 00:19:53 UTC ; aucune livraison 426 isolée, volume privé conservé.
Lectures/refus et corpus/édition SPAWT conservés ; zéro tâche/version de forge
avant/après, aucune forge réelle réparée. Bouton/garde opérateur reçus localement
dans le [code 428 livré](RECEPTION-PTAH-UX.md), gauntlet local vert ;
reprise DEFERRED/configuration, octets/CDN, Canva/Figma, facture, filiation au-delà des trois
références et journal restent ouverts : [reçu courant](RECEPTION-PTAH-UX.md)
et [admission historique 425](RECEPTION-PTAH-ADMISSION.md). Aucun service ajouté.

```
src/server/services/ptah/
├── manifest.ts             # governor: MESTOR, acceptsIntents: PTAH_MATERIALIZE_BRIEF, PTAH_RECONCILE_TASK, PTAH_REGENERATE_FADING_ASSET
├── index.ts                # API forge/réconciliation ; checkpoint et admission transactionnelle
├── resumption.ts           # code 434 livré : reçu initial/paramètres/réservation, métier local
├── governance.ts           # pilier source et cohérence du mode demandé
├── types.ts                # ForgeBrief, ForgeSpec, ForgeProvider interface
├── pricing.ts              # cost table par modèle × provider
├── task-store.ts           # GenerativeTask/AssetVersion/santé provider ; client transactionnel
├── download-archiver.ts    # archivage d’URL temporaire ; octets/CDN à recevoir
├── providers/
│   ├── index.ts            # registre des adaptateurs existants
│   ├── magnific.ts         # client REST ; secret de callback vérifié par la route HTTP
│   ├── adobe.ts            # OAuth 2.0 server-to-server, Firefly Services
│   ├── openai.ts           # chemin image synchrone
│   ├── figma.ts            # export PAT ; reconcile renvoie encore []
│   └── canva.ts            # Connect API gated ; reconcile renvoie encore []
└── routing/
    ├── budget-gate.ts      # plafond coût/superfan attendu avant forge
    └── provider-selector.ts # choisit provider selon coût/qualité/disponibilité
```

Entrée HTTP : `src/app/api/ptah/webhook/route.ts`. Dispatch existant :
`src/server/services/artemis/commandant.ts`, avec l’émission parent réelle pour
les futures forges. Le manifeste Ptah reste gouverné par MESTOR.

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
| `guidelines-renderer/` | Lecture identité du coffre, références et exports (ADR-0203) | ARTEMIS | ✅ existant |
| `value-report-generator/` | Rendu rapport valeur (livrable client) | ARTEMIS | ✅ existant |
| `seshat-bridge/` | **Bridge** Telemetry → Propulsion (signaux qui déclenchent missions) | ARTEMIS | ✅ existant |
| `ptah/` | **Forge orchestrator** — soumission fournisseur et admission des résultats ; réception bornée ci-dessus | **MESTOR** (manifest Ptah) | ✅ existant |
| `deliverable-orchestrator/` | **Output-first composer** (Phase 17b, ADR-0050 — anciennement ADR-0037) — résout DAG briefs depuis kind matériel cible, scan vault, mode PREVIEW | ARTEMIS | ✅ existant |
| `intention/` | Aval de l'ADVE (Phase 24, ADR-0106) : capture l'intention du dirigeant → brief candidat (intention × ADVE, manual-first) | ARTEMIS | ✅ existant |
| `oracle-section/` | OracleSection first-class (Phase 21 F-B/F-C, ADR-0068/0070) : lifecycle 35 sections, lock optimiste, runners | ARTEMIS | ✅ existant |
| `creative-proposal/` | Proposition Créative — gate de génération de production (ADR-0120) : validation → briefs de production depuis les frames canon | INFRASTRUCTURE | ✅ existant |
| `campaign-canon/` | 3 campagnes canon (30-60-90 / annuelle / always-on) depuis le Pilier I + ponctuelles insight-driven (ADR-0119) | INFRASTRUCTURE | ✅ existant |
| `media-plan/` | Plan média structuré (acteur Média, ADR-0115) | INFRASTRUCTURE | ✅ existant |

---

## 2. Guidance (24 services — Mission Tier)

Dirigent la trajectoire. Décisions, validations, plans.

| Service | Rôle guidance | Governor | Manifest |
|---|---|---|---|
| `brand-bible/` | Composition déterministe du livre de marque, lecture seule (ADR-0185) | Extension de Guidance | sans manifest propre |
| `brand-theme/` | Sélection d’identité/thème, pool de logos et origine runtime partagée publisher/export (ADR-0169/0203/[0210](adr/0210-explicit-public-logo-variants.md) ; [430 livré, choix/rendu réel reçus](RECEPTION-IDENTITE-PUBLIQUE.md)) ; pool palette/typos/fichiers/personnages/illustrations étendu dans le [432 livré](adr/0212-versioned-public-identity-projection.md), reçu sur la vitrine choisie | Extension de Guidance | sans manifest propre |
| `brand-tier-transition/` | Handler de transition de palier après gate (ADR-0167) | MESTOR | sans manifest propre |
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

## 3. Telemetry (27 services — Mission Tier)

Observent, mesurent, archivent. **27 répertoires** (recompte 2026-10-06) ; la table contient 3 lignes supplémentaires (`seshat/tarsis/connector.ts` · `seshat/scan-rate-limit.ts` · `seshat/entity-gate/`) qui sont des **sous-modules de `seshat/`** — documentés ici pour la traçabilité, hors compte.

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
| `seshat/creative-intelligence/` | Extension Telemetry ADR-0194/0195/0196 : corpus PUBLIC/BRAND, snapshots/recettes, acquisition bornée et veille verrouillée, archive chiffrée/purge, audiovisuel natif MODEL_DRAFT puis revue MANUAL, modèle conditionnel/trajectoires/voisins context nodes et publication confirmée avant résultat immuable. Contexte Artemis/Notoria et Glory DELEGATE/HYBRID ; bibliothèque canonique Argos-studio. | SESHAT | Parcours locaux et CI PR #968 reçus ; livraison image suivie par run 37521228164 et réception applicative datée dans PR #968 ; accès métier externes à recevoir |
| `creative-intelligence/` | Enregistrement du manifest ADR-0194 : réexport du moteur `seshat/creative-intelligence/`, nécessaire au scanner de manifests racines. Aucune duplication du moteur. | SESHAT | code présent (inspection 2026-10-06) |
| `source-classifier/` | Reads BrandDataSource → BrandAsset DRAFTs (taxonomie canonique) | SESHAT | ✅ existant |
| `brand-book-ingestion/` | Ingestion d'un brand book officiel → piliers A/D/V (gateway) + assets vault DRAFT. Deux extracteurs (LLM structuré + parseur déterministe, parité manual-first), preview→confirm, zéro fabrication (null sur absence). Intent `INGEST_BRAND_BOOK` (ADR-0173). | MESTOR | ✅ shippé (2026-07-22, Lot 1b) |
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
| `brand-vault/` | BrandAsset CRUD engine — vault unifié ; conservation d’identité publique par stockage chiffré existant/transport borné ([ADR-0211 Accepted](adr/0211-retained-public-logo-bytes.md), logo 431 reçu ; [ADR-0212 Accepted borné](adr/0212-versioned-public-identity-projection.md), identité de vitrine 432 reçue) | MESTOR | ✅ existant |
| `strategy-archive/` | 2-phase soft archive + hard purge (`Strategy.archivedAt`) | INFRASTRUCTURE | ✅ existant |
| `sentinel-handlers/` | Handlers cron `/api/cron/sentinels` — consomme IntentEmission PENDING (Loi 4 maintien orbite) | MESTOR | ✅ existant |
| `nsp/` | Neteru Streaming Protocol — transport publish/subscribe vers UI | INFRASTRUCTURE | ✅ existant (stub utilitaire) |
| `market-visibility/` | Substrat read-filter (ADR-0105) : pays SHADOWBANNED + descendants pour le default-deny tenant-scoped (cache TTL 15 s) | INFRASTRUCTURE | ✅ existant |

> `cross-validator/` est compté en Guidance (rôle dominant : validation cross-pillar). Ses invariants techniques sont consommés par Sustainment — pas de double-count.

La conservation d’identité publique relève de **Sustainment/MESTOR** dans
brand-vault existant : continuité de marque, condition de l’accumulation de
superfans visée. 431 reçoit le logo public conservé, aucun résultat business ; stockage
et transport sont des extensions, sans service ni Neteru supplémentaire.
432 livré étend ces mêmes publication/copies/transport aux choix d’identité
v2 (palette, OTF/TTF, poses, citation), avec pins privés et lecture v1 conservée.
La consommation vitrine vérifie l’ensemble, sans CSP élargie ; gauntlet et
première lecture sous harness local reçus. CI/image/runtime et publication/revue/
retour réels reçus côté producer/consumer, huit copies stables, cinq polices/
trois poses/six couleurs/citation, origines/CSP conservées. Réception partielle
C2/C3/C4 de la vitrine choisie, aucune acceptation globale ni réception du stockage
complet/autres destinations. [ADR-0212 Accepted, borné](adr/0212-versioned-public-identity-projection.md).

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
| `ingestion-pipeline/` | Pipeline d'ingestion data externe ; `source-usage` factorise usages documentaires, reçus de version et invalidation (ADR-0198). Aucun nouveau worker. | INFRASTRUCTURE | ✅ existant |
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
