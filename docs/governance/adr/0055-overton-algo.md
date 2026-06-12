# ADR-0052-D — Overton algo (promotion `culture.overtonReadiness` + `culture.overtonShift` MVP → PRODUCTION)

**Date** : 2026-05-06
**Statut** : Accepted (implemented — Phase 23 Epic 3 : mesure Overton réelle, OvertonRealSignal, Oracle §34, opérateur-tagged deltas)
**Note de décision (2026-06-12)** : Décision actée 2026-06-12 : la mécanique Overton est sortie du placebo Jaccard de Phase 19, end-to-end (mesure → connecteurs → gate ingestion → livrable → parité opérateur → CI guard).
**Phase** : 19 — Campaign tracker Cluster D promotion
**Parent** : ADR-0052 v2 Cluster D — Signaux faibles & culture

## Contexte

Vague 2 a shippé 2 sous-clusters Cluster D en mode `PARTIAL/MVP` :
- `culture.overtonReadiness` — heuristic conservateur (retour `READY` par défaut, degradation `INSUFFICIENT_TARSIS_HISTORY`)
- `culture.overtonShift` — Jaccard delta + sentiment delta sur 60-day window

**Limitation MVP** : sans tarsis-monitoring sub-component câblé, la détection Overton est aveugle. Le score overtonShift basé Jaccard est noisy (vocabulaire sectoriel évolue vite, tokens stop-words sectoriels manquent).

## Décision

Promotion via algo sophistiqué multi-source.

### §1 — Sources de signal Overton (ingest temps réel)

- **Tarsis monitoring** (sub-component Seshat) — tokens sectoriels par jour × 365 jours rolling
- **External feeds** (Phase 17 — Phrasebook + RSS curated) — articles sectoriels avec sentiment scoring
- **Social listening tier** (provider externe via Anubis Credentials Vault si configuré — sinon DEFERRED_AWAITING_CREDENTIALS)

### §2 — Algo readiness (pré-LIVE)

```
proximityScore = α * sentimentMomentum + β * vocabularyEmergence + γ * topicalRelevance
```

- `sentimentMomentum` : moving average 30j du sentiment sectoriel
- `vocabularyEmergence` : fraction des tokens d'`overtonHypothesis.sectorTokens[]` qui apparaissent au-dessus du seuil de baseline
- `topicalRelevance` : embedding cosine similarity entre hypothesis.axe et corpus sectoriel récent

Décision rule :
- `TOO_EARLY` si proximityScore < 0.3 OU sentimentMomentum < 0
- `READY` si 0.3 ≤ proximityScore < 0.7
- `TOO_LATE` si proximityScore ≥ 0.7 (saturé — risque commodification)

Coefficients α, β, γ canonisés via variable-bible (BIBLE_S nouveau field) — calibrés par direction.

### §3 — Algo shift (post-LIVE)

```
overtonShiftScore = (sentimentDelta_60j × 0.5) + (vocabularyAdoptionRate × 0.3) + (topicalAuthority × 0.2)
```

- `sentimentDelta_60j` : différence sentiment sectoriel 30j pré-LIVE vs 30j post-LIVE
- `vocabularyAdoptionRate` : fraction des `emergingTokens` qui sont diffusés par d'autres acteurs sectoriels (preuve de mouvement de fenêtre)
- `topicalAuthority` : embedding shift entre corpus sectoriel pré et post (cosine distance)

### §4 — Quality gate de promotion

`MVP → PRODUCTION` admis quand :
1. Tarsis monitoring sub-component publié API (`getSectorTokensTimeseries`, `getSentimentMomentum`)
2. Validation par opérateur sur 5 campagnes historiques (rétro-test)
3. Coefficients α, β, γ canonisés en variable-bible

## Conséquences

### Positives
- Détection objective (multi-source) du timing culturel — au lieu de l'intuition opérateur
- Prévention `TOO_LATE` saturation (protection commodification — angle mort §16 ADR-0052 v2)
- Output réutilisable cross-clients (sectoriel public)

### Négatives
- Dépendance Tarsis monitoring sub-component (Seshat) — bloquant tant que pas câblé
- Coût compute (embeddings sectoriels) — à pricer via Thot fuel gate
- Risque "false positive" READY si sentimentMomentum monte par hasard non-corrélé

## Open work
- Bridge Seshat → Tarsis monitoring API (résout STUB `culture.tarsisBridge` simultanément)
- Variable-bible : entries α/β/γ pour readiness + shift coefficients
- Cron mensuel : `MEASURE_OVERTON_SHIFT_BATCH` pour campagnes en `POST_CAMPAIGN`
- Test rétro : `tests/integration/campaign-tracker/overton-historical-validation.test.ts`
