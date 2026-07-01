# E2 — scoring-engine : score de maturité 8 dimensions

> **Chantier B — entité-socle.** **Trou comblé :** `CAHIER_DES_CHARGES.md` Ch.1 §1.2 (le constat lit le
> score /200 sur 8 dimensions). **Ancrage canon :** ADR-0086 (Accepted, impl Phase 24 / cible #15),
> STATE_FINAL_BLUEPRINT §12. **État actuel :** composants dispersés ✅, **agrégateur ABSENT**.

## E2.0 — Décisions

Créer un service **agrégateur** (pas un nouveau scorer) qui compose les **8 dimensions canoniques** en un
score `/200` historisé, pondéré **par cible de palier**. *Alt. écartée : un score plat unique* (ignore que
les leviers diffèrent par palier — ADR-0086 §pondération).

## E2.1 — Les 8 dimensions (source ADR-0086, à consommer telles quelles)

| # | Dimension | Producteur existant | Statut |
|---|-----------|---------------------|--------|
| 1 | Cult Index (0-100, 7 sous-dim) | `cult-index-engine/` | ✅ |
| 2 | Devotion Distribution (pyramide 6) | `devotion-engine/` | ✅ |
| 3 | Overton Delta (vector shift) | `sector-intelligence/` | ✅ |
| 4 | Superfan Velocity | `cult-index-engine/` | ✅ |
| 5 | Brand Asset Maturity | `brand-vault/` | 🟡 |
| 6 | Pillar Completeness | `pillar-readiness.ts` | ✅ |
| 7 | Campaign Performance (ROI) | `campaign-tracker/` | ✅ |
| 8 | Production Quality (QC) | `qc-router/` | 🟡 |

**Pondération par cible** (ADR-0086, à raffiner Phase 24) : LATENT→FRAGILE 60/40 (Pillar/Asset) ; … ;
CULTE→ICONE 40/30/30 (Overton/Velocity/Cult). `scoring-engine/thresholds.ts` porte seuils + pondérations.

## E2.2 — Modèle Prisma (ADR-0086) + ⚠️ enum Palier à CRÉER

```prisma
enum Palier        { LATENT FRAGILE ORDINAIRE FORTE CULTE ICONE }   // ⚠️ N'EXISTE PAS aujourd'hui
enum ComputeReason { SCHEDULED PROMOTION_GATE OPERATOR_REQUEST }

model BrandMaturityScore {
  id String @id @default(cuid())
  strategyId String
  computedAt DateTime @default(now())
  cultIndex Float; devotionScore Float; overtonDelta Float; superfanVelocity Float
  brandAssetMaturity Float; pillarCompleteness Float; campaignPerformance Float; productionQuality Float
  canonicalScore Float            // somme pondérée /200 selon palier courant
  currentPalier  Palier
  computedFor    ComputeReason
  dimensionsSnapshot Json         // breakdown complet (traçabilité)
  prevHash String?; selfHash String?   // historisation chaînée (cohérent Loi 1)
  @@index([strategyId, computedAt])
}
```

> **⚠️ Dépendance forte.** Le palier est aujourd'hui un **type TS** (`BrandLevel`), **pas un enum Prisma**.
> E2 doit **créer l'enum Prisma `Palier`** avec les **labels v3.3 (LATENT…)** → **R7 doit précéder E2**
> (sinon l'enum naît avec `ZOMBIE`). Aligner `BrandLevel` (TS) et `Palier` (Prisma) sur la même source.

## E2.3 — Service + Intent + Gate

- Services : `scoring-engine/{index,dimensions,aggregator,thresholds,manifest}.ts` (manifest = extension Seshat).
- Intent (governor **SESHAT**) : `RECOMPUTE_BRAND_SCORE` `{ strategyId, reason }`, async, SLO p95 ≤ 25-30s, cost ≤ 0.05$. Handler appelle les 8 producteurs (read-only) → compose → persiste + chaîne.
- **Gate (SIA) `PALIER_PROMOTION_PROOFS`** : refuse `PROMOTE_<X>_TO_<Y>` si `canonicalScore < seuil(Y)`
  (seuils cahier §1.2.1 : FRAGILE 80 · ORDINAIRE 100 · FORTE 120 · CULTE 160 · ICONE 180). HARD test.

## E2.4 — tRPC + UI manual-first

- `scoring.get(strategyId)` / `scoring.history(strategyId, range)` / `scoring.previewForPromotion(strategyId, targetPalier)`.
- Mutation `scoring.recompute` → `sia.emitIntent('RECOMPUTE_BRAND_SCORE')`. Parité manuelle : bouton « recalculer » + saisie manuelle d'override par dimension (opérateur) réservée Console.
- UI Cockpit : badge palier + score `/cockpit/insights/` + sparkline + drawer 8 dim. Console : `/console/upgraders/leaderboard` (delta/période).

## E2.5 — Critères d'acceptation

```
[ ] enum Prisma Palier (LATENT…ICONE) créé ; BrandLevel TS aligné (post-R7)
[ ] scoring-engine/ agrège 8 dimensions ; RECOMPUTE_BRAND_SCORE via sia.emitIntent (governor SESHAT)
[ ] PALIER_PROMOTION_PROOFS (HARD) refuse promotion sous seuil
[ ] BrandMaturityScore historisé + chaîné ; no-magic-fallback (ADR-0046) : INSUFFICIENT_DATA, pas de 0 silencieux
[ ] Cockpit badge + Console leaderboard rendus
```

## E2.6 — Frictions

- **F-E2a.** `brandAssetMaturity` (🟡) et `productionQuality` (🟡) : producteurs partiels → marquer `INSUFFICIENT_DATA` plutôt que fabriquer (ADR-0046), gate de promotion bloque tant que données insuffisantes.
- **F-E2b.** Pondérations empiriques « à raffiner Phase 24 » : livrer avec les valeurs ADR-0086, calibrer ensuite (boucle C1/Epic calibration Phase 23 déjà shippée — réutiliser le mécanisme).
- **Prérequis :** R7 (palier LATENT) avant E2 ; consommé par C1 (constat d'échec).
