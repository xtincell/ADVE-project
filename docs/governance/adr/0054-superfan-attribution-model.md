# ADR-0052-C — Superfan attribution paramétrique (promotion `superfan.attribution` MVP → PRODUCTION)

**Date** : 2026-05-06
**Statut** : Accepted (implemented — Phase 23 Epic 4 : AttributionResult, régression logistique pure-TS, lineage évangélistes, vues Console+Cockpit)
**Note de décision (2026-06-12)** : Décision actée 2026-06-12 : le modèle d'attribution superfan est shippé end-to-end (types → régression → lineage → parité manuelle → CI guard). Calibration PRODUCTION gated sur sign-off direction (RESIDUAL-DEBT Phase 23).
**Phase** : 19 — Campaign tracker Cluster C promotion
**Parent** : ADR-0052 v2 Cluster C — Superfan economy

## Contexte

Vague 2 a shippé `superfan.attribution` en mode `PARTIAL/MVP` avec coefficients fixes paramétriques :
- 1 EVANGELISTE = 12× LTV de base
- 1 FIDELE = 4× LTV
- 1 INITIE = 1× LTV

LTV de base = $100 (placeholder). Coefficients = heuristic conservateur basé sur littérature CRM générique, pas calibrés sur la donnée brand.

**Limitation MVP** : un coefficient fixe ne capture pas la spécificité brand × secteur × tier APOGEE. Une marque ICONE convertit ses évangélistes en LTV différemment d'une marque FRAGILE. Erreurs systématiques garanties.

## Décision

Promotion `MVP → PRODUCTION` via régression logistique calibrée sur l'historique de la marque + benchmarks sectoriels.

### §1 — Données d'entraînement

Pour chaque CampaignAction historique avec `devotionTransitionsObserved` non-null + outcome AARRR connu (≥6 mois post-LIVE) :
- Features : `manipulationModeApplied`, `category` (ATL/BTL/TTL), `pillarServed[]`, `bigIdeaCoherenceScore`, brand `tier` au moment de l'action
- Target : LTV réel mesuré sur la cohorte produite, horizon 24 mois

### §2 — Modèle

Régression linéaire bayésienne avec priors informés par les coefficients MVP (12/4/1). Permet d'apprendre progressivement sans casser le baseline. Output inclut intervalle de confiance (95%).

### §3 — Quality gate de promotion

`MVP → PRODUCTION` admis quand :
1. ≥50 CampaignAction historiques avec ground truth disponible
2. RMSE du modèle ≤ 30% du baseline MVP (estimé sur cross-validation 5-fold)
3. Validation par opérateur sur 10 nouvelles actions blind-test

### §4 — Variable bible canonique

Ajouter une entrée typée dans BIBLE_C (à créer) :
```ts
superfanAttributionCoefficients: {
  description: "Coefficients LTV par DevotionLadderTier après calibration",
  format: "{ EVANGELISTE: number, FIDELE: number, INITIE: number, baselineUsd: number, modelMetadata: { rmse, auc, ci_lower, ci_upper } }"
}
```

Le `Strategy.superfanAttributionCoefficients` overrides les coefficients par défaut pour une brand donnée. Default = MVP fixed values jusqu'à calibration.

## Conséquences

### Positives
- Calibration brand-spécifique (ICONE vs FRAGILE → coefficients différents)
- Intervalle de confiance exploitable (UI Cockpit affiche range vs point estimate)
- Anti-drift via SequenceReuseTracker — re-calibration auto quand N nouvelles actions sont mesurées

### Négatives
- Coût offline calibration (2-3h compute par strategy au passage `MVP → PRODUCTION`)
- Cold start : strategies nouvelles tombent au baseline MVP par construction (acceptable)

## Open work
- Créer `src/server/services/campaign-tracker/superfan-calibration.ts` (offline batch)
- Schema : `Strategy +superfanAttributionCoefficients:Json?`
- Variable-bible : entry `superfanAttributionCoefficients` dans BIBLE_C ou BIBLE_S
- Cron mensuel : `RECALIBRATE_SUPERFAN_COEFFICIENTS_BATCH` (governor THOT, async)
- Test : `tests/integration/campaign-tracker/superfan-attribution-calibration.test.ts` (synthetic data)
