# ADR-0017 — Imhotep partial pre-reserve exit (Oracle-stub only)

**Date** : 2026-05-01
**Statut** : ⚠️ **Superseded by [ADR-0019](0019-imhotep-full-activation.md)** (2026-05-01, Phase 14)
**Phase** : 13 (sprint Oracle 35-section)
**Lien d'origine** : ADR-0010 (Imhotep pré-réserve initiale Phase 9)

> **Note de supersession** : cet ADR est conservé pour traçabilité historique. Le scope partial Oracle-only ratifié ici n'a pas été demandé par l'opérateur (drift Phase 8 NEFER), qui attendait le full service Imhotep. Phase 14 active Imhotep entièrement via ADR-0019. Le service `services/imhotep/` est étendu (pas re-créé), conformément à la prévision §"Activation Phase 7+" de cet ADR.

## Contexte

Imhotep est l'un des 2 Neteru pré-réservés du panthéon (cap 7 BRAINS) pour le sous-système Crew Programs (Ground #6) — activation prévue Phase 7+ (matching talent, crew composition, formation Académie).

Le sprint Phase 13 (ADR-0014) introduit une section dormante `imhotep-crew-program-dormant` dans l'Oracle 35-section qui doit afficher un placeholder structuré en attendant l'activation complète. Pour produire ce placeholder, il faut un handler invocable, mais sans **activer** Imhotep dans le panthéon.

## Décision

**Sortie partielle de pré-réserve scope strict Oracle-only** :

- Créer `src/server/services/imhotep/` avec **3 fichiers MAX** :
  - `types.ts` : `ImhotepDraftCrewProgramPayload` + `ImhotepCrewProgramPlaceholder` avec status `DORMANT_PRE_RESERVED` + adrRefs `["ADR-0010", "ADR-0017"]`
  - `index.ts` : handler `draftCrewProgram(payload)` retourne placeholder structuré (sector-aware)
  - `manifest.ts` (optionnel — non créé dans ce sprint, deferred B9+)

**HORS scope strict (anti-doublon NEFER §3)** :
- ❌ Pas de modèle Prisma (pas de `Imhotep*`, `CrewProgram`, etc.)
- ❌ Pas de page UI dédiée (`/console/imhotep/...`)
- ❌ Pas de Glory tools propres
- ❌ Pas de notification center
- ❌ Pas de crew DB (talent, certifications, courses)
- ❌ Pas plus de 1 Intent kind (`IMHOTEP_DRAFT_CREW_PROGRAM` — non encore enregistré dans `intent-kinds.ts`, à faire B10+)

**Cap 7 BRAINS preserved** : Imhotep RESTE pré-réservé dans `BRAINS` const (`src/server/governance/manifest.ts:23`). Aucune Capability declared, aucun manifest enregistré dans le registry. Le handler `draftCrewProgram` est invocable directement par les sections dormantes B5 (via la séquence `IMHOTEP-CREW` Phase 13 B3 avec steps PLANNED).

## Conséquences

### Positives

- **Section dormante Oracle produite** : `imhotep-crew-program-dormant` affiche un placeholder réel (sector-aware) au lieu d'un texte hardcodé inerte
- **Aucune activation prématurée** : le sous-système Crew Programs reste dormant côté gouvernance ; pas de fausse impression de feature complète
- **Scope explicite** : ADR documente précisément ce qui est HORS scope, évite les ajouts incrementaux qui activeraient Imhotep par accident

### Négatives

- 2 fichiers TypeScript supplémentaires sans usage runtime ailleurs que B5 dormant section — dette légère
- L'ajout du Intent kind `IMHOTEP_DRAFT_CREW_PROGRAM` dans `intent-kinds.ts` est différé B10+ (la séquence dormante actuelle a juste des steps PLANNED, donc le handler n'est pas encore invoqué via `mestor.emitIntent` — il est appelé directement par les sections UI Oracle B5)

## Test bloquant

`tests/unit/governance/oracle-imhotep-anubis-stubs-phase13.test.ts` (B9) verrouille :
- ≤ 3 fichiers dans `services/imhotep/`
- types.ts mentionne "cap 7 BRAINS" + "HORS scope strict"
- Manifest core n'importe PAS imhotep service
- schema.prisma : 0 models Imhotep/CrewProgram

## Activation Phase 7+

Quand Imhotep sera activé complètement (Phase 7+), ce stub Oracle-only :
1. Devra être absorbé/étendu (pas re-créé from scratch)
2. La section dormante `imhotep-crew-program-dormant` deviendra une section CORE + sera renommée
3. Cet ADR sera marqué "Superseded by ADR-XXXX" (à créer en Phase 7)

## Liens

- [ADR-0010](0010-neter-imhotep-crew.md) — Imhotep pré-réserve initiale
- [ADR-0014](0014-oracle-35-framework-canonical.md) — Oracle 35-section canonical
- [ADR-0018](0018-anubis-partial-pre-reserve-oracle-only.md) — Anubis sortie partielle (jumeau)
- [PANTHEON.md](../PANTHEON.md) — statut Imhotep pré-réservé
- `src/server/services/imhotep/` — implémentation
- `tests/unit/governance/oracle-imhotep-anubis-stubs-phase13.test.ts` — anti-drift
