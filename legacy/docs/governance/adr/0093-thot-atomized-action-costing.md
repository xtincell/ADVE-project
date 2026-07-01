# ADR-0093 — Thot atomized composite action-costing (cost-of-action database per market)

**Status** : Accepted (implementation — galileo mégasprint, Vague 9)
**Date** : 2026-06-13
**Phase** : 26 (implementation slice of closure-target #18)
**Child of** : [ADR-0087](0087-thot-formula-engine-seshat-zone-indices.md) (Thot formula engine + Seshat zone-indices, no static FCFA grid)
**Depends on** : ADR-0021 (Credentials Vault), ADR-0075 (payment secrets in env), ADR-0043 (budget decoupled), ADR-0060 (manual-first parity)

## Contexte

ADR-0087 a canonisé la doctrine économique runtime : **toute somme = formule Thot à partir d'indices Seshat per-zone, jamais de grille FCFA statique**. Mais la couche *atomisation du coût d'action* manquait. Le repo n'avait que :

- `financial-brain/benchmarks/production-costs.ts` — table **plate** 3-tiers (basic/standard/premium) en XAF, ajustée PPP pays. Aucune décomposition : `SPOT_TV_30S = 1 500 000` est un nombre opaque, pas une somme de location matériel + cout horaire équipe × durée.
- `actors/production-house.ts` `estimateProduction()` — breakdown **grossier** 5 buckets (pre/prod/post + talent + logistics) dérivés en pourcentages du total, TVA hardcodée, marché = PPP seul.
- `MarketBenchmark` — distributions p10/p50/p90 par pays/secteur/métrique (dont `PROD_SPOT_30S`), mais **plates** (pas d'atomes).

Mandat opérateur (galileo) : *« Thot doit tenir une base de données de coût d'action par marché. Mécanique de facturation composite, atomisée. Une séance photo a un coût estimatif atomisé en coût de location matériel, cout horaire prestataire, durée estimée de ce type de job, etc. La base est massive mais définitive et s'ajuste au cost-of-doing-business + cout horaire par marché et par prestataire. Une action en base doit enregistrer assez de data pour que Thot puisse faire son estimation financière. »*

C'est précisément la couche **atomisée** que le formula engine ADR-0087 doit consommer.

## Décision

Shipper la tranche *atomized cost-of-action* de closure-target #18 : un **catalogue d'archétypes d'action décomposés en atomes de coût**, un **résolveur d'indices de zone** (canonique ADR-0087) + **taux par prestataire**, et un **estimateur composite déterministe** (zéro LLM, conforme à la philosophie `financial-brain/types.ts`).

### Chaîne de calcul

```
ActionCostTemplate (archétype : PHOTO_SESSION_HALF_DAY)
  └─ ActionCostComponent[] (atomes : LABOR photographe, EQUIPMENT_RENTAL boîtier, LOCATION studio, POST_PRODUCTION retouche, …)
        ├─ rateBasis = FIXED → baseRate (indicative @ baseZone, DATA pas code-literal)
        ├─ rateBasis = MARKET_INDEX → ZoneIndex(family, zoneCode, key) + fallback voisin éco
        ├─ rateBasis = PROVIDER_RATE → ProviderCostRate(providerId, driver, role, zone)
        └─ rateBasis = BENCHMARK → MarketBenchmark(country, metric).p50
  × zoneMultiplier (ZoneIndex COST_OF_LIVING relatif au baseZone)
  × qualityMultiplier (BASIC 0.7 / STANDARD 1.0 / PREMIUM 1.6)
  × quantity/durée (overridable par action)
  = atom amount
Σ(atoms non-%) = subtotalHt
  + AGENCY_MARGIN (%)  + CONTINGENCY (%)  = totalHt
  + TAX TVA (% via ZoneIndex TAXES family) = totalTtc
```

`estimateActionCost` retourne un `ActionCostEstimateResult` aligné sur le contrat `ThotCalcResult` d'ADR-0087 (`amount` / `currency` / `formula` / `breakdown` / `usedFallback` / `fallbackChain` / `computedAt`) **enrichi des `lineItems` atomiques** (chaque atome avec son `unitRate`, `zoneMultiplier`, `resolvedFrom`).

### Modèles Prisma (nouveaux)

- **`ActionCostTemplate`** — l'archétype catalogué (`actionKey` unique, `category`, `family`, `defaultDurationHours`, `baseZoneCode`, marges/contingence par défaut). La base « massive mais définitive », extensible sans code (rows).
- **`ActionCostComponent`** — l'**atome** (FK template, `driver` enum, `quantity`, `unit`, `rateBasis`, `rateKey`/`indexFamily`, `baseRate`, `appliesToSubtotal` pour les drivers %). Cascade delete depuis le template.
- **`ZoneIndex`** — index per-zone **canonique ADR-0087** (`family` ∈ 7 familles, `zoneCode`, `key`, `value`, time-series `validFrom`/`validTo`). C'est le « par marché ». Implémente le modèle exact spécifié ADR-0087 §Implementation.
- **`EconomicNeighborMap`** — chaîne de fallback voisin éco **canonique ADR-0087** (`zoneCode` PK, `neighbors[]` ordonnés).
- **`ProviderCostRate`** — taux **par prestataire** (`providerKind` TALENT/GUILD/EXTERNAL, `providerId`, `driver`, `roleKey`, `zoneCode?`, `rate`, time-series). C'est le « par prestataire ».
- **`ActionCostEstimate`** — snapshot persisté (audit trail, frère de `CostDecision`) : résultat complet + `lineItems` Json + `formula` + `usedFallback`/`fallbackChain`. Pointe `brandActionId`/`strategyId`/`templateKey` en lien lâche (pas de FK — cohérent avec `CostDecision`).

### Champs additifs `BrandAction` (« une action enregistre assez de data »)

Additifs nullable (migration sûre, pattern Phase 23) : `costTemplateKey`, `costZoneCode`, `costProviderId`, `costQualityTier`, `costInputs` (Json overrides quantité/durée/toggles par atome), `costEstimateId` (→ snapshot), `estimatedCostHt`/`estimatedCostTtc`/`estimatedCostCurrency`. Une `BrandAction` devient ainsi auto-suffisante pour que Thot l'estime.

### Service `financial-brain/action-costing/`

- `types.ts` — DTO + Zod runtime.
- `catalog.ts` — définitions TS canoniques (source de vérité du seed) : 12 archétypes atomisés (PHOTO/VIDEO/AUDIO/PRINT/OOH/EVENT/INFLUENCE/DIGITAL).
- `zone-index.ts` — `resolveZoneIndex(family, zoneCode, key)` + chaîne fallback voisin éco + `ECONOMIC_NEIGHBORS` seed canon (ADR-0087 §3).
- `provider-rate.ts` — `resolveProviderRate(...)`.
- `estimator.ts` — `computeActionCost(...)` **pur déterministe** (testable sans DB) + `estimateActionCostFromDb(...)` (wrapper résolution DB).
- `handler.ts` — `estimateAndPersistActionCost(intent)` (la seule mutation : snapshot + stamp `BrandAction`).
- `index.ts`.

### Gouvernance (intents)

Une mutation = un Intent via `mestor.emitIntent` (règle repo). Ajout :

- `THOT_ESTIMATE_ACTION_COST` (THOT, sync) — calcule + persiste `ActionCostEstimate` + stamp `BrandAction.estimatedCost*`.
- `THOT_UPSERT_ZONE_INDEX` (THOT, sync) — opérateur ajuste un indice de zone (« s'ajuste au cost-of-doing-business par marché »). Path d'ajustement canonique.
- `THOT_UPSERT_PROVIDER_RATE` (THOT, sync) — opérateur ajuste un taux prestataire (« par prestataire »).

Le calcul pur (`thot.calc.estimateActionCost`) et les lectures catalogue sont des **queries tRPC read-only** (pas d'Intent — lecture). Conforme ADR-0087 §2 (`thot.calc.*` prend `zoneCode`).

### tRPC `thot`

Router `thot` : `calc.estimateActionCost` (query pure), `catalog.listTemplates` / `catalog.getTemplate` / `zoneIndex.list` / `providerRate.list` (queries), mutations `estimateActionCost` / `upsertZoneIndex` / `upsertProviderRate` (→ `emitIntent`).

## Conséquences

- **Cap APOGEE 7/7 préservé** — sous-domaine de Thot (`financial-brain`), aucun nouveau Neter.
- **Déterministe** — zéro LLM (header `types.ts`). Même inputs → même output. Testé HARD.
- **ADR-0087 avancé** — `ZoneIndex` + `EconomicNeighborMap` canoniques shippés (familles TJM/COST_OF_LIVING/TAXES seedées) ; les 4 autres familles + `ai-cost-tracker` LLM calculators restent closure-target #18 résiduel.
- **`production-costs.ts` / `estimateProduction()` conservés** — cohabitation (pas de big-bang). L'atomisé est le chemin riche ; le plat reste fallback rapide. Dépréciation du plat tracée [RESIDUAL-DEBT.md](../RESIDUAL-DEBT.md) §Phase 26 après adoption.
- **FCFA en DB = data, pas code-literal** — `baseRate`/`ZoneIndex.value` vivent en table seedée (ADR-0087 : « Computed indice values = ZoneIndex Prisma table »), conforme à la règle « no FCFA literal in source code ».

### Résidus (tracés RESIDUAL-DEBT §Phase 26)

- FOREX multi-devises (zones EUR) — `ZoneIndex` family FOREX non câblée dans l'estimateur v1 (zones FCFA only seedées).
- Console UI `/console/socle/economic-runtime/` (édition indices/taux par opérateur) — intents prêts, UI à venir.
- Migration des `PROJECT_RATES` XAF hardcodés (`actors/freelance.ts`) + TVA Cameroun 19.25% hardcodée vers `ZoneIndex` — tranche suivante.
- 4 familles ZoneIndex restantes + `ai-cost-tracker/` (LLM allowance/overage) — closure-target #18 résiduel.

## Lectures associées

- [ADR-0087](0087-thot-formula-engine-seshat-zone-indices.md) — doctrine parente
- [STATE_FINAL_BLUEPRINT §14-15](../STATE_FINAL_BLUEPRINT.md) — architecture économique runtime
- [closure-roadmap.md target #18](../../../_bmad-output/planning-artifacts/closure-roadmap.md) — tracking Phase 26
