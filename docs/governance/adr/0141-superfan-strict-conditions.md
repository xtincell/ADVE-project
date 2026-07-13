# ADR-0141 — Superfan à conditions strictes (5 gates trackés + provenance)

- **Status** : Accepted
- **Date** : 2026-07-13 (soir)
- **Phase** : mandat opérateur « un superfan doit avoir une définition stricte et des conditions trackables : a vu, a interagi, a payé, a recommandé, a partagé » (refonte système + ADR d'emblée)
- **Depends on** : ADR-0126 (naissance gouvernée + anti-inflation footprint), ADR-0134 (mesure communautaire réelle), ADR-0135 (transitions de dévotion attribuées), ADR-0124 (spine), ADR-0060 (manual-first), ADR-0046 (no-magic-fallback)
- **Supersedes** : —

## Contexte

La **définition** canon d'un superfan était déjà stricte en doctrine : les 6 rungs du Devotion Ladder (`src/domain/devotion-ladder.ts`) encodent des conditions claires — SPECTATEUR = a vu, PARTICIPANT = a interagi, ENGAGE = **a payé/inscrit**, AMBASSADEUR = a recommandé, EVANGELISTE = a partagé/prosélytise.

Mais la **mesure** ne respectait pas cette définition. Le seul instrument (`seshat/superfan-ingest.computeInboxEngagementDepth`) dérivait un unique scalaire `engagementDepth` à partir des **commentaires inbox uniquement**, plafonné à 0,60, puis mappait ce score → rung. Les requêtes northstar (`superfan.count`/`segments`/`top`/`velocity`) classent elles aussi par seuils de `engagementDepth`. Conséquences :

- **Le gate « a payé » n'avait AUCUN signal.** Le rung ENGAGE était **inatteignable par la mesure** : un client réel qui paie mais ne commente pas était classé SPECTATEUR. **Les clients étaient invisibles dans le ladder** — exactement le trou signalé par l'opérateur sur SPAWT (app gratuite, KPI = téléchargements uniques ; services payants vendus hors-app, conversion non trackée).
- « a vu / a recommandé / a partagé » n'étaient pas mesurés par personne non plus.
- La seule condition réellement trackée était « a commenté ».

## Décision

### 1. Modèle domaine : conditions strictes gate-gated (`src/domain/superfan-conditions.ts`)

5 conditions canoniques, chacune reliée à un rung (la condition la plus haute franchie fixe le rung, jamais une moyenne) :

| Condition (opérateur) | Gate | Rung canon | Plancher `engagementDepth` |
|---|---|---|---|
| a vu | `VIEWED` | SPECTATEUR | 0 |
| a interagi | `INTERACTED` | PARTICIPANT | 0,25 |
| a payé (= client) | `PAID` | ENGAGE | 0,45 |
| a recommandé | `RECOMMENDED` | AMBASSADEUR | 0,65 |
| a partagé | `SHARED` | EVANGELISTE | 0,85 |

`deriveTierFromConditions(met)` (pur, déterministe) = le rung le plus haut parmi les gates franchis. `conditionFloorDepth(met)` = le plancher de profondeur correspondant.

### 2. Le rung mesuré honore les conditions (single-writer `registerSuperfanProfile`)

À l'écriture, `engagementDepth` final = `max(mesure fournie, plancher des conditions, plancher du segment déclaré)` et le `segment` est **recalculé** de cette profondeur finale. Une condition franchie plancher donc AUSSI la profondeur — ainsi **toutes les requêtes northstar existantes (indexées sur `engagementDepth`) reflètent correctement un client qui a payé**, sans réécrire une seule requête. Un client à ENGAGE (0,45) reste sous le seuil superfan actif (0,65) : payer ≠ être un porte-parole.

### 3. Provenance par gate (aucune migration)

Les conditions franchies + leur preuve (`{ source, at?, note? }`) vivent dans `SuperfanProfile.metadata.conditions` (le champ `Json?` existe déjà). **Union jamais-dégrader** : une écriture qui omet une condition ne la retire pas.

### 4. Le gate « a payé » branché maintenant (registre clients manuel)

La voie gouvernée unique (`superfan.register`, `SESHAT_REGISTER_SUPERFAN`, `requireOperator`) accepte désormais `conditions`. Le **registre clients manuel** = `register` avec `conditions: { PAID: { source: "MANUAL", note } }` — marche sans intégration paiement (cohérent avec SPAWT : services vendus hors-app), aucune donnée fabriquée. Le lien automatique `Subscription → fan` (dérivation `PAID` sans saisie) et les instruments per-personne « a partagé / a recommandé » (partages/referrals sociaux) sont des incréments suivants tracés en dette : ils exigent que les payeurs/partageurs soient identifiables côté social, ce qui n'est pas le cas aujourd'hui.

## Conséquences

- **Doctrine anti-inflation ADR-0126 préservée.** `PAID` s'arrête à ENGAGE (0,45 < 0,65) → ne gonfle jamais le bras d'évidence CULTE/ICONE. `RECOMMENDED`/`SHARED` franchissent le seuil actif : ils exigent une **preuve d'advocacy vérifiée** (déclaration opérateur ou instrument dédié), JAMAIS du simple footprint public — le cap dur 0,60 sur la preuve « commentaires seuls » (`computeInboxEngagementDepth`) reste intact.
- **Single-writer préservé** : l'unique `superfanProfile.upsert` reste dans `superfan-ingest.ts` (test HARD inchangé). On étend le kind existant `SESHAT_REGISTER_SUPERFAN` — aucun nouveau Intent kind, aucune migration, additif.
- **Cap APOGEE 7/7 préservé**, 0 LLM (LOI 9).

## Dette (incréments suivants)

- Lien `Subscription → SuperfanProfile` (dérivation `PAID` automatique quand le payeur est identifiable côté social).
- Instruments per-personne `SHARED` (partages/UGC) et `RECOMMENDED` (referrals) — dépendent d'une donnée de partage par personne non collectée aujourd'hui.
- Surface cockpit/console du registre clients + affichage des gates par fan.
- `VIEWED` per-personne (impressions/vues de profil) — aujourd'hui seulement agrégé (followers/reach).
