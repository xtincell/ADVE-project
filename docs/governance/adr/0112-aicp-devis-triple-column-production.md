# ADR-0112 — Devis AICP A→X, triple PLANNED/ACTUAL/VARIANCE (acteur Production)

**Status** : Accepted
**Date** : 2026-06-28
**Phase** : 24 — câblage du cycle de vie (acteur Production, P2)
**Depends on** : ADR-0111 (DeliverableSpec/UsageGrant), ADR-0099 (reference-data), ADR-0107 (pattern estimate/actual/variance)
**Enforced by** : `tests/unit/services/production-aicp.test.ts`

## Contexte

Le devis de production publicitaire est standardisé par le **bid form AICP**
(sections A→X). La Fusée avait un budget campagne par catégorie mais ni la
**taxonomie AICP** ni le **triple colonne** estimate/actual/variance par ligne —
on ne pouvait donc pas confronter devisé vs réalisé au standard du métier.

## Décision

- **`AicpSectionReference`** : taxonomie A→X seedée (`seed-aicp-sections.ts`,
  16 sections : pré-prod, équipe tournage, lieux, art, équipement, studio, post,
  honoraires, assurances…) — **lignes mutables**, jamais en code.
- **`AicpLineItem`** : ligne de devis `{ sectionCode, description, plannedAmount,
  actualAmount?, variance? }` rattachée à `CampaignExecution`. La variance est
  calculée déterministe à l'enregistrement du réalisé.
- **Formules pures** (`production/aicp.ts`) : `computeLineVariance`, `variancePct`
  (planned=0 → null), `rollupBySection`, `rollupTotals`. Zéro LLM.
- **Intents gouvernés** `LEGACY_AICP_ADD_LINE` / `LEGACY_AICP_RECORD_ACTUAL` +
  SLOs. Router `production` : `aicpSections`, `aicpDevis` (lignes + rollup +
  totaux), `addAicpLine`, `recordAicpActual`.

## Conséquences

- Un devis se suit au standard AICP, devisé vs réalisé par ligne et par section.
- Taxonomie ajustable sans toucher au code (donnée de référence).
- Cap APOGEE 7/7 préservé — sous-domaine Production/Thot, aucun nouveau Neter.
