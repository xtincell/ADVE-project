# ADR-0118 — Devis structuré prestataire → marque (MissionQuote)

**Status** : Accepted
**Date** : 2026-06-28
**Phase** : 24 — fermeture des trous Guilde (devis)
**Depends on** : ADR-0098 (LaGuilde), ADR-0112 (AICP), ADR-0107 (estimate/actual)
**Enforced by** : `tests/unit/services/mission-quote.test.ts`

## Contexte

L'audit 2026-06-28 a montré que le « devis » se réduisait à
`MissionApplication.proposedRate` (montant simple) côté bidding, et au devis AICP
(post-exécution). Il manquait un **devis structuré** pré-mission : lignes
détaillées, TVA, total, référence — ce qu'un prestataire envoie à une marque.

## Décision

- **`MissionQuote`** : `{ reference, lines (JSON [{label,qty,unitPrice}]), subtotal,
  taxRatePct, taxAmount, total, currency, status (DRAFT/SENT/ACCEPTED/REJECTED/
  EXPIRED), validUntil }` rattaché à `Mission` + `TalentProfile`.
- **Calculs purs** (`mission-quote/`) : `computeQuoteTotals` (sous-total, TVA,
  total ; valeurs non finies → 0, jamais NaN) + `quoteReference` déterministe
  (DEV-<mission8>-<seq>, pas de hasard).
- **Service** : `submitQuote` (calcule les totaux, numérote), `decideQuote`
  (marque accepte/rejette), `listQuotesByMission`, `listMyQuotes`.
- **Intents gouvernés** `LEGACY_MISSION_QUOTE_SUBMIT/_DECIDE` + SLOs. Router
  `missionQuote` (byMission/listMine/submit/decide, tenant-scopé).

## Conséquences

- Un prestataire produit un vrai devis (lignes + TVA), la marque tranche. Complète
  la facture (`Invoice`, déjà auto-générée à la complétion) — devis → travail →
  facture est désormais complet.
- Cap APOGEE 7/7 préservé — sous-domaine Imhotep/Thot, aucun nouveau Neter.
