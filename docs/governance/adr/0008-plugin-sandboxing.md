# ADR-0008 — Plugin sandboxing par type de side-effect

**Date** : 2026-04-29
**Statut** : accepted
**Phase de refonte** : phase/2.7

## Contexte

L'OS est conçu pour être étendu par des partenaires UPgraders sans toucher au repo core (cf. APOGEE §7 Plugin architecture). Mais un plugin tiers ne doit **pas** pouvoir :
- accéder aux tables Prisma autres que celles déclarées
- appeler le LLM Gateway hors de son budget alloué
- contacter des domaines externes non whitelisted
- émettre des Intents qu'il ne possède pas

Sans sandbox, un plugin malveillant ou bogué casse l'OS.

## Décision

Sandboxing **par type de side-effect** déclaré dans `manifest.sideEffects` :

| Side-effect | Mécanisme |
|---|---|
| `DB_WRITE` / `DB_READ` | Plugin reçoit un `db` proxy qui scope automatiquement `where: { pluginId }` + n'expose que les tables déclarées dans `manifest.tablesAccessed[]` |
| `LLM_CALL` | Plugin n'a pas accès direct au LLM Gateway. Doit passer par `pluginCtx.llm(prompt, opts)` qui mètre les tokens via le `costTier` déclaré + route via Thot |
| `EXTERNAL_API` | Plugin déclare `manifest.externalDomains[]` (whitelist explicite). Runtime intercepte `fetch` et rejette si hors whitelist. Pas de `node:net` ni `node:http` direct (lint + Node permissions API) |
| `EVENT_EMIT` | Plugin n'écrit pas dans EventBus directement. Émet via `pluginCtx.emit(eventKind, payload)` qui valide kind contre une whitelist dérivée de `manifest.emits[]` |

Si un side-effect non déclaré est tenté, l'opération échoue avec `PluginSandboxViolation`.

Premier plugin de démo : `@upgraders/loyalty-extension` (ajoute `COMPUTE_LOYALTY_SCORE`).

## Conséquences

**Positives** :
- Trust model formel pour les plugins externes — auditeurs ont confiance.
- Limite fait la promesse vendable du plugin marketplace.
- Le core OS ne peut pas être détruit par un plugin défaillant.

**Négatives** :
- Implémentation lourde : proxy `db` + intercept `fetch` + AsyncLocalStorage pour le contexte plugin.
- Première implémentation concentrée sur DB_WRITE (le plus risqué) ; LLM_CALL + EXTERNAL_API + EVENT_EMIT progressifs.

**Enforcement** :
- Tests d'invariant : "plugin sans `DB_WRITE` qui tente d'écrire → throw `PluginSandboxViolation`".

## Alternatives considérées

1. **Aucun sandbox** (trust complet) : exclus dès qu'on a un seul plugin tiers.
2. **Sandbox V8 isolé** (Node Worker Threads) : trop coûteux per-call, latence inacceptable.
3. **Sandbox capabilities-based via manifest seul** (pas de proxy runtime) : repose sur le code plugin pour respecter le contrat — pas un sandbox.

## Lectures

- [APOGEE.md §7](../APOGEE.md) — Plugin architecture
- [REFONTE-PLAN.md](../REFONTE-PLAN.md) Phase 2.7
