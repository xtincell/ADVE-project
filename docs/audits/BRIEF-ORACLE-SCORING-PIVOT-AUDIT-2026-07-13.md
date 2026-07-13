# Audit ground-truth — Brief → Livrable (Oracle) · Scoring & calibration · Superfan × Overton et provenance des données

- **Date** : 2026-07-13
- **Repo au moment de l'audit** : `main` @ `db7afc7` (v6.27.118)
- **Mandat opérateur** : auditer (1) le processus Brief → livrable avec l'Oracle comme livrable le plus complexe, (2) ses dépendances — le système de scoring et sa calibration, (3) le suivi superfan × Overton « sur la base de vraies interactions et d'impact sociaux collectés via les connecteurs sociaux et outils de veille ». Carte blanche : si des trous existent, préparer le terrain et faire le mieux.
- **Méthode** : lecture du code réel exclusivement (pas de confiance à la doc), 3 passes d'exploration exhaustives (~240 lectures/greps outillés), croisement systématique avec `RESIDUAL-DEBT.md` et `PROPAGATION-MAP.md` pour distinguer dette **tracée** et drift **non tracé**. Références en `fichier:ligne` (état `db7afc7`).
- **Échelle de verdict** : **SOLIDE** (mécanique réelle, gouvernée, honnête) · **PARTIEL** (réel mais incomplet/à trous) · **TROU** (absent, mort ou mensonger).
- **Échelle de provenance** : **RÉEL-BRANCHÉ** (donnée mesurée consommée par la mécanique) · **RÉEL-ORPHELIN** (donnée mesurée collectée mais consommée par personne pour cette mécanique) · **MANUEL** (saisie opérateur) · **MOCKÉ** (placeholder) · **VIDE** (aucune source).

---

## 0. Synthèse exécutive

**La colonne vertébrale documentaire est saine ; la colonne vertébrale de mesure ne l'est pas.**

1. **Brief → Oracle : SOLIDE.** Le brief de production est une projection 100 % déterministe du noyau ADVE qui trace honnêtement ses lacunes ; la gate « pas d'action sans brief » est branchée ; l'Oracle compile ses 35 sections **sans aucun LLM** (21 mappers purs + 14 composers déterministes), avec lifecycle propre, assembleur manual-first et PDF vivant. C'est le livrable le plus robuste du système.
2. **Scoring structurel : SOLIDE.** Formule canon figée (ADR-0102), zéro LLM, échelle /200 → 6 paliers, cibles d'évidence conscientes de l'échelle de marché (ADR-0126).
3. **Mécaniques pivot (superfans × Overton) : PARTIEL grave.** Le système collecte **quotidiennement** de la vraie donnée sociale (followers, posts + engagement, commentaires avec identités d'auteurs, ventes Shopify, veille RSS — ADR-0128/0132/0133) et l'affiche dans des dashboards honnêtes. **Mais aucune de ces données ne nourrit les mécaniques pivot** : le cult index, la devotion ladder, les superfans et 3 des 4 bras du plafond d'évidence CULTE/ICONE tournent sur des saisies manuelles et des seeds. La chaîne d'attribution superfan (Phase 19 + 23) est **structurellement morte** — son champ d'entrée n'a aucun écrivain. Deux ponts Overton sont **codés, testés, et jamais appelés**.
4. **Ce qui est déjà réel côté pivot** : le radar Overton lit de la vraie presse RSS (Tarsis dé-mocké le 2026-06-14 — la doc registre ne le sait pas encore) ; la cohorte CRM est réelle mais credential-gated (posture ship-without-keys correcte).

**Décision de remédiation (cette PR)** : brancher le circuit de mesure réel — écrivain de production `CommunitySnapshot`, devotion sur audience réelle, mise à jour des superfans connus depuis l'inbox + file de candidats à revue humaine, caller du pont RSS→axe Overton, câblage du signal Overton réel dans l'Oracle §34 — plus la cascade de staleness Oracle et l'hygiène des registres. Détail en §5.

---

## 1. Partie I — Chaîne Brief → Forge → Livrable → Oracle

### 1.1 Naissance d'un brief — **SOLIDE**

Trois objets « brief » distincts, aucun confondu :

| Objet | Rôle | Production |
|---|---|---|
| `CampaignBrief` | brief de production (gate ADR-0049) | **100 % déterministe, zéro LLM** — `buildCampaignBrief()` (`src/server/services/campaign-manager/brief-builder.ts:295-334`) projette le noyau ADVE (piliers a/d/v/e) + campagne + action déclenchante |
| `ParsedBrief` | brief client entrant (PDF/DOCX, entrée A2) | LLM-extrait → `Hyperviseur.buildBriefIngestPlan` seed l'ADVE (`brief-ingest/index.ts:33-88`) — chemin brief→ADVE, pas l'inverse |
| `BrandAsset.kind=CREATIVE_BRIEF` | brief créatif vault | Glory tools brief-only, accepté par la gate via `activeBriefId` |

- Doctrine LOI 9 respectée : un champ dérivé d'un pilier vide est **omis** et tracé dans `meta.gaps` (`createAdveProjector`, `brief-builder.ts:121-136`) — jamais inventé. Seuls textes constants tolérés = faits de process OS (`CANONICAL_PROCESS:77-82`).
- Gate ADR-0049 : `assertCampaignHasBrief()` (`campaign-manager/brief-gate.ts:86-103`) refuse action/mission/forge sans brief ni `activeBriefId`.

### 1.2 Brief → Forge (Ptah) — **SOLIDE (gouvernance) / PARTIEL (providers sans clés)**

- `materializeBrief()` (`ptah/index.ts:59-205`) : pré-flights `ensurePillarSource` + `checkManipulationCoherence` (seuil 0.05, tolérant si mix null) + gate budget Thot + sélection provider + `GenerativeTask` async.
- Gate C6 `BRIEF_VS_ADVE_COHERENCE` (ADR-0103) : déterministe (recouvrement de vocabulaire, zéro LLM), verdict WARN non-bloquant, câblée pre-flight sur `PTAH_MATERIALIZE_BRIEF` (`mestor/gates/brief-vs-adve-coherence.ts:77-113`). BLOCK + UI override = Phase 24 (tracé).
- Providers : **image/icône = OpenAI exclusif sans fallback** (`provider-selector.ts:14-29`, décision opérateur 2026-06-30) — sans `OPENAI_API_KEY` la forge **DIFFÈRE** honnêtement (`AWAITING_CREDENTIALS`, ADR-0021). **Magnific `isAvailable()` retourne toujours `true`** et, sans `FREEPIK_API_KEY`, simule un webhook après 5 s avec des **placeholders publics** (`picsum.photos`, BigBuckBunny — `providers/magnific.ts:169-207`). Posture mock assumée mais à connaître : en environnement sans clés, refine/transform/video/audio rendent des placeholders, pas un DEFERRED.

### 1.3 Deliverable Forge output-first (ADR-0050) — **TROU MAJEUR (moitié construite, non tracée)**

- Le resolver DAG (`deliverable-orchestrator/resolver.ts:39-98` — BFS + cycles + tri topo sur `forgeOutput.requires`), le vault-matcher (ACTIVE_REUSE / STALE_REFRESH / MISSING_GENERATE, `vault-matcher.ts:27-77`) et le target-mapping (9 kinds cibles) sont réels et purs.
- **MAIS le composer est figé en mode PREVIEW** (`composer.ts:112-126`) : `operatorId`, `campaignId`, `overrideManipulationMode`, `previewOnly` sont `void`és ; le mode DISPATCHED documenté (GlorySequence runtime → sequence-executor → émissions `INVOKE_GLORY_TOOL`/`PTAH_MATERIALIZE_BRIEF`/`PROMOTE_BRAND_ASSET_TO_ACTIVE`) est annoncé « commit 4 » et **n'existe pas**. `COMPOSE_DELIVERABLE` ne déclenche jamais un forge. La forge réelle ne passe QUE par `PTAH_MATERIALIZE_BRIEF` direct.
- Tracé uniquement en commentaire de code — absent de RESIDUAL-DEBT. → **T3, tracé au registre par cette PR ; dispatch = chantier dédié futur.**

### 1.4 Oracle 35 sections — **SOLIDE**

- `SECTION_REGISTRY` (`strategy-presentation/types.ts:132-187`) : 35 sections / 3 tiers (23 CORE · 7 BIG4_BASELINE · 5 DISTINCTIVE).
- **§01-21 = PURE_MAPPER (0 LLM)** : données Strategy live (`oracle-section/handler.ts:293-352`).
- **§22-35 = runners LLM avec fallback COMPOSE déterministe systématique** (ADR-0091) : 14 composers réels (`deterministic-composers.ts:643-658`), writeback BrandAsset canonique même après succès LLM (`handler.ts:398-432`), `{}` honnête si source absente.
- Lifecycle first-class : lock optimistic token+TTL 25 s, `staleAt` clear on success, lazy-seed idempotent (`oracle-section/index.ts:139-231,259`).
- `ASSEMBLE_ORACLE` manual-first (émissions `GENERATE_ORACLE_SECTION` × N via spine, jamais d'appel LLM direct — test HARD), streaming NSP SSE 6 événements, page proposition câblée `oracle.assembleOracle`.
- Legacy `enrichOracle` : **déposé et supprimé** (ADR-0125) — vérifié, le fichier n'existe plus.
- PDF (ADR-0016) : **vivant** (`export-oracle.ts`, jsPDF + snapshot SHA256 idempotent) mais le corps de section est un `JSON.stringify` pretty (`sectionDataToBody:52-61`) — fonctionnel, pas un document mis en forme. → **T15 (mineur, déféré)**.

### 1.5 Fraîcheur / staleness — **PARTIEL**

- `writePillarAndScore` (`pillar-gateway/index.ts:640-673`) appelle `markAllSectionsStale` (invalidation en bloc COMPLETE→STALE des 35 sections) — le commentaire admet réparer une « cascade MORTE ».
- **Trous** : (a) `markSectionsStale` **ciblé = code mort** (`oracle-section/index.ts:360-377`, zéro caller) ; (b) le **`writePillar` nu ne cascade pas** — callers légitimes (intake C1, infer-needs-human C2, + `ingestion-pipeline/ai-filler.ts:448` qui échappe au test HARD `no-bare-writepillar` via l'alias `writePillar: writePillarRTIS`) laissent l'Oracle non invalidé ; (c) **aucun refresh automatique** des sections STALE (aucun cron) — atténué par le fait que les §01-21 sont lues live au rendu et les §22-35 recomposées read-time. → **T4/T5/T6, remédiés (cascade+évasion) / tracés (refresh auto) par cette PR.**

### 1.6 Données nourrissant l'Oracle — **PARTIEL**

| Section | Source réelle | Verdict |
|---|---|---|
| §01/§15/§16 (mappers) | `cultIndexSnapshots[0]` / `devotionSnapshots[0]` (`section-mappers.ts:77-78,538-539,1464`) | RÉEL-BRANCHÉ (mais voir Partie III : ces snapshots sont eux-mêmes manuels/seed) |
| §31 Cult Index / §33 Devotion | snapshots (`deterministic-composers.ts:499-521,555-586`), `{}` sinon | RÉEL-BRANCHÉ (même réserve) |
| §32 Manipulation Matrix | `Strategy.manipulationMix` OU mix uniforme 0.25 implicite | tracé H3 |
| §34 Overton — axes | texte piliers S (`fenetreOverton`) + D (`positionnement`) (`deterministic-composers.ts:588-617`) | MANUEL (déclaré) |
| **§34 Overton — `realSignal`** | `buildOvertonRealSignalForOracle` (`overton-real-signal.ts:80`) — défini, testé, **ZÉRO caller production** ; l'UI le rend pourtant (`phase13-sections.tsx:901-911`) | **RÉEL-ORPHELIN → T1, remédié par cette PR** |
| §35 Tarsis | `Strategy.signals` type TARSIS/WEAK — **seed-only** en prod | VIDE en prod |
| §09 Signaux | signaux/activations réels, MAIS `mestorInsights: []` et `seshatReferences: []` **hardcodés** (`section-mappers.ts:1285-1286`) | **stubs mensongers → T2, remédié (suppression) par cette PR** |
| Pilier T (digest marché) | `loadMarketDigestForT` injecte le digest RSS réel (C8 clos) | RÉEL-BRANCHÉ (via pilier, pas directement Oracle) |

### 1.7 Séquences — **PARTIEL (stagnation lifecycle)**

3 séquences STABLE sur 94 (91 DRAFT, dont les 24 wrappers `WRAP-FW-*` générés DRAFT en dur) ~2 mois après l'échéance de promotion D+30. Quality gate désormais dynamique HARD/SOFT (auto-promotion ADR-0066) — mais la promotion ne franchit pas la barre ou ne tourne pas. → **T14, tracé au registre par cette PR.**

> **Diagnostic définitif (bloc E, [ADR-0139](../governance/adr/0139-sequence-lifecycle-stub-honest-diagnosis.md))** : la cause déterminante n'est ni la barre ni le cron, mais que le handler `PROMOTE_SEQUENCE_LIFECYCLE` (`commandant.ts`) est un **STUB qui ne persiste rien** — le `lifecycle` vit dans le code (`sequences.ts`), lu tel quel par `listDraftSequences`/`getStaticLifecycle`. Même live, aucune promotion ne déplacerait le compte (store `SequenceLifecycleState` / Chantier D-bis jamais construit). S'ajoutent : cron en dry-run (secondaire) + barre d'éligibilité qui refuse — à raison — les séquences jamais exercées (les composers déterministes ADR-0091 ont remplacé les séquences comme chemin runtime). **Réalité fonctionnelle** : DRAFT ≠ défaut (`sequence-hash.ts:65` — la séquence s'exécute identiquement ; STABLE n'ajoute que le gel du prompt). **Décision** : promotion de masse **refusée** (certifier « stress-testé » du code non exercé = inflation malhonnête, posture T9) ; seul correctif shippé = le stub ne rapporte plus de promotion fantôme (`persisted:false → SKIP`, `totalPromoted` honnêtement 0). T14 requalifié « diagnostiqué — pas d'action ».

---

## 2. Partie II — Scoring & calibration

### 2.1 Score structurel ADVE — **SOLIDE**

- `src/lib/utils/scoring.ts` : `STRUCTURAL_WEIGHTS {atoms:15, collections:7, crossRefs:3}` (canon figé ADR-0102, test bloquant `scoring-base-canon`), `scorePillarStructural` pur, plafond pilier /25, composite /200. Zéro LLM (LOI 9), `applyQualityModulator` retiré.
- Chokepoint unique : `writePillarAndScore` (pillar-gateway) — toute écriture pilier score par là (test HARD C5).

### 2.2 Tier & échelle de marché — **SOLIDE**

- `src/domain/brand-tier.ts` : 6 paliers LATENT→ICONE, bornes /200 {40/80/120/160/180}, `classifyTier` pur, alias legacy ZOMBIE confiné à `normalizePalier`.
- `src/domain/market-scale.ts` (ADR-0126) : cibles d'évidence par échelle déclarée (QUARTIER 50/5 → MONDE 8000/40, NATION = constantes historiques — continuité Loi 1), saturation densité 5 % de l'adressable bornée, suggestion d'audience depuis **relevés réels** (somme + plus grand réseau, jamais d'estimation inventée), référentiel affiché avec le palier.

### 2.3 Plafond d'évidence CULTE/ICONE — **PARTIEL (3 bras sur 4 sans mesure réelle)**

`computeEvidenceScore` (`advertis-scorer/index.ts:207-249`) plafonne CULTE/ICONE par : superfans trackés (0.45) + cult composite (0.30) + âge de marque déclaré (0.10) + signaux Tarsis (0.15). Or :
- `SuperfanProfile` = **MANUEL** (voir 3.1) ;
- `CultIndexSnapshot.compositeScore` = dérivé de manuel/seed (voir 3.2) ;
- `Signal` type TARSIS = **seed-only** (aucun writer prod) ;
- seul l'âge déclaré est fiable.

Le plafond anti-inflation **fonctionne** (il refuse CULTE/ICONE sans évidence), mais l'évidence elle-même ne peut pas venir de la mesure — uniquement de la saisie. → adressé par les ponts V2-V4 de cette PR (la mesure réelle nourrit superfans + cult), sans toucher la formule du plafond.

### 2.4 Cult index — formule saine, entrées mortes — **PARTIEL**

`calculateAndSnapshot` (`cult-index-engine/index.ts:87-209`) : 7 dimensions pondérées {engagementDepth 25 %, superfanVelocity 20 %, communityCohesion 15 %, brandDefenseRate 15 %, ugcGenerationRate 10 %, ritualAdoption 10 %, evangelismScore 5 %}, renormalisation sur dimensions disponibles (ADR-0126 — l'absence de mesure n'est pas un zéro), fix d'unités devotion→cult appliqué, annotation `preUnitsFix` sur l'historique.
- `ugcGenerationRate` : **hardcodé 0 et exclu** (« No social data integration wired », `:124`) — décision maintenue par cette PR (voir §5, B2) car les mentions ne sont jamais remplies par le connecteur et toute normalisation serait une constante inventée.
- `communityCohesion` : lit `CommunitySnapshot.health`… qui n'a **aucun écrivain de production** (seeds uniquement — `prisma/seed.ts:929`, `seed-demo.ts:1038`, `seed-wakanda/25-community.ts`) → **VIDE en prod. Remédié par cette PR (V2).**
- Lecteur non borné : moyenne `communitySnapshots` sur **tout l'historique** (`:96`) — avec un écrivain quotidien la moyenne se figerait ; **borné ≤90 j par cette PR.**
- Incohérence d'unités entre lecteurs : cult lit `health` en fraction (`health*100`, `:119`) — cohérent seeds ; devotion lisait `activeRate` en pourcentage (`activeRate/100`, `devotion-engine:139`) — incohérent. **Unités canoniques fractions 0-1 fixées par cette PR (ADR-0134).**

### 2.5 Devotion engine — **MANUEL (dérivé)**

`calculateDevotion` (`devotion-engine/index.ts:63-195`) : classe les `SuperfanProfile` par `engagementDepth` (seuils 0.10/0.25/0.45/0.65/0.85), boosts missions/reviews/signaux internes, boost CommunitySnapshot (bugué — unités) ; distribution en **pourcentages entiers** ; score pondéré /100 ; momentum vs snapshot précédent. **Aucune entrée sociale réelle** (jamais `SocialPost` ni `FollowerSnapshot`). `calculateAndSnapshot` n'a d'ailleurs **aucun déclencheur de production** (seuls writers DevotionSnapshot : mutation manuelle `devotionLadder.snapshot` + `reconcileAmbassadors` + seeds). → **Remédié par cette PR (V3 + chaîne quotidienne V2).**

### 2.6 Attribution superfan & calibration — **chemin sain, données structurellement absentes — TROU**

- Régression logistique pure-TS (Story 4.2, `superfan-attribution.ts`) : 3 features canoniques {intercept, `bigIdeaCoherenceScore` (réel, écrit par la gate cohérence LLM `coherence.ts:206`), `normalizedBudget` (manuel)} ; label = `devotionTransitionsObserved` contient une transition vers EVANGELISTE ; `MIN_SAMPLES_REQUIRED_DEFAULT = 30`.
- `RUN_ATTRIBUTION_CALIBRATION` (`calibration.ts`) : AUTO ou MANUAL_COEFFICIENTS, ROC AUC + RMSE, snapshot versionné = payload d'IntentEmission (P22-6), INSUFFICIENT_DATA explicite jamais fabriqué, seuils déclaratifs `{rocAucMin: 0.7, rmseMax: 0.3}` à sign-off direction (tracé RESIDUAL-DEBT), gate Mestor `calibration-snapshot-required` refuse la promotion PRODUCTION sans snapshot.
- **MAIS `CampaignAction.devotionTransitionsObserved` n'a AUCUN écrivain** — nulle part (grep exhaustif : uniquement des `select`). Toute la chaîne (attribution Phase 19 `recomputeSuperfanAttribution`, régression Phase 23, `extractLineage`, `evangelistCount`, `getFounderAttributionLineage`) lit un champ structurellement vide → INSUFFICIENT_DATA permanent (0/30), lineage `[]`, compteur 0. La dette registre (« requiert l'API cohorte CRM ») sous-estime le trou : même avec le CRM branché, rien n'écrit ce champ. → **T7. NON remédié en code par cette PR (fabriquer des labels violerait l'interdit no-invented-data) ; design de dérivation honnête tracé au registre.**
- Cohorte CRM (Story 4.3) : `fetchCohortSignal` (`crm-provider.ts:140`) lit des `CrmContact` **réels**, PII hachée SHA-256 hardcodée, DEFERRED sans credential, DEGRADED si cohorte < 30. **RÉEL-BRANCHÉ (credential-gated — posture correcte).**

### 2.7 Rulers & 8 dimensions

- Rulers déterministes ADR-0090 (`notoria/rulers.ts` + `preview-impact.ts`) : gate de remplacement pondéré par champ ADVE + preview d'impact — branchés, sains, hors périmètre de remédiation.
- Score multi-dimensions ADR-0086 (8 dimensions canoniques) : **doctrine-only** — aucune implémentation (closure-target #15, Phase 24). Conforme au tracé, rien à corriger ici.

---

## 3. Partie III — Superfan × Overton : provenance des données

### 3.1 Ce que le système collecte AUJOURD'HUI (tout est réel et quotidien)

| Donnée | Modèle | Writer production | Cadence |
|---|---|---|---|
| Connexions OAuth | `SocialConnection` | `ANUBIS_SOCIAL_CONNECT_ACCOUNT` (`social-connect.ts:461`) | à la connexion |
| Followers (+ delta) | `FollowerSnapshot` | `ANUBIS_SOCIAL_SYNC_FOLLOWERS` — Graph API réel FB/IG (`social-connect.ts:511,826`) ; manuel console ; Apify intake | **quotidien** (cron `social-sync`) |
| Publications + engagement | `SocialPost` (likes/comments/shares/reach, `insights` scope-gated) | `ANUBIS_SYNC_SOCIAL_POSTS` (`syncStrategySocialPosts`, `social-connect.ts:1008`) + `social-insights.ts` | quotidien |
| **Interactions de tiers (identités)** | `SocialInboxItem` (authorHandle/authorExternalId/texte/sentiment) | `ANUBIS_SYNC_INBOX` (`social-inbox.ts`, ADR-0133) | quotidien |
| Ventes | `Signal type=COMMERCE_METRICS` | `ANUBIS_SYNC_COMMERCE` (`commerce-connect.ts:238`, Shopify) | quotidien |
| Veille presse | `KnowledgeEntry EXTERNAL_FEED_DIGEST` | `seshat/external-feeds/` (RSS réels) | cron `external-feeds` |
| Contacts CRM | `CrmContact` | crm-engine | — |

### 3.2 Table de provenance par mécanique pivot (le cœur de l'audit)

| Mécanique pivot | Entrées réelles au moment de l'audit | Verdict | Remédiation |
|---|---|---|---|
| Devotion ladder (`DevotionSnapshot`) | `SuperfanProfile` (manuel) + boosts missions/reviews internes + CommunitySnapshot (seed) ; **aucun déclencheur prod** | **MANUEL** | **V2+V3 : audience réelle (followers/inbox) + chaîne quotidienne** |
| Cult index — `engagementDepth`/`ritualAdoption`/`evangelismScore` | DevotionSnapshot (ci-dessus) | **MANUEL (dérivé)** | V2+V3 (par ricochet) |
| Cult index — `communityCohesion` (15 %) | `CommunitySnapshot` **seed-only, aucun writer prod** | **VIDE** | **V2 : écrivain de production réel** |
| Cult index — `ugcGenerationRate` (10 %) | hardcodé 0, exclu | **VIDE (honnête)** | B2 : exclusion **maintenue** (mentions jamais collectées) + trace |
| Cult index — `superfanVelocity`/`brandDefenseRate` | `SuperfanProfile` (manuel) | **MANUEL** | **V4 : mise à jour des profils connus depuis l'inbox réelle + candidats** |
| Naissance superfans | `SESHAT_REGISTER_SUPERFAN` opérateur (single-writer HARD, anti-inflation) | **MANUEL (par doctrine)** | V4 : reste humaine (1 clic) — candidats **détectés** depuis les vraies interactions |
| Attribution (features) | `bigIdeaCoherenceScore` réel · `budget` manuel | PARTIEL | — |
| Attribution (labels) + evangelist lineage | `devotionTransitionsObserved` : **AUCUN writer** | **VIDE (structurel)** | T7 : design tracé, PAS de fabrication |
| Cohorte / rétention | `CrmContact` réels via façade PII-redacted | **RÉEL-BRANCHÉ** (credential-gated) | — |
| Overton radar — axe secteur | `SectorPolityAxis`/`Sector` : saisie `SESHAT_UPSERT_POLITY_AXIS` ; **table `Sector` sans aucun writer** ; pont RSS→axe `bridgeTarsisToSectorIntelligence` (`signals-culture.ts:703`) **codé+testé, zéro caller** | **MANUEL / RÉEL-ORPHELIN** | **V5 : registre Sector + caller du pont (cron external-feeds)** |
| Overton radar — `unpaidPress` | digests RSS réels via Tarsis **dé-mocké 2026-06-14** (`tarsis/connector.ts:64`) | **RÉEL-BRANCHÉ** | (doc registre périmée → V0) |
| Overton radar — `vocabularyOverlap`/`embeddingDelta` | non calculés (embeddings requis) | VIDE (honnête) | déféré (tracé) |
| Overton delta campagne | `overtonDeltaManual` (opérateur) ; `overtonHypothesis`/`overtonObserved` **jamais écrits** | **MANUEL** | tracé |
| Oracle §34 `realSignal` | builder orphelin (voir 1.6) | **RÉEL-ORPHELIN** | **V6 : câblage dans le composer** |
| Plafond d'évidence CULTE/ICONE | 3 bras sur 4 manuels/vides (§2.3) | **MANUEL/VIDE** | V2-V4 par ricochet |
| Dashboards founder (communauté, suivi du jour) | followers/posts/ventes réels — silos honnêtes, EmptyStates | RÉEL-BRANCHÉ (affichage seulement) | — |

**Lecture** : la seule couture réel→pivot vivante avant cette PR était `unpaidPress` (radar) + la cohorte CRM (gated). Tout le reste de la mesure pivot était soit manuel, soit vide, soit orphelin — pendant que les vraies interactions dormaient dans `SocialPost`/`SocialInboxItem`/`FollowerSnapshot`/`Signal`.

---

## 4. Partie IV — Trous consolidés : tracés vs non tracés

### 4.1 Déjà tracés au registre (conformes — rien à faire ici)
Forge DEFERRED sans clés (ADR-0021) · C6 advisory-only (Phase 24) · H3 mix 0.25 · H6 plafond par-design · H7 NPS proxy · seuils calibration à sign-off direction + promotion PRODUCTION gated (RESIDUAL-DEBT §Phase 23) · App Review 2ᵉ soumission (ADR-0128) · vocabularyOverlap/embeddings · ADR-0086 impl Phase 24.

### 4.2 NON tracés (découverts par cet audit)

| # | Trou | Localisation | Sort |
|---|---|---|---|
| T1 | `buildOvertonRealSignalForOracle` orphelin (§34 `realSignal` jamais peuplé, branche UI morte) | `overton-real-signal.ts:80` | **Remédié V6** |
| T2 | §09 `mestorInsights`/`seshatReferences` hardcodés `[]` (promesse de type mensongère) | `section-mappers.ts:1285-1286` | **Remédié V0 (suppression)** |
| T3 | `COMPOSE_DELIVERABLE` figé PREVIEW — dispatch ADR-0050 inexistant | `deliverable-orchestrator/composer.ts:112-126` | **Tracé V0** (chantier dédié futur) |
| T4 | `markSectionsStale` ciblé = code mort | `oracle-section/index.ts:360-377` | **Remédié V1 (dépose)** |
| T5 | `writePillar` nu ne cascade pas la staleness Oracle (+ évasion `ai-filler` au test HARD no-bare) | `pillar-gateway/index.ts` · `ai-filler.ts:448` | **Remédié V1** |
| T6 | Aucun refresh auto des sections STALE | — | **Tracé V0** |
| T7 | `devotionTransitionsObserved` : aucun writer — attribution/lineage structurellement morts | `CampaignAction` | **Tracé V0** (design de dérivation honnête ; pas de fabrication) |
| T8 | `CommunitySnapshot` seed-only (communityCohesion vide en prod) | `prisma/seed*` | **Remédié V2** |
| T9 | `Signal` TARSIS seed-only (bras plafond vide) | — | **Tracé V0** (dérive partielle via V5) |
| T10 | `bridgeTarsisToSectorIntelligence` sans caller + table `Sector` sans writer | `signals-culture.ts:703` | **Remédié V5** |
| T11 | Docs registre périmées : Tarsis encore décrit `_mocked`/contract-gated (dé-mocké 2026-06-14) | `PROPAGATION-MAP.md` H4 · `RESIDUAL-DEBT.md:60` | **Remédié V0** |
| T12 | RESIDUAL-DEBT contradictoire : § « cohabitation enrichOracle » vs dépose ADR-0125 (même fichier) | `RESIDUAL-DEBT.md:129-135` | **Remédié V0** |
| T13 | Refs « ADR-0037 » périmées (canon = ADR-0050) | `deliverable-orchestrator/*` (6 fichiers) | **Remédié V0** |
| T14 | 91/94 séquences DRAFT ~2 mois après l'échéance de promotion | `sequences.ts` | **Tracé V0** |
| T15 | PDF Oracle = dump JSON brut par section | `export-oracle.ts:52-61` | **Tracé V0** (qualité, mineur) |
| T16 | Incohérence d'unités CommunitySnapshot entre lecteurs (fraction vs pourcentage) | `devotion-engine:139` vs `cult-index:119` | **Remédié V2/V3 (canon fractions + ADR-0134)** |
| T17 | Devotion : aucun déclencheur de production (`calculateAndSnapshot` sans caller prod) | `devotion-engine/index.ts:200` | **Remédié V2 (chaîne quotidienne)** |
| T18 | `superfan.register` écrase `metadata` à chaque update (perte provenance) | `superfan.ts:60` | **Remédié V4 (merge)** |

---

## 5. Partie V — Remédiation

### 5.1 Dans cette PR (vagues V0→V6)

| Vague | Contenu | Trous fermés |
|---|---|---|
| V0 | Hygiène registres/headers/stubs | T2, T11, T12, T13 + traces T3/T6/T7/T9/T14/T15 |
| V1 | Cascade staleness dans `writePillar` + dépose code mort + fermeture évasion ai-filler | T4, T5 |
| V2 | **Écrivain de production `CommunitySnapshot`** (Intent `SESHAT_CAPTURE_COMMUNITY_SNAPSHOT`, cron quotidien, unités canoniques, lecteurs bornés/null-safe) + ADR-0134 | T8, T16, T17 (chaîne) |
| V3 | **Devotion sur audience réelle** (followers = spectateurs, auteurs inbox = participants, garde legacy, annotation Loi 1) | (chaîne T17) |
| V4 | **Superfans réels depuis l'inbox** (mise à jour des profils connus jamais-dégrader, candidats à revue humaine, cap 0.60, single-writer préservé) | T18 + couture n°1 |
| V5 | **Pont RSS→axe Overton** (registre Sector + caller du bridge au cron external-feeds) | T10 (+ dérive T9 partielle) |
| V6 | **Signal Overton réel dans l'Oracle §34** (composer async, garde writeback) | T1 |

Invariants tenus sur toute la remédiation : zéro LLM dans la mesure · aucune donnée inventée (null/exclusion honnête) · naissance des superfans = geste humain (anti-inflation, single-writer HARD) · données sociales jamais dans les piliers ADVE (doctrine A4/A11/A13) · une seule migration Prisma (relaxation additive CommunitySnapshot) · cap 7 Neteru (tout sous SESHAT/ANUBIS existants).

### 5.2 Déféré explicitement (tracé RESIDUAL-DEBT, pas de demi-ship)

Dispatch réel `COMPOSE_DELIVERABLE` (T3 — chantier dédié) · dérivation honnête de `devotionTransitionsObserved` (T7 — à concevoir : transitions observées entre snapshots devotion datés × fenêtres de campagne, jamais fabriquées) · store DB `SequenceLifecycleState` / Chantier D-bis (T14 — **déféré, aucun consommateur** ; promotion de masse **refusée** honnêtement, [ADR-0139](../governance/adr/0139-sequence-lifecycle-stub-honest-diagnosis.md)) · `ugcGenerationRate` (B2 — attend mentions collectées + constante validée direction) · `vocabularyOverlap`/`embeddingDelta` (embeddings).

---

## 6. Vérification comportementale (post-remédiation, même session)

Exécutée sur PostgreSQL 16 local (migrations 0→HEAD dont `20260713100000` appliquées propres, `npm run db:seed` + `db:seed:motion19` verts), en simulant exactement les chemins de production (émissions via le spine, mêmes callers que les crons) :

| Chaîne | Résultat observé |
|---|---|
| Mesure community (spine, caller `cron:social-sync:community`) | `LIVE` sur les 3 plateformes de Motion19 (relevés réels seedés 4 252/1 753/1 308) — FACEBOOK `activeRate` 0.00047 (2 commentateurs uniques/4 252), INSTAGRAM `activeRate` 0 (**scannée, mesure réelle**), TIKTOK `activeRate` null (**hors couverture inbox v1**), `health`/`velocity` null (pas de posts mesurés/pas de référence J-30 — honnête), `sentiment` null, `source` CONNECTOR |
| Chaîne dérivée | `{devotion: true, cult: true}` — DevotionSnapshot `trigger="social-sync"`, pyramide réelle **99,96 % spectateurs / 0,03 % participants / 0,01 % engagés** (2 décimales — l'arrondi entier aurait tout écrasé) ; CultIndexSnapshot GHOST 0.01 (densité de dévotion honnête d'une marque à 7,3 k followers et 2 commentateurs), `communityCohesion` hors dénominateur (aucun health mesuré) |
| Candidats superfans | Alice (4 interactions/3 jours actifs) détectée → depth proposé 0.48/ENGAGE ; Bob (1 interaction) filtré sous seuil ; clic simulé → profil créé `metadata {source: SOCIAL, displayName}` ; `updateKnownSuperfansFromInbox` → `matched 1, updated 0` (jamais-dégrader idempotent) ; liste candidats vidée après enregistrement |
| Staleness Oracle | `writePillar` **bare** (auteur OPERATOR) → section 1 `COMPLETE → STALE` + `staleAt` posé (T5 fermé, vérifié en base) |
| Refresh sectoriel | digest RSS créé → row `Sector` provisionnée (registre) + `REFRESHED via SECTOR_ONLY` (Motion19 sans campagne — fallback correct), `overtonState` peuplé depuis le signal réel ; **2ᵉ passe → `SKIPPED ALREADY_FRESH`** (idempotence) |

Gauntlet final : tsc 0 · eslint 0 erreur · madge = 1 cycle pré-existant toléré (inchangé) · **2574 tests verts** (232 fichiers) · `prisma validate` + `migrate deploy` OK.

---

## Annexe — fichiers clés de l'audit

`campaign-manager/brief-builder.ts` · `campaign-manager/brief-gate.ts` · `ptah/index.ts` · `mestor/gates/brief-vs-adve-coherence.ts` · `deliverable-orchestrator/{composer,resolver,vault-matcher}.ts` · `strategy-presentation/{types,section-mappers,deterministic-composers,overton-real-signal,export-oracle}.ts` · `oracle-section/{index,handler,assembler}.ts` · `pillar-gateway/index.ts` · `src/lib/utils/scoring.ts` · `src/domain/{brand-tier,market-scale,devotion-ladder,overton-radar-signal,connector-result}.ts` · `advertis-scorer/index.ts` · `cult-index-engine/index.ts` · `devotion-engine/index.ts` · `campaign-tracker/{superfan-attribution,superfan-economy,calibration,signals-culture,operator-tag-overton-delta}.ts` · `sector-intelligence/index.ts` · `seshat/tarsis/connector.ts` · `seshat/external-feeds/` · `anubis/{social-connect,social-inbox,social-insights,social-report,commerce-connect}.ts` · `anubis/providers/crm-provider.ts` · `trpc/routers/{superfan,cockpit-router,campaign-tracker}.ts` · `api/cron/{social-sync,external-feeds}/route.ts` · seeds.
