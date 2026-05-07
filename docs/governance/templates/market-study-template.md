<!--
  Template canonique pour étude de marché ingérable par Seshat
  (`src/server/services/seshat/market-study-ingestion/extractor-structured.ts`).

  Format : `structured-market-study/v1` (déclaré dans le frontmatter).

  Contrat (ADR-0037 PR-I + ADR-0060 manual-first parity) :
  - Le parser lit ce document tel quel (pas de LLM dans la voie structurée).
  - Toute cellule laissée vide ou contenant `-` est interprétée comme `null`/absent.
  - Aucun champ n'est inventé. Si un chiffre n'est pas dans la source, on n'écrit RIEN.
  - Chaque chiffre exige une `source` textuelle (page, table, paragraphe, URL).
  - Le résultat alimente N `KnowledgeEntry` rows (TAM / COMPETITOR / SEGMENT / DIGEST / RAW)
    indexées par `(countryCode, sector, sourceHash)`. Re-upload identique = no-op (dedup SHA256).

  Conventions cellules :
  - Nombres : `1200`, `0.085`, `5.2` (point décimal). Pas de virgule, pas d'unité dans la cellule.
  - Listes : séparées par `;` (ex: `social-driven; influencer-buying`).
  - Objets `demographics` : `clé=valeur, clé=valeur` (ex: `age=18-25, income=mid`).
  - Chaîne causale : étapes séparées par ` -> ` (ex: `inflation -> érosion pouvoir d'achat -> arbitrage`).
  - `null` ou cellule vide ⇔ donnée non observée. Ne pas mettre `0` pour signifier "inconnu".
-->

---
format: structured-market-study/v1
study:
  title: "REMPLIR — titre exact de l'étude"
  publisher: "REMPLIR — Nielsen / Kantar / Statista / cabinet / autre"
  publishedAt: "YYYY-MM-DD"
  methodology: "REMPLIR — panel, sell-out, desk research, mixte, …"
  sampleSize: 0
  geography: "REMPLIR — pays ou région principal couvert"
  sectorCoverage:
    - "REMPLIR — secteur principal"
scoping:
  countryCode: "XX"
  sector: "REMPLIR — secteur (doit matcher au moins une entrée de sectorCoverage)"
  brandNature: "PRODUCT"
  cascadeLevel: "MASTER_BRAND"
  period: "2024-2029"
sources:
  - "REMPLIR — source primaire 1"
  - "REMPLIR — source secondaire 1"
---

# Étude de marché — fiche d'ingestion structurée

> Document à remplir par le market researcher. Cible : nourrir la fiche de marque
> (Variable Bible) via Seshat sans passer par l'extraction LLM (anti-fabrication
> garantie par la forme déterministe).
>
> **Lire le bloc de commentaire en tête du fichier avant de remplir** : conventions
> cellules, règles `null`, format des listes / objets / chaînes causales.

---

## §1 TAM / SAM / SOM

| metric | value | currency | year | methodology | source |
|---|---|---|---|---|---|
| TAM | - | - | - | - | - |
| SAM | - | - | - | - | - |
| SOM | - | - | - | - | - |

> Mapping fiche de marque : `t.tamSamSom`
> KnowledgeEntry produit : `MARKET_STUDY_TAM`
> Au moins TAM est requis pour qu'une row TAM soit créée. SAM/SOM optionnels.

---

## §2 Croissance & saisonnalité

| segment | cagr | period | source |
|---|---|---|---|

> Mapping fiche de marque : `t.marketTrends`
> Une ligne par segment de croissance documenté. `cagr` en décimal (ex: `0.085` pour 8.5 %).
> Ne pas inventer une CAGR si elle n'est pas explicitement chiffrée dans la source.

---

## §3 Concurrents

| name | marketSharePct | year | source |
|---|---|---|---|

> Mapping fiche de marque : `r.competitorSet`
> KnowledgeEntry produit : 1 row `MARKET_STUDY_COMPETITOR` par ligne.
> `marketSharePct` en `%` (0–100). Vide si non documenté — ne pas estimer.

---

## §4 Segments consommateur

| segment | sizePct | demographics | behaviors | painPoints |
|---|---|---|---|---|

> Mapping fiche de marque : `a.publicCible` + `v.valeurFonctionnelle` + `v.valeurEmotionnelle`
> KnowledgeEntry produit : 1 row `MARKET_STUDY_SEGMENT` par ligne.
> `sizePct` en `%` (0–100). `demographics` = `clé=valeur, clé=valeur`.
> `behaviors` et `painPoints` = liste séparée par `;`.

---

## §5 Prix

| tier | range | asp | source |
|---|---|---|---|

> Mapping fiche de marque : contexte `t.tamSamSom` + business model.
> `tier` = libellé (ex: `entry`, `mid`, `premium`). `asp` = average selling price (nombre).

---

## §6 Mix canaux

| channel | sharePct | growthTrend |
|---|---|---|

> Mapping fiche de marque : `i.catalogueParCanal`
> `channel` en libellé court (ex: `e-commerce`, `traditional retail`, `pharmacie`).
> `sharePct` en `%` (0–100). `growthTrend` libre (ex: `+12% YoY`, `flat`, `decline`).

---

## §7 Réglementaire

| regulation | impactSeverity | timeline |
|---|---|---|

> Mapping fiche de marque : `r.globalSwot.threats`
> `impactSeverity` ∈ { `LOW`, `MEDIUM`, `HIGH` } (majuscules strictes).

---

## §8 Macro signals

| trend | evidence | timeHorizon |
|---|---|---|

> Mapping fiche de marque : alimente pilier T (dérivé via Tarsis).
> `timeHorizon` ∈ { `SHORT`, `MEDIUM`, `LONG` } ou vide.
> KnowledgeEntry produit : agrégés dans `EXTERNAL_FEED_DIGEST`.

---

## §9 Signaux faibles

| event | causalChain | impactCategory | urgency |
|---|---|---|---|

> Mapping fiche de marque : alimente pilier T DISTINCTIVE Tarsis (Oracle §33).
> `causalChain` = étapes séparées par ` -> ` (ex: `pénurie devise -> hausse import -> reflation conso`).
> `urgency` ∈ { `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` } ou vide.

---

## §10 Trend Tracker — 49 variables canon

> Mapping fiche de marque : alimente pilier T (Track) via `KnowledgeEntry.data.trendTracker`.
> Codes canoniques cf. [`src/server/services/seshat/knowledge/trend-tracker-49.ts`](../../../src/server/services/seshat/knowledge/trend-tracker-49.ts).
> Laisser `value` vide pour les variables non documentées dans la source — Seshat les traitera
> comme absentes (anti-fabrication). `confidence` ∈ [0, 1] optionnel.

| code | label | value | year | source | confidence |
|---|---|---|---|---|---|
| A1 | Confiance consommateur | - | - | - | - |
| A2 | Inflation IPC (12 mois) | - | - | - | - |
| A3 | Croissance PIB | - | - | - | - |
| A4 | Sentiment marque + IA (30j) | - | - | - | - |
| A5 | Taux de change USD local | - | - | - | - |
| A6 | Taux directeur banque centrale | - | - | - | - |
| A7 | Balance commerciale | - | - | - | - |
| A8 | Investissements directs étrangers (FDI) | - | - | - | - |
| A9 | Demographic dividend | - | - | - | - |
| A10 | Pouvoir d'achat (PPP per capita) | - | - | - | - |
| A11 | Taux de chômage | - | - | - | - |
| A12 | Dette publique / PIB | - | - | - | - |
| B1 | Pénétration Internet | - | - | - | - |
| B2 | Pénétration smartphone | - | - | - | - |
| B3 | Mobile money pénétration | - | - | - | - |
| B4 | E-commerce share retail | - | - | - | - |
| B5 | AI / GenAI maturity | - | - | - | - |
| B6 | Cloud adoption entreprises | - | - | - | - |
| B7 | Coût broadband moyen | - | - | - | - |
| B8 | Usage social media | - | - | - | - |
| C1 | Valeurs générationnelles dominantes | - | - | - | - |
| C2 | Attitude CSR / RSE | - | - | - | - |
| C3 | Influence diaspora | - | - | - | - |
| C4 | Religiosité | - | - | - | - |
| C5 | Taux d'éducation supérieure | - | - | - | - |
| C6 | Urbanization rate | - | - | - | - |
| C7 | Langue dominante shift | - | - | - | - |
| C8 | Confiance institutionnelle | - | - | - | - |
| C9 | Indice inégalité (Gini) | - | - | - | - |
| C10 | Engagement civique / vote | - | - | - | - |
| D1 | Pression fiscale entreprises | - | - | - | - |
| D2 | Coût création entreprise | - | - | - | - |
| D3 | Délai obtention licences sectorielles | - | - | - | - |
| D4 | Dépôts OAPI / IP locale | - | - | - | - |
| D5 | Cadre data protection (GDPR-equiv) | - | - | - | - |
| D6 | Risque sanctions internationales | - | - | - | - |
| D7 | Cycle électoral / stabilité | - | - | - | - |
| E1 | Intensité concurrence sectorielle | - | - | - | - |
| E2 | Barrières à l'entrée | - | - | - | - |
| E3 | Marges typiques sector | - | - | - | - |
| E4 | Croissance sector (CAGR 5y) | - | - | - | - |
| E5 | Activité M&A sector | - | - | - | - |
| E6 | Prix moyen catégorie | - | - | - | - |
| E7 | Distribution mix | - | - | - | - |
| E8 | NPS moyen sector | - | - | - | - |
| E9 | Churn rate moyen sector | - | - | - | - |
| E10 | CAC sector benchmark | - | - | - | - |
| E11 | LTV sector benchmark | - | - | - | - |
| E12 | Top 3 leaders parts de marché | - | - | - | - |

---

## Annexe — checklist avant ingestion

- [ ] `format: structured-market-study/v1` présent dans le frontmatter (sinon le parser refuse)
- [ ] `scoping.countryCode` = code ISO-2 majuscules (ex: `ZA`, `CM`, `NG`, `CI`, `MA`)
- [ ] `scoping.sector` non vide et présent dans `study.sectorCoverage`
- [ ] Tous les chiffres ont une `source` textuelle (page, paragraphe, URL)
- [ ] Aucun chiffre inventé — cellules vides ou `-` partout où la source ne dit rien
- [ ] Listes correctement séparées (`;` dans cellules `behaviors` / `painPoints` ;  ` -> ` pour `causalChain`)
- [ ] Pas de PII dans les verbatims (noms, emails, téléphones de répondants)

## Annexe — qu'est-ce qui NE relève PAS de ce template

Hors périmètre — à fournir par d'autres voies (founder, audit interne, opérateur) :

- Vision / promesse fondamentale du fondateur → `OPERATOR_AMEND_PILLAR` mode `STRATEGIC_REWRITE`
- Audit visuel / verbal de la marque actuelle → audit interne ou Glory tool dédié
- Choix du `manipulationMix` (peddler / dealer / facilitator / entertainer) → décision opérateur
- KPIs cibles → arbitrage business

---

*Template versionné. Toute évolution structurelle → bump `format: structured-market-study/v2`
et migration parser dans [`extractor-structured.ts`](../../../src/server/services/seshat/market-study-ingestion/extractor-structured.ts).*
