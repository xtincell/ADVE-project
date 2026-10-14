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

## Réception du 14 octobre 2026 — attribution du coût en correction 457

La surface et ses décisions historiques restent acceptées. La recette publique du conseil sous 456 sert `gemma4:31b` cloud, mais le log porte provider Anthropic et un tarif Sonnet : la présence de `trackCost` ne reçoit pas son attribution correcte. Configuration Gemma servie sur image 456/27db553b… après modèle Ollama retiré et crédit Anthropic insuffisant ; aucun achat, nouvelle clé fournisseur ou migration d’un agent actif ; clés MCP temporaires de recette BRAND/SPAWT expirées/désactivées, sans élargissement d’accès agentique. La réponse réelle obtenue ne reçoit ni son utilité ni une facture fournisseur.

Correctif implémenté dans le gateway existant : provider/modèle servis transportés jusqu’à la journalisation, estimation tarifaire explicite, sans nouveau provider ou contrat de fallback ajouté. Handlers candidats compilés exercés dans 456 reçoivent Ollama/Gemma et estimations 0,00178466 puis 0,00178738 USD, pas factures ou HTTP public 457. Premier harnais externe import `ai` échoué puis bundle des dépendances sans secret copié : harnais, pas panne API publique. [Ollama pricing](https://ollama.com/pricing), référence reçue le 14 octobre : Gemma 4 entrée 0,14 USD/million de jetons, cache 0,05 et sortie 0,40. Les crédits inclus, y compris en Free, ne rendent pas ces tarifs nuls ; estimation publique non-cached/peak, débit de crédits et facture restent distincts, inconnu hors registre.

Six rouges/13 succès sur baseline puis cible actuelle 40 / 6 verte, coût streaming/mode réel inclus. Premier DEFAULT 4 423 / 422/gouvernance 1 627 / 166/cinq contrôles zéro avant dernières modifications ; contrôles finaux reçus : DEFAULT 4 424 / 422, gouvernance 1 627 / 166, cible 40 / 6, tsc/lints/cycles zéro, 24 avertissements par lint. Source/CI/image/public 457/reprise encore attendus. Essai ponctuel DeepSeek 4.1 candidat refusé HTTP 402 avec la clé utilisée (« This model is not in the Free plan. »), repli Anthropic 400/crédit insuffisant ; pin global inchangé, aucun achat ou élargissement de clé fournisseur. Compte/abonnement existant à vérifier via dashboard exigeant connexion ; aucune approbation d’upgrade reçue. Aucune utilité complète, coût facturé ou livraison 457 reçue.

**Plan et déclencheur C5/C7** : contre-exemples puis attribution sur appel réel avant réception du coût, alignement pin global/politiques gouvernées/registre natif avant changement ou mandat ; factures et plafond monétaire avant récurrence. Le registre natif local est périmé au périmètre cloud observé, aucun mandat monétaire ou coût mensuel global reçu. [Dette existante](../RESIDUAL-DEBT.md), [bornage](../REFONTE-PLAN.md).
