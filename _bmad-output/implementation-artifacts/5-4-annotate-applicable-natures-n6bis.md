# Story 5.4: Annotate `applicableNatures` on the 5 migrated tools (N6-bis closure)

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 5 — Measurement Glory Tools HYBRID · Story 4/6)
Owning Neter: Mestor (governance — Phase 18 residual ledger) + Artemis (tools)
APOGEE OS layer (ADR-0084): Services + governance
BrandAsset.kind produced: none
Portail target: Console (phase18-residuals)
Manual-first parity (ADR-0060): n/a (annotation)
CODE-MAP grep: `applicableNatures` already exists on GloryToolDef (Phase 18-N6, ADR-0061) — annotation, no new entity.
```

## Story

As a NEFER operator, I want every Phase 23-touched Glory tool annotated with `applicableNatures`, so Phase 18 N6-bis residual debt closes inside Phase 23 — these 5 tools no longer count toward `phase18ResidualEntry pending`.

## Acceptance Criteria

Verbatim from [epics.md L1029-1034](../planning-artifacts/epics.md). Each tool declares `applicableNatures: BrandNature[]` (≥ `["PRODUCT"]`, others per semantics) ; the `phase18ResidualEntry` rows for these 5 tools move to `RESOLVED` ; the field is type-required when HYBRID ; the resolve-on-annotation test passes (else a one-shot residual update is logged).

## Tasks / Subtasks

- [x] **Task 1 — Annotate** — `applicableNatures` set on all 5 tools, made type-required by the Story 5.1 factory (non-empty tuple).
- [x] **Task 2 — Nature choices** — `ALL_NATURES` (9) for coherence / crew / negative-space / PII ; narrative subset for myth-arc (`CHARACTER_IP, MEDIA_IP, FESTIVAL_IP, PERSONAL, PRODUCT, SERVICE, INSTITUTION, PLATFORM`).
- [x] **Task 3 — Residual ledger** — see Dev Notes (one-shot log path).
- [x] **Task 4 — Verification** — Story 5.6 asserts `applicableNatures` non-empty per tool.

## Dev Notes

**Residual-entry resolution is data, not code.** The `phase18ResidualEntry` rows live in the dev/prod DB (model `Phase18ResidualEntry`, router `phase18Residuals.resolve`). The local dev DB is currently blocked by a pre-existing failed migration (handoff 2026-05-28 08:15), so the resolve mutation cannot run here. Per the AC's escape hatch ("else a one-shot manual residual-entry update is logged"), the resolution of the 5 "Glory tool natures annotation" rows for these specific slugs is logged for an operator to run via `phase18Residuals.resolve` once the dev DB is repaired. The **structural** closure (the annotation itself + the HARD test forbidding empty `applicableNatures` on HYBRID) is shipped in code now ; the ledger row flip is a DB write deferred behind the DB repair.

**N6-bis is broader than these 5.** Closure target #4 (Phase 25) annotates all 56 Glory tools. Story 5.4 only closes the 5 Phase 23-touched measurement tools — the rest stay in the residual ledger.

### File List
- **EDIT** [src/server/services/artemis/tools/phase19-tools.ts](../../src/server/services/artemis/tools/phase19-tools.ts) (same edit as Story 5.3 — `applicableNatures` added alongside the HYBRID migration)

## Dev Agent Record

### Agent Model Used
Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER autopilot.

### Completion Notes List
- Structural closure shipped ; the 5 `phase18ResidualEntry` row flips are deferred behind the dev-DB repair (logged for operator).
- Cap APOGEE 7/7 preserved.

### Change Log
| Date | Change | Author |
|---|---|---|
| 2026-05-28 | Story 5.4 shipped — `applicableNatures` annotated on the 5 measurement tools (type-required via factory) ; ledger row flips deferred behind dev-DB repair. | NEFER (Claude Opus 4.7) |
