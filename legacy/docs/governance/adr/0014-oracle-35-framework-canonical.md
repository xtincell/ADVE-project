# ADR-0014 — Oracle 35-section framework canonical lock

**Date** : 2026-05-01
**Statut** : Accepted
**Phase** : 13 (sprint Oracle 35-section)
**Branche** : `claude/resume-conversation-uSfSG` (PR #26)

## Contexte

L'Oracle, livrable consulting dynamique modulaire et produit phare de La Fusée, comportait 21 sections actives produites par le pipeline `enrichOracle` (Mestor + Artemis frameworks). L'analyse du sprint (cf. plan dédié `~/.claude/plans/tu-peux-reprendre-ou-compressed-hippo.md`) a identifié plusieurs gaps :

1. **Gap valeur ajoutée** : avant de revendiquer toute valeur ajoutée distinctive (Cult Index, Manipulation Matrix, Devotion Ladder), l'Oracle DOIT minimum tenir la structure d'un livrable consulting one-shot type Big4 (Deloitte/McKinsey/BCG/Bain).
2. **Drift potentiel** : `SECTION_REGISTRY` était la source de vérité pour 21 sections, mais le framework restait implicite. Aucun lock empêchait l'ajout de sections hors-canon.
3. **Pipeline non explicite** : les sections étaient produites par un mix `frameworks` (Artemis) + `_glorySequence` partiel, sans cartographie claire `section → séquence → tools → SuperAsset BrandVault`.
4. **Ptah forge auto-trigger** : la cascade Glory→Brief→Forge se déclenchait automatiquement durant `enrichAllSectionsNeteru()`, ce qui n'était pas souhaité (le user veut Ptah à la demande).

## Décision

**Verrouiller l'Oracle dans un framework canonique unique de 35 sections** :

- 21 **CORE** sections actives (Phase 1-3 ADVERTIS + Mesure + Operationnel — inchangées)
- 7 **BIG4_BASELINE** sections : `mckinsey-7s`, `bcg-portfolio`, `bain-nps`, `deloitte-greenhouse`, `mckinsey-3-horizons`, `bcg-strategy-palette`, `deloitte-budget`
- 5 **DISTINCTIVE** sections : `cult-index`, `manipulation-matrix`, `devotion-ladder`, `overton-distinctive`, `tarsis-weak-signals` (valeur ajoutée La Fusée vs Big4)
- 2 **DORMANT** sections : `imhotep-crew-program-dormant`, `anubis-comms-dormant` (sortie partielle pré-réserve documentée par ADRs 0017/0018)

**Source unique de vérité** : `SECTION_REGISTRY` dans `src/server/services/strategy-presentation/types.ts` (B1) avec champs canoniques :
- `tier: SectionTier` (CORE / BIG4_BASELINE / DISTINCTIVE / DORMANT)
- `brandAssetKind: BrandAssetKind` (typé strict via `src/domain/brand-asset-kinds.ts`)
- `sequenceKey?: string` (séquence Artemis qui produit la section, validée runtime)
- `isBaseline?`, `isDistinctive?`, `isDormant?` (flags affichage UI)

**Mapping section ↔ séquence ↔ BrandAsset.kind exhaustif** : chaque section Phase 13 nouvelle est produite par une séquence Phase 13 dédiée (B3) + writeback promotion BrandAsset (B4) + composant UI primitives DS Phase 11 (B5).

**Flag `_oracleEnrichmentMode: true`** (B3) : passé à `executeSequence(key, strategyId, { _oracleEnrichmentMode: true })` durant `enrichAllSectionsNeteru()`. Le sequence-executor lit ce flag et **court-circuite `chainGloryToPtah`** — les forges Ptah des tools `forgeOutput` (creative-evaluation-matrix, bcg-portfolio-plotter, mckinsey-3-horizons-mapper) ne se déclenchent PAS automatiquement. Elles restent disponibles via les boutons "Forge now" B8.

## Conséquences

### Positives

- **Anti-drift** : ajouter une 36e section = 1 entry registry + 1 mapper + 1 spec enrichment + 1 component (vs ~6 fichiers éparpillés pré-Phase 13)
- **Test bloquant** : `tests/unit/governance/oracle-registry-completeness.test.ts` (14 tests) verrouille count 35, partition tiers, unicité ids, séquentialité numbers, validité brandAssetKind, flags cohérents
- **Cap 7 BRAINS preserved** : les 2 sections dormantes utilisent des handlers stubs Oracle-only (B9 + ADRs 0017/0018) sans modifier BRAINS const ; Imhotep/Anubis restent pré-réservés
- **Cascade Glory→Brief→Forge hash-chain f9cd9de préservée** hors enrichissement Oracle

### Négatives

- Counts hardcodés mis à jour (21 → 35) dans messages/finalScore/finalComplete — risque de désynchronisation si nouveaux call sites
- `_oracleEnrichmentMode` est un flag ad-hoc dans `SequenceContext` — alternatives possibles : déclarer via `SequenceExecutionOptions` strict-typed (refactor possible post-merge)
- DEVOTION-LADDER reste un placeholder (séquence avec steps PLANNED — `superfan-journey-mapper` + `engagement-rituals-designer` à créer post-merge)

## Alternatives considérées

- **A1. Extension à 50 sections** (rejeté) : trop de friction pour la valeur consulting, dilue le focus distinctif
- **A2. Garder 21 + créer `OracleSecondary` séparé** (rejeté) : double registry = drift narratif majeur
- **A3. Auto-trigger Ptah pendant enrichOracle** (rejeté par contrainte user) : dépense propellant inutile si user ne veut pas matérialiser, risque flame-out budget Thot
- **A4. Modifier le type `SequenceContext` strict** (différé post-merge) : nécessite une refactor plus profonde du sequence-executor + tous les callers

## Liens

- [REFONTE-PLAN.md](../REFONTE-PLAN.md) — entry Phase 13 sprint
- [PANTHEON.md](../PANTHEON.md) — 5 actifs + 2 pré-réservés
- [LEXICON.md](../LEXICON.md) — Oracle 35-section vocab canonique
- [APOGEE.md](../APOGEE.md) §4.1-4.2 — Propulsion + Guidance sub-systems
- [ADR-0009](0009-neter-ptah-forge.md) — Ptah Forge phase
- [ADR-0010](0010-neter-imhotep-crew.md) — Imhotep pré-réservé
- [ADR-0011](0011-neter-anubis-comms.md) — Anubis pré-réservé
- [ADR-0012](0012-brand-vault-superassets.md) — BrandVault unifié
- [ADR-0015](0015-brand-asset-kind-extension.md) — Extension enum BrandAsset.kind
- [ADR-0016](0016-oracle-pdf-auto-snapshot.md) — PDF auto-snapshot pre-export
- [ADR-0017](0017-imhotep-partial-pre-reserve-oracle-only.md) — Imhotep sortie partielle
- [ADR-0018](0018-anubis-partial-pre-reserve-oracle-only.md) — Anubis sortie partielle
