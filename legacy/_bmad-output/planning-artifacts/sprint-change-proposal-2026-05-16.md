---
title: Sprint Change Proposal — STATE_FINAL_BLUEPRINT Realignment
date: 2026-05-16
author: NEFER (on behalf of Alexandre)
workflow: bmad-correct-course
phase_label: phase/23 (Epic 1 scope expansion) + governance/cross-cutting (ADRs + closure-roadmap)
trigger_artifact: docs/governance/STATE_FINAL_BLUEPRINT.md (commit 7a00481, 2026-05-16)
status: AWAITING_APPROVAL
mode: batch
nefer_preflight:
  C1_read_project_memory: done — CLAUDE.md "Phase status" + STATE_FINAL_BLUEPRINT (full 22 sections)
  C2_anti_doublon_grep: done — ADR numbering verified (0084-0087 free), Epic 1 stories enumerated, BRIEF_VS_ADVE_COHERENCE absent in `services/mestor/gates/`
  C3_lexicon_reformulation: done — canonical terms: Industry OS, UPgraders > La Fusée > Argos, ADVE noyau, RTIS dérivé, Yggdrasil ungoverned substrate, NEFER opérateur (pas Neter), 8 couches OS, 8 dimensions canoniques
  C4_apogee_three_laws: done — (1) ADR-0085 codifies STOP at Jehuty = no silent regression on ADVE pillars; (2) cascade canon refresh preserves stage sequencing; (3) Thot formula engine (ADR-0087) is fuel-conservation at runtime
  C5_phase18_residual_check: n/a — no Brand Tree / archetype / Strategy resolution change
  C6_variable_bible_crosscheck: n/a — no editable pillar field added; BRIEF_VS_ADVE_COHERENCE gate validates incoming briefs against existing ADVE pillars (read-only)
artifacts_touched_summary:
  new_adrs: [0084, 0085, 0086, 0087]
  amended_adrs: [0082]
  planning_artifacts: [prd.md, ux-design-specification.md, architecture.md, epics.md, closure-roadmap.md]
  governance_docs: [CLAUDE.md "Phase status" section]
  no_code_touched: true
---

# Sprint Change Proposal — STATE_FINAL_BLUEPRINT Realignment 2026-05-16

> **One-line summary**: Realign Phase 23 planning artifacts + governance doctrine with the canon absolute shipped 2026-05-16 (STATE_FINAL_BLUEPRINT.md). 4 new ADRs, 1 amended ADR, 6 new closure-roadmap targets, 1 new critical Epic 1 story. **Zero code touched** — all changes are doctrine / governance / planning.

---

## Section 1 — Issue Summary

### Triggering artifact

[`docs/governance/STATE_FINAL_BLUEPRINT.md`](../../docs/governance/STATE_FINAL_BLUEPRINT.md) shipped 2026-05-16 (commit `7a00481`) as the **canon absolute** of La Fusée d'UPgraders Industry OS. Produced after exhaustive repo audit + 9 doctrinal iterations with Alexandre. 22 sections + 30 catalogued drifts + Phase 24-30 prioritized roadmap. Integrated into `_bmad/custom/_nefer-facts.md §11` — every BMAD persona must reference it as primary source of truth.

### Categorization

This is **NOT** a technical limitation, a failed approach, or stakeholder feedback. It is a **doctrinal canonization event** — the founder formalized the OS's source-of-truth after a deep audit, and several pre-existing canonical assumptions were corrected. Plan-of-record artifacts (Phase 23 PRD/UX/architecture/epics; ADR-0082 Yggdrasil; closure-roadmap) must now be reconciled with the new canon.

### Core problem precisely

Seven doctrinal facts now hold canon status that previous artifacts either contradict, fail to encode, or under-specify:

| # | Canon fact (blueprint §) | Where it conflicts |
|---|---|---|
| **1** | Yggdrasil = **ungoverned substrate** (§5.2) — gates belong to Mestor, but Yggdrasil itself is not governed. | ADR-0082 currently states "**gouverné par Mestor**" (§"Gouverneur: MESTOR" subsection). Direct contradiction. |
| **2** | OS architecture = **8 canonical layers** (Kernel/Drivers/Protocoles/Substrats/Services/APIs/Apps/Funnel) (§2). | No ADR formalizes this. Drift D-4.2 in blueprint §21.3. |
| **3** | Refresh cascade = **STOP at Jehuty**, manual decision mandatory before any ADVE write (§11). | Doctrine = code confirmed (no auto-trigger found), but never documented as ADR. Drift D-5.2. |
| **4** | **Multi-dimensional score system** is the maturity ZOMBIE→ICONE pivot piece (§12). | No `scoring-engine/` service. No `BrandMaturityScore` model. No `RECOMPUTE_BRAND_SCORE` Intent. Drift D-5.8. |
| **5** | **Thot formula engine + Seshat zone-indices** = canonical economic architecture; no static FCFA grid (§14). | 6 of 16 calculators absent; 0/7 zone-indices; FCFA prices currently hardcoded in PRD examples. Drift D-5.4. |
| **6** | **`BRIEF_VS_ADVE_COHERENCE` gate** is CRITICAL — currently absent (D-3.1, blueprint §21.2). Briefs enter the OS without coherence check against ADVE pillars. | Phase 23 Epic 1 has 9 governance-foundation stories but none addresses this critical gate. |
| **7** | Six new structural work-streams surface from blueprint §22 (BRIEF gate / scoring-engine / Hub-Escrow / Communities+Personal Cockpit / economic runtime / financial-brain→thot rename + MANIPULATION_COHERENCE). | Closure-roadmap has 13 targets. None of these six are present in the main table. The 6 are drafted in a "proposed targets" footer but un-validated. |

### Evidence

- ADR-0082 line 44: *"Mestor gouverne Yggdrasil parce qu'il gouverne déjà les trois primitives sur lesquelles Yggdrasil repose"* — versus blueprint §5.2: *"Aucune. Yggdrasil n'est pas gouverné par un Neter."* + blueprint §21.3 D-4.1: *"ADR-0082 Yggdrasil 'gouverné par Mestor' doctrinement incorrect — à amender."*
- Phase 23 Epic 1 stories 1.1–1.9 (verified in [`epics.md:438-583`](epics.md)) — no `BRIEF_VS_ADVE_COHERENCE` story exists.
- Phase 23 PRD `chosen_target.scope_summary` does not reference STATE_FINAL_BLUEPRINT despite being the now-canonical source-of-truth.
- Closure-roadmap footer (lines 235-253) drafts the 6 new targets as "**à valider par Alexandre**" — unconfirmed.
- Files `docs/governance/adr/0053-0057.md` exist as **phantom child stubs** of ADR-0052 (verified via Glob). They do NOT conflict with this proposal; they're already superseded by ADR-0077+ per ADR-0077 §"superseded references".

---

## Section 2 — Impact Analysis

### Epic Impact Assessment (Phase 23, in-flight)

| Epic | Title | Current state | Impact | Action |
|---|---|---|---|---|
| **Epic 1** | Governance Foundations | 7/9 stories shipped (per CLAUDE.md Phase 23 status) | **+1 story** — insert `BRIEF_VS_ADVE_COHERENCE` gate as **Story 1.8** (renumber existing 1.8→1.9, 1.9→1.10). Reason: it is a *governance-foundation* gate, must precede measurement work. | **Renumber + insert** |
| Epic 2 | External Signal Connectors | NOT_STARTED | No impact — Tarsis/CRM connectors land independent of doctrine canonization. | Unchanged |
| Epic 3 | Overton Wiring (sector-intelligence delegation) | NOT_STARTED | No impact at story level. Blueprint §12 score system informs *Phase 24* (target #15), not Phase 23 stories. | Unchanged |
| Epic 4 | Superfan Wiring | NOT_STARTED | No impact. | Unchanged |
| Epic 5 | Glory Tools Hybrid (5 measurement tools) | NOT_STARTED | No impact. | Unchanged |
| Epic 6 | Calibration + Lifecycle Promotion | NOT_STARTED | No impact. | Unchanged |
| Epic 7 | Cockpit `/cockpit/intelligence/overton` + closure | NOT_STARTED | Frontmatter doc-sync only (point to ADR-0084/0085 + blueprint). | Frontmatter touch |

**Epic 1 = the only epic mutated.** All other epics are reference-only adjustments (frontmatter point to blueprint + new ADRs).

### Future Phases / Closure-Roadmap Impact

Six new closure-roadmap targets formalized (move from "proposed" footer to main table) — total goes **13 → 19**:

| # | Title | Phase candidate | Cluster | Status | Closure criterion (canonical) |
|---|---|---|---|---|---|
| **14** | `BRIEF_VS_ADVE_COHERENCE` gate + 3 ingestion gates (D-3.1/3.2/3.3) | **Phase 23** Epic 1 (gate scaffold) → **Phase 24** (full ingestion enforcement) | Governance | **NEW** | Gate registered in `services/mestor/gates/`, Phase 23 scaffold = type + handler stub (Story 1.8) ; Phase 24 = enforcement on all brief ingestion flows + 2 sibling gates `PRODUCTION_OUTPUT_VS_BRIEF` + `BROADCAST_VS_AUDIENCE_FIT` |
| **15** | Système de score unifié (`scoring-engine/` + `BrandMaturityScore` + `RECOMPUTE_BRAND_SCORE` Intent) | **Phase 24** | Score system | **NEW** | 8 canonical dimensions aggregated, table migration shipped, Intent kind registered, badge rendered on Cockpit insights |
| **16** | Hub-Escrow chantier complet (Task/Bid/Award/Dispute + 10 Intent kinds + UI cross-portal) | **Phase 24** | Economic infra | **NEW** | 5 new Prisma models (Task/TaskBid/TaskAward/EscrowOperation/Dispute) + 10 Intent kinds + 7 routes Cockpit/Creator/Console wired |
| **17** | Communities Cockpit + Personal Brand Cockpit UI | **Phase 25** | Cockpit surfaces | **NEW** | 6 Communities routes (`/cockpit/community/*`) consuming existing `CommunitySnapshot`/`SuperfanProfile`/`AmbassadorProgram`/`DevotionSnapshot` + 6 Personal Brand routes (`/cockpit/personal/*`) with new `Drop`/`BrandDeal`/`FanEconomy` models |
| **18** | Architecture économique runtime (Seshat zone-indices module + 6 missing Thot calculators + `ai-cost-tracker`) | **Phase 26** | Economic engine | **NEW** | `seshat/zone-indices/` directory shipped with 7 index families (cost-of-living, forex, inflation, TJM, marketing budgets, mobile money fees, taxes) + Thot calculators (`computeEscrowAmount`, `computeRetainerFitness`, `computeLlmAllowance`, `computeLlmOverage`, `computeForexExposure`, `computePalierTransitionCost`) + `ai-cost-tracker/` service with overage notification flow (80%/100%/120%) |
| **19** | `financial-brain/` → `thot/` rename + `MANIPULATION_COHERENCE` consumption | **Phase 25** | Naming + gate activation | **NEW** | 50-80 file rename + import updates + ADR for naming drift correction (D-5.1) + 56 Glory tools `promptTemplate` consume `manipulationMode` (D-4.5 critical fix — currently 0/56) |

### Artifact Conflict Analysis

| Artifact | Conflict | Resolution |
|---|---|---|
| **ADR-0082** Yggdrasil | §"Gouverneur: MESTOR" + §"Sous-système APOGEE de rattachement: Guidance" contradict blueprint §5.2 "ungouverné, traverse Mestor". | **Amend in-place** with explicit 2026-05-16 amendment note. Keep file at same number (no supersede + new ADR — too noisy for a single-paragraph correction). Pattern matches blueprint §21.3 D-4.1 recommendation. |
| **PRD** `prd.md` frontmatter | `inputDocuments` does not list `docs/governance/STATE_FINAL_BLUEPRINT.md`. `scope_correction_note` predates blueprint. | Add to `inputDocuments`. Append `blueprint_canon_alignment: 2026-05-16 — STATE_FINAL_BLUEPRINT.md is now the canonical source-of-truth for terminology, neter limits, cascade canon. Phase 23 scope unchanged; doc-sync only.` |
| **UX** `ux-design-specification.md` frontmatter | Same — no blueprint reference. | Same — add to `inputDocuments` + alignment note. |
| **Architecture** `architecture.md` frontmatter | Same. Plus: D1's `out_of_scope_concepts` line references Yggdrasil + Argos as "NEW canon — separate governance chantier" which is now resolved (ADR-0082 + ADR-0083 + blueprint). | Update `out_of_scope_concepts` line: *"resolved 2026-05-15/16 via ADR-0082 + ADR-0083 + STATE_FINAL_BLUEPRINT"*. |
| **Epics** `epics.md` Epic 1 | 9 stories, no `BRIEF_VS_ADVE_COHERENCE` gate. | **Insert new Story 1.8** (gate scaffold) ; **renumber** existing 1.8→1.9 + 1.9→1.10. Update FR/NFR coverage map to mention scaffold is governance-only (full enforcement deferred to closure-target #14 Phase 24). |
| **Closure-roadmap** `closure-roadmap.md` | "6 nouvelles cibles" in footer is proposal-state. Targets #14-19 absent from main table. | **Promote** the 6 targets from footer to main table. Renumber `Total` to **19 targets**. Definition of Done re-baselined accordingly. |
| **CLAUDE.md** "Phase status" section | Lists Phase 23 status "Epic 1 (Governance Foundations) en cours · 7/9 stories shipped". Needs update post-renumbering. | Update to **"7/10 stories shipped"** post-Story 1.8 insertion (current "1.8 CLAUDE.md stack drift" remains shipped — it's now numbered 1.9). |
| **No code touched** | n/a | All deltas are governance docs + planning artifacts. No `src/**` file in this proposal's scope. |

### Cross-Cutting / Doctrinal Impact

- **APOGEE cap 7/7 preserved** — no new Neter, no `BRAINS` const change, no `Governor` type change. `neteru-coherence.test.ts` stays green.
- **Mission link**: 5 of 6 new closure-roadmap targets contribute *directly* to the superfans × Overton mechanic (the BRIEF gate validates ADVE source-of-truth ; the score system measures Overton/superfan progress ; Hub-Escrow enables crew production for superfan-generating campaigns ; Communities Cockpit makes superfans visible to the founder ; economic runtime keeps the OS financially viable to operate the mission). Target #19 (rename + manipulation consumption) is governance maintenance.
- **Drift catalog absorption**: blueprint §21 catalogs 30 drifts. 14 of them are addressed by the 6 new closure-targets (D-3.1/3.2/3.3, D-4.5, D-5.1, D-5.4, D-5.8, D-7.1, D-7.2, D-7.3, D-8.3, D-2.1, D-5.3, D-2.3). Remaining 16 drifts are tracked as RESIDUAL-DEBT under their respective Phase candidates.

---

## Section 3 — Recommended Approach

### Path Forward Evaluation

| Option | Viability | Effort | Risk | Recommendation |
|---|---|---|---|---|
| **Option 1 — Direct Adjustment** (insert governance scaffold + amend ADR + create 4 ADRs + promote 6 closure-targets) | **VIABLE** | M (10-12 files, doc-only) | **LOW** — no code touch, no Prisma migration, no Neter addition, no anti-drift test regression | ✅ **SELECTED** |
| Option 2 — Rollback (revert Phase 23 Epic 1 ships + re-PRD) | Not viable | XL | High | ❌ Refused — Phase 23 Epic 1 work is sound; only one story missing |
| Option 3 — MVP Review (descope Phase 23 to absorb blueprint debt) | Not viable | L | M | ❌ Refused — blueprint canon does *not* invalidate Phase 23 MVP. It extends Epic 1 by 1 story + adds 6 future targets to the roadmap. The chantier remains shippable as-planned. |

### Selected approach — Direct Adjustment with explicit doc-sync sweep

**Rationale:**

1. **No code change required.** All 7 canonical facts are doctrine-level. Implementation work (BRIEF gate handler, scoring-engine, etc.) lands in Phase 24+ per blueprint §22.1-2.
2. **Phase 23 MVP unchanged.** The 35 FRs / 14 NFRs / 4 journeys are not invalidated by blueprint. One additional governance story (1.8) strengthens MVP without expanding measurement scope.
3. **APOGEE cap preserved.** No 8th Neter. `BRAINS` const + `neteru-coherence.test.ts` untouched.
4. **Mission link strengthens.** All 6 new closure-targets trace directly back to the superfans × Overton sentence (the BRIEF gate is the *most direct* — it ensures every ingested brief is coherent with the brand's ADVE noyau before any RTIS / production action).
5. **Doctrinal anti-drift restored.** ADR-0082's Yggdrasil "gouverné par Mestor" wording was caught by blueprint §21.3 D-4.1 *as a drift to correct*. Amending it closes the drift; leaving it would violate NEFER §3.2 #3 (silent narrative drift).
6. **Cascade canon now formalized in ADR.** Blueprint §11 confirms doctrine = code (verified — no auto-trigger from Tarsis/Notoria into ADVE). ADR-0085 records this code-level fact as governance canon, blocking future drift toward "auto-suggest-amend".

### Trade-offs accepted

- **No `RESIDUAL-DEBT.md` entry** for the 6 new closure-targets — they live in `closure-roadmap.md` as **active targets** (NOT_STARTED), not residuals. RESIDUAL-DEBT is for *partial-shipped* work with calendar-locked completion ; the 6 new targets are work *not yet started*. This is the correct ledger boundary.
- **Story 1.8 (BRIEF gate)** is a *scaffold* in Phase 23 (type + handler stub registered with Mestor), not full enforcement. Enforcement lands in Phase 24 per closure-target #14. This avoids expanding Phase 23 scope while still placing the gate in the governance foundation it requires.
- **ADR-0082 amend** is in-place (no supersede + new ADR). This is appropriate because the substantive decision (Yggdrasil canonized as substrate + 3 invariants Q1/Q2/Q3 + Mestor governs the gates + 6 seams) is unchanged; only the misleading "Yggdrasil gouverné par Mestor" phrasing is corrected.

---

## Section 4 — Detailed Change Proposals

### Change 1 — Amend ADR-0082 (Yggdrasil ungoverned substrate)

**File**: `docs/governance/adr/0082-yggdrasil-value-circulation-substrate.md`

**Edit type**: In-place amendment with explicit 2026-05-16 note at top + corrected sub-sections.

**OLD** (lines 39-58, §"Gouverneur: MESTOR"):

```
### Yggdrasil n'est PAS un Neter

Substrat / protocole, comme NSP ou la layering cascade. **Cap APOGEE 7/7 préservé** —
pas de 8ème gouverneur. `BRAINS` const (`src/server/governance/manifest.ts`) inchangé.

### Gouverneur : MESTOR

Mestor gouverne Yggdrasil parce qu'il gouverne déjà les trois primitives sur
lesquelles Yggdrasil repose :

| Primitive Yggdrasil | Possession Mestor |
|---|---|
| Point d'entrée canonique | `mestor.emitIntent()` (NEFER §3.2 #2) |
| Pre-flight gates | `services/mestor/gates/*` |
| Journal hash-chainé | `IntentEmission` (ADR-0004) |

Sous-système APOGEE de rattachement : **Guidance** (§4.2 — *"ce qui dirige"*).
Substantivement, Yggdrasil **est** le pilotage du flux de valeur. Même surface
conceptuelle que Mestor.
```

**NEW**:

```
> **AMENDMENT 2026-05-16** — STATE_FINAL_BLUEPRINT §5.2 + §21.3 (drift D-4.1)
> corrige cette ADR : **Yggdrasil n'est gouverné par AUCUN Neter** — c'est un
> substrat organique (comme NSP, comme la layering cascade). Mestor possède
> les **gates** (= valves) qui filtrent ce qui traverse Yggdrasil, mais
> Yggdrasil lui-même reste ungouverné. La distinction est doctrinalement
> structurante : Yggdrasil *transporte* la valeur ; les gates Mestor *décident*
> ce qui peut entrer. Substrat ≠ governor. Cf. blueprint §5.2 pour la définition
> canonique amendée. Section "Gouverneur: MESTOR" ci-dessous remplacée
> par "Mestor possède les gates, pas le substrat".

### Yggdrasil n'est PAS un Neter, et n'a PAS de gouverneur Neter

Substrat / protocole organique, comme NSP ou la layering cascade. **Cap APOGEE
7/7 préservé** — pas de 8ème gouverneur. `BRAINS` const
(`src/server/governance/manifest.ts`) inchangé. Yggdrasil n'apparaît dans aucun
`Governor` type, dans aucun manifest `acceptsIntents`, dans aucune table
`BRAINS`. C'est un fait d'architecture, pas une omission.

### Les gates Yggdrasil appartiennent à Mestor (pas le substrat lui-même)

Mestor possède les **valves** qui filtrent ce qui traverse Yggdrasil — pas
Yggdrasil. La distinction :

| Couche | Propriétaire | Nature |
|---|---|---|
| **Substrat Yggdrasil** | Aucun Neter | Topologie organique. Transporte. Ne décide pas. |
| **Point d'entrée canonique** | Mestor | `mestor.emitIntent()` — la porte d'entrée. |
| **Pre-flight gates** | Mestor | `services/mestor/gates/*` — les valves filtrant ce qui traverse. |
| **Journal hash-chainé** | Mestor | `IntentEmission` (ADR-0004) — la trace de ce qui a traversé. |

Sous-système APOGEE de rattachement des **gates** : **Guidance** (§4.2 —
*"ce qui dirige"*). Mais Yggdrasil substrate elle-même est cross-cutting,
hors sous-système. Substantivement, Yggdrasil **est** la topologie de
circulation de la valeur ; les gates Mestor **filtrent** ce qui peut y entrer.
```

**Plus** update §"Documentation propagée" table line "**CLAUDE.md** Mestor gouverne aussi Yggdrasil" → "**CLAUDE.md** Yggdrasil = substrat ungouverné ; gates Yggdrasil appartiennent à Mestor (cf. ADR-0082 amend 2026-05-16)."

**Rationale**: blueprint §5.2 corrects the original ADR-0082 framing. The Q1/Q2/Q3 invariants table + the 6 Neter seams + Argos parent reference remain unchanged — only the "Mestor governs Yggdrasil" sentence is replaced with "Mestor governs the gates that filter Yggdrasil traversal". Cleaner separation: substrate vs governor of substrate traversal.

---

### Change 2 — Create ADR-0084 (OS architecture 8 canonical layers)

**File**: `docs/governance/adr/0084-os-architecture-8-canonical-layers.md` (NEW)

**Title**: ADR-0084 — La Fusée OS architecture, 8 canonical layers

**Status**: Accepted
**Date**: 2026-05-16
**Phase**: 23 (doc-only, no code touch)
**Depends on**: ADR-0001 (APOGEE framework), ADR-0002 (layering cascade ESLint enforcement), STATE_FINAL_BLUEPRINT §2

**Decision summary**:

La Fusée est un Industry OS, traité comme tel. **8 couches canoniques** définies par blueprint §2 :

| # | Couche | Driver La Fusée | Statut |
|---|---|---|---|
| 1 | Hardware/Kernel | Postgres + Vercel + Node runtime | ✅ |
| 2 | Drivers | tenantScopedDb · Prisma · LLM Gateway · Anubis providers · Ptah providers · Credentials Vault | ✅ |
| 3 | Protocoles | Intent bus · NSP SSE · hash-chain · MCP bidirectionnel · OAuth 2.1 · ConnectorResult<T> · Pattern P22-* | ✅ |
| 4 | Substrats | **Yggdrasil per-brand** · tenantScopedDb · layering cascade · BrandContextNode tree · Variable Bible | ✅ |
| 5 | Services système | 7 Neteru + INFRASTRUCTURE | ✅ |
| 6 | APIs | tRPC routers · Glory tools · Frameworks · Sequences · Intent kinds | ✅ |
| 7 | Applications | Console · Cockpit · Agency · Creator · Intake · Argos (📋) | 🟡 (3 surfaces UI manquantes) |
| 8 | Funnel commercial | Wow-effect onboarding · free analysis · paid PDF · CTA retainer · Cockpit subscription | 🟡 (metrics absents) |

**Invariant** : chaque couche peut être swappée indépendamment si le contrat avec la couche supérieure tient. Test anti-drift `os-layer-boundary.test.ts` 📋 à créer (Phase 29 candidate, blueprint §22.3).

**Anti-drift** : aucun service inter-Neter ne doit s'importer directement — passage obligé par Intent typé via Mestor (renforce ADR-0002 layering cascade + ADR-0048 Glory tools as primary API).

**Resolves drift**: D-4.2 (blueprint §21.3).

---

### Change 3 — Create ADR-0085 (Cascade canon refresh, STOP at Jehuty)

**File**: `docs/governance/adr/0085-refresh-cascade-stop-at-jehuty.md` (NEW)

**Title**: ADR-0085 — Refresh cascade canon : Hunter → Seshat → Tarsis → Jehuty STOP, manual operator decision mandatory for ADVE write

**Status**: Accepted
**Date**: 2026-05-16
**Phase**: 23 (doc-only — codifies existing code behaviour)
**Depends on**: ADR-0023 (OPERATOR_AMEND_PILLAR unique write path for ADVE), STATE_FINAL_BLUEPRINT §3.3 + §11

**Decision summary**:

The OS observes constantly but writes to ADVE only with explicit operator decision. Two-phase cascade :

**Phase 1 — Acquisition (automatic, tier-frequency-driven)**:
```
Hunter (📋 external tracking, sub-agent Seshat) 
  → Seshat (ingestion + normalization)
  → Tarsis (probabilistic future computation on mass data, internal Seshat tool)
  → Jehuty (editorial: "voici l'actualité de la marque")
  ⛔ STOP — notification only, NO auto-cascade
```

**Phase 2 — Deliberation + Irrigation (human-triggered)**:
```
Operator reads Jehuty + decides what to address (MANDATORY MANUAL)
  → Notoria (scored amendment recommendations, confidence 0-1)
  → Operator approves via OPERATOR_AMEND_PILLAR (ADR-0023)
  → T pillar (Track, closest to market) updated
    ├─ DOWNWARD: T → R → retro-feedback ADVE (brand realigns on observed reality)
    └─ UPWARD: T → I (candidate actions) → S (synthesized strategy)
```

**Three absolute prohibitions**:

1. **No auto-trigger from Tarsis → ADVE.** Even on strong signal, Tarsis emits NspEvent + updates internal probability tables ; it does NOT emit OPERATOR_AMEND_PILLAR.
2. **No auto-trigger from Notoria → ADVE.** Notoria proposes (Recommendation rows status PENDING with confidence score) ; operator decides explicitly via UI.
3. **No skip of Jehuty notification queue.** Every Phase 1 acquisition cycle produces a Jehuty editorial digest ; operator reads it, then chooses what to escalate to Notoria.

**Frequencies per subscription tier**:

| Tier | Phase 1 frequency |
|---|---|
| Free Intake | on demand only |
| Embarquement (FRAGILE) | monthly |
| Starter (ORDINAIRE) | monthly |
| Pro (FORTE) | daily |
| Group (CULTE) | daily + on demand |
| Enterprise (ICONE) | daily + on demand |
| **Console UPgraders + partners** | **hourly** (operator-reserved) |

Plus event triggers override (Tarsis anomaly, ADVE amend, campaign launch, Hunter dossier, competitor major action, regulation change).

**Code state** ✅ verified : no auto-trigger from Tarsis/Notoria to ADVE write found in audit. RTIS Intent kinds (`ENRICH_R_FROM_ADVE`, `ENRICH_T_FROM_ADVE_R_SESHAT`, `GENERATE_I_ACTIONS`, `SYNTHESIZE_S`) are routable only via `commandant.ts` from explicit operator decision (drift D-5.2 resolved at doc level).

**Anti-drift test** 📋 `refresh-cascade-no-auto-write.test.ts` to create — Phase 24 candidate (HARD mode, asserts no source file in `services/seshat/` or `services/notoria/` invokes `emitIntent(OPERATOR_AMEND_PILLAR)` directly).

**Resolves drift**: D-5.2 (blueprint §21.4).

---

### Change 4 — Create ADR-0086 (Multi-dimensional brand maturity score)

**File**: `docs/governance/adr/0086-brand-maturity-score-canonical.md` (NEW)

**Title**: ADR-0086 — Brand maturity score, 8 canonical dimensions aggregated by `scoring-engine/`

**Status**: Accepted (doctrine canon ; implementation Phase 24)
**Date**: 2026-05-16
**Phase**: 23 (doc-only) ; closure-target #15 Phase 24 (implementation)
**Depends on**: STATE_FINAL_BLUEPRINT §12, ADR-0046 (cult-index no-magic-fallback), ADR-0047 (devotion ladder vs brand classification)

**Decision summary**:

The brand maturity score etalons ZOMBIE→ICONE on the APOGEE trajectory. Highest score = objectives reached (Overton politically shifted, cult community established, product maturity, high Cult Index, significant superfan ratio).

**8 canonical dimensions** :

| Dimension | Measure | Service | State |
|---|---|---|---|
| **Cult Index** | 0-100 on 7 sub-dimensions (engagement, superfan velocity, cohesion, …) | `cult-index-engine/` | ✅ |
| **Devotion Distribution** | Pyramid 6 paliers (Spectator → Evangelist) | `devotion-engine/` | ✅ |
| **Overton Delta** | Sectoral axis displacement measured | `sector-intelligence/` | ✅ |
| **Superfan Velocity** | Growth rate of nominal superfans per period | `cult-index-engine/` | ✅ |
| **Brand Asset Maturity** | % `BrandAsset.kind` ACTIVE / applicable kinds | `brand-vault/` | 🟡 |
| **Pillar Completeness** | % ADVE/RTIS pillars COMPLETE not-stale | `pillar-readiness.ts` | ✅ |
| **Campaign Performance** | Weighted average ROI on closed cycle | `campaign-tracker/` | ✅ |
| **Production Quality** | Glory tool QC average on cycle | `qc-router/` | 🟡 |

**Score usage** :

1. **Notoria** : score informs Recommendation confidence
2. **Palier transitions** : `PROMOTE_*_TO_*` Intent kinds use score as **proof** (gate `PALIER_PROMOTION_PROOFS`)
3. **Cockpit display** : palier badge + score visible in `/cockpit/insights/`
4. **Pricing dégressivité** : Hub-Escrow commission decreases with palier (closure-target #16)
5. **Argos showcase** : high-score brands candidate for reference publication
6. **UPgraders Console** : internal leaderboard of accelerating brands

**Implementation scope** (closure-target #15, Phase 24) :

- New service `src/server/services/scoring-engine/` aggregating the 8 dimensions
- New Prisma model `BrandMaturityScore` (historical timeseries per brand)
- New Intent kind `RECOMPUTE_BRAND_SCORE` (governor: SESHAT, async, SLO p95 ≤ 30s)
- New tRPC procedure `scoring.getBrandScore(strategyId)` + `scoring.getScoreHistory(strategyId, range)`
- New gate `PALIER_PROMOTION_PROOFS` (Mestor) refusing `PROMOTE_*_TO_*` Intents when target palier score thresholds not met
- New Cockpit UI : score badge in `/cockpit/insights/` header + history sparkline + dimension breakdown drawer

**Resolves drift**: D-5.8 (blueprint §21.4).

---

### Change 5 — Create ADR-0087 (Thot formula engine + Seshat zone-indices)

**File**: `docs/governance/adr/0087-thot-formula-engine-seshat-zone-indices.md` (NEW)

**Title**: ADR-0087 — Economic architecture canon : Thot formula engine + Seshat zone-indices at runtime, no static FCFA grid

**Status**: Accepted (doctrine canon ; implementation Phase 26)
**Date**: 2026-05-16
**Phase**: 23 (doc-only) ; closure-target #18 Phase 26 (implementation)
**Depends on**: STATE_FINAL_BLUEPRINT §14, ADR-0075 (payment secrets in env), ADR-0021 (Credentials Vault for connectors)

**Decision summary**:

**All economic calculation = runtime Thot formula from Seshat per-zone indices.** No static FCFA grid hardcoded in code, UI, or business docs.

```
Seshat (zone indices) → Thot (formula engine) → Cockpit / Console / Hub-Escrow / Intake
```

**Why**: La Fusée operates Afrique francophone (UEMOA + CEMAC + diaspora). Cost-of-living, TJM, marketing budgets, mobile money fees, taxes vary widely by zone. A Dakar Pro tier ~1M FCFA but Cotonou ~800k and Libreville ~1.2M depending on indices. Hardcoding is doctrinally wrong.

**Three structural rules**:

1. **No FCFA literal in source code or markdown docs** (excluding sample/example contexts explicitly labeled "indicative zone Dakar/Abidjan"). Anti-drift test `no-hardcoded-fcfa.test.ts` 📋 (Phase 26).
2. **All pricing/costing/commission/escrow/LLM-overage calculations are tRPC `thot.calc.*` procedures** taking `(zoneCode, ...inputs)` and returning `{ amount, currency, formula, breakdown, usedFallback?, fallbackChain? }`.
3. **Zone-indices missing for a zone → economic neighbor fallback** (`economicNeighbors: Record<CountryCode, CountryCode[]>`), ultimate fallback UEMOA or CEMAC median. Response includes `usedFallback: true, fallbackChain: ["BF","CI"]` for traceability.

**Thot calculator inventory** (16 canonical, **6 missing** per blueprint §14.2) :

- **Freelance/Talent (4)**: `computeTJM` 🟡, `computeCommissionRate` ✅, `computeFreelanceBreakeven` ✅, `computeTalentScoreEvolution` 🟡
- **Marque (4)**: `computeCODB` ✅, `computeOperatingBudget` ✅, `computeMarketingShareAdvised` ✅, **`computeRetainerFitness` ❌**
- **Agence (2)**: `computeAgencyPlanPrice` ✅, `computeAgencyMargin` ✅
- **Hub-Escrow (3)** : **`computeEscrowAmount` ❌**, **`computeEscrowReleaseDate` ❌**, **`computeDisputeArbitrage` ❌**
- **LLM + Infra (4)** : **`computeLlmAllowance` ❌**, **`computeLlmOverage` ❌**, **`computeForexExposure` ❌**, `computeMobileMoneyFees` 🟡
- **Trajectoire (2)** : `computeNextPalierProofs` ❌, `computePalierTransitionCost` ❌ (couplé closure-target #15 scoring-engine)

**Seshat zone-indices inventory** (7 canonical families, **0/7 shipped**) :

| Index | Primary source | Refresh |
|---|---|---|
| Cost-of-living | Numbeo API + World Bank | quarterly |
| Forex | XE/OANDA + BCEAO/BEAC official | daily |
| Inflation/GDP | World Bank, BCEAO, INS country | monthly |
| TJM créatif | **Hunter crawl** + surveys + Académie | quarterly |
| Marketing budgets | Nielsen Africa + eMarketer + Tarsis aggregation | quarterly |
| Mobile money fees | Operator APIs or official scrape | weekly |
| TVA/taxes | Country DGI + legal monitoring | event-driven |

**Implementation scope** (closure-target #18, Phase 26) :

- New service tree `src/server/services/seshat/zone-indices/` (7 sub-modules)
- New Prisma models : `ZoneIndex`, `ZoneIndexSnapshot`, `EconomicNeighborMap`
- 6 new Thot calculators (listed above)
- Updated tRPC `thot.calc.*` router exposing all 16 calculators
- New `ai-cost-tracker/` service with overage notification flow (80%/100%/120% thresholds, 3 user-configurable options : cap / overage transparent / upgrade pro-rata)
- Transparency hierarchy : Cockpit founder sees price + high-level breakdown ; Console UPgraders + agencies see full formula + variables + breakdown
- Operator UI in `/console/socle/economic-runtime/` for zone-index source configuration

**Resolves drifts**: D-5.4 + D-5.3 + D-2.3 (blueprint §21.4 + §21.1).

---

### Change 6 — Promote 6 new closure-roadmap targets (13 → 19)

**File**: `_bmad-output/planning-artifacts/closure-roadmap.md`

**Edit type**: Promote the 6 targets currently drafted in the **"⚠️ 6 nouvelles cibles closure-roadmap proposées"** footer section (lines 235-253) into the main **"The 13 closure targets"** table (lines 58-75). Renumber table header to **"The 19 closure targets"**. Remove the footer "proposed" section after promotion. Update Definition of Done re-baseline.

**Each new target inherits the canonical row format**:

```
| # | Title | Cluster(s) | Neter(s) | Portal(s) | Effort | Mission link | Status | Closure criterion |
```

**Six new rows** (full canonical format) :

| # | Title | Cluster(s) | Neter(s) | Portal(s) | Effort | Mission link | Status | Closure criterion |
|---|---|---|---|---|---|---|---|---|
| **14** | **Phase 24 — `BRIEF_VS_ADVE_COHERENCE` gate** + 3 ingestion gates (`PRODUCTION_OUTPUT_VS_BRIEF`, `BROADCAST_VS_AUDIENCE_FIT`) | Governance | Mestor (gate) + Artemis (brief consumer) + Anubis (broadcast surface) | none runtime (Console gate-status dashboard optional) | M | **Direct** (every brief that enters the OS must align with ADVE noyau before any production starts) | **NOT_STARTED** (Phase 23 Story 1.8 scaffolds the type + handler stub) | 4 Mestor gates registered + enforced on `INGEST_BRIEF`-emitting flows + 3 anti-drift HARD tests (one per gate) + RESIDUAL-DEBT entries for any deferred enforcement path |
| **15** | **Phase 24 — Système de score unifié** (`scoring-engine/` aggregating 8 dimensions + `BrandMaturityScore` model + `RECOMPUTE_BRAND_SCORE` Intent + `PALIER_PROMOTION_PROOFS` gate) | Score system | Seshat (computation) + Mestor (gate) | Cockpit (insights badge) + Console (leaderboard) | L | **Direct** (étalonne ZOMBIE→ICONE — pivot piece) | **NOT_STARTED** | `scoring-engine/` shipped, 8 dimensions aggregated, score history Prisma model + Intent kind + gate + Cockpit badge + Console leaderboard ; `PALIER_PROMOTION_PROOFS` HARD test green |
| **16** | **Phase 24 — Hub-Escrow chantier complet** (Task/Bid/Award/Dispute models + 10 Intent kinds + 7 routes cross-portal + mobile money escrow + commission tiered) | Economic infra | Imhotep (matching) + Thot (escrow + commission + mobile money) + Mestor (dispute arbitrage) + Artemis (delivery QC) | Cockpit + Creator + Console | XL (3 mois) | Chain (étape 4 gravité — l'industrie créative africaine se construit ici) | **NOT_STARTED** | 5 Prisma models + 10 Intent kinds + 3 Cockpit routes + 3 Creator routes + 1 Console monitor route + mobile money escrow live (Wave/Orange/MTN/Moov) + commission tiered (20%→8% palier-dégressive) |
| **17** | **Phase 25 — Communities Cockpit + Personal Brand Cockpit UI** (6 routes Communities + 6 routes Personal + 8 new components + 3 new Prisma models Personal) | Cockpit surfaces | Anubis (broadcast segments from community view) + Artemis (Personal Brand Glory tools — exists 5) | Cockpit (founder primary) | L | **Direct** (founder sees community + persona — concrete superfan-lineage proof) | **NOT_STARTED** | `/cockpit/community/*` 6 routes consuming existing backend ✅ + `/cockpit/personal/*` 6 routes consuming partial backend + 3 new Prisma models (`Drop`, `BrandDeal`, `FanEconomy`) + 8 new Tier 3 components |
| **18** | **Phase 26 — Architecture économique runtime** (Seshat zone-indices module 7 families + 6 Thot calculators + `ai-cost-tracker/`) | Economic engine | Seshat (zone-indices) + Thot (formula engine + ai-cost-tracker) + Hunter (📋 économique source TJM/marketing budgets) | Console (operator zone-index config) + Cockpit (transparent breakdown) | XL | Chain (pricing scaling to UEMOA+CEMAC needs zone-aware runtime) | **NOT_STARTED** | `seshat/zone-indices/` 7 sub-modules + 6 missing Thot calculators + `ai-cost-tracker/` service + `no-hardcoded-fcfa.test.ts` HARD test green + Console `/console/socle/economic-runtime/` operator UI |
| **19** | **Phase 25 — `financial-brain/` → `thot/` rename + `MANIPULATION_COHERENCE` consumption** | Naming + gate activation | Thot (rename) + Artemis (Glory tools consume `manipulationMode`) | none runtime (governance) | M | Indirect (governance maintenance) but unblocks doctrine "tout via Mestor + manipulation match" | **NOT_STARTED** | 50-80 file rename + import updates + ADR (D-5.1 closure) + 56 Glory tools `promptTemplate` consume `manipulationMode` (D-4.5 critical fix — currently 0/56) + anti-drift `manipulation-consumed.test.ts` HARD baseline |

**Section "Plan d'atteinte par étages" (lines 197-225)** also updated to include the 6 new targets in their respective étages :

- Étage 2 (parallèle) : +#14 BRIEF gate scaffold (Phase 23 Story 1.8) + #15 scoring-engine + #19 rename
- Étage 3 (vendor-gated) : +#16 Hub-Escrow (depends on mobile money operator contracts/APIs)
- Étage 4 (heavy) : +#17 Communities/Personal UI + #18 economic runtime

**Definition of Done re-baseline** : Condition 1 now reads "All **19** targets resolved" (was: 13). Conditions 1-bis / 2 / 3 unchanged.

**Closure-roadmap footer "6 nouvelles cibles proposées" section removed** post-promotion. A new closing paragraph notes the 2026-05-16 promotion with reference to this Sprint Change Proposal.

---

### Change 7 — Insert new Story 1.8 in Phase 23 Epic 1 (BRIEF_VS_ADVE_COHERENCE gate scaffold)

**File**: `_bmad-output/planning-artifacts/epics.md`

**Edit type**: Insert new story between current Story 1.7 and current Story 1.8 ; renumber existing 1.8 → 1.9 and existing 1.9 → 1.10. Update CLAUDE.md "Phase status" line for Phase 23 to `7/10 stories shipped` (was `7/9`).

**NEW Story 1.8 (insert)** :

```
### Story 1.8: Scaffold BRIEF_VS_ADVE_COHERENCE governance gate

As a NEFER operator,
I want the BRIEF_VS_ADVE_COHERENCE gate type + handler stub registered in
Mestor's gate registry from Phase 23 Epic 1,
So that subsequent ingestion flows (Phase 24 closure-target #14) can plug into
a stable contract, and the governance foundation that blueprint §3 + §21.2
(drift D-3.1 CRITIQUE) calls for is laid alongside the lifecycle Intent
scaffolding in the same epic.

**Acceptance Criteria:**

**Given** STATE_FINAL_BLUEPRINT §3 (ADVE = brand noyau) + §21.2 (D-3.1 CRITICAL
gate absent) + ADR-0023 (OPERATOR_AMEND_PILLAR as unique ADVE write path)
**When** `src/server/services/mestor/gates/brief-vs-adve-coherence.ts` is created
**Then** the file exports a `briefVsAdveCoherenceGate` function with signature
`(input: { strategyId: string; brief: { content: string; pillarBindings?: PillarKey[] } }, ctx: GateContext) => Promise<GateResult>` where `GateResult` is the canonical `{ verdict: "PASS" | "BLOCK" | "WARN"; reason?: string; evidence?: unknown }` discriminated union
**And** the gate stub body throws `NOT_YET_IMPLEMENTED("BRIEF_VS_ADVE_COHERENCE enforcement deferred to closure-target #14 Phase 24")` — same scaffolding pattern as Stories 1.4/1.5 Intent kind handlers
**And** the gate is registered in `services/mestor/gates/index.ts` under the canonical `MestorGates` map type
**And** a new anti-drift test `tests/unit/governance/brief-vs-adve-coherence-scaffold.test.ts` asserts the gate is exported, registered in the map, and currently throws `NOT_YET_IMPLEMENTED` (so production code referencing it pre-Phase-24 fails fast)
**And** ADR-0049 (Brief Mandatory Gate) is cross-referenced from the new gate file header — this gate is the *coherence* enforcement layer that sits on top of ADR-0049's *mandatory* enforcement layer
**And** closure-roadmap target #14 entry is annotated `Phase 23 Story 1.8 scaffold shipped` once this story merges
**And** `tsc --noEmit` + `lint` are green
```

**Rationale**: This scaffold ships only the contract + a `NOT_YET_IMPLEMENTED`-throwing handler — same shape as Story 1.4/1.5 Intent kind registrations. Full enforcement (Zod schema for brief alignment, LLM-assisted coherence check, manual operator override mode per ADR-0060 parity) is deferred to Phase 24 closure-target #14 under three sibling gates (`BRIEF_VS_ADVE_COHERENCE` enforcement + `PRODUCTION_OUTPUT_VS_BRIEF` + `BROADCAST_VS_AUDIENCE_FIT`). The scaffold prevents premature production references and locks the governance contract before measurement work lands.

**Existing Story 1.8 "Correct CLAUDE.md stack drift…" → renumber to Story 1.9** (no content change required ; only the heading line `### Story 1.8: …` → `### Story 1.9: …`).

**Existing Story 1.9 "Initial map updates…" → renumber to Story 1.10** (no content change required).

**Epic 1 epic goal sentence** (line 440) updated : `Establish the governance scaffolding — child ADRs, Mestor Intent kinds, **gates**, manifest declarations, SLOs, shared types, …` (insert "**gates**" after "Intent kinds,").

---

### Change 8 — Frontmatter doc-sync sweep on 4 planning artifacts

**Files**: `prd.md` + `ux-design-specification.md` + `architecture.md` + `epics.md`

**Edit type**: Frontmatter `inputDocuments` list extended + new field `blueprint_canon_alignment` added.

**Pattern (4 files)** :

```yaml
inputDocuments:
  - ... (existing entries preserved)
  - docs/governance/STATE_FINAL_BLUEPRINT.md  # NEW — canon absolu 2026-05-16
blueprint_canon_alignment: >
  2026-05-16 — STATE_FINAL_BLUEPRINT.md is now the canonical source-of-truth for
  La Fusée OS terminology, neter governance limits, refresh cascade, score system,
  and economic architecture runtime. This artifact's substantive scope is
  unchanged ; only references and frontmatter are doc-synced. See
  sprint-change-proposal-2026-05-16.md for the corresponding course correction.
```

**Plus targeted body edits** (one paragraph each) :

- **architecture.md** — update `out_of_scope_concepts` frontmatter line : *"Yggdrasil ... and Argos are NEW canon — separate governance chantier, NOT folded into Phase 23 architecture"* → *"resolved 2026-05-15/16 via ADR-0082 (Yggdrasil substrate) + ADR-0083 (Argos placement) + STATE_FINAL_BLUEPRINT canonization. No impact on Phase 23 substantive scope."*
- **PRD** — append to executive summary : *"Canon alignment 2026-05-16 — see STATE_FINAL_BLUEPRINT.md for cross-cutting OS doctrine ; this PRD's Phase 23 scope is unchanged."*
- **UX spec** — same one-line append in introduction.
- **epics.md** — already references blueprint in CLAUDE.md system context ; add to frontmatter `inputDocuments` only.

---

### Change 9 — Update CLAUDE.md "Phase status" Phase 23 entry

**File**: `CLAUDE.md`

**Edit type**: Update Phase 23 progress line to reflect Story 1.8 insertion.

**OLD** (current state per system context):

```
Progress Epic 1 : 7/9 stories shipped au 2026-05-16. Étape suivante : Epic 2 ...
```

**NEW**:

```
Progress Epic 1 : 7/10 stories shipped au 2026-05-16 (Story 1.8 BRIEF_VS_ADVE_COHERENCE
gate scaffold inserted post-STATE_FINAL_BLUEPRINT alignment ; existing 1.8/1.9
renumbered to 1.9/1.10). Étape suivante : ship Story 1.8 (BRIEF gate scaffold) +
Stories 1.9/1.10 doc-sync, then start Epic 2 (External Signal Connectors).
```

Plus add to Phase 23 entry: `Doctrine canon : STATE_FINAL_BLUEPRINT (2026-05-16) + ADR-0082 amend + ADR-0084/0085/0086/0087 created (doc-only).`

---

## Section 5 — Implementation Handoff

### Scope classification

**MODERATE scope** — multi-artifact governance + planning update affecting :
- 5 ADR files (1 amended, 4 created)
- 5 planning artifacts (PRD, UX, architecture, epics, closure-roadmap)
- 1 governance doc (CLAUDE.md)

**Zero code**. **Zero Prisma migration**. **Zero anti-drift CI regression risk** (no Neter added ; no manifest change beyond Mestor gate registration scaffold which is type-only).

### Handoff recipients

- **NEFER (operator)** — executes the 11-file delta per the NEFER commit protocol P1-P8 :
  - P1 Conventional commit `governance(meta): align Phase 23 artifacts + ADR canon with STATE_FINAL_BLUEPRINT 2026-05-16` (scope `governance` is canonical per `_nefer-commit.md`)
  - P2 PR label `phase/23` (Story 1.8 insertion) + `governance` (4 new ADRs + closure-roadmap promotion)
  - P3 RESIDUAL-DEBT — N/A (this is *promotion* of work, not deferral)
  - P4 7-sources sync — CLAUDE.md updated (this proposal Change 9) ; LEXICON / APOGEE / PANTHEON / CODE-MAP / BRAINS / Governor unchanged (no Neter or substantive concept added beyond Yggdrasil amendment which only corrects existing entry)
  - P5 Tests — `tsc --noEmit` + `lint` (doc-only changes) ; `neteru-coherence.test.ts` stays green ; anti-drift suite unchanged
  - P6 CHANGELOG entry — yes, `v6.23.x — governance: align with STATE_FINAL_BLUEPRINT canon`
  - P7 APOGEE cap 7/7 preserved (no new Neter ; Yggdrasil amend explicitly reasserts this in §"n'est PAS un Neter")
  - P8 Co-author footer per user convention
- **Developer agent** — pick up Story 1.8 implementation (BRIEF gate scaffold) as part of Phase 23 Epic 1 ongoing work. New file `services/mestor/gates/brief-vs-adve-coherence.ts` + new test `brief-vs-adve-coherence-scaffold.test.ts`.

### Success criteria

1. **ADR-0082 amendment** committed with explicit 2026-05-16 note at top.
2. **ADR-0084 / 0085 / 0086 / 0087** committed as new files with `Status: Accepted` + dependency / phase / supersedes frontmatter.
3. **Closure-roadmap** main table contains 19 targets (was 13) ; footer "proposed" section removed ; Definition of Done re-baselined.
4. **epics.md Epic 1** contains 10 stories ; new Story 1.8 = BRIEF gate scaffold ; existing 1.8/1.9 renumbered to 1.9/1.10 ; epic goal sentence mentions "gates".
5. **Frontmatter sweep** : PRD + UX + architecture + epics all reference STATE_FINAL_BLUEPRINT in `inputDocuments` + carry `blueprint_canon_alignment` field.
6. **CLAUDE.md Phase status** for Phase 23 reads `7/10 stories shipped` with doctrine canon line added.
7. **No code change** — `git diff` on commit shows zero `src/**` touches (except the gate scaffold file from Developer agent's follow-up, which is a separate commit).
8. **CI green** — `tsc --noEmit` + `lint` + `neteru-coherence.test.ts` + `audit-changelog-coverage` husky hook.

### Sequencing

```
Commit 1 — NEFER doc-sync sweep (1 commit, 10 files) :
  ├─ ADR-0082 amended in-place
  ├─ ADR-0084/0085/0086/0087 created
  ├─ closure-roadmap.md (13→19 targets)
  ├─ prd.md + ux-design-specification.md + architecture.md + epics.md frontmatter sync
  ├─ epics.md Epic 1 Story 1.8 insertion + renumbering
  └─ CLAUDE.md "Phase status" Phase 23 line update

Commit 2 — Developer agent : Story 1.8 implementation (gate scaffold) :
  ├─ src/server/services/mestor/gates/brief-vs-adve-coherence.ts (NEW)
  ├─ src/server/services/mestor/gates/index.ts (registered)
  └─ tests/unit/governance/brief-vs-adve-coherence-scaffold.test.ts (NEW)
```

---

## Section 6 — Open Question (one, ciblée per NEFER §1.1 invariant #4)

**One item is not inferable from blueprint + repo state alone — please confirm**:

The blueprint §2 specifies **8 OS layers**. NEFER memory (`project_lafusee_v3_blueprint.md`) references a previous "5 couches conceptuelles v3" framing. Your original message says "5 couches OS". ADR-0084 must commit to one framing.

**Hypothèse retenue dans cette proposal** : **8 layers OS technique** per blueprint §2 (canonical). The "5 couches conceptuelles" framing was superseded by the v3→canon revision shipped 2026-05-16. ADR-0084 documents the 8 technical layers ; the 5 conceptual layers are not memorialized as a competing ADR (could be a §"Conceptual lens" subsection inside ADR-0084 if you want both framings preserved).

**Si vous confirmez** : ADR-0084 ships as drafted (8 technical layers).
**Si vous corrigez** : ADR-0084 frontmatter + body updated to whatever the canonical framing actually is.

Single question, no other ambiguity blocking. Everything else infers from blueprint + repo + NEFER protocol.

---

## Appendix A — Files touched (canonical list, 11 files)

| # | File | Change type |
|---|------|-------------|
| 1 | `docs/governance/adr/0082-yggdrasil-value-circulation-substrate.md` | amend (2026-05-16 note + §"Gouverneur" rewrite) |
| 2 | `docs/governance/adr/0084-os-architecture-8-canonical-layers.md` | CREATE |
| 3 | `docs/governance/adr/0085-refresh-cascade-stop-at-jehuty.md` | CREATE |
| 4 | `docs/governance/adr/0086-brand-maturity-score-canonical.md` | CREATE |
| 5 | `docs/governance/adr/0087-thot-formula-engine-seshat-zone-indices.md` | CREATE |
| 6 | `_bmad-output/planning-artifacts/closure-roadmap.md` | promote 6 targets (13→19) + remove footer "proposed" + DoD re-baseline |
| 7 | `_bmad-output/planning-artifacts/epics.md` | Epic 1 insert Story 1.8 + renumber 1.8→1.9 + 1.9→1.10 + frontmatter sync |
| 8 | `_bmad-output/planning-artifacts/prd.md` | frontmatter sync + executive summary append |
| 9 | `_bmad-output/planning-artifacts/ux-design-specification.md` | frontmatter sync + introduction append |
| 10 | `_bmad-output/planning-artifacts/architecture.md` | frontmatter sync + `out_of_scope_concepts` line update |
| 11 | `CLAUDE.md` | Phase 23 entry update (`7/10 stories` + doctrine canon line) |

## Appendix B — What this proposal does NOT touch (explicit out-of-scope)

- **Source code** (`src/**`) — Story 1.8 gate scaffold is a separate Developer agent commit
- **Prisma migrations** — none needed
- **LEXICON.md / APOGEE.md / PANTHEON.md** — Yggdrasil entries already canonical (per ADR-0082 §"Documentation propagée" table) ; no Neter change ; no concept addition. (If user disagrees, this is a single line addition per file — can ship in same commit if requested.)
- **BRAINS const / Governor type** — APOGEE cap 7/7 preserved, no Neter change
- **`neteru-coherence.test.ts` + `phase22-*.test.ts` suite** — unchanged
- **RESIDUAL-DEBT.md** — no calendar-locked deferral added (the 6 closure-targets are *new work*, not deferred work)
- **CHANGELOG.md** — entry added by NEFER per P6 commit protocol (not pre-written here)

---

> **Awaiting Alexandre approval. Single blocking question above (Section 6) on 5 vs 8 OS layers framing for ADR-0084. Everything else ready to commit.**
