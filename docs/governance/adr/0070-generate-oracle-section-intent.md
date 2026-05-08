# ADR-0070 — GENERATE_ORACLE_SECTION Intent + handler (Phase 21 F-C)

**Status** : Accepted
**Date** : 2026-05-08
**Phase** : 21 — Oracle Generation Robustness + Manual-First Section Control
**Sub-phase** : F-C — Manual section generation Intent
**Depends on** : ADR-0067 (LLM output structured enforcement, F-A), ADR-0068 (OracleSection first-class, F-B), ADR-0039 (Sequence as unique public unit)
**Enables** : F-D (Assembler manual-first orchestrator), F-E (NSP SSE streaming), F-F (UI progressive)

## Contexte

Phase 21 F-A a livré la mécanique LLM verrouillée (`executeStructuredLLMCall` + Zod strict + retry x2). Phase 21 F-B a livré l'entité `OracleSection` first-class (35 sections × strategyId, lifecycle PENDING → GENERATING → COMPLETE → FAILED → STALE, lock optimistic + TTL).

Il manque le **point de jonction** : un Intent gouverné qui prend `(strategyId, sectionId, mode)` et :
1. Acquiert le lock,
2. Dispatche vers le runner approprié (GLORY_SEQUENCE / GLORY_TOOL / FRAMEWORK),
3. Persiste le résultat via `recordGenerationSuccess` ou `recordGenerationFailure`.

Sans ce point, l'opérateur ne peut pas générer une section individuellement, et l'Assembler global (F-D) n'a pas de chemin manual-first à emprunter.

## Décision

**Nouveau Intent kind `GENERATE_ORACLE_SECTION`** gouverné par ARTEMIS, avec handler dédié dans `src/server/services/oracle-section/handler.ts`. Trois modes :

| Mode | Source statuses autorisés | Audit |
|------|--------------------------|-------|
| `FRESH` | `PENDING` uniquement (refus si déjà COMPLETE) | Génération initiale |
| `REGEN` | `PENDING`, `COMPLETE`, `FAILED`, `STALE` | Opérateur force ré-génération |
| `RETRY` | `FAILED`, `STALE` uniquement (refus sinon) | Reprise explicite après échec |

Source `GENERATING` → toujours veto `ALREADY_GENERATING` (lock occupé).

### Intent payload

```ts
| {
    kind: "GENERATE_ORACLE_SECTION";
    strategyId: string;
    sectionId: number;        // 1..35
    mode: "FRESH" | "REGEN" | "RETRY";
    operatorId: string;
  }
```

### SLO budget

```ts
{ kind: "GENERATE_ORACLE_SECTION", p95LatencyMs: 25_000, errorRatePct: 0.05, costP95Usd: 0.10 }
```

p95 25s = 1 LLM call structuré ou 1 sequence courte focalisée. Cost p95 0.10$ vs 0.50$ pour `RUN_ORACLE_SEQUENCE` (sequence complète) — payload borné per-section.

### Handler logic ([src/server/services/oracle-section/handler.ts](../../src/server/services/oracle-section/handler.ts))

```
1. Resolve section meta (SECTION_REGISTRY) + runner (resolveSectionRunner).
   ├─ Section not found → FAILED / SECTION_NOT_FOUND
   └─ No runner defined → FAILED / RUNNER_NOT_DEFINED

2. Validate mode vs current status.
   ├─ ALREADY_GENERATING (lock occupé)
   ├─ FRESH_BLOCKED_BY_COMPLETE
   └─ RETRY_BLOCKED_WRONG_STATUS

3. acquireGenerationLock — token aléatoire 32 chars + TTL 25s.
   └─ Refus si déjà locked → VETOED / ALREADY_LOCKED

4. Dispatch runner :
   ├─ GLORY_SEQUENCE → executeSequence(ref, strategyId, {})
   ├─ FRAMEWORK     → executeFramework(ref, strategyId, {})
   └─ GLORY_TOOL    → executeTool(ref, strategyId, {})

5. Sur succès :
   payload = { sectionMeta, runner, result }
   confidence = extracted from runner output (heuristic per kind)
   → recordGenerationSuccess(strategyId, sectionId, lockToken, payload, confidence)

6. Sur erreur :
   normalizeError → { errorCode, errorMessage, attempts?, zodIssues? }
   ├─ LLMStructuredCallError → ZOD_VALIDATION_FAILED
   ├─ LLMValidationError     → ZOD_VALIDATION_FAILED
   └─ Other Error            → RUNNER_FAILED
   → recordGenerationFailure(strategyId, sectionId, lockToken, errorBody)
```

### tRPC procedures ([src/server/trpc/routers/oracle.ts](../../src/server/trpc/routers/oracle.ts))

| Procédure | Type | Description |
|-----------|------|-------------|
| `oracle.listSections` | query | Liste des 35 sections avec status (lazy seed transparent) |
| `oracle.getSection` | query | Détail single section |
| `oracle.snapshotStrategy` | query | Counts par status (UI dashboard) |
| `oracle.generateSection` | mutation | Émet l'Intent. Mode auto-détecté si absent (PENDING→FRESH, COMPLETE→REGEN, FAILED/STALE→RETRY) |
| `oracle.retrySection` | mutation | Variant explicite mode=RETRY (audit log distinct) |

Toutes les mutations émettent l'Intent via `mestor.emitIntent()` — LOI 1 conservée, no bypass.

## Cap APOGEE

**7/7 préservé.** ARTEMIS gouverne le Intent. Aucun nouveau Neter, aucune nouvelle entité business. Pure plomberie qui branche F-A (mécanique LLM) + F-B (lifecycle) + ADR-0039 (sequence as unit).

## Manual-first parity (ADR-0060)

**F-D (Assembler) ÉMETTRA 35 fois ce kind** au lieu de dispatcher inline. Test bloquant `assembler-uses-manual-path.test.ts` viendra avec F-D et refusera tout `executeStructuredLLMCall` direct dans le handler `ASSEMBLE_ORACLE`. Le contrat est : section générée via `oracle.generateSection` doit produire le même payload que la même section générée via `oracle.assembleOracle({ scope: [sectionId] })` (modulo timestamps).

## Tests anti-drift (11 tests passing)

[`tests/unit/governance/generate-oracle-section-intent.test.ts`](../../tests/unit/governance/generate-oracle-section-intent.test.ts) :

- Intent kind enregistré avec governor=ARTEMIS, handler=oracle-section, async=true.
- SLO budget p95 ≤ 25s, cost ≤ 0.10$, errorRate ≤ 5%.
- Mestor commandant ARTEMIS dispatch case présent.
- Handler exporté + utilise `acquireGenerationLock`/`recordGenerationSuccess`/`recordGenerationFailure`.
- tRPC oracle router enregistré dans appRouter.
- `intentTouchesPillars` retourne `[]` (génération section ne mute pas piliers ADVE).
- Mode validation : 3 codes d'erreur normalisés (`ALREADY_GENERATING`, `FRESH_BLOCKED_BY_COMPLETE`, `RETRY_BLOCKED_WRONG_STATUS`).
- Handler dispatche les 3 runner kinds.
- Handler normalise `LLMStructuredCallError` → `ZOD_VALIDATION_FAILED`.

## Doctrine NEFER §1.1

- **Pas de notion de temps humain** — handler complet (lock + 3 runners + persist + erreur normalisée), pas un MVP "GLORY_SEQUENCE only".
- **Pas d'économie de tokens** — chaque branche runner extrait sa propre confidence ; chaque erreur a son code normalisé.
- **Profondeur > raccourci** — mode validation FRESH/REGEN/RETRY explicite avec audit code distinct, plutôt qu'un seul mode "auto".

## Suite

- **F-D** — `ASSEMBLE_ORACLE` refit comme orchestrator manual-first qui boucle sur `GENERATE_ORACLE_SECTION` (ne dispatche plus inline).
- **F-E** — Progress streaming via NSP SSE channel `oracle:strategy:{id}` + events `section.STARTED/.PROGRESS/.COMPLETED/.FAILED`.
- **F-F** — UI Oracle progressive consomme `oracle.listSections` + `oracle.generateSection` + stream SSE.
