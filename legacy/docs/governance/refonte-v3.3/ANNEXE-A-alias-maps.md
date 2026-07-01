# ANNEXE A — Maps d'alias Classe P (L0, livrée AVANT tout codemod)

> **Rôle.** Les identifiants **persistés/wire** (Classe P, cf. `00-CADRE §0.6`) ne peuvent être réécrits
> rétroactivement (Loi 1). Cette annexe fige la **totalité** des alias old→new, vérifiés contre le code
> au 2026-05-31. Elle constitue le **lot L0** : elle est mergée sur la branche refonte **avant** le
> moindre renommage de symbole, et la CI reste verte à ce stade (aucune écriture changée).

## A.1 — Surface persistée réelle (vérifiée)

Recensement exhaustif de ce qui est sérialisé et contient un terme renommé :

| Source persistée | Champ | Valeurs legacy | Volume vérifié |
|------------------|-------|----------------|----------------|
| `IntentEmission.governor` | string | `MESTOR`, `ARTEMIS` | 75 + 16 kinds |
| `IntentEmission.intentKind` | string | `JEHUTY_CURATE`, `JEHUTY_FEED_REFRESH` | 2 |
| `IntentEmission.intentKind` | string | `PROMOTE_ZOMBIE_TO_FRAGILE`, `DEMOTE_FRAGILE_TO_ZOMBIE` | 2 |
| `NspEvent` payload | `brandLevel` | `"ZOMBIE"` | `nsp/event-types.ts:182` |
| Snapshots / context-store | palier value | `"ZOMBIE"` (si caché) | `seshat/context-store/indexer.ts:135`, `quick-intake/index.ts:967` — **à confirmer en L0** |

**Inchangés** (aucun alias) : `SESHAT`, `THOT`, `PTAH`, `IMHOTEP`, `ANUBIS`, `INFRASTRUCTURE` (governor) ;
tous les autres Intent kinds (non préfixés par un Neter renommé).

> **Note PTAH.** `intent-kinds.ts` ne contient **aucun** `governor: "PTAH"` (0 occurrence). Ptah n'est pas
> renommé, mais ce constat est à signaler (F-PTAH) : la forge Ptah gouverne-t-elle via un autre champ ?
> Hors périmètre renommage, mais à tracer.

## A.2 — Les maps canoniques (contenu exact)

À placer dans un nouveau module **`src/domain/wire-aliases.ts`** (couche `domain`, donc importable partout) :

```
GOVERNOR_ALIAS (old wire → v3.3 canonical)
  MESTOR  → SIA
  ARTEMIS → NEITH

INTENT_KIND_ALIAS (old wire → v3.3 canonical)
  JEHUTY_CURATE             → NOTORIA_CURATE
  JEHUTY_FEED_REFRESH       → NOTORIA_FEED_REFRESH
  PROMOTE_ZOMBIE_TO_FRAGILE → PROMOTE_LATENT_TO_FRAGILE
  DEMOTE_FRAGILE_TO_ZOMBIE  → DEMOTE_FRAGILE_TO_LATENT

PALIER_ALIAS (old wire → v3.3 canonical)   # NSP payload + snapshots
  ZOMBIE → LATENT
```

Plus la table inverse `*_REVERSE` (new → old) pour la lecture de l'historique.

## A.3 — Helper de normalisation (read path)

Un helper pur, sans I/O : `normalizeGovernor(s): Governor`, `normalizeIntentKind(s): IntentKind`,
`normalizePalier(s): BrandLevel`. **Tout site qui lit/agrège** un de ces champs persistés passe par le
helper. Sites à câbler (à confirmer par grep en L0) :

- Agrégats `groupBy governor` / dashboards Console (`/console/...` intents, observability).
- Lecteurs Seshat (telemetry, `IntentEmissionEvent`), `seshat-bridge`, crons de staleness.
- Tout `intentKind === "JEHUTY_..."` ou `startsWith("PROMOTE_ZOMBIE")`.
- Consommateurs NSP qui lisent `brandLevel`.

## A.4 — Étapes (machine de migration, rappel 00-CADRE §0.6)

```
L0  Étape A : livrer wire-aliases.ts + helpers + brancher TOUS les read-sites.
              Écriture inchangée. CI verte. (réversible)
L1  Étape B : codemod symboles + bascule écriture (governor @default "SIA",
              nouveaux Intents émis en v3.3). Lignes historiques INCHANGÉES.
L4  Étape C : fenêtre de dépréciation close ; alias gelés `@deprecated-wire`
              (lecture seule de l'histoire, à vie).
```

## A.5 — Tests d'acceptation (gates)

- `wire-alias-completeness.test.ts` (HARD) : pour chaque valeur legacy listée en A.1, une entrée d'alias existe ; chaque alias résout vers un identifiant v3.3 **valide** (présent dans `GOVERNORS` / `IntentKind` / `BRAND_LEVELS`).
- `no-orphan-wire-read.test.ts` (soft→HARD) : aucun `groupBy`/comparaison sur `governor`/`intentKind`/`brandLevel` ne contourne `normalize*()` (lint-style scan).
- Régression : un échantillon de lignes `IntentEmission` historiques (`governor="MESTOR"`) reste lisible et s'agrège **sous** `SIA` après normalisation, sans mutation en base.

## A.6 — Friction

- **F-A1.** Les snapshots/context-store (`seshat/context-store/indexer.ts:135`, `quick-intake/index.ts:967`) écrivent peut-être `"ZOMBIE"` en dur dans un index persisté. **À confirmer en L0** : si oui, `PALIER_ALIAS` couvre la lecture ; un re-index optionnel (non destructif) peut être planifié, jamais un UPDATE rétroactif d'événement chaîné.
