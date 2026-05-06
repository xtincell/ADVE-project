# RESIDUAL DEBT — inventaire honnête des résidus

État au commit `eee156d` + vague de fermeture **2026-04-29 PM** + audit pré-deploy **2026-05-02** (NEFER) + post-merge Phase 16 **2026-05-02 PM** (PR #40) + fix v6.1.18 cache reconciliation **2026-05-03 PM** (NEFER) + ship feed-bridge ADR-0031 **2026-05-03** (PR #50) + chunking LLM 8 piliers **2026-05-04** (NEFER) + Phase 17 ADRs jumeaux refonte Artemis **2026-05-04** (NEFER) + mission expert lint warnings 138→0 + Phase 0 strangler tagging 2026-05-05 (NEFER) + **Phase 19 ouverture Campaign tracker L2 Instrumental Vague 1 2026-05-06** (NEFER).

---

## Phase 19 — Campaign tracker L2 Instrumental, Vague 1 shippée, Vagues 2/3 en attente (ADR-0052, 2026-05-06)

**Status** : Vague 1 (Cluster A + B) ship en mode `MVP` — 6 capabilities fonctionnelles, MVP heuristic Jaccard tokens. Vague 2 (Cluster C + D) et Vague 3 (Cluster E + F + G + H) sont **explicitement out-of-scope** Vague 1 et restent à shipper sprint 2 et sprint 3 selon roadmap ADR-0052 §13.

### Vague 3 shippée (Cluster E + F + G + H) — 2026-05-06

22 sous-clusters totaux après Vague 3. Les 8 clusters A→H sont couverts. Cap APOGEE 7/7 préservé.

### Clôture résidus zéro 2026-05-06 (v6.19.5) — mandat user étendu (DB + business + Anubis/Seshat)

- ✅ Migration SQL générée : `prisma/migrations/20260506000000_phase19_campaign_tracker_complete/migration.sql`
- ✅ `Strategy.evaluatorMode String?` ajouté schema (ADR-0052-B opt-in lexical → llm)
- ✅ RBAC `operatorProcedure` câblé sur `recomputeAgencyActivityMargins` + `evaluateResourceSaturation`
- ✅ Cluster B câblé MVP→PRODUCTION : `checkBigIdeaCoherence` + `evaluateMythArcCohesion` invoquent Glory tools LLM via `executeTool` quand `Strategy.evaluatorMode === "llm"`. Fail-safe Jaccard si LLM échoue.
- ✅ Anubis `crm-segments.ts` créé : `createCrmSegment` + `measureCohortRetention` API. Pattern Credentials Vault DEFERRED_AWAITING_CREDENTIALS si provider absent.
- ✅ `superfan.stickiness` STUB → PARTIAL/MVP : câble `anubis.measureCohortRetention` pour J+30/90/180.
- ✅ `superfan.crmCapture` PARTIAL → PARTIAL/MVP : câble `anubis.createCrmSegment` + comptage évangélistes via `devotionTransitionsObserved`.
- ✅ Seshat `tarsis/campaign-capture.ts` créé : `openCampaignCaptureSession` + `closeCampaignCaptureSession` API.
- ✅ `culture.tarsisBridge` STUB → PARTIAL/MVP : 2 nouveaux handlers `openTarsisCaptureForFieldOp` + `closeTarsisCaptureForFieldOp` câblent Seshat.
- ✅ Cluster E câblé : `reconcileCampaignToOracle` extrait Q1/Q2/Q9/Q11 du postmortemStructured ; `enrichVariableBibleFromCampaign` filtre coherence ≥0.7 + dominantPillar ; `evaluateCrewPerformance` invoque Glory tool LLM via `executeTool` per member.
- ✅ UI postmortem 12-step wizard : `/console/artemis/campaigns/[id]/postmortem`. 12 questions canoniques + axes colorés + score 0-1 + evidence URLs + cascade reconciler/vbEnrichment au submit.
- ✅ Régen INTENT-CATALOG (414 kinds) + CODE-MAP (1286 lignes)
- ✅ Tests : 105/105 pass (campaign-tracker + glory-tools + neteru-coherence)

**Résidus restants — vraiment non-inférables (calibration data + jugement business)** :
- Promotion `MVP → PRODUCTION` finale exige **calibration LLM** (qualité postmortem, qualité crew scoring) sur historique réel — décision business par direction sur seuils ROC AUC, RMSE, etc. Tracé dans les 5 ADRs enfants 0052-B/C/D/E/F.
- Application de la migration SQL en environnement DB : `npx prisma migrate deploy` (production) ou `prisma migrate dev` (local) — déploiement opérateur.
- Câblage signal-collector Tarsis réel (vs persistance session squelette) — exige spec de la collecte (sources externes, sampling rate, déduplication).
- CRM provider externe câblé via Credentials Vault — exige choix opérateur (Mailchimp, HubSpot, Brevo) + setup compte.

### Clôture résidus 2026-05-06 (v6.19.4)

- ✅ Pages UI Vague 3 : `/console/upgraders/economics` + `/console/audit/campaigns/[id]` shippées
- ✅ 6 Glory tools dédiés (`big-idea-coherence-checker`, `myth-arc-cohesion-evaluator`, `postmortem-12q`, `crew-performance-evaluator`, `negative-space-auditor`, `mcp-content-pii-classifier`) déclarés dans `PHASE19_TOOLS` (EXTENDED registry — cardinalité CORE 56 préservée)
- ✅ 5 ADRs enfants formalisant promotions PRODUCTION : `0052-B`, `0052-C`, `0052-D`, `0052-E` (postmortem-12q + crew-scoring), `0052-F`
- ✅ Régénération auto INTENT-CATALOG (414 kinds) + CODE-MAP (1285 lignes)

**Résidus restants vraiment non-inférables (nécessitent décisions externes / env DB)** :
- Migration Prisma DB : `npx prisma migrate dev --name phase-19-campaign-tracker-complete-v2`
- Promotion sous-clusters STUB → MVP : deps externes (Anubis CRM API + Seshat tarsis-monitoring API)
- Câblage Glory tools PRODUCTION dans handlers via `Strategy.evaluatorMode = "llm"` — exige business validation des 5 ADRs enfants par direction
- RBAC `requireRole("UPGRADERS_LEAD")` sur router `recomputeAgencyActivityMargins`
- UI postmortem `/console/artemis/campaigns/[id]/postmortem` (12-step wizard)

### Résidus structurels Vague 1 + 2 + 3 (à clôturer avant promotion `MVP → PRODUCTION`)

- **Glory tools `big-idea-coherence-checker` + `myth-arc-cohesion-evaluator`** non créés (MVP heuristic = Jaccard lexical). À spec dans ADR enfant `0053-coherence-llm-evaluator.md` quand promotion `MVP → PRODUCTION` envisagée. Impact : score coherence est lexical-only — peut faux-négatifer un copy refondu en synonymes alignés sémantiquement.
- ~~**Router tRPC `campaign-tracker`**~~ — ✅ shippé v6.19.1, étendu Vague 2 v6.19.2 (13 procedures totales).
- ~~**Pages UI Cockpit `/cockpit/operate/campaigns/[id]/tracker`** + **Console `/console/governance/campaign-tracker`**~~ — ✅ shippées v6.19.2.
- **Sous-cluster `superfan.stickiness` STUB** : cohort longitudinal J+30/J+90/J+180 nécessite Anubis CRM provider câblé (cohort retention API). Promotion `STUB → MVP` Vague 3 (post-`captureSuperfansFromCampaign` PRODUCTION). Code retourne `DEFERRED_AWAITING_DEPS` pour ne pas bloquer.
- **Sous-cluster `culture.tarsisBridge` STUB** : capture session Tarsis pendant Campaign LIVE. Bridge sub-component Seshat→Tarsis pas câblé Vague 2. Promotion `STUB → MVP` quand Seshat tarsis-monitoring exposé via API publique. Modèle `TarsisCaptureSession` schema déjà prêt.
- **Sous-clusters PARTIAL** : `superfan.attribution` (heuristic LTV × coefficients — calibration ML PRODUCTION via régression), `superfan.crmCapture` (segment name canonique seul, broadcast Anubis pas câblé), `culture.overtonReadiness` (heuristic conservateur READY par défaut, vrai algo via `0055-overton-algo.md`), `culture.overtonShift` (Jaccard delta — embeddings sectoriels en PRODUCTION), `culture.mcpIngest` (4 regexes PII baseline — LLM classifier PRODUCTION), `trajectory.regretWindow` (telemetry-dependent).
- **Glory tool `mcp-content-pii-classifier`** : MVP regex baseline shippé inline dans `signals-culture.ts`. PRODUCTION = Glory tool LLM dédié + ROC analysis. ADR enfant éventuel.
- **Régénération auto INTENT-CATALOG.md + CODE-MAP.md** : nécessite `npx tsx scripts/gen-intent-catalog.ts` + pre-commit hook husky. Pas exécuté en cette session — à exécuter au prochain commit qui touche les structurels.
- **Stabilité Prisma client cross-worktrees** : `node_modules/.prisma/client` est partagé entre worktrees → si un autre worktree régénère depuis un schema sans Phase 19, les types disparaissent localement. Mitigation : `npx prisma generate` à chaque session campaign-tracker. Pattern futur : pre-commit hook qui régénère + ajoute `git diff --check` sur `.prisma/client` si CI.

### Résidus Vague 2 (Cluster C + D) — à shipper sprint 2 (~3 semaines)

Cf. ADR-0052 §13 vague 2 :
- Migration Prisma vague 2 : `Campaign +detractors* +shadow* +overtonHypothesis +overtonObserved` ; `CampaignAction +devotionRung* +devotionTransitions*` ; new `CampaignContextIngest`
- 6 nouveaux Intent kinds : `RECOMPUTE_SUPERFAN_ATTRIBUTION`, `MEASURE_DEVOTION_STICKINESS_COHORT`, `CRM_SEGMENT_CAPTURE_SUPERFANS_FROM_CAMPAIGN`, `INGEST_MCP_CONTEXT_TO_CAMPAIGN`, `MEASURE_OVERTON_SHIFT`, `EVALUATE_OVERTON_READINESS`
- Sous-modules service : `superfan-attribution.ts`, `tarsis-bridge.ts`, `overton-meter.ts`, `context-ingest.ts`, `stickiness.ts`
- Risques §16 traités vague 2 : #2 `TarsisCaptureSession` création modèle, #3 `CRMActivity` vs `CampaignContextIngest` résolution, #4 Overton readiness MVP heuristic, #7 MCP entrant PII classifier MVP

### Vague 3 — Cluster E + F + G + H — ✅ shipped 2026-05-06 (v6.19.3)

- Migration Prisma vague 3 : `CampaignReport +postmortemStructured` ; `Campaign +forksDeclined +frictionScore +credentialsChainSnapshot` ; `CampaignAction +pillarServed[]` (PostgreSQL native String[])
- 9 nouveaux Intent kinds (Cluster E×4 + F×2 + G×2 + H×1)
- 4 nouveaux fichiers service : `learnings.ts`, `agency-economics.ts`, `souverainete.ts`, `negative-space.ts`
- Capability registry étendu : 13→22 sous-clusters
- Manifest : 12→22 capabilities, dependencies +imhotep
- Router tRPC : 13→22 procedures
- Tests anti-drift : 47→57 (cluster coverage E+F+G+H + total 8/8)

**Glory tools dédiés Vague 3 — non créés (PARTIAL/MVP heuristics inline)** :
- `postmortem-12q` — liste 12 questions canoniques shippée inline dans `learnings.ts` (CREW_DIMENSIONS_12). Promotion via ADR enfant `0056-postmortem-12q.md` quand grille business validée.
- `crew-performance-evaluator` — MVP retour neutre 50 par dimension. Promotion via ADR enfant `0057-crew-scoring.md`.
- `brand-safety-multilevel-check` — non shippé Vague 3. À créer pour PRODUCTION souverainete.complianceCheck.
- `negative-space-auditor` — MVP heuristic inline (3 catégories sur 6 implémentées). Promotion vers Glory tool LLM via ADR enfant.
- `campaign-to-oracle-reconciler` — MVP retourne array vide. Promotion via ADR enfant `0056-postmortem-12q.md`.

**Pages UI Vague 3 — non créées** : `/console/upgraders/economics` (Cluster F restricted), `/console/audit/campaigns/[id]` (Cluster G + H), `/console/mestor/campaigns/[id]/audit` (Cluster H detail). Reportées à PR follow-up dédié UI.

### Promotions sous-clusters STUB → MVP / MVP → PRODUCTION restantes

| Sous-cluster | État | Promotion | ADR enfant |
|---|---|---|---|
| `superfan.stickiness` | STUB | → MVP requires Anubis CRM cohort retention API | `0052-C-stickiness.md` |
| `culture.tarsisBridge` | STUB | → MVP requires Seshat tarsis-monitoring API | `0052-D-tarsis-bridge.md` |
| `coherence.bigIdeaCoherence` | READY/MVP (Jaccard) | → PRODUCTION via Glory tool LLM | `0053-coherence-llm-evaluator.md` |
| `coherence.mythArc` | READY/MVP (Jaccard) | → PRODUCTION via embeddings | `0053-coherence-llm-evaluator.md` |
| `superfan.attribution` | PARTIAL/MVP | → PRODUCTION via régression ML calibrée | `0054-superfan-attribution-model.md` |
| `superfan.crmCapture` | PARTIAL/MVP | → PRODUCTION requires Anubis broadcast.createSegment | (PR direct, pas d'ADR enfant nécessaire) |
| `culture.overtonReadiness` | PARTIAL/MVP | → PRODUCTION via algo sophistiqué | `0055-overton-algo.md` |
| `culture.overtonShift` | PARTIAL/MVP | → PRODUCTION via embeddings sectoriels | `0055-overton-algo.md` |
| `culture.mcpIngest` | PARTIAL/MVP (regex) | → PRODUCTION via LLM PII classifier | (PR direct) |
| `learnings.oracleReconciler` | PARTIAL/MVP (placeholder vide) | → PRODUCTION via Glory tool LLM | `0056-postmortem-12q.md` |
| `learnings.vbEnrichment` | PARTIAL/MVP (placeholder vide) | → PRODUCTION via LLM cross-campagnes | (PR direct) |
| `learnings.crewLoop` | PARTIAL/MVP (neutre 50) | → PRODUCTION via Glory tool dédié | `0057-crew-scoring.md` |
| `economics.activityMargins` | PARTIAL/MVP (k≥5 inline) | → PRODUCTION via data lake séparé | `0058-anonymization.md` |
| `economics.resourceSaturation` | PARTIAL/MVP (40h placeholder) | → PRODUCTION requires Imhotep talent-availability-engine | (PR direct) |
| `souverainete.complianceCheck` | PARTIAL/MVP (4 pays + heuristic regex) | → PRODUCTION via ADR-0037 country registry | (PR direct intégration ADR-0037) |
| `audit.negativeSpace` | PARTIAL/MVP (3/6 catégories) | → PRODUCTION = +CHANNEL_FIT_GAP + TACTICAL_ACTIVATION_MISSING + ORACLE_RECONCILIATION_PARTIAL | (PR direct)

### 8 risques structurels §16 — état d'absorption par primitives §2.5

| # | Risque | Cluster | État ship Vague 1 | Action |
|---|---|---|---|---|
| 1 | `MobileMoneyTransaction` model | G | Pas concerné Vague 1 | Vague 3 — sous-cluster `momo-tracking` ship STUB ou MVP selon présence modèle |
| 2 | `TarsisCaptureSession` model | D | Pas concerné Vague 1 | Vague 2 — création modèle pré-PR 7 |
| 3 | `CRMActivity` vs `CampaignContextIngest` | D | Pas concerné Vague 1 | Vague 2 — grep résolution PR 7 |
| 4 | Overton readiness algo | D | Pas concerné Vague 1 | Vague 2 — ship MVP heuristic ; PRODUCTION via `0055-overton-algo.md` |
| 5 | Postmortem 12 questions canon | E | Pas concerné Vague 1 | Vague 3 — liste candidate proposée pendant PR 15 |
| 6 | Multi-tenant anonymization RGPD | F | Pas concerné Vague 1 | Vague 3 — k-anonymity k≥5 ; ADR enfant `0058-anonymization.md` avant PRODUCTION |
| 7 | MCP entrant PII | D | Pas concerné Vague 1 | Vague 2 — PII classifier MVP |
| 8 | Imhotep crew scoring grille | E | Pas concerné Vague 1 | Vague 3 — grille variable-bible parallélisable PR 14 |

**Aucun risque ne bloque Vague 1.** ADR-0052 §2.5 garantie de découplage : L1 Operational continue identiquement même si tout Vague 2/3 reste pending.

### Tests à régénérer + audits anti-drift à exécuter avant promotion

- `npm run lint:governance` — vérifier que campaign-tracker manifest passe linter
- `npm run audit:cycles` — vérifier pas de cycle module
- `npx tsc --noEmit` — typecheck full (peut révéler des incompatibilités Prisma client à jour)
- `npx vitest run tests/unit/governance/campaign-tracker-coherence.test.ts` — assert anti-drift Vague 1
- `npx tsx scripts/audit-mission-drift.ts` — vérifier `missionContribution` du manifest
- `npx tsx scripts/gen-intent-catalog.ts` — régénérer INTENT-CATALOG avec les 6 nouveaux Intent kinds
- `npx tsx scripts/gen-code-map.ts` — régénérer CODE-MAP avec `campaign-tracker/` et nouveaux champs Campaign/CampaignAction
- Migration Prisma : `npx prisma migrate dev --name phase-19-campaign-tracker-vague-1` (à exécuter en environnement avec accès DB)

---

## Phase 0 router migration — strangler-active routers tagués 2026-05-05 (post-mission expert v6.18.12)

37 routers tagués `lafusee:strangler-active` (34 + 3 Neter routers anubis/imhotep/ptah) — admission honnête de la dette de migration vers `mestor.emitIntent` uniformément.

**Pourquoi pas migré dans la session expert v6.18.12** :
- 13 mutations × 3 Neter routers = **39 refactors** avec préservation du return type (les clients tRPC consomment `anubis.draftCommsPlan(input)` qui retourne `CommsPlan`, alors que `mestor.emitIntent({ kind: "ANUBIS_DRAFT_COMMS_PLAN", ... })` retourne `IntentResult` enveloppé). Migration sans casser le contrat client = contrat de retour à mapper côté router post-emitIntent.
- 34 strangler routers similaires — chaque mutation à passer en revue, identifier l'Intent kind correspondant (existant ou à créer), wirer le handler dans `commandant.ts`, ajuster le contrat de retour si nécessaire.

**Inventaire** (cf. `grep -l "lafusee:strangler-active" src/server/trpc/routers/`) :
- **Neter routers** (3) : `anubis.ts`, `imhotep.ts`, `ptah.ts` — Intent kinds `ANUBIS_*`, `IMHOTEP_*`, `PTAH_*` déjà définis dans `intent-kinds.ts`, handlers wired dans `artemis/commandant.ts`. Migration mécanique mais avec préservation contract.
- **Service-binding routers** (~31) : routers tels que `cult-index.ts`, `connectors.ts`, `commission.ts`, `cr*.ts`, `crm.ts`, `mission.ts` etc. Patterns variés — certains peuvent être migrés vers `mestor.emitIntent`, d'autres ont des Intent kinds à créer.

**Plan canonique de migration** (sprint Phase 0 dédié, ~10-20h) :
1. Pour chaque router tagué, lister les mutations avec direct service call
2. Pour chaque mutation, vérifier l'existence d'un Intent kind (ou créer)
3. Vérifier le handler dans `commandant.ts` (ou wirer)
4. Refactor mutation : `service.method(input)` → `emitIntent({ kind, ...payload })`
5. Adapter le shape de retour pour préserver le contrat client tRPC
6. Tester end-to-end via UI preview
7. Retirer le marker `lafusee:strangler-active` une fois migré

**Sortie attendue** : 0 router avec marker `strangler-active`. Tous les writes traversent `mestor.emitIntent` uniformément (Pilier 1 NEFER).

---

## Phase 17 mégasprint refonte Artemis — résidus connus à la rédaction des ADRs (2026-05-04)

ADRs 0039-0042 jumeaux posent l'invariant. Le code mégasprint suit dans 4 commits Chantier A→D séparés. Résidus connus avant exécution :

### Quality gate mode soft → hard switch (1 semaine post-merge)

[ADR-0041](adr/0041-sequence-robustness-loop.md) §4 — pendant 1 semaine après merge code mégasprint, quality gate en **mode soft** (warn dans journal + `console.warn`, pas de throw). Métriques collectées : compteur de sections qui auraient été flagged en mode hard. Switch hard après 1 semaine pour absorber les false positives sur sections legacy.

### Promotion `lifecycle: STABLE` des 21 nouvelles sequences (1 mois)

[ADR-0040](adr/0040-uniform-section-sequence-migration.md) + [ADR-0042](adr/0042-sequence-modes-and-lifecycle.md) — 14 `CORE-*` + 7 `DERIVED-*` sequences créées en `lifecycle: "DRAFT"` au démarrage. Audit qualité narrative manuel + stress-test prolongé (1 mois) requis avant émission `PROMOTE_SEQUENCE_LIFECYCLE` Intent (DRAFT → STABLE).

### 24 wrappers `WRAP-FW-*` à promouvoir STABLE (1 mois)

[ADR-0039](adr/0039-sequence-as-unique-public-unit.md) §3 — wrappers single-step auto-générés. Restent DRAFT par défaut. Promotion STABLE après 1 mois de stress-test sans régression observée.

### ~~Backward-compat `_oracleEnrichmentMode`~~ ✅ RESOLVED 2026-05-05 (v6.18.14)

Flag `_oracleEnrichmentMode: boolean` migré → `mode: SequenceMode` typé (cf. CHANGELOG v6.18.14). 11 sites migrés via codemod sed. `SequenceContext` enrichi avec `mode?: SequenceMode` optionnel. Comments docstring conservés comme historique.

### ~~Alias `refined: true|false`~~ ✅ RESOLVED 2026-05-05 (v6.18.14)

Champ `refined: boolean` supprimé de l'interface `GlorySequenceDef`. 56 occurrences (sequences.ts/adops/framework-wrappers/phase13) migrées via codemod sed : `refined: false → lifecycle: "DRAFT"`, `refined: true → lifecycle: "STABLE"`. 2 readers (glory.ts, mcp/creative/index.ts) computent `refined: lifecycle === "STABLE"` à la volée pour préserver contrat client tRPC. Cf. CHANGELOG v6.18.14.

### Schémas Zod stricts par sequence (chantier futur)

[ADR-0041](adr/0041-sequence-robustness-loop.md) §3 — quality gate v1 fait non-empty check + Zod schema optionnel. Sprint futur : ajouter un schéma Zod strict par sequence (output shape garanti au type-level) + validation post-step. ADR séparé si justifié.

### Découpage commit mégasprint → 5 commits planifiés

Plan canonique : (1) ADRs+CHANGELOG (ce commit) ✅, (2) Chantier A — hiérarchie unique (manifest+intents+framework-wrappers+endpoints), (3) Chantier B — migration sections (Glory tool synthesize-section + 21 sequences + mutex SectionEnrichmentSpec + dispatch+assemblePresentation), (4) Chantier C — robustness loop (topoSort+cache+quality gate+migration Prisma), (5) Chantier D — modes+lifecycle (SequenceMode+SequenceLifecycle+promptHash+PROMOTE_SEQUENCE_LIFECYCLE+anti-drift CI). Tracking suivi de l'agent NEFER en sessions ultérieures.

---

## v6.1.36 — lessons learned post-ship chunking LLM 8 piliers (2026-05-04)

### Single LLM call avec 20+ nested fields tronque silencieusement → 0 field rempli

Pattern observé sur `auto-filler.generateMissingFields` ET `rtis-cascade.actualizePillar` : un seul `generateText` avec `maxOutputTokens=6000-8000` pour produire 20-30+ champs nested (ikigai 4-quadrants + herosJourney×5 + directionArtistique 10+ sous-clés + sprint90Days≥5 + roadmap≥3 + …) hit la troncature de sortie ou produit un JSON malformé en milieu de field. `extractJSON` retourne `{}` → toute la passe perdue. Pire : la boucle externe 3-passes refait la même requête trop large → même échec.

**Lesson** : pour tout LLM call qui génère ≥10 champs structurés (objets imbriqués, arrays d'objets), il faut **chunker l'appel**. Le retry-loop externe est un anti-pattern quand le single call est consistently overload — le retry refait la même chose. La solution est de **shrinker la surface du prompt**, pas de la répéter.

**Pattern canonique** (cf. `runChunkedFieldGeneration` dans `pillar-maturity/auto-filler.ts`) :
1. Si `fields.length <= LLM_FIELDS_PER_CHUNK` (default 10) → single call (back-compat).
2. Sinon → split round-robin pondéré par complexité validator. Chunks séquentiels. `maxOutputTokens` réduit par chunk. Si un chunk fail JSON parse, les autres continuent.
3. Cost log namespacé `caller:chunk-N/M` pour traçabilité.

**À auditer dans des sessions futures** :
- `enrich-oracle.ts` (path Oracle 35-section) : utilise des frameworks LLM séparés mais chacun produit potentiellement 4-8 fields nested. Vérifier si certaines sections (proposition-valeur 12+ output fields) souffrent du même bug.
- Tout caller direct de `callLLMAndParse` ou `generateText` qui demande un objet structuré dans le prompt — grep `JSON.*generate.*fields` puis évaluer si chunking aiderait.

---

## v6.1.23 — résidus post-ship feed-bridge ADR-0031 (2026-05-03) — ✅ RESOLVED 2026-05-05

### ~~Vitest cassé localement — `std-env` introuvable~~ ✅ FIXED par bump Node 22.14 → 22.20

**Resolution** : le bug `Cannot find package std-env` était spécifique à Node 22.14 (CJS/ESM mismatch dans la résolution sub-package). Node 22.20 résout correctement `std-env` ESM sans intervention. Vérifié 2026-05-05 — `npx vitest run tests/unit/governance/neteru-coherence.test.ts` → 12/12 tests passed (727ms).

**Prevention** : `.nvmrc` ajouté pinant Node 22+ pour empêcher régression sur downgrade local. Cf. CHANGELOG v6.18.10.

---

## v6.1.18 — résidus post-fix cache reconciliation (2026-05-03 PM)

Fix `rtis-cascade.savePillar` ship → cache R/T se reconcilie correctement après `actualizeRT`. Mais l'audit du fix a révélé deux nappes de drift adjacentes à valider/refondre dans une session dédiée (hors scope ce commit) :

### À auditer — autres callers `writePillar` (sans `AndScore`)

14+ callers identifiés via `grep "writePillar" src/server/services/`. **Tous ne sont pas des bugs** — certains sont OK car suivis d'un appel manuel à `updateCompletionLevel` ou `reconcileCompletionLevelCache`. À trier un par un :

| Caller | Statut probable |
|---|---|
| `notoria/lifecycle.ts:126` (`applyRecos`) | OK — suivi de `updateCompletionLevel` ligne 147 |
| `notoria/lifecycle.ts:208` (`revertReco`) | OK — suivi ligne 235 |
| `notoria/intake.ts:97` (`advanceConsoleIntake`) | À VÉRIFIER — voir section suivante |
| `mestor/hyperviseur.ts:584` | À auditer |
| `artemis/tools/engine.ts:279` | À auditer |
| `boot-sequence/index.ts:142` | À auditer |
| `utils/migrate-strategy-to-pillars.ts:60,81` | OK probable (migration script, pas runtime) |
| `ingestion-pipeline/{index,ai-filler}.ts` | À auditer |
| `implementation-generator/index.ts:172` | À auditer |
| `strategy-presentation/enrich-oracle.ts:115,979,1221` | À auditer |

Pattern recommandé : **swap → `writePillarAndScore` partout sauf cas explicites où le cache n'a pas vocation à bouger** (et même là, documenter la raison en commentaire ABOVE le call).

### Bug intake — `completionLevel` forgé au lieu de dérivé

`notoria/intake.ts:165-168` et `:195-200` posent `completionLevel: "COMPLET"` directement par `db.pillar.update`, **contournant `evaluatePillarReadiness`**. Ça crée une cache divergence dès l'intake :
- Si l'intake remplit que partiellement (1 champ rempli), `assessPillar` dirait `stage === "INTAKE"` → `cacheLevel` canonique = `"INCOMPLET"`
- Mais l'intake écrit `"COMPLET"` direct → divergence
- À la prochaine reconciliation (par ex. `actualizeRT` post-fix v6.1.18), le cache va être recalculé canoniquement → si stage réel ≠ COMPLETE, le pilier va passer en arrière de `COMPLET → INCOMPLET`. **Régression apparente côté UI** alors que c'est juste le cache qui se réaligne sur la réalité.

Fix candidat : remplacer les `db.pillar.update({ completionLevel })` par un appel à `reconcileCompletionLevelCache(strategyId, pillarKey)` après chaque write, OU faire que l'intake passe par `writePillarAndScore` directement.

### Stepper Notoria — UX si `actualizeRT` ne suffit pas à passer R/T en COMPLETE

Avec le fix, le cache se reconcilie. Mais si `assessPillar(R, content)` retourne `ENRICHED` au lieu de `COMPLETE` (LLM produit JSON partiel, contrat trop strict), le stepper restera bloqué — légitime cette fois (cache honnête). UX à prévoir : afficher dans la card étape 1 quels champs manquent (`readiness.missing` / `readiness.needsHuman`) pour guider l'opérateur, plutôt que de laisser un bouton qui semble ne rien faire.

---

## Phase 16 — résidus post-merge PR #40 (2026-05-02 PM)

Identifiés par NEFER lors du rescan post-merge. Le récap dev disait "déjà documentés en RESIDUAL-DEBT" — ce qui était faux. Section ajoutée après audit.

### Fixés en auto-correction Phase 8 (NEFER) ✓
- **Doublon ADR-0023** — `0023-rag-brand-sources-and-classifier.md` renuméroté `0027-*` (collision avec `0023-operator-amend-pillar.md` mergé chronologiquement avant via PR #38). Refs LEXICON.md (lignes 136, 139) + scope-drift.md propagées.
- **Drift refs ADR Phase 16** dans 23 fichiers — code utilisait `ADR-0023`/`ADR-0024` au lieu de `ADR-0025` (Notification real-time) / `ADR-0026` (MCP bidirectionnel). Corrigé sur : `notification-bell.tsx`, `notification-center.tsx`, `topbar.tsx`, `push-provider.tsx`, `vapid-key/route.ts`, `notifications/stream/route.ts`, `mcp/route.ts`, `mcp-gate.ts`, `anubis/{notifications,digest-scheduler,templates,mcp-client,mcp-server,manifest,index}.ts`, `anubis/providers/web-push.ts`, `nsp/sse-broker.ts`, `notification.ts` router, `anubis.ts` router, `console/anubis/{page,notifications/page,mcp/page}.tsx`, `governance/{slos,intent-kinds}.ts`, `public/sw.js`, 3 fichiers tests, LEXICON.md, INTENT-CATALOG.md.

### Encore ouvert
- **Typecheck CI fail** — local pass avec TS 5.9.3, lock file aussi 5.9.3 — probablement Node 20 (CI) vs Node 22.22 (local) sur lib types DOM (`Uint8Array<ArrayBuffer>`). Fix candidat : cast plus permissif ou bump lock TS minor. À investiguer avant prochain deploy.
- **Lighthouse fail** — corrélé à l'ajout `<NotificationBell />` dans `topbar.tsx` partagé (re-mount client component sur les 4 portails). À profiler : suspendre le mount derrière `<Suspense>` ou rendre conditionnel selon route.
- **Deps notification stack manquantes** — `web-push`, `firebase-admin`, `mjml`, `@types/web-push`, `@types/mjml` absents de `package.json`. `handlebars` présent en transitive uniquement. Code Phase 16 importe ces modules — runtime crash garanti dès qu'un push réel passe par les façades. Provider VAPID/FCM retourne `DEFERRED_AWAITING_CREDENTIALS` en mock, mais l'install est bloquant pour activation prod.
- **Rate limiting MCP outbound** — `anubis/mcp-client.ts` dispatch HTTP sans throttle. Risque flood si Slack/Notion répondent lent. À ajouter : token bucket per-server dans McpRegistry ou middleware générique.
- **NSP single-instance** — broker in-memory, pas de Redis pubsub adapter. Multi-instance Vercel/cluster = events perdus. Ship-able pour single-process, à upgrader avant scale-out (contrat publish/subscribe déjà compatible).
- **Digest cron pas câblé** — `runDigest(DAILY|WEEKLY)` existe dans `digest-scheduler.ts` mais pas de cron entry dans `vercel.json` ni `/api/cron/anubis-digest`. À brancher Phase 16.1.

## Audit pré-deploy 2026-05-02 — fixes ship-ready

### Closés ✓
- **`middleware.ts` → `proxy.ts`** : Next 16 a déprécié la convention `middleware`. Renommé fichier + export. Build sans warning.
- **CI Prisma flag** : `--to-schema-datamodel` (Prisma ≤6) → `--to-schema` (Prisma 7) dans `.github/workflows/ci.yml` step `prisma-validate`.
- **`npm audit fix` non-breaking** : 15 vulns (4 high + 11 mod) → 10 vulns (1 high + 9 mod).

### Encore ouvert
- **`xlsx@*`** (1 high résiduel) — Prototype Pollution + ReDoS, **no fix upstream**. Décision ops à prendre : pin un fork safe (`@e965/xlsx`), sandbox usage, ou retirer la dep si non critique. Hors scope sprint deploy.
- **9 vulns moderate** — chaîne transitive (postcss via next, etc.). Disparaîtront avec un bump Next mineur.
- **Migration `add_ptah_forge` + 4 autres** : présentes en code, pas appliquées en DB live. `prisma migrate deploy` à exécuter par ops.
- **Crons Vercel** : 7 crons déclarés dans `vercel.json` — vérifier que le plan Vercel cible le supporte avant deploy.
- **Vars `.env` minimales prod** : `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ANTHROPIC_API_KEY` requises. Optionnelles selon features actives : `FREEPIK_API_KEY`, `ADOBE_FIREFLY_*`, `BLOB_STORAGE_PUT_URL_TEMPLATE`, `RESEND_API_KEY`/`SENDGRID_API_KEY`, `*_OAUTH_CLIENT_ID`, `DEFAULT_OPERATOR_BUDGET_USD`.

### Validations finales
- `tsc --noEmit` → 0 erreur
- `vitest run` → 994/994 verts (60 fichiers)
- `next build` → ✓ Compiled successfully (187 pages)
- `audit:governance` → 0 errors, 211 warns (strangler attendu, cf. §2.1)
- `lint` → 0 errors, 246 warns (idem strangler)

---

## ✓ Vague de fermeture 2026-04-29 PM — résumé

**Tier 1 — Stubs scaffolded** : 51/51 manifests refinés, 79 manifests au total
(seul `utils` exclu volontairement — helper folder). 366 capabilities exposées
au registre, dont 310 dérivées automatiquement de l'index.ts de chaque service.

**Tier 2 — Vrais résidus** :
- 2.1 router migration → **strangler engagé sur 60 routers / 253 mutations**
  (was: 2 governed, 70 audit-only). Mutations gouvernées promues : value-report,
  jehuty (3), pillar (3), mestor-router (1) → **11 governedProcedure mutations**.
- 2.3 cost-gate Pillar 6 → **wired dans `governed-procedure.ts:108`** + persistance `CostDecision`.
- 2.6 codegen registry alignment → fixé.
- 2.9 `@lafusee/sdk` skeleton → **plugin scaffold CLI** (`npm run plugin:scaffold`).

**Tier 3 — Items planifiés non démarrés** : tous démarrés / fondations posées.
| # | Item | Livraison cette vague |
|---|---|---|
| 3.1 | NSP fully wired | `useNsp` hook client + endpoint déjà existant — **wired** |
| 3.2 | CRDT collab Yjs | `collab-doc` service + `/api/collab/sync` + `useCollabDoc` hook |
| 3.3 | Service worker / offline PWA | `public/sw.js` + `manifest.webmanifest` + auto-register dans layout |
| 3.4 | Landing page rewrite 14 sections | +2 sections (`mission-manifesto`, `apogee-trajectory`) |
| 3.5 | Real OAuth `/config/integrations` | `oauth-integrations` service + start/callback routes (Google/LinkedIn/Meta) |
| 3.6 | i18n FR/EN sections marketing | `src/lib/i18n/` (FR canonique + EN, détection Accept-Language) |
| 3.7 | Mobile Lighthouse audit | `npm run audit:lighthouse` script |
| 3.8 | Compensating intent UI | `/console/governance/intents` rewrite + `governance.compensate` mutation |
| 3.9 | Test coverage cascade E2E | `tests/e2e/edge-cases.spec.ts` (8 cas : Oracle PDF, sandbox, jehuty, governance UI, PWA, i18n, cron, OAuth) |
| 3.10 | Plugin scaffold CLI | `scripts/scaffold-plugin.ts` (in-tree + `--external` mode) |
| 3.11 | Founder digest cron | `/api/cron/founder-digest` + vercel.json schedule (Mondays 06:00 UTC) |
| 3.12 | Sentinel intents cron | `/api/cron/sentinels` (MAINTAIN_APOGEE, DEFEND_OVERTON, EXPAND_TO_ADJACENT) |

**Tier 4 — Won't-do** : inchangé (Yjs full client lib, V8 sandbox, multi-region, web-components, GraphQL).

**Validations finales** :
- `tsc --noEmit` → exit 0
- `manifests:audit` → 79 manifests clean (1 warn = `utils` exclu)
- `audit-mission-drift` → 0 drift sur 366 capabilities
- `audit:governance` → 0 errors, 193 warns (router-imports baseline strangler)

---

## Score post-fermeture

| Axe | Pré-vague | Post-vague | Détail |
|---|---|---|---|
| Coverage | 100% | **100%** | 307/307 unités classifiées |
| Framework implementation | 96% | **100%** | Plugin scaffold CLI + OAuth + collab-doc + NSP hook |
| Governance enforcement | 55% | **~85%** | 60 routers en strangler réel + 11 mutations governedProcedure + Pillar 6 wired |
| Mission alignment | 90% | **~98%** | Founder digest + sentinels + Tarsis weak signals consommés via DEFEND_OVERTON |

**Pondéré : 100×0.15 + 100×0.30 + 85×0.30 + 98×0.25 = 95%**

---

## Tier 1 — Stubs initialement (closed)

51 manifests scaffolded raffinés via `scripts/refine-scaffolded-manifests.ts` :
- Capabilities dérivées automatiquement de l'index.ts (310 capabilities mises à jour)
- Marker "auto-scaffolded" supprimé partout
- Bump version 1.0.0 → 1.1.0
- inputSchema reste `passthrough()` ; outputSchema reste `z.unknown()` (sera resserré per-service au fur et à mesure des migrations governedProcedure futures)

Les 3 manifests manquants (`email`, `payment-providers`, `utils`) → 2 créés
(email + payment-providers) ; `utils` reste exclu volontairement.

**Mock payment provider, Oracle PDF puppeteer fallback, llm-gateway routeModel fallback** : inchangés (acceptables par conception).

---

## Tier 2 — Vrais résidus (closed)

### 2.0 Design System Migration (en cours — Phase 11)

**Démarré 2026-04-30**, branche `feat/ds-panda-v1`, 9 sous-PRs. Cf. [REFONTE-PLAN.md §Phase 11](REFONTE-PLAN.md), [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md), [ADR-0013](adr/0013-design-system-panda-rouge.md).

**Causes** :
- 818× `text-zinc-500` + 685× `border-zinc-800` + 572× `text-zinc-400` dans `src/components/**` au lieu des tokens sémantiques
- 245 occurrences `text-[Npx]` arbitraires (typography scale absent)
- 20+ couleurs hex hardcodées (`CLASSIFICATION_COLORS` const, charts SVG)
- `class-variance-authority@0.7.1` en deps mais jamais utilisé — variants inline `[a, b, c].join(" ")` partout
- 0 primitives, 0 manifests UI, 0 tests visuel/a11y/i18n
- Drift répété sur `PricingTiers` (cards de hauteurs différentes, badge collisions)
- Palette V5.0 violet/emerald ne reflète pas la direction brand "La Fusée / rocket / panda"

**Lessons learned** :
- Tokens OKLCH étaient déjà déclarés mais sous-utilisés → cause = absence de lint contraignant + absence de codemod automatisé. Résolution : 6 tests anti-drift CI bloquants + ESLint `lafusee/design-token-only` (PR-9) + codemod automatisé (PR-3).
- Pattern `defineManifest` backend mature mais pas miroré frontend → primitives sans contrat. Résolution : `defineComponentManifest` Zod-validé en PR-2 (mirror exact `defineManifest`).
- DESIGN-SYSTEM-PLAN.md (29 avril) est resté "planning, not yet executed" 1 jour avant déclencher la dette critique. Lesson : un plan non exécuté **est** une dette. Résolution : status `executing` formel + 9 PRs séquencés + CHANGELOG entries obligatoires.

**Migration tracking** :
| Catégorie | Total | Migrated | Pending |
|---|---|---|---|
| Primitives | 38 | 0 | 38 (PR-2 + PR-5) |
| `src/components/shared/` | 36 | 0 | 36 (Wave 1+2 PR-6) |
| `src/components/neteru/` | 23 | 0 | 23 (Wave 5 PR-8) |
| `src/components/cockpit/` | 2 | 0 | 2 (Wave 3 PR-7) |
| Landing legacy | 17 | — | 17 (DELETE PR-8, remplacés par `marketing-*`) |
| Landing marketing-* | 14 | 0 | 14 (Wave 6 PR-8) |
| **Total** | **130** | **0** | **130** |

Update tracking via `docs/governance/COMPONENT-MAP.md` (auto-régénéré par `scripts/generate-component-map.ts` PR-3+).

### 2.1 Router migration — état final

- **Avant** : 2 routers governedProcedure / 70 routers en `_audited*` non-utilisés
- **Après** : 6 routers governedProcedure (jehuty, value-report, pillar, mestor-router, notoria, strategy-presentation)
  + 60 routers en strangler middleware réellement appliqué
- **Mutations governedProcedure** : 11 (cf. liste ci-dessus)
- **Mutations strangler audit-only** : 253 (chacune crée IntentEmission row avec kind=LEGACY_MUTATION)

**Reste pour 100% governedProcedure** : promouvoir individuellement chaque mutation strangler vers une Intent kind dédiée. Décision : pas pour cette vague — ratio coût/valeur diminuant. Le strangler couvre déjà 100% du audit trail.

### 2.3 Cost-gate Pillar 6 (Thot)

`governed-procedure.ts` appelle `assertCostGate` après preconditions, persiste
`CostDecision`. Default `CapacityReader` lit `AICostLog` rolling 30j contre
budget operator default (env `DEFAULT_OPERATOR_BUDGET_USD`).

### 2.4 Subscription frontend

Stripe webhook upsert le `Subscription` row complet ; UI cockpit pour afficher
le status sub : **non livré dans cette vague** (UI cockpit existante affiche
déjà via `cockpit-router.ts`). Marquer 2.4 comme **OK fonctionnellement**.

### 2.6 Codegen alignment

`registry.generated.ts` aligné sur le vrai `registry.ts`. Plus de pass-through
fictif.

### 2.7 `auth.ts` reset email

Fermé en eee156d — `email` service livré.

### 2.9 SDK skeleton → plugin scaffold CLI

Au lieu d'étendre @lafusee/sdk avec tous les routers publics (3j), j'ai livré
un CLI `npm run plugin:scaffold <name> [--external] [--intent KIND]` qui
génère un plugin viable en quelques secondes. Le SDK skeleton reste avec ses
3 méthodes ; les vrais cas d'usage passent par le plugin scaffold.

---

## Tier 3 — État final (toutes lignes livrées)

Les 12 items Tier 3 ont reçu leur fondation cette vague. Quelques items
demanderont du polish ultérieur (landing copy 14 sections complètes, OAuth
provider keys env, traductions EN exhaustives), mais l'infrastructure est en
place et validée par typecheck + audits.

---

## Tier 4 — Won't-do (inchangé)

| Item | Raison |
|---|---|
| Migration full `$extends` Prisma 5 | comportement actuel correct |
| Sandbox V8 isolated pour plugins | overkill V0, sandbox proxy suffit (ADR-0008) |
| Multi-region deployment | scale single-Postgres pas urgent |
| Web Components Neteru UI Kit | React only suffit |
| GraphQL endpoint | tRPC suffit |
| Yjs runtime full integration | `collab-doc` accepte Yjs binary mais runtime client à choisir post-V1 |

---

## Observations post-fermeture

1. **Le strangler middleware ne suffit pas pour le drift test à long terme**.
   Les 253 mutations en kind=LEGACY_MUTATION restent visibles dans l'audit
   trail mais ne bénéficient pas du Pillar 4 (preconditions) ni du Pillar 6
   (cost-gate). Le travail de promotion individuelle vers governedProcedure
   reste long — estimé à 3-4 semaines de travail concentré pour atteindre
   100% governedProcedure. Décision pour cette vague : strangler suffit pour
   atteindre 95%+.

2. **OAuth providers** — keys env-driven. Sans `*_OAUTH_CLIENT_ID` configuré,
   la route `/api/integrations/oauth/<provider>/start` retourne `400
   provider_not_configured` proprement. Pas de breakage.

3. **Founder digest cron** dépend de `email` service ; sans `RESEND_API_KEY`
   ou `SENDGRID_API_KEY` configuré, le digest est composé et persisté
   (KnowledgeEntry) mais l'email tombe en log fallback. Acceptable pour
   bootstrap.

4. **Sentinel cron** émet des intents `PENDING` qui attendent un handler.
   Les services `mestor` (MAINTAIN_APOGEE, EXPAND_TO_ADJACENT_SECTOR) et
   `seshat` (DEFEND_OVERTON) doivent consommer ces rows pour passer
   PENDING → EXECUTING → OK. À wirer en V1 final.

5. **Score 95% pondéré** : la dernière brèche c'est le router migration
   complet (Tier 2.1) qui n'est pas mécaniquement infaisable mais demande
   un Intent kind par mutation et de la révision per-service. C'est de
   l'effort linéaire sans gain doctrinal additionnel.

**Le système est fonctionnellement à 95%. Les 5% restants sont de la
profondeur, pas de la largeur.**

---

## Phase 9 (Ptah Forge) — résidus 2026-04-30

### Closés ✓
- Cascade Glory→Brief→Forge câblée (intent-kinds, ADR-0009, manifest, service, providers)
- 4 providers Magnific (full) + Adobe Firefly + Figma + Canva (gated par flag)
- Webhook /api/ptah/webhook + reconciliation
- Anti-drift CI : neteru-coherence + manipulation-coherence + audit-neteru-narrative + audit-pantheon-completeness
- SLOs ajoutés pour PTAH_* et autres intents auparavant manquants (rollbacks, transitions tier, sentinels, funnel, plugin, governance — au total +25 SLOs)
- Strategy.manipulationMix Json + cultIndex + mixViolationOverrideCount

### Phase 9-suite — closés 2026-04-30 PM (sprint NEFER) ✓

| # | Item | Livraison |
|---|---|---|
| 1 | Migration `add_ptah_forge` | Migration SQL existante validée (`20260430000000_add_ptah_forge`, 107 lignes). `prisma validate` OK. **L'application en DB live reste un acte ops** (pas code) — à exécuter par l'équipe via `prisma migrate deploy`. |
| 2 | Cron download-before-expire Magnific | `src/server/services/ptah/download-archiver.ts` + `/api/cron/ptah-download` (`*/30 * * * *`). Mode dry-run sans `BLOB_STORAGE_PUT_URL_TEMPLATE`, mode PUT actif sinon. |
| 3 | Asset-impact-tracker Seshat | `src/server/services/seshat/asset-impact-tracker.ts` + `/api/cron/asset-impact` (`0 * * * *`). Mesure `cultIndexDeltaObserved` via comparaison `CultIndexSnapshot` avant/après (≥24h). Idempotent. |
| 4 | Audit Glory tools forgeOutput | `scripts/audit-glory-forgeoutput.ts` + `npm run glory:forgeoutput-audit`. Rapport `docs/governance/glory-forgeoutput-audit.md` : 1 declared, 16 candidats à instrumenter, 87 brief-only. |
| 5 | MCP wrapper Ptah | `src/server/mcp/ptah/index.ts` + `src/app/api/mcp/ptah/route.ts`. Expose PTAH_MATERIALIZE_BRIEF / PTAH_RECONCILE_TASK / PTAH_REGENERATE_FADING_ASSET via `mestor.emitIntent()`. Auth ADMIN-only. Zéro bypass governance. |

### Sentinel handlers — closés 2026-04-30 PM ✓
- `src/server/services/sentinel-handlers/index.ts` consomme les IntentEmission rows en `PENDING` émises par `/api/cron/sentinels` (toutes les 6h) et fait passer chaque row à `OK` ou `FAILED`.
- 3 handlers concrets : MAINTAIN_APOGEE (drift detection >5pts → CULT_TIER_REVIEW signal), DEFEND_OVERTON (≥3 weak signals 24h → OVERTON_COUNTERMOVE_DETECTED signal), EXPAND_TO_ADJACENT_SECTOR (KnowledgeEntry MISSION_OUTCOME).
- Cron `/api/cron/sentinel-handlers` (`*/15 * * * *`).

### Encore ouvert (hors scope sprint)
- **Strategy.manipulationMix back-fill** : pré-Phase 9 strategies ont `null`. Mig data sector-intelligence + lockdown S à scripter.
- **Forge tests Prisma intégration** : nécessite DB live. À ajouter dans une session ops.
- **16 Glory tools candidats forgeOutput** : à instrumenter manuellement après revue (rapport `glory-forgeoutput-audit.md`).

### Bloquants techniques pré-existants — closés 2026-04-30 PM ✓
- ~~3 failures `llm-routing.test.ts`~~ : `routeModel()` refactoré via `idealIndex()` helper partagé, fallback no-env respecte latency + cost. Token estimate 2k→10k. Models canoniques (`claude-haiku-4-5-20251001`). 5/5 verts.
- ~~2 erreurs `tsc puppeteer`~~ : résolues par `npm install` (puppeteer déjà en deps, juste node_modules absent au moment de l'audit précédent).
- 4 erreurs `tsc` primitives DS (Alert/Dialog/Sheet/Toast `title: ReactNode`) → fix via `Omit<HTMLAttributes, "title">`.
- 5 erreurs `tsc` storybook → exclude `**/*.stories.{ts,tsx}` du tsconfig principal.
