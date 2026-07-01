# ADR-0075 — Payment provider secrets STAY in env vars

**Status** : Accepted (formalize existing design)
**Date** : 2026-05-08
**Phase** : Phase 21 polish (post-mégasprint, light chantier safety)
**Depends on** : ADR-0021 (Credentials Vault — pattern pour tools / connectors externes Anubis)

## Contexte

CinetPay, Stripe, PayPal sont les 3 payment providers branchés (`src/server/services/payment-providers/`). Le model Prisma `PaymentProviderConfig` portait déjà un commentaire explicite :

```prisma
/// Secrets STAY in env vars (never in DB).
model PaymentProviderConfig {
  providerId String  @unique
  enabled    Boolean @default(true)
  config     Json?   // Free-form non-secret JSON (PAYPAL_ENV sandbox/live, etc.)
  ...
}
```

Mais cette décision n'était :
- Pas formalisée par un ADR.
- Pas testée par anti-drift CI (rien n'empêchait un futur contributeur d'écrire `apiKey` dans `config`).
- Pas surfacée pour l'opérateur (UI `/console/socle/pricing` montrait juste un toggle sans guider la configuration des env vars Vercel).

## Décision

### Architecture sécurité (formalisation)

**Les secrets payment provider (api keys, secret keys, client secrets) restent UNIQUEMENT en env vars** (Vercel Dashboard, chiffrés at-rest, jamais en git, jamais en DB, jamais en logs).

Le model `PaymentProviderConfig` ne stocke QUE :
- `providerId` (CINETPAY / STRIPE / PAYPAL)
- `enabled: boolean` — flag admin toggle
- `config: Json?` — flags non-secrets uniquement (ex: `PAYPAL_ENV: "sandbox" | "live"`)

**Cette décision diffère intentionnellement** d'ADR-0021 (Credentials Vault) qui chiffre les credentials at-rest en DB pour les connectors externes Anubis. Justification : les payment provider keys sont **système-wide** (clés La Fusée corporate qui encaissent les paiements intake freemium), pas per-operator. Pas besoin de multi-tenant + chiffrement DB ; env vars Vercel est plus simple, plus standard industrie, et suffisamment safe.

### Server-side validation (`monetization.adminUpdateProviderConfig`)

Deux gardes ajoutées :

1. **Reject secrets-like keys dans `config`** :
   ```ts
   const FORBIDDEN_CONFIG_KEYS = [
     "apikey", "api_key", "apiKey",
     "secret", "secretkey", "secret_key", "secretKey",
     "password", "token",
     "client_secret", "clientsecret", "clientSecret",
   ];
   if (input.config) {
     for (const key of Object.keys(input.config)) {
       const norm = key.toLowerCase();
       if (FORBIDDEN_CONFIG_KEYS.some((f) => norm.includes(f.toLowerCase()))) {
         throw new Error("[PAYMENT-CONFIG] Secret-like key forbidden ... (ADR-0075)");
       }
     }
   }
   ```

2. **Reject `enabled=true` si provider not configured** (env vars manquantes) :
   ```ts
   if (input.enabled) {
     const status = listProviders().find((p) => p.id === input.providerId);
     if (!status?.configured) {
       throw new Error("[PAYMENT-CONFIG] Cannot enable ... env vars manquantes ... (ADR-0075)");
     }
   }
   ```

Évite l'état "enabled-but-broken" où l'UI dit "actif" mais chaque paiement échoue.

### UI guide step-by-step (`/console/socle/pricing`)

Nouveau composant `PaymentProviderGuide` ([src/components/console/payment-provider-guide.tsx](../../src/components/console/payment-provider-guide.tsx)) qui rend explicite le flow safe :

1. **Configurer les env vars** (Vercel Dashboard) — liste exhaustive par provider avec descriptions + bouton copier-le-nom.
2. **Activer le provider** (toggle DB) — désactivé tant que les env vars ne sont pas là.
3. **Webhook URL** (à configurer côté provider dashboard) — URL pré-remplie avec lien Dashboard.

Avertissement explicite encadré sur l'étape 1 :
> Les secrets restent **uniquement en env vars** (Vercel chiffre at-rest). Jamais en DB, jamais en git, jamais dans `config`.

### Tests anti-drift (mode HARD)

[`tests/unit/governance/payment-secrets-stay-in-env.test.ts`](../../tests/unit/governance/payment-secrets-stay-in-env.test.ts) :

- Le commentaire Prisma `Secrets STAY in env vars` est présent.
- Les 3 providers lisent `process.env.*` (et pas de `paymentProviderConfig.findUnique` ni `.config.apiKey` etc.).
- `adminUpdateProviderConfig` contient `FORBIDDEN_CONFIG_KEYS` + cite "ADR-0075".
- `adminUpdateProviderConfig` rejette `enabled=true` si pas configured (`status.configured` + `listProviders()`).
- UI guide existe + structure 3 étapes + 3 providers + warning DB explicite + toggle disabled si pas configured.

## Cap APOGEE

**7/7 préservé.** Aucun nouveau Neter, aucun Intent, aucun nouveau model. Pure formalisation + UI polish + anti-drift.

## Comment ajouter ton api code (procédure canonique)

1. **Vercel Dashboard** → Project → Settings → Environment Variables :
   ```
   CINETPAY_API_KEY=<ta clé>
   CINETPAY_SITE_ID=<ton site id>
   CINETPAY_SECRET_KEY=<ta clé HMAC pour webhook>
   ```
   Vercel chiffre at-rest, jamais en git, jamais visible aux logs.

2. **Redeploy** (env vars n'apparaissent qu'après build).

3. **`/console/socle/pricing`** → vérifie que CINETPAY a le badge ✅ "Env vars OK", puis toggle "Activer" sur la card.

4. **CinetPay Dashboard** (côté CinetPay) → configurer le webhook URL :
   ```
   https://<ton-domaine>/api/payment/webhook/cinetpay
   ```
   Le webhook handler vérifie HMAC + cross-check via API CinetPay v2 (defense in depth).

## Doctrine NEFER §1.1

- ✅ **Pas de notion de temps humain** — chantier light mais complet (UI guide + 2 server-side guards + 11 tests + ADR).
- ✅ **Pas d'économie de tokens** — guide step-by-step détaillé pour l'opérateur, pas un simple toggle obscur.
- ✅ **Profondeur > raccourci** — formalise la décision existante au lieu de l'amplifier en migrant vers Credentials Vault (qui aurait été un refactor au mauvais endroit).

## Suite

- Si un provider futur (ex: Wave, Orange Money direct) nécessite des credentials per-operator, il rejoindra `ExternalConnector` + Credentials Vault (ADR-0021), pas `PaymentProviderConfig`. Cet ADR clarifie la frontière.
- `cinetpay-mcp` (MCP server officiel) reste une option future si CinetPay publie un MCP mature — il s'intégrerait via Anubis Credentials Vault + Glory tools MCP-backed (pattern Higgsfield), pas via cet ADR.
