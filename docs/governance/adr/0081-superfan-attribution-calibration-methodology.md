# ADR-0081 — Superfan-attribution calibration methodology (pure-TS, no new dep)

**Status** : Accepted
**Date** : 2026-05-16
**Phase** : 23 (Câblage pivots mission)
**Parent** : ADR-0077 (Phase 23 pivot-mechanics wiring)
**Depends on** : ADR-0046 (no-magic-fallback), ADR-0060 (Manual-first parity), ADR-0067 (LLM output structured enforcement), ADR-0077 (parent), ADR-0080 (`PROMOTE_PIVOT_SUBCLUSTER` Intent — sister snapshot consumer)
**Patterns** : P22-2 (`INSUFFICIENT_DATA` first-class), P22-6 (snapshot = `IntentEmission` payload)
**Supersedes** : phantom reference ADR-0054 (superfan-attribution-model placeholder, never materialized)

## Contexte

`superfan.attribution` est l'un des 6 sous-clusters pivots Phase 19. Sa fonction : **attribuer les transitions devotion-ladder** (Curieux → Convaincu → Ambassadeur → Évangéliste) à des `CampaignAction` spécifiques. Aujourd'hui : heuristique Jaccard sur le contenu des actions vs profile de l'audience cible — non-defendable cliente.

L'attribution est par construction un **problème statistique** :
- Sample size = nombre de transitions observées sur la fenêtre considérée (souvent sparse en début de campagne).
- Output = score continu + lineage des transitions attribuées.
- Validation = mesures classiques (ROC AUC pour binarisation devotion / non-devotion ; RMSE pour score continu).

Phase 23 doit livrer une calibration **fiable, reproductible, manual-first**. Sans ADR cadre :
1. Risque d'ajouter une dépendance NPM stats (sklearn-like / tensorflow.js) — bloat + Cap APOGEE 7/7 friction.
2. Risque de fabriquer un score quand le sample size est insuffisant — violation no-magic-fallback ADR-0046.
3. Risque d'absence de manual-first peer path — violation ADR-0060.

## Décision

### 1. Pure-TS logistic regression, no new dependency

`services/campaign-tracker/superfan-attribution.ts` (Epic 4 Story 4.2) implémente :
- **Logistic regression** fittée par gradient descent simple (~30 LOC), ou **operator-supplied coefficients** quand fournis (manual mode FR25).
- **ROC AUC** computation (~30 LOC : sort by predicted prob, compute TPR/FPR curve, trapezoidal integration).
- **RMSE** computation (~10 LOC : `sqrt(mean((predicted - observed)^2))`).

**Aucune dépendance NPM ajoutée.** Si l'envelope ~70-100 LOC ne suffit pas pour un problème futur plus complexe, ADR de suivi requis.

### 2. `AttributionResult` discriminated union (P22-2)

```ts
export type AttributionResult =
  | {
      state: "OK";
      score: number;
      lineage: EvangelistTransition[];
      snapshotRef: string;  // IntentEmission.id from RUN_ATTRIBUTION_CALIBRATION
    }
  | {
      state: "INSUFFICIENT_DATA";
      minSamplesRequired: number;
      samplesAvailable: number;
    };

export type EvangelistTransition = {
  campaignId: string;
  transitionFrom: "Curious" | "Convinced" | "Ambassador";
  transitionTo: "Ambassador" | "Evangelist";
  observedAt: string;
};
```

**Aucun `null` / `undefined` / `0` magique** quand le signal est sparse. `INSUFFICIENT_DATA` est le branch typé — pattern P22-2 enforcé par HARD test `phase22-no-silent-zero.test.ts`.

Heuristique : `minSamplesRequired = 30 transitions` par défaut (configurable post-MVP). Sub-30 → `INSUFFICIENT_DATA`.

### 3. Calibration snapshot persiste comme `RUN_ATTRIBUTION_CALIBRATION` `IntentEmission` payload (P22-6)

Pas de nouvelle table Prisma. Fields fixés sur le snapshot :

```ts
{
  modelVersion: string;       // e.g. "logreg-v1"
  coefficients: Record<string, number>;
  rocAuc: number;
  rmse: number;
  sampleSize: number;
  dataWindow: { from: string; to: string };  // ISO dates
  computedAt: string;
}
```

Reproductibilité via hash-chain — un PRODUCTION promotion (`PROMOTE_PIVOT_SUBCLUSTER` ADR-0080) doit référencer le `IntentEmission.id` d'un emission `RUN_ATTRIBUTION_CALIBRATION` valide.

### 4. Acceptance thresholds — opérateur décide, UI surface les nombres

Le `CalibrationReviewPanel` (Epic 6 Story 6.4) affiche **les valeurs** ROC AUC + RMSE contre des seuils déclarés (pas un badge pass/fail). Inspiration : W&B "metrics-as-data" pattern (cf. UX spec step-05).

Seuils declarés par sous-cluster — vivent dans le `manifest.ts` du sous-cluster en tant que `calibrationThresholds: { rocAucMin: 0.7, rmseMax: 0.3 }` (valeurs indicatives, validées avec direction post-MVP).

L'opérateur **owns le statistical judgment** — il accepte ou rejette explicitement. PRODUCTION promotion suit (via `PROMOTE_PIVOT_SUBCLUSTER` ADR-0080) ou ne suit pas. C'est une **decision business gated**, pas un automation.

### 5. Manual-first peer mode (FR25)

Mode `"MANUAL_COEFFICIENTS"` du Intent `RUN_ATTRIBUTION_CALIBRATION` skip le gradient descent et utilise `operatorCoefficients: Record<string, number>` directement. ROC AUC + RMSE sont quand même calculés sur le fit manuel — donc la review panel surface les mêmes métriques. Downstream consumer ne peut **pas distinguer** auto vs manual sauf via le `source: "MANUAL_OPERATOR" | "ALGORITHMIC"` discriminator dans le `IntentEmission.payload` — auditable.

Le formulaire UI manuel a une Zod shape qui **égale** la shape `coefficients` (pas de parallel schema) — UX-DR15 + manual-first parity invariant.

### 6. SLO

`RUN_ATTRIBUTION_CALIBRATION` : p95 ≤ 60s, cost ≤ $0.50 — déclaré dans `governance/slos.ts` (Epic 1 Story 1.5). Streaming progress via NSP SSE (heartbeat 15s — NFR3) — `bestEffort()` per ADR-0072.

## Conséquences

**Positives** :
- Zéro nouvelle dépendance NPM — bundle / sécurité / supply-chain attack surface inchangés.
- Reproductibilité totale : un PRODUCTION promotion retrouve son snapshot en suivant le `calibrationSnapshotRef` → `IntentEmission.payload` (hash-chained).
- L'opérateur garde le statistical judgment — defensible contre client ("j'ai accepté avec ROC AUC=0.74, voici la run snapshot du 2026-05-20").
- Manual-first peer mode disponible quand le signal est trop sparse pour fitter automatiquement.

**Négatives / coûts** :
- ~70-100 LOC de stats pure-TS — bug surface non-négligeable. Vitest unit tests couvrent (a) fit sur synthetic data avec coefficients connus, (b) `INSUFFICIENT_DATA` path sur sparse input.
- Pas de modèle plus sophistiqué (régression non-linéaire, XGBoost, etc.) — si requis post-MVP, ADR de suivi + potentiellement nouvelle dépendance.

**Neutres** :
- Les acceptance thresholds restent une décision business — Phase 23 ne les fige pas en code, ils sont déclaratifs.

## Migration

- Phase 23 Epic 4 Stories 4.1–4.5 livrent `AttributionResult`, regression, ROC AUC / RMSE, manual coefficient mode.
- Phase 23 Epic 6 Story 6.1 livre le `RUN_ATTRIBUTION_CALIBRATION` handler qui produit le snapshot.
- Phase 23 Epic 7 Story 7.10 met à jour `RESIDUAL-DEBT.md` avec PRODUCTION promotion gated on direction sign-off.

## Suivi

- HARD test `phase22-no-silent-zero.test.ts` (Epic 3 Story 3.8 + Epic 4 Story 4.8) — scan AST pour `?? 0` / `|| 0` sur `score` / `coefficient` / `rocAuc` / `rmse`.
- HARD test `phase22-no-calibration-table.test.ts` (Epic 6 Story 6.7) — pas de model `Calibration*` dans `schema.prisma`.
- Vitest unit tests :
  - Fit convergence sur synthetic data (regression converge dans tolérance).
  - `INSUFFICIENT_DATA` retourné sur sparse input.
  - ROC AUC connu sur dataset de référence.
- Drift detection (Growth post-MVP) : scheduled re-calibration cron + `staleAt` pattern — out of scope Phase 23.

## Notes

- L'envelope ~70-100 LOC est délibérément modeste — Phase 23 démontre que la pure-TS est suffisante. Si la qualité de fit s'avère insuffisante en production, l'option ADR de suivi est : (a) introduire `simple-statistics` ou équivalent léger ; (b) introduire un calibration job offline ; (c) revoir le feature engineering. Aucune ne short-circuit le ship-now-improve-later.
- Le formulaire manual coefficient mode hérite du `Campaign.attributionCoefficients` JSON field (Epic 1 Story 1.6 migration) — les coefficients persistent côté brand (par opposition à per-run-snapshot).
- L'ADR-0081 supersede le phantom ADR-0054 (dangling ref) — retirement P22-7 distribué au fur des touches.
