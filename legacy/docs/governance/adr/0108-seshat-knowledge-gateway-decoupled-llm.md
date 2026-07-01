# ADR-0108 — Seshat Knowledge Gateway : connaissance gouvernée, étage LLM découplé et skippable

**Status** : Accepted
**Date** : 2026-06-28
**Phase** : 24 — câblage du cycle de vie (frontière de connaissance)
**Depends on** : ADR-0067 (sortie LLM gardée), ADR-0083 (Argos/Hunter sous Seshat), ADR-0100 (Argos Hunter port), ADR-0037 PR-L (knowledge access typé)
**Enforced by** : `tests/unit/services/seshat-knowledge-gateway.test.ts`

## Contexte

Directive opérateur (2026-06-28) :

> « Les mécaniques impliquant la recherche internet sont conçues pour être
> gouvernées par Seshat qui gouverne la connaissance. L'information est d'abord
> stockée chez Seshat afin que les autres restent mécaniques et indépendants de
> la recherche internet. Si un Glory tool a besoin d'une info, il interroge
> Seshat — de manière mécanique ET intelligente (base de données + LLM). Si le
> LLM est indisponible, les données LLM sont ignorées et le système continue avec
> la base de données. Cette mécanique doit être découplée pour que le step LLM
> puisse être skip — et ça de manière fondamentale dans toute La Fusée. »

Deux trous concrets motivaient cette doctrine :

1. **Corpus Hunter write-only** — `CampaignReferenceDossier` (campagnes réelles
   récoltées par Hunter/Argos, ADR-0083/0100) était récolté puis enfermé dans un
   chemin mort : **jamais lu** par un Glory tool d'idéation. Les tools croisaient
   l'ADVE seul, sans matière de référence réelle.
2. **`benchmark-reference-finder` menteur** — le tool se DÉCLARAIT « interroge le
   Knowledge Graph Seshat » mais, faute de composer, retombait sur un appel LLM
   avec un template — il ne lisait **jamais** le corpus. Drift COMPOSE/déclaratif.

## Décision

### 1. Knowledge Gateway — primitive de découplage canonique

`src/server/services/seshat/knowledge-gateway/queryKnowledge` encode l'invariant
fondamental **« DB d'abord, LLM ensuite et skippable »** :

- `retrieve()` (DB) est **obligatoire et déterministe** — la matière revient
  toujours, qu'un LLM réponde ou pas. Socle mécanique. Zéro internet, zéro LLM.
- `enrich()` (LLM) est **optionnel et découplé** — tenté seulement si (a) un
  consommateur le fournit, (b) il n'est pas explicitement skippé (`skipLlm`), et
  (c) un provider texte est **réellement disponible** (`isTextLLMAvailable`).
  S'il échoue, il est **ignoré** — `facts` reste servi.
- Résultat discriminé honnête : `llmStep ∈ {APPLIED, SKIPPED_NO_ENRICHER,
  SKIPPED_BY_CALLER, SKIPPED_UNAVAILABLE, FAILED}` + `source ∈ {DB, DB+LLM}`.

Le LLM ne peut **jamais** faire échouer une requête de connaissance — au pire il
est absent. C'est le « step LLM skippable de manière fondamentale » demandé.

### 2. Signal de disponibilité réel — `isTextLLMAvailable()`

Exporté du LLM Gateway. `true` ssi au moins un provider **texte** (anthropic /
ollama / openrouter — OpenAI exclu, réservé aux embeddings) est sain (clé
présente + circuit fermé). C'est le seul point où le reste de La Fusée décide de
**sauter** l'étage LLM proprement, sans partir à l'aveugle et se prendre une
exception.

### 3. Corpus Hunter branché dans l'idéation Glory

- `GloryToolDef.usesSeshatReferences?: boolean`. Quand `true`, le moteur Glory
  (`engine.executeTool`) charge les références réelles pertinentes
  (`buildReferenceContextText` → `queryKnowledge` → `retrieveReferenceDossiers`,
  verdict PASS, secteur/marché de la marque) et les injecte **neutralisées**
  (`wrapUntrusted`, OWASP LLM01) dans le system prompt — matière d'inspiration
  ancrée, pas l'ADVE seul.
- Annotés : `concept-generator`, `campaign-architecture-planner`,
  `ideation-workshop-facilitator`, `adops-cross-pollinate-concepts`.

### 4. `benchmark-reference-finder` → composer déterministe Seshat

Le tool devient un **composer async** (`ASYNC_GLORY_COMPOSERS`) qui lit le corpus
réel via `retrieveReferenceDossiers` et **compose** son rapport de benchmark —
**0 LLM, 0 internet**, DB pure, reproductible. Corpus vide → lacune honnête
(`_gap`), jamais de référence inventée. Le drift « se déclare Seshat mais appelle
le LLM » est clos.

### 5. Point d'accès internet canonique — Brave sous Seshat

Le modèle texte courant (owl-alpha / Claude via OpenRouter) n'a **pas** de
recherche web native. Directive : « tout process impliquant internet doit être
câblé sur Brave si le modèle ne supporte pas la recherche internet ».

- `src/server/services/seshat/web-search/braveWebSearch` est le **seul** endroit
  qui parle à Brave. Sans `BRAVE_API_KEY` → `DEFERRED_NO_KEY` (jamais de hard-fail,
  jamais de résultat inventé) ; erreur réseau → `ERROR` ; filtrage SSRF optionnel
  (`isUrlAllowed`).
- **De-dup** : le code Brave inline dupliqué (`mestor/rtis-cascade`,
  `quick-intake`) est supprimé au profit du client canonique (NEFER interdit n°1).
- **Hunter ancré sur le réel (closure A)** : `argos/harvestReference` récolte
  d'abord des résultats Brave réels, les injecte comme grounding **neutralisé**
  (OWASP LLM01) et en tire de **vraies URLs** pour `sources` au lieu de les laisser
  halluciner. Sans clé → repli rappel-LLM honnête.

C'est la même doctrine que le Gateway : **internet d'abord récolté/stocké par
Seshat, le LLM ensuite et découplé**. Les feeds déterministes (RSS, World Bank)
restent des sources directes gouvernées par Seshat — ce ne sont pas des
« recherches » substituables par le modèle.

## Conséquences

- **Seshat est le point d'interrogation unique** de la connaissance : aucun
  consommateur ne court-circuite Seshat pour aller chercher du LLM/internet « à
  côté ». Il interroge Seshat, qui décide mécaniquement quoi servir.
- **Découplage fondamental** : toute future mécanique connaissance-dépendante
  passe par `queryKnowledge` et hérite gratuitement du skip LLM.
- **Pattern réutilisable** pour les étages `enrich` à venir (synthèse/ranking
  LLM par-dessus la DB) sans jamais mettre le LLM sur le chemin critique.
- Cap APOGEE 7/7 préservé — Seshat existant, aucun nouveau Neter.

## Alternatives rejetées

- **Laisser chaque tool appeler le LLM/internet directement** : viole la
  gouvernance de connaissance, rend le système dépendant du LLM, et duplique la
  logique de fallback partout.
- **Faire de `enrich` un paramètre obligatoire** : forcerait un double appel LLM
  (synthèse Seshat + tool consommateur) coûteux et inutile pour l'idéation, où le
  LLM du tool fait déjà le croisement. `enrich` reste opt-in.
