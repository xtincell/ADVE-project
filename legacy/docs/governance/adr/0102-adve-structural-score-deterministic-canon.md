# ADR-0102 — Base de scoring ADVE structurelle = canon déterministe figé (Annexe G, sans quality modulator)

**Status** : Accepted
**Date** : 2026-06-16
**Phase** : galileo / « Fusée non-dépendante du LLM »
**Depends on** : ADR-0086 (score de maturité 8-dimensions — agrégateur de plus haut niveau, Phase 24), CdC v4 LOI 9 (scoring pur)
**Enforced by** : `tests/unit/governance/scoring-base-canon.test.ts` (HARD)

## Contexte

Le score d'une marque sur /200 est construit en deux temps :

1. **Base structurelle par pilier** (`/PILLAR_MAX_SCORE` = /25) — `scorePillarStructural`
   (`src/lib/utils/scoring.ts`), formule Annexe G : `(atomes/requis · 15) +
   (collections/totales · 7) + (cross_refs/requises · 3)`, plafonnée à 25.
2. **× poids business-context** — `getPillarWeightsForContext`
   (`src/lib/types/business-context.ts`), table de lookup déterministe
   (modèle d'affaires × positionnement × canal × nature de marque), clampée [0.5, 2.5].

Le composite = somme des 8 piliers, plafonné à 200, puis soumis à un **plafond
de preuve** (evidence ceiling) pour les paliers CULTE/ICONE
(`advertis-scorer/index.ts`).

**Problème (signalé par l'opérateur)** : cette base était *« non figée »* —

- les poids `15 / 7 / 3` étaient des nombres magiques inline, sans constante
  nommée ni test qui les épingle ;
- `applyQualityModulator` (coefficient qualité 0.70–1.00) subsistait dans
  `scoring.ts` comme **résidu de l'ère LLM-in-scoring**, en contradiction
  directe avec **LOI 9** (« pas de LLM dans le scoring », CdC v4 Chantier 2). Il
  n'avait plus aucun appelant de production (seulement son propre test), mais sa
  présence invitait la ré-introduction d'un modulateur LLM ;
- aucun test n'imposait le déterminisme (variance = 0) ni l'absence de LLM dans
  le chemin de scoring.

Le scoring est le **socle de la sortie score/palier** de toute la Fusée (cf.
[PROPAGATION-MAP §3-4](../PROPAGATION-MAP.md)). Une base non figée = une
dépendance silencieuse qui peut dériver sans alerte.

## Décision

**La base de scoring structurelle ADVE est canon déterministe figé.**

1. **Poids canoniques nommés** — `STRUCTURAL_WEIGHTS = { atoms: 15,
   collections: 7, crossRefs: 3 }`, avec `PILLAR_MAX_SCORE` (= 25) et
   `COMPOSITE_MAX_SCORE` (= 200) dérivés. Toute modification est un changement de
   doctrine et passe par le test canon.
2. **`applyQualityModulator` retiré** — LOI 9. Le scoring n'a aucun modulateur ;
   il est `scoreStructural × poids biz`, point. Comportement runtime **identique**
   (la fonction n'était pas appelée).
3. **Plafond composite aligné** sur l'échelle brand-tier /200
   (`TIER_UPPER_BOUNDS_200`, `domain/brand-tier.ts`).
4. **Invariants CI** (`scoring-base-canon.test.ts`, mode HARD) :
   - poids = {15, 7, 3}, somme = 25, composite max = 200 ;
   - déterminisme strict (variance = 0 sur 200 appels) ;
   - plafonnement à 25 par pilier ;
   - poids business-context déterministes + clampés [0.5, 2.5] ;
   - **aucune primitive LLM ni quality modulator** dans `scoring.ts`,
     `advertis-scorer/structural.ts`, `advertis-scorer/index.ts` (scan source,
     commentaires strippés).

## Frontière avec ADR-0086

ADR-0086 canonise le **score de maturité 8-dimensions** (`scoring-engine/`,
agrégateur de Cult Index / Devotion / Overton / … — Phase 24, closure-target
#15). C'est un **agrégateur de plus haut niveau** qui *consomme* des dimensions
produites ailleurs.

ADR-0102 fige la **base structurelle par pilier ADVE** — un *producteur*
primaire, indépendant et antérieur. Les deux ne se chevauchent pas :
`scoring-engine/` (ADR-0086) consommera la dimension « Pillar Completeness », pas
la formule Annexe G d'ADR-0102.

## Conséquences

- `src/lib/utils/scoring.ts` : constantes canon exportées ; `applyQualityModulator`
  supprimé ; `computeComposite` conservé (helper pur).
- `tests/unit/services/advertis-scorer.test.ts` : bloc « Quality Modulator » retiré.
- Nouveau test gouvernance HARD `scoring-base-canon.test.ts`.
- Le scoring devient un maillon **vérifiablement non-dépendant du LLM** de la
  Fusée — cohérent avec la doctrine galileo « dépendre au minimum des LLMs ».
- Cap APOGEE 7/7 préservé (aucun Neter touché). Aucun changement de comportement
  runtime (le modulateur retiré était mort).

## Lectures associées

- [ADR-0086](0086-brand-maturity-score-canonical.md) — agrégateur 8-dimensions (Phase 24)
- [ADR-0090](0090-field-rulers-deterministic-replacement.md) — rulers déterministes par champ
- [PROPAGATION-MAP §3-4](../PROPAGATION-MAP.md) — circuit scorer → score/palier
