# ADR-0012 — Brand Vault unifié pour SuperAssets (BrandAsset enrichi)

**Date** : 2026-04-30
**Statut** : accepted
**Phase de refonte** : phase/10-brand-vault

## Contexte

L'OS produit en continu des "actifs raffinés de la marque" via les séquences Glory tools : big ideas, briefs créatifs, brainstorms, claims, manifestes, KV art direction briefs, copies radio, idées de logo, briefs de campagne 360°, etc. Le user les nomme **SuperAssets** par opposition à `GloryOutput` (log brut) et `AssetVersion` (asset matériel forgé par Ptah).

Trois constats critiques :

1. Aujourd'hui, ces SuperAssets sont **noyés dans `GloryOutput.output: Json`** sans gouvernance de cycle de vie ni lineage business explicite (lien Campaign / Brief). Pas de sélection parmi candidats, pas de versioning, pas de supersession, pas d'archivage rituel.
2. La table `BrandAsset` existait déjà (level system/operator/production, pillarTags) mais **minimaliste** — pas de kind typé, pas de state machine, pas de batch.
3. Une première tentative (`SuperAsset` standalone, commit prototype) a créé un **doublon** de `BrandAsset`. Erreur architecturale identifiée par le tech lead : on ne crée pas une seconde table pour la même fonction métier.

## Décision

**Enrichir `BrandAsset` pour devenir le vault unifié de la marque** — réceptacle unique pour TOUS les actifs (intellectuels ET matériels) avec cycle de vie gouverné et lineage hash-chain.

Pas de table `SuperAsset` séparée. Le terme "SuperAsset" reste utilisable en discussion mais désigne dans le code un `BrandAsset.kind ∈ { BIG_IDEA, CREATIVE_BRIEF, MANIFESTO, ... }` typé intellectuel.

### Schéma `BrandAsset` enrichi

Champs ajoutés :

- `kind` (string, taxonomie complète : 50+ kinds canoniques) — cf. `brand-vault/engine FORMAT_TO_KIND`
- `format` (outputFormat Glory tool d'origine si applicable)
- `family` (`INTELLECTUAL` / `MATERIAL` / `HYBRID`)
- `state` (enum `BrandAssetState`)
- `content: Json?` (payload structuré pour intellectuels)
- `summary: String?` (court, pour listing UI)
- `pillarSource: String?` (A/D/V/E/R/T/I/S — téléologie)
- `manipulationMode: String?` (peddler/dealer/facilitator/entertainer)
- Lineage upstream : `sourceIntentId`, `sourceGloryOutputId`, `sourceAssetVersionId`
- Batch : `batchId`, `batchSize`, `batchIndex`
- Lineage business : `campaignId`, `briefId`
- Sélection : `selectedAt`, `selectedById`, `selectedReason`
- Versioning : `version`, `parentBrandAssetId`, relation `parent`/`children`
- Supersession : `supersededById`, `supersededAt`, `supersededReason`, relation `supersededByAsset`/`supersedes`
- Multi-tenant : `operatorId`
- Liens downstream : `generativeTasks: GenerativeTask[]` (forges Ptah qui partent de cet asset)

Le `assetType` legacy reste pour rétrocompat mais est déprécié au profit de `kind`.

### Cycle de vie

```
DRAFT  ──(séquence finit)──►  CANDIDATE
                                 │
                                 ├─ SELECT_BRAND_ASSET ──► SELECTED
                                 │                            │
                                 │                            └─ PROMOTE_TO_ACTIVE ──► ACTIVE
                                 │                                                       │
                                 │                                                       ├─ SUPERSEDE ──► SUPERSEDED
                                 │                                                       │
                                 │                                                       └─ ARCHIVE ──► ARCHIVED
                                 │
                                 └─ (autres candidats du batch) ──► REJECTED
```

### Liens Campaign

Une Campaign garde 1 BrandAsset ACTIVE par kind clé :

- `Campaign.activeBigIdeaId` → BrandAsset (kind=BIG_IDEA, state=ACTIVE)
- `Campaign.activeBriefId` → BrandAsset (kind=CREATIVE_BRIEF / BRIEF_360)
- `Campaign.activeClaimId` → BrandAsset (kind=CLAIM)
- `Campaign.activeManifestoId` → BrandAsset (kind=MANIFESTO)
- `Campaign.activeKvBriefId` → BrandAsset (kind=KV_ART_DIRECTION_BRIEF)

L'écran `/cockpit/operate/campaigns/[id]` affiche cette chaîne contextuelle : Campaign → activeBigIdea → activeBrief → BrandAssets[] (briefs production) → GenerativeTask[] → AssetVersion[] → CampaignAsset[].

### Auto-dépôt des Glory tools

Le `sequence-executor` (`executeGloryStep`) appelle après chaque Glory tool :

```ts
await depositInBrandVault({ tool, toolOutput, gloryOutputId, gloryIntentId, strategyId, context })
```

Heuristique :
- Si `toolOutput` contient une liste structurée (`concepts`, `claims`, `prompts`, `names`, `propositions`, `ideas`, `options`) → **batch de N CANDIDATE**
- Sinon → **1 BrandAsset DRAFT unique**

Le mapping `outputFormat → kind` est stable via `FORMAT_TO_KIND` dans `brand-vault/engine.ts`.

### Promote des forges Ptah

Le `ptah.reconcileTask` après création des `AssetVersion` promeut chaque asset matériel en `BrandAsset` (`family=MATERIAL`, `fileUrl=AssetVersion.cdnUrl`, `state=ACTIVE`, `sourceAssetVersionId` lié, lineage business via `campaignId` + `briefId` héritée du `GenerativeTask`).

### Intent kinds gouvernés (Mestor)

- `SELECT_BRAND_ASSET` — sélectionne 1 parmi batch CANDIDATE → SELECTED, autres → REJECTED, optionnellement promote ACTIVE
- `PROMOTE_BRAND_ASSET_TO_ACTIVE` — SELECTED → ACTIVE + update Campaign.active{Kind}Id
- `SUPERSEDE_BRAND_ASSET` — ACTIVE → SUPERSEDED par nouveau BrandAsset, lineage version+1
- `ARCHIVE_BRAND_ASSET` — mort rituelle (lecture seule)

SLOs : tous < 1s p95, errorRate < 2%, cost = 0 (DB only).

## Conséquences

### Positives

- **Vault unique** — fini la dispersion (`GloryOutput` brut, `BrandAsset` minimal, `AssetVersion` Ptah, `CampaignAsset` legacy). Une seule porte d'entrée : `BrandAsset` typé + state machine.
- **Chaîne contextuelle traçable** sur l'écran de campagne : BigIdea active → Brief actif → Productions (forges Ptah) → AssetVersion → CampaignAsset publishé.
- **Cycle de vie respecté** — sélection parmi candidats explicite, supersession versionnée, archivage rituel. Lignée hash-chain via `sourceIntentId` (Mestor IntentEmission).
- **Auto-deposit** — chaque Glory tool dépose automatiquement ses outputs dans le vault. Plus de "noyé dans GloryOutput".
- **Promotion Ptah** — les KV forgés via Nano Banana atterrissent comme `BrandAsset.kind=KV_VISUAL state=ACTIVE`, recherchables depuis `/cockpit/brand/assets`.

### Négatives

- **Migration DB** — 1 nouvelle migration (`20260430130000_brand_vault_phase10`) ajoute ~15 colonnes + 10 indexes + enum `BrandAssetState`. Migration en place, tournée sur DB locale.
- **Anciens GloryOutput pré-Phase 10** — pas back-fillés en BrandAsset automatiquement. Script `seed-brandvault-from-glory.ts` à écrire si besoin de retrofit (Phase 10-suite).
- **UI à enrichir** — `/cockpit/brand/assets` actuel doit être repensé pour : sections par kind, filter par state, lineage visible, actions sélection/supersession. Pour l'instant la page existe mais n'expose pas la state machine.

### Drift signal

`audit-brand-vault-coherence.ts` (cron hebdo, à créer Phase 10-suite) :
- Une Campaign avec `state ≥ PRODUCTION` doit avoir `activeBriefId` non-null
- Toute `AssetVersion` complete doit avoir un `BrandAsset` matériel correspondant (`sourceAssetVersionId` pointe vers elle)
- Tout `BrandAsset.state=ACTIVE` doit avoir au plus 1 par (kind, campaignId) — invariant unicité

## Alternatives considérées

1. **Table `SuperAsset` standalone** (prototype rejeté) : doublon de `BrandAsset`. Architectural drift identifié par tech lead.
2. **Hériter `SuperAsset` via Prisma single-table inheritance** : Prisma ne supporte pas STI proprement. Workaround = champ `kind` discriminant — c'est exactement ce qu'on fait avec BrandAsset enrichi.
3. **Garder `GloryOutput` comme seul réceptacle** + ajouter state machine dessus : `GloryOutput` est un log technique brut, pas un actif business. Mélange responsabilités. Rejeté.
4. **Tables séparées par kind** (`BigIdea`, `Brief`, `Manifesto`, …) : 30+ tables, jointures complexes, pas de queries cross-kind possibles. Rejeté.

## Lectures

- [LEXICON.md](../LEXICON.md) — entrée BrandAsset / Brand Vault
- [PANTHEON.md](../PANTHEON.md) — Phase 10 mention dans roadmap
- [ADR-0009](0009-neter-ptah-forge.md) — Phase 9 Ptah (lien sourceAssetVersionId)
- `src/server/services/brand-vault/engine.ts` — implémentation
- `src/server/services/artemis/tools/sequence-executor.ts` — auto-deposit
- `src/server/services/ptah/index.ts` — promote forge result
