# ADR-0019 — Imhotep full activation (Crew Programs Ground #6)

**Date** : 2026-05-01
**Statut** : Accepted
**Phase** : 14 (sprint Imhotep + Anubis full activation)
**Supersedes** : [ADR-0017](0017-imhotep-partial-pre-reserve-oracle-only.md) (Oracle-only stub)
**Lien d'origine** : [ADR-0010](0010-neter-imhotep-crew.md) (pré-réserve initiale)

## Contexte

ADR-0017 (Phase 13) avait livré une sortie partielle d'Imhotep limitée à un placeholder Oracle-only (handler 31 lignes). L'opérateur (user) a signalé que cette sortie partielle n'était **pas** ce qui avait été demandé : le scope attendu était le **full service** Imhotep tel que prévu par ADR-0010 (matching talent, crew composition, formation Académie, qc-router).

ADR-0017 est donc révoqué et remplacé par cet ADR qui acte l'activation complète Phase 14.

## Décision

**Imhotep devient le 6ème Neter ACTIF** dans le panthéon. Cap APOGEE reste 7 (Anubis active simultanément en Phase 15 via ADR-0020).

### Architecture — Imhotep est un orchestrateur

Imhotep ne re-crée pas les services satellites existants — il les **wrappe** sous une gouvernance unifiée :

| Service satellite existant | Rôle wrappé par Imhotep |
|---|---|
| `talent-engine` (262 lignes) | Évaluation tier creator, devotion footprint |
| `matching-engine` (617 lignes) | Matching talent ↔ mission |
| `team-allocator` (434 lignes) | Composition d'équipe multi-rôles |
| `tier-evaluator` (105 lignes) | Promotion/démotion tier (APPRENTI → SENIOR → MASTER) |
| `qc-router` (584 lignes) | Routing reviews qualité, escalation |

### Périmètre code

**Service `src/server/services/imhotep/`** (orchestrateur) :
- `manifest.ts` — Capability declared : `matchTalentToMission`, `assembleCrew`, `evaluateTier`, `enrollFormation`, `certifyTalent`, `qcDeliverable`, `recommendFormation`, `draftCrewProgram`
- `index.ts` — handlers qui dispatchent vers services satellites + persistance audit
- `types.ts` — payloads & results étendus (kept compat ADR-0017 stub types pour transition)

**Prisma — réuse strict de l'existant** (anti-doublon NEFER §3) :
- `TalentProfile` (existant) — pas de model `Talent` séparé
- `TalentCertification` (existant) — pas de `Certification`
- `TalentReview` (existant) — pas de `QcReview`
- `Course` + `Enrollment` (existant) — pas de `Formation` séparée, `AcademieEnrollment` = `Enrollment`
- `Mission` + `MissionDeliverable` (existant) — pas de `MissionAssignment`, `Mission.assigneeId` couvre
- `Membership`, `GuildOrganization`, `Driver` (existants)

→ **0 nouveau model Prisma**. Imhotep agit sur l'existant.

**Intent kinds** (~7 nouveaux + 1 conservé) :
- `IMHOTEP_DRAFT_CREW_PROGRAM` (existant — conservé pour Oracle dormant section devenue active)
- `IMHOTEP_MATCH_TALENT_TO_MISSION`
- `IMHOTEP_ASSEMBLE_CREW`
- `IMHOTEP_EVALUATE_TIER`
- `IMHOTEP_ENROLL_FORMATION`
- `IMHOTEP_CERTIFY_TALENT`
- `IMHOTEP_QC_DELIVERABLE`
- `IMHOTEP_RECOMMEND_FORMATION`

**Glory tools** (4 nouveaux) :
- `crew-matcher` (LLM) — ranke talent candidats vs mission brief
- `talent-evaluator` (HYBRID — CALC + LLM) — évalue tier promotion readiness
- `formation-recommender` (LLM) — propose parcours formation pour combler gap skills
- `qc-evaluator` (LLM) — review qualité deliverable + scoring

**Sequences** (2 nouvelles) :
- `IMHOTEP-CREW-ASSEMBLY` — DRAFT_CREW_PROGRAM → MATCH_TALENT → ASSEMBLE_CREW
- `IMHOTEP-FORMATION-PATH` — EVALUATE_TIER → RECOMMEND_FORMATION → ENROLL_FORMATION

**tRPC router** : `src/server/trpc/routers/imhotep.ts` (NEW) — wrappe les Intent kinds via `governedProcedure`.

**Pages UI** : pas de nouvelle deck Console. Wirage des **pages existantes** :
- `console/arene/matching/page.tsx` — ajoute Intent dispatch via Imhotep
- `console/arene/club/page.tsx`, `orgs/page.tsx`, `guild/page.tsx`, `events/page.tsx` — restent fonctionnelles
- `console/academie/{boutique,certifications,content,courses}/page.tsx` — wirées via Intent kinds Imhotep
- `console/arene/academie/*` — duplicate déjà existant, hors scope refactor (tracked dans REFONTE-PLAN comme dette)
- **Nouvelle page hub** `console/imhotep/page.tsx` — dashboard agrégé (matching pipeline, formation avancement, QC backlog)

### BRAINS const

`src/server/governance/manifest.ts:23` — IMHOTEP est déjà dans la const (Phase 13). Pas de changement structurel ; le statut narratif passe de "pré-réservé" à "actif".

### Manifest registration

Le registry de services Mestor doit désormais importer `imhotep/manifest.ts` (Phase 13 ne l'importait pas — ADR-0017 explicitly excluait). Test `manifest-core-import.test.ts` à mettre à jour.

## Conséquences

### Positives

- **Crew Programs sub-system (Ground #6) actif** — premier sous-système Ground Tier complètement gouverné
- **Aucun doublon créé** — orchestrateur sur services satellites existants, conformément à interdit n°1 NEFER
- **Section Oracle `imhotep-crew-program-dormant`** devient ACTIVE (Tier `CORE` au lieu de `DORMANT`) — l'enrichment via Glory tools Imhotep est désormais real
- **Devotion footprint** (`Creator.devotionFootprint`) enfin exploité par Imhotep matching (champ existait depuis Phase 9 sans consumer)

### Négatives

- Sprint Phase 14 multi-PR (~5-12 jours code estimés)
- Update test `oracle-imhotep-anubis-stubs-phase13.test.ts` : assertion "≤ 3 fichiers" doit être retirée (le service va contenir ~10 fichiers)
- ADRs 0010 + 0017 + 0019 forment une trilogie qui doit être lue ensemble pour comprendre l'historique

## Tests bloquants

- `tests/unit/governance/imhotep-anubis-full-activation.test.ts` (NEW Phase D) :
  - `imhotep/manifest.ts` exporte capability `matchTalentToMission`
  - 7 nouveaux Intent kinds présents dans `intent-kinds.ts`
  - SLOs déclarés pour les 7 nouveaux kinds
  - Glory tools `crew-matcher`, `talent-evaluator`, `formation-recommender`, `qc-evaluator` présents dans registry
  - Manifest core importe `imhotep/manifest.ts`
- `tests/unit/governance/oracle-imhotep-anubis-stubs-phase13.test.ts` :
  - Assertion ≤ 3 fichiers retirée (transition documentée dans le test header)

## Liens

- [ADR-0010](0010-neter-imhotep-crew.md) — pré-réserve initiale (toujours valide pour la mythologie)
- [ADR-0017](0017-imhotep-partial-pre-reserve-oracle-only.md) — Superseded by this ADR
- [ADR-0020](0020-anubis-full-activation.md) — Anubis activation jumelle Phase 15
- [ADR-0021](0021-external-credentials-vault.md) — pattern back-office credentials (utilisé par Anubis, pas Imhotep)
- [PANTHEON.md](../PANTHEON.md) — statut Imhotep "actif"
- `src/server/services/imhotep/` — implémentation Phase 14
