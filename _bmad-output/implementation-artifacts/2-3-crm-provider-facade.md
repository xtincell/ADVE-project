# Story 2.3: Implement CRM provider façade with field-level PII redaction

Status: done

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 2 — External Signal Connectors via Credentials Vault · Story 3/5)
Owning Neter: Anubis (Comms §4.7 — CRM provider is an Anubis Vault entry per ADR-0079 ; CRM signal is "addressing data" semantically aligned with Anubis' broadcast/address remit)
APOGEE OS layer (ADR-0084): Layer 5 — Services (connector façade with Vault dependency + PII redaction logic)
BrandAsset.kind produced: none (signal ingress façade)
Portail target: none runtime — façade at [src/server/services/anubis/providers/crm-provider.ts](../../src/server/services/anubis/providers/crm-provider.ts) ; consumed by Story 4.3 (superfan-economy cohort retention) + Story 2.4 (Console Vault UI)
Manual-first parity (ADR-0060): n/a — signal ingress ; manual peer for superfan attribution lives in Story 4.5
Mission link: PII redaction at the façade boundary is non-negotiable (NFR6) — it's the structural enforcement of "we measure superfans, we never persist customer names." Without redaction at this layer, every downstream cohort consumer would have to remember to redact, and one forgotten branch would leak raw PII into Postgres logs / metrics / NSP events. By redacting BEFORE any cohort row leaves this module, the rest of the OS treats cohort tokens as opaque IDs — the founder can claim "this campaign produced N evangelists" without us ever knowing who the N persons are. Indirect contribution to superfans × Overton via the trust-and-compliance pillar.
CODE-MAP grep: searched "crm-provider", "fetchCohortSignal", "CrmCohortSignal", "PII redaction", "cohortTokens" across `src/`. Hits: 0 prior CRM façade. Existing PII handling in `services/anubis/providers/mcp-content-pii-classifier.ts` is a Glory tool for inbound MCP context (Story 3.5) — distinct surface, distinct concern. Extension chosen: NEW file at canonical Anubis providers path ; redaction logic inline (hard-coded `REDACTED_FIELDS` constant, not configurable).
```

## Story

As an **UPgraders operator**,
I want **the CRM provider connector façade to return `ConnectorResult<CrmCohortSignal>` with field-level PII redaction applied BEFORE any cohort row leaves the façade**,
so that **Epic 4's `superfan-economy.ts` consumes cohort retention signal through the standardised shape, and customer PII never persists raw in our tenant (NFR6)**.

## Acceptance Criteria

Verbatim from [epics.md L657-671](../planning-artifacts/epics.md):

1. **Given** Story 1.3 (`ConnectorResult<T>`) and Story 2.1 (Vault registration)
   **When** `services/anubis/providers/crm-provider.ts` is created
   **Then** the file exports `fetchCohortSignal(operatorId: string, brandId: string, window: CrmCohortWindow): Promise<ConnectorResult<CrmCohortSignal>>` where `CrmCohortSignal = { cohortSize, retained, retentionRate, cohortTokens, cohortStartedAt, windowAt, _mocked? }`.

2. **And** field-level PII redaction is applied before any cohort row leaves the façade : email / phone / name fields hashed to a stable opaque token (`SHA-256(value).slice(0, 16)`) usable for cohort joining but unusable for re-identification. The `REDACTED_FIELDS` constant is **hard-coded** in the façade — never configurable at runtime (a runtime toggle would create a path to accidentally disable redaction, NFR6 invariant).

3. **And** absent credentials → `DEFERRED_AWAITING_CREDENTIALS` ; transient failure → `DEGRADED` with typed reason ; cohort size below `MIN_COHORT_SIZE` (30) → `DEGRADED + INSUFFICIENT_DATA`.

4. **And** the façade reads credentials per-`Operator` via `credentialVault.get` (NFR5).

5. **And** the file also exports `testCrmConnection(operatorId)` helper for the Console Vault UI test-call badge (NFR11).

6. **And** Vitest unit tests cover all three states + the redaction contract (raw PII never appears in returned `LIVE` data).

## Tasks / Subtasks

- [x] **Task 1 — Define `CrmCohortSignal` payload interface + `CrmCohortWindow` enum** (AC: #1) — *NEW types in [crm-provider.ts L65-93](../../src/server/services/anubis/providers/crm-provider.ts)*.
  - [x] 1.1 — `CrmCohortWindow = "J+30" | "J+90" | "J+180"` — the three windows the architecture targets.
  - [x] 1.2 — `CrmCohortSignal` carries cohort size + retained + retention rate + opaque cohort tokens (16-hex-char hashes) + window metadata + `_mocked` flag.
  - [x] 1.3 — `cohortTokens: ReadonlyArray<string>` — immutable, prevents accidental in-place mutation.

- [x] **Task 2 — Hard-code `REDACTED_FIELDS` + `piiHash` + `deriveCohortToken`** (AC: #2) — *NEW logic in [crm-provider.ts L101-126](../../src/server/services/anubis/providers/crm-provider.ts)*.
  - [x] 2.1 — `REDACTED_FIELDS = ["email", "phone", "name", "fullName", "firstName", "lastName"] as const` — hard-coded, not env-var.
  - [x] 2.2 — `piiHash(value)` = SHA-256 truncated to 16 hex chars (enough entropy for cohort-internal uniqueness, not enough for re-identification).
  - [x] 2.3 — `deriveCohortToken(record)` iterates `REDACTED_FIELDS` priority order (email → phone → name composite) ; returns null if no identifier available (row dropped).

- [x] **Task 3 — Implement `fetchCohortSignal(operatorId, brandId, window)`** (AC: #1, #3, #4) — *NEW export in [crm-provider.ts L139-188](../../src/server/services/anubis/providers/crm-provider.ts)*.
  - [x] 3.1 — Step 1 : Vault credential check ; absent → `DEFERRED_AWAITING_CREDENTIALS`.
  - [x] 3.2 — Step 2 : call internal `fetchAndRedactCohort` (which returns the empty-cohort mock during Phase 23).
  - [x] 3.3 — Step 3 : if cohort size < `MIN_COHORT_SIZE` (30) → `DEGRADED + INSUFFICIENT_DATA`.
  - [x] 3.4 — Step 4 : otherwise `LIVE` with `_mocked: true` discriminator until SDK lands.
  - [x] 3.5 — Step 5 : try/catch → `DEGRADED + VENDOR_OUTAGE`. Never throws across boundary.

- [x] **Task 4 — Implement `testCrmConnection(operatorId)` helper** (AC: #5) — *NEW export in [crm-provider.ts L194-205](../../src/server/services/anubis/providers/crm-provider.ts)*.
  - [x] 4.1 — Returns `{ success: boolean; reason?: string }`.

- [x] **Task 5 — Export `fetchAndRedactCohort` for unit testing of redaction** (AC: #2, #6) — *NEW @internal export in [crm-provider.ts L215-234](../../src/server/services/anubis/providers/crm-provider.ts)*.
  - [x] 5.1 — Returns cohort metadata after redaction has been applied.
  - [x] 5.2 — Marked `@internal` — not part of the public API surface but exposed for the redaction-contract test.

- [x] **Task 6 — Verification** (AC: all).
  - [x] 6.1 — `tsc --noEmit` clean.
  - [x] 6.2 — Vitest covers : (a) absent credential → DEFERRED, (b) credential present + cohort < 30 → DEGRADED INSUFFICIENT_DATA, (c) thrown exception → DEGRADED VENDOR_OUTAGE, (d) redaction contract : feeding raw row `{ email: "alice@example.com" }` produces a 16-hex-char token, never the original string.

## Dev Notes

### Relevant architecture patterns and constraints

**Why redaction is hard-coded** (NFR6 invariant) — the architecture step-04 specifies "redaction list configurable per connector instance" in passing, but the actual implementation lands the redaction list as a hard-coded `as const` array. Justification : a runtime configuration creates a path to accidentally disable redaction. A future "redact_email_only: false" toggle (perhaps to debug an integration issue) would silently bypass NFR6. The decision to hard-code is documented in the file header docblock + matches ADR-0046's spirit (no-magic-fallback : the system never silently downgrades a safety property).

**Why 16 hex chars** — SHA-256 truncated to 16 hex chars is 64 bits of entropy. The birthday-paradox collision threshold is √(2^64) = 2^32 ≈ 4 billion records, far exceeding any realistic cohort size. The truncation prevents storing the full hash (which could be brute-forced for short PII like phone numbers via rainbow table) while preserving cohort-join utility. The decision is documented inline.

**Mock period — empty cohort** (Phase 23) — Phase 23 ships with `fetchAndRedactCohort` returning an empty cohort. This means `fetchCohortSignal` will always return `DEGRADED + INSUFFICIENT_DATA` during the mock period — even when credentials are present. Three properties :
1. **Ship-without-keys + ship-with-fake-keys both honest** — downstream `superfan.stickiness` (Story 4.3) sees INSUFFICIENT_DATA and renders its empty state.
2. **Calibration gate safety** — Story 6.3's Mestor gate would refuse PRODUCTION on a calibration snapshot built from this mock (cohort size 0 falls below the 30-row minimum sample threshold).
3. **Redaction path coverage** — even though no real rows flow through the redaction logic in the mock period, the redaction CODE is covered by unit tests (Task 6.2 test (d)) ensuring the contract is enforced when the real SDK lands.

**`fetchAndRedactCohort` is exported `@internal`** — it's needed for the redaction-contract test (raw PII → opaque token) but not for any production consumer. The `@internal` tag tells linters / external consumers "this is not part of the public API surface, don't import it from another package." Standard pattern across the codebase.

**Cohort token stability** — `piiHash` uses `value.trim().toLowerCase()` before hashing : `"ALICE@example.com"` and `" alice@example.com "` produce the same token. This is intentional — CRMs are notoriously inconsistent with whitespace + case. Cohort joins should not fail because Mailchimp stores "alice@" and HubSpot stores "ALICE@".

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| [src/server/services/anubis/providers/crm-provider.ts](../../src/server/services/anubis/providers/crm-provider.ts) | **NEW** | The façade + redaction logic + cohort-token derivation. |
| [tests/unit/services/anubis/providers/crm-provider.test.ts](../../tests/unit/services/anubis/providers/crm-provider.test.ts) | **NEW** | Three-state + redaction-contract coverage. |

**Files to READ (must read before drafting):**

- [src/domain/connector-result.ts](../../src/domain/connector-result.ts) — Story 1.3.
- [src/server/services/anubis/credential-vault.ts](../../src/server/services/anubis/credential-vault.ts) — Vault contract.
- [docs/governance/adr/0079-external-signal-connectors-credentials-vault.md](../../docs/governance/adr/0079-external-signal-connectors-credentials-vault.md).
- [docs/governance/adr/0046-no-magic-fallback.md](../../docs/governance/adr/0046-no-magic-fallback.md).
- Architecture step-04 §"NFR6 PII redaction".

**Anti-drift CI tests that MUST stay green after this story:**

- [tests/unit/governance/phase22-connector-result.test.ts](../../tests/unit/governance/phase22-connector-result.test.ts) — Story 2.5 HARD activation includes AST scan of this file for the P22-1 pattern (`?? 0` ban, `try/catch → DEGRADED never LIVE`).

### Testing standards summary

- Three-state ConnectorResult coverage + dedicated redaction-contract test.
- Redaction-contract test feeds raw PII into `fetchAndRedactCohort` and asserts (a) returned tokens are 16-hex-char strings, (b) original PII string is absent from the returned payload.

### References

- [Source: _bmad-output/planning-artifacts/epics.md L657-671](../planning-artifacts/epics.md)
- [Source: docs/governance/adr/0079-external-signal-connectors-credentials-vault.md](../../docs/governance/adr/0079-external-signal-connectors-credentials-vault.md)
- [Source: docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md §"Pattern P22-1"](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md)
- [Source: _bmad-output/implementation-artifacts/1-3-connector-result-shared-discriminated-union.md (type predecessor)](./1-3-connector-result-shared-discriminated-union.md)
- [Source: _bmad-output/implementation-artifacts/2-1-register-connector-types-credentials-vault.md (slug predecessor)](./2-1-register-connector-types-credentials-vault.md)

### Previous story intelligence

- **Story 1.3** — `ConnectorResult<T>` type ; imported.
- **Story 2.1** — `CRM_CONNECTOR_TYPE` slug exported from this file ; Story 2.4 + Story 4.3 import it.
- **Story 2.2** — Tarsis sibling façade ; this story mirrors its mock-period strategy + try/catch contract.

### Git intelligence summary

```
02a488a feat(seshat-search): phase 23 Tarsis + CRM connector façades (P22-1)   ← bundled Stories 2.1 + 2.2 + 2.3 ship commit
```

### Project context reference

This story is **Story 3 of Phase 23 Epic 2** — the structural enforcement of Pattern P22-1 + NFR6 for the superfan mechanic's signal ingress. The redaction-at-the-boundary pattern is the load-bearing invariant : the rest of the OS treats cohort tokens as opaque IDs, so any future cohort-feature can ship without re-deriving the PII handling rules.

For broader Phase 23 doctrine see [STATE_FINAL_BLUEPRINT.md](../../docs/governance/STATE_FINAL_BLUEPRINT.md).

## Story completion status

Status: **done**

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER operator persona on ADVE-project per `_nefer-facts.md`.

### Debug Log References

- AC #1 (façade signature + `CrmCohortSignal` shape) — shipped: see [crm-provider.ts L139-188](../../src/server/services/anubis/providers/crm-provider.ts).
- AC #2 (hard-coded `REDACTED_FIELDS` + `piiHash` + `deriveCohortToken`) — shipped: L101-126.
- AC #3 (three states + INSUFFICIENT_DATA branch on small cohort) — shipped: L139-188.
- AC #4 (per-operator Vault) — shipped: `credentialVault.get(operatorId, CRM_CONNECTOR_TYPE)` L145.
- AC #5 (`testCrmConnection`) — shipped: L194-205.
- AC #6 (Vitest three-state + redaction-contract) — shipped via commit `02a488a`.

### Completion Notes List

- **AC #1–6 all shipped** in commit `02a488a` (bundled with Stories 2.1 + 2.2).
- **PII redaction is hard-coded by design** — runtime configurability would create a path to accidentally disable NFR6.
- **Mock period — empty cohort** : Phase 23 returns `DEGRADED + INSUFFICIENT_DATA` always until real SDK + cohort data flow ; calibration gate (Story 6.3) gate-keeps PRODUCTION promotion.
- **NEFER 8-phase protocol compliance** : all 8 phases ticked.
- **Cap APOGEE 7/7 preserved** — connector façade is a Vault entry, not a Neter.
- **Manual-first parity (ADR-0060)** — n/a (signal ingress).
- **Mission link**: NFR6 structural enforcement. "We measure superfans, we never persist customer names" is a compliance + trust posture baked into the architecture.

### File List

- **NEW** [src/server/services/anubis/providers/crm-provider.ts](../../src/server/services/anubis/providers/crm-provider.ts) — 234-line façade : `CRM_CONNECTOR_TYPE` + `CrmCohortWindow` + `CrmCohortSignal` + `REDACTED_FIELDS` + `piiHash` + `deriveCohortToken` + `fetchCohortSignal` + `testCrmConnection` + `fetchAndRedactCohort` (@internal).
- **NEW** [tests/unit/services/anubis/providers/crm-provider.test.ts](../../tests/unit/services/anubis/providers/crm-provider.test.ts) — three-state + redaction contract.
- **EDIT** [_bmad-output/implementation-artifacts/2-3-crm-provider-facade.md](./2-3-crm-provider-facade.md) — this story file (post-hoc context engine artefact).

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-25 | Story 2.3 shipped (bundled in commit `02a488a` with Stories 2.1 + 2.2) — CRM provider façade at `services/anubis/providers/crm-provider.ts` returning `ConnectorResult<CrmCohortSignal>` with hard-coded field-level PII redaction (`REDACTED_FIELDS` const + SHA-256 truncated to 16 hex chars). Mock period : empty cohort → always `DEGRADED + INSUFFICIENT_DATA` until real SDK lands. Cap APOGEE 7/7 preserved. Phase 23 Epic 2 progress 2/5 → 3/5. | NEFER (Claude Opus 4.7) |
| 2026-05-27 | Post-hoc story file artefact generated for governance traceability. | NEFER (Claude Opus 4.7) |
