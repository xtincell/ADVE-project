# ADR-0072 — Oracle progress streaming via NSP SSE (Phase 21 F-E)

**Status** : Accepted
**Date** : 2026-05-08
**Phase** : 21 — Oracle Generation Robustness + Manual-First Section Control
**Sub-phase** : F-E — NSP SSE streaming
**Depends on** : ADR-0025 (NSP SSE broker), ADR-0070 (GENERATE_ORACLE_SECTION F-C), ADR-0071 (Oracle Assembler F-D)
**Enables** : F-F (UI Oracle progressive)

## Contexte

Phase 21 F-C/F-D ont livré la mécanique Intent + handler section + orchestrator. Mais le frontend est aveugle pendant l'exécution. Sans signal temps-réel, l'opérateur voit `Artemis en cours…` opaque pendant N secondes (cf. screenshot initial qui a déclenché ce mégasprint).

NSP (Phase 16, ADR-0025) fournit déjà l'infrastructure SSE : `publish(userId, event)` + `subscribe(userId, listener)` avec discriminated union d'events.

## Décision

**6 nouveaux sub-kinds discriminés** dans `NspEvent`, exposés via NSP existant. Pas de nouveau channel, pas de nouvel ACL — l'opérateur reçoit ses events via `subscribe(userId, ...)` standard, le frontend filtre par `event.strategyId`.

### Event types canoniques

| Kind | Émis par | Quand |
|------|----------|-------|
| `oracle_section_started` | `generateOracleSectionHandler` (F-C) | Après `acquireGenerationLock`, avant `dispatchRunner` |
| `oracle_section_completed` | `generateOracleSectionHandler` | Après `recordGenerationSuccess` réussi |
| `oracle_section_failed` | `generateOracleSectionHandler` | Après `recordGenerationFailure` (runner ou persist failure) |
| `oracle_assembler_started` | `assembleOracleHandler` (F-D) | Avant la boucle (ou empty-scope path) |
| `oracle_assembler_progress` | `assembleOracleHandler` | Au début de chaque itération de la boucle (currentSectionId) |
| `oracle_assembler_done` | `assembleOracleHandler` | Après la boucle (overallStatus + summary) |

### Hiérarchie naturelle

L'Assembler émet `oracle_assembler_*` ; chaque sous-Intent `GENERATE_ORACLE_SECTION` émet `oracle_section_*` au passage. Le frontend voit les deux niveaux interlacés sans configuration supplémentaire :

```
oracle_assembler_started  { total: 10, scope: "MISSING" }
oracle_assembler_progress { currentSectionId: 7, completed: 0, failed: 0, pending: 10 }
oracle_section_started    { sectionId: 7, runner: { kind: "FRAMEWORK", ref: "fw-22" } }
oracle_section_completed  { sectionId: 7, confidence: 0.78, durationMs: 8230 }
oracle_assembler_progress { currentSectionId: 22, completed: 1, failed: 0, pending: 9 }
oracle_section_started    { sectionId: 22, ... }
oracle_section_failed     { sectionId: 22, errorCode: "ZOD_VALIDATION_FAILED", attempts: 3 }
...
oracle_assembler_done     { overallStatus: "PARTIAL", succeeded: 8, failed: 2, durationMs: 87530 }
```

### Helper canonique

[`src/server/services/oracle-section/stream-events.ts`](../../src/server/services/oracle-section/stream-events.ts) expose 6 emitters typés :

```ts
emitSectionStarted({ userId, strategyId, sectionId, sectionTitle, runner, mode })
emitSectionCompleted({ userId, strategyId, sectionId, sectionTitle, confidence, durationMs, version })
emitSectionFailed({ userId, strategyId, sectionId, sectionTitle, errorCode, errorMessage, attempts?, durationMs })
emitAssemblerStarted({ userId, strategyId, scope, total })
emitAssemblerProgress({ userId, strategyId, scope, total, completed, failed, pending, currentSectionId? })
emitAssemblerDone({ userId, strategyId, scope, overallStatus, total, succeeded, failed, durationMs })
```

### Best-effort guarantee

Tous les emitters wrappent un `bestEffort()` interne avec try/catch. Un échec NSP (broker down, listener disconnected, etc.) **ne casse JAMAIS** une génération qui a réussi côté DB. La source de vérité reste `OracleSection.payload` persisté ; NSP est juste l'aiguillage temps-réel pour l'UI.

```ts
function bestEffort(fn: () => void): void {
  try {
    fn();
  } catch (err) {
    if (process.env.DEBUG_ORACLE_STREAM) {
      console.warn(`[oracle-stream-events] publish failed (silenced):`, err);
    }
  }
}
```

## Cap APOGEE

**7/7 préservé.** NSP existait déjà depuis Phase 16. Pure extension de l'union `NspEvent` + helper publishers. Aucun nouveau Neter, aucun nouveau Intent.

## Manual-first parity (ADR-0060) — préservée

Le test `assembler-uses-manual-path.test.ts` (F-D) reste valide après F-E. F-E ajoute des appels à `emitAssembler*` mais pas à `executeStructuredLLMCall` / `executeSequence` / `executeFramework` / `executeTool` / `callLLM`. Test bloquant régression spécifique dans la suite F-E :

```ts
it("assembler.ts still does NOT call any LLM/runner primitive directly", () => { ... });
```

## Tests anti-drift (15 tests passing)

[`tests/unit/governance/oracle-stream-events.test.ts`](../../tests/unit/governance/oracle-stream-events.test.ts) :

**NSP `OracleStreamEvent` contract** (4 tests) :
- 6 kinds canoniques déclarés.
- Union exportée + sub-types nommés.
- `NspEvent` étendu pour inclure `OracleStreamEvent`.
- `nsp/index.ts` re-exporte tous les sub-types.

**`stream-events.ts` emitters** (3 tests) :
- 6 emitters exportés.
- Chacun passe par `bestEffort()` (jamais throw).
- Pure functions — `userId` + `strategyId` en args, pas globals.

**Section handler** (3 tests) :
- Imports les 3 section emitters.
- `emitSectionStarted` après `acquireGenerationLock`, avant `dispatchRunner` (ordre vérifié sur src strippé de commentaires).
- `emitSectionCompleted` ≥1 sur success path + `emitSectionFailed` ≥2 sur failure paths (runner + persist).

**Assembler** (4 tests) :
- Imports les 3 assembler emitters.
- STARTED avant la boucle, DERNIER DONE après la boucle (lastIndexOf).
- PROGRESS avec `currentSectionId` dans la boucle.
- DONE émis aussi sur empty-scope path (≥2 occurrences).

**Manual-first parity régression** (1 test) :
- Aucun pattern interdit (executeStructuredLLMCall / executeSequence / executeFramework / executeTool / callLLM / callLLMAndParse) dans `assembler.ts` (modulo commentaires explicatifs).

## Doctrine NEFER §1.1

- **Pas de notion de temps humain** — 6 emitters complets, pas un MVP "STARTED + DONE only".
- **Pas d'économie de tokens** — chaque event a son shape typé complet (errorCode + errorMessage + attempts + durationMs au lieu d'un blob générique).
- **Profondeur > raccourci** — best-effort garanti par helper interne, pas dispersé sur chaque call site.

## Suite

- **F-F** — Page `/cockpit/{brand}/oracle` refit consomme les events :
  - Hook `useOracleStream(strategyId)` qui consomme les 6 sub-kinds via SSE.
  - Console live (la "log" de la capture initiale, mais alimentée en VRAI).
  - 35 chips de section qui changent d'état en live (PENDING → GENERATING (spin) → COMPLETE/FAILED).
  - Modal erreur Zod détaillée sur clic d'une section FAILED.
  - Bouton "Assembler L'Oracle" → `oracle.assembleOracle({ scope })` avec scope dropdown.
- **F-G** — Tests anti-drift complets (parity HARD baseline maintenue, integration end-to-end mock NSP listener).
- **F-H** — Documentation governance complète (CODE-MAP régen, LEXICON entry).
