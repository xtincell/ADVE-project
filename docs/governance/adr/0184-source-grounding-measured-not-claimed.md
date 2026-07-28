# ADR-0184 — L'ancrage documentaire se mesure, il ne se revendique pas

- **Statut** : Accepted
- **Date** : 2026-07-28
- **Portée** : Notoria (génération de recommandations) · Conseil de marque (ADR-0180) · index documentaire Seshat
- **Gouverneur** : MESTOR (les recos), SESHAT (l'index) — **aucun nouveau Neter, cap APOGEE 7/7 préservé**
- **Zéro LLM ajouté** : la mesure d'ancrage est déterministe et pure.

## Contexte

Diagnostic opérateur, verbatim :

> *« ton travail avec la Notoria est mauvais et aucun système d'adversarial de la
> Notoria n'existe. les sources servent pourtant à ça. le système de source de
> spawt contient justement sa documentation en principe. »*

PR #653 avait fermé la première moitié du problème : le moteur ne lisait que
500 caractères par document, sur cinq documents non triés, et seulement pour une
mission sur sept. Il possédait la documentation de la marque et n'en lisait que
la page de garde.

Restaient **trois trous**, tous vérifiés dans le code avant d'écrire une ligne :

1. **Deux index du même texte.** `BRAND_SOURCE` (écrit par `indexBrandSource`,
   voie gouvernée `INDEX_BRAND_SOURCE`, branchée sur l'ingestion, lue par
   `oracle-augment` donc par le conseil et le MCP) et `SOURCE_CHUNK` (écrit par
   `vault-enrichment/source-rag.ts` pour son seul usage). Deux écrivains, deux
   pools disjoints, coût d'embedding doublé — et surtout : **un extrait récupéré
   dans l'un restait invisible de l'autre**. Le producteur et le critique ne
   lisaient pas les mêmes documents ; la vérification était structurellement
   impossible.

2. **Les quatre experts adversariaux ne voyaient aucun document.**
   `council/context.ts` appelait `getOracleBrandContextByQuery` **sans**
   `includeSources`. Sans ce drapeau, `oracle-augment` réduit le filtre à
   `[{pillarKey}, {kind:"BRANDLEVEL"}]` et exclut les chunks `BRAND_SOURCE` du
   pool. Les experts vérifiaient des piliers contre des piliers. Le coordinateur,
   lui, passait bien le drapeau : l'asymétrie était accidentelle.
   Symétriquement, `ragUsed` était calculé puis **jeté** — un avis rendu sans
   sources ne le disait à personne.

3. **La consigne d'ancrage n'était pas contrôlée.** PR #653 demande au moteur de
   citer `source:<id>` dans sa justification. Rien ne vérifiait que ce qu'il
   écrivait venait effectivement du document cité. Et `provenanceFromAuthorSystem`
   mappant `MESTOR → INFERRED`, **une reco littéralement tirée d'un document
   était tamponnée « inféré »** — d'où des champs fondateurs présentés comme
   devinés alors qu'ils étaient documentés.

## Décision

### 1. Un index, une récupération

`ensureSourcesIndexed` **délègue** à `indexBrandSource`. Plus rien n'écrit de
nœud `SOURCE_CHUNK` ; le kind reste lu en récupération pour ne pas rendre muets
les nœuds déjà en base (aucune migration de données). `indexBrandSource` devient
**idempotent par contenu** (`alreadyFresh`) : s'assurer qu'une source est indexée
ne repaie plus l'embedding complet — c'est ce coût qui avait justifié le second
index.

`RankedNode` porte désormais `sourceId`. Sans cette ancre, un extrait récupéré
n'est rattachable à aucun document : pas de citation, donc pas de vérification.

Notoria récupère par le RAG partagé ; la sélection déterministe par recouvrement
de termes devient une **voie de repli explicitement annoncée** (`retrieval:
"SEMANTIC" | "DETERMINISTIC" | "NONE"`, mentionnée dans le bloc de prompt), pas
un chemin nominal déguisé.

### 2. Le conseil voit ce que le moteur a vu

`buildExpertContext` passe `includeSources: true` et retourne `sourcesSeen`. Un
expert sans documentation reçoit la consigne explicite de **dire** que sa critique
porte sur la cohérence interne et non sur la conformité aux sources. `ragUsed`
descend dans le prompt du coordinateur et remonte dans `deliberate().grounding`,
jusqu'à la surface fondateur.

### 3. L'ancrage est mesuré, la citation est vérifiée

`notoria/grounding.ts` — fonction **pure**, zéro I/O, zéro LLM, sur le tokeniseur
déjà utilisé par la gate de cohérence brief↔ADVE (`tokenizeForCoherence`, ADR-0103).
On réutilise le cœur existant plutôt que d'en écrire un second.

Deux mesures distinctes, et c'est tout l'intérêt :

| Mesure | Ce qu'elle dit |
|---|---|
| `groundedSourceIds` | Documents dont le vocabulaire **soutient réellement** la proposition |
| `citedSourceIds` | Documents que la justification **revendique** |
| `unverifiedCitations` | Revendiqués **sans** appui mesuré — signal de fabrication |

Le recouvrement est calculé sur la **valeur proposée**, pas sur la justification :
une justification bien tournée ne doit pas pouvoir faire passer une proposition
sortie de nulle part.

Bandes : `GROUNDED ≥ 0.35` · `WEAK ≥ 0.15` · `UNGROUNDED` · `NO_SOURCE` (aucune
documentation soumise — ce n'est pas un échec d'ancrage, c'est « rien à quoi
s'ancrer », et une citation dans ce cas est nécessairement fabriquée).

Une citation non vérifiée force `applyPolicy = "requires_review"`.

### 4. La provenance suit la mesure, pas la revendication

À l'application, les champs dont la reco est `GROUNDED` **et** pointe au moins un
document sont écrits avec `fieldProvenance: "SOURCE"` ; tout le reste garde
`INFERRED`. Le mécanisme existait (`options.fieldProvenance`, ADR-0032) et n'avait
jamais eu d'entrée « document ».

Conséquence assumée : un champ `SOURCE` peut corriger un `INFERRED` et
**challenge** un `HUMAN` (arbitrage humain, jamais d'écriture silencieuse). C'est
exactement pourquoi la promotion est réservée à l'ancrage **mesuré**.

## Conséquences

- Des recos vont s'afficher « Hors de vos documents ». **C'est le but.** Une
  complétude qui se croyait documentée valait moins qu'un plafond expliqué.
- Le fondateur voit sur chaque reco d'où elle vient, et sur l'analyse du conseil
  si elle a été confrontée à ses documents.
- 5 champs additifs nullable sur `Recommendation` (migration backfill-safe) :
  une reco antérieure porte `null`, ce qui se lit **« non mesuré »** et jamais
  « non ancré ».
- Les recos typées déterministes (ADR-0088) restent non mesurées : elles dérivent
  de l'ADVE, pas de documents. `null` est ici la vérité.

## Ce que cette ADR ne fait PAS

- **Aucun blocage.** L'ancrage informe, il ne refuse pas (doctrine ADR-0085 : STOP
  à Jehuty, l'opérateur tranche). Passer en BLOCK demande une période
  d'observation, comme la gate C6 (ADR-0103).
- **Pas de cascade sur le brand book** (rang 2 d'ancrage) : le Brand Book La Fusée
  composé depuis sources + ADVE reste à bâtir — tracé RESIDUAL-DEBT.
- **Minutes de délibération non persistées** — déféré ADR-0180, toujours ouvert.

## Vérification

- `tests/unit/services/notoria-grounding.test.ts` (13) — dont le cas pivot : une
  proposition inventée reste `UNGROUNDED` **malgré** une citation, et la citation
  ressort en `unverifiedCitations`.
- `tests/unit/governance/brand-source-single-index.test.ts` (12) — index unique,
  ancre de citation, dégradation annoncée, non-régression de PR #653.

## Réparé en passant (interdit NEFER n°4)

`brief-adve-coherence-score.ts` écrivait sa plage de marques combinantes
**en clair** dans une regex. Écrites littéralement, ces marques sont invisibles à
la relecture et une passe d'outil peut les avaler sans bruit. Passées en forme
échappée — comportement identique, fragilité en moins.
