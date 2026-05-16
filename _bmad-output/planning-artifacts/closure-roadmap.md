---
title: La Fusée — Closure Roadmap (functional completion ledger)
author: Alexandre
created: 2026-05-13
maintained_by: NEFER
purpose: >
  Durable registry of every open functional angle on ADVE-project, with explicit
  closure criteria and a finite Definition of Done. This is the source of truth
  for "are we at 100%". Every PRD / chantier updates the status of its target here.
scoring_baseline:
  date: 2026-04-29
  weighted_score: 95
  formula: "Coverage×0.15 + Framework×0.30 + Governance×0.30 + Mission×0.25"
  components: { coverage: 100, framework: 100, governance: 85, mission: 98 }
  source: docs/governance/RESIDUAL-DEBT.md
status_legend:
  NOT_STARTED: no PRD, no code
  PRD_DRAFTED: PRD exists in planning-artifacts, not yet in dev
  IN_DEV: implementation underway
  SHIPPED: merged + anti-drift CI green + RESIDUAL-DEBT updated
  WONT_DO: formally declined with written justification (counts toward 100%)
  DEFERRED: calendar-locked or trigger-locked (does NOT block 100% until trigger fires)
---

# La Fusée — Closure Roadmap

> **What 100% means** — see [§ Definition of Done](#definition-of-done) at the bottom.
> 100% is a finite, checkable state, not a feeling. The `WONT_DO` column is what
> makes it reachable: an angle formally declined (with justification) is *closed*.

> ⚠️ **Phase-label collision flag (2026-05-15).** This ledger originally used "Phase 22"
> as the umbrella label for the post-Phase-21 closure chantier (targets #1, #2, #4, #5,
> #7, #8, #9, #11 all carry it). On 2026-05-15 upstream `origin/main` redefined
> `phase/22` as **"Argos by LaFusée"** (Seshat reference harvester + propriété média
> indépendante — see [REFONTE-PLAN.md Phase 22](../../docs/governance/REFONTE-PLAN.md)).
>
> Surgical correction applied here: target #1 (pivot mechanics) and target #5 (Overton
> Radar, folded into #1) relabeled **Phase 22 → Phase 23**. The other six "Phase 22"
> targets (#2 Notification stack, #4 Brand Tree maturity, #7 Manipulation drift,
> #8 Crew Programs Académie, #9 Anubis ad networks, #11 STEP-MAP) **are NOT yet
> renumbered** — Alexandre to decide whether they each become Phase 24, 25, … or fold
> into Argos's Phase 22 timeline. Until that decision, treat their "Phase 22" labels
> as historical/orphan and refer to the title field instead.

Audit basis: `RESIDUAL-DEBT.md` (690 lines), CLAUDE.md "Phase status", ADRs 0060–0076,
`_bmad-output/project-context.md` (v6.22.8). Compiled by NEFER 2026-05-13.

---

## The 11 closure targets

| # | Title | Cluster(s) | Neter(s) | Portal(s) | Effort | Mission link | Status | Closure criterion |
|---|---|---|---|---|---|---|---|---|
| **1** ★ | **Phase 23** — Câblage pivots mission (superfans × Overton) MVP→PRODUCTION *(was Phase 22 pre-2026-05-15 rename)* | A + F + G#5 | Seshat · Anubis · Artemis · Ptah | Console · Cockpit | M-L | **Direct** | **PRD_DRAFTED + ARCHITECTURE_DRAFTED** ✓ | 6 sub-clusters at MVP/PRODUCTION + Glory tools wired (5 exist) + Tarsis & CRM connectors via Credentials Vault + OvertonRadar consumed by Cockpit route + child ADRs 0077–0081 validated — _PRD + UX + architecture complete (35 FRs / 14 NFRs / 4 journeys / 9 D-decisions / 7 P22-patterns), 2026-05-15_ |
| 2 | Phase 22 — Notification stack production-ready + multi-pod scale-out | B | Anubis · Mestor | cross-portal | M | Chain (ship-blocker) | NOT_STARTED | `web-push`/`firebase-admin`/`mjml` deps installed + NSP Redis pubsub adapter + digest cron wired + MCP outbound rate limiting + typecheck CI green + Lighthouse green |
| 3 | Phase 21 F-A residual — 80 tools `outputSchema` Zod annotation (5 batchs) | C | Artemis · Ptah | none | M (linéaire) | Indirect (LLM quality) | NOT_STARTED | All 56 Glory tools + 24 frameworks annotated; tests G2/G3 promoted to mode HARD (baseline 0); `enrichOracle` legacy deprecation scheduled |
| 4 | Phase 22 — Brand Tree maturity (N5-bis BIBLE_VAR + N6-bis Glory tool natures) | D | Mestor (governance) | Console (`/console/governance/phase-18-residuals`) | M | Chain (tree-aware Glory tools) | NOT_STARTED | ~300 variable-bible entries reclassified × 9 BrandNature × 3 inheritanceMode; 56 Glory tools annotated `applicableNatures`; entries marked RESOLVED in `phase18ResidualEntry` |
| 5 | **Phase 23** — Overton Radar Cockpit (MISSION.md §5 dérive #5, isolated) *(was Phase 22 pre-2026-05-15 rename)* | G#5 | Seshat (Tarsis) | Cockpit | S-M | **Direct** | NOT_STARTED | `<OvertonRadar>` component shipped — but depends on #1 for non-placebo data. **Folded into #1**; standalone only if #1 is subdivided |
| 6 | Phase 17 closure — promotion DRAFT→STABLE (21 sequences + 24 wrappers) + quality gate soft→hard | E | Artemis | none | S | Indirect (Artemis stability) | **DEFERRED** | 21 sequences + 24 `WRAP-FW-*` wrappers promoted STABLE; quality gate switched HARD. **Calendar-locked**: gate soft→hard target 2026-05-17 (D+4); sequences/wrappers target 2026-06-04 (D+22). Auto-eligible via ADR-0066 cron |
| 7 | Phase 22 — Manipulation drift detector (MISSION.md §6) + `Strategy.manipulationMix` back-fill | H + G#6 | Seshat · Mestor (gate) | Console | S-M | Direct (anti-drift) | NOT_STARTED | Pre-Phase-9 strategies back-filled (no more `null` manipulationMix); `audit-manipulation-drift.ts` cron flags >20% divergence over >10 actions |
| 8 | Phase 22 — Crew Programs Académie + matching production (Imhotep Phase 14 residual) | extension | Imhotep | Crew Quarters | L | Direct (étape 2-3) | NOT_STARTED | Académie formation flow live + talent-matching engine in PRODUCTION (not heuristic placeholder) |
| 9 | Phase 22 — Anubis ad networks live (Meta/Google/X/TikTok via Credentials Vault) | extension | Anubis | Console (vault) | M-L | Chain (étape 4 gravité) | NOT_STARTED | 4 ad network connectors leave `DEFERRED_AWAITING_CREDENTIALS` mock state; real broadcast verified per network |
| 10 | Phase 18-bis — M&A `NodeOwnershipTransfer` + lineage hash-chain + 8 non-PRODUCT archetypes | D (sub-set) | Mestor · Imhotep | Console | XL (3 mois) | Indirect | **DEFERRED** | Trigger-locked: first M&A deal OR first non-FMCG client in 2026 commercial pipeline. Do NOT PRD before trigger fires (ADR-0059 §6) |
| 11 | Phase 22 — STEP-MAP.md transverse (MISSION #2) + 5 palier-transition Intent kinds (MISSION #3) | G#2 + G#3 | Mestor (governance) | none runtime | S | Doctrine (operator tooling) | NOT_STARTED | `STEP-MAP.md` cross-cuts components by mission sequence step; 5 `PROMOTE_<TIER>_TO_<TIER>` Intent kinds with pre-conditions + Glory sequences |

★ = recommended next target. Currently the active PRD ([prd.md](prd.md)).

---

## Explicitly out of scope — NOT counted as open angles (won't-do)

These are **already-decided** `WONT_DO` and do **not** block 100%. Listed so no future
session re-opens them by accident.

| Item | Why declined | Source |
|---|---|---|
| Router migration: 253 LEGACY mutations → individual `governedProcedure` | Strangler middleware already covers 100% of audit trail; per-mutation Intent kind = "effort linéaire sans gain doctrinal additionnel" | RESIDUAL-DEBT.md l.568, l.646 |
| Full `$extends` Prisma 5 migration | Current behavior correct | RESIDUAL-DEBT.md Tier 4 |
| V8 isolated sandbox for plugins | Overkill V0; sandbox proxy suffices | ADR-0008 |
| Multi-region deployment | Single-Postgres scale not urgent | RESIDUAL-DEBT.md Tier 4 |
| Web Components Neteru UI Kit | React-only suffices | RESIDUAL-DEBT.md Tier 4 |
| GraphQL endpoint | tRPC suffices | RESIDUAL-DEBT.md Tier 4 |
| Yjs full runtime client integration | `collab-doc` accepts Yjs binary; client lib choice post-V1 | RESIDUAL-DEBT.md Tier 4 |
| `xlsx@*` 1 high vuln | No upstream fix — **ops decision** (pin `@e965/xlsx` / sandbox / drop), not a NEFER chantier | RESIDUAL-DEBT.md l.444 |

---

## Definition of Done — when is the project at 100%?

The project is **functionally 100% complete** when **all three** conditions hold:

### Condition 1 — All 11 targets resolved
Every target in the table above is `SHIPPED` **or** `WONT_DO` (with written justification)
**or** `DEFERRED` *with an un-fired trigger* (targets #6 and #10 only — once their trigger
fires they must move to `SHIPPED`/`IN_DEV`, they cannot stay DEFERRED indefinitely).

### Condition 2 — MISSION.md §9 ledger at 6/6
The 6-checkbox "Vérification finale" in [docs/governance/MISSION.md](../../docs/governance/MISSION.md) §9
is currently **0/6**. All six must be checked:
- [ ] Every tRPC mutation not contributing to superfans/Overton is rejected in review
- [ ] Every Cockpit founder sees live: score, palier, devotion-ladder chain, sectoral Overton axis
- [ ] Every Crew Quarters creator sees their missions' superfan-accumulation lineage
- [ ] Every UPgraders operator can display "next 5 actions maximizing superfan/Overton ratio" for any brand
- [ ] Every brand's Oracle has a live "État Overton sectoriel" section maintained by Tarsis
- [ ] The mission-drift CI detector passes on 100% of units

### Condition 3 — Weighted score at 100/100
`Coverage×0.15 + Framework×0.30 + Governance×0.30 + Mission×0.25 = 100`.
Baseline 2026-04-29 = 95 (Coverage 100 / Framework 100 / Governance 85 / Mission 98).
The 5-point gap is **Governance 85→100** (router migration is `WONT_DO`, so the gap closes
by re-scoring the rubric to exclude declined work) and **Mission 98→100** (closed by
target #1 + the MISSION.md §9 ledger).

> **Note on re-scoring**: Governance can reach 100 without the won't-do router migration —
> the rubric must be re-baselined so 100% = "all *in-scope* governance shipped", not
> "every theoretical mutation individually Intent-kinded". Re-baseline is itself a small
> task; track it under target #11 (governance tooling).

---

## How this ledger stays alive

- **Every `bmad-*` workflow** scans `planning_artifacts/**` at init → loads this file as context automatically.
- **Every PRD** updates its target's `Status` column when it reaches `step-12-complete` (NOT_STARTED → PRD_DRAFTED).
- **Every shipped chantier** updates Status → SHIPPED + adds the closing commit/PR ref.
- **NEFER memory** `project_closure_roadmap.md` points here — every Claude Code session on this repo is aware of it, not just BMad ones.
- When a `DEFERRED` trigger fires (M&A deal for #10, calendar date for #6), the target moves to `NOT_STARTED`/`IN_DEV` and gets a PRD.

_2026-05-15 (later, post-rebase) by NEFER — **Phase relabel correction.** Upstream redefined `phase/22` as Argos (commits `82acd53` / `4f001a4` / `28dbb95`, landed during the architecture session). Target #1 + #5 relabeled **Phase 22 → Phase 23** in this ledger and across all planning artifacts (architecture.md, prd.md, ux-design-specification.md, implementation-readiness-report). The other six "Phase 22" targets (#2/#4/#7/#8/#9/#11) await Alexandre's renumbering decision. See header collision flag._
_Last updated: 2026-05-15 by NEFER — target #1 architecture completed via `/bmad-create-architecture` (steps 01→08): [architecture.md](architecture.md). Status stays PRD_DRAFTED (architecture is a downstream planning artifact; no code shipped). Headline finding: PRD `chosen_target.code_map_grep` was stale — `<OvertonRadar>`, `sector-intelligence/` service, the 5 measurement Glory tools (`phase19-tools.ts`), and all 6 pivot sub-clusters already exist. Architecture absorbed the correction in D1: Phase 23's real surface is wiring + 2 connector façades + 1 lifecycle Intent + ML calibration + 1 Cockpit route, not "create everything." UX spec's "1 net-new component" claim and PRD's `scope_summary` need a follow-up correction note (tracked as the implementation epic's first governance task)._
_2026-05-14: target #1 UX design specification completed via `/bmad-create-ux-design` (steps 01→14): [ux-design-specification.md](ux-design-specification.md) + [ux-design-directions.html](ux-design-directions.html). Closes the "UX NOT_FOUND" finding of the implementation-readiness report. Status stays PRD_DRAFTED (UX spec is a downstream planning artifact; no code shipped). Net-new UX scope: 1 component `<OvertonRadar>` + 1 route `/cockpit/intelligence/overton` + 1 `cockpitNavGroups` entry._
_2026-05-14: target #1 PRD completed via `/bmad-create-prd` (steps 01→12), status NOT_STARTED → PRD_DRAFTED._
_2026-05-13: initial compilation, target #1 locked as active PRD._
