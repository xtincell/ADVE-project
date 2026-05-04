# ADR-0040 — Migration uniforme des 35 sections Oracle vers sequences

**Status** : Accepted
**Date** : 2026-05-04
**Phase** : 17 — Refonte rigueur Artemis (mégasprint NEFER F1→F11)
**Supersedes** : aucun (étend [ADR-0014](0014-oracle-35-framework-canonical.md))
**Related** : [ADR-0039](0039-sequence-as-unique-public-unit.md), [ADR-0014](0014-oracle-35-framework-canonical.md), [ADR-0012](0012-brand-vault-superassets.md), [NEFER.md](../NEFER.md) §0.3

---

## Contexte

Audit gouvernance NEFER 2026-05-04 sur l'enrichissement Oracle ([enrich-oracle.ts:209-680](../../../src/server/services/strategy-presentation/enrich-oracle.ts:209)) a révélé F2 + F3 + F4 :

### F2 — `SECTION_ENRICHMENT` permet `frameworks ∪ _glorySequence` ambigu

Le type `SectionEnrichmentSpec` ([enrich-oracle.ts:156](../../../src/server/services/strategy-presentation/enrich-oracle.ts:156)) autorise `frameworks: string[]` et `_glorySequence?: string` simultanément. Aujourd'hui : 14 sections CORE en `frameworks: [...]`, 14 sections étendues en `frameworks: []` + `_glorySequence: "..."`. Aucune n'a les deux non-vides en même temps, mais le type le permet — ambiguïté latente, rien ne bloque la dérive en CI.

### F3 — Promotion BrandAsset uniquement dans branche `_glorySequence`

[enrich-oracle.ts:873](../../../src/server/services/strategy-presentation/enrich-oracle.ts:873) — `if (sequenceKey) { … promoteSectionToBrandAsset(…) … continue; }`. La branche `frameworks` ([enrich-oracle.ts:863-870 + 970+](../../../src/server/services/strategy-presentation/enrich-oracle.ts:863)) écrit `pillar.content` mais **ne promeut jamais en BrandAsset**. 14 sections CORE concernées ont un `brandAssetKind` déclaré dans [SECTION_REGISTRY](../../../src/server/services/strategy-presentation/types.ts:80) mais aucun BrandAsset n'est créé pour elles → BrandVault incomplet, 40 % de l'Oracle hors vault.

### F4 — 7 sections « vraiment dérivées » sans aucun traitement gouverné

35 sections dans [SECTION_REGISTRY](../../../src/server/services/strategy-presentation/types.ts:77), 28 dans `SECTION_ENRICHMENT`. **7 absentes** : `executive-summary`, `plateforme-strategique`, `plan-activation`, `production-livrables`, `budget`, `timeline-gouvernance`, `conditions-etapes`. Leur contenu vient uniquement de `mapXxx` dans [section-mappers.ts](../../../src/server/services/strategy-presentation/section-mappers.ts) appelées par `assemblePresentation`. Aucune `IntentEmission`, aucun BrandAsset, aucun journal pour ces 7 sections. 20 % de l'Oracle hors gouvernance.

## Décision

### §1 — Type-level mutex sur `SectionEnrichmentSpec`

Champ `frameworks` retiré. `glorySequence` devient obligatoire :

```ts
// AVANT
interface SectionEnrichmentSpec {
  frameworks: string[];
  pillar: string;
  writeback: …;
  _glorySequence?: string;
  _brandAssetKind?: string;
  _isDormant?: boolean;
}

// APRÈS
interface SectionEnrichmentSpec {
  glorySequence: GlorySequenceKey;     // obligatoire
  pillar: PillarStorageKey;
  writeback: (outputs: SequenceOutputs) => Record<string, unknown>;
  brandAssetKind?: BrandAssetKind;
  isDormant?: boolean;
}
```

L'underscore `_` retiré : ces champs sont la norme. F2 fermée au type-level.

### §2 — Migration des 14 sections CORE framework-only en sequences

Pour chaque section actuellement en `frameworks: [...]` (14 sections : `contexte-defi`, `proposition-valeur`, `experience-engagement`, `swot-interne`, `swot-externe`, `signaux-opportunites`, `catalogue-actions`, `fenetre-overton`, `profil-superfan`, `croissance-evolution`, `kpis-mesure`, `medias-distribution`, `equipe`, `territoire-creatif`), créer une sequence dédiée famille `ORACLE_CORE` :

```ts
{
  key: "CORE-CONTEXTE-DEFI",
  family: "ORACLE_CORE",
  name: "Section 02 — Contexte & Défi",
  pillar: "A",
  steps: [
    pillar("a", "Pilier A"),
    pillar("d", "Pilier D — personas"),
    artemis("fw-01-brand-archeology", "Archéologie", [...]),
    artemis("fw-02-persona-constellation", "Personas", [...]),
    glory("synthesize-section", ["narrative", "structured_payload"]),
  ],
  aiPowered: true,
  refined: false,
  tier: 1,
  requires: [{ type: "PILLAR", key: "a", maturity: "ENRICHED" }],
  lifecycle: "DRAFT",
  mode: "ENRICHMENT",
}
```

Mapping framework→step ARTEMIS dérivé directement de l'actuel `SECTION_ENRICHMENT[<id>].frameworks`. Pas de réinvention — extension stricte.

### §3 — 7 sequences `ORACLE_DERIVED` pour les sections sans traitement

Famille `ORACLE_DERIVED` ajoutée. Pattern :

```ts
{
  key: "DERIVED-EXEC-SUMMARY",
  family: "ORACLE_DERIVED",
  name: "Section 01 — Executive Summary",
  pillar: "A",
  steps: [
    pillar("a"), pillar("d"), pillar("v"), pillar("e"),
    pillar("r"), pillar("t"), pillar("i"), pillar("s"),
    calc("draft-exec-summary", "Draft via mapExecutiveSummary", ["section_draft"]),
    glory("synthesize-section", ["narrative", "structured_payload"]),
  ],
  // …
}
```

Mapping pillars sources :

| Sequence | Pillars | CALC ref | Mapper consommé |
|---|---|---|---|
| `DERIVED-EXEC-SUMMARY` | a,d,v,e,r,t,i,s | `draft-exec-summary` | `mapExecutiveSummary` |
| `DERIVED-PLATEFORME` | a,d,v | `draft-plateforme` | `mapPlateformeStrategique` |
| `DERIVED-PLAN-ACT` | i | `draft-plan-act` | `mapPlanActivation` |
| `DERIVED-PROD-LIV` | i,t | `draft-prod-liv` | `mapProductionLivrables` |
| `DERIVED-BUDGET` | v | `draft-budget` | `mapBudget` |
| `DERIVED-TIMELINE` | s | `draft-timeline` | `mapTimelineGouvernance` |
| `DERIVED-CONDITIONS` | r,s | `draft-conditions` | `mapConditionsEtapes` |

`mapXxx` conservés comme **draft generators** déterministes consommés via step CALC. Le Glory tool `synthesize-section` polit en narrative cohérente, ne fabrique aucune donnée numérique.

### §4 — Glory tool générique `synthesize-section`

[registry.ts](../../../src/server/services/artemis/tools/registry.ts) — ajouté dans `DC_TOOLS` :

```ts
{
  slug: "synthesize-section",
  name: "Synthétiseur de Section Oracle",
  layer: "DC",
  executionType: "LLM",
  description: "Polit le draft JSON d'une section Oracle en narrative cohérente. Zéro fabrication, fidélité au draft = contrat strict.",
  inputFields: ["section_id", "section_draft", "brand_context"],
  pillarBindings: { brand_context: "a.doctrine" },
  outputFormat: "section_narrative",
  promptTemplate: `Section Oracle "{{section_id}}".
Draft déterministe (NE PAS modifier les données numériques ni inventer) : {{section_draft}}
Contexte de marque : {{brand_context}}
Livrable : { narrative: string, structured_payload: <draft identique avec polish narrative dans champs textuels uniquement> }.`,
  status: "ACTIVE",
}
```

Manifest auto-dérivé via [glory-manifests.ts](../../../src/server/services/artemis/tools/glory-manifests.ts).

### §5 — Routage CALC `draft-<section>` vers `mapXxx`

[sequence-executor.ts](../../../src/server/services/artemis/tools/sequence-executor.ts) — `executeCalcStep` étendu avec `SECTION_DRAFT_GENERATORS` map qui route les 7 refs `draft-*` vers les `mapXxx` correspondants. Le step charge la `Strategy` complète (reuse `PRESENTATION_INCLUDE`), calcule le draft, retourne `{ section_draft: JSON.stringify(draft) }`. Le step GLORY suivant le consomme.

### §6 — Dispatch `enrich-oracle.ts` simplifié

Avec F2 fermée + 21 nouvelles sequences + WRAP-FW-* en place, la branche `frameworks` du dispatch ([enrich-oracle.ts:854-1010](../../../src/server/services/strategy-presentation/enrich-oracle.ts:854)) est supprimée. Tout passe par la branche sequence. `neededFrameworks` Set + `topologicalSort` direct sur frameworks remplacés par `neededSequences` + `topoSortSequences` (cf. [ADR-0041](0041-sequence-robustness-loop.md)). Le code shrink de ~150 lignes.

### §7 — `assemblePresentation` lecture BrandAsset prioritaire

[strategy-presentation/index.ts:85-141](../../../src/server/services/strategy-presentation/index.ts:85) — chaque section appelée via `loadSection(strategy, sectionId, fallback)` qui consulte d'abord `BrandAsset (kind, state=ACTIVE)` ; fallback `mapXxx` si absent. Strategies legacy continuent de rendre. Après 1er enrichissement, le rendu Oracle reflète le BrandAsset poli.

## Conséquences

### Bénéfices

- **F2 fermée au type-level** — plus d'ambiguïté `frameworks ∪ _glorySequence`
- **F3 fermée** — 35 BrandAssets DRAFT créés après enrich complet (28 actives + 7 dérivées)
- **F4 fermée** — 7 sections dérivées maintenant gouvernées via Intent + audit + journal + BrandAsset
- **Symétrie totale** — toutes les 35 sections suivent le même pipeline `executeSequence → writeback → promote`
- **Cohérence narrative** — `synthesize-section` produit un texte cohérent vs concaténation mécanique de `mapXxx`

### Coûts

- **+0,15 $ par enrich complet** (7 sections DERIVED × 1 LLM call) — compensé par cache sequence-level ([ADR-0041](0041-sequence-robustness-loop.md))
- **21 sequences nouvelles** (14 CORE + 7 DERIVED) gonflent `ALL_SEQUENCES`. Helpers `getSequencesByFamily` filtrent.
- **`assemblePresentation` devient async-aware** sur lectures BrandAsset (déjà async)

### Risques

- **Strategies legacy** sans BrandAsset → fallback `mapXxx` natif, aucune régression visuelle
- **`synthesize-section` peut fabriquer** si prompt insuffisant. Mitigation : test `synthesize-section-fidelity.test.ts` vérifie epsilon < 0.001 sur champs numériques draft vs structured_payload
- **CORE sequences dérivées DRAFT** au démarrage → audit qualité narrative requis avant promotion STABLE

## Open work

- Promotion `lifecycle: STABLE` des 14 CORE et 7 DERIVED après stress-test prolongé (1 mois) + audit narratif manuel — tracking dans [RESIDUAL-DEBT.md](../RESIDUAL-DEBT.md)

## Références implémentation

- Fichiers modifiés : [enrich-oracle.ts](../../../src/server/services/strategy-presentation/enrich-oracle.ts), [strategy-presentation/index.ts](../../../src/server/services/strategy-presentation/index.ts), [registry.ts](../../../src/server/services/artemis/tools/registry.ts), [sequences.ts](../../../src/server/services/artemis/tools/sequences.ts), [sequence-executor.ts](../../../src/server/services/artemis/tools/sequence-executor.ts)
- Tests nouveaux : `tests/unit/oracle/section-enrichment-mutex.test.ts`, `tests/integration/oracle/all-35-sections-promoted.test.ts`, `tests/integration/oracle/synthesize-section-fidelity.test.ts`
