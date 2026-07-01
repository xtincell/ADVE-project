# C5 — 🔴 Cycle de vie de l'amendement ADVE (durcissement)

> **Chantier C — chapitre 5.** **Trou comblé :** `CAHIER_DES_CHARGES.md` Ch.5. **État actuel : LE PLUS
> COMPLET.** Existant ✅ : `OPERATOR_AMEND_PILLAR` (3 modes `PATCH_DIRECT`/`LLM_REPHRASE`/`STRATEGIC_REWRITE`,
> 62 occ.), `BrandAsset.staleAt`/`staleReason`, `staleness-propagator/`, `pillar-versioning/`, `AssetVersion`
> (l.4213), gate `PILLAR_COHERENCE` (`notoria/gates`). **Ce chapitre durcit, ne reconstruit pas.**

## C5.0 — Décisions (cahier Ch.5)

**Cohabitation tracée par défaut** ; re-forge **sur décision opérateur** ; **seul `STRATEGIC_REWRITE`**
marque les assets ACTIVE `stale` ; la re-forge consomme le **carburant Thot** (qui paie) ; **versioning** :
l'asset porte la version du pilier engendreur + **notification founder**.

## C5.1 — Politique de re-forge par mode (à formaliser)

| Mode d'amendement | Conséquence sur les assets ACTIVE | Re-forge |
|-------------------|-----------------------------------|----------|
| `PATCH_DIRECT` | cohabitation tracée (assets non marqués) | non, sauf décision opérateur |
| `LLM_REPHRASE` | cohabitation tracée | non par défaut |
| `STRATEGIC_REWRITE` | **`staleAt = now()`** sur ACTIVE concernés | proposée à l'opérateur (coût Thot estimé) |

`staleness-propagator/` applique déjà la propagation — **ajouter** la **conditionnalité par mode** (aujourd'hui
peut être uniforme). Vérifier que seul `STRATEGIC_REWRITE` déclenche le `stale` (sinon drift).

## C5.2 — Versioning + qui paie

- `AssetVersion` porte déjà le lignage → **ajouter** un pointeur `engenderingPillarVersion` (la version du pilier
  qui a produit l'asset). Affiché au founder ; notification à l'amendement.
- **Coût re-forge** = carburant Thot → relier au compte EFR (C1) et au barème (C4). Décision opérateur via régime (E1).

## C5.3 — Intent + gate (existants à durcir)

- `OPERATOR_AMEND_PILLAR` (existant) — voie **unique** d'édition ADVE (gate `ADVE_FLOOR` E1 le garantit).
- `PILLAR_COHERENCE` (existant) — maintenu. Ajouter un `REFORGE_DECISION` Intent (governor SIA) `{ assetIds, accept }` pour la décision opérateur de re-forge.

## C5.4 — Critères d'acceptation

```
[ ] re-forge policy par mode : seul STRATEGIC_REWRITE met ACTIVE stale (test dédié)
[ ] staleness-propagator conditionné par mode (pas uniforme)
[ ] AssetVersion.engenderingPillarVersion présent ; notification founder à l'amendement
[ ] coût re-forge imputé carburant Thot (C1/C4) ; décision opérateur (E1)
[ ] OPERATOR_AMEND_PILLAR reste la voie unique (ADVE_FLOOR vert)
```

## C5.5 — Friction

- **F-C5.** Pas d'ADR neuf — **amender ADR-0023** (OPERATOR_AMEND_PILLAR) pour la politique de re-forge par mode + versioning. Dépend de C4 (coût/délai) et C1 (carburant).
