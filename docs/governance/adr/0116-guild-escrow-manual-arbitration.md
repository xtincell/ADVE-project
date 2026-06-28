# ADR-0116 — Escrow Guilde à validation manuelle par arbitres UPgraders

**Status** : Accepted
**Date** : 2026-06-28
**Phase** : 24 — fermeture des trous Guilde (paiement)
**Depends on** : ADR-0019/0098 (Imhotep/LaGuilde), ADR-0021 (Credentials Vault), ADR-0092 (payouts momo)
**Enforced by** : `tests/unit/services/escrow-arbitration.test.ts`

## Contexte

Doctrine opérateur : le paiement Guilde est **asynchrone**, gouverné par un escrow
à **validation manuelle** par UPgraders et ses agents arbitres, dans une interface
dédiée. L'audit 2026-06-28 a montré que ce flux n'était **pas câblé** : le modèle
`Escrow` + l'API `releaseEscrow` existaient, mais la page `/console/socle/escrow`
était en lecture seule sur les commissions (ne lisait même pas `Escrow`), sans
bouton d'arbitrage, et le couplage `Escrow`↔Mission était absent (escrow lié au
seul `Contract`→`Strategy`).

## Décision

- **Couplage mission** : `Escrow.contractId` rendu optionnel + champs additifs
  `missionId`, `commissionId`, `arbitratedBy`, `paymentOrderId` + relation
  `Mission.escrows`. Un escrow peut désormais séquestrer les fonds d'une mission.
- **Auto-hold** : à la complétion d'une mission, après calcul de la commission,
  le net du talent est mis sous séquestre (`HELD`) avec des conditions par défaut
  → atterrit dans la file d'arbitrage.
- **Service** `escrow-arbitration/` : `holdEscrowForMission`, `meetEscrowCondition`,
  `releaseEscrow` (RELEASED + émet un `PaymentOrder` momo **PENDING** honnête —
  jamais COMPLETED sans preuve provider — + marque la commission PAID),
  `refundEscrow` (REFUNDED), `disputeEscrow` (DISPUTED). Helper pur
  `allConditionsMet`. Le payout SDK réel reste credential-gated.
- **Intents gouvernés** `LEGACY_ESCROW_HOLD/_MEET_CONDITION/_RELEASE/_REFUND/_DISPUTE`
  + SLOs. Router `escrowArbitration` (mutations réservées aux arbitres ADMIN).
- **Interface d'arbitrage** : `/console/socle/escrow` réécrite sur le modèle
  `Escrow` réel — file par statut, validation de conditions, boutons Libérer /
  Rejeter-Rembourser / Litige. Libération forcée possible avec justification tracée.

## Conséquences

- Le paiement asynchrone à validation manuelle existe vraiment, de bout en bout :
  mission complétée → fonds sous séquestre → arbitre valide → libère (payout momo)
  ou rembourse. Tout gouverné, tracé (`arbitratedBy`), déterministe.
- Le payout mobile money réel (SDK Wave/MTN/Orange) reste à câbler (PENDING
  honnête) — contrat `PaymentOrder` posé.
- Cap APOGEE 7/7 préservé — sous-domaine Thot/Imhotep, aucun nouveau Neter.
