# Story 7.9: Retire 5 dangling ADR refs + finalize ADRs 0077–0081

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 7 · Story 9/10)
Owning Neter: Mestor (governance closure)
APOGEE OS layer (ADR-0084): governance docs + anti-drift CI
Mission link: closes the last narrative-drift loose end (NEFER §3.2 #3) so Phase 23 ships clean.
```

## Acceptance Criteria

Verbatim [epics.md L1330-1334](../planning-artifacts/epics.md). Repo-wide grep for the 5 phantom slugs → **0 hits** in `src/` + `docs/` + `tests/` ; ADRs 0077–0081 filled + status `Accepted` (no longer stubs) ; HARD `phase22-no-dangling-adr-refs.test.ts` activated (0 hits) ; `pnpm test` green.

## Tasks / Subtasks

- [x] **Task 1 — retire in `src/`** — `capability-state.ts` (4 `childAdr` pointers → bare `0081`/`0078`/`0077` + 1 comment) ; `signals-culture.ts` + `learnings.ts` + `phase19-tools.ts` ×3 + `postmortem/page.tsx` comment refs → successor ADR / ADR-0052.
- [x] **Task 2 — retire in `tests/`** — `superfan-economy.connector.test.ts` assertion rewritten to a `/^005[3-7]-/` phantom-prefix pattern (no literal slug) ; the HARD test itself builds the 5 slugs from fragments + excludes its own path.
- [x] **Task 3 — retire in `docs/`** — ADR-0077 §8 retirement table + frontmatter use bare `ADR-00NN (descriptor)` ; ADR-0052 / 0060 / 0061 / 0062 / RESIDUAL-DEBT.md refs → successor or `phantom ADR-00NN`.
- [x] **Task 4 — finalize child ADRs** — 0078 / 0079 / 0080 / 0081 status `Accepted (stub — …)` → `Accepted` ; supersedes lines de-slugged. ADR-0077 already fully written + Accepted.
- [x] **Task 5 — activate HARD test** — `phase22-no-dangling-adr-refs.test.ts` scans `src/`+`docs/`+`tests/` for the 5 slugs, asserts 0 hits. Green.

## Dev Notes

**Retirement record uses bare numbers, not glued slugs.** The banned tokens are the full kebab slugs (`0055-overton-algo`) ; bare `ADR-0055` + a parenthetical descriptor `(overton-algo)` is NOT a match (the `0055` is followed by a space, not `-overton`). So ADR-0077 §8 keeps a fully readable retirement record while the global scan hits 0. **Arbitrage logged** — chose "retire the slug everywhere incl. docs, keep the record at the number level" over "exclude docs/adr from the scan", giving the cleaner long-term invariant (no kebab slug strings anywhere in the repo).

**Mapping (ADR-0077 §8)** : 0053→0081, 0054→0081, 0055→0078, 0056→retired (Glory tool `postmortem-12q` inline, cf. ADR-0052/0077), 0057→retired (re-promoted Epic 5 via `applicableNatures`, cf. ADR-0052/0077).

### File List
- **EDIT** capability-state.ts, signals-culture.ts, learnings.ts (campaign-tracker) ; phase19-tools.ts (artemis) ; postmortem `page.tsx`.
- **EDIT** tests: superfan-economy.connector.test.ts.
- **EDIT (activate)** [tests/unit/governance/phase22-no-dangling-adr-refs.test.ts](../../tests/unit/governance/phase22-no-dangling-adr-refs.test.ts) — HARD, 0 hits.
- **EDIT** docs: adr/0077, 0078, 0079, 0080, 0081, 0052, 0060, 0061, 0062 ; RESIDUAL-DEBT.md.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.7 (1M context). NEFER autopilot.

### Completion Notes List
- tsc clean ; eslint clean (2 pre-existing pillar-enum warnings in phase19-tools, unrelated) ; **860 governance + campaign-tracker tests green** incl. the newly-HARD `phase22-no-dangling-adr-refs`.

### Change Log
| Date | Change | Author |
|---|---|---|
| 2026-05-29 | Story 7.9 — 5 phantom ADR slugs retired repo-wide (0 hits, HARD) ; ADRs 0078-0081 finalized Accepted. | NEFER (Claude Opus 4.7) |
