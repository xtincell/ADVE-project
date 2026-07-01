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
