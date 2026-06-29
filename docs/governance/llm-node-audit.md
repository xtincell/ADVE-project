# Audit sécurité des nœuds LLM

> Auto-généré par `npm run audit:llm` (`scripts/audit-llm-nodes.ts`). Ne pas éditer à la main.

Généré le 2026-06-29.

Deux contrats vérifiés par nœud : **sortie** (validation Zod stricte) et **entrée** (pas d'appel LLM direct qui court-circuite la validation et concatène l'entrée brute).

## Vue d'ensemble

| Catégorie | Total | Protégés (sortie) | Couverture | Sans garde |
|---|---|---|---|---|
| Glory tools (LLM/HYBRID) | 76 | 76 | 100% | 0 |
| Frameworks | 28 | 28 | 100% | 0 |
| Appels LLM directs (bypass wrapper) | 41 | 41 (entrée durcie) | 100% | 0 bruts |


Entrée durcie = 39 fichiers `FENCED` (neutralisation `wrapUntrusted`/`sanitizeInline`) + 2 `INTERNAL` (annotés `@llm-input-internal` — entrée 100% interne). 55 appels directs au total.

## SORTIE — nœuds sans contrat de validation

Ces nœuds appellent un LLM mais ne déclarent ni `outputSchema` ni `_noSchemaJustification` : leur sortie n'est pas validée structurellement.

_Aucun. ✅_

## ENTRÉE — appels LLM directs (hors wrapper structuré)

Ces points appellent `callLLM`/`callLLMAndParse` sans passer par `executeStructuredLLMCall`. Le risque d'injection se mesure à l'**entrée** : verdict `FENCED` (contenu non fiable neutralisé via `wrapUntrusted`/`sanitizeInline`), `INTERNAL` (entrée 100% interne, annoté `@llm-input-internal`), ou `RAW` (à durcir).

| Fichier | Lignes | Appels | Entrée | Wrapper |
|---|---|---|---|---|
| `src\server\services\artemis\index.ts` | 228 | 1 | ✅ FENCED | oui (mixte) |
| `src\server\services\artemis\market-research\delegates.ts` | 96 | 1 | 🔒 INTERNAL | non |
| `src\server\services\artemis\tools\engine.ts` | 332 | 1 | ✅ FENCED | oui (mixte) |
| `src\server\services\asset-tagger\index.ts` | 181 | 1 | ✅ FENCED | non |
| `src\server\services\boot-sequence\index.ts` | 69 | 1 | ✅ FENCED | non |
| `src\server\services\brief-ingest\analyzer.ts` | 154 | 1 | ✅ FENCED | non |
| `src\server\services\brief-ingest\index.ts` | 167 | 1 | 🔒 INTERNAL | non |
| `src\server\services\campaign-plan-generator\index.ts` | 122 | 1 | ✅ FENCED | non |
| `src\server\services\feedback-loop\index.ts` | 245 | 1 | ✅ FENCED | non |
| `src\server\services\implementation-generator\index.ts` | 104, 117, 143, 162 | 4 | ✅ FENCED | non |
| `src\server\services\ingestion-pipeline\ai-filler.ts` | 151, 250, 431 | 3 | ✅ FENCED | non |
| `src\server\services\ingestion-pipeline\extractors.ts` | 86 | 1 | ✅ FENCED | non |
| `src\server\services\mestor\commandant.ts` | 96, 172, 220 | 3 | ✅ FENCED | non |
| `src\server\services\mestor\i-pillar-sequenced.ts` | 131 | 1 | ✅ FENCED | non |
| `src\server\services\mestor\insights.ts` | 251 | 1 | ✅ FENCED | non |
| `src\server\services\mestor\rtis-cascade.ts` | 71 | 1 | ✅ FENCED | non |
| `src\server\services\notoria\engine.ts` | 37 | 1 | ✅ FENCED | non |
| `src\server\services\pillar-maturity\auto-filler.ts` | 802, 1075 | 2 | ✅ FENCED | non |
| `src\server\services\qc-router\automated-qc.ts` | 151 | 1 | ✅ FENCED | non |
| `src\server\services\quick-intake\brand-level-evaluator.ts` | 224 | 1 | ✅ FENCED | non |
| `src\server\services\quick-intake\deduce-adve.ts` | 147, 173 | 2 | ✅ FENCED | non |
| `src\server\services\quick-intake\index.ts` | 1345 | 1 | ✅ FENCED | non |
| `src\server\services\quick-intake\multi-agent-orchestrator.ts` | 65, 102 | 2 | ✅ FENCED | non |
| `src\server\services\quick-intake\narrate-adve.ts` | 169 | 1 | ✅ FENCED | non |
| `src\server\services\quick-intake\narrative-report-v2.ts` | 112, 179 | 2 | ✅ FENCED | non |
| `src\server\services\quick-intake\narrative-report-v3.ts` | 184, 316 | 2 | ✅ FENCED | non |
| `src\server\services\quick-intake\narrative-report.ts` | 239, 247 | 2 | ✅ FENCED | non |
| `src\server\services\quick-intake\question-bank.ts` | 316 | 1 | ✅ FENCED | non |
| `src\server\services\quick-intake\rtis-draft.ts` | 208 | 1 | ✅ FENCED | non |
| `src\server\services\rtis-protocols\innovation.ts` | 86 | 1 | ✅ FENCED | non |
| `src\server\services\rtis-protocols\risk.ts` | 219 | 1 | ✅ FENCED | non |
| `src\server\services\rtis-protocols\strategy.ts` | 112 | 1 | ✅ FENCED | non |
| `src\server\services\rtis-protocols\track.ts` | 234 | 1 | ✅ FENCED | non |
| `src\server\services\seshat\external-feeds\index.ts` | 158 | 1 | ✅ FENCED | non |
| `src\server\services\seshat\market-study-ingestion\extractor-llm.ts` | 68 | 1 | ✅ FENCED | non |
| `src\server\services\seshat\tarsis\index.ts` | 247 | 1 | ✅ FENCED | non |
| `src\server\services\seshat\tarsis\signal-collector.ts` | 185 | 1 | ✅ FENCED | non |
| `src\server\services\seshat\tarsis\weak-signal-analyzer.ts` | 168 | 1 | ✅ FENCED | non |
| `src\server\services\source-classifier\llm-decomposer.ts` | 124, 218 | 2 | ✅ FENCED | non |
| `src\server\services\strategy-presentation\enrich-oracle.ts` | 1668 | 1 | ✅ FENCED | non |
| `src\server\services\translation\index.ts` | 187 | 1 | ✅ FENCED | non |

### Entrées brutes restantes (`RAW`)

Appels directs dont l'entrée n'est pas encore neutralisée. Cible LOT 1e : 0.

_Aucune. ✅_

## Garde-fous présents (référence)

- **Sortie** : `executeStructuredLLMCall` (`utils/llm-structured.ts`) — schéma Zod strict + retry x2 + `responseFormat: json_object`.
- **Gateway** : circuit breaker multi-provider, suivi de coût, budget gate, retry exponentiel (`llm-gateway/`).
- **SSRF** : denylist RFC1918 + http/https-only sur `market-research-tools.ts` (fetcher DELEGATE).
- **PII** : pré-filtre regex + classifieur HYBRID (`campaign-tracker/signals-culture.ts`, `phase19-tools.ts`).

