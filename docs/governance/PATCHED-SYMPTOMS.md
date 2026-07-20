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
| 2026-07-20 | **Fuite cross-tenant gazette Jehuty** : `jehuty.feed` tirait TOUS les `DIAGNOSTIC_RESULT` sans filtre et estampillait les entrées sans `data.strategyId` (événements funnel avec PII prospect) avec l'id de l'APPELANT → chaque founder voyait les intakes des autres marques (« Diagnostic NETERU » ×7 chez Motion19). + aucune garde d'ownership sur le strategyId passé. Règle pure `diagnosticBelongsToFeed` + gardes ownership/opérateur. | `fix(jehuty)` v6.27.230 | Deux classes : (1) fallback « faute de mieux » sur l'identité de l'appelant = anti-pattern d'attribution ; (2) `protectedProcedure` + id libre sans garde d'ownership — même classe que le trou calendrier fermé par ADR-0129. Auditer les autres routers `protectedProcedure` à strategyId libre. | § à ouvrir si l'audit des routers révèle d'autres cas |
| 2026-07-20 | Incohérence de palier sur la page résultat intake (header « FRAGILE » vs synthèse « ressort au niveau LATENT » — signalée par l'opérateur sur le rapport « Top », reproduite sur les 5 marques du test qualité) : le narratif était généré avec la classification threshold-based, écrasée APRÈS coup par `brandLevel`. Await du brandLevel déplacé AVANT la génération du narratif (complete() + regenerateAnalysis). | `fix(intake)` v6.27.228 | Optimisation de parallélisme 2026-05-11 annotée « pas de changement de comportement vs séquentiel » — faux : l'ordre d'écrasement était porteur de sens. Classe : deux sources de vérité du même champ vivantes en même temps dans un pipeline. | — (clos) |
| 2026-07-20 | Domaine parqué adopté comme site officiel (`dovv.com` « This Domain May Be For Sale » → site 75/100, YouTube poubelle scrapé du parking, email 0/100 sur domaine squatté) : une page de parking mentionne toujours le slug → la garde de mention est structurellement aveugle. `looksLikeParkedDomain` déterministe dans la découverte. | `fix(intake)` v6.27.228 | La validation « la page mentionne la marque » teste la MENTION, pas la PROPRIÉTÉ. Classe : tout contenu qui cite mécaniquement le nom cherché (parking, SERP, annuaires) passe une garde de mention. | — (clos pour la découverte ; annuaires/SERP si symptôme réapparaît) |
| 2026-07-20 | Taxonomie secteur aveugle aux pluriels/dérivés (« Télécommunications » ↛ `telecom`, « Boissons » ↛ `boisson` → AUTRE) + CODE canon rendu brut au client (« pour Orange dans AUTRE »). Match par préfixe (keywords ≥ 5) + `sectorDisplayLabel()`. | `fix(intake)` v6.27.228 | Match mot-entier strict pensé contre les faux positifs (art⊂carte) sans corpus de test en français réel ; et aucune frontière code interne / libellé client sur ce champ. | — (clos) |
| 2026-07-20 | Verrou `forecast-engine` single-writer cassé en local macOS : grep BSD émet `src//server/…` (double slash) → assertion d'égalité stricte rouge sur arbre propre. Normalisation `//`→`/` dans le test. | `fix(intake)` v6.27.228 | Test d'égalité de chemins sur une sortie d'outil shell non normalisée — classe : verrous grep-based sensibles à la plateforme. | — (clos) |
| 2026-07-20 | Apify Maps en `run-sync-get-dataset-items` : la connexion long-poll (30-75 s de run actor) était tuée par les intermédiaires coupant à ~60 s (NAT FAI, proxys/edge prod) → maps ERROR chronique. Converti en pattern async 2 temps (start tôt / poll court / collect tard) + abort best-effort. | `fix(seshat+intake)` v6.27.227 | Tout long-poll > 60 s est structurellement fragile derrière NAT/proxy — pattern à proscrire pour les actors Apify (le follower-fetch `social-audit` n'utilise pas run-sync, non concerné). | — (clos pour maps) |
| 2026-07-20 | `detectSocialLinks` produisait un profil « discover » depuis `tiktok.com/discover/...` (chemin réservé de plateforme parsé comme handle) → Apify aurait scrapé un non-profil. Stoplist élargie (discover/explore/stories/live/videos/music/foryou/pages/groups/…). | `fix(seshat+intake)` v6.27.227 | La stoplist initiale (p/reel/posts/watch/hashtag/share) était partielle — construite sur les cas vus, pas sur l'inventaire des chemins réservés des 6 plateformes. | — (clos ; compléter si nouveau chemin réservé apparaît) |
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
