# Refonte Governance — Baseline (2026-04-28)

Snapshot taken at the start of the Phase 0/1 implementation pass. Used as the
reference point for all subsequent metric improvements (cf. *Métriques de
succès du programme* in `REFONTE-PLAN.md`).

## Repository state

- **Branch**: `main` at commit `a7d1266` (CI workflows scaffold landed).
- **Stack version**: `package.json` reports `4.0.0-alpha.0` (out of sync —
  reality is V5.4 per `CLAUDE.md`). Phase 7 will sync.
- **Routers**: 71 tRPC routers under `src/server/trpc/routers/`.
- **Services**: ~110 service modules under `src/server/services/`.

## Quantitative baseline

| Metric | Value | Target (post-refonte) | Source |
|---|---|---|---|
| Hardcoded pillar enum literals (`["A","D","V","E"...]`) outside `src/domain/` | 28 occurrences across 14 files | 0 (lint `error` after Phase 1) | `grep -rn '\["A", "D", "V", "E"' src/` |
| Routers importing services directly (bypass governance) | 37 / 71 routers (52%) | 0 (lint `error` after Phase 3) | `grep -l "from \"@/server/services/" src/server/trpc/routers/*.ts` |
| Circular dependencies | 1 (`advertis-scorer/index.ts ↔ structural.ts`) | 0 (`madge --circular` exit 0 after Phase 4) | `madge --circular --extensions ts,tsx src/` |
| Lazy `await import()` calls (server) | 157 | ≤ whitelist (Phase 4) | `grep -rn "await import" src/server/` |
| Numbered duplicate folders (`* 2/`) | ≥ 5 (`landing 2`, `notoria 2`, `financial-brain 2`, `advertis-connectors 2`, `advertis-inbound 2`) | 0 (Phase 7 + lint rule) | `find src -type d -name '* 2'` |
| `db push` policy | live-edit on `prisma/schema.prisma` permitted | versioned migrations only (Phase 6) | inspection |
| Custom ESLint rules in repo | 0 | 4+ (`lafusee/no-direct-service-from-router`, `no-cross-portal-import`, `no-hardcoded-pillar-enum`, `no-numbered-duplicates`) | `ls eslint-plugin-lafusee/` |
| Husky pre-commit hooks | absent | active with phase-label + commitlint | `ls .husky/` |
| `IntentEmission` audit rows generated in dev | not yet measured | 100% of mutations after Phase 3 | `select count(*) from "IntentEmission"` |

## Files identified by Phase 1 sweep

Hardcoded uppercase pillar literals still residing outside `src/domain/`
(post-migration of routers/pillar-schemas/notoria/ingestion):

UI (lowercase storage form is acceptable, will be tackled gradually):
- `src/app/(console)/console/oracle/ingestion/page.tsx`
- `src/app/(console)/console/oracle/brands/page.tsx`
- `src/app/(cockpit)/cockpit/brand/rtis/page.tsx`

Backend (Phase 1 follow-up):
- `src/server/services/ingestion-pipeline/{index,ai-filler}.ts`
- `src/server/services/advertis-scorer/semantic.ts`
- `src/server/services/artemis/tools/registry.ts`
- `src/server/services/seshat/tarsis/index.ts`
- `src/server/services/mestor/{index,insights,rtis-cascade}.ts`
- `src/server/services/ecosystem-engine/index.ts`
- `src/server/services/implementation-generator/index.ts`
- `src/lib/types/field-registry.ts`

These migrate to `import { PILLAR_KEYS, ADVE_KEYS } from "@/domain"` in
follow-up PRs labeled `phase/1`.

## Already-completed in this baseline pass

- ✅ `src/domain/{pillars,lifecycle,touchpoints,intent-progress,index}.ts`
  + `__tests__/pillars.test.ts` (9/9 passing).
- ✅ `src/server/services/ingestion-pipeline/types.ts` re-exports from
  `@/domain` (no longer a duplicate source).
- ✅ `src/lib/types/advertis-vector.ts` aliases `PILLAR_KEYS` to the
  storage form re-exported from `@/domain`.
- ✅ `src/lib/types/pillar-schemas.ts` consumes `PILLAR_KEYS` /
  `ADVE_KEYS` from `@/domain`.
- ✅ `src/server/trpc/routers/{pillar,notoria,ingestion}.ts` consume Zod
  enums from `@/domain` instead of inline `z.enum([...])`.

## Definition of "improvement"

For every Phase merged, the corresponding metric in the table above must
move strictly toward target. CI gates (Phase 0) prevent regression. The
hash-chain on `IntentEmission` (Phase 3) prevents silent reversion of audit
posture once it lands.
