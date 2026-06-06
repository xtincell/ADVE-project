# C6 — 🟡 Pricing localisé : la formule

> **Chantier C — chapitre 6.** **Trou comblé :** `CAHIER_DES_CHARGES.md` Ch.6. **État actuel : PARTIEL → PLANIFIÉ.**
> **C6 = la face produit d'E3.** Le moteur (indices + formule + fallback) est spécifié en **E3** ; ce chapitre
> en fixe l'usage tarifaire et les exemples.

## C6.0 — Décisions (cahier Ch.6)

Prix = **formule** f(tier, zone, variables) — **jamais grille statique** ; variables = cost-of-living, TJM,
forex, taxes (indices E3) ; **fallback voisin économique** (`economicNeighbors`, E3) ; fréquence de MAJ par indice (E3.1).

## C6.1 — Surface (déléguée à E3)

- `thot.calc.*` (E3.3) renvoie `ThotCalcResult` (amount + formula + breakdown + usedFallback).
- `computeMarketingShareAdvised` ✅ existe (lookup) → migrer vers la chaîne zone-indices (E3).
- Transparence : Cockpit = prix + breakdown ; Console = formule (E3.5, gate `cockpit-no-formula-leak`).

## C6.2 — Artefact : 3 exemples chiffrés (à produire avec E3)

Trois cas opposables **Dakar (XOF) / Libreville (XAF) / Cotonou (XOF)** pour un même livrable × tier,
montrant la divergence de prix par indices zone + un cas de **fallback voisin** (ex. zone sans indice TJM →
voisin éco). Produits une fois E3 shippé (données réelles), pas en dur.

## C6.3 — Critères d'acceptation

```
[ ] aucun prix sans passer par thot.calc.* (E3) ; no-hardcoded-fcfa vert
[ ] 3 exemples Dakar/Libreville/Cotonou générés depuis les indices (pas codés en dur)
[ ] fallback economicNeighbors visible (usedFallback/fallbackChain) dans le breakdown
[ ] fréquence de MAJ documentée par famille d'indices
```

## C6.4 — Friction

- **F-C6.** Entièrement dépendant d'E3 (cible #18, Phase 26). Ne pas réimplémenter de pricing ici — **étendre E3**.
