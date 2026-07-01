# R7 — ZOMBIE → LATENT (palier le plus bas)

> **Chantier A.** **Ancrage canon :** Blueprint §0.2/§1.2 (LATENT = premier état nommé), §6.1 (paliers).
> **Classe(s) :** S (type/enum) + **P** (payload NSP + 2 Intent kinds). **Surface vérifiée :** 41 fichiers `src/`.

## R7.0 — Décision

Renommer le palier `ZOMBIE → LATENT` (« la poussière à peine nommée »). Les 6 paliers deviennent
`LATENT → FRAGILE → ORDINAIRE → FORTE → CULTE → ICONE`. *Alt. écartée : garder ZOMBIE* (terme interdit v3.3).

## R7.1 — Nature : majoritairement dérivé, partiellement persisté

- Le palier est **dérivé** à la volée (`tier-evaluator.classify(score)` / `advertis-scorer`), **pas** un governor.
- Définition Classe S : `src/server/services/quick-intake/brand-level-evaluator.ts:19` — `type BrandLevel`, `BRAND_LEVELS`, `LEVEL_DEFINITIONS`, prompts LLM.
- **Mais la valeur `"ZOMBIE"` est sérialisée** dans : `NspEvent.brandLevel` (`nsp/event-types.ts:182`), l'index `seshat/context-store/indexer.ts:135`, la sortie `quick-intake/index.ts:967`. → **Classe P** via `PALIER_ALIAS`.

## R7.2 — Surface Classe S (codemod)

| Surface | Actuel → cible |
|---------|----------------|
| Type/const | `BrandLevel`, `BRAND_LEVELS`, `LEVEL_DEFINITIONS` : `"ZOMBIE"` → `"LATENT"` |
| Union NSP | `nsp/event-types.ts:182` union type `"ZOMBIE"\|…` → `"LATENT"\|…` |
| Prompts LLM | `brand-level-evaluator.ts` (le prompt liste « 1. ZOMBIE — Invisible… » + `pathToIcone`) → LATENT |
| Doc | `DIMENSIONS.md` (palier `ZOMBIE → ICONE`), advertis-scorer comments | maj |
| Tests | 7 fichiers `ZOMBIE` | maj même PR |

## R7.3 — Surface Classe P (alias, ANNEXE-A)

- 2 Intent kinds : `PROMOTE_ZOMBIE_TO_FRAGILE → PROMOTE_LATENT_TO_FRAGILE`, `DEMOTE_FRAGILE_TO_ZOMBIE → DEMOTE_FRAGILE_TO_LATENT`.
- `PALIER_ALIAS.ZOMBIE = "LATENT"` : tout lecteur de `brandLevel` (NSP, context-store, snapshots) normalise.
- **Parseur LLM tolérant** : pendant la fenêtre de dépréciation, le parseur de sortie de `brand-level-evaluator` accepte `"ZOMBIE"` **et** `"LATENT"` (le modèle peut encore émettre l'ancien terme via few-shot résiduel) et normalise vers `LATENT`.

## R7.4 — Critères d'acceptation

```
[ ] BRAND_LEVELS[0] === "LATENT" ; aucune écriture neuve de "ZOMBIE"
[ ] grep -rn "ZOMBIE" src/ → 0 hors alias @deprecated-wire / parseur tolérant
[ ] palier-latent.test.ts (HARD) vert
[ ] normalizePalier("ZOMBIE") === "LATENT" ; NspEvent historique lisible, non muté
[ ] PROMOTE_LATENT_TO_FRAGILE émis ; ancien kind lisible via alias
[ ] pathToIcone régénéré démarre à LATENT (6 entrées) ; prompts cohérents
```

## R7.5 — Friction

- **F-R7a.** Risque de **re-index** du `context-store` si `"ZOMBIE"` y est figé en dur : autorisé seulement en **re-indexation non destructive** (recompute), jamais en UPDATE d'événement chaîné (Loi 1). Confirmer en L0 (ANNEXE-A F-A1).
- **F-R7b.** Le score 8-dim (E2) consomme le palier ; livrer R7 **avant** E2 pour que `scoring-engine` parle LATENT nativement.
