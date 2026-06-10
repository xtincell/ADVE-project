# ADR-0088 — Core Engine refactor : relational backbone (uuid ids + FK lineage), Pillar S as pure computed dashboard, function-calling recommendations

**Status** : Accepted (implemented v6.25.0 → v6.25.4)
**Date** : 2026-06-10
**Phase** : 25 (Core Engine — data model & state)
**Depends on** : ADR-0023 (OPERATOR_AMEND_PILLAR — ADVE editable / RTIS derived), ADR-0063 (LLM-boundary Zod sub-schemas), ADR-0086 (brand maturity score)
**Branch** : `claude/friendly-galileo-XC0w8`

## Contexte

Le Cockpit de Marque a une UI premium (Bento grids, dashboards), mais le modèle de données la bridait. Diagnostic (audit NEFER 2026-06-09) :

- **Document/texte plutôt que relationnel-numérique.** Le contenu pilier vit dans `Pillar.content: Json`. Les variables de synthèse étaient typées texte (`globalBudget` enveloppe unique, risques sans `severity` numérique, actions sans `budget` numérique ni `status`). Les dashboards rendaient des cases vides parce qu'ils attendaient des **nombres calculés**.
- **Data lineage rompu.** Les liens inter-piliers étaient des **références texte par nom** : `I.riskMitigationActions[].riskRef` (nom du risque), `S.sprint90Days[].sourceRef = "catalogueParCanal.DIGITAL[3]"` (chemin texte). Fragiles, cassés au moindre renommage, et non-joignables informatiquement — le lien I→R et I→persona se perdait en arrivant dans S.
- **Moteur IA inefficace.** Les recommandations Notoria mutaient les piliers en **remplaçant du texte par du texte** (`Recommendation.proposedValue: Json` non typé), au lieu d'émettre des mutations ciblées (function calling / event sourcing).

**North Star (déjà le canon, ADR-0023)** : les 4 piliers ADVE = socle SSOT rédigé/inféré ; les 4 piliers RTIS = pure conséquence (calculé / dérivé / IA / sélectionné). **Le Pilier S ne doit accepter aucune saisie de texte statique** — c'est un tableau de bord d'agrégations.

Audit anti-doublon (NEFER interdit #1) : les 3 entités envisagées existaient déjà. `RiskSchema`→`RiskEntrySchema`/`PillarRSchema` ; `InitiativeSchema`→`PotentialActionSchema`+`BrandAction` ; `RecommendationEventSchema`→ modèle Prisma `Recommendation` + Intents event-sourcés. **Donc : étendre en place, ne pas dupliquer.**

## Décision

### 1. Backbone relationnel additif (jamais de migration Prisma — tout est dans le JSON)

Sur `src/lib/types/pillar-schemas.ts`, **tous les nouveaux champs sont `.optional()`** — invariant critique : le Pillar Gateway revalide via `validatePillarPartial` à chaque write (les protocoles RTIS passent `strictSchemaValidation:true`), donc tout champ requis bloquerait la cascade et les réécritures de données pré-backfill.

- `RiskEntrySchema` : `id` (uuid), `severity` (0-100, `deriveSeverity(probability, impact)`), `status` (UNMITIGATED/MITIGATED/ACCEPTED), `category` (COHERENCE/OVERTON/DEVOTION/MARKET).
- `PotentialActionSchema` (= Initiative) : `id`, `status` (DRAFT/RECOMMENDED/SELECTED_FOR_ROADMAP/REJECTED), `budget` numérique, `timeframe`, FK `mitigatesRiskIds` / `targetsPersonaIds`.
- `PersonaSchema` + `T.hypothesisValidation[]` : `id` (cibles de FK).
- Refs texte (`riskRef`, `sourceRef`, `hypothesisRef`) **conservées et dépréciées**, doublées de FK uuid (`riskId`, `sourceInitiativeId`, `hypothesisId`).
- **Validateurs stricts v2** : `RiskEntrySchemaV2` / `PotentialActionSchemaV2` / `validatePillarContentV2` (exigent les ids). Le Gateway garde les validateurs lenients ; v2 sert l'apply function-calling + le test anti-drift.

### 2. Pillar S = tableau de bord purement calculé

`computePillarS(pillars)` (pur, `rtis-protocols/strategy.ts`) agrège le backbone dans `S.content.computed` : `totalBudget` + `budgetByPhase` (Σ des initiatives `SELECTED_FOR_ROADMAP`), `riskCoverage` + `mitigatedRiskIds` (FK : `risk.id ∈ initiative.mitigatesRiskIds`), `overtonPosition` (dérivé de T), `coherenceScore` (R.coherenceRisks), et **3 trajectoires de roadmap** `roadmapRoutes` (CONSERVATIVE / TARGET / AMBITIOUS) — projections déterministes de l'« execution momentum ».

**Chemin S unique** : `rtis-cascade.ts` ne génère plus S via un LLM inline divergent — il délègue à `executeProtocoleStrategy` (comme la branche T délègue à `executeProtocoleTrack`).

**Doctrine de pertinence LLM** : les nombres (projections, totaux, couverture, overton) sont du calcul pur — le LLM **n'est jamais appelé** pour eux. Le LLM reste réservé au contenu **génératif** (narratif roadmap, `strategieDeplacement`) dans `generateStrategy`.

### 3. Recommandations en function-calling (réutilise `Recommendation`, zéro nouveau modèle)

`RecommendationPayloadSchema` (discriminated union) type le champ `Recommendation.proposedValue` : `ADD_INITIATIVE` / `UPDATE_ADVE_FIELD` / `LINK_RISK` / `SELECT_INITIATIVE` / `REJECT_INITIATIVE` / `SET_RISK_STATUS`. `applyPayloadToPillars` (pur) mute risques/initiatives **par id** ; `dispatchTypedRecos` écrit via le Gateway (`REPLACE_FULL`) et recompute S. `applyRecos` route typé vs legacy — les recos legacy (proposedValue non typé) gardent le chemin SET/ADD/MODIFY/REMOVE/EXTEND inchangé (zéro régression).

### 4. Store Zustand cockpit (machinerie UI-locale, pas une 2e SSOT)

`src/lib/stores/cockpit-edit-store.ts` : brouillons d'édition ADVE optimistes + file de revue de recommandations. Hydrate depuis tRPC, flush via les mutations existantes ; le serveur (Prisma) reste autoritaire. **Composants graphiques laissés non-câblés** (contrainte opérateur « ne touche pas à l'UI pour le moment ») — la machinerie est prête pour consommation ultérieure.

### 5. Backfill

`scripts/backfill-pillar-ids.ts` (idempotent, `--dry-run` par défaut, `--commit` pour appliquer) : assigne les uuid, calcule `severity`/`status`, et résout les refs texte → FK par nom/chemin (ordre R→T→D→I→S). **Écriture Prisma directe** (et non le Gateway) : migration structurelle one-time, on ne veut pas déclencher scoring/staleness cascade sur chaque pilier. Refs sans match : laissées non-résolues, jamais fabriquées.

## Conséquences

**Positives** : dashboards alimentés par calcul (plus de cases vides) ; data lineage I→R / I→persona joignable par FK ; S strictement calculé (zéro saisie texte) ; IA en mutations ciblées ; aucun doublon d'entité ; aucune migration Prisma ; cap APOGEE 7/7 préservé (sous-domaine Mestor, aucun nouveau Neter).

**Négatives / résidus** :
- **Génération function-calling côté moteur** : le chemin d'apply est live pour tout payload typé, mais le moteur LLM Notoria ne **génère** pas encore de payloads typés — prochain incrément.
- **Câblage UI** : store + backbone non consommés par les composants graphiques (différé par contrainte opérateur).
- **Backfill opérationnel** : `--commit` à lancer en prod après vérification dry-run.
- Refs texte dépréciées conservées pendant la transition (nettoyage ultérieur une fois le backfill généralisé).

## Anti-drift

- HARD `tests/unit/governance/pillar-core-engine-coherence.test.ts` : v2 exige les ids, S expose `computed` + zéro champ texte éditable (`listEditableFields("s") === []`), `deriveSeverity`, stabilité des enums, couverture des kinds payload.
- `tests/unit/services/compute-pillar-s.test.ts` + `apply-payload.test.ts` + `cockpit-edit-store.test.ts`.
- `variable-bible.ts` : `derivedFrom` sur les champs S calculés (garantit l'invariant via `getEditableMode`).
