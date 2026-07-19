# ADR-0157 — Parrainage manual-first (première brique du passeport fan)

- **Statut** : Accepted (2026-07-19)
- **Origine** : demande opérateur (relayée de Hilaire) : « quand quelqu'un demande un diagnostic il peut mettre par qui il a été recommandé et ça lui offre une réduction ; le parrain gagne quelque chose, tant qu'il a un compte ou une société enregistrée ». Arbitrage délégué (« je te laisse arbitrer »).
- **Position doctrine** : ETAT-FINAL-RECHERCHE-2026 §2.3 — le parrainage est la **première brique du passeport fan** (boucle B2), pas une feature marketing isolée.

## Décisions arbitrées

1. **Filleul** : −20 % sur le **premier cycle** d'abonnement.
2. **Parrain** : **1 mois offert** à la conversion payée du filleul (pas de cash — pas de payout, pas de fraude cash).
3. **Éligibilité parrain** : tout compte enregistré (`User`) — le code `LF-XXXXXX` (alphabet sans ambiguïté I/L/O/0/1, dictable à l'oral/WhatsApp) est généré à la première demande (`referral.getMyCode`).
4. **Manual-first strict** (parité file manual-subscriptions v6.27.15) : AUCUN octroi automatique d'argent. Le cycle : intake « Recommandé par » (`?parrain=` préremplissable) → `Referral PENDING` (best-effort : code invalide/auto-parrainage/doublon = ignoré sans bloquer l'intake) → activation payée du filleul (`approveManualSubscription`) → `CONVERTED` → l'opérateur applique les deux récompenses **à la main** puis marque `REWARDED` sur `/console/socle/parrainages`. `adminProcedure`, pas de nouvel Intent kind (même précédent que manual-subscriptions).

## Implémentation

- Modèle additif `Referral` + `User.referralCode @unique` (migration backfill-safe `20260719120000`).
- Service `src/server/services/referral/` (génération de code, enregistrement dédupliqué, conversion) — zéro LLM, déterministe.
- Router `referral` (getMyCode + file admin) ; hook conversion dans `approveManualSubscription` (best-effort).

## Déférés (tracés)

- Conversion via Stripe webhook (le rail manuel WhatsApp est le rail réel actuel).
- Affichage « Mon code » côté cockpit founder (le code existe via `referral.getMyCode` ; la carte UI arrive avec le passeport fan B2).
- Récompense automatisée (crédit appliqué par le système) : seulement quand le passeport fan aura son propre registre de récompenses — jamais avant un anti-abus digne de ce nom.
