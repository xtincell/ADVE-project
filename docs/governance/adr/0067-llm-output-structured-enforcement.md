# ADR-0067 — LLM Output Structured Enforcement (Phase 21 F-A)

**Status** : Accepted
**Date** : 2026-05-07
**Phase** : 21 — Oracle Generation Robustness + Manual-First Section Control
**Sub-phase** : F-A — LLM output structured enforcement
**Supersedes** : prolonge ADR-0063 (`parseAndValidateLLM`)
**Supersededby** : (none)

## Contexte

Audit Phase 21 (mégasprint NEFER) a confirmé une faille structurelle de **format LLM non protégé** dans trois flows critiques :

1. **Glory tools** ([engine.ts:188-227](../../../src/server/services/artemis/tools/engine.ts)) — `tool.outputFormat` injecté en string informelle (`"concepts_list"`, `"script"`, …), réponse parsée via regex naïve `aiText.match(/\{[\s\S]*\}/)` + `JSON.parse` sans Zod.
2. **Frameworks Artemis** ([frameworks.ts](../../../src/server/services/artemis/frameworks.ts)) — 24+ frameworks avec `promptTemplate` en texte libre, aucun schéma de sortie.
3. **`OPERATOR_AMEND_PILLAR` mode `LLM_REPHRASE`** ([pillar.ts:1036-1074](../../../src/server/trpc/routers/pillar.ts)) — stub passthrough qui retournait simplement le prompt brut de l'opérateur sans appel LLM ni validation.

Conséquence observée (cf. commentaire vault-enrichment ligne 256-257) : *"ikigai {good,love,paid,skill}"* écrit dans le pilier au lieu de la shape canonique *"ikigai {love, competence, worldNeed, remuneration}"*.

`parseAndValidateLLM` (ADR-0063) existait déjà mais n'était utilisé QUE par `mestor/commandant`, `ingestion-pipeline/ai-filler`, `boot-sequence`, `strategy-presentation`. Aucun Glory tool, aucun framework Artemis, aucun OPERATOR_AMEND_PILLAR.

## Décision

**Toute génération LLM côté pipeline ADVE/Oracle traverse maintenant `executeStructuredLLMCall`**, un wrapper qui :

1. Sérialise le schéma Zod attendu en JSON Schema 7 via `deriveJsonSchemaFromZod` ([utils/zod-to-json-schema.ts](../../../src/server/services/utils/zod-to-json-schema.ts)).
2. Injecte ce JSON Schema dans le system prompt avec une directive stricte (`Réponds UNIQUEMENT en JSON valide … additionalProperties=false … toute déviation entraînera retry`).
3. Active `responseFormat: "json_object"` au LLM Gateway (propagé natif chez OpenAI/Ollama via `providerOptions: { openai: { responseFormat: { type: "json_object" } } }`).
4. Parse la réponse via `parseAndValidateLLM` mode **strict** (plus de prune silencieux côté pipeline ADR-0064).
5. Sur échec Zod : **retry x2** avec injection des Zod issues détaillées dans le prompt de retry (le LLM voit exactement ce qu'il a foiré).
6. Échec final → `LLMStructuredCallError` structurée avec historique des tentatives.

### Contrats type-level

- `GloryToolDef.outputSchema?: ZodType<unknown>` + `_noSchemaJustification?: string` (mutually exclusive). Tout tool `executionType: "LLM"` doit déclarer l'un ou l'autre. Cf. [registry.ts](../../../src/server/services/artemis/tools/registry.ts).
- `FrameworkDef.outputSchema?: ZodType<unknown>` + `_noSchemaJustification?: string`. Idem 24 frameworks. Cf. [frameworks.ts](../../../src/server/services/artemis/frameworks.ts).
- `GatewayCallOptions.responseFormat?: "text" | "json_object"` (default `text`). Cf. [llm-gateway/index.ts](../../../src/server/services/llm-gateway/index.ts).

### Migration des trois flows

| Flow | Avant | Après |
|------|-------|-------|
| `engine.executeTool` | `JSON.parse(jsonMatch[0])` naïf | Si `tool.outputSchema` → `executeStructuredLLMCall` strict + retry x2 ; sinon legacy path + warn console si pas de `_noSchemaJustification`. |
| `executeFramework` | Idem regex + `JSON.parse` | Si `fw.outputSchema` → wrapper structuré ; sinon legacy + warn. |
| `pillar.previewAmend` | Stub passthrough — renvoyait `proposedValue: input.rephrasePrompt` brut | Vrai LLM call avec schema = `z.object({ proposedValue: fieldSchema, advantages, disadvantages, confidence })` dérivé de `PILLAR_SCHEMAS[uppercase].shape[field]`. Fallback `passthrough_no_schema` si field absent du shape. |
| `vault-enrichment` | Coercion silencieuse array→string + `validationWarning` persisté en base | `executeStructuredLLMCall` outer + per-field Zod parse strict avec **rejet** (plus de coercion). Recos invalides exposées dans `result.rejected` avec raison Zod. |

## Compatibilité

**Mode soft pour la première vague.** Le typage est en place (`outputSchema?` optionnel) et les tests anti-drift G2/G3 produisent un INVENTAIRE des tools/frameworks sans schéma. Baseline soft (1000 / 100) qui passe tant que l'audit n'a pas été fait — promotion en mode hard (baseline=0) après migration tool par tool.

**Le legacy path reste fonctionnel** pour les tools/frameworks qui n'ont pas encore de schéma : ils logguent un `warn` console explicite *"migration ADR-0067 requise"*. Aucune régression de comportement runtime — uniquement la garantie que tout NEW tool/framework qui veut shipper LLM doit déclarer son schéma.

## Conséquences

### Positives

- **Format ferme garanti** au point de génération, pas seulement à la persistance.
- **Retry-on-zod-fail avec feedback** — le LLM corrige sa shape lui-même.
- **Variable Bible enfin propagée dans le prompt** via `getFormatInstructions(pillarKey, fieldKeys)` injecté par `executeStructuredLLMCall.formatInstructions`.
- **Coercion silencieuse vault-enrichment morte** — fini les recos invalides en base avec un warning ignoré par l'UI.
- **`LLM_REPHRASE` enfin opérationnel** — plus un stub passthrough.
- **Cap APOGEE 7/7 préservé** — aucun nouveau Neter, sous-domaine d'Artemis.

### Négatives / dette traçable

- **Migration des 56+ Glory tools LLM + 24 frameworks** étalée — chaque tool doit recevoir son `outputSchema` Zod ou son `_noSchemaJustification`. Tracké dans [RESIDUAL-DEBT.md §Phase 21](../RESIDUAL-DEBT.md).
- **Anthropic n'a pas de json_mode natif** via le AI SDK — pour Anthropic on s'appuie sur le system prompt rigide + retry. Une évolution future pourrait utiliser `generateObject` du AI SDK avec `tool_use` forced, hors scope F-A.
- **Le wrapper consomme plus de tokens** (JSON Schema sérialisé dans chaque prompt) — coût LLM légèrement supérieur. Compensé par la suppression des reruns manuels que l'opérateur faisait à cause de payloads malformés.

## Tests anti-drift

- `tests/unit/lib/zod-to-json-schema.test.ts` (10 tests, helper unit)
- `tests/unit/governance/glory-tool-llm-zod-enforcement.test.ts` (4 tests, contrat GloryToolDef)
- `tests/unit/governance/framework-output-schema.test.ts` (3 tests, contrat FrameworkDef)
- `tests/unit/governance/llm-gateway-response-format.test.ts` (3 tests, propagation `responseFormat`)
- `tests/unit/governance/vault-enrichment-no-silent-coercion.test.ts` (5 tests, suppression coercion)

**25/25 tests passing à l'introduction.**

## Doctrine NEFER §1.1

- **Pas de notion de temps humain** : 56+24 schemas à écrire = 80 sub-commits éventuels, chacun atomique. Pas de "on en fait la moitié".
- **Pas d'économie de tokens** : JSON Schema sérialisé dans chaque prompt + retry x2 + Zod strict. Verbose ? Oui, et c'est l'objectif.
- **Pas de fatigue** : 80 schemas si la cohérence l'exige, c'est 80.
- **Profondeur > raccourci** : entre patcher chaque flow indépendamment et créer une mécanique transverse, on prend la mécanique.

## Suite (chantiers F-B → F-H)

- **F-B** — `OracleSection` first-class entity (Prisma model + lifecycle).
- **F-C** — `GENERATE_ORACLE_SECTION` Intent kind.
- **F-D** — Assembler comme orchestrator manual-first.
- **F-E** — Progress streaming via NSP SSE.
- **F-F** — UI Oracle progressive.
- **F-G** — Tests anti-drift CI complet.
- **F-H** — Documentation governance complète.

Cf. CLAUDE.md section "Phase 21" pour le plan complet.
