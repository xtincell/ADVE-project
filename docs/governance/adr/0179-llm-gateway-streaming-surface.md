# ADR-0179 — Surface streaming du LLM Gateway (`streamChatText`)

- **Status** : Accepted
- **Date** : 2026-07-26
- **Phase** : Chantier « Conseil de marque + chat Assistant + MCP réel » — WP1
- **Depends on** : ADR-0067 (`executeStructuredLLMCall`), ADR-0124 (spine — recordCost), PR #258 (cascade providers Anthropic→OpenAI→Ollama→OpenRouter)
- **Supersedes** : —

## Contexte

Le LLM Gateway (`src/server/services/llm-gateway/`) n'exposait que des surfaces
**non-streamées** (`callLLM`, `executeStructuredLLMCall`). Conséquence directe et
documentée (RESIDUAL-DEBT « /api/chat — routage LLM Gateway ») : le chat cockpit
appelait `@ai-sdk/anthropic` **en direct**, hors Gateway — donc sans cascade de
providers, sans parité Sonnet 5 (thinking désactivé + température strippée), sans
budget Thot, sans circuit breaker, sans cost tracking. C'est précisément l'oubli
de la parité Sonnet 5 (le garde-fou existait à `index.ts:694-701` mais n'était
jamais appliqué au chat) qui tronquait/vidait les réponses.

Audit anti-doublon (grep CODE-MAP + 4 surfaces, 2026-07-26) : aucune surface
streaming n'existe — greps négatifs. `executeStructuredLLMCall` ne convient pas
(sortie STRUCTURÉE JSON validée Zod, pas un flux texte incrémental).

## Décision

### 1. `src/server/services/llm-gateway/parity.ts` (module feuille)

Extraction du garde-fou Sonnet 5 (`applySonnet5Parity` : thinking `disabled` +
température `undefined` quand provider=anthropic & modèle=`claude-sonnet-5*`) dans
un module feuille PARTAGÉ, consommé à la fois par `callLLM` (bloc historique
recâblé, comportement byte-identique) et par la nouvelle surface streaming. Le
littéral du garde-fou ne vit désormais qu'à UN endroit.

### 2. `src/server/services/llm-gateway/streaming.ts` — `streamChatText`

```ts
streamChatText({ system, messages, caller, strategyId?, purpose?, maxOutputTokens?, temperature?, signal? })
  → { textStream: ReadableStream<string>, finished: Promise<{text, inputTokens, outputTokens, provider, model}>, provider, model }
```

Réutilise les internes du Gateway (refactorés en exports intra-dossier) :
`resolveTextProviderOrder` (ordre JAMAIS hardcodé — Ollama Cloud → OpenRouter →
Anthropic par défaut, `LLM_PREMIUM_MODE` inverse), `buildProviderModel`,
`buildTextProviderCandidates`, `checkBudget` (Thot), `acquireSlot`/`releaseSlot`,
`recordProviderSuccess/Failure`, `trackCost`.

### 3. Fallback PRÉ-premier-octet (le point dur du streaming)

Une fois un delta servi au client, on ne peut plus changer de provider. D'où le
**probe** : on attend le premier delta non-vide sous timeout 15 s
(`STREAM_FIRST_BYTE_TIMEOUT_MS`) ; échec / flux-vide (échec lazy post-200 typique
d'une clé absente) → provider suivant, ou modèle gratuit suivant sur OpenRouter.
Premier delta reçu → le flux est committé à ce provider ; une erreur mid-stream
laisse le **texte partiel** au client (honnêteté > magie). Le headroom
(`applyHeadroom`) s'applique au system uniquement (multi-tours verbatim en v1).

## Conséquences

- Ferme la ligne RESIDUAL-DEBT « /api/chat — routage LLM Gateway ».
- Débloque WP2 (chat) et WP3 (conseil) qui streament tous deux via cette surface.
- Tests anti-drift : `gateway-streaming-parity.test.ts` (HARD — parité partagée,
  ordre non hardcodé, pas d'import SDK direct, gardes identiques à callLLM) +
  `services/llm-gateway/streaming.test.ts` (fallback pré-premier-octet, providers
  mockés).
- Pas de SSE server-initiated : la surface est un flux de texte simple, suffisant
  pour un chat. Cap APOGEE 7/7 préservé (mécanique technique, pas un Neter).
