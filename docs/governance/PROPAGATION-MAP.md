# PROPAGATION-MAP — Le circuit de la donnée (entrée → transformation → sortie)

> Carte du **circuit complet de la valeur** dans La Fusée. Doctrine fixée par l'opérateur (2026-06-16) :
> *« Presque tout dans La Fusée a un chemin de propagation qui remonte jusqu'à l'ADVE. L'ADVE lui-même se nourrit du processus d'intake — c'est le point d'entrée de la valeur. D'autres entrées existent (Seshat = marché). Le circuit entier de la donnée doit exister et servir de base saine pour que les modifs soient implémentées en profondeur sans casser les dépendances. C'est un réseau tentaculaire mais fini : templates d'entrée → mécanique de transformation → templates de sortie. »*
>
> Les autres cartes répondent à d'autres questions : `CODE-MAP` (mot métier ↔ entité), `SERVICE/ROUTER/PAGE/COMPONENT-MAP` (inventaires), `VARIABLE-BIBLE-CANON` (champ ↔ code à plat), `DIMENSIONS` (axes temporels). **Aucune ne trace le circuit entrée→transformation→sortie ni l'arête « ça remonte à l'ADVE ».** C'est le rôle de ce document.

---

## 1. Doctrine — un circuit fini, gouverné aux entrées

```
   ENTRÉES (templates)            TRANSFORMATION (mécanique)              SORTIES (templates)
   intake · brief · sources  ──►  pillar-gateway (writePillarAndScore)  ──►  Oracle 35 · Glory/BrandAsset
   Seshat marché · morning   ──►  scorer · RTIS cascade · composers     ──►  score/palier · calendrier
   operator amend · guilde    ──►  resolveEffectivePillars · staleness   ──►  deliverable forge · PDF · cockpit
                                   └────────── ADVE socle ──────────┘
```

- **ADVE** (`a`/`d`/`v`/`e`) = **socle fondateur**, mais **nourri par les entrées** (l'intake est le point d'entrée n°1 de la valeur ; il n'est pas l'origine, il est alimenté). Muté ensuite **uniquement** par l'opérateur via `OPERATOR_AMEND_PILLAR`.
- **RTIS** (`r`/`t`/`i`/`s`) = **dérivé** de l'ADVE (cascade `ENRICH_R_FROM_ADVE` → `ENRICH_T_FROM_ADVE_R_SESHAT` → `GENERATE_I_ACTIONS` → `SYNTHESIZE_S`). Jamais édité à la main (contrainte type-level).
- **Tout artefact aval** doit avoir une **chaîne traçable jusqu'à l'ADVE** — et l'ADVE jusqu'à une **entrée**.
- **Chokepoint unique d'écriture pilier** : `writePillar` / `writePillarAndScore` dans `src/server/services/pillar-gateway/index.ts:250` (core) / `:592` (avec scoring). Ops : `REPLACE_FULL | MERGE_DEEP | SET_FIELDS | APPLY_RECOS | APPLY_RECOS_RESOLVED`. Authors : `INGESTION | BRIEF_INGEST | OPERATOR | MESTOR | ARTEMIS | GLORY | PROTOCOLE_R/T/I/S`. **Toute écriture de `Pillar.content` DOIT passer par là** (validation Zod + `PillarVersion` + scoring + cascade staleness + auto-approval). Les écritures `db.pillar.*` directes hors gateway sont des trous (cf. §6b).

**Définition d'un trou** : une entité / un champ / une surface dont le chemin (entrée→ADVE→sortie) est **cassé, implicite, hardcodé, mocké, bypassé, ou absent**. Un trou est un drift en puissance.

**Règle NEFER (Phase 2.5)** : avant d'ajouter/modifier un champ/surface/livrable, tracer (1) de quelle **entrée** vient la donnée, (2) par quelle **transformation** (gateway ? composer ?), (3) vers quelle **sortie** ; vérifier que l'écriture pilier passe par le gateway et que la mutation passe par `mestor.emitIntent()`. Si la chaîne manque → soit la brancher, soit l'inscrire au registre des trous (§6) ET l'afficher honnêtement. **Jamais combler un trou en inventant des données.**

---

## 2. Points d'entrée (templates d'entrée → pilier / strategy / asset)

Réseau fini. `G` = passe par le chemin gouverné (`emitIntent` et/ou gateway). `direct` = écrit `Pillar.content` hors gateway (trou, §6b).

| # | Entrée | Donnée ingérée | Template d'entrée | Écrit vers | Voie | Réf. |
|---|---|---|---|---|---|---|
| **A1 Intake** | quick-intake (porte publique) | facts business + Q&A `{biz,a,d,v,e}` + site/socials | `QuickIntakeStartInput` + `PILLAR_SCHEMAS` | **ADVE** (extraction AI → gateway `REPLACE_FULL`), V (financier), E (empreinte web) + intent `FILL_ADVE` ; conversion → gateway (`seedPillarFromIntake`, C1 ✅) | G (service + conversion) | `quick-intake/index.ts:136-953` · `quick-intake.ts seedPillarFromIntake` |
| **A2 Brief ingest** | PDF/DOCX client | `ParsedBriefSchema` | Client+Strategy+`BrandDataSource` → `FILL_ADVE` | G | `brief-ingest/index.ts:33-82` |
| **A3 Ingestion/sources** | fichiers/texte uploadés | texte → `PILLAR_SCHEMAS` | ADVE+RTIS via `writePillarAndScore` (author INGESTION) | G | `ingestion-pipeline/` + `ai-filler.ts:361,444` |
| **A4 Seshat marché** | RSS/Atom réels, études marché, Tarsis, MCP | `MarketStudyExtraction`, feed digests, `ConnectorResult<TarsisSignal>` | **`KnowledgeEntry` / `Sector` / RAG — PAS les piliers direct** ; atteint T via cascade | G (telemetry) | `seshat/external-feeds/`, `market-study-ingestion/`, `tarsis/connector.ts`, `sector-intelligence/` |
| **A5 Operator amend** | décision opérateur | `{pillarKey ADVE, mode, field, value, reason}` | **ADVE** via gateway `SET_FIELDS` (author OPERATOR) + gate cohérence | G | `mestor/operator-amend.ts:39-249` |
| **A6 RTIS cascade** | (dérivé interne) | ADVE | R/T/I/S via gateway (author MESTOR) | G | `mestor/rtis-cascade.ts` |
| **A7 Morning batch** | sources entrantes / email | `IngestedSource` → `BriefIngestionDraft` | Campaign + `CampaignBrief` (pas de pilier) | G | `morning-batch/index.ts:82` |
| **A8 La Guilde** | dépôt mission public | `guildMissionBriefSchema` | shell `Strategy` + `Mission` (pas de pilier) | G | `laguilde.ts:155` |
| **A9 ChangeRequest / OperatorAction** | workflow opérateur | divers | audit/workflow ; `RECONCILE_CAMPAIGN_TO_ORACLE` peut émettre `OPERATOR_AMEND_PILLAR_PROPOSAL[]` (boucle retour ADVE) | G | `campaign-change-request/`, `operator-action/` |
| **A10 Brand tree** | overrides de nœud | `pillarOverrides` | résolution (lecture) + overrides via gateway | G | `brand-node/inheritance.ts:92` |
| **A11 Connecteurs (Vault)** | CRM, ad networks, Tarsis API | `ConnectorResult<T>` | **telemetry/signal seulement — jamais piliers** | G (read-only) | `anubis/providers/*` |
| **A12 Seeds / canon-sync / infer** | bootstrap & god-mode | objets piliers pré-fabriqués | `Pillar.content` **direct** | direct ⚠️ | `prisma/seed-*.ts`, `canon-sync.ts:144`, `infer-needs-human-fields.ts:451` |
| **A13 Réseaux de la marque (OAuth founder)** | comptes sociaux connectés par le porteur (ADR-0128) | tokens OAuth chiffrés AES-GCM + compteurs d'audience | `SocialConnection` + `FollowerSnapshot` (**telemetry/communauté seulement — jamais piliers** ; E atteint via rescan footprint A1/ADR-0121) | G (`ANUBIS_SOCIAL_CONNECT_ACCOUNT` emitIntent + governedProcedure sync/disconnect) | `oauth-integrations/`, `anubis/social-connect.ts`, `api/integrations/oauth/*` |
| **A14 Recherche `/scorer` (empreinte publique)** | marque hors-plateforme scorée par un prospect (ADR-0151) | empreinte /100 + ventilation dimensions + compteurs followers (Apify) | `BrandFootprintSnapshot` (**base marché Seshat — jamais piliers, jamais leaderboard /200 D9** ; cache instantané par `brandKey`) | observabilité (single-writer `seshat/brand-registry/`, best-effort, non gouverné — précédent `persistSnapshot`) | `seshat/brand-registry/`, `trpc/routers/footprint.ts`, `/console/signal/brand-directory` |
| **A15 Prospect Scoring (opérateur)** | l'opérateur place un prospect + rivaux sur le leaderboard /200 (ADR-0154) | shell Client+Strategy → footprint (`ENRICH_E`→`FollowerSnapshot`→arènes A/V) + victoires documentées LLM sourcées → quarantaine `EpreuveCandidate` → revue → `Epreuve` | `ScoreVerdict` (leaderboard) ; **jamais l'ADVE** (le scoreur ne lit pas les piliers) | G (`SESHAT_SCORE_PROSPECT`/`SESHAT_HUNT_VICTORIES`/`SESHAT_DECIDE_EPREUVE_CANDIDATE`, requireOperator ; LLM cantonné à HUNT via Gateway) | `seshat/scoreur/{prospect,candidates}.ts`, `seshat/argos/victory-hunt.ts`, `/console/signal/prospect-scoring` |
| **A16 Feedback testeur (ADR-0155)** | un testeur connecté remonte un bug/idée/retour depuis l'app (bouton flottant AppShell) | `kind`+message+pageUrl+userAgent | `Feedback` (canal support dédié ; **jamais piliers, jamais leaderboard**) + `Notification` best-effort aux admins | G (`SUBMIT_FEEDBACK` sans requireOperator / `TRIAGE_FEEDBACK` requireOperator, governor INFRASTRUCTURE) | `services/tester-feedback/`, `trpc/routers/feedback.ts`, `components/shared/feedback-button.tsx`, `/console/socle/feedback` |

---

## 3. Mécanique de transformation (le milieu)

| Transformer | Entrée → Sortie | Réf. |
|---|---|---|
| **Pillar Gateway** (chokepoint) | write request → `Pillar` validé + versionné + scoré + cascade staleness ; publie `pillar.written` | `pillar-gateway/index.ts:250,592` |
| Scorer ADVE | 8 piliers + biz context → `AdvertisVector` (/200) → `classifyTier` (déterministe) | `advertis-scorer/index.ts:70-239` · `domain/brand-tier.ts:56-64` |
| Cascade RTIS | ADVE → R/T/I/S (`AI_PROPOSED`) | `mestor/rtis-cascade.ts:352-820` |
| Staleness propagator | pilier amendé → dépendants `staleAt` (A/D/V/E→[R,I,S] ; R/T→[I,S] ; I→[S]) | `staleness-propagator/index.ts:33-42` |
| `resolveEffectivePillars` | nœud + arbre → piliers effectifs + provenance | `brand-node/inheritance.ts:92-187` |
| Glory tools + LLM engine | contexte piliers → brief/asset (Zod-enforced, ADR-0067) | `artemis/tools/engine.ts:27-103` |
| Oracle composers/mappers | piliers + Seshat/Sector + snapshots → 35 sections (dont §34 `realSignal` mesuré, ADR-0134 §B7) | `strategy-presentation/{section-mappers,deterministic-composers}.ts` |
| Notoria | piliers/scores → recommandations → appliquées via gateway | `notoria/lifecycle.ts`, `apply-payload.ts:25` |
| **Chaîne de mesure communautaire** (ADR-0134, quotidienne) | collecte A13 (`FollowerSnapshot`/`SocialPost`/`SocialInboxItem`) → `CommunitySnapshot` mesurés (fractions 0-1, null honnête) → devotion sur audience réelle (`trigger="social-sync"`) → cult index → plafond d'évidence CULTE/ICONE ; superfans : actualisation des profils nés (jamais-dégrader, cap 0.60) + candidats à revue humaine | `cult-index-engine/community-snapshot-writer.ts` · `devotion-engine/index.ts` · `seshat/superfan-ingest.ts` · cron `social-sync` |
| **Chaîne sectorielle Overton** (ADR-0134 §B6, quotidienne) | digests RSS `EXTERNAL_FEED_DIGEST` → registre `Sector` + pont Tarsis (`bridgeTarsisToSectorIntelligence` — caller posé) → `Sector.overtonState` → radar founder + Oracle §34 | `seshat/tarsis/sector-refresh.ts` · cron `external-feeds` |

---

## 4. Templates de sortie (la valeur sort vers client/opérateur)

| Sortie | Dépend de | Réf. |
|---|---|---|
| Oracle (35 sections, 3 tiers) | ADVE+RTIS + Sector/Overton + snapshots | `SECTION_REGISTRY` (`types.ts`) |
| Score / palier | 8 piliers → vecteur → tier | `advertis-scorer` + `brand-tier.ts` |
| Glory outputs / `BrandAsset.kind` | piliers + manipulation mix | `glory-composers.ts:142-366`, engine |
| Calendrier lancement/social | piliers d/e/i/s (+ voix pilier D, cf. H1) | `glory-composers.ts` composeContentCalendar |
| Deliverable forge | DAG de `BrandAssetKind` requis | `deliverable-orchestrator/resolver.ts:39-98` |
| Roadmap / BrandAction | pilier I actions / S synthèse | `action-db/` (ADR-0094) |
| Rapport intake + PDF + niveau | ADVE + vecteur + Seshat grounding | `quick-intake/narrative-report*.ts`, `brand-level-evaluator.ts` |
| Cockpit (Overton, lineage, éditeur ADVE) | pilier T + signaux connecteurs | `cockpit-router.ts:38-173` |
| Argos dossiers | Hunter harvest (pas piliers) | `seshat/argos/` (ADR-0083/0100) |

---

## 5. Gouvernance du circuit — **Yggdrasil** (vérifié 2026-06-16)

Le circuit de la donnée **EST Yggdrasil**, et **Yggdrasil est ungouverné** — substrat organique (comme NSP, comme la layering cascade). **Aucun Neter ne possède le substrat.** La responsabilité est partagée et explicite :

- **Mestor possède les gates (= valves)** : `services/mestor/gates/*` + la porte d'entrée unique `mestor.emitIntent()` + le journal hash-chainé `IntentEmission` (Q1 traçabilité, Q3 non-bypass). *« Il transporte, il ne décide pas. »*
- **Seshat possède l'observabilité** (Q2) : `NspEvent` + Tarsis/Argos. *« Observation + signaux, n'agit jamais sur une marque. »*
- **NSP** = sous-protocole de Yggdrasil, **gouverné par Anubis**.
- **3 invariants** : **Q1** traçabilité = `IntentEmission.id` hash-chainé (ADR-0004) · **Q2** observabilité = `NspEvent`/payload · **Q3** non-bypass = passage obligé par `mestor.emitIntent()`.

Sources : [ADR-0082](adr/0082-yggdrasil-value-circulation-substrate.md) (titre + amendment + table propriétaire `:54-59`) · [STATE_FINAL_BLUEPRINT.md](STATE_FINAL_BLUEPRINT.md) §5.2 (`:200-204`), §5.5 (`:228-234`), §7 substrats (`:2655-2662`). NB : `LEXICON.md` et `PANTHEON.md` sont désormais des stubs 6 lignes → canon dans STATE_FINAL_BLUEPRINT.

---

## 6. Registre des trous (audit 2026-06-16)

Sévérité : 🔴 à corriger · 🟡 par-design mais flaggé honnête · 🟢 corrigé · ⚪ par-design non-ADVE (intentionnel).

### 6a. Trous de propagation (dérivation aval)

| # | Trou | Sévérité | Réf. |
|---|---|---|---|
| **H1** | `ContentPost.caption`/`illustration` non liés à la voix de marque | 🟢 **corrigé** — branché pilier D (`tonDeVoix`+`lexique`) | `lib/types/launch-calendar.ts:128-185` |
| **H2** | cadence éditoriale (« 4-5 posts/sem ») + phases Overton hardcodées | 🔴 ouvert · Artemis | `glory-composers.ts:294-302` |
| **H3** | mix manipulation 0.25 implicite quand `manipulationMix` null | 🟡 flaggé | `deterministic-composers.ts:530-547` |
| **H5** | Oracle §22/§23 `summary = draft.placeholder` (Imhotep/Anubis draft) | 🟡 ouvert | `deterministic-composers.ts:186-214` |
| **H6** | ceiling de palier (superfans/cult/âge/Tarsis) = non-ADVE | ⚪ par-design (plafond, jamais source) | `advertis-scorer/index.ts:171-239` |
| **H7** | NPS proxy depuis Devotion Ladder | 🟡 flaggé | `deterministic-composers.ts:326-365` |
| **H8** | deux topologies de dépendance pilier divergentes (`domain/pillars.ts` linéaire vs `staleness-propagator` canonique) — dormante (réf. seulement par test) | 🔴 ouvert · réconcilier | `domain/pillars.ts:200-206` |
| **H9** | prompts Glory sans garde de staleness → peut lire un RTIS périmé | 🟡 ouvert | `artemis/tools/engine.ts:49-95` |
| **H4** | Tarsis weak signals = intel marché externe | 🟢 **dé-mocké** (2026-06-14) : signal réel dérivé des digests RSS `EXTERNAL_FEED_DIGEST`, zéro credential requise ; **câblé au cron** (2026-07-13, ADR-0134) : registre `Sector` provisionné + refresh sectoriel via `refreshSectorsFromRecentDigests` (external-feeds). Restent absents (honnêtes) : `vocabularyOverlap`/`embeddingDelta` (embeddings requis) | `seshat/tarsis/connector.ts` · `seshat/tarsis/sector-refresh.ts` |

### 6b. Trous de circuit (entrées / gouvernance) — Q3 non-bypass affaibli

| # | Trou | Sévérité | Réf. |
|---|---|---|---|
| **C1** | ~~Conversion intake → Strategy écrit `Pillar.content` direct~~ → **rerouté via le gateway** (`seedPillarFromIntake` → `writePillar`, REPLACE_FULL, author INGESTION) : validation Zod (warnings — contenu intake partiel, jamais strict) + `PillarVersion` + cascade staleness + author trail désormais appliqués sur les 3 chemins de conversion. **Bare `writePillar` volontaire** (pas `writePillarAndScore`) : préserve l'`advertis_vector` calculé à l'intake — un recompute depuis le contenu brut partiel ferait régresser le score affiché ; reconcile/score sur la prochaine écriture réelle / activation. | 🟢 **corrigé** (2026-06-16) | `trpc/routers/quick-intake.ts` (`seedPillarFromIntake`) |
| **C2** | ~~`infer-needs-human-fields` écrit `content`+`fieldCertainty` direct~~ → **rerouté via le gateway** (`writePillar` REPLACE_FULL + `targetStatus: AI_PROPOSED`, author AUTO_FILLER) ; `fieldCertainty` (métadonnée, pas content) écrite séparément. Validation + version + cascade + author trail + protection LOCKED désormais. | 🟢 **corrigé** (2026-06-16) | `infer-needs-human-fields.ts` |
| **C3** | `canon-sync` écrit pilier S direct + matérialise `vector` (god-mode push) hors gateway | 🟡 ouvert (best-effort) | `canon-sync.ts:144-154` |
| **C4** | seeds écrivent piliers direct (bootstrap, attendu) mais **non gardés par CI** | 🟡 par-design non-gardé | `prisma/seed-*.ts`, `scripts/seed-*` |
| **C5** | ~~aucun test CI n'impose l'écriture pilier via gateway~~ → **KEYSTONE posé** : test CI HARD qui interdit toute écriture `Pillar.content` brute (non-vide) hors gateway, avec allowlist d'exceptions formalisée « à mes risques et périls » (hole id + reason + reroutePlanned). « single write point » = désormais invariant CI, pas convention. Attrape C1/C2/C3 + sites non catalogués (strategy.ts:78, boot-sequence, pillar-versioning) — tous inscrits comme risques acceptés. | 🟢 **corrigé** (2026-06-16) | `tests/unit/governance/no-bare-pillar-content-write.test.ts` |
| **C6** | gate **`BRIEF_VS_ADVE_COHERENCE` advisory posé** (ADR-0103) : cohérence brief↔noyau ADVE **déterministe** (recouvrement vocabulaire, zéro LLM), câblée pre-flight `emitIntent` sur `PTAH_MATERIALIZE_BRIEF` (frontière production), verdict `WARN` non-bloquant surfacé sur `IntentResult.warnings`. Reste 🟡 : enforcement `BLOCK` + wiring A2/A7 + UI override manuel = **Phase 24** (heuristique trop fragile pour hard-bloquer). `INTAKE_LEAD_QUALIFICATION` toujours absent (D-8.2). | 🟡 advisory posé (BLOCK Phase 24) | `mestor/gates/brief-vs-adve-coherence.ts` |
| **C7** | ~~test invariants Yggdrasil jamais shippé~~ → **posé** : `yggdrasil-three-invariants.test.ts` fige Q1 (IntentEmission hash-chaînée `prevHash`/`selfHash` + `emitIntent` persiste), Q2 (`observeIntent` + `observationStatus` — pas de modèle `NspEvent`, mécanisme runtime = observationStatus), Q3 (non-bypass enforcé par `lafusee/no-direct-service-from-router`). | 🟢 **corrigé** (2026-06-16) | `tests/unit/governance/yggdrasil-three-invariants.test.ts` |
| **C8** | écart nom-vs-réalité **Seshat→T** : `ENRICH_T_FROM_ADVE_R_SESHAT` implique un flux Seshat→pilier T, mais le prompt T raisonne ADVE+R seuls (`seshatRefs` réservé/non-utilisé). Le marché atteint le client via Oracle §33/34 + RAG, pas via une écriture tracée dans T. | 🟡 ouvert · Artemis | `rtis-cascade.ts:147` |

> Les 🔴 ne doivent pas être « comblés » en inventant des données. Avancement (galileo PR #258) : ~~**C5**~~ ✅ **posé** (keystone, convention → invariant CI) · ~~**C6**~~ 🟡 **advisory posé** (cohérence brief↔ADVE déterministe, WARN non-bloquant ; BLOCK = Phase 24) · ~~**C1**~~ ✅ **rerouté** (`seedPillarFromIntake` → gateway, 3 entrées retirées de l'allowlist C5). **La « base saine » que la doctrine exige est atteinte** : tout bypass pilier restant (C2/C3 + 3 sites catalogués) est *déclaré et traçable* (allowlist « à mes risques »), plus jamais silencieux ; une modif aval ne peut plus introduire un nouveau bypass sans faire échouer la CI. ~~C2~~ ✅ rerouté + ~~C7~~ ✅ posé. Restant (non-bloquant) : **C3** (`canon-sync` god-mode best-effort — 1 site `reroutePlanned`, le pilier `vector` est une projection légitime) + **C8** (Seshat→T nom-vs-réalité — chantier Artemis). Les sites non catalogués `strategy.ts` (seed brand-create) + `boot-sequence` (normalize) restent `reroutePlanned` à l'allowlist.

---

## 7. Protocole NEFER (Phase 2.5)

Avant tout ajout/modif d'un champ/surface/livrable :
1. **Entrée** : d'où vient la donnée (A1-A12) ? Si nouvelle entrée → passe-t-elle par `emitIntent` + gateway ?
2. **Transformation** : par quel transformer (§3) ? Toute écriture `Pillar.content` → **gateway obligatoire** (sinon trou §6b).
3. **Sortie** : la chaîne remonte-t-elle à l'ADVE puis à une entrée ? Sinon → trou §6, à brancher ou afficher honnêtement.
4. **Propagation amont** : un changement de type/schéma partagé → propagé à tous ses consommateurs (`tsc` + grep importeurs) ET à la doc (CHANGELOG Phase 6, ce registre, CODE-MAP).

---

## 8. Maintenance

Document hand-authored (comme `DIMENSIONS.md`). Arêtes dispersées (`variable-bible.feedsInto`, `staleness-propagator.PILLAR_DEPENDENCIES`, `rtis-cascade`, composers, `SECTION_REGISTRY`, entrées A1-A12). **Améliorations futures** : (a) `scripts/gen-propagation-map.ts` qui moissonne `feedsInto`+`PILLAR_DEPENDENCIES` ; (b) le test CI C5 (gateway-only) qui rendrait Q3 enforced. Ré-auditer ce registre quand une entrée, un transformer, un composer, un Glory tool ou une section Oracle est ajouté/modifié.
