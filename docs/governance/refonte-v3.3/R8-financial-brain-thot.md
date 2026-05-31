# R8 — `financial-brain/` → `thot/`

> **Chantier A.** **Ancrage canon :** Blueprint §0.6 (Thot = Sustainment + Operations, carburant/économie).
> **Classe(s) :** S (renommage de dossier). **Surface vérifiée :** 21 fichiers `src/`. **Déjà planifié :**
> closure-roadmap cible #19 (Phase 25).

## R8.0 — Décision

Le Neter **s'appelle déjà Thot** (governor `THOT`, 7 Intent kinds) ; seul le **dossier de service** porte
encore `financial-brain`. Renommer le dossier `src/server/services/financial-brain/` → `thot/`.
*Alt. écartée : garder `financial-brain`* (drift nom-de-code vs Neter, D-5.1).

## R8.1 — Surface Classe S (codemod)

| Surface | Actuel → cible | Notes |
|---------|----------------|-------|
| Service | `src/server/services/financial-brain/` → `thot/` | 16 calculators (`break-even`, `elasticity`, `recommend-budget`, `actors/*`, …) + `manifest.ts` |
| Imports | tous les `@/server/services/financial-brain` → `@/server/services/thot` | sweep mécanique |
| Manifest | `mestor`(→`sia`) manifest déclare dépendance `"financial-brain"` → `"thot"` | maj |

## R8.2 — ⚠️ Ne PAS toucher

Deux **autres** services distincts existent — **hors périmètre R8** :
- `src/server/services/financial-engine/`
- `src/server/services/financial-reconciliation/`

Ils ne sont **pas** Thot ; ne pas les renommer.

## R8.3 — Surface Classe P

- **Néant.** Governor déjà `THOT` (7 kinds : `THOT_PAUSE_CAMPAIGN_FLAME_OUT`, `RECORD_COST`, …). Le nom de dossier n'est **pas** sérialisé. Pur Classe S.

## R8.4 — Lien avec #19 (manipulation consumption — chantier voisin)

La cible #19 **bundle** aussi : les 56 Glory tools LLM consomment `manipulationMode` (actuellement 0/56) +
test `manipulation-consumed.test.ts`. **Hors périmètre du renommage R8** (c'est du métier, pas du nommage) ;
tracé ici pour cohérence — à traiter en C-suite ou en chantier #19 dédié.

## R8.5 — Critères d'acceptation

```
[ ] src/server/services/thot/ existe ; financial-brain/ supprimé
[ ] financial-engine/ + financial-reconciliation/ INCHANGÉS
[ ] grep -rn "financial-brain" src/ → 0
[ ] 16 calculators présents ; governor THOT inchangé ; typecheck + madge verts
```

## R8.6 — Friction

- **F-R8.** Confusion possible entre les 3 services « financial-* ». Le renommage doit être **chirurgical** (uniquement `financial-brain`), d'où la garde explicite R8.2.
