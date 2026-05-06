# ADR-0052 — Module campagne canonical : double-layer Operational/Instrumental, 8 clusters orchestrés cross-Neteru

**Date** : 2026-05-06 (v2 amendée 2026-05-06 — cf. §0 changelog)
**Statut** : Proposed (v2)
**Phase** : 19 — Campaign tracker (méga-conceptualisation)
**Auteur direction** : opérateur (user)
**Supersedes** : aucun (étend [ADR-0043](0043-budget-decoupled-from-campaigns.md), [ADR-0044](0044-quality-gate-before-active-promotion.md), [ADR-0049](0049-brief-mandatory-gate.md), [ADR-0050](0050-output-first-deliverable-composition.md))

> **Note méta v2** — ce document est un **méga-ADR conceptuel** qui fixe la décision structurelle (campagne = unité **double-couche** Operational + Instrumental, pas project tracker mono-couche), expose **3 primitives architecturales** réutilisées de l'OS (§2.5), puis 8 sous-décisions opérables (clusters A→H) chacune adossée à une primitive structurelle existante. Chaque cluster peut shipper en mode `STUB` / `MVP` / `PRODUCTION` selon état des dépendances — **aucun risque structurel ne bloque la décision globale** (§16 matrice d'absorption). Aucun nouveau Neter — Cap APOGEE 7/7 préservé ([ADR-0019](0019-imhotep-full-activation.md), [ADR-0020](0020-anubis-full-activation.md), [ADR-0038](0038-apogee-anti-drift-phase-16-bis.md)).

## 0. Changelog du document

- **v1 — 2026-05-06** (initial Proposed) : framing "exécution vs mesure trajectoire" comme pivot de mission. Décision tout-ou-rien §19. 8 risques structurels §16 listés comme blockers potentiels.
- **v2 — 2026-05-06** (amendement) : reformulation du framing en **double-layer canonical** (L1 Operational + L2 Instrumental co-natifs, pas concurrents). §2.5 ajoutée — 3 primitives architecturales OS-natives (Capability flags 4-états + STUB→MVP→PRODUCTION + double-layer). §16 transformée en matrice d'absorption — chaque risque structurel devient point de passage séquencé via primitives §2.5, plus blocker. §19 simplifiée — cherry-picking partiel devient légitime puisque L2 est strictement lecture/orchestration sur L1. Roadmap §13 enrichie avec capability flag par cluster.

---

## 1. Contexte

### 1.1 Surface existante (greffer, ne pas doubler)

Le repo expose aujourd'hui une plomberie campaign **complète au plan projet** :

- **Modèles Prisma** : `Campaign` (42 fields, `state CampaignState`, `advertis_vector`, `devotionObjective`, `aarrTargets`, `parentCampaignId`), `CampaignAction` (22 fields, `category ActionCategory`, `aarrStage`, `coutUnitaire/uniteCosting`, `rendementDecroissant`, `sovTarget`), `CampaignFieldOp` (18 fields — terrain BTL avec `team Json`, `ambassadors Json`, `briefData/results Json`), `CampaignFieldReport` (28 fields — preuves terrain + AARRR breakdown 5 étages), `CampaignAARRMetric`, `CampaignBrief`, `CampaignAsset`, `CampaignAmplification`, `CampaignTeamMember`, `CampaignMilestone`, `CampaignApproval`, `CampaignDependency`, `CampaignTemplate`, `CampaignReport`, `CampaignLink`, `CampaignExecution`
- **Services gouvernés** : `campaign-manager` (governor Artemis), `campaign-budget-engine`, `campaign-plan-generator`
- **Routers tRPC** : `campaign`, `campaign-manager`
- **Pages** : `/agency/campaigns`, `/cockpit/operate/campaigns/[id]`, `/console/artemis/campaigns`, `/console/fusee/campaigns`
- **Glory tools** : `campaign-architecture-planner`, `campaign-360-simulator`, `post-campaign-reader`, `campaign-cost-estimator`
- **Sequences** : `CAMPAIGN-360`, `CAMPAIGN-SINGLE`, `COST-CAMPAIGN`, `DERIVED-PLAN-ACT`
- **Intent kinds existants** : 30+ `LEGACY_CAMPAIGN_*` (strangler-promoted), `PROMOTE_BRAND_ASSET_TO_ACTIVE`
- **ADRs récents** : [ADR-0043](0043-budget-decoupled-from-campaigns.md) budget découplé, [ADR-0044](0044-quality-gate-before-active-promotion.md) quality gate, [ADR-0049](0049-brief-mandatory-gate.md) brief obligatoire, [ADR-0050](0050-output-first-deliverable-composition.md) deliverable forge output-first

### 1.2 Constat

Comparé à un tracker concurrent (Sprinklr, Adobe Workfront, monday Marketer, Asana for Marketing) le périmètre **plomberie projet** de La Fusée est strictement équivalent. Le module campagne sait :
- Briefer (CampaignBrief)
- Planifier actions ATL/BTL/TTL (CampaignAction.category)
- Engager le terrain (CampaignFieldOp + report)
- Mesurer KPIs AARRR (CampaignAARRMetric)
- Approuver / dépendre / répliquer (Approval, Dependency, Template)
- Budgéter & ventiler (campaign-budget-engine, ADR-0043)

Mais **rien de tout cela n'exploite les primitives orchestrales différenciantes** que La Fusée a accumulées :

| Primitive structurelle La Fusée | Atout unique | Status câblage campagne |
|---|---|---|
| Intent log hash-chained ([ADR-0005](0005-hash-chain-immutability.md)) | Drift detection + audit cryptographique | **non câblé** au cycle campagne |
| Manipulation Matrix (peddler/dealer/facilitator/entertainer) | Cohérence transformation audience | **non gaté** par activité |
| Devotion Ladder canonique ([ADR-0047](0047-devotion-ladder-vs-brand-classification.md)) | Mesure transition fan→évangéliste | **non tracké** par CampaignAction |
| Tarsis weak signals (sub-component Seshat) | Capture culturelle continue | **dort** pendant campagnes |
| Cult Index ([ADR-0046](0046-cult-index-no-magic-fallback.md)) | Mesure "renforce le culte ou dilue ?" | **non snapshotté** avant/après |
| Manifests (BRAINS, governor, missionContribution) | Détection obligations brand non-couvertes | **non audité** sur scope campagne |
| Variable bible canonique | Capitalisation typée des apprentissages | **non alimenté** par postmortem |
| Credentials Vault ([ADR-0021](0021-external-credentials-vault.md)) | Chain of custody multi-marché | **non scopé** par campaign-period |
| MCP bidirectionnel ([ADR-0026](0026-mcp-bidirectional-anubis.md)) | Ingest contexte founder externe | **non lié** aux artefacts campagne |
| Sequences gouvernées ([ADR-0039](0039-sequence-as-unique-public-unit.md), [ADR-0042](0042-sequence-modes-and-lifecycle.md)) | Auto-spawn templates promus DRAFT→STABLE | **non déclenché** par campagne réussie |
| Operator-amend-pillar ([ADR-0023](0023-operator-amend-pillar.md)) | Réconciliation Oracle ↔ exécution | **non exécuté** post-campagne |

### 1.3 Drift identifié

**Drift de mission** ([MISSION.md §4](../MISSION.md)) — La Fusée existe pour *transformer des marques en icônes culturelles, en industrialisant l'accumulation de superfans qui font basculer la fenêtre d'Overton*. Aujourd'hui le module campagne mesure des **KPIs marketing classiques** (impressions, conversions, ROAS) — pas les **mécanismes pivots** :
- Production d'évangélistes (devotion ladder transitions par activité)
- Déplacement Overton (axe culturel sectoriel mesuré avant/après)
- Cohérence culte (Cult Index delta par campagne)

**Drift narratif** — chaque campagne est traitée en silo, alors qu'une marque iconique se construit par **arc narratif cumulé** (chapitres ↔ campagnes consécutives). Le repo n'expose aucun outil de continuité narrative inter-campagne.

**Drift d'inventaire** — les primitives structurelles ci-dessus existent. Ne pas les câbler au module campagne = sous-utiliser le capital structurel accumulé sur 18 phases.

**Drift d'opportunité** — les concurrents ne **peuvent pas** offrir cette instrumentation (ils n'ont ni le hash-chain Mestor, ni la Manipulation Matrix, ni Tarsis). C'est le périmètre où La Fusée est défendable. Y renoncer = renoncer à l'avantage structurel.

---

## 2. Décision

### 2.1 Reconceptualisation — double-layer canonical, pas pivot de mission

Le module campagne est **upgradé** d'une architecture mono-couche (project tracker) vers une architecture **double-couche** :

| Layer | Rôle | État existant | Mutations |
|---|---|---|---|
| **L1 — Operational** | Plomberie projet — `Campaign`, `CampaignAction`, `CampaignFieldOp`, `CampaignBrief`, `CampaignAARRMetric`, briefs + actions ATL/BTL/TTL + AARRR + approvals + dependencies + templates | ✓ shipped (42 fields `Campaign` + 13 modèles satellites + 30+ Intent kinds `LEGACY_CAMPAIGN_*`) | Mutations campagne (CRUD via `mestor.emitIntent`) |
| **L2 — Instrumental** | Lecture continue de L1 par les Neteru orchestrés (snapshots immutables, drift detection, capitalisation cumulative cross-campagne) | ✗ à câbler — c'est le périmètre des 8 clusters de cet ADR | **Lecture seule sur L1** + écritures additives sur colonnes neuves L2 + émission d'observations gouvernées (Mestor intent log) |

**L2 ne remplace pas L1 — il en est lecture composée.** Pattern strictement identique à `Strategy` (mutation L1) + `strategy-presentation` (lecture composée Oracle L2) — déjà shipped, preuve que le pattern marche.

Une `Campaign` est désormais **simultanément** :

- ✓ un projet exécutable (L1 — inchangé)
- ✓ une **étape datée d'une trajectoire** (L2 Cluster A — Trajectoire & altitude)
- ✓ un **chapitre du myth arc** (L2 Cluster B — Cohérence narrative)
- ✓ un **générateur de superfans cumulables** (L2 Cluster C — Superfan economy)
- ✓ un **capteur de signaux culturels** (L2 Cluster D — Signaux faibles & culture)
- ✓ une **boucle d'apprentissage Oracle/crew/agence** (L2 Cluster E — Boucles d'apprentissage)
- ✓ une **décision pricée vs alternatives non-prises** (L2 Cluster F — Économie agence)
- ✓ un **acte gouverné cryptographiquement** (L2 Cluster G — Souveraineté opérationnelle)
- ✓ un **audit de complétude vs obligations brand** (L2 Cluster H — Negative space)

**Ce n'est pas un pivot de mission** (formulation v1 erronée — cf. §0). C'est un upgrade architectural natif. La mission [MISSION.md §4](../MISSION.md) reste *transformer des marques en icônes culturelles, en industrialisant l'accumulation de superfans qui font basculer la fenêtre d'Overton* — L2 instrumente les mécanismes pivots (production d'évangélistes, déplacement Overton, cohérence culte) qui étaient sous-mesurés en L1 seul.

### 2.2 Schéma cible

```
Campaign created → BRIEF_VALIDATED → READY_TO_LAUNCH
                                          │
                                          ▼
                         pre-flight gates 8 clusters câblés
                                          │
                                  LIVE (Mestor seal hash-chained)
                                          │
                ┌─────────────────────────┼─────────────────────────┐
                ▼                         ▼                         ▼
        Continuous capture        Continuous coherence       Continuous economics
        Seshat + Tarsis           Mestor + Artemis           Thot + Imhotep
        (D + capture B drift)     (B drift detect + A laws)  (A fuel + F profitability)
                                          │
                                  POST_CAMPAIGN
                                          │
                            Reconciliation Oracle (E)
                            operator-amend-pillar
                                          │
                            Negative-space audit (H)
                                          │
                                      ARCHIVED
                            capitalisé en capital structurel
                            (variable-bible, sequences DRAFT→STABLE,
                             Académie crew, founder education trace)
```

### 2.3 Décision structurelle (anti-doublon)

**NEFER interdit #1 — pas de réinvention de la roue** :

- ❌ **Pas de nouveau modèle Prisma `Activity`** — `CampaignAction` (générique tous canaux ATL/BTL/TTL via `category ActionCategory`) et `CampaignFieldOp` (terrain physique avec team/ambassadors) couvrent déjà le besoin granulaire.
- ❌ **Pas de nouveau Neter** — orchestration cross-Neteru via service `campaign-tracker` (governor `mestor`, missionContribution `CHAIN_VIA:multi`).
- ❌ **Pas de nouveau Oracle "section campagne"** — l'Oracle reste un livrable parmi N ([ADR-0014](0014-oracle-35-framework-canonical.md), [ADR-0024](0024-console-oracle-namespace-cleanup.md)) ; les apprentissages campagne réconcilient les sections existantes via operator-amend-pillar.
- ✓ **Extension de modèles existants** : `Campaign +bigIdeaSnapshotAssetVersionId +manifestoSnapshotAssetVersionId +manipulationMixSnapshot:Json +tierBrandSnapshot:Json +tierBrandFinal:Json +cultIndexSnapshotPre:Json +cultIndexSnapshotPost:Json +overtonHypothesis:Json +overtonObserved:Json +trackerStatus:CampaignTrackerStatus`. `CampaignAction +manipulationModeApplied +devotionRungTargeted +bigIdeaCoherenceScore:Float?`. `CampaignFieldOp +tarsisCaptureSessionId`.
- ✓ **Service orchestrateur unique** : `src/server/services/campaign-tracker/` — 8 sous-modules (un par cluster), chaque sous-module ré-utilise les Intent kinds existants des Neteru concernés.

### 2.4 Cap APOGEE

**7/7 préservé**. Aucun nouveau Neter. `campaign-tracker` est un **service orchestrateur** au même titre que `deliverable-orchestrator` ([ADR-0050](0050-output-first-deliverable-composition.md)) ou `brief-ingest`. Manifest : `governor: "MESTOR"`, `acceptsIntents: [...]`, `missionContribution: "CHAIN_VIA:multi"` (pattern Mestor dispatcher cross-Neteru).

### 2.5 Trois primitives architecturales (réutilisées de l'OS, pas inventées)

NEFER interdit #1 — pas de réinvention de pattern. Les 3 primitives ci-dessous existent déjà dans l'OS et sont **mobilisées simultanément** pour absorber les 8 risques structurels §16 sans fork de cohérence.

#### Primitive #1 — Capability flags 4-états par sous-cluster

Chaque sous-cluster L2 expose un état de capacité dans son manifest, déclaré au champ `clusterCapabilityState` (extension non-breaking de `defineManifest`) :

```ts
type ClusterCapabilityState =
  | "READY"     // Toutes deps disponibles, cluster pleinement fonctionnel
  | "PARTIAL"   // Deps partielles : calculs faits avec ce qu'on a, output flagué INCOMPLETE_DATA
  | "STUB"      // Deps absentes : retour DEFERRED_AWAITING_DEPS (pattern Anubis Credentials Vault, ADR-0021)
  | "DISABLED"  // Décision opérateur : cluster off pour cette marque/tenant
```

**Pattern précédent** : Anubis provider façades retournent `DEFERRED_AWAITING_CREDENTIALS` si pas de creds — code ship-able sans clés ([ADR-0021](0021-external-credentials-vault.md)). Identique ici.

#### Primitive #2 — STUB → MVP → PRODUCTION par sous-cluster (lifecycle versioning)

Cycle de maturité strictement aligné sur `BrandAsset` lifecycle (DRAFT → CANDIDATE → SELECTED → ACTIVE) et `Sequence.lifecycle` (DRAFT → STABLE, [ADR-0042](0042-sequence-modes-and-lifecycle.md)) :

```
STUB        — squelette qui respecte le contrat I/O mais retourne DEFERRED_AWAITING_DEPS
              ou résultats triviaux. Pas de quality gate. Permet de freezer l'API.
MVP         — première implémentation utile (heuristic, simplifié, peut être incorrect
              sur edge cases). Quality gate `Mode.SOFT` (warnings). Promotion → PRODUCTION
              après stress-test + validation opérateur.
PRODUCTION  — implémentation complète + tests anti-drift + quality gate `Mode.HARD`
              (blocking). Documentation ADR enfant si non-trivial.
```

**Pattern précédent** : sequences `lifecycle: DRAFT → STABLE` après 1 mois stress-test (Phase 17a [ADR-0041](0041-sequence-robustness-loop.md), [ADR-0042](0042-sequence-modes-and-lifecycle.md)). Identique ici.

#### Primitive #3 — Double-layer canonical (L1 Operational + L2 Instrumental)

Décrit §2.1. Pattern précédent : `Strategy` (L1 model) + `strategy-presentation` (L2 lecture composée Oracle).

#### Garantie de découplage

Si un sous-cluster L2 est en `STUB` ou `DISABLED`, **L1 continue de fonctionner identiquement**. Aucun gate L2 ne peut bloquer une mutation L1 par défaut. (Les gates qui sont *intentionnellement* blocking — ex. `MANIPULATION_COHERENCE_PER_ACTION` Cluster B — sont opt-in via `Strategy.strictModeGates: string[]` et désactivables marque-par-marque.)

---

## 3. Cluster A — Trajectoire & altitude

### 3.1 Primitives mobilisées
3 Lois APOGEE ([ADR-0001](0001-framework-name-apogee.md)), `BrandClassification` ([ADR-0047](0047-devotion-ladder-vs-brand-classification.md)), Thot fuel gate ([ADR-0006](0006-pillar-6-cost-gate.md)), intent log hash-chained ([ADR-0005](0005-hash-chain-immutability.md)).

### 3.2 Décision

| Item | Sémantique |
|---|---|
| `Campaign.tierBrandSnapshot: Json` | `BrandClassification` figée au passage `READY_TO_LAUNCH → LIVE`. Format : `{tier, compositeScore, byPillar, snapshotAt}` |
| `Campaign.tierBrandFinal: Json` | Idem, calculée à `POST_CAMPAIGN` (J+7 minimum après `endDate` pour stabiliser signaux) |
| Métrique calculée `tierDelta` | `tierBrandFinal.compositeScore - tierBrandSnapshot.compositeScore`. Affichée dans postmortem |
| `Campaign.altitudeRegression: Boolean` | Loi 1 audit : `true` si une dimension `byPillar` a régressé silencieusement (ex: gain D, perte V) malgré tier global positif. Code observation `LAW_1_SILENT_REGRESSION` |
| Loi 2 gate (pre-flight `READY_TO_LAUNCH → LIVE`) | Refus si la cascade ADVERTIS visée saute des étages (ex: phase R/T avec V/E non-active). Code erreur `STAGE_SEQUENCING_VIOLATION`. Implémenté dans `campaign-tracker/laws/sequencing.ts` |
| Loi 3 gate continue (Thot scheduler) | `CHECK_CAMPAIGN_FUEL_BURN_RATE` toutes les 24h pendant LIVE. Retourne `ALLOWED \| WARN_AT_BURN_RATE \| DENIED`. Sur `DENIED` (burn rate > seuil sans signal recovery) → Mestor émet `THOT_PAUSE_CAMPAIGN_FLAME_OUT` (status `PAUSED`) |
| Regret-window alarmes | Seshat scheduler à J+3 / J+7 / J+14 post-LIVE. Compare KPIs réalisés vs `aarrTargets`. `EARLY_WARNING_DRIFT` si <30% du target sur 2 fenêtres consécutives |

### 3.3 Surfaces

- **Service** : `src/server/services/campaign-tracker/trajectory.ts`
- **Migration Prisma** : `Campaign +tierBrandSnapshot:Json? +tierBrandFinal:Json? +altitudeRegression:Boolean? +killTriggeredAt:DateTime?`
- **Intent kinds (réutilisés)** : `RECOMPUTE_BRAND_CLASSIFICATION`, `THOT_PAUSE_CAMPAIGN_FLAME_OUT` (à câbler — peut être un `LEGACY_*` upgradé)
- **Tests** : `tests/unit/campaign-tracker/trajectory.test.ts` (assert tierDelta, sequencing violation, regret-window)

### 3.4 Cap APOGEE

7/7 préservé. Pas de nouveau Neter. Trajectoire est une vue cross-Neteru (Mestor = gates, Seshat = mesure, Thot = fuel).

---

## 4. Cluster B — Cohérence narrative

### 4.1 Primitives mobilisées
Manifesto versionné, BigIdea snapshot ([ADR-0012](0012-brand-vault-superassets.md)), Manipulation Matrix ([MANIPULATION-MATRIX.md](../MANIPULATION-MATRIX.md)), Cult Index DISTINCTIVE ([ADR-0046](0046-cult-index-no-magic-fallback.md)), intent log hash-chained.

### 4.2 Décision

| Item | Sémantique |
|---|---|
| `Campaign.bigIdeaSnapshotAssetVersionId: String?` | FK immutable sur `AssetVersion` du BigIdea ACTIVE au lancement. Aucune mutation possible une fois `LIVE`. Permet l'arc narratif ré-lisible historiquement |
| `Campaign.manifestoSnapshotAssetVersionId: String?` | Idem pour Manifesto ACTIVE |
| `Campaign.manipulationMixSnapshot: Json` | Copie figée de `Strategy.manipulationMix` au lancement |
| `CampaignAction.manipulationModeApplied: ManipulationMode` | Mode appliqué dans cette action précise. Type-level enum (peddler / dealer / facilitator / entertainer) |
| `CampaignAction.bigIdeaCoherenceScore: Float?` | Score 0–1 calculé par Glory tool dédié `big-idea-coherence-checker` (LLM evaluation : copy/visual/claim de l'action vs `Manifesto.beliefs[]` + `BigIdea.coreClaim`) |
| Pre-flight gate `MANIPULATION_COHERENCE_PER_ACTION` | Refuse `CampaignAction` dont `manipulationModeApplied` n'est pas dans `Campaign.manipulationMixSnapshot.allowed[]`. Code erreur `MANIPULATION_DRIFT` |
| Continuous drift detection | Scheduler `campaign-tracker/coherence.ts` toutes les 6h pendant LIVE : (a) recalcule `bigIdeaCoherenceScore` sur les nouveaux livrables produits par les actions, (b) compare distribution mode appliqué vs mix stratégique, (c) émet observation `MANIPULATION_DISTRIBUTION_DRIFT` si écart >15% sur 2 fenêtres |
| Cult Index pre/post snapshot | `Campaign.cultIndexSnapshotPre: Json` figé `READY_TO_LAUNCH → LIVE`, `cultIndexSnapshotPost: Json` calculé à `POST_CAMPAIGN`. Métrique `cultIndexDelta` exposée. **Pas de fallback magic** — null si Seshat n'a pas de snapshot exploitable ([ADR-0046](0046-cult-index-no-magic-fallback.md) §1) |
| Myth arc continuity | Service `campaign-tracker/myth-arc.ts` agrège `Campaign.bigIdeaSnapshotAssetVersionId` + `Campaign.manifestoSnapshotAssetVersionId` chronologiquement. Calcule similarity score chapitre N vs N-1 (LLM via Glory tool `myth-arc-cohesion-evaluator`). Affiché dans `/console/artemis/brand/[id]/myth-arc` |
| Cultural debt metric | Service `campaign-tracker/cultural-debt.ts` mesure gap `Manifesto.beliefs[]` ↔ `Campaign.actionsExecutedClaims[]`. Output : `culturalDebtScore: Float` (0 = parfait alignement, 1 = totalement détourné) |
| Competitive copy-cat dilution | Tarsis `competitive-monitoring` capture concurrents répliquant nos codes (visuels, claims, mots-clés). Alerte `DISTINCTIVENESS_DILUTION` agrégée cross-campaigns sur 60 jours |

### 4.3 Surfaces

- **Service** : `src/server/services/campaign-tracker/{coherence,myth-arc,cultural-debt}.ts`
- **Migration Prisma** :
  - `Campaign +bigIdeaSnapshotAssetVersionId:String? +manifestoSnapshotAssetVersionId:String? +manipulationMixSnapshot:Json? +cultIndexSnapshotPre:Json? +cultIndexSnapshotPost:Json?`
  - `CampaignAction +manipulationModeApplied:ManipulationMode? +bigIdeaCoherenceScore:Float?`
- **Glory tools** (nouveaux, sous Artemis) : `big-idea-coherence-checker`, `myth-arc-cohesion-evaluator`. Conformes [ADR-0048](0048-glory-tools-as-primary-api-surface.md) (primary API surface).
- **Intent kinds (nouveaux)** : `CHECK_BIG_IDEA_COHERENCE` (sync, governor Artemis), `EVALUATE_MYTH_ARC_COHESION` (sync), `RECOMPUTE_CULTURAL_DEBT` (async)
- **Page** : `/console/artemis/brand/[id]/myth-arc` (vue chronologique inter-campagne)

### 4.4 Cap APOGEE

7/7 préservé. Tout sous gouvernance Artemis (cohérence narrative est le périmètre d'Artemis ([PANTHEON.md](../PANTHEON.md))).

---

## 5. Cluster C — Superfan economy

### 5.1 Primitives mobilisées
Devotion Ladder canonique ([ADR-0047](0047-devotion-ladder-vs-brand-classification.md)), `Strategy.superfanTarget`, Tarsis sentiment, CRM cohort tracking.

### 5.2 Décision

| Item | Sémantique |
|---|---|
| `CampaignAction.devotionRungTargeted: DevotionLadderTier` | Rung visé par cette action (APPRENTI / PRATIQUANT / INITIE / FIDELE / EVANGELISTE) — type-level enum |
| `CampaignAction.devotionTransitionsObserved: Json?` | Format `{from: tier, to: tier, count: int}[]` mesuré post-action via cohort match CRM |
| Service `campaign-tracker/superfan-attribution.ts` | Modèle d'attribution dédié **différent** du multi-touch classique : un évangéliste vaut N conversions futures (modèle paramétrique avec horizon 24 mois) |
| `Campaign.detractorsCount: Int?` + `Campaign.detractorsSentimentScore: Float?` | Comptage anti-superfans (haters, communauté hostile). Pour certaines marques cult (positionnement polarisant), `detractorsCount > 0` est un KPI **positif** flag par `Strategy.polarizationAccepted: Boolean` |
| Shadow superfan mobilization | Tarsis tracking UGC + repost organique. Métrique `Campaign.shadowReachEarned: Int?` = volume reach earned attribué aux superfans existants (UGC géolocalisé, mention organique, hashtag dérivé) |
| Devotion stickiness curve | Cohort longitudinal J+30 / J+90 / J+180 post-`POST_CAMPAIGN`. Combien des `EVANGELISTE` produits sont restés ? Service `campaign-tracker/stickiness.ts` (cron scheduler) |
| Post-campaign superfan handoff | À `POST_CAMPAIGN → ARCHIVED`, intent `CRM_SEGMENT_CAPTURE_SUPERFANS_FROM_CAMPAIGN` qui crée segment CRM nominal `superfans-{campaignCode}` + séquence engagement post-campagne pré-câblée (sequence Anubis) |

### 5.3 Surfaces

- **Service** : `src/server/services/campaign-tracker/{superfan-attribution,stickiness}.ts`
- **Migration Prisma** :
  - `Campaign +detractorsCount:Int? +detractorsSentimentScore:Float? +shadowReachEarned:Int?`
  - `CampaignAction +devotionRungTargeted:DevotionLadderTier? +devotionTransitionsObserved:Json?`
- **Intent kinds (nouveaux)** : `RECOMPUTE_SUPERFAN_ATTRIBUTION`, `CRM_SEGMENT_CAPTURE_SUPERFANS_FROM_CAMPAIGN` (governor Anubis), `MEASURE_DEVOTION_STICKINESS_COHORT`
- **Page** : `/cockpit/operate/campaigns/[id]/superfans` + extension postmortem

### 5.4 Cap APOGEE

7/7 préservé. Anubis (CRM/broadcast) + Seshat (mesure cohort) co-signent.

---

## 6. Cluster D — Signaux faibles & culture

### 6.1 Primitives mobilisées
Tarsis weak signals (sub-component Seshat), Overton hypothesis, MCP entrant ([ADR-0026](0026-mcp-bidirectional-anubis.md)).

### 6.2 Décision

| Item | Sémantique |
|---|---|
| Tarsis activity-mode | Capture continue pendant LIVE. Ingest mèmes émergents, hashtags dérivés, communautés naissantes, détournements UGC. Persistés dans `TarsisCaptureSession` (modèle existant ou nouveau, à grep) lié `CampaignFieldOp.tarsisCaptureSessionId` |
| Overton readiness check (pré-LIVE) | Pre-flight `READY_TO_LAUNCH → LIVE` : Tarsis évalue `OvertonReadiness` sur l'axe culturel ciblé. Output : `READY \| TOO_EARLY \| TOO_LATE` + reasoning. Non-bloquant par défaut (warning) — devient bloquant si `Strategy.overtonStrictMode = true` |
| Overton shift measurement (post-LIVE) | `Campaign.overtonHypothesis: Json` (figée au lancement : axe ciblé, sentiment de départ) ; `Campaign.overtonObserved: Json` (mesurée à POST_CAMPAIGN : sentiment final, vocabulaire sectoriel évolution, références médias). Métrique `overtonShiftScore` |
| Dark signals monitoring | Tarsis dark mode : sentiment dégradé, controverses émergentes, communautés hostiles. Scheduler 6h pendant LIVE → `CRISIS_SIGNAL_DETECTED` + Anubis push notif Console |
| Cultural moment piggyback | Tarsis surveille flux IRL/news (deuil national, victoire sportive, scandale concurrent). Recommandation activité réactive si match `Manifesto.beliefs[]` à seuil similarity. Output : `CulturalOpportunityRecommendation` dans `/console/artemis/brand/[id]/opportunities` |
| MCP context ingest | Briefs founder dans Slack/Notion/Drive/GitHub captés via [ADR-0026](0026-mcp-bidirectional-anubis.md) MCP entrant Anubis. Liés à la campagne via `CampaignContextIngest` (nouveau modèle léger : `id, campaignId, source, sourceId, content, ingestedAt`) |

### 6.3 Surfaces

- **Service** : `src/server/services/campaign-tracker/{tarsis-bridge,overton-meter,context-ingest}.ts`
- **Migration Prisma** :
  - `Campaign +overtonHypothesis:Json? +overtonObserved:Json?`
  - `CampaignFieldOp +tarsisCaptureSessionId:String?`
  - Nouveau modèle léger `CampaignContextIngest` (justifié par grep : `CRMActivity` est différent — c'est un journal CRM, pas un ingest MCP campaign-scoped)
- **Intent kinds (nouveaux)** : `INGEST_MCP_CONTEXT_TO_CAMPAIGN` (sync, governor Anubis), `MEASURE_OVERTON_SHIFT` (async, governor Seshat-Tarsis), `EVALUATE_OVERTON_READINESS` (sync)
- **Page** : `/console/seshat/tarsis/campaigns/[id]` (capture session live)

### 6.4 Cap APOGEE

7/7 préservé. Tarsis reste sub-component Seshat (cf. [PANTHEON.md](../PANTHEON.md) §Tarsis). MCP ingest reste sous Anubis ([ADR-0026](0026-mcp-bidirectional-anubis.md)).

---

## 7. Cluster E — Boucles d'apprentissage

### 7.1 Primitives mobilisées
Oracle 35 sections + 3 tiers ([ADR-0014](0014-oracle-35-framework-canonical.md), [ADR-0045](0045-dormant-cleanup-post-phase-14-15.md)), variable-bible ([VARIABLE-BIBLE-CANON.md](../VARIABLE-BIBLE-CANON.md)), Académie Imhotep ([ADR-0019](0019-imhotep-full-activation.md)), Glory sequences DRAFT→STABLE ([ADR-0042](0042-sequence-modes-and-lifecycle.md)), operator-amend-pillar ([ADR-0023](0023-operator-amend-pillar.md)).

### 7.2 Décision

| Item | Sémantique |
|---|---|
| Réconciliation Oracle ↔ campagne | À `POST_CAMPAIGN`, postmortem structuré déclenche un Glory tool `campaign-to-oracle-reconciler` qui produit pour chaque section Oracle impactée un `OPERATOR_AMEND_PILLAR_PROPOSAL` (mode LLM_REPHRASE par défaut — l'opérateur valide). Recalcul RTIS automatique ([ADR-0051](0051-rtis-cascade-canonical-path.md)) |
| Variable-bible enrichment | Postmortem extrait entries typées (claim X performe sur audience Y dans contexte Z). Service `campaign-tracker/learnings-extractor.ts` produit `VariableBibleEnrichmentProposal[]` reviewable avant merge |
| Académie crew loop (Imhotep) | À `POST_CAMPAIGN`, chaque `CampaignTeamMember` reçoit score qualité par dimension (calcul Glory tool `crew-performance-evaluator`) ↦ feed `Imhotep.CrewProfile.qualityScores`. Tier promotion auto si seuil atteint. Formations recommandées sur dimensions faibles |
| Founder education trace | Pour chaque `Campaign`, courbe instrumentée d'interactions cockpit (clicks, glory tools invoqués, modals ADVE ouverts). Output : `FounderLiteracyScore` (composé sur 12 dimensions). Recommande modules Académie founder |
| Glory sequences auto-spawned | Une campagne réussie (tierDelta > 0 + cultIndexDelta > 0 + altitudeRegression = false) déclenche `PROPOSE_SEQUENCE_PROMOTION_FROM_CAMPAIGN` (governor Artemis). La séquence runtime ad-hoc utilisée pendant la campagne devient candidate `lifecycle: DRAFT` ([ADR-0042](0042-sequence-modes-and-lifecycle.md)). Promotion `STABLE` après 3 réutilisations cross-clients (anonymisées) |
| Postmortem structuré canonique | 12 questions standardisées (structurées dans `CampaignReport.postmortemStructured: Json`) qui alimentent simultanément Oracle + variable-bible + sequences + matchmaking Imhotep. Glory tool `postmortem-12q` |

### 7.3 Surfaces

- **Service** : `src/server/services/campaign-tracker/learnings/{oracle-reconciler,vb-enrichment,crew-loop,founder-trace,sequences-promoter,postmortem}.ts`
- **Migration Prisma** : `CampaignReport +postmortemStructured:Json?`
- **Glory tools (nouveaux)** : `campaign-to-oracle-reconciler`, `crew-performance-evaluator`, `postmortem-12q`
- **Intent kinds (nouveaux)** : `RECONCILE_CAMPAIGN_TO_ORACLE` (async, governor Mestor — orchestre Operator-Amend-Pillar proposals), `ENRICH_VARIABLE_BIBLE_FROM_CAMPAIGN`, `EVALUATE_CREW_PERFORMANCE`, `PROPOSE_SEQUENCE_PROMOTION_FROM_CAMPAIGN`
- **Page** : `/console/artemis/campaigns/[id]/postmortem` (12q structuré + visualisation impact Oracle/VB/Académie)

### 7.4 Cap APOGEE

7/7 préservé. Multi-Neteru orchestré par Mestor (governor unique du service learnings).

---

## 8. Cluster F — Économie agence

### 8.1 Primitives mobilisées
Multi-tenant strict ([ADR-0029](0029-quickintake-strategy-fk-setnull.md) `tenantScopedDb`), Thot ([PANTHEON.md](../PANTHEON.md) §Thot), Manipulation Matrix forks, intent log audit, variable-bible.

### 8.2 Décision

| Item | Sémantique |
|---|---|
| Profitability per activity-type cluster | Service `campaign-tracker/agency-economics.ts` agrège **anonymisé** cross-clients par `CampaignAction.category` × période × marché. Output `ActivityTypeMargin` accessible Console UPgraders uniquement. Multi-tenant strict (jamais visible d'un Cockpit founder vers les autres) |
| Intent fork tracking | Manipulation Matrix mémorise les forks : choisir mode `dealer` = ne pas faire `entertainer`. Service `campaign-tracker/forks.ts` enregistre `Campaign.forksDeclined: Json?` à chaque décision stratégique (pre-flight choix). Postmortem peut interroger l'alternative non-prise |
| Resource saturation forecasting | Imhotep agrège `CampaignTeamMember[]` × dates × disponibilité crew. Output : capacity heatmap agency-wide + alarmes goulot d'étranglement projeté semaine N+6. Bloquant pour signature nouveau deal si `forecastSaturation > 0.85` |
| Friction client métriques | Comptage `CampaignApproval` rounds, retards, désaccords créatifs vs stratégiques, capturé via intent log temporel. Métrique `Campaign.frictionScore: Float?`. Agrégé par compte ↦ identifie comptes coûteux avant signature renouvellement |
| Cross-client capitalization (opt-in) | Pattern qui marche chez brand A → testable chez brand B via `glory-sequence` STABLE (cf. Cluster E). Manifests garantissent absence de conflit territoire/secteur (`Strategy.sector` + `Strategy.territories` cross-check) |

### 8.3 Surfaces

- **Service** : `src/server/services/campaign-tracker/{agency-economics,forks}.ts`
- **Migration Prisma** : `Campaign +forksDeclined:Json? +frictionScore:Float?`
- **Intent kinds (nouveaux)** : `RECOMPUTE_AGENCY_ACTIVITY_MARGINS` (async, governor Thot), `EVALUATE_RESOURCE_SATURATION` (sync, governor Imhotep)
- **Page** : `/console/upgraders/economics` (Console UPgraders only — gate strict via `requireRole("UPGRADERS_LEAD")`)

### 8.4 Cap APOGEE

7/7 préservé. Thot (économie) + Imhotep (capacity).

---

## 9. Cluster G — Souveraineté opérationnelle

### 9.1 Primitives mobilisées
Credentials Vault ([ADR-0021](0021-external-credentials-vault.md)), intent log hash-chained, manifests, MCP bidirectionnel ([ADR-0026](0026-mcp-bidirectional-anubis.md)), country-scoped knowledge ([ADR-0037](0037-country-scoped-knowledge-base.md)).

### 9.2 Décision

| Item | Sémantique |
|---|---|
| Compliance par marché actif | Chaque `CampaignFieldOp.location` résolue en `country` ↦ règles ARPP / CONAC / ASA / local appliquées via `compliance-rules-by-country` (réutilise [ADR-0037](0037-country-scoped-knowledge-base.md)). Pre-flight `CAMPAIGN_FIELD_OP_COMPLIANCE_CHECK` |
| Credentials chain of custody | Service `campaign-tracker/credentials-chain.ts` : à `LIVE` snapshot des `ExternalConnector.id` utilisés ; à `ARCHIVED` propose rotation forcée des clés (offboarding partenaires). Audit journal hash-chained |
| Intent log audit publique | Endpoint Console `/console/audit/campaigns/[id]/intent-log` lecture seule, exportable PDF signé pour disputes client / contrôle légal / due diligence acquisition brand |
| Brand safety multi-niveau | Par campaign × action × creative × placement. Matrice flags via Glory tool `brand-safety-multilevel-check` (inputs : asset hash + placement metadata + manifesto contraintes). Output blocking flags |
| Multi-currency & mobile money | `CampaignFieldOp.budget` peut être MoMo cash terrain. Réconciliation auto avec `MobileMoneyTransaction` (modèle existant — à grep ; sinon greffon Thot). Spécificité Afrique non-couverte par outils US/EU |
| MCP bidirectionnel campagne-scoped | Claude Desktop pilote campagne via MCP sortant ([ADR-0026](0026-mcp-bidirectional-anubis.md)) ; ingère contexte (Slack/Notion/Drive) via MCP entrant scopé période campagne |

### 9.3 Surfaces

- **Service** : `src/server/services/campaign-tracker/{compliance,credentials-chain,brand-safety}.ts`
- **Glory tool (nouveau)** : `brand-safety-multilevel-check`
- **Intent kinds (nouveaux)** : `CHECK_CAMPAIGN_FIELD_OP_COMPLIANCE` (sync, governor Mestor), `SNAPSHOT_CREDENTIALS_CHAIN` (sync, governor Anubis), `PROPOSE_CREDENTIALS_ROTATION_AT_ARCHIVE` (async)
- **Page** : `/console/audit/campaigns/[id]` (Console UPgraders + auditor role)

### 9.4 Cap APOGEE

7/7 préservé. Anubis (Credentials Vault + MCP) + Mestor (audit log).

---

## 10. Cluster H — Negative space

### 10.1 Primitives mobilisées
Manifests (BRAINS const, governor, missionContribution), variable-bible, Oracle 35 sections, ADVERTIS cascade canonique.

### 10.2 Décision

| Item | Sémantique |
|---|---|
| Brand obligations non-couvertes audit | Service `campaign-tracker/negative-space.ts` croise `Manifesto.obligations[]` (pillars actifs déclarés) avec `Campaign.actions[].pillarServed[]`. Si pillar V exigé mais 0 action de la campagne ne sert V → flag `BRAND_OBLIGATION_UNCOVERED` |
| Devotion rungs orphelins | Si `Campaign.aarrTargets.acquisition` produit `CURIEUX` mais aucune action ne cible `FAN` rung suivant → flag `LADDER_RUNG_ORPHAN`. Fuite garantie. Recommandation action correctrice |
| Audience segments oubliés | Tarsis détecte communauté émergente (Cluster D) non ciblée par aucune action campagne → recommandation `TACTICAL_ACTIVATION_MISSING` |
| Channels manquants critiques | Pour la phase ADVERTIS visée, audit cascade-channel-fit : phase `T-Trust` sans aucun PR_BTL = bancal. Recommandation `CHANNEL_FIT_GAP` |
| Oracle sections non-rafraîchies | À `POST_CAMPAIGN` : la campagne a généré data pour 5 sections Oracle, seules 2 ont été reprises via Cluster E. Flag `ORACLE_RECONCILIATION_PARTIAL` |
| Glory tools dormants | Audit Glory tools disponibles vs invoqués pour la campagne. Si tool pertinent non-utilisé → `DORMANT_TOOL_HINT` (tool exists for `claim-variant`, not invoked, KPI claim sous-performe) |

### 10.3 Surfaces

- **Service** : `src/server/services/campaign-tracker/negative-space.ts`
- **Migration Prisma** : `CampaignAction +pillarServed:Pillar[]`. (Prisma support array enum natif.)
- **Glory tool (nouveau)** : `negative-space-auditor` (gouverné Mestor — vue audit cross-Neteru)
- **Intent kinds (nouveaux)** : `AUDIT_CAMPAIGN_NEGATIVE_SPACE` (sync, governor Mestor)
- **Page** : `/console/mestor/campaigns/[id]/audit` (vue audit complète : 6 catégories de gaps + recommandations actionnables)

### 10.4 Cap APOGEE

7/7 préservé. Audit cross-Neteru sous Mestor.

---

## 11. Conséquences

### 11.1 Positives

- **Capital cumulatif activé** — chaque campagne enrichit Oracle, variable-bible, sequences, Académie crew, founder education trace. Avant : capital dormant.
- **Différenciation défendable** — les 8 clusters ne sont accessibles qu'à un opérateur disposant simultanément de Mestor (intent log) + Manipulation Matrix + Devotion Ladder + Tarsis + Cult Index + Manifests + Credentials Vault + MCP. Aucun concurrent ne dispose de ce stack — c'est le périmètre où La Fusée est défendable.
- **Drift préventif** — 6 codes erreur structurés (`STAGE_SEQUENCING_VIOLATION`, `MANIPULATION_DRIFT`, `MANIPULATION_DISTRIBUTION_DRIFT`, `LAW_1_SILENT_REGRESSION`, `EARLY_WARNING_DRIFT`, `CRISIS_SIGNAL_DETECTED`) capturent les dérives avant flame-out.
- **Mission alignment vérifié** — chaque cluster documente sa contribution aux **mécanismes pivots** (superfans + Overton). Drift test [MISSION.md §4](../MISSION.md) passe.
- **Cap APOGEE 7/7 préservé** — aucun nouveau Neter introduit. Pattern orchestrateur (`campaign-tracker` governor `mestor`) cohérent avec [ADR-0050](0050-output-first-deliverable-composition.md).
- **Rétrocompatible** — toutes les nouvelles colonnes Prisma sont optionnelles (`?`). Campaigns existantes restent valides en lecture. Migration data nulle pour les anciennes.

### 11.2 Négatives / risques

- **Périmètre large** — 8 clusters = ~12 nouveaux Intent kinds, ~6 nouvelles colonnes par modèle existant, ~5 nouveaux Glory tools, ~4 nouvelles pages. Estimation effort : 6–10 semaines à 1.0 ETP. Découpage en sous-PRs atomiques §13 obligatoire.
- **Coût computationnel** — Tarsis activity-mode + scheduler 6h coherence + scheduler 24h fuel + cohort longitudinal stickiness J+30/90/180 = charge non-négligeable. Throttling + prioritization Thot fuel gate Loi 3.
- **Friction onboarding founder** — la richesse instrumentale peut devenir overwhelming. Cockpit doit afficher `cult-index delta`, `tier delta`, `myth arc` en mode **vulgarisé** ; détails Console only.
- **Postmortem 12q peut être ignoré** — risque que les opérateurs UPgraders ne prennent pas le temps. Mitigation : gate `Campaign.state: ARCHIVED` requiert `CampaignReport.postmortemStructured` non-null.
- **MCP MCP entrant scope confidentialité** — un Slack client peut contenir données sensibles. Mitigation : opt-in explicite founder + log audit sur chaque ingest.
- **Magic-number risk** sur seuils (15%, 30%, 0.85, J+3/7/14, etc.) — chaque seuil doit avoir entrée variable-bible documentée + ADR si non-trivial. Sinon répétition du drift [ADR-0046](0046-cult-index-no-magic-fallback.md).

### 11.3 Pas de drift

- **N'introduit pas de nouveau Neter** — Cap 7/7 cohérent avec [ADR-0038](0038-apogee-anti-drift-phase-16-bis.md).
- **N'éditorialise pas RTIS** — les piliers RTIS restent dérivés via Intents `ENRICH_*` ([ADR-0023](0023-operator-amend-pillar.md), [ADR-0051](0051-rtis-cascade-canonical-path.md)). Cluster E utilise `OPERATOR_AMEND_PILLAR` mode LLM_REPHRASE proposals **pour les piliers ADVE uniquement**.
- **Ne bypasse pas Mestor** — toutes mutations passent par Intent kinds gouvernés (~12 nouveaux + réutilisation existants).
- **Ne crée pas de "section campagne" dans l'Oracle** — l'Oracle reste un livrable parmi N ([ADR-0024](0024-console-oracle-namespace-cleanup.md)). Cluster E réconcilie les 35 sections existantes.
- **Ne double pas `CampaignAction` ni `CampaignFieldOp`** — extension de colonnes optionnelles uniquement. NEFER interdit #1 respecté.
- **Ne touche pas le cap Strategy/BrandAsset** — `BrandAsset.parentBrandAssetId` (existant) suffit pour le lineage.

---

## 12. Alternatives écartées

### A1 — Nouveau Neter "Heru" (Vision/Trajectory) gouvernant le module campagne

**Rejeté**. Ferait sauter Cap APOGEE 7→8. [ADR-0038](0038-apogee-anti-drift-phase-16-bis.md) interdit toute extension du panthéon. Le pattern orchestrateur ([ADR-0050](0050-output-first-deliverable-composition.md) `deliverable-orchestrator`) est suffisant.

### A2 — Nouveau modèle Prisma `Activity` standalone

**Rejeté**. Doublonnerait `CampaignAction` (générique tous canaux) + `CampaignFieldOp` (terrain). NEFER interdit #1. CODE-MAP déjà flag les doublons (cf. Vault `SuperAsset` doublait `BrandAsset`).

### A3 — Plugin séparé "campaign-tracker-pro"

**Rejeté**. Plugin sandboxing ([ADR-0008](0008-plugin-sandboxing.md)) est conçu pour l'intégration tierce. Ici on ajoute du capital structurel — appartient au cœur. Plugin = drift architectural.

### A4 — 8 ADRs séparés (un par cluster) sans méga-ADR chapeau

**Rejeté**. Les 8 clusters ne sont pas indépendants — ils partagent `Campaign` + `CampaignAction` migration, `campaign-tracker` service, et la décision conceptuelle "campagne = instrument de trajectoire". Sans chapeau, drift d'incohérence garanti entre les 8 PRs. Le méga-ADR fixe la cohérence ; chaque cluster qui requiert raffinement devient un ADR enfant `0052-X.md`.

### A5 — Réécrire campaign-manager from scratch

**Rejeté**. Strangler audit ([ADR-0004](0004-strangler-audited-procedure.md)) impose extension. Réécriture risquerait régression sur 30+ Intent kinds `LEGACY_CAMPAIGN_*` strangler-promoted.

### A6 — Limiter à 3 clusters pour shipper plus vite (A + B + E)

**Rejeté à court terme, accepté comme phasage**. Les 8 clusters sont conceptuellement indissociables (ex: D Tarsis nourrit B drift detection ; F économie dépend de A trajectory). Mais §13 propose un phasage en 3 vagues qui priorise A+B+E (vague 1) tout en gardant le méga-ADR comme contrat.

---

## 13. Roadmap implémentation (3 vagues, 16 sous-PRs)

### Vague 1 — Fondations narratives & trajectoire (sprint 1, ~3 semaines)

| # | PR | Cluster | Scope |
|---|---|---|---|
| 1 | `feat(prisma): campaign-tracker migrations vague 1` | A + B | Migration `Campaign +tier* +bigIdea* +manifesto* +manipulationMix* +cultIndex* +overton*` ; `CampaignAction +manipulationModeApplied +bigIdeaCoherenceScore` |
| 2 | `feat(intent-kinds): vague 1 (5 nouveaux)` | A + B | Mestor + slos + handlers (`CHECK_BIG_IDEA_COHERENCE`, `EVALUATE_MYTH_ARC_COHESION`, `RECOMPUTE_CULTURAL_DEBT`, `CHECK_CAMPAIGN_FUEL_BURN_RATE`, `THOT_PAUSE_CAMPAIGN_FLAME_OUT`) |
| 3 | `feat(campaign-tracker): trajectory + coherence services` | A + B | `src/server/services/campaign-tracker/{trajectory,coherence,myth-arc,cultural-debt}.ts` + tests |
| 4 | `feat(glory-tools): big-idea-coherence-checker + myth-arc-cohesion-evaluator` | B | 2 nouveaux Glory tools sous Artemis (cf. [ADR-0048](0048-glory-tools-as-primary-api-surface.md)) |
| 5 | `feat(cockpit): /cockpit/operate/campaigns/[id] enriched UI` | A + B | Affichage tier delta, cult index delta, big idea coherence per action |
| 6 | `feat(console): /console/artemis/brand/[id]/myth-arc page` | B | Vue chronologique inter-campagne |

### Vague 2 — Capture culturelle & superfan economy (sprint 2, ~3 semaines)

| # | PR | Cluster | Scope |
|---|---|---|---|
| 7 | `feat(prisma): campaign-tracker migrations vague 2` | C + D | `Campaign +detractors* +shadow* +overtonHypothesis +overtonObserved` ; `CampaignAction +devotionRung* +devotionTransitions*` ; new `CampaignContextIngest` |
| 8 | `feat(intent-kinds): vague 2 (6 nouveaux)` | C + D | `RECOMPUTE_SUPERFAN_ATTRIBUTION`, `MEASURE_DEVOTION_STICKINESS_COHORT`, `CRM_SEGMENT_CAPTURE_SUPERFANS_FROM_CAMPAIGN`, `INGEST_MCP_CONTEXT_TO_CAMPAIGN`, `MEASURE_OVERTON_SHIFT`, `EVALUATE_OVERTON_READINESS` |
| 9 | `feat(campaign-tracker): superfan + tarsis-bridge + overton-meter services` | C + D | 5 sous-modules + tests |
| 10 | `feat(cockpit): /cockpit/operate/campaigns/[id]/superfans page` | C | Cohort visualisation + stickiness curve |
| 11 | `feat(console): /console/seshat/tarsis/campaigns/[id] page` | D | Live capture session view |

### Vague 3 — Boucles d'apprentissage, économie agence, souveraineté, negative space (sprint 3, ~4 semaines)

| # | PR | Cluster | Scope |
|---|---|---|---|
| 12 | `feat(prisma): campaign-tracker migrations vague 3` | E + F + G + H | `CampaignReport +postmortemStructured` ; `Campaign +forksDeclined +frictionScore` ; `CampaignAction +pillarServed[]` |
| 13 | `feat(intent-kinds): vague 3 (8 nouveaux)` | E + F + G + H | Tous les Intent kinds restants documentés §7.3, §8.3, §9.3, §10.3 |
| 14 | `feat(campaign-tracker): learnings + agency-economics + souveraineté + negative-space services` | E + F + G + H | ~10 sous-modules + tests |
| 15 | `feat(glory-tools): postmortem-12q + crew-performance-evaluator + brand-safety-multilevel-check + negative-space-auditor + campaign-to-oracle-reconciler` | E + G + H | 5 nouveaux Glory tools |
| 16 | `feat(pages): postmortem + audit + economics + negative-space pages` | E + F + G + H | 4 nouvelles pages Console |
| 17 | `docs(governance): ADR-0052 propagation + LEXICON + INTENT-CATALOG + PAGE-MAP + SERVICE-MAP + REFONTE-PLAN + CHANGELOG` | tous | Closing PR documentation |

**Total** : 17 sous-PRs en 3 vagues = ~10 semaines à 1.0 ETP.

### Découpage en ADRs enfants (si raffinement nécessaire en revue)

Chaque cluster peut être extrait en ADR enfant si raffinement nécessaire en revue :

- `ADR-0052-A-trajectory.md` — détail formule tierDelta + threshold burn rate
- `ADR-0052-B-coherence.md` — détail formule bigIdeaCoherenceScore + LLM evaluator prompt
- `ADR-0052-C-superfan-attribution.md` — détail modèle paramétrique 24 mois
- `ADR-0052-D-tarsis-overton.md` — détail capture session + overton readiness algo
- `ADR-0052-E-learnings.md` — détail postmortem 12q canonique
- `ADR-0052-F-agency-economics.md` — détail anonymisation cross-clients + multi-tenant gates
- `ADR-0052-G-souverainete.md` — détail compliance multi-marché + chain-of-custody
- `ADR-0052-H-negative-space.md` — détail audit cross-Neteru + recommendation engine

Le méga-ADR reste le contrat global ; les enfants raffinent sans renégocier la décision.

---

## 14. Tests anti-drift CI bloquants

À ajouter dans `tests/unit/governance/` :

1. `campaign-tracker-no-new-neter.test.ts` — assert que `BRAINS` const ([src/server/governance/manifest.ts:23](../../../src/server/governance/manifest.ts)) reste à 7 entrées après merge complet vague 3
2. `campaign-tracker-no-magic-thresholds.test.ts` — grep tous les seuils numériques (`> 0.85`, `< 0.30`, `J+3/7/14`, `15%`) dans `src/server/services/campaign-tracker/**` et exige une entrée variable-bible correspondante
3. `campaign-tracker-extends-not-doubles.test.ts` — assert que `Campaign`, `CampaignAction`, `CampaignFieldOp` n'ont aucun cousin (pas de modèle `Activity*`, `CampaignActivity*`, `Operation*` campagne-scoped concurrent)
4. `campaign-tracker-snapshot-immutability.test.ts` — assert que `bigIdeaSnapshotAssetVersionId` + `manifestoSnapshotAssetVersionId` + `tierBrandSnapshot` + `manipulationMixSnapshot` + `cultIndexSnapshotPre` + `overtonHypothesis` ne peuvent pas muter une fois `Campaign.state = LIVE` (Prisma trigger ou check côté service)
5. `campaign-tracker-cap-apogee-cluster-coverage.test.ts` — assert que les 8 clusters ont chacun au moins un test d'intégration et un manifest reference (vérifie qu'aucun cluster n'a été silencieusement abandonné)

---

## 15. SLOs suggérés

| Intent kind | SLO p95 | Notes |
|---|---|---|
| `CHECK_BIG_IDEA_COHERENCE` | 8s (LLM eval) | Sync handler — Glory tool LLM |
| `EVALUATE_MYTH_ARC_COHESION` | 12s | Sync — agrégation chronologique |
| `RECOMPUTE_CULTURAL_DEBT` | 30s (async) | Async streamé NSP |
| `CHECK_CAMPAIGN_FUEL_BURN_RATE` | 1s | Sync read-only — gate Thot |
| `THOT_PAUSE_CAMPAIGN_FLAME_OUT` | 2s | Sync mutation — flag campaign |
| `RECOMPUTE_SUPERFAN_ATTRIBUTION` | 60s (async) | Cohort heavy compute |
| `MEASURE_DEVOTION_STICKINESS_COHORT` | 90s (async) | Cron J+30/90/180 |
| `INGEST_MCP_CONTEXT_TO_CAMPAIGN` | 15s | MCP roundtrip + classify |
| `MEASURE_OVERTON_SHIFT` | 120s (async) | Tarsis aggregation 60-day window |
| `EVALUATE_OVERTON_READINESS` | 8s | Sync pre-flight |
| `RECONCILE_CAMPAIGN_TO_ORACLE` | 180s (async) | Multi-section LLM rephrase proposals |
| `ENRICH_VARIABLE_BIBLE_FROM_CAMPAIGN` | 30s | Async extract typed entries |
| `EVALUATE_CREW_PERFORMANCE` | 15s | Sync per-member glory tool |
| `PROPOSE_SEQUENCE_PROMOTION_FROM_CAMPAIGN` | 5s | Sync flag |
| `RECOMPUTE_AGENCY_ACTIVITY_MARGINS` | 240s (async) | Cron weekly cross-tenants |
| `EVALUATE_RESOURCE_SATURATION` | 8s | Sync agency-wide read |
| `CHECK_CAMPAIGN_FIELD_OP_COMPLIANCE` | 3s | Sync country-scoped lookup |
| `SNAPSHOT_CREDENTIALS_CHAIN` | 2s | Sync snapshot |
| `PROPOSE_CREDENTIALS_ROTATION_AT_ARCHIVE` | 5s | Sync proposal |
| `AUDIT_CAMPAIGN_NEGATIVE_SPACE` | 20s | Sync cross-Neteru audit |

---

## 16. Matrice d'absorption des 8 risques structurels (via primitives §2.5)

**Reformulation v2** : ce qui était listé v1 comme *blockers structurels potentiels* devient en v2 des **points de passage séquencés**. Chaque risque est mappé à un cluster, traité par les 3 primitives §2.5, et **n'empêche jamais** la décision globale ni les autres clusters.

| # | Risque | Cluster | État cluster ship | Stratégie d'absorption (primitives §2.5) | ADR enfant éventuel |
|---|---|---|---|---|---|
| 1 | `MobileMoneyTransaction` model existence — tracking cash terrain MoMo | G (souveraineté) | Si absent → sous-cluster `momo-tracking` ship `STUB` (retour `DEFERRED_AWAITING_DEPS`). Si présent → ship `MVP`. **Reste de Cluster G ship `READY`** | `0052-G-momo-tracking.md` si modèle créé |
| 2 | `TarsisCaptureSession` model existence | D (signaux faibles) | Création modèle léger pré-vague 2 (`id, fieldOpId, capturedAt, signalsCount, payload Json`). Pas un blocker — préalable séquencé migration vague 2 PR 7 | Aucun (création modèle = scope vague 2 PR 7) |
| 3 | `CRMActivity` ≠ `CampaignContextIngest` | D (MCP context ingest) | Grep + read pre-vague 2 ; si recouvrement détecté → fusion via discriminator `CRMActivity.kind: 'CAMPAIGN_CONTEXT'` (pas de nouveau modèle). Sinon → nouveau modèle léger | Aucun (résolution par grep direct pre-PR) |
| 4 | Overton readiness algo non-trivial | D (overton-meter) | Vague 2 ship `MVP` heuristic (sentiment Tarsis 30j + saisonnalité sectorielle). Promotion `PRODUCTION` ultérieure avec algo sophistiqué | `0055-overton-algo.md` quand `MVP → PRODUCTION` |
| 5 | Postmortem 12 questions canon | E (postmortem) | Liste candidate dans `VARIABLE-BIBLE-CANON.md` proposée *pendant* la PR 15 vague 3, validation opérateur au merge. Sous-cluster ship `MVP` avec 12q v1, promotion `PRODUCTION` après itération | `0056-postmortem-12q.md` quand canon stabilisé |
| 6 | Multi-tenant anonymization RGPD | F (économie agence) | k-anonymity (k≥5 tenants par bucket) + data lake séparé `agency-economics-aggregates` jamais joiné aux strategy IDs. Pattern non-désanonymisable par construction. Sous-cluster ship `MVP` (k=5 fixe), promotion `PRODUCTION` avec k paramétrable + audit RGPD | `0058-anonymization.md` (avant `MVP → PRODUCTION`) |
| 7 | MCP entrant confidentialité PII | D (context ingest) | Opt-in explicite founder + Glory tool `mcp-content-pii-classifier` (filtre PII pré-ingest, refus stockage si détection). Pattern Credentials Vault. Sous-cluster ship `MVP` avec classifier baseline, promotion `PRODUCTION` après ROC analysis | Aucun (pattern ADR-0021 réutilisé) |
| 8 | Imhotep Académie crew loop scoring grille 12 dimensions | E (crew-loop) | Grille = entrée variable-bible parallélisable avec PR 14 (owner Imhotep team). Sous-cluster ship `STUB` initialement, `MVP` une fois grille publiée. Pas un blocker structurel | `0057-crew-scoring.md` si grille évolue post-MVP |

**Lecture méta** :
- 6/8 risques sont des **deps de spec/data** (résolvables par travail séquencé via primitive #2 STUB→MVP→PRODUCTION)
- 2/8 sont des **risques architecturaux** (#4 Overton algo, #6 anonymisation multi-tenant) — pour les deux, le pattern `STUB → MVP → PRODUCTION` permet de shipper sans attendre la perfection

**Aucun risque ne bloque la décision globale §2.** Cherry-picking partiel par cluster est légitime puisque L2 est strictement lecture/orchestration sur L1 (§2.5 garantie de découplage).

## 16-bis. Open work (suivi vague par vague)

Chaque vague §13 ouvre/ferme les passages séquencés ci-dessus. Tracker dans [RESIDUAL-DEBT.md](../RESIDUAL-DEBT.md) §Phase 19 :

- Vague 1 fermée : risques #4 mvp + #5 spec déclenchés (preview)
- Vague 2 fermée : risques #2 + #3 résolus, #4 mvp shipped, #7 mvp shipped
- Vague 3 fermée : risques #1 + #5 + #6 mvp + #8 stub→mvp shipped
- Post-vague 3 : promotions `MVP → PRODUCTION` au fil des ADRs enfants

---

## 17. Documents à propager (matrice anti-drift)

À mettre à jour simultanément à la fusion finale du méga-ADR (NEFER protocole Phase 6) :

- [CLAUDE.md](../../../CLAUDE.md) — section Phase status : ajouter Phase 19
- [LEXICON.md](../LEXICON.md) — entrées `campaign-tracker`, `tier delta`, `myth arc`, `cult index delta`, `overton readiness`, `negative space audit`
- [INTENT-CATALOG.md](../INTENT-CATALOG.md) — 19 nouveaux Intent kinds documentés
- [PAGE-MAP.md](../PAGE-MAP.md) — 6 nouvelles pages
- [SERVICE-MAP.md](../SERVICE-MAP.md) — `campaign-tracker` service + 8 sous-modules
- [ROUTER-MAP.md](../ROUTER-MAP.md) — `campaign-tracker` router (3–4 procedures)
- [APOGEE.md](../APOGEE.md) — §3 (Lois) référence Cluster A enforcement
- [PANTHEON.md](../PANTHEON.md) — §coordination cross-Neteru pattern (référence campaign-tracker comme exemple Mestor dispatcher)
- [REFONTE-PLAN.md](../REFONTE-PLAN.md) — Phase 19 ajoutée
- [CODE-MAP.md](../CODE-MAP.md) — auto-régénéré pre-commit (entités + Intent kinds + pages)
- [VARIABLE-BIBLE-CANON.md](../VARIABLE-BIBLE-CANON.md) — entrées seuils numériques (§14 §test 2)
- [MISSION.md §4](../MISSION.md) — drift test : Cluster A→H référencés comme contributions explicites aux mécanismes pivots
- [MANIPULATION-MATRIX.md](../MANIPULATION-MATRIX.md) — référence `MANIPULATION_COHERENCE_PER_ACTION` gate
- [CHANGELOG.md](../../../CHANGELOG.md) — v6.19.0 entry

---

## 18. ADRs liés

- [ADR-0001](0001-framework-name-apogee.md) — Framework APOGEE (3 Lois mobilisées Cluster A)
- [ADR-0005](0005-hash-chain-immutability.md) — Hash chain immutability (intent log Cluster G)
- [ADR-0006](0006-pillar-6-cost-gate.md) — Cost gate (Loi 3 Cluster A)
- [ADR-0009](0009-neter-ptah-forge.md) — Ptah forge (réutilisé Cluster B livrables)
- [ADR-0012](0012-brand-vault-superassets.md) — BrandAsset (BigIdea snapshot Cluster B)
- [ADR-0014](0014-oracle-35-framework-canonical.md) — Oracle 35 sections (réconciliation Cluster E)
- [ADR-0019](0019-imhotep-full-activation.md) — Imhotep (Cluster E crew loop, F resource saturation)
- [ADR-0020](0020-anubis-full-activation.md) — Anubis (Cluster G credentials, MCP entrant Cluster D)
- [ADR-0021](0021-external-credentials-vault.md) — Credentials Vault (Cluster G chain of custody)
- [ADR-0023](0023-operator-amend-pillar.md) — Operator amend pillar (Cluster E réconciliation)
- [ADR-0026](0026-mcp-bidirectional-anubis.md) — MCP bidirectionnel (Cluster D context ingest)
- [ADR-0037](0037-country-scoped-knowledge-base.md) — Country-scoped (Cluster G compliance multi-marché)
- [ADR-0038](0038-apogee-anti-drift-phase-16-bis.md) — Cap APOGEE 7/7 (préservé)
- [ADR-0039](0039-sequence-as-unique-public-unit.md) + [ADR-0042](0042-sequence-modes-and-lifecycle.md) — Sequences DRAFT→STABLE (Cluster E auto-spawn)
- [ADR-0043](0043-budget-decoupled-from-campaigns.md) — Budget découplé (Cluster A fuel ne dépend pas de Campaign budget)
- [ADR-0044](0044-quality-gate-before-active-promotion.md) — Quality gate (réutilisé Cluster B promotion criteria)
- [ADR-0046](0046-cult-index-no-magic-fallback.md) — Cult Index null-honest (Cluster B snapshot pré/post sans fabrication)
- [ADR-0047](0047-devotion-ladder-vs-brand-classification.md) — Devotion Ladder vs Brand Classification (Cluster A tierBrand vs Cluster C devotionRung — séparation type-level)
- [ADR-0048](0048-glory-tools-as-primary-api-surface.md) — Glory tools API surface (5 nouveaux Glory tools alignés)
- [ADR-0049](0049-brief-mandatory-gate.md) — Brief gate (réutilisé pre-flight Campaign LIVE)
- [ADR-0050](0050-output-first-deliverable-composition.md) — Pattern orchestrateur (`deliverable-orchestrator` modèle de référence pour `campaign-tracker`)
- [ADR-0051](0051-rtis-cascade-canonical-path.md) — Cascade RTIS (Cluster E réconciliation respecte la cascade)

---

## 19. Notes de revue (v2 simplifiée)

**Décision globale §2** = upgrade architectural natif (pas pivot de mission). Validation conceptuelle attendue. Une fois acceptée :

- **Cherry-picking partiel par cluster est légitime** (L2 est strictement lecture/orchestration sur L1, garantie §2.5).
- Chaque cluster peut être skip / différer / extraire en ADR enfant `0052-X.md` sans renégocier le chapeau.
- Chaque sous-cluster ship en `STUB` / `MVP` / `PRODUCTION` selon état des dépendances (§2.5 primitive #2).
- Aucune des 8 risques structurels §16 ne bloque la décision globale (matrice d'absorption).

**Pas de tout-ou-rien** : la v1 §19 imposait un superseded en bloc en cas de rejet. La v2 §16 matrice d'absorption permet d'arbitrer cluster-par-cluster sans drift de cohérence — chaque cluster est testé contre `tests/unit/governance/campaign-tracker-cluster-coverage.test.ts` (§14 §test 5) qui assure cohérence des clusters activés.

**Transparence radicale** : l'auteur (NEFER) signale que la formulation v1 ("pivot de mission") était maladroite. La mission [MISSION.md §4](../MISSION.md) reste inchangée — *transformer des marques en icônes culturelles, en industrialisant l'accumulation de superfans qui font basculer la fenêtre d'Overton*. L2 instrumente les **mécanismes pivots** (production d'évangélistes, déplacement Overton, cohérence culte) qui étaient sous-mesurés en L1 seul. C'est de l'**aiguisement de la mission**, pas un pivot.
