# ADR-0080 — Pivot sub-cluster lifecycle-promotion Intent (`PROMOTE_PIVOT_SUBCLUSTER`)

**Status** : Accepted (stub — finalization in Phase 23 Epic 7 Story 7.9)
**Date** : 2026-05-16
**Phase** : 23 (Câblage pivots mission)
**Parent** : ADR-0077 (Phase 23 pivot-mechanics wiring)
**Depends on** : ADR-0004 (hash-chain immutability), ADR-0042 (Sequence modes and lifecycle — `PROMOTE_SEQUENCE_LIFECYCLE` precedent), ADR-0052 (Campaign module canonical), ADR-0077 (parent)
**Patterns** : P22-4 (lifecycle-promotion Intent shape, parameterized), P22-6 (calibration snapshot = `IntentEmission` payload)

## Contexte

Les 6 sous-clusters pivots de `campaign-tracker/` sont en état `PARTIAL` (cf. `capability-state.ts`). Phase 23 doit promouvoir leur lifecycle vers `MVP` (post-wiring) puis vers `PRODUCTION` (post-calibration sign-off). Sans Intent gouverné, le risque est :
1. Promotion silencieuse en code — drift d'altitude (Loi APOGEE n°1 violée) ;
2. Pas de traçabilité de la décision business (sign-off) qui justifie le passage `MVP → PRODUCTION` (FR24) ;
3. Pas de reproductibilité du run de calibration qui sous-tend la promotion (FR23).

Précédent dans le repo : `PROMOTE_SEQUENCE_LIFECYCLE` (ADR-0042) — un Intent kind unique parameterized sur `(sequenceKey, fromState, toState)` au lieu d'un Intent par sequence. Ce pattern a fait ses preuves Phase 17.

## Décision

### 1. Un seul Intent kind paramétré

`PROMOTE_PIVOT_SUBCLUSTER` (single kind) couvre les 7 sous-clusters pivots avec un payload discriminé :

```ts
type PromotePivotSubclusterPayload = {
  subClusterSlug:
    | "superfan.attribution"
    | "superfan.stickiness"
    | "superfan.crmCapture"
    | "culture.overtonShift"
    | "culture.overtonReadiness"
    | "culture.tarsisBridge"
    | "culture.mcpIngest";
  fromState: "STUB" | "PARTIAL" | "MVP";
  toState: "PARTIAL" | "MVP" | "PRODUCTION";
  calibrationSnapshotRef?: string;  // REQUIRED when toState === "PRODUCTION"
  reason: string;                    // operator rationale, free-form
};
```

Registry léger (pas d'enum kind explosion) ; mirroring `PROMOTE_SEQUENCE_LIFECYCLE` pattern.

### 2. State-machine guards

Le handler (Epic 6 Story 6.2 — `services/campaign-tracker/lifecycle.ts`) refuse :
- Toute transition qui viole `STUB → PARTIAL → MVP → PRODUCTION` (pas de skip forward, pas de reverse sans `mode: "RE_ENTRY"` — hors scope Phase 23).
- Toute promotion vers `PRODUCTION` sans `calibrationSnapshotRef`.

### 3. `calibrationSnapshotRef` gate en pre-flight Mestor

`services/mestor/gates/calibration-snapshot-required.ts` (Epic 6 Story 6.3) refuse la dispatch **avant** le handler :
- Si `intent.kind === "PROMOTE_PIVOT_SUBCLUSTER"` ET `payload.toState === "PRODUCTION"` ET `!payload.calibrationSnapshotRef` → reject.
- Si `calibrationSnapshotRef` pointe vers un `IntentEmission` non-`RUN_ATTRIBUTION_CALIBRATION`, ou vers un emission en état `INSUFFICIENT_DATA` / failed → reject.

Mirroring `MANIPULATION_COHERENCE` pre-flight gate precedent — la traçabilité (FR24) est **structural**, pas advisory.

### 4. Snapshot = `IntentEmission` payload (P22-6)

Le `calibrationSnapshotRef` est un `IntentEmission.id`. Le snapshot lui-même est le `payload` d'un `RUN_ATTRIBUTION_CALIBRATION` emission précédent — fields fixés : `{ modelVersion, coefficients, rocAuc, rmse, sampleSize, dataWindow: { from, to }, computedAt }`. **Zéro nouvelle table Prisma** (D8 préservé). Versioning implicite via hash-chain.

HARD test `phase22-no-calibration-table.test.ts` (Epic 6 Story 6.7) assert que `schema.prisma` ne contient pas de model `CalibrationSnapshot` / `CalibrationRun` / `ModelSnapshot` / `AttributionSnapshot`.

### 5. SLO

Déclaré dans `governance/slos.ts` (Epic 1 Story 1.4) :
- `PROMOTE_PIVOT_SUBCLUSTER` : p95 ≤ 15s, cost ≤ $0.10 (async sub-cluster compute envelope).

`RUN_ATTRIBUTION_CALIBRATION` (cf. ADR-0081) est l'Intent compagnon avec son propre SLO (p95 ≤ 60s, cost ≤ $0.50, streaming).

## Conséquences

**Positives** :
- Lifecycle promotion devient un governance act traçable, hash-chained, replayable (FR22 / FR23 / FR24 structural).
- Un seul Intent kind = registry maintenable, pattern uniforme avec ADR-0042.
- Traçabilité PRODUCTION ↔ snapshot **enforced en pre-flight** — pas un check optionnel UI-side.

**Négatives / coûts** :
- L'opérateur doit explicitement faire **deux actions** pour atteindre PRODUCTION : (1) `RUN_ATTRIBUTION_CALIBRATION` qui produit un snapshot ; (2) `PROMOTE_PIVOT_SUBCLUSTER` qui le référence. La UI Console (Epic 6 Story 6.4 `CalibrationReviewPanel`) chaîne les deux dans un même flow opérateur.
- Le pre-flight Mestor gate ajoute une dépendance entre `mestor/gates/` et `campaign-tracker/lifecycle.ts` — vit dans Mestor (gate), pas dans le handler (le check est dupliqué défensivement dans le handler aussi, mais le gate est l'unique source d'autorité).

**Neutres** :
- Le state-machine est strict mais raisonnable — `STUB → PARTIAL → MVP → PRODUCTION` couvre tous les cas Phase 23. Re-entry / rollback est out of scope.

## Migration

- Phase 23 Epic 1 Stories 1.4 + 1.5 enregistrent les deux Intent kinds avec placeholder handlers `NOT_YET_IMPLEMENTED`.
- Phase 23 Epic 6 Stories 6.1 / 6.2 / 6.3 / 6.7 livrent handlers + gate + HARD tests.

## Suivi

- HARD test `phase22-lifecycle-promotion.test.ts` (Epic 6 Story 6.7) — assertions :
  - Tout code path qui call `mestor.emitIntent({ kind: "PROMOTE_PIVOT_SUBCLUSTER" })` atteint le state-machine guard.
  - Integration test fires invalid transitions et assert refusals.
- HARD test `phase22-no-calibration-table.test.ts` (Epic 6 Story 6.7) — assertion 0 model `Calibration*` dans `schema.prisma`.
- Anti-drift : `assembler-uses-manual-path.test.ts` extension empêche les handlers Phase 23 d'appeler `executeStructuredLLMCall` etc. directement.

## Notes

- **PRODUCTION promotion** des 3 sous-clusters calibrés (`superfan.attribution`, `culture.overtonShift`, `culture.overtonReadiness`) requiert un sign-off direction sur les seuils ROC AUC / RMSE — c'est une décision business, calendar-tracked dans `RESIDUAL-DEBT.md` Epic 7 Story 7.10. Phase 23 ship le MVP (sub-clusters au lifecycle `MVP` avec snapshots de calibration disponibles), pas la PRODUCTION promotion automatique.
- **Re-entry / rollback** (e.g. rétrograder un sous-cluster en cas de drift) est hors scope Phase 23 — si requis post-MVP, ADR de suivi nécessaire.
