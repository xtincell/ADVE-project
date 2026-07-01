# ADR-0092 — Paiements de production : abonnements deux-rails, MCP billable, payouts mobile money réels

**Status** : Accepted (implemented v6.25.18)
**Date** : 2026-06-12
**Phase** : Mégasprint « dernière ligne droite Back-End » — Vague 5 (Paiements, Pricing & APIs de Production)
**Owning Neteru** : Thot (économie) · Anubis (MCP/connectors) · INFRASTRUCTURE (routes)
**Relates to** : ADR-0021 (Credentials Vault), ADR-0026 (MCP), ADR-0048 (tier gate), ADR-0075 (payment secrets en env), Cahier des charges Ch.6 (pricing déterministe)

---

## 1. Contexte

Mandat : « marché Afrique Centrale + Ouest + International. Solutions de
paiement fonctionnelles, pricing prêt, serveurs MCP armés et billable,
APIs génératrices branchées optionnelles. » Audit 2026-06-12 :

1. CinetPay/Stripe/PayPal opérationnels pour les one-shots intake — mais
   **aucun checkout d'abonnement** câblé (initStripeSubscription orphelin),
   **aucune page pricing publique** pour les tiers mensuels.
2. **MCP non billable** : clés `McpApiKey` validées sur une seule route,
   zéro metering, zéro agrégation d'usage, zéro relevé.
3. **Stub dangereux** : `mobile-money/callProviderAPI` **simulait le succès**
   des payouts — une commission talent pouvait passer PAID sans qu'aucun
   franc n'ait bougé. `payCommission` utilisait l'EMAIL comme numéro de
   téléphone.
4. Bug latent tier-gate : `PAID_TIER_KEYS_DEFAULT` listait `RETAINER_BASIC`
   (clé inexistante) au lieu de `RETAINER_BASE` — les abonnés BASE étaient
   refusés des Glory tools payants.

## 2. Décisions

### 2.1 Abonnements deux-rails (honnêteté mobile money)

- **International (EUR/USD/MAD)** : Stripe Checkout `mode: subscription` —
  récurrent natif, webhook `customer.subscription.*` existant.
  `operatorId` (= User.id, l'ancre de `checkPaidTier`) voyage désormais dans
  `subscription_data.metadata`.
- **Zone FCFA (XAF/XOF)** : **cycle manuel de 30 jours** — aucun agrégateur
  de la zone ne fait du recurring fiable cross-opérateurs, et un prélèvement
  silencieux sur du mobile money serait contraire à la doctrine (« l'ignition
  est un acte », Blueprint §2.1). Chaque cycle = paiement one-shot relié à sa
  `Subscription` (`IntakePayment.subscriptionId`, migration additive) ;
  l'encaissement (webhook CinetPay/PayPal/mock) étend `currentPeriodEnd`
  de 30 j via `applySubscriptionCycleIfPaid` — **idempotent** (webhook
  rejoué = no-op, `providerSnapshot.lastCycleRef`), renouvellement anticipé
  étendu depuis la fin de période courante (zéro jour perdu).
- Surfaces : `payment.initSubscription` / `mySubscriptions` /
  `cancelSubscription` + page publique **`/pricing`** (grille localisée par
  zone via `buildTierGrid` — déterministe, jamais statique) + lien depuis la
  section tarifs de la landing.
- Fix tier-gate `RETAINER_BASIC` → `RETAINER_BASE`.

### 2.2 MCP billable (metering à la frontière HTTP)

- `anubis/mcp-billing.ts` : gate dual **mutualisé** (`authenticateMcpRequest`
  — session ADMIN tracée non facturée | `x-api-key` scopée serveur,
  facturée) + `meterAndRun` (1 row `McpApiCall` par invocation, succès comme
  échec — Q1). **Les 10 routes** `/api/mcp/*` (dispatcher racine + 9
  serveurs) passent par ce chemin unique ; l'auth locale d'advertis-inbound
  est absorbée.
- Tarification déterministe par clé : `ratePerCallUsd` (défaut 0.002) +
  franchise `includedMonthlyCalls` (défaut 100). **billable = max(0, calls −
  franchise) × tarif.** Aucun LLM dans le chemin (test statique).
- Relevés : `McpUsageStatement` **gelé à l'émission** (unique par clé ×
  période ; WAIVED sous franchise ; double émission refusée), réglé via les
  payment providers existants (`paymentRef`). Source de vérité unique = les
  rows `McpApiCall` ; le relevé est un gel, jamais un double comptage.
- Console : `/console/anubis/api-billing` (création de clé — secret affiché
  UNE fois, hash seul persisté ; usage live ; émission/règlement des
  relevés) + router `mcpBilling`.

### 2.3 Payouts mobile money RÉELS (fin du stub)

`callProviderAPI` implémente les vrais clients :
- **Wave** : `POST /v1/payout` (Bearer `WAVE_API_KEY`, Idempotency-Key =
  référence).
- **MTN MoMo** : produit **Disbursements** — token client_credentials puis
  `POST /disbursement/v1_0/transfer` (X-Reference-Id UUID conservé comme
  providerRef ; 202 = PROCESSING, confirmation asynchrone).
- **Orange Money** : OAuth v3 client_credentials + endpoint transfert
  partenaire configurable (`ORANGE_MONEY_TRANSFER_PATH` — les contrats
  varient par pays).

**Sans credentials → échec EXPLICITE `DEFERRED_AWAITING_CREDENTIALS`**
(pattern ADR-0021/0075), jamais un succès simulé. `payCommission` exige
`TalentProfile.payoutPhone` (nouveau champ E.164, migration additive) et
refuse clairement sans lui — fin de l'email-comme-téléphone. Statut
`PROCESSING` pour les ordres acceptés en asynchrone (webhook existant
`handleWebhook` les résout).

### 2.4 Higgsfield — vérifié conforme au mandat

« Optionnel au fonctionnement, fire toujours sur demande » : déjà tenu —
`invokeExternalTool` retourne `DEFERRED_AWAITING_CREDENTIALS` sans creds
Vault, tier-gate `RETAINER_PRO`, invocation uniquement via Glory tool
explicite (aucun déclenchement de séquence automatique). Aucun code requis.

## 3. Alternatives écartées

- **Recurring CinetPay** : pas d'API de mandat récurrent multi-opérateurs
  fiable en zone ; un pseudo-recurring par stockage de tokens opérateur
  serait fragile et opaque pour le client. Cycle manuel assumé. Écarté.
- **Metering au niveau dispatchTool interne** : facturerait aussi les
  invocations internes de l'OS (Glory/Neteru) — la frontière billable est
  l'HTTP externe. Écarté.
- **Incrément d'agrégat à chaque call** (compteur sur statement) : double
  bookkeeping divergent des rows. Le gel à l'émission depuis la source
  unique est auditable. Écarté.
- **Paystack/Flutterwave** : couverture redondante avec CinetPay (collecte)
  + Stripe/PayPal (international) ; chaque provider ajoute une surface
  webhook/secrets. À reconsidérer sur demande marché réelle. Écarté pour
  cette vague.

## 4. Conséquences

- Le funnel revenu est complet : intake one-shot ✓ (existant), abonnements
  mensuels ✓ (2 rails), API billable ✓ (metering + relevés), payouts
  talents ✓ (réels ou refus explicite).
- 3 migrations additives : `mcp_billable_metering` (2 modèles + 3 colonnes
  clé), `subscription_cycle_link`, `talent_payout_phone`.
- 11 tests (franchise/tarif, gel/WAIVED/double-émission, extension 30 j,
  renouvellement anticipé, idempotence webhook, zéro-LLM statique).
- Cap APOGEE 7/7 préservé — aucune nouvelle entité métier hors facturation
  (grep CODE-MAP négatif sur metering/statement avant création).
