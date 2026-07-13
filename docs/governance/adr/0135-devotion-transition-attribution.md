# ADR-0135 — Attribution des transitions de dévotion (ranimer la calibration morte)

- **Status** : Accepted
- **Date** : 2026-07-13 (soir)
- **Phase** : suite de l'audit [BRIEF-ORACLE-SCORING-PIVOT-AUDIT-2026-07-13](../../audits/BRIEF-ORACLE-SCORING-PIVOT-AUDIT-2026-07-13.md) (mandat opérateur « finis les constructibles, tout dans l'ordre de valeur ») — bloc A
- **Depends on** : ADR-0134 (mesure communautaire réelle : c'est elle qui rend cette dérivation possible), ADR-0081 (régression d'attribution + calibration ROC-AUC/RMSE), ADR-0124 (spine), ADR-0046 (no-magic-fallback), ADR-0060 (manual-first)
- **Supersedes** : —

## Contexte

L'audit a établi (T7) que `CampaignAction.devotionTransitionsObserved` — le **label** de la régression d'attribution (Phase 23, ADR-0081) et l'entrée de l'heuristique Phase 19 (`superfan-economy.ts`) — n'avait **aucun écrivain**, nulle part. Son commentaire promettait « mesuré post-action via cohort match CRM » ; ce chemin n'a jamais été construit. Conséquence : `runAttribution` renvoyait `INSUFFICIENT_DATA` (0/30) à vie, `extractLineage` renvoyait `[]`, la calibration ROC-AUC/RMSE ne pouvait jamais tourner, et le gate `calibration-snapshot-required` bloquait toute promotion PRODUCTION.

À l'époque de l'audit, la remédiation honnête était **impossible sans fabriquer des labels** — ce qui viole `no-invented-data`. Elle a donc été déférée avec son design.

ADR-0134 a changé la donne : le système écrit désormais des `DevotionSnapshot` datés **chaque jour** et actualise les `SuperfanProfile` par rung. Les **montées de rang réelles** deviennent une donnée mesurée et datée — la matière première d'une attribution honnête.

## Décision

### 1. Enregistrement de la transition mesurée (SESHAT)

Dans le single-writer `seshat/superfan-ingest.registerSuperfanProfile`, quand un profil **EXISTANT** monte de rang (`position(newSegment) > position(oldSegment)`), on enregistre un `Signal` type `DEVOTION_TRANSITION` (`data: {handle, platform, from, to, source}`, `createdAt` = horodatage de l'observation). Même pattern que `CULT_TIER_UPGRADE` (émission inline, observabilité).

- **Une naissance n'est PAS une transition** : un profil créé à PARTICIPANT est une classification initiale, pas un mouvement observé. Garde `if (existing)`.
- **Provenance stampée** (`source` ∈ MANUAL/SOCIAL/CRM/CAMPAIGN) — audit.
- **Idempotent par construction** : la sémantique jamais-dégrader d'ADR-0134 fait qu'un profil ne monte qu'une fois ; les passes cron suivantes ne re-déclenchent pas la même transition.

### 2. Attribution temporelle « last-touch dans la fenêtre » (campaign-tracker)

`campaign-tracker/devotion-attribution.rebuildActionTransitions(strategyId)` reconstruit `CampaignAction.devotionTransitionsObserved` :

- charge les `Signal` DEVOTION_TRANSITION (datés) + les `CampaignAction` de la stratégie (fenêtres `startDate`/`endDate`) ;
- pour chaque transition, `lastTouchActionId` = l'action **la plus récemment démarrée** qui était active au moment de l'observation (ou l'a précédée dans la latence d'effet), bornée : `startDate ≤ observedAt`, `observedAt ≤ (endDate ?? startDate) + 14 j` (latence), `observedAt − startDate ≤ 45 j` (rappel). **Aucune action candidate → transition non rattachée** (jamais forcée sur une action au hasard) ;
- agrège par action en records `{from, to, count, source:"MEASURED", lastObservedAt}` — forme lue sans changement par `extractLabel` (Phase 23, `to === "EVANGELISTE"`) ET `sumTransitionsTo` (Phase 19, `count`) ;
- **idempotent** : reconstruit intégralement les records `MEASURED`, **préserve** les records saisis à la main (`source ≠ MEASURED`). N'écrit que les actions dont le contenu change.

Kind gouverné `SESHAT_ATTRIBUTE_DEVOTION_TRANSITIONS` (SESHAT, sync, SLO 10 s/0 $), émis par le cron `social-sync` **après** l'actualisation des superfans (les transitions du jour sont enregistrées avant d'être attribuées) et avant/en parallèle de la chaîne community.

### Doctrine — pourquoi ce n'est PAS de la fabrication

- La transition **est mesurée** : un `SuperfanProfile` réel a réellement monté de rang, à une date réelle.
- L'**association à une action** est un modèle d'attribution DÉCLARÉ et nommé (« last-touch dans la fenêtre ») — c'est précisément **l'hypothèse que la régression teste**. Si les features de l'action (cohérence big-idea, budget) ne prédisent pas la transition, le ROC-AUC tombe vers 0.5 et le gate `calibration-snapshot-required` **refuse** la promotion. Le système travaille ; il n'invente pas un chiffre.
- Les labels 0 (actions sans transition observée) proviennent naturellement des actions qui portent un `bigIdeaCoherenceScore` mais aucune transition rattachée — exactement ce qu'attend une régression logistique. Le seuil `MIN_SAMPLES_REQUIRED_DEFAULT = 30` s'atteint donc à mesure que l'historique s'accumule (comme une vraie calibration).
- **Manual-first (ADR-0060) : non applicable — le chemin est 100 % déterministe** (jointure temporelle, zéro LLM). Le pair manuel existe déjà côté calibration (`MANUAL_COEFFICIENTS`) et les records manuels sur l'action sont préservés.

## Conséquences

- La chaîne attribution/calibration/lineage (Phase 19 + Phase 23) lit enfin du réel. Elle démarre vide (0 transition observée jusqu'à la première montée de rang) et **s'alimente dans le temps** — honnête : la fiabilité PRODUCTION reste gated sur le sign-off direction des seuils ROC-AUC/RMSE (RESIDUAL-DEBT §Phase 23, inchangé).
- 0 nouveau modèle Prisma (réutilise `Signal` daté + le champ `devotionTransitionsObserved` existant), 1 nouveau kind, 0 LLM, cap APOGEE 7/7 préservé.
- Constantes d'attribution déclarées (`ATTRIBUTION_LOOKBACK_DAYS=45`, `ATTRIBUTION_GRACE_DAYS=14`) — heuristique nommée, ajustable par ADR enfant si la calibration montre un meilleur réglage.
- Tests : `devotion-attribution.test.ts` (last-touch pur, agrégation compatible readers, non-rattachement honnête, câblage gouverné, garde montée-de-rang).
- Reste tracé : la disambiguation d'actions concurrentes (v1 = last-touch simple) et l'exposition opérateur de la lignée d'attribution enrichie (déjà partiellement là via `getAttributionLineage`).
