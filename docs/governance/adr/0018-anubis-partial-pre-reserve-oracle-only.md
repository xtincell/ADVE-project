# ADR-0018 — Anubis partial pre-reserve exit (Oracle-stub only)

**Date** : 2026-05-01
**Statut** : Accepted
**Phase** : 13 (sprint Oracle 35-section)
**Lien d'origine** : ADR-0011 (Anubis pré-réserve initiale Phase 9)

## Contexte

Anubis est l'un des 2 Neteru pré-réservés du panthéon (cap 7 BRAINS) pour le sous-système Comms (Ground #7) — activation prévue Phase 8+ (broadcast paid + earned media, email/SMS/ad-networks, notification center).

Le sprint Phase 13 (ADR-0014) introduit une section dormante `anubis-comms-dormant` dans l'Oracle 35-section qui doit afficher un placeholder structuré en attendant l'activation complète.

## Décision

**Sortie partielle de pré-réserve scope strict Oracle-only** (jumeau ADR-0017 Imhotep) :

- Créer `src/server/services/anubis/` avec **3 fichiers MAX** :
  - `types.ts` : `AnubisDraftCommsPlanPayload` + `AnubisCommsPlanPlaceholder` avec status `DORMANT_PRE_RESERVED` + adrRefs `["ADR-0011", "ADR-0018"]`
  - `index.ts` : handler `draftCommsPlan(payload)` retourne placeholder structuré (audience-aware)
  - `manifest.ts` (optionnel — non créé dans ce sprint, deferred B9+)

**HORS scope strict (anti-doublon NEFER §3)** :
- ❌ Pas de modèle Prisma (pas de `Anubis*`, `CommsPlan`, `NotificationChannel`, etc.)
- ❌ Pas de page UI dédiée (`/console/anubis/...`)
- ❌ Pas de Glory tools propres
- ❌ Pas de notification center in-app persistent (toasts existants `notification-toast.tsx` suffisent pour ce sprint)
- ❌ Pas d'ad-network connector
- ❌ Pas plus de 1 Intent kind (`ANUBIS_DRAFT_COMMS_PLAN` — non encore enregistré, deferred B10+)

**Cap 7 BRAINS preserved** : Anubis RESTE pré-réservé dans `BRAINS` const. Aucune Capability declared, aucun manifest enregistré.

## Conséquences

### Positives

- **Section dormante Oracle produite** : `anubis-comms-dormant` affiche un placeholder réel (audience-aware)
- **Aucune activation prématurée** : Comms sub-system reste dormant côté gouvernance
- **Scope explicite** : ADR documente HORS scope, évite scope creep notification center

### Négatives

- Idem ADR-0017 Imhotep : 2 fichiers TS supplémentaires + Intent kind non enregistré
- Tentation de créer un notification center "puisqu'on touche à Anubis" — explicitement interdit par cet ADR

## Test bloquant

`tests/unit/governance/oracle-imhotep-anubis-stubs-phase13.test.ts` (B9) verrouille les mêmes invariants que Imhotep (≤ 3 fichiers, mentions HORS scope, manifest core sans import, schema sans model).

## Activation Phase 8+

Quand Anubis sera activé complètement :
1. Ce stub Oracle-only sera absorbé/étendu
2. La section dormante deviendra CORE + renommée
3. Cet ADR sera "Superseded by ADR-XXXX"
4. Notification center, ad-network connectors, broadcast pipelines seront ajoutés via ADRs dédiés

## Liens

- [ADR-0011](0011-neter-anubis-comms.md) — Anubis pré-réserve initiale
- [ADR-0014](0014-oracle-35-framework-canonical.md) — Oracle 35-section canonical
- [ADR-0017](0017-imhotep-partial-pre-reserve-oracle-only.md) — Imhotep sortie partielle (jumeau)
- [PANTHEON.md](../PANTHEON.md) — statut Anubis pré-réservé
- `src/server/services/anubis/` — implémentation
- `tests/unit/governance/oracle-imhotep-anubis-stubs-phase13.test.ts` — anti-drift
