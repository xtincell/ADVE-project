# ADR-0086 — Brand maturity score, 8 canonical dimensions aggregated by `scoring-engine/`

**Status** : Accepted (doctrine canon ; implementation Phase 24 closure-target #15)
**Date** : 2026-05-16
**Phase** : 23 (doc-only canonization) ; **Phase 24** (implementation via closure-roadmap target #15)
**Depends on** : ADR-0046 (cult-index no-magic-fallback), ADR-0047 (devotion ladder vs brand classification), ADR-0001 (APOGEE 6-tier trajectory ZOMBIE → ICONE)
**Source canon** : [STATE_FINAL_BLUEPRINT §12](../STATE_FINAL_BLUEPRINT.md)

## Contexte

La Fusée étalonne la maturité des marques sur la trajectoire ZOMBIE → FRAGILE → ORDINAIRE → FORTE → CULTE → ICONE (6 paliers APOGEE — ADR-0001). Les `PROMOTE_*_TO_*` Intent kinds existent ✅ ([intent-kinds.ts]) avec governor SESHAT, et les `DEMOTE_*` compensateurs aussi. **Mais le gate `PALIER_PROMOTION_PROOFS` est absent** (drift D-5.7) : actuellement la promotion d'une marque vers le palier supérieur est possible sans preuve quantifiée.

Le système possède plusieurs composants de scoring dispersés (`cult-index-engine/`, `devotion-engine/`, `pillar-readiness.ts`, `sector-intelligence/`, `campaign-tracker/`), mais aucun service ne **agrège** ces dimensions en un score canonique unique. Conséquence :

- Notoria ne peut pas pondérer ses Recommendations avec une mesure objective de maturité
- Le founder voit son Cockpit avec des metrics isolées, sans badge synthétique
- L'opérateur UPgraders n'a pas de leaderboard interne des marques en accélération
- Argos ne peut pas sélectionner objectivement les marques à publier comme références
- Hub-Escrow ne peut pas appliquer la commission dégressive palier-dépendante automatiquement

STATE_FINAL_BLUEPRINT §12 (2026-05-16) formalise le **système de score multi-dimensions** comme *pièce maîtresse* du dispositif maturité — Alexandre canonise explicitement les 8 dimensions et leur usage.

## Décision

### Définition canonique

**Le score de maturité d'une marque étalonne sa trajectoire ZOMBIE → ICONE sur 8 dimensions canoniques pondérées.** Score le plus élevé = objectifs atteints :

- Overton politique déplacé dans le secteur
- Communauté de fans culte établie (Devotion Ladder mature)
- Maturité produit atteinte (BrandAssets ACTIVE complets)
- Cult Index élevé
- Superfan ratio significatif

### Les 8 dimensions canoniques

| Dimension | Mesure | Service producteur | Statut |
|-----------|--------|---------------------|--------|
| **Cult Index** | 0-100 sur 7 sous-dimensions (engagement, superfan velocity, cohésion, vocabulary spread, ritual frequency, generative speech, opposition resilience) | `cult-index-engine/` | ✅ |
| **Devotion Distribution** | Pyramide 6 paliers (Spectateur → Curieux → Engagé → Loyaliste → Ambassadeur → Évangéliste) — score = balance vers les paliers hauts | `devotion-engine/` | ✅ |
| **Overton Delta** | Déplacement axe sectoriel mesuré (vector embedding shift) | `sector-intelligence/` | ✅ |
| **Superfan Velocity** | Taux de croissance superfans nominaux par période (ratio évangélistes/ambassadeurs added per month) | `cult-index-engine/` | ✅ |
| **Brand Asset Maturity** | % `BrandAsset.kind` ACTIVE / kinds applicables à l'archétype + Pillar Completeness ADVE/RTIS | `brand-vault/` | 🟡 |
| **Pillar Completeness** | % piliers ADVE/RTIS COMPLETE non-stale | `pillar-readiness.ts` | ✅ |
| **Campaign Performance** | ROI moyen pondéré sur cycle écoulé (cf. Phase 19 ADR-0052) | `campaign-tracker/` | ✅ |
| **Production Quality** | Glory tool QC moyen sur cycle (frequency × deliverable quality score) | `qc-router/` | 🟡 |

**Pondération canonique** (à raffiner empiriquement Phase 24) :

| Tier APOGEE | Dimensions dominantes | Pondération suggérée |
|---|---|---|
| ZOMBIE → FRAGILE | Pillar Completeness + Brand Asset Maturity | 60% / 40% |
| FRAGILE → ORDINAIRE | Brand Asset Maturity + Production Quality + Pillar Completeness | 40% / 30% / 30% |
| ORDINAIRE → FORTE | Cult Index + Campaign Performance + Devotion Distribution | 40% / 30% / 30% |
| FORTE → CULTE | Cult Index + Superfan Velocity + Devotion Distribution + Overton Delta | 30% / 25% / 25% / 20% |
| CULTE → ICONE | Overton Delta + Superfan Velocity + Cult Index (long-term retention) | 40% / 30% / 30% |

La pondération **varie par cible de palier** parce que ce qui compte pour franchir un palier diffère structurellement. Une marque ZOMBIE doit d'abord compléter son ADVE/RTIS + générer ses premiers assets ; une marque CULTE doit prouver son Overton shift + sa vélocité superfan ; etc.

### Utilisations canoniques du score

1. **Notoria** : score informe la `confidence` des Recommendations + le ranking. Une marque ORDINAIRE avec score 70 reçoit des recommendations différentes d'une marque ORDINAIRE avec score 40.
2. **Palier transitions** : `PROMOTE_*_TO_*` Intent kinds utilisent le score comme **preuve** via le gate **`PALIER_PROMOTION_PROOFS`** (à créer Phase 24). Le gate refuse la promotion si le score cible n'atteint pas le seuil canonique du palier visé.
3. **Cockpit display** : badge palier + score canonique visible dans `/cockpit/insights/` header + history sparkline + drawer breakdown 8 dimensions.
4. **Pricing dégressivité Hub-Escrow** : commission UPgraders sur transactions Hub-Escrow décroît avec palier — donc avec score canonique. Boucle vertueuse contractuelle.
5. **Argos showcase** : marques score élevé candidates publication références (auto-feature on score ≥ seuil ICONE_THRESHOLD).
6. **UPgraders Console** : leaderboard interne `/console/upgraders/leaderboard` des marques en accélération (delta score / période).

### Drift résolu (D-5.8)

| Avant cette ADR | Après cette ADR |
|---|---|
| ✅ Composants score existent dispersés | Doctrine canon de leur agrégation déclarée |
| ❌ Pas de service `scoring-engine/` qui AGRÈGE les 8 dimensions | Closure-target #15 ouvert (impl Phase 24) |
| ❌ Pas de table Prisma `BrandMaturityScore` historique | Modèle planifié (closure-target #15) |
| ❌ Pas d'Intent kind `RECOMPUTE_BRAND_SCORE` | Intent kind planifié (closure-target #15) |
| ❌ Gates `PALIER_PROMOTION_PROOFS` utilisant le score | Gate planifié (closure-target #15) |

## Conséquences

### Implementation scope (closure-target #15, Phase 24)

Cette ADR canonise la doctrine — l'implementation est trackée comme **closure-roadmap target #15** Phase 24 :

**Nouveaux services** :
- `src/server/services/scoring-engine/index.ts` — orchestrateur agrégation
- `src/server/services/scoring-engine/dimensions.ts` — accesseurs des 8 dimensions
- `src/server/services/scoring-engine/aggregator.ts` — pondération + composition
- `src/server/services/scoring-engine/thresholds.ts` — seuils canoniques par palier
- `src/server/services/scoring-engine/manifest.ts` — manifest Neter Seshat extension

**Nouveau modèle Prisma** :
```prisma
model BrandMaturityScore {
  id              String    @id @default(cuid())
  strategyId      String
  computedAt      DateTime  @default(now())
  cultIndex       Float     // 0-100
  devotionScore   Float     // 0-1 (balance score)
  overtonDelta    Float     // signed
  superfanVelocity Float    // ratio/period
  brandAssetMaturity Float  // 0-1
  pillarCompleteness Float  // 0-1
  campaignPerformance Float // weighted ROI
  productionQuality Float   // QC average 0-1
  canonicalScore  Float     // weighted sum per current palier
  currentPalier   Palier    // enum
  computedFor     ComputeReason // SCHEDULED | PROMOTION_GATE | OPERATOR_REQUEST
  dimensionsSnapshot Json   // full breakdown for traceability
  strategy        Strategy  @relation(fields: [strategyId], references: [id])

  @@index([strategyId, computedAt])
}
```

**Nouvel Intent kind** :
- `RECOMPUTE_BRAND_SCORE` (governor: SESHAT, async, SLO p95 ≤ 30s, cost ≤ $0.05)

**Nouveau gate Mestor** :
- `PALIER_PROMOTION_PROOFS` — refuse `PROMOTE_*_TO_*` quand `canonicalScore < seuilPalierCible`

**Nouvelles tRPC procedures** :
- `scoring.getBrandScore(strategyId)` — score actuel + breakdown
- `scoring.getScoreHistory(strategyId, range)` — timeseries
- `scoring.computeForPromotion(strategyId, targetPalier)` — preview gate decision

**Nouvelles surfaces UI** :
- Cockpit : score badge + history sparkline + drawer breakdown dans `/cockpit/insights/` header
- Console : `/console/upgraders/leaderboard` avec ranking + delta score
- Console : `/console/governance/palier-transitions` — vue gate `PALIER_PROMOTION_PROOFS` decisions

### No-magic-fallback (ADR-0046) restated

Si une dimension n'est pas calculable (ex : Cult Index sans observation Phase ≥ FORTE), le score canonique reflète l'absence avec **`INSUFFICIENT_DATA` state** sur cette dimension — jamais un zéro fabriqué qui descendrait artificiellement le score. La pondération réajuste sur les dimensions disponibles ; la traçabilité indique quelles dimensions ont contribué.

Cohérent avec pattern P22-2 (Phase 23) : `INSUFFICIENT_DATA` est un first-class state, pas une exception.

### Articulation avec `cult-index-engine/`

`cult-index-engine/` produit le Cult Index (dimension 1). `scoring-engine/` *consomme* le Cult Index — il ne le recalcule pas. La frontière est nette : `scoring-engine/` est un agrégateur, pas un calculateur primaire. Aucun cross-write ; import unidirectionnel `scoring-engine → cult-index-engine`.

### Articulation avec `campaign-tracker/` (Phase 19)

`campaign-tracker/` produit Campaign Performance (dimension 7). `scoring-engine/` consomme. Idem pour `sector-intelligence/` (dimension 3), `devotion-engine/` (dimension 2), etc.

## Lectures associées

- [STATE_FINAL_BLUEPRINT §12](../STATE_FINAL_BLUEPRINT.md) — source canon doctrinale
- [ADR-0001](0001-framework-name-apogee.md) — APOGEE 6-tier trajectory
- [ADR-0046](0046-cult-index-no-magic-fallback.md) — no-magic-fallback restated
- [ADR-0047](0047-devotion-ladder-vs-brand-classification.md) — Devotion Ladder source
- [closure-roadmap.md target #15](../../../_bmad-output/planning-artifacts/closure-roadmap.md) — implementation tracking
