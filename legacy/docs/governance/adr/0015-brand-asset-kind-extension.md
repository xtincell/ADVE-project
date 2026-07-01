# ADR-0015 — BrandAsset.kind enum extension Big4 + distinctifs Oracle

**Date** : 2026-05-01
**Statut** : Accepted
**Phase** : 13 (sprint Oracle 35-section)

## Contexte

Le model Prisma `BrandAsset` (Phase 10 ADR-0012) utilise un champ `kind: String @default("GENERIC")` documenté via commentaire avec ~50 valeurs canoniques (BIG_IDEA, CREATIVE_BRIEF, MANIFESTO, KV_VISUAL, etc.). Le sprint Phase 13 (ADR-0014) introduit 14 nouvelles sections Oracle, dont 7 baseline Big4 et 3 distinctifs qui nécessitent des nouveaux `kind` pour la promotion BrandVault post-séquence (B4 writeback).

## Décision

**Étendre le set de `BrandAsset.kind` valides avec 10 nouvelles valeurs Phase 13** :

| Kind | Tier Phase 13 | Justification |
|---|---|---|
| `MCK_7S` | BIG4 | McKinsey 7S framework output |
| `BCG_PORTFOLIO` | BIG4 | BCG Growth-Share Matrix |
| `BAIN_NPS` | BIG4 | Bain Net Promoter System |
| `MCK_3H` | BIG4 | McKinsey Three Horizons |
| `BCG_STRATEGY_PALETTE` | BIG4 | BCG Strategy Palette 5 environments |
| `DELOITTE_GREENHOUSE` | BIG4 | Deloitte Greenhouse talent program |
| `DELOITTE_BUDGET` | BIG4 | Deloitte FinOps budget framework |
| `CULT_INDEX` | DISTINCTIVE | Score composite masse culturelle (cult-index-engine SESHAT) |
| `MANIPULATION_MATRIX` | DISTINCTIVE | 4 modes peddler/dealer/facilitator/entertainer |
| `OVERTON_WINDOW` | DISTINCTIVE | Mapping fenêtre Overton sectorielle |

**Source de vérité TS** : `src/domain/brand-asset-kinds.ts` (Layer 0 domain) :
- `BRAND_ASSET_KINDS` const readonly array (~60 valeurs : 50 Phase 10 + 10 Phase 13)
- `BrandAssetKind` type union `(typeof BRAND_ASSET_KINDS)[number]`
- `BrandAssetKindSchema` Zod enum
- `isBrandAssetKind(value)` validateur runtime
- `PHASE_13_BRAND_ASSET_KINDS` helper pour audit

## Conséquences

### Positives

- **Extension non-cassante** : `BrandAsset.kind` reste `String @default("GENERIC")` côté Prisma, donc pas de migration SQL ALTER ENUM. Le commentaire du schema est mis à jour pour documenter les nouvelles valeurs.
- **Type strict côté TS** : `SectionMeta.brandAssetKind` est typé `BrandAssetKind | undefined` (B1), validé par le test `oracle-registry-completeness.test.ts`.
- **Source unique** : aucune duplication dans le code (anti-drift NEFER).

### Négatives

- Pas de validation côté DB : un INSERT qui mettrait un kind hors enum passerait (puisque c'est `String`). Mitigation : la validation runtime via `isBrandAssetKind` est appliquée dans le writeback B4 et tests anti-drift.
- 5 distinctives Oracle réutilisent des kinds existants au lieu de nouveaux (TREND_RADAR pour Tarsis, SUPERFAN_JOURNEY pour Devotion Ladder) — décision pragmatique pour éviter la prolifération mais peut générer ambiguïté à terme.

## Alternatives considérées

- **A1. Migrer kind vers Prisma `enum`** (rejeté) : cassant, nécessite migration ALTER + mise à jour de toutes les seeds + risque downtime. À considérer en Phase 14+ si le set se stabilise.
- **A2. Sous-typer `kind` via `subKind`** (rejeté) : double champs = drift potentiel. La sémantique "Big4 baseline" est portée par `SectionMeta.tier`, pas par `BrandAsset`.

## Liens

- [ADR-0012](0012-brand-vault-superassets.md) — BrandVault unifié Phase 10
- [ADR-0014](0014-oracle-35-framework-canonical.md) — Oracle 35-section canonical
- `src/domain/brand-asset-kinds.ts` — source TS
- `prisma/schema.prisma:880` — commentaire BrandAsset.kind documenté
- `tests/unit/governance/oracle-registry-completeness.test.ts` — anti-drift
