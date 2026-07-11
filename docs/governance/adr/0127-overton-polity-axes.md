# ADR-0127 — Axes Overton par polity (secteur × échelle × pays)

**Status** : Accepted
**Date** : 2026-07-11
**Phase** : hors plan séquencé (carte blanche opérateur — « shippe tout le reste ») — complète ADR-0126
**Depends on** : ADR-0126 (échelle de marché déclarée), ADR-0046 (no-magic-fallback), ADR-0060 (manual-first), ADR-0078 (ConnectorResult ingestion)
**Enfant de** : ADR-0086

## Contexte

`Sector.slug @unique` = **un seul axe culturel GLOBAL par secteur**. Or déplacer la fenêtre d'Overton d'un quartier n'est pas la déplacer d'une nation ni d'un continent — l'inspection scoring 2026-07-11 (les « ranges sociaux et politiques différents » de l'opérateur) a montré que la marque de quartier et l'acteur continental étaient mesurés contre le MÊME centre sectoriel. Re-clé-er `Sector` casserait tous les consumers ; inventer des axes par polity sans observation violerait ADR-0046.

## Décision

### A. Modèle additif `SectorPolityAxis`

`(sectorSlug, marketScale, countryCode)` unique — `countryCode ""` = axe supra-national de l'échelle (sentinel documenté : l'unicité DB tient, Postgres traite les NULL comme distincts). Mêmes formes JSON que `Sector` (`culturalAxis` = SectorAxis, `overtonState` = OvertonSnapshot). Le `Sector` global existant n'est PAS re-clé : il devient le **fallback de résolution**. Migration `20260711150000`, zéro backfill (aucune donnée inventée par polity).

### B. Résolution honnête — `getSectorAxisForPolity`

`EXACT` (échelle + pays) → `SCALE_ONLY` (axe supra-national de l'échelle) → `GLOBAL_FALLBACK` (axe Sector historique) → `null` (rien n'existe — EmptyState aval). **Le niveau de résolution est toujours surfacé**, jamais masqué : le radar founder (`cockpitDashboard.overtonSignal`) porte `axisPolityResolution` sur `OvertonRadarSignal` — « fenêtre observée à votre échelle » vs « axe global, votre polity n'est pas encore observée » sont deux vérités différentes.

### C. Écriture gouvernée unique

Intent kind **`SESHAT_UPSERT_POLITY_AXIS`** (governor SESHAT, sync, SLO 800 ms/0 $) porté par `market-intelligence.upsertPolityAxis` (`requireOperator` — seed manuel opérateur, manual-first ADR-0060) et consommable par l'ingestion Tarsis scoped future. Les signaux sont **fournis** (l'axe est calculé par `computeAxisFromSignals` existante — réutilisée, pas dupliquée) ; jamais fabriqués.

### D. Périmètre de cette vague (et honnêteté sur le reste)

- ✅ Modèle + résolveur + Intent + procédures (upsert opérateur / lecture polity) + radar founder câblé + manifest + tests HARD.
- ⏳ **Harvesting Tarsis automatique par polity** : dépend du connector Tarsis réel (contract-gated — `_mocked` aujourd'hui). Le chemin d'écriture gouverné est prêt ; le branchement auto suivra le contrat vendor (registre existant « credential/contract-gated »).
- ⏳ **Pondération CULTE/ICONE par largeur de fenêtre déplacée** : possible dès que des axes polity réels existent — les seuils de pondération exigent une calibration validée par la direction (pattern Phase 23 : promotion gated sur sign-off des seuils), pas des constantes inventées. Infra prête, activation = décision opérateur.

## Conséquences

- Le radar Overton du founder lit la fenêtre de SA polity quand elle est observée, et le DIT quand elle ne l'est pas.
- Les opérateurs peuvent seeder des axes par marché (ex. « énergie × NATION × CM ») sans toucher l'axe global.
- Tests : `scoring-scale-aware.test.ts` §ADR-0127 (modèle + unicité + 3 niveaux + kind/SLO/manifest + câblage radar).
