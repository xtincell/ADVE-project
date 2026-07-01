# ADR-0087 — Economic architecture canon : Thot formula engine + Seshat zone-indices at runtime, no static FCFA grid

**Status** : Accepted (doctrine canon ; implementation Phase 26 closure-target #18)
**Date** : 2026-05-16
**Phase** : 23 (doc-only canonization) ; **Phase 26** (implementation via closure-roadmap target #18)
**Depends on** : ADR-0075 (payment secrets in env), ADR-0021 (Credentials Vault for connectors), ADR-0043 (budget decoupled from campaigns)
**Source canon** : [STATE_FINAL_BLUEPRINT §14 + §15](../STATE_FINAL_BLUEPRINT.md)

## Contexte

La Fusée opère **Afrique francophone** au minimum : UEMOA + CEMAC + diaspora (France / Belgique / Canada francophone). Cost-of-living, TJM créatif, marketing budgets, mobile money fees, taxes varient massivement par zone :

- Tier Pro à Dakar ~1M FCFA, mais Cotonou ~800k, Libreville ~1.2M (différences d'indices)
- TVA Cameroun 19.25%, Côte d'Ivoire 18%, Sénégal 18%, Gabon 18% (mais 0% pour exports / certaines catégories)
- Mobile money fees : Wave gratuit P2P SN, Orange Money MTN 1-2% transactions inter-comptes, etc.

**Hardcoder des prix FCFA dans le code, l'UI, ou les docs business est doctrinalement faux.** Le code repo contient actuellement des `PROJECT_RATES XAF` hardcoded dans `actors/freelance.ts`, des TVA Cameroun 19.25% en dur, des prix FCFA dans PRD et blueprint en tant qu'examples — tout cela devra basculer vers du runtime calculé.

STATE_FINAL_BLUEPRINT §14 (2026-05-16) formalise l'**architecture économique runtime** : tout calcul économique = formule Thot à partir d'indices Seshat per-zone. Pas de grille statique. Cette ADR canonise la doctrine et planifie l'implementation (closure-target #18 Phase 26).

## Décision

### Doctrine architecturale

```
Seshat (zone-indices, multi-source orchestré) 
    → Thot (formula engine, tRPC thot.calc.*)
    → Cockpit / Console / Hub-Escrow / Intake (consommateurs UI)
```

**Toute somme monétaire affichée à l'utilisateur, toute commission, tout escrow amount, toute LLM allowance, toute pricing decision** passe par cette chaîne. Aucun chemin court-circuit.

### Trois règles structurelles

1. **No FCFA literal in source code or markdown docs** (excluding sample/example contexts explicitly labeled "indicative zone Dakar/Abidjan"). Anti-drift test `no-hardcoded-fcfa.test.ts` 📋 à créer Phase 26 (HARD mode après baseline initial).

2. **All pricing / costing / commission / escrow / LLM-overage calculations are tRPC `thot.calc.*` procedures** taking `(zoneCode, ...inputs)` et returning :
   ```ts
   type ThotCalcResult = {
     amount: number;            // valeur calculée
     currency: string;          // ISO 4217 ou enum mobile-money
     formula: string;           // expression human-readable (e.g. "TJM × commissionRate × (1 + TVA)")
     breakdown: Record<string, number>;  // valeurs intermédiaires
     usedFallback?: boolean;    // true si Seshat manquait l'indice pour la zone
     fallbackChain?: string[];  // ["BF", "CI"] si fallback voisin éco
     computedAt: string;        // ISO datetime
   };
   ```

3. **Zone-indices missing for a zone → economic neighbor fallback** :
   ```ts
   const economicNeighbors: Record<CountryCode, CountryCode[]> = {
     BF: ["CI", "ML", "SN"],   // Burkina Faso → CI / Mali / Sénégal
     GA: ["CM", "CG", "GQ"],   // Gabon → Cameroun / Congo / Guinée Eq.
     // ...
   };
   ```
   Fallback ultime : médiane UEMOA (XOF) ou CEMAC (XAF) selon zone. Réponse Thot inclut **`usedFallback: true, fallbackChain: ["BF", "CI"]`** pour traçabilité opérateur.

### Thot calculator inventory (16 canoniques, **6 manquants**)

État vérifié 2026-05-16 (cf. blueprint §14.2) :

**Famille Freelance / Talent (4)**

| Calculator | Statut | Localisation actuelle |
|---|---|---|
| `computeTJM(creatorId, zoneCode)` | 🟡 partial (XAF hardcoded baseline) | `actors/freelance.ts` |
| `computeCommissionRate(creatorId, missionValue, brandTier)` | ✅ | `commission-engine/index.ts` |
| `computeFreelanceBreakeven(creatorId, zoneCode)` | ✅ | `actors/freelance.ts` |
| `computeTalentScoreEvolution(creatorId)` | 🟡 | `talent-engine/` |

**Famille Marque (4)**

| Calculator | Statut |
|---|---|
| `computeCODB(strategyId, zoneCode)` | ✅ (`glory-tools/calculators.ts`) |
| `computeOperatingBudget(strategyId, splitMode)` | ✅ |
| `computeMarketingShareAdvised(strategyId, zoneCode)` | ✅ |
| `computeRetainerFitness(strategyId)` | ❌ **MANQUE** |

**Famille Agence (2)** : `computeAgencyPlanPrice` ✅, `computeAgencyMargin` ✅

**Famille Hub-Escrow (3)** :

| Calculator | Statut |
|---|---|
| `computeEscrowAmount(taskSpec, zoneCode)` | ❌ **MANQUE** (service escrow contractuel existe, calculator absent) |
| `computeEscrowReleaseDate(escrowId)` | ❌ **MANQUE** |
| `computeDisputeArbitrage(escrowId)` | ❌ **MANQUE** |

**Famille LLM + Infra (4)** :

| Calculator | Statut |
|---|---|
| `computeLlmAllowance(accountId, currentTier)` | ❌ **MANQUE** (`ai-cost-tracker/` absent) |
| `computeLlmOverage(accountId)` | ❌ **MANQUE** |
| `computeForexExposure(period)` | ❌ **MANQUE** (multi-currency mature, hedging absent) |
| `computeMobileMoneyFees(amount, operator, country)` | 🟡 partial (detection ok, fee calc non exposé tRPC) |

**Famille Trajectoire Palier (2)** : `computeNextPalierProofs`, `computePalierTransitionCost` ❌ **MANQUENT** (couplés closure-target #15 scoring-engine — Phase 24).

### Seshat zone-indices inventory (7 familles canoniques, **0/7 shipped**)

État vérifié 2026-05-16 : aucun sous-dossier `seshat/zone-indices/` ou `seshat/benchmarks/` au sens canonique. Alternative existante minimale : `market-pricing.ts` tRPC router (2 procedures read-only `getReference` + `getSectorBenchmarks`).

| Indice | Source primaire planifiée | Refresh | Owner Seshat |
|---|---|---|---|
| Cost-of-living | Numbeo API + Banque Mondiale | trimestriel | `zone-indices/cost-of-living/` |
| Forex | XE/OANDA + BCEAO/BEAC officiel | quotidien | `zone-indices/forex/` |
| Inflation / GDP | Banque Mondiale + BCEAO + INS pays | mensuel | `zone-indices/macro/` |
| TJM créatif | **Hunter sub-agent crawl** (ADR-0083) + sondages + Académie | trimestriel | `zone-indices/tjm/` |
| Marketing budgets | Nielsen Africa + eMarketer + Tarsis aggregation | trimestriel | `zone-indices/marketing-budgets/` |
| Mobile money fees | Operator APIs ou official scrape | hebdo | `zone-indices/mobile-money-fees/` |
| TVA / taxes | Country DGI + veille juridique | event-driven | `zone-indices/taxes/` |

### Hiérarchie de transparence

| Vue | Niveau de détail formule |
|-----|--------------------------|
| **Cockpit founder** | Prix final + breakdown haut-niveau ("450 000 FCFA · ce prix inclut commission UPgraders + TVA Sénégal + frais mobile money"). PAS la formule complète. |
| **Cockpit agence** | Idem founder, plus visibilité agréée sur les clients qu'elle gère. |
| **Console UPgraders + agences filles** | Formule complète avec variables, coefficients zone/industrie/cumul, breakdown granulaire, insights opérationnels (Hunter détecte croissance secteur, benchmark Nielsen, opportunités upgrade, marge réelle vs coûts LLM). Permet justification client + négociation + customisation. |

Anti-drift : aucune UI Cockpit ne doit exposer la formule complète (sécurité commerciale + pédagogie). Test `cockpit-no-formula-leak.test.ts` 📋 à créer Phase 26.

### `ai-cost-tracker/` (sous-chantier critique)

Phase 26 doit shipper `src/server/services/ai-cost-tracker/` qui :

- Track cumul LLM tokens consommés par `accountId` par mois
- Compare au quota inclus du tier abonnement (calculé par `computeLlmAllowance`)
- Émet notifications à 80% / 100% / 120% (NspEvent + email + in-app)
- Offre 3 options dépassement configurables par account :
  - **(a) Cap auto** — stop Glory tools LLM-heavy jusqu'au mois suivant
  - **(b) Overage transparent** — coût réel + 10% margin facturé fin mois
  - **(c) Upgrade prorata** — bascule tier supérieur au prorata jours restants

Sans `ai-cost-tracker`, les coûts variables LLM ne sont pas couverts → drift économique massif.

## Conséquences

### Implementation scope (closure-target #18, Phase 26)

Cette ADR canonise la doctrine — l'implementation est trackée comme **closure-roadmap target #18** Phase 26 :

**Nouveau service tree** :
- `src/server/services/seshat/zone-indices/` — 7 sous-modules (un par famille d'indice)
- `src/server/services/ai-cost-tracker/` — nouveau service couvrant LLM costs runtime
- Extension de `src/server/services/thot/` (post-rename `financial-brain/` cf. closure-target #19 Phase 25) avec les 6 calculators manquants

**Nouveaux modèles Prisma** :
```prisma
model ZoneIndex {
  id          String    @id @default(cuid())
  family      ZoneIndexFamily  // COST_OF_LIVING | FOREX | MACRO | TJM | MARKETING_BUDGETS | MOBILE_MONEY_FEES | TAXES
  zoneCode    String    // ISO 3166 alpha-2
  key         String    // sub-index key (e.g. "rent_2br_central" for cost-of-living)
  value       Float
  currency    String?
  unit        String?
  validFrom   DateTime
  validTo     DateTime?
  sourceRef   String?   // URL or provider identifier
  
  @@index([family, zoneCode, key, validFrom])
}

model ZoneIndexSnapshot {
  id          String    @id @default(cuid())
  family      ZoneIndexFamily
  zoneCode    String
  computedAt  DateTime  @default(now())
  payload     Json      // full snapshot for time-travel queries
}

model EconomicNeighborMap {
  zoneCode      String    @id  // ISO 3166 alpha-2
  neighbors     String[]  // ordered fallback list
  notes         String?
}
```

**Anti-drift tests** :
- `no-hardcoded-fcfa.test.ts` (HARD mode, baseline initial)
- `cockpit-no-formula-leak.test.ts` (HARD mode)
- `thot-calc-must-take-zone.test.ts` — assert chaque procédure `thot.calc.*` accepte `zoneCode` paramètre

**Console UI** :
- `/console/socle/economic-runtime/` — operator UI for zone-index source config + manual override + refresh status

### Migration des prix FCFA existants (Phase 26 task)

Inventaire des fichiers à migrer (résultat grep `FCFA`/`XOF`/`XAF` à exécuter Phase 26) :

- `src/server/services/actors/freelance.ts` — `PROJECT_RATES` hardcoded XAF
- Examples FCFA dans `closure-roadmap.md` + `STATE_FINAL_BLUEPRINT.md` (acceptables car labelled "indicative zone Dakar/Abidjan", à conserver tels quels comme illustratifs)
- TVA Cameroun 19.25% hardcoded → migrer vers `zone-indices/taxes/`
- Mobile money fee tables hardcoded → migrer vers `zone-indices/mobile-money-fees/`

### Articulation avec ADR-0021 (Credentials Vault)

Les sources d'indices (Numbeo API, XE/OANDA, Nielsen Africa, BCEAO, etc.) sont des connectors externes. Suivent le pattern Credentials Vault (ADR-0021) : `ExternalConnector` rows per-Operator, façades retournent `DEFERRED_AWAITING_CREDENTIALS` si pas configuré. Cohérent avec Phase 23 P22-1 `ConnectorResult<T>`.

### Articulation avec ADR-0075 (payment secrets in env)

ADR-0075 maintient les payment provider secrets (Wave/Orange Money/MTN/Moov keys system-wide) en env vars. Distinct des **indices** qui sont per-Operator credentials (Numbeo API key, Nielsen Africa subscription) gérés via Credentials Vault. Frontière nette :

- **System-wide payment keys** = env vars (ADR-0075)
- **Per-Operator indice source credentials** = Credentials Vault (ADR-0021)
- **Computed indice values** = `ZoneIndex` Prisma table (cette ADR)

## Lectures associées

- [STATE_FINAL_BLUEPRINT §14 + §15](../STATE_FINAL_BLUEPRINT.md) — source canon doctrinale
- [ADR-0021](0021-external-credentials-vault.md) — Credentials Vault pattern
- [ADR-0075](0075-payment-secrets-in-env.md) — payment secrets boundary
- [ADR-0043](0043-budget-decoupled-from-campaigns.md) — budget architecture
- [closure-roadmap.md target #18](../../../_bmad-output/planning-artifacts/closure-roadmap.md) — implementation tracking Phase 26
