# ADR-0021 — External Credentials Vault (back-office pattern)

**Date** : 2026-05-01
**Statut** : Accepted
**Phase** : 15 (livré avec Anubis full activation, mais pattern transverse)
**Auteur direction** : opérateur (user)

## Contexte

Le full service Anubis (ADR-0020) intègre des connectors externes : Meta Ads, Google Ads, X Ads, TikTok Ads, Mailgun, Twilio. Chacun nécessite des clés API / OAuth tokens / account IDs.

**Problème** : ces credentials ne peuvent pas être committés en code (sécurité), ne peuvent pas être en `.env` initialement (le user opérateur va les configurer après le déploiement), et ne doivent pas bloquer le développement (un agent/dev qui ship Anubis ne peut pas attendre que les credentials soient fournies).

**Demande explicite du user** : *"pour les valeurs manquantes comme les API et tout, tu devrais prévoir l'UI adéquate côté back-office, dans le portail oracle. Ça évite que tu bloques sur une data manquante."*

## Décision

**Pattern Credentials Vault** : tout connector externe est géré via une UI back-office Console qui CRUD un model Prisma `ExternalConnector` (existant déjà depuis V5), avec storage des secrets en `config: Json` chiffré au repos (champ déjà prévu).

### Pattern d'utilisation côté code

Tout handler qui requiert un credential externe suit ce pattern :

```ts
// dans un service handler (Anubis, Imhotep futur, etc.)
import { credentialVault } from "@/server/services/anubis/credential-vault";

export async function broadcastViaMeta(payload: BroadcastPayload, ctx: Ctx) {
  const cred = await credentialVault.get(ctx.operatorId, "meta-ads");
  if (!cred || cred.status !== "ACTIVE") {
    return {
      status: "DEFERRED_AWAITING_CREDENTIALS" as const,
      connectorType: "meta-ads",
      configureUrl: "/console/anubis/credentials?type=meta-ads",
      reason: cred ? `connector status=${cred.status}` : "no credential registered",
    };
  }
  // ... real call avec cred.config (decrypted en mémoire only)
}
```

→ **Conséquence** : le code ship fonctionnel même sans credentials. Le caller (UI ou autre service) gère le retour `DEFERRED_AWAITING_CREDENTIALS` en affichant un CTA "Configure Meta Ads" qui linke vers le Credentials Center.

### Périmètre code Phase 15

**Réuse strict du model existant** (anti-doublon NEFER §3) :
- `ExternalConnector` (existant) — `connectorType` (string libre, déjà supporté), `config: Json` (chiffré au repos via Postgres `pgcrypto` à activer), `status` enum (ACTIVE/INACTIVE/ERROR/SYNCING déjà présent)

**Pas de nouveau model Prisma**. Le model existant couvre.

**Service partagé** : `src/server/services/anubis/credential-vault.ts` exposed comme module utilitaire — Imhotep et autres futurs services peuvent l'importer (boundary légitime via `governance/`).

**UI back-office** :
- `console/anubis/credentials/page.tsx` — liste tous les `ExternalConnector` du tenant, état, dernière sync
- Form modal CRUD :
  - Sélection `connectorType` (dropdown : meta-ads, google-ads, x-ads, tiktok-ads, mailgun, twilio, custom)
  - Champs config dynamiques selon provider (clé API, secret, account ID, OAuth flow déclencheur)
  - Action "Test connection" (envoie un test ping via le provider façade — confirme avant de marquer ACTIVE)
  - Action "Revoke" (status → INACTIVE, ne supprime pas pour traçabilité)

**Intent kinds dédiés** (Anubis-gouvernés) :
- `ANUBIS_REGISTER_CREDENTIAL` — création/update via UI
- `ANUBIS_REVOKE_CREDENTIAL` — soft delete
- `ANUBIS_TEST_CHANNEL` — test connectivity
- `ANUBIS_FETCH_DELIVERY_REPORT` — pull metrics du provider

### Sécurité

- `config` Json chiffré au repos via `pgcrypto` (à wirer dans la migration Phase 15)
- Décryption uniquement dans `credential-vault.get()` — jamais loggé, jamais retourné brut au client
- Accès limité aux roles `OWNER` / `ADMIN` du tenant (vérifié via `protectedProcedure` + check role dans le router)
- Audit trail : chaque `register/revoke` émet `IntentEmission` (hash-chained, replayable)

### Pattern transverse (futurs usages hors Anubis)

Tout futur connector externe (Imhotep ATS, formation providers, payment processors additionnels, analytics tools, etc.) DOIT suivre ce pattern :
1. Wrapper service appelle `credentialVault.get(operatorId, connectorType)` au boot du handler
2. Retour `DEFERRED_AWAITING_CREDENTIALS` si absent/inactif (jamais throw)
3. UI Configuration via `/console/<service>/credentials` ou shared `/console/anubis/credentials` selon scope

## Conséquences

### Positives

- **Code ship-able sans credentials** — pas de blocage dev/CI
- **UX user clair** — "Configure provider X" CTA contextuel quand action non disponible
- **Sécurité centralisée** — un seul model, un seul service, une seule UI = surface d'audit minimale
- **Pattern réutilisable** — futurs services suivent le même contrat (`DEFERRED_AWAITING_CREDENTIALS` est un retour standard)
- **Réutilise infra existante** — `ExternalConnector` model + connectors router existaient déjà

### Négatives

- `pgcrypto` extension Postgres à activer en migration (légère dette ops)
- `connectorType` est un string libre (pas un enum Prisma) — pas de check compile-time sur les types valides ; mitigé via Zod schema dans le router
- Test couvrant chaque provider façade nécessaire (`tests/unit/services/anubis/providers/*-deferred.test.ts`)

## Tests bloquants

- `tests/unit/services/anubis/credential-vault.test.ts` (NEW) :
  - `get` retourne null si pas d'entry
  - `get` retourne null si status !== ACTIVE
  - `register` crée + chiffre config
  - `revoke` set status INACTIVE sans supprimer
- Per-provider façade tests : retour `DEFERRED_AWAITING_CREDENTIALS` quand `get` returns null

## Liens

- [ADR-0020](0020-anubis-full-activation.md) — Anubis full (consumer principal)
- [ADR-0019](0019-imhotep-full-activation.md) — Imhotep full (consumer futur potentiel)
- `prisma/schema.prisma` — model `ExternalConnector` (existant)
- `src/server/services/anubis/credential-vault.ts` — implémentation Phase 15
- `src/app/(console)/console/anubis/credentials/page.tsx` — UI Phase 15
