# ADR-0156 — Moteur prédictif : forecast déterministe, registre des prédictions, calibration sur vérité terrain

- **Statut** : Accepted (2026-07-16)
- **Gouverneur** : SESHAT (mesure) — cap APOGEE 7/7 préservé
- **Mandat opérateur** : « je veux de l'automatisation. le remplissage manuel vient pour ajouter d'AUTRES sources. le rapport prédictif est critique. l'algorithme de prédiction doit être on point. »

## Contexte

L'audit Seshat 2026-07-16 ([SESHAT-INTEL-AUDIT-2026-07-16.md](../../audits/SESHAT-INTEL-AUDIT-2026-07-16.md)) a établi : aucune mécanique prédictive marché réelle (la « confiance » des signaux faibles était déclarée par le LLM, jamais confrontée au réel), `MarketBenchmark` table morte, forecast marché en « Vision ».

## Décision

**« On point » = trois garanties structurelles, pas une promesse :**

1. **Forecast déterministe robuste** (`src/domain/forecast.ts`, pur, zéro LLM) : pente de Theil-Sen (médiane des pentes — insensible aux relevés ratés) + intervalle ±1.96 σ des résidus + **backtest walk-forward intégré** (on prédit des points passés connus, on mesure l'écart → MAPE exposé avec chaque forecast). Refus de prédire sous 5 relevés / 14 jours (`INSUFFICIENT_DATA`, ADR-0046).
2. **Registre des prédictions** (`PredictionRecord`, single-writer `seshat/prediction/`) : chaque prédiction (FORECAST de série OU THESIS de signal faible) est enregistrée **avant** l'échéance, puis **résolue contre la vérité terrain** (HIT si écart ≤ 25 %, MISS sinon, UNRESOLVED si pas de mesure à l'échéance — jamais un verdict fabriqué) + score de Brier.
3. **Calibration** (`calibrateConfidence`, shrinkage bayésien m=5) : la confiance affichée mélange la confiance déclarée et le **taux de réussite observé** de la famille. C'est la boucle « auto-apprenante » honnête : l'algorithme se corrige sur ses propres résultats.

**Automatisation-first** (le manuel = source supplémentaire) :
- Cron `external-feeds` : forecasts d'audience quotidiens idempotents par marque active + résolution des échéances + **`aggregateFootprintBenchmarks`** — `MarketBenchmark` reçoit enfin un writer de production automatique (distributions p10/p50/p90 du score d'empreinte et de l'audience par pays×secteur, depuis le répertoire Seshat ADR-0151, ≥ 5 marques distinctes sinon rien).
- Les thèses des signaux faibles (`weak-signal-analyzer`) sont consignées au registre (kind THESIS) — résolution opérateur future (un jugement, pas une série).

**Surface** : `cockpitDashboard.getPredictiveReport` (read-only, tenant-scoped) + page founder `/cockpit/intelligence/previsions` (états honnêtes, erreur backtest et calibration AFFICHÉES).

## Conséquences

- 1 modèle Prisma additif (`PredictionRecord`), 1 migration backfill-safe. 0 Intent kind nouveau (écritures = mesure observationnelle Seshat, pattern community-snapshot-writer ADR-0134 ; verrou single-writer HARD).
- Extension naturelle (non bâtie ici, tracée RESIDUAL-DEBT) : séries additionnelles (ventes COMMERCE_METRICS, santé communauté), résolution opérateur des thèses en console, sources payantes du Trend Tracker, forecast du drift Overton (le radar prédictif de la Vision).
