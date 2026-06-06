# ANNEXE C — Registre des ADR & tests anti-drift de la refonte

## C.1 — ADR à créer (un par cible neuve, avant dev — ledger closed-set)

| ADR | Sujet | Chantier |
|-----|-------|----------|
| **0088** | PilotingRegime as first-class delegation entity | E1 |
| **0089** | EFR contract + Constat d'Altitude + ICP | C1 |
| **0090** | Cross-brand signal pool consent & data residency | C2 |
| **0091** | First-run activation J0-J7 | C3 |
| **0092** | Per-deliverable SLA matrix & penalties | C4 |
| **0093** | Agency meta-EFR & fleet KPIs (méta-isomorphisme = OUI) | C7 |
| **0094** | Brownfield import & per-brand regime | C8 |
| **0095** | Asset IP matrix & contract template | C9 |

## C.2 — ADR à amender

| ADR | Amendement |
|-----|-----------|
| 0082 | Yggdrasil → la Sève (titre + corps) — R6 |
| 0083 | Argos sub-domain → Per-Ankh ; Hunter → Wepwawet — R4/R5 |
| 0085 | « refresh-cascade-stop-at-jehuty » → « -notoria » — R5 |
| 0023 | OPERATOR_AMEND_PILLAR : politique de re-forge par mode + versioning — C5 |
| 0086 | enum Palier en LATENT (post-R7) — E2 |

## C.3 — Tests anti-drift (créer / muter) — mode cible HARD avant merge (L4)

| Test | Mode | Chantier | Garde |
|------|------|----------|-------|
| `neteru-coherence.test.ts` (muté) | HARD | A | 7 sources en v3.3 |
| `no-legacy-neter-symbol.test.ts` | soft→HARD | A | zéro symbole Classe S legacy |
| `wire-alias-completeness.test.ts` | HARD | A | alias Classe P complets & valides |
| `no-orphan-wire-read.test.ts` | soft→HARD | A | lectures governor/kind/palier via `normalize*()` |
| `palier-latent.test.ts` | HARD | R7 | `BRAND_LEVELS[0]==="LATENT"` |
| `piloting-regime-floor.test.ts` | HARD | E1 | autonomie ne franchit pas le plancher ADVE |
| `palier-promotion-proofs.test.ts` | HARD | E2 | promotion exige score ≥ seuil |
| `no-hardcoded-fcfa.test.ts` | soft→HARD | E3 | pas de grille FCFA statique |
| `cockpit-no-formula-leak.test.ts` | HARD | E3 | Cockpit n'expose pas la formule |
| `efr-recourse-mechanical.test.ts` | HARD | C1 | recours = f(état × ICP) |
| `signal-pool-gate.test.ts` | HARD | C2 | pas de remontée sans opt-in + k≥5 |
| `no-pii-onchain.test.ts` | HARD | C2 | hash-chain = empreintes only |
| `seve-three-invariants.test.ts` | soft→HARD | R6 | Q1/Q2/Q3 de la Sève |

Inchangés à garder verts : `assembler-uses-manual-path` (manual-first), suite `tests/unit/governance/*`.

## C.4 — Ancrage closure-roadmap (cibles à ouvrir)

| Cible | Couvre | Note |
|-------|--------|------|
| #15 (exist.) | E2 | déjà au ledger (Phase 24) |
| #18 (exist.) | E3 + C6 | déjà au ledger (Phase 26) |
| #19 (exist.) | R8 | déjà au ledger (Phase 25) |
| **#20** | Chantier A (R1-R7) | à ouvrir + ADR (renommage) |
| **#21** | E1 | ADR-0088 |
| **#22** | C1 + C3 + C4 | ADR-0089/0091/0092 |
| **#23** | C2 + C9 | ADR-0090/0095 |
| **#24** | C7 + C8 | ADR-0093/0094 |

> **Note.** Ouvrir ces cibles dans `closure-roadmap.md` est une **mutation du ledger opérateur** —
> à faire sur décision explicite (option (b) proposée), pas unilatéralement dans ce cahier.

## C.5 — Frictions transverses (récap)

- **F-1 / F-C1a** — instrumentation trace (reco suivie/ignorée, refus motivé/muet) = prérequis ICP (E1→C1).
- **F-PTAH** — aucun `governor: "PTAH"` dans `intent-kinds.ts` : à investiguer (hors renommage).
- **F-B** — auditer la persistance des 139 `id` Glory / 57 `key` sequence avant R2.
- **F-E1** — labels exacts des 5 crans (Pont de commande, hors repo).
- **F-C2c** — audit PII-on-chain avant d'affirmer la conformité effacement.
- **F-infra** — résidence souveraine réelle + sources d'indices (E3/C2) = décisions d'hébergement hors doctrine.
