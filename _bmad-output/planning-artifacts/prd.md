---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
releaseMode: phased
classification:
  projectType: saas_b2b
  domain: general
  domainSubComponent: scientific
  domainNote: >
    OS domain is martech / brand-strategy (not in BMad taxonomy → general).
    Phase 23 carries a scientific sub-component: superfan attribution =
    calibrated regression model (ROC AUC / RMSE gates per ADR-0052-D),
    overtonShift = sectoral embeddings. Later steps pull validation-
    methodology / accuracy-metrics treatment for the ML pieces.
  complexity: high
  projectContext: brownfield
classification_c5_cleared: >
  C5 Phase 18 residual check cleared at step-02 — no overlap with
  calendar-locked residuals. Constraint folded forward: the 5 net-new
  Glory tools must ship with `applicableNatures` annotated from creation
  (do not add to N6-bis debt).
inputDocuments:
  - CLAUDE.md
  - docs/governance/MISSION.md
  - _bmad-output/project-context.md
  - _bmad-output/planning-artifacts/closure-roadmap.md
  - _bmad/custom/_nefer-checks.md
  - _bmad/custom/_nefer-facts.md
  - _bmad/custom/_nefer-commit.md
  - docs/governance/RESIDUAL-DEBT.md
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 1
workflowType: 'prd'
projectName: ADVE-project
codename: lafusee
author: Alexandre
date: 2026-05-13
nefer_preflight:
  C1_read_project_memory: done
  C2_anti_doublon_grep: done — all entities EXIST as Phase 19 residuals; this PRD EXTENDS, creates 0 new models. See chosen_target.code_map_grep.
  C3_lexicon_reformulation: done
  C4_apogee_three_laws: done — no altitude regression, cascade-respecting, fuel-gated via Thot
  C5_phase18_residual_check: done — cleared at step-02; no overlap with calendar-locked Phase 18 residuals (N5-bis / N6-bis are closure-roadmap target #4). Constraint folded forward: the 5 net-new Glory tools ship with `applicableNatures` annotated from creation. See classification_c5_cleared.
  C6_variable_bible_crosscheck: n/a — manual coefficient mode (FR25) and operator-tagged delta mode (FR26) land editable inputs on `Campaign` / `CampaignAction`, not on `Strategy` / `BrandContextNode` / pillar payload; variable-bible (~300 entries) is not touched. No new editable pillar field.
chosen_target:
  id: 1
  title: "Phase 23 — Câblage des mécaniques pivot mission (superfans × Overton) MVP→PRODUCTION"
  clusters: [A, F, "G#5"]
  phase: "phase/23 — materializes 5 child ADRs 0077-0081 (PRD phantom-children ADR-0052-B/C/D/E/F retired per ADR-0077 §superseded references) + corrects MISSION.md §5 dérive #5"
  neters: [Seshat, Anubis, Artemis]
  # CORRECTION 2026-05-16 (per ADR-0077 + architecture step-02 `neter_ownership`) :
  # Ptah dropped from owning Neteru — Phase 23 has no forge / production scope (measurement
  # tools emit assessments, not assets). Authoritative set : Seshat (Tarsis connector +
  # Overton consumer) · Anubis (CRM connector + MCP transport) · Artemis (5 Glory tools
  # HYBRID + dispatcher). Mestor implicit (governance Intent dispatcher).
  portals: [Console, Cockpit]
  brand_asset_kind: "none new — feeds ORACLE_DOCUMENT section #33 (Tarsis sectorielles)"
  effort: "M-L"
  scope_summary: >
    [SCOPE CORRECTED 2026-05-16 per ADR-0077 — see scope_correction_note below for original wording.]
    Wire 6 Phase 19 sub-clusters out of PARTIAL into MVP (none were STUB)
    (superfan.attribution, superfan.stickiness, culture.overtonShift,
    culture.overtonReadiness, culture.tarsisBridge, culture.mcpIngest)
    via delegation to sector-intelligence/ (Overton) and CRM connector
    (Superfan); migrate the 5 EXISTING measurement Glory tools
    (big-idea-coherence-checker, myth-arc-cohesion-evaluator,
    crew-performance-evaluator, negative-space-auditor,
    mcp-content-pii-classifier) to executionType: HYBRID with manual peer forms
    + close N6-bis applicableNatures annotation in same commit;
    wire 2 external connectors via Credentials Vault (Seshat tarsis-monitoring API
    + Anubis CRM provider, ADR-0079); deliver the Cockpit /cockpit/intelligence/overton
    route mounting the EXISTING OvertonRadar component (MISSION.md §5 dérive #5).
  scope_correction_note: >
    Original PRD wording (drafted before architecture step-02 grep) claimed creation
    of OvertonRadar, sector-intelligence/, and 5 dedicated Glory tools as net-new.
    Architecture step-02 (`_bmad-output/planning-artifacts/architecture.md` D1)
    verified against repo : all 3 already exist. 6 sub-clusters were PARTIAL (not
    STUB). `applicableNatures` annotation is N6-bis residual closure folded INTO
    Phase 23 (Epic 5 Story 5.4), not "annotated from creation". Canonical scope is
    ADR-0077 §"Scope reframe (corrige le PRD)" — this PRD now points there. No
    new Prisma model, no new Neter, no new transport.
  code_map_grep:
    terms_searched: ["superfan attribution", "cohort retention", "overton shift", "tarsis bridge", "campaign tracker", "overton radar"]
    result: "campaign-tracker/ service + 22 sub-clusters EXIST (Phase 19, ADR-0052). Glory tools registry EXISTS. [CORRECTED 2026-05-16 per ADR-0077 + architecture step-02 :] OvertonRadar component ALREADY EXISTS at src/components/neteru/overton-radar.tsx — Phase 23 wires it to real signal + places it on a new route, does NOT create it. sector-intelligence/ service ALREADY EXISTS (Seshat, Sector model). 5 measurement Glory tools ALREADY EXIST in phase19-tools.ts. The net-new build surface is : 2 connector façades, 1 Cockpit route, 5 child ADRs, manual-first UI paths, ML calibration logic — not net-new components."
    decision: "[CORRECTED 2026-05-16 per ADR-0077 + architecture step-02 :] EXTEND existing campaign-tracker/, sector-intelligence/, Glory tools registry + WIRE existing OvertonRadar to a new Cockpit route. 5 child ADRs 0077-0081 created (not 0052-B/C/D/E/F which never materialized — they are phantom refs retired per ADR-0077 §superseded references). No new Prisma model. No new Neter (Tarsis & CRM are Credentials Vault entries, not 8th Neter — Cap APOGEE 7/7 préservé)."
target:
  phase: "phase/23"
  neter: "Seshat + Anubis + Artemis"
  # CORRECTION 2026-05-16 (per ADR-0077) : Ptah dropped — no forge scope in Phase 23.
  portal: "Console + Cockpit"
  brand_asset_kind: "N/A (feeds existing ORACLE_DOCUMENT #33)"
mission_link: >
  This PRD wires into PRODUCTION the exact mechanics that MEASURE superfan
  accumulation (attribution, stickiness, cohort retention) and OBSERVE the
  Overton window shift (real Tarsis signal collection, embeddings-based
  overtonShift) — it is the pivot mechanism of MISSION.md §2 itself.
  Without it the Cockpit produces placebo Jaccard scores; with it the OS
  becomes credibly able to industrialize superfan accumulation.
manual_first_parity_statement: >
  Per ADR-0060, every LLM-assisted feature in this PRD ships with an
  equivalent manual UI path: the 5 LLM Glory tools each have a manual
  operator-input form; superfan.attribution ML has a manual coefficient-entry
  mode; overtonShift embeddings has a manual operator-tagged delta mode.
  No LLM-only flow is permitted.
---

# Product Requirements Document — ADVE-project (La Fusée Industry OS)

**Author:** Alexandre
**Date:** 2026-05-13
**Project codename:** lafusee
**Target:** Cible #1 — Phase 23, Pivots mission (superfans × Overton) MVP→PRODUCTION
**Repo phase status at PRD inception:** Phase 21 closure shipped (2026-05-08), Phase 18 noyau bouclé (2026-05-06), Phase 19 Vague 1+2+3 shipped (2026-05-06). 76 ADRs to date.

> **NEFER pre-flight:** C1 ✓ · C2 ✓ · C3 ✓ · C4 ✓ · C5 ✓ (cleared step-02) · C6 n/a (no editable pillar field — see frontmatter)
> **Phase label:** phase/23
> **Mission link:** wires the superfans × Overton pivot mechanism into PRODUCTION (see frontmatter `mission_link`).
> **CODE-MAP grep:** see frontmatter `chosen_target.code_map_grep` — EXTEND campaign-tracker/, 1 net-new UI component (OvertonRadar, justified MISSION.md §5).

---

## Companion ledger

The target is **locked** in frontmatter (`chosen_target` + `target`), user-confirmed
2026-05-13. The companion ledger [closure-roadmap.md](closure-roadmap.md) tracks all
11 closure targets and the Definition of Done for 100% project completion; this PRD
is target #1. Its status there moves `NOT_STARTED → PRD_DRAFTED` on workflow
completion (`step-12-complete`).

---

## Executive Summary

Phase 23 wires La Fusée's two mission-pivot mechanics — **superfan accumulation**
and **Overton-window shift** — from placebo to instrument. Phase 19 (ADR-0052)
shipped the *architecture* for these mechanics as `campaign-tracker/` sub-clusters,
but left six of them at STUB/PARTIAL with heuristic stand-ins: superfan/Overton
scores in the Cockpit are currently computed from Jaccard token overlap, not from
real signal. This PRD promotes those six sub-clusters to MVP/PRODUCTION
(`superfan.attribution`, `superfan.stickiness`, `culture.overtonShift`,
`culture.overtonReadiness`, `culture.tarsisBridge`, `culture.mcpIngest`), creates
the five measurement Glory tools that were never built (big-idea-coherence,
myth-arc-cohesion, crew-performance-evaluator, negative-space-auditor,
mcp-pii-classifier), wires two external connectors through the Credentials Vault
(Seshat Tarsis-monitoring API + Anubis CRM provider), and ships the Cockpit
`<OvertonRadar>` component called for in MISSION.md §5 (dérive #5).

The user is the **UPgraders operator** (Console) configuring real signal sources
and validating model calibration, and the **founder** (Cockpit) who pilots their
brand by these numbers. The problem: the OS *claims* to industrialize superfan
accumulation and Overton shift, but until Phase 23 it can measure neither — the
MISSION.md §9 verification ledger stands at 0/6. When this ships, a founder sees
real attribution lineage ("this campaign produced N evangelists") and real sectoral
movement ("competitors started using your vocabulary; your claim got imitated"),
and the OS becomes credibly able to do what its north-star sentence says.

### What Makes This Special

This is the single chantier that makes MISSION.md's core sentence literally true.
Every other module in the OS exists to serve "industrialize the accumulation of
superfans who shift the Overton window" — but the two mechanics that sentence names
are exactly the two the OS cannot yet measure. The core insight: closing this gap
is **not "more code"** — Phase 19 already declared the sub-clusters. The gap is four
specific wirings — (1) real external signal sources via Credentials Vault; (2)
calibrated models replacing heuristics (attribution regression with ROC AUC / RMSE
gates per ADR-0052-D, Overton sectoral embeddings per ADR-0052-E/F); (3) the five
measurement Glory tools; (4) a founder-facing window (`<OvertonRadar>`), because a
metric the founder cannot see does not change their behavior. Differentiation lands
in two moments: the OvertonRadar surfacing concrete proof the sector is bending
around the brand, and the attribution view showing the evangelist lineage of a
campaign. The chantier moves the §9 ledger off 0/6 and closes the Mission 98→100
gap in the weighted score.

## Project Classification

- **Project Type:** `saas_b2b` — brownfield change to a multi-tenant Industry OS
  (4 portals, `Operator` tenancy root, governed Intent bus). Innovation signal
  "workflow automation / AI agents" maps to the Neteru + Mestor dispatcher.
- **Domain:** martech / brand-strategy (not in the BMad taxonomy → classified
  `general`), carrying a **`scientific` sub-component**: superfan attribution is a
  calibrated regression model and Overton shift is a sectoral-embeddings problem,
  so later steps pull validation-methodology and accuracy-metrics treatment for the
  ML pieces.
- **Complexity:** **high** — hash-chained Intent log, default-deny multi-tenancy,
  manual-first parity enforcement (ADR-0060), LLM Gateway, plus this PRD's ML
  calibration and two external connectors.
- **Project Context:** **brownfield** — extends `campaign-tracker/` and the Glory
  tools registry; **0 new Prisma models**; 1 net-new UI component (`<OvertonRadar>`,
  justified by MISSION.md §5). Phase label `phase/23`; executes ADR-0052-B/C/D/E/F
  children.

## Success Criteria

### User Success

**Operator (Console)** — success is *configurability without code*. The operator
can register the Tarsis-monitoring API and the CRM provider through the existing
`/console/anubis/credentials` Vault UI, see each connector move from
`DEFERRED_AWAITING_CREDENTIALS` to live, and run a calibration review of the
attribution model against real campaign history — accepting or rejecting the
ROC AUC / RMSE thresholds before any sub-cluster is promoted to PRODUCTION. The
"aha" moment: a sub-cluster's score stops being a Jaccard placeholder and starts
moving on real signal the operator can trace to its source.

**Founder (Cockpit)** — success is *seeing the sector bend*. The founder opens
`<OvertonRadar>` and sees concrete, dated evidence: competitor vocabulary overlap
trending, claim imitations, unpaid press mentions, sectoral-embedding delta. The
"aha" moment: "a competitor started using my language" shown as proof, not
sentiment. Second moment: the attribution view shows the evangelist lineage of a
named campaign ("this campaign produced N devotion-ladder transitions to
Ambassador/Evangelist").

### Business Success

- **Closes the Mission score gap.** Weighted score Mission component moves
  98 → 100 (closure-roadmap Condition 3); contributes 3 of the 6 MISSION.md §9
  ledger checkboxes (sectoral Overton axis visible to founder; operator "next 5
  actions" feed has real superfan/Overton ratio; Oracle §33 "État Overton
  sectoriel" maintained by real Tarsis signal).
- **Unblocks direction sign-off.** ADR-0052-B/C/D/E/F children move from "drafted"
  to "validated by direction" — the calibration-threshold decision they were
  waiting on becomes makeable because real-history evaluation data exists.
- **Makes the OS demo-credible to live clients.** The FrieslandCampina / Matanga
  cross-client dashboard shows non-placebo pivot metrics.

### Technical Success

- **0 new Prisma models.** Extends `campaign-tracker/` + Glory tools registry only;
  any schema delta is additive fields on existing `Campaign` / `CampaignAction`
  per ADR-0052 vague-2/3 migration plan.
- **Manual-first parity (ADR-0060) holds.** Each of the 5 new Glory tools and each
  calibrated model ships with an operational manual UI path (manual coefficient
  entry for attribution; operator-tagged delta mode for overtonShift). The HARD
  test `assembler-uses-manual-path.test.ts` pattern is respected for any new
  orchestration handler.
- **Anti-drift CI green.** `campaign-tracker-coherence.test.ts` +
  `neteru-coherence.test.ts` pass; APOGEE cap stays 7/7 (Tarsis API and CRM are
  external connectors via Credentials Vault — no 8th Neter).
- **The 5 new Glory tools ship with `applicableNatures` annotated from creation**
  — they do not add to the N6-bis residual debt.
- **Connectors are ship-able without keys.** Both façades return
  `DEFERRED_AWAITING_CREDENTIALS` cleanly when creds are absent.

### Measurable Outcomes

| Outcome | Target |
|---|---|
| Phase 19 sub-clusters promoted out of STUB/PARTIAL | 6/6 at MVP or PRODUCTION |
| New measurement Glory tools created + `applicableNatures`-annotated | 5/5 |
| External connectors wired through Credentials Vault | 2/2 (Tarsis API, CRM) |
| `<OvertonRadar>` shipped to Cockpit | 1, consumed in cockpit Overton surface |
| Attribution model calibration | ROC AUC / RMSE computed on real history, thresholds presented to direction |
| MISSION.md §9 ledger checkboxes made checkable | 3 of 6 |
| New + extended anti-drift tests passing | campaign-tracker + neteru coherence green |
| New Prisma models | 0 |
| APOGEE Neter count | 7/7 unchanged |

## Product Scope

### MVP — Minimum Viable Product

The wiring that makes the pivot scores **non-placebo**:
- 2 connector façades implemented through Credentials Vault (`DEFERRED_AWAITING_
  CREDENTIALS` when keys absent), so the code ships before keys exist.
- 6 sub-clusters promoted STUB/PARTIAL → **MVP** (heuristics replaced by real
  signal paths where connectors are live; documented MVP-grade algorithms where
  not).
- 5 measurement Glory tools created, manifest-declared, `applicableNatures`-
  annotated, with manual UI paths.
- `<OvertonRadar>` shipped to Cockpit, rendering real signal when available and a
  documented empty/degraded state otherwise.
- Anti-drift CI green; manual-first parity enforced.

### Growth Features (Post-MVP)

- **PRODUCTION promotion** of `superfan.attribution`, `culture.overtonShift`,
  `culture.overtonReadiness` — gated on direction sign-off of calibration
  thresholds (ADR-0052-D/E/F). This is Growth, not MVP, because it is a *business
  decision* on statistical thresholds, not a code deliverable.
- Live ad-network / CRM signal depth beyond MVP cohort retention.

### Vision (Future)

- MISSION.md §9 ledger at 6/6; mission-drift CI detector passing on 100% of units.
- `<OvertonRadar>` becomes predictive ("at current rate, sector tips in ~N weeks"),
  not just observational.
- Cross-client Overton benchmarking (Jehuty) — sector-wide movement, not per-brand.

## User Journeys

### Journey 1 — Amina, UPgraders operator: wiring the signal sources (happy path)

**Situation.** Amina runs the Matanga × FrieslandCampina account from the Console.
The Cockpit shows a "Superfan accumulation: 0.41" and "Overton readiness: 0.33"
that she knows are Jaccard token placeholders — she can't defend them to the client.

**Opening scene.** She opens `/console/anubis/credentials`, the Credentials Vault
UI she already uses for ad-network connectors. Two new connector types are listed:
**Tarsis-monitoring API** (Seshat) and **CRM provider** (Anubis). Both show
`DEFERRED_AWAITING_CREDENTIALS`.

**Rising action.** She pastes the Tarsis API key and the CRM API credentials. Each
façade flips to a live state; a test-call badge confirms reachability. She navigates
to `/console/governance/campaign-tracker` and sees the six pivot sub-clusters —
`superfan.attribution`, `superfan.stickiness`, `culture.overtonShift`,
`culture.overtonReadiness`, `culture.tarsisBridge`, `culture.mcpIngest` — now
showing **MVP** instead of STUB/PARTIAL, drawing on real signal.

**Climax.** A "Calibration review" panel appears for `superfan.attribution`. It has
run the regression against the account's real campaign history and shows ROC AUC /
RMSE against the ADR-0052-D thresholds. Amina reads the numbers, sees they clear
the bar, and accepts — the sub-cluster moves toward PRODUCTION-eligible.

**Resolution.** The Cockpit scores are now traceable to source. Amina can tell the
client exactly where "Overton readiness 0.58" comes from.

*Reveals capabilities:* Credentials Vault connector types (Tarsis API, CRM);
connector health/test-call surface; sub-cluster status display in Console
campaign-tracker; attribution calibration-review panel; governed promotion path.

### Journey 2 — Amina, before the keys exist (edge case / ship-without-creds)

**Situation.** Phase 23 ships on `main` before the Tarsis vendor contract is signed.

**Journey.** Amina opens the campaign-tracker view. The six sub-clusters render
without crashing: those depending on absent connectors show a clear
`DEFERRED_AWAITING_CREDENTIALS` state with a "configure connector" link, not an
error. `<OvertonRadar>` in the Cockpit shows a documented empty/degraded state
("awaiting Tarsis signal source") rather than a blank panel or fake data. Nothing
in CI is red. When the contract lands weeks later, she returns to Journey 1 with
zero code change.

*Reveals capabilities:* graceful `DEFERRED_AWAITING_CREDENTIALS` degradation across
sub-clusters, Glory tools, and the OvertonRadar component; no fake-data fallback.

### Journey 3 — Étienne, founder: seeing the sector bend (OvertonRadar discovery)

**Situation.** Étienne pilots his brand from the Cockpit. He believes his sector is
starting to imitate him but has only anecdotes.

**Opening scene.** A new `<OvertonRadar>` panel appears on his Cockpit Overton
surface. Empty-stated at first, it populates as Tarsis signal accrues.

**Rising action.** Over weeks it shows: competitor vocabulary-overlap trend, dated
claim-imitation events, unpaid press mentions, a sectoral-embedding delta line.

**Climax.** The radar flags a dated event: a named competitor used a phrase from
his manifesto in a campaign. Concrete proof, not sentiment.

**Resolution.** Étienne internalizes that the sector is bending around him — the
exact transformation MISSION.md §5 dérive #5 says turns a founder into an
evangelist of their own brand. He also opens the attribution view and sees a named
campaign's evangelist lineage ("produced 7 Ambassador→Evangelist transitions").

*Reveals capabilities:* `<OvertonRadar>` Cockpit component (vocabulary overlap,
claim-imitation log, unpaid-press feed, embedding-delta chart); attribution lineage
view; Cockpit consumption of `culture.overtonShift` + `superfan.attribution`.

### Journey 4 — Amina runs a measurement Glory tool, manual-first fallback

**Situation.** Amina wants a negative-space audit of a campaign but the LLM-backed
`negative-space-auditor` Glory tool is rate-limited / returns a Zod-invalid output.

**Journey.** She invokes the Glory tool from the operator surface; the LLM path
fails after the `executeStructuredLLMCall` retries. Per manual-first parity
(ADR-0060), the tool offers an **equivalent manual UI form** — she enters the audit
findings by hand and the tool records the same structured output. The result is
indistinguishable downstream. Same pattern applies to `big-idea-coherence`,
`myth-arc-cohesion`, `crew-performance-evaluator`, `mcp-pii-classifier`, and to the
attribution model (manual coefficient-entry mode) and overtonShift (operator-tagged
delta mode).

*Reveals capabilities:* 5 measurement Glory tools each with a manual UI path;
manual coefficient mode for attribution; operator-tagged delta mode for overtonShift.

### Journey Requirements Summary

| Capability area | Revealed by | Plane |
|---|---|---|
| Credentials Vault: Tarsis API + CRM connector types, health/test surface | J1, J2 | OS (governance) |
| 6 pivot sub-clusters promoted STUB/PARTIAL → MVP, status in Console | J1, J2 | OS (Seshat/Anubis) |
| Attribution calibration-review panel + governed PRODUCTION promotion | J1 | Console portal |
| Graceful `DEFERRED_AWAITING_CREDENTIALS` degradation, no fake data | J2 | OS-wide |
| `<OvertonRadar>` Cockpit component | J3 | Cockpit portal |
| Attribution lineage view (campaign → evangelist transitions) | J3 | Cockpit portal |
| 5 measurement Glory tools, each LLM + manual UI path | J4 | livrable (Glory tools) |
| Manual coefficient / operator-tagged delta modes for the 2 models | J4 | OS (manual-first) |

## Domain-Specific Requirements

The OS domain (martech / brand-strategy) is not externally regulated, but it is a
**governance-heavy Industry OS** with a **`scientific` sub-component** (ML-calibrated
attribution + sectoral embeddings). The binding constraints come from the OS's own
governance corpus and from the statistical-validity demands of the ML pieces.

### Compliance & Regulatory (internal governance)

- **APOGEE 3 Laws.** No silent altitude regression — every promotion (sub-cluster
  STUB→MVP→PRODUCTION) is a governed Intent in the hash-chained log. Cascade
  sequencing respected. Thot fuel-gate applies to model-training / signal-poll cost.
- **NEFER 8-phase protocol + 3 absolute prohibitions.** No reinventing the wheel
  (0 new Prisma models — `grep CODE-MAP` negative confirmed at step-01); no bypass
  governance (all mutations via `mestor.emitIntent()`); no silent narrative drift
  (any LEXICON term touched propagates to the 7 sources).
- **APOGEE cap = 7 Neteru.** Tarsis-monitoring API and CRM provider are **external
  connectors** via the Credentials Vault — explicitly *not* Neteru. No 8th governor.
- **PII handling on ingest.** CRM data and inbound MCP context carry customer PII.
  The `mcp-pii-classifier` Glory tool is the compliance control: it classifies and
  flags PII on `culture.mcpIngest` before persistence. FrieslandCampina is an
  EU-parented group — CRM ingest must support field-level PII redaction.
- **Manual-first parity (ADR-0060).** Non-negotiable, enforced by HARD test — every
  LLM-assisted feature here has an operational manual UI path.

### Technical Constraints

- **Multi-tenant default-deny.** All Prisma access via `tenantScopedDb`; connector
  credentials are per-`Operator` rows in `ExternalConnector` (not env vars — that's
  the ADR-0021 boundary, distinct from ADR-0075 payment secrets).
- **Hash-chain immutability.** Calibration acceptance, promotion decisions, and
  signal-ingest events are append-only `IntentEmission` entries — replayable, not
  editable.
- **Layering cascade (ADR-0002).** New code respects `domain → lib → governance →
  services → trpc → components → app`; connectors live under `services/anubis/` and
  `services/seshat/`, not cross-imported.
- **NSP SSE for any progress streaming** (model calibration runs, signal polls) —
  reuse the canonical emitter pattern; `bestEffort()`, never throw on emit.
- **Ship-without-keys.** Connector façades return `DEFERRED_AWAITING_CREDENTIALS`;
  no feature may hard-fail or fabricate data when a connector is unconfigured.

### Scientific Sub-Component Requirements (ML validity)

- **Calibration methodology declared, not implicit.** `superfan.attribution` is a
  regression model — its evaluation metric (ROC AUC / RMSE) and acceptance
  thresholds are defined in ADR-0052-D and surfaced to the operator *before*
  PRODUCTION promotion. `culture.overtonShift` / `overtonReadiness` calibration per
  ADR-0052-E/F.
- **No-magic-fallback (ADR-0046 precedent).** When signal is insufficient, the
  model returns an explicit insufficient-data state — never a fabricated score.
  This is the placebo the whole PRD exists to remove; it must not be reintroduced.
- **Reproducibility.** Calibration runs on real campaign history are versioned
  (`promptHash` / model-version pattern); a promotion decision can be traced to the
  exact evaluation snapshot that justified it.
- **Accuracy metrics are operator-visible.** The calibration-review panel shows the
  metrics, not just a pass/fail — the operator owns the statistical judgment.

### Integration Requirements

- **Tarsis-monitoring API** (Seshat) — external signal source for sectoral
  vocabulary, claim-imitation, unpaid-press, embedding deltas. Wired via Credentials
  Vault; feeds `culture.tarsisBridge` → `overtonShift`/`overtonReadiness` and Oracle
  §33.
- **CRM provider** (Anubis) — external source for cohort retention / evangelist
  counts. Wired via Credentials Vault; feeds `superfan.stickiness` +
  `superfan.crmCapture`.
- **Inbound MCP** — `culture.mcpIngest` consumes external context via the existing
  MCP client; `mcp-pii-classifier` gates it.
- All three are additive to existing infrastructure — no new transport, no new
  Prisma models.

### Risk Mitigations

| Risk | Mitigation |
|---|---|
| Placebo→real transition erodes trust if scores jump unexplained | Operator calibration-review panel + traceable signal source before any PRODUCTION promotion |
| PII leakage via CRM / MCP ingest | `mcp-pii-classifier` as mandatory gate on `culture.mcpIngest`; field-level redaction on CRM ingest |
| Connector outage / vendor delay blocks the release | `DEFERRED_AWAITING_CREDENTIALS` façade pattern — code ships and degrades gracefully |
| Pressure to add an 8th Neter for "Tarsis" or "CRM" | Connectors are Credentials-Vault entries by ADR-0021 pattern; APOGEE cap test blocks regression |
| Model drift over time (calibration goes stale) | `staleAt` pattern + scheduled re-calibration is Growth-scope; MVP records calibration timestamp |
| Fake-data fallback creeps back in under delivery pressure | No-magic-fallback rule (ADR-0046) + anti-drift test on insufficient-data state |

## Innovation & Novel Patterns

Project-type `saas_b2b` innovation signals — *workflow automation* and *AI agents* —
both apply. The genuine novelty of Phase 23 is not the agents themselves (the Neteru
exist since earlier phases) but **what gets instrumented**.

### Detected Innovation Areas

1. **Overton-window shift as an engineered instrument.** `<OvertonRadar>` turns "the
   sector is starting to talk like your brand" from a strategist's anecdote into a
   measured, dated, observable quantity — competitor vocabulary overlap, claim-
   imitation events, unpaid-press feed, sectoral-embedding delta. No martech product
   instruments cultural-window displacement; they instrument reach and sentiment.
2. **Superfan accumulation as a calibrated attribution model.** Not a vanity counter
   — a regression attributing devotion-ladder transitions (Ambassador / Evangelist)
   to specific campaigns, with traceable lineage. The unit measured is *organic work
   produced for the brand*, not visitors.
3. **Manual-first parity as an architectural invariant for an AI-agent OS.** Every
   LLM-assisted feature ships a functionally equivalent manual UI path, HARD-test-
   enforced (ADR-0060). This is a novel governance stance: the AI agents accelerate,
   they never become load-bearing single points of failure.
4. **Connector-not-Neter bounded-agent pattern.** External capabilities (Tarsis API,
   CRM) are added through the Credentials Vault without expanding the agent roster —
   the APOGEE cap of 7 governors holds. Capability grows; the governed surface does
   not.

### Market Context & Competitive Landscape

Social-listening incumbents (Brandwatch, Sprinklr, Talkwalker) report sentiment,
share-of-voice, and reach. None model **cultural-window displacement** — whether a
sector is redefining itself around a brand — nor do they engineer **superfan
conversion as a tracked funnel** with attribution. Phase 23's differentiator is that
it measures the *two mechanics La Fusée's mission sentence names*, which competitors
treat as unmeasurable brand-strategy intuition. The risk-adjacent truth: if these
stay placebo (Jaccard heuristics), La Fusée is just another dashboard; instrumented,
it is the only OS that can claim to *industrialize* the mechanic.

### Validation Approach

- **Calibration on real campaign history.** Attribution and Overton models are
  evaluated against the account's actual history with declared metrics (ROC AUC /
  RMSE per ADR-0052-D/E/F); the operator reviews the numbers and signs off before
  PRODUCTION promotion.
- **Manual-first as validation-by-construction.** Because every model has a manual
  UI equivalent, the instrumented version can be A/B-sanity-checked against operator
  judgment before it is trusted.
- **Anti-drift CI.** `campaign-tracker-coherence.test.ts` + `neteru-coherence.test.ts`
  guard the structural claims (6 sub-clusters present, 7 Neteru unchanged).
- **The MISSION.md §9 ledger** is the external proof: 3 of its 6 checkboxes become
  checkable — concrete, not narrative.

### Risk Mitigation

| Innovation risk | Fallback / mitigation |
|---|---|
| A model cannot be statistically validated on a given account | Manual coefficient / operator-tagged delta mode is the working fallback — the feature still ships, operator-driven |
| Signal too sparse for a credible score | No-magic-fallback: explicit insufficient-data state, never a fabricated number |
| "Innovation theater" — radar looks impressive, means nothing | OvertonRadar is wired only to real Tarsis signal; degraded state is honest; §9 ledger checkboxes are the acceptance gate |
| Instrumentation pressure erodes the manual-first invariant | HARD anti-drift test blocks LLM-only orchestration paths |

## SaaS B2B — Specific Requirements

CSV-driven discovery for `saas_b2b`. Phase 23 is a brownfield change inside an
existing multi-tenant Industry OS, so most of these are *established constraints
Phase 23 must fit*, not new decisions. Sections `cli_interface` and `mobile_first`
are skipped per the project-type config (the OS is web App-Router only; Cockpit is
desktop-first).

### Project-Type Overview

A governed, multi-tenant Industry OS with four portals. Phase 23 touches two —
**Console** (operator configures connectors + reviews model calibration) and
**Cockpit** (founder consumes OvertonRadar + attribution lineage, read-only).

### Technical Architecture Considerations

#### Multi-tenancy (`tenant_model`)

- Tenancy root is the `Operator` model; all Prisma access via `tenantScopedDb`
  (default-deny, auto-injects `where: { operatorId }`).
- Phase 23 connector credentials are **per-`Operator`** rows in `ExternalConnector`
  (ADR-0021 Credentials Vault) — *not* env vars. Tarsis API key and CRM credentials
  are tenant-scoped: Matanga's keys never leak across operators.
- Pivot signal data (`campaign-tracker/` sub-cluster outputs) is tenant-scoped to
  the brand's `Strategy` / `Campaign`.

#### Permission model (`rbac_matrix`)

| Actor | Surface | Capability | Procedure type |
|---|---|---|---|
| UPgraders operator | Console | Register/edit Tarsis + CRM connectors; run calibration review; accept/reject thresholds; promote sub-cluster lifecycle | `governedProcedure` (mutations) + `operatorProcedure` (reads) |
| UPgraders operator | Console | Invoke 5 measurement Glory tools (LLM or manual path) | `governedProcedure` |
| Founder | Cockpit | View `<OvertonRadar>`, attribution lineage — **read-only** | `operatorProcedure` (tenant-scoped reads) |
| Founder | Cockpit | Cannot configure connectors or alter calibration | enforced by procedure type, not UI hiding |

- Lifecycle promotions (STUB→MVP→PRODUCTION) are governed Intents — append-only,
  hash-chained, replayable. No direct service-from-router mutation.

#### Subscription tiers (`subscription_tiers`)

- Cockpit consumption of `<OvertonRadar>` + attribution lineage is gated to paid
  tiers (`COCKPIT_MONTHLY` / `RETAINER_*`) via the existing `requiresPaidTier`
  mechanism on the consuming surface — the pivot instruments are a retained-client
  capability, not an intake freebie.
- The 5 measurement Glory tools: operator-internal by default; any exposed as a
  client-facing Glory tool declares `requiresPaidTier` per ADR-0048.
- No new billing entity — reuses the established tier gate.

#### Integrations (`integration_list`)

| Integration | Neter | Path | Feeds |
|---|---|---|---|
| Tarsis-monitoring API | Seshat | Credentials Vault connector façade | `culture.tarsisBridge` → `overtonShift` / `overtonReadiness`, Oracle §33 |
| CRM provider | Anubis | Credentials Vault connector façade | `superfan.stickiness` (cohort retention), `superfan.crmCapture` |
| Inbound MCP context | Anubis (MCP client) | existing `mcp-client.ts` | `culture.mcpIngest`, gated by `mcp-pii-classifier` |

All three: additive, façade returns `DEFERRED_AWAITING_CREDENTIALS` when unconfigured,
no new transport, no new Prisma model.

#### Compliance (`compliance_reqs`)

Detailed in **Domain-Specific Requirements** above — internal governance (APOGEE 3
Laws, NEFER protocol, APOGEE cap = 7), PII handling on CRM/MCP ingest via
`mcp-pii-classifier`, manual-first parity (ADR-0060), no-magic-fallback (ADR-0046).

### Implementation Considerations

- **0 new Prisma models** — additive fields only on `Campaign` / `CampaignAction`
  per ADR-0052 vague-2/3 migration plan; migration via `prisma migrate dev`.
- Extends the existing `campaign-tracker/` service and Glory tools registry; new
  sub-modules (`superfan-attribution.ts`, `tarsis-bridge.ts`, `overton-meter.ts`,
  `context-ingest.ts`, `stickiness.ts`) per the ADR-0052 vague-2 plan.
- New tRPC procedures extend the existing `campaign-tracker` router; reads via
  `operatorProcedure`, mutations via `governedProcedure`.
- `<OvertonRadar>` is the single net-new UI component — placed under the Cockpit
  component tree, CVA variants, design tokens only, COMPONENT-MAP updated.
- Layering cascade (ADR-0002) respected; `madge --circular` clean.

## Project Scoping & Phased Development

**Note on phasing.** Phasing is not invented here — it is intrinsic to the locked
target ("MVP→PRODUCTION") and to RESIDUAL-DEBT, which explicitly separates MVP-grade
sub-clusters from PRODUCTION promotion (the latter being a *direction business
decision* on calibration thresholds, per ADR-0052-B/C/D/E/F). The phase boundaries
below mirror the MVP / Growth / Vision split already recorded in **Product Scope**
and **Success Criteria**.

### MVP Strategy & Philosophy

**MVP Approach:** *Problem-solving MVP* — the problem is "the OS cannot measure the
two mechanics its mission names; the Cockpit shows placebo Jaccard scores." The MVP
is the minimum wiring that makes those scores **non-placebo and honest**, even
before external API keys exist. It is deliberately *not* a "PRODUCTION model" MVP —
statistical PRODUCTION promotion is gated on a business decision and belongs to
Phase 2.

**Resource Requirements:** Single NEFER operator executing the 8-phase protocol on a
`phase/23` branch; effort **M-L** (closure-roadmap target #1). No new infra, no new
team — extends `campaign-tracker/` + Glory tools registry. External dependency:
Tarsis vendor contract + CRM account (not on the critical path — façade pattern
decouples).

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:** J1 (operator wires connectors), J2 (ship-without-
keys graceful degradation), J3 (founder OvertonRadar discovery — real-when-available),
J4 (Glory tools with manual-first fallback). All four MVP journeys.

**Must-Have Capabilities:**
- 2 connector façades through Credentials Vault (Tarsis API, CRM), returning
  `DEFERRED_AWAITING_CREDENTIALS` when unconfigured.
- 6 pivot sub-clusters promoted STUB/PARTIAL → **MVP** (`superfan.attribution`,
  `superfan.stickiness`, `culture.overtonShift`, `culture.overtonReadiness`,
  `culture.tarsisBridge`, `culture.mcpIngest`).
- 5 measurement Glory tools created, manifest-declared, `applicableNatures`-
  annotated from creation, each with an operational manual UI path.
- Attribution calibration-review panel in Console (computes ROC AUC / RMSE on real
  history, surfaces metrics to operator).
- `<OvertonRadar>` shipped to Cockpit with honest empty/degraded state.
- Manual coefficient mode (attribution) + operator-tagged delta mode (overtonShift).
- `mcp-pii-classifier` gating `culture.mcpIngest`.
- Anti-drift CI green; `neteru-coherence` + `campaign-tracker-coherence` passing;
  APOGEE cap 7/7; 0 new Prisma models.

### Post-MVP Features

**Phase 2 (Growth — PRODUCTION promotion):**
- PRODUCTION promotion of `superfan.attribution`, `culture.overtonShift`,
  `culture.overtonReadiness` — **gated on direction sign-off** of calibration
  thresholds (ADR-0052-D/E/F). Code-ready in MVP; promotion is a governed Intent
  fired after the business decision.
- Live ad-network / CRM signal depth beyond MVP cohort retention.
- Scheduled re-calibration (`staleAt` pattern) to counter model drift.

**Phase 3 (Vision — Expansion):**
- MISSION.md §9 ledger driven to 6/6; mission-drift CI detector on 100% of units.
- Predictive `<OvertonRadar>` ("at current rate, sector tips in ~N weeks").
- Cross-client Overton benchmarking via Jehuty — sector-wide movement.

### Risk Mitigation Strategy

**Technical Risks:** The riskiest aspect is model calibration credibility on sparse
real history. Mitigation: MVP ships MVP-grade documented algorithms + manual modes;
PRODUCTION promotion is explicitly deferred behind operator+direction review, so a
weak model never silently reaches the founder. No-magic-fallback (ADR-0046) prevents
fabricated scores.

**Market Risks:** Biggest market risk is "instrumentation theater" — the radar looks
impressive but means nothing. Mitigation: OvertonRadar wired only to real Tarsis
signal; the §9 ledger checkboxes (3 of 6) are the concrete acceptance gate, not
narrative.

**Resource Risks:** External vendor delay (Tarsis contract, CRM account) is the main
contingency. Mitigation: the `DEFERRED_AWAITING_CREDENTIALS` façade pattern fully
decouples the code release from key availability — Phase 1 ships and CI stays green
with zero keys; the operator returns to Journey 1 with no code change once keys land.

## Functional Requirements

> **Capability contract.** This list is binding. Any capability not listed here will
> not exist in Phase 23 unless explicitly added. UX, architecture, and epic breakdown
> implement only what is enumerated below. FRs state WHAT capability exists, not HOW.

### A. External Signal Connectors

- **FR1:** An operator can register a Tarsis-monitoring API connector through the
  Credentials Vault.
- **FR2:** An operator can register a CRM provider connector through the Credentials
  Vault.
- **FR3:** An operator can see each connector's configuration state (configured vs
  `DEFERRED_AWAITING_CREDENTIALS`) and a reachability test-call result.
- **FR4:** The system continues operating without error when a connector is
  unconfigured, exposing a `DEFERRED_AWAITING_CREDENTIALS` state instead of failing
  or fabricating data.
- **FR5:** Connector credentials are scoped to the owning operator and are not
  shared or visible across tenants.

### B. Superfan Measurement

- **FR6:** The system can attribute devotion-ladder transitions (to Ambassador /
  Evangelist) to specific campaigns.
- **FR7:** The system can compute cohort retention (J+30 / J+90 / J+180) for a
  brand's audience from CRM signal.
- **FR8:** The system can count evangelists for a campaign from observed devotion
  transitions.
- **FR9:** An operator can view a campaign's superfan-attribution result together
  with its evangelist lineage.
- **FR10:** A founder can view the evangelist lineage of a campaign in the Cockpit
  (read-only).
- **FR11:** The system exposes an explicit insufficient-data state when superfan
  signal is too sparse for a credible result — never a fabricated score.

### C. Overton Measurement

- **FR12:** The system can collect sectoral signal (competitor vocabulary overlap,
  claim-imitation events, unpaid-press mentions) from the Tarsis connector.
- **FR13:** The system can compute an Overton-shift value for a brand from
  sectoral-embedding deltas.
- **FR14:** The system can compute an Overton-readiness value for a brand.
- **FR15:** The system can ingest external context via inbound MCP into a brand's
  campaign context.
- **FR16:** The system classifies and flags PII on inbound MCP context before
  persistence.
- **FR17:** Overton measurement output feeds the Oracle "État Overton sectoriel"
  section (#33).
- **FR18:** The system exposes an explicit degraded/empty state for Overton
  measurement when the Tarsis connector is unconfigured or signal is absent.

### D. Model Calibration & Lifecycle Promotion

- **FR19:** An operator can run a calibration review of the superfan-attribution
  model against a brand's real campaign history.
- **FR20:** An operator can see a model's evaluation metrics (ROC AUC / RMSE)
  against its declared acceptance thresholds.
- **FR21:** An operator can accept or reject a model's calibration outcome.
- **FR22:** An operator can promote a pivot sub-cluster's lifecycle
  (STUB → MVP → PRODUCTION) through a governed Intent.
- **FR23:** The system records every calibration acceptance and lifecycle promotion
  as an append-only, hash-chained, replayable governance event.
- **FR24:** The system can trace a PRODUCTION promotion decision back to the exact
  calibration snapshot that justified it.
- **FR25:** An operator can enter attribution model coefficients manually as an
  equivalent to the automated path.
- **FR26:** An operator can enter Overton-shift deltas manually (operator-tagged) as
  an equivalent to the embeddings path.

### E. Measurement Glory Tools

- **FR27:** An operator can invoke each of the five measurement Glory tools —
  `big-idea-coherence`, `myth-arc-cohesion`, `crew-performance-evaluator`,
  `negative-space-auditor`, `mcp-pii-classifier`.
- **FR28:** Each measurement Glory tool offers an equivalent manual UI input path
  that produces the same structured output when the LLM path is unavailable or
  fails validation.
- **FR29:** Each measurement Glory tool declares the brand archetypes
  (`applicableNatures`) to which it applies.

### F. Cockpit Founder Surfaces

- **FR30:** A founder can view the `<OvertonRadar>` in the Cockpit showing
  competitor vocabulary overlap, claim-imitation log, unpaid-press feed, and
  sectoral-embedding delta.
- **FR31:** A founder sees an honest empty/degraded state in the OvertonRadar when
  no real signal is available.
- **FR32:** Founder access to the OvertonRadar and attribution lineage is read-only
  and gated to paid tiers — founders cannot configure connectors or alter
  calibration.

### G. Governance & Coherence

- **FR33:** Each new Intent kind, Glory tool, and capability is declared in its
  owning service manifest with an SLO.
- **FR34:** The system preserves the APOGEE cap of 7 Neteru — the Tarsis and CRM
  connectors are Credentials-Vault entries, not governors.
- **FR35:** Anti-drift tests assert the presence of the 6 promoted sub-clusters, the
  5 measurement Glory tools, and the unchanged Neter roster.

## Non-Functional Requirements

Only the categories that materially apply to Phase 23 are documented.

### Performance

- **NFR1:** New async Intent kinds declare SLOs in `slos.ts`. Signal-collection and
  sub-cluster-compute Intents target p95 ≤ 15s, cost ≤ $0.10. The attribution
  calibration run (over real campaign history) targets p95 ≤ 60s, cost ≤ $0.50.
- **NFR2:** `<OvertonRadar>` reaches first meaningful render within 2s on cached
  signal, behind a Suspense boundary — it never blocks the Cockpit page shell.
- **NFR3:** Calibration runs and signal polls stream progress over NSP SSE
  (15s heartbeat); the operator never faces a frozen screen with no feedback.

### Security

- **NFR4:** Connector credentials are stored only as per-`Operator`
  `ExternalConnector` rows (Credentials Vault, ADR-0021) — never in env vars, never
  logged, never returned in API responses.
- **NFR5:** All Prisma access for Phase 23 entities goes through `tenantScopedDb`
  (default-deny); one operator's signal data is unreachable from another tenant.
- **NFR6:** PII on inbound MCP context is classified and flagged by
  `mcp-pii-classifier` before persistence; CRM ingest supports field-level PII
  redaction.
- **NFR7:** Calibration acceptances and lifecycle promotions are append-only,
  hash-chained `IntentEmission` entries — tamper-evident and replayable.

### Integration & Reliability

- **NFR8:** The Tarsis and CRM connector façades return
  `DEFERRED_AWAITING_CREDENTIALS` when unconfigured and a typed error state on
  transient failure — never an uncaught throw, never a crash of the consuming
  sub-cluster.
- **NFR9:** A connector outage degrades its dependent sub-cluster to an explicit
  insufficient-data / degraded state within one poll cycle, and never produces a
  fabricated score (no-magic-fallback, ADR-0046).
- **NFR10:** NSP emitters use `bestEffort()` — a telemetry emit failure never fails
  the underlying Intent.
- **NFR11:** The connector test-call result is operator-observable (FR3), so
  integration health is diagnosable without reading server logs.

### Scalability

- **NFR12:** Signal collection and cohort computation are tenant-scoped per
  `Strategy` / `Campaign` with no cross-tenant fan-out and no shared mutable global
  state — Phase 23 inherits the OS's existing single-Postgres scaling envelope.
  Multi-pod scale-out is tracked separately (closure-roadmap target #2) and is out
  of scope here.

### Accessibility

- **NFR13:** `<OvertonRadar>` meets the project design-system a11y bar
  (DESIGN-A11Y): keyboard-navigable, charts carry a text-equivalent data view,
  colour is never the sole signal carrier; covered by a Playwright a11y test.
- **NFR14:** `<OvertonRadar>` consumes design tokens only with CVA variants — no raw
  Tailwind colour classes — consistent with the three Design-System prohibitions.
