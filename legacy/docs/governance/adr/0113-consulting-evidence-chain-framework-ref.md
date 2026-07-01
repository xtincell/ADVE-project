# ADR-0113 — Chaîne de preuve `ConsultingEngagement`/`Hypothesis`/`Evidence` + `FrameworkReference` (acteur Conseil)

**Status** : Accepted
**Date** : 2026-06-28
**Phase** : 24 — câblage du cycle de vie (acteur Conseil, P2)
**Depends on** : ADR-0109 (RICE), ADR-0099 (reference-data), ADR-0110 (MarketSource provenance)
**Enforced by** : `tests/unit/services/consulting-evidence.test.ts`

## Contexte

Une agence conseil ne pose pas des recommandations « parce que » — elle remonte à
des **preuves datées**. La Fusée avait des `Recommendation` mais sans **chaîne de
preuve** : pas d'hypothèse, pas d'évidence sourcée, pas de lien reco→preuve. Et le
catalogue de frameworks (28 frameworks Artemis) vivait en code, sans métadonnée
exploitable comme donnée.

## Décision

- **`ConsultingEngagement` → `Hypothesis` → `Evidence`** : une mission porte des
  hypothèses ; chaque hypothèse accumule des évidences POUR/CONTRE pondérées et
  sourcées (idéalement une `MarketSource`). Champ additif `Recommendation.hypothesisId`
  pour tracer le « pourquoi » d'une reco.
- **Statut d'hypothèse DÉTERMINISTE** (`consulting/evidence.ts`, PUR) :
  `evaluateHypothesis` = somme(poids SUPPORTS) − somme(poids REFUTES) ; ≥ seuil →
  SUPPORTED, ≤ −seuil → REFUTED, sinon OPEN. Recalculé à chaque évidence ajoutée.
  Zéro LLM — le verdict remonte à des preuves, pas à un avis.
- **`FrameworkReference`** : catalogue seedé (`seed-framework-references.ts`,
  BIG4 + RICE/MoSCoW/Overton/Porter/Ansoff/CBBE…) — métadonnée `{ family,
  outputShape, whenToUse }` en **lignes mutables** ; le moteur reste en code.
- **Intents gouvernés** `LEGACY_CONSULTING_CREATE_ENGAGEMENT` / `_ADD_HYPOTHESIS`
  / `_ADD_EVIDENCE` / `_LINK_RECO` + SLOs. Router `consulting` étendu
  (`frameworks`, `engagements`, create/add/link).

## Conséquences

- Le « pourquoi » d'une recommandation est auditable : reco → hypothèse → évidences
  datées et pondérées. Statut déterministe, reproductible.
- Le catalogue de frameworks est une donnée ajustable sans toucher au code.
- Cap APOGEE 7/7 préservé — sous-domaine Mestor/Jehuty, aucun nouveau Neter.
