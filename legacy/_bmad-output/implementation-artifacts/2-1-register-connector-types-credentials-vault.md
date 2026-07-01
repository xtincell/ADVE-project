# Story 2.1: Register two new connector types in Credentials Vault

Status: done

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 2 — External Signal Connectors via Credentials Vault · Story 1/5)
Owning Neteru: Seshat (Tarsis connector — Telemetry §4.3) + Anubis (CRM connector + Credentials Vault host — Comms §4.7) · Mestor implicit
APOGEE OS layer (ADR-0084): Layer 5 — Services (connector type registry on top of generic Credentials Vault Layer 4)
BrandAsset.kind produced: none (governance — Vault type registry extension)
Portail target: none runtime — declarations live at [src/server/services/seshat/tarsis/connector.ts](../../src/server/services/seshat/tarsis/connector.ts) `TARSIS_CONNECTOR_TYPE` constant + [src/server/services/anubis/providers/crm-provider.ts](../../src/server/services/anubis/providers/crm-provider.ts) `CRM_CONNECTOR_TYPE` constant ; Console registration UI at [/console/anubis/credentials](../../src/app/(console)/console/anubis/credentials/) consumes them (Story 2.4)
Manual-first parity (ADR-0060): n/a — Vault is operator-only governance plumbing, no LLM, no founder UI
Mission link: Pattern P22-1 hinges on two operator-facing decisions matching exactly what code expects — connector slug `tarsis-monitoring` lookup MUST succeed in both the registration form (Console UI) and the façade (`credentialVault.get(operatorId, TARSIS_CONNECTOR_TYPE)`). Without canonical constants, the slug-vs-code drift would silently turn every Tarsis lookup into `DEFERRED_AWAITING_CREDENTIALS`, fabricating the "no signal" verdict the founder sees. Indirect contribution to superfans × Overton via the no-magic-fallback invariant.
CODE-MAP grep: searched "tarsis-monitoring", "crm-provider", "connector-type registration", "ExternalConnector type" across `src/`. Hits: existing generic Vault at `services/anubis/credential-vault.ts` (no per-type registration table — connector types live as string slugs ; canonical declarations co-located with their façade). Extension chosen: canonical `*_CONNECTOR_TYPE` const exported from each façade file ; the Vault stays type-agnostic ; the Console UI imports the constants for the registration form so the slug never drifts.
```

## Story

As a **NEFER operator**,
I want **two new connector types declared as canonical string-literal constants in their owning façade files**,
so that **the generic Vault recognises `tarsis-monitoring` and `crm-provider` provider IDs at registration time, and downstream stories implement their façades against a stable single-source-of-truth slug**.

## Acceptance Criteria

Verbatim from [epics.md L625-639](../planning-artifacts/epics.md):

1. **Given** the architecture D4 + ADR-0079 specifications
   **When** `services/anubis/credential-vault.ts` is extended (de-facto : the generic Vault is type-agnostic ; the canonical type slugs are declared in the owning façade files per the layer-5 boundary)
   **Then** two new connector type declarations exist: `tarsis-monitoring` (Seshat-governed, [tarsis/connector.ts L56](../../src/server/services/seshat/tarsis/connector.ts)) and `crm-provider` (Anubis-governed, [crm-provider.ts L56](../../src/server/services/anubis/providers/crm-provider.ts)) with their respective credential schemas captured implicitly via the `CredentialEntry.config` Json field on the existing `ExternalConnector` model.

2. **And** each declaration's per-`Operator` storage path is enforced by the existing `ExternalConnector` table's compound unique `(operatorId, connectorType)` index — no env-var fallback per NFR4.

3. **And** `tsc --noEmit` is green (the constants are `as const` string literals — typecheck propagates the literal across the codebase).

4. **And** `eslint-plugin-boundaries` accepts the additions under `services/anubis/` + `services/seshat/`.

5. **And** anti-drift `neteru-coherence.test.ts` stays green — no Neter has been added ; these are Vault entries, cap APOGEE 7/7 preserved.

## Tasks / Subtasks

- [x] **Task 1 — Declare `TARSIS_CONNECTOR_TYPE` + `TARSIS_DISPLAY_NAME` in Seshat façade file** (AC: #1, #4) — *NEW exports in [src/server/services/seshat/tarsis/connector.ts](../../src/server/services/seshat/tarsis/connector.ts)*.
  - [x] 1.1 — Export `export const TARSIS_CONNECTOR_TYPE = "tarsis-monitoring" as const;` — canonical Vault slug.
  - [x] 1.2 — Export `export const TARSIS_DISPLAY_NAME = "Tarsis monitoring API";` — UI registration form label.
  - [x] 1.3 — File-header docblock cites ADR-0079 §"Décision" + Pattern P22-1 + ADR-0021 (Credentials Vault).

- [x] **Task 2 — Declare `CRM_CONNECTOR_TYPE` + `CRM_DISPLAY_NAME` in Anubis providers façade** (AC: #1, #4) — *NEW exports in [src/server/services/anubis/providers/crm-provider.ts](../../src/server/services/anubis/providers/crm-provider.ts)*.
  - [x] 2.1 — Export `export const CRM_CONNECTOR_TYPE = "crm-provider" as const;`.
  - [x] 2.2 — Export `export const CRM_DISPLAY_NAME = "CRM provider";`.
  - [x] 2.3 — File-header docblock cites ADR-0079 + NFR6 (PII redaction) + Pattern P22-1.

- [x] **Task 3 — Verify generic Vault is type-agnostic** (AC: #1, #5) — *no edit needed to [credential-vault.ts](../../src/server/services/anubis/credential-vault.ts)*.
  - [x] 3.1 — Re-read existing `credentialVault.get(operatorId, connectorType)` — confirms `connectorType` is `string`, no enum constraint. Generic by design — adding new types does NOT require Vault edits.
  - [x] 3.2 — Per-`Operator` scoping enforced by the `ExternalConnector` table's `@@unique([operatorId, connectorType])` index ; NFR4 satisfied at the schema level.

- [x] **Task 4 — Verification** (AC: #3, #4, #5).
  - [x] 4.1 — `tsc --noEmit` clean — the `as const` literals propagate ; Story 2.2 / 2.3 / 2.4 / 2.5 import them via the canonical paths.
  - [x] 4.2 — ESLint boundaries — `services/seshat/` may export ; `services/anubis/` may export. No cross-Neter import introduced.
  - [x] 4.3 — `neteru-coherence.test.ts` — green ; cap APOGEE 7/7 preserved (connectors are not Neteru per ADR-0079 + STATE_FINAL_BLUEPRINT §7.1).

## Dev Notes

### Relevant architecture patterns and constraints

**Why canonical constants per façade vs centralized Vault enum** — the existing Credentials Vault is **type-agnostic** by design (ADR-0021) : `ExternalConnector.connectorType` is `String`, not an enum. This lets each Neter own its own connector type catalogue without forcing a central registry that would have to be edited each time a new connector lands. The trade-off : the canonical slug must live somewhere — the answer is **the façade file itself**, exported as `*_CONNECTOR_TYPE`. Every consumer (Console UI, façade itself, test-call helper, downstream sub-cluster handlers) imports the constant ; the string literal never appears as a magic string in code.

**Vault is the system of record ; façade is the canonical type holder** — split of concerns :
- `credential-vault.ts` — owns CRUD on `ExternalConnector` rows, status transitions (ACTIVE / INACTIVE / ERROR / SYNCING), encrypted-at-rest config storage.
- `tarsis/connector.ts` / `crm-provider.ts` — own the type slug + display name + per-connector schema validation (the `config` JSON shape).

This pattern matches the existing Phase 16 OAuth 2.1 + Phase 15 ad-network connectors (`anubis/providers/meta-ads.ts` etc.) ; Phase 23 Story 2.1 extends the pattern with two new types, no Vault refactor.

**NFR4 compliance at the schema layer** — `ExternalConnector` rows carry `operatorId` (FK to `Operator`) ; the compound unique index `(operatorId, connectorType)` enforces that one operator's credentials are unreachable to another operator. `tenantScopedDb` (NFR5) is the runtime enforcement layer ; the schema is the structural one.

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| [src/server/services/seshat/tarsis/connector.ts](../../src/server/services/seshat/tarsis/connector.ts) | **NEW exports** (lines 56–62) | Declares `TARSIS_CONNECTOR_TYPE` + `TARSIS_DISPLAY_NAME` canonical constants. |
| [src/server/services/anubis/providers/crm-provider.ts](../../src/server/services/anubis/providers/crm-provider.ts) | **NEW exports** (lines 56–62) | Declares `CRM_CONNECTOR_TYPE` + `CRM_DISPLAY_NAME` canonical constants. |
| [src/server/services/anubis/credential-vault.ts](../../src/server/services/anubis/credential-vault.ts) | **UNCHANGED** | Generic by design — accepts any string `connectorType`. |

**Files to READ (must read before drafting) — UNCHANGED by this story:**

- [docs/governance/adr/0079-external-signal-connectors-credentials-vault.md](../../docs/governance/adr/0079-external-signal-connectors-credentials-vault.md) §"Décision" — canonical slug + façade-co-location rule.
- [docs/governance/adr/0021-external-credentials-vault.md](../../docs/governance/adr/0021-external-credentials-vault.md) — Vault model + per-operator storage.
- [prisma/schema.prisma](../../prisma/schema.prisma) — `ExternalConnector` model + compound unique index.
- [src/server/services/anubis/providers/meta-ads.ts](../../src/server/services/anubis/providers/meta-ads.ts) — pattern reference for connector type co-location (Phase 15 sibling).

**Anti-drift CI tests that MUST stay green after this story:**

- [tests/unit/governance/neteru-coherence.test.ts](../../tests/unit/governance/neteru-coherence.test.ts) — 7/7 cap, untouched.
- [tests/unit/governance/phase22-connector-result.test.ts](../../tests/unit/governance/phase22-connector-result.test.ts) — Story 2.5 HARD activation later in this epic ; this story creates the canonical slugs the test will assert exist.

### Testing standards summary

- **Constant declarations → no Vitest spec required.** The constants are exercised by Stories 2.2 / 2.3 (façade implementations) and Story 2.4 (Console UI registration form).
- `tsc --noEmit` baseline preserved — `as const` literals are zero-runtime-cost.

### Project Structure Notes

**Alignment with unified project structure:**

- Façade file paths canonical: `services/seshat/tarsis/connector.ts` + `services/anubis/providers/crm-provider.ts`.
- Naming convention `*_CONNECTOR_TYPE` matches existing Phase 15 connectors.

**Detected variances / conflicts:**

- **Vault not edited** — the AC reads "extend `services/anubis/credential-vault.ts`" but the architecturally correct interpretation is "declare new types in their owning façade ; Vault is already type-agnostic." This convention was already established Phase 15+16 and re-confirmed by Story 2.1 (ADR-0079 §"Décision" point 2).

### References

- [Source: _bmad-output/planning-artifacts/epics.md L625-639 (story spec verbatim)](../planning-artifacts/epics.md)
- [Source: docs/governance/adr/0079-external-signal-connectors-credentials-vault.md](../../docs/governance/adr/0079-external-signal-connectors-credentials-vault.md)
- [Source: docs/governance/adr/0021-external-credentials-vault.md](../../docs/governance/adr/0021-external-credentials-vault.md)
- [Source: src/server/services/anubis/credential-vault.ts (host module, unchanged)](../../src/server/services/anubis/credential-vault.ts)
- [Source: src/server/services/anubis/providers/meta-ads.ts (Phase 15 sibling pattern)](../../src/server/services/anubis/providers/meta-ads.ts)
- [Source: prisma/schema.prisma `ExternalConnector` model](../../prisma/schema.prisma)

### Previous story intelligence

- **Stories 1.1–1.10** — Epic 1 governance foundations shipped ; ADR-0079 stub (Story 1.2) is the canonical reference for this story's slug choice.
- **Phase 15 + 16** — established the connector co-location pattern that Story 2.1 follows.

### Git intelligence summary

```
02a488a feat(seshat-search): phase 23 Tarsis + CRM connector façades (P22-1)   ← bundled Stories 2.1 + 2.2 + 2.3 ship commit
```

Pattern observed : Stories 2.1 / 2.2 / 2.3 bundled in one commit `02a488a` (the constants + the two façade implementations + the redaction logic are one structural unit — splitting them would have produced a non-compiling intermediate state).

### Project context reference

This story is **Story 1 of Phase 23 Epic 2 External Signal Connectors via Credentials Vault**. It scaffolds the canonical slugs that Stories 2.2 (Tarsis façade) + 2.3 (CRM façade) + 2.4 (Console UI) + 2.5 (HARD test) all consume. Without these constants, the Vault lookup would have to use magic strings, breaking the no-magic-fallback invariant at the registration boundary.

For broader Phase 23 doctrine see [STATE_FINAL_BLUEPRINT.md](../../docs/governance/STATE_FINAL_BLUEPRINT.md) (canon absolute 2026-05-16).

## Story completion status

Status: **done**

NEFER context engine analysis completed — ADR-0079 §"Décision" + ADR-0021 + Phase 15 sibling pattern read for the co-location convention ; `ExternalConnector` schema verified for NFR4 compound unique index ; `eslint-plugin-boundaries` config verified to accept cross-package exports.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER operator persona on ADVE-project per `_nefer-facts.md`.

### Debug Log References

- AC #1 (`tarsis-monitoring` + `crm-provider` declarations) — shipped: see [connector.ts L56](../../src/server/services/seshat/tarsis/connector.ts) `TARSIS_CONNECTOR_TYPE` + [crm-provider.ts L56](../../src/server/services/anubis/providers/crm-provider.ts) `CRM_CONNECTOR_TYPE`.
- AC #2 (per-operator storage path enforced) — schema-level via `ExternalConnector.@@unique([operatorId, connectorType])`.
- AC #3 (`tsc --noEmit` green) — verified pre-commit and post-commit.
- AC #4 (ESLint boundaries) — green ; no cross-Neter import.
- AC #5 (`neteru-coherence.test.ts` 7/7 cap preserved) — green ; connectors are Vault entries, not Neteru.

### Completion Notes List

- **AC #1–5 all shipped** in commit `02a488a` (bundled with Stories 2.2 + 2.3).
- **NEFER 8-phase protocol compliance**: Phase 0 pre-flight (ADR-0079 + ADR-0021 + Phase 15 sibling + ExternalConnector schema), Phase 1 APOGEE (Layer 5 service-level constants, no Neter touched), Phase 2 anti-doublon (grep returned 0 hits for `tarsis-monitoring` / `crm-provider` slugs), Phase 3 conception (canonical `*_CONNECTOR_TYPE` co-located with façade), Phase 4 execution (two-line constant exports per file + docblock citations), Phase 5 verification (tsc + eslint + neteru-coherence), Phase 6 documentation (CODE-MAP auto-regen picks up slugs as new synonyms), Phase 7 commit `02a488a`.
- **Cap APOGEE 7/7 preserved** — Vault entries, not Neteru.
- **Manual-first parity (ADR-0060)** — n/a (no LLM feature).
- **Mission link**: canonical slugs make the Vault lookup deterministic — without them, Story 2.4 Console UI registration form would have to coordinate string literals with the façade by hand, creating a slug-drift surface that fabricates `DEFERRED_AWAITING_CREDENTIALS` on real-credentialled tenants. Indirect superfans × Overton contribution.

### File List

- **EDIT** [src/server/services/seshat/tarsis/connector.ts](../../src/server/services/seshat/tarsis/connector.ts) — added `TARSIS_CONNECTOR_TYPE` + `TARSIS_DISPLAY_NAME` exports.
- **EDIT** [src/server/services/anubis/providers/crm-provider.ts](../../src/server/services/anubis/providers/crm-provider.ts) — added `CRM_CONNECTOR_TYPE` + `CRM_DISPLAY_NAME` exports.
- **EDIT** [_bmad-output/implementation-artifacts/2-1-register-connector-types-credentials-vault.md](./2-1-register-connector-types-credentials-vault.md) — this story file (post-hoc context engine artefact).

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-25 | Story 2.1 shipped (bundled in commit `02a488a` with Stories 2.2 + 2.3) — canonical `TARSIS_CONNECTOR_TYPE = "tarsis-monitoring"` + `CRM_CONNECTOR_TYPE = "crm-provider"` exports declared in their owning façade files ; generic Vault unchanged (type-agnostic by design). Cap APOGEE 7/7 preserved. Phase 23 Epic 2 progress 0/5 → 1/5. | NEFER (Claude Opus 4.7) |
| 2026-05-27 | Post-hoc story file artefact generated for governance traceability. | NEFER (Claude Opus 4.7) |
