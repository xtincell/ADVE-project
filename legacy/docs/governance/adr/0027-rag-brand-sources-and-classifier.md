# ADR-0027 — RAG sur sources du portail de marque + filtreur qualifiant

**Date** : 2026-05-02
**Statut** : Accepted
**Phase** : 16 (out-of-band — pas de nouvelle phase APOGEE, extension de Telemetry + Propulsion)
**Auteur direction** : opérateur (user)
**Note** : ce dossier était initialement numéroté 0023 (PR #39). Renuméroté 0027 en post-merge — arbitrage NEFER §3 anti-doublon : ADR-0023 attribué à OPERATOR_AMEND_PILLAR (PR #38, mergée chronologiquement avant).

## Contexte

Le founder uploade dans `/cockpit/brand/sources` des fichiers (PDF brandbook, logo PNG, rapports), des notes, des URLs. Aujourd'hui, ces sources alimentent les piliers ADVERTIS via `ingestion-pipeline.fillPillar` puis stagnent : elles **ne nourrissent ni le RAG (Seshat context-store) ni le vault (BrandAsset)**. Conséquence concrète :

1. Artemis ne peut pas RAG-search le brandbook PDF lors d'un brief — la nuance contextuelle manque, les briefs sont génériques.
2. Le logo uploadé reste prisonnier dans `BrandDataSource` ; Artemis et Ptah ne peuvent pas le réutiliser dans les forges (pas de `BrandAsset.kind=LOGO_FINAL` à requêter).
3. Un PDF brandbook contient en réalité 5+ actifs distincts (logo, palette chromatique, typo, ton, manifesto) que personne ne décompose. Toute la richesse reste enfouie dans `rawContent`.

**Demande explicite du user** : *"Le portail de marque a un sorte d'onglet dédié aux sources… Je pense que ce serait intéressant d'implémenter (1) une fonctionnalité de RAG, (2) un filtreur qui qualifie en détail les sources et les range dans les bons endroits du vault d'asset."*

## Décision

Deux fonctions complémentaires, branchées sur la pipeline existante :

### 1. RAG sources

Étendre `seshat/context-store/indexer.ts` pour itérer sur `BrandDataSource(processingStatus IN [EXTRACTED, PROCESSED])` et créer N `BrandContextNode(kind="BRAND_SOURCE")` par source via un chunker simple (`chunkText`, paragraph/sentence-aware, ≤2500 chars/chunk).

Idempotence : `indexBrandSource(sourceId)` supprime les anciens chunks (sourceId, kind=BRAND_SOURCE) avant de réindexer, donc un `incrementalUpdate` re-extrait sans accumuler de doublons.

`oracle-augment.ts` (`getOracleBrandContext`, `getOracleBrandContextByQuery`) accepte une option `includeSources: boolean` qui retourne un bloc `sourceReferences[]` distinct (verbatim citation `[fileName#chunk]`) — séparé du narratif lossy. Permet à Artemis de citer le brandbook texto-littéral.

**Pas de migration** : on utilise `BrandContextNode.kind` qui est déjà `String`. Le pipeline d'embedding existant (`embedBrandContext`, multi-provider Ollama→OpenAI→no-op) prend les nouveaux chunks au prochain run.

**Multi-pillar transparent** : les chunks BRAND_SOURCE sont indexés avec `pillarKey=null` — le retrieval cosine retourne le même chunk pour des queries pillaires différentes. Une source peut donc nourrir 1, plusieurs ou les 8 piliers ADVERTIS sans biais d'indexation.

### 2. Filtreur qualifiant

Nouveau service `src/server/services/source-classifier/`, governor MESTOR, qui propose 1→N `BrandAsset(state=DRAFT)` pour chaque source EXTRACTED via une cascade hybride :

```
BrandDataSource EXTRACTED
       ├─ classifyByHeuristic (mime + filename + content)
       │     └─ If image AND (needsVision OR conf < 0.7) → classifyImage (vision LLM)
       │     └─ If document AND content ≥ 800 chars     → decomposeDocument (LLM)
       └─ proposeBrandAssetsFromSource → createBrandAsset(state=DRAFT)
              metadata.sourceDataSourceId = source.id  ← lineage
              pillarSource = KIND_TO_PILLAR[kind]      ← canonical mono-pillar
```

`KIND_TO_PILLAR` (`pillar-mapping.ts`) est la **source de vérité unique** mapping chaque `BrandAssetKind` ∈ `BRAND_ASSET_KINDS` (60 valeurs Phase 10 + 13) à exactement un `PillarKey`. Test anti-drift `tests/unit/services/source-classifier.test.ts` enforce l'exhaustivité et la couverture des 8 piliers.

`asset-tagger.tagAsset` est appelé en post-create (non-bloquant) pour remplir `pillarTags` multi-pillaire (8 keys scorées) sans bloquer le flux.

L'opérateur valide via une nouvelle section UI "Propositions vault" sur `/cockpit/brand/sources` : Accepter (DRAFT → SELECTED, auto-promote ACTIVE pour kinds canoniques BIG_IDEA / MANIFESTO / BRIEF…), Modifier kind, Rejeter, Tout accepter ≥0.8.

### Trigger : auto + validation opérateur (per user choice)

L'auto-classification fire sur chaque `uploadFile`/`addText`/`addManualSource` du router tRPC `ingestion`, en passant `ctx.session.user.id` comme `operatorId` (lineage). Le user clique pour passer DRAFT → CANDIDATE/SELECTED. Aucune auto-promotion past DRAFT.

### Vision LLM hybride (per user choice)

`classifyByHeuristic` retourne `{kind, confidence, needsVision}`. Si confiance < 0.7 OU needsVision (image générique sans nom évocateur), on fallback sur `classifyImage` (vision LLM) qui précise entre LOGO_FINAL / LOGO_IDEA / KV_VISUAL / PACKAGING_LAYOUT / OOH_LAYOUT / STORYBOARD.

### Décomposition 1→N (per user choice)

`decomposeDocument` instruit explicitement le LLM à couvrir **plusieurs piliers ADVERTIS** quand le document est riche (brandbook PDF → ≥3 piliers). Cap à 6 propositions/doc. Test "1 source → 8 piliers" couvre le scénario brandbook complet.

## Intent kinds

3 nouveaux kinds dans `src/server/governance/intent-kinds.ts` + SLOs dans `slos.ts` :

- `INDEX_BRAND_SOURCE` (governor: SESHAT, async, p95: 8s) — chunking + queue d'embedding pour 1 source
- `CLASSIFY_BRAND_SOURCE` (governor: MESTOR, async, p95: 30s) — heuristique + LLM, no DB write
- `PROPOSE_VAULT_FROM_SOURCE` (governor: MESTOR, async, p95: 35s) — classify + persist N BrandAsset DRAFTs

Tous routés via `mestor.emitIntent` → `artemis.commandant.execute` (pattern standard).

## Surfaces tRPC

Le router `brand-vault` est étendu pour exposer le state-machine Phase 10 (déjà câblé dans `engine.ts` mais non-exposé) : `selectFromBatch`, `promoteToActive`, `supersede`, `archive`, `listByKind`, `listDraftsFromSource`. Comble la dette du router legacy.

Nouveau router `source-classifier` : `proposeFromSource` (re-trigger), `listProposalsForStrategy`, `acceptProposal` (DRAFT → SELECTED, auto-ACTIVE pour kinds canoniques), `rejectProposal`, `acceptAllForSource` (batch ≥0.8), `getKinds` (UI dropdown).

## Anti-doublon (NEFER §3.1)

- ✅ Pas de nouveau model Prisma
- ✅ Réutilise `BrandContextNode` (ajout valeur `kind="BRAND_SOURCE"`, pas de migration)
- ✅ Réutilise `BrandAsset` + state machine `engine.ts` (Phase 10)
- ✅ Réutilise `embedder` + `ranker` + `oracle-augment` (Seshat)
- ✅ Réutilise `extractImage` Claude vision pattern (`ingestion-pipeline/extractors.ts:73`)
- ✅ Réutilise `asset-tagger.tagAsset` (post-create non-bloquant)
- ✅ Réutilise `isBrandAssetKind` validateur runtime (`src/domain/brand-asset-kinds.ts`)
- ✅ Lineage source→asset via `BrandAsset.metadata.sourceDataSourceId` (champ Json existant)

## Conséquences

- Artemis peut requêter `brandVault.listByKind({ kind: "LOGO_FINAL", state: "ACTIVE" })` pour récupérer le logo pour une forge Ptah.
- Oracle / Mestor obtiennent `getOracleBrandContextByQuery(strategyId, query, { includeSources: true })` qui mixe narratif (Pillar.content lossy) + précis (DB direct) + sources opérateur (verbatim chunks).
- Un brandbook upload produit ~5 BrandAssets DRAFT (logo, palette, typo, ton, manifesto) couvrant ≥3 piliers ADVERTIS automatiquement, prêts pour validation opérateur.
- Pas de back-fill auto des BrandDataSource historiques — l'opérateur peut re-trigger via le bouton "Relancer" de la Propositions vault panel.

## Alternatives écartées

- **1 source → 1 BrandAsset (au lieu de N)** : perd la granularité — Artemis ne peut pas requêter "la palette chromatique" séparément du brandbook complet.
- **Heuristique pure sans LLM** : ne distingue pas LOGO_FINAL d'un screenshot ; les logos seraient mal classés et inutilisables par Artemis.
- **Auto-promote sans validation opérateur** : risque de drift narratif si le LLM se trompe sur un kind structurant (POSITIONING ↔ MANIFESTO). User a explicitement préféré la validation opérateur.
- **Modifier `BrandDataSource` pour ajouter un `kind` natif** : double l'information avec `BrandAsset.kind` ; viole l'anti-doublon CODE-MAP. Le filtreur sépare cleanly l'input (BrandDataSource = matière brute) du qualifié (BrandAsset = vault structuré).

## Verification

```bash
npx vitest run tests/unit/services/seshat-chunker.test.ts
npx vitest run tests/unit/services/source-classifier.test.ts
npm run lint:governance
npx tsc --noEmit  # no new errors on touched surfaces vs main
```

End-to-end sur dev :
1. Upload `acme-brandbook.pdf` sur `/cockpit/brand/sources`
2. La source passe EXTRACTED → fold "Propositions vault" affiche ≥3 BrandAssets DRAFT (CHROMATIC_STRATEGY, TYPOGRAPHY_SYSTEM, TONE_CHARTER, …) couvrant ≥2 piliers ADVERTIS
3. Cliquer Accepter sur la proposition LOGO_FINAL → state passe SELECTED
4. Côté `/cockpit/brand/assets`, l'asset apparaît dans le vault
5. Côté tRPC : `seshatSearch.searchByQuery({ query: "palette de couleurs", strategyId, kinds: ["BRAND_SOURCE"] })` retourne les chunks RAG du PDF
