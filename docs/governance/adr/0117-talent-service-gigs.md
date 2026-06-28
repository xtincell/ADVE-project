# ADR-0117 — Gigs prestataires (listing de services façon Fiverr/Malt)

**Status** : Accepted
**Date** : 2026-06-28
**Phase** : 24 — fermeture des trous Guilde (offre prestataire)
**Depends on** : ADR-0098 (LaGuilde), ADR-0019 (Imhotep)
**Enforced by** : `tests/unit/services/talent-services.test.ts`

## Contexte

L'audit 2026-06-28 a montré qu'un prestataire ne pouvait pas **lister ses
services** avec description + prix à l'avance (modèle Fiverr/Malt) — la Guilde ne
supportait que la candidature mission par mission. `PortfolioItem` était
post-livraison, sans prix.

## Décision

- **`TalentService`** : gig `{ title, description, category, priceAmount, currency,
  priceUnit (FORFAIT/JOUR/HEURE/LIVRABLE), deliveryDays, active }` rattaché au
  `TalentProfile`.
- **Service** `talent-services/` : create/update/toggle (owner-gated par profil),
  `listPublicServices` (browse marketplace, actifs uniquement), `listMyServices`.
- **Intents gouvernés** `LEGACY_TALENT_SERVICE_CREATE/_UPDATE/_TOGGLE` + SLOs.
  Router `talentServices` : `listPublic` (publicProcedure browse) + gestion
  propriétaire gouvernée.
- **UI créateur** `/creator/services` : créer un gig (titre/desc/catégorie/prix/
  délai), activer/désactiver.

## Conséquences

- Un prestataire publie ses offres ; les marques parcourent le catalogue public.
- Gig economy bidirectionnelle (offre + demande), complète la candidature mission.
- Cap APOGEE 7/7 préservé — sous-domaine Imhotep, aucun nouveau Neter.
