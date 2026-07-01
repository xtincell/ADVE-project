# ADR-0007 — Découplage `IntentEmission.status` vs `observationStatus`

**Date** : 2026-04-29
**Statut** : accepted
**Phase de refonte** : phase/3

## Contexte

Lifecycle d'un Intent : `PROPOSED → DELIBERATED → EXECUTING → OBSERVED → COMPLETED`. Question : si Seshat plante quand elle observe (étape OBSERVED), est-ce que le client UI doit voir l'Intent comme COMPLETED ou comme FAILED ?

Réalité métier : le client a déjà reçu le résultat d'Artemis. La défaillance Seshat ne change pas son output, juste l'observation post-hoc (knowledge graph indexing, signaux Tarsis). Le bloquer = mauvaise UX.

## Décision

Découpler la machine d'état :

- **`IntentEmission.status`** = état de l'action côté Mestor/Artemis. Devient `COMPLETED` dès qu'Artemis renvoie un résultat.
- **`IntentEmission.observationStatus`** = état Seshat. `null | PENDING | OBSERVED | FAILED`. Async, indépendant.

Le client UI bind sur `status`, voit `COMPLETED` quand l'action est faite. Si `observationStatus="FAILED"`, un badge `<SeshatRetryBadge>` apparaît silencieusement (non-bloquant).

## Conséquences

**Positives** :
- UX Cockpit : pas d'attente pour les observations Seshat post-hoc.
- Seshat peut planter sans interrompre les workflows.
- Reprocessing Seshat possible sur les `observationStatus="FAILED"`.

**Négatives** :
- Ajout d'une colonne au schema (additive, safe).
- Logique de retry Seshat à implémenter (cron + backoff).

**Enforcement** :
- Schema Prisma : `IntentEmission.observationStatus` (nullable, default null).
- Tests d'invariant : "tuer Seshat → status reste OK, observationStatus passe FAILED".

## Alternatives considérées

1. **Status unique** : bloquant pour Seshat plantée → mauvaise UX.
2. **Two-phase commit** : trop lourd pour observations qui sont en pratique soft-fail.
3. **Retry inline jusqu'à succès** : timeout user UX inacceptable.

## Lectures

- prisma/schema.prisma (`IntentEmission.observationStatus`)
- src/server/governance/event-bus.ts (Seshat listeners)
