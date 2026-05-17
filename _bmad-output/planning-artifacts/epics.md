---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/closure-roadmap.md
  - _bmad-output/planning-artifacts/implementation-readiness-report-2026-05-14.md
  - CLAUDE.md
  - docs/governance/MISSION.md
  - docs/governance/APOGEE.md
  - docs/governance/PANTHEON.md
  - docs/governance/RESIDUAL-DEBT.md
  - docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md
  - _bmad/custom/_nefer-checks.md
  - _bmad/custom/_nefer-facts.md
  - _bmad/custom/_nefer-commit.md
  - docs/governance/STATE_FINAL_BLUEPRINT.md  # canon absolu 2026-05-16
blueprint_canon_alignment: >
  2026-05-16 — STATE_FINAL_BLUEPRINT.md is now the canonical source-of-truth for
  La Fusée OS terminology, neter governance limits, refresh cascade, score system,
  and economic architecture runtime. This artifact's substantive Phase 23 scope
  is unchanged ; Epic 1 grows by one governance-foundation story (1.8
  BRIEF_VS_ADVE_COHERENCE gate scaffold) per blueprint §3 + §21.2 (drift D-3.1
  CRITIQUE absorbed into Epic 1). Existing 1.8/1.9 renumbered to 1.9/1.10. See
  sprint-change-proposal-2026-05-16.md for the corresponding course correction.
workflowType: 'epics'
project_name: 'ADVE-project'
user_name: 'Alexandre'
date: '2026-05-16'
target: 'Phase 23 — Câblage des mécaniques pivot mission (superfans × Overton) MVP→PRODUCTION'
phase_label: 'phase/23'
target_portals: ['Console', 'Cockpit']
owning_neters: ['Seshat', 'Anubis', 'Artemis']
neter_correction_note: >
  PRD frontmatter lists Ptah in owning Neters. Architecture step-02 (`neter_ownership`)
  drops Ptah: Phase 23 has no forge/production scope — measurement tools emit
  assessments, not assets. Authoritative set: Seshat (Tarsis connector, Overton,
  sector-intelligence/), Anubis (CRM connector, MCP ingest), Artemis (5 measurement
  Glory tools). Mestor is implicit (Intent dispatcher for every governed mutation).
nefer_preflight:
  C1_read_project_memory: done — CLAUDE.md "Phase status" + recent ADRs (0067–0083) loaded
  C2_anti_doublon_grep: done — PRD scope correction absorbed from architecture D1; EXTEND/WIRE > CREATE
  C3_lexicon_reformulation: done — Industry OS, Glory tool, BrandAsset.kind, Credentials Vault connector (not Neter)
  C4_apogee_three_laws: done — no altitude regression (governed lifecycle), no stage skip (measurement is observational), Thot-gated SLOs
  C5_phase18_residual_check: done — N6-bis `applicableNatures` annotation on the 5 existing tools folded INTO Phase 23 (architecture D1 correction of PRD wording "annotated from creation")
  C6_variable_bible_crosscheck: n/a — manual coefficient mode (FR25) and operator-tagged delta mode (FR26) land editable inputs on Campaign / CampaignAction, not on Strategy / BrandContextNode / pillar payload
mission_link: >
  This epic breakdown wires into PRODUCTION the exact mechanics that MEASURE
  superfan accumulation and OBSERVE the Overton-window shift — moving the
  MISSION.md §9 ledger from 0/6 to ≥3/6 (sectoral Overton axis visible to founder;
  operator "next 5 actions" feed has real superfan/Overton ratio; Oracle §33
  "État Overton sectoriel" maintained by real Tarsis signal).
manual_first_parity_statement: >
  Per ADR-0060, every LLM-assisted story in this breakdown ships with an equivalent
  manual-UI story in the same epic. The 5 LLM Glory tools (Epic 4) each pair an
  LLM-path story with a manual-form story; the attribution model (Epic 2) pairs
  with a manual coefficient-entry story; overtonShift (Epic 3) pairs with an
  operator-tagged delta story. No standalone LLM story is permitted.
governance_first_sequencing: >
  Per NEFER persistent facts: stories touching governance (Mestor Intents,
  manifests, ADRs, 7 sources sync) are sequenced FIRST in their owning epic and
  unblock everything else. Epic 1 (Governance Foundations) ships before any
  measurement work. Within each downstream epic, the manifest/Intent-kind story
  precedes its handler/UI stories.
---

# ADVE-project — Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for **Phase 23 — Câblage des mécaniques pivot mission (superfans × Overton) MVP→PRODUCTION**, decomposing the 35 FRs / 14 NFRs / 9 D-decisions / 7 P22-patterns / 24 UX-DRs from the PRD, Architecture, and UX Design Specification into implementable stories.

> **NEFER pre-flight:** C1 ✓ · C2 ✓ · C3 ✓ · C4 ✓ · C5 ✓ · C6 n/a
> **Phase label:** `phase/23`
> **Owning Neteru:** Seshat · Anubis · Artemis (Mestor implicit for Intent dispatch)
> **Portals:** Console + Cockpit
> **Mission link:** wires the superfans × Overton pivot mechanism into PRODUCTION (closure-roadmap target #1; MISSION.md §9 ledger 0/6 → ≥3/6)
> **CODE-MAP grep:** absorbed architecture D1 reframe — EXTEND `campaign-tracker/` + `sector-intelligence/`; 1 net-new Tier 3 component (`<OvertonRadar>` *config + wiring*, not creation — it already exists at `src/components/neteru/overton-radar.tsx`), 1 net-new Cockpit route, 2 net-new connector façades, 5 child ADRs (0077–0081).

## Requirements Inventory

### Functional Requirements

**A. External Signal Connectors**

- **FR1:** An operator can register a Tarsis-monitoring API connector through the Credentials Vault.
- **FR2:** An operator can register a CRM provider connector through the Credentials Vault.
- **FR3:** An operator can see each connector's configuration state (configured vs `DEFERRED_AWAITING_CREDENTIALS`) and a reachability test-call result.
- **FR4:** The system continues operating without error when a connector is unconfigured, exposing a `DEFERRED_AWAITING_CREDENTIALS` state instead of failing or fabricating data.
- **FR5:** Connector credentials are scoped to the owning operator and are not shared or visible across tenants.

**B. Superfan Measurement**

- **FR6:** The system can attribute devotion-ladder transitions (to Ambassador / Evangelist) to specific campaigns.
- **FR7:** The system can compute cohort retention (J+30 / J+90 / J+180) for a brand's audience from CRM signal.
- **FR8:** The system can count evangelists for a campaign from observed devotion transitions.
- **FR9:** An operator can view a campaign's superfan-attribution result together with its evangelist lineage.
- **FR10:** A founder can view the evangelist lineage of a campaign in the Cockpit (read-only).
- **FR11:** The system exposes an explicit insufficient-data state when superfan signal is too sparse for a credible result — never a fabricated score.

**C. Overton Measurement**

- **FR12:** The system can collect sectoral signal (competitor vocabulary overlap, claim-imitation events, unpaid-press mentions) from the Tarsis connector.
- **FR13:** The system can compute an Overton-shift value for a brand from sectoral-embedding deltas.
- **FR14:** The system can compute an Overton-readiness value for a brand.
- **FR15:** The system can ingest external context via inbound MCP into a brand's campaign context.
- **FR16:** The system classifies and flags PII on inbound MCP context before persistence.
- **FR17:** Overton measurement output feeds the Oracle "État Overton sectoriel" section (#33).
- **FR18:** The system exposes an explicit degraded/empty state for Overton measurement when the Tarsis connector is unconfigured or signal is absent.

**D. Model Calibration & Lifecycle Promotion**

- **FR19:** An operator can run a calibration review of the superfan-attribution model against a brand's real campaign history.
- **FR20:** An operator can see a model's evaluation metrics (ROC AUC / RMSE) against its declared acceptance thresholds.
- **FR21:** An operator can accept or reject a model's calibration outcome.
- **FR22:** An operator can promote a pivot sub-cluster's lifecycle (STUB → MVP → PRODUCTION) through a governed Intent.
- **FR23:** The system records every calibration acceptance and lifecycle promotion as an append-only, hash-chained, replayable governance event.
- **FR24:** The system can trace a PRODUCTION promotion decision back to the exact calibration snapshot that justified it.
- **FR25:** An operator can enter attribution model coefficients manually as an equivalent to the automated path.
- **FR26:** An operator can enter Overton-shift deltas manually (operator-tagged) as an equivalent to the embeddings path.

**E. Measurement Glory Tools**

- **FR27:** An operator can invoke each of the five measurement Glory tools — `big-idea-coherence`, `myth-arc-cohesion`, `crew-performance-evaluator`, `negative-space-auditor`, `mcp-pii-classifier`.
- **FR28:** Each measurement Glory tool offers an equivalent manual UI input path that produces the same structured output when the LLM path is unavailable or fails validation.
- **FR29:** Each measurement Glory tool declares the brand archetypes (`applicableNatures`) to which it applies.

**F. Cockpit Founder Surfaces**

- **FR30:** A founder can view the `<OvertonRadar>` in the Cockpit showing competitor vocabulary overlap, claim-imitation log, unpaid-press feed, and sectoral-embedding delta.
- **FR31:** A founder sees an honest empty/degraded state in the OvertonRadar when no real signal is available.
- **FR32:** Founder access to the OvertonRadar and attribution lineage is read-only and gated to paid tiers — founders cannot configure connectors or alter calibration.

**G. Governance & Coherence**

- **FR33:** Each new Intent kind, Glory tool, and capability is declared in its owning service manifest with an SLO.
- **FR34:** The system preserves the APOGEE cap of 7 Neteru — the Tarsis and CRM connectors are Credentials-Vault entries, not governors.
- **FR35:** Anti-drift tests assert the presence of the 6 promoted sub-clusters, the 5 measurement Glory tools, and the unchanged Neter roster.

### NonFunctional Requirements

**Performance**
- **NFR1:** New async Intent kinds declare SLOs in `slos.ts`. Signal-collection and sub-cluster-compute Intents target p95 ≤ 15s, cost ≤ $0.10. The attribution calibration run targets p95 ≤ 60s, cost ≤ $0.50.
- **NFR2:** `<OvertonRadar>` first meaningful render ≤ 2s on cached signal, behind a Suspense boundary — never blocks the Cockpit shell.
- **NFR3:** Calibration runs and signal polls stream progress over NSP SSE (15s heartbeat); operator never faces a frozen screen.

**Security**
- **NFR4:** Connector credentials are stored only as per-`Operator` `ExternalConnector` rows (Credentials Vault, ADR-0021) — never env vars, never logged, never returned in API responses.
- **NFR5:** All Prisma access for Phase 23 entities goes through `tenantScopedDb` (default-deny); one operator's signal data is unreachable from another tenant.
- **NFR6:** PII on inbound MCP context is classified and flagged by `mcp-pii-classifier` before persistence; CRM ingest supports field-level PII redaction.
- **NFR7:** Calibration acceptances and lifecycle promotions are append-only, hash-chained `IntentEmission` entries — tamper-evident and replayable.

**Integration & Reliability**
- **NFR8:** Tarsis and CRM connector façades return `DEFERRED_AWAITING_CREDENTIALS` when unconfigured and a typed error state on transient failure — never an uncaught throw, never a crash of the consuming sub-cluster.
- **NFR9:** A connector outage degrades its dependent sub-cluster to an explicit insufficient-data / degraded state within one poll cycle, and never produces a fabricated score (no-magic-fallback, ADR-0046).
- **NFR10:** NSP emitters use `bestEffort()` — a telemetry emit failure never fails the underlying Intent.
- **NFR11:** Connector test-call result is operator-observable (FR3), so integration health is diagnosable without reading server logs.

**Scalability**
- **NFR12:** Signal collection and cohort computation are tenant-scoped per `Strategy` / `Campaign` with no cross-tenant fan-out and no shared mutable global state — Phase 23 inherits the OS's existing single-Postgres scaling envelope.

**Accessibility**
- **NFR13:** `<OvertonRadar>` meets the project design-system a11y bar (DESIGN-A11Y): keyboard-navigable, charts carry a text-equivalent data view, colour is never the sole signal carrier; covered by a Playwright a11y test.
- **NFR14:** `<OvertonRadar>` consumes design tokens only with CVA variants — no raw Tailwind colour classes — consistent with the three Design-System prohibitions.

### Additional Requirements

**Architectural decisions (D1–D9) — see architecture.md §Core Architectural Decisions:**
- **D1 (PRD scope reframe):** `<OvertonRadar>`, `sector-intelligence/`, the 5 measurement Glory tools, and the 6 pivot sub-clusters ALREADY EXIST. Phase 23 is wiring/extension, not creation. PRD `chosen_target.code_map_grep` + closure-roadmap target #1 closure criterion get a correction note as the first item of the implementation epic's governance story.
- **D2 (Overton canonical home):** `sector-intelligence/` (Seshat service, `Sector` model) is canonical; `campaign-tracker/culture.overtonShift|overtonReadiness|tarsisBridge` delegate to it. One-way import.
- **D3 (ADR strategy):** 5 child ADRs **ADR-0077** (parent/closure + D1 scope-reframe + dangling-ref retirement), **ADR-0078** (Overton canonical home), **ADR-0079** (external signal connectors via Credentials Vault), **ADR-0080** (pivot sub-cluster lifecycle-promotion Intent), **ADR-0081** (superfan-attribution calibration methodology).
- **D4 (connectors):** 2 connector façades — `seshat/tarsis/connector.ts` + `anubis/providers/crm-provider.ts` — each returning `ConnectorResult<T>` per Credentials Vault façade contract; APOGEE cap 7/7 preserved.
- **D5 (Intent kinds):** 2 new async Intent kinds — `PROMOTE_PIVOT_SUBCLUSTER` (parameterized over sub-cluster + state transition + optional `calibrationSnapshotRef`) and `RUN_ATTRIBUTION_CALIBRATION` (NSP SSE-streamed). Both governed, hash-chained, manifest-declared with SLOs.
- **D6 (ML calibration):** Pure-TS logistic regression in `campaign-tracker/superfan-attribution.ts` — **no new numeric/stats dependency**; ROC AUC + RMSE computed in ~30 LOC each; calibration snapshots versioned as `IntentEmission` payloads.
- **D7 (manual-first parity):** Extend `GloryToolDef.executionType` with `"HYBRID"` + `manualFormSchema?: ZodType` (required when HYBRID). Manual form's Zod shape **equals** the tool's `outputFormat` shape — not a parallel schema. HARD test `assembler-uses-manual-path.test.ts` extended to Phase 23 handlers.
- **D8 (data architecture):** **0 new Prisma models.** `Sector` already exists. Additive nullable fields only on `Campaign` / `CampaignAction` in one `prisma migrate dev` migration; calibration snapshots persist as `IntentEmission` payloads.
- **D9 (frontend):** 1 net-new Cockpit route `/cockpit/intelligence/overton` mounting the **existing** `<OvertonRadar>` component (props wired to real signal + degraded states); Console calibration-review panel extends `/console/governance/campaign-tracker`; Connector registration extends `/console/anubis/credentials`.

**Implementation patterns (P22-1 to P22-7) — see architecture.md §Implementation Patterns:**
- **P22-1:** `ConnectorResult<T>` discriminated union in `src/domain/connector-result.ts` — defined once, consumed by every connector / sub-cluster / Glory tool / UI consumer; three states `LIVE | DEFERRED_AWAITING_CREDENTIALS | DEGRADED` handled exhaustively (no `default else`).
- **P22-2:** `INSUFFICIENT_DATA` is a first-class return value (typed at call site), never an exception, never a silent zero. Anti-drift test bans `?? 0` / `|| 0` on score fields.
- **P22-3:** Manual-first parity per Glory tool — `executionType: "HYBRID"`, `manualFormSchema` equal to `outputFormat`, dispatched through unified registry.
- **P22-4:** `PROMOTE_PIVOT_SUBCLUSTER` parameterized payload — refuses skip / reverse transitions; `toState === "PRODUCTION"` requires `calibrationSnapshotRef` (gate at handler entry, not UI).
- **P22-5:** Glory tool resolution via `getGloryTool(slug)` from `services/artemis/tools/registry.ts` — no parallel registry, no `switch` in campaign-tracker.
- **P22-6:** Calibration snapshots persist as `RUN_ATTRIBUTION_CALIBRATION` `IntentEmission` payloads — no new Prisma table; anti-drift test asserts table does not exist.
- **P22-7:** Dangling ADR refs (`0053-coherence-llm-evaluator`, `0054-superfan-attribution-model`, `0055-overton-algo`, `0056-postmortem-12q`, `0057-crew-scoring`) retired in the same commits that touch their files; 0 hits after Phase 23 closure.

**Repo hygiene (folded into Phase 23 per architecture):**
- **N6-bis closure:** `applicableNatures` annotation on the 5 existing Glory tools (`big-idea-coherence-checker`, `myth-arc-cohesion-evaluator`, `crew-performance-evaluator`, `negative-space-auditor`, `mcp-content-pii-classifier`) — Phase 18 residual debt cleared inside Phase 23 (architecture D1 corrects PRD wording "annotated from creation").
- **CLAUDE.md stack-doc drift:** correct "Next.js 15 + React 19 + TypeScript 5.8 + Prisma 6" → "Next.js 16 + React 19 + TypeScript 6 + Prisma 7" (matches `package.json` reality post-Phase 12) — folded into P4 doc-sync of the closure commit.

**Anti-drift CI requirements:**
- 6 new HARD-mode tests under `tests/unit/governance/`: `phase22-connector-result.test.ts`, `phase22-no-silent-zero.test.ts`, `phase22-glory-hybrid.test.ts`, `phase22-lifecycle-promotion.test.ts`, `phase22-no-calibration-table.test.ts`, `phase22-no-dangling-adr-refs.test.ts`.
- Extend `campaign-tracker-coherence.test.ts` to assert 6 sub-clusters present + lifecycle states.
- Extend `assembler-uses-manual-path.test.ts` HARD assertion to Phase 23 handlers.
- `neteru-coherence.test.ts` must stay green (APOGEE cap 7/7 unchanged).
- Playwright `@axe-core` 0 critical/serious on `/cockpit/intelligence/overton`; dedicated a11y spec for `<OvertonRadar>`.

**Map updates (P4 doc-sync):**
- `CODE-MAP.md` — auto-regen pre-commit (synonyms for connector/calibration).
- `PAGE-MAP.md` — `+1 route /cockpit/intelligence/overton`.
- `ROUTER-MAP.md` — `+N tRPC procedures on campaign-tracker router`.
- `SERVICE-MAP.md` — connector façades under `seshat/` + `anubis/`.
- `COMPONENT-MAP.md` — `<OvertonRadar>` now consumed by a route; document Phase 23 reusable patterns (degraded/empty, provenance, status-lifecycle, operator-judgement).
- `RESIDUAL-DEBT.md` — N6-bis closure note + Phase 23 carry-overs (Growth: scheduled re-calibration; Vision: predictive radar).
- `MISSION.md` — §9 ledger: 3 of 6 checkboxes become checkable.

### UX Design Requirements

**Components — net-new + extended:**
- **UX-DR1:** `<OvertonRadar>` props extended (CVA `instance: full | teaser`; states `live | partial | degraded | loading | updating`; props typed against `ConnectorResult<T>`); A2 Split layout (radar left, evidence feed right); container-query reflow on its own width; co-located `.manifest.ts` (Zod, `defineComponentManifest`) + `.stories.tsx` + `.test.tsx` + dedicated a11y spec.
- **UX-DR2:** `<OvertonPanel>` Cockpit wrapper component (new, under `components/cockpit/intelligence/`) — owns tRPC fetch + Suspense boundary (NFR2) + degraded-state UI; consumes `<OvertonRadar>` as a child.
- **UX-DR3:** `CampaignTrackerHub` page extension with view switcher (`B1 Dense status table` default + `B2 Card grid` + `B3 Master–detail`); per-operator localStorage persistence; segmented control via existing `tabs` primitive (or new CVA variant on `tabs` if needed — governed extension, not new primitive).
- **UX-DR4:** `CalibrationReviewPanel` composition (new, app-level) — composes `dialog-wide` (from B1/B2 hosts) or renders inline in B3 detail pane; same component, two host contexts; shows ROC AUC / RMSE as values vs named thresholds via `data-table-comparison` + `kpi-grid`; versioned dated run snapshot; manual-coefficient peer tab; accept/reject actions; insufficient-data state.
- **UX-DR5:** `ConnectorRegistrationForm` extension of existing Credentials Vault `form-modal` + `field-*`; write-once secret entry (masked "configured" state after save + "replace" action); explicit test-call `badge` (reachable / failed + cause); typed error state retains key for retry. Two new connector types: `tarsis-monitoring`, `crm-provider`.
- **UX-DR6:** `SubClusterStatusCell` composition — status `badge` (colour + shape + label triad) + lifecycle stage + signal-freshness timestamp + `DEFERRED` "configure connector" one-click cross-link to `/console/anubis/credentials`.
- **UX-DR7:** `ProvenancePopover` documented Phase-22 pattern (thin composition over `popover` primitive); used by 4 call sites (status grid, calibration panel, OvertonRadar events, Cockpit scores); reaches signal source or calibration snapshot; one-hop, never full navigation.
- **UX-DR8:** `EvangelistLineageView` extension of `/cockpit/insights/attribution` — names a campaign and its N Ambassador/Evangelist transitions; composes `timeline` + `card-metric`.
- **UX-DR9:** 5 measurement Glory tool manual forms — schema-driven from each tool's `outputSchema` Zod shape (not five hand-built variants); `form-single-column` / `form-drawer` + `field-*`.
- **UX-DR10:** Shared `empty-state` degraded treatment — single canonical pattern (`icon` + cause + unlock path, info tone) used by every `<OvertonRadar>` instance, every hub view, every connector-dependent cell; same footprint as populated (no layout jump between `DEFERRED` and live).
- **UX-DR11:** `cockpitNavGroups` configuration update — new minimal "Intelligence" group entry pointing to `/cockpit/intelligence/overton`; convergent discovery (teaser + nav entry both satisfy MISSION §9).

**Behavioural patterns (Phase-22 documented):**
- **UX-DR12:** Status triad enforced everywhere (colour **+** shape/icon **+** text label); `DEFERRED` uses **info** tone (not warning/error — ship-without-keys is expected).
- **UX-DR13:** Manual-first as peer toggle (visible *before* error, equal-status tab/toggle); LLM-fail recovery lands on the **same** form as the peer toggle, never reads as a downgrade.
- **UX-DR14:** Confirmation attribution pattern — completed governed mutation confirms with act + actor + snapshot link ("Calibration accepted by Amina · view snapshot"), not generic toast.
- **UX-DR15:** Operator-judgement pattern — every consequential decision (accept/reject calibration, promote lifecycle) is: explicit operator act → primary/ghost button pair → hash-chained attributed event → confirmation linking the resulting snapshot.
- **UX-DR16:** Button hierarchy: one primary rouge action per surface (consequential forward act); reject/lateral are ghost; reject is NEVER primary-rouge; founder Cockpit surfaces have NO mutation buttons (only `link`/quiet navigation).
- **UX-DR17:** Streamed progress over frozen screen — calibration runs + signal polls + LLM Glory tool runs stream over NSP SSE into `role="status" aria-live="polite"` region (NFR3 + a11y).

**Layout & density:**
- **UX-DR18:** Per-portal density discipline — Console surfaces `data-density="compact"` (12px/8px); Cockpit surfaces `data-density="comfortable"` (20px/16px); B2/B3 hub views stay within `compact` spacing tokens (no silent inflation).
- **UX-DR19:** Container queries for `<OvertonRadar>` (both teaser + full instances reflow on own width, not viewport's); hub cards (B2) use container queries; viewport queries only for layout shell (sidebar/topbar).
- **UX-DR20:** Responsive design target = `lg`+ desktop; tablet (`md`, 768px) = sidebar appears, A2 Split may stack via container query, B3 collapses to list-then-detail; below `md` = not a design target (usable but unoptimised).

**Accessibility (NFR13 + DESIGN-A11Y binding):**
- **UX-DR21:** `<OvertonRadar>` a11y — `<svg role="img">` + values-summary `aria-label` + offscreen text-equivalent data table (DESIGN-A11Y §3 RadarChart pattern) shipped IN the same component (not a follow-up); keyboard-navigable; every axis carries label + shape (colour never sole carrier); dedicated Playwright a11y spec.
- **UX-DR22:** Calibration panel a11y — `role="dialog"`, `aria-modal`, focus trap, ESC close, return focus; metric pass/near/fail conveyed by icon + label + token (never colour-only).
- **UX-DR23:** Focus visible — 2px rouge `--focus-ring-color` on `:focus-visible` for every interactive element; no `outline: none` without replacement.
- **UX-DR24:** `@axe-core/playwright` 0 critical/serious violations on Phase 23 surfaces; visual regression baselines at `md`/`lg`/`xl` for the two new surfaces; RTL + font-scaling-200% specs for `<OvertonRadar>` + campaign-tracker hub.

**Tokens, motion, i18n:**
- **UX-DR25:** Design tokens only — Tier 1/2/3 cascade respected, no Tier 0 Reference token direct consumption, no raw Tailwind colour classes; CVA grammar for every multi-variant element (NFR14 + three DS prohibitions).
- **UX-DR26:** Motion — `--motion-base`/`--motion-medium` + `--ease-out` for score reveals / radar updates; full `prefers-reduced-motion` fallback; NO celebratory animation on a measurement instrument (DESIGN-MOTION §4).
- **UX-DR27:** i18n — logical properties only (`ps-`/`pe-`/`ms-`/`me-`); all numbers/dates/currency via `Intl.*` (FCFA/XOF/XAF, EUR, USD per DESIGN-I18N); strings inline `fr-FR` (pre-i18n-extraction acceptable); font-scaling-200% safe via fluid type scale.

### FR Coverage Map

Every FR, NFR, Architectural-additional requirement, and UX-DR maps to exactly one owning epic. Cross-cutting patterns (e.g. `ConnectorResult<T>` consumers, `INSUFFICIENT_DATA` discipline) are *declared* in their owning epic and *enforced* across all consumers via HARD anti-drift tests.

**Functional Requirements (35/35 mapped):**

| FR | Epic | Coverage notes |
|---|---|---|
| FR1 | Epic 2 | Tarsis connector registration via Credentials Vault |
| FR2 | Epic 2 | CRM provider registration via Credentials Vault |
| FR3 | Epic 2 | Connector configuration state + test-call result UI |
| FR4 | Epic 2 | `DEFERRED_AWAITING_CREDENTIALS` ship-without-keys façade |
| FR5 | Epic 2 | Per-operator credential scoping (Credentials Vault inherited) |
| FR6 | Epic 4 | Attribution of devotion-ladder transitions to campaigns (LLM/regression path) |
| FR7 | Epic 4 | Cohort retention (J+30/90/180) from CRM signal |
| FR8 | Epic 4 | Evangelist count for a campaign |
| FR9 | Epic 4 | Operator view of attribution + lineage |
| FR10 | Epic 4 | Founder Cockpit view of evangelist lineage (read-only) |
| FR11 | Epic 4 | Explicit insufficient-data state on superfan signal |
| FR12 | Epic 3 | Sectoral signal collection via Tarsis |
| FR13 | Epic 3 | Overton-shift via sectoral-embedding deltas (LLM/algorithmic path) |
| FR14 | Epic 3 | Overton-readiness computation |
| FR15 | Epic 3 | Inbound MCP context ingestion |
| FR16 | Epic 3 | PII classification on inbound MCP context |
| FR17 | Epic 3 | Overton output feeds Oracle §33 reader |
| FR18 | Epic 3 | Explicit degraded/empty state for Overton measurement |
| FR19 | Epic 6 | Operator runs calibration review of attribution model |
| FR20 | Epic 6 | Operator sees ROC AUC / RMSE vs declared thresholds |
| FR21 | Epic 6 | Operator accepts / rejects calibration outcome |
| FR22 | Epic 6 | Operator promotes sub-cluster lifecycle via governed Intent |
| FR23 | Epic 6 | Calibration + promotion as append-only hash-chained event |
| FR24 | Epic 6 | Traceability: PRODUCTION promotion → calibration snapshot |
| FR25 | Epic 4 | Manual attribution coefficient entry mode (pairs with FR6) |
| FR26 | Epic 3 | Manual operator-tagged Overton delta mode (pairs with FR13) |
| FR27 | Epic 5 | Operator invokes 5 measurement Glory tools |
| FR28 | Epic 5 | Manual UI peer path per Glory tool (HYBRID executionType) |
| FR29 | Epic 5 | `applicableNatures` annotation per Glory tool (N6-bis closure folded in) |
| FR30 | Epic 7 | Founder views OvertonRadar in Cockpit |
| FR31 | Epic 7 | Honest empty/degraded state on OvertonRadar |
| FR32 | Epic 7 | Founder read-only + paid-tier gate enforced by procedure type |
| FR33 | Epic 1 | Manifest declarations + SLOs in `governance/slos.ts` |
| FR34 | Epic 1 | APOGEE cap 7/7 preserved (Tarsis/CRM as Vault entries, not Neteru) |
| FR35 | Epic 1 (declared) + Epics 2–7 (enforced) | Anti-drift assertions scaffolded in Epic 1, populated as each epic ships |

**Non-Functional Requirements (14/14 mapped):**

| NFR | Epic | Coverage notes |
|---|---|---|
| NFR1 | Epic 1 | SLOs declared in `slos.ts` for `PROMOTE_PIVOT_SUBCLUSTER` + `RUN_ATTRIBUTION_CALIBRATION` |
| NFR2 | Epic 7 | OvertonRadar < 2s first meaningful render behind Suspense |
| NFR3 | Epic 5 (introduced) + Epic 6 (reuse) | NSP SSE streaming pattern — first applied to Glory tool LLM runs (Epic 5), reused for calibration runs (Epic 6) |
| NFR4 | Epic 2 | Connector credentials in `ExternalConnector` rows only |
| NFR5 | Epic 2 (declared) + all epics (enforced) | `tenantScopedDb` default-deny on every Phase 23 Prisma access |
| NFR6 | Epic 3 | PII gate on MCP + field-level redaction on CRM ingest |
| NFR7 | Epic 6 | Hash-chained calibration + promotion `IntentEmission` |
| NFR8 | Epic 2 | Façade returns `DEFERRED_AWAITING_CREDENTIALS` / typed error, never throw |
| NFR9 | Epic 3 (Overton) + Epic 4 (Superfan) | Degraded state within one poll cycle, no fabricated score |
| NFR10 | Epic 5 (introduced) + Epic 6 (reuse) | NSP `bestEffort()` emit pattern |
| NFR11 | Epic 2 | Test-call result operator-observable |
| NFR12 | Epic 1 (declarative) | Single-Postgres envelope inherited — Phase 23 adds no infra |
| NFR13 | Epic 7 | OvertonRadar a11y per DESIGN-A11Y + Playwright a11y spec |
| NFR14 | Epic 7 | OvertonRadar design tokens only + CVA variants |

**Architectural additional requirements (D1–D9, P22-1..7, child ADRs, N6-bis, CLAUDE.md drift):**

| Item | Epic | Coverage notes |
|---|---|---|
| D1 PRD scope reframe | Epic 1 | First epic story posts correction to PRD `chosen_target.code_map_grep` + closure-roadmap target #1 |
| D2 Overton canonical home (`sector-intelligence/`) | Epic 3 | `culture.*` delegation to sector-intelligence |
| D3 Child ADRs 0077–0081 | Epic 1 (stubs + scope) + Epic 7 (finalize full text) | Stubs created Epic 1, full text + acceptance in Epic 7 closure |
| D4 Connector architecture | Epic 2 | 2 façades + Vault extension + Console UI |
| D5 New Intent kinds + SLOs | Epic 1 (registration) + Epic 6 (handlers) | Intent kinds declared in Mestor + manifest Epic 1; handlers shipped Epic 6 |
| D6 ML calibration methodology | Epic 4 | Pure-TS logistic regression + ROC AUC + RMSE |
| D7 Manual-first parity mechanics | Epic 5 | `executionType: "HYBRID"` + `manualFormSchema` type extension |
| D8 Additive Prisma migration | Epic 1 | Single additive migration covers all downstream needs |
| D9 1 net-new Cockpit route + Console panel | Epic 6 (Console panel) + Epic 7 (Cockpit route) | Split by user surface |
| P22-1 `ConnectorResult<T>` | Epic 1 (declared) + Epics 2–7 (enforced) | Type defined in `src/domain/` Epic 1; HARD test `phase22-connector-result.test.ts` activated Epic 2 |
| P22-2 `INSUFFICIENT_DATA` first-class | Epic 3 (Overton) + Epic 4 (Superfan) | HARD test `phase22-no-silent-zero.test.ts` activated Epic 3, extended Epic 4 |
| P22-3 HYBRID Glory tool extension | Epic 5 | HARD test `phase22-glory-hybrid.test.ts` |
| P22-4 Lifecycle Intent state-machine | Epic 6 | HARD test `phase22-lifecycle-promotion.test.ts` |
| P22-5 Glory tool dispatcher via `getGloryTool(slug)` | Epic 5 | HARD test (extends `phase22-glory-hybrid.test.ts`) |
| P22-6 Calibration snapshot = `IntentEmission` payload | Epic 6 | HARD test `phase22-no-calibration-table.test.ts` |
| P22-7 Dangling ADR refs retired in same commit | Epics 2–6 (per file touched) + Epic 7 (final 0-hits assertion) | HARD test `phase22-no-dangling-adr-refs.test.ts` activated Epic 7 |
| N6-bis `applicableNatures` annotation | Epic 5 | Folded into HYBRID migration of 5 existing tools |
| CLAUDE.md stack drift (Next 16 / TS 6 / Prisma 7) | Epic 1 | Doc-sync in foundations |
| 6 new `phase22-*.test.ts` (HARD) | Epics 1–7 (per pattern) | Scaffolded Epic 1, activated per pattern as deliverables land |
| Extend `campaign-tracker-coherence.test.ts` | Epic 7 | Asserts 6 sub-clusters present + lifecycle states at closure |
| Extend `assembler-uses-manual-path.test.ts` | Epic 5 | Extended to Phase 23 handlers when HYBRID dispatcher lands |
| `neteru-coherence.test.ts` stays green | All epics (declarative) | APOGEE cap 7/7 unchanged across Phase 23 |
| Map updates (CODE-MAP/PAGE-MAP/ROUTER-MAP/SERVICE-MAP/COMPONENT-MAP) | Epic 1 (initial) + Epic 7 (final pass) | CODE-MAP auto-regen pre-commit; others hand-updated as files land |
| RESIDUAL-DEBT carry-overs | Epic 7 | Growth (scheduled re-calibration) + Vision (predictive radar) registered |
| MISSION.md §9 ledger annotations | Epic 7 | 3 of 6 checkboxes become checkable at closure |

**UX Design Requirements (27/27 mapped):**

| UX-DR | Epic | Coverage notes |
|---|---|---|
| UX-DR1 `<OvertonRadar>` props extension + A2 Split + variants | Epic 7 | Net-new Tier 3 component composition delivery |
| UX-DR2 `<OvertonPanel>` Cockpit wrapper | Epic 7 | tRPC + Suspense boundary owner |
| UX-DR3 `CampaignTrackerHub` view switcher B1/B2/B3 | Epic 6 | localStorage per-operator persistence |
| UX-DR4 `CalibrationReviewPanel` (dialog/inline dual host) | Epic 6 | ROC AUC / RMSE vs thresholds + manual coefficient peer tab |
| UX-DR5 `ConnectorRegistrationForm` Vault extension | Epic 2 | Write-once + test-call badge + typed error |
| UX-DR6 `SubClusterStatusCell` triad component | Epic 6 | Used in hub view + "configure connector" cross-link |
| UX-DR7 `ProvenancePopover` Phase-22 documented pattern | Epic 6 | 4 call sites — declared in Epic 6, reused in Epic 7 |
| UX-DR8 `EvangelistLineageView` (attribution extension) | Epic 4 | Cockpit `/cockpit/insights/attribution` extension |
| UX-DR9 5 schema-driven Glory tool manual forms | Epic 5 | Derived from each tool's `outputSchema` |
| UX-DR10 Shared `empty-state` degraded treatment | Epic 3 (introduced for Overton) + Epic 4 (Superfan) + Epic 7 (OvertonRadar) | One canonical pattern across all consumers |
| UX-DR11 `cockpitNavGroups` "Intelligence" entry | Epic 7 | Convergent discovery |
| UX-DR12 Status triad (colour + shape + label) | Epic 2 (introduced — connector state) + Epic 6 (reused — lifecycle) | DESIGN-A11Y §8 |
| UX-DR13 Manual-first as peer toggle | Epic 5 | Pattern declaration; pairs with FR28 |
| UX-DR14 Confirmation attribution pattern | Epic 6 | Calibration accept/reject + lifecycle promotion |
| UX-DR15 Operator-judgement pattern | Epic 6 | Explicit operator act → hash-chained attributed event |
| UX-DR16 Button hierarchy (one primary rouge per surface) | Epic 6 (operator surfaces) + Epic 7 (founder = no mutations) | Read-only enforced visually + by procedure type |
| UX-DR17 Streamed progress via SSE into `aria-live` | Epic 5 (introduced — Glory tool LLM runs) + Epic 6 (reused — calibration runs) | NFR3 a11y |
| UX-DR18 Per-portal density discipline | Epic 6 (compact Console) + Epic 7 (comfortable Cockpit) | DESIGN-SYSTEM §8 |
| UX-DR19 Container queries for OvertonRadar | Epic 7 | Both teaser + full reflow on own width |
| UX-DR20 Responsive target = `lg`+ desktop, tablet stack via container query | Epic 7 (OvertonRadar) + Epic 6 (hub views) | Below `md` not a design target |
| UX-DR21 `<OvertonRadar>` a11y (svg+aria-label+offscreen table) | Epic 7 | NFR13 |
| UX-DR22 Calibration panel a11y (dialog focus mgmt) | Epic 6 | Dialog role + focus trap + ESC + return focus |
| UX-DR23 Focus visible 2px rouge ring | All UI epics (declarative) | Inherited DS rule applied to new interactives |
| UX-DR24 `@axe-core/playwright` 0 critical/serious + visual regression baselines | Epic 7 | Phase 23 UI surfaces |
| UX-DR25 Design tokens only + CVA grammar | All UI epics (declarative) + Epic 7 (enforced on net-new component) | Three DS prohibitions |
| UX-DR26 Motion tokens + reduced-motion fallback | Epic 7 | Score reveals / radar updates |
| UX-DR27 i18n logical properties + `Intl.*` for numerics | Epic 6 (operator surfaces) + Epic 7 (founder surfaces) | Inherited DESIGN-I18N canon |

## Epic List

> **Sequencing principle.** Governance Foundations (Epic 1) ships first and unblocks all downstream work. Epics 2–5 then ship in parallel-eligible pairs (2 enables 3 + 4; 5 is independent of 2). Epic 6 depends on Epics 2 + 4 (calibration consumes attribution + connector signal). Epic 7 depends on Epics 3 + 4 + 6 (Cockpit consumes Overton + Superfan + lifecycle state) and carries Phase 23 closure work.

> **Manual-first parity invariant (ADR-0060).** Each LLM-bearing epic ships its manual UI peer story IN THE SAME EPIC. No standalone LLM story exists. Pairs: Epic 3 (FR13 ↔ FR26), Epic 4 (FR6 ↔ FR25), Epic 5 (FR27 ↔ FR28).

### Epic 1: Phase 23 Governance Foundations

**Epic goal.** Establish the governance scaffolding — child ADRs, Mestor Intent kinds, manifest declarations, SLOs, shared types, the single additive Prisma migration, and the PRD/closure-roadmap correction — that every downstream epic depends on. After this epic, downstream stories have a stable foundation: `ConnectorResult<T>` is importable, `PROMOTE_PIVOT_SUBCLUSTER` and `RUN_ATTRIBUTION_CALIBRATION` are dispatchable (no-op handlers acceptable), the additive `Campaign` / `CampaignAction` fields exist, six `phase22-*.test.ts` files exist (baseline mode), and ADRs 0077–0081 exist as stubs with scope locked. Ships **no user-visible behaviour change** — but unblocks every subsequent ship.

**FRs covered:** FR33, FR34, FR35 (declared)
**NFRs covered:** NFR1 (SLOs declared), NFR5 (declared), NFR12 (declarative inheritance)
**Architectural extras covered:** D1 (PRD correction first story), D3 (5 ADR stubs), D5 (Intent kinds registered), D8 (single additive Prisma migration), P22-1 (`ConnectorResult<T>` declared in `src/domain/`), P22-7 (policy declared), CLAUDE.md stack drift fix, initial map updates (CODE-MAP auto-regen + skeletal entries in PAGE/ROUTER/SERVICE/COMPONENT-MAP), 6 `phase22-*.test.ts` scaffolded at baseline

### Epic 2: External Signal Connectors via Credentials Vault

**Epic goal.** Operator can register two external signal sources (Tarsis-monitoring API + CRM provider) through the Credentials Vault and see each connector's health at a glance (`DEFERRED → test-call → live`). Both façades return `ConnectorResult<T>` per P22-1 and degrade gracefully without keys, satisfying ship-without-keys (Journey 2). After this epic, the OS can talk to the two external signal sources when keys are present, and degrades honestly when they are absent — every downstream measurement epic consumes the standardised shape.

**FRs covered:** FR1, FR2, FR3, FR4, FR5
**NFRs covered:** NFR4, NFR5 (enforced), NFR8, NFR11
**Architectural extras covered:** D4 (connector architecture), P22-1 (consumers — HARD test `phase22-connector-result.test.ts` activated), P22-7 (dangling refs in touched files)
**UX-DRs covered:** UX-DR5 (ConnectorRegistrationForm extension), UX-DR12 (status triad introduced on connector state)

### Epic 3: Overton Measurement Wiring

**Epic goal.** The three `culture.*` pivot sub-clusters move off Jaccard placebos onto real signal. `sector-intelligence/` becomes the canonical Overton engine (D2); `campaign-tracker/culture.overtonShift|overtonReadiness|tarsisBridge` delegate to it. Inbound MCP context lands through `culture.mcpIngest` with the `mcp-content-pii-classifier` gating PII before persistence. Overton output feeds the Oracle "État Overton sectoriel" section (#33). The manual operator-tagged delta mode (FR26) ships as a peer path to the embeddings-based path (FR13). When Tarsis is unconfigured, every consumer surfaces an explicit insufficient-data / degraded state — never a fabricated score. After this epic, the Overton-shift / Overton-readiness scores in the OS are non-placebo and tenant-traceable.

**FRs covered:** FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR26 (manual peer to FR13)
**NFRs covered:** NFR6 (PII gate on MCP), NFR9 (degraded within one poll)
**Architectural extras covered:** D2 (Overton canonical home), P22-2 (`INSUFFICIENT_DATA` first-class — HARD test `phase22-no-silent-zero.test.ts` activated), P22-7 (touched files)
**UX-DRs covered:** UX-DR10 (shared `empty-state` degraded treatment introduced for Overton)
**Manual-first parity pair:** FR13 (algorithmic embeddings path) ↔ FR26 (operator-tagged delta path)

### Epic 4: Superfan Measurement

**Epic goal.** Devotion-ladder transitions are attributed to specific campaigns; cohort retention (J+30/90/180) is computed from CRM signal; evangelist counts and lineage are produced. The pure-TS logistic regression lives in `campaign-tracker/superfan-attribution.ts` (no new dependency, D6); the discriminated `AttributionResult` union forbids silent zeros (P22-2). The manual coefficient-entry mode (FR25) ships as a peer path to the regression (FR6). The founder Cockpit `/cockpit/insights/attribution` page gains an `EvangelistLineageView` extension naming campaigns and their N Ambassador→Evangelist transitions. After this epic, "this campaign produced N evangelists" is a tenant-traceable, source-verifiable claim.

**FRs covered:** FR6, FR7, FR8, FR9, FR10, FR11, FR25 (manual peer to FR6)
**NFRs covered:** NFR9 (degraded within one poll — Superfan side)
**Architectural extras covered:** D6 (ML calibration methodology), P22-2 (enforcement extended), P22-7 (touched files)
**UX-DRs covered:** UX-DR8 (EvangelistLineageView), UX-DR10 (degraded treatment reused for Superfan)
**Manual-first parity pair:** FR6 (regression path) ↔ FR25 (manual coefficient path)

### Epic 5: Measurement Glory Tools — HYBRID + N6-bis

**Epic goal.** The five existing measurement Glory tools (`big-idea-coherence-checker`, `myth-arc-cohesion-evaluator`, `crew-performance-evaluator`, `negative-space-auditor`, `mcp-content-pii-classifier`) migrate from `executionType: "LLM"` to `"HYBRID"`. Each ships an equal-status manual UI peer form (schema-driven from the tool's `outputSchema`, never a parallel schema), and is annotated with `applicableNatures` — closing the Phase 18 N6-bis residual debt. The Glory-tool dispatcher routes via `getGloryTool(slug)` (P22-5); the HARD test `assembler-uses-manual-path.test.ts` is extended to Phase 23 handlers, locking the contract that no orchestrator may call the LLM path directly. After this epic, every measurement Glory tool is functionally available without LLM dependence, and ADR-0060 parity is structural rather than advisory.

**FRs covered:** FR27, FR28, FR29
**NFRs covered:** NFR3 (NSP SSE streaming pattern introduced for LLM runs), NFR10 (`bestEffort()` introduced)
**Architectural extras covered:** D7 (manual-first parity mechanics), P22-3 (HARD test `phase22-glory-hybrid.test.ts` activated), P22-5 (dispatcher discipline), P22-7 (touched files), N6-bis closure
**UX-DRs covered:** UX-DR9 (5 schema-driven manual forms), UX-DR13 (manual-first as peer toggle declared), UX-DR17 (streamed progress over SSE introduced)
**Manual-first parity pair:** FR27 (5 LLM paths) ↔ FR28 (manual UI peer forms)

### Epic 6: Calibration Review + Governed Lifecycle Promotion

**Epic goal.** Operator runs a calibration review against the brand's real campaign history; reads ROC AUC / RMSE values against declared thresholds (not a pass/fail badge); accepts or rejects in an attributed, hash-chained governance event; and promotes a pivot sub-cluster's lifecycle (`STUB → MVP → PRODUCTION`) through `PROMOTE_PIVOT_SUBCLUSTER` (P22-4). The handler refuses `PRODUCTION` without a `calibrationSnapshotRef`; the snapshot itself persists as a `RUN_ATTRIBUTION_CALIBRATION` `IntentEmission` payload (P22-6 — no new table). The Console `/console/governance/campaign-tracker` page gains a three-way view switcher (B1 default + B2 + B3, localStorage-persisted), the `CalibrationReviewPanel` (dialog-from-B1/B2, inline-in-B3), the `SubClusterStatusCell` triad, and the `ProvenancePopover` Phase-22 pattern. After this epic, every pivot score the operator surfaces is traceable in one hop to the calibration snapshot that justified it.

**FRs covered:** FR19, FR20, FR21, FR22, FR23, FR24
**NFRs covered:** NFR3 (SSE reused for calibration runs), NFR7 (hash-chained promotions), NFR10 (`bestEffort()` reused)
**Architectural extras covered:** D5 (handlers shipped), D9 (Console calibration panel), P22-4 (HARD test `phase22-lifecycle-promotion.test.ts`), P22-6 (HARD test `phase22-no-calibration-table.test.ts`), P22-7 (touched files)
**UX-DRs covered:** UX-DR3 (view switcher B1/B2/B3), UX-DR4 (CalibrationReviewPanel), UX-DR6 (SubClusterStatusCell), UX-DR7 (ProvenancePopover declared), UX-DR12 (status triad reused on lifecycle), UX-DR14 (confirmation attribution), UX-DR15 (operator-judgement pattern), UX-DR16 (button hierarchy — operator side), UX-DR17 (streamed progress reused), UX-DR18 (Console compact density), UX-DR22 (calibration dialog a11y), UX-DR27 (i18n on operator surfaces)

### Epic 7: Cockpit Overton Surface + Phase 23 Closure

**Epic goal.** Founder sees, with dated and named concrete evidence, that their sector is bending around them. The existing `<OvertonRadar>` (Tier 3 domain component) has its props wired to real `sector-intelligence` + Tarsis signal through `ConnectorResult<T>`; it gains an `instance: full | teaser` CVA variant with container-query reflow; an honest `empty-state` degraded treatment replaces every blank panel. A new Cockpit route `/cockpit/intelligence/overton` mounts the full panel (paid-tier-gated, read-only); a compact teaser sits in the `/cockpit` dashboard bento; the route is wired into a new minimal `cockpitNavGroups` "Intelligence" entry — two convergent discovery paths satisfy MISSION §9 "every founder sees the sectoral Overton axis." Phase 23 closure work folds into this final epic: the 5 dangling ADR references (0053–0057) reach 0 hits (HARD test `phase22-no-dangling-adr-refs.test.ts`); ADRs 0077–0081 finalize from stubs to accepted; `campaign-tracker-coherence.test.ts` is extended; MISSION.md §9 ledger annotates the 3 newly-checkable boxes; PAGE-MAP/COMPONENT-MAP/RESIDUAL-DEBT update; closure-roadmap target #1 moves to `SHIPPED`. After this epic, the chantier's signature founder-facing moment exists, the §9 ledger moves 0/6 → 3/6, and the project's Mission weighted-score component closes the 98 → 100 gap.

**FRs covered:** FR30, FR31, FR32
**NFRs covered:** NFR2 (OvertonRadar < 2s Suspense), NFR13 (a11y), NFR14 (design tokens only)
**Architectural extras covered:** D3 (5 child ADRs finalized), D9 (1 net-new Cockpit route), P22-7 (HARD test `phase22-no-dangling-adr-refs.test.ts` activated — must hit 0), extension of `campaign-tracker-coherence.test.ts` HARD asserting 6 sub-clusters at correct lifecycle, final map updates (PAGE-MAP +1 route, COMPONENT-MAP Phase-22 patterns documented, RESIDUAL-DEBT carry-overs), MISSION §9 ledger annotations
**UX-DRs covered:** UX-DR1 (`<OvertonRadar>` extension), UX-DR2 (`<OvertonPanel>` wrapper), UX-DR7 (ProvenancePopover reused), UX-DR10 (degraded treatment on OvertonRadar), UX-DR11 (`cockpitNavGroups` Intelligence entry), UX-DR16 (no mutations on founder surfaces), UX-DR18 (Cockpit comfortable density), UX-DR19 (container queries), UX-DR20 (responsive), UX-DR21 (radar a11y), UX-DR23 (focus visible — declarative), UX-DR24 (axe-core gating + visual regression), UX-DR25 (design tokens only — enforced on net-new), UX-DR26 (motion), UX-DR27 (i18n on founder surfaces)

## Epic 1: Phase 23 Governance Foundations

**Epic goal.** Establish the governance scaffolding — child ADRs, Mestor Intent kinds, **Mestor gates**, manifest declarations, SLOs, shared types, the single additive Prisma migration, and the PRD/closure-roadmap correction — that every downstream epic depends on. Ships **no user-visible behaviour change**.

> **Scope extension 2026-05-16** — Story 1.8 (`BRIEF_VS_ADVE_COHERENCE` gate scaffold) added post-STATE_FINAL_BLUEPRINT alignment per blueprint §3 + §21.2 (drift D-3.1 CRITIQUE absorbed). Existing 1.8/1.9 renumbered to 1.9/1.10. Epic story count : 9 → 10. Cf. [sprint-change-proposal-2026-05-16.md](sprint-change-proposal-2026-05-16.md) for the corresponding course correction.

> **Owning Neter:** Mestor (governance dispatcher) · APOGEE sub-system: Guidance (§4.2). · Governance scope: every story in this epic.

### Story 1.1: Open ADR-0077 parent with PRD scope-reframe correction

As a NEFER operator,
I want a parent ADR that captures the Phase 23 scope reframe (architecture D1) plus the dangling-ref retirement policy,
So that downstream epics have an authoritative reference for what Phase 23 actually wires vs. creates, and the PRD/closure-roadmap factual errors are tracked as governance artefacts rather than left silent.

**Acceptance Criteria:**

**Given** the architecture D1 reframe (existing `<OvertonRadar>`, `sector-intelligence/`, 5 Glory tools, 6 sub-clusters)
**When** ADR-0077 is opened at `docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md` with `status: Accepted`
**Then** the ADR enumerates the three buckets (exists / wiring / net-new) verbatim from architecture D1
**And** the ADR §"superseded references" lists the 5 phantom child ADRs (0053-coherence-llm-evaluator, 0054-superfan-attribution-model, 0055-overton-algo, 0056-postmortem-12q, 0057-crew-scoring) with their ADR-0077+ counterparts
**And** the ADR includes a "PRD correction note" sub-section directing readers to the PRD/closure-roadmap correction commits
**And** the PRD frontmatter `chosen_target.code_map_grep` + `scope_summary` are annotated with a correction note pointing to ADR-0077
**And** `closure-roadmap.md` target #1's closure criterion line is corrected ("5 Glory tools wired (exist)" replacing "5 Glory tools created")

### Story 1.2: Open ADRs 0078–0081 as accepted stubs with locked scope

As a NEFER operator,
I want four child ADR stubs created with locked titles, scope, and decision summaries (full text deferred to Epic 7 closure),
So that downstream epics can reference them in code and commits without leaving dangling links, and the doctrinal scope of each decision is fixed before implementation.

**Acceptance Criteria:**

**Given** the architecture D3 table mapping ADRs 0078–0081 to decisions D2/D4/D5/D6
**When** the four ADR files are created at `docs/governance/adr/0078-overton-canonical-home-sector-intelligence.md`, `0079-external-signal-connectors-credentials-vault.md`, `0080-pivot-subcluster-lifecycle-promotion-intent.md`, `0081-superfan-attribution-calibration-methodology.md`
**Then** each ADR has a one-paragraph decision summary, the parent reference to ADR-0077, and a "Status: Accepted (stub — finalization in Epic 7 closure)" frontmatter line
**And** each ADR enumerates the patterns / Intent kinds / files it governs (lifted from architecture step-04)
**And** all five ADRs (0077–0081) are sequentially numbered and no other ADR file in `docs/governance/adr/` uses those numbers

### Story 1.3: Define `ConnectorResult<T>` shared discriminated union

As a NEFER operator,
I want the `ConnectorResult<T>` shape declared once in `src/domain/connector-result.ts`,
So that every connector façade, sub-cluster handler, Glory tool consumer, and UI component imports the same type — pattern P22-1 enforced from a single definition.

**Acceptance Criteria:**

**Given** the architecture P22-1 specification
**When** `src/domain/connector-result.ts` is created
**Then** the file exports `ConnectorResult<T>` as a discriminated union of `{ state: "LIVE"; data: T; observedAt: string }` | `{ state: "DEFERRED_AWAITING_CREDENTIALS"; connectorId: string }` | `{ state: "DEGRADED"; reason: ConnectorDegradationReason; lastObservedAt?: string }`
**And** the file exports `ConnectorDegradationReason` as `"INSUFFICIENT_DATA" | "VENDOR_OUTAGE" | "RATE_LIMITED" | "AUTH_REVOKED"`
**And** the file has no imports (depends on nothing — bottom of the layering cascade)
**And** `tsc --noEmit` is green
**And** ESLint `eslint-plugin-boundaries` accepts the file under `domain/`

### Story 1.4: Register `PROMOTE_PIVOT_SUBCLUSTER` Intent kind + SLO

As a NEFER operator,
I want the `PROMOTE_PIVOT_SUBCLUSTER` async Intent kind registered in Mestor with its SLO,
So that Epic 6 can ship the handler against a stable Intent contract, and `mestor.emitIntent()` accepts dispatches of this kind from day one.

**Acceptance Criteria:**

**Given** the architecture D5 + P22-4 specifications
**When** `services/mestor/intents.ts` is extended
**Then** `PROMOTE_PIVOT_SUBCLUSTER` appears as a registered Intent kind with payload type `{ subClusterSlug: "superfan.attribution" | "superfan.stickiness" | "superfan.crmCapture" | "culture.overtonShift" | "culture.overtonReadiness" | "culture.tarsisBridge" | "culture.mcpIngest"; fromState: "STUB" | "PARTIAL" | "MVP"; toState: "PARTIAL" | "MVP" | "PRODUCTION"; calibrationSnapshotRef?: string; reason: string }`
**And** `governance/slos.ts` declares the SLO (p95 ≤ 15s, cost ≤ $0.10 — async sub-cluster compute Intent envelope)
**And** the Mestor dispatch table routes the kind to a placeholder handler that throws `NOT_YET_IMPLEMENTED` (Epic 6 replaces this)
**And** the kind is declared in `campaign-tracker/manifest.ts` under `acceptsIntents`
**And** `tsc --noEmit` + `lint` are green

### Story 1.5: Register `RUN_ATTRIBUTION_CALIBRATION` Intent kind + SLO

As a NEFER operator,
I want the `RUN_ATTRIBUTION_CALIBRATION` async Intent kind registered with its SLO,
So that Epic 6 can implement the calibration handler against a stable Intent contract, and the slow-call SLO (p95 ≤ 60s, cost ≤ $0.50) is declared on the manifest from day one.

**Acceptance Criteria:**

**Given** the architecture D5 + D6 specifications
**When** `services/mestor/intents.ts` is extended
**Then** `RUN_ATTRIBUTION_CALIBRATION` appears as a registered Intent kind with payload type `{ strategyId: string; campaignIds?: string[]; mode: "AUTO" | "MANUAL_COEFFICIENTS"; operatorCoefficients?: Record<string, number> }`
**And** `governance/slos.ts` declares the SLO (p95 ≤ 60s, cost ≤ $0.50)
**And** the kind is declared in `campaign-tracker/manifest.ts` under `acceptsIntents` with `streamingProgress: true` flag
**And** a placeholder handler throws `NOT_YET_IMPLEMENTED` (Epic 6 replaces this)
**And** `tsc --noEmit` + `lint` are green

### Story 1.6: Ship the single additive Prisma migration for Campaign + CampaignAction

As a NEFER operator,
I want one additive Prisma migration adding all Phase 23 nullable fields on `Campaign` and `CampaignAction`,
So that Epics 3/4/6 can write to and read from these fields without each adding their own migration — single PR review surface, single rollback unit.

**Acceptance Criteria:**

**Given** the architecture D8 + P22-6 specifications
**When** `prisma migrate dev --name phase22_campaign_additive_fields` is run
**Then** the migration adds nullable columns: `Campaign.attributionCoefficients` (Json), `Campaign.activeCalibrationSnapshotRef` (String — IntentEmission.id pointer), `CampaignAction.overtonDeltaManual` (Float), `CampaignAction.manualEntryFlag` (Boolean)
**And** no existing column is altered or dropped
**And** no new table is created (P22-6: calibration snapshots live in `IntentEmission` payloads)
**And** `prisma generate` succeeds and `tsc --noEmit` is green against the regenerated client
**And** the migration applied cleanly on a fresh DB and on an existing dev DB with seed data (no data loss)

### Story 1.7: Scaffold 6 `phase22-*.test.ts` anti-drift tests at baseline

As a NEFER operator,
I want the six new HARD-mode anti-drift tests to exist as files (in baseline / pending mode) from Epic 1,
So that downstream epics activate them as their patterns ship — and CI never sees a phase where the test files are missing.

**Acceptance Criteria:**

**Given** the architecture §"Pattern enforcement" specification
**When** the test files are created under `tests/unit/governance/`
**Then** the following six files exist as Vitest suites: `phase22-connector-result.test.ts`, `phase22-no-silent-zero.test.ts`, `phase22-glory-hybrid.test.ts`, `phase22-lifecycle-promotion.test.ts`, `phase22-no-calibration-table.test.ts`, `phase22-no-dangling-adr-refs.test.ts`
**And** each file contains a placeholder `it.todo("activated in Epic N")` referencing its owning epic
**And** `pnpm test` (or `npm test`) is green (no `it.todo` counts as failure)
**And** each file has a header comment referencing its owning pattern (P22-1 through P22-7) and the ADR (0077+) that governs it

### Story 1.8: Scaffold BRIEF_VS_ADVE_COHERENCE governance gate

> **NEW story inserted 2026-05-16** post-STATE_FINAL_BLUEPRINT alignment per blueprint §3 + §21.2 (drift D-3.1 CRITIQUE — "Briefs clients entrent sans validation cœur ADVE. Trou doctrinal."). Sibling of Stories 1.4/1.5 (Intent kind scaffolds) — type contract + handler stub, full enforcement deferred to closure-roadmap target #14 (Phase 24).

As a NEFER operator,
I want the `BRIEF_VS_ADVE_COHERENCE` gate type + handler stub registered in Mestor's gate registry from Phase 23 Epic 1,
So that subsequent ingestion flows (Phase 24 closure-target #14) can plug into a stable contract, and the governance foundation that blueprint §3 + §21.2 (drift D-3.1 CRITIQUE) calls for is laid alongside the lifecycle Intent scaffolding in the same epic.

**Acceptance Criteria:**

**Given** STATE_FINAL_BLUEPRINT §3 (ADVE = brand noyau) + §21.2 (D-3.1 CRITICAL gate absent) + ADR-0023 (OPERATOR_AMEND_PILLAR as unique ADVE write path) + ADR-0049 (Brief Mandatory Gate)
**When** `src/server/services/mestor/gates/brief-vs-adve-coherence.ts` is created
**Then** the file exports a `briefVsAdveCoherenceGate` function with signature `(input: { strategyId: string; brief: { content: string; pillarBindings?: PillarKey[] } }, ctx: GateContext) => Promise<GateResult>` where `GateResult` is the canonical `{ verdict: "PASS" | "BLOCK" | "WARN"; reason?: string; evidence?: unknown }` discriminated union
**And** the gate stub body throws `NOT_YET_IMPLEMENTED("BRIEF_VS_ADVE_COHERENCE enforcement deferred to closure-target #14 Phase 24")` — same scaffolding pattern as Stories 1.4/1.5 Intent kind handlers
**And** the gate is registered in `services/mestor/gates/index.ts` under the canonical `MestorGates` map type, with `governor: MESTOR` per [ADR-0084](../../docs/governance/adr/0084-os-architecture-8-canonical-layers.md) layer 5 boundary
**And** a new anti-drift test `tests/unit/governance/brief-vs-adve-coherence-scaffold.test.ts` asserts the gate is exported, registered in the map, and currently throws `NOT_YET_IMPLEMENTED` (so production code referencing it pre-Phase-24 fails fast)
**And** [ADR-0049](../../docs/governance/adr/0049-brief-mandatory-gate.md) is cross-referenced from the new gate file header — this gate is the *coherence* enforcement layer that sits on top of ADR-0049's *mandatory* enforcement layer
**And** closure-roadmap target #14 entry is annotated `Phase 23 Story 1.8 scaffold shipped` once this story merges
**And** `tsc --noEmit` + `lint` are green

### Story 1.9: Correct CLAUDE.md stack drift + post PRD / closure-roadmap correction notes

> *(Renumbered 2026-05-16 — was Story 1.8 pre-blueprint alignment.)*

As a NEFER operator,
I want the project memory file accurate before any Phase 23 implementation lands,
So that downstream stories cannot be misled by stale "Next 15 / TS 5.8 / Prisma 6" wording, and the PRD scope correction is in two of the seven sources of truth from day one.

**Acceptance Criteria:**

**Given** `package.json` reality (Next 16 / TS 6 / Prisma 7) and the architecture-mandated PRD correction
**When** CLAUDE.md is edited
**Then** the "Stack" section reads "Next.js 16 + React 19 + TypeScript 6 + Tailwind 4 + tRPC 11 + Prisma 7"
**And** the "Phase status" section gains an entry for Phase 23 in `IN_DEV` state pointing to ADR-0077
**And** the PRD frontmatter and the closure-roadmap target #1 closure criterion both carry the correction note (this story makes the edits Story 1.1 promised)
**And** anti-drift `audit-changelog-coverage` husky hook is green

### Story 1.10: Initial map updates — reserve Phase 23 entries

> *(Renumbered 2026-05-16 — was Story 1.9 pre-blueprint alignment.)*

As a NEFER operator,
I want skeletal entries in PAGE-MAP / ROUTER-MAP / SERVICE-MAP / COMPONENT-MAP reserving Phase 23 surfaces,
So that downstream epics populate them as files land rather than fighting merge conflicts, and the canonical maps stay synchronized with implementation reality.

**Acceptance Criteria:**

**Given** the architecture §"Phase 23 Touched Slice" tree
**When** the canonical maps are edited
**Then** PAGE-MAP.md gains a reserved entry for `/cockpit/intelligence/overton` (status: pending — Epic 7)
**And** ROUTER-MAP.md gains a "Phase 23 additions to `campaign-tracker` router (pending — Epic 6)" note
**And** SERVICE-MAP.md gains pending entries for `services/seshat/tarsis/` and `services/anubis/providers/crm-provider` (Epic 2)
**And** COMPONENT-MAP.md notes that `<OvertonRadar>` will be consumed by a route in Phase 23 (Epic 7) and that Phase-22 reusable patterns (degraded/empty, provenance, status-lifecycle, operator-judgement) will be documented (Epic 6/7)
**And** Husky pre-commit auto-regenerates CODE-MAP.md without conflict

## Epic 2: External Signal Connectors via Credentials Vault

**Epic goal.** Operator can register two external signal sources (Tarsis-monitoring API + CRM provider) through the Credentials Vault and see each connector's health at a glance (`DEFERRED → test-call → live`). Both façades return `ConnectorResult<T>` per P22-1 and degrade gracefully without keys, satisfying ship-without-keys (Journey 2).

> **Owning Neteru:** Seshat (Tarsis connector — Telemetry sub-system §4.3) + Anubis (CRM connector + Credentials Vault — Comms sub-system §4.7). · Mestor implicit.

### Story 2.1: [governance] Register two new connector types in Credentials Vault

As a NEFER operator,
I want the two new connector types declared in `anubis/credential-vault.ts`,
So that the Vault registry recognises `tarsis-monitoring` and `crm-provider` provider IDs, and downstream stories can implement their façades against a stable contract.

**Acceptance Criteria:**

**Given** the architecture D4 + ADR-0079 specifications
**When** `services/anubis/credential-vault.ts` is extended
**Then** two new connector type definitions are registered: `tarsis-monitoring` (Seshat-governed) and `crm-provider` (Anubis-governed) with their respective credential schemas (Zod) declaring required fields (API key, optional endpoint override, optional account scope)
**And** each declaration includes the per-`Operator` storage path (no env-var fallback per NFR4)
**And** `tsc --noEmit` is green
**And** `eslint-plugin-boundaries` accepts the additions under `services/anubis/`
**And** anti-drift `neteru-coherence.test.ts` stays green — no Neter has been added; these are Vault entries

### Story 2.2: Implement Tarsis-monitoring façade returning `ConnectorResult<TarsisSignal>`

As an UPgraders operator,
I want the Tarsis-monitoring connector façade to return `ConnectorResult<TarsisSignal>` exhaustively,
So that downstream sub-clusters (`culture.tarsisBridge`, `sector-intelligence`) consume sectoral signal through the standardised shape — `DEFERRED_AWAITING_CREDENTIALS` when keys are absent, `LIVE`/`DEGRADED` otherwise.

**Acceptance Criteria:**

**Given** Story 1.3 (ConnectorResult<T>) and Story 2.1 (Vault registration)
**When** `services/seshat/tarsis/connector.ts` is created
**Then** the file exports `fetchSectorSignal(sectorSlug: string): Promise<ConnectorResult<TarsisSignal>>` where `TarsisSignal = { vocabularyOverlap, claimImitations, unpaidPress, embeddingDelta }`
**And** absent credentials cause the façade to return `{ state: "DEFERRED_AWAITING_CREDENTIALS", connectorId: "tarsis-monitoring" }` — never throws (NFR8)
**And** transient HTTP / network failure causes the façade to return `{ state: "DEGRADED", reason: "VENDOR_OUTAGE" | "RATE_LIMITED" | "AUTH_REVOKED" }` — never throws, never returns fabricated `LIVE` data (no-magic-fallback ADR-0046)
**And** the façade reads its credentials via `tenantScopedDb` against `ExternalConnector` rows (NFR5 — per-operator scoping)
**And** Vitest unit tests cover all three return states with mocked transports

### Story 2.3: Implement CRM provider façade with field-level PII redaction

As an UPgraders operator,
I want the CRM provider connector façade to return `ConnectorResult<CrmCohortSignal>` with field-level PII redaction,
So that Epic 4's `superfan-economy.ts` consumes cohort retention signal through the standardised shape, and customer PII never persists raw in our tenant (NFR6).

**Acceptance Criteria:**

**Given** Story 1.3 (ConnectorResult<T>) and Story 2.1 (Vault registration)
**When** `services/anubis/providers/crm-provider.ts` is created
**Then** the file exports `fetchCohortSignal(brandId: string, params: { window: "J+30"|"J+90"|"J+180" }): Promise<ConnectorResult<CrmCohortSignal>>`
**And** field-level PII redaction is applied before any cohort row leaves the façade (email/phone/name redacted to a stable hash; redaction list configurable per connector instance)
**And** absent credentials → `DEFERRED_AWAITING_CREDENTIALS`; transient failure → `DEGRADED` with typed reason
**And** the façade reads credentials per-`Operator` via `tenantScopedDb` (NFR5)
**And** Vitest unit tests cover all three states + the redaction contract (raw PII never appears in returned `LIVE` data)

### Story 2.4: Extend Console `/console/anubis/credentials` UI for two new connector types

As an UPgraders operator,
I want the Credentials Vault UI to register, test, and observe Tarsis-monitoring + CRM connectors,
So that I can wire signal sources without code, see `DEFERRED → test-call → live` transitions at a glance, and diagnose integration health without server logs (NFR11).

**Acceptance Criteria:**

**Given** Stories 2.2 + 2.3 (façades implemented)
**When** the Console route `/console/anubis/credentials/page.tsx` is extended
**Then** the page lists Tarsis-monitoring + CRM provider as two registrable connector types alongside existing ad-network connectors
**And** the registration form is a `form-modal` composing existing `field-*` primitives (write-once secret entry per UX-DR5: masked "configured" state after save with "replace" action; key never re-displayed)
**And** the test-call result renders as a status `badge` (reachable / failed + cause) — colour + shape + text triad per UX-DR12, not colour-only
**And** the connector status badge consumes the `ConnectorResult<T>.state` discriminator: `DEFERRED_AWAITING_CREDENTIALS` uses **info** tone (not warning), `LIVE` uses success, `DEGRADED` uses warning
**And** typed-error states (e.g. `AUTH_REVOKED`) display a `cause` line and retain entered values for retry
**And** the page consumes Tier 1/2/3 tokens only and CVA grammar; no raw Tailwind colour class, no Tier 0 Reference (three DS prohibitions)
**And** keyboard-only flow covers register → test → close (DESIGN-A11Y §4)

### Story 2.5: Activate HARD test `phase22-connector-result.test.ts`

As a NEFER operator,
I want the connector-result exhaustiveness test in HARD mode,
So that any future code path that swallows a transient connector failure into a `LIVE` result, or returns `null`/`undefined` from a connector-dependent capability, fails CI on the offending PR.

**Acceptance Criteria:**

**Given** Stories 2.2 + 2.3 (façades return `ConnectorResult<T>`)
**When** `tests/unit/governance/phase22-connector-result.test.ts` is filled in (replacing the `it.todo` from Story 1.7)
**Then** the test asserts: every export under `services/seshat/tarsis/` and `services/anubis/providers/` whose name matches a connector-fetch pattern returns a `ConnectorResult<T>` type (or compatible discriminated union)
**And** the test asserts: no file under `services/seshat/tarsis/` or `services/anubis/providers/` contains a `try`/`catch` swallowing a transport error into a `LIVE` result (pattern check via AST or regex)
**And** the test is configured `mode: "HARD"` (no baseline) — any new violation fails CI
**And** `pnpm test` is green; the test runs in < 2s

## Epic 3: Overton Measurement Wiring

**Epic goal.** Three `culture.*` sub-clusters move off Jaccard placebos onto real signal. `sector-intelligence/` becomes the canonical Overton engine (D2). MCP context lands through `culture.mcpIngest` gated by `mcp-content-pii-classifier`. Overton output feeds Oracle §33. Manual operator-tagged delta mode (FR26) ships as a peer to FR13.

> **Owning Neter:** Seshat (Telemetry + sector-intelligence — §4.3). · Anubis (MCP transport — §4.7).
> **Manual-first parity pair:** Story 3.7 (manual delta) pairs with Story 3.2/3.3 (algorithmic embeddings path).

### Story 3.1: [governance] Extend `sector-intelligence/` to accept `ConnectorResult<TarsisSignal>`

As a NEFER operator,
I want `sector-intelligence/index.ts` extended to consume `ConnectorResult<TarsisSignal>` as input (data-in / data-out, pure),
So that the canonical Overton engine integrates with the Tarsis connector through the standardised shape, without `sector-intelligence/` ever importing the connector module directly (one-way data flow per architecture §Architectural Boundaries).

**Acceptance Criteria:**

**Given** Story 2.2 (Tarsis façade) and Story 1.3 (`ConnectorResult<T>`)
**When** `services/sector-intelligence/index.ts` is extended
**Then** `refreshSectorOverton(input: { slug: string; signals: ConnectorResult<TarsisSignal> })` accepts the discriminated union exhaustively (LIVE → updates `Sector`; DEFERRED → no-op + emits log; DEGRADED → no-op + emits log)
**And** `sector-intelligence/` does NOT import `services/seshat/tarsis/connector` (asserted by ESLint boundaries or madge)
**And** `services/sector-intelligence/manifest.ts` is extended to declare any new accepted Intent kinds if required (else unchanged)
**And** the existing `getSectorAxis` / `detectDrift` / `computeBrandDeflection` functions are unchanged in signature (Epic 3 wires them, does not refactor them)
**And** Vitest unit tests cover the three input states with mocked `Sector` writes

### Story 3.2: Delegate `culture.overtonShift` to `sector-intelligence.detectDrift` + `computeBrandDeflection`

As an UPgraders operator,
I want `campaign-tracker/culture.overtonShift` to delegate its computation to `sector-intelligence/` instead of the Jaccard placeholder,
So that the Overton-shift score becomes a real sectoral-embedding delta rather than token overlap.

**Acceptance Criteria:**

**Given** Story 3.1 (sector-intelligence accepts ConnectorResult)
**When** `services/campaign-tracker/signals-culture.ts` is edited
**Then** the `culture.overtonShift` handler calls `sector-intelligence.detectDrift({ brandId, sectorSlug })` + `computeBrandDeflection(...)` and returns its `OK | INSUFFICIENT_DATA` result
**And** the Jaccard token-overlap fallback is removed (the placeholder comment `MVP heuristic — vrai algo Overton viendra` is replaced with a reference to ADR-0078)
**And** when `sector-intelligence` returns `INSUFFICIENT_DATA`, the sub-cluster returns the same discriminated state — no fabricated zero or "—" placeholder (P22-2)
**And** the `capability-state.ts` entry for `culture.overtonShift` lifts from `PARTIAL` to `MVP`; the `childAdr` field points to ADR-0078 (not the dangling 0055-overton-algo)
**And** existing tRPC reads continue to function (signature unchanged from consumer perspective; only return shape extended to include `INSUFFICIENT_DATA` branch)

### Story 3.3: Delegate `culture.overtonReadiness` to `sector-intelligence.getSectorAxis`

As an UPgraders operator,
I want `culture.overtonReadiness` to compute proximity via `sector-intelligence.getSectorAxis` instead of token Jaccard,
So that Overton-readiness reflects real sectoral position, not vocabulary overlap.

**Acceptance Criteria:**

**Given** Story 3.1 (sector-intelligence wiring) and Story 3.2 (Shift delegation pattern)
**When** `services/campaign-tracker/signals-culture.ts` is edited for the `culture.overtonReadiness` handler
**Then** the handler calls `sector-intelligence.getSectorAxis({ sectorSlug })` and computes proximity using the returned axis instead of token Jaccard
**And** the Jaccard fallback is removed; the comment is replaced with reference to ADR-0078
**And** absent / insufficient sector axis → handler returns `INSUFFICIENT_DATA` typed branch — never zero, never "—"
**And** `capability-state.ts` for `culture.overtonReadiness` lifts to `MVP` with `childAdr: "0078"`

### Story 3.4: Wire `culture.tarsisBridge` to feed `sector-intelligence.refreshSectorOverton`

As an UPgraders operator,
I want `culture.tarsisBridge` to pull signal from the Tarsis connector and hand it to `sector-intelligence.refreshSectorOverton`,
So that real sectoral signal accrues into the `Sector` model that `overtonShift`/`overtonReadiness` consume.

**Acceptance Criteria:**

**Given** Stories 2.2 (Tarsis façade) + 3.1 (sector-intelligence accepts ConnectorResult)
**When** `services/campaign-tracker/signals-culture.ts` `culture.tarsisBridge` handler is extended
**Then** the handler calls `tarsisConnector.fetchSectorSignal(sectorSlug)`, switches on `ConnectorResult.state` exhaustively, and on `LIVE` invokes `sector-intelligence.refreshSectorOverton({ slug, signals })`
**And** on `DEFERRED_AWAITING_CREDENTIALS` and `DEGRADED`, the handler emits a telemetry note (via `bestEffort()` per NFR10) and returns `INSUFFICIENT_DATA` — no fake signal injection
**And** the handler imports `tarsisConnector` from `services/seshat/tarsis/connector`; this is the only place that imports the connector from `campaign-tracker/` (one-way data flow per architecture §boundaries)
**And** `capability-state.ts` for `culture.tarsisBridge` lifts to `MVP` with `childAdr: "0078"`

### Story 3.5: Wire `culture.mcpIngest` through existing MCP client + `mcp-content-pii-classifier` gate

As an UPgraders operator,
I want inbound MCP context to land into `culture.mcpIngest` only after the `mcp-content-pii-classifier` Glory tool has classified PII,
So that customer PII is flagged before persistence (NFR6) and `culture.mcpIngest` exits its STUB state.

**Acceptance Criteria:**

**Given** the existing `mcp-client.ts` transport (Phase 16) and Epic 5 (HYBRID extension lands in Epic 5; this story consumes the existing `mcp-content-pii-classifier` in its current `LLM`-only state and tolerates the upgrade transparently)
**When** `services/campaign-tracker/culture/mcp-ingest.ts` (or equivalent file per architecture touch-slice) is created/extended
**Then** the handler accepts inbound MCP context via `mcp-client.ts`, invokes `getGloryTool("mcp-content-pii-classifier")` BEFORE persisting any field
**And** fields flagged as PII are tagged with the classifier's discriminated output (redacted-hash + classification reason) before persistence
**And** if the classifier returns `INSUFFICIENT_DATA` or fails Zod validation, the handler refuses to persist and emits an audit log (no silent persistence)
**And** `capability-state.ts` for `culture.mcpIngest` lifts to `MVP` with `childAdr: "0078"`
**And** Vitest test covers: (a) PII-flagged field gets redacted-hash, (b) classifier-fail short-circuits persistence

### Story 3.6: Wire Overton output to Oracle §33 reader

As a founder,
I want the Oracle "État Overton sectoriel" section (#33) to reflect real Overton measurement output,
So that the deliverable Oracle document carries the same instrumented signal the Cockpit shows — not Jaccard placebo (FR17).

**Acceptance Criteria:**

**Given** Stories 3.2 + 3.3 (real Overton wiring) and the existing Oracle generation pipeline (`services/strategy-presentation/`)
**When** the Oracle §33 reader is extended
**Then** section #33 generation pulls from `sector-intelligence.getSectorAxis` / `detectDrift` results (via `culture.overtonShift|overtonReadiness` outputs) instead of any token-Jaccard heuristic
**And** when those returns are `INSUFFICIENT_DATA`, section #33 renders an explicit "État Overton sectoriel — signal en attente" content block, not a fabricated narrative
**And** Oracle generation reuses the manual-first parity invariant (the section #33 consumer accepts both algorithmic and manual-delta inputs via Story 3.7)
**And** Vitest test asserts section #33 output reflects `OK` vs `INSUFFICIENT_DATA` correctly

### Story 3.7: Ship manual operator-tagged Overton-delta mode (FR26 — manual peer to FR13)

As an UPgraders operator,
I want to tag Overton deltas manually on a `CampaignAction` when the embeddings path is unavailable or I disagree with it,
So that ADR-0060 manual-first parity is structural for the Overton mechanic — the manual path produces the same downstream output as the algorithmic path.

**Acceptance Criteria:**

**Given** Story 1.6 (additive `CampaignAction.overtonDeltaManual: Float?` field) and the existing Console campaign-tracker surface
**When** the Console UI exposes an operator-entry form for `overtonDeltaManual` on a `CampaignAction`
**Then** the form is presented as a **peer toggle** (visible BEFORE any error per UX-DR13), not buried in an error-recovery path
**And** the manual entry's Zod schema equals the embeddings-path output schema field-for-field (downstream consumer cannot distinguish source)
**And** when both algorithmic and manual values exist, `culture.overtonShift` consumes the manual value (operator override) and stamps the result with a `source: "MANUAL_OPERATOR" | "ALGORITHMIC"` discriminator on the IntentEmission payload — auditable
**And** entry is hash-chained as a governed `IntentEmission` (via `mestor.emitIntent()`, not direct service-from-router)
**And** keyboard-only flow covers form open → enter → submit

### Story 3.8: Activate HARD test `phase22-no-silent-zero.test.ts`

As a NEFER operator,
I want the no-silent-zero anti-drift test in HARD mode covering Phase 23 measurement files,
So that any `?? 0` / `|| 0` on a score field — or any path that returns `0` instead of `INSUFFICIENT_DATA` — fails CI immediately.

**Acceptance Criteria:**

**Given** Stories 3.2–3.5 (delegations dropping Jaccard) and Story 3.6 (Oracle wiring)
**When** `tests/unit/governance/phase22-no-silent-zero.test.ts` is activated (replacing Story 1.7's `it.todo`)
**Then** the test scans `services/campaign-tracker/signals-culture.ts`, `services/sector-intelligence/`, `services/campaign-tracker/culture/*` for AST patterns `?? 0` / `|| 0` on identifiers matching `*.score` / `*.shift` / `*.readiness` / `*.delta` — must be 0 hits
**And** the test asserts every measurement handler in those modules returns a discriminated union with both an `OK` and an `INSUFFICIENT_DATA` branch (no boolean / nullable score return type)
**And** the test is `mode: "HARD"` — no baseline
**And** `pnpm test` is green

## Epic 4: Superfan Measurement

**Epic goal.** Devotion-ladder transitions are attributed to specific campaigns; cohort retention is computed from CRM signal; evangelist counts + lineage are produced. Pure-TS logistic regression (no new dep, D6). Manual coefficient mode (FR25) pairs with regression (FR6).

> **Owning Neter:** Anubis (CRM connector — §4.7). · Mestor (governance Intent dispatch).
> **Manual-first parity pair:** Story 4.5 (manual coefficient) pairs with Story 4.2 (regression path).

### Story 4.1: [governance] Define `AttributionResult` discriminated union

As a NEFER operator,
I want `AttributionResult` declared as a discriminated union in `campaign-tracker/superfan-attribution.ts`,
So that every consumer of attribution output handles `OK` and `INSUFFICIENT_DATA` exhaustively — pattern P22-2 enforced from the type level.

**Acceptance Criteria:**

**Given** Story 1.3 (`ConnectorResult<T>` precedent for discriminated unions)
**When** `services/campaign-tracker/superfan-attribution.ts` is created (or its types module if split)
**Then** the file exports `AttributionResult` as `{ state: "OK"; score: number; lineage: EvangelistTransition[]; snapshotRef: string } | { state: "INSUFFICIENT_DATA"; minSamplesRequired: number; samplesAvailable: number }`
**And** the file exports `EvangelistTransition` as `{ campaignId, transitionFrom: "Curious" | "Convinced" | "Ambassador", transitionTo: "Ambassador" | "Evangelist", observedAt: string }`
**And** no `null` / `undefined` return is permitted (asserted via type-only test)
**And** `tsc --noEmit` is green

### Story 4.2: Implement pure-TS logistic regression + ROC AUC + RMSE

As an UPgraders operator,
I want a pure-TS logistic regression in `campaign-tracker/superfan-attribution.ts` attributing devotion transitions to `CampaignAction`s,
So that superfan attribution exists as a credible model and the calibration handler in Epic 6 has a callable algorithm — without adding a new numeric/stats dependency (D6).

**Acceptance Criteria:**

**Given** Story 4.1 (`AttributionResult`) and the additive `Campaign.attributionCoefficients` field from Story 1.6
**When** `services/campaign-tracker/superfan-attribution.ts` is filled
**Then** the file exports `runAttribution(input: { campaignIds: string[]; coefficients?: Record<string, number> }): Promise<AttributionResult>` — pure TS, no new npm dependency
**And** the function fits a logistic regression on observed devotion transitions in the input campaign window (via simple gradient descent if `coefficients` absent; uses operator-supplied `coefficients` if present)
**And** the function returns `ROC AUC` and `RMSE` as part of an internal evaluation payload that the calibration handler (Epic 6) will surface — implemented in ≤ ~60 LOC for the metrics (D6 footprint envelope)
**And** when the input window has < `minSamplesRequired` (heuristic default e.g. 30 transitions), the function returns `INSUFFICIENT_DATA` — never a fabricated score (no-magic-fallback)
**And** Vitest unit tests cover: (a) clean fit on synthetic data with known coefficients (regression converges within tolerance), (b) `INSUFFICIENT_DATA` path on sparse input

### Story 4.3: Extend `superfan-economy.ts` to compute cohort retention from CRM connector

As an UPgraders operator,
I want `superfan.stickiness` to compute J+30 / J+90 / J+180 cohort retention from real CRM signal,
So that the sub-cluster exits its PARTIAL state with traceable data.

**Acceptance Criteria:**

**Given** Story 2.3 (CRM façade) and Story 1.3 (`ConnectorResult<T>`)
**When** `services/campaign-tracker/superfan-economy.ts` is extended
**Then** the `superfan.stickiness` handler imports `crmProvider.fetchCohortSignal` from `services/anubis/providers/crm-provider` and switches on `ConnectorResult` exhaustively
**And** on `LIVE`, the handler returns the three retention values (J+30/90/180) as a discriminated `OK` branch
**And** on `DEFERRED` or `DEGRADED`, the handler returns `INSUFFICIENT_DATA` — never a fabricated retention value
**And** `superfan.crmCapture` is similarly wired (counts evangelist-like CRM events)
**And** `capability-state.ts` for `superfan.stickiness` + `superfan.crmCapture` lifts to `MVP` with `childAdr: "0081"`
**And** Vitest covers all three connector states

### Story 4.4: Compute evangelist count + lineage from devotion transitions

As an UPgraders operator,
I want `superfan-attribution.ts` to populate the `lineage` field on `OK` results,
So that "this campaign produced N Ambassador→Evangelist transitions" is a tenant-traceable, source-verifiable claim (FR8).

**Acceptance Criteria:**

**Given** Story 4.2 (regression + ROC AUC / RMSE returning `OK`)
**When** the regression returns `OK`
**Then** the `lineage: EvangelistTransition[]` array is populated with the actual devotion transitions in the input window — `campaignId` + `transitionFrom` + `transitionTo` + `observedAt`
**And** the evangelist count is derivable from `lineage.filter(t => t.transitionTo === "Evangelist").length`
**And** when `INSUFFICIENT_DATA` is returned, `lineage` is empty (not undefined, not zero-length-by-accident) — Vitest asserts this
**And** the additive field `Campaign.activeCalibrationSnapshotRef` (from Story 1.6) is populated with the `snapshotRef` value from the latest `OK` run if the run is accepted (acceptance happens in Epic 6, but this story preserves the field)

### Story 4.5: Ship manual coefficient-entry mode (FR25 — manual peer to FR6)

As an UPgraders operator,
I want to enter attribution-model coefficients manually as a peer mode to the regression,
So that ADR-0060 parity is structural for the superfan-attribution mechanic — operator judgement is an equal-status path to the algorithm.

**Acceptance Criteria:**

**Given** Story 4.2 (regression accepts optional `coefficients`) and Story 1.6 (`Campaign.attributionCoefficients` field)
**When** the Console campaign-tracker surface exposes a manual coefficient-entry form (presented as a peer tab in the calibration panel — full UI lands in Epic 6 Story 6.5; this story ships the back-end mode)
**Then** the form's Zod schema equals the regression `coefficients` shape (`Record<string, number>`) — not a parallel schema
**And** the back-end `RUN_ATTRIBUTION_CALIBRATION` Intent payload (registered in Story 1.5) supports `mode: "MANUAL_COEFFICIENTS"` + `operatorCoefficients: Record<string, number>` — the handler in Epic 6 will invoke `runAttribution` with these coefficients and skip the gradient descent
**And** entries persist to `Campaign.attributionCoefficients`; downstream readers cannot distinguish "ran the regression and got these" from "operator entered these" except via the `IntentEmission` payload's `source` discriminator
**And** Vitest asserts both code paths return the same `AttributionResult.OK` shape

### Story 4.6: Operator view of attribution + lineage in Console

As an UPgraders operator,
I want to see a campaign's attribution result and evangelist lineage in the Console campaign-tracker view,
So that I can defend the score to a client by pointing at the lineage — recognised devotion transitions, dated, named (FR9).

**Acceptance Criteria:**

**Given** Stories 4.2 + 4.4 (regression + lineage populated)
**When** the Console campaign-tracker UI (existing route `/console/governance/campaign-tracker`) renders a campaign row
**Then** the row exposes a "View attribution lineage" affordance opening a panel/popover showing the `lineage: EvangelistTransition[]` content (date, campaignId, transitionFrom→transitionTo)
**And** when the result is `INSUFFICIENT_DATA`, the panel shows the honest empty state per UX-DR10 (icon + cause + unlock path — e.g. "10 of 30 transitions observed; need 20 more")
**And** the panel composes existing primitives (`popover` / `dialog` + `timeline` + `kpi-grid`) — no new primitive
**And** all reads via `operatorProcedure` (tenant-scoped) — no direct service-from-router

### Story 4.7: `EvangelistLineageView` Cockpit extension on `/cockpit/insights/attribution`

As a founder,
I want to see the evangelist lineage of a named campaign on my Cockpit attribution page,
So that I witness "this campaign produced N Ambassador→Evangelist transitions" as concrete observed evidence, not a vanity counter (FR10 + UX-DR8).

**Acceptance Criteria:**

**Given** Stories 4.2 + 4.4 + 4.6 (operator view exists) and the existing `/cockpit/insights/attribution` route
**When** the Cockpit attribution page is extended with the `EvangelistLineageView` composition
**Then** the view names a campaign and lists N Ambassador→Evangelist transitions with dates — composing `timeline` + `card-metric` primitives
**And** the view is **read-only** (no mutation button, no operator-only affordance — UX-DR16); reads go through `operatorProcedure` tenant-scoped to the founder's brand `Strategy`
**And** the view is `requiresPaidTier`-gated (`COCKPIT_MONTHLY` / `RETAINER_*`) per FR32
**And** when the campaign returns `INSUFFICIENT_DATA`, the view shows the honest founder-facing empty state ("Lignée évangéliste — accumulation en cours") with cause and unlock path
**And** the view uses Cockpit `comfortable` density token, design tokens only, CVA grammar (three DS prohibitions respected)
**And** Cockpit copy translates internal terms (no "sub-cluster", "regression", "ROC AUC" leaks to the founder) per LEXICON.md

### Story 4.8: Extend `phase22-no-silent-zero.test.ts` to superfan paths

As a NEFER operator,
I want the no-silent-zero HARD test extended to cover superfan files,
So that any future silent-zero on attribution / cohort-retention / evangelist-count scores fails CI immediately.

**Acceptance Criteria:**

**Given** Story 3.8 (test activated for Overton files)
**When** `tests/unit/governance/phase22-no-silent-zero.test.ts` is extended
**Then** the AST/regex scan covers `services/campaign-tracker/superfan-attribution.ts`, `services/campaign-tracker/superfan-economy.ts`, and any new `superfan/*.ts`
**And** the test asserts the absence of `?? 0` / `|| 0` on `score` / `count` / `retention` / `evangelistCount` / `coefficient` identifiers — 0 hits
**And** the test asserts the type signature of every measurement export contains a discriminated `INSUFFICIENT_DATA` branch
**And** mode remains `HARD`; `pnpm test` is green

## Epic 5: Measurement Glory Tools — HYBRID + N6-bis

**Epic goal.** Five existing measurement Glory tools migrate from `LLM` to `HYBRID` `executionType`; each ships a schema-driven manual peer form; each is annotated `applicableNatures` (N6-bis closure). Dispatcher routes via `getGloryTool(slug)` (P22-5). HARD test extends `assembler-uses-manual-path.test.ts`.

> **Owning Neter:** Artemis (Propulsion — Glory tools registry §4.1).
> **Manual-first parity pair:** Story 5.3 (manual forms) pairs with the existing LLM path of each tool (`big-idea-coherence-checker`, `myth-arc-cohesion-evaluator`, `crew-performance-evaluator`, `negative-space-auditor`, `mcp-content-pii-classifier`) — all 5 tools migrate as one structural change, no standalone LLM story.

### Story 5.1: [governance] Extend `GloryToolDef` with `HYBRID` executionType + `manualFormSchema`

As a NEFER operator,
I want the `GloryToolDef` type extended at the type level to support `executionType: "HYBRID"` with a required `manualFormSchema: ZodType`,
So that the manual-first parity contract (D7 / P22-3) is structural — a tool author cannot ship a HYBRID tool without a manual schema, and downstream dispatch is type-safe.

**Acceptance Criteria:**

**Given** the existing `GloryToolDef` type (LLM | MANUAL | MCP per ADR-0048)
**When** `services/artemis/tools/registry.ts` (or the type module) is edited
**Then** `executionType` union gains `"HYBRID"` member
**And** the type is conditional: `manualFormSchema` is `required` when `executionType === "HYBRID"`, `forbidden` otherwise (TypeScript template-literal / conditional types or a Zod refinement at registration time)
**And** the registration helper enforces: `manualFormSchema` must be structurally equal to `outputFormat` (asserted via Zod `safeParse` round-trip on a synthetic instance, or via a structural-equality unit test)
**And** `tsc --noEmit` is green; ESLint accepts; no consumers break (existing LLM-only / MCP / MANUAL tools unaffected)

### Story 5.2: Extend `getGloryTool(slug)` registry dispatcher for HYBRID

As a NEFER operator,
I want the Glory tool dispatcher to route HYBRID tools through a unified path that selects LLM-or-manual at invocation time,
So that orchestrators never call the LLM path directly (HARD-test-enforced) — every consumer goes through `getGloryTool(slug)` (P22-5).

**Acceptance Criteria:**

**Given** Story 5.1 (HYBRID type exists)
**When** `services/artemis/tools/registry.ts` is edited
**Then** the dispatcher exposes `executeHybridTool(slug, input, opts: { preferManual?: boolean })` — when `preferManual === true`, runs the manual-form validation path; otherwise runs `executeStructuredLLMCall` and falls back to manual on Zod-invalid output (after the inherited retry-twice envelope from ADR-0067)
**And** the dispatcher returns the same structured output shape regardless of which path produced the result
**And** orchestrators import `getGloryTool(slug)` — never a parallel registry; never a direct `executeStructuredLLMCall` call (asserted by HARD test in Story 5.6)
**And** unit tests cover: (a) LLM path success, (b) LLM path Zod-fail → manual prompt, (c) explicit `preferManual: true` → manual immediately

### Story 5.3: Migrate 5 phase19 Glory tools to HYBRID + schema-driven manual forms

As an UPgraders operator,
I want each of the five measurement Glory tools to ship as `executionType: "HYBRID"` with a schema-driven manual UI form,
So that any measurement assessment is producible by hand when the LLM path fails or is rate-limited — the result is indistinguishable downstream (FR27 + FR28, manual-first parity pair).

**Acceptance Criteria:**

**Given** Stories 5.1 + 5.2 (type + dispatcher)
**When** `services/artemis/tools/phase19-tools.ts` is edited
**Then** all five tools (`big-idea-coherence-checker`, `myth-arc-cohesion-evaluator`, `crew-performance-evaluator`, `negative-space-auditor`, `mcp-content-pii-classifier`) carry `executionType: "HYBRID"` with `manualFormSchema` exactly equal to each tool's `outputFormat` Zod shape
**And** each tool's manual form is schema-driven (generated from `outputSchema` rather than hand-coded per tool — UX-DR9)
**And** each tool's LLM `prompt` is unchanged (the migration is type + dispatch, not prompt engineering)
**And** Vitest asserts for each tool: the manual-form Zod shape `===` the `outputFormat` Zod shape (structural equality), and the dispatcher produces indistinguishable output between LLM and manual path on identical input

### Story 5.4: Annotate `applicableNatures` on the 5 migrated tools (N6-bis closure)

As a NEFER operator,
I want every Phase 23-touched Glory tool annotated with its `applicableNatures` (subset of 9 BrandNature archetypes from ADR-0059),
So that Phase 18 N6-bis residual debt closes inside Phase 23 — these tools no longer count toward `phase18ResidualEntry pending`.

**Acceptance Criteria:**

**Given** Story 5.3 (HYBRID migration touches each tool's definition)
**When** the same edit also adds `applicableNatures`
**Then** each of the 5 tools declares an `applicableNatures: BrandNature[]` array (at minimum `["PRODUCT"]`; others added per the tool's semantics — e.g. `mcp-content-pii-classifier` likely all 9 since PII concerns cross-cut)
**And** the `phase18ResidualEntry` rows tagged "Glory tool natures annotation" for these 5 tools move to `RESOLVED` status (via the existing `phase18Residuals.resolve` procedure)
**And** the `applicableNatures` field is type-required (the conditional-type refinement from Story 5.1 may also enforce required when HYBRID)
**And** `phase18-resolve-on-annotation.test.ts` (if exists) passes; else a one-shot manual residual-entry update is logged

### Story 5.5: Surface HYBRID tools in `/console/artemis/tools` with peer-toggle UI

As an UPgraders operator,
I want each HYBRID Glory tool surfaced in the Glory tools catalogue with the manual form visible as a peer toggle BEFORE any error,
So that I can deliberately choose the manual path (not just fall into it on failure) — UX-DR13 enforced at the catalogue surface.

**Acceptance Criteria:**

**Given** Story 5.3 (tools are HYBRID) and the existing `/console/artemis/tools` catalogue route
**When** the catalogue is edited
**Then** each HYBRID tool's detail surface shows two peer-tab paths: "LLM run" and "Manual entry" — equal visual weight, no buried-fallback affordance (UX-DR13)
**And** progress for the LLM path streams over NSP SSE into a `role="status" aria-live="polite"` region (UX-DR17 introduced); the manual form renders in `form-single-column` / `form-drawer` per UX-DR9
**And** the operator can switch tabs without losing entered data
**And** when an LLM run fails with Zod-invalid output after retries, the surface drops the operator on the **same manual form** as the peer tab — not a different recovery form
**And** keyboard-only flow covers tool select → tab select → submit → result
**And** all reads via `operatorProcedure`, mutations via `governedProcedure`

### Story 5.6: Activate HARD tests `phase22-glory-hybrid.test.ts` + extend `assembler-uses-manual-path.test.ts`

As a NEFER operator,
I want the HYBRID + dispatcher discipline enforced in HARD mode,
So that no Phase 23 orchestrator can call `executeStructuredLLMCall` directly on a measurement Glory tool, and no LLM-only path can be reintroduced for the 5 tools.

**Acceptance Criteria:**

**Given** Stories 5.1–5.5 (HYBRID lands)
**When** `tests/unit/governance/phase22-glory-hybrid.test.ts` is activated (replacing Story 1.7's `it.todo`)
**Then** the test asserts: all five `phase19-tools.ts` tools have `executionType === "HYBRID"`, `manualFormSchema` exists, and its Zod shape structurally equals `outputFormat`
**And** the test asserts: `applicableNatures` is non-empty on each
**And** `tests/unit/governance/assembler-uses-manual-path.test.ts` (from ADR-0071) is extended: its forbidden-import list (`executeStructuredLLMCall`, `executeSequence`, `executeFramework`, `executeTool`, `callLLM`) now also scans `services/campaign-tracker/lifecycle.ts`, `services/campaign-tracker/calibration.ts` (the Epic 6 files — which by then exist as stubs from Epic 1's `NOT_YET_IMPLEMENTED` placeholder)
**And** both tests run in HARD mode; `pnpm test` is green

## Epic 6: Calibration Review + Governed Lifecycle Promotion

**Epic goal.** Operator runs calibration against real campaign history, reviews ROC AUC / RMSE, accepts/rejects, and promotes sub-clusters through `PROMOTE_PIVOT_SUBCLUSTER`. Calibration snapshots persist as `IntentEmission` payloads (P22-6 — no new table). Console gains the three-way view switcher + `CalibrationReviewPanel` + `SubClusterStatusCell` + `ProvenancePopover` Phase-22 pattern.

> **Owning Neter:** Mestor (governance — Intent dispatcher + pre-flight gate) · Seshat (consumes lifecycle state in Telemetry).

### Story 6.1: [governance] Implement `RUN_ATTRIBUTION_CALIBRATION` handler in `campaign-tracker/calibration.ts`

As an UPgraders operator,
I want the calibration Intent handler to run the attribution model against real campaign history and produce a versioned snapshot,
So that I can review evaluation metrics before promoting the sub-cluster — the snapshot is the trace from a future PRODUCTION promotion (FR24).

**Acceptance Criteria:**

**Given** Stories 1.5 (Intent kind registered + placeholder handler) and 4.2 (regression + ROC AUC + RMSE)
**When** `services/campaign-tracker/calibration.ts` is created and the placeholder handler is replaced
**Then** the handler accepts the `RUN_ATTRIBUTION_CALIBRATION` payload, calls `runAttribution({ campaignIds, coefficients })` per Story 4.2, and emits NSP SSE progress events (started → progress → done) via the canonical helper pattern from ADR-0072 (`bestEffort()` per NFR10)
**And** on success, the handler produces a snapshot payload `{ modelVersion, coefficients, rocAuc, rmse, sampleSize, dataWindow: { from, to }, computedAt }` and appends it as a `RUN_ATTRIBUTION_CALIBRATION` `IntentEmission` (P22-6 — no new table)
**And** on `INSUFFICIENT_DATA`, the handler completes with an explicit insufficient-data emission — never silently succeeds with a fake metric
**And** the handler does NOT import `executeStructuredLLMCall` / `executeSequence` / `executeFramework` / `executeTool` / `callLLM` directly — enforced by `assembler-uses-manual-path.test.ts` HARD extension from Story 5.6
**And** SLO p95 ≤ 60s, cost ≤ $0.50 (from Story 1.5) is respected on representative datasets

### Story 6.2: Implement `PROMOTE_PIVOT_SUBCLUSTER` handler in `campaign-tracker/lifecycle.ts`

As an UPgraders operator,
I want the lifecycle-promotion Intent handler to enforce state-machine ordering and require a `calibrationSnapshotRef` for PRODUCTION,
So that no sub-cluster can reach PRODUCTION without a traceable evaluation snapshot — pattern P22-4 enforced at the handler entry.

**Acceptance Criteria:**

**Given** Story 1.4 (Intent kind registered + placeholder handler)
**When** `services/campaign-tracker/lifecycle.ts` is created and the placeholder handler is replaced
**Then** the handler refuses any transition violating `STUB→PARTIAL→MVP→PRODUCTION` (no skipping forward, no reverse without an explicit `mode: "RE_ENTRY"` flag — out of scope for Phase 23) — emits a typed governance refusal
**And** `toState === "PRODUCTION"` without `calibrationSnapshotRef` is refused at handler entry (not at UI) — error message identifies the missing reference
**And** on accepted transition, the handler updates `capability-state.ts` (or its DB equivalent if state is persisted) and emits an `IntentEmission` recording the transition, actor, snapshot ref, and reason
**And** the handler does NOT call any sister service mutation directly — all governance side-effects via `mestor.emitIntent()`
**And** Vitest covers: (a) valid linear promotion, (b) skip-forward refused, (c) reverse refused, (d) PRODUCTION without snapshotRef refused

### Story 6.3: Implement Mestor pre-flight gate for `calibrationSnapshotRef` on PRODUCTION promotion

As a NEFER operator,
I want a Mestor pre-flight gate at the dispatch layer (not just the handler) refusing PRODUCTION promotion without a `calibrationSnapshotRef`,
So that the structural traceability invariant (FR24) is enforced **before** the handler runs — mirroring the `MANIPULATION_COHERENCE` gate precedent.

**Acceptance Criteria:**

**Given** Story 6.2 (handler refuses without snapshotRef)
**When** `services/mestor/gates/` is extended with a `calibration-snapshot-required.ts` gate
**Then** the gate runs in Mestor's pre-flight chain before the handler — refuses dispatch with a typed governance error if `intent.kind === "PROMOTE_PIVOT_SUBCLUSTER" && payload.toState === "PRODUCTION" && !payload.calibrationSnapshotRef`
**And** the gate also validates: `calibrationSnapshotRef` (if present) points to an actual `RUN_ATTRIBUTION_CALIBRATION` `IntentEmission` that succeeded (state `OK`) — refuses on missing / failed / wrong-kind reference
**And** Vitest covers: (a) gate refuses on missing ref, (b) gate refuses on ref pointing to non-existent emission, (c) gate refuses on ref pointing to `INSUFFICIENT_DATA` emission, (d) gate passes on valid ref → handler called

### Story 6.4: `CalibrationReviewPanel` composition (dialog + inline dual host)

As an UPgraders operator,
I want to read ROC AUC / RMSE as values against named thresholds, see the versioned dated run snapshot, and switch to a manual-coefficient peer tab,
So that I own the statistical judgement (W&B-pattern, UX-DR4 + UX-DR15) — not a pass/fail badge that strips my authority.

**Acceptance Criteria:**

**Given** Story 6.1 (calibration handler produces snapshots) and Story 4.5 (manual coefficient mode)
**When** `components/console/campaign-tracker/calibration-review-panel.tsx` (or equivalent path) is created
**Then** the panel composes `data-table-comparison` + `kpi-grid` to show ROC AUC / RMSE values vs declared thresholds (numeric values shown, not just pass/fail badges) — pass / near / fail conveyed by icon + label + token (no colour alone — UX-DR22 a11y)
**And** the panel offers two peer tabs: "Auto calibration" (runs `runAttribution` without coefficients) and "Manual coefficients" (Story 4.5 form); switching does not lose entered values
**And** the panel ships with two host contexts: `dialog-wide` (when summoned from B1/B2 hub views) and inline-in-detail-pane (when summoned from B3 master-detail) — one component, same interaction contract, ESC + return-focus identical
**And** progress streams over NSP SSE into a `role="status" aria-live="polite"` region (UX-DR17 + NFR3); the operator never faces a frozen screen
**And** Accept and Reject buttons follow UX-DR16 button hierarchy: Accept is primary rouge (the consequential forward act), Reject is ghost — Reject is NEVER primary-rouge
**And** Accept emits `RUN_ATTRIBUTION_CALIBRATION` first (if not already run) and PROMOTES via `PROMOTE_PIVOT_SUBCLUSTER` second — `governedProcedure` mutations only; confirmation toast names the actor + links to the snapshot (UX-DR14)
**And** the panel respects Console `data-density="compact"` (UX-DR18) and consumes design tokens only with CVA grammar (three DS prohibitions)

### Story 6.5: Console campaign-tracker view switcher (B1 + B2 + B3 + localStorage)

As an UPgraders operator,
I want a persisted view switcher on `/console/governance/campaign-tracker` that lets me pick B1 dense table (default) / B2 card grid / B3 master-detail,
So that I can optimise the view for triage, onboarding, or deep calibration without losing my choice across sessions (UX-DR3).

**Acceptance Criteria:**

**Given** the existing Console campaign-tracker route and the existing `tabs` primitive
**When** the page is extended with the three view components
**Then** the page renders a segmented control (existing `tabs` primitive — or a new CVA variant on `tabs` if needed; **no new primitive** per UX-DR3 / Component Strategy)
**And** the three views (`HubTableView` composing `data-table-dense`, `HubCardView` card grid, `HubDetailView` master-detail split) render the same 6 sub-clusters + their lifecycle stage + signal freshness via the shared `SubClusterStatusCell` (Story 6.6)
**And** view preference persists in `localStorage` per operator (mirroring sidebar-collapse pattern from DESIGN-A11Y §4); default `table`; routing never resets it
**And** B2 / B3 views stay within `data-density="compact"` spacing tokens (no silent inflation — UX-DR18)
**And** below `md` (768px) the page falls back to B1 single-column rows; design target = `lg`+; tablet supported via container queries on cards (UX-DR20)
**And** keyboard-only flow covers view switch → row select → calibration open
**And** all reads via `operatorProcedure`, mutations via `governedProcedure`

### Story 6.6: `SubClusterStatusCell` + `ProvenancePopover` Phase-22 pattern components

As an UPgraders operator,
I want one reusable status-cell component (colour + shape + label triad + lifecycle stage + signal freshness + DEFERRED "configure connector" cross-link) and one provenance-popover pattern (one-hop "where from"),
So that every status indicator and every score in the Console + Cockpit reads consistently and traces to its source in one hop (UX-DR6 + UX-DR7 + UX-DR12).

**Acceptance Criteria:**

**Given** Story 2.4 (connector state introduced UX-DR12) and Story 6.5 (hub views consume status cells)
**When** the two compositions are created under `src/components/cockpit/governance/` (or per architecture touched-slice tree)
**Then** `SubClusterStatusCell` exposes props `{ subClusterSlug, lifecycleState, connectorResult, lastSignalAt }` and renders status as colour + shape + text label triad (status `badge` from existing primitive)
**And** when `connectorResult.state === "DEFERRED_AWAITING_CREDENTIALS"`, the cell renders a "Configure connector" link reaching `/console/anubis/credentials` (cross-link by canonical ownership)
**And** `ProvenancePopover` composes the existing `popover` primitive (no new primitive); accepts `{ source: "tarsis-signal" | "crm-signal" | "calibration-snapshot" | "manual-entry"; refUrl: string }` and renders the source + a one-hop link
**And** both components are documented in COMPONENT-MAP.md as Phase-22 reusable patterns (used by Cell, Hub views, CalibrationReviewPanel, OvertonRadar events in Epic 7, Cockpit lineage in Story 4.7)
**And** components consume design tokens only + CVA + are keyboard-navigable + axe-clean

### Story 6.7: Activate HARD tests `phase22-lifecycle-promotion.test.ts` + `phase22-no-calibration-table.test.ts`

As a NEFER operator,
I want the lifecycle state-machine + the "no new calibration table" invariant in HARD mode,
So that no future PR can introduce a `calibrationSnapshot` Prisma model (sidestepping P22-6), and the promotion state machine cannot be broken by skip-forward / reverse transitions.

**Acceptance Criteria:**

**Given** Stories 6.1–6.6 (handler + gate + UI shipped)
**When** the two HARD tests are activated (replacing the `it.todo` placeholders from Story 1.7)
**Then** `phase22-lifecycle-promotion.test.ts` asserts: every code path that calls `mestor.emitIntent({ kind: "PROMOTE_PIVOT_SUBCLUSTER" })` ultimately reaches the state-machine guard; integration test fires invalid transitions and asserts refusals
**And** `phase22-no-calibration-table.test.ts` asserts: `prisma/schema.prisma` does NOT contain a model named `CalibrationSnapshot` / `CalibrationRun` / `ModelSnapshot` / `AttributionSnapshot` (regex check); the file `prisma/migrations/**/migration.sql` does not contain `CREATE TABLE "calibration*"` patterns
**And** both tests are `mode: "HARD"`; `pnpm test` is green

## Epic 7: Cockpit Overton Surface + Phase 23 Closure

**Epic goal.** Founder sees, with dated named evidence, that the sector is bending around them. The existing `<OvertonRadar>` is wired to real signal via `ConnectorResult<T>`, gains `instance` CVA variant, and lands on a new `/cockpit/intelligence/overton` route + `/cockpit` dashboard teaser + `cockpitNavGroups` "Intelligence" entry. Phase 23 closure folds in: 5 dangling refs retired, ADRs 0077–0081 finalized, MISSION §9 ledger annotated, closure-roadmap target #1 → SHIPPED.

> **Owning Neter:** Seshat (consumer of Tarsis signal via `<OvertonRadar>`); Mestor (governance closure ADRs).

### Story 7.1: Extend `<OvertonRadar>` props with `ConnectorResult<T>` + state union + `instance` CVA variant

As a NEFER operator,
I want the existing `<OvertonRadar>` component's props typed against `ConnectorResult<T>` with a full state union (live/partial/degraded/loading/updating) and an `instance: full | teaser` CVA variant,
So that the component drives all its UI states from the typed pivot signal — no separate UI-only "is loading" boolean, no degraded state divergence from connector state (UX-DR1).

**Acceptance Criteria:**

**Given** Story 1.3 (`ConnectorResult<T>`) and the existing `src/components/neteru/overton-radar.tsx`
**When** the component's props/types are extended
**Then** the radar accepts props `{ signal: ConnectorResult<TarsisSignal & EmbeddingDelta>; instance: "full" | "teaser"; density?: "comfortable" | "compact" }`
**And** the `instance` variant drives layout via CVA (no inline `.join(" ")` or ternaries — third DS prohibition)
**And** the radar's internal state machine maps cleanly: `connectorResult.state === "LIVE"` → render live; `"DEFERRED_AWAITING_CREDENTIALS"` → degraded empty state; `"DEGRADED"` → per-axis partial state per reason
**And** `tsc --noEmit` is green; existing consumers of `<OvertonRadar>` (if any) still compile (props are optional or default-set for backward compatibility)
**And** the component's co-located `overton-radar.manifest.ts` (Zod, `defineComponentManifest`) is updated to reflect new props; `overton-radar.stories.tsx` is updated to cover the new variants

### Story 7.2: Implement A2 Split layout + container queries

As a founder,
I want the full `<OvertonRadar>` to render as A2 Split (radar left, dated evidence feed right, equal weight, both above the fold), and the teaser instance to reflow on its own width via container queries,
So that the founder gets dated concrete evidence above the fold (UX step-09 decision) and the same component serves both dashboard-teaser and full-panel contexts without divergence (UX-DR19).

**Acceptance Criteria:**

**Given** Story 7.1 (`instance` variant exists)
**When** the radar's layout is implemented
**Then** `instance: "full"` renders the A2 Split: radar (4 named axes — vocabulary overlap, claim imitation, unpaid press, embedding delta) on the left, dated evidence feed (`timeline` for claim-imitation + `streaming-feed` for unpaid press) on the right
**And** `instance: "teaser"` renders the compact dashboard version: radar shrinks, top evidence item becomes the headline
**And** the reflow is driven by `@container` queries (not viewport queries) — same component, two instances, no width-coupled divergence (NFR2 + UX-DR19)
**And** below the container's split threshold (tablet at `md` 768px when the full panel runs in a narrower bento), the A2 stacks radar-over-feed
**And** the layout uses design tokens only with CVA (UX-DR25 + three DS prohibitions); per-portal density inherited from the host (`comfortable` Cockpit per UX-DR18)
**And** Playwright visual regression baselines are recorded for `md` / `lg` / `xl` breakpoints (UX-DR24)

### Story 7.3: Implement honest empty / degraded states across all radar conditions

As a founder,
I want every degraded condition on the OvertonRadar (`DEFERRED`, `INSUFFICIENT_DATA`, per-axis partial) rendered as a designed honest state with cause + unlock path,
So that "not configured yet" looks intentional, not broken — the same footprint as the populated state, no layout jump (FR31 + UX-DR10).

**Acceptance Criteria:**

**Given** Story 7.1 (state union exists) and the existing `empty-state` primitive
**When** the radar's degraded-state branches are implemented
**Then** `DEFERRED_AWAITING_CREDENTIALS` renders an `empty-state` (icon + cause "Awaiting Tarsis signal source" + unlock path = a quiet link toward the Console — note: founders cannot configure connectors per FR32, so the unlock path links to a "request connector activation" or just explains the situation rather than offering an operator action)
**And** `DEGRADED` reasons (`VENDOR_OUTAGE` / `RATE_LIMITED` / `AUTH_REVOKED`) each render their own cause-line via the same `empty-state` template; tone = info (UX-DR12: `DEFERRED` is info, not warning)
**And** per-axis partial: when only some axes have signal, live axes render normally and absent axes carry their own per-axis empty-state (axis label + small cause line)
**And** the empty-state occupies the **same footprint** as the populated radar — no height collapse, no layout reflow when transitioning DEFERRED ↔ LIVE
**And** copy translates to founder-facing language per LEXICON (no "DEFERRED_AWAITING_CREDENTIALS" string leaks to the founder; surface reads "Source signal en attente d'activation")
**And** Playwright a11y test asserts the empty state preserves keyboard navigability and screen-reader-readable cause

### Story 7.4: Implement `<OvertonPanel>` Cockpit wrapper with tRPC + Suspense + degraded UI

As a founder,
I want the OvertonRadar mounted inside a Cockpit-scope wrapper that owns the tRPC fetch + Suspense boundary + degraded-state UI,
So that the radar stays a pure presentational component (props in, pixels out) and the data plane stays cleanly separated (architecture component boundary).

**Acceptance Criteria:**

**Given** Stories 7.1–7.3 (radar accepts typed signal + renders all states)
**When** `src/components/cockpit/intelligence/overton-panel.tsx` is created
**Then** the panel fetches its data via tRPC `operatorProcedure` (tenant-scoped to the founder's brand `Strategy`) and passes the resulting `ConnectorResult<TarsisSignal & EmbeddingDelta>` to `<OvertonRadar instance="full" />`
**And** the panel wraps the radar in a Suspense boundary; first meaningful render ≤ 2s on cached signal (NFR2) — the boundary returns a skeleton or `loading` state, never blocks the Cockpit shell
**And** the panel does NOT contain any business logic (route file owns auth/tier guards only; pure component owns presentation; this panel owns data fetch + boundary) — strict three-tier separation
**And** Vitest test covers: panel renders skeleton during fetch, renders radar on success, renders honest empty state on `DEFERRED`

### Story 7.5: New Cockpit route `/cockpit/intelligence/overton/page.tsx` paid-tier + read-only gated

As a founder,
I want a dedicated Cockpit route showing the full OvertonRadar,
So that I have a durable, deliberate path to my sector's Overton state — not just discovery via the dashboard teaser (FR30 + UX-DR11).

**Acceptance Criteria:**

**Given** Story 7.4 (`<OvertonPanel>` wrapper exists)
**When** `app/(cockpit)/cockpit/intelligence/overton/page.tsx` is created
**Then** the page mounts `<OvertonPanel />`; route file contains auth/tier guards only (no business logic)
**And** the route is gated by `requiresPaidTier` (`COCKPIT_MONTHLY` / `RETAINER_*`) — non-paid tiers see a tier-upgrade prompt, not a blank page (FR32)
**And** all reads are `operatorProcedure` tenant-scoped; the route refuses any state-mutating procedure invocation (enforced by procedure type, not UI hiding — FR32)
**And** PAGE-MAP.md gains a final entry for the route (replacing the reserved skeletal entry from Story 1.10)
**And** Playwright e2e covers: founder lands → sees radar (or honest empty) → cannot trigger any mutation; non-paid tier sees upgrade prompt

### Story 7.6: Compact `<OvertonRadar>` teaser in `/cockpit` dashboard bento

As a founder,
I want a compact OvertonRadar teaser in my dashboard bento that surfaces a "new activity" cue + one-line headline when signal moves,
So that I notice sector movement without having to deliberately navigate (Journey 3 — contextual discovery).

**Acceptance Criteria:**

**Given** Story 7.1 (`instance: "teaser"` variant exists) and the existing `/cockpit` dashboard layout
**When** the dashboard composition is edited
**Then** a compact `<OvertonRadar instance="teaser" />` renders in the dashboard bento — container-query reflow handles its width automatically
**And** when signal has moved since the founder's last visit, the teaser surfaces a subtle "new activity" cue + one-line headline (e.g. "A competitor echoed your language")
**And** the teaser is click-through to `/cockpit/intelligence/overton` (Story 7.5)
**And** when degraded, the teaser shows a compact honest empty state — same footprint as populated (no dashboard layout jump)
**And** the teaser respects Cockpit `data-density="comfortable"` per UX-DR18 (storytelling register)

### Story 7.7: Wire `cockpitNavGroups` "Intelligence" group entry

As a founder,
I want a durable nav entry to my Intelligence (Overton) surface,
So that the OvertonRadar is reachable deliberately, not just via the teaser — MISSION §9 "every founder sees the sectoral Overton axis" depends on both discovery paths existing (UX-DR11).

**Acceptance Criteria:**

**Given** Story 7.5 (route exists) and the existing `cockpitNavGroups` configuration
**When** the nav config is edited
**Then** a new minimal "Intelligence" group is added to `cockpitNavGroups` with one entry pointing to `/cockpit/intelligence/overton` (label "Overton sectoriel" or per LEXICON — no internal vocabulary leak)
**And** the group is positioned in the Cockpit sidebar consistent with the existing portal IA (likely after Insights, before Settings)
**And** when the founder is in the route, the nav entry shows active state per existing DESIGN-A11Y / DESIGN-SYSTEM nav patterns
**And** keyboard navigation reaches the entry via the existing nav skip pattern

### Story 7.8: Playwright a11y spec + visual regression baselines for new surfaces

As a NEFER operator,
I want a dedicated a11y spec for the new Cockpit route + visual regression baselines at `md` / `lg` / `xl`,
So that NFR13 + UX-DR21 + UX-DR24 are CI-enforced from day one — no critical/serious a11y violation can ship.

**Acceptance Criteria:**

**Given** Stories 7.4–7.7 (surfaces exist)
**When** Playwright specs are added under `tests/e2e/` (or per existing project convention)
**Then** `overton-radar.a11y.spec.ts` asserts: `<svg role="img">` exists with values-summary `aria-label`; offscreen text-equivalent data table exists in the same component (UX-DR21); keyboard-navigable; every axis carries label + shape (colour not sole carrier); calibration-dialog focus-trap + ESC + return-focus covered (UX-DR22) if reachable from any Cockpit affordance
**And** `@axe-core/playwright` runs against `/cockpit/intelligence/overton` and `/cockpit` (dashboard with teaser) — 0 critical/serious violations
**And** visual regression: `toHaveScreenshot()` baselines at `md` / `lg` / `xl` for both full panel + teaser; threshold 0.1%
**And** RTL + font-scaling-200% specs for `<OvertonRadar>` — 0 overflow / truncation / overlap
**And** all specs run in CI; failures block merge

### Story 7.9: Retire 5 dangling ADR refs + finalize ADRs 0077–0081

As a NEFER operator,
I want all 5 dangling ADR references (0053-coherence-llm-evaluator, 0054-superfan-attribution-model, 0055-overton-algo, 0056-postmortem-12q, 0057-crew-scoring) replaced repo-wide with their ADR-0077+ counterparts, AND ADRs 0077-0081 promoted from stub to fully-written-and-accepted,
So that pattern P22-7 reaches its 0-hits HARD-test assertion and Phase 23 leaves no governance loose ends.

**Acceptance Criteria:**

**Given** Stories 1.1 + 1.2 (ADR-0077..0081 stubs exist) and the pattern that each downstream epic retired references in touched files (P22-7 distributed)
**When** this story executes a final pass + ADR finalization
**Then** a repo-wide grep for the 5 dangling slugs (`0053-coherence-llm-evaluator`, `0054-superfan-attribution-model`, `0055-overton-algo`, `0056-postmortem-12q`, `0057-crew-scoring`) returns **0 hits** in `src/`, `docs/`, and `tests/`
**And** ADR-0077 (parent), ADR-0078 (Overton home), ADR-0079 (connectors), ADR-0080 (lifecycle Intent), ADR-0081 (calibration methodology) are filled with their full decision text, consequences, context, and adopted status — no longer stubs
**And** each ADR's "Status" frontmatter is `Accepted` (not stub/proposed)
**And** the HARD test `phase22-no-dangling-adr-refs.test.ts` activates (replacing Story 1.7's `it.todo`) — asserts 0 hits on the 5 retired slugs
**And** `pnpm test` is green

### Story 7.10: Phase 23 final closure — anti-drift extension + map updates + MISSION ledger + closure-roadmap

As a NEFER operator,
I want the final closure pass: extending the campaign-tracker coherence assertion, the final canonical-map updates, MISSION §9 ledger annotations on the 3 newly-checkable boxes, RESIDUAL-DEBT carry-overs registered, and closure-roadmap target #1 moved to `SHIPPED`,
So that Phase 23 closes definitively — every governance loose end accounted for and the project's Mission weighted-score component is positioned to close the 98 → 100 gap.

**Acceptance Criteria:**

**Given** all preceding Phase 23 stories (Epic 1 through Epic 7 Stories 7.1–7.9)
**When** the final closure edits are applied
**Then** `tests/unit/governance/campaign-tracker-coherence.test.ts` is extended to assert: 6 pivot sub-clusters (`superfan.attribution`, `superfan.stickiness`, `superfan.crmCapture`, `culture.overtonShift`, `culture.overtonReadiness`, `culture.tarsisBridge`, `culture.mcpIngest`) exist with lifecycle state ≥ MVP (or PRODUCTION if direction signed off post-Story 6.4 calibration)
**And** `neteru-coherence.test.ts` remains green — APOGEE cap 7/7 unchanged across Phase 23
**And** PAGE-MAP.md final entry for `/cockpit/intelligence/overton`; COMPONENT-MAP.md final entry for `<OvertonRadar>` (now consumed by a route) + documented Phase-22 reusable patterns (degraded/empty, provenance, status-lifecycle, operator-judgement); SERVICE-MAP.md final entries for `services/seshat/tarsis/`, `services/anubis/providers/crm-provider/`, `services/campaign-tracker/calibration.ts`, `services/campaign-tracker/lifecycle.ts`, `services/campaign-tracker/superfan-attribution.ts`; ROUTER-MAP.md final entries for new tRPC procedures on `campaign-tracker` router
**And** RESIDUAL-DEBT.md gains a Phase 23 closure section listing Growth (scheduled re-calibration cron, `staleAt` pattern) and Vision (predictive OvertonRadar, cross-client Jehuty benchmarking) explicit carry-overs — each with a trigger condition rather than a date
**And** MISSION.md §9 ledger annotates 3 of the 6 checkboxes as now checkable: "Every Cockpit founder sees live: sectoral Overton axis"; "Every UPgraders operator can display next 5 actions maximizing superfan/Overton ratio" (operator surface from Epic 6); "Every brand's Oracle has live État Overton sectoriel section maintained by Tarsis" — the checkboxes are flipped to checked only after direction sign-off of the calibration thresholds (post-MVP business decision)
**And** `closure-roadmap.md` target #1 moves to `SHIPPED` status with the date and links to the merged PR(s)
**And** CHANGELOG.md gains the Phase 23 closure entry (audit-changelog-coverage husky hook green)
**And** `pnpm test` is green across the entire `tests/unit/governance/` directory (all 6 `phase22-*.test.ts` HARD, plus `campaign-tracker-coherence`, `neteru-coherence`, `assembler-uses-manual-path` extensions); Playwright a11y + visual baselines green
