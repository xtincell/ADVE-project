# ADR-0016 — Oracle PDF auto-snapshot pre-export (idempotence SHA256)

**Date** : 2026-05-01
**Statut** : Accepted
**Phase** : 13 (sprint Oracle 35-section)

## Contexte

L'export PDF/Markdown de l'Oracle (`exportOracleAsPdf`, `exportOracleAsMarkdown`) avait un bug critique : `loadOracle()` retournait `[]` quand pas de `snapshotId` fourni (ligne 51-52 legacy). En conséquence :

1. Les PDFs en live state étaient vides
2. `takeOracleSnapshot()` (Phase 7) appelait `loadOracle(strategyId, {})` sans snapshotId → snapshots stockés étaient vides eux aussi
3. Les utilisateurs devaient explicitement passer un `snapshotId` valide pour avoir un export non-vide, mais n'avaient pas de mécanisme pour en créer un avec du content

## Décision

**Auto-snapshot pre-export avec idempotence SHA256** :

1. **Fix `loadOracle` live read** : appelle dynamiquement `assemblePresentation(strategyId)` (cycle d'import évité par `await import()`) et map les sections via `SECTION_REGISTRY` + `SECTION_DATA_MAP` interne. Plus de retour vide.

2. **`takeOracleSnapshot` avec idempotence SHA256** :
   - Calcule `createHash("sha256")` sur le content live (`JSON.stringify({ sections })`)
   - Query last snapshot ordonné `takenAt desc`
   - Si `_contentHash` du dernier snapshot === hash live → réutilise `snapshotId` (return `{ snapshotId, created: false, reusedFrom }`)
   - Sinon CREATE nouveau snapshot avec `_contentHash` stocké dans `snapshotJson` (future idempotence)

3. **Nouveau helper `ensureSnapshotForExport(strategyId, opts)`** :
   - Si `opts.snapshotId` déjà set → return tel quel (replay déterministe)
   - Sinon → `takeOracleSnapshot` + retourne `{ ...opts, snapshotId }`

4. **`exportOracleAsPdf` + `exportOracleAsMarkdown`** appellent `ensureSnapshotForExport` avant `loadOracle`. Header PDF affiche désormais `Snapshot ${id}` (toujours snapshot après B6).

## Conséquences

### Positives

- **Loi 1 (Conservation altitude)** : pre-export snapshot = preserve l'état exact, time-travel deterministe garanti
- **Idempotence SHA256** : 2 exports successifs identiques → 1 seul snapshot (pas de duplication)
- **Pas de retour vide** : les PDFs sont toujours produits avec content
- **Compat backward** : si `snapshotId` fourni explicitement, comportement legacy preservé (replay)

### Négatives

- Coût supplémentaire : 1 lecture `assemblePresentation` + 1 hash SHA256 + 1 write Prisma (sauf si idempotent) à chaque export
- `_contentHash` est stocké dans `snapshotJson` (Json field) — pas indexé, donc lookup linéaire sur le last snapshot. Acceptable car query limité à `findFirst orderBy takenAt desc` (utilise l'index existant `[strategyId, takenAt]`).

## Alternatives considérées

- **A1. Ajouter colonne `contentHash String @unique` sur OracleSnapshot** (rejeté) : nécessite migration Prisma cassante, et le hash dans `snapshotJson` suffit pour l'usage idempotence (lookup last snapshot only).
- **A2. Cache Redis snapshot live** (rejeté) : nouvelle infra inutile, le DB suffit.
- **A3. Live query parallèle au lieu de snapshot** (rejeté) : duplication de la logique de render + perte du time-travel.

## Liens

- [ADR-0014](0014-oracle-35-framework-canonical.md) — Oracle 35-section canonical
- `src/server/services/strategy-presentation/export-oracle.ts` — implémentation B6
- `prisma/schema.prisma:3191` — model OracleSnapshot (inchangé)
- `tests/unit/governance/oracle-pdf-snapshot-phase13.test.ts` — 15 tests anti-drift
