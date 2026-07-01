---
workflowType: 'implementation-readiness'
projectName: ADVE-project
author: Alexandre
date: 2026-05-14
stepsCompleted:
  - step-01-document-discovery
  - step-02-prd-analysis
documentsUnderAssessment:
  prd: _bmad-output/planning-artifacts/prd.md
  architecture: NOT_FOUND
  epics: NOT_FOUND
  ux: NOT_FOUND
---

# Implementation Readiness Assessment Report

**Date:** 2026-05-14
**Project:** ADVE-project (La Fusée Industry OS)
**Assessment target:** Phase 23 — Câblage des mécaniques pivot mission (superfans × Overton)

## Step 1 — Document Discovery

Scanned `_bmad-output/planning-artifacts/`.

### PRD Documents
**Whole Documents:**
- `prd.md` — Phase 23 PRD, 12 workflow steps complete, 35 FRs / 14 NFRs / 4 journeys.

**Sharded Documents:** none.

### Architecture Documents
- ⚠️ **NOT FOUND** — no `*architecture*.md` in planning-artifacts.

### Epics & Stories Documents
- ⚠️ **NOT FOUND** — no `*epic*.md` in planning-artifacts.

### UX Design Documents
- ⚠️ **NOT FOUND** — no `*ux*.md` in planning-artifacts.

### Companion (non-assessed) artifacts present
- `closure-roadmap.md` — functional-completion ledger (context, not an assessment target).
- `implementation-artifacts/` — empty.

### Issues

- **No duplicates** — no whole-vs-sharded conflicts. Clean.
- **3 of 4 assessment documents missing** (Architecture, Epics, UX) — expected: the PRD
  was drafted minutes ago and no downstream planning has started. This is the central
  finding the rest of the assessment will quantify.

_Document inventory saved 2026-05-14._

## Step 2 — PRD Analysis

Source: `_bmad-output/planning-artifacts/prd.md` (whole document, 840 lines, `step-12-complete`).
Read in full. Target: **Phase 23 — Câblage des mécaniques pivot mission (superfans × Overton), MVP→PRODUCTION**.

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

**Total FRs: 35** (A:5, B:6, C:7, D:8, E:3, F:3, G:3).

### Non-Functional Requirements

**Performance**
- **NFR1:** New async Intent kinds declare SLOs in `slos.ts`. Signal-collection and sub-cluster-compute Intents target p95 ≤ 15s, cost ≤ $0.10. The attribution calibration run (over real campaign history) targets p95 ≤ 60s, cost ≤ $0.50.
- **NFR2:** `<OvertonRadar>` reaches first meaningful render within 2s on cached signal, behind a Suspense boundary — it never blocks the Cockpit page shell.
- **NFR3:** Calibration runs and signal polls stream progress over NSP SSE (15s heartbeat); the operator never faces a frozen screen with no feedback.

**Security**
- **NFR4:** Connector credentials are stored only as per-`Operator` `ExternalConnector` rows (Credentials Vault, ADR-0021) — never in env vars, never logged, never returned in API responses.
- **NFR5:** All Prisma access for Phase 23 entities goes through `tenantScopedDb` (default-deny); one operator's signal data is unreachable from another tenant.
- **NFR6:** PII on inbound MCP context is classified and flagged by `mcp-pii-classifier` before persistence; CRM ingest supports field-level PII redaction.
- **NFR7:** Calibration acceptances and lifecycle promotions are append-only, hash-chained `IntentEmission` entries — tamper-evident and replayable.

**Integration & Reliability**
- **NFR8:** The Tarsis and CRM connector façades return `DEFERRED_AWAITING_CREDENTIALS` when unconfigured and a typed error state on transient failure — never an uncaught throw, never a crash of the consuming sub-cluster.
- **NFR9:** A connector outage degrades its dependent sub-cluster to an explicit insufficient-data / degraded state within one poll cycle, and never produces a fabricated score (no-magic-fallback, ADR-0046).
- **NFR10:** NSP emitters use `bestEffort()` — a telemetry emit failure never fails the underlying Intent.
- **NFR11:** The connector test-call result is operator-observable (FR3), so integration health is diagnosable without reading server logs.

**Scalability**
- **NFR12:** Signal collection and cohort computation are tenant-scoped per `Strategy` / `Campaign` with no cross-tenant fan-out and no shared mutable global state — Phase 23 inherits the OS's existing single-Postgres scaling envelope. Multi-pod scale-out is tracked separately (closure-roadmap target #2) and is out of scope here.

**Accessibility**
- **NFR13:** `<OvertonRadar>` meets the project design-system a11y bar (DESIGN-A11Y): keyboard-navigable, charts carry a text-equivalent data view, colour is never the sole signal carrier; covered by a Playwright a11y test.
- **NFR14:** `<OvertonRadar>` consumes design tokens only with CVA variants — no raw Tailwind colour classes — consistent with the three Design-System prohibitions.

**Total NFRs: 14** (Performance:3, Security:4, Integration & Reliability:4, Scalability:1, Accessibility:2).

### Additional Requirements & Constraints

Not numbered as FR/NFR but binding on implementation, epics, and stories:

- **Constraint — 0 new Prisma models.** Phase 23 extends `campaign-tracker/` + the Glory tools registry; any schema delta is additive fields on existing `Campaign` / `CampaignAction` per the ADR-0052 vague-2/3 migration plan, via `prisma migrate dev`.
- **Constraint — 1 net-new UI component only:** `<OvertonRadar>` (justified by MISSION.md §5 dérive #5). No other net-new component.
- **Constraint — APOGEE cap 7/7 unchanged.** Tarsis API + CRM are external connectors via Credentials Vault, never an 8th Neter.
- **Constraint — Manual-first parity (ADR-0060).** Every LLM-assisted feature ships an equivalent manual UI path: 5 Glory tools each with a manual form, attribution manual coefficient mode, overtonShift operator-tagged delta mode. HARD-test enforced.
- **Constraint — No-magic-fallback (ADR-0046).** Insufficient signal → explicit insufficient-data/degraded state, never a fabricated score.
- **Constraint — Governance routing.** All mutations via `mestor.emitIntent()`; lifecycle promotions are governed Intents (append-only, hash-chained). Reads via `operatorProcedure`, mutations via `governedProcedure`.
- **Constraint — Layering cascade (ADR-0002):** `domain → lib → governance → services → trpc → components → app`; connectors live under `services/anubis/` + `services/seshat/`, not cross-imported; `madge --circular` clean.
- **Constraint — `applicableNatures` annotated from creation** on the 5 new Glory tools (do not add to N6-bis residual debt) — folded forward from C5 clearance.
- **Constraint — Subscription tier gate:** Cockpit OvertonRadar + attribution lineage gated to `COCKPIT_MONTHLY` / `RETAINER_*` via existing `requiresPaidTier`; no new billing entity.
- **Integration dependency:** Tarsis vendor contract + CRM account are external — decoupled from the critical path by the `DEFERRED_AWAITING_CREDENTIALS` façade pattern.
- **Phasing intrinsic to target:** MVP = non-placebo wiring; PRODUCTION promotion of `superfan.attribution` / `culture.overtonShift` / `culture.overtonReadiness` is Phase 2 (Growth), gated on a direction business decision on calibration thresholds (ADR-0052-D/E/F) — NOT an MVP code deliverable.
- **Scientific sub-component:** attribution = calibrated regression (ROC AUC / RMSE gates, ADR-0052-D); overtonShift = sectoral embeddings (ADR-0052-E/F); calibration runs versioned + reproducible.

### PRD Completeness Assessment (initial)

**Strong.** This is a high-quality, implementation-grade PRD:
- All 35 FRs and 14 NFRs are atomically numbered, capability-scoped ("WHAT not HOW"), and carry an explicit binding "capability contract" clause — directly traceable to epics/stories.
- 4 user journeys map cleanly to capability areas via the Journey Requirements Summary table; every journey-revealed capability has a corresponding FR.
- NEFER pre-flight (C1–C6), mission link, phase label (`phase/23`), CODE-MAP grep result, and manual-first parity statement are all present in frontmatter — the governance gates this readiness check verifies are pre-declared by the PRD itself.
- Scope is explicitly phased (MVP / Growth / Vision) with the MVP/PRODUCTION boundary justified, not invented.
- Risk tables, scientific-validity requirements, and RBAC matrix are present.

**Watch-items to carry into later steps (not defects — traceability flags):**
1. **FR17** ("feeds Oracle §33") depends on the Oracle section registry — verify the architecture/epics name the integration point, not just the FR.
2. **FR22 / FR23 / FR24** (lifecycle promotion, hash-chain, traceability) imply new Intent kinds — the architecture doc must enumerate them and FR33 requires each declared in a manifest with an SLO (NFR1). No architecture doc exists yet to check this against.
3. **NFR1** names SLO targets but the specific new Intent kinds are not enumerated in the PRD — expected to surface in architecture/epics.
4. The PRD references **ADR-0052-B/C/D/E/F children** as the governing architecture. If those ADRs are the de facto architecture document, the Architecture gate may be satisfiable by them rather than a BMad architecture artifact — to be resolved when the Architecture doc is created or those ADRs are formally designated.
5. **Phase-label validity window:** target is `phase/23`; repo Phase status (CLAUDE.md) shows Phase 21 closure shipped, Phase 19 shipped — `phase/23` depends on Phase 19 `campaign-tracker/` sub-clusters which ARE shipped. Dependency window is satisfied. ✓

_PRD analysis saved 2026-05-14._
