# E3 — seshat/zone-indices + Thot formula engine

> **Chantier B — entité-socle.** **Trou comblé :** `CAHIER_DES_CHARGES.md` Ch.6 (pricing localisé, la
> formule). **Ancrage canon :** ADR-0087 (Accepted, impl Phase 26 / cible #18), STATE_FINAL_BLUEPRINT §14-15.
> **État actuel :** 0/7 indices, minimal `market-pricing.ts` (2 procédures read-only).

## E3.0 — Décisions

Architecture **Seshat (indices per-zone) → Thot (formula engine `thot.calc.*`) → UI**. **Aucune grille FCFA
statique** : toute somme = formule à partir d'indices. *Alt. écartée : table de prix par zone* (fige, ne scale pas UEMOA+CEMAC).

## E3.1 — Les 7 familles d'indices (ADR-0087)

`seshat/zone-indices/<famille>/` : `cost-of-living` (Numbeo+BM, trim.) · `forex` (XE/OANDA+BCEAO/BEAC, quotidien) ·
`macro` (inflation/GDP, mensuel) · `tjm` (**Wepwawet** crawl + Académie, trim.) · `marketing-budgets`
(Nielsen+**Shaï** aggregation, trim.) · `mobile-money-fees` (operator APIs, hebdo) · `taxes` (DGI pays, event-driven).

## E3.2 — Modèle Prisma

```prisma
model ZoneIndex {
  id String @id @default(cuid())
  family String          // cost-of-living | forex | macro | tjm | marketing-budgets | mobile-money-fees | taxes
  zoneCode String        // ISO pays (SN, CI, CM, GA…)
  key String             // sous-clé (ex: "median_tjm_creative")
  value Float
  currency String?       // XOF | XAF | EUR…
  source String
  validFrom DateTime
  validUntil DateTime?
  @@index([family, zoneCode, key, validFrom])
}
model EconomicNeighborMap { family String; zoneCode String; neighbors Json; cachedAt DateTime  @@id... }
```

## E3.3 — Thot formula engine — `ThotCalcResult` + fallback

```ts
type ThotCalcResult = { amount; currency; formula; breakdown; usedFallback?; fallbackChain?; computedAt }
economicNeighbors = { BF:["CI","ML","SN"], GA:["CM","CG","GQ"], … }  // ultime : médiane UEMOA/CEMAC
```

Manquant à shipper (ADR-0087, **6 cœur + couplés #15**) : `computeRetainerFitness` ❌, `computeEscrowAmount` ❌,
`computeEscrowReleaseDate` ❌, `computeDisputeArbitrage` ❌, `computeLlmAllowance` ❌, `computeLlmOverage` ❌,
`computeForexExposure` ❌, `computeMobileMoneyFees` (🟡 exposer tRPC), + `computeNextPalierProofs` /
`computePalierTransitionCost` (couplés E2). Existants ✅ : `computeCODB`, `computeOperatingBudget`,
`computeMarketingShareAdvised`, `computeCommissionRate`, `computeAgencyPlanPrice/Margin`, `computeFreelanceBreakeven`.

## E3.4 — `ai-cost-tracker/` (sous-chantier critique)

`src/server/services/ai-cost-tracker/` : cumul tokens LLM par `accountId`/mois vs quota (`computeLlmAllowance`),
notifications 80/100/120 % (NspEvent+email+in-app), 3 options dépassement (cap auto / overage transparent +10% / upgrade prorata).

## E3.5 — Transparence (gate anti-fuite)

| Vue | Détail |
|-----|--------|
| Cockpit founder/agence | prix final + breakdown haut-niveau, **PAS la formule** |
| Console UPgraders | formule complète + coefficients + marge réelle |

Test `cockpit-no-formula-leak.test.ts` (Phase 26).

## E3.6 — tRPC + UI manual-first

- `thot.calc.*` (governedProcedure) : chaque calculator → `ThotCalcResult`. Étend `market-pricing.ts` existant.
- Intents : `RECOMPUTE_ZONE_INDICES` (governor SESHAT, cron refresh par famille). Saisie manuelle d'indice (opérateur Console) = parité manuelle.
- UI : Console `/console/socle/economic-runtime/` (config indices + test calculator) ; Cockpit breakdown transparent.

## E3.7 — Critères d'acceptation

```
[ ] seshat/zone-indices/ : 7 familles ; ZoneIndex migré ; fallback economicNeighbors tracé (usedFallback)
[ ] 6 calculators manquants shippés ; tous renvoient ThotCalcResult ; aucun via grille statique
[ ] ai-cost-tracker/ : notifications 80/100/120 % + 3 options dépassement
[ ] no-hardcoded-fcfa.test.ts (HARD après baseline) vert ; cockpit-no-formula-leak vert
[ ] thot.calc.* sous governedProcedure (governor THOT) ; market-pricing.ts absorbé
```

## E3.8 — Frictions

- **F-E3a.** Source réelle des indices (API tierces, hébergement) = décision d'infra hors doctrine (cf. cahier F-4).
- **F-E3b.** `tjm` dépend de **Wepwawet** (R4) ; `marketing-budgets` de **Shaï** (R3) — livrer R3/R4 avant l'alimentation live.
- **Prérequis E2 :** `computeNextPalierProofs`/`computePalierTransitionCost` couplés au scoring-engine.
- **Couvre C6** intégralement (Ch.6 = la face produit d'E3).
