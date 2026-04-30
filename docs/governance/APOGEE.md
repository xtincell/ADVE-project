# APOGEE — Le Framework de La Fusée

> *Une marque n'est pas une chose. C'est une trajectoire.*
> *L'OS ne gère pas des marques. Il les pilote.*
> *L'apogée n'est pas un but. C'est la gravité.*

Ce document définit **APOGEE**, le framework de pilotage de trajectoire qui régit La Fusée. Il remplace MAAT (déprécié, voir [ADR-0001](adr/0001-framework-name-apogee.md) ; document historique : [archive/MAAT-DEPRECATED.md](archive/MAAT-DEPRECATED.md)). Lecture associée : [PANTHEON.md](PANTHEON.md), [MANIPULATION-MATRIX.md](MANIPULATION-MATRIX.md), [FRAMEWORK.md](FRAMEWORK.md), [REFONTE-PLAN.md](REFONTE-PLAN.md).

---

## 1. Le nom — APOGEE

**Apogée** : le point culminant d'une trajectoire orbitale.

Une marque entre dans le système au sol (état **ZOMBIE** — barely existing, pas de devotion, pas de levier Overton). La mission de l'OS : la propulser jusqu'à son apogée — état **ICONE**, référence sectorielle, patrimoine, transmission, position défendable, fenêtre d'Overton déplacée, superfans accumulés en orbite stable.

La métaphore n'est pas décorative : elle est **déjà inscrite dans le produit**. Le produit s'appelle La Fusée. Le portail founder s'appelle Cockpit. Les opérateurs *upgrade* (UPgraders) les marques en altitude. La cascade ADVERTIS est multi-étages par construction. APOGEE ne fait que **nommer** ce que le produit dit déjà silencieusement.

Toutes les autres pièces — Oracle, GLORY tools, Neteru, score, devotion ladder, Tarsis signals, fenêtre d'Overton, superfans — trouvent leur fonction *exacte* dans la mécanique d'une mission spatiale. C'est le test de qualité d'un framework : si tous les outils s'y goupillent sans contorsion, le framework est juste.

---

## 2. La mission — atteindre l'apogée

**État sol (ZOMBIE)** : la brand existe nominalement mais n'a aucune masse culturelle. Pas de fans, pas d'engagement, juste des transactions résiduelles. L'Overton ne bouge pas.

**État apogée (ICONE)** : la brand est en orbite stable et est devenue *référence sectorielle*. Elle dépasse le simple culte (palier précédent) pour acquérir patrimoine, transmissibilité, position défendable. Le secteur est obligé de se positionner par rapport à elle. La fenêtre d'Overton dans son territoire culturel a bougé. Les superfans portent la propagation organiquement ; la brand ne dépend plus du push budgétaire.

Entre les deux, **3 stages — 8 pillars** (ADVERTIS). Une vraie fusée a peu de stages mais beaucoup d'engines par stage ; ADVERTIS suit la même physique :

- **Stage 1 — Booster** : pillars **A + D + V + E** s'allument ensemble (identité totale au décollage).
- **Stage 2 — Mid** : pillars **R + T** prennent le relais après largage du booster (diagnostic et résilience).
- **Stage 3 — Upper** : pillars **I + S** insèrent en orbite finale (innovation et stratégie d'insertion).

Quand on dit "stage" on parle de l'étage rocket. Quand on dit "pillar" on parle d'un des 8 axes. Quand on dit "palier" on parle du niveau orbital culturel (ZOMBIE → ICONE). Cf. [LEXICON.md](LEXICON.md).

La trajectoire passe par 6 paliers de classification (score composite /200, cf. `src/server/services/quick-intake/brand-level-evaluator.ts` et `src/lib/types/advertis-vector.ts`) :

| Palier | Score | Réalité |
|---|---|---|
| **ZOMBIE** | ≤ 80 | Sol — barely existing, indistinct |
| **FRAGILE** | 80-100 (intake) | Décollage instable — existe mais précaire |
| **ORDINAIRE** | 100-120 | Propulsion basique — fonctionnel, générique |
| **FORTE** | 120-160 | Montée en orbite basse — distincte, leveraged |
| **CULTE** | 160-180 | Orbite consolidée — fans identifiables, culture interne (ennemi nommé, rituels, vocabulaire) |
| **ICONE** | > 180 | **Apogée** — référence sectorielle, patrimoine, transmission, position défendable |

Chaque palier est une stabilisation. Une brand peut redescendre (drift, scandale, dilution opérationnelle). APOGEE rend cette descente détectable (Loi 1) et corrigeable (Tarsis + Mestor course-correct).

**Note sur CULTE vs ICONE** : la formation du culte (palier 5) n'est pas l'apogée — c'est le palier *qui rend l'apogée possible*. ICONE = quand le culte se cristallise en référence patrimoniale. Les superfans accumulés en CULTE génèrent l'inertie qui propulse vers ICONE.

---

## 3. Les Trois Lois de la Trajectoire

Inspirées des lois de la mécanique. Tout Intent du système les respecte. Toute capability qui les viole est rejetée.

### Loi 1 — Conservation de l'altitude

Aucun Intent ne réduit silencieusement l'altitude accumulée. Tous les efforts passés (Pillars maturés, sections d'Oracle écrites, scores gagnés, superfans recrutés) sont préservés ou explicitement détrônés via un Intent compensateur (`COMPENSATING_INTENT`). Pas de régression invisible.

**Mécanismes** : hash-chain `IntentEmission`, `OracleSnapshot` time travel, `Pillar.completionLevel` cache réconcilié, lineage par `spawnedFrom`.

### Loi 2 — Séquencement des étages

Un étage supérieur ne peut s'allumer tant que l'étage en cours n'est pas verrouillé. RTIS attend ADVE complète. Glory sequences de phase 3 attendent les fondations posées en phase 2. La cascade est *physiquement* unidirectionnelle ; revenir en arrière exige un Intent de re-entry explicite (`UNLOCK_PILLAR`, `RESET_STAGE`).

**Mécanismes** : Pillar 4 du FRAMEWORK (pre-conditions), `pillar-readiness` 5 gates, `governedProcedure` qui veto avant exécution.

### Loi 3 — Conservation du carburant

Toute combustion (Intent → LLM call, write DB, dispatch mission, render Oracle) consomme du propellant (USD, tokens, dev hours, attention operator). Le système connaît la jauge en temps réel (Thot). Une combustion qui mettrait la mission en flame-out est refusée (`VETOED`) ou réduite (`DOWNGRADED`). Pas de crédit au-delà de la jauge.

**Mécanismes** : `cost-gate` (Pillar 6 à venir), `LLM Gateway` quality/cost tier, `Thot.financial-brain`, `SLOs`.

---

## 4. Les Sous-systèmes — deux Tiers (Mission + Ground)

L'architecture de l'OS. Toute page, service, router, capability appartient à **un seul** sous-système et **un seul** tier. Le mapping exhaustif est dans [PAGE-MAP.md](PAGE-MAP.md), [SERVICE-MAP.md](SERVICE-MAP.md), [ROUTER-MAP.md](ROUTER-MAP.md).

### MISSION TIER — ce qui pilote une mission active

Sous-systèmes qui propulsent une brand vers son apogée pendant une "mission" (brand transformation cycle).

| # | Sous-système | Question | Composants exemples |
|---|---|---|---|
| 1 | **Propulsion** | Quoi pousse ? | Cascade ADVERTIS, Glory tools, sequences, Notoria pipeline, superfans, devotion ladder |
| 2 | **Guidance** | Quoi dirige ? | Mestor, manifests, pre-conditions (Pillar 4), pillar-gateway, strategy-presentation |
| 3 | **Telemetry** | Quoi observe ? | Seshat, Tarsis, Jehuty, NSP, score, IntentEmission, OracleSnapshot, ranker |
| 4 | **Sustainment** | Quoi maintient en vol ? | Thot, cost gate, LLM Gateway, SLOs, post-conditions, hash-chain, plugin sandboxing |

### GROUND TIER — ce qui tient l'écosystème autour des missions

Sous-systèmes qui ne pilotent pas une mission spécifique mais rendent les missions *possibles* en continu : finances, équipages, communications, administration. Sans Ground Tier, le Mission Tier ne pourrait pas tourner — pas d'argent, pas de crew, pas de comms, pas de config.

| # | Sous-système | Question | Composants exemples |
|---|---|---|---|
| 5 | **Operations** | Quoi alimente l'écosystème en argent et contrats ? | Socle (commissions, contracts, escrow, invoices, value-reports), commission-engine, crm-engine, mobile-money, financial-engine, financial-reconciliation |
| 6 | **Crew Programs** | Quoi prépare et apparie les équipages ? | Arene (matching, guild, club, events, orgs), Academie/Learn (training, certifications, courses), talent-engine, matching-engine, team-allocator, qc-router |
| 7 | **Comms** | Quoi connecte les ponts entre eux ? | Messages cross-portail (Console/Cockpit/Agency/Creator), notifications, messaging service. Layer transverse. |
| 8 | **Console (Admin)** | Quoi configure et administre le système ? | `/console/config/*`, `/console/ecosystem/*`, system-config, boot-sequence, process-scheduler, demo-data, country-registry, translation, neteru-shared registry |

### Pourquoi ce découpage en deux Tiers

Sans Ground Tier, La Fusée serait un OS de mission isolée — capable de propulser une marque, incapable de soutenir un écosystème de centaines. Le Ground Tier est ce qui transforme l'OS d'**outil de transformation individuelle** en **infrastructure d'industrie**.

Le test : enlever Operations → UPgraders ne peut plus facturer ses clients ni payer ses creators → l'OS s'arrête en 2 mois, indépendamment de la qualité des missions. Enlever Crew Programs → pas de talent dispo → les missions n'ont personne à embarquer. Enlever Comms → les decks sont silos étanches → impossible de coordonner Mission Control ↔ Cockpit ↔ Crew Quarters. Enlever Console (Admin) → impossible d'onboarder un nouvel operator, configurer un seuil, ajouter un connecteur.

Les 4 sous-systèmes Ground sont aussi essentiels que les 4 Mission. Le Ground Tier n'est pas un "détail opérationnel" sous-Mission — il est co-équivalent.



### 4.1 — PROPULSION (ce qui génère la poussée)

Tout ce qui ajoute de l'altitude à la brand. Layer 3 du layering technique. **Deux Neter co-occupent ce sous-système** dans une séquence stricte (pas co-gouvernance) : Artemis produit les briefs (phase rédactionnelle) ; Ptah matérialise les briefs en assets concrets (phase forge). Cf. [PANTHEON.md](PANTHEON.md).

| Composant | Rôle propulsion |
|---|---|
| **ADVERTIS cascade** | La trajectoire à 8 étages — booster (ADVE) → intermédiaire (RT) → supérieur (IS) |
| **GLORY tools (91)** (Artemis) | Thrusters spécialisés rédactionnels. Chaque tool est un moteur orienté (concept-generator pousse sur D+I, kv-prompt sur V+I, etc.). Output = brief texte structuré. Tools `brief-to-forge` produisent un `ForgeBrief` avec `forgeSpec` qui handoff downstream à Ptah. |
| **GLORY sequences (31)** (Artemis) | Manœuvres orchestrées — combinaisons de thrusters dans un ordre topologique (skill tree) |
| **Forge Ptah** (NOUVEAU, ADR-0009) | **Phase de matérialisation downstream Artemis**. Consomme les `ForgeBrief` Artemis et produit les assets concrets (image/vidéo/audio/icône/design layered/stock ingéré/asset refiné/asset classifié) via providers externes (Magnific, Adobe Firefly, Figma, Canva). Cf. `src/server/services/ptah/`. |
| **Notoria pipeline** | Chaîne de production des livrables — assemble les outputs avant insertion en mission |
| **Superfans** | **Le propellant cumulatif**. Pas un KPI, une masse réactive. Plus la brand en accumule, plus elle peut atteindre des orbites hautes (effet Overton). Le seul propellant qui s'auto-régénère organiquement. |
| **Devotion Ladder** | Métrique de propellant — niveaux d'engagement des fans (visiteur → suiveur → fan → superfan → ambassadeur). |
| **Brand actions** | Touchpoints qui transforment l'audience en propellant (campagnes, contenu, expériences). Chaque BrandAction porte un `expectedManipulationMode` ([MANIPULATION-MATRIX.md](MANIPULATION-MATRIX.md)). |

### 4.2 — GUIDANCE (ce qui dirige)

Tout ce qui décide *où* la brand doit aller et *comment*. Layer 2.

| Composant | Rôle guidance |
|---|---|
| **Mestor** | Computer de guidage. Reçoit l'Intent, délibère sur le plan, dispatche à Artemis. |
| **Artemis** | Contrôleur de poussée. Allume les thrusters dans le bon ordre, gère les séquences GLORY. |
| **Manifests** (NeteruManifest, GloryToolManifest) | Type certificates — déclarent les capacités, limites, dépendances de chaque module. |
| **Pillar-readiness gates** | Pre-flight checklists — refusent d'allumer un étage tant que l'étage précédent n'est pas verrouillé. |
| **ADVERTIS rules** | Lois de la cascade encodées dans `domain/pillars.ts` — ordre, dépendances, transitions valides. |
| **Pillar maturity N0-N6** | Granularité de readiness — pour chaque Pillar, 7 niveaux de maturation avant lockdown. |
| **Strategy** | Mission profile — la trajectoire prévue pour cette brand particulière. |
| **Oracle** | Plan de vol détaillé — 21 sections décrivant la stratégie pour atteindre l'apogée. Document que cockpit consulte. |
| **Mestor.intent dispatcher** | Le seul point d'entrée. Toute combustion traverse Mestor. |

### 4.3 — TELEMETRY (ce qui observe)

Tout ce qui rapporte la position, la vitesse, le cap, les conditions externes. Distribué Layer 2-3.

| Composant | Rôle télémétrie |
|---|---|
| **Score 0-200** | Altimètre composite — agrège A+D+V+E+R+T+I+S. |
| **Pillar maturity** | Stage gauges — état de chaque étage individuellement (N0-N6). |
| **Paliers** (ZOMBIE/FRAGILE/ORDINAIRE/FORTE/CULTE/ICONE) | Niveau orbital actuel. |
| **Cult Index / Devotion stats** | Mass measurement — combien de propellant accumulé. |
| **Asset impact tracker** (Seshat post-Ptah) | Cron qui mesure pour chaque `AssetVersion` déployée : engagement, viralité, conversions superfans → calcule `cultIndexDeltaObserved`. Alimente la boucle feedback Ptah (forge → impact mesuré). |
| **Seshat** | Processeur de télémétrie central — indexe (BrandContextNode), répond aux requêtes (ranker), et capte les signaux faibles via sa sous-fonction **Tarsis** (`seshat/tarsis/`). Tarsis est le sous-organe sensoriel de Seshat, **pas un Neter** (cf. [PANTHEON.md](PANTHEON.md), [LEXICON.md](LEXICON.md)). |
| **IntentEmission + IntentEmissionEvent** | Black box flight recorder — log immuable hash-chained de toute combustion. |
| **NSP (Neteru Streaming Protocol)** | Live downlink — diffuse la télémétrie temps réel au cockpit, à la mission control, aux passagers. |
| **OracleSnapshot** | Replay — voir où était la brand au stage T-3 mois. |
| **Drift detection** (cron hebdo) | Anomaly alarm — détecte si le système lui-même dérive. |

### 4.4 — SUSTAINMENT (ce qui maintient la mission viable)

Tout ce qui empêche la mission de s'éteindre en plein vol. Layer 2.

| Composant | Rôle sustainment |
|---|---|
| **Thot** | Fuel manager — connaît le propellant restant par operator/brand, alerte avant flame-out. |
| **Cost gate** (à venir, P3) | Abort logic — refuse une combustion qui mettrait la mission en faillite. |
| **LLM Gateway** | Engine controller — route entre engines (Opus/Sonnet/Haiku/Ollama) selon le mission profile (qualityTier, latencyBudget, costCeiling). Multi-provider redundancy. |
| **SLOs** | Performance envelope — limites opérationnelles par Intent kind. Breach = alerte. |
| **Post-conditions** (à venir) | After-burn checks — vérifient que la combustion a produit l'effet déclaré, sinon rollback. |
| **Compensating intents** | Reverse maneuvers — annuler une manœuvre si elle mettait la trajectoire en péril. |
| **Hash-chain integrity** | Black box tamper detection — toute falsification du log est détectable. |
| **Plugin sandboxing** | Containment — un module tiers ne peut pas accéder à des sous-systèmes non déclarés. |

### 4.5 — OPERATIONS (le pont financier au sol)

Tout ce qui fait circuler l'argent et les contrats autour des missions. Sans Operations, l'OS ne peut pas se sustainer économiquement, indépendamment de la qualité des missions.

| Composant | Rôle operations |
|---|---|
| **Socle** (`/console/socle/*`) | Tableau de bord financier UPgraders — commissions, contracts, escrow, invoices, pipeline, revenue, value-reports. |
| **commission-engine** | Calcul des commissions UPgraders/agence/creator par mission. |
| **financial-engine** | Logique business financière (facturation, reconciliation, taux). |
| **financial-reconciliation** | Réconciliation des transactions multi-source. |
| **mobile-money** | Intégration paiement mobile (Orange Money, MTN, Wave) — critique marché africain. |
| **crm-engine** | Relation client structurée (renouvellement retainer, upsell). |
| **upsell-detector** | Détection signaux d'upgrade contractuel. |
| **value-report-generator** | Rapport de valeur livré par UPgraders au client (justifie le retainer). |
| **payment**, **mobile-money**, **commission**, **contract** routers | Surface tRPC d'Operations. |

### 4.6 — CREW PROGRAMS (la formation et l'appariement des équipages)

Tout ce qui prépare, certifie, apparie les humains qui embarquent sur les missions. Sans Crew Programs, pas de talent dispo pour les Glory tools, pas de matching, pas de progression de carrière.

| Composant | Rôle crew programs |
|---|---|
| **Arène** (`/console/arene/*`, `/creator/community/*`) | Hub talent — matching, guild, club, events, orgs. Place de marché des creators et agences. |
| **Académie** (`/console/arene/academie/*`, `/creator/learn/*`) | Formation, certifications, courses, contenu pédagogique. Boutique de skill upgrade. |
| **talent-engine** | Évaluation, scoring, ranking des creators. |
| **matching-engine** | Match creator ↔ mission. |
| **team-allocator** | Composition d'équipes optimales par mission. |
| **qc-router** | Routing du quality control (peer review, validation senior). |
| **tier-evaluator** | Promotion APPRENTI → COMPAGNON → MAÎTRE → ASSOCIÉ pour creators. |
| **guild-tier**, **guilde**, **club**, **membership**, **boutique**, **learning**, **event** routers | Surface tRPC de Crew Programs. |

### 4.7 — COMMS (le système radio)

Layer transverse. Connecte les ponts entre eux. Pas un sous-système isolé — utilisé par tous.

| Composant | Rôle comms |
|---|---|
| **Messages cross-portail** | `/console/messages`, `/cockpit/messages`, `/agency/messages`, `/creator/messages` — fil unifié par operator. |
| **messaging** router | Surface tRPC. |
| **notification** router | Push notifications, alerts, drift signals. |
| **NSP** | Live downlink technique (cf. §4.3) — différent de comms humaines mais coexiste. |

Comms est un sous-système *léger*. Sa sophistication arrive en P5+ avec NSP.

### 4.8 — CONSOLE / ADMIN (la baie de configuration)

Tout ce qui configure, administre, instrumente le framework lui-même. Méta-niveau.

| Composant | Rôle console/admin |
|---|---|
| **Config** (`/console/config/*`) | Integrations OAuth, system settings, templates, thresholds, variables. |
| **Ecosystem** (`/console/ecosystem/*`) | Multi-operator admin, scoring cross-tenant, métriques flotte. |
| **system-config** router | Surface tRPC config. |
| **operator** router | Multi-operator admin. |
| **boot-sequence** | Initialisation système au démarrage. |
| **process-scheduler** | Cron + queue des intents async. |
| **demo-data** | Seeding pour staging/demo. |
| **country-registry** | Référentiel pays (devises, langues, secteurs). |
| **translation** | i18n (préparation P7). |
| **neteru-shared** | Registry central de gouvernance (manifests). |
| **data-export**, **board-export** | Sortie de données structurées. |

---

## 5. Les Trois Ponts — qui est à bord

Trois rôles humains, trois consoles, trois portails. Pas de mélange — la mission demande de la discipline d'équipage.

### 5.1 — Mission Control (le pont des UPgraders)

Portail **Console**. Orchestrent N missions en parallèle. Voient toute la flotte.

- `<NeteruActivityRail>` — quelle mission est en EXECUTING là maintenant
- `<MestorPlan>` — quelles déliberations sont en cours
- `<ArtemisExecutor>` — quels Glory tools tournent
- `<ThotBudgetMeter>` — propellant restant par operator
- IntentLog admin — replay, inspect, debug
- Glory tools cost dashboard

Onboarding d'un nouveau fixer : 5 jours, parce que le rôle n'est plus "savoir tout" mais "lire les instruments".

### 5.2 — Cockpit (le pont des founders)

Portail **Cockpit**. Pilote sa propre mission. Une seule brand.

- `<CascadeProgress>` — 8 nœuds A→S, allumés au fur et à mesure
- `<OracleEnrichmentTracker>` — état des 21 sections de leur Oracle
- `<DevotionLadder>` — propellant social cumulé
- Score altimeter + tier label en topbar permanente
- Time travel sur l'évolution de leur brand
- `<SeshatTimeline>` — observations Tarsis pertinentes pour leur secteur

Le founder n'est pas spectateur. Il pilote. Il voit la fusée monter. Il devient son **premier superfan** — c'est le point d'amorçage du culte.

### 5.3 — Crew Quarters (les passagers spécialistes)

Portails **Agency** et **Creator**. Apportent l'expertise embarquée pour des phases précises.

- Agency : agence RP, production, médias, événementiel — chacune un specialist embarqué pour son leg de la mission
- Creator : photographe, designer, dev, motion — astronaute pour livrable atomique
- Voient leur charge de travail, leur historique de missions, leur paiement, leurs SLAs
- N'ont **pas** accès à la guidance ni à la propulsion globale — focus sur leur livrable

Le système les rend interchangeables (un creator absent ne bloque pas la mission ; le ranker propose un substitut). C'est l'industrialisation du créatif sans l'aliénation : chacun fait ce qu'il fait de mieux, le système fait le reste.

---

## 6. La Tour de Lancement — Intake public

Portail **(intake)** — route group public. Ce n'est pas un pont. C'est la **tour de lancement** : où une brand candidate se présente, est qualifiée, prépare son décollage.

- Quick-intake (rev 9) — formulaire structuré + brief PDF
- Pre-Oracle — diagnostic préliminaire en 5 min
- Paywall conversion — décollage validé = activation Cockpit + premier Oracle complet
- Anyone can self-qualify; the launchpad is open

C'est le canal d'acquisition principal. APOGEE garantit qu'**aucune mission ne décolle sans que les pre-conditions soient satisfaites**, donc aucun founder n'a une mauvaise première expérience due à un état système incohérent.

---

## 7. Comment chaque outil existant se goupille

Récap exhaustif. Chaque concept La Fusée a sa case dans APOGEE.

| Concept La Fusée | Sous-système APOGEE | Fonction précise |
|---|---|---|
| ADVERTIS cascade | Propulsion | Trajectoire à 8 étages (booster A-D-V-E, mid R-T, upper I-S) |
| Pillars A-D-V-E-R-T-I-S | Propulsion | Étages individuels avec vérouillage progressif |
| Pillar maturity N0-N6 | Guidance | Sub-stages de readiness par étage |
| GLORY tools (91) | Propulsion (Artemis) | Thrusters spécialisés rédactionnels (briefs) |
| GLORY sequences (31) | Propulsion (Artemis) | Manœuvres orchestrées (skill tree) |
| **Ptah Forge** | Propulsion (Ptah, downstream Artemis) | Matérialisation des briefs en assets concrets — image/vidéo/audio/icône/design/stock |
| **ForgeBrief / ForgeSpec** | Propulsion | Output Glory tool brief-to-forge → handoff Ptah |
| **AssetVersion / GenerativeTask** | Propulsion (Ptah) + Telemetry (Seshat) | Lineage parent→upscale→relight + tracking impact |
| **Manipulation Mix** | Cross-Neter | `Strategy.manipulationMix` — paramètre transverse `peddler/dealer/facilitator/entertainer` |
| Oracle (21 sections) | Guidance | Plan de vol détaillé |
| OracleSnapshot | Telemetry | Black box replay |
| Mestor | Guidance | Guidance computer |
| Artemis | Propulsion (briefs) | Thrust controller + Glory tools rédactionnels |
| Seshat | Telemetry | Telemetry processor |
| Thot | Sustainment + Operations | Fuel manager + finances UPgraders |
| Ptah | Propulsion (forge) | Forge master — matérialisation des briefs |
| Imhotep (pré-réservé) | Crew Programs | Talent + formation (Phase 7+) |
| Anubis (pré-réservé) | Comms | Messages + ad networks + social (Phase 8+) |
| Tarsis | Telemetry (sub-component Seshat) | Sensor array externe — pas un Neter |
| Notoria pipeline | Propulsion | Production assembly |
| LLM Gateway | Sustainment | Engine controller multi-provider |
| Score 0-200 | Telemetry | Altimètre composite |
| Paliers ZOMBIE→ICONE | Telemetry | Niveaux orbitaux (6 paliers) |
| Devotion Ladder | Propulsion | Propellant social cumulé |
| Cult Index | Telemetry | Mass measurement |
| Superfans | Propulsion | Propellant organique auto-régénérant |
| Overton Window | Mission target | Fenêtre orbitale culturelle visée |
| Strategy record | Guidance | Mission profile par brand |
| IntentEmission | Telemetry | Flight log immuable |
| IntentEmissionEvent | Telemetry | Stream de phases |
| NSP | Telemetry | Live downlink |
| Hash-chain | Sustainment | Tamper detection |
| Pillar-readiness gates | Guidance | Pre-flight checklists |
| `governedProcedure` | Guidance | Veto autoritaire |
| `auditedProcedure` (strangler) | Telemetry | Mode dégradé pendant la migration |
| Manifests | Guidance | Type certificates |
| ADRs | Sustainment | Engineering change orders |
| Plugin architecture | Sustainment | Modules tiers homologués |
| Cost gate (à venir) | Sustainment | Abort logic |
| Post-conditions (à venir) | Sustainment | After-burn checks |
| Compensating intents (à venir) | Sustainment | Reverse maneuvers |
| SLOs | Sustainment | Performance envelope |
| Drift cron | Telemetry | Anomaly alarm |
| Console portal | Mission Control | Pont opérateurs UPgraders |
| Cockpit portal | Cockpit | Pont founder |
| Agency portal | Crew Quarters | Spécialistes embarqués |
| Creator portal | Crew Quarters | Astronautes ponctuels |
| Intake portal | Launchpad | Qualification pré-décollage |
| Quick-intake rev 9 | Launchpad | Qualification automatisée |

**Aucun concept de La Fusée n'est étranger à APOGEE. Tout est dans la fusée.**

---

## 8. Ce que APOGEE rend possible (les 5 conditions du culte)

Cf. le rappel des 5 conditions du culte (cohérence narrative, composition, échelle, confiance founder, reproductibilité). APOGEE livre chacune via une mécanique précise.

### 8.1 — Cohérence narrative dans le temps

**Loi 1 (conservation altitude)** + **OracleSnapshot time travel** + **hash-chain** = la narration de la brand est une trajectoire ininterrompue. Le founder peut voir où il était il y a 6 mois, et chaque section nouvelle s'inscrit dans la continuité. Pas de pivot silencieux qui contredit le passé.

### 8.2 — Effet de composition

**Propellant Devotion Ladder** + **Glory sequences (skill tree)** + **Pillar maturity progressive** = chaque touchpoint construit sur les précédents. Brand action sur D s'appuie sur A déjà locked. Glory tool TikTok script utilise le brandbook déjà produit. Composition mécanisée.

### 8.3 — Échelle d'intervention

**Architecture multi-mission** (Console orchestre N brands en parallèle) + **plugin extensibility** (agences ajoutent leurs Glory tools) + **NSP visible cross-mission** = UPgraders peut piloter 50 fusées simultanées sans perdre la cohérence. C'est l'industrialisation du créatif.

### 8.4 — Confiance founder

**Cockpit literal** (le founder voit instruments comme un pilote) + **Loi 3 (fuel transparency)** + **Pre-conditions visibles** + **Refusal as feature (DOWNGRADE/VETO honnêtes)** = l'OS ne ment jamais. Le founder devient pilote au lieu de subir, donc devient *premier superfan*. Le culte commence chez lui.

### 8.5 — Reproductibilité

**Manifests** + **Glory tools governance** + **scaffold rituel** + **ADRs** = la méthodologie ADVE/RTIS *est* le code. Pas dans une tête. Pas dans un drive. Dans le système. Un nouveau dev senior arrive, lit APOGEE.md → FRAMEWORK.md → les manifests, et opère en jours, pas en mois.

### 8.6 — Tableau croisé conditions × sous-systèmes

Quel sous-système APOGEE garantit chaque condition ? Lecture stricte :

| Condition du culte | Sous-système(s) responsable(s) | Composants clés |
|---|---|---|
| 1. Cohérence narrative | Telemetry + Sustainment | hash-chain `IntentEmission`, `OracleSnapshot` time travel, post-conditions narratives |
| 2. Effet de composition | Propulsion + Guidance | Glory sequences (skill tree), pillar-readiness gates, Pillar maturity N0-N6 progressive |
| 3. Échelle d'intervention | Mission Control deck + Comms + Crew Programs | Console orchestrate N brands, NSP cross-mission, matching-engine pour les crew |
| 4. Confiance founder | Cockpit deck + Telemetry + Sustainment | `<OvertonRadar>`, `<FounderRitual>`, `<SuperfanMassMeter>`, Loi 3 transparente, refus visibles |
| 5. Reproductibilité | Guidance + Admin + Crew Programs | manifests, scaffold, ADRs, Académie/learn |

Un manquement dans une cellule = la condition correspondante ne tient pas. Donc une brand ne peut pas finir le voyage. C'est l'argument structurel pour ne pas saboter un sous-système au profit d'un autre.

---

## 9. La Logique de Croissance — comment APOGEE évolue sans diluer

### Croissance verticale — nouveaux Neteru

Plafond 7. Nouveau Neteru exige ADR justifiant fonction de gouvernance distincte. Mythologie cohérente. Pas de prolifération opportuniste.

### Croissance horizontale — nouvelles capabilities

Scaffold + manifest + test + SLO + label phase = chemin standard, sans ADR. Speed of innovation préservée.

### Croissance externe — plugins

Manifest signé + sandboxing par side-effect (cf. P2.7 du REFONTE-PLAN) = partenaires UPgraders étendent sans forker. Network effect.

### Croissance intérieure — apprentissage

Seshat aggrège les patterns IntentEmission historiques pour suggérer prédictivement. Le système devient plus intelligent à chaque mission.

### Décroissance — mort rituelle

Versionning, deprecation cycle 2 sprints, archivage `intent-catalog-graveyard.md`. Une capability peut mourir ; l'historique reste.

### Évolution d'APOGEE elle-même

Toute modification structurelle (nouveau sous-système, nouvelle Loi, ajout/retrait d'une couche) traverse un ADR. Revue semestrielle de la cosmologie. APOGEE n'est pas immuable, mais ses changements sont ritualisés.

---

## 10. Les compléments encore à intégrer

Reprise consolidée des 5 points + 5 dimensions soulevés en cours d'écriture. Reformulés dans le vocabulaire APOGEE.

### Les 5 corrections (planifiées dans REFONTE-PLAN.md)

1. **Cost gate actif (Loi 3 incarnée)** — Thot devient Sustainment vivant et non passif. Phase 3.
2. **Post-conditions** — After-burn checks. Pas de write si l'effet n'est pas vérifié. Phase 2 + 3.
3. **GloryToolManifest sous-format** — Type certificate spécifique au thrusters. Phase 2.6.
4. **Découplage `status` / `observationStatus`** — la mission est COMPLETED dès qu'Artemis renvoie ; l'observation Seshat suit en async. Phase 3.
5. **Plugin sandboxing concret** — Containment par type de side-effect. Phase 2.7.

### Les 5 dimensions complémentaires

1. **LEXICON.md** — glossaire normatif (Intent, Stage, Apogée, Drift, Apogeen, Veto, Downgrade, Compensating). Phase 0/7.
2. **Iconographie** — glyphes officiels par Neteru + l'apogée comme symbole central (point d'orbite). Phase 5.
3. **Rituels humains** — boot ritual, sprint review, monthly ADR review, semestriel cosmologie. Phase 0.
4. **Méta-observabilité APOGEE** — page `/console/governance/apogee-health` qui rend la santé du framework lui-même. Phase 8.
5. **Compensating Intents** — reverse maneuvers ritualisées. Phase 3.

---

## 11. Ce que APOGEE n'est pas

- **Pas un dieu, pas une déité.** APOGEE est un *point physique* (l'apogée d'une orbite). Le framework est nommé d'après la cible géographique, pas un acteur. Les Neteru restent les acteurs.
- **Pas un produit visible.** Le client final voit La Fusée, l'Oracle, son score, son cockpit. APOGEE est l'architecture interne. Peut figurer en footer technique pour les CTO ("OS bâti sur le framework APOGEE"), mais pas en USP.
- **Pas immuable.** Les Lois et les sous-systèmes peuvent évoluer via ADR. Mais l'évolution est ritualisée.
- **Pas un substitut au métier.** Le framework garantit que la trajectoire est gouvernée. Si la stratégie elle-même est mauvaise, la brand atteindra une apogée médiocre. APOGEE empêche les *bugs structurels*, pas les *erreurs de jugement créatif*.
- **Pas stack-bound.** Next.js → Remix, tRPC → autre, Prisma → Drizzle — APOGEE survit. Ce qui survit : les Lois, les sous-systèmes, les manifests, le lifecycle Intent.

---

## 12. La promesse — pourquoi écrire contre APOGEE plutôt que contre rien

Si tu respectes les Trois Lois et que tu places ton ajout dans l'un des 4 sous-systèmes :

1. **Tu pousses la trajectoire** — chaque ligne de code que tu écris ajoute concrètement à l'altitude des brands.
2. **Tu n'écrases pas l'altitude existante** — Loi 1 te protège.
3. **Tu n'allumes pas un étage trop tôt** — Loi 2 te corrige.
4. **Tu ne brûles pas la mission** — Loi 3 te limite.
5. **Tu rends ton ajout intelligible aux passagers et au sol** — Mission Control, Cockpit, Crew Quarters consomment ton ajout via les decks Neteru-UI, pas via tes types brut.
6. **Tu hérites des autres sous-systèmes** — ton thruster utilise la guidance de Mestor, le fuel de Thot, la télémétrie de Seshat. Pas de réimplémentation.
7. **Tu peux partir** — la fusée continue de monter sans toi. La CI tient l'envelopppe. Les rituels reprennent au retour.

Si tu *ne* respectes *pas* les Lois — la fusée refuse ton code. C'est ça, **un vrai OS**.

---

## 13. Régime apogée — ce qui se passe APRÈS l'arrivée à ICONE

Atteindre ICONE n'est pas la fin. C'est **un nouveau régime** : la marque est en orbite stable, mais l'orbite peut s'éroder. Sans maintien actif :
- Les évangélistes vieillissent / changent. Sans recrutement continu, la masse s'effrite.
- Les concurrents observent et imitent. Sans **DEFEND_OVERTON**, ils repositionnent leur narratif jusqu'à reprendre la fenêtre.
- Le secteur évolue. Si la brand ne suit pas (sans **EXPAND_TO_ADJACENT_SECTOR**), elle reste icône d'un secteur qui se rétrécit.

### Les 3 Sentinel Intents

Cataloguées dans `intent-kinds.ts` (Phase 3) :

| Intent | Cadence | Mécanisme |
|---|---|---|
| `MAINTAIN_APOGEE` | Cron mensuel par brand ICONE | Vérifie le ratio évangéliste/total. Si dilution (< seuil sectoriel), Mestor déclenche une séquence Glory de réactivation (re-engagement campaign, ritual revival, exclusivity drop). **Cascade vers Ptah** : `PTAH_REGENERATE_FADING_ASSET` régénère les assets dont l'engagement a chuté >30% vs peak (Phase H). |
| `DEFEND_OVERTON` | Cron hebdo par brand ICONE | Tarsis scanne le secteur pour détecter les concurrents qui imitent le narratif ou tentent de reprendre la fenêtre. Mestor propose contre-mesures (positioning sharpening, recursive content, anti-imitation lawsuit si nécessaire). **Cascade vers Ptah** : forge counter-narrative assets sur le mode déclaré dans `Strategy.manipulationMix`. |
| `EXPAND_TO_ADJACENT_SECTOR` | Trigger manuel founder ou auto si saturation | Identifie les secteurs adjacents qui partagent un sous-ensemble du cultural axis de la brand. Lance une mission "expansion" qui transpose la brand dans ce nouveau secteur en réutilisant le playbook capitalisé (cf. `playbook-capitalization`). **Cascade vers Ptah** : forge expansion playbook assets adaptés au nouveau secteur. |

### La Loi 4 (implicite) — Maintien de la masse en orbite

Conséquence des 3 Sentinels : APOGEE a une **Loi 4 émergente** que je formalise ici pour cohérence.

> **Loi 4 — Maintien de la masse en orbite**
>
> Une brand qui atteint son apogée doit continuer à brûler du carburant pour ne pas redescendre. La gravité orbitale (concurrents, mode, nouvelle génération) attire la marque vers le bas. Sans Sentinel Intents actifs, la dégradation de la masse superfan devient un drift, et le palier ICONE peut se dégrader vers CULTE puis FORTE.

C'est la 4e Loi. Elle s'ajoute aux 3 originales (conservation altitude, séquencement étages, conservation carburant). Elle ne s'applique qu'au régime apogée mais elle est *constitutive* du régime — sans elle, atteindre l'apogée ne signifie rien parce qu'on en redescend.

### UI — `<ApogeeMaintenanceDashboard>` (à venir P5+)

Composant Cockpit pour les brands ICONE :
- Ratio évangéliste / total — alerte si < 70% du seuil sectoriel
- Concurrents tentant l'imitation (Tarsis) — liste avec dates, magnitude
- Secteurs adjacents candidats à l'expansion — score d'opportunité
- Calendrier des Sentinel Intents prévus

---

## Postface — pourquoi ce nom plus que les autres

L'arbitrage final entre MAAT (gouvernance/balance), GRIOT (mémoire/transmission), STAGE (mécanique brute) et APOGEE est documenté dans [ADR-0001](adr/0001-framework-name-apogee.md).

L'argument décisif : **APOGEE est le seul nom qui dit ce que La Fusée fait au présent**. MAAT vend la fiabilité (rassurant mais statique). GRIOT vend la mémoire (riche mais passé-tourné). STAGE vend la mécanique (correct mais flat). APOGEE vend l'**ascension** — ce qui est exactement la promesse produit pour le founder qui décolle, le marché qui se transforme, les superfans qui s'accumulent, l'Overton qui se déplace. Le futur est dans le nom.

Et la fusée reste fusée.

---

## Lectures associées

- [PANTHEON.md](PANTHEON.md) — **source unique de vérité narrative sur les 7 Neteru**
- [MANIPULATION-MATRIX.md](MANIPULATION-MATRIX.md) — paramètre transverse d'engagement audience (4 modes)
- [FRAMEWORK.md](FRAMEWORK.md) — les 5 piliers techniques (Identity, Capability, Concurrency, Pre-conditions, Streaming)
- [REFONTE-PLAN.md](REFONTE-PLAN.md) — comment on arrive à cet état
- [GITHUB-ACTIONS-GUIDE.md](GITHUB-ACTIONS-GUIDE.md) — la mécanisation par CI
- [archive/MAAT-DEPRECATED.md](archive/MAAT-DEPRECATED.md) — version dépréciée, conservée pour traçabilité
- [adr/0001-framework-name-apogee.md](adr/0001-framework-name-apogee.md) — la décision du nom
- [adr/0009-neter-ptah-forge.md](adr/0009-neter-ptah-forge.md) — introduction du 5ème Neter (Ptah)
- [adr/0010-neter-imhotep-crew.md](adr/0010-neter-imhotep-crew.md) — pré-réservation Imhotep
- [adr/0011-neter-anubis-comms.md](adr/0011-neter-anubis-comms.md) — pré-réservation Anubis
- [context/MEMORY.md](context/MEMORY.md) — index des décisions historiques
