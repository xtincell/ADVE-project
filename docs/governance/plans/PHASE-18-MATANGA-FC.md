# Phase 18 — Matanga Agency × FrieslandCampina × Brand Tree
## Plan d'exécution complet

> **Auteur** : NEFER (opérateur expert La Fusée)
> **Date** : 2026-05-06
> **Cible** : repo `LaFusee_ADVE-main`, branche `claude/pensive-keller-6afb14` (worktree NEFER) → merge final sur `main`
> **Driver** : opérateur Matanga (founder La Fusée) — ingestion FrieslandCampina + dashboard agence cross-clients Afrique
> **ADRs liés** : [ADR-0059](../adr/0059-brand-tree-multi-archetype.md), [ADR-0060](../adr/0060-llm-as-ui-orchestrator-manual-first.md), [ADR-0061](../adr/0061-brand-nature-archetypes-template.md), [ADR-0062](../adr/0062-morning-brief-batch-validation.md)

---

## 0. Contexte — pourquoi cette phase existe

### 0.1 — Le déclencheur business

L'opérateur (Matanga Agency, founder La Fusée) prépare l'ingestion de FrieslandCampina dans l'OS. FC est un dossier déjà actif depuis 1+ an chez Matanga (audit des fichiers `Projets en cours 180625.xlsx` et `Checklist_Ramadan_2026_LISTE.xlsx` révèle 9 projets actifs + 193 livrables granulaires en cours sur la campagne saisonnière Ramadan 2026).

→ **L'OS doit être prêt à recevoir un dossier FMCG corporate multi-marques sans hack ni dette.** Le schéma plat actuel (`Operator → Client → Strategy`) ne le permet pas.

### 0.2 — Les manques identifiés (audit Phase 0 NEFER)

| # | Manque | Impact |
|---|---|---|
| 1 | Aucune hiérarchie de marques (pas de `parentBrandId`, pas de model `Brand` standalone) | Multi-marques sous holding impossible à modéliser |
| 2 | Cascade FMCG réelle = 7 niveaux (CORPORATE → MASTER → CLUSTER → REGIONAL → LINE → VARIANT → SKU) | Schéma plat 3 niveaux insuffisant |
| 3 | Pas de `CampaignDeliverable` matrice 6D | Granularité Ramadan (193 livrables) non capturable |
| 4 | Pas de workflow dual `STATUT créa | STATUT client` ni indicateur RAG | Outil de pilotage agence absent |
| 5 | Pas de dashboard agence cross-clients filtré Afrique | KPIs trans-portefeuille manquants |
| 6 | Pas d'ingestion brief automatisée matin (paste mail/slack → extraction → matching → matérialisation) | Cadence quotidienne manuelle 30-60 min/jour |
| 7 | Aucun pattern d'archétype par `BrandNature` (PRODUCT/SERVICE/IP/etc.) | Verrouille l'OS à FMCG-only |
| 8 | Pas d'invariant Manual-first parity sur les features LLM | Risque architectural majeur (LLM = SPOF) |

### 0.3 — Audit fichiers Matanga (terrain réel)

#### Fichier `Checklist_Ramadan_2026_LISTE.xlsx` (193 livrables Ramadan 2026 FC)

```
Header : N° | TYPE | ZONE | PAYS | MARQUE/SKU | CATÉGORIE | PACKAGING | PROMO | LIVRABLE | LANGUE | ✓
```

**Distincts** :
- **TYPE** (2) : VISUEL, SPOT/MEDIA
- **ZONE** (4) : Côte d'Ivoire, Western Cluster, Tropical Cluster, ESA
- **PAYS** (15) : CIV, SEN, BF, BJ/TG, CMR, CG, RDC, DJI, GAB, GMB, GHA, GIN, MLI, TGO
- **MARQUE/SKU** (25) : variantes 160g/400g/900g/990g/2500g sur 6 master brands (Bonnet Rouge, Belle Hollandaise, Peak, Coast, Rainbow, Omela)
- **CATÉGORIE** (6) : EVAP / EVAP Gold / EVAP Promo / EVAP Regular / IMP
- **PACKAGING** (5) : Stackable / Unstackable / Tin / `-`
- **PROMO** (6) : Non Promo / 10g more / 10% more / 10g more 2025 / 10g more 2026 (versionning saisonnier)
- **LIVRABLE** (19) : OOH 10/12/18m², Poster 60x40/60x80, POSM, TV Spot, Radio Spot, Banderole, Wobbler, T-Shirt, Présentoir, Chevalet, Lampost, Outdoor, Digital Ads, Digital Poster, Table Sampling, TG
- **LANGUE** (3) : FR / EN / FR&EN

#### Fichier `Projets en cours 180625.xlsx` (project tracker juin 2025)

```
Header (row 6) : CLIENT | PROJET | LIVRABLES | STAFF CREA | STATUT créa | STATUT client | Commentaires | RAG
Légende RAG : Réalisé / À faire / En cours / En retard
```

**FrieslandCampina déjà actif** avec 9+ projets en flight :
- Campagne saison des pluies (BR OOH EVAP+IMP, équipe Serge/Stuart/Luther — déprécié)
- Campagne 50ans Peak — En conception
- Dépliant FC full brand (Nelson/Dérick/Alex/Stéphane — équipe historique)
- Plateforme de com lait Bonnet Rouge
- Campagne promo baisse de prix sachet 16g
- Bonnet Rouge Délice (lancement, en attente retour packaging)
- Adaptations Peak Gabon + Belle Hollandaise Mali (sous-traités à l'agence Ghana)
- Star De Pub
- Appel d'offre Digital

#### Fichier `PROJETS EN COURS_MATANGA AGENCY.xlsx`

**🚨 Non-lisible en l'état** — sandbox macOS Mail (`com.apple.mail.Library/Containers`) bloque même `cp` et `ditto`. À déplacer manuellement par l'opérateur (Finder drag → `~/Downloads/MATANGA.xlsx` ou `~/Desktop/`) avant J5 pour ne pas rater une dimension structurante du pilotage agence.

#### Équipe créa Matanga actuelle (confirmée par opérateur 2026-05-06)

- **Alex** (founder, Direction Artistique lead)
- **Papin** (graphiste)
- **William** (graphiste)

→ Serge & Stuart sont partis. Pré-import Imhotep CrewMember sur ces 3 personnes uniquement.

---

## 1. Architecture cible — data model post-Phase 18

### 1.1 — Modèle d'arbre marque (cf. ADR-0059)

```prisma
model BrandNode {
  id, name, slug
  operatorId          // = Matanga
  clientId            // = FC ou autre Client
  parentNodeId String?
  nodeKind     String // libre, validé contre BRAND_NATURE_ARCHETYPES
  nodeNature   BrandNature
  nodeRole     String[] @default([])
  pillarOverrides Json?
  inheritanceLocked Boolean @default(false)
  countryCode  String? @db.VarChar(2)
  clusterTag   String?
  lifecycle    String  @default("ACTIVE")
  pillarSnapshotAtTransfer Json?  // Phase 18-bis
  strategyId   String?  // strangler vers Strategy legacy ou exploitation
}

enum BrandNature {
  PRODUCT  SERVICE  CHARACTER_IP  FESTIVAL_IP  MEDIA_IP
  RETAIL_SPACE  PLATFORM  INSTITUTION  PERSONAL
}
```

**Cascade canonique PRODUCT (FMCG)** — 7 niveaux :

```
CORPORATE (FrieslandCampina)
  └── MASTER_BRAND (Bonnet Rouge)
        └── REGIONAL_CLUSTER (Western Cluster)
              └── REGIONAL_BRAND (Sénégal)
                    └── PRODUCT_LINE (BR EVAP)
                          └── PRODUCT_VARIANT (EVAP Promo)
                                └── SKU (160g Unstackable 10g more 2026)
```

### 1.2 — Modèles annexes Phase 18

```prisma
model CampaignDeliverable {  // Phase 18-A0 (matrice 6D Ramadan-style)
  id, campaignId, targetNodeId
  countryCode, clusterTag
  deliverableType  // OOH_12M2 | POSTER_60x40 | POSM | TV_SPOT | RADIO_SPOT | BANDEROLE | WOBBLER | ...
  language         // FR | EN | FR_EN
  promoTag         // PROMO_RAMADAN_2026 | PROMO_BACK_TO_SCHOOL_2025 | NON_PROMO
  status           // TODO | IN_PROGRESS | DELIVERED | VALIDATED
  rag              // GREEN | AMBER | RED (calculé OU manuel override)
  manualRagOverride
  brandAssetId
  delegatedToOperatorId
  dueDate, deliveredAt, validatedAt
}

model IngestedSource {  // Phase 18-A1
  id, operatorId
  kind             // EMAIL | SLACK | WHATSAPP | MANUAL_PASTE | FILE_UPLOAD
  externalId, sourceUrl, sender, subject
  rawSnippet       // PII redacted
  threadKey, language
  ingestedAt
}

model MorningBriefBatch {  // Phase 18-A1
  id, operatorId
  startedAt, completedAt
  rawInput, sourceCount, briefCount
  state  // ANALYZING | READY_FOR_REVIEW | PARTIAL_VALIDATED | FULLY_VALIDATED | DISCARDED
  llmConfidenceMean, llmTotalTokens, llmCostUsd
}

model BriefIngestionDraft {  // Phase 18-A1
  id, batchId, sourceId
  classification  // NEW_BRIEF | UPDATE_OF_BRIEF | NON_BRIEF | OPS_ACTION | AMBIGUOUS
  resolvedNodeId, resolvedNodePath[], resolvedCampaignId
  payload          // { title, summary, briefType, urgency, deadline, deliverables[] }
  confidence, state, reviewedBy, reviewedAt
  materializedCampaignBriefId
}

// Phase 18-bis (M&A)
model NodeOwnershipTransfer { ... }  // hash-chained immutable
model BrandPartnership { ... }        // CO_BRAND | LICENSE | JOINT_VENTURE
model BrandLicense { ... }
```

### 1.3 — Extension modèles existants

| Model | Extension | Phase |
|---|---|---|
| `Campaign` | `+ creativeState, clientState, healthSignal: RAG, manualRagOverride, commentsLatest` | 18-A0 |
| `CampaignBrief` | `+ sourceIngestedId` (lien provenance) | 18-A1 |
| `CampaignAssignment` | `+ delegatedToOperatorId` (sous-trait agence Ghana) | 18-A0 |
| `ClientAllocation` | `+ scopeNodeId, scopeMode: NODE_ONLY \| NODE_AND_DESCENDANTS` | 18-A0 |
| `BrandContextNode` (RAG) | `+ nodeId, retrievalScope: NodeKind[]` | 18 noyau |
| `Strategy` | Devient strategy d'exploitation rattachée à `BrandNode` opérationnel via `BrandNode.strategyId` | 18-A0 |

---

## 2. Phasage global

| Phase | Durée | Output | Bloquant pour FC ? |
|---|---|---|---|
| **18-A0** | 8-10 jours | Brand Tree min + 3 vues dashboard + crew (Alex/Papin/William) + import portefeuille XLSX | **OUI** |
| **18-A1** | 5-7 jours | Morning Brief Batch (paste manuel + middle portal validation + audit) | NON mais critique cadence |
| **18-A2** | 4-5 jours | Connectors auto-pull Slack/Gmail (+ option WhatsApp) | NON (paste suffit pour démarrer) |
| **18 noyau** | 14-18 jours | Héritage piliers + RAG arborescent + variable bible reclassif + Glory tools brand-aware | NON (tu vis avec duplication ADVE 2-4 semaines) |
| **18-bis** | 3 mois post-noyau | M&A + lineage + Partnership/License + 8 archétypes BrandNature non-PRODUCT | NON sauf nouveau client non-FMCG |

---

## 3. Sprint 18-A0 — Détail jour par jour (8-10 jours)

**PR label** : `phase/18-A0`. **Branche** : `feat/phase-18-a0` (ou directement sur `claude/pensive-keller-6afb14` worktree puis merge main).

### J1 — ADRs + REFONTE-PLAN entry + branche

**Livrables** :
- ADR-0059 (Brand Tree multi-archétype) ✅ shipped 2026-05-06
- ADR-0060 (LLM as UI orchestrator — manual-first parity) ✅ shipped 2026-05-06
- ADR-0061 (Brand Nature Archetypes template) ✅ shipped 2026-05-06
- ADR-0062 (Morning Brief Batch validation) ✅ shipped 2026-05-06
- Plan PHASE-18-MATANGA-FC.md (ce document) ✅ shipped 2026-05-06
- CHANGELOG.md `v6.18.15` entry
- REFONTE-PLAN.md Phase 18 entry
- CLAUDE.md §Phase status update + doctrine LLM ajoutée
- NEFER.md §1.1 doctrine LLM ajoutée

### J2 — Migration Prisma + backfill BrandNode

**Livrables** :
- Migration Prisma `2026_05_xx_brand_tree/migration.sql` :
  - Nouveau model `BrandNode` + enum `BrandNature`
  - Nouveau model `CampaignDeliverable`
  - Extension `Campaign` (creativeState, clientState, healthSignal, manualRagOverride, commentsLatest)
  - Extension `CampaignAssignment` (delegatedToOperatorId)
  - Extension `ClientAllocation` (scopeNodeId, scopeMode)
- Const TS `BRAND_NATURE_ARCHETYPES` dans `src/domain/brand-nature-archetypes.ts`
- Script `scripts/backfill-brand-tree.ts` idempotent : pour chaque Strategy existante → crée BrandNode `STANDALONE_BRAND` racine orpheline + lien `BrandNode.strategyId`
- Tests `tests/unit/governance/brand-tree-coherence.test.ts` + `brand-nature-archetypes.test.ts`

**Manual-first compliance** : ✅ migration purement additive, aucune feature LLM impliquée à ce stade.

### J3 — Intent kinds Mestor + UI form `<BrandNodeForm />`

**Livrables** :
- Intent kinds Mestor :
  - `OPERATOR_CREATE_BRAND_NODE` (sync, p95 200ms)
  - `OPERATOR_UPDATE_BRAND_NODE` (sync, p95 200ms)
  - `OPERATOR_DELETE_BRAND_NODE` (sync, p95 200ms — soft-delete)
  - `OPERATOR_MOVE_BRAND_NODE` (sync, p95 500ms — re-parent intra-CORPORATE)
  - `OPERATOR_ATTACH_STRATEGY_TO_NODE` (sync, p95 200ms)
  - `OPERATOR_TAG_NODE_ROLE` (sync, p95 100ms)
- Service `src/server/services/brand-node/` (manifest + handlers + assertValidTransition gate `NATURE_TRANSITION_VALIDITY`)
- Routes tRPC `brandNode.create/update/move/delete/attachStrategy/tagRole`
- Composant UI `<BrandNodeForm />` : tous les champs éditables (name, slug, parentNodeId picker, nodeKind dropdown filtré par nodeNature, countryCode, clusterTag, lifecycle, nodeRole tags)
- Tests Mestor + tests transitions valides/invalides par nature

**Manual-first compliance** : ✅ chaque Intent a son endpoint tRPC + form UI saisissable manuellement.

### J4 — Page cockpit `/cockpit/portfolio/[corporateSlug]` drill-down

**Livrables** :
- Page `src/app/(cockpit)/cockpit/portfolio/[corporateSlug]/page.tsx` : tree-nav latéral + breadcrumbs + détail nœud central + bouton `[+ Ajouter regional/cluster/gamme/SKU]` qui ouvre `<BrandNodeForm />` en modal
- Page sub-niveau `/cockpit/portfolio/[corporateSlug]/[masterSlug]/page.tsx` (drill-down 1 niveau)
- Composant `<PortfolioTreeNav />` (virtualisé pour 50+ nœuds)
- Composant `<NodeBreadcrumb />` avec collapse au-delà de 4 segments
- Tests E2E navigation tree

**Manual-first compliance** : ✅ création/édition/suppression nœud 100% manuelle via form.

### J5 — Wizard `/launchpad/portfolio-bulk-import`

**Livrables** :
- Page `src/app/(intake)/launchpad/portfolio-bulk-import/page.tsx` :
  - Upload XLSX avec dropzone
  - Parser RAMADAN-style : `src/server/services/portfolio-importer/xlsx-parser.ts`
  - Preview-table éditable (chaque row matérialisable individuellement, drag-drop pour réordonner hiérarchie)
  - Bouton "Saisie manuelle alternative" → `<BrandNodeForm />` standalone
  - Bouton "Confirmer import" → matérialisation via `mestor.emitIntent(OPERATOR_CREATE_BRAND_NODE)` × N
- Service `src/server/services/portfolio-importer/` (manifest + parser + preview + materializer)
- Tests : parsing RAMADAN.xlsx réel doit produire l'arbre attendu (CORPORATE FC + 6 MASTER + 4 CLUSTER + 15 REGIONAL + N PRODUCT_LINE)

**Manual-first compliance** : ✅ XLSX import + saisie manuelle alternative ; preview-table éditable avant matérialisation.

**🚨 Pré-requis avant J5** : récupérer `MATANGA.xlsx` hors sandbox Mail (Finder drag → `~/Downloads/`) pour audit complémentaire avant figer le parser.

### J6 — `CampaignDeliverable` + UI `<CampaignDeliverableForm />`

**Livrables** :
- Migration Prisma `CampaignDeliverable` (déjà préparé J2)
- Intent kinds : `OPERATOR_CREATE_CAMPAIGN_DELIVERABLE`, `OPERATOR_UPDATE_CAMPAIGN_DELIVERABLE`, `OPERATOR_DELETE_CAMPAIGN_DELIVERABLE`, `OPERATOR_OVERRIDE_RAG`
- Service `src/server/services/campaign-deliverable/` + helper `computeRAG(deliverable)` (input : status × deadline_proximity × blockers)
- Composant `<CampaignDeliverableForm />` : tous les champs éditables (targetNodeId tree-picker, countryCode, clusterTag, deliverableType dropdown 19 options, language, promoTag, status, rag avec override manuel, dueDate, delegatedToOperatorId)
- Composant `<DeliverableMatrix />` : tableau 6D filtrable

**Manual-first compliance** : ✅ création/édition/suppression deliverable 100% manuelle ; RAG override manuel.

### J7 — Vue 1 Project Tracker dashboard `/console/operate/africa-portfolio`

**Livrables** :
- Page `src/app/(console)/console/operate/africa-portfolio/page.tsx` (header KPIs + tabs 3 vues)
- Vue 1 — Project Tracker (BACK2SCH-style) :
  - Table `CORPORATE | MASTER_BRAND | PROJET | LIVRABLES (count) | STAFF | STATUT créa | STATUT client | COMMENTAIRES | RAG`
  - Filtres : Client, Master Brand, Cluster, RAG, Staff
  - Tri : `lastUpdate`, `RAG critique d'abord`
  - Edit inline RAG / status (Intent `OPERATOR_OVERRIDE_RAG`)
- Router tRPC `agency-portfolio.listCampaignsByOperator(operatorId, filters)` avec agrégation par `BrandNode` racine

**Manual-first compliance** : ✅ vue read + filtres + edit RAG/status manuel inline.

### J8 — Vue 2 Checklist Livrables (RAMADAN-style)

**Livrables** :
- Tab/onglet "Checklist Livrables" sur la même page
- Table 6D : `N° | TYPE | CLUSTER | PAYS | SKU | CAT | PACK | PROMO | FORMAT | LANGUE | STATUS`
- Filtres : Campagne saisonnière, Master Brand, Cluster, Pays, Format livrable
- Status check-able inline (✓ par row → `OPERATOR_UPDATE_CAMPAIGN_DELIVERABLE` Intent)
- Lien depuis chaque row vers `BrandAsset` forgé (Ptah) si déjà produit, sinon bouton "Lancer Ptah forge" (cf. ADR-0050 Deliverable Forge)

**Manual-first compliance** : ✅ check ✓ par row manuel, lien Ptah forge optionnel non bloquant.

### J9 — Vue 3 KPIs agence + alertes Sentinels

**Livrables** :
- Header dashboard avec compteurs cross-clients filtrés `operatorId = Matanga` + `clusterTag IN AFRICA`
- KPIs affichés :
  - N campagnes actives, N en LIVE, N en retard (RED RAG)
  - Livrables par status (TODO/IN_PROGRESS/DELIVERED/VALIDATED) avec %
  - Fuel Thot consommé / alloué
  - Sentinels alertes (drift Loi 1 ou narrative-coherence)
  - Top 5 campagnes urgentes (deadline proximity × RAG critique)
- Tous compteurs cliquables → drill vers vue filtrée

**Manual-first compliance** : ✅ data brute exposée, drill-down accessible.

### J10 — Pré-import Crew Imhotep + ClientAllocation extension + tests + merge

**Livrables** :
- Wizard `/launchpad/crew-bootstrap/page.tsx` : bouton "Bootstrap équipe Matanga" qui pré-charge :
  - Alex (Direction Artistique lead, role: `DA_LEAD`)
  - Papin (graphiste, role: `GRAPHIC`)
  - William (graphiste, role: `GRAPHIC`)
- UI manuelle alternative `/console/imhotep/crew/new` (form `<CrewMemberForm />`) — Manual-first parity
- Migration `ClientAllocation.scopeNodeId + scopeMode`
- Intent `OPERATOR_ALLOCATE_CREW_TO_NODE` (Mestor sync)
- Tests anti-drift CI :
  - `brand-tree-coherence.test.ts` ✅
  - `brand-nature-archetypes.test.ts` ✅
  - `nature-transition-validity.test.ts` ✅
  - `llm-no-bypass.test.ts` (pré-stub pour Phase 18-A1) ✅
  - `brand-node-no-strategy-orphan.test.ts` ✅
- Stress-test E2E sur les 3 nouvelles pages (`/cockpit/portfolio`, `/launchpad/portfolio-bulk-import`, `/console/operate/africa-portfolio`)
- Feature flag `BRAND_TREE_ENABLED` per Operator (désactivé default ; activé pour Matanga)
- Audit `npm run audit:cycles`, `npx tsc --noEmit`, `npm run lint:governance`
- Merge sur `main`

**Critère "done" sprint 18-A0** :
- [ ] Tu peux ingérer FC dans l'OS en 1 session via wizard portefeuille (XLSX ou manuel)
- [ ] Tu vois les 3 vues du dashboard agence Matanga Afrique
- [ ] Tu peux créer/éditer/supprimer un BrandNode 100% manuellement
- [ ] Tu peux ajouter un CampaignDeliverable manuellement (1 form, tous les champs)
- [ ] Tu peux assigner Papin/William à un projet manuellement
- [ ] Stress-test E2E green sur les 3 nouvelles pages
- [ ] Tests anti-drift CI green

---

## 4. Sprint 18-A1 — Morning Brief Batch (5-7 jours)

**PR label** : `phase/18-A1`. **Démarre quand 18-A0 mergé.**

### J11 — Migration Prisma + branche

**Livrables** :
- Migration `2026_05_xx_morning_brief_batch/migration.sql` :
  - `IngestedSource` model
  - `MorningBriefBatch` model
  - `BriefIngestionDraft` model
  - Extension `CampaignBrief` (`+ sourceIngestedId`)
- Branche `feat/phase-18-a1`
- ADR-0062 réf cross-check shipped J1

### J12 — Splitter LLM batch + Intent manuel

**Livrables** :
- Service `src/server/services/morning-batch/` (manifest + index)
- `splitter.ts` — extension du pattern [seshat/market-study-ingestion/extractor-llm.ts](../../../src/server/services/seshat/market-study-ingestion/extractor-llm.ts) → split 1 blob en N IngestedSource discrètes par signature mail / Slack threading
- Glory tool `ARTEMIS_SPLIT_INBOUND_BATCH` (LLM)
- Intent manuel `OPERATOR_CREATE_INGESTED_SOURCE` (Mestor sync) — **manual-first** : opérateur ajoute une source à la main sans LLM
- Composant `<IngestedSourceForm />` standalone
- Tests : splitter correctement segmente un blob de 5 mails distincts

**Manual-first compliance** : ✅ chaque source créable manuellement sans LLM.

### J13 — Reconciliation engine

**Livrables** :
- `reconciler.ts` : embedding similarity + name match + LLM final classification
- Logique : pour chaque draft, compare vs Campaign + CampaignBrief existants → `NEW_BRIEF | UPDATE_OF_BRIEF | NON_BRIEF | OPS_ACTION | AMBIGUOUS`
- Heuristiques anti-erreur (cf. ADR-0062 §7)
- Tests cas concrets : feedback positif → NON_BRIEF ; "envoie devis" → OPS_ACTION ; "refais visuels saturés" → UPDATE_OF_BRIEF

**Manual-first compliance** : ✅ classification override manuel via dropdown UI dans le portail validation.

### J14 — Brand-resolver tree-aware

**Livrables** :
- Extension `src/server/services/brief-ingest/brand-resolver.ts` (existant) avec contexte arbre BrandNode JSON minimal (post 18-A0)
- LLM retourne `nodePath: ["FC", "Bonnet Rouge", "BR-CI", "EVAP", "EVAP Promo", "EVAP 160g 10g more 2026"]`
- Composant `<NodePathTreePicker />` : tree-picker drill-down dans BrandNode pour matcher manuellement
- Tests : matching correct sur 10 cas réels (mail FC mentionne "BR Crème Senegal" → résolu vers BR > Western Cluster > SN > Crème)

**Manual-first compliance** : ✅ override `nodePath` manuel via tree-picker UI.

### J15 — UI middle portal `/console/operate/morning-intake`

**Livrables** :
- Page `src/app/(console)/console/operate/morning-intake/page.tsx` :
  - **Zone 1 INPUT** : textarea géant + dropzone (.eml/.txt/.pdf/.docx) + bouton "Analyser" + bouton "Saisir un brief manuellement"
  - **Zone 2 REVIEW** : 2 colonnes (gauche raw IngestedSource, droite BriefIngestionDraft éditable) ; chaque row : tag dropdown + nodePath tree-picker + summary textarea + checkbox accepter/rejeter
  - **Zone 3 ACTION** : compteurs PENDING / ACCEPTED / REJECTED / NON_BRIEF + bouton "Confirmer batch" + bouton "Discard"
- Composants : `<MorningIntakeInput />`, `<BatchAnalysisProgress />`, `<DraftReviewRow />`, `<BriefIngestionDraftForm />` (standalone manual), `<BatchConfirmFooter />`
- Intent `MORNING_BRIEF_BATCH_PREVIEW` (async, p95 30s, cost $0.50)
- Intent `BRIEF_BATCH_PERSIST_DRAFTS` (sync, p95 1s)
- Intent `BRIEF_DRAFT_UPDATE_FIELDS` (sync, p95 200ms — édition manuelle)
- Intent `BRIEF_DRAFT_REQUEST_REANALYSIS` (async, p95 5s)

**Manual-first compliance** : ✅ saisie manuelle d'un brief disponible sans paste LLM ; chaque champ extrait LLM est éditable ; bouton "Saisir manuellement" toujours disponible.

### J16 — Matérialisation + NSP push

**Livrables** :
- Intent `MORNING_BRIEF_BATCH_CONFIRM` (async, p95 10s)
- `materializer.ts` : pour chaque draft ACCEPTED|EDITED → `mestor.emitIntent(<MUTATION>)` (jamais Prisma direct)
  - NEW_BRIEF → crée Campaign (si nouvelle) + CampaignBrief + BrandAsset(kind=CREATIVE_BRIEF, state=DRAFT)
  - UPDATE_OF_BRIEF → update Campaign.creativeState + CampaignBrief.version+1 + commentaire
  - OPS_ACTION → crée Mission (ou OperationalTask si modèle créé)
- Liaison obligatoire `IngestedSource → CampaignBrief.sourceIngestedId`
- NSP push event `MORNING_BATCH_CONFIRMED` → dashboard `/console/operate/africa-portfolio` refresh real-time
- UI toast feedback "5 briefs validés, 3 nouveaux projets, 2 updates"

**Manual-first compliance** : ✅ chaque endpoint de matérialisation est exposé tRPC manuellement.

### J17 — Audit/provenance UI + tests

**Livrables** :
- Sur chaque `CampaignBrief` (page `/cockpit/operate/briefs/[briefId]` et autres) → side-panel "Provenance" cliquable :
  - Affiche `IngestedSource.rawSnippet` + `sourceUrl` (si fourni, lien cliquable vers Gmail/Slack web app)
  - Opérateur qui a validé + timestamp + reviewNotes
  - Bouton "Voir mail/slack original" qui ouvre dans nouvelle fenêtre
- Tests anti-drift :
  - `morning-batch-validation.test.ts` (aucun `confirmBatch` ne by-pass `state ACCEPTED|EDITED`)
  - `morning-batch-no-bypass.test.ts` (materializer passe par mestor.emitIntent)
  - `morning-batch-source-required.test.ts` (CampaignBrief matérialisé via batch a sourceIngestedId)
  - `manual-brief-form-parity.test.ts` (form expose tous les champs)
  - `llm-no-bypass.test.ts` (Glory tool LLM n'écrit pas Prisma direct)

**Manual-first compliance** : ✅ provenance cliquable + lien manuel ajout source URL post-hoc.

**Critère "done" sprint 18-A1** :
- [ ] Paste blob → analyse → preview → valider/éditer/rejeter chaque brief → confirm batch → dashboard updated NSP push
- [ ] Saisie manuelle d'un brief sans LLM via `<BriefIngestionDraftForm />`
- [ ] Provenance traçable depuis tout CampaignBrief
- [ ] Tests CI green

---

## 5. Sprint 18-A2 — Auto-pull Connectors (4-5 jours, optionnel)

**PR label** : `phase/18-A2`. Démarre après 1-2 semaines d'utilisation 18-A1 pour valider qualité extraction.

| J | Livrable |
|---|---|
| **J18** | Slack inbound connector (OAuth device flow Phase 16-C, scopes `channels:history channels:read`) + worker `scripts/cron/morning-pull-slack.ts` + UI `/console/anubis/credentials/slack` |
| **J19** | Gmail inbound connector (OAuth Gmail, label `Briefs/`) + worker similaire |
| **J20** | (optionnel) WhatsApp Business API connector — selon décision opérateur si ≥40% briefs FC reçus sur WhatsApp |
| **J21** | Page morning-intake enrichie : bouton "Pull dernières 24h" + scheduler 8h auto-run + notifs NSP "X messages aspirés" |
| **J22** | Tests intégration + rate limit handling + retry policy + monitoring Seshat (messages aspirés/jour, dedup rate, extraction success rate) |

**Manual-first compliance** : ✅ paste manuel reste TOUJOURS disponible en alternative ; auto-pull est opt-in.

---

## 6. Phase 18 noyau — Héritage + RAG arborescent (14-18 jours, post 18-A1)

**PR label** : `phase/18-noyau`. Démarre quand 18-A0 + 18-A1 mergés et FC ingéré, idéalement avec 1-2 semaines d'utilisation réelle.

| Sub-phase | Durée | Livrable |
|---|---|---|
| **18-N1** | 2j | Helper `resolveEffectivePillars(nodeId)` + cache Redis + invalidation cascade |
| **18-N2** | 1j | Bus event `PILLAR_RESOLUTION_INVALIDATED` + worker cascade sur descendance |
| **18-N3** | 2j | Migration `BrandContextNode` (RAG) tree-aware (`nodeId` + `retrievalScope`) + backfill |
| **18-N4** | 2j | Retriever arborescent `searchContextForNode(nodeId, query)` (nœud + ancêtres + frères pondérés) |
| **18-N5** | 4-5j | Variable Bible reclassif (~300 entrées) avec `inheritanceMode: INHERIT_BY_DEFAULT \| NEVER_INHERIT \| MERGE_WITH_PARENT` × `applicableNatures: BrandNature[]` |
| **18-N6** | 2j | Glory tools brand-aware : 56 tools tagués `applicableNatures` |
| **18-N7** | 2j | Sentinel `NARRATIVE_COHERENCE_GATE` Mestor pre-flight |
| **18-N8** | 1j | UI cockpit héritage visible : badge `INHERITED FROM <node> v<v>` ou `OVERRIDE LOCAL` |
| **18-N9** | 1j | Migration overrides duplicate → inheritance : script auto-détecte et propose conversion |
| **18-N10** | 1j | Tests anti-drift complets + rollout flag `BRAND_TREE_ENABLED` global → on |

**Critère "done" Phase 18 noyau** :
- [ ] Édition pilier ADVE racine cascade en preview-then-confirm aux descendants
- [ ] RAG retourne contexte arborescent (nœud + ancêtres + frères)
- [ ] Glory tool refuse de tourner sur nœud `MEDIA_IP` si tool est `PRODUCT`-only
- [ ] Sentinel Mestor bloque Glory output qui contredit manifesto ancêtre
- [ ] BR-CI / BR-SN / BR-NG ont leurs piliers ADVE communs hérités de BR Global, plus duplications

---

## 7. Phase 18-bis — M&A + archétypes complets (3 mois post-noyau)

| Sub-phase | Description | Trigger |
|---|---|---|
| **18-B1** | `NodeOwnershipTransfer` + lineage hash-chain immutable + Intent `TRANSFER_NODE_OWNERSHIP` + UI portail validation 4 étapes (proposal / regulatory check / RGPD audience consent / effective) | Premier dossier M&A en pipe |
| **18-B2** | `BrandPartnership` + `BrandLicense` + UI `/console/portfolio/[node]/partnerships` | Premier dossier co-brand / license |
| **18-B3** | Archétype SERVICE complet (cascade + Glory tools applicables + KPIs) | Premier client SERVICE |
| **18-B4** | Archétype CHARACTER_IP / MEDIA_IP / FESTIVAL_IP | Premiers clients industries créatives |
| **18-B5** | Archétype PERSONAL / RETAIL_SPACE / PLATFORM / INSTITUTION | Selon pipeline |

---

## 8. Tests anti-drift CI complets (récap toutes phases)

| Test | Phase | Vérifie |
|---|---|---|
| `tests/unit/governance/brand-tree-coherence.test.ts` | 18-A0 | Cap profondeur, transitions valides, pas de cycle |
| `tests/unit/governance/brand-nature-archetypes.test.ts` | 18-A0 | Const `BRAND_NATURE_ARCHETYPES` cohérente |
| `tests/unit/governance/nature-transition-validity.test.ts` | 18-A0 | Transitions valides/invalides par nature |
| `tests/unit/governance/brand-node-no-strategy-orphan.test.ts` | 18-A0 | BrandNode opérationnel a strategyId |
| `tests/unit/governance/campaign-deliverable-matrix.test.ts` | 18-A0 | CampaignDeliverable.targetNodeId est SKU ou PRODUCT_VARIANT |
| `tests/unit/governance/llm-no-bypass.test.ts` | 18-A1 | Aucun service LLM n'écrit Prisma direct |
| `tests/unit/governance/manual-ui-parity.test.ts` | 18-A1 | Tout Intent appelé par LLM a route tRPC manuelle |
| `tests/unit/governance/morning-batch-validation.test.ts` | 18-A1 | confirmBatch ne by-pass pas state ACCEPTED |
| `tests/unit/governance/morning-batch-no-bypass.test.ts` | 18-A1 | materializer passe par emitIntent |
| `tests/unit/governance/morning-batch-source-required.test.ts` | 18-A1 | CampaignBrief matérialisé batch a sourceIngestedId |
| `tests/unit/governance/draft-validation-required.test.ts` | 18-A1 | Pas de bypass state PENDING_REVIEW |
| `tests/unit/governance/llm-output-editable.test.ts` | 18-A1 | UI affichant LLM output expose édition |
| `tests/unit/governance/manual-brief-form-parity.test.ts` | 18-A1 | `<BriefIngestionDraftForm />` parité champs |
| `tests/unit/governance/glory-tool-archetype-coverage.test.ts` | 18-N6 | Chaque GloryTool a `applicableNatures` |
| `tests/unit/governance/bible-archetype-coverage.test.ts` | 18-N5 | Chaque variable-bible entry a `applicableNatures` + `inheritanceMode` |
| `scripts/audit-brand-tree-integrity.ts` (cron) | 18-A0 | Aucun BrandNode orphelin sauf CORPORATE racines, pas de cycle, lifecycle cohérent |

---

## 9. ADRs publiés ou à publier

| ADR | Titre | Phase | Status | Path |
|---|---|---|---|---|
| **0052** | Brand Tree multi-archétype hiérarchique | 18-A0 | ✅ shipped 2026-05-06 | [adr/0052](../adr/0059-brand-tree-multi-archetype.md) |
| **0053** | LLM as UI orchestrator (manual-first parity) | Transverse | ✅ shipped 2026-05-06 | [adr/0053](../adr/0060-llm-as-ui-orchestrator-manual-first.md) |
| **0054** | `BRAND_NATURE_ARCHETYPES` cascade par nature | 18-A0 | ✅ shipped 2026-05-06 | [adr/0054](../adr/0061-brand-nature-archetypes-template.md) |
| **0055** | Morning Brief Batch — middle portal validation | 18-A1 | ✅ shipped 2026-05-06 | [adr/0055](../adr/0062-morning-brief-batch-validation.md) |
| **0056** (à venir) | Auto-pull connectors Slack/Gmail/WhatsApp | 18-A2 | À publier J18 si enclenché |  |
| **0057** (à venir) | Cache + invalidation `resolveEffectivePillars` | 18-N1 | À publier J18-N1 |  |
| **0058** (à venir) | NodeOwnershipTransfer + lineage hash-chain | 18-B1 | À publier 18-B1 |  |

---

## 10. Migration legacy & rollout

- **Feature flag** : `BRAND_TREE_ENABLED` per `Operator` (cf. `src/lib/featureFlags.ts` pattern existant). Désactivé par défaut. Matanga actif J10. Autres operators progressivement.
- **Backward compat** : tous les `Strategy` existants deviennent automatiquement `BrandNode { nodeKind: STANDALONE_BRAND, nodeNature: PRODUCT (par défaut) }`. Legacy URLs `/console/strategy-portfolio/brands/[strategyId]` redirigent vers `/cockpit/portfolio/[corporateSlug]/brands/[strategyId]` pendant 30 jours.
- **Rollback** : `BRAND_TREE_ENABLED=false` rebascule sur l'ancienne UI plate. Schema Prisma migrations additives (pas de DROP) → rollback safe.

---

## 11. Risques + mitigations (transverse phases)

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Sprint 18-A0 dépasse 10j à cause variable bible non touchée | Moyen | Slip 1 semaine | Variable bible reclassif est en 18 noyau, pas 18-A0 |
| Extraction LLM batch matin se trompe trop souvent | Moyen | Friction quotidienne | Middle portal validation rend les erreurs visibles + corrigibles ; saisie manuelle fallback |
| `MATANGA.xlsx` (sandbox Mail) révèle des dimensions ratées | Élevé | Possible redesign mineur | Demande explicite à l'opérateur de bouger le fichier hors sandbox avant J5 |
| Auto-pull connectors cassent OAuth scope vendor changes | Faible | Connector down 1-2j | Logs détaillés + paste manuel toujours dispo |
| Manual-first invariant ralentit dev (1.5x effort vs LLM-first) | Élevé | Sprint plus long | Compensé par : zero risk bypass governance + audit propre + LLM ne devient pas blocker |
| Variable bible reclassif > 5j | Moyen | Phase noyau slip | Découper N5a (ADVE ~120) prioritaires + N5b (RTIS + métier ~180) ; ship par moitié |

---

## 12. Décisions prises (inférables) vs résiduelles

### 12.1 — Décisions prises (inférables, je les acte ici)

| Décision | Choix NEFER | Justification |
|---|---|---|
| Multi-parents (DAG) ou arbre pur ? | **Arbre pur** | Simple, performant, audit clair. Co-branding/JV via `BrandPartnership` graphe latéral. |
| Profondeur arbre maximum ? | **Pas de cap dur**, soft cap 8 (cas Berkshire) avec UI collapse au-delà de 4 segments breadcrumb | Cap 5 trop restrictif pour conglomérat / édition limitée |
| Reparenting cross-CORPORATE ? | **18-bis only** (Phase 18-A0 = intra-CORPORATE seul) | Pas de cas immédiat ; lineage hash-chain en 18-B1 |
| Auto-confirm threshold LLM ? | **Désactivé par défaut** Phase 1, opt-in opérateur Phase 2 (post 30 jours) | Manual-first invariant respecté |
| WhatsApp dans 18-A1 ? | **Hors scope sprint 18-A1**, à confirmer 18-A2 selon décision opérateur | Paste manuel suffit ; auto-pull WhatsApp Business API coût élevé |
| Sources prioritaires J11-J17 ? | **Paste manuel suffit pour démarrer** ; auto-pull en J18-J22 (18-A2) | 1-2 semaines de feedback qualité avant ouvrir vannes auto |
| Master brands FC à ingérer ? | **6 master brands** : Bonnet Rouge, Belle Hollandaise, Peak, Coast, Rainbow, Omela | Confirmé par RAMADAN.xlsx |

### 12.2 — Décisions résiduelles (à confirmer par l'opérateur)

1. **Clusters géo FC réels** — composition exacte ?
   - Hypothèse Western Cluster = SN + ML + BF + GN + GM + (BJ + TG ?)
   - Hypothèse Tropical Cluster = CMR + CG + RDC + GAB
   - Hypothèse ESA = DJI + ?
   - CIV solo lead

2. **Membres crew Imhotep complémentaires** ?
   - Confirmé : Alex (DA) + Papin (graphiste) + William (graphiste)
   - À ajouter : Account manager ? Planneur stratégique ? Production manager ?

3. **MATANGA.xlsx** — bouger hors sandbox Mail (Finder drag → `~/Downloads/MATANGA.xlsx`) avant J5 pour audit complet.

4. **Date cible "FC opérationnel dans l'OS"** — J10 réaliste ? J15 ?

5. **WhatsApp Business** — à inclure dans 18-A2 ou laisser pour 18-A3 dédié ?

---

## 13. Critères de "go-live FC"

5 acceptance criteria avant de dire "FC est dans l'OS" :

- [ ] **Portefeuille structuré** : FC + 6 master brands + 4 clusters + ~12 regional brands + ~15 product lines + ~30 SKU créés dans `BrandNode`, naviguables `/cockpit/portfolio/friesland-campina`
- [ ] **Production tracking** : 9 projets actifs BACK2SCH + 193 livrables RAMADAN importés et visibles dans vues 1+2 dashboard agence
- [ ] **Crew Matanga** : Alex + Papin + William assignables à projets/livrables, badge sous-trait Ghana fonctionnel
- [ ] **Morning intake** : paste batch mails+slacks réels matin → valider 5-15 briefs → dashboard refresh NSP push
- [ ] **Audit chain** : depuis n'importe quel `CampaignBrief`, retracer source originale (Gmail/Slack/manual paste) en 1 clic

---

## 14. Calendrier estimé

```
Semaine 1 (J1-J5)   ▸ 18-A0 partie 1 : data model + Intents + UI form + portfolio import wizard
Semaine 2 (J6-J10)  ▸ 18-A0 partie 2 : 3 vues dashboard + crew Imhotep + tests + merge

🎯 J10 : FC ingéré manuellement via wizard. Dashboard agence Matanga Afrique opérationnel.

Semaine 3 (J11-J17) ▸ 18-A1 : Morning Brief Batch (paste manuel + middle portal validation)

🎯 J17 : paste mails/slacks matin → briefs validés → dashboard refresh.

Semaine 4 (J18-J24) ▸ 18-A2 : auto-pull Slack + Gmail (optionnel selon feedback)

Semaines 5-7        ▸ Phase 18 noyau (héritage + RAG arborescent + variable bible)

Mois 4+             ▸ 18-bis (M&A + archétypes non-PRODUCT) selon pipeline commercial
```

---

## 15. Note opérationnelle finale

Ce plan est **inferable et exécutable autonomement** par NEFER (cf. NEFER §1.1 doctrine LLM). Il n'attend pas validation séquentielle par sub-phase. L'opérateur valide le scope global ; NEFER s'auto-pilote sur les sub-phases en transparence (commit messages structurés + CHANGELOG entries + cf. Phase 9 post-merge sync audit).

**Source de référence persistante** : ce document. Tout drift entre plan et exécution = à signaler immédiatement par auto-correction Phase 8 NEFER.

---

**Cap APOGEE 7/7 préservé. Aucun nouveau Neter. Phase 18 = sous-domaine de Mestor governance + extension Anubis (entrant) + extension Imhotep (crew Matanga) + Seshat telemetry agrégée Afrique.**
