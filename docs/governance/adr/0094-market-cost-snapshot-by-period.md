# ADR-0094 — Base de coûts marché historisés (MarketCostSnapshot)

- **Statut** : Accepted
- **Date** : 2026-06-14
- **Gouverneur** : THOT (Sustainment / économie runtime)
- **Cap APOGEE** : 7/7 préservé

## Contexte

Question opérateur : « ai-je une base de données des coûts d'un marché donné à une
période donnée ? ». Audit (2026-06-14) : **non**. Il existait `MarketBenchmark`
(country, sector, metric, p10/p50/p90) — mais **statique, sans axe temporel**.
L'architecture économique runtime canon (ADR-0087 : `ZoneIndex` / `ZoneIndexSnapshot`
/ `EconomicNeighborMap` + Thot formula engine) est **0/7 shippée** (impl. prévue
ultérieurement). Besoin immédiat : une série de coûts **datés**, déterministe.

## Décision

Nouveau modèle `MarketCostSnapshot` — série temporelle de **coûts bruts** par
`(countryCode, sector, metric, period)` :

- `period` : clé canonique `YYYY | YYYY-Qn | YYYY-MM` + `periodStart`/`periodEnd`
  dérivés (parser pur `parsePeriod`).
- distribution `p10/p50/p90` (p50 = référence), `unit`, `currency`, `sampleSize`,
  `source` (SEED | OPERATOR | CONNECTOR | COMPUTED), `confidence`.
- unique `(countryCode, sector, metric, period)` (sector défaut `"ALL"` pour éviter
  l'ambiguïté NULL des index uniques Postgres).

Service `market-cost/` (DB-only, **zéro LLM**) : `getMarketCost` (période exacte ou
plus récent), `getMarketCostHistory`, `listMarketCosts`, `upsertMarketCost`,
`seedMarketCosts` (baseline CM/CI/SN × 4 métriques × 2 trimestres). Router tRPC
`marketCost` : lectures opérateur + `upsert` gouverné (`UPSERT_MARKET_COST_SNAPSHOT`,
gouverneur THOT) + `seedBaseline`. Console `/console/socle/market-costs`.

## Positionnement vs l'existant (anti-doublon)

- **MarketBenchmark** (reste) = snapshot statique courant, consommé par
  `market-pricing`. Inchangé.
- **MarketCostSnapshot** (nouveau) = la **dimension temps** manquante : l'historique
  requêtable « tel marché à telle période ».
- **ZoneIndex (ADR-0087)** = couche de **multiplicateurs d'indice** (forex, inflation,
  cost-of-living) pour le Thot formula engine. Sémantique différente (indices, pas
  coûts bruts). MarketCostSnapshot ne le préempte pas ; il pourra l'alimenter quand
  ADR-0087 sera implémenté (source COMPUTED).

## Conséquences

- La base de coûts marché×période **existe** désormais, seedée et éditable, sans LLM
  ni dépendance vendor.
- Migration additive `20260614100000_market_cost_snapshot` (non destructive).
- Suite : connecteurs (source CONNECTOR) pour rafraîchir automatiquement les coûts ;
  convergence avec ADR-0087 (ZoneIndex multiplie le coût de base par zone).
