# ADR-0003 — Pillar 4 : Pre-conditions centralisées (pillar-readiness)

**Date** : 2026-04-29
**Statut** : accepted
**Phase de refonte** : phase/3

## Contexte

Bug récurrent : Mestor remplit partiellement les pillars d'une strategy, l'UI affiche "complet", puis une séquence GLORY déclenchée par l'opérateur échoue parce que des champs requis sont vides. Le handler côté service n'avait pas la responsabilité de re-vérifier l'état du monde — chacun le faisait à moitié.

Solution non retenue : laisser chaque service défensif. Coût : code défensif éparpillé, validations divergentes, pas d'audit centralisé des refus.

## Décision

Une couche de **pre-conditions déclaratives** — `src/server/governance/pillar-readiness.ts` — est **la seule source** de vérité sur "est-ce que la strategy est prête pour cette action ?".

**5 gates fixes** (extension exige un nouvel ADR) :
- `DISPLAY_AS_COMPLETE` — l'UI peut-elle annoncer cette pillar comme complète ?
- `RTIS_CASCADE` — peut-on lancer R→T→I→S ?
- `GLORY_SEQUENCE` — peut-on exécuter une séquence GLORY ?
- `ORACLE_ENRICH` — peut-on enrichir l'Oracle ?
- `ORACLE_EXPORT` — peut-on exporter l'Oracle (PDF/MD) ?

Les capabilities listent leurs `preconditions` dans le manifest. `governedProcedure` les évalue **avant** d'invoquer le handler. Échec → `ReadinessVetoError` → `IntentEmission.status="VETOED"` avec reason explicite.

## Conséquences

**Positives** :
- Handlers redeviennent naïfs — la défense est centralisée.
- Audit trail systématique des refus (audit `IntentEmission` filtre `status="VETOED"`).
- Tests de pré-conditions isolables sans bootstrap d'un service entier.
- Diff entre "ce que l'UI affiche" et "ce que le système permet" → 0.

**Négatives** :
- Toute capability doit choisir ses gates explicitement (friction au scaffold).
- 5 gates seulement = limitation volontaire pour éviter la prolifération.

**Enforcement** :
- `audit-preconditions.ts` script CI.
- Lint custom `lafusee/no-adhoc-completion-math`.

## Alternatives considérées

1. **Validation Zod sur chaque entrée** : couvre WHAT-can-be-passed mais pas IS-the-world-in-a-state-where-this-call-makes-sense.
2. **Throw dans les handlers** : disperse la logique, pas de pattern unifié, pas d'audit propre.
3. **Middleware tRPC custom par procedure** : trop manuel, oublié quand un router est ajouté.

## Lectures

- [APOGEE.md §4.2](../APOGEE.md) — Guidance sub-system
- [FRAMEWORK.md §"Pilier 4"](../FRAMEWORK.md)
- src/server/governance/pillar-readiness.ts
