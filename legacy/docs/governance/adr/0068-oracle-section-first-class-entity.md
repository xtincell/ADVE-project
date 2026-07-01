# ADR-0068 — OracleSection first-class entity (Phase 21 F-B)

**Status** : Accepted
**Date** : 2026-05-07
**Phase** : 21 — Oracle Generation Robustness + Manual-First Section Control
**Sub-phase** : F-B — OracleSection as first-class entity
**Depends on** : ADR-0014 (35-section framework canonical), ADR-0067 (LLM output structured enforcement)
**Enables** : F-C (Manual section generation Intent), F-D (Assembler manual-first orchestrator), F-E (NSP SSE streaming), F-F (UI progressive)

## Contexte

L'Oracle 35-section ([ADR-0014](0014-oracle-35-framework-canonical.md)) est aujourd'hui un **livrable composé à la volée** : à chaque clic "Assembler L'Oracle", Artemis lance une orchestration en bloc qui exécute les 35 sequences/frameworks et matérialise les `BrandAsset.kind` correspondants. Conséquences :

1. **Pas de granularité** — l'opérateur voit "Artemis en cours…" pendant N secondes sans savoir laquelle des 35 sections est en train de cuire ni laquelle a foiré.
2. **Pas de retry par section** — si la section #07 SWOT plante, il faut tout relancer.
3. **Pas de génération manuelle** — il n'existe aucun chemin pour générer §07 indépendamment ; le seul chemin est l'assembler global.
4. **Pas de tracking de stale** — quand un pilier ADVE mute, on n'a aucun moyen propre d'indiquer que §07 SWOT est désormais périmée.
5. **Manual-first parity (ADR-0060) violée** — l'assembler n'emprunte pas le même chemin de code qu'une génération manuelle, parce que ce chemin n'existe pas.

## Décision

**`OracleSection` devient une entité first-class** persistée dans Postgres, avec un lifecycle propre :

```
PENDING ──acquireGenerationLock──▶ GENERATING ──recordGenerationSuccess──▶ COMPLETE
   ▲                                  │
   │                                  └────────recordGenerationFailure────▶ FAILED
   │                                                                          │
   └──forgetGenerationProgress (operator override) ──────────────────────────┤
                                                                              │
COMPLETE ──markSectionsStale (cascade pillar amend) ──▶ STALE                 │
                                                         │                     │
STALE / FAILED ──acquireGenerationLock──▶ GENERATING ────┴─────────────────────┘
```

### Modèle Prisma

```prisma
model OracleSection {
  id                        String              @id @default(cuid())
  strategyId                String
  sectionId                 Int                 // 1..35
  tier                      OracleTier          // CORE | BIG4_BASELINE | DISTINCTIVE
  status                    OracleSectionStatus @default(PENDING)
  payload                   Json?
  confidence                Float?
  lastGenerationStartedAt   DateTime?
  lastGenerationCompletedAt DateTime?
  lastError                 Json?
  errorCode                 String?
  generationCount           Int                 @default(0)
  version                   Int                 @default(1)
  staleAt                   DateTime?
  lockToken                 String?
  lockExpiresAt             DateTime?
  createdAt                 DateTime            @default(now())
  updatedAt                 DateTime            @updatedAt

  strategy                  Strategy            @relation(fields: [strategyId], references: [id], onDelete: Cascade)
  @@unique([strategyId, sectionId])
  @@index([strategyId, status])
  @@index([strategyId, tier])
  @@index([staleAt])
}
enum OracleTier { CORE BIG4_BASELINE DISTINCTIVE }
enum OracleSectionStatus { PENDING GENERATING COMPLETE FAILED STALE }
```

Migration : [`20260507000000_phase21_oracle_section/migration.sql`](../../prisma/migrations/20260507000000_phase21_oracle_section/migration.sql).

### Service `oracle-section/`

API publique ([src/server/services/oracle-section/index.ts](../../src/server/services/oracle-section/index.ts)) :

| Fonction | Transition | Notes |
|---|---|---|
| `seedSectionsForStrategy(strategyId)` | — | Crée les 35 rows (idempotent via `skipDuplicates`). |
| `getSectionsForStrategy(strategyId)` | — | Liste + lazy seed si `count < 35`. |
| `getSection(strategyId, sectionId)` | — | Lecture single. |
| `acquireGenerationLock(strategyId, sectionId, ttlMs?)` | * → `GENERATING` | Lock optimistic + token aléatoire 32 chars + TTL 25s default. Refuse si `GENERATING` avec `lockExpiresAt > now`. |
| `recordGenerationSuccess(strategyId, sectionId, lockToken, payload, confidence)` | `GENERATING` → `COMPLETE` | Match lock token obligatoire. Reset `staleAt = null`. |
| `recordGenerationFailure(strategyId, sectionId, lockToken, { errorCode, errorMessage, attempts?, zodIssues? })` | `GENERATING` → `FAILED` | Persist `lastError` structuré. |
| `releaseGenerationLock(strategyId, sectionId, lockToken)` | — | Clear lock sans changer status. |
| `markSectionsStale(strategyId, sectionIds[])` | `COMPLETE` → `STALE` | Cascade hook (Phase 21 F-D). |
| `markAllSectionsStale(strategyId)` | `COMPLETE` → `STALE` | Convenience global. |
| `forgetGenerationProgress(strategyId, sectionId)` | * → `PENDING` | Reset operator override (debug). |
| `snapshotStrategy(strategyId)` | — | `{ pending, generating, complete, failed, stale, total }`. |

### Garanties

1. **Lock optimistic** — `lockToken` matché avant tout write downstream. `LOCK_TOKEN_MISMATCH` si mauvais token. Empêche deux générations concurrentes sur la même section.
2. **TTL lock 25s** — `lockExpiresAt > now` empêche acquisition concurrente. Si l'ancien caller plante, le nouveau caller récupère après expiration. Évite les deadlocks éternels.
3. **Idempotency seed** — `seedSectionsForStrategy` avec `skipDuplicates`. Lazy seed dans `getSectionsForStrategy` rend le système auto-réparateur sans script de backfill explicite (les strategies existantes obtiennent leurs 35 rows à la première lecture).
4. **`staleAt` clear on COMPLETE** — `recordGenerationSuccess` reset `staleAt = null` ; le payload est désormais frais.
5. **`generationCount` monotone** — incrément à chaque acquireGenerationLock, jamais reset (audit brut).

### `SectionMeta.runner` (descripteur de génération)

`SectionMeta` reçoit un nouveau champ optionnel `runner: { kind: "GLORY_SEQUENCE" | "GLORY_TOOL" | "FRAMEWORK", ref, dependsOn? }`. Helper `resolveSectionRunner(meta)` fait le pont avec le legacy `sequenceKey` (backward-compat) — si pas de `runner` explicite mais `sequenceKey` présent, dérive `{ kind: "GLORY_SEQUENCE", ref: sequenceKey }`. Sections sans runner ni sequenceKey → `null` (à compléter en migration progressive, baseline test soft `BASELINE_SECTIONS_WITHOUT_RUNNER = 100`).

`dependsOn` (optionnel) — array de sectionIds upstream qui doivent être COMPLETE. Permet à l'Assembler (F-D) de faire un topoSort + paralléliser.

## Cap APOGEE

**7/7 préservé.** `OracleSection` est une entité données dans le sous-domaine d'Artemis (Propulsion, phase brief). Aucun nouveau Neter, aucune nouvelle gouvernance.

## Tests anti-drift (11 tests passing)

[`tests/unit/governance/oracle-section-coverage.test.ts`](../../tests/unit/governance/oracle-section-coverage.test.ts) :

- `SECTION_REGISTRY` contient exactement 35 sections numérotées 1..35.
- IDs uniques.
- Tier counts respectent ADR-0014 (23 + 7 + 5).
- `resolveSectionRunner` cas explicite + legacy + null.
- Service `oracle-section/` expose les 11 fonctions publiques attendues.
- Types `OracleTier` + `OracleSectionStatus` re-exportés.

## Doctrine NEFER §1.1

- **Pas de notion de temps humain** — modèle complet + migration + service + tests + ADR + doc en une session.
- **Pas d'économie de tokens** — service avec 11 fonctions documentées, contrats Lock + transitions explicites.
- **Pas de fatigue** — coverage 35 sections × 5 statuses × 2 enums × index = pas de sub-set bâclé.
- **Profondeur > raccourci** — lazy seed transparent au lieu de script de backfill manuel ; lock optimistic + TTL au lieu de mutex global.

## Suite (chantiers F-C → F-H)

- **F-C** — Intent kind `GENERATE_ORACLE_SECTION` + handler ARTEMIS qui consomme le service oracle-section (pre-flight gates + dispatch via runner + persist via `recordGenerationSuccess` ou `recordGenerationFailure`).
- **F-D** — Refit `ASSEMBLE_ORACLE` comme orchestrator manual-first (boucle DAG-ordered sur `GENERATE_ORACLE_SECTION`).
- **F-E** — Progress streaming via NSP SSE channel `oracle:strategy:{id}` + events `section.STARTED/.PROGRESS/.COMPLETED/.FAILED`.
- **F-F** — UI Oracle progressive (page /cockpit/{brand}/oracle refit avec console live + sections individuelles + modal erreur Zod détaillé).
- **F-G** — Tests anti-drift CI complets (manual-first parity, section coverage, runner binding, integration end-to-end).
- **F-H** — Documentation governance complète (CODE-MAP régen, LEXICON entry, REFONTE-PLAN update).
