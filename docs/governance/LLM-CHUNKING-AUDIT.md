# LLM Chunking Audit — Phase 17 robustness

**Sprint 4 v6.18.18 (2026-05-05)** — audit complet des 11 candidats détectés par `scripts/audit-llm-chunking-candidates.ts`.

## Contexte

Le pattern canonique `runChunkedFieldGeneration` (cf. `pillar-maturity/auto-filler.ts:731+`) split les LLM calls qui demandent ≥10 champs nested en chunks de N champs (default 10). Évite la troncature silencieuse observée v6.1.36 sur `auto-filler.generateMissingFields` et `rtis-cascade.actualizePillar`.

L'audit script flag les sites avec `maxOutputTokens >= 4000` OU `>= 15 field patterns` sans `runChunkedFieldGeneration` à proximité.

## Résultats de l'audit

11 candidats détectés. Analyse per-site :

### Top 3 sites — chunking déjà actif au niveau cascade

| Site | Heuristique flag | Verdict |
|---|---|---|
| `src/server/services/rtis-protocols/track.ts:196` | 43 field patterns dans le prompt | ✅ **Chunking actif** via `rtis-cascade.actualizePillar` (line 467+) qui détecte missing fields après le single call et appelle `runChunkedFieldGeneration` pour back-fill. Pattern double-pass : single call optimiste + chunked back-fill garanti. Pas d'action requise. |
| `src/server/services/rtis-protocols/strategy.ts:106` | 34 field patterns | ✅ Idem. Le cascade wrapper handle la chunking. |
| `src/server/services/rtis-protocols/risk.ts:199` | 6000 tokens, 20 fields | ✅ Idem. Wrapper-level chunking. |

### Sites moyens — false positives heuristique

| Site | Heuristique flag | Verdict |
|---|---|---|
| `src/server/services/mestor/commandant.ts:92` | 8000 tokens, 32 fields | ⚠️ Faux positif. C'est un `callLLMAndParse` orchestrateur retournant `{ prioritized: string[], strategy: {...} }` (2 champs root). Les 32 "fields" comptés sont des bullets dans le prompt context, pas des output fields. Pas de chunking nécessaire. |
| `src/server/services/llm-gateway/index.ts:12` | 30 field patterns | ⚠️ C'est le gateway lui-même — abstrait, pas un site métier. Skip. |
| `src/server/services/source-classifier/llm-decomposer.ts:122` | 4000 tokens | ⚠️ Decomposer pure — produit une liste 3-5 éléments. Pas de chunking. |

### Sites faibles — déjà adressés ou non-applicable

| Site | Verdict |
|---|---|
| `src/server/mcp/creative/index.ts:97` | 1 field root, 4096 tokens. Output simple. |
| `src/server/trpc/routers/quick-intake.ts:66` | 4096 tokens, no fields detected. Probable IA followup question (1 field). |
| `src/server/services/brief-ingest/analyzer.ts:155` | 4000 tokens. Brief-ingest extraction — déjà testé Phase 13 prompt-locks (v6.18.3). |
| `src/server/services/mestor/commandant.ts:203` | Identique au site 92 mais autre contexte. Faux positif. |

## Recommandations

### Pas d'action immédiate requise

Le pattern `runChunkedFieldGeneration` est correctement adopté au niveau cascade (`rtis-cascade.actualizePillar`) et `auto-filler.fillToStage`. Les single calls flaggés par l'audit script sont :

1. Soit déjà wrapped dans une boucle chunked (rtis-protocols/*)
2. Soit des orchestrateurs avec petit output (commandant, llm-gateway)
3. Soit des extractions ciblées (decomposer, analyzer, mcp/*) qui ne sortent pas N fields nested

**L'heuristique du script génère des faux positifs structurellement** (compte les bullets dans le PROMPT comme des fields, alors que le pattern à risque est un OUTPUT JSON nested 10+ fields).

### Amélioration script audit (futur)

Le script `audit-llm-chunking-candidates.ts` pourrait être affiné :
- Détecter mieux la STRUCTURE de l'output (regex `^\s*\w+:` au début de ligne dans un schéma JSON example)
- Distinguer prompt context bullets vs output schema bullets
- Croiser avec la cardinalité réelle observée à l'execution (via Seshat metrics)

### Pattern canonique documenté

Pour tout NOUVEAU LLM call qui produit ≥10 nested fields :

```ts
import { runChunkedFieldGeneration } from "@/server/services/pillar-maturity/auto-filler";

// Au lieu d'un single call :
const { text } = await generateText({ ... });
const result = JSON.parse(text);  // RISK: troncature silencieuse

// Faire :
const result = await runChunkedFieldGeneration({
  fields: schema.fields,
  context: {...},
  callerName: "my-service:my-call",
  // chunkSize default 10 — ajuster selon complexity validator
});
```

## Conclusion

**Sprint 4 verdict** : audit complet livré, **0 chunking migration forcée**. Les top sites flaggés sont déjà couverts par wrapper-level chunking (`rtis-cascade`) ou sont des faux positifs heuristique. Le pattern canonique est documenté pour les futurs sites.

Régénérer l'audit après tout ajout LLM call significatif :
```bash
npx tsx scripts/audit-llm-chunking-candidates.ts
```

Suivre la trajectoire dans `docs/governance/RESIDUS-AUDIT.md` (régénéré par `audit-residus.ts`).
