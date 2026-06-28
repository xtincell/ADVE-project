# ADR-0114 — Provenance des sources + fusion pondérée + FK concurrent↔étude (acteur Bureau d'étude)

**Status** : Accepted
**Date** : 2026-06-28
**Phase** : 24 — câblage du cycle de vie (acteur Bureau d'étude, P2)
**Depends on** : ADR-0110 (ResearchWave/Methodology), ADR-0099 (reference-data)
**Enforced by** : `tests/unit/services/bureau-etudes-fusion.test.ts`

## Contexte

Un bureau d'étude pondère ses sources par fiabilité ET par **classe de provenance**
(première main vs syndiquée vs inférée IA). La Fusée avait `MarketSource.reliability`
mais ni la **classe de provenance**, ni la **fusion pondérée** (un chiffre unique
faussement précis sans dispersion), ni le **rattachement concurrent↔étude**.

## Décision

- **Champs additifs** : `MarketSource.provenanceClass` (FIRST_PARTY/SYNDICATED/
  AI_INFERRED/PUBLIC) + `CompetitorSnapshot.studyId` (FK + relation `MarketStudy.
  competitorSnapshots`).
- **Fusion pondérée pure** (`bureau-etudes/fusion.ts`) : `fuseEstimates` =
  moyenne pondérée par `reliability` (le poids EST la fiabilité, aucune constante
  de pondération en dur) + **dispersion** (écart-type pondéré = erreur honnête).
  Sources sans fiabilité **exclues** (jamais inventées) ; `null` si rien de
  pondérable. Comptage par classe de provenance (transparence).
- **Intent gouverné** `LEGACY_SOURCE_SET_PROVENANCE` + SLO. Router `bureauEtudes`
  étendu : `competitors` (par étude), `fuse` (fusion + erreur), `setProvenance`.

## Conséquences

- Une estimation marché fusionnée porte sa dispersion — pas de fausse précision.
- Les concurrents sont traçables jusqu'à l'étude qui les a produits.
- La pondération reste 100 % donnée (reliability par-source) ; la classe de
  provenance est surfacée pour l'opérateur.
- Console `/console/seshat/marketplace` (liste concurrents / tendance prix par
  vague / provenance) : surface UI **restante** (la donnée + les procédures tRPC
  sont posées) — polish suivant.
- Cap APOGEE 7/7 préservé — sous-domaine Seshat, aucun nouveau Neter.
