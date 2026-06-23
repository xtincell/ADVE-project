# Audit sécurité des nœuds LLM

> Auto-généré par `npm run audit:llm` (`scripts/audit-llm-nodes.ts`). Ne pas éditer à la main.

Généré le 2026-06-23.

Deux contrats vérifiés par nœud : **sortie** (validation Zod stricte) et **entrée** (pas d'appel LLM direct qui court-circuite la validation et concatène l'entrée brute).

## Vue d'ensemble

| Catégorie | Total | Protégés (sortie) | Couverture | Sans garde |
|---|---|---|---|---|
| Glory tools (LLM/HYBRID) | 76 | 53 | 70% | 23 |
| Frameworks | 28 | 28 | 100% | 0 |
| Appels LLM directs (bypass wrapper) | — | — | — | 52 sur 38 fichiers |

## SORTIE — nœuds sans contrat de validation

Ces nœuds appellent un LLM mais ne déclarent ni `outputSchema` ni `_noSchemaJustification` : leur sortie n'est pas validée structurellement.

| Type | Slug | Exec |
|---|---|---|
| glory | `visual-moodboard-generator` | LLM |
| glory | `crew-matcher` | LLM |
| glory | `formation-recommender` | LLM |
| glory | `qc-evaluator` | LLM |
| glory | `ad-copy-generator` | LLM |
| glory | `audience-targeter` | LLM |
| glory | `visual-moodboard-generator` | LLM |
| glory | `crew-matcher` | LLM |
| glory | `formation-recommender` | LLM |
| glory | `qc-evaluator` | LLM |
| glory | `ad-copy-generator` | LLM |
| glory | `audience-targeter` | LLM |
| glory | `synthesize-section` | LLM |
| glory | `lsi-universe-setup` | LLM |
| glory | `lsi-symbol-alchemy` | LLM |
| glory | `lsi-distribution-matrix` | LLM |
| glory | `lsi-sublimation` | LLM |
| glory | `lsi-morpho-semantic` | LLM |
| glory | `adops-expand-semantic-field` | LLM |
| glory | `adops-cross-pollinate-concepts` | LLM |
| glory | `adops-decode-reference-grid` | LLM |
| glory | `adops-defend-creative-direction` | LLM |
| glory | `postmortem-12q` | LLM |

## ENTRÉE — appels LLM directs (court-circuitent la validation)

Ces points appellent `callLLM`/`callLLMAndParse` sans passer par `executeStructuredLLMCall` : sortie non validée + entrée souvent concaténée brute (surface d'injection de prompt).

| Fichier | Lignes | Appels | Utilise aussi le wrapper |
|---|---|---|---|
| `src/server/services/artemis/index.ts` | 228 | 1 | oui (mixte) |
| `src/server/services/artemis/market-research/delegates.ts` | 87 | 1 | non |
| `src/server/services/artemis/tools/engine.ts` | 321 | 1 | oui (mixte) |
| `src/server/services/artemis/tools/market-research-tools.ts` | 65 | 1 | non |
| `src/server/services/boot-sequence/index.ts` | 69 | 1 | non |
| `src/server/services/brief-ingest/analyzer.ts` | 154 | 1 | non |
| `src/server/services/brief-ingest/index.ts` | 160 | 1 | non |
| `src/server/services/campaign-plan-generator/index.ts` | 113 | 1 | non |
| `src/server/services/implementation-generator/index.ts` | 101, 111, 135, 151 | 4 | non |
| `src/server/services/ingestion-pipeline/ai-filler.ts` | 149, 246, 426 | 3 | non |
| `src/server/services/ingestion-pipeline/extractors.ts` | 85 | 1 | non |
| `src/server/services/mestor/commandant.ts` | 92, 161, 203 | 3 | non |
| `src/server/services/mestor/i-pillar-sequenced.ts` | 124 | 1 | non |
| `src/server/services/mestor/insights.ts` | 251 | 1 | non |
| `src/server/services/mestor/rtis-cascade.ts` | 71 | 1 | non |
| `src/server/services/notoria/engine.ts` | 37 | 1 | non |
| `src/server/services/pillar-maturity/auto-filler.ts` | 699, 920 | 2 | non |
| `src/server/services/quick-intake/brand-level-evaluator.ts` | 223 | 1 | non |
| `src/server/services/quick-intake/deduce-adve.ts` | 147, 173 | 2 | non |
| `src/server/services/quick-intake/index.ts` | 1339 | 1 | non |
| `src/server/services/quick-intake/multi-agent-orchestrator.ts` | 62, 97 | 2 | non |
| `src/server/services/quick-intake/narrate-adve.ts` | 169 | 1 | non |
| `src/server/services/quick-intake/narrative-report-v2.ts` | 108, 172 | 2 | non |
| `src/server/services/quick-intake/narrative-report-v3.ts` | 181, 306 | 2 | non |
| `src/server/services/quick-intake/narrative-report.ts` | 234, 242 | 2 | non |
| `src/server/services/quick-intake/question-bank.ts` | 313 | 1 | non |
| `src/server/services/quick-intake/rtis-draft.ts` | 208 | 1 | non |
| `src/server/services/rtis-protocols/innovation.ts` | 85 | 1 | non |
| `src/server/services/rtis-protocols/risk.ts` | 218 | 1 | non |
| `src/server/services/rtis-protocols/strategy.ts` | 111 | 1 | non |
| `src/server/services/rtis-protocols/track.ts` | 233 | 1 | non |
| `src/server/services/seshat/external-feeds/index.ts` | 147 | 1 | non |
| `src/server/services/seshat/market-study-ingestion/extractor-llm.ts` | 55 | 1 | non |
| `src/server/services/seshat/tarsis/index.ts` | 236 | 1 | non |
| `src/server/services/seshat/tarsis/signal-collector.ts` | 174 | 1 | non |
| `src/server/services/seshat/tarsis/weak-signal-analyzer.ts` | 148 | 1 | non |
| `src/server/services/source-classifier/llm-decomposer.ts` | 122, 212 | 2 | non |
| `src/server/services/strategy-presentation/enrich-oracle.ts` | 1661 | 1 | non |

## Garde-fous présents (référence)

- **Sortie** : `executeStructuredLLMCall` (`utils/llm-structured.ts`) — schéma Zod strict + retry x2 + `responseFormat: json_object`.
- **Gateway** : circuit breaker multi-provider, suivi de coût, budget gate, retry exponentiel (`llm-gateway/`).
- **SSRF** : denylist RFC1918 + http/https-only sur `market-research-tools.ts` (fetcher DELEGATE).
- **PII** : pré-filtre regex + classifieur HYBRID (`campaign-tracker/signals-culture.ts`, `phase19-tools.ts`).

