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
Le DS canonique panda + rouge fusée. Phase 11 in flight. **4 couches cascade** : Reference (Tier 0 — palette brute, immuable hors ADR), System (Tier 1 — sémantique transverse `--color-*`), Component (Tier 2 — par primitive `--button-*`, `--card-*`...), Domain (Tier 3 — métier `--pillar-*`, `--division-*` (5 Neteru actifs), `--tier-*` (Creator), `--classification-*` (APOGEE)). **Surface** = densité par portail (`data-density="compact|comfortable|airy|editorial"`). Source unique de vérité : [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md). ADR fondateur : [ADR-0013](adr/0013-design-system-panda-rouge.md). Anti-drift CI : `tests/unit/governance/design-*.test.ts`. Vocabulaire visuel : [DESIGN-LEXICON.md](DESIGN-LEXICON.md).

### **Devotion Ladder**
Échelle d'engagement audience → superfan : Spectateur → Intéressé → Participant → Engagé → Ambassadeur → Évangéliste. Les deux derniers paliers sont des superfans au sens strict. Source : `devotion-engine` service + `devotion-ladder` router.

### **Drift**
Divergence entre l'état déclaré (manifests, ADRs) et l'état réel (code, DB). Détecté par `governance-drift.yml` workflow + `audit-mission-drift.ts`. Pour le DS spécifiquement : `audit-design-drift.ts` + 6 tests anti-drift CI bloquants (cf. [DESIGN-SYSTEM.md §13](DESIGN-SYSTEM.md)).

### **Évangéliste**
Palier supérieur de la Devotion Ladder. Superfan qui recrute activement d'autres superfans, défend la brand, internalise sa mythologie. Source de la propagation auto-entretenue.

### **Founder**
Le porteur (CEO / fondateur) d'une brand. Pilote son Cockpit. Doit devenir **premier superfan** de sa propre marque. Cf. `founder-psychology` service + `<FounderRitual>` UI.

### **Glory tools**
Les ~91 outils de production Artemis. Chaque tool = thruster spécialisé (concept-generator, kv-prompts, brand-bible-extractor, etc.). Catalogue dans `src/server/services/glory-tools/registry.ts`.

### **Glory sequence**
Enchaînement topologiquement trié de Glory tools (skill tree). 31 séquences cataloguées. Source : `sequence-vault`.

### **Industry OS**
La Fusée. Pas "platform", pas "OS" tout court — *Industry OS* (codé comme tel). Cf. CLAUDE.md.

### **MAAT**
Déesse égyptienne et principe d'ordre/balance. **DÉPRÉCIÉE** comme nom de framework — remplacée par APOGEE. Cf. ADR-0001. Document historique : [archive/MAAT-DEPRECATED.md](archive/MAAT-DEPRECATED.md).

### **NETERU**
Panthéon de gouvernance — quintet actif + 2 pré-réservés (plafond APOGEE = 7). État courant : **5 Neter actifs (quintet : Mestor, Artemis, Seshat, Thot, Ptah) + 2 pré-réservés (Imhotep, Anubis)** :
1. **Mestor** — Guidance, décision, dispatcher unique d'Intents
2. **Artemis** — Propulsion (phase brief), Glory tools rédactionnels
3. **Seshat** — Telemetry, observation, capte signaux (incluant Tarsis sub-component)
4. **Thot** — Sustainment + Operations, fuel manager, cost gates, finances
5. **Ptah** — Propulsion (phase forge), matérialisation des briefs en assets concrets (downstream Artemis) — actif Phase 9, ADR-0009
6. **Imhotep** — Crew Programs, talent matching + formation — pré-réservé ADR-0010 (Phase 7+)
7. **Anubis** — Comms, messages, ad networks, social posting — pré-réservé ADR-0011 (Phase 8+)

Pluriel égyptien de *Neter* = dieu/principe. Source unique de vérité narrative : [PANTHEON.md](PANTHEON.md).

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
Le 6ème Neter, **pré-réservé** par ADR-0010 (activation Phase 7+). Master of Crew Programs — talent matching, formation, certifications, qc-router. Sage humain égyptien déifié. Sous-système APOGEE = Crew Programs (Ground Tier).

### **Anubis**
Le 7ème Neter, **pré-réservé** par ADR-0011 (activation Phase 8+). Master of Comms — messages cross-portail, ad networks, social posting, broadcast email/SMS. Psychopompe égyptien guide entre mondes. Sous-système APOGEE = Comms (Ground Tier).

### **ForgeBrief / ForgeSpec**
Brief Artemis qui contient un `forgeSpec` structuré → handoff downstream Ptah. Glory tools brief-to-forge produisent un `ForgeBrief` ; brief-only produisent un `RawBrief` sans `forgeSpec`.

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
Le livrable conseil dynamique de 21 sections / 5 phases. Le produit visible côté client. Source : `strategy-presentation` service. Pas le moteur — c'est le *output*. Pipeline canonique d'enrichissement : 8-phase quintet (Thot pre-flight → Seshat observe → Mestor décide → Artemis exécute → Ptah forge auto → Seshat mesure → Thot post-flight → Brand Vault promotion). Cf. [ADR-0014](adr/0014-oracle-creation-pipeline-quintet.md).

### **Oracle phase**
Section rédactionnelle 1-5 du livrable Oracle. À ne pas confondre avec **Lifecycle phase** ni **Mission step** ni les **8 phases canoniques d'enrichissement** Oracle (Phase 0-F décrites dans ADR-0014).

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

## E — Process de mise à jour

Toute proposition de nouveau terme ou de modification d'une définition existante traverse :

1. Open issue avec template `lexicon-change`
2. Discussion en équipe
3. ADR si la modification touche un terme architectural majeur
4. PR de patch sur ce fichier avec label `phase/0` ou phase courante

Pas de modification silencieuse. Le LEXICON est un contrat humain comme APOGEE est un contrat technique.
