# ADR-0076 — Stale semantics 2 niveaux (advisory vs blocking)

**Status** : Accepted
**Date** : 2026-05-08
**Phase** : 21 polish (post-mégasprint)
**Depends on** : ADR-0023 (OPERATOR_AMEND_PILLAR cascade staleness), ADR-0030 (pillar-readiness governance), ADR-0069 (Readiness UI parity, F-A.5)

## Contexte

Bug observé en production (capture opérateur) : Notoria affichait pilier V (Valeur) comme "PÉRIMÉ" rouge, et le bouton "Lancer la veille R+T" était bloqué — alors même que le contenu de V était COMPLET. L'opérateur ne pouvait pas avancer.

Cause exacte ([pillar-readiness.ts:188](../../src/server/governance/pillar-readiness.ts) avant fix) :
```ts
RTIS_CASCADE: verdict(
  (stage === "ENRICHED" || stage === "COMPLETE") && !stale,  // ← `&& !stale` trop strict
  ...
)
```

Le gate `RTIS_CASCADE.ok` devenait `false` dès que `staleAt != null`, indépendamment de la qualité du contenu. **Dead-end** :

```
A muté → V marqué stale (cascade `getPillarDependents("a")`)
       → RTIS_CASCADE bloqué tant que V stale
       → R+T pas générés
       → pas de recos ADVE post R+T
       → V reste stale indefiniment
```

C'est l'inverse de la doctrine ADVERTIS : la cascade R+T existe **précisément** pour rafraîchir ADVE après mutation amont. La bloquer quand ADVE est stale crée un système qui ne peut jamais se rafraîchir.

## Décision

**`staleAt` ne carry plus une seule sémantique.** Distinction 2 niveaux selon le contenu du pilier :

| Cas | `cacheLevel` | `staleAt` | Sémantique | Gate `RTIS_CASCADE` |
|-----|--------------|-----------|------------|---------------------|
| Pilier non rempli | `INCOMPLET` | `null` | Pas démarré | Bloqué (`STAGE_BELOW_ENRICHED`) |
| Pilier non rempli + amont muté | `INCOMPLET` | `Date` | **`PILLAR_STALE` blocking** | Bloqué (incohérent + stale) |
| Pilier rempli | `COMPLET`/`FULL` | `null` | Frais | OPEN |
| Pilier rempli + amont muté | `COMPLET`/`FULL` | `Date` | **`PILLAR_STALE_ADVISORY`** | **OPEN** (advisory) |

### Nouvelle `ReadinessReason`

```ts
| "PILLAR_STALE"            // existing — blocking
| "PILLAR_STALE_ADVISORY"   // NEW — advisory non-bloquant
```

Un gate qui reçoit `PILLAR_STALE_ADVISORY` reste OPEN. L'UI peut afficher l'advisory en amber au lieu de rouge.

### Gates impactés

| Gate | Comportement post F-AB |
|------|------------------------|
| `DISPLAY_AS_COMPLETE` | **strict** — stale (advisory ou blocking) refuse "Complet". Le user veut savoir. |
| `RTIS_CASCADE` | **refreshing** — stale-advisory accepté, blocking refusé. C'est le rôle de la cascade. |
| `GLORY_SEQUENCE` | **strict** — Glory tools générant des assets nécessitent ADVE fiable, advisory bloque. |
| `ORACLE_ENRICH` | **refreshing** — l'enrichment Oracle peut tourner sur ADVE stale-advisory pour produire des sections. |
| `ORACLE_EXPORT` | **strict** — livrable client, advisory refuse (sécurité). |

L'asymétrie reflète la doctrine ADVERTIS : les gates qui *consomment* (display, glory, export) restent strict ; ceux qui *rafraîchissent* (RTIS_CASCADE, ORACLE_ENRICH) tolèrent advisory.

### UI — `pillar-chip-status.ts` helper

Nouveau variant `"stale-advisory"` :
- Label : `"MAJ RECOMMANDÉE"` (au lieu de `"PÉRIMÉ"`)
- Couleur : amber (au lieu de rouge)
- `isReadyForCascade`: respecte `rtisCascadeReady` du serveur — qui est désormais `true` même en advisory (cf. gate redéfini ci-dessus).
- `shouldRegenerate`: `true` (l'advisory recommande quand même un refresh, juste non-bloquant)

`"stale"` (rouge, blocking) reste pour `staleAt + cacheLevel="INCOMPLET"` uniquement.

### Tooltip

```
stale-advisory:
  "Mise à jour recommandée — un pilier amont a muté, mais le contenu actuel
   reste utilisable. La cascade R+T peut tourner pour produire les recos
   qui rafraîchiront ce pilier."

stale (blocking):
  "Pilier périmé — contenu insuffisant ET un pilier amont a muté. Compléter
   d'abord pour débloquer la cascade."
```

### `notoria.getDashboard.byPillar[k]` enrichi

Nouveau champ `staleAdvisory: boolean` :
```ts
const staleAdvisory = p.stale && p.cacheLevel !== "INCOMPLET";
```

Frontend lit ce champ pour distinguer les 2 niveaux sans recalculer.

## Cap APOGEE

**7/7 préservé.** Pure cohérence inter-couches gouvernance → tRPC → UI. Aucun nouveau Neter, aucun Intent, aucun model.

## Tests anti-drift (33 tests passing — F-A.5 21 + F-AB 10 + F-AB stale-semantics 10)

[`tests/unit/governance/stale-semantics-2-levels.test.ts`](../../tests/unit/governance/stale-semantics-2-levels.test.ts) :
- `PILLAR_STALE_ADVISORY` est une ReadinessReason valide.
- `RTIS_CASCADE` gate.ok = `true` quand stale + content suffisant ; `false` quand stale + INCOMPLET.
- `RTIS_CASCADE` reasons contient `PILLAR_STALE_ADVISORY` (pas `PILLAR_STALE`) en advisory.
- `ORACLE_EXPORT` gate refuse stale advisory (consumer strict).
- Helper `pillar-chip-status` expose variant `stale-advisory` avec `isReadyForCascade=true`, label `"MAJ RECOMMANDÉE"`.
- `stale + INCOMPLET` reste rouge bloquant `"PÉRIMÉ"`.
- `notoria.getDashboard` expose `staleAdvisory` boolean dérivé `stale && cacheLevel !== "INCOMPLET"`.

[`tests/unit/lib/pillar-chip-status.test.ts`](../../tests/unit/lib/pillar-chip-status.test.ts) — 12 tests F-A.5 mis à jour pour la nouvelle sémantique :
- `stale + COMPLET` → variant `stale-advisory`, label `"MAJ RECOMMANDÉE"`, `isReadyForCascade=true`
- `stale + FULL` → idem
- `stale + INCOMPLET` → variant `stale`, label `"PÉRIMÉ"`, `isReadyForCascade=false`
- `isPillarReadyForCascade` advisory-tolerant.

## Doctrine NEFER §1.1

- **Pas de notion de temps humain** — fix structurel inter-couches (governance + UI helper + Notoria + tRPC + tests + ADR + CHANGELOG), pas un patch de surface.
- **Pas d'économie de tokens** — distinction sémantique 2 niveaux explicite + 5 gates différenciés + tooltip différencié + tests verrouillés.
- **Profondeur > raccourci** — au lieu de juste retirer `&& !stale`, on a clarifié la sémantique pour 5 gates (lesquels rafraîchissent vs lesquels consomment) — drift-resistant.

## Suite

- Cleanup : la mécanique `cacheLevel: "FULL"` triggered uniquement par `validationStatus === "LOCKED"` ne reflète pas la doctrine "label doré R+T arrive après application des recos cascade". Un futur chantier devra définir le passage `COMPLET → FULL` post-application des recos R+T sur ADVE. Tracé dans RESIDUAL-DEBT.
