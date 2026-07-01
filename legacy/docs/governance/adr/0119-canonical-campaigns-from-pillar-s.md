# ADR-0119 — Campagnes canon générées par le Pilier S ; toute action rattachée à une campagne

**Status** : Accepted (doctrine — implémentation phasée)
**Date** : 2026-06-28
**Phase** : 24+ — refonte du flux Stratégie → Campagnes → Actions
**Depends on** : ADR-0052 (Campaign double-couche), ADR-0088/0089 (routes roadmap S), ADR-0085 (STOP-à-Jehuty), ADR-0086 (score/tier de marque), ADR-0093/0099 (coûts atomisés + base marché Seshat), ADR-0060 (manual-first parity)
**Supersedes (flux)** : le flux inversé `generateProjectsFromActions` (action → **nouvelle** campagne) est désinversé (P5) : la production s'attache à la campagne existante de l'action, l'orpheline est unifiée dans une campagne d'une action.

## Contexte

L'audit (capture opérateur, 2026-06-28) a montré un flux **inversé** : la roadmap
manipule des `BrandAction` orphelines (niveau Stratégie, **sans `campaignId`**), et
un bouton crée une `Campaign` **à partir d'une action**. Or la doctrine est :
**le Pilier S propose des CAMPAGNES (ensembles d'actions) ; les actions
appartiennent aux campagnes.** `CampaignAction` (rattaché à `Campaign`) et
`BrandAction` (rattaché à `Strategy`) coexistaient sans lien.

## Décision (modèle canonique — validé opérateur)

1. **Inversion du flux** : `S → campagnes → actions`. **Invariant** : toute action
   a une campagne (`campaignId` non-orphelin). Plus aucune action hors campagne.
2. **3 campagnes canon PAR ROUTE S** : chaque route d'ambition (ADR-0088/0089)
   porte son propre jeu de 3 campagnes :
   - **30-60-90 j** — go-to-market &/ou traction (sprint d'ouverture) ;
   - **Annuelle** — consolidation/croissance, s'enchaîne sur la 90 ;
   - **Always-on** — permanente, en parallèle (`endDate` null, budget récurrent).
3. **Génération AUTOMATIQUE depuis le Pilier I** : un Pilier S calculé **doit**
   avoir ses 3 campagnes (× route) calculées depuis les initiatives de I. C'est une
   **exception explicite à STOP-à-Jehuty** (ADR-0085) : c'est de la **projection
   aval déterministe**, pas une écriture ADVE.
4. **Budget conseillé unique ; 3 niveaux d'exécution dérivés en aval** : S propose
   **un** budget recommandé par campagne (dérivé de I + coûts **base marché Seshat**
   `MarketCostSnapshot`). Les **3 niveaux d'exécution** (compression / conseillé /
   dépassement) sont calculés par les **outils** en aval, pas par S.
5. **Le tier de marque conditionne tout** : la maturité (LATENT→ICONE, ADR-0086)
   conditionne les actions (type, budget, durée) → donc les campagnes elles-mêmes
   (objectifs, format, intensité).
6. **AARRR majeur + secondaire par campagne** : chaque campagne porte un objectif
   AARRR **principal** et un **secondaire** — ils orientent la lecture des KPI des
   actions. **Non figé par type** : varie par phase/moment (l'always-on n'est PAS
   cantonné à un seul stade ; février peut faire de la vente pure quand le reste
   de l'année fait du referral).
7. **Annuelle ↔ Always-on complémentaires, ancrées sur les moments de marque** :
   l'annuelle place ses actions sur un **calendrier de prise de parole** :
   - **généraux** : Nouvel An, St-Valentin, 8 mars, Pâques, Ramadan, Back-to-School,
     Noël, fête des mères/pères, fériés internationaux… ;
   - **spécifiques au positionnement** : fête nationale, Black Friday, Halloween,
     nouvel an chinois, fête de la musique, journées mondiales du thème de la marque…
   → table de référence **`BrandMoment`** seedée (généraux + positionnement).
8. **Boucle de feedback mensuelle** : les rapports mensuels (page rapports)
   actualisent l'ADVERTIS → **effet domino sur l'always-on** (ex. budget disponible
   renseigné dans le Pilier Valeur → recalcul de l'always-on).
9. **Coûts d'action = base marché Seshat** (`MarketCostSnapshot`, ADR-0099) —
   branché dans `action-costing/estimator` (PR #353).
10. **Migration** : tout `BrandAction` existant est **unifié dans une campagne**
    (quitte à une campagne d'une seule action), avec une mécanique pour ajouter des
    actions de soutien ; si l'action relève d'une logique 30-60-90 / annuelle, elle
    rejoint le bon strategy-tier et **sa** roadmap.
11. **Ponctuel** : un insight externe / Jehuty génère une **campagne ou une action
    ponctuelle** (toujours rattachée).

## Modèle de données (cible)

- **`Campaign`** (additif) : `canonType` (GTM_90|ANNUAL|ALWAYS_ON|PUNCTUAL),
  `routeKey` (route S d'origine), `aarrrPrimary`, `aarrrSecondary`,
  `recommendedBudget`, `isAlwaysOn`. (`startDate/endDate/budget/strategyId/state`
  existants réutilisés ; always-on ⇒ `endDate = null`.)
- **`BrandAction.campaignId`** nullable + relation `Campaign` (invariant : visé
  non-null après migration).
- **`BrandMoment`** (référence seedée) : `{ key, label, type (GENERAL|POSITIONING),
  month, dayOfMonth?, movable, positioningTag?, note }`.
- **Niveaux d'exécution** : dérivés (JSON calculé par les outils), non stockés sur S.

## Plan d'implémentation (phasé)

- **P0** ✅ Bugs UI roadmap (overflow mobile, franglais, titre court) — PR #352.
- **P0-bis** ✅ Coûts d'action ↔ base marché Seshat — PR #353.
- **P1** — Fondation lien : `BrandAction.campaignId` + relation ; backlog explicite ;
  migration d'unification des orphelines.
- **P2** — Génération canon : Intent gouverné `GENERATE_CANONICAL_CAMPAIGNS`
  (déterministe : I + tier marque + coûts Seshat + routes S ; exception Jehuty) ;
  `BrandMoment` seedé ; ancrage annuel sur les moments.
- **P3** — Onglet Campagnes affiche canon + ponctuelles + leurs actions ; roadmap =
  vue calendaire dérivée des actions DE campagnes.
- **P4** — Ponctuel (insight/Jehuty) + boucle rapport mensuel → ADVERTIS → always-on.
- **P5** ✅ Désinversion du bouton de production : `generateProjectsFromActions` ne crée
  **plus** une campagne par action. Il attache la production (brief + `Mission`) à la
  campagne **existante** de l'action (`campaignId`) ; action orpheline → unifiée dans une
  « campagne d'une action » (`canonType=PUNCTUAL`) puis rattachée. Le bouton roadmap
  devient « Lancer la production » ; plus aucune action hors campagne après production.

## Conséquences

- Plus d'action orpheline ; l'onglet Campagnes devient la surface canonique.
- Cap APOGEE 7/7 préservé — sous-domaine Mestor/Artemis, aucun nouveau Neter.
- Manual-first parity (ADR-0060) : toute génération canon a son équivalent manuel
  (l'opérateur peut créer/éditer campagnes & actions à la main).
