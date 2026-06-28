# ADR-0110 — Time-spine `ResearchWave` + catalogue `MethodologyReference` (acteur Bureau d'étude)

**Status** : Accepted
**Date** : 2026-06-28
**Phase** : 24 — câblage du cycle de vie (acteur Bureau d'étude)
**Depends on** : ADR-0099 (reference-data datée), ADR-0037 PR-L (knowledge access typé), ADR-0085 (STOP à Jehuty)
**Enforced by** : `tests/unit/services/bureau-etudes-statistics.test.ts`

## Contexte

L'analyse multi-acteurs (ligne **Bureau d'étude**) a relevé deux trous P1 : (①) pas
de **time-spine** — une étude trackée se mesure en vagues, or rien ne modélisait la
vague ni la significativité wave-on-wave ; (②) le **catalogue de méthodes** (familles,
tailles types, normes n→marge d'erreur, T2B) n'existait pas comme donnée — il aurait
fini en code dur.

## Décision

- **`ResearchWave`** (étude × vague) : `{ waveLabel, periodLabel, fieldStart/End,
  cadence, targetN, achievedN, isRolling }` — le time-spine. Champs additifs
  `MarketStudy.methodologyKey` (FK souple) + relation `waves`.
- **`MethodologyReference`** : catalogue seedé (`seed-methodology-references.ts`,
  9 méthodes canon : monadique, Van Westendorp, Gabor-Granger, CBC, tracker, U&A,
  segmentation, CLT sensoriel) avec `{ family, typicalN, confidenceLevel,
  marginOfErrorPct, t2bNormPct, outputShape, whenToUse }` — **lignes mutables**,
  jamais des constantes en code.
- **Formules pures** (`bureau-etudes/statistics.ts`) : `marginOfErrorPct(n)`
  (n≈384 → ±5 %), `requiredSampleForMoe`, `waveOnWaveSignificance` (z-test deux
  proportions, verdict déterministe, jamais d'erreur jetée). Zéro LLM.
- **Intents gouvernés** `LEGACY_RESEARCH_WAVE_CREATE` / `_RECORD` + SLOs. Router
  `bureauEtudes` : `methodologies`, `waves` (annotées MoE), `compareWaves`
  (significativité), `createWave`/`recordAchieved` (gouvernés, tenant-scopés).

## Conséquences

- Une étude se suit vague après vague avec une significativité statistique
  déterministe et auditable — la base d'un vrai bureau d'étude.
- Les normes méthodologiques sont des données ajustables sans toucher au code.
- Cap APOGEE 7/7 préservé — sous-domaine Seshat, aucun nouveau Neter.
