---
name: LLM Gateway + GLORY execution types
description: LLM Gateway central (v2). Commandant = lead décisionnel du swarm, pas gate technique. GLORY tools = CALC/COMPOSE/MESTOR_ASSIST avec outputSchemas stricts. Séquences = zéro LLM dans la composition.
type: feedback
---

## Architecture LLM v2 (2026-04)

**LLM Gateway central** remplace la règle "seul Commandant appelle le LLM" (qui était violée par 3+ services).
- Gateway = service technique (retry, cost tracking, model selection, caller tagging)
- Commandant = lead DÉCISIONNEL du swarm Mestor, pas gate technique
- Tous les services passent par le Gateway pour les appels LLM

## Routage texte courant — choix opérateur Luna (2026-10-15)

L’autorisation humaine de basculer sur `gpt-5.6-luna` remplace l’ancienne interdiction de texte OpenAI. Le transport OAuth passe par un **relais privé**, avec un accès distinct de la clé API OpenAI réservée aux embeddings ; cette clé API n’autorise pas le texte par elle-même.

Dans le code courant 51019356, relais configuré et `LLM_PRIMARY_PROVIDER=openai` donnent un candidat texte unique : `openai` si son circuit est disponible, sinon aucun candidat. Ce raccord ne bascule pas vers OpenRouter, un autre modèle ou des crédits API. Les autres branches historiques du Gateway ne décrivent pas le routage effectivement choisi.

Budgets, Headroom, rate-policy, validation structurée et ledger restent dans le gestionnaire existant. `buildTextProviderCandidates` et `resolveTextProviderOrder` définissent le routage ; les lignes legacy de `ModelPolicy` ne prouvent pas le fournisseur/modèle effectivement servi. Le ledger qualifie le transport d’abonnement `openai-codex-oauth` et son estimation API équivalente ; celle-ci reste distincte d’une facture, du quota d’abonnement et d’une capacité de charge reçue. Cette correction documentaire ne reçoit ni nouvelle CI, image, livraison, qualité ou SLO. [Bornage C7](../REFONTE-PLAN.md).

## Historique — décisions de juin/juillet 2026

Les décisions ci-dessous sont conservées comme historique ; elles ne sont plus la politique du raccord texte Luna autorisé. Leurs affirmations économiques ne constituent pas des coûts, factures ou quotas actuels reçus.

> **Ollama Cloud est le provider PRIMAIRE** (modèle piloté par `OLLAMA_MODEL`),
> **OpenRouter le repli**, **Anthropic le dernier recours**. Le chemin nominal ne
> consomme aucun crédit payant — c'est le cœur de « la Fusée non-dépendante du LLM ».
>
> - `LLM_PREMIUM_MODE=1` → inverse : Anthropic promu en tête (une fois les crédits chargés).
> - `LLM_PRIMARY_PROVIDER` → gagne sur les deux (l'opérateur tranche).
> - **OpenAI est HORS des candidats texte** (directive opérateur 2026-06-24) : il est
>   réservé aux **embeddings**. On ne génère jamais de texte avec GPT.
>
> Ordre résolu par `resolveTextProviderOrder` + `buildTextProviderCandidates`
> (`src/server/services/llm-gateway/index.ts`) — les deux seules fonctions qui
> décident. Gardées par `tests/unit/governance/llm-routing.test.ts`.
>
> > ⚠️ Formulation périmée à ne plus reprendre : « cascade Anthropic→OpenAI→Ollama→OpenRouter ».
> > Elle décrivait l'état de PR #258 (juin 2026) et fut corrigée le 2026-07-16 ; elle a
> > survécu dans plusieurs index de docs jusqu'au 2026-07-27, où elle a induit une
> > session en erreur (elle place le provider payant en tête et fait croire que GPT
> > génère du texte).

## GLORY Tools — Exécution déterministe

**Chaque outil GLORY a :**
- Un `outputSchema` Zod strict (variables nommées, pas du JSON libre)
- Un `executionType`: CALC | COMPOSE | MESTOR_ASSIST

**Types d'exécution :**
- GLORY CALC = formules mathématiques (zéro LLM)
- GLORY COMPOSE = assemblage de variables depuis des templates (zéro LLM)
- GLORY MESTOR_ASSIST = Commandant décide le contenu via LLM Gateway, l'outil le structure

## Séquences — Composition sans LLM

**Chaque séquence a :**
- Un `variableMap` qui dit quelle output variable de quel outil compose quelle section du livrable
- Zéro appel LLM dans la composition elle-même
- Steps hétérogènes : GLORY | ARTEMIS | SESHAT | MESTOR | PILLAR | CALC

**Why:** Alexandre a défini : "le LLM ne sert qu'aux décisions importantes, pas aux calculs/compositions." La v2 centralise le technique (Gateway) tout en préservant ce principe : les outils GLORY restent déterministes, seul MESTOR_ASSIST délègue au jugement.

**How to apply:** Ne jamais ajouter d'appel LLM direct dans un outil GLORY ou une séquence. Les tools CALC/COMPOSE sont purs. MESTOR_ASSIST passe par Commandant → LLM Gateway. Les frameworks Artemis passent directement par le LLM Gateway (ils sont analytiques, pas décisionnels).
