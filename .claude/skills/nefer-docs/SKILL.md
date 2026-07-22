---
name: nefer-docs
description: Phase 6 NEFER — documentation et propagation narrative sur le repo La Fusée. À invoquer avant tout commit qui touche du vocabulaire, un concept canon, une entité, un compte canonique, un ADR ou le CHANGELOG. Impose le format CHANGELOG, la matrice docs-à-mettre-à-jour, la propagation 7 sources, le format ADR maison et les règles du registre RESIDUAL-DEBT.
---

# NEFER Phase 6 — Documentation & propagation (vérité unique)

**Procédure impérative. La doc n'est pas un à-côté : un savoir non propagé = drift narratif silencieux (interdit absolu n°3). AUCUNE improvisation.**

## 6.0 — CHANGELOG (OBLIGATOIRE à chaque commit)

Toute session qui ship `feat` / `fix` impactant / `refactor` structurel / `chore` significatif / `docs` ajoute une entrée **en tête** de `CHANGELOG.md`, dans LE MÊME commit (hook `audit-changelog-coverage` bloque sinon). Format imposé :

```md
## v<MAJEURE>.<PHASE>.<ITERATION> — <type>(<scope>): <titre court> (YYYY-MM-DD)

**<Phrase punchy 1 ligne qui résume>**

- <impact métier / cause+résolution / raison de la refonte, 1-3 lignes par point>
```

- Versionnage : MAJEURE = refonte architecturale · PHASE = nouvelle phase de refonte · ITERATION = sinon. **MUST** : lire les 3 dernières entrées avant de bumper. Numéro déjà pris par un commit parallèle → `+1` immédiat, sans débat.

## 6.0-bis — RELEASE_NOTES client (OBLIGATOIRE si bénéfice visible du dirigeant)

Le `CHANGELOG.md` parle NEFER (vocable technique). Le dirigeant, lui, voit un écran « Quoi de neuf » à sa connexion + un récap console — tous deux alimentés par **`src/lib/release-notes.ts`** (source unique, vocable CLIENT ADR-0123).

**MUST** : toute session qui ship une livraison **porteuse d'un bénéfice visible du dirigeant** (nouvelle capacité au cockpit, livrable qui change, correctif qu'il ressent) AJOUTE une entrée **en tête** de `RELEASE_NOTES`, dans le même commit, `version` = `APP_VERSION` au ship. Règles :

- **Vocable client strict** (ADR-0123) : bénéfice produit, jamais « ADR-XXXX », « pilier », « gate », « Neter », « RTIS », plomberie. Le test `release-notes-coverage` casse le build sinon.
- **Zéro promesse** (interdit NEFER n°3) : uniquement des bénéfices RÉELS et livrés.
- **Pas de note pour la plomberie pure** (refonte interne invisible du dirigeant, méta-features) : le CHANGELOG suffit. La note en tête peut donc être `< APP_VERSION` — le test verrouille seulement qu'elle n'est jamais **en avance**.
- **NEVER** réécrire une note passée : l'historique reste (le récap console le montre).

## 6.1 — Matrice docs-à-mettre-à-jour (toutes OBLIGATOIRES selon le type)

| Type de modification | Docs à mettre à jour |
|---|---|
| Nouveau Neter | **INTERDIT** (cap 7/7). Si l'opérateur l'exige : ADR + les 7 sources + test CI — décision opérateur explicite uniquement |
| Nouveau service | CHANGELOG + `SERVICE-MAP.md` + `manifest.ts` co-localisé (avec `missionContribution`) |
| Nouveau router | CHANGELOG + `ROUTER-MAP.md` |
| Nouvelle page | CHANGELOG + `PAGE-MAP.md` |
| Entité Prisma majeure | CHANGELOG + entrée `LEXICON.md` + ADR si concept business |
| Nouvel Intent kind | CHANGELOG + `INTENT-CATALOG.md` (régen) + SLO dans `slos.ts` |
| Nouveau Glory tool | CHANGELOG + `glory-tools-inventory.md` (régen) |
| Nouvelle séquence | CHANGELOG + entrée `sequences.ts` (+ lifecycle DRAFT) |
| Refactor architectural | CHANGELOG + ADR + entrée `REFONTE-PLAN.md` |
| Bug fix significatif | CHANGELOG + `RESIDUAL-DEBT.md` si lessons learned |
| Fix **en passant** d'un défaut pré-existant | CHANGELOG (si significatif) + `PATCHED-SYMPTOMS.md` (symptôme + hypothèse cause racine) |
| Défaut pré-existant non réparable en passant | `RESIDUAL-DEBT.md` **avec plan de résolution + déclencheur de reprise** (§6.6) |
| Vocabulaire / concept canon | CHANGELOG + **propagation 7 sources (§6.2)** |

## 6.2 — Propagation 7 sources (narratif Neteru/canon)

Toute modification de vocabulaire ou d'état canonique propage SIMULTANÉMENT (le test CI `neteru-coherence` verrouille une partie) :

1. `BRAINS` const — `src/server/governance/manifest.ts`
2. `Governor` type — `src/domain/intent-progress.ts`
3. `docs/governance/LEXICON.md`
4. `docs/governance/APOGEE.md` §4
5. `docs/governance/PANTHEON.md`
6. `CLAUDE.md` (section governance + phase-status)
7. `docs/governance/STATE_FINAL_BLUEPRINT.md` (la bible — si la doctrine est touchée)

- **MUST** : un état qui change (planned → shipped, « à créer » → « shippé », « à amender » → « amendée ») se corrige PARTOUT où il est écrit, le jour même.
- **NEVER** réécrire les archives (`docs/governance/archive/`, scope-drift, heal-reports, ADRs historiques) : l'histoire reste l'histoire ; on corrige le PRÉSENT.

## 6.3 — Régénération auto (jamais d'édition manuelle de ces fichiers)

```bash
npx tsx scripts/gen-code-map.ts          # CODE-MAP.md (aussi pre-commit husky)
npx tsx scripts/gen-intent-catalog.ts    # INTENT-CATALOG.md
npm run glory:inventory                  # glory-tools-inventory.md
```

## 6.4 — Comptes canoniques (règle anti-drift des chiffres)

- **NEVER** écrire un compte (« N routers », « N Glory tools », « N séquences », « N Intent kinds ») dans une prose sans **(a)** le recompter sur le registre code au moment de l'écriture et **(b)** dater le recompte. Commande canonique :
  ```bash
  npx tsx -e "
  import { INTENT_KINDS } from './src/server/governance/intent-kinds';
  import { CORE_GLORY_TOOLS, EXTENDED_GLORY_TOOLS } from './src/server/services/artemis/tools/registry';
  import { ALL_SEQUENCES } from './src/server/services/artemis/tools/sequences';
  import { FRAMEWORKS } from './src/server/services/artemis/frameworks';
  console.log('intent kinds:', INTENT_KINDS.length);
  console.log('glory:', CORE_GLORY_TOOLS.length, 'CORE /', EXTENDED_GLORY_TOOLS.length, 'registry');
  console.log('sequences:', ALL_SEQUENCES.length, '(DRAFT:', ALL_SEQUENCES.filter(s => s.lifecycle === 'DRAFT').length + ')');
  console.log('frameworks:', FRAMEWORKS.length);
  "
  ls src/server/trpc/routers/*.ts | wc -l
  find src/server/services -mindepth 1 -maxdepth 1 -type d | wc -l
  ```

## 6.5 — ADR maison (format imposé)

- Emplacement : `docs/governance/adr/NNNN-slug-kebab.md`. Numéro = `ls docs/governance/adr/ | tail` + 1. **Collision de numéro entre branches → first-come par date de commit : LEUR ADR garde le numéro, le TIEN est renuméroté** (+ sed de toutes les cross-refs).
- En-tête obligatoire : `Status` (Proposed/Accepted/Superseded) · `Date` · `Phase` · `Depends on` · `Supersedes` (si applicable). Corps : `## Contexte` → `## Décision` → `## Conséquences` (+ tests anti-drift créés).
- Toute nouvelle entité métier refusée par le grep anti-doublon ne vit QUE si son ADR explique « pourquoi pas une extension ».

## 6.6 — RESIDUAL-DEBT + PATCHED-SYMPTOMS (registres honnêtes, TRANSITOIRES)

Deux registres, une seule doctrine (§3.4 NEFER — un problème découvert se **résout, se patche-et-trace, ou se planifie**, jamais ne s'enterre) :

- **`RESIDUAL-DEBT.md`** = dette **non réparable en passant**. Toute inscription porte un bornage COMPLET : quoi · où · comment fermer · effort · **ET un déclencheur de reprise** (« quand X dispo », « prochaine session Y », « ADR-enfant Z »). **Un constat sans plan de résolution est INTERDIT.**
- **`PATCHED-SYMPTOMS.md`** = journal des **fixes en passant** de défauts pré-existants. 1 ligne = symptôme réparé (où/quoi) + hypothèse de cause racine. L'accumulation de ces lignes est le matériau heuristique qui révèle le problème de fond à diagnostiquer.
- **État transitoire, pas cimetière** : `RESIDUAL-DEBT.md` doit être **purgé par le diagnostic de fond**. Quand une cause racine est fermée, retirer/barrer LE JOUR MÊME toutes les lignes RESIDUAL-DEBT + PATCHED-SYMPTOMS qui en dérivaient + mention CHANGELOG. La reprise **n'attend pas** une demande de l'opérateur : `nefer-boot` (Phase 0) et `nefer-postmerge` (Phase 9) relisent les deux registres et referment le refermable.
- **NEVER** « on le notera plus tard » : l'inscription (ou la réparation + consignation) fait partie du commit qui découvre le trou.

## Conditions STOP

- La propagation exigerait de changer la doctrine elle-même (bible/MISSION) sur un point que l'opérateur n'a pas tranché → **1 question ciblée** avec les 2 formulations candidates.

## Enchaînement obligatoire

Docs propagées → retourner à **`nefer-ship`** Phase 7 (staging explicite, commit, lane).
