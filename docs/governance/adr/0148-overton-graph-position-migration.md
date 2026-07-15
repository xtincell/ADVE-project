# ADR-0148 — Overton Graph : positions, migrations de zone, attribution

- **Status** : Accepted
- **Date** : 2026-07-15
- **Phase** : Chantier « Graphes & Scoreur à force révélée » (C2/3) — brief opérateur 137f4f21. Fonde l'arène T du scoreur (ADR-0149) : duels de cadre.
- **Depends on** : ADR-0127 (polity SectorPolityAxis), ADR-0126 (échelle de marché), ADR-0135 (attribution last-touch), ADR-0124 (spine), ADR-0046 (no-magic-fallback / P22-2), ADR-0147 (Identity Graph — acteur SUPERFAN)
- **Supersedes** : —

## Contexte

La fenêtre d'Overton ne se mesure **jamais** directement — c'est une déflexion.
Le pilier T porte déjà `overtonPosition`/`perceptionGap`/`competitorOvertonPositions`
en DÉCLARÉ ; il manque la **mesure** qui l'alimente. `grep -i "OvertonPosition\|zone
transition" docs/governance/CODE-MAP.md` → négatif comme entité graphe. On crée
(justifié), en réutilisant la résolution polity (ADR-0127) et l'attribution
last-touch (ADR-0135) — on ne double pas.

## Décision

### 1. Modèle domaine (`src/domain/overton-graph.ts`, pur zéro-LLM)

- 6 zones ordonnées `UNTHINKABLE < RADICAL < ACCEPTABLE < SENSIBLE < POPULAR < POLICY` ;
  `zoneDelta(from,to) > 0` = migration vers l'institué (fenêtre déplacée).
- Acteurs `BRAND|COMPETITOR|SUPERFAN|INSTITUTION|MEDIA` ; arêtes
  `HOLDS|PROPAGATES|OPPOSES|SHIFTS_TOWARD`.
- **Adoption de vocabulaire** (`vocabularyAdoption`) : comptage déterministe des
  hits du lexique marque vs incumbent dans un corpus daté → `WIN/LOSS/DRAW/ABSENT`
  + part (0-1). Corpus vide → `ABSENT` (jamais un faux 0). C'est LE signal du duel
  de cadre de l'arène T.
- **Attribution** (`attributeLastTouch`) : réutilise la méca ADR-0135 (fenêtre de
  rappel 45j + latence de grâce 14j).

### 2. Modèle Prisma (additif, migration `20260715015001`)

- `OvertonPosition { strategyId?, sectorSlug, marketScale?, countryCode?, statement, zone?, evidenceCount, evidence? }`
  — zone `null` = pas de preuve (P22-2). Polity dénormalisée (résolution honnête au read).
- `OvertonActorLink { positionId, actorKind, actorRef?, edgeKind, datedAt?, evidence? }`
  — SUPERFAN → `PersonIdentity.id` (jonction Identity × Overton).
- `OvertonZoneTransition { positionId, fromZone?, toZone, occurredAt, evidence?, attributedActorKind?, attributedActorRef?, attributionModel }`
  — le seul Δ **mesuré**.

### 3. Single-writer + gouvernance (SESHAT, cap 7/7)

`src/server/services/seshat/overton-graph/index.ts` = seul écrivain (verrou HARD
`overton-graph-single-writer.test.ts`). 3 Intent kinds SESHAT + SLO déterministe
(`costP95Usd: 0`), portes `governedProcedure` requireOperator (pas de PII) :
`SESHAT_UPSERT_OVERTON_POSITION` · `SESHAT_RECORD_ZONE_TRANSITION` (bump la zone
courante + attribution) · `SESHAT_LINK_ACTOR_TO_POSITION`. `OPERATOR_TAG_OVERTON_DELTA`
existant reste — branché, pas doublé.

### 4. Lecture pour l'arène T

`getOvertonSignalsForBrand(strategyId)` → positions tenues + transitions favorables
(delta > 0, victoires) / adverses (delta < 0, défaites). Pas de position/transition
⇒ tableaux vides ⇒ arène T « absente », RD large en aval (jamais fabriquée).

## Conséquences

- La fenêtre devient traçable comme un graphe de positions datées + attribuées — pas
  un score de fenêtre inventé.
- Jonction mission : `PersonIdentity —PROPAGATES→ OvertonPosition` (superfans =
  acteurs de la déflexion).
- 0 LLM (LOI 9), single-writer + HARD, migration additive, cap 7/7.

## Dette (incréments suivants)

- Câblage des feeds (culture RSS / Argos / `bridgeTarsisToSectorIntelligence`) comme
  producteurs automatiques de positions + corpus de vocabulaire (aujourd'hui : voie
  opérateur/programmatique).
- Résolution EXACT/SCALE_ONLY/GLOBAL_FALLBACK affichée sur la position (polity
  dénormalisée stockée ; le niveau de résolution reste à surfacer comme sur le radar).
- Détection automatique de transitions (aujourd'hui : `recordZoneTransition` explicite).
