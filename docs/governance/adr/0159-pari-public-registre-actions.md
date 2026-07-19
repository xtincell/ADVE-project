# ADR-0159 — Pari Public v1 + registre de paris étendu aux actions

- **Statut** : Accepted (2026-07-19)
- **Origine** : Phase C du plan d'état final **RATIFIÉ** ([ETAT-FINAL-RECHERCHE-2026.md](../ETAT-FINAL-RECHERCHE-2026.md) §2.1 + §6) — « le Pari Public : la Pesée comme engagement ». Étend [ADR-0156](0156-moteur-predictif-registre-calibration.md) (PredictionRecord) — **aucun nouveau modèle** (audit anti-doublon : `PredictionRecord` existe → on étend).
- **Conditions de crédibilité intégrées (§8 du plan, validées empiriquement)** : (a) **séquencer** — paris modestes et tenus d'abord, spectaculaire ensuite ; (b) **règle Domino's** — jamais un pari qui incite des tiers à prendre des risques pour tenir la promesse.

## Décision

1. **Deux kinds de paris déclarés** sur `PredictionRecord` (en plus de FORECAST/THESIS) : **`PLEDGE`** (engagement de marque, publiable) et **`ACTION_EFFECT`** (effet prédit d'une action/campagne, `subjectKey` = brandActionId — le registre B3 « chaque brief = effet prédit + échéance »). Champs additifs : `isPublic` (défaut false), `resolutionNote`, `declaredBy` (audit, jamais projeté publiquement).
2. **Déclaration gouvernée** `SESHAT_DECLARE_PREDICTION` (requireOperator — le jugement de crédibilité/séquençage reste humain). **Règle Domino's structurelle** : un pari `isPublic` est REFUSÉ au parse sans `dominosAttestation: true` (persistée dans l'émission hash-chainée) et son horizon est plafonné à **180 jours** (vérifiable dans une fenêtre raisonnable). La baseline d'un sujet mesurable est LUE de la série au moment de la déclaration (mesure, pas fabrication).
3. **Résolution** : la voie **auto** existante (`resolveMaturedForecasts`, cron external-feeds) tranche aussi les paris déclarés dont le sujet est mesurable (`AUDIENCE_TOTAL` / `COMMUNITY_HEALTH` / `FOOTPRINT_SCORE` — la même série se relit, HIT ≤ 25 % d'écart). Le reste passe par `SESHAT_RESOLVE_PREDICTION` (**manuelle**, note de résolution obligatoire = la preuve, Brier calculé). **Append-only (Loi 1)** : un pari résolu ne se réécrit jamais (`PREDICTION_ALREADY_RESOLVED`) ; jamais de `delete`.
4. **Registre public `/paris`** : page publique indexable — paris publics EN COURS puis résolus, **tenus COMME ratés** (c'est ce qui rend les tenus crédibles), jamais le déclarant. Lien depuis le leaderboard. Le cas-phare SPAWT y fait le premier pari (action opérateur en prod).
5. **Calibration visible** : `getCalibrationByKind` (taux de réussite + Brier par famille FORECAST/PLEDGE/ACTION_EFFECT/THESIS), procédure publique (agrégats uniquement). Le critère d'état final n°4 (« taux de réussite affiché sur ≥ 50 paris résolus ») se lit ici.
6. **Surfaces** : section « Paris & engagements » (founder, page Prévisions) + panneau opérateur déclaration/résolution (auto-masqué, pattern candidats).

Glory-tools-first : Intent direct accepté — primitive write/persistence pure du registre, aucune orchestration ni production d'asset.

## Déférés (tracés RESIDUAL-DEBT)

- **Premier Pari Public de SPAWT** : action opérateur en prod (déclaration réelle, modeste, datée) — le code est prêt.
- **Auto-proposition d'ACTION_EFFECT à l'armement calendrier** (chaque action armée propose son effet prédit) : v2, après les premiers paris manuels réellement résolus.
- **Encart paris sur `/b/[slug]`** : quand une marque a ≥ 1 pari public résolu.
