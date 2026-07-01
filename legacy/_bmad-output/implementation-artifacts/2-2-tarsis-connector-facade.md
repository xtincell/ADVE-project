# Story 2.2: Implement Tarsis-monitoring façade returning `ConnectorResult<TarsisSignal>`

Status: done

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 2 — External Signal Connectors via Credentials Vault · Story 2/5)
Owning Neter: Seshat (Telemetry — Tarsis is a Seshat sub-system §4.3 ; external `tarsis-monitoring` connector is a Vault entry under Seshat's governance per ADR-0079)
APOGEE OS layer (ADR-0084): Layer 5 — Services (connector façade with Vault dependency at Layer 4)
BrandAsset.kind produced: none (signal ingress façade ; produces `ConnectorResult<TarsisSignal>` runtime values, not persisted assets)
Portail target: none runtime — façade at [src/server/services/seshat/tarsis/connector.ts](../../src/server/services/seshat/tarsis/connector.ts) ; consumed by Story 3.1 (sector-intelligence) + Story 3.4 (culture.tarsisBridge) ; surfaced operator-side by Story 2.4 (Console Vault UI test-call badge)
Manual-first parity (ADR-0060): n/a — connector façades are operator-only signal ingress, no LLM, no founder UI ; manual-first parity for the DOWNSTREAM Overton sub-clusters is Story 3.7 (operator-tagged delta peer mode)
Mission link: This is the **first concrete consumer of Pattern P22-1** beyond the type definition itself. The Tarsis façade is the structural enforcement of ship-without-keys (Journey 2) and no-magic-fallback (ADR-0046) for the Overton mechanic — every sectoral signal that ever reaches `<OvertonRadar>` MUST traverse this `ConnectorResult<TarsisSignal>` discriminated union. The mock period (Phase 23 ships without a signed Tarsis vendor contract) returns a marked `_mocked: true` payload AND an empty signal envelope — `sector-intelligence/` consumers cannot accidentally drive a calibration with fabricated metrics, because the Mestor pre-flight gate (Story 6.3) refuses PRODUCTION promotion on calibration snapshots derived from mocked data.
CODE-MAP grep: searched "tarsisConnector", "fetchSectorSignal", "TarsisSignal", "tarsis-monitoring connector façade", "seshat/tarsis/connector" across `src/`. Hits: 0 prior implementations (Phase 17b `seshat/tarsis/index.ts` Market Intelligence Engine is the INTERNAL Tarsis weak-signal analyzer ; this story's façade is the EXTERNAL `tarsis-monitoring` connector — clearly distinct per STATE_FINAL_BLUEPRINT §9.2). Extension chosen: NEW file `connector.ts` co-located with the internal Tarsis service ; ADR-0079 §"Décision" 2 + 3.
```

## Story

As an **UPgraders operator**,
I want **the Tarsis-monitoring connector façade to return `ConnectorResult<TarsisSignal>` exhaustively**,
so that **downstream sub-clusters (`culture.tarsisBridge`, `sector-intelligence`) consume sectoral signal through the standardised shape — `DEFERRED_AWAITING_CREDENTIALS` when keys are absent, `LIVE`/`DEGRADED` otherwise, never a fabricated `LIVE`**.

## Acceptance Criteria

Verbatim from [epics.md L641-655](../planning-artifacts/epics.md):

1. **Given** Story 1.3 (`ConnectorResult<T>`) and Story 2.1 (Vault registration)
   **When** `services/seshat/tarsis/connector.ts` is created
   **Then** the file exports `fetchSectorSignal(operatorId: string, sectorSlug: string): Promise<ConnectorResult<TarsisSignal>>` where `TarsisSignal = { vocabularyOverlap?: number; claimImitations?: ReadonlyArray<{competitorId, phrase, observedAt, sourceUrl?}>; unpaidPress?: ReadonlyArray<{publication, headline, publishedAt, sourceUrl?}>; embeddingDelta?: number; windowFrom?: string; windowTo?: string; _mocked?: boolean }`.

2. **And** absent credentials cause the façade to return `{ state: "DEFERRED_AWAITING_CREDENTIALS", connectorId: "tarsis-monitoring" }` — never throws (NFR8).

3. **And** transient HTTP / network failure causes the façade to return `{ state: "DEGRADED", reason: "VENDOR_OUTAGE" | "RATE_LIMITED" | "AUTH_REVOKED" }` — never throws, never returns fabricated `LIVE` data (no-magic-fallback ADR-0046).

4. **And** the façade reads its credentials via `tenantScopedDb` against `ExternalConnector` rows through `credentialVault.get(operatorId, TARSIS_CONNECTOR_TYPE)` (NFR5 — per-operator scoping).

5. **And** the file also exports `testTarsisConnection(operatorId)` helper used by Story 2.4 Console Vault UI to render the operator-observable test-call badge (NFR11).

## Tasks / Subtasks

- [x] **Task 1 — Define `TarsisSignal` payload interface** (AC: #1) — *NEW interface in [connector.ts L73-118](../../src/server/services/seshat/tarsis/connector.ts)*.
  - [x] 1.1 — Four signal axes (vocabularyOverlap / claimImitations / unpaidPress / embeddingDelta) declared OPTIONAL — some Tarsis tiers omit some axes (basic plan has no embedding deltas).
  - [x] 1.2 — `_mocked: boolean` discriminator on `LIVE` payloads so downstream consumers (calibration handler Epic 6) can refuse mocked data for PRODUCTION promotion.
  - [x] 1.3 — `claimImitations` + `unpaidPress` shaped as `ReadonlyArray<{...}>` — immutable, prevents accidental in-place mutation by downstream consumers.
  - [x] 1.4 — `windowFrom` + `windowTo` ISO-8601 strings declare the observation window — required for stale-detection logic.

- [x] **Task 2 — Implement `fetchSectorSignal(operatorId, sectorSlug)`** (AC: #1, #2, #3, #4) — *NEW export in [connector.ts L134-176](../../src/server/services/seshat/tarsis/connector.ts)*.
  - [x] 2.1 — Step 1 : check credentials via `credentialVault.get(operatorId, TARSIS_CONNECTOR_TYPE)` ; absent → `DEFERRED_AWAITING_CREDENTIALS`.
  - [x] 2.2 — Step 2 : credentials present → Phase 23 mock period returns deterministic mock payload with `_mocked: true` and all signal axes set to undefined / empty arrays (forces downstream `INSUFFICIENT_DATA` per P22-2 — no fabricated metrics drive a calibration).
  - [x] 2.3 — Step 3 : try/catch wrapping — any thrown exception inside the mock path is caught and converted to `{ state: "DEGRADED", reason: "VENDOR_OUTAGE", lastObservedAt: cred.lastSyncAt?.toISOString() }`. P22-1 invariant : transient failure NEVER swallowed into `LIVE`.
  - [x] 2.4 — Return type `Promise<ConnectorResult<TarsisSignal>>` — `tsc` enforces the shape at every call site of this function.

- [x] **Task 3 — Implement `testTarsisConnection(operatorId)` helper** (AC: #5) — *NEW export in [connector.ts L185-197](../../src/server/services/seshat/tarsis/connector.ts)*.
  - [x] 3.1 — Returns `{ success: boolean; reason?: string }` for the Console Vault UI test-call badge.
  - [x] 3.2 — Phase 23 mock : always `success: true` when credentials are configured (real SDK ping wires in a follow-up PR).

- [x] **Task 4 — Verification** (AC: all).
  - [x] 4.1 — `tsc --noEmit` clean.
  - [x] 4.2 — `eslint` clean — no boundary violation ; `seshat/` allowed to import `anubis/credential-vault.ts` (Layer 5 ↔ Layer 5 sibling import).
  - [x] 4.3 — Vitest unit tests (`tests/unit/services/seshat/tarsis/connector.test.ts`) cover all three return states with mocked Vault transports — included in commit `02a488a`.

## Dev Notes

### Relevant architecture patterns and constraints

**Two Tarsis-es, one project** — STATE_FINAL_BLUEPRINT §9.2 disambiguates :
- **Tarsis (internal Seshat outil)** — already shipped at [seshat/tarsis/weak-signal-analyzer.ts](../../src/server/services/seshat/tarsis/weak-signal-analyzer.ts) ; calculates probabilities over mass data internal to the OS.
- **`tarsis-monitoring` (external connector)** — this story ; consumes a vendor SDK to ingest sectoral signal from an external source.

The naming collision is intentional (the external vendor IS named "Tarsis") but the disambiguation matters : when the architecture says "Tarsis governs Overton signal", it means the internal sub-system ; this story's façade is one of its **inputs**.

**Mock period strategy** — Phase 23 ships before the vendor contract is signed. The façade returns `LIVE` with `_mocked: true` + an empty signal envelope (every axis undefined or `[]`). Three properties of this design :

1. **Ship-without-keys safety** — downstream `culture.tarsisBridge` (Story 3.4) sees `LIVE` and proceeds to call `sector-intelligence.refreshSectorOverton`, which sees all-undefined signals and falls through to its per-axis partial state. The founder sees an honest "signal en attente d'activation" empty state, never a fabricated number.
2. **PRODUCTION promotion safety** — Story 6.3's Mestor gate refuses PRODUCTION promotion on calibration snapshots whose underlying data carries `_mocked: true`. The mock cannot accidentally graduate a sub-cluster.
3. **CI signal** — the `_mocked: true` field gives anti-drift tests a stable identifier to assert "no PRODUCTION-grade signal flowed through here during the mock period."

**P22-1 invariant in code** — the try/catch around the mock path is intentional even though the mock body cannot realistically throw. It establishes the **structural contract** for when the real SDK lands : any future `fetch(...)` or vendor-SDK call inserted into the body MUST be wrapped in this try/catch ; any thrown error converts to `DEGRADED + VENDOR_OUTAGE`, never silently to `LIVE`. The anti-pattern test (Story 2.5 HARD) AST-scans for this pattern.

**NFR5 compliance** — `credentialVault.get(operatorId, TARSIS_CONNECTOR_TYPE)` reads through the existing Vault which is built on `tenantScopedDb` (NFR5 default-deny). One operator's Tarsis credentials are unreachable to another tenant.

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| [src/server/services/seshat/tarsis/connector.ts](../../src/server/services/seshat/tarsis/connector.ts) | **NEW** | The façade itself + `TarsisSignal` interface + `fetchSectorSignal` + `testTarsisConnection` helpers. |
| [tests/unit/services/seshat/tarsis/connector.test.ts](../../tests/unit/services/seshat/tarsis/connector.test.ts) | **NEW** | Three-state coverage with mocked Vault. |

**Files to READ (must read before drafting):**

- [src/domain/connector-result.ts](../../src/domain/connector-result.ts) — Story 1.3 type definition.
- [src/server/services/anubis/credential-vault.ts](../../src/server/services/anubis/credential-vault.ts) — Vault contract.
- [docs/governance/adr/0079-external-signal-connectors-credentials-vault.md](../../docs/governance/adr/0079-external-signal-connectors-credentials-vault.md) — connector contract.
- [docs/governance/adr/0046-no-magic-fallback.md](../../docs/governance/adr/0046-no-magic-fallback.md) — root invariant.
- [src/server/services/seshat/tarsis/weak-signal-analyzer.ts](../../src/server/services/seshat/tarsis/weak-signal-analyzer.ts) — internal Tarsis (disambiguation).

**Anti-drift CI tests that MUST stay green after this story:**

- [tests/unit/governance/phase22-connector-result.test.ts](../../tests/unit/governance/phase22-connector-result.test.ts) — activated HARD in Story 2.5 ; AST-scans this file for forbidden patterns.

### Testing standards summary

- Three-state Vitest coverage : (a) absent credential → DEFERRED, (b) credential present → LIVE mock, (c) thrown exception → DEGRADED VENDOR_OUTAGE.
- Test-call helper covered separately.

### References

- [Source: _bmad-output/planning-artifacts/epics.md L641-655 (story spec verbatim)](../planning-artifacts/epics.md)
- [Source: docs/governance/adr/0079-external-signal-connectors-credentials-vault.md](../../docs/governance/adr/0079-external-signal-connectors-credentials-vault.md)
- [Source: docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md §"Pattern P22-1"](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md)
- [Source: docs/governance/adr/0046-no-magic-fallback.md](../../docs/governance/adr/0046-no-magic-fallback.md)
- [Source: docs/governance/STATE_FINAL_BLUEPRINT.md §9.2 (Tarsis disambiguation)](../../docs/governance/STATE_FINAL_BLUEPRINT.md)
- [Source: _bmad-output/implementation-artifacts/1-3-connector-result-shared-discriminated-union.md (type predecessor)](./1-3-connector-result-shared-discriminated-union.md)
- [Source: _bmad-output/implementation-artifacts/2-1-register-connector-types-credentials-vault.md (slug predecessor)](./2-1-register-connector-types-credentials-vault.md)

### Previous story intelligence

- **Story 1.3** — `ConnectorResult<T>` type at `src/domain/connector-result.ts` ; imported here as the return shape.
- **Story 2.1** — `TARSIS_CONNECTOR_TYPE` slug exported from this file ; Story 2.4 (Console UI) + Story 3.4 (culture.tarsisBridge) import it.

### Git intelligence summary

```
02a488a feat(seshat-search): phase 23 Tarsis + CRM connector façades (P22-1)   ← bundled Stories 2.1 + 2.2 + 2.3 ship commit
```

### Project context reference

This story is **Story 2 of Phase 23 Epic 2** — the structural enforcement of Pattern P22-1 for the Overton mechanic's signal ingress. Without this façade, every Phase 23 Overton story would have to invent its own connector shape, fragmenting the no-magic-fallback invariant. With this façade, `culture.tarsisBridge` (Story 3.4) imports one symbol and switches on `ConnectorResult.state` exhaustively.

For broader Phase 23 doctrine see [STATE_FINAL_BLUEPRINT.md](../../docs/governance/STATE_FINAL_BLUEPRINT.md).

## Story completion status

Status: **done**

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER operator persona on ADVE-project per `_nefer-facts.md`.

### Debug Log References

- AC #1 (`fetchSectorSignal` + `TarsisSignal` shape) — shipped: see [connector.ts L134-176](../../src/server/services/seshat/tarsis/connector.ts).
- AC #2 (DEFERRED on absent credentials, never throws) — shipped: see L138-142.
- AC #3 (DEGRADED on transient failure, never fabricated LIVE) — shipped: try/catch L150-175.
- AC #4 (credentials via Vault, NFR5 tenant-scoped) — shipped: `credentialVault.get(operatorId, TARSIS_CONNECTOR_TYPE)` L139.
- AC #5 (`testTarsisConnection`) — shipped: L185-197.

### Completion Notes List

- **AC #1–5 all shipped** in commit `02a488a` (bundled with Stories 2.1 + 2.3).
- **Mock period strategy** documented in the file's header docblock — Phase 23 ships with `_mocked: true` empty payloads ; real SDK lands in follow-up PR once vendor contract signed ; calibration gate (Story 6.3) refuses PRODUCTION on mocked data.
- **NEFER 8-phase protocol compliance**: all 8 phases ticked.
- **Cap APOGEE 7/7 preserved** — connector façade is a Vault entry, not a Neter (ADR-0079 + STATE_FINAL_BLUEPRINT §9.5 table).
- **Manual-first parity (ADR-0060)** — n/a (signal ingress, no LLM). Downstream Overton sub-clusters carry the manual peer mode (Story 3.7).
- **Mission link**: structural enforcement of P22-1 + ADR-0046 for the Overton signal ingress. Every fabricated-number risk on Overton hinges on this façade obeying the 3-state alphabet.

### File List

- **NEW** [src/server/services/seshat/tarsis/connector.ts](../../src/server/services/seshat/tarsis/connector.ts) — 197-line façade : `TARSIS_CONNECTOR_TYPE` const + `TARSIS_DISPLAY_NAME` + `TarsisSignal` interface + `fetchSectorSignal` + `testTarsisConnection`.
- **NEW** [tests/unit/services/seshat/tarsis/connector.test.ts](../../tests/unit/services/seshat/tarsis/connector.test.ts) — three-state Vitest coverage.
- **EDIT** [_bmad-output/implementation-artifacts/2-2-tarsis-connector-facade.md](./2-2-tarsis-connector-facade.md) — this story file (post-hoc context engine artefact).

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-25 | Story 2.2 shipped (bundled in commit `02a488a` with Stories 2.1 + 2.3) — Tarsis-monitoring connector façade at `services/seshat/tarsis/connector.ts` returning `ConnectorResult<TarsisSignal>` exhaustively across LIVE / DEFERRED / DEGRADED states. Mock period strategy : `_mocked: true` empty payload until vendor SDK lands ; calibration gate (Story 6.3) refuses PRODUCTION on mocked data. Cap APOGEE 7/7 preserved. Phase 23 Epic 2 progress 1/5 → 2/5. | NEFER (Claude Opus 4.7) |
| 2026-05-27 | Post-hoc story file artefact generated for governance traceability. | NEFER (Claude Opus 4.7) |
