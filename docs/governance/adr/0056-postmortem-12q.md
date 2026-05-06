# ADR-0052-E — Postmortem 12 questions canon (variable-bible + Glory tool `postmortem-12q`)

**Date** : 2026-05-06
**Statut** : Proposed (enfant de [ADR-0052](0052-campaign-module-canonical-trajectory-instrument.md))
**Phase** : 19 — Campaign tracker Cluster E promotion
**Parent** : ADR-0052 v2 Cluster E — Boucles d'apprentissage
**Glory tool** : `postmortem-12q` (déjà déclaré [PHASE19_TOOLS](../../../src/server/services/artemis/tools/phase19-tools.ts))

## Contexte

Vague 3 a shippé `learnings.oracleReconciler` + `learnings.vbEnrichment` en mode `PARTIAL/MVP` avec placeholders vides. La promotion `MVP → PRODUCTION` exige un postmortem structuré canon — 12 questions canoniques qui alimentent simultanément Oracle + variable-bible + sequences + Imhotep crew loop.

**Pourquoi 12 questions** : la liste a émergé en analysant les patterns post-mortem de 7 campagnes Phase 13-17 historiques. Couvre les 4 axes pivots (mécanismes, narrative, opérationnel, capitalisation).

## Décision

Canoniser les 12 questions dans `VARIABLE-BIBLE-CANON.md` + Glory tool `postmortem-12q` qui les opérationalise.

### §1 — Liste canonique des 12 questions

| # | Question | Axe |
|---|---|---|
| Q1 | La Big Idea s'est-elle imposée ? (preuve : adoption tokens sectoriels, mémorisation panel) | Narrative |
| Q2 | Le Manifesto a-t-il été respecté par toutes les actions ? (gap measurable) | Narrative |
| Q3 | Quel mode manipulation a dominé en pratique vs prévu ? (drift) | Mécanismes |
| Q4 | Combien d'évangélistes produits ? (devotion ladder transitions tracées) | Mécanismes |
| Q5 | Combien de détracteurs émergents ? (anti-superfans, sentiment polarisation) | Mécanismes |
| Q6 | L'axe Overton a-t-il bougé ? (sectoriel : vocabulaire + sentiment + références) | Mécanismes |
| Q7 | Quels signaux faibles Tarsis non anticipés ? (capture culturelle) | Mécanismes |
| Q8 | Quelle action a sur-performé / sous-performé ? (postmortem KPI) | Opérationnel |
| Q9 | Quel pillar a régressé silencieusement ? (Loi 1 audit) | Opérationnel |
| Q10 | Quelle séquence Glory mérite promotion DRAFT→STABLE ? (capitalisation) | Capitalisation |
| Q11 | Quel apprentissage entre dans la variable-bible ? (typed) | Capitalisation |
| Q12 | Quelle est la prochaine campagne suggérée pour cette trajectoire ? (chapter N+1) | Capitalisation |

### §2 — Format de stockage

`CampaignReport.postmortemStructured: Json?` (existant Phase 19 Vague 3) :

```ts
{
  q1: { answer: string, score: 0..1, evidenceUrls: string[] },
  q2: { ... },
  ...
  q12: { ... }
}
```

### §3 — Workflow

1. À `POST_CAMPAIGN` (J+7 stabilisation Seshat), opérateur ouvre `/console/artemis/campaigns/[id]/postmortem`
2. UI affiche les 12 questions pré-remplies via Glory tool `postmortem-12q` (LLM)
3. Opérateur valide / amende les réponses
4. Submit déclenche en cascade :
   - `RECONCILE_CAMPAIGN_TO_ORACLE` → propose OPERATOR_AMEND_PILLAR_PROPOSAL[]
   - `ENRICH_VARIABLE_BIBLE_FROM_CAMPAIGN` → propose VariableBibleEnrichmentProposal[]
   - `EVALUATE_CREW_PERFORMANCE` → score CrewPerformance par membre
   - `PROPOSE_SEQUENCE_PROMOTION_FROM_CAMPAIGN` → si Q10 indique sequence

### §4 — Variable-bible canonical entry

Ajouter dans `VARIABLE-BIBLE-CANON.md` :

```ts
postmortem12qCanonical: {
  description: "Liste canonique des 12 questions de postmortem campagne (ADR-0052-E)",
  format: "string[12] avec axe + criticité",
  values: [
    { id: "q1", axis: "narrative", question: "La Big Idea s'est-elle imposée ?" },
    // ... 11 autres
  ]
}
```

### §5 — Quality gate de promotion

`MVP → PRODUCTION` admis quand :
1. 12 questions validées par direction (opérateur user)
2. Glory tool `postmortem-12q` testé sur 3 campagnes pilotes
3. UI postmortem `/console/artemis/campaigns/[id]/postmortem` shippée

## Conséquences

### Positives
- Postmortem structuré non-skip (gate `Campaign.state: ARCHIVED` requiert `postmortemStructured` non-null)
- Capitalisation simultanée 4 boucles (Oracle + VB + sequences + crew)
- Format machine-readable (pas markdown libre)

### Négatives
- 12 questions = sérieux — exige 30-60min opérateur. Risque skipping si pas gate strict.
- Les questions évolueront — ADR mute-able

## Open work
- Variable-bible : entrée canonique `postmortem12qCanonical`
- UI Console `/console/artemis/campaigns/[id]/postmortem` (12-step wizard)
- Gate ARCHIVED : refuser passage si `postmortemStructured = null`
- Test : `tests/integration/campaign-tracker/postmortem-12q-flow.test.ts`
