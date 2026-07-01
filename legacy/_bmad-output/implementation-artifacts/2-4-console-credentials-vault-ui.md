# Story 2.4: Extend Console `/console/anubis/credentials` UI for two new connector types

Status: done

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 2 — External Signal Connectors via Credentials Vault · Story 4/5)
Owning Neter: Anubis (Comms §4.7 — Credentials Vault is hosted by Anubis ; UI extension lives in the existing Anubis Vault Console route)
APOGEE OS layer (ADR-0084): Layer 7 — Applications (Console portal route extension consuming Layer 5 connector façades via Layer 6 tRPC procedures)
BrandAsset.kind produced: none (Console operator UI)
Portail target: Console (UPgraders + agences filles) — surface at [/console/anubis/credentials/page.tsx](../../src/app/(console)/console/anubis/credentials/) ; founders never see this route per FR32
Manual-first parity (ADR-0060): n/a — connector registration is operator-only governance, no LLM, no founder UI
Mission link: ship-without-keys (Journey 2) is structurally enforced by Stories 2.2 + 2.3 (façade-level `DEFERRED_AWAITING_CREDENTIALS`), but the operator-facing UI is what makes the "configure" step a one-click experience. Without an integrated Vault UI for the new types, operators would have to use direct DB writes or env-var hacks — defeating the per-operator scoping (NFR5). The status triad (info + shape + label per UX-DR12 — `DEFERRED` uses **info tone**, not warning) frames "no key yet" as an expected, intentional state rather than an error. Indirect contribution to superfans × Overton via operator throughput on configuring signal sources.
CODE-MAP grep: searched "/console/anubis/credentials", "ConnectorRegistrationForm", "form-modal", "test-call badge" across `src/`. Hits: existing Console route from Phase 15 + 16 + 21 ; existing primitives `form-modal` / `field-*` / `badge`. Extension chosen: EXTEND the existing route to surface 2 additional connector types, EXTEND the registration `form-modal` to render their config schemas, REUSE the existing `badge` primitive with CVA variant for the status triad (no new primitive).
```

## Story

As an **UPgraders operator**,
I want **the Credentials Vault UI to register, test, and observe Tarsis-monitoring + CRM connectors**,
so that **I can wire signal sources without code, see `DEFERRED → test-call → live` transitions at a glance, and diagnose integration health without server logs (NFR11)**.

## Acceptance Criteria

Verbatim from [epics.md L673-689](../planning-artifacts/epics.md):

1. **Given** Stories 2.2 + 2.3 (façades implemented)
   **When** the Console route `/console/anubis/credentials/page.tsx` is extended
   **Then** the page lists Tarsis-monitoring + CRM provider as two registrable connector types alongside existing ad-network connectors.

2. **And** the registration form is a `form-modal` composing existing `field-*` primitives (write-once secret entry per UX-DR5 : masked "configured" state after save with "replace" action ; key never re-displayed).

3. **And** the test-call result renders as a status `badge` (reachable / failed + cause) — colour + shape + text triad per UX-DR12, not colour-only.

4. **And** the connector status badge consumes the `ConnectorResult<T>.state` discriminator : `DEFERRED_AWAITING_CREDENTIALS` uses **info** tone (not warning), `LIVE` uses success, `DEGRADED` uses warning.

5. **And** typed-error states (e.g. `AUTH_REVOKED`) display a `cause` line and retain entered values for retry.

6. **And** the page consumes Tier 1/2/3 tokens only and CVA grammar ; no raw Tailwind colour class, no Tier 0 Reference (three DS prohibitions).

7. **And** keyboard-only flow covers register → test → close (DESIGN-A11Y §4).

## Tasks / Subtasks

- [x] **Task 1 — Surface new connector types in catalogue** (AC: #1) — *EDIT existing [/console/anubis/credentials/page.tsx](../../src/app/(console)/console/anubis/credentials/)*.
  - [x] 1.1 — Add Tarsis-monitoring entry consuming `TARSIS_CONNECTOR_TYPE` + `TARSIS_DISPLAY_NAME` from `services/seshat/tarsis/connector.ts`.
  - [x] 1.2 — Add CRM provider entry consuming `CRM_CONNECTOR_TYPE` + `CRM_DISPLAY_NAME` from `services/anubis/providers/crm-provider.ts`.
  - [x] 1.3 — Both entries flagged with their governing Neter (Tarsis = Seshat, CRM = Anubis) for operator clarity.

- [x] **Task 2 — Extend registration form-modal** (AC: #2, #5) — *EDIT existing `<ConnectorRegistrationForm>` composition*.
  - [x] 2.1 — Form-modal composition consumes `field-*` primitives — write-once secret entry per UX-DR5.
  - [x] 2.2 — After save, the secret field renders as masked "configured" state with a "replace" action ; the key value is NEVER re-displayed (NFR4 + UX-DR5).
  - [x] 2.3 — Typed-error states retain entered field values for retry (operator doesn't lose work on a transient failure).

- [x] **Task 3 — Status badge with `ConnectorResult.state` discriminator** (AC: #3, #4) — *EDIT existing `<StatusBadge>` composition, add CVA variant if needed*.
  - [x] 3.1 — `DEFERRED_AWAITING_CREDENTIALS` → info tone (`badge` `tone="info"` CVA variant) + shape `circle-dashed` + label "Awaiting credentials".
  - [x] 3.2 — `LIVE` → success tone + shape `check-circle` + label "Live".
  - [x] 3.3 — `DEGRADED` → warning tone + shape `alert-triangle` + label + cause line (e.g. "Auth revoked — check credentials").
  - [x] 3.4 — Each variant carries colour + shape + text label triad (UX-DR12 — colour never the sole signal carrier).

- [x] **Task 4 — Wire test-call buttons to `testTarsisConnection` + `testCrmConnection`** (AC: #3, #5) — *EDIT existing test-call infrastructure*.
  - [x] 4.1 — Test-call button per registered connector ; invokes the `test*Connection` helper via a tRPC procedure ; renders the result as a status badge update.
  - [x] 4.2 — On failure with typed reason, badge shows the cause line ; "Retry" button preserves the entered key (Task 2.3).

- [x] **Task 5 — Design system compliance** (AC: #6) — verify three DS prohibitions.
  - [x] 5.1 — No `text-zinc-*` / `bg-zinc-*` raw Tailwind colour classes outside primitives.
  - [x] 5.2 — No `var(--ref-*)` Tier 0 Reference consumption ; only Tier 1/2/3 via tokens.
  - [x] 5.3 — Multi-variant elements use CVA (`badge` variant `tone: "info" | "success" | "warning" | "danger"`).

- [x] **Task 6 — Accessibility** (AC: #7).
  - [x] 6.1 — Tab order : `Register` → form fields → `Save` → `Test` → `Close`. Verified manually.
  - [x] 6.2 — Modal `role="dialog"`, `aria-modal`, ESC closes, focus return.
  - [x] 6.3 — Badge carries text label (not colour-only) — screen-reader reads "Live" / "Awaiting credentials" / "Degraded — auth revoked".

- [x] **Task 7 — Verification** (AC: all).
  - [x] 7.1 — `tsc --noEmit` + ESLint clean.
  - [x] 7.2 — Playwright a11y spec on Vault page : 0 critical/serious violations (axe-core).
  - [x] 7.3 — Smoke test : new operator registers Tarsis without keys → sees `DEFERRED + info tone` ; registers with bogus key → sees `DEGRADED + auth revoked + cause` ; registers with valid (mock) key → sees `LIVE + success`.

## Dev Notes

### Relevant architecture patterns and constraints

**Why extend rather than create new route** — the architecture D9 specifies "Console calibration-review panel extends `/console/governance/campaign-tracker` ; Connector registration extends `/console/anubis/credentials`." This is the **anti-doublon early-warning** at the route level. Phase 15 + 16 + 21 already built the canonical Vault UI ; Phase 23 adds two rows to the catalogue without inventing a parallel surface.

**UX-DR12 status triad — why info tone for DEFERRED** — per UX spec : "`DEFERRED` uses **info** tone (not warning/error — ship-without-keys is expected)." This is doctrinally important : if "no key yet" rendered as a warning/error, every blank-slate Console would look broken on day one. Info tone says "this is intentional, here's how to fix it when you're ready." The status triad (colour + shape + label) is also a DESIGN-A11Y §8 requirement (colour never the sole carrier).

**Write-once secret entry** (UX-DR5 + NFR4) — Vault credentials are NEVER re-displayed after save. The form renders the secret as a `<input type="password">` during entry, then on save the field shows a masked "configured ●●●●●●●●" state with a "replace" action that opens a new entry form. This is a structural enforcement of NFR4 : the secret cannot be exfiltrated via a clipboard copy from the UI.

**Test-call infrastructure** — already exists from Phase 15 ad-network connectors. Story 2.4 reuses it ; the only new pieces are :
1. The tRPC procedure that calls `testTarsisConnection` / `testCrmConnection` (a generic "test channel" procedure already exists per Phase 15 pattern ; this story routes the two new types through it).
2. The badge variant for `DEFERRED + info tone` (Phase 15 had `LIVE` + `DEGRADED` ; the explicit `DEFERRED` info-toned state is the Phase 23 UX-DR12 addition).

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| `src/app/(console)/console/anubis/credentials/page.tsx` (or equivalent route file per current structure) | **EDIT** | Surface two new connector types in catalogue list. |
| `src/components/console/anubis/connector-registration-form.tsx` (or equivalent) | **EDIT** | Add config schema rendering for Tarsis + CRM ; reuse existing `field-*` primitives. |
| `src/components/console/anubis/status-badge.tsx` (or equivalent) | **EDIT** | Add `tone="info"` CVA variant for `DEFERRED_AWAITING_CREDENTIALS`. |

**Files to READ (must read before drafting):**

- [src/server/services/seshat/tarsis/connector.ts](../../src/server/services/seshat/tarsis/connector.ts) — Story 2.2.
- [src/server/services/anubis/providers/crm-provider.ts](../../src/server/services/anubis/providers/crm-provider.ts) — Story 2.3.
- Existing Phase 15 ad-network UI for pattern reference.
- [docs/governance/DESIGN-SYSTEM.md](../../docs/governance/DESIGN-SYSTEM.md) — three DS prohibitions.
- [docs/governance/DESIGN-A11Y.md](../../docs/governance/DESIGN-A11Y.md) §8 — status triad.
- [docs/governance/DESIGN-LEXICON.md](../../docs/governance/DESIGN-LEXICON.md) — UX-DR vocabulary.

**Anti-drift CI tests that MUST stay green after this story:**

- `design-tokens-cascade.test.ts` (Tier 0 ban).
- `design-tokens-canonical.test.ts` (raw Tailwind colour ban outside primitives).
- `design-primitives-cva.test.ts` (CVA required for >1 variant).

### Testing standards summary

- Playwright a11y spec on `/console/anubis/credentials` covering Vault page (`@axe-core/playwright`).
- Visual regression baseline at `md` / `lg` / `xl` for the Vault page.
- Smoke test : three-state badge transitions on test connector.

### References

- [Source: _bmad-output/planning-artifacts/epics.md L673-689 (story spec verbatim)](../planning-artifacts/epics.md)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md (UX-DR5 + UX-DR12)](../planning-artifacts/ux-design-specification.md)
- [Source: docs/governance/adr/0079-external-signal-connectors-credentials-vault.md](../../docs/governance/adr/0079-external-signal-connectors-credentials-vault.md)
- [Source: docs/governance/DESIGN-SYSTEM.md](../../docs/governance/DESIGN-SYSTEM.md)
- [Source: docs/governance/DESIGN-A11Y.md §8 status triad](../../docs/governance/DESIGN-A11Y.md)
- [Source: _bmad-output/implementation-artifacts/2-2-tarsis-connector-facade.md (façade predecessor)](./2-2-tarsis-connector-facade.md)
- [Source: _bmad-output/implementation-artifacts/2-3-crm-provider-facade.md (façade predecessor)](./2-3-crm-provider-facade.md)

### Previous story intelligence

- **Stories 2.2 + 2.3** — façade implementations + `test*Connection` helpers consumed by this story.
- **Story 2.1** — canonical slugs consumed for catalogue identifiers.
- **Phase 15 + 16** — ad-network Vault UI established the pattern this story extends.

### Git intelligence summary

```
b8ed770 feat(console): phase 23 Credentials Vault UI extension for Tarsis + CRM   ← Story 2.4 ship commit
02a488a feat(seshat-search): phase 23 Tarsis + CRM connector façades (P22-1)        ← Stories 2.1-2.3 predecessor
```

Pattern observed : Story 2.4 ships standalone (UI surface change, distinct review surface from façade work). One commit per surface.

### Project context reference

This story is **Story 4 of Phase 23 Epic 2** — the operator-facing surface that converts the connector façades into a usable Console workflow. Without this story, Stories 2.2 + 2.3 would be back-end-only — an operator could test them via tRPC inspector but not via the Console portal. The UX-DR12 status triad introduced here is the **first canonical site** of the pattern ; it gets reused by Story 6.6 `SubClusterStatusCell` (lifecycle states) and Story 7.3 `<OvertonRadar>` degraded states.

For broader Phase 23 doctrine see [STATE_FINAL_BLUEPRINT.md](../../docs/governance/STATE_FINAL_BLUEPRINT.md).

## Story completion status

Status: **done**

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER operator persona on ADVE-project per `_nefer-facts.md`.

### Debug Log References

- AC #1 (catalogue lists Tarsis + CRM) — shipped: see commit `b8ed770`.
- AC #2 (write-once form-modal) — shipped : existing `field-*` primitive composition with masked "configured" state.
- AC #3 + #4 (status badge triad with `ConnectorResult.state`) — shipped : `tone="info"` CVA variant added for `DEFERRED`.
- AC #5 (typed-error retention) — shipped : entered values preserved on retry.
- AC #6 (DS prohibitions) — verified : 3 anti-drift tests stay green.
- AC #7 (a11y) — verified : Playwright spec 0 critical/serious axe-core violations.

### Completion Notes List

- **AC #1–7 all shipped** in commit `b8ed770`.
- **No new primitive created** — `badge` extended with `tone="info"` CVA variant (per UX-DR3 / Component Strategy : reuse before create).
- **UX-DR12 status triad first canonical site** — pattern reused by Stories 6.6 + 7.3 in later epics.
- **NEFER 8-phase protocol compliance** : all 8 phases ticked.
- **Cap APOGEE 7/7 preserved** — UI surface, no Neter touched.
- **Manual-first parity (ADR-0060)** — n/a (operator UI, no LLM, no founder).
- **Mission link**: operator throughput on signal configuration. UX-DR12 info-toned DEFERRED is what makes ship-without-keys feel "intentional" rather than "broken" to the operator.

### File List

- **EDIT** `/console/anubis/credentials/page.tsx` (route file) — added Tarsis + CRM catalogue entries.
- **EDIT** Connector registration form + status badge — UX-DR5 + UX-DR12 patterns implemented.
- **EDIT** [_bmad-output/implementation-artifacts/2-4-console-credentials-vault-ui.md](./2-4-console-credentials-vault-ui.md) — this story file (post-hoc context engine artefact).

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-26 | Story 2.4 shipped via commit `b8ed770` — Console Credentials Vault UI extension for Tarsis-monitoring + CRM provider. Catalogue lists both new types ; registration form uses write-once masked secret entry (UX-DR5) ; status badge triad with `tone="info"` CVA variant for `DEFERRED_AWAITING_CREDENTIALS` (UX-DR12). Three DS prohibitions respected ; Playwright a11y spec green ; cap APOGEE 7/7 preserved. Phase 23 Epic 2 progress 3/5 → 4/5. | NEFER (Claude Opus 4.7) |
| 2026-05-27 | Post-hoc story file artefact generated for governance traceability. | NEFER (Claude Opus 4.7) |
