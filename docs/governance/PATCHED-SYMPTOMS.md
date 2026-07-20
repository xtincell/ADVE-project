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
| 2026-07-20 | `countryCodeGuess` ne mappait que l'ISO-2 : « Côte d'Ivoire » → null → locale presse retombée `gl=CM`, aucun TLD `.ci` probé, démonymes entity-gate absents. Référentiel statique nom→ISO-2 ajouté (FR/EN, pays COUNTRY_TLD). | `fix(seshat+intake)` v6.27.225 | Le pays intake est du texte libre mais tous les consommateurs supposaient un ISO-2 — jamais testé avec un nom de pays réel avant le test BK Abidjan. | — (clos) |
| 2026-07-20 | `fetchRssText` (rss.ts) et `fetchPublic` (web-footprint) à tentative UNIQUE : sur FAI à résolveurs round-robin dont certaines IP Google sont mortes (connect ETIMEDOUT ~300 ms, ou SYN pendu), la collecte rendait NULL/unreachable en silence. Retries bornés (5×/3×, timeout par tentative 3,5 s, backoff progressif 400·n). | `fix(seshat+intake)` v6.27.225 | Fetchs réseau écrits pour un datacenter sain ; jamais éprouvés sur réseau dégradé (contexte africain = le marché cible). Classe de bug : tout `fetch` single-shot du repo sans retry réseau. | — (clos pour rss/web-footprint ; autres collecteurs si symptôme réapparaît) |
| 2026-07-19 | Accents restaurés **en passant** au-delà du mandat F5 strict (`question-bank.ts`) : dict fr `intake-result.ts` (~98 chaînes + « La Fusée » ×16 fr/en/zh), page publique `/score` (11 chaînes TIERS/PILLARS), labels `business-context.ts` (6). Remplacements exacts assertés (script python, `assert old in s`), zéro regex aveugle. | `fix(intake+seshat)` v6.27.223 | Contenu FR historique saisi en ASCII sans accents ; les sweeps précédents (v6.27.219-220) ont procédé par surface, pas par inventaire global — chaque passe en découvre une autre. Le fond = pas de verrou structurel anti-sans-accents. | § « Accents hors funnel — surfaces cockpit/console restantes » |
| 2026-07-19 | `intake/[token]/ingest*` — l'écran de traitement s'affichait sur `mutation.isSuccess` : au retour de l'écran de décision (« Revenir à mes sources »), un « Terminé 100 % » fantôme s'affichait au lieu du formulaire. Condition ré-ancrée sur l'état de suivi réel (`watching \|\| isPending`). | `fix(intake+seshat)` v6.27.223 | État UI dérivé du cycle de vie de la MUTATION au lieu de l'état métier de la row — classe de bug fermée par le hook de suivi F1 (source de vérité = statut en base). | — (clos avec F1) |

---

## Causes racines diagnostiquées (purges)

**Cause racine « `processIngest` synchrone dépasse le timeout proxy » — FERMÉE 2026-07-19** par le root
fix F1 (ingestion asynchrone, v6.27.223, RESIDUAL-DEBT § intake clos, `npm run verify:intake-async`).
Lignes dérivées purgées :

| Date | Symptôme patché (où / quoi) | Résolution |
|---|---|---|
| ~~2026-07-18~~ | ~~`src/app/api/trpc/[trpc]/route.ts` — `maxDuration = 300` (inerte sous Coolify, contrat Vercel-only)~~ | Root fix F1 v6.27.223 — plus aucune requête longue à plafonner ; `maxDuration` reste inoffensif. |
| ~~2026-07-18~~ | ~~`intake/[token]/ingest*` — sondage de récupération ~45 s après coupure réseau (mitigation de surface)~~ | Root fix F1 v6.27.223 — remplacé par le suivi de statut `use-intake-processing-watch` (terminal réel, jamais de faux succès, couvre aussi la coupure réseau via row restée `IN_PROGRESS` → « timeout »). |
