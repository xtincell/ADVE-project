# ADR-0006 — Pillar 6 : Cost gate (Thot active)

**Date** : 2026-04-29
**Statut** : accepted
**Phase de refonte** : phase/3

## Contexte

Thot était passif jusqu'ici : `costEstimateUsd` lu par LLM Gateway pour le routing, mais aucune décision active. Conséquence : un operator avec budget épuisé pouvait quand même déclencher des Intents coûteux qui flame-out la mission.

## Décision

Nouveau pilier APOGEE 6 : **Cost gate**. Module `src/server/governance/cost-gate.ts` :
- `evaluateCostGate(intent, manifest, ctx) → { decision, reason, ... }`
- Décision : **ALLOW** (capacité OK), **DOWNGRADE** (margin tight, propose qualityTier inférieur), **VETO** (capacité exhausted).
- Persisté dans `CostDecision` Prisma table — audit trail séparé d'IntentEmission pour queryability indépendante.

`governedProcedure` appelle `evaluateCostGate` **après** pre-conditions, **avant** l'execution du handler.

## Conséquences

**Positives** :
- Thot devient un Neteru de gouvernance ACTIVE, pas passive.
- Pas de flame-out silencieux. Operators voient leurs vetos/downgrades.
- DOWNGRADE = pricing localisé sur LLM Gateway (Sonnet au lieu d'Opus), pas une coupure brutale.

**Négatives** :
- Latence ajoutée : 1 query DB de plus par mutation (capacityReader). Mitigation : cache 60s.
- Implementation Pillar 6 partielle : `CapacityReader` interface définie, financial-brain doit l'implémenter.

**Enforcement** :
- Test invariant : "intent qui dépasse capacity → status=VETOED dans IntentEmission".
- Console admin `/console/socle/transactions` filtre `decision=VETO|DOWNGRADE`.

## Alternatives considérées

1. **Hard cutoff** : refuser tout au-delà du budget. Trop brutal — DOWNGRADE est plus humain.
2. **Pre-validation client-side** : bypass-able, on garde côté serveur.
3. **Job de nuit qui réconcilie** : trop tard, le coût est déjà brûlé.

## Lectures

- src/server/governance/cost-gate.ts
- [APOGEE.md §4.4](../APOGEE.md) — Sustainment sub-system
