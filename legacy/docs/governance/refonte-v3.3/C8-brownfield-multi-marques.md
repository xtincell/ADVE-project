# C8 — 🟡 Onboarding brownfield & multi-marques

> **Chantier C — chapitre 8.** **Trou comblé :** `CAHIER_DES_CHARGES.md` Ch.8. **Dépend de :** C3 (activation),
> E1 (régimes par marque). **État actuel : MIXTE.** Multi-marques ✅ (`brand-node/`, `BrandNode`, `context-tree`,
> 9 `BrandNature`, ADR-0059) ; **brownfield ABSENT** ; régimes par marque ABSENT (→ E1).

## C8.0 — Décisions (cahier Ch.8)

**Brownfield** : séquence d'import (assets, communauté, historique) reconnue par **Wepwawet**/**Per-Ankh**
vs poussière vierge (LATENT pur) ; **palier d'entrée > LATENT** si masse existante. **Multi-marques** :
bascule de contexte + **régimes distincts par marque** (E1) + vue portfolio.

## C8.1 — Modèle Prisma (brownfield)

```prisma
enum BrandImportSource { ASSETS COMMUNITY HISTORY SOCIAL }
model BrandImport {
  id String @id @default(cuid())
  strategyId String
  source BrandImportSource
  payloadRef String                  // pointeur vers l'existant importé
  recognizedBy String                // "wepwawet" | "per-ankh" | "operator"
  entryPalier Palier?                 // > LATENT si masse reconnue (E2)
  importedAt DateTime @default(now())
  @@index([strategyId])
}
```

## C8.2 — Surface

- **Brownfield import** : nouveau flux (Intent `IMPORT_BRAND_EXISTING`, governor SIA) → reconnaissance par
  Wepwawet (R4) / Per-Ankh (R5) → palier d'entrée calculé par `scoring-engine` (E2) sur les signaux importés
  (pas LATENT par défaut si masse). Greenfield = parcours C3 standard (LATENT pur).
- **Multi-marques** : `brand-node/` gère déjà l'arbre ; **ajouter** `PilotingRegime` **par marque** (E1,
  `@@unique([strategyId, plan])` → un régime par satellite) + bascule de contexte + vue portfolio (dashboards agence existants).

## C8.3 — Critères d'acceptation

```
[ ] BrandImport : import assets/community/history tracé, reconnu (Wepwawet/Per-Ankh)
[ ] palier d'entrée brownfield calculé (E2), > LATENT si masse ; greenfield = C3 (LATENT)
[ ] régimes distincts par marque (E1) ; bascule de contexte ; vue portfolio
[ ] isomorphisme préservé : un satellite importé = mini-cosmos complet (pas coquille)
```

## C8.4 — Frictions

- **F-C8a.** Dépend de E1 (régime par marque) + E2 (palier d'entrée) + R4/R5 (Wepwawet/Per-Ankh) pour la reconnaissance.
- **F-C8b.** M&A / transfert de propriété de nœud (`NodeOwnershipTransfer`) + archétypes non-PRODUCT = **Phase 18-bis** (closure #10), trigger-locked (premier deal M&A) — **hors C8**, ne pas PRD avant trigger.
