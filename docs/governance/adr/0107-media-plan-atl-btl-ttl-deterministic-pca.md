# ADR-0107 — Plan média ATL/BTL/TTL : prévu → réalisé → PCA déterministe

**Status** : Accepted
**Date** : 2026-06-28
**Phase** : 24 — câblage du cycle de vie (acteur agence média)
**Depends on** : ADR-0099 (snapshots de coût marché × période), ADR-0093 (Thot coûts atomisés), ADR-0085 (cascade STOP à Jehuty)
**Enforced by** : `tests/unit/services/media-plan/*.test.ts`, `tests/unit/services/campaign-manager/media-metrics.test.ts`

## Contexte

L'analyse de cycle de vie multi-acteurs
(`docs/governance/lifecycle-gap-analysis-multi-actor.md`) a montré qu'une **agence
ATL/BTL/TTL** travaille sur un artefact que La Fusée ne modélisait pas : le **plan
média** et son **PCA** (Post-Campaign Analysis / post-buy) — l'écart structuré
entre l'**acheté prévu** et le **livré réel** (impressions, GRP, CPM, reach…).
Sans cet artefact, le bilan de campagne ne pouvait pas confronter la promesse média
à la réalité, et tout chiffre média était soit absent soit inventé par un LLM.

## Décision

### Modèles (additifs)

- **`MediaPlan`** (rattaché à `Campaign`) + **`MediaPlanLine`** (canal, format,
  vendor, fenêtre, KPIs **prévus** et **réalisés** nullable) + enum
  `MediaPlanStatus`. Le réalisé est nullable : une ligne planifiée non encore
  achetée n'invente aucun chiffre.

### Métriques — formules pures déterministes

`campaign-manager/media-metrics.ts` : `grp`, `cpm`, `cpp`, `ctr`, `cpc`, `vcr`,
`vtr`, `cpa`, `roas`, `sov`, `esov`, `esovMarketShareGrowth`, `sampling`,
`deliveryVariancePct`, `makegoodShortfall`. **Zéro LLM, zéro hasard.** `safeDiv`
renvoie `null` (jamais `NaN`/`Infinity`) — un dénominateur absent produit une
lacune honnête, pas un faux chiffre.

### PCA — prévu vs réalisé

`media-plan/index.ts` : `computeLinePca` / `computePlanPca` (purs, réutilisent
`media-metrics`) + CRUD gouverné (`createMediaPlan`, `addMediaPlanLine`,
`recordLineActuals`, `getMediaPlanPca`, `listMediaPlans`). Les benchmarks (CPM/CPC
de référence) viennent de la base sourcée `MarketCostSnapshot` (ADR-0099) via
`market-cost`, **pas d'une grille hardcodée**.

### Gouvernance

3 Intent kinds `LEGACY_MEDIA_PLAN_CREATE` / `_ADD_LINE` / `_RECORD_ACTUALS`
(strangler `governedProcedure`, governor INFRASTRUCTURE) + paires SLO. Router tRPC
`media-plan` (queries de lecture libres, mutations gouvernées via `emitIntent`).

## Conséquences

- Le bilan de campagne peut confronter média acheté vs livré (PCA réel).
- Tout chiffre média est soit issu du réalisé saisi, soit calculé déterministe,
  soit explicitement absent — jamais halluciné.
- Cap APOGEE 7/7 préservé — sous-domaine de Thot/Mestor, aucun nouveau Neter.
