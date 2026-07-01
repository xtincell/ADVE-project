---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: complete
completedAt: '2026-05-15'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/closure-roadmap.md
  - _bmad-output/planning-artifacts/implementation-readiness-report-2026-05-14.md
  - _bmad-output/project-context.md
  - CLAUDE.md
  - docs/governance/APOGEE.md
  - docs/governance/MISSION.md
  - docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md
  - _bmad/custom/_nefer-checks.md
  - _bmad/custom/_nefer-facts.md
  - docs/governance/STATE_FINAL_BLUEPRINT.md  # canon absolu 2026-05-16
blueprint_canon_alignment: >
  2026-05-16 — STATE_FINAL_BLUEPRINT.md is now the canonical source-of-truth for
  La Fusée OS terminology, neter governance limits, refresh cascade, score system,
  and economic architecture runtime. Phase 23 substantive architecture is
  unchanged ; D1-D9 + P22-1..7 hold. Epic 1 grows by one governance story (1.8
  BRIEF_VS_ADVE_COHERENCE gate scaffold). The previously-flagged "out_of_scope
  Yggdrasil + Argos as NEW canon" is resolved: ADR-0082 amended + ADR-0083 +
  STATE_FINAL_BLUEPRINT all shipped. See sprint-change-proposal-2026-05-16.md.
workflowType: 'architecture'
project_name: 'ADVE-project'
user_name: 'Alexandre'
date: '2026-05-14'
target: 'Phase 23 — Câblage des mécaniques pivot mission (superfans × Overton) MVP→PRODUCTION'
phase_label: 'phase/23'
nefer_preflight:
  C1_read_project_memory: done
  C2_anti_doublon_grep: 'done — step-02. Three collisions found vs PRD: <OvertonRadar> already exists (src/components/neteru/overton-radar.tsx), sector-intelligence/ service already exists (Seshat, Sector model), all 6 pivot sub-clusters exist at PARTIAL. ADR-0052-B/C/D/E/F children do NOT exist as files.'
  C3_lexicon_reformulation: 'done — step-02. Canonical terms confirmed: Industry OS, Glory tool vs sequence vs framework, BrandAsset.kind, Credentials Vault connector (not Neter). No new LEXICON term introduced.'
  C4_apogee_three_laws: 'done — step-02. (1) Conservation of altitude: lifecycle promotion is governed hash-chained Intent, no silent regression. (2) Stage sequencing: measurement is observational, does not short-circuit A→S cascade. (3) Fuel conservation: calibration/poll Intents are Thot-gated with SLOs (NFR1).'
neter_ownership: 'Seshat (Telemetry §4.3 — Tarsis connector, Overton, sector-intelligence/) + Anubis (Comms §4.7 — CRM connector, MCP ingest) + Artemis (Propulsion §4.1 — 5 measurement Glory tools). Ptah DROPPED: Phase 23 has no forge/production in scope (measurement tools emit assessments, not assets). PRD frontmatter neters:[...Ptah] is carry-over — flagged for correction.'
adr_disposition: 'UNDER REVIEW — PRD claimed EXTEND of ADR-0052-B/C/D/E/F children, but those files do NOT exist (only parent 0052 exists). Architecture must decide at step-04 whether this doc is foundational or spawns ADR-0077+. PRD adr_disposition needs correction.'
out_of_scope_concepts: 'Yggdrasil and Argos are RESOLVED 2026-05-15/16 via ADR-0082 (Yggdrasil substrate canonization, amended 2026-05-16 = ungoverned per blueprint §5.2) + ADR-0083 (Argos placement Seshat sub-domain) + STATE_FINAL_BLUEPRINT canonization 2026-05-16. No impact on Phase 23 substantive scope. Freelance-brief flow (Artemis→Imhotep→Anubis) + content calendar = future chantiers.'
---

# Architecture Decision Document

> **Phase relabel note — 2026-05-15 (post-shipping correction).** While this architecture
> workflow was running, upstream `origin/main` redefined `phase/22` as **"Argos by LaFusée"**
> (Seshat reference harvester + propriété média indépendante, commits `82acd53` / `4f001a4` /
> `28dbb95`). This chantier ("Câblage pivots mission — superfans × Overton") was relabeled
> `phase/22` → `phase/23` post-rebase. The substance is unchanged; only the phase label moved.
> All "Phase 23" references below historically pointed to "Phase 22" prior to the 2026-05-15
> upstream rename. See [closure-roadmap.md](closure-roadmap.md) and [REFONTE-PLAN.md](../../docs/governance/REFONTE-PLAN.md)
> Phase 22 section for the now-canonical Argos definition.

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (35 FRs, 7 groups)**
Phase 23 wires La Fusée's two mission-pivot mechanics from placebo to instrument.
Architecturally the 35 FRs partition into four layers:
- **OS / governance layer** — A (FR1-5 external signal connectors via Credentials
  Vault), D (FR19-26 model calibration + governed lifecycle promotion), G (FR33-35
  manifest declaration, APOGEE cap, anti-drift). These are Intent-bus + Credentials
  Vault extensions, no UI of their own beyond Console panels.
- **Measurement core** — B (FR6-11 superfan attribution / cohort retention /
  evangelist count) and C (FR12-18 Overton signal collection / shift / readiness /
  MCP ingest + PII gate). This is the `campaign-tracker/` + `sector-intelligence/`
  extension surface.
- **Livrable layer** — E (FR27-29) the 5 measurement Glory tools, each LLM + manual.
- **Cockpit surface** — F (FR30-32) the only founder-facing UI: OvertonRadar +
  attribution lineage, read-only, paid-tier-gated.

**Non-Functional Requirements (14 NFRs)**
Three NFR clusters drive the architecture more than any FR:
- **Ship-without-keys** (NFR8/9) — connector façades return
  `DEFERRED_AWAITING_CREDENTIALS`; no feature hard-fails or fabricates data when a
  connector is unconfigured. Decouples the code release from vendor contracts.
- **No-magic-fallback** (NFR9, ADR-0046; FR11/FR18/FR31) — insufficient signal
  yields an explicit insufficient-data/degraded state, never a fabricated score.
  This is the placebo the whole PRD exists to remove; it must not regress.
- **Manual-first parity** (ADR-0060, HARD-test enforced) — every LLM-assisted
  feature ships a functionally equivalent manual UI path.
Performance (NFR1-3): async Intent SLOs in `slos.ts`, OvertonRadar < 2s behind a
Suspense boundary, NSP SSE progress streaming. Security (NFR4-7): per-Operator
`ExternalConnector` rows only, `tenantScopedDb` default-deny, PII classification on
MCP ingest, hash-chained calibration/promotion events.

**Scale & Complexity**
- Primary domain: martech / brand-strategy backend — `saas_b2b`, brownfield.
- Complexity level: **high** — governed multi-tenant Industry OS with hash-chained
  Intent log, default-deny tenancy, layering cascade, APOGEE cap 7/7; Phase 23 adds
  ML calibration (a `scientific` sub-component) + 2 external connectors + governed
  lifecycle-promotion Intents.
- Estimated architectural components touched: `campaign-tracker/` (extend),
  `sector-intelligence/` (extend), Credentials Vault (+2 connector types), Glory
  tools registry (+5), 1 Cockpit route consuming the existing `<OvertonRadar>`,
  new async Intent kinds + SLOs + anti-drift tests. 0 new Prisma models intended
  (additive fields on `Campaign` / `CampaignAction`).

### Technical Constraints & Dependencies

- **0 new Prisma models** — additive fields only on existing `Campaign` /
  `CampaignAction`; migration via `prisma migrate dev`. (Note: `Sector` model
  already exists from Phase 3 — used, not created.)
- **APOGEE cap 7/7** — Tarsis API + CRM are Credentials-Vault connectors, never
  an 8th Neter. Anti-drift `neteru-coherence.test.ts` blocks regression.
- **Layering cascade (ADR-0002)** — `domain → lib → governance → services → trpc
  → components → app`; connectors under `services/seshat/` + `services/anubis/`,
  no cross-import; `madge --circular` clean.
- **Governance routing** — all mutations via `mestor.emitIntent()`; lifecycle
  promotions are governed Intents, append-only + hash-chained. Reads via
  `operatorProcedure`, mutations via `governedProcedure`.
- **Credentials Vault (ADR-0021)** — connector creds are per-`Operator`
  `ExternalConnector` rows, not env vars (distinct from ADR-0075 payment-secrets
  boundary).
- **External dependency, off critical path** — Tarsis vendor contract + CRM
  account; decoupled by the `DEFERRED_AWAITING_CREDENTIALS` façade pattern.
- **Subscription tier gate** — Cockpit consumption gated to `COCKPIT_MONTHLY` /
  `RETAINER_*` via existing `requiresPaidTier`; no new billing entity.
- **`applicableNatures` annotated from creation** on the 5 new Glory tools — do
  not add to N6-bis residual debt (folded forward from PRD C5 clearance).

### Pre-existing surfaces (C2 anti-doublon — verified against repo)

The PRD's CODE-MAP grep is partially stale. Verified at architecture step-02:
- **`<OvertonRadar>` already exists** — `src/components/neteru/overton-radar.tsx`,
  exported in `neteru/index.ts`. NOT net-new. Phase 23 wires it to real signal +
  places it on a Cockpit route; it does not create it.
- **`sector-intelligence/` service already exists** — Seshat-governed, backed by
  the `Sector` Prisma model, with `getSectorAxis` / `refreshSectorOverton` /
  `detectDrift` / `computeBrandDeflection` + manifest (`DEFEND_OVERTON` Intent,
  SLOs). It is the Overton-measurement substrate.
- **`campaign-tracker/` sub-clusters already exist** — all 6 PRD-named pivot
  sub-clusters (`superfan.attribution`, `superfan.stickiness`,
  `culture.overtonShift`, `culture.overtonReadiness`, `culture.tarsisBridge`,
  `culture.mcpIngest`) plus `superfan.crmCapture` are present at **PARTIAL** (none
  STUB, contrary to PRD wording).
- **"ADR-0052-B/C/D/E/F children" do not exist as files** — only the parent
  `0052-campaign-module-canonical-trajectory-instrument.md`. `capability-state.ts`
  carries a dangling `childAdr` reference. The PRD's `adr_disposition: EXTEND — no
  new foundational ADR expected` is therefore unsafe — see Cross-Cutting Concern #2.

### Cross-Cutting Concerns Identified

1. **Overton-home reconciliation (blocking, step-04).** Overton measurement has
   two existing homes: `sector-intelligence/` (Seshat service, `Sector` model) and
   `campaign-tracker/culture.*` sub-clusters. The architecture must designate one
   as canonical and define the other's relationship — or it will ship a doubling
   the PRD inadvertently specified.
2. **ADR strategy (blocking, step-04).** The governing ADRs the PRD cites are
   absent. The architecture must decide: does this document become the foundational
   design, or does it spawn real ADRs (0077+)? The frontmatter `adr_disposition`
   must be corrected either way.
3. **Ship-without-keys façade** — one pattern spanning connectors, sub-clusters,
   Glory tools, and the OvertonRadar surface; must be specified once and reused.
4. **Manual-first parity** — HARD-test-enforced across 5 Glory tools + 2 ML models
   (manual coefficient mode, operator-tagged delta mode).
5. **Governed lifecycle promotion** — new async Intent kinds (STUB→MVP→PRODUCTION),
   hash-chained, each manifest-declared with an SLO (FR22-24/33, NFR1/7).
6. **No-magic-fallback** — explicit insufficient-data state as a first-class
   return type across every measurement path.

## Starter Template Evaluation

### Primary Technology Domain

**Not applicable — brownfield change.** Phase 23 is an extension inside an existing,
governed multi-tenant Industry OS. There is no greenfield starter decision; the
"starter" is the established repo. This section records the *inherited* foundation
that all Phase 23 architectural decisions must conform to.

### Starter Options Considered

None. Selecting or initializing a starter template is out of scope for a brownfield
Phase 23 chantier. Project initialization is not an implementation story here — the
repo exists, with 76 ADRs of accumulated architectural decisions.

### Inherited Foundation (the de facto "starter")

The codebase itself, with its stack pinned in `package.json` and its conventions
enforced by anti-drift CI:

**Language & Runtime**
- TypeScript `^6.0.3`, Next.js `^16.2.4` (App Router), React `^19.2.5`, Node runtime.

**Styling Solution**
- Tailwind `^4.0.0` + the Panda noir/bone + rouge-fusée Design System (Phase 11,
  ADR-0013). Tier 0→3 token cascade; CVA `^0.7.1` for variants. Three DS prohibitions
  are HARD-test-enforced — Phase 23's one UI consumer (`<OvertonRadar>`) must comply
  (NFR13/14).

**Build Tooling**
- Next.js build pipeline; Prisma `^7.8.0` client generation; migrations via
  `prisma migrate dev` (never `db push`).

**Testing Framework**
- Vitest `^4.1.5` (unit + anti-drift governance tests) + Playwright `^1.59.1` (a11y
  / e2e). Phase 23 adds `campaign-tracker-coherence` + `neteru-coherence` assertions
  and a Playwright a11y test for `<OvertonRadar>`.

**Code Organization**
- Strict layering cascade (ADR-0002), enforced by `eslint-plugin-boundaries` +
  `madge --circular`:
  `domain → lib → server/governance → server/services → server/trpc → components/neteru → app`.
- Per-Neter service modules under `src/server/services/<neter>/`; governed Intent bus
  via `mestor.emitIntent()`; manifests declare capabilities + SLOs.

**Development Experience**
- LLM Gateway v4 (multi-provider, circuit breaker, cost tracking); NSP SSE broker for
  progress streaming; Credentials Vault (`ExternalConnector`) for external connectors;
  conventional commits + commitlint; Husky pre-commit (CODE-MAP regen).

**Note:** No initialization story. Phase 23's first implementation story is an
*extension* of `campaign-tracker/` + `sector-intelligence/`, not a scaffold.

> **Stack-doc drift flagged:** CLAUDE.md "Stack" section reads *Next.js 15 / TS 5.8 /
> Prisma 6*; `package.json` reality is *Next 16 / TS 6 / Prisma 7* (Phase 12 shipped
> the 6→7 migration). To be corrected via the NEFER commit protocol doc-sync step,
> not inside this artifact.

> **Carry-forward to step-04:** the ML calibration sub-component (`superfan.attribution`
> regression, ROC AUC / RMSE) may need a numeric/stats dependency not currently in the
> stack — to be decided as an explicit architectural decision, not assumed.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (block implementation):**
- D1 — Scope reframe: net-new vs wiring vs already-built (corrects the PRD).
- D2 — Overton canonical home: `sector-intelligence/` (campaign-tracker delegates).
- D3 — ADR strategy: child ADRs 0077+ materialize what ADR-0052 promised.
- D4 — Connector architecture: 2 Credentials-Vault façades, ship-without-keys.
- D5 — Lifecycle-promotion Intent kind(s): governed, hash-chained.

**Important Decisions (shape the architecture):**
- D6 — ML calibration: pure-TS, no new dependency; calibration snapshots versioned.
- D7 — Manual-first parity mechanics: `executionType` extension + manual UI forms.
- D8 — Data architecture: 0 new models, additive fields on `Campaign`/`CampaignAction`.
- D9 — Frontend: 1 Cockpit route mounting the existing `<OvertonRadar>`.

**Deferred Decisions (post-MVP / Growth):**
- PRODUCTION promotion of `superfan.attribution` / `culture.overtonShift` /
  `overtonReadiness` — gated on a direction business decision on calibration
  thresholds. Code-ready in MVP; promotion is a governed Intent fired later.
- Scheduled re-calibration (`staleAt` pattern) against model drift.
- Predictive `<OvertonRadar>` and cross-client Jehuty benchmarking.

### D1 — Scope reframe (corrects the PRD)

The PRD's CODE-MAP grep was stale. Verified at architecture step-02/04, the Phase 23
surface partitions into three buckets, **not** "create everything":

**Already exists — do NOT recreate (NEFER §3.2 prohibition #1):**
- 5 (+1) measurement Glory tools — `phase19-tools.ts`, all `status: "ACTIVE"`,
  prompt-templated: `big-idea-coherence-checker`, `myth-arc-cohesion-evaluator`,
  `crew-performance-evaluator`, `negative-space-auditor`, `mcp-content-pii-classifier`
  (+ `postmortem-12q`).
- `<OvertonRadar>` — `src/components/neteru/overton-radar.tsx`.
- `sector-intelligence/` service + `Sector` Prisma model.
- 6 pivot sub-clusters in `campaign-tracker/` — all at PARTIAL.

**Wiring — connect existing disconnected pieces:**
- `campaign-tracker/culture.overtonShift|overtonReadiness` → delegate to
  `sector-intelligence/` (replace Jaccard heuristic with the real vector algo).
- `culture.tarsisBridge` → Tarsis connector façade.
- `superfan.stickiness` / `superfan.crmCapture` → CRM connector façade.
- `phase19-tools.ts` Glory tools → campaign-tracker promotion path via Glory dispatcher.
- `<OvertonRadar>` → real `sector-intelligence` + Tarsis signal.
- Overton output → Oracle §33 "État Overton sectoriel" (FR17).

**Genuinely net-new — the real build surface:**
- 2 connector façades (Tarsis-monitoring API, CRM) via Credentials Vault.
- Governed lifecycle-promotion Intent kind(s).
- ML calibration logic (ROC AUC / RMSE) + Console calibration-review panel.
- 1 Cockpit route mounting `<OvertonRadar>`.
- Manual-first UI paths: 5 Glory tools (currently LLM-only) + manual coefficient
  mode + operator-tagged delta mode.
- `applicableNatures` annotation on the 5 existing tools — **this is N6-bis
  residual work**, not "annotated from creation" (PRD claim corrected).
- Anti-drift test extensions.

**Mandated follow-up:** PRD frontmatter (`chosen_target.code_map_grep`,
`scope_summary`) + closure-roadmap target #1 closure criterion must get a correction
note — the "create 5 Glory tools / 1 net-new component" wording is factually wrong.
Tracked as the first item of the implementation epic's governance story.

### D2 — Overton canonical home

`sector-intelligence/` (Layer-3 Seshat service, backed by `Sector` model, with
`getSectorAxis` / `refreshSectorOverton` / `detectDrift` / `computeBrandDeflection`)
is the **canonical Overton engine**. Rationale: it already implements the real
vector algorithm that `campaign-tracker/signals-culture.ts` explicitly flags as
missing (*"MVP heuristic — vrai algo Overton viendra"*). Reimplementing it inside
campaign-tracker would be the exact doubling NEFER §3.2 forbids.

- `campaign-tracker/culture.overtonShift` → calls `sector-intelligence.detectDrift`
  + `computeBrandDeflection`; drops its Jaccard placeholder.
- `campaign-tracker/culture.overtonReadiness` → calls `sector-intelligence.getSectorAxis`
  for the proximity computation instead of token Jaccard.
- `campaign-tracker/culture.tarsisBridge` → feeds `sector-intelligence.refreshSectorOverton`
  with Tarsis-connector signal.
- Ownership seam: `sector-intelligence/` owns **sector-level** axis/drift/snapshot;
  `campaign-tracker/culture.*` owns **campaign-level** readiness/shift verdicts that
  *consume* it. No cross-write; campaign-tracker imports sector-intelligence (allowed
  — same `server/services` layer, one direction).

### D3 — ADR strategy: child ADRs 0077+

Phase 23 materializes what ADR-0052 promised as "children" but never created. One
child ADR per decision area, sequentially numbered from 0077:

| ADR | Title | Covers |
|---|---|---|
| ADR-0077 | Phase 23 pivot-mechanics wiring (parent/closure) | D1 scope reframe, supersedes the phantom "0052-B/C/D/E/F" refs |
| ADR-0078 | Overton canonical home — sector-intelligence | D2 |
| ADR-0079 | External signal connectors via Credentials Vault | D4 |
| ADR-0080 | Pivot sub-cluster lifecycle-promotion Intent | D5 |
| ADR-0081 | Superfan-attribution calibration methodology | D6 |

Dangling code references (`0053-coherence-llm-evaluator`, `0054-superfan-attribution-model`,
`0055-overton-algo`, `0056-postmortem-12q`, `0057-crew-scoring`) are **retired** —
each replaced with a pointer to its real ADR-0077+ counterpart in the same commit
that touches the file. Listed in ADR-0077 §"superseded references".

### Data Architecture

- **0 new Prisma models.** `Sector` already exists (Phase 3). Additive fields only,
  on `Campaign` / `CampaignAction`, per the ADR-0052 vague-2/3 migration intent —
  e.g. attribution coefficients, calibration-snapshot pointer, manual-entry flags.
  Exact field list is an epic-level concern; the *constraint* is: additive, nullable,
  `prisma migrate dev`, no breaking change.
- Connector credentials: existing `ExternalConnector` model (Credentials Vault,
  ADR-0021) — per-`Operator`, no schema change.
- Calibration snapshots: stored as append-only `IntentEmission` payloads (hash-chained),
  not a new table — reproducibility via `promptHash`/model-version pattern.
- Validation: Zod at every boundary; `executeStructuredLLMCall` (ADR-0067) for the
  5 Glory tools' LLM path — JSON-schema-enforced, retry-on-Zod-fail.

### Authentication & Security

All inherited — no new decision, recorded for completeness:
- `tenantScopedDb` default-deny on every Phase 23 Prisma access (NFR5).
- Connector secrets only as `ExternalConnector` rows — never env vars, never logged,
  never in API responses (NFR4). Distinct from the ADR-0075 payment-secrets boundary.
- PII on inbound MCP context gated by `mcp-content-pii-classifier` before persistence;
  CRM ingest supports field-level redaction (NFR6).
- Calibration acceptances + lifecycle promotions are append-only hash-chained
  `IntentEmission` entries — tamper-evident, replayable (NFR7).
- RBAC: operator mutations via `governedProcedure`, reads via `operatorProcedure`;
  founder Cockpit access read-only + `requiresPaidTier`-gated, enforced by procedure
  type not UI hiding.

### D4 — External signal connectors (API & Communication)

- 2 connector façades — `tarsis-monitoring` under `services/seshat/`, `crm-provider`
  under `services/anubis/` — each implementing the Credentials-Vault façade contract:
  returns `DEFERRED_AWAITING_CREDENTIALS` when unconfigured, a typed error state on
  transient failure, **never an uncaught throw, never fabricated data** (NFR8/9).
- One reusable shared shape for the "ship-without-keys" state — defined once
  (likely a `ConnectorResult<T>` discriminated union: `LIVE | DEFERRED | DEGRADED`),
  consumed by sub-clusters, Glory tools, and `<OvertonRadar>` alike (cross-cutting
  concern #3 resolved as a single type).
- Connector test-call result is operator-observable (FR3, NFR11).
- APOGEE cap 7/7 preserved — connectors are Vault entries, not Neteru (FR34).
- Inbound MCP reuses the existing `mcp-client.ts` transport — no new transport.

### D5 — Lifecycle-promotion Intent kind(s)

- New async Intent kind — `PROMOTE_PIVOT_SUBCLUSTER` (single parameterized kind over
  `{ subClusterSlug, fromState, toState, calibrationSnapshotRef? }`) rather than one
  kind per sub-cluster — keeps the Intent registry lean, mirrors the
  `PROMOTE_SEQUENCE_LIFECYCLE` precedent (ADR-0042).
- Governed via `mestor.emitIntent()`; append-only hash-chained; declared in the
  `campaign-tracker` manifest with an SLO (FR22/23/33, NFR1).
- A separate `RUN_ATTRIBUTION_CALIBRATION` async Intent kind for the calibration run
  (SLO p95 ≤ 60s, cost ≤ $0.50 per NFR1) — emits NSP SSE progress (NFR3).
- Promotion to PRODUCTION requires a `calibrationSnapshotRef`; the Intent handler
  refuses the transition without one — traceability (FR24) enforced at the gate.

### D6 — ML calibration methodology

- `superfan.attribution` = a calibrated logistic regression attributing devotion-ladder
  transitions to `CampaignAction`s. Implemented in **pure TS** under
  `campaign-tracker/superfan-attribution.ts` — **no new dependency** (fit via simple
  gradient descent or operator-supplied coefficients; ROC AUC + RMSE are ~30 LOC each).
- Calibration runs against the operator's **real campaign history**; metrics
  (ROC AUC / RMSE) computed and surfaced to the operator *before* PRODUCTION promotion
  — the operator owns the statistical judgment (FR19/20/21).
- Acceptance thresholds declared in ADR-0081 (replaces the phantom "ADR-0052-D").
- **No-magic-fallback (ADR-0046):** sparse signal → explicit `INSUFFICIENT_DATA`
  state, never a fabricated score (FR11). First-class return type, not an exception.
- Calibration snapshots versioned + reproducible (`promptHash`/model-version).

### D7 — Manual-first parity mechanics

- The 5 Glory tools are currently `executionType: "LLM"` only. Phase 23 adds an
  equivalent **manual UI input path** per tool that produces the *same structured
  output* (FR28). Mechanism: a manual operator form keyed off each tool's existing
  `outputFormat` Zod shape — the downstream consumer cannot tell which path produced
  the result.
- `superfan.attribution` → manual coefficient-entry mode (FR25).
- `culture.overtonShift` → operator-tagged delta mode (FR26).
- HARD-test-enforced (ADR-0060): the `assembler-uses-manual-path.test.ts` pattern is
  extended to assert no Phase 23 orchestration handler is LLM-only.

### D8 / D9 — Frontend Architecture

- **1 net-new route only** — a Cockpit route (per the UX spec,
  `/cockpit/intelligence/overton`) that mounts the **existing** `<OvertonRadar>`
  component. `<OvertonRadar>` itself is not recreated — at most its props are wired
  to real `sector-intelligence` + Tarsis data and an honest empty/degraded state
  (FR30/31).
- Console: a calibration-review **panel** on the existing campaign-tracker Console
  surface (`/console/governance/campaign-tracker`) — not a new route.
- State: tRPC + React Query, inherited; no new state management.
- `<OvertonRadar>` route is behind a Suspense boundary, first meaningful render < 2s
  on cached signal (NFR2); design-tokens-only + CVA, a11y per DESIGN-A11Y, Playwright
  a11y test (NFR13/14). COMPONENT-MAP + PAGE-MAP updated for the new route.

### Infrastructure & Deployment

All inherited — single-Postgres envelope, Vercel, existing CI. Multi-pod scale-out
is closure-roadmap target #2, explicitly out of scope (NFR12). Phase 23 adds no infra.

### Decision Impact Analysis

**Implementation sequence (dependency-ordered):**
1. ADR-0077 (scope reframe + PRD correction note) — unblocks shared understanding.
2. `ConnectorResult<T>` shared type + 2 connector façades (D4, ADR-0079) — unblocks
   every downstream sub-cluster.
3. `sector-intelligence` ← Tarsis wiring; `campaign-tracker/culture.*` delegation
   (D2, ADR-0078).
4. `superfan.*` ← CRM wiring + attribution calibration logic (D6, ADR-0081).
5. Lifecycle-promotion + calibration Intent kinds (D5, ADR-0080) + manifest SLOs.
6. Manual-first UI paths for the 5 Glory tools + 2 models (D7); `applicableNatures`
   annotation (N6-bis).
7. Cockpit `/cockpit/intelligence/overton` route + Console calibration panel (D8/D9).
8. Anti-drift test extensions; CLAUDE.md stack-doc + map updates.

**Cross-component dependencies:**
- Everything depends on the `ConnectorResult<T>` shared shape — design it first.
- `campaign-tracker/culture.*` now depends on `sector-intelligence/` (one-way import).
- Glory tools' manual paths depend on their existing `outputFormat` Zod shapes — no
  schema invention.
- The calibration Intent gates PRODUCTION promotion — D5 and D6 are coupled.
- Oracle §33 consumes Overton output — FR17 depends on D2 being wired first.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Inherited, HARD-test-enforced — Phase 23 conforms, does not re-decide:**
- Code naming (camelCase identifiers, kebab-case files, PascalCase components, file
  = component name).
- Project organization (layering cascade `domain → lib → governance → services →
  trpc → components → app`, enforced by `eslint-plugin-boundaries` + `madge --circular`).
- Test layout (`tests/` + `*.test.ts` co-located; Vitest unit + Playwright e2e/a11y).
- Database (`snake_case` columns when Prisma maps them; `camelCase` in TS; nullable-by-
  default for additive Phase 23 fields).
- API (tRPC; `operatorProcedure` for reads, `governedProcedure` for mutations; **no
  REST endpoint shall be introduced** by Phase 23).
- Validation (Zod at every boundary; `executeStructuredLLMCall` for any LLM path,
  ADR-0067).
- Errors (typed; never throw across the Intent boundary unless governance permits;
  Mestor catches + records failure `IntentEmission`).
- Logging / SSE (`bestEffort()` on every NSP emit per ADR-0072 — telemetry failure
  never fails the underlying Intent).
- Design System (Tier 0→3 cascade, CVA variants, no raw Tailwind colour classes —
  three DS prohibitions, ADR-0013).

**Net-new for Phase 23 — agents MUST follow:**

### P22-1 — `ConnectorResult<T>` discriminated union (cross-cutting)

The "ship-without-keys" state shape is defined **once** and consumed everywhere
(connector façade, sub-cluster, Glory tool, `<OvertonRadar>`, Console panel).

```ts
// src/domain/connector-result.ts
export type ConnectorResult<T> =
  | { state: "LIVE"; data: T; observedAt: string }
  | { state: "DEFERRED_AWAITING_CREDENTIALS"; connectorId: string }
  | { state: "DEGRADED"; reason: ConnectorDegradationReason; lastObservedAt?: string };

export type ConnectorDegradationReason =
  | "INSUFFICIENT_DATA"
  | "VENDOR_OUTAGE"
  | "RATE_LIMITED"
  | "AUTH_REVOKED";
```

**Rules:**
- Every connector façade returns `ConnectorResult<T>`.
- Every sub-cluster / Glory tool consuming a connector handles the three states
  exhaustively (no default `else`, no implicit fall-through).
- `<OvertonRadar>` empty/degraded state is keyed off this type — not a separate
  UI-only "loading vs empty" boolean.
- **No `try`/`catch` that swallows a transient connector failure into a `LIVE`
  result.** Transient failure → `DEGRADED`, never `LIVE`.
- Anti-drift test: assert no Phase 23 file returns `null`/`undefined` from a
  connector-dependent capability.

### P22-2 — `INSUFFICIENT_DATA` is a first-class return value, never an exception

Every measurement path (`superfan.attribution`, `culture.overtonShift`, calibration
runs, evangelist count, cohort retention) returns a discriminated union whose
"can't compute" branch is **typed at the call site**, not thrown.

```ts
type AttributionResult =
  | { state: "OK"; score: number; lineage: EvangelistTransition[]; snapshotRef: string }
  | { state: "INSUFFICIENT_DATA"; minSamplesRequired: number; samplesAvailable: number };
```

**Rules:**
- No-magic-fallback (ADR-0046) restated: never a fabricated score under `OK`.
- The UI consumer renders the `INSUFFICIENT_DATA` branch as an honest empty/degraded
  panel — never a numeric zero or "—" that the founder could mistake for a real value.
- Anti-drift test: grep Phase 23 measurement files for any `?? 0` or `|| 0` on a
  score field. Bans the silent zero.

### P22-3 — Manual-first parity contract per Glory tool

The 5 phase19-tools.ts Glory tools are currently `executionType: "LLM"` only. Phase
22 adds an equivalent manual path **without changing their `outputFormat`** —
downstream consumers cannot tell which path produced the result.

```ts
// Extension to GloryToolDef
executionType: "LLM" | "MANUAL" | "MCP" | "HYBRID";  // adds "HYBRID"
manualFormSchema?: ZodType;  // required when executionType: "HYBRID"
```

**Rules:**
- A Phase 23 Glory tool ships as `executionType: "HYBRID"` (LLM path + manual form
  fallback) — never LLM-only.
- The manual form's Zod shape **equals** the tool's `outputFormat` shape — not a
  parallel schema.
- The HARD test `assembler-uses-manual-path.test.ts` (ADR-0071) is extended to
  every Phase 23 orchestrator: must not call the LLM path directly; goes through
  the unified dispatcher that handles fallback.

### P22-4 — Lifecycle-promotion Intent shape (parameterized, not per-cluster)

One Intent kind for all six pivot sub-clusters, mirroring `PROMOTE_SEQUENCE_LIFECYCLE`
(ADR-0042):

```ts
type PromotePivotSubclusterPayload = {
  subClusterSlug:
    | "superfan.attribution"
    | "superfan.stickiness"
    | "superfan.crmCapture"
    | "culture.overtonShift"
    | "culture.overtonReadiness"
    | "culture.tarsisBridge"
    | "culture.mcpIngest";
  fromState: "STUB" | "PARTIAL" | "MVP";
  toState: "PARTIAL" | "MVP" | "PRODUCTION";
  calibrationSnapshotRef?: string;  // REQUIRED when toState === "PRODUCTION"
  reason: string;  // operator rationale, free-form
};
```

**Rules:**
- The handler refuses any transition that violates the natural order
  (STUB→PARTIAL→MVP→PRODUCTION, no skipping, no reverse without explicit re-entry).
- `toState === "PRODUCTION"` requires `calibrationSnapshotRef` — gate at handler
  entry, not at UI. Traceability (FR24) is structural, not advisory.
- Append-only `IntentEmission`; hash-chained.

### P22-5 — Glory-tool ↔ campaign-tracker dispatcher seam

The phase19 Glory tools are registered but not yet wired to campaign-tracker
promotion. Phase 23 wires them through `getGloryTool(slug)` (Artemis dispatcher) —
not a parallel registry, not a `switch` in campaign-tracker.

**Rules:**
- A sub-cluster handler that needs a Glory tool's verdict imports
  `getGloryTool(slug)` from `services/artemis/tools/registry.ts` — no other path.
- The result is consumed as `ConnectorResult<typeof tool.outputFormat>` — same
  shape as connector-dependent paths (P22-1 reused, not duplicated).

### P22-6 — Calibration-snapshot persistence as `IntentEmission` payload (no new model)

Every calibration run produces a `RUN_ATTRIBUTION_CALIBRATION` `IntentEmission`. The
emission payload **is** the snapshot — promotion to PRODUCTION later references it
by `IntentEmission.id` (the `calibrationSnapshotRef` of P22-4).

**Rules:**
- Snapshot payload fields are fixed: `{ modelVersion, coefficients, rocAuc, rmse,
  sampleSize, dataWindow: { from, to }, computedAt }`.
- Versioning is implicit from the hash-chain — no separate `version` field needed.
- No `db.calibrationSnapshot.create` — anti-drift test asserts the table does not
  exist (0 new Prisma models).

### P22-7 — ADR-link discipline for retired children

When a Phase 23 commit touches a file with a dangling `0053-0057` ADR reference,
the reference is **replaced** in the same commit with the ADR-0077+ counterpart —
not left for later, not removed silently.

```ts
// before
* Cf. ADR enfant 0054-superfan-attribution-model.md  // does not exist
// after
* Cf. ADR-0081 — Superfan-attribution calibration methodology
```

**Rules:**
- Each replaced reference is enumerated in ADR-0077 §"superseded references".
- Anti-drift test: grep the repo for `0053-coherence-llm-evaluator`,
  `0054-superfan-attribution-model`, `0055-overton-algo`, `0056-postmortem-12q`,
  `0057-crew-scoring` — must be 0 hits after Phase 23 closure.

### Pattern Examples

**Good — connector consumer:**
```ts
const tarsis = await tarsisConnector.fetchSectorSignal(sectorSlug);
switch (tarsis.state) {
  case "LIVE":
    return sectorIntelligence.refreshSectorOverton({ slug: sectorSlug, signals: tarsis.data });
  case "DEFERRED_AWAITING_CREDENTIALS":
    return { state: "INSUFFICIENT_DATA", minSamplesRequired: 7, samplesAvailable: 0 };
  case "DEGRADED":
    return { state: "INSUFFICIENT_DATA", minSamplesRequired: 7, samplesAvailable: 0 };
}
```

**Anti-pattern — silent zero (banned):**
```ts
const tarsis = await tarsisConnector.fetchSectorSignal(sectorSlug);
const samples = tarsis.data?.length ?? 0;  // ← will produce a fabricated score downstream
return computeOverton(samples);
```

**Anti-pattern — LLM-only Glory tool path (banned by HARD test):**
```ts
const result = await executeStructuredLLMCall(bigIdeaCoherenceChecker.prompt, ...);
return result;  // ← bypasses manual fallback dispatcher
```

### Enforcement Guidelines

**All AI agents MUST:**
- Return `ConnectorResult<T>` from every connector façade (P22-1).
- Use a typed `INSUFFICIENT_DATA` branch instead of throwing or zero-defaulting
  (P22-2). HARD-test will catch zero-defaults on score fields.
- Ship Glory tools as `executionType: "HYBRID"` with `manualFormSchema` equal to
  `outputFormat` (P22-3).
- Emit lifecycle transitions via `PROMOTE_PIVOT_SUBCLUSTER` only; refuse to skip
  states; require `calibrationSnapshotRef` for PRODUCTION (P22-4).
- Resolve Glory tools via `getGloryTool(slug)` — never a parallel registry (P22-5).
- Persist calibration snapshots as `IntentEmission` payloads — never a new table
  (P22-6).
- Replace dangling 0053–0057 ADR references when touching the file (P22-7).

**Pattern enforcement:**
- Anti-drift tests added: `phase22-connector-result.test.ts`,
  `phase22-no-silent-zero.test.ts`, `phase22-glory-hybrid.test.ts`,
  `phase22-lifecycle-promotion.test.ts`, `phase22-no-calibration-table.test.ts`,
  `phase22-no-dangling-adr-refs.test.ts`. All mode HARD on merge.
- Pattern violations are caught at PR review (Phase 21 closure NEFER doctrine).
- Pattern updates require an ADR amendment to ADR-0077.

## Project Structure & Boundaries

### Phase 23 Touched Slice — verified against the repo tree

```
ADVE-project/
├── docs/governance/
│   ├── adr/
│   │   ├── 0052-campaign-module-canonical-trajectory-instrument.md   [EXTEND] — note phantom-children retirement
│   │   ├── 0077-phase-22-pivot-mechanics-wiring.md                   [NEW] — D1 scope reframe + closure
│   │   ├── 0078-overton-canonical-home-sector-intelligence.md        [NEW] — D2
│   │   ├── 0079-external-signal-connectors-credentials-vault.md      [NEW] — D4
│   │   ├── 0080-pivot-subcluster-lifecycle-promotion-intent.md       [NEW] — D5
│   │   └── 0081-superfan-attribution-calibration-methodology.md      [NEW] — D6
│   ├── CODE-MAP.md          [EXTEND] — auto-regen pre-commit (synonyms for connector/calibration)
│   ├── PAGE-MAP.md          [EXTEND] — +1 route (/cockpit/intelligence/overton)
│   ├── ROUTER-MAP.md        [EXTEND] — +N tRPC procedures on campaign-tracker router
│   ├── SERVICE-MAP.md       [EXTEND] — connector façades under seshat/ + anubis/
│   ├── COMPONENT-MAP.md     [EXTEND] — <OvertonRadar> now consumed by a route
│   ├── RESIDUAL-DEBT.md     [EXTEND] — N6-bis closure note + Phase 23 carry-overs
│   ├── LEXICON.md           [EXTEND] — only if a new term lands; otherwise no-op
│   ├── PANTHEON.md          [NO-CHANGE] — APOGEE cap 7/7 preserved
│   └── MISSION.md           [EXTEND] — §9 ledger: 3 of 6 checkboxes become checkable
│
├── prisma/
│   ├── schema.prisma        [EXTEND] — additive nullable fields on Campaign / CampaignAction
│   └── migrations/
│       └── 2026MMDDHHMM_phase22_campaign_additive_fields/   [NEW] — single additive migration
│
├── src/
│   ├── domain/
│   │   ├── connector-result.ts                  [NEW] — P22-1 shared discriminated union
│   │   └── pillars.ts                            [NO-CHANGE]
│   │
│   ├── lib/
│   │   └── (no Phase 23 changes — calibration math lives in services, not lib)
│   │
│   ├── server/
│   │   ├── governance/
│   │   │   ├── slos.ts                          [EXTEND] — +PROMOTE_PIVOT_SUBCLUSTER, +RUN_ATTRIBUTION_CALIBRATION SLOs
│   │   │   ├── manifest.ts                       [NO-CHANGE] — BRAINS const stays 7/7
│   │   │   └── pillar-readiness.ts               [NO-CHANGE]
│   │   │
│   │   └── services/
│   │       ├── mestor/
│   │       │   ├── intents.ts                   [EXTEND] — register 2 new Intent kinds + dispatch cases
│   │       │   └── gates/                        [EXTEND] — calibrationSnapshotRef gate for PRODUCTION promotion
│   │       │
│   │       ├── artemis/
│   │       │   └── tools/
│   │       │       ├── phase19-tools.ts         [EXTEND] — add executionType:"HYBRID" + manualFormSchema + applicableNatures (P22-3, N6-bis)
│   │       │       └── registry.ts               [EXTEND] — register manual-path dispatcher; type extension for HYBRID
│   │       │
│   │       ├── seshat/
│   │       │   └── tarsis/
│   │       │       └── connector.ts             [NEW] — Tarsis-monitoring API façade, returns ConnectorResult<TarsisSignal>
│   │       │
│   │       ├── anubis/
│   │       │   ├── credential-vault.ts          [EXTEND] — +2 connector types: "tarsis-monitoring", "crm-provider"
│   │       │   └── providers/
│   │       │       └── crm-provider.ts          [NEW] — CRM façade, returns ConnectorResult<CrmCohortSignal>
│   │       │
│   │       ├── sector-intelligence/
│   │       │   ├── index.ts                     [EXTEND] — accept ConnectorResult<TarsisSignal>; degraded-path branches
│   │       │   └── manifest.ts                   [EXTEND] — +acceptsIntents: PROCESS_TARSIS_INGEST (if needed)
│   │       │
│   │       ├── campaign-tracker/
│   │       │   ├── signals-culture.ts           [EXTEND] — delegate overtonShift / overtonReadiness to sector-intelligence; drop Jaccard placeholder
│   │       │   ├── superfan-economy.ts          [EXTEND] — wire stickiness / crmCapture to CRM connector
│   │       │   ├── superfan-attribution.ts      [NEW] — pure-TS logistic regression + ROC AUC + RMSE + AttributionResult union
│   │       │   ├── lifecycle.ts                  [NEW] — PROMOTE_PIVOT_SUBCLUSTER handler + state-machine guards (P22-4)
│   │       │   ├── calibration.ts                [NEW] — RUN_ATTRIBUTION_CALIBRATION handler + NSP SSE emitters
│   │       │   ├── capability-state.ts          [EXTEND] — childAdr fields point to ADR-0077+ (P22-7), states updated to MVP after wiring
│   │       │   ├── manifest.ts                   [EXTEND] — +capabilities: promotePivotSubcluster, runAttributionCalibration
│   │       │   └── index.ts                      [EXTEND] — export new handlers
│   │       │
│   │       └── trpc/
│   │           └── routers/
│   │               └── campaign-tracker.ts      [EXTEND] — +operatorProcedure reads + governedProcedure mutations
│   │
│   ├── components/
│   │   ├── neteru/
│   │   │   ├── overton-radar.tsx               [EXTEND] — props typed against ConnectorResult; honest empty/degraded state (FR31)
│   │   │   └── index.ts                          [NO-CHANGE] — already exports OvertonRadar
│   │   │
│   │   └── cockpit/
│   │       └── intelligence/
│   │           └── overton-panel.tsx            [NEW] — Cockpit-scope wrapper (tRPC + Suspense, NFR2)
│   │
│   └── app/
│       ├── (cockpit)/cockpit/intelligence/
│       │   └── overton/
│       │       └── page.tsx                     [NEW] — /cockpit/intelligence/overton route, paid-tier-gated (FR32)
│       │
│       └── (console)/console/
│           ├── governance/campaign-tracker/
│           │   └── page.tsx                     [EXTEND] — +calibration-review panel + lifecycle-promotion controls
│           └── anubis/credentials/
│               └── page.tsx                     [EXTEND] — +2 connector types in the registration UI
│
└── tests/
    └── unit/governance/
        ├── phase22-connector-result.test.ts                 [NEW] — P22-1 enforcement
        ├── phase22-no-silent-zero.test.ts                   [NEW] — P22-2 enforcement (HARD)
        ├── phase22-glory-hybrid.test.ts                     [NEW] — P22-3 enforcement
        ├── phase22-lifecycle-promotion.test.ts              [NEW] — P22-4 state-machine
        ├── phase22-no-calibration-table.test.ts             [NEW] — P22-6 (asserts table doesn't exist)
        ├── phase22-no-dangling-adr-refs.test.ts             [NEW] — P22-7 (0053-0057 must be 0 hits)
        ├── campaign-tracker-coherence.test.ts               [EXTEND] — assert 6 sub-clusters present + lifecycle states
        ├── neteru-coherence.test.ts                         [NO-CHANGE] — must stay green (cap 7/7)
        └── assembler-uses-manual-path.test.ts               [EXTEND] — extend HARD assertion to Phase 23 handlers
```

### Architectural Boundaries

**Service boundaries (one-way imports only — Phase 23 additions):**
- `campaign-tracker/` → imports `sector-intelligence/` (D2 delegation). One-way.
- `campaign-tracker/superfan-economy.ts` → imports `services/anubis/providers/crm-provider`. One-way.
- `sector-intelligence/` → consumes `ConnectorResult<TarsisSignal>` but does **not**
  import `seshat/tarsis/connector` directly — the connector result is *injected* by
  the caller (campaign-tracker `tarsisBridge` sub-cluster). Keeps sector-intelligence
  pure-data-in/data-out.
- No service imports `mestor/` directly for mutations — all go via `mestor.emitIntent()`.

**API boundaries:**
- All Phase 23 mutations go through the `campaign-tracker` tRPC router as
  `governedProcedure`s — never a direct service-from-router call.
- Cockpit founder-facing queries are `operatorProcedure`s tenant-scoped to the
  founder's brand `Strategy`/`Campaign`.
- No new REST endpoint. No new tRPC sub-router (extends the existing one).

**Component boundaries:**
- `<OvertonRadar>` (in `components/neteru/`) stays *pure presentational* — props in,
  pixels out, no data fetching. Phase 23 does not push it across this line.
- `<OvertonPanel>` (new, in `components/cockpit/intelligence/`) owns the tRPC
  fetch + Suspense boundary + degraded-state UI; consumes `<OvertonRadar>` as a child.
- Route file (`page.tsx`) owns auth/tier guards only; no business logic.

**Data boundaries:**
- 0 new Prisma models. `Sector` is reused. `Campaign`/`CampaignAction` gain additive
  nullable fields in one migration.
- Calibration snapshots persist as `IntentEmission` payloads (P22-6) — no new table.
- Connector credentials in `ExternalConnector` rows (per-Operator, ADR-0021).
- One-way data flow: Tarsis → connector → sector-intelligence → campaign-tracker
  culture sub-clusters → tRPC → Cockpit. No reverse writes.

### Requirements to Structure Mapping

| FR group | Lives in |
|---|---|
| A — External signal connectors (FR1–5) | `seshat/tarsis/connector.ts` + `anubis/providers/crm-provider.ts` + `anubis/credential-vault.ts` (extend) + `console/anubis/credentials/page.tsx` (extend) |
| B — Superfan measurement (FR6–11) | `campaign-tracker/superfan-attribution.ts` (new) + `superfan-economy.ts` (extend) + `cockpit/insights/attribution/` (existing, wire) |
| C — Overton measurement (FR12–18) | `sector-intelligence/` (extend) + `campaign-tracker/signals-culture.ts` (delegate) + Oracle §33 consumer (FR17 — `services/strategy-presentation/` reads `sector-intelligence` for section #33) |
| D — Calibration & lifecycle (FR19–26) | `campaign-tracker/calibration.ts` + `lifecycle.ts` (new) + `mestor/intents.ts` (extend) + `mestor/gates/` (extend) + `console/governance/campaign-tracker/page.tsx` (extend with review panel) |
| E — 5 measurement Glory tools (FR27–29) | `artemis/tools/phase19-tools.ts` (extend `executionType:"HYBRID"` + `applicableNatures`) + `artemis/tools/registry.ts` (extend HYBRID dispatcher) |
| F — Cockpit surfaces (FR30–32) | `components/cockpit/intelligence/overton-panel.tsx` (new) + `app/(cockpit)/cockpit/intelligence/overton/page.tsx` (new) + `components/neteru/overton-radar.tsx` (extend props) |
| G — Governance & coherence (FR33–35) | `campaign-tracker/manifest.ts` (extend SLOs) + `governance/slos.ts` (extend) + `tests/unit/governance/phase22-*.test.ts` (new) + `neteru-coherence.test.ts` (assertion stays green) |

### Cross-Cutting Concerns Placement

- **`ConnectorResult<T>` (P22-1)** lives in `src/domain/` — bottom of the layering
  cascade, importable by everyone, depends on nothing.
- **Manual-first dispatcher (P22-3)** lives in `services/artemis/tools/registry.ts`
  alongside `getGloryTool(slug)` — single dispatch point, no parallel registry.
- **Lifecycle gate (P22-4)** lives in `services/mestor/gates/` — Mestor pre-flight
  rejection before the handler runs, mirroring `MANIPULATION_COHERENCE` precedent.
- **NSP SSE emitters** reuse the canonical helper pattern from ADR-0072 (`bestEffort`)
  — no new emitter infrastructure; new sub-kinds added to `NspEvent` union if needed.

### Integration Points

**Internal communication:**
- Founder → Cockpit page → tRPC → operatorProcedure → campaign-tracker service →
  (reads) sector-intelligence + IntentEmission history.
- Operator → Console page → tRPC → governedProcedure → mestor.emitIntent() →
  Mestor gate → campaign-tracker handler (lifecycle.ts / calibration.ts) → NSP SSE
  progress emit → IntentEmission append.
- Tarsis ingest cron → Anubis MCP client (existing) → mcp-content-pii-classifier
  Glory tool (gate) → campaign-tracker `culture.mcpIngest` handler → sector-intelligence
  refresh.

**External integrations (Credentials Vault):**
- Tarsis-monitoring API ← `services/seshat/tarsis/connector.ts` ← `ExternalConnector{ providerId: "tarsis-monitoring" }`.
- CRM provider ← `services/anubis/providers/crm-provider.ts` ← `ExternalConnector{ providerId: "crm-provider" }`.
- Both façades return `ConnectorResult<T>`; absent creds → `DEFERRED_AWAITING_CREDENTIALS`.

**Data flow (the pivot mechanic, end-to-end):**
```
Tarsis API ──► seshat/tarsis/connector ─► ConnectorResult<TarsisSignal>
                                          │
                                          ▼
                          campaign-tracker/signals-culture.tarsisBridge
                                          │
                                          ▼
                  sector-intelligence.refreshSectorOverton (Sector row updated)
                                          │
                       ┌──────────────────┼─────────────────────┐
                       ▼                  ▼                     ▼
        culture.overtonShift   culture.overtonReadiness    Oracle §33 reader
                       │                  │                     │
                       └──────────────────┼─────────────────────┘
                                          ▼
                              tRPC operatorProcedure
                                          │
                                          ▼
                          cockpit/intelligence/overton-panel
                                          │
                                          ▼
                                  <OvertonRadar>
```

### File Organization Patterns (Phase 23 specifics only)

- **New services files** go under the existing per-Neter directory matching governance
  ownership — never cross-imported, one-way only.
- **New domain types** (`ConnectorResult<T>`, `AttributionResult`) go under `src/domain/`
  — bottom of the layer cascade.
- **New routes** follow the existing `(route-group)/portal/section/page.tsx` pattern;
  one page.tsx per leaf, no nested business logic.
- **New tests** under `tests/unit/governance/` with the `phase22-` prefix — easy to
  collect, easy to assert collectively.
- **Migrations** follow `prisma migrate dev` naming `<timestamp>_<purpose>` — one
  Phase 23 migration covers all additive fields.

### Development Workflow Integration

- Single feature branch (`phase/23-pivot-mechanics`) per ADR Phase-label convention.
- PR labelled `phase/23`; commitlint enforces conventional commits.
- Husky pre-commit auto-regenerates `CODE-MAP.md` when entities change.
- CI must pass: typecheck, lint, `madge --circular`, all `phase22-*` HARD tests,
  unchanged `neteru-coherence.test.ts`, Playwright a11y for OvertonRadar route.
- No infra change — single-Postgres envelope, Vercel.

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility.** The nine decisions (D1–D9) are mutually consistent:
- D1 (scope reframe) is the meta-decision that conditions all others; everything
  downstream assumes "extend/wire, not create."
- D2 (Overton home = `sector-intelligence/`) is compatible with D4 (Tarsis connector
  feeds it via the `ConnectorResult<T>` of P22-1) and with D8 (no new Prisma model —
  `Sector` already exists).
- D5 (parameterized `PROMOTE_PIVOT_SUBCLUSTER` Intent) is compatible with D6
  (calibration snapshot ref required for PRODUCTION) — the gate is structural.
- D7 (manual-first parity) is compatible with D6 (manual coefficient mode) and with
  the inherited HARD test from ADR-0071.
- D3 (child ADRs 0077+) is consistent with the repo convention that architecture =
  ADRs; this doc feeds 5 child ADRs, doesn't replace them.
- No two decisions contradict each other; no two patterns force opposite choices.

**Pattern Consistency.** The 7 Phase-22 patterns (P22-1…7) each support one or
more decisions and are mutually orthogonal:
- P22-1 supports D4 + D9 (shared shape across connectors + UI).
- P22-2 supports D6 + every FR with "insufficient data" wording (FR11/18/31).
- P22-3 supports D7 + FR28.
- P22-4 supports D5 + FR22-24.
- P22-5 supports D7 (manual fallback dispatcher).
- P22-6 supports D5 + D6 + D8 (no new model).
- P22-7 supports D3 (dangling-ref retirement).
No pattern conflicts with the inherited ADR-0013 / 0067 / 0071 / 0072 / 0076.

**Structure Alignment.** The touched-slice tree respects the layering cascade
(`domain/connector-result.ts` is at the bottom; UI consumers at the top) and the
service one-way-import discipline (`campaign-tracker/ → sector-intelligence/`,
never reverse). `madge --circular` must remain clean.

### Requirements Coverage Validation ✅

**Functional Requirements (35/35 covered).**

| FR | Architectural support |
|---|---|
| FR1–5 (connectors) | D4 + P22-1 + structure: `seshat/tarsis/connector.ts`, `anubis/providers/crm-provider.ts`, `anubis/credential-vault.ts` (extend), `console/anubis/credentials/page.tsx` (extend) |
| FR6 (attribution) | D6 + `campaign-tracker/superfan-attribution.ts` (new) |
| FR7 (cohort retention) | D4 + `superfan-economy.ts` (extend) ← CRM connector |
| FR8 (evangelist count) | D6 + `superfan-attribution.ts` (lineage field) |
| FR9 (operator view of attribution + lineage) | D9 + Console campaign-tracker panel + tRPC reads |
| FR10 (founder lineage view) | D9 + `cockpit/insights/attribution/` (existing) wired |
| FR11 (insufficient-data state) | P22-2 (`AttributionResult` union) |
| FR12 (Tarsis sectoral signal) | D4 + `seshat/tarsis/connector.ts` |
| FR13 (Overton-shift via embeddings) | D2 + `sector-intelligence.detectDrift + computeBrandDeflection` |
| FR14 (Overton-readiness) | D2 + `sector-intelligence.getSectorAxis` + `campaign-tracker/culture.overtonReadiness` delegation |
| FR15 (inbound MCP ingest) | existing `mcp-client.ts` + `campaign-tracker/culture.mcpIngest` |
| FR16 (PII classify on MCP) | `mcp-content-pii-classifier` Glory tool (existing, HYBRID-extended) |
| FR17 (Oracle §33 feed) | `services/strategy-presentation/` reads `sector-intelligence` for section #33 — explicit consumer added |
| FR18 (Overton degraded state) | P22-1 + P22-2 |
| FR19–21 (calibration review + accept/reject) | D6 + `calibration.ts` + Console panel |
| FR22 (promotion via Intent) | D5 + `PROMOTE_PIVOT_SUBCLUSTER` |
| FR23 (append-only hash-chained event) | inherited (IntentEmission) + D5 |
| FR24 (snapshot traceability) | D6 + P22-6 (snapshot = IntentEmission payload; promotion refs it) |
| FR25 (manual coefficient mode) | D7 + `superfan-attribution.ts` accepts operator-supplied coefficients |
| FR26 (operator-tagged delta mode) | D7 + `signals-culture.overtonShift` accepts operator delta |
| FR27 (invoke 5 Glory tools) | P22-5 + Console + dispatcher |
| FR28 (manual UI per tool) | P22-3 (`executionType:"HYBRID"` + `manualFormSchema`) |
| FR29 (`applicableNatures` annotated) | P22-3 + N6-bis closure during the same commit |
| FR30 (OvertonRadar in Cockpit) | D9 + `app/(cockpit)/cockpit/intelligence/overton/page.tsx` + existing `<OvertonRadar>` |
| FR31 (honest empty/degraded state) | P22-1 + P22-2 + `<OvertonRadar>` props extension |
| FR32 (founder read-only + paid-tier) | inherited (`requiresPaidTier` + `operatorProcedure` reads only) |
| FR33 (manifest declaration + SLO) | `campaign-tracker/manifest.ts` + `governance/slos.ts` extensions |
| FR34 (APOGEE cap 7/7) | inherited; `neteru-coherence.test.ts` enforces (no Neter added) |
| FR35 (anti-drift assertions) | 6 new `phase22-*.test.ts` + `campaign-tracker-coherence.test.ts` extension |

**Non-Functional Requirements (14/14 covered).**

| NFR | Architectural support |
|---|---|
| NFR1 (SLOs in `slos.ts`) | D5 entries (PROMOTE_PIVOT_SUBCLUSTER, RUN_ATTRIBUTION_CALIBRATION) |
| NFR2 (OvertonRadar < 2s, Suspense) | D9 — `<OvertonPanel>` owns Suspense boundary |
| NFR3 (NSP SSE progress) | D5 + `calibration.ts` emits via existing canonical emitter |
| NFR4 (creds only in `ExternalConnector`) | inherited (ADR-0021); D4 confirms |
| NFR5 (tenantScopedDb everywhere) | inherited; all Phase 23 Prisma access conforms |
| NFR6 (PII gate on MCP + CRM redaction) | FR16 + crm-provider field-level redaction |
| NFR7 (hash-chained calibration + promotion) | D5 + D6 + P22-6 |
| NFR8 (façade DEFERRED / typed error) | P22-1 |
| NFR9 (degraded state within one poll, no fabricated score) | P22-1 + P22-2 (HARD-test no-silent-zero) |
| NFR10 (NSP `bestEffort()`) | inherited from ADR-0072 |
| NFR11 (test-call observable) | FR3 + Credentials Vault UI extension |
| NFR12 (single-Postgres envelope) | no infra change |
| NFR13 (a11y per DESIGN-A11Y + Playwright) | D9 + new Playwright test on overton route |
| NFR14 (design tokens + CVA only) | inherited; D9 enforces on new component |

**Cross-cutting concerns (all 6 resolved).**
1. Overton-home reconciliation → D2.
2. ADR strategy → D3.
3. Ship-without-keys façade → P22-1.
4. Manual-first parity → P22-3 + P22-5.
5. Governed lifecycle promotion → D5 + P22-4 + P22-6.
6. No-magic-fallback → P22-2.

### Implementation Readiness Validation ✅

**Decision completeness.** All 9 decisions specify *what* and *where*; versions
inherited from pinned `package.json`; ADR-0077+ slots are reserved with explicit
titles. No "TBD" inside the binding sections.

**Structure completeness.** Touched-slice tree enumerates every NEW / EXTEND /
WIRE path. Every FR group has a "Lives in" mapping. Every cross-cutting concern
has a placement.

**Pattern completeness.** 7 patterns + inherited DS / API / test patterns cover
every category in the canonical step-05 checklist (naming, structure, format,
communication, process). Anti-pattern examples included. HARD-test enforcement
listed per pattern.

### Gap Analysis Results

**Critical gaps:** none.

**Important — addressed in this doc (not deferred):**
- *PRD scope correction.* PRD `chosen_target.code_map_grep` claims OvertonRadar /
  5 Glory tools / sector-intelligence are net-new — repo grounding proves otherwise.
  Architecture absorbs the correction in D1; the PRD-side textual correction is
  mandated as the first item of the implementation epic's governance story.
- *CLAUDE.md "Stack" drift.* Says Next 15 / TS 5.8 / Prisma 6; actual is Next 16 /
  TS 6 / Prisma 7. To fix during P4 doc-sync of the implementation commit.

**Nice-to-have (deferred — explicit, calendar-locked or trigger-locked):**
- Scheduled re-calibration cron against model drift — Phase 23 Growth, not MVP.
- Predictive `<OvertonRadar>` ("at current rate, sector tips in ~N weeks") — Vision.
- Cross-client Jehuty Overton benchmarking — Vision.

### Validation Issues Addressed

- **C2 doubling risk** (Overton-home) → resolved by D2.
- **Phantom ADR refs** (0053–0057) → resolved by D3 + P22-7 (codebase-wide cleanup).
- **PRD scope inaccuracy** → resolved by D1 (architecture-side absorption) +
  mandated PRD correction note (implementation-side first task).
- **ML dependency open question** (step-03 carry-forward) → resolved by D6 (no new
  dependency; pure-TS).

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**
- [x] Complete directory structure defined (touched-slice)
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION (all 16 checklist items checked; no
Critical Gaps; both Important Gaps are addressed inside this doc and tracked
explicitly as the first items of the implementation epic).

**Confidence Level:** high. The architecture is grounded in repo reality (every
path verified), the pivot decisions (D2, D5, D6) were inferred from existing code
intent rather than imposed, and the manual-first / no-magic-fallback / ship-without-
keys invariants are HARD-test-enforceable.

**Key strengths:**
- Surfaces and corrects a PRD scope drift the readiness-report didn't catch.
- Net-new surface is small and orthogonal to inherited patterns — keeps the
  Phase 23 blast radius proportionate to its mission contribution (3 of 6 §9
  ledger checkboxes).
- Zero new Prisma models, zero new Neteru, zero new transports — APOGEE cap 7/7
  preserved, layering cascade respected.
- Manual-first parity is structural (P22-3) not advisory — HARD test extends.

**Areas for future enhancement:**
- Scheduled re-calibration + drift detection (Growth phase).
- Predictive OvertonRadar (Vision).
- Cross-client benchmarking via Jehuty (Vision).

### Implementation Handoff

**AI agent guidelines:**
- Follow D1–D9 and P22-1…7 exactly; do not invent parallel patterns.
- Use `getGloryTool(slug)` to resolve the 5 measurement tools — never a parallel
  registry.
- Every connector consumer handles all three `ConnectorResult<T>` states
  exhaustively; never silently zero-defaults a score.
- Every Glory tool ships as `executionType:"HYBRID"`; LLM-only paths are HARD-test
  rejected.
- Lifecycle promotion requires a `calibrationSnapshotRef` for PRODUCTION; the gate
  is in the handler, not the UI.
- Refer to this document for all architectural questions; child ADRs 0077-0081
  carry the canonical decision text once written.

**First implementation priority:**
1. Open ADR-0077 (parent/closure) with the D1 scope-reframe text + the PRD/
   closure-roadmap correction note as its first sub-section.
2. Define `src/domain/connector-result.ts` (P22-1) — unblocks every downstream
   touch.
3. Then proceed sequentially per the **Implementation sequence** in "Decision
   Impact Analysis" above (steps 2→8).

## Workflow Completion

`bmad-create-architecture` workflow completed 2026-05-15 — steps 01→08 executed
under NEFER autonomous-continuation authorization. Architecture artifact lives at
`_bmad-output/planning-artifacts/architecture.md`. Status `READY FOR IMPLEMENTATION`.
Closure-roadmap target #1 is now `PRD_DRAFTED + ARCHITECTURE_DRAFTED` — the
implementation epic can be created from this artifact + the PRD + the UX spec.
