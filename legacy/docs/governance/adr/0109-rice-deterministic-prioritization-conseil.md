# ADR-0109 — Priorisation RICE déterministe (acteur Conseil)

**Status** : Accepted
**Date** : 2026-06-28
**Phase** : 24 — câblage du cycle de vie (acteur Conseil)
**Depends on** : ADR-0099 (reference-data datée), ADR-0086/0102 (scoring déterministe canon), ADR-0085 (cascade STOP à Jehuty)
**Enforced by** : `tests/unit/services/consulting-rice.test.ts`

## Contexte

L'analyse de cycle de vie multi-acteurs (`docs/governance/lifecycle-gap-analysis-multi-actor.md`,
ligne acteur **Conseil**) a relevé que les `Recommendation` existaient mais
n'avaient **pas de priorisation chiffrée** : pas de score RICE déterministe ni de
tri impact/effort. Une agence conseil priorise ses recommandations par **RICE**
(Reach × Impact × Confidence / Effort) — un cadre que La Fusée doit servir sans
LLM et sans barème en dur.

## Décision

- **Champs additifs nullable** sur `Recommendation` : `riceReach`, `riceImpact`,
  `riceConfidence`, `riceEffort`, `riceScore`. Aucun modèle remplacé.
- **Formules pures** (`consulting/rice.ts`) : `computeRiceScore` =
  (reach × impact × confidence) / effort, arrondi 2 décimales ; **`null`** si
  effort ≤ 0 ou entrée non finie (jamais NaN/Infinity, jamais de faux score).
  `sortByRice` (tri décroissant, non-scorés en queue), `resolveScaleValue`,
  `categoricalImpactToRiceLabel`.
- **Barème = DONNÉES de référence** (`RiceScale`, seedé `seed-rice-scales.ts`,
  échelle Intercom canon) — les valeurs des libellés (« Massive » → 3…) sont des
  **lignes mutables**, jamais des constantes en code (doctrine ADR-0099/0093).
- **Intent gouverné** `LEGACY_RECOMMENDATION_SET_RICE` (strangler, INFRASTRUCTURE)
  + SLO. Router `consulting` : `riceScales` (barème), `prioritized` (recos triées
  par score, tenant-scopé), `setRice` (gouverné). Voie libellés (résolus en base)
  OU valeurs brutes ; confiance manquante → `confidence` de la reco.

## Conséquences

- Les recommandations sont priorisables de façon déterministe et auditable.
- Manual-first (ADR-0060) : l'opérateur fournit reach/impact/effort (libellés ou
  brut) ; le calcul est pur. Aucun LLM sur le chemin.
- Cap APOGEE 7/7 préservé — sous-domaine Mestor/Jehuty, aucun nouveau Neter.
