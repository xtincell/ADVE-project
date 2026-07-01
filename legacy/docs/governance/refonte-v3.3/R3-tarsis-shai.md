# R3 — Tarsis → Shaï

> **Chantier A.** **Ancrage canon :** Blueprint §0.5/§1.4 (Shaï = signaux faibles, sous-composant Seshat).
> **Classe(s) :** S (sous-composant, pas un governor). **Surface vérifiée :** 54 fichiers `src/`, 0 doc dédié.

## R3.0 — Décision

Renommer **Tarsis → Shaï** (lecture des signaux faibles). **Shaï n'est pas un Neter** : c'est un
sous-composant de **Seshat** (telemetry). Aucun changement de governor. *Alt. écartée : garder Tarsis.*

## R3.1 — Surface Classe S (codemod)

| Surface | Actuel → cible |
|---------|----------------|
| Sous-service | `src/server/services/seshat/tarsis/` → `seshat/shai/` |
| Routes | `src/app/(console)/console/signal/tarsis` → `.../shai` ; `src/app/(console)/console/seshat/tarsis` → `.../seshat/shai` |
| Exports/types | symboles `Tarsis*` (signal types) → `Shai*` |
| Docs | `CLAUDE.md`, `PANTHEON §7` (Shaï = connector/monitoring), `LEXICON` | maj |

## R3.2 — Surface Classe P

- **Aucun governor** (`Tarsis` absent de `GOVERNORS`/`BRAINS`). Aucun Intent kind préfixé.
- **À confirmer en L1 :** si un `NspEvent`/`IntentEmission.observationStatus` sérialise une **source**
  `"tarsis"` (les signaux faibles sont une boucle d'observation Seshat). Si oui → ajouter à `ANNEXE-A`
  (`SOURCE_ALIAS.tarsis = "shai"`) ; sinon pur Classe S.

## R3.3 — Critères d'acceptation

```
[ ] grep -rn "tarsis\|Tarsis\|TARSIS" src/ → 0 hors alias éventuel
[ ] routes console/seshat/shai + console/signal/shai OK
[ ] Shaï documenté comme sous-composant Seshat (pas dans BRAINS) — neteru-coherence vert
[ ] typecheck + madge verts
```

## R3.4 — Friction

- **F-R3.** Vérifier que `commitlint scope-enum` (qui contient `tarsis`) est mis à jour → `shai` (sinon les futurs commits scoped `shai` échouent). Idem `seshat-search`/`jehuty` scopes lors de R5.
