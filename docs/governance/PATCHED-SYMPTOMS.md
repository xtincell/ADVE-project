# PATCHED SYMPTOMS — journal heuristique des fixes en passant

> Doctrine : [NEFER.md §3.4](NEFER.md) — interdit absolu n°4 (« un problème découvert se résout, se
> patche-et-trace, ou se planifie — jamais ne s'enterre »).

Ce registre journalise les **réparations en passant** de défauts **pré-existants** (que NEFER n'a pas
introduits) croisés en cours de route. Il n'est **pas** un backlog : ce qui y figure est **déjà réparé**.

**À quoi il sert** : chaque ligne consigne un *patch de surface* + une *hypothèse de cause racine*.
Quand plusieurs lignes convergent vers la même hypothèse, c'est le signal — mesuré, pas intuité — qu'un
**diagnostic de fond** est mûr. L'accumulation est le matériau heuristique ; la relecture est le
diagnostic.

**Ce qui va ICI vs ailleurs** (arbre §3.4) :

| Situation | Registre |
|---|---|
| Défaut pré-existant **réparé en passant** (rayon borné, prouvé tsc/lint/test/repro) | **PATCHED-SYMPTOMS.md** (ici) + `fix(...)` dédié |
| Défaut pré-existant **non réparable en passant** (refactor large, env à clés, décision opérateur) | [`RESIDUAL-DEBT.md`](RESIDUAL-DEBT.md) **avec plan + déclencheur** |
| **Bloqueur externe pur** (clé/contrat/choix business non-écrit) | Escalade opérateur (jamais enterré) |

**Relecture obligatoire** : `nefer-boot` Phase 0.2.bis (début de session) et `nefer-postmerge` 9.5.bis
(après merge) relisent ce fichier + RESIDUAL-DEBT et tentent de refermer le refermable. Les deux
registres sont **transitoires** : un diagnostic de fond qui ferme une cause racine **purge le jour même**
les lignes qui en dérivaient (+ mention CHANGELOG).

**Format d'une entrée** : `Date · Symptôme patché (où/quoi) · Commit · Hypothèse cause racine · Dette liée`.

---

## Entrées actives

| Date | Symptôme patché (où / quoi) | Commit | Hypothèse cause racine | Dette liée (RESIDUAL-DEBT) |
|---|---|---|---|---|
| 2026-07-18 | `src/app/api/trpc/[trpc]/route.ts` — `export const maxDuration = 300` (mitigation timeout intake). **Inerte sur l'hôte courant** : `maxDuration` est un contrat Vercel, no-op sous Coolify (Node standalone `next start` derrière Traefik/Cloudflare). Retro-log d'une mitigation déjà shippée. | (antérieur) | Une procédure **synchrone longue** (`processIngest` : extraction LLM + narration + score en un seul appel) dépasse le timeout du proxy frontal — Cloudflare coupe à 100 s (non-Enterprise), d'où « Load failed » côté client. Le plafond de durée ne se règle pas au niveau Next sur cet hôte : la seule vraie parade est de **rendre l'ingestion asynchrone** (ack rapide + polling). | § « Intake `processIngest` synchrone → Load failed » |

---

## Causes racines diagnostiquées (purges)

*Aucune pour l'instant.* Quand une cause racine listée ci-dessus est fermée par un diagnostic de fond,
déplacer ici les lignes concernées (barrées) avec le commit/ADR de résolution + la date, et retirer la
dette correspondante de `RESIDUAL-DEBT.md`.
