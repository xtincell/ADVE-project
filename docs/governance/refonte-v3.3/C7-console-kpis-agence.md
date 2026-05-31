# C7 — 🟡 Opérations Console & KPIs Agence

> **Chantier C — chapitre 7.** **Trou comblé :** `CAHIER_DES_CHARGES.md` Ch.7. **Dépend de :** C1 (méta-EFR).
> **État actuel : PARTIEL.** `financial-brain/actors/agency.ts` (→ `thot/actors/` après R8), portail Console.

## C7.0 — Décisions (cahier Ch.7)

KPIs **propres à l'Agence** (≠ des marques) : MRR, rétention, churn, taux de montée de palier de la **flotte** ;
**structure Console** (ratio opérateurs/N marques) ; **méta-isomorphisme** tranché.

## C7.1 — Décision de fond : méta-EFR — **OUI**

L'Agence **se pilote comme une marque** : elle a son **propre EFR** et son **propre score** (la flotte est
sa mission). Cohérent avec l'innovation « flotte comme mission » (Blueprint §0.13). *Alt. écartée : non* —
priverait l'Agence de l'auto-mesure qu'elle vend à ses clients (incohérence isomorphe).

**Conséquence :** réutiliser `Efr` + `BrandMaturityScore` (C1/E2) **scopés Agence** (un `Strategy` racine
« UPgraders » ou un scope dédié), pas un système parallèle.

## C7.2 — Modèle Prisma

```prisma
model AgencyKpiSnapshot {
  id String @id @default(cuid())
  scope String                      // "UPGRADERS" ou agence fille
  computedAt DateTime @default(now())
  mrr Float; churnRate Float; retentionRate Float
  fleetSize Int; fleetPalierProgression Json   // distribution + delta paliers flotte
  @@index([scope, computedAt])
}
```

## C7.3 — Surface + Intent + UI

- `thot/actors/agency.ts` (post-R8) produit MRR/churn/retention ; `scoring-engine` (E2) agrège la **montée de palier flotte**.
- Intent (governor THOT/SESHAT) : `RECOMPUTE_AGENCY_KPIS`.
- UI Console : `/console/upgraders/` dashboard KPIs + leaderboard (E2) ; modèle d'organisation (ratio opérateurs/marques) documenté.

## C7.4 — Critères d'acceptation

```
[ ] AgencyKpiSnapshot : MRR/churn/retention/fleet progression
[ ] méta-EFR : Agence porte un Efr + BrandMaturityScore (réutilise C1/E2, pas de doublon)
[ ] Console dashboard agence rendu ; ratio opérateurs/marques documenté
```

## C7.5 — Friction

- **F-C7.** Dépend de C1 (Efr) + E2 (score) pour le méta-EFR. ADR-0093 acte la décision méta-isomorphisme (friction F-D du cahier-maître résolue : OUI).
