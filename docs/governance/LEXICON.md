# LEXICON — Glossaire normatif

Le vocabulaire de La Fusée. Ce doc tranche les définitions canoniques. Toute discussion qui dévie d'un terme défini ici doit soit (a) être reformulée pour s'aligner, soit (b) déclencher un ADR pour modifier le lexique.

À lire avant : [MISSION.md](MISSION.md), [APOGEE.md](APOGEE.md).

---

## A — Termes mission

### **Apogée**
Point culminant d'une trajectoire orbitale. Dans La Fusée : état LEGENDARY (palier ICONE) où la brand a accumulé assez de masse superfan pour générer son propre champ gravitationnel culturel et déplacer l'Overton dans son secteur. Cf. [MISSION.md §2.2](MISSION.md).

### **Brand**
Entité réelle (la marque). À distinguer de **Strategy** qui est sa représentation DB.

### **Cult formation**
Processus de transformation de l'audience en superfans organisés autour d'une brand. **CULTE** est le palier 5 (cult formed) ; **ICONE** est le palier 6 (cult crystallisé en référence patrimoniale). Cf. [MISSION.md §2](MISSION.md).

### **Cultural axis (axe culturel)**
Dans un secteur donné, vecteur d'orientation des marques (premium↔mass, traditional↔modern, etc.). Modélisé par `Sector.culturalAxis` JSON. Cf. `src/server/services/sector-intelligence/`.

### **DESIGN_SYSTEM**
Le DS canonique panda + rouge fusée. Phase 11 in flight. **4 couches cascade** : Reference (Tier 0 — palette brute, immuable hors ADR), System (Tier 1 — sémantique transverse `--color-*`), Component (Tier 2 — par primitive `--button-*`, `--card-*`...), Domain (Tier 3 — métier `--pillar-*`, `--division-*` (7 Neteru actifs), `--tier-*` (Creator), `--classification-*` (APOGEE)). **Surface** = densité par portail (`data-density="compact|comfortable|airy|editorial"`). Source unique de vérité : [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md). ADR fondateur : [ADR-0013](adr/0013-design-system-panda-rouge.md). Anti-drift CI : `tests/unit/governance/design-*.test.ts`. Vocabulaire visuel : [DESIGN-LEXICON.md](DESIGN-LEXICON.md).

### **Devotion Ladder**
Échelle d'engagement audience → superfan : Spectateur → Intéressé → Participant → Engagé → Ambassadeur → Évangéliste. Les deux derniers paliers sont des superfans au sens strict. Source : `devotion-engine` service + `devotion-ladder` router.

### **Drift**
Divergence entre l'état déclaré (manifests, ADRs) et l'état réel (code, DB). Détecté par `governance-drift.yml` workflow + `audit-mission-drift.ts`. Pour le DS spécifiquement : `audit-design-drift.ts` + 6 tests anti-drift CI bloquants (cf. [DESIGN-SYSTEM.md §13](DESIGN-SYSTEM.md)).

### **Évangéliste**
Palier supérieur de la Devotion Ladder. Superfan qui recrute activement d'autres superfans, défend la brand, internalise sa mythologie. Source de la propagation auto-entretenue.

### **Founder**
Le porteur (CEO / fondateur) d'une brand. Pilote son Cockpit. Doit devenir **premier superfan** de sa propre marque. Cf. `founder-psychology` service + `<FounderRitual>` UI.

### **Glory tools**
**56 outils** de production Artemis (40 legacy + 9 Phase 13 Oracle + 4 Phase 14 Imhotep + 3 Phase 15 Anubis ; count verrouillé par test `glory-tools.test.ts`). Chaque tool = thruster spécialisé (concept-generator, crew-matcher, ad-copy-generator, etc.). Catalogue dans `src/server/services/artemis/tools/registry.ts`. Inventory auto-régénéré : [glory-tools-inventory.md](glory-tools-inventory.md).

### **Glory sequence**
Enchaînement topologiquement trié de Glory tools (skill tree). **57 séquences** cataloguées (count via union type `GlorySequenceKey`). Source : `sequence-vault` + `artemis/tools/sequences.ts`.

### **Deliverable Forge** *(Phase 17b, ADR-0050 — anciennement ADR-0037)*
Surface output-first du composer : le founder pointe un `BrandAsset.kind` matériel cible (KV_VISUAL, PRINT_AD_SPEC, …) et l'OS résout en arrière la cascade Glory→Brief→Forge complète — DAG des briefs requis (via `GloryToolForgeOutput.requires`), scan vault pour réutilisation ACTIVE/STALE_REFRESH, composition complète avec estimation coût. Inversion du flow input-first historique (où le founder devait choisir un brief en amont). Page : [/cockpit/operate/forge](../../src/app/(cockpit)/cockpit/operate/forge/page.tsx). Service : [deliverable-orchestrator/](../../src/server/services/deliverable-orchestrator/index.ts) — Propulsion / Artemis governor / `CHAIN_VIA:artemis`. Intent : `COMPOSE_DELIVERABLE` (sync dispatcher, ré-émet `INVOKE_GLORY_TOOL` + `PTAH_MATERIALIZE_BRIEF` + `PROMOTE_BRAND_ASSET_TO_ACTIVE`). Mode actuel : PREVIEW (read-only) — le mode DISPATCHED async (avec NSP streaming) viendra dans un commit ultérieur.

### **Industry OS**
La Fusée. Pas "platform", pas "OS" tout court — *Industry OS* (codé comme tel). Cf. CLAUDE.md.

### **MAAT**
Déesse égyptienne et principe d'ordre/balance. **DÉPRÉCIÉE** comme nom de framework — remplacée par APOGEE. Cf. ADR-0001. Document historique : [archive/MAAT-DEPRECATED.md](archive/MAAT-DEPRECATED.md).

### **NETERU**
Panthéon de gouvernance — **7 Neter actifs (cap APOGEE atteint, 7/7)** depuis Phase 14/15 :
1. **Mestor** — Guidance, décision, dispatcher unique d'Intents
2. **Artemis** — Propulsion (phase brief), Glory tools rédactionnels
3. **Seshat** — Telemetry, observation, capte signaux (incluant Tarsis sub-component)
4. **Thot** — Sustainment + Operations, fuel manager, cost gates, finances
5. **Ptah** — Propulsion (phase forge), matérialisation des briefs en assets concrets — actif Phase 9, ADR-0009
6. **Imhotep** — Crew Programs, talent matching + formation Académie + qc-routing — actif Phase 14, ADR-0019 (supersedes ADR-0017)
7. **Anubis** — Comms, broadcast multi-canal, ad networks, notification center, Credentials Vault — actif Phase 15, ADR-0020 (supersedes ADR-0018) + ADR-0021

Pluriel égyptien de *Neter* = dieu/principe. Source unique de vérité narrative : [PANTHEON.md](PANTHEON.md). Toute fonction nouvelle hors panthéon exige un ADR de relèvement de plafond.

### **Overton (window/fenêtre)**
Axe culturel actuel d'un secteur. Quand la brand bend l'axe (déplace la fenêtre), elle redéfinit le secteur. Pas mesuré directement — observé via Tarsis signaux + computed via `sector-intelligence.computeBrandDeflection`.

### **Palier (cultural)**
Position culturelle d'une brand : ZOMBIE → FRAGILE → ORDINAIRE → FORTE → CULTE → ICONE. 6 paliers. Source : `quick-intake/brand-level-evaluator.ts` + `advertis-scorer/semantic.ts`. À ne pas confondre avec **Lifecycle phase** ni **Mission step**.

### **Pesée**
Évaluation d'un Intent contre les pré-conditions (Pillar 4) + cost-gate (Pillar 6) + post-conditions. Métaphore directement dérivée de la pesée du cœur dans la mythologie MAAT. Maintenue dans APOGEE comme rituel d'évaluation, sans le nom MAAT.

### **Strategy**
Record DB de la mission profile d'une Brand. C'est la table `Strategy` dans Prisma. À ne pas confondre avec "stratégie marketing" générique. Quand on parle de "la stratégie de Brand X", on parle de son record `Strategy`.

### **Substance**
Premier mécanisme de la séquence opérationnelle. Identité authentique, distincte, valeur claire. Pillars A+D+V. Cf. [MISSION.md §3](MISSION.md).

### **Superfan**
Personne qui recrute, défend, sacrifie pour, et internalise une brand. Pas un client, pas un fan — ambassadeur ou évangéliste de la Devotion Ladder. **Masse stratégique** (cf. SuperfanMassMeter UI), pas KPI.

### **Tarsis**
Sous-fonction de Seshat dédiée aux **weak signals** : presse, conversations, tendances. **Pas un Neter** — sub-component de Seshat. Source : `seshat/tarsis/`.

### **Ptah**
Le 5ème Neter actif (Phase 9, ADR-0009). **Forge master** — matérialise les briefs Artemis en assets concrets (image/vidéo/audio/icône/design/stock/classification) via providers externes (Magnific, Adobe Firefly, Figma, Canva). Démiurge égyptien créateur par le verbe — métaphore directe `prompt → asset`. Sous-système APOGEE = Propulsion (downstream Artemis). Source : `src/server/services/ptah/`.

### **Imhotep**
Le 6ème Neter **actif** (Phase 14, ADR-0019 supersedes ADR-0017). Master of Crew Programs — orchestrateur matching talent (matching-engine), évaluation tier (tier-evaluator), composition équipe (team-allocator), formation Académie (Course/Enrollment), qc-routing (qc-router). Sage humain égyptien déifié. Sous-système APOGEE = Crew Programs (Ground #6). Source : `src/server/services/imhotep/`. Page hub : `/console/imhotep`.

### **Anubis**
Le 7ème Neter **actif** (Phase 15, ADR-0020 supersedes ADR-0018 ; étendu Phase 16 par ADR-0025 + ADR-0026). Master of Comms — orchestrateur broadcast multi-canal (CommsPlan + BroadcastJob), ad networks (Meta/Google/X/TikTok), email/SMS (Mailgun/Twilio), notification center temps-réel (in-app SSE + Web Push VAPID/FCM + templates Handlebars/MJML + digest), MCP bidirectionnel (server agrégé + client entrant Slack/Notion/Drive/Calendar/Figma/GitHub), Credentials Vault. Psychopompe égyptien guide entre mondes. Sous-système APOGEE = Comms (Ground #7). Source : `src/server/services/anubis/`. Pages : `/console/anubis` + `/console/anubis/credentials` + `/console/anubis/notifications` + `/console/anubis/mcp`.

### **NSP — Neteru Streaming Protocol**
Couche transport runtime pour push live SSE vers le client (ADR-0025). `src/server/services/nsp/` — pubsub in-memory keyed par `userId`, événements typés (`NotificationEvent | IntentProgressEvent | McpInvocationEvent`). Le modèle persistant correspondant est `IntentEmissionEvent` (Prisma) pour replay/audit ; NSP est l'aiguillage runtime. Pas de manifest (utilitaire pur, pas une capability métier).

### **Push Subscription**
Endpoint Web Push d'un device (browser/mobile) lié à un `User`. Model Prisma `PushSubscription { endpoint UNIQUE, p256dh, auth, userAgent, isActive }`. Enregistré via `notification.registerPush` mutation après accord du user (`Notification.requestPermission()` + `pushManager.subscribe`). Fan-out via provider façade VAPID (`src/server/services/anubis/providers/web-push.ts`). Cf. ADR-0025.

### **NotificationTemplate**
Template multi-canal (IN_APP/EMAIL/SMS/PUSH) stocké en Prisma. `bodyHbs` (Handlebars subset, escape par défaut) + `bodyMjml` optionnel pour HTML email rendu par MJML. CRUD via `/console/anubis/mcp` onglet Templates. Multi-tenant (`operatorId` null = system template). Slug unique. Cf. ADR-0025 §4.

### **Digest**
Récap périodique (DAILY/WEEKLY) groupant les notifications IN_APP non-lues d'un user dans un email envoyé via template `notification-digest`. Respecte `NotificationPreference.digestFrequency`. Service `src/server/services/anubis/digest-scheduler.ts`. À câbler sur cron Phase 16.1.

### **MCP — Model Context Protocol**
Standard Anthropic d'exposition d'outils LLM (https://modelcontextprotocol.io). La Fusée gère **MCP bidirectionnel** sous Anubis (ADR-0026) :
- **Sortant** (server) : `/api/mcp` agrège les 10 sous-serveurs `src/server/mcp/{advertis-inbound, artemis, creative, guild, intelligence, notoria, operations, ptah, pulse, seshat}` en un manifest unifié pour Claude Desktop / Claude Code / autres clients externes.
- **Entrant** (client) : Anubis consomme des MCP servers tiers (Slack, Notion, Drive, Calendar, Figma, GitHub, **Higgsfield**) via `McpRegistry direction=INBOUND` + Credentials Vault (`connectorType="mcp:<serverName>"`).

Models : `McpRegistry` (cartographie), `McpToolInvocation` (audit log lié à `intentId`). Page : `/console/anubis/mcp` (3 onglets Inbound/Outbound/Templates).

### **OAuth 2.1 Device Flow (RFC 8628)**
Pattern d'authentification pour MCP servers externes qui exposent un OAuth Authorization Server (Phase 16, ADR-0048 — anciennement ADR-0028, renuméroté 2026-05-05). Premier connector du repo : Higgsfield. Discovery via RFC 9728 (`/.well-known/oauth-protected-resource` → `authorization_servers[]` → `/.well-known/oauth-authorization-server`). 4 étapes : (1) discover, (2) `startDeviceFlow` retourne `verification_uri_complete`, (3) `pollTokenEndpoint` jusqu'à autorisation user, (4) `refreshIfNeeded` transparent dans `mcp-client` quand `expires_at < now+60s`. Tokens persistés dans `ExternalConnector.config` (chiffré au repos via pgcrypto). Service : `src/server/services/anubis/oauth-device-flow.ts`. Intent kinds : `ANUBIS_OAUTH_DEVICE_FLOW_START` / `_POLL` / `ANUBIS_OAUTH_REFRESH_TOKEN`. Convention env var client_id : `<UPPERCASE_SERVER_NAME>_OAUTH_CLIENT_ID`.

### **Higgsfield**
MCP server externe (https://mcp.higgsfield.ai/mcp) — provider AI motion/lifestyle imagery exposé via 3 Glory tools optionnels (Phase 16, ADR-0048 — anciennement ADR-0028) : `higgsfield-dop-camera-motion` (DoP, mouvements caméra cinématiques), `higgsfield-soul-portrait` (Soul, portraits lifestyle hyperréalistes), `higgsfield-steal-style-transfer` (Steal, style transfer vidéo). Tous flag `requiresPaidTier: true`. Auth via OAuth 2.1 device flow. **Pas un provider Ptah** — atomique, optionnel, invocable directement par Artemis. Pour matérialiser un output Higgsfield en `BrandAsset`, l'opérateur déclenche `PTAH_MATERIALIZE_BRIEF` après coup.

### **Glory tools — paid tier gate**
Champ `requiresPaidTier?: boolean` sur `GloryToolDef` (Phase 16-A, ADR-0048 — anciennement ADR-0028). Si `true`, `executeTool` vérifie via `checkPaidTier(strategy.userId, paidTierAllowList)` qu'une `Subscription` active existe dans la liste des tiers payants (default : `COCKPIT_MONTHLY` + `RETAINER_BASIC` + `RETAINER_PRO` + `RETAINER_ENTERPRISE` ; exclus `INTAKE_PDF` / `ORACLE_FULL` qui sont one-shots). Sinon retourne output structuré `{status: "TIER_GATE_DENIED", reason, configureUrl, requiredTiers}` sans throw — UI surface CTA upgrade. Helper : `src/server/services/glory-tools/tier-gate.ts`.

### **Credentials Vault**
Pattern back-office (ADR-0021) — tout connector externe (ad networks, email, SMS, futurs) est CRUDé via UI `/console/anubis/credentials` qui pilote le model `ExternalConnector` existant. Provider façades feature-flagged : retournent `DEFERRED_AWAITING_CREDENTIALS` si pas de creds — code ship-able sans clés API. Pattern réutilisable par tout futur Neter qui aurait besoin d'integrations externes.

### **ForgeBrief / ForgeSpec**
Brief Artemis qui contient un `forgeSpec` structuré → handoff downstream Ptah. Glory tools brief-to-forge produisent un `ForgeBrief` ; brief-only produisent un `RawBrief` sans `forgeSpec`.

### **Brief mandatory gate (ADR-0049)**
Précondition runtime qui refuse toute création de `CampaignAction` ou de `Mission` campaign-scoped sur une `Campaign` qui n'a ni `activeBriefId` ni `CampaignBrief` rattaché. Implémentation : `assertCampaignHasBrief(campaignId, db?)` dans `src/server/services/campaign-manager/brief-gate.ts`. Throw `BriefMissingError` (code `BRIEF_MISSING`). Le statut lecture-seule pour gating UI passe par `getCampaignBriefStatus` ou les procedures tRPC `campaignManager.briefStatus` / `briefStatusMany` / `listBriefsForStrategy`. **Hors scope** : Glory tools brief-only (producteurs légitimes), `PTAH_MATERIALIZE_BRIEF` (ForgeBrief en input par construction), missions standalone. Cf. [ADR-0049](adr/0049-brief-mandatory-gate.md) (anciennement ADR-0034, renuméroté 2026-05-05 — conflit d'agents).

### **Devotion Footprint**
Historique de superfans recrutés par un creator dans chaque secteur. `Creator.devotionFootprint: Record<sectorId, superfansAcquis>`. Utilisé par Imhotep pour matching.

### **BrandAsset / Brand Vault**
**Vault unifié de la marque** — réceptacle Prisma (`BrandAsset`) pour TOUS les actifs de la marque, intellectuels comme matériels. Phase 10 (ADR-0012). Couvre :

- **Actifs intellectuels** (`family=INTELLECTUAL`, `content` Json structuré) : Big Idea, Brief créatif, Brief 360°, Brainstorm, Concept, Claim, Manifeste, Naming, Positioning, Tone Charter, Persona, Superfan Journey, KV Art Direction Brief, Script, Storyboard, Sound Brief, Voiceover Brief, Casting Brief, Vendor Brief, Print Ad Spec, Social Copy, Radio Copy, Long Copy, Value Proposition, Pitch, Chromatic Strategy, Typography System, Logo Idea, Trend Radar, Compliance Report, etc.
- **Actifs matériels** (`family=MATERIAL`, `fileUrl` rempli) : KV image (Ptah forgé Nano Banana), spot vidéo (Kling/Veo), jingle audio (TTS/voice clone), packaging mockup, OOH layout, logo final.

Cycle de vie gouverné : **DRAFT → CANDIDATE → SELECTED → ACTIVE → SUPERSEDED → ARCHIVED**. Une marque garde 1 BrandAsset ACTIVE par kind clé sur chaque Campaign (`Campaign.activeBigIdeaId`, `activeBriefId`, `activeClaimId`, `activeManifestoId`, `activeKvBriefId`).

Les Glory tools brief-only déposent automatiquement leurs outputs dans le vault via `sequence-executor` (mapping `outputFormat → kind` dans `brand-vault/engine.ts FORMAT_TO_KIND`). Les forges Ptah promeuvent leurs `AssetVersion` en BrandAsset matériel via `chainGloryToPtah`. Lineage hash-chain : `BrandAsset.sourceIntentId` (IntentEmission INVOKE_GLORY_TOOL ou PTAH_MATERIALIZE_BRIEF), `sourceGloryOutputId`, `sourceAssetVersionId`, `parentBrandAssetId` (versioning), `supersededById` (chaîne d'évolution).

Intent kinds gouvernés : `SELECT_BRAND_ASSET`, `PROMOTE_BRAND_ASSET_TO_ACTIVE`, `SUPERSEDE_BRAND_ASSET`, `ARCHIVE_BRAND_ASSET`. Source : `src/server/services/brand-vault/engine.ts` + ADR-0012.

### **SuperAsset (terme déprécié)**
Concept conceptuel utilisé en discussion comme synonyme de "actif intellectuel raffiné, produit de séquence". Dans le code : il n'y a **pas** de table `SuperAsset` — utiliser `BrandAsset` (réceptacle unifié, voir entrée ci-dessus).

### **Filtreur qualifiant**
Service `source-classifier` (governor MESTOR) qui prend une `BrandDataSource` EXTRACTED (PDF brandbook, logo PNG, note manuelle, URL) et propose 1→N `BrandAsset(state=DRAFT)` classés par `kind` canonique (LOGO_FINAL, CHROMATIC_STRATEGY, TONE_CHARTER, MANIFESTO, …) avec `pillarSource` mono-pillaire dérivé de la table `KIND_TO_PILLAR`. Pipeline hybride : heuristique mime+nom+contenu, fallback Claude vision pour images, LLM decomposer pour documents riches (1 brandbook → 5+ BrandAssets distincts couvrant ≥3 piliers ADVERTIS). Lineage source→asset via `BrandAsset.metadata.sourceDataSourceId`. Validation opérateur via la section "Propositions vault" de `/cockpit/brand/sources` (Accepter / Modifier kind / Rejeter). Intent kinds : `CLASSIFY_BRAND_SOURCE`, `PROPOSE_VAULT_FROM_SOURCE`. ADR : [ADR-0027](adr/0027-rag-brand-sources-and-classifier.md).

### **RAG sources**
Indexation des `BrandDataSource` du portail de marque dans le RAG Seshat (`BrandContextNode` avec `kind="BRAND_SOURCE"`). Chaque source EXTRACTED est chunkée (`chunkText`, paragraph/sentence-aware, ≤2500 chars/chunk) et embedée via le pipeline multi-provider existant (Ollama → OpenAI → no-op). Chunks pillar-neutres (`pillarKey=null`) — un brandbook PDF peut être retrouvé pour des queries de n'importe quel pilier ADVERTIS sans biais d'indexation. Citation verbatim disponible via `getOracleBrandContextByQuery(strategyId, query, { includeSources: true })` qui retourne un bloc `sourceReferences[]` distinct du narratif lossy. Intent kind : `INDEX_BRAND_SOURCE`. ADR : [ADR-0027](adr/0027-rag-brand-sources-and-classifier.md).

### **UPgraders**
L'agence/fixer qui opère La Fusée. Industrialise le marché créatif africain. Toujours capitalisé U-P-graders.

---

## B — Termes architecturaux (APOGEE)

### **APOGEE**
Le framework. Architecture de pilotage de trajectoire orbitale. Cf. [APOGEE.md](APOGEE.md), [ADR-0001](adr/0001-framework-name-apogee.md).

### **Capability**
Fonction nommée et typée exposée par un service via son manifest. Unité atomique d'invocation.

### **Cascade (ADVERTIS)**
Enchaînement A→D→V→E→R→T→I→S, avec dépendances unidirectionnelles. Loi 2 d'APOGEE (séquencement étages).

### **Cockpit**
Pont des founders. Portail `(cockpit)/cockpit/*`. À ne pas confondre avec le mot anglais "cockpit" générique — désigne *littéralement le pont de pilotage* d'une fusée.

### **Crew Quarters**
Pont des spécialistes embarqués. Portails Agency + Creator.

### **Deck**
Un des 3 ponts (Mission Control / Cockpit / Crew Quarters) + 1 launchpad (Intake). Cf. APOGEE §5.

### **Intent**
Unité atomique de causalité dans APOGEE. Tout effet métier dérive d'un Intent. Cf. `intent-kinds.ts`.

### **Intent kind**
Type d'Intent (FILL_ADVE, RUN_RTIS_CASCADE, PROMOTE_FORTE_TO_CULTE, etc.). Catalogue dans `src/server/governance/intent-kinds.ts`.

### **Lifecycle phase**
Phase de la relation UPgraders ↔ Brand : INTAKE / BOOT / OPERATING / GROWTH. Source : `strategy-phase.getCurrentPhase()`. À ne pas confondre avec les autres dimensions, cf. [DIMENSIONS.md](DIMENSIONS.md).

### **Manifest**
Fichier `manifest.ts` co-localisé avec un service. Déclare governor, capabilities, side-effects, missionContribution. Format : `NeteruManifest` (services) ou `GloryToolManifest` (Glory tools).

### **Mission**
1. Le travail de transformation d'une brand vers son apogée (sens APOGEE).
2. Une livraison creative ad-hoc dans Operations (sens commercial — table `Mission` Prisma).
Selon contexte. Préférer **brand mission** vs **creative mission** quand ambigu.

### **Mission Control**
Pont des opérateurs UPgraders. Portail `(console)/console/*`.

### **Mission step**
Étape opérationnelle 1-5 de la séquence cult-building : Substance, Engagement, Accumulation, Gravité, Overton. Champ manifest `missionStep`. Cf. [MISSION.md §3](MISSION.md), [DIMENSIONS.md](DIMENSIONS.md).

### **Manipulation Matrix**
Paramètre transverse à 4 modes décrivant *comment* la brand transforme l'audience en propellant : **peddler** (transactionnel direct), **dealer** (addiction structurelle), **facilitator** (utilité), **entertainer** (divertissement organique). Source : [MANIPULATION-MATRIX.md](MANIPULATION-MATRIX.md).

### **Manipulation Mix**
Vecteur 4 valeurs sommant à 1 : `{ peddler, dealer, facilitator, entertainer }`. Stocké dans `Strategy.manipulationMix`. Locké après lockdown pillar S.

### **Manipulation Mode**
Une des 4 valeurs de la matrice. Champ `GenerativeTask.manipulationMode`, `BrandAction.expectedManipulationMode`, `GloryTool.manipulationProfile[]`.

### **NSP (Neteru Streaming Protocol)**
Protocol SSE pour diffuser les `IntentProgressEvent` du backend vers le frontend en temps réel. Source : `src/server/governance/nsp/`.

### **Oracle**
Le livrable conseil dynamique de **35 sections / 4 tiers** (Phase 13, ADR-0014). Le produit visible côté client. Source : `strategy-presentation` service (`SECTION_REGISTRY` types.ts). Pas le moteur — c'est le *output*. Tiers : CORE (21) + BIG4 (7) + DISTINCTIVE (5) + DORMANT (2 — devenues actives Phase 14/15).

### **Oracle phase**
Section rédactionnelle 1-5 du livrable Oracle. À ne pas confondre avec **Lifecycle phase** ni **Mission step**.

### **OracleError**
Classe d'erreur typée du pipeline d'enrichissement Oracle (`enrichAllSections`, `enrichAllSectionsNeteru`, frameworks Artemis, séquences Glory, writeback pillar-gateway). Tout `throw` du service `strategy-presentation/` doit être une `OracleError` avec un code listé dans `ORACLE_ERROR_CODES`. Le code remonte vers `error-vault` (champ `ErrorEvent.code`) et vers le frontend via `TRPCError.cause = { code, governor, remediation, recoverable, context }`. Source : [src/server/services/strategy-presentation/error-codes.ts](../../src/server/services/strategy-presentation/error-codes.ts). ADR : [ADR-0022](adr/0022-oracle-error-codes.md).

### **OracleErrorCode**
Code typé `ORACLE-NNN` où :
- **1xx** = pre-conditions (utilisateur a un blocker — ADVE pas mûr, budget Thot dépassé)
- **2xx** = exécution (framework Artemis, séquence Glory, LLM Gateway, phase Seshat / Mestor)
- **3xx** = writeback (pillar-gateway refus, Zod validation, seeding)
- **9xx** = infrastructure (sérialisation governance, hash chain, bug NEFER non catégorisé)

Chaque code porte 4 champs : `fr` (message FR), `hint` (où chercher / quoi faire), `governor` (Mestor / Artemis / Seshat / Thot / Infrastructure), `recoverable` (true si l'erreur est attendue / le pipeline peut continuer en circuit-breaker section-level). Catalogue source : `ORACLE_ERROR_CODES` const. Test anti-drift : [tests/unit/governance/oracle-error-codes.test.ts](../../tests/unit/governance/oracle-error-codes.test.ts).

### **Oracle Incidents (page admin)**
Vue dédiée [/console/governance/oracle-incidents](../../src/app/(console)/console/governance/oracle-incidents/page.tsx) qui groupe les `ErrorEvent` par `code` `ORACLE-NNN`, affiche gouverneur + remédiation, fenêtre 24h/3j/7j/30j, stratégies impactées. Distincte de `/console/governance/error-vault` qui reste la vue générique multi-source. Source : router `errorVault.oracleIncidents`.

### **Pillar (ADVERTIS)**
Un des 8 axes : A (Authenticité), D (Distinction), V (Valeur), E (Engagement), R (Risque/Recurrence), T (Track), I (Innovation), S (Strategy). Source : `src/domain/pillars.ts` SSOT. Hardcoder leurs strings en dehors de domain/ = lint fail.

### **Pré-condition / Post-condition**
Garde déclarative évaluée par `governedProcedure`. Pré-conditions (Pillar 4) défendent l'INPUT ; Post-conditions (Pillar 6.2) défendent l'OUTPUT. Cf. APOGEE §6.

### **Stage (rocket)**
1. Stage 1 — Booster : pillars A+D+V+E s'allument ensemble.
2. Stage 2 — Mid : pillars R+T.
3. Stage 3 — Upper : pillars I+S.
À ne pas confondre avec Pillar (qui est une *partie* d'un stage).

### **Strangler procedure (`auditedProcedure`)**
Wrapper tRPC qui logge un router non-encore-migré sans bloquer. Permet d'avoir 100% audit trail pendant la migration progressive Phase 3.

### **Sub-system**
Une des 8 catégories APOGEE : Propulsion, Guidance, Telemetry, Sustainment (Mission Tier) + Operations, Crew Programs, Comms, Admin (Ground Tier).

### **Tier (qualityTier)**
S / A / B / C — qualité demandée pour une capability LLM. Drive le routing du LLM Gateway. À ne pas confondre avec **palier** (ZOMBIE → ICONE).

### **Veto**
Refus structurel d'un Intent, premier-citoyen du lifecycle. Émis par Mestor (préconditions) ou Thot (cost gate).

---

## C — Termes opérationnels

### **Audit trail**
Trace immuable de toute mutation business. Stockée dans `IntentEmission` avec hash-chain (prevHash + selfHash). Vérifiée hebdo par `verify-hash-chain.ts`.

### **Compensating intent**
Intent qui annule un Intent précédent. Mécanise la réversibilité quand le métier le permet. Cf. APOGEE §10.5.

### **Hash-chain**
Mécanisme tamper-evidence : chaque ligne `IntentEmission` calcule `selfHash = sha256(content + prevHash)`. Toute falsification d'une ligne est détectable car la chaîne casse.

### **IntentEmission**
Table Prisma centrale : audit log de tous les Intents émis. Hash-chained. Source de vérité pour le replay.

### **IntentEmissionEvent**
Table Prisma : événements de progression d'un Intent (PROPOSED, EXECUTING, etc.) consommés par NSP.

### **Operator**
Un tenant UPgraders. Ex: agence régionale Cameroun, agence Côte d'Ivoire. Tous les WHERE Prisma sont scopés `operatorId` via `tenantScopedDb`.

### **Plugin (external)**
Module tiers qui ajoute une capability sans toucher au repo core. Doit déclarer son manifest et passer le sandboxing. Cf. APOGEE §7.7.

### **Score composite**
Somme pondérée 0-200 des 8 Pillars. Détermine le palier. Source : `advertis-scorer.semantic.ts`.

### **Sentinel intent**
Intent automatique post-apogée : MAINTAIN_APOGEE, DEFEND_OVERTON, EXPAND_TO_ADJACENT_SECTOR. Cf. APOGEE §13 (régime apogée).

### **SLO**
Service-Level Objective déclaré par Intent kind (p95 latency, error rate, cost p95). Source : `src/server/governance/slos.ts`.

---

## D — Anti-confusion (les pièges classiques)

| Mot ambigu | Demander quel sens ? | Préfixe canonique |
|---|---|---|
| "phase" | Lifecycle / Oracle / Mission step / Refonte ? | `lifecycle:`, `oracle:`, `mission:`, `refonte:` |
| "stage" | Rocket stage (Booster/Mid/Upper) ou Pillar maturity (N0-N6) ? | `stage:` (rocket) ou `maturity:` (pillar) |
| "tier" | Cultural palier (ZOMBIE→ICONE) ou qualityTier (S/A/B/C) ? | `palier:` ou `qualityTier:` |
| "mission" | Brand transformation (APOGEE) ou Creative delivery (Operations) ? | `brand-mission:` ou `creative-mission:` |
| "tool" | Glory tool ou autre ? | `glory:` pour Glory tools, sinon nom du module |
| "strategy" | Strategy record DB ou stratégie générique ? | `Strategy` (entity) vs "strategy" (concept) |

---

## D-bis — Phase 13 — Oracle 35-section (mai 2026)

### Oracle 35-section framework canonical
Source unique de vérité : `SECTION_REGISTRY` dans `src/server/services/strategy-presentation/types.ts`. 35 sections partitionnées en 3 tiers (`SectionTier`) :
- **CORE** (23) : sections actives historiques Phase 1-3 ADVERTIS + Mesure + Operationnel + Imhotep Crew Program (#34) + Anubis Plan Comms (#35) — promues CORE Phase 17 cleanup ADR-0045 post-Phase 14/15
- **BIG4_BASELINE** (7) : frameworks consulting one-shot McKinsey/BCG/Bain/Deloitte
- **DISTINCTIVE** (5) : valeur ajoutée La Fusée vs Big4 (Cult Index, Manipulation Matrix, Devotion Ladder, Overton Distinctive, Tarsis Weak Signals)

ADR : [ADR-0014](adr/0014-oracle-35-framework-canonical.md).

### BrandAssetKind enum extension Phase 13
Source TS canonique : `src/domain/brand-asset-kinds.ts` avec `BRAND_ASSET_KINDS` const + 10 valeurs Phase 13 ajoutées : `MCK_7S`, `BCG_PORTFOLIO`, `BAIN_NPS`, `MCK_3H`, `BCG_STRATEGY_PALETTE`, `DELOITTE_GREENHOUSE`, `DELOITTE_BUDGET`, `CULT_INDEX`, `MANIPULATION_MATRIX`, `OVERTON_WINDOW`. Extension non-cassante (`BrandAsset.kind` reste `String @default`). ADR : [ADR-0015](adr/0015-brand-asset-kind-extension.md).

### Flag `_oracleEnrichmentMode`
Flag interne du `SequenceContext` (Artemis sequence-executor). Quand `true`, court-circuite `chainGloryToPtah` durant `enrichAllSectionsNeteru()` — les forges Ptah des tools `forgeOutput` ne se déclenchent pas automatiquement. Garantit "Ptah à la demande" — les forges sont déclenchées exclusivement via les boutons "Forge now" (B8) sur les sections Oracle distinctives. Hors enrichissement Oracle, le flag est `false`/absent → cascade Glory→Brief→Forge hash-chain f9cd9de complète préservée.

### Oracle PDF auto-snapshot pre-export
`exportOracleAsPdf` + `exportOracleAsMarkdown` appellent désormais `ensureSnapshotForExport` avant `loadOracle` (B6). `takeOracleSnapshot` calcule SHA256 sur le content live ; si hash identique au dernier snapshot, réutilise son `snapshotId` (idempotence). Plus de PDFs vides en live state. ADR : [ADR-0016](adr/0016-oracle-pdf-auto-snapshot.md).

### Section dormante Oracle (concept retiré Phase 17 — ADR-0045)
**Note historique** : le tier `"DORMANT"` était utilisé Phase 13 (ADRs 0017/0018) pour 2 sections Oracle Imhotep/Anubis pré-réservées avec handler stub `DORMANT_PRE_RESERVED`. ADRs 0017/0018 **superseded par 0019/0020 (Phase 14/15)** — Imhotep + Anubis activés (cap APOGEE 7/7). [ADR-0045](adr/0045-dormant-cleanup-post-phase-14-15.md) (Phase 17 cleanup, shipped 2026-05-04) **a supprimé le tier DORMANT** : `SectionTier = "CORE" | "BIG4_BASELINE" | "DISTINCTIVE"`. Sections renommées : `imhotep-crew-program-dormant` → `imhotep-crew-program` ; `anubis-comms-dormant` → `anubis-plan-comms`. Flag `_isDormant` → `_skipSequenceExecution`. Family `ORACLE_DORMANT` → `ORACLE_NETERU_GROUND`. Toute mention résiduelle `"DORMANT"` / `"-dormant"` / `"pré-réservé"` dans le code applicatif = drift à corriger.

### Ptah forge button (Forge now)
Composant `<PtahForgeButton>` (DS Phase 11 — Button + Dialog confirm + useToast) qui déclenche manuellement `PTAH_MATERIALIZE_BRIEF` pour une section Oracle distinctive forgeable. Cascade hash-chain Glory→Brief→Forge complète (oracleEnrichmentMode=false hors enrichissement). 4 sections câblées : `bcg-portfolio` (design Figma), `mckinsey-3-horizons` (design Figma), `manipulation-matrix` (image Magnific Banana), `imhotep-crew-program-dormant` (icon placeholder).

---

## D-ter — ADR-0023 — OPERATOR_AMEND_PILLAR (mai 2026)

### OPERATOR_AMEND_PILLAR
Intent introduit par [ADR-0023](adr/0023-operator-amend-pillar.md) pour donner à l'opérateur une voie d'édition intentionnelle des piliers ADVE. Trois modes : `PATCH_DIRECT` (scalaire simple), `LLM_REPHRASE` (texte qualitatif avec preview Notoria), `STRATEGIC_REWRITE` (LOCKED ou destructif, double-confirm + override). Type-level constraint `pillarKey: "a" | "d" | "v" | "e"` exclut RTIS.

### variable-bible
Source canonique unique des ~300 variables ADVERTIS, située dans `src/lib/types/variable-bible.ts` (`BIBLE_A`, `BIBLE_D`, `BIBLE_V`, `BIBLE_E`, `BIBLE_R`, `BIBLE_T`, `BIBLE_I`, `BIBLE_S`). Chaque entrée = `{description, format, examples[], minLength, maxLength, rules[], derivedFrom, feedsInto[], editableMode?}`. Exposée en lecture seule via la page Console "Annuaire des Variables ADVERTIS" ([`/console/config/variables`](../../src/app/(console)/console/config/variables/page.tsx)). Source de vérité du dropdown du modal `AmendPillarModal` — **PAS d'introspection Zod**, qui reste le validateur runtime côté gateway.

### Annuaire des Variables Console
Page `/console/config/variables` qui liste les ~300 entrées variable-bible filtrables par pilier/type. Read-only en V1 ; l'action "Amender" lance le modal `AmendPillarModal` (ADR-0023) qui émet `OPERATOR_AMEND_PILLAR`.

### EditableMode
Type discriminant ADR-0023 : `INFERRED_NO_EDIT | PATCH_DIRECT | LLM_REPHRASE | STRATEGIC_REWRITE`. Résolu par `getEditableMode(pillarKey, spec)` heuristique : (1) override explicit dans spec gagne, (2) `derivedFrom != null` ou pilier RTIS → INFERRED_NO_EDIT, (3) minLength≥30 ou maxLength≥200 → LLM_REPHRASE, (4) sinon PATCH_DIRECT. STRATEGIC_REWRITE n'est jamais retourné par l'heuristique seule — décidé runtime par le gate `applyPillarCoherenceGate` selon LOCKED + destructive.

### applyPillarCoherenceGate
Gate Notoria dédié à OPERATOR_AMEND_PILLAR ([gates.ts](../../src/server/services/notoria/gates.ts)). 4 règles ordonnées : LOCKED check (refuse sans override), Destructive amplifier (force STRATEGIC_REWRITE), Cross-ADVE warning (non-bloquant), Financial reuse (delegate validateFinancialReco).

### BrandAsset.staleAt (ADR-0023)
Flag pattern symétrique avec `Pillar.staleAt`. Quand un pilier ADVE est amendé via STRATEGIC_REWRITE, tous les `BrandAsset` ACTIVE liés (`pillarSource = pillarKey`) reçoivent `staleAt = now()` + `staleReason`. **L'asset reste ACTIVE** — sémantique enum `BrandAssetState` préservée. Le pattern s'applique uniformément à tous les kinds (Oracle compilé, briefs Artemis, claims, KV, manifestos…). Pas de hiérarchie.

## D-quater — ADR-0028 — Strategy archive 2-phase (mai 2026)

### Strategy.archivedAt
Soft archive marker (`DateTime?`) ajouté en Phase 16+. `null` = active (default), set = archived (caché des queries default via `WHERE archivedAt IS NULL` filter dans `strategy.list`). Phase 1 du cycle d'archivage 2-temps. Réversible via `OPERATOR_RESTORE_STRATEGY`. Set par `OPERATOR_ARCHIVE_STRATEGY`. Index `@@index([archivedAt])` pour query perf.

### OPERATOR_ARCHIVE_STRATEGY (ADR-0028)
Intent kind gouverné MESTOR (handler: `strategy-archive`). Soft archive d'une marque — `Strategy.archivedAt = now()`. Refuse `isDummy = true` (Wakanda dummies type-protected). Réversible via `OPERATOR_RESTORE_STRATEGY`. Émis par mutation tRPC `strategy.archive` (auditedAdmin + canAccessStrategy gate).

### OPERATOR_RESTORE_STRATEGY (ADR-0028)
Intent kind gouverné MESTOR. Restaure une marque archivée — `Strategy.archivedAt = null`. Réversible (re-archive possible). Émis par mutation tRPC `strategy.restore`.

### OPERATOR_PURGE_ARCHIVED_STRATEGY (ADR-0028)
Intent kind gouverné MESTOR. **Hard delete** d'une marque + cascade BFS sur 30+ tables enfants via `information_schema.table_constraints` discovery dynamique. **Irréversible.** Anti-foot-gun multi-niveau : (a) handler refuse si `archivedAt = null` (purge sans archive interdite), (b) tRPC mutation exige `confirmName == Strategy.name.toUpperCase()` (type-to-confirm), (c) refuse `isDummy = true`. Tout dans une transaction atomique. Émis par mutation tRPC `strategy.purge`.

### strategy-archive (service)
Service `src/server/services/strategy-archive/`. 3 handlers Intent (`archiveStrategyHandler`, `restoreStrategyHandler`, `purgeArchivedStrategyHandler`) + utilitaires plain (`archiveStrategy`, `restoreStrategy`, `purgeStrategy`, `listArchivedStrategies`). Le BFS purge utilise `information_schema` pour découvrir les FK pointing to Strategy + récursif jusqu'aux feuilles, topological sort bottom-up, transaction atomique. Cf. ADR-0028.

### ArchivedStrategiesModal
Composant UI `src/components/strategy/archived-strategies-modal.tsx`. Modal full-screen avec backdrop blur, header (count badge), grid 1/2/3 cols responsive de tuiles. Tuile = avatar lettre initiale, nom, status badge, date relative archive ("il y a N jours"), métriques (piliers/assets/missions/sources), 2 actions Restaurer / Supprimer. Composant interne `<PurgeConfirmDialog />` pour le type-to-confirm en MAJUSCULES sur le purge. Bouton trigger dans `/console/strategy-portfolio/brands` header.

### 4 portails (anti-confusion)
- **Cockpit** : portail des founders/marques (le client final voit ÇA)
- **Console** : portail UPgraders (interne, jamais vendu)
- **Agency** : portail agences partenaires (comm/média/évent/PR)
- **Creator** : portail freelances

**La Fusée** = l'OS sous-jacent invisible. **Oracle** = un livrable BrandAsset parmi N. Trois plans distincts : portail (UI) ≠ livrable (BrandAsset.kind) ≠ OS (La Fusée).

---

## E — Process de mise à jour

Toute proposition de nouveau terme ou de modification d'une définition existante traverse :

1. Open issue avec template `lexicon-change`
2. Discussion en équipe
3. ADR si la modification touche un terme architectural majeur
4. PR de patch sur ce fichier avec label `phase/0` ou phase courante

Pas de modification silencieuse. Le LEXICON est un contrat humain comme APOGEE est un contrat technique.


## D-quinquies — ADR-0037 — Country-Scoped Knowledge Base + MarketStudy ingestion (Phase 17, mai 2026)

### KnowledgeEntry.countryCode (ADR-0037 PR-A)

Champ `String? @db.VarChar(2)` ajouté à `KnowledgeEntry`. **Source de vérité** pays-scopée. Remplace progressivement le legacy `market` (texte libre conservé pour compat). Backfill 'WK' sur les entries Wakanda du seed. Index `countryCode` + composite `(sector, countryCode)`.

### Country-Scoped Knowledge Base (CSKB)

L'architecture qui en découle : Tarsis filtre les `KnowledgeEntry` par `countryCode` strict (via `checkSectorKnowledgeByCountry`), `buildSearchContext` joint `Country` (PPP, marketMeta, primaryLanguage, region) pour injecter un bloc CONTEXTE PAYS dans les LLM prompts. Le pilier T cesse d'être halluciné sur les pays sans seed dédié.

### CONTEXTE PAYS — CONTRAINTE DURE (ADR-0037 PR-D)

Bloc system prompt injecté dans `signal-collector` et `weak-signal-analyzer` quand la stratégie a un `countryCode`. Calqué sur le pattern anti-hallucination Wakanda d'ADR-0030 §PR-Fix-2. Helper exporté `buildCountryContextPrompt(c)` retourne le bloc ou "" si countryCode absent.

### Trend Tracker 49 (ADR-0037 PR-L)

Catalogue canonique des 49 variables macro/micro tendances du Workflow ADVE GEN (12 MACRO_ECO + 8 MACRO_TECH + 10 SOCIO_CULT + 7 REGUL_INST + 12 MICRO_SECTOR). `src/server/services/seshat/knowledge/trend-tracker-49.ts`. Consommé par l'extracteur LLM PR-I et par la page cockpit Track. Versionné `TREND_TRACKER_VERSION`.

### MARKET_STUDY_TAM / MARKET_STUDY_COMPETITOR / MARKET_STUDY_SEGMENT / MARKET_STUDY_RAW

Quatre nouveaux `KnowledgeType` enum values introduits par ADR-0037 PR-L. Décomposent une MarketStudy ingérée (PR-I) en N entries typées indexées par (countryCode, sector, sourceHash). RAW est l'archive brute (audit + re-extraction si schéma évolue).

### EXTERNAL_FEED_DIGEST (ADR-0037 PR-L + PR-G)

Cinquième nouveau `KnowledgeType`. Agrège macroSignals + weakSignals + Trend Tracker pour une (countryCode, sector). Produit soit par `INGEST_MARKET_STUDY` (depuis étude tierce uploadée) soit par `FETCH_EXTERNAL_FEED` (cron LLM-synthesis transitional).

### Variable-bible canonical map (ADR-0037 PR-K)

`src/lib/types/variable-bible-canonical-map.ts`. Mapping bidirectionnel `canonicalCode (A1, D5, E-Clerge…) ↔ (pillarKey, fieldKey)`. Auto-doc régénérée dans [VARIABLE-BIBLE-CANON.md](VARIABLE-BIBLE-CANON.md). Test anti-drift CI 65 tests. UI cockpit field-renderers expose le badge canonical à côté de chaque label.

### 21 nouveaux fields ADVE (ADR-0037 PR-K)

Combler les gaps manuel ADVE :
- **A** : `messieFondateur` (A1bis Le Messie), `competencesDivines` (A6), `preuvesAuthenticite` (A8), `indexReputation` (A10), `eNps` (A11), `turnoverRate` (A11bis), `missionStatement` (A-Mission), `originMyth` (A5myth)
- **D** : `positionnementEmotionnel` (D6), `swotFlash` (D7), `esov` (D10), `barriersImitation` (D11), `storyEvidenceRatio` (D12)
- **V** : `roiProofs` (V7), `experienceMultisensorielle` (V-MultiSens), `sacrificeRequis` (V-Sacrifice), `packagingExperience` (V-Packaging)
- **E** : `clergeStructure` (E-Clerge Le Clergé), `pelerinages` (E-Pelerinages), `programmeEvangelisation` (E-Evangelisation), `communityBuilding` (E-Community)

### `/cockpit/intelligence/market-studies` + `/cockpit/intelligence/track`

Deux nouvelles pages cockpit (ADR-0037 PR-J). La première permet à l'opérateur d'injecter une étude PDF/DOCX/XLSX. La seconde affiche les 49 variables Trend Tracker pour le pays + secteur du brand actif, avec coverage % et synthèse TAM / concurrents / segments.

### `/console/seshat/market-studies`

Vue admin cross-strategies des MarketStudy ingérées. Filtres pays/secteur. Bouton Re-extract.

### Intent kinds Phase 17

- `INGEST_MARKET_STUDY` (governor SESHAT, p95 60s) — opérateur upload → KE.
- `RE_EXTRACT_MARKET_STUDY` (p95 90s) — re-extraction depuis RAW archivé.
- `FETCH_EXTERNAL_FEED` (p95 45s) — cron Tarsis country×sector digest.
