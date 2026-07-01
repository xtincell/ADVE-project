# Story 5.5: Surface HYBRID tools in `/console/artemis/tools` with peer-toggle UI

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 ✓ (DS) C6 ✓ (operator/governed procedures)
Phase label: phase/23 (Epic 5 — Measurement Glory Tools HYBRID · Story 5/6)
Owning Neter: Artemis (tools catalogue) + Mestor (governed mutation)
APOGEE OS layer (ADR-0084): Apps (Console) + APIs (tRPC)
BrandAsset.kind produced: none (executes measurement tools)
Portail target: Console (/console/artemis/tools)
Manual-first parity (ADR-0060): both peer paths dispatch through executeHybridTool — manual is a peer, not a buried fallback (UX-DR13)
CODE-MAP grep: extended existing catalogue route + glory router. New component under src/components/console (DS-compliant).
```

## Story

As an UPgraders operator, I want each HYBRID Glory tool surfaced with the manual form visible as a peer toggle BEFORE any error, so I can deliberately choose the manual path (UX-DR13).

## Acceptance Criteria

Verbatim from [epics.md L1044-1051](../planning-artifacts/epics.md). Two equal-weight peer tabs "LLM run" / "Manual entry" (no buried-fallback) ; LLM progress streams into `role="status" aria-live="polite"` (UX-DR17) ; manual form `form-single-column` (UX-DR9) ; tab switch preserves entered data ; LLM Zod-fail drops on the same manual form ; keyboard-only flow ; reads via `operatorProcedure`, mutations via `governedProcedure`.

## Tasks / Subtasks

- [x] **Task 1 — Router reads** — `glory.getManualForm` (`operatorProcedure`) → JSON-Schema projection of `manualFormSchema`.
- [x] **Task 2 — Router mutation** — `glory.executeHybrid` (`governedProcedure`, kind `LEGACY_GLORY_EXECUTE`) → `executeHybridTool({ preferManual, manualEntry })`.
- [x] **Task 3 — Serialization fix** — `getBySlug` strips Zod instances (`outputSchema` / `manualFormSchema`) — not tRPC-serializable.
- [x] **Task 4 — Panel component** — `src/components/console/hybrid-tool-panel.tsx` : peer tabs, schema-driven form (string/number/boolean/enum/JSON widgets from the JSON Schema), strategy picker, `aria-live` status region, result viewer. Tab state + form state live in the component (switching tabs keeps data). DS-compliant : semantic tokens only, no raw color classes, no CVA-required multi-variant inline.
- [x] **Task 5 — Modal wiring** — page renders `<HybridToolPanel>` in the tool-detail modal when `executionType === "HYBRID"` ; `HYBRID` added to `EXEC_BADGE` + exec-type count + stats `byExecutionType`.
- [x] **Task 6 — Verification** — tsc clean ; eslint clean ; DS canonical/cascade/cva green. Browser live-data verification deferred (see Dev Notes).

## Dev Notes

**UX-DR17 "streams over NSP SSE" — pragmatic interpretation.** Glory tool execution is synchronous (the governed mutation awaits the LLM with retry ×2) ; there is no per-tool NSP event channel (the existing SSE stream is Oracle-section-specific). The panel implements the UX-DR17 *intent* via a `role="status" aria-live="polite"` region that announces pending → done/failed/manual-required states. A dedicated per-tool SSE channel would be disproportionate for a synchronous call and is not wired ; noted for a future enhancement if glory execution becomes async.

**DB blocker — browser verification deferred.** The catalogue reads (`listAll`, `getBySlug`, `getManualForm`) are static-registry-backed and render, but `executeHybrid` needs a strategy + DB, and the local dev DB has a pre-existing failed migration (handoff 2026-05-28 08:15). Per the autopilot doctrine (investigate unexpected state, don't take destructive shortcuts), the DB was not reset. Verified via tsc + eslint + DS anti-drift + component/page compile. Live execution of the peer-toggle remains blocked until the dev DB is repaired — operator decision.

**DS compliance.** All new markup uses semantic tokens (`text-foreground*`, `border-border`, `bg-background`, `bg-accent`, `text-accent`, `text-error`) — verified by `design-tokens-canonical` / `design-tokens-cascade` / `design-primitives-cva` (all green). The existing page's raw-color classes (grandfathered, `src/app/**`) were left untouched.

### File List
- **EDIT** [src/server/trpc/routers/glory.ts](../../src/server/trpc/routers/glory.ts) — `getManualForm` + `executeHybrid` + `getBySlug` Zod strip + stats HYBRID count.
- **NEW** [src/components/console/hybrid-tool-panel.tsx](../../src/components/console/hybrid-tool-panel.tsx)
- **EDIT** [src/app/(console)/console/artemis/tools/page.tsx](../../src/app/(console)/console/artemis/tools/page.tsx)

## Dev Agent Record

### Agent Model Used
Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER autopilot.

### Completion Notes List
- Peer tabs are equal visual weight ; manual form is schema-driven (not hand-coded).
- `operatorProcedure` read + `governedProcedure` mutation (C6 governance honored).
- Cap APOGEE 7/7 preserved.

### Change Log
| Date | Change | Author |
|---|---|---|
| 2026-05-28 | Story 5.5 shipped — HYBRID peer-toggle in Console catalogue + `getManualForm`/`executeHybrid` procedures + DS-compliant panel. Browser live-data verification deferred behind dev-DB repair. | NEFER (Claude Opus 4.7) |
