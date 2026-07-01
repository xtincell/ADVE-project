# ADR-0004 — Strangler `auditedProcedure` pour migration progressive des routers

**Date** : 2026-04-29
**Statut** : accepted
**Phase de refonte** : phase/3

## Contexte

71 routers tRPC existants au moment du diagnostic. Migration big-bang vers `governedProcedure` = risque énorme de régression (tests insuffisants pour valider 71 routers en un coup). Mais laisser les routers contourner Mestor = perte d'audit trail.

## Décision

Strangler middleware **`auditedProcedure(base, routerName)`** wrappe les routers non-encore-migrés. Effet :
- Chaque mutation produit une `IntentEmission` synthétique avec `intentKind="LEGACY_MUTATION"` et `caller="strangler:<router>:<procedure>"`.
- L'audit trail est **complet à 100%** dès le jour 1, indépendamment de l'état de migration.
- Migration ensuite progressive : chaque router migre individuellement vers `governedProcedure` (avec preconditions + postconditions + cost-gate explicites).

## Conséquences

**Positives** :
- Pas de big-bang. Chaque PR migre 1-3 routers.
- 100% audit dès maintenant ; 100% governed à terme (cible Phase 3 fin).
- Métriques de progression visibles via SQL : `SELECT COUNT(*) FROM "IntentEmission" WHERE intentKind='LEGACY_MUTATION'` doit décroître chaque sprint.

**Négatives** :
- Pendant la transition, deux modes coexistent (audited vs governed).
- Pré-conditions Pillar 4 ne s'évaluent pas sur les routers strangler — uniquement audit trail.

**Enforcement** :
- `audit-governance.ts` compte les routers non-migrés et fail CI si la liste augmente entre deux PRs (drift forward).

## Alternatives considérées

1. **Migration big-bang** : risque trop élevé.
2. **Gel features pendant migration** : business non négociable.
3. **Re-écrire les routers from scratch** : perte de comportement métier accumulé.

## Lectures

- src/server/governance/governed-procedure.ts (les deux signatures)
- [ROUTER-MAP.md](../ROUTER-MAP.md) §10 — wave priority
- [REFONTE-PLAN.md](../REFONTE-PLAN.md) Phase 3
