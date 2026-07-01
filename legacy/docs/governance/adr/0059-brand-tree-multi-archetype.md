# ADR-0059 — Brand Tree multi-archétype hiérarchique

> **Note de renumérotation (2026-05-06)** : ce document a été créé sous le numéro ADR-0052 sur la branche Phase 18 (`claude/pensive-keller-6afb14`). Lors du merge avec `main` qui contenait la Phase 19 (Campaign tracker, ADR-0052 v2 + enfants 0053-0058), il a été renuméroté **ADR-0059** pour résoudre la collision préfixe sans perte de cohérence narrative. Les ADRs jumeaux Phase 18 ont également été renumérotés : 0053→0060 (manual-first), 0054→0061 (brand-nature-archetypes), 0055→0062 (morning-brief-batch).

**Status** : Accepted
**Date** : 2026-05-06
**Phase** : 18 — Matanga × FrieslandCampina × Brand Tree
**Supersedes** : aucun
**Related** : [ADR-0023](0023-operator-amend-pillar.md) (OPERATOR_AMEND_PILLAR ADVE-only), [ADR-0037](0037-country-scoped-knowledge-base.md) (Country-scoped knowledge base, à étendre node-scoped en Phase 18 noyau), [ADR-0060](0060-llm-as-ui-orchestrator-manual-first.md) (manual-first invariant), [ADR-0061](0061-brand-nature-archetypes-template.md) (cascade par BrandNature), [ADR-0062](0062-morning-brief-batch-validation.md) (Morning Brief Batch dépend de Brand Tree)

---

## Contexte

Le repo modélise aujourd'hui les marques sur une **structure plate à 3 niveaux** :

```
Operator (UPgraders/agence)
  └── Client (entité business cliente)         [prisma/schema.prisma:533]
        └── Strategy (= "la marque" en pratique) [prisma/schema.prisma:557]
              └── tout le reste : Campaigns, BrandAssets, Drivers, Pillars, etc.
```

Aucun model `Brand` standalone n'existe — toutes les entités préfixées `Brand*` sont des satellites scopés `strategyId` (`BrandAsset`, `BrandVariable`, `BrandContextNode`, `BrandAction`, etc.). En pratique, **`Strategy` = la marque** et c'est elle qui porte le `pillarA/D/V/E/R/T/I/S` + l'`AmbassadorProgram` + les `Campaign`.

### Limites observées sur le dossier réel FrieslandCampina

Audit Phase 0 NEFER sur 2 fichiers de pilotage agence Matanga (cf. [PHASE-18-MATANGA-FC.md §1](../plans/PHASE-18-MATANGA-FC.md)) :

1. **`Checklist_Ramadan_2026_LISTE.xlsx`** — 193 livrables granulaires : matrice 6D `{ZONE × PAYS × MARQUE/SKU × CATÉGORIE × PACKAGING × PROMO × LIVRABLE × LANGUE}`. 4 zones cluster (Western/Tropical/ESA/CIV solo), 15 pays, 25 SKUs, 6 master brands (Bonnet Rouge, Belle Hollandaise, Peak, Coast, Rainbow, Omela), 19 formats livrables, 3 langues.

2. **`Projets en cours 180625.xlsx`** — project tracker BACK2SCH style avec 9 projets actifs FC : workflow dual `STATUT créa | STATUT client` + indicateur RAG (Réalisé/À faire/En cours/En retard) + sous-traitance externe (agence Ghana).

→ Le schéma plat ne peut **pas** modéliser :
- La hiérarchie réelle FC : `FrieslandCampina (CORPORATE) > 6 master brands > 4 clusters géographiques > 15 pays > N product lines > N variants > N SKU` = **7 niveaux**.
- La réutilisation cross-marque des piliers ADVE : un `BrandAsset` (manifesto, big idea, KV) doit pouvoir être hérité de `Bonnet Rouge Global` par `BR-CI`, `BR-SN`, `BR-NG` sans duplication.
- La granularité des livrables : un `CampaignAction` plat ne capture pas la matrice `SKU × pack × promo × format × langue × pays`.
- La sémantique multi-archétype : FrieslandCampina = `BrandNature: PRODUCT`, mais demain l'OS doit ouvrir des dossiers `CHARACTER_IP`, `MEDIA_IP`, `FESTIVAL_IP`, `PERSONAL`, etc. (cf. [ADR-0061](0061-brand-nature-archetypes-template.md)).

### Drift mission identifié

[MISSION.md §4](../MISSION.md) drift test : "comment cette unité contribue-t-elle à accumuler des superfans + déplacer la fenêtre d'Overton ?" Réponse aujourd'hui : **un dossier client multi-marques nécessite N Strategies plats co-égaux sans relation parent-enfant**, ce qui empêche :
- l'agrégation de superfans cross-marque ("superfans de Bonnet Rouge tous pays confondus")
- la propagation cohérente d'une Big Idea master vers ses regional brands
- l'analyse Overton à granularité corporate (FrieslandCampina vs Nestlé sur le secteur lait Afrique)

→ Brand Tree est une **fondation manquante** pour que l'OS serve sa mission au-delà du cas mono-marque/mono-marché.

---

## Décision

### §1 — Nouveau model `BrandNode` (arbre générique)

```prisma
model BrandNode {
  id          String  @id @default(cuid())
  name        String
  slug        String

  // Tenancy & ownership
  operatorId  String        // l'agence qui opère ce nœud (Matanga, autre)
  clientId    String?       // le contrat business associé (FC, autre Client)

  // Tree structure
  parentNodeId String?      // self-ref, null = racine
  parent       BrandNode?   @relation("BrandNodeTree", fields: [parentNodeId], references: [id])
  children     BrandNode[]  @relation("BrandNodeTree")

  // Classification
  nodeKind    String        // libre, validé contre archétype de nodeNature au runtime (cf. ADR-0061)
  nodeNature  BrandNature   // PRODUCT|SERVICE|CHARACTER_IP|FESTIVAL_IP|MEDIA_IP|RETAIL_SPACE|PLATFORM|INSTITUTION|PERSONAL
  nodeRole    String[]      @default([])  // tags orthogonaux : SEASONAL, LIMITED_EDITION, LICENSED, JV_PARTNER, LOCAL_VARIANT, PROMO_RAMADAN_2026

  // Inheritance & overrides
  pillarOverrides    Json?           // ce que CE nœud override vs hérite (Phase 18 noyau cabling)
  inheritanceLocked  Boolean @default(false)

  // Geographic scope (when applicable)
  countryCode  String? @db.VarChar(2)
  clusterTag   String?                    // "WESTERN_CLUSTER" | "TROPICAL_CLUSTER" | "ESA" | custom

  // Lifecycle
  lifecycle    String  @default("ACTIVE")  // DRAFT | ACTIVE | PENDING_REGULATORY | ACQUIRED_INBOUND | DIVESTED | ARCHIVED | REVIVED

  // Phase 18-bis (M&A) — snapshot piliers résolus à la date de transfert
  pillarSnapshotAtTransfer Json?

  // Strangler link vers Strategy legacy ou strategy d'exploitation
  strategyId   String?
  strategy     Strategy? @relation(fields: [strategyId], references: [id])

  operator    Operator @relation(fields: [operatorId], references: [id])
  client      Client?  @relation(fields: [clientId], references: [id])

  // Annexes (Phase 18-bis)
  ownershipTransfersIn  NodeOwnershipTransfer[] @relation("NodeOwnershipIn")
  ownershipTransfersOut NodeOwnershipTransfer[] @relation("NodeOwnershipOut")
  partnershipsAsPrimary BrandPartnership[]      @relation("PartnershipPrimary")

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  archivedAt  DateTime?

  @@index([operatorId, clientId])
  @@index([parentNodeId])
  @@index([nodeNature, clusterTag])
  @@index([countryCode])
  @@index([lifecycle])
  @@index([slug])
}

enum BrandNature {
  PRODUCT
  SERVICE
  CHARACTER_IP
  FESTIVAL_IP
  MEDIA_IP
  RETAIL_SPACE
  PLATFORM
  INSTITUTION
  PERSONAL
}
```

**Choix de design** :
- `nodeKind: String` libre (pas enum strict) → permet l'évolutivité par archétype sans migration Prisma. Validation contre `BRAND_NATURE_ARCHETYPES` const TS au runtime ([ADR-0061 §1](0061-brand-nature-archetypes-template.md)).
- `parentNodeId` self-ref → arbre pur (pas DAG). Le co-branding et la double-ownership passent par `BrandPartnership` séparé (cf. §6) — le tree reste lisible et performant.
- Pas de hard cap sur la profondeur. Cap soft = perf cache via `resolveEffectivePillars()` (Phase 18 noyau).
- `nodeRole: String[]` orthogonal au `nodeKind` → capture les dimensions transversales (saisonnalité, statut JV, licence) sans corrompre la cascade.

### §2 — Cascade canonique PRODUCT (FMCG, le cas FrieslandCampina) — 7 niveaux

```
CORPORATE
  └── MASTER_BRAND
        └── REGIONAL_CLUSTER         (révélé par RAMADAN.xlsx — Western/Tropical/ESA)
              └── REGIONAL_BRAND     (= 1 pays)
                    └── PRODUCT_LINE (= 1 gamme : EVAP, IMP, Délice, etc.)
                          └── PRODUCT_VARIANT  (révélé par RAMADAN.xlsx — EVAP Regular/Gold/Promo)
                                └── SKU         (= unité shelf : 160g Unstackable 10g more 2026)
```

**Transitions parent → child autorisées pour PRODUCT** (validées Mestor `NATURE_TRANSITION_VALIDITY` gate) :

| Parent kind | Children kinds autorisés |
|---|---|
| (racine) | CORPORATE |
| CORPORATE | MASTER_BRAND |
| MASTER_BRAND | REGIONAL_CLUSTER, REGIONAL_BRAND, PRODUCT_LINE |
| REGIONAL_CLUSTER | REGIONAL_BRAND |
| REGIONAL_BRAND | PRODUCT_LINE |
| PRODUCT_LINE | PRODUCT_VARIANT, SKU |
| PRODUCT_VARIANT | SKU |
| SKU | (feuille — pas d'enfant en mode normal) |

**Nodes de cas particulier** :
- Un `MASTER_BRAND` peut avoir des `PRODUCT_LINE` directement (cas où la gamme est globale, non régionale) **ET** des `REGIONAL_CLUSTER`/`REGIONAL_BRAND` en parallèle. Multi-children avec types différents = OK.
- Le cas **multi-parents** (`BR Crème CI` = product line BR Crème **+** regional brand BR-CI) est **rejeté en arbre pur**. Solution canonique : feuille `SKU_DEPLOYMENT` enfant de `REGIONAL_BRAND` BR-CI, taggée `nodeRole: ["PRODUCT_LINE_REF:br-creme-id"]`. Les recos cross-marché de BR Crème se font par lookup frères avec ce tag.

### §3 — Migration legacy : tous les `Strategy` actuels deviennent `BrandNode` orphelins `STANDALONE_BRAND`

Backfill obligatoire ([scripts/backfill-brand-tree.ts](../../../scripts/backfill-brand-tree.ts) à créer) :

```typescript
// Pour chaque Strategy existante :
//   - créer un BrandNode { nodeKind: "STANDALONE_BRAND", nodeNature: <Strategy.brandNature ?? "PRODUCT">, ... }
//   - lier strategyId à la nouvelle BrandNode (1:1)
//   - parent = null (racine orpheline — sera reparenté ultérieurement par l'opérateur)
//   - countryCode hérité de Strategy.countryCode
//   - aucun pillarOverrides (les piliers restent sur Strategy pour Phase 18-A0 ; migration overrides en Phase 18 noyau)
```

**Aucun Strategy n'est cassé** — la backward compat est totale. Le `pillarA/D/V/E` reste sur Strategy ; les Glory tools, le scoring, le RAG continuent à fonctionner inchangés. Le `BrandNode` est superposé.

### §4 — Intent kinds Mestor

| Intent kind | Governor | Sync/async | Description |
|---|---|---|---|
| `OPERATOR_CREATE_BRAND_NODE` | MESTOR | sync | Crée un nœud avec parent + nodeKind + nodeNature |
| `OPERATOR_UPDATE_BRAND_NODE` | MESTOR | sync | Modifie name/slug/nodeRole/clusterTag/countryCode/lifecycle |
| `OPERATOR_DELETE_BRAND_NODE` | MESTOR | sync | Soft-delete (`archivedAt`). Refusé si descendants ACTIVE non-archivés |
| `OPERATOR_MOVE_BRAND_NODE` | MESTOR | sync | Re-parent (intra-CORPORATE seulement en Phase 18-A0 ; cross-CORPORATE = `TRANSFER_NODE_OWNERSHIP` Phase 18-bis) |
| `OPERATOR_ATTACH_STRATEGY_TO_NODE` | MESTOR | sync | Lie un Strategy existant à un BrandNode opérationnel (REGIONAL_BRAND ou SKU déployé) |
| `OPERATOR_TAG_NODE_ROLE` | MESTOR | sync | Ajoute/retire un tag dans `nodeRole[]` |

**Gates pre-flight Mestor** :
- `NATURE_TRANSITION_VALIDITY` — refuse parent→child si la transition n'est pas dans la matrice §2 pour le `nodeNature` du parent
- `BRAND_NODE_NO_CYCLE` — refuse re-parent qui créerait un cycle dans l'arbre
- `LIFECYCLE_TRANSITION` — refuse `ACTIVE → DRAFT` (régression non-justifiée — Loi 1 APOGEE)

### §5 — Manual-first parity (cf. [ADR-0060](0060-llm-as-ui-orchestrator-manual-first.md))

**Tous les Intent kinds §4 sont exposés via routes tRPC publiques** (`brandNode.create`, `brandNode.update`, `brandNode.move`, `brandNode.delete`, `brandNode.attachStrategy`, `brandNode.tagRole`) consommables depuis :
- UI manuelle `<BrandNodeForm />` ([src/components/forms/BrandNodeForm.tsx](../../../src/components/forms/BrandNodeForm.tsx)) — accessible depuis `/cockpit/portfolio/[corporateSlug]` via bouton `[+ Ajouter]`
- Wizard d'import portefeuille ([src/app/(intake)/launchpad/portfolio-bulk-import/page.tsx](../../../src/app/(intake)/launchpad/portfolio-bulk-import/page.tsx)) qui parse XLSX RAMADAN-style
- Glory tools LLM (Morning Brief Batch — cf. [ADR-0062](0062-morning-brief-batch-validation.md)) qui orchestrent ces mêmes endpoints

→ Le LLM ne contourne jamais l'UI ; il appelle les **mêmes endpoints** qu'un opérateur humain. Test anti-drift CI `tests/unit/governance/llm-no-bypass.test.ts`.

### §6 — Annexes Phase 18-bis (M&A)

`NodeOwnershipTransfer` + `BrandPartnership` + `BrandLicense` sont prévus pour Phase 18-bis (3 mois post-noyau). Schéma esquissé dans [PHASE-18-MATANGA-FC.md §1.2](../plans/PHASE-18-MATANGA-FC.md). Non shippé en Phase 18-A0.

### §7 — Wizard d'import portefeuille (`/launchpad/portfolio-bulk-import`)

Page d'intake qui accepte :
- **Upload XLSX** RAMADAN-style (parsing auto N° / TYPE / ZONE / PAYS / MARQUE+SKU / CATÉGORIE / PACKAGING / PROMO / LIVRABLE / LANGUE) → matérialise `BrandNode` (corporate + master brands + clusters + countries + product lines + variants + SKU) + `CampaignDeliverable` (révélé en §8) en une session
- **Saisie manuelle** alternative (`<BrandNodeForm />` standalone) — pour le cas où le founder n'a pas de XLSX

**Manual-first parity** : toutes les fonctions accessibles via XLSX import sont aussi accessibles via form UI. Le LLM (Anubis brand-resolver) suggère le matching ZONE→clusterTag mais l'opérateur valide chaque ligne dans une preview-table avant matérialisation.

### §8 — Nouveau model `CampaignDeliverable` (matrice 6D)

Révélé par `Checklist_Ramadan_2026_LISTE.xlsx`. Le `CampaignAction` actuel (22 fields) ne capture pas la granularité `SKU × pack × promo × format × langue × pays`.

```prisma
model CampaignDeliverable {
  id           String @id @default(cuid())
  campaignId   String
  campaign     Campaign @relation(fields: [campaignId], references: [id])

  targetNodeId String           // SKU ou PRODUCT_VARIANT exact
  targetNode   BrandNode @relation(fields: [targetNodeId], references: [id])

  countryCode  String? @db.VarChar(2)
  clusterTag   String?

  deliverableType String         // OOH_12M2 | POSTER_60x40 | POSM | TV_SPOT | RADIO_SPOT | BANDEROLE | WOBBLER | T_SHIRT | DIGITAL_AD | DIGITAL_POSTER | TABLE_SAMPLING | TG | PRESENTOIR | CHEVALET | LAMPOST | OUTDOOR | OOH_10M2 | OOH_18M2 | POSTER_60x80
  language     String            // FR | EN | FR_EN
  promoTag     String?           // PROMO_RAMADAN_2026 | PROMO_BACK_TO_SCHOOL_2025 | NON_PROMO | custom

  status       String  @default("TODO")  // TODO | IN_PROGRESS | DELIVERED | VALIDATED
  rag          String  @default("GREEN") // GREEN | AMBER | RED (calculé OU manuel override)
  manualRagOverride String?                // si l'opérateur force le RAG

  brandAssetId String?                    // lien vers le visuel forgé (Ptah)
  brandAsset   BrandAsset? @relation(fields: [brandAssetId], references: [id])

  delegatedToOperatorId String?           // sous-trait agence Ghana
  delegatedToOperator   Operator? @relation("DeliverableDelegate", fields: [delegatedToOperatorId], references: [id])

  dueDate      DateTime?
  deliveredAt  DateTime?
  validatedAt  DateTime?

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([campaignId, status])
  @@index([targetNodeId])
  @@index([clusterTag, countryCode])
  @@index([rag])
}
```

**Manual-first parity** : `<CampaignDeliverableForm />` accessible depuis la page checklist livrables (`/console/operate/africa-portfolio` tab Vue 2). Tous les champs éditables manuellement. Le RAG est calculé par helper `computeRAG(deliverable)` mais override manuel via `manualRagOverride` toujours possible.

### §9 — Extension `Campaign` pour workflow dual + RAG

```prisma
model Campaign {
  // ... fields existants ...
  creativeState    String   @default("BRIEF_DRAFT")  // BRIEF_DRAFT | EN_CONCEPTION | EN_PROD | LIVRE_PARTIEL | LIVRE_TOTAL | EN_ATTENTE_BRIEF | EN_ATTENTE_CAHIER_DE_CHARGES | EN_COURS_MODIF | EN_RETARD
  clientState      String   @default("PENDING")      // PENDING | BRAINSTORMING | EN_ATTENTE_FEEDBACK | RETOUR_RECU | TOOL_KIT_A_EXECUTER | EN_ATTENTE_PACKAGING | VALIDE | REJETE
  healthSignal     String   @default("GREEN")        // GREEN | AMBER | RED (calculé)
  manualRagOverride String?                          // si opérateur force RAG
  commentsLatest   String?                           // dernier commentaire libre
}
```

Helpers : `computeRAG(campaign)` agrège `deadline_proximity + creativeState + clientState + delivered_ratio + blockers`. Override manuel toujours respecté.

---

## Conséquences

### Bénéfices

1. **Modélisation FC native** : 7 niveaux PRODUCT supportés sans hack. Le dossier FrieslandCampina entier (1 corporate + 6 master brands + 4 clusters + 15 pays + ~30 SKU) ingéré en 1 wizard.
2. **Réutilisation cross-marque** : un manifesto `Bonnet Rouge Global` (BrandAsset) sera référençable depuis `BR-CI`, `BR-SN`, `BR-NG` via héritage (Phase 18 noyau).
3. **Granularité production tracking** : `CampaignDeliverable` capte la matrice 6D des 193 livrables Ramadan sans perte d'information.
4. **Multi-archétype prêt** : `nodeNature` permet d'ouvrir demain des dossiers SERVICE/CHARACTER_IP/FESTIVAL_IP/MEDIA_IP/PERSONAL/INSTITUTION (cf. [ADR-0061](0061-brand-nature-archetypes-template.md)).
5. **Manual-first parity respectée** : aucune feature LLM ne contourne l'UI ; tout est saisissable manuellement (cf. [ADR-0060](0060-llm-as-ui-orchestrator-manual-first.md)).
6. **Backward compat totale** : tous les Strategy existants restent fonctionnels en mode `STANDALONE_BRAND`. Pas de breaking change. Feature flag `BRAND_TREE_ENABLED` per Operator pour rollout progressif.
7. **Cap APOGEE 7/7 préservé** : aucun nouveau Neter, aucune extension de `BRAINS` const. Les Intents `OPERATOR_*_BRAND_NODE` sont gouvernés par Mestor existant.

### Coûts

- **Migration Prisma** : 1 nouveau model `BrandNode` + 1 enum `BrandNature` + 1 nouveau model `CampaignDeliverable` + extension `Campaign`. Migration additive (pas de DROP), zero-downtime.
- **Backfill script** : `scripts/backfill-brand-tree.ts` — 1 BrandNode créé par Strategy existante. Idempotent.
- **Surface UI** : 4 nouvelles pages (`/cockpit/portfolio/[corporateSlug]`, `/launchpad/portfolio-bulk-import`, `/console/operate/africa-portfolio`, `<BrandNodeForm />` réutilisable) + 1 page de drill-down profond.
- **Glory tools brand-aware** : extension à prévoir (Phase 18 noyau) — chaque Glory tool doit déclarer `applicableNatures: BrandNature[]`. 56 tools à annoter.

### Risques + mitigations

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Migration Prisma casse Strategy queries existantes | Faible | Critique | Script backfill testé sur seed dev avant prod. Ajout BrandNode est purement additif. |
| Wizard portfolio-bulk-import parse mal des XLSX hétérogènes | Moyen | Friction onboarding | Preview-table éditable avant matérialisation ; saisie manuelle fallback toujours dispo |
| Cap profondeur arbre dépasse 8 niveaux (cas conglomérat type Berkshire) | Faible (FC = 7 max) | UI illisible | UI breadcrumb avec collapse + tree sidebar virtualisée à 50+ nœuds |
| Glory tools cassent en raison de `nodeNature` mal initialisé sur backfill | Moyen | Glory tool refuse de tourner | Backfill par défaut `nodeNature: PRODUCT` (le plus courant) ; possibilité override manuel post-backfill ; test anti-drift CI |
| Re-parent intra-CORPORATE casse l'historique de provenance | Moyen | Audit incomplet | `OPERATOR_MOVE_BRAND_NODE` Intent + audit log Mestor obligatoire ; lineage hash-chain en Phase 18-bis |
| Performance `resolveEffectivePillars()` (hot path 350+ Intents × 7 niveaux) | Élevé sans cache | Latency × 8 | Cache Redis avec TTL + invalidation cascade sur `OPERATOR_AMEND_PILLAR` ancêtre. Test CI bench p95 < 50ms. **Phase 18 noyau seulement** (Phase 18-A0 n'utilise pas encore l'héritage). |

---

## Tests anti-drift

| Test | Vérifie |
|---|---|
| `tests/unit/governance/brand-tree-coherence.test.ts` | Transitions parent→child valides selon `BRAND_NATURE_ARCHETYPES`, pas de cycle, profondeur soft cap respectée |
| `tests/unit/governance/brand-node-no-strategy-orphan.test.ts` | Tout BrandNode `STANDALONE_BRAND` post-backfill a un `strategyId` non-null (sauf nœuds purement structurels CORPORATE / MASTER / REGIONAL_CLUSTER / PRODUCT_LINE) |
| `scripts/audit-brand-tree-integrity.ts` (cron Seshat) | Aucun BrandNode orphelin sans `parentNodeId` à part les CORPORATE racines, aucun cycle, lifecycle cohérent (parent ARCHIVED → enfants forced ARCHIVED ou DIVESTED) |
| `tests/unit/governance/campaign-deliverable-matrix.test.ts` | Tout CampaignDeliverable a un `targetNodeId` qui est `nodeKind: SKU` ou `PRODUCT_VARIANT` (jamais MASTER_BRAND ou plus haut) |

---

## Vérification

À l'issue de la sub-phase J2 (migration + backfill) :
- `npx tsc --noEmit` : 0 erreur introduite
- `npm run lint:governance` : 0 warning introduit
- `npx vitest run tests/unit/governance/brand-*.test.ts` : tous green
- `npx tsx scripts/backfill-brand-tree.ts --dry-run` : count BrandNode créés == count Strategy existantes
- `npm run audit:cycles` : 0 cycle introduit dans le graphe d'imports

---

## Sources de vérité à propager (anti-drift §6 NEFER)

- [ ] `CHANGELOG.md` v6.18.15 entry
- [ ] `REFONTE-PLAN.md` Phase 18 entry
- [ ] `CLAUDE.md` §Phase status update
- [ ] `LEXICON.md` entrée `BrandNode` + `BrandNature` + `CampaignDeliverable` + cluster terms
- [ ] `CODE-MAP.md` régénéré post-migration (auto via husky)
- [ ] `docs/governance/plans/PHASE-18-MATANGA-FC.md` (référence persistante du plan)
- [ ] Memory user `architecture_brand_tree.md` (à créer post-merge)

---

**Cap APOGEE 7/7 préservé. Aucun nouveau Neter. Brand Tree est un sous-domaine de Mestor governance.**
