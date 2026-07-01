# ADR-0052-E-crew — Crew performance scoring grille 12 dimensions

**Date** : 2026-05-06
**Statut** : Accepted (implemented — crew-performance-evaluator HYBRID, Phase 23 Epic 5 ; grille déterministe + LLM optionnel)
**Note de décision (2026-06-12)** : Décision actée 2026-06-12 : le scoring crew est HYBRID avec outputSchema Zod et parité manuelle structurelle (phase22-glory-hybrid HARD test).
**Phase** : 19 — Campaign tracker Cluster E promotion
**Parent** : ADR-0052 v2 Cluster E — Boucles d'apprentissage
**Glory tool** : `crew-performance-evaluator` (déjà déclaré [PHASE19_TOOLS](../../../src/server/services/artemis/tools/phase19-tools.ts))

## Contexte

Vague 3 a shippé `learnings.crewLoop` en mode `PARTIAL/MVP` avec score uniforme 50 par dimension + tier `HOLD` par défaut. La promotion `MVP → PRODUCTION` exige une grille canonique 12 dimensions.

## Décision

Canoniser les 12 dimensions canoniques dans variable-bible Imhotep + activer le Glory tool `crew-performance-evaluator`.

### §1 — Grille canonique 12 dimensions

| # | Dimension | Définition | Évidence |
|---|---|---|---|
| 1 | `deliverable_quality` | Qualité finale du livrable vs brief + brand guidelines | BAT signé, feedback opérateur, audit DC |
| 2 | `deadline_respect` | Respect des deadlines milestones | CampaignMilestone.completedAt vs dueDate |
| 3 | `team_collaboration` | Capacité à travailler avec autres rôles équipe | 360° feedback, conflits documentés |
| 4 | `client_communication` | Clarté + proactivité avec le founder/client | logs CampaignApproval, comm récurrente |
| 5 | `creative_originality` | Niveau d'originalité créative vs benchmarks sector | bigIdeaCoherenceScore + jury créatif |
| 6 | `strategic_alignment` | Alignement avec ADVE/RTIS pillars + Manifesto | manifestoBeliefsHit % du livrable |
| 7 | `technical_execution` | Maîtrise des specs techniques (formats, contraintes) | nb retakes BAT, qualité technique audit |
| 8 | `issue_resolution` | Capacité à résoudre les blockers en autonomie | logs CampaignDependency, escalations |
| 9 | `documentation` | Documentation des décisions + briefs | présence de briefs structurés, audit trail |
| 10 | `cost_discipline` | Respect du budget alloué | CampaignAction.budget réalisé vs prévu |
| 11 | `innovation` | Apports proactifs hors brief (idées, formats) | features non-briefed, références tools |
| 12 | `ownership` | Engagement + responsabilité bout-en-bout | sortie escalations, accountability |

### §2 — Scoring rules

- Chaque dimension scorée 0..100 par Glory tool LLM `crew-performance-evaluator`
- Composite = moyenne pondérée (poids initial uniforme = 1/12 chaque dimension ; calibration future via régression)
- Tier recommendation rule (canon) :
  - `composite >= 75` AND `min(byDimension) >= 50` → `PROMOTE`
  - `composite < 40` OR `min(byDimension) < 25` → `DEMOTE`
  - sinon → `HOLD`

### §3 — Skill gaps + recommended courses

Pour chaque dimension `< 50`, le Glory tool ajoute à `skillGaps[]`. Ensuite, mapper auto vers courses Académie via `Course.skillTags[]` (existant Imhotep). Top 3 retournés.

### §4 — Variable-bible canonical entry

Dans `VARIABLE-BIBLE-CANON.md` (BIBLE_CREW à créer ou BIBLE_GROUND) :

```ts
crewPerformanceDimensions: {
  description: "12 dimensions canoniques de scoring CrewPerformance (ADR-0052-E-crew)",
  format: "{ id, definition, evidenceSource, weight }[]",
  values: [
    { id: "deliverable_quality", weight: 1/12, evidenceSource: "BAT + audit DC" },
    // ... 11 autres
  ]
}
```

### §5 — Quality gate de promotion

`MVP → PRODUCTION` admis quand :
1. Grille 12 dimensions validée par direction (opérateur user)
2. Glory tool `crew-performance-evaluator` testé sur 5 crew members historiques
3. Mapping `skillGaps → courses` câblé (Imhotep API existe ou ADR enfant supplémentaire)

## Conséquences

### Positives
- Décision tier (PROMOTE/HOLD/DEMOTE) reposable sur evidence (pas opinion)
- Recommended courses pertinentes (pas catalogue brut)
- Anti-favoritisme (scoring objectif sur 12 dimensions)

### Négatives
- 12 dimensions à scorer par Glory tool LLM = coût $0.05 × N team members par campagne
- Risque biais LLM sur certains profils (à tester empiriquement)
- Calibration des poids (1/12 uniforme) pourrait évoluer — ADR mute-able

## Open work
- Variable-bible : entrée canonique `crewPerformanceDimensions`
- Mapping `skillGaps → courses` : voir si Imhotep `recommendFormation` Intent peut être chaîné après `EVALUATE_CREW_PERFORMANCE`
- Test : `tests/integration/campaign-tracker/crew-scoring.test.ts`
- UI Console : `/console/imhotep/crew/[id]/performance/[campaignId]`
