# ADR-0002 — Layering strict en 6 couches

**Date** : 2026-04-29
**Statut** : accepted
**Phase de refonte** : phase/4

## Contexte

Avant la refonte, les fichiers s'importaient librement entre eux. Résultats :
- circular dependencies (cassées par lazy `await import(...)` ad-hoc)
- routers tRPC appelant directement des services (bypass governance Mestor)
- code domaine polluant `lib/` et inversement
- composants UI ayant accès direct à Prisma via composants serveurs mal délimités

L'audit (cf. [COMPLETION-AUDIT.md](../COMPLETION-AUDIT.md)) a confirmé 16+ violations de la règle "router → mestor.emitIntent uniquement".

## Décision

Le layering est **strictement hiérarchique en 6 couches** :

```
0  src/domain/                  — pure, zéro Prisma/tRPC/NextAuth
1  src/lib/                     — utilitaires, db client, auth helpers
2  src/server/governance/       — manifests, mestor, NSP, hash-chain
3  src/server/services/         — services métier governés
4  src/server/trpc/             — routers, governedProcedure obligatoire
5  src/components/neteru/       — Neteru UI Kit
6  src/app/, autres composants  — pages et UI génériques
```

**Règle absolue** : Layer N ne peut importer que de Layer ≤ N. Sauf `import type` cross-layer pour les contrats partagés.

## Conséquences

**Positives** :
- Cycles d'imports impossibles (madge --circular en CI doit retourner 0).
- Bypass governance détectable structurellement.
- Domaine pur testable sans bootstrap Prisma/NextAuth.
- Séparation domain/UI claire pour SDK public futur.

**Négatives** :
- Refactor de quelques imports (16 sites identifiés).
- Lazy imports existants doivent disparaître ou être whitelisted.

**Enforcement** :
- `eslint-plugin-boundaries` configure la matrice.
- `madge --circular` en CI bloque tout cycle.
- `lafusee/no-direct-service-from-router` lint custom.

## Alternatives considérées

1. **Layering 4 couches simple** (UI / API / Services / Domain) : trop grossier, ne capture pas la distinction governance / services.
2. **Pas de layering, juste lint sur cycles** : laisse passer les bypass governance.
3. **Layering 8 couches** (split lib/utils, services/external, etc.) : sur-discrimination, friction d'import.

## Lectures

- [APOGEE.md §4](../APOGEE.md) — sous-systèmes et leur correspondance avec les couches
- [FRAMEWORK.md](../FRAMEWORK.md) — pilier 1 du framework
