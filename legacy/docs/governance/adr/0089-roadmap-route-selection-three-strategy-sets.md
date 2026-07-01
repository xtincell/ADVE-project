# ADR-0089 — Sélection d'ambition : 3 jeux de stratégie pure-computed par trajectoire de roadmap (Pillar S)

**Status** : Accepted (implemented v6.25.12)
**Date** : 2026-06-10
**Phase** : 25 (Core Engine — data model & state)
**Depends on** : ADR-0088 (Core Engine — relational backbone + computed S), ADR-0060 (manual-first parity), ADR-0023 (ADVE editable / RTIS derived)
**Branch** : `claude/friendly-galileo-XC0w8`

## Contexte

ADR-0088 a livré les 3 trajectoires de roadmap (`S.computed.roadmapRoutes` — CONSERVATIVE / TARGET / AMBITIOUS) comme **projections numériques** pure-computed (+22 / +58 / +115 % à momentum 0.6). Audit NEFER 2026-06-10 : le contrat moteur attendu — *« le S produit 3 jeux de stratégie pour conclure les ADVERTIS en fonction de l'ambition sélectionnée »* — n'était qu'à moitié tenu :

1. **Pas de jeu de stratégie par route.** Les routes ne portaient que des chiffres de projection (croissance, CA, Cult Index) ; le contenu stratégique réel (initiatives, budget, posture risque) restait un jeu unique.
2. **Aucun mécanisme de sélection.** Zéro `selectedRoute` dans le code, `recommended: true` hard-codé sur TARGET, cartes display-only. Choisir « Ambitieux » ne changeait rien en aval.

## Décision

### 1. Chaque route porte son JEU DE STRATÉGIE — dérivation déterministe du même backbone (jamais de LLM)

`computeRoadmapRoutes` (étendu, `rtis-protocols/strategy.ts`) dérive pour chaque route un sous-ensemble du backbone d'initiatives (`routeInitiativeSet`, pur) :

- **CONSERVATIVE** : initiatives `SELECTED_FOR_ROADMAP` court-terme (`timeframe ∈ {SPRINT_90, PHASE_1}`) — statu quo + optimisations marginales.
- **TARGET** : toutes les `SELECTED_FOR_ROADMAP` — le programme engagé par l'opérateur. **C'est le jeu pré-ADR-0089 : default = zéro changement de comportement.**
- **AMBITIOUS** : `SELECTED + RECOMMENDED` — extension du programme avec les candidates IA (superfans + expansion).

Chaque route expose son jeu agrégé (`aggregateInitiativeSet`, pur) : `initiativeIds[]` (FK uuid), `initiativeCount`, `totalBudget`, `budgetByPhase`, `riskCoverage`. Invariant conservé : **les nombres sont du calcul pur, le LLM n'est jamais appelé** (doctrine ADR-0088 §2).

Les **projections** (momentum → growth %) restent calculées sur le jeu TARGET quelle que soit l'ambition retenue : ce sont des *scénarios* du même backbone, invariants au choix — sinon sélectionner une ambition déplacerait ses propres chiffres (cercle).

### 2. Sélection d'ambition = `S.computed.selectedRouteKey` (sélection, jamais saisie)

- Persistée **dans `computed`** (pas un champ top-level) — donc **zéro nouveau requirement** dans le contract de completion : pas de régression du 100 % (le bug que la Phase courante vient de fermer).
- `computePillarS` résout : override explicite > sélection persistée dans le S précédent (`pillars.s.computed.selectedRouteKey`) > default `TARGET`. Clé invalide → TARGET (jamais de crash). `executeProtocoleStrategy` charge désormais le S précédent pour que la sélection **survive aux regens**.
- **Le dashboard principal de S agrège le jeu de la route sélectionnée** (`totalBudget`, `budgetByPhase`, `riskCoverage`, `mitigatedRiskIds`, `selectedInitiativeCount`) — c'est ainsi que « le S conclut les ADVERTIS en fonction de l'ambition ».
- S reste un dashboard sans saisie : `listEditableFields("s") === []` inchangé (la sélection est un *mode sélectionné* ADR-0023, comme `selectedFromI` — pas un texte).

### 3. Mutation gouvernée — payload `SELECT_ROADMAP_ROUTE` + Intent + manual-first parity

- Nouveau kind dans la discriminated union function-calling (`RecommendationPayloadSchema`, ADR-0088 §3) : `{ kind: "SELECT_ROADMAP_ROUTE", routeKey }`. `applyPayloadToPillars` l'applique ; tout changement de S déclenche le recompute (comme i/r/t).
- Chemin opérateur direct `selectRoadmapRoute(strategyId, routeKey)` (`notoria/apply-payload.ts`) — même chemin d'application que les recos typées, persisté via le Pillar Gateway (jamais d'update Prisma direct). Manual-first parity (ADR-0060).
- tRPC `notoria.selectRoadmapRoute` en `governedProcedure({ kind: "SELECT_ROADMAP_ROUTE" })` — IntentEmission hash-chainée pre/post. Kind enregistré dans `intent-kinds.ts` (governor MESTOR, handler notoria, sync).

### 4. Surfaces

- **Cockpit (page pilier S)** : panneau « Ambition stratégique » — 3 cartes (growth, Cult Index cible, jeu : n initiatives · budget · % risques couverts) + bouton « Retenir cette ambition ». Seule surface de mutation.
- **Oracle §12 (Fenêtre d'Overton)** : `mapFenetreOverton` surface `selectedRouteKey` + le jeu par route ; le composant met en avant la route **Sélectionnée** (badge prioritaire sur « Recommandé »), read-only (présentation publique partagée).

## Conséquences

**Positives** : le contrat moteur est tenu — 3 jeux de stratégie dérivés des mêmes données, sélection d'ambition opérateur gouvernée, dashboard S conclusif par ambition ; default TARGET = zéro régression ; aucun nouveau modèle Prisma ; cap APOGEE 7/7 préservé (sous-domaine Mestor/Notoria).

**Négatives / résidus** :
- La différenciation des jeux est **structurelle** (court-terme / engagé / étendu), pas narrative : la roadmap LLM (4 phases) et le sprint 90j restent communs aux 3 ambitions. Une variation narrative par ambition serait un appel LLM paramétré par `selectedRouteKey` — incrément futur si le besoin est confirmé.
- Le moteur Notoria ne **génère** pas encore de reco `SELECT_ROADMAP_ROUTE` (même résidu que ADR-0088 §3 pour la génération typée).

## Anti-drift

- `tests/unit/services/compute-pillar-s.test.ts` — bloc ADR-0089 : inclusion CONSERVATIVE ⊂ TARGET ⊂ AMBITIOUS, re-agrégation du dashboard par ambition, persistance de la sélection au recompute, invariance des projections, fallback TARGET sur clé invalide.
- `tests/unit/services/apply-payload.test.ts` — payload SELECT_ROADMAP_ROUTE écrit `computed.selectedRouteKey` + flag S changed.
- `tests/unit/governance/pillar-core-engine-coherence.test.ts` — couverture des 7 kinds payload + rejet des clés non-canoniques + `listEditableFields("s") === []` maintenu.
- `tests/unit/services/map-fenetre-overton.test.ts` — surfacing Oracle de la sélection + jeu par route + dégradation legacy.
