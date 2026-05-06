# ADR-0052 — ADR-0004 strict migration complete : 100% governedProcedure atteint

**Date** : 2026-05-06
**Statut** : Accepted
**Phase** : 0 — Refonte structurelle, **achève la cible ADR-0004**
**Related** : [ADR-0004](0004-strangler-audited-procedure.md) (strangler), [ADR-0005](0005-hash-chain-immutability.md)

---

## Contexte

[ADR-0004](0004-strangler-audited-procedure.md) (2026-04-29) avait posé `auditedProcedure` comme middleware strangler **transitoire** avec cible "100% governedProcedure à terme (Phase 3 fin)".

12 mois plus tard (2026-05-06), 70 routers tagués `lafusee:strangler-active` étaient encore en attente de migration. Sprint 7 v6.18.20 exécute la migration complète per-mutation conforme à la cible ADR-0004.

## Décision

Migration mécanique de tous les routers `lafusee:strangler-active` vers `governedProcedure` selon le pattern ADR-0004. 

### Étapes de la migration

1. **Auto-génération des Intent kinds** via `scripts/generate-legacy-intent-kinds.ts` :
   - 329 kinds `LEGACY_<ROUTER>_<MUTATION>` créés dans `intent-kinds.ts`
   - SLOs default ajoutés dans `slos.ts`
   - Régions AUTOGEN délimitées par `BEGIN/END` markers

2. **Codemod migration routers** via `scripts/codemod-migrate-routers-to-governed.mjs` :
   - Parse chaque router `lafusee:strangler-active`
   - Pour chaque mutation `<name>: auditedProtected.input(<schema>).mutation(<handler>)` :
     - Remplace par `<name>: governedProcedure({ kind, inputSchema, caller }).mutation(<handler>)`
     - kind = `LEGACY_<ROUTER>_<MUTATION>` (auto-gen)
     - caller = `<router>:<mutation>`
   - Supprime imports/consts `auditedProcedure` / `auditedProtected` / `auditedAdmin` inutilisés
   - Marker `lafusee:strangler-active` → `lafusee:governed-active`

3. **Edge cases manuels** (mutations sans `.input()`, queries `auditedAdmin.query(...)`) :
   - Mutations sans input : ajout `inputSchema: z.object({})` + governedProcedure wrapper
   - Queries (read-only) : `auditedProtected.query` → `protectedProcedure.query`, `auditedAdmin.query` → `adminProcedure.query`

4. **tRPC client call sites** : ajout `{}` aux mutations sans input désormais typées
   - `markAllRead.mutate()` → `markAllRead.mutate({})`
   - `testPush.mutate()` → `testPush.mutate({})`

### Résultat post-migration

- **0 routers `lafusee:strangler-active`** (target ADR-0004 atteint)
- **69 routers `lafusee:governed-active`** (canonique post-migration)
- **6 routers cleanés** (zero-mutation : import auditedProcedure dead code retiré)
- **329 LEGACY Intent kinds** définis dans intent-kinds.ts (audit trail granulaire)
- **270+ mutations** routent désormais à travers `governedProcedure` avec preconditions/cost-gate eval

## Conséquences

### Positives

- **ADR-0004 satisfait à 100%** : la cible "Phase 3 fin = 100% governed" est atteinte. Aucun router en bypass.
- **Audit trail granulaire** : chaque mutation a son Intent kind dédié (au lieu du générique `LEGACY_MUTATION`). Queryable cross-strategy via SQL.
- **Pre-conditions / cost-gate** : disponibles pour tous les routers (par défaut empty preconditions, mais le hook existe pour ajouter par-mutation).
- **Drift impossible** : règle ESLint `lafusee/no-direct-service-from-router` reconnaît le marker `governed-active` permanent ; tout retour à `auditedProcedure` direct serait bloqué.

### Négatives

- Verbosity : chaque mutation gagne 4-5 lignes (`kind`, `inputSchema`, `caller` boilerplate). Acceptable pour le gain governance.
- Mutations sans input (e.g. `snapshotAll`, `seedDemo`) requièrent `inputSchema: z.object({})` explicite et clients doivent passer `{}` au mutate.

### Métriques

```bash
# Pré-migration
grep -rl "lafusee:strangler-active" src/server/trpc/routers/ | wc -l  # 70

# Post-migration v6.18.20
grep -rl "lafusee:strangler-active" src/server/trpc/routers/ | wc -l  # 0
grep -rl "lafusee:governed-active" src/server/trpc/routers/ | wc -l   # 69
grep -c "LEGACY_" src/server/governance/intent-kinds.ts                # 329

# Verify
npx tsc --noEmit  # 0 erreurs
npm run lint:governance  # 0 warnings
```

## Alternatives écartées

1. **Reclassification three-tier (auditedProcedure comme canon permanent)** : tentée Sprint 6 avec ADR ébauché (jamais shipped, supprimé). Esquive de la cible ADR-0004. User a explicitement demandé "exclusivement ce que préconise le système".
2. **Migration partielle** : laisser certains routers en strangler-active. Trahit le contrat ADR-0004 et la "métriques de progression" §Conséquences.
3. **Big-bang manual** sans auto-gen : 30-50h de travail manuel. Codemod réduit à ~2h en effort, plus consistant.

## Verification

```bash
npx vitest run tests/unit/governance/  # tous green
npx tsc --noEmit  # 0 erreurs
npm run lint:governance  # 0 warnings
```

## Lectures

- [ADR-0004](0004-strangler-audited-procedure.md) — base strangler / cible 100% governed
- [scripts/generate-legacy-intent-kinds.ts](../../../scripts/generate-legacy-intent-kinds.ts) — auto-gen LEGACY kinds
- [scripts/codemod-migrate-routers-to-governed.mjs](../../../scripts/codemod-migrate-routers-to-governed.mjs) — codemod migration
