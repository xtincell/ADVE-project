# ADR-0077 — Phase 23 pivot-mechanics wiring (parent / closure ADR)

**Status** : Accepted
**Date** : 2026-05-16
**Phase** : 23 (Câblage des mécaniques pivot mission — superfans × Overton — MVP→PRODUCTION ; ex-Phase 22 pré-rename 2026-05-15)
**Depends on** : ADR-0002 (layering cascade), ADR-0004 (hash-chain immutability), ADR-0013 (Design System panda + rouge fusée), ADR-0021 (Credentials Vault), ADR-0025 (NSP SSE broker), ADR-0046 (no-magic-fallback), ADR-0052 (Campaign module canonical trajectory instrument), ADR-0060 (Manual-first parity), ADR-0067 (LLM output structured enforcement), ADR-0071 (Oracle assembler manual-first), ADR-0082 (Yggdrasil substrate)
**Spawns** : ADR-0078, ADR-0079, ADR-0080, ADR-0081 (4 child ADRs, sequentially numbered)
**Supersedes** : phantom references `0053-coherence-llm-evaluator`, `0054-superfan-attribution-model`, `0055-overton-algo`, `0056-postmortem-12q`, `0057-crew-scoring` (each referenced in code as a `childAdr` but never materialized — retired per pattern P22-7 and replaced by ADR-0077+ counterparts)

## Contexte

Phase 19 (ADR-0052 v2) a livré l'**architecture** du `campaign-tracker/` en double-couche L1 Operational + L2 Instrumental, avec 22 sous-clusters cross-Neteru. Six sous-clusters portent les **deux mécanismes pivots de la mission** — `superfan.attribution`, `superfan.stickiness`, `culture.overtonShift`, `culture.overtonReadiness`, `culture.tarsisBridge`, `culture.mcpIngest` — mais ils ont été shipped en état `PARTIAL`, calculant des scores Jaccard heuristiques avec le commentaire explicite `MVP heuristic — vrai algo Overton viendra` (cf. `services/campaign-tracker/signals-culture.ts`).

Le Cockpit affichait donc des scores superfans × Overton qui **n'étaient pas le signal qu'ils prétendaient être** — chevauchement de tokens entre le brief et le brief sectoriel agrégé. Le founder voyait un cadran sectoriel calculé sur de la similarité textuelle ; aucun moyen pour l'opérateur de tracer un score à sa source. La MISSION.md §9 ledger des 6 checkboxes "Vérification finale" était à 0/6.

L'ADR-0052 avait planifié 5 child ADRs (`0052-B/C/D/E/F`) pour ces décisions, **jamais matérialisés**. Les 5 références correspondantes (`0053-coherence-llm-evaluator` etc.) traînent dans `capability-state.ts` comme `childAdr` dangling — drift narratif silencieux au sens NEFER §3.2 #3.

Le 2026-05-15 le scope label `phase/22` a été redéfini en upstream comme "Argos by LaFusée" (ADR-0083) ; ce chantier "câblage des mécaniques pivot" a été relabelisé en **Phase 23** par séquence numérique. Substantivement inchangé.

Par construction le chantier touche 8 axes simultanés — sub-cluster wiring, Glory tools manual-first, Cockpit `<OvertonRadar>`, calibration governance, anti-drift CI, ADR cleanup. Sans **un ADR parent qui ferme le scope**, le port risque d'éparpiller la décision en 5 ADRs disjoints qui ne se réfèrent pas l'un l'autre.

## Décision

### 1. Scope reframe (corrige le PRD)

Le grep CODE-MAP du PRD `_bmad-output/planning-artifacts/prd.md` a été partiellement stale. Vérifié au step-02 de l'architecture (`_bmad-output/planning-artifacts/architecture.md`), la surface Phase 23 partitionne en **trois buckets, pas "tout créer"** :

**(A) Existe déjà — NE PAS recréer (NEFER §3.2 #1)** :
- 5 (+1) measurement Glory tools — `services/artemis/tools/phase19-tools.ts`, tous `status: "ACTIVE"`, prompt-templated : `big-idea-coherence-checker`, `myth-arc-cohesion-evaluator`, `crew-performance-evaluator`, `negative-space-auditor`, `mcp-content-pii-classifier` (+`postmortem-12q`).
- `<OvertonRadar>` — `src/components/neteru/overton-radar.tsx`, déjà exporté dans `neteru/index.ts`.
- `sector-intelligence/` service + `Sector` Prisma model — Phase 3, déjà livré.
- 6 pivot sous-clusters dans `campaign-tracker/` — tous à `PARTIAL` (aucun `STUB`, contrairement à la formulation PRD).

**(B) Wiring — connecter des morceaux existants déconnectés** :
- `campaign-tracker/culture.overtonShift|overtonReadiness` → délégation à `sector-intelligence/` (drop Jaccard placeholder).
- `culture.tarsisBridge` → connecteur Tarsis (nouveau).
- `superfan.stickiness` / `superfan.crmCapture` → connecteur CRM (nouveau).
- `phase19-tools.ts` Glory tools → consommation via Artemis dispatcher (HYBRID upgrade).
- `<OvertonRadar>` → wired à real `sector-intelligence` + Tarsis signal via `ConnectorResult<T>` ; nouveau route `/cockpit/intelligence/overton` qui le monte.
- Output Overton → Oracle §33 "État Overton sectoriel".

**(C) Genuinely net-new — la vraie surface de build** :
- 2 connector façades (Tarsis-monitoring API, CRM) via Credentials Vault → cf. **ADR-0079**.
- Governed lifecycle-promotion Intent kind `PROMOTE_PIVOT_SUBCLUSTER` + `RUN_ATTRIBUTION_CALIBRATION` → cf. **ADR-0080**.
- ML calibration logic (ROC AUC / RMSE) pure-TS, no new dep → cf. **ADR-0081**.
- 1 Cockpit route `/cockpit/intelligence/overton` montant le composant existant.
- Manual-first UI paths : 5 Glory tools (actuellement LLM-only) + manual coefficient mode + operator-tagged delta mode.
- `applicableNatures` annotation sur les 5 tools existants — **c'est N6-bis residual closure** (debt Phase 18), pas "annotated from creation" (formulation PRD corrigée).
- Anti-drift test extensions (6 fichiers `phase22-*.test.ts` HARD).

### 2. Les 7 patterns Phase 22 — pierres angulaires structurelles

L'implémentation est cadrée par 7 patterns numérotés `P22-1` à `P22-7`. Texte complet dans `_bmad-output/planning-artifacts/architecture.md` §"Implementation Patterns & Consistency Rules". Synthèse :

| Pattern | Surface | Enforcement |
|---|---|---|
| **P22-1** `ConnectorResult<T>` discriminated union | `src/domain/connector-result.ts` — shape unique consommée par connector / sub-cluster / Glory tool / UI | HARD test `phase22-connector-result.test.ts` |
| **P22-2** `INSUFFICIENT_DATA` first-class branch, jamais exception, jamais zero silencieux | Tous les paths de mesure | HARD test `phase22-no-silent-zero.test.ts` |
| **P22-3** Glory tool `executionType: "HYBRID"` + `manualFormSchema` (= `outputFormat`) | `GloryToolDef` extension + 5 tools migrés | HARD test `phase22-glory-hybrid.test.ts` + extension `assembler-uses-manual-path.test.ts` |
| **P22-4** `PROMOTE_PIVOT_SUBCLUSTER` parameterized payload, state-machine guarded, `calibrationSnapshotRef` requis pour PRODUCTION | `services/campaign-tracker/lifecycle.ts` + Mestor pre-flight gate | HARD test `phase22-lifecycle-promotion.test.ts` |
| **P22-5** Dispatch Glory tools via `getGloryTool(slug)` unique | `services/artemis/tools/registry.ts` | Extension `assembler-uses-manual-path.test.ts` |
| **P22-6** Calibration snapshots = `IntentEmission` payloads (zéro nouvelle table) | `services/campaign-tracker/calibration.ts` | HARD test `phase22-no-calibration-table.test.ts` |
| **P22-7** Dangling ADR refs (`0053`–`0057`) remplacées en même commit que le file touché | Repo entier — closure activée Epic 7 | HARD test `phase22-no-dangling-adr-refs.test.ts` (0 hits requis) |

### 3. Owning Neteru (corrige le PRD frontmatter)

Owners Phase 23 = **Seshat · Anubis · Artemis · Mestor**. Le PRD frontmatter listait Ptah ; **Ptah dropped** — Phase 23 n'a pas de scope forge / production d'asset (les measurement tools émettent des assessments, pas des assets). Cap APOGEE **7/7 préservé** : Tarsis-monitoring API et CRM provider sont des **connectors via Credentials Vault** (ADR-0021), pas des gouverneurs.

| Neter | Responsabilité Phase 23 | Sub-système APOGEE |
|---|---|---|
| Seshat | Tarsis connector + `sector-intelligence` wiring + `<OvertonRadar>` consommation Cockpit | Telemetry §4.3 |
| Anubis | CRM connector + MCP transport + `mcp-content-pii-classifier` gate | Comms §4.7 |
| Artemis | 5 measurement Glory tools HYBRID + manual forms + dispatcher | Propulsion §4.1 |
| Mestor | 2 nouveaux Intent kinds + pre-flight `calibrationSnapshotRef` gate + governance closure | Guidance §4.2 |

### 4. Manual-first parity invariant (ADR-0060 enforcement)

Toute capability LLM-bearing de Phase 23 ship sa version UI manuelle en peer (non en recovery). Trois paires :

| LLM path | Manual peer | Epic |
|---|---|---|
| `culture.overtonShift` (sectoral embeddings) | Operator-tagged delta mode (FR26) | Epic 3 |
| `superfan.attribution` (logistic regression) | Manual coefficient entry mode (FR25) | Epic 4 |
| 5 measurement Glory tools (`executionType: "LLM"`) | 5 schema-driven manual forms (FR28) | Epic 5 |

HARD enforcement via extension de `assembler-uses-manual-path.test.ts` (ADR-0071) aux handlers Phase 23.

### 5. Calibration governance — pattern P22-4 + P22-6 combiné

`PROMOTE_PIVOT_SUBCLUSTER.toState === "PRODUCTION"` est refusé en pre-flight Mestor gate sans `calibrationSnapshotRef`. La snapshot est elle-même un `RUN_ATTRIBUTION_CALIBRATION` `IntentEmission` payload — **zéro nouvelle table** : reproductibilité via la hash-chain. La promotion porte donc en elle la traçabilité vers la décision statistique de l'opérateur (FR24 structural, pas advisory).

### 6. Closure de la dette N6-bis (Phase 18 residual)

Les 5 Glory tools migrés en HYBRID reçoivent leur `applicableNatures` annotation **en même commit** que leur migration `executionType`. Les entrées correspondantes dans `phase18ResidualEntry` passent à `RESOLVED`. Phase 23 ferme N6-bis structurellement plutôt que de le pousser en residual perpetual.

### 7. Plan de fermeture — Epic 1 → Epic 7

Implémentation séquencée en **7 epics, 53 stories** (`_bmad-output/planning-artifacts/epics.md` — committed 2026-05-16 commit `355b7db`). Governance-first :

```
Epic 1 — Foundations (this ADR + ConnectorResult<T> + 2 Intent kinds + Prisma migration + 6 test scaffolds + doc-sync + maps)
  ↓
Epic 2 — External Signal Connectors (Tarsis + CRM façades + Console UI + HARD phase22-connector-result.test.ts)
  ↓
Epic 3 — Overton Wiring (sector-intelligence delegation + MCP ingest + Oracle §33 + manual delta mode + HARD phase22-no-silent-zero.test.ts)
  ‖  (parallel)
Epic 4 — Superfan Measurement (attribution regression + cohort retention + lineage + manual coefficient + extension HARD)
  ↓
Epic 5 — Glory Tools HYBRID + N6-bis (executionType extension + 5 manual forms + applicableNatures + HARD phase22-glory-hybrid.test.ts)
  ↓
Epic 6 — Calibration + Lifecycle (handlers + Mestor gate + Console review panel + view switcher + HARD phase22-lifecycle-promotion + phase22-no-calibration-table)
  ↓
Epic 7 — Cockpit + Closure (<OvertonRadar> wiring + new route + dangling-ref 0-hits + ADRs 0077-0081 finalized + MISSION ledger annotations + closure-roadmap target #1 SHIPPED)
```

### 8. Superseded references (P22-7 retirement list)

Les 5 références dangling suivantes, héritées du plan ADR-0052 §"child ADRs" mais jamais matérialisées, sont **retirées** par Phase 23. Chaque occurrence dans le repo est remplacée par son successeur dans le même commit que le file touché. Le HARD test `phase22-no-dangling-adr-refs.test.ts` (activé Epic 7 Story 7.9) garantit 0 hits.

| Référence retirée | Remplacée par | Sujet |
|---|---|---|
| `0053-coherence-llm-evaluator` | ADR-0081 §"applicability to coherence Glory tools" | Évaluation LLM-based de cohérence |
| `0054-superfan-attribution-model` | **ADR-0081** | Calibration méthodologie attribution |
| `0055-overton-algo` | **ADR-0078** | Algo Overton canonical |
| `0056-postmortem-12q` | retiré sans successeur direct (le Glory tool existe, son ADR n'est pas requis) | 12 questions post-mortem |
| `0057-crew-scoring` | retiré sans successeur direct (re-promu en Epic 5 Story 5.4 via `applicableNatures` + future Imhotep work) | Scoring crew |

## Conséquences

**Positives** :
- Les deux mécanismes pivots de MISSION.md (superfans × Overton) passent de placebo à instrument. La MISSION §9 ledger passera de 0/6 à ≥ 3/6 à la fermeture (Cockpit Overton axis live ; operator next-5-actions feed avec real ratio ; Oracle §33 maintenu par Tarsis).
- Cap APOGEE 7/7 préservé — pas de 8ème Neter pour Tarsis ou CRM (connectors via Credentials Vault).
- 0 nouvelle table Prisma (seul un migration additive nullable sur `Campaign` / `CampaignAction`). Calibration snapshots = `IntentEmission` payloads, no schema growth.
- Manual-first parity structurellement enforced — HARD-test bloque toute future régression en LLM-only orchestration.
- Closure de la dette N6-bis Phase 18 folded INTO Phase 23 — pas de chantier séparé Phase 25 pour ce sous-set.

**Négatives / coûts** :
- Le port représente **53 stories réparties en 7 epics** — un mégasprint à grain fin. Le coût de la séquentialité (governance-first) ralentit l'arrivée du founder-facing radar (Epic 7) jusqu'au shipment d'Epics 1-6.
- Le wiring `sector-intelligence/` ↔ `campaign-tracker/culture.*` consacre `sector-intelligence/` comme **canonical Overton home** (ADR-0078) — toute future Overton logic doit l'augmenter, pas le doubler.
- La promotion `MVP → PRODUCTION` des sous-clusters reste **gated on a business decision** (direction sign-off des seuils ROC AUC / RMSE) — Phase 23 ship le MVP, pas la PRODUCTION promotion. Decision déférée (calendar-locked dans `RESIDUAL-DEBT.md` Epic 7 Story 7.10).

**Neutres mais à acter** :
- ADR-0076 (stale-semantics-2-levels) inchangée par Phase 23. Pas de fork.
- Les deferred-trigger targets de la closure-roadmap (#6 Phase 17 calendar / #10 Phase 18-bis trigger / #12 Argos trigger) restent indépendants.

## Migration

Les 5 références dangling sont retirées **graduellement** au fur et à mesure que les fichiers concernés sont touchés (P22-7 distributed retirement). Aucun commit "search-and-replace global" — le travail est porté par chaque epic au moment où il touche le file. La closure (Epic 7 Story 7.9) vérifie via HARD test que 0 hits subsiste après le mégasprint.

Le PRD `_bmad-output/planning-artifacts/prd.md` et la closure-roadmap target #1 sont corrigés en Epic 1 Stories 1.1 + 1.8 — les notes "PRD scope correction" + "Neteru cell : Ptah dropped" + "EPICS_DRAFTED → IN_DEV" pointent vers cette ADR.

## Suivi

**Anti-drift CI** :
- 6 nouveaux tests `phase22-*.test.ts` sous `tests/unit/governance/` — scaffolded en Epic 1 Story 1.7 (mode baseline), activated HARD progressively par chaque epic (Epic 2 / Epic 3 / Epic 5 / Epic 6 / Epic 7).
- Extension `campaign-tracker-coherence.test.ts` en Epic 7 — assertion 6 sous-clusters présents avec lifecycle ≥ MVP.
- Extension `assembler-uses-manual-path.test.ts` (ADR-0071) — interdit `executeStructuredLLMCall` etc. dans les handlers Phase 23.
- `neteru-coherence.test.ts` doit rester green tout au long du mégasprint (APOGEE cap 7/7).

**Calendar / triggers** :
- Aucun trigger calendar pour Phase 23 — l'implémentation court linéairement Epic 1 → Epic 7.
- PRODUCTION promotion des 3 sous-clusters calibrés (`superfan.attribution`, `culture.overtonShift`, `culture.overtonReadiness`) requiert **direction sign-off** ; tracée comme Growth-phase work dans `RESIDUAL-DEBT.md` Epic 7 Story 7.10.

**Cross-references** :
- Architecture complète : `_bmad-output/planning-artifacts/architecture.md` (D1-D9 décisions + P22-1..7 patterns + touched-slice tree)
- PRD : `_bmad-output/planning-artifacts/prd.md` (35 FRs + 14 NFRs + 4 journeys)
- UX : `_bmad-output/planning-artifacts/ux-design-specification.md` (27 UX-DRs + A2 Split + view switcher decisions)
- Epic breakdown : `_bmad-output/planning-artifacts/epics.md` (7 epics, 53 stories, coverage map exhaustif)
- Closure-roadmap : `_bmad-output/planning-artifacts/closure-roadmap.md` target #1
- Mission : `docs/governance/MISSION.md` §9 (verification ledger 0/6 → ≥3/6)

## Notes

- **APOGEE cap 7/7 préservé** sur toute la durée Phase 23. Toute proposition d'ajout d'un 8ème Neter pour "Tarsis" ou "CRM" est rejetée structurellement par `neteru-coherence.test.ts` — ces sont des connectors via Credentials Vault, pas des gouverneurs.
- **NEFER pre-flight Phase 23** : C1 ✓ (CLAUDE.md "Phase status" lu) · C2 ✓ (architecture step-02 a grep CODE-MAP négatif sur tous les nouveaux entities) · C3 ✓ (LEXICON reformulation faite) · C4 ✓ (3 lois APOGEE non violées : pas de regression altitude ; pas de short-circuit cascade ; Thot-gated SLOs) · C5 ✓ (N6-bis folded INTO Phase 23 — pas de scope creep Phase 18) · C6 n/a (les manual modes touchent `Campaign` / `CampaignAction`, pas `Strategy` / `BrandContextNode` / pillar payload).
- **Manual-first parity** est un invariant doctrinal du repo (ADR-0060), pas une feature Phase 23 — Phase 23 le **maintient** dans les nouveaux paths.
- **No-magic-fallback (ADR-0046)** est l'autre invariant doctrinal qui Phase 23 enforce structurellement via P22-2 `INSUFFICIENT_DATA` first-class.
