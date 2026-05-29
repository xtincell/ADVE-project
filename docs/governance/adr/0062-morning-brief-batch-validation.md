# ADR-0062 — Morning Brief Batch — middle portal validation pour ingestion mail/slack

> **Note de renumérotation (2026-05-06)** : ce document a été créé sous le numéro ADR-0055 sur la branche Phase 18 (`claude/pensive-keller-6afb14`) puis renuméroté **ADR-0062** lors du merge avec Phase 19 (collision de numéro avec le placeholder phantom ADR-0055 (overton-algo) Phase 19). Cf. [ADR-0059 §note](0059-brand-tree-multi-archetype.md) pour le contexte.

**Status** : Accepted (Phase 18-A1, post 18-A0)
**Date** : 2026-05-06
**Phase** : 18 — Matanga × FrieslandCampina × Brand Tree
**Supersedes** : aucun
**Related** : [ADR-0059](0059-brand-tree-multi-archetype.md) (Brand Tree — pré-requis pour brand-resolver tree-aware), [ADR-0060](0060-llm-as-ui-orchestrator-manual-first.md) (manual-first — invariant transverse), [ADR-0061](0061-brand-nature-archetypes-template.md) (cascade par nature — pour le matching nodePath), [ADR-0026](0026-mcp-bidirectional-anubis.md) (Anubis MCP bidirectionnel — pour auto-pull)

---

## Contexte

L'opérateur Matanga (founder La Fusée, agence opératrice qui supervise les marques FrieslandCampina + autres clients africains) a explicitement formulé une cadence opérationnelle quotidienne, citation directe :

> "chaque matin, je veux pouvoir informer l'ingestion de brief du portail (en gros, mettre tous les messages qu'on a recu par mail et/ou slack) et le systeme deduis LE/LES briefs et actualise le tableau de bord"

Combiné avec la directive Manual-first (cf. [ADR-0060](0060-llm-as-ui-orchestrator-manual-first.md)) :

> "pour l'actualisation des taches, il doit y avoir un portail intermediaire pour validation humaine. et tout doit pouvoir etre fait manuellement. le llm ne fait qu'utiliser/automatiser des fonctions existantes et exposé niveau ui."

Le besoin est donc :
- **Routine quotidienne 8h-9h** : opérateur ouvre la page Morning Intake
- **Input** : paste d'un blob de messages bruts (mails clients, slacks équipe Matanga, slacks clients, WhatsApp éventuellement) ou auto-pull depuis sources connectées (Phase 18-A2 optionnel)
- **Extraction LLM** : le système extrait N briefs distincts du blob, les classifie (NEW/UPDATE/NON-BRIEF/OPS_ACTION/AMBIGUOUS), les matche à un BrandNode dans le portefeuille
- **Middle portal validation humaine** : l'opérateur voit chaque brief extrait dans une preview-table, peut éditer chaque champ, accepter/rejeter row par row
- **Matérialisation** : seuls les briefs validés deviennent `Campaign + CampaignBrief + BrandAsset(kind=CREATIVE_BRIEF, state=DRAFT)` via les **mêmes endpoints** que la saisie manuelle
- **Dashboard refresh** : NSP push real-time, les vues Project Tracker / Checklist Livrables / KPIs Agency reflètent immédiatement les nouveaux briefs

### Squelette existant (60% déjà en place)

Audit Phase 0 NEFER a révélé :

| Brique | Path | Capabilities |
|---|---|---|
| `brief-ingest` (governor MESTOR) | [src/server/services/brief-ingest/](../../../src/server/services/brief-ingest/manifest.ts) | `previewBrief` / `confirmIngest` / `spawnMissions` (preview→confirm pattern, accepts text) |
| `ingestion-pipeline` (governor MESTOR) | [src/server/services/ingestion-pipeline/manifest.ts](../../../src/server/services/ingestion-pipeline/manifest.ts) | `ingestFile` (PDF/docx/txt) + `ingestText` (paste raw) + `processStrategy` (LLM extraction) + `validatePillar`, accepte `INGEST_BRAND_DATA` Intent |
| `seshat/market-study-ingestion` | [extractor-llm.ts](../../../src/server/services/seshat/market-study-ingestion/extractor-llm.ts) + persister | Pattern LLM extraction → decompose → persist, **template clonable** pour briefs |
| Anubis MCP client/server (Phase 16) | [src/server/services/anubis/mcp-client.ts](../../../src/server/services/anubis/mcp-client.ts) + [mcp-server.ts](../../../src/server/services/anubis/mcp-server.ts) | OAuth device flow Phase 16-C + invoke external tools — **plomberie connectors prête** |
| NSP SSE broker (ADR-0025) | Phase 16 shipped | Push real-time dashboard prêt |
| `CampaignBrief` model 15 fields | [prisma/schema.prisma:1609](../../../prisma/schema.prisma:1609) | `briefType: CREATIVE \| MEDIA \| PRODUCTION \| VENDOR \| EVENT \| DIGITAL \| RP` + status DRAFT + version + generatedBy |

→ Manque : (1) splitter batch 1 blob → N sources, (2) reconciliation engine NEW/UPDATE/NON-BRIEF, (3) brand-resolver tree-aware (post 18-A0), (4) UI middle portal `/console/operate/morning-intake`, (5) audit/provenance chain.

---

## Décision

### §1 — Nouveaux models Prisma

```prisma
model IngestedSource {
  id           String  @id @default(cuid())
  operatorId   String
  operator     Operator @relation(fields: [operatorId], references: [id])

  kind         String   // EMAIL | SLACK | WHATSAPP | MANUAL_PASTE | FILE_UPLOAD
  externalId   String?  // Gmail msg id, Slack ts, WhatsApp msg id (pour dedup)
  sourceUrl    String?  // lien vers le mail/slack original (cliquable)
  sender       String?  // From: ou Slack user
  subject      String?  // Subject mail / channel slack
  rawSnippet   String   @db.Text // contenu original (PII redacted par LLM)
  threadKey    String?  // pour grouper threads mail (Message-ID parent) / Slack threads (thread_ts)
  language     String?  // FR | EN | FR_EN | autre
  ingestedAt   DateTime @default(now())

  briefIngestions BriefIngestionDraft[]

  @@index([operatorId, ingestedAt])
  @@index([threadKey])
  @@index([kind, externalId]) // pour dedup
}

model MorningBriefBatch {
  id            String  @id @default(cuid())
  operatorId    String
  operator      Operator @relation(fields: [operatorId], references: [id])

  startedAt     DateTime @default(now())
  completedAt   DateTime?

  rawInput      String   @db.Text  // ce que l'opérateur a collé OU concaténation auto-pull
  sourceCount   Int      @default(0)
  briefCount    Int      @default(0)
  state         String   @default("ANALYZING") // ANALYZING | READY_FOR_REVIEW | PARTIAL_VALIDATED | FULLY_VALIDATED | DISCARDED

  // Stats LLM
  llmConfidenceMean   Float?
  llmTotalTokens      Int?
  llmCostUsd          Float?

  drafts        BriefIngestionDraft[]

  @@index([operatorId, startedAt])
}

model BriefIngestionDraft {
  id            String  @id @default(cuid())
  batchId       String
  batch         MorningBriefBatch @relation(fields: [batchId], references: [id])
  sourceId      String
  source        IngestedSource    @relation(fields: [sourceId], references: [id])

  extractedAt   DateTime @default(now())

  classification     String  // NEW_BRIEF | UPDATE_OF_BRIEF | NON_BRIEF | OPS_ACTION | AMBIGUOUS
  classificationReason String? // ex: "positive feedback, not actionable" pour NON_BRIEF

  // Matching résultats
  resolvedNodeId      String?  // BrandNode matché par brand-resolver
  resolvedNodePath    String[] @default([])  // ["FC", "Bonnet Rouge", "BR-CI", "EVAP", "EVAP Promo"]
  resolvedCampaignId  String?  // Campaign matchée si UPDATE_OF_BRIEF
  resolvedCampaignName String? // pour affichage humain

  // Contenu structuré du brief extrait
  payload      Json    // { title, summary, briefType, urgency, deadline, deliverables[], notes }
  confidence   Float   @default(0.0)  // 0..1

  // Workflow staging
  state        String  @default("PENDING_REVIEW") // PENDING_REVIEW | ACCEPTED | REJECTED | EDITED | MATERIALIZED | AUTO_MATERIALIZED
  reviewedBy   String?
  reviewedAt   DateTime?
  reviewNotes  String?

  // Materialization trace
  materializedCampaignBriefId String?
  materializedAt              DateTime?

  @@index([batchId, state])
  @@index([classification])
  @@index([resolvedNodeId])
}

// Extension Campaign existant (cf. ADR-0059 §9 déjà mentionné)
// Pas de nouveau model — on a déjà CampaignBrief.
```

### §2 — Workflow end-to-end

```
1. [Opérateur] Ouvre /console/operate/morning-intake (8h)
2. [Option A — paste manuel]
     paste blob → [Bouton "Analyser"] → 
3. [Option B — auto-pull, Phase 18-A2]
     [Bouton "Pull dernières 24h Slack/Gmail"] → Anubis MCP entrant aspire les channels/labels configurés → blob auto-loadé
4. [Backend] mestor.emitIntent(MORNING_BRIEF_BATCH_PREVIEW, { rawInput })
5. [Splitter LLM] sépare blob en N IngestedSource (par signature mail / Slack threading / paragraphes WhatsApp)
6. [Pour chaque source] LLM extracte 0..N BriefIngestionDraft :
     - Si 0 brief : tag NON_BRIEF
     - Si 1 brief : extraction + matching nodePath + matching campaign existante
     - Si N briefs : N drafts générés (cas mail multi-projets)
7. [Backend] mestor.emitIntent(BRIEF_BATCH_PERSIST_DRAFTS, { batchId, drafts[] })
8. [UI] Page /console/operate/morning-intake reload avec drafts[] → state PENDING_REVIEW
9. [Opérateur] Pour chaque draft :
     a. Voit la source originale (raw mail/slack) + extraction LLM côte à côte
     b. Édite le summary, le nodePath (tree-picker), la classification (dropdown), l'urgency, le deadline
     c. Click ✓ Accepter | ✗ Rejeter | ↻ Demander re-analyse LLM | ✏️ Marqué Edited
     d. Optionnellement : crée un brief manuel sans LLM via <BriefIngestionDraftForm /> (manual-first parity)
10. [Opérateur] Click "Confirmer batch"
11. [Backend] mestor.emitIntent(MORNING_BRIEF_BATCH_CONFIRM, { batchId, draftIds: [...] })
12. [Handler] Pour chaque draft ACCEPTED|EDITED :
     - Si NEW_BRIEF : crée Campaign (si nouvelle) + CampaignBrief + BrandAsset(kind=CREATIVE_BRIEF, state=DRAFT)
     - Si UPDATE_OF_BRIEF : update Campaign.creativeState + CampaignBrief.version+1 + commentaire
     - Si OPS_ACTION : crée Mission (ou OperationalTask si modèle créé) au lieu de CampaignBrief
     - Lien obligatoire IngestedSource → CampaignBrief (audit chain)
13. [Backend] NSP push event MORNING_BATCH_CONFIRMED → dashboard /console/operate/africa-portfolio refresh real-time
14. [UI] Toast "5 briefs validés, 3 nouveaux projets créés, 2 updates"
```

### §3 — Intent kinds Mestor nouveaux

| Intent kind | Governor | Sync/async | SLO |
|---|---|---|---|
| `MORNING_BRIEF_BATCH_PREVIEW` | MESTOR | async | p95 30s, cost p95 $0.50 (LLM splitter + extractor) |
| `BRIEF_BATCH_PERSIST_DRAFTS` | MESTOR | sync | p95 1s |
| `BRIEF_DRAFT_UPDATE_FIELDS` | MESTOR | sync | p95 200ms (édition manuelle d'un draft) |
| `BRIEF_DRAFT_REQUEST_REANALYSIS` | MESTOR | async | p95 5s (LLM re-run sur 1 source) |
| `MORNING_BRIEF_BATCH_CONFIRM` | MESTOR | async | p95 10s (cascade création Campaign + CampaignBrief + BrandAsset par draft) |
| `OPERATOR_CREATE_INGESTED_SOURCE` | MESTOR | sync | p95 200ms — **manuel : opérateur ajoute une source à la main sans LLM** |
| `OPERATOR_CREATE_BRIEF_DRAFT` | MESTOR | sync | p95 200ms — **manuel : opérateur saisit un brief sans LLM** |

**Manual-first parity garantie** par les 2 derniers Intents (`OPERATOR_CREATE_INGESTED_SOURCE` et `OPERATOR_CREATE_BRIEF_DRAFT`) — l'opérateur peut cliquer "Saisir manuellement" dans l'UI et ajouter une source ou un draft sans aucun appel LLM.

### §4 — Nouveau service `morning-batch/`

```
src/server/services/morning-batch/
├── index.ts             // public API : previewBatch / persistDrafts / confirmBatch / requestReanalysis
├── manifest.ts          // governor: MESTOR, missionContribution: DIRECT_SUPERFAN
├── splitter.ts          // LLM splits raw blob → IngestedSource[]
├── extractor.ts         // LLM extracts BriefIngestionDraft[] from each source (réutilise pattern seshat/market-study-ingestion/extractor-llm.ts)
├── reconciler.ts        // matching contre Campaign + CampaignBrief existants → classification + resolvedCampaignId
├── brand-resolver-tree.ts // résout nodePath dans le BrandNode tree (post 18-A0)
├── materializer.ts      // matérialise drafts ACCEPTED/EDITED via mestor.emitIntent (jamais Prisma direct — manual-first invariant)
├── pii-redactor.ts      // pré-traitement : retire emails perso, salaires, infos confidentielles avant stockage IngestedSource.rawSnippet
├── types.ts
└── tests/
```

### §5 — UI `/console/operate/morning-intake/page.tsx`

Layout 3 zones :

```
┌─────────────────────────────────────────────────────────────────────────┐
│ MORNING INTAKE                                              [Pull 24h] ▼│ ← header avec bouton auto-pull (Phase 18-A2)
├─────────────────────────────────────────────────────────────────────────┤
│ ZONE 1 — INPUT                                                            │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ [Textarea géant : paste manuel] OU [Drop .eml/.txt/.pdf/.docx]      │ │
│ │ [Bouton "Analyser"]   [Bouton "Saisir un brief manuellement"]        │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│ ZONE 2 — REVIEW (apparait après Analyse)                                 │
│ ┌──────────────────────┬────────────────────────────────────────────────┐│
│ │ Source originale     │ Brief extrait (éditable)                       ││
│ │ (raw mail/slack)     │                                                 ││
│ ├──────────────────────┼────────────────────────────────────────────────┤│
│ │ De: Mariam K. (FC)   │ ☐ Tag : [NEW_BRIEF ▼]                          ││
│ │ Le: 2026-05-06 9:23  │ Brand : [FC > BR > BR-CI > EVAP ▼]  ←tree-pick ││
│ │ Sujet: Saison pluies │ Titre : "Saison des pluies BR EVAP CI"         ││
│ │ "Bonjour Alex...     │ Type : [CREATIVE ▼]   Urgency : [HIGH ▼]       ││
│ │  Pour la saison...   │ Deadline : [📅 2026-06-15]                     ││
│ │  Il nous faut..."    │ Livrables : OOH 12m², Poster 60x40, Wobbler    ││
│ │                      │ Résumé : "Campagne saisonnière..."             ││
│ │ [Voir mail original] │ Confidence LLM : 0.87                          ││
│ │                      │ [✓ Accepter] [✗ Rejeter] [↻ Re-analyser]       ││
│ ├──────────────────────┼────────────────────────────────────────────────┤│
│ │ ... source 2         │ ... draft 2                                     ││
│ ├──────────────────────┼────────────────────────────────────────────────┤│
│ │ ... source N         │ ... draft N                                     ││
│ └──────────────────────┴────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────┤
│ ZONE 3 — ACTION                                                           │
│ Drafts: 7 PENDING / 4 ACCEPTED / 1 REJECTED / 2 NON_BRIEF                │
│ [Confirmer batch — matérialiser 4 ACCEPTED + 1 EDITED]   [Discard batch] │
└─────────────────────────────────────────────────────────────────────────┘
```

**Composants** :
- `<MorningIntakeInput />` : textarea + dropzone + bouton manuel
- `<BatchAnalysisProgress />` : skeleton loader pendant LLM analyse (NSP stream du progrès)
- `<DraftReviewRow />` : 1 row source ↔ draft, tous champs éditables (form inline)
- `<NodePathTreePicker />` : composant tree-picker drill-down dans BrandNode pour matcher brand
- `<BriefIngestionDraftForm />` : form standalone (sans LLM) — **manual-first parity**
- `<BatchConfirmFooter />` : compteurs + bouton confirm

### §6 — Audit / provenance chain

Chaque `CampaignBrief` matérialisé pointe son `IngestedSource` via le champ `sourceIngestedId` (ajouté à `CampaignBrief` model en Phase 18-A1). Side panel cliquable depuis n'importe quelle UI qui affiche un CampaignBrief : "Provenance" → ouvre l'`IngestedSource.rawSnippet` + lien `sourceUrl` (cliquable vers Gmail/Slack web app si fourni) + opérateur qui a validé + timestamp validation.

```prisma
model CampaignBrief {
  // ... fields existants ...
  sourceIngestedId   String?
  sourceIngested     IngestedSource? @relation(fields: [sourceIngestedId], references: [id])
}
```

Pour un brief créé manuellement sans LLM, `sourceIngestedId` est null mais une `IngestedSource { kind: "MANUAL_PASTE", rawSnippet: "saisie manuelle directe", operatorId }` peut être créée pour audit homogène (bonne pratique mais optionnel).

### §7 — Reconciliation engine (logique sémantique critique)

Le `brief-reconciler` est l'élément le plus délicat. Pour chaque `BriefIngestionDraft` candidat :

1. **Embedding similarity** vs tous les `CampaignBrief` actifs du `nodeId` matché (top-k=5, threshold > 0.85 = match potentiel)
2. **Name match** vs `Campaign.name` actives (Levenshtein < 3 sur tokens significatifs)
3. **LLM final classification** avec contexte : draft + top-5 candidats + leurs status courants → "NEW / UPDATE_OF / NON_BRIEF / OPS_ACTION / AMBIGUOUS"

**Heuristiques anti-erreur** :
- "Merci pour les visuels Peak Gabon" + sentiment positif + pas de demande explicite → `NON_BRIEF` (positive_feedback)
- "Refais les visuels Peak Gabon en plus saturé" + projet existant matché → `UPDATE_OF_BRIEF` + `briefType: CREATIVE_REVISION`
- "Envoie le devis avant vendredi" + verbe imperatif vers Matanga → `OPS_ACTION` (admin/devis, pas créatif)
- "Peux-tu prévoir une campagne Peak 50ans en parallèle" + projet inexistant → `NEW_BRIEF`
- Si confidence < 0.6 → `AMBIGUOUS` (force human pick)

### §8 — Pièces jointes (PDF / docx)

Pattern réutilisé de [seshat/market-study-ingestion/extractor-llm.ts](../../../src/server/services/seshat/market-study-ingestion/extractor-llm.ts) :
- Détection MIME type sur les fichiers droppés
- PDF → extraction texte par `pdf-parse`
- DOCX → extraction par `mammoth`
- Image (KV brief en photo) → vision API si configuré (sinon flag `requiresManualReview`)
- Le contenu extrait alimente la même pipeline que paste textuel

### §9 — PII redactor (filtre confidentialité)

Avant stockage `IngestedSource.rawSnippet`, le `pii-redactor.ts` invoque un LLM léger qui :
- Retire les emails personnels, numéros de téléphone, salaires explicites, conflits internes mentionnés
- Conserve les noms business + projet + besoin créatif
- Tagge `IngestedSource.redactedFields: string[]` pour audit (si l'opérateur soupçonne sur-redaction, peut consulter le mail original via `sourceUrl`)

### §10 — Connectors auto-pull (Phase 18-A2 optionnel)

Réutilisation du pattern OAuth device flow Phase 16-C ([ADR-0048 §16-C](0048-glory-tools-as-primary-api-surface.md)) :

| Connector | Scope OAuth | Scheduler | UI gestion |
|---|---|---|---|
| Slack | `channels:history channels:read users:read` | cron 8h chaque jour, channels filtrés `#briefs-*` | `/console/anubis/credentials/slack` |
| Gmail | `gmail.readonly` + label `Briefs/` | cron 8h chaque jour | `/console/anubis/credentials/gmail` |
| WhatsApp Business | (si pertinent) WhatsApp Business API | webhook entrant + queue | `/console/anubis/credentials/whatsapp` |

**Validation humaine TOUJOURS obligatoire** post auto-pull. Le scheduler pré-charge le textarea morning-intake mais ne matérialise rien automatiquement.

### §11 — Auto-confirm threshold (Phase 2 fine-tune, désactivé par défaut)

Après ≥30 jours d'utilisation production avec validation humaine systématique et collecte de stats `accuracy: { totalBriefs, correctlyExtracted, manuallyAdjusted }` :

- Toggle `OPERATOR_AUTO_CONFIRM_HIGH_CONFIDENCE: boolean` (per-Operator, désactivé par défaut)
- Si activé : drafts avec `confidence > 0.92` ET `classification ∈ {NEW_BRIEF, UPDATE_OF_BRIEF}` ET `nodePath fully resolved` sont matérialisés en background (`state: "AUTO_MATERIALIZED"`)
- Audit trail conservé : opérateur peut TOUJOURS rollback dans les 24h via UI dédiée
- Notif NSP "X drafts auto-matérialisés ce matin, [Voir et rollback si besoin]"

Cf. [ADR-0060 §8](0060-llm-as-ui-orchestrator-manual-first.md) — l'auto-confirm est une délégation explicite de l'opérateur, pas une violation Manual-first.

### §12 — Manual-first parity check-list

| Fonction LLM | Équivalent UI manuel | Status |
|---|---|---|
| Splitter blob → sources | Bouton "Saisir une source manuellement" → `<IngestedSourceForm />` | ✅ J12 |
| Extractor source → brief | Bouton "Saisir un brief manuellement" → `<BriefIngestionDraftForm />` | ✅ J15 |
| Brand-resolver auto-match | Tree-picker manuel `<NodePathTreePicker />` toujours utilisable | ✅ J14 |
| Reconciler classification | Dropdown manuel sur chaque row de la review-table | ✅ J15 |
| Matérialisation auto-confirm | Désactivée par défaut + bouton explicite "Confirmer batch" | ✅ J16 |
| Auto-pull Slack/Gmail | Bouton "Pull manuel" alternatif au cron auto | ✅ J18-J19 (optionnel) |

---

## Conséquences

### Bénéfices

1. **Cadence quotidienne automatisée** : l'opérateur économise ~30-60 minutes/jour de saisie manuelle (estimation conservative basée sur 10-20 briefs/jour reçus).
2. **Zero perte d'info** : tout mail/slack qui transite est tracé en `IngestedSource` (audit chain). Même si pas matérialisé, archivé.
3. **Provenance navigable** : depuis n'importe quel CampaignBrief, retracer l'origine en 1 clic.
4. **Manual-first respecté** : tout reste saisissable manuellement, le LLM est une accélération opt-in.
5. **Dashboard refresh natif** : NSP push, pas de F5 nécessaire. UX live.
6. **Réutilisation maximale du squelette existant** : 60% déjà en place (brief-ingest, ingestion-pipeline, market-study-ingestion pattern, Anubis MCP, NSP). Effort dev = ~5-7 jours, pas un mois.

### Coûts

- **Effort dev Phase 18-A1** : ~5-7 jours (3 jours backend + 2-3 jours UI + 1 jour tests/audit). Phase 18-A2 auto-pull = +2-4 jours optionnels.
- **Coût LLM** : ~$0.50/jour estimé (1 batch quotidien avec 10-20 briefs × prompt ~5k tokens × output ~2k tokens × Claude Opus). Acceptable.
- **Volume DB** : 1 `MorningBriefBatch` + ~20 `IngestedSource` + ~15 `BriefIngestionDraft` par jour. Sur 1 an = 7300 batches + 73k sources + 55k drafts. Pas problématique.

### Risques + mitigations

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| LLM extracteur se trompe sur la classification (>20% NON-BRIEF mal taggés NEW_BRIEF) | Élevé en début | Friction validation | Validation humaine obligatoire + collecte stats accuracy + fine-tune prompt après 30 jours |
| LLM matche mauvais BrandNode (90% accuracy ≠ 100%) | Élevé | Brief créé sous mauvaise marque → drift | Tree-picker manuel toujours disponible + log des overrides → fine-tune brand-resolver ; possibilité de re-running brief reconciler post-hoc si mauvais matching détecté |
| Mail thread split mal (12 réponses → 12 sources au lieu d'1) | Moyen | Doublons | Splitter LLM groupe par `Message-ID` parent (mail) ou `thread_ts` (Slack) ; dedup via embedding similarity |
| PII redactor sur-redacte (expurge un nom de projet pris pour PII) | Moyen | Information perdue | Audit `redactedFields[]` + opérateur peut consulter mail original via `sourceUrl` |
| Anubis MCP entrant casse à cause OAuth scope changes vendor | Faible | Connector down 1-2j | Logs détaillés + paste manuel toujours disponible (Manual-first parity) |
| Auto-confirm Phase 2 introduit du drift | Faible | Régression Manual-first | Toggle opt-in explicite + rollback 24h + audit trail |

---

## Tests anti-drift

| Test | Vérifie |
|---|---|
| `tests/unit/governance/morning-batch-validation.test.ts` | Aucune route `confirmBatch` ne by-pass le check `BriefIngestionDraft.state === "ACCEPTED" \|\| "EDITED"` |
| `tests/unit/governance/morning-batch-no-bypass.test.ts` | `morning-batch/materializer.ts` n'écrit pas en DB direct, passe obligatoirement par `mestor.emitIntent()` |
| `tests/unit/governance/morning-batch-source-required.test.ts` | Tout `CampaignBrief` matérialisé via batch a un `sourceIngestedId` non-null |
| `tests/unit/governance/manual-brief-form-parity.test.ts` | `<BriefIngestionDraftForm />` et `<IngestedSourceForm />` exposent tous les champs éditables (parité avec extraction LLM) |

---

## Sources de vérité à propager

- [ ] `CHANGELOG.md` v6.18.15 entry mentionne ADR-0062 + Morning Brief Batch
- [ ] `INTENT-CATALOG.md` régénéré post-création Intents §3 (auto via `gen-intent-catalog.ts`)
- [ ] `SERVICE-MAP.md` ajouter `morning-batch/` (gouverneur MESTOR, mission DIRECT_SUPERFAN)
- [ ] `ROUTER-MAP.md` ajouter routes `morningBatch.*`
- [ ] `PAGE-MAP.md` ajouter `/console/operate/morning-intake`
- [ ] `LEXICON.md` entrées `IngestedSource`, `BriefIngestionDraft`, `MorningBriefBatch`, `Morning Brief Batch` (concept)
- [ ] Memory user `architecture_morning_brief_batch.md` (à créer post-merge)

---

**60% du squelette existe (brief-ingest + ingestion-pipeline + market-study-ingestion pattern + Anubis MCP + NSP). Effort Phase 18-A1 = 5-7 jours. Optionnel Phase 18-A2 = 4-5 jours auto-pull.**
