# ADR-0023 — `OPERATOR_AMEND_PILLAR` : voie unique d'édition intentionnelle des piliers ADVE

**Date** : 2026-05-02
**Statut** : accepted
**Phase de refonte** : phase/2-intents
**Co-shippé avec** : ADR-0024 (renommage Console oracle namespace)

## Contexte

Aucune voie déclarée n'existait pour qu'un opérateur édite intentionnellement un champ ADVE. Les seules voies disponibles avant cet ADR :

1. **`applyRecos()` Notoria** (réactif) : déclenchée par drift / signaux Tarsis / feedback. Ne s'auto-déclenche pas sur intent humain explicite "je veux changer la vision".
2. **`FILL_ADVE`** : phase initiale d'intake, pas amendement.
3. **`PROPOSE_ADVE_UPDATE_FROM_RT(trigger:MANUAL)`** : défini dans `mestor/intents.ts` mais **pas branché à une UI**, et sa sémantique est "RTIS suggère de mettre à jour ADVE" — pas "user veut éditer le champ X de A".

Conséquence concrète : un opérateur ne pouvait pas corriger un descriptif produit, affiner une vision, ajuster une persona D, modifier une valeur fondatrice — sauf à attendre que Notoria propose, ce qui ne vient pas sans signal. Le repo se gérait comme une boîte noire dépendant de l'inférence.

Drift narratif additionnel détecté lors de la session NEFER de planification : tendance à sur-pondérer Oracle comme "le" livrable canonique, alors qu'Oracle est UN BrandAsset.kind parmi N. La cascade Glory→Brief→Forge produit aussi briefs Artemis, claims, KV, manifestos, big ideas, creative briefs. **Modifier un pilier ADVE impacte tous les SuperAssets ACTIVE qui en dépendent — Oracle inclus, mais pas plus important que les autres dans la cascade.** Le design de cet ADR doit refléter ce traitement uniforme.

Sémantique fondamentale (corrigée pendant la session) :
- **4 piliers ADVE** = SOCLE FONDATEUR. Mutent UNIQUEMENT sous action utilisateur explicite ou validation. Pas d'inférence silencieuse.
- **4 piliers RTIS** = DYNAMIQUES, dérivés cascade depuis ADVE. Recalculés via Intent existants (`ENRICH_R_FROM_ADVE`, `ENRICH_T_FROM_ADVE_R_SESHAT`, `GENERATE_I_ACTIONS`, `SYNTHESIZE_S`). **Jamais éditables manuellement** — un "rafraîchissement" passe par re-déclenchement de l'Intent d'inférence, pas par patch champ.

## Décision

On adopte un nouvel Intent `OPERATOR_AMEND_PILLAR` à 3 modes, **scope ADVE exclusivement** (R/T/I/S exclus au type-level), avec gate `PILLAR_COHERENCE` dédié et UI consommée par les 4 pages cockpit ADVE + l'Annuaire des Variables Console.

### 1. Contrat Intent (typed union, ADVE only)

`src/server/services/mestor/intents.ts` :

```ts
| {
    kind: "OPERATOR_AMEND_PILLAR";
    strategyId: string;
    operatorId: string;
    pillarKey: "a" | "d" | "v" | "e";   // ADVE only — type-level constraint
    mode: "PATCH_DIRECT" | "LLM_REPHRASE" | "STRATEGIC_REWRITE";
    field: string;
    proposedValue?: unknown;
    rephrasePrompt?: string;
    reason: string;                     // ≥20 chars si STRATEGIC_REWRITE
    overrideLocked?: boolean;
    expectedVersion?: number;
  }
```

Le compilateur refuse `pillarKey: "r" | "t" | "i" | "s"` — garantit "ADVE only" au niveau du contrat.

### 2. Matrice 3 modes

| Mode | Quand | Auteur Gateway | Gate appliqué |
|------|-------|----------------|---------------|
| `PATCH_DIRECT` | Champ scalaire simple, non-LOCKED, non-financial, non-cross-pillar | `OPERATOR` + raison | confidence=1.0, destructive check, financial check si applicable |
| `LLM_REPHRASE` | Champ texte qualitatif ; user décrit son intention en langage naturel | `OPERATOR` après preview Notoria | `PILLAR_COHERENCE` complet, cost gate Thot pre-flight |
| `STRATEGIC_REWRITE` | Champ LOCKED, destructif (`d.personas`, `v.unitEconomics`, `v.businessModel.coreEngine`, `a.noyauIdentitaire`), ou impact RTIS étendu | `OPERATOR` + raison ≥20 chars + `overrideLocked:true` | `PILLAR_COHERENCE` strict + double-confirm + audit `LOCKED_OVERRIDE` |

### 3. Voie unique de mutation

Tous les modes émettent `OPERATOR_AMEND_PILLAR` via `mestor.emitIntent()` → `Artemis.commandant.execute()` → `operatorAmendPillar()` handler → `writePillarAndScore()` (LOI 1, no bypass). Hérite gratuitement du lifecycle Recommendation, audit trail, hash-chain, eventBus, RTIS staleness propagation par le Pillar Gateway.

### 4. Gate `PILLAR_COHERENCE`

`src/server/services/notoria/gates.ts` exporte `applyPillarCoherenceGate()` qui applique dans l'ordre :

1. **LOCKED check** — refuse sans `overrideLocked`. Avec override + author OPERATOR → audit log + warning.
2. **Destructive amplifier** — `d.personas`, `v.unitEconomics`, `v.businessModel.coreEngine`, `a.noyauIdentitaire` → force STRATEGIC_REWRITE mode.
3. **Cross-ADVE warning** — `d.personas` warns about `e.superfanPortrait`. Non-bloquant.
4. **Financial reuse** — délègue à `validateFinancialReco` existant (gates.ts).

### 5. UI — consommée depuis variable-bible (PAS Zod)

Le dropdown du modal `AmendPillarModal` est alimenté par `trpc.pillar.listEditableFields(pillarKey)` qui interroge `BIBLE_X` depuis `src/lib/types/variable-bible.ts`, pas une introspection Zod. **Réutilisation, pas réinvention** (interdit NEFER #1).

`variable-bible` donne déjà :
- `description`, `format`, `examples[]`, `minLength`, `maxLength`, `rules[]` → UX riche dans le modal
- `derivedFrom` → exclusion automatique du dropdown (fields calculés)
- `feedsInto[]` → preview cascade explicite cross-pilier
- nouvelle propriété `editableMode` → override de l'heuristique

Le Zod reste utilisé pour la validation runtime côté gateway. Pas de doublon de surface.

### 6. Cascade & side effects (pattern uniforme, pas d'évangélisme Oracle)

1. **RTIS stale** — déjà géré par `pillar-gateway` (LOI 1). Pas de re-inférence auto. Bouton "Recalculer ce pilier" sur les pages RTIS, déclenche `cascadeRTIS` (Intent `RUN_RTIS_CASCADE` existant).
2. **SuperAssets cascade** — STRATEGIC_REWRITE seulement : `BrandAsset.staleAt = now()` + `staleReason` pour tous les `BrandAsset` ACTIVE liés (`pillarSource = pillarKey`). **L'asset reste ACTIVE** — sémantique enum `BrandAssetState` préservée. Le pattern s'applique uniformément à tous les kinds (Oracle compilé, briefs Artemis, claims, KV, manifestos…). **Pas de hiérarchie Oracle vs reste**.
3. **Cost gate Thot** — pre-flight obligatoire si `mode !== PATCH_DIRECT`. V1 stub passthrough ; auto-active en Phase 1.

### 7. Migration Prisma associée

`prisma/migrations/20260502000000_brand_asset_stale_for_amend/migration.sql` :
```sql
ALTER TABLE "BrandAsset" ADD COLUMN "staleAt" TIMESTAMP(3);
ALTER TABLE "BrandAsset" ADD COLUMN "staleReason" TEXT;
CREATE INDEX "BrandAsset_staleAt_idx" ON "BrandAsset"("staleAt");
```

Pattern symétrique avec `Pillar.staleAt` existant. Migration mineure.

## Conséquences

### Positives

- **Voie déclarée pour l'édition intentionnelle** : un opérateur peut enfin corriger / affiner / ajuster sans attendre un signal drift.
- **Loi 2 séquencement préservé** : RTIS exclus au type-level. Cascade ADVE → RTIS via Intent d'inférence, jamais via patch champ.
- **Loi 1 conservation altitude** : l'amend participe au hash-chain `IntentEmission` automatiquement (gratuit via `mestor.emitIntent()`).
- **Loi 3 fuel** : cost gate Thot pre-flight intégré.
- **Anti-drift narratif Oracle** : le pattern uniforme `BrandAsset.staleAt` traite Oracle comme tout autre BrandAsset. Plus de privilège textuel ni structurel.
- **Anti-réinvention** : la bibliothèque variable-bible existante est réutilisée, pas dupliquée. La Console `/config/variables` reste source de vérité unique.
- **RBAC réutilisé** : `operatorProcedure` existant (UPGRADER role ou user lié à un Operator).

### Négatives / risques

- **STRATEGIC_REWRITE peut casser des campagnes en cours** : mitigation via `BrandAsset.staleAt` (pas de mort, juste alerte régen) + double-confirm modal.
- **LLM_REPHRASE V1 = passthrough** : la prévisualisation Notoria sera plugée en Phase 1 (single-field LLM call). V1 marche déjà mais sans rephrase intelligent.
- **Pas de per-field button pour V1** : un seul bouton "Modifier" global par page ADVE qui ouvre le modal avec le dropdown. V2 si l'UX demande un crayon par card.
- **L'override LOCKED existe** : un opérateur malveillant peut overrider. Mitigation : audit trail systématique + role required (operatorProcedure).

### Surveillance

- **Test bloquant `pillar-schema-coherence.test.ts`** : 7 invariants entre Zod / variable-bible / FINANCIAL_FIELDS / Intent. Bloque pre-commit.
- **Test gate `notoria-pillar-coherence-gate.test.ts`** : 6 cas de la matrice gate.
- **NEFER.md §0.3 LEXICON mappings** : "modifier la marque", "rafraîchir RTIS", "bibliothèque de variables" pointent maintenant vers les entités correctes.
- **CHANGELOG.md** : entry `feat(brand)`.

## Liens

- ADR-0014 — Oracle 35-section framework (Oracle est UN livrable parmi N)
- ADR-0024 — Console oracle namespace cleanup (co-shippé)
- ADR-0012 — Brand Vault SuperAssets (sémantique BrandAsset.state préservée)
- NEFER.md §2 (sémantique ADVE socle vs RTIS dérivé)
- LEXICON.md (entrées OPERATOR_AMEND_PILLAR + variable-bible)
