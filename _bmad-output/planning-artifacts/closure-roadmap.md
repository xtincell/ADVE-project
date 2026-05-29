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

> ⚠️ **Phase-label rebase (2026-05-15).** This ledger originally used "Phase 22" as the
> umbrella label for the post-Phase-21 closure chantier. On 2026-05-15 upstream
> `origin/main` redefined `phase/22` as **"Argos by LaFusée"** (Seshat reference
> harvester + propriété média indépendante — see [REFONTE-PLAN.md Phase 22](../../docs/governance/REFONTE-PLAN.md)).
>
> All 7 affected ledger targets relabeled sequentially **by target-number order**
> (Alexandre direction "fais au mieux", 2026-05-15) :
>
> | Was | Now | Target |
> |---|---|---|
> | Phase 22 | **Phase 23** | #1 — Câblage pivots mission |
> | Phase 22 | **Phase 24** | #2 — Notification stack + multi-pod scale-out |
> | Phase 22 | **Phase 25** | #4 — Brand Tree maturity (N5-bis + N6-bis) |
> | Phase 22 | **Phase 23** | #5 — Overton Radar Cockpit (folded into #1) |
> | Phase 22 | **Phase 26** | #7 — Manipulation drift detector |
> | Phase 22 | **Phase 27** | #8 — Crew Programs Académie |
> | Phase 22 | **Phase 28** | #9 — Anubis ad networks live |
> | Phase 22 | **Phase 29** | #11 — STEP-MAP + palier-transition Intents |
>
> The numbering scheme is purely sequential — dependency reordering can swap numbers
> later without renaming chantiers. Phase 22 is reserved for Argos going forward.

Audit basis: `RESIDUAL-DEBT.md` (690 lines), CLAUDE.md "Phase status", ADRs 0060–0076,
`_bmad-output/project-context.md` (v6.22.8). Compiled by NEFER 2026-05-13.

---

## The 19 closure targets

> **2026-05-16 promotion** — targets #14–19 promoted from "proposed" footer to main table per [sprint-change-proposal-2026-05-16.md](sprint-change-proposal-2026-05-16.md), absorbing the 14 most critical drifts catalogued by [STATE_FINAL_BLUEPRINT §22.1-2](../../docs/governance/STATE_FINAL_BLUEPRINT.md). 4 new ADRs (0084-0087) + 1 amended ADR (0082) shipped same commit. Definition of Done re-baselined accordingly.

| # | Title | Cluster(s) | Neter(s) | Portal(s) | Effort | Mission link | Status | Closure criterion |
|---|---|---|---|---|---|---|---|---|
| **1** ★ | **Phase 23** — Câblage pivots mission (superfans × Overton) MVP→PRODUCTION *(was Phase 22 pre-2026-05-15 rename)* | A + F + G#5 | Seshat · Anubis · Artemis _(Ptah dropped by architecture step-02 — no forge scope in Phase 23)_ | Console · Cockpit | M-L | **Direct** | **SHIPPED** ✓ (2026-05-29) | 6 sub-clusters at MVP/PRODUCTION + Glory tools wired (5 exist) (cf. [ADR-0077](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md) §"Scope reframe") + Tarsis & CRM connectors via Credentials Vault + OvertonRadar consumed by Cockpit route + child ADRs 0077–0081 validated — **all 7 epics closed (53/53 stories)**: Epic 1 Foundations + Epic 2 Connectors + Epic 3 Overton wiring + Epic 4 Superfan measurement + Epic 5 Glory HYBRID + Epic 6 Calibration/lifecycle + Epic 7 Cockpit surface & closure. 7 pivot sub-clusters at lifecycle MVP (PRODUCTION gated on direction calibration sign-off, RESIDUAL-DEBT) ; `phase22-*` HARD tests green incl. `phase22-no-dangling-adr-refs` (0 hits). Cap APOGEE 7/7. _PRD/UX/architecture/epics 2026-05-16 ; shipped 2026-05-29 (commits 5ffe573 → cb2bffc)_ |
| 2 | **Phase 24** — Notification stack production-ready + multi-pod scale-out | B | Anubis · Mestor | cross-portal | M | Chain (ship-blocker) | NOT_STARTED | `web-push`/`firebase-admin`/`mjml` deps installed + NSP Redis pubsub adapter + digest cron wired + MCP outbound rate limiting + typecheck CI green + Lighthouse green |
| 3 | Phase 21 F-A residual — 80 tools `outputSchema` Zod annotation (5 batchs) | C | Artemis · Ptah | none | M (linéaire) | Indirect (LLM quality) | NOT_STARTED | All 56 Glory tools + 24 frameworks annotated; tests G2/G3 promoted to mode HARD (baseline 0); `enrichOracle` legacy deprecation scheduled |
| 4 | **Phase 25** — Brand Tree maturity (N5-bis BIBLE_VAR + N6-bis Glory tool natures) | D | Mestor (governance) | Console (`/console/governance/phase-18-residuals`) | M | Chain (tree-aware Glory tools) | NOT_STARTED | ~300 variable-bible entries reclassified × 9 BrandNature × 3 inheritanceMode; 56 Glory tools annotated `applicableNatures`; entries marked RESOLVED in `phase18ResidualEntry` |
| 5 | **Phase 23** — Overton Radar Cockpit (MISSION.md §5 dérive #5, isolated) *(was Phase 22 pre-2026-05-15 rename)* | G#5 | Seshat (Tarsis) | Cockpit | S-M | **Direct** | NOT_STARTED | `<OvertonRadar>` component shipped — but depends on #1 for non-placebo data. **Folded into #1**; standalone only if #1 is subdivided |
| 6 | Phase 17 closure — promotion DRAFT→STABLE (21 sequences + 24 wrappers) + quality gate soft→hard | E | Artemis | none | S | Indirect (Artemis stability) | **DEFERRED** | 21 sequences + 24 `WRAP-FW-*` wrappers promoted STABLE; quality gate switched HARD. **Calendar-locked**: gate soft→hard target 2026-05-17 (D+4); sequences/wrappers target 2026-06-04 (D+22). Auto-eligible via ADR-0066 cron |
| 7 | **Phase 26** — Manipulation drift detector (MISSION.md §6) + `Strategy.manipulationMix` back-fill | H + G#6 | Seshat · Mestor (gate) | Console | S-M | Direct (anti-drift) | NOT_STARTED | Pre-Phase-9 strategies back-filled (no more `null` manipulationMix); `audit-manipulation-drift.ts` cron flags >20% divergence over >10 actions |
| 8 | **Phase 27** — Crew Programs Académie + matching production (Imhotep Phase 14 residual) | extension | Imhotep | Crew Quarters | L | Direct (étape 2-3) | NOT_STARTED | Académie formation flow live + talent-matching engine in PRODUCTION (not heuristic placeholder) |
| 9 | **Phase 28** — Anubis ad networks live (Meta/Google/X/TikTok via Credentials Vault) | extension | Anubis | Console (vault) | M-L | Chain (étape 4 gravité) | NOT_STARTED | 4 ad network connectors leave `DEFERRED_AWAITING_CREDENTIALS` mock state; real broadcast verified per network |
| 10 | Phase 18-bis — M&A `NodeOwnershipTransfer` + lineage hash-chain + 8 non-PRODUCT archetypes | D (sub-set) | Mestor · Imhotep | Console | XL (3 mois) | Indirect | **DEFERRED** | Trigger-locked: first M&A deal OR first non-FMCG client in 2026 commercial pipeline. Do NOT PRD before trigger fires (ADR-0059 §6) |
| 11 | **Phase 29** — STEP-MAP.md transverse (MISSION #2) + 5 palier-transition Intent kinds (MISSION #3) | G#2 + G#3 | Mestor (governance) | none runtime | S | Doctrine (operator tooling) | NOT_STARTED | `STEP-MAP.md` cross-cuts components by mission sequence step; 5 `PROMOTE_<TIER>_TO_<TIER>` Intent kinds with pre-conditions + Glory sequences |
| 12 | **Phase 22 — Argos by LaFusée** (Seshat reference harvester + propriété média indépendante) | new Seshat sub-domain | Seshat · Mestor · Thot · Anubis (transport) | apps/argos/ + Console (Hunter ops) + Cockpit (Artemis brief consumption) | L (4 sub-phases 22-A0→A3, A4 post-MVP) | Chain (Artemis brief quality + autorité publique La Fusée) | **PLANNED** (vendored, NOT auto-shippable) | Hunter sub-agent ported `src/server/services/seshat/argos/` + `CampaignReferenceDossier` Prisma model + `seshat/references.queryReferences()` consumes Argos DNA + auto-publish `PASS` → `apps/argos/` deployed `argos.lafusee.com` + cross-link landing↔Argos footers live + 3 sources synchronized (REFONTE-PLAN + project-context §27-bis + _nefer-facts §10). Cf. [ADR-0083](../../docs/governance/adr/0083-argos-placement-seshat-yggdrasil-seam.md). **Trigger = demande explicite Alexandre.** |
| 13 | **Phase 30 — Yggdrasil canonization** (substrat de circulation de la valeur, **ungouverné** ; gates appartiennent à Mestor — [ADR-0082](../../docs/governance/adr/0082-yggdrasil-value-circulation-substrate.md) amended 2026-05-16) | substrate (cross-cutting) | none (substrat ungouverné) — Mestor possède les gates ; contributions Seshat/Anubis/Artemis/Ptah/Imhotep/Thot | governance docs + tests | S (doc-first) + S-M (anti-drift test follow-up) | Doctrine (anti-drift narrative + value circulation) | **DOC_SHIPPED 2026-05-15, AMENDED 2026-05-16** ✓ | ADR-0082 accepted + amended (Yggdrasil ungoverned per blueprint §5.2) + LEXICON entry `YGGDRASIL` + PANTHEON §7 Substrats + CLAUDE.md note + APOGEE §4.2 mention + memory NEFER propagée. Follow-up Phase 30-bis : test anti-drift `yggdrasil-three-invariants.test.ts` (soft baseline → HARD après 1 mois stress-test) — pas obligatoire pour la canonization mais doit shipper avant fermeture 100% pour rendre les 3 invariants enforced |
| **14** | **Phase 24 — `BRIEF_VS_ADVE_COHERENCE` gate + 3 ingestion gates** (`PRODUCTION_OUTPUT_VS_BRIEF` + `BROADCAST_VS_AUDIENCE_FIT`) | Governance | Mestor (gate) + Artemis (brief consumer) + Anubis (broadcast surface) | none runtime (Console gate-status dashboard optional) | M | **Direct** (every brief that enters the OS must align with ADVE noyau before any production starts — pivot mécanique au cœur ADVE) | **NOT_STARTED** (Phase 23 Epic 1 Story 1.8 scaffolds the type + handler stub) · Phase 23 Story 1.8 scaffold shipped 2026-05-17 | 4 Mestor gates registered + enforced on `INGEST_BRIEF`-emitting flows + 3 anti-drift HARD tests (one per gate) + RESIDUAL-DEBT entries for any deferred enforcement path. Resolves drifts D-3.1/D-3.2/D-3.3 (blueprint §21.2). |
| **15** | **Phase 24 — Système de score unifié** (`scoring-engine/` agrégant 8 dimensions + `BrandMaturityScore` model + `RECOMPUTE_BRAND_SCORE` Intent + `PALIER_PROMOTION_PROOFS` gate) | Score system | Seshat (computation) + Mestor (gate) | Cockpit (insights badge) + Console (leaderboard) | L | **Direct** (étalonne ZOMBIE→ICONE — pièce maîtresse maturity, débloque palier transitions) | **NOT_STARTED** — canonized 2026-05-16 via [ADR-0086](../../docs/governance/adr/0086-brand-maturity-score-canonical.md) | `scoring-engine/` shipped, 8 dimensions aggregated, score history Prisma model + Intent kind + gate + Cockpit badge + Console leaderboard ; `PALIER_PROMOTION_PROOFS` HARD test green. Resolves drift D-5.8 (blueprint §21.4). |
| **16** | **Phase 24 — Hub-Escrow chantier complet** (Task/Bid/Award/Dispute models + 10 Intent kinds + 7 routes cross-portal + mobile money escrow + commission tiered) | Economic infra | Imhotep (matching) + Thot (escrow + commission + mobile money) + Mestor (dispute arbitrage) + Artemis (delivery QC) | Cockpit + Creator + Console | XL (3 mois) | Chain (étape 4 gravité — l'industrie créative africaine se construit ici) | **NOT_STARTED** | 5 Prisma models (Task/TaskBid/TaskAward/EscrowOperation/Dispute) + 10 Intent kinds + 3 Cockpit routes + 3 Creator routes + 1 Console monitor route + mobile money escrow live (Wave/Orange/MTN/Moov) + commission tiered (20%→8% palier-dégressive). Cf. [STATE_FINAL_BLUEPRINT §16](../../docs/governance/STATE_FINAL_BLUEPRINT.md) chantier complet. |
| **17** | **Phase 25 — Communities Cockpit + Personal Brand Cockpit UI** (6 routes Communities + 6 routes Personal + 8 new components + 3 new Prisma models Personal) | Cockpit surfaces | Anubis (broadcast segments from community view) + Artemis (Personal Brand Glory tools — exists 5) | Cockpit (founder primary) | L | **Direct** (founder sees community + persona — concrete superfan-lineage proof) | **NOT_STARTED** | `/cockpit/community/*` 6 routes consuming existing backend ✅ + `/cockpit/personal/*` 6 routes consuming partial backend + 3 new Prisma models (`Drop`, `BrandDeal`, `FanEconomy`) + 8 new Tier 3 components. Cf. blueprint §17 + §18 chantiers complets. Resolves drifts D-7.1/D-7.2. |
| **18** | **Phase 26 — Architecture économique runtime** (Seshat zone-indices module 7 families + 6 Thot calculators + `ai-cost-tracker/`) | Economic engine | Seshat (zone-indices) + Thot (formula engine + ai-cost-tracker) + Hunter (📋 économique source TJM/marketing budgets) | Console (operator zone-index config) + Cockpit (transparent breakdown) | XL | Chain (pricing scaling to UEMOA+CEMAC needs zone-aware runtime) | **NOT_STARTED** — canonized 2026-05-16 via [ADR-0087](../../docs/governance/adr/0087-thot-formula-engine-seshat-zone-indices.md) | `seshat/zone-indices/` 7 sub-modules + 6 missing Thot calculators + `ai-cost-tracker/` service + `no-hardcoded-fcfa.test.ts` HARD test green + Console `/console/socle/economic-runtime/` operator UI. Resolves drifts D-5.4 + D-5.3 + D-2.3 (blueprint §21.4 + §21.1). |
| **19** | **Phase 25 — `financial-brain/` → `thot/` rename + `MANIPULATION_COHERENCE` consumption** | Naming + gate activation | Thot (rename) + Artemis (Glory tools consume `manipulationMode`) | none runtime (governance) | M | Indirect (governance maintenance) but unblocks doctrine "tout via Mestor + manipulation match" | **NOT_STARTED** | 50-80 file rename + import updates + ADR (D-5.1 closure) + 56 Glory tools `promptTemplate` consume `manipulationMode` (D-4.5 critical fix — currently 0/56) + anti-drift `manipulation-consumed.test.ts` HARD baseline. Resolves drifts D-5.1 + D-4.5. |

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

### Condition 1 — All 19 targets resolved
Every target in the table above is `SHIPPED` **or** `WONT_DO` (with written justification)
**or** `DEFERRED` *with an un-fired trigger* (targets #6 and #10 only — once their trigger
fires they must move to `SHIPPED`/`IN_DEV`, they cannot stay DEFERRED indefinitely).
Target #13 (Phase 30 Yggdrasil canon) is `DOC_SHIPPED` — counts as resolved for Condition 1
once its anti-drift test follow-up lands (Phase 30-bis). Targets #14-19 promoted 2026-05-16
from STATE_FINAL_BLUEPRINT §22.1-2 priority chantiers ; each canonized by an ADR (0084-0087
for #15/#18 ; ADR creation deferred to each target's implementation Phase for #14/#16/#17/#19).

### Condition 1-bis — Substrats canonisés + ADR coverage
Tous les substrats nommés (Yggdrasil, NSP, layering cascade) ont une ADR canon + une
entrée LEXICON + une mention PANTHEON §7 + un gouverneur de référence. Tous les
sub-agents nommés (Hunter, NEFER, Tarsis weak-signal-analyzer, Notoria) ont leur
rôle déclaré dans PANTHEON §7. Aucun concept canon ne flotte ungouverned. **Status
2026-05-15 : ✓** (Yggdrasil + NSP + layering tous canonisés ; sub-agents tous nommés).

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

## Final state of the system — `STATE_COMPLETE_v1` (defined 2026-05-15)

This is the **explicit terminal state** the project converges toward. When the state matches, the project is functionally 100% and the closure-roadmap is closed. Every condition is checkable, none is a feeling.

### F1 — Closure-roadmap ledger
- All 13 targets `SHIPPED` / `WONT_DO` / `DEFERRED-with-unfired-trigger` (Conditions 1 + 1-bis green).
- Target #13 (Yggdrasil) Phase 30-bis test in HARD mode green.
- No new closure-roadmap target opened without an ADR — the ledger is closed-set.

### F2 — Mission ledger
- MISSION.md §9 ledger 6/6 checkboxes checked (Condition 2 green).
- Mission-drift CI detector green on 100% of units (last checkbox).

### F3 — Weighted score
- `Coverage×0.15 + Framework×0.30 + Governance×0.30 + Mission×0.25 = 100`.
- Re-baseline of Governance rubric shipped (target #11 deliverable).

### F4 — Substrats + sub-agents canon
- 3 substrats canonisés (Yggdrasil, NSP, layering cascade) — chacun avec ADR + LEXICON entry + PANTHEON §7 row + gouverneur de référence.
- Tous les sub-agents nommés (Hunter, NEFER, Tarsis weak-signal-analyzer, Notoria…) ont leur rôle déclaré dans PANTHEON §7.
- 0 concept canon flottant ungouverned.

### F5 — APOGEE cap
- `BRAINS` const reste 7/7. Aucun 8ème Neter sans ADR superseder.
- Anti-drift test `neteru-coherence.test.ts` green.

### F6 — Anti-drift CI couverture
- `yggdrasil-three-invariants.test.ts` HARD mode green.
- `assembler-uses-manual-path.test.ts` HARD mode green (Phase 21 closure).
- `phase22-*.test.ts` Phase 23 family HARD mode green (Phase 23 closure).
- `campaign-tracker-coherence.test.ts` + `neteru-coherence.test.ts` + `audit-pantheon-completeness.ts` green.
- Pas d'anti-drift en mode soft baseline non-zero — toute baseline doit avoir une date de durcissement calendar-locked.

### F7 — Sources de vérité synchronisées (NEFER §1)
- BRAINS / Governor / LEXICON / APOGEE / PANTHEON / CODE-MAP / CLAUDE.md cohérents — `neteru-coherence.test.ts` green sur chaque PR.
- CHANGELOG.md couvre les 10 derniers commits (audit-changelog-coverage husky hook green).
- CLAUDE.md "Stack" reflète `package.json` réel (no version drift).

### F8 — Argos shipped end-to-end
- `apps/argos/` déployé sur `argos.lafusee.com` (UI vendorisée tel quel).
- `src/server/services/seshat/argos/` actif (Hunter sub-agent via LLM Gateway + Mestor + Thot + NSP).
- `CampaignReferenceDossier` model en Prisma. Auto-publish on PASS verdict opérationnel.
- Cross-links bilatéraux landing↔Argos sans marker "(bientôt)".

### F9 — Phase 23 pivot mechanics shipped end-to-end
- 6 sub-clusters pivots à MVP/PRODUCTION (PRODUCTION gated on direction calibration review).
- 2 connector façades Tarsis API + CRM live (or `DEFERRED_AWAITING_CREDENTIALS` honest).
- `<OvertonRadar>` consommé par `/cockpit/intelligence/overton` avec real signal ou degraded state.
- 5 child ADRs 0077-0081 acceptés.

### F10 — Doctrine prevention drift installée
- Commitlint enum couvre tous les Neteru actifs (ptah/imhotep/anubis/apogee ajoutés — chantier hors closure-roadmap, mais préalable à F7).
- Pré-commit hook regen CODE-MAP green.
- Phase-label collision detector (preventif — ce qu'on aurait voulu pour la collision Phase 22 → Argos 2026-05-15) : si une PR introduit un `phase_label` déjà actif sur un autre chantier, le commit échoue. **Note** : ce hook n'existe pas encore — drift-prevention chantier séparé.

---

## Plan d'atteinte — séquence par étages (priorité × dépendances)

L'ordre suivant minimise les blocages mutuels et maximise la valeur livrée par étage.

### Étage 1 — Implementation immediate (sans bloqueurs)
1. **Phase 23 (target #1)** — épics & stories puis implementation. PRD + UX + architecture déjà livrés. Étape suivante immédiate.
2. **Phase 30-bis** — anti-drift test `yggdrasil-three-invariants.test.ts` (soft baseline → HARD 1 mois). Très petit chantier, indépendant.

### Étage 2 — Chantiers parallélisables (peuvent shipper en parallèle de l'étage 1)
3. **Phase 25 (target #4)** — Brand Tree N5-bis + N6-bis. Glory tool `applicableNatures` annotation accélère la qualité Phase 23 si elle landit en parallèle.
4. **Phase 26 (target #7)** — Manipulation drift detector. Petit chantier doctrine, peu de dépendances.
5. **Phase 29 (target #11)** — STEP-MAP + palier-transition Intents. Doctrine, peu de surface code.
6. **Drift-prevention chantier** (hors closure-roadmap, prérequis F7/F10) — commitlint enum complet + phase-label collision hook.

### Étage 3 — Trigger-dependent
7. **Phase 22 (target #12) — Argos** — trigger = demande explicite Alexandre. Quand le trigger fire, suit la séquence 22-A0 → A4.
8. **Phase 17 closure (target #6)** — calendar-locked 2026-05-17 (gate soft→hard) + 2026-06-04 (sequences/wrappers).

### Étage 4 — Heavy / vendor-gated
9. **Phase 24 (target #2)** — Notification stack production + multi-pod. Requires deps install + Redis adapter + cron config.
10. **Phase 28 (target #9)** — Anubis ad networks live. Vendor-gated (Meta/Google/X/TikTok contracts).
11. **Phase 27 (target #8)** — Crew Programs Académie. Largest effort (L).

### Étage 5 — Trigger-locked indéfini
12. **Phase 18-bis (target #10)** — M&A + 8 non-PRODUCT archetypes. Trigger = first M&A deal OR first non-FMCG client. **Ne PAS PRD avant trigger.**

### Étage finalization
13. **Re-baseline Governance rubric** (target #11 deliverable) — sort la 5-points gap.
14. **Mission §9 ledger 6/6** — chaque checkbox correspond à un livrable de l'un des étages ci-dessus, mais leur consolidation finale est un audit dédié.

Une fois F1-F10 satisfaits → `STATE_COMPLETE_v1`. Le projet est fonctionnellement 100%.

---

## 📜 STATE_FINAL_BLUEPRINT shipped 2026-05-16 — référence canon absolue

[docs/governance/STATE_FINAL_BLUEPRINT.md](../../docs/governance/STATE_FINAL_BLUEPRINT.md) est désormais la **source de vérité absolue** de La Fusée. 22 sections + 30 drifts cataloguées par couche OS + roadmap Phase 24-30 priorisée. Ce blueprint est **PRÉCONISÉ EN LECTURE OBLIGATOIRE** avant toute action sur le repo (intégré dans `_bmad/custom/_nefer-facts.md §11`).

### ✅ 6 nouvelles cibles closure-roadmap promues 2026-05-16 (#14-19 ci-dessus)

Approuvées par Alexandre 2026-05-16 via [sprint-change-proposal-2026-05-16.md](sprint-change-proposal-2026-05-16.md). La closure-roadmap passe de **13 → 19 targets**. Les 6 chantiers structurants absents de la closure-roadmap pré-blueprint sont désormais dans la table principale :

| # | Titre | Phase | Canonized via |
|---|---|---|---|
| **14** | BRIEF_VS_ADVE_COHERENCE gate + 3 gates ingestion (D-3.1/3.2/3.3) | Phase 24 (Phase 23 Story 1.8 scaffold) | impl-Phase ADR |
| **15** | Système de score unifié | Phase 24 | [ADR-0086](../../docs/governance/adr/0086-brand-maturity-score-canonical.md) |
| **16** | Hub-Escrow chantier complet | Phase 24 | impl-Phase ADR |
| **17** | Communities + Personal Brand Cockpit UI | Phase 25 | impl-Phase ADR |
| **18** | Architecture économique runtime (Thot formula + zone-indices) | Phase 26 | [ADR-0087](../../docs/governance/adr/0087-thot-formula-engine-seshat-zone-indices.md) |
| **19** | `financial-brain/` → `thot/` rename + MANIPULATION_COHERENCE consumption | Phase 25 | impl-Phase ADR |

**Absorbés dans cibles existantes / nouvelles ADRs** (pas de nouvelle cible nécessaire) :
- Hunter scope économique étendu → cible #12 (Phase 22 Argos)
- ADR 8 couches OS → shipped 2026-05-16 [ADR-0084](../../docs/governance/adr/0084-os-architecture-8-canonical-layers.md)
- ADR cascade refresh STOP at Jehuty → shipped 2026-05-16 [ADR-0085](../../docs/governance/adr/0085-refresh-cascade-stop-at-jehuty.md)
- ADR-0082 Yggdrasil ungoverned amendment → shipped 2026-05-16
- LLM allowance/overage → cible #2 (Phase 24 Notification + LLM budget) + cible #18 (`ai-cost-tracker/`)

---

## Étape suivante — `/bmad-create-epics-and-stories` sur Phase 23

L'étape immédiate, déterministe, qui débloque l'étage 1 :

**Lancer `/bmad-create-epics-and-stories`** contre le trio Phase 23 :
- [PRD](prd.md) — 35 FRs / 14 NFRs / 4 journeys, frontmatter phase/23 locked
- [UX spec](ux-design-specification.md) — phase/23 locked
- [architecture.md](architecture.md) — 9 décisions D1-D9 + 7 patterns P22-1..7 + 5 child ADRs réservés 0077-0081

L'épic breakdown doit refléter la séquence dependency-ordered de l'architecture's Decision Impact Analysis :
1. ADR-0077 (parent/closure) + PRD correction note — épic governance
2. `src/domain/connector-result.ts` (P22-1) — épic foundations
3. 2 connector façades (Tarsis + CRM) — épic connectors
4. Delegation sector-intelligence (D2) — épic overton-wiring
5. CRM wiring + attribution calibration logic — épic superfan-wiring
6. Lifecycle + calibration Intent kinds — épic governance-intents
7. Manual-first UI paths + `applicableNatures` — épic glory-tools-hybrid
8. Cockpit route + Console panel — épic frontend
9. Anti-drift test extensions — épic ci-coverage

Aucun bloqueur amont. Décision Alexandre attendue : 🟢 "go" sur `/bmad-create-epics-and-stories` ou 🟡 redirect vers un autre étage 1/2 chantier.

---

## How this ledger stays alive

- **Every `bmad-*` workflow** scans `planning_artifacts/**` at init → loads this file as context automatically.
- **Every PRD** updates its target's `Status` column when it reaches `step-12-complete` (NOT_STARTED → PRD_DRAFTED).
- **Every shipped chantier** updates Status → SHIPPED + adds the closing commit/PR ref.
- **NEFER memory** `project_closure_roadmap.md` points here — every Claude Code session on this repo is aware of it, not just BMad ones.
- When a `DEFERRED` trigger fires (M&A deal for #10, calendar date for #6), the target moves to `NOT_STARTED`/`IN_DEV` and gets a PRD.

_2026-05-29 by NEFER (autopilot) — **target #1 SHIPPED.** Phase 23 (Câblage pivots mission — superfans × Overton) closed end-to-end : 7 epics / 53 stories. Epic 7 (Cockpit Overton surface + closure) landed the founder-facing `<OvertonRadar>` wired to `ConnectorResult<OvertonRadarSignal>` (`cockpitDashboard.overtonSignal`), the `/cockpit/intelligence/overton` route + dashboard teaser + Intelligence nav, retired the 5 phantom ADR slugs (HARD `phase22-no-dangling-adr-refs` 0 hits), finalized ADRs 0077-0081 Accepted, and the a11y/visual spec. 7 pivot sub-clusters at lifecycle MVP. PRODUCTION promotion + MISSION §9 checkbox flips + Playwright baselines/axe-dep remain Growth-phase (RESIDUAL-DEBT Phase 23 closure). Cap APOGEE 7/7. Closure-roadmap : **1/19 SHIPPED** (target #13 DOC_SHIPPED). Mission weighted-score component progresses 98 → toward 100 once direction signs off the calibration thresholds._
_2026-05-16 by NEFER — **STATE_FINAL_BLUEPRINT.md livré** dans `docs/governance/`. Doctrine canon absolue 22 sections + 30 drifts cataloguées par couche OS + roadmap Phase 24-30 priorisée. Référence intégrée dans `_bmad/custom/_nefer-facts.md §11` — toute persona BMAD doit s'y référer comme source de vérité primaire. 6 nouvelles cibles closure-roadmap proposées (#14-19) en attente validation Alexandre. Doctrine pricing recalibrée FCFA + product ladder capture-then-grow + cumulativité multi-rôle + commission tiered Creator + LLM overage transparent. Système de score multi-dimensions (8 dimensions canoniques) formalisé comme pièce maîtresse Phase 24._
_2026-05-15 (much later, after Argos canon work) by NEFER — **Yggdrasil canonization + Argos placement + final state defined.** ADR-0082 (Yggdrasil substrate, gouverné par Mestor) + ADR-0083 (Argos placement Seshat sub-domain + Hunter sub-agent + Yggdrasil seam) accepted. Targets #12 (Argos Phase 22) + #13 (Yggdrasil Phase 30) ajoutés au ledger (passe de 11 à 13 targets). LEXICON + PANTHEON §7 Substrats + CLAUDE.md propagated. Final state `STATE_COMPLETE_v1` défini (10 conditions F1-F10) + plan d'atteinte par étages + étape suivante = `/bmad-create-epics-and-stories` Phase 23. Cap APOGEE 7/7 préservé. Aucun concept canon ungouverned restant._
_2026-05-15 (later, post-rebase) by NEFER — **Phase relabel correction.** Upstream redefined `phase/22` as Argos (commits `82acd53` / `4f001a4` / `28dbb95`, landed during the architecture session). Target #1 + #5 relabeled **Phase 22 → Phase 23** in this ledger and across all planning artifacts (architecture.md, prd.md, ux-design-specification.md, implementation-readiness-report). The other six "Phase 22" targets (#2/#4/#7/#8/#9/#11) await Alexandre's renumbering decision. See header collision flag._
_Last updated: 2026-05-15 by NEFER — target #1 architecture completed via `/bmad-create-architecture` (steps 01→08): [architecture.md](architecture.md). Status stays PRD_DRAFTED (architecture is a downstream planning artifact; no code shipped). Headline finding: PRD `chosen_target.code_map_grep` was stale — `<OvertonRadar>`, `sector-intelligence/` service, the 5 measurement Glory tools (`phase19-tools.ts`), and all 6 pivot sub-clusters already exist. Architecture absorbed the correction in D1: Phase 23's real surface is wiring + 2 connector façades + 1 lifecycle Intent + ML calibration + 1 Cockpit route, not "create everything." UX spec's "1 net-new component" claim and PRD's `scope_summary` need a follow-up correction note (tracked as the implementation epic's first governance task)._
_2026-05-14: target #1 UX design specification completed via `/bmad-create-ux-design` (steps 01→14): [ux-design-specification.md](ux-design-specification.md) + [ux-design-directions.html](ux-design-directions.html). Closes the "UX NOT_FOUND" finding of the implementation-readiness report. Status stays PRD_DRAFTED (UX spec is a downstream planning artifact; no code shipped). Net-new UX scope: 1 component `<OvertonRadar>` + 1 route `/cockpit/intelligence/overton` + 1 `cockpitNavGroups` entry._
_2026-05-14: target #1 PRD completed via `/bmad-create-prd` (steps 01→12), status NOT_STARTED → PRD_DRAFTED._
_2026-05-13: initial compilation, target #1 locked as active PRD._
