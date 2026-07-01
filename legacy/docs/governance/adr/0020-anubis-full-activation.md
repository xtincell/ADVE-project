# ADR-0020 — Anubis full activation (Comms Ground #7)

**Date** : 2026-05-01
**Statut** : Accepted
**Phase** : 15 (sprint Imhotep + Anubis full activation, jumeau ADR-0019)
**Supersedes** : [ADR-0018](0018-anubis-partial-pre-reserve-oracle-only.md) (Oracle-only stub)
**Lien d'origine** : [ADR-0011](0011-neter-anubis-comms.md) (pré-réserve initiale)

## Contexte

ADR-0018 (Phase 13) avait livré une sortie partielle d'Anubis limitée à un placeholder Oracle-only (handler 31 lignes). L'opérateur (user) a signalé que cette sortie partielle n'était **pas** demandée : le scope attendu est le **full service** Anubis tel que prévu par ADR-0011 (broadcast paid + earned media, email/SMS/ad-networks, notification center).

ADR-0018 est révoqué. Cet ADR acte l'activation Anubis complète Phase 15.

## Décision

**Anubis devient le 7ème Neter ACTIF**. Le panthéon atteint sa capacité canonique : **7 actifs / 7** (plafond APOGEE atteint). Toute fonction nouvelle s'absorbera désormais dans un Neter existant ou exigera un ADR de relèvement de plafond.

### Architecture — Anubis orchestre comms + persiste credentials externes

Anubis wrappe les services satellites comms existants et introduit le **Credentials Vault** (cf. ADR-0021) pour gérer les API keys externes via UI back-office au lieu de variables d'env.

| Service satellite existant | Rôle wrappé par Anubis |
|---|---|
| `email/` (156 lignes) | Email transactionnel (existant, façade simple) |
| `advertis-connectors/` (327 lignes) | Connectors ad networks (déjà partiel) |
| `oauth-integrations/` (286 lignes) | OAuth flows (Meta, Google, etc.) |

### Périmètre code

**Service `src/server/services/anubis/`** :
- `manifest.ts` — capabilities `broadcastMessage`, `buyAdInventory`, `segmentAudience`, `trackDelivery`, `registerCredential`, `testChannel`, `scheduleBroadcast`, `cancelBroadcast`, `fetchDeliveryReport`, `draftCommsPlan`
- `index.ts` — handlers orchestrateurs
- `governance.ts` — gates : audience size, budget cap, credential validity
- `types.ts` — étendus
- `broadcast-orchestrator.ts` — fan-out broadcast multi-canal
- `audience-segmenter.ts` — segmentation Json rules → query
- `ad-buyer.ts` — abstraction ad networks (Meta/Google/X/TikTok)
- `notification-center.ts` — extension Notification model (persistent in-app center)
- `credential-vault.ts` — wraps `ExternalConnector` model (exists déjà) + extension
- `providers/` :
  - `meta-ads.ts` (façade — no-op si credentials absentes, log INFO)
  - `google-ads.ts` (façade)
  - `x-ads.ts` (façade)
  - `tiktok-ads.ts` (façade)
  - `mailgun.ts` (façade)
  - `twilio.ts` (façade)
  - `email-fallback.ts` (dev mode — log only)

**Pattern feature-flag des providers** : chaque provider check via `credential-vault.hasValidCredential(connectorType)` au boot du handler. Si `false`, le handler retourne `{ status: "DEFERRED_AWAITING_CREDENTIALS", connectorType, configureUrl: "/console/anubis/credentials" }` — pas d'erreur, pas de blocage. Conséquence : **le code livre fonctionnel même sans clés API** ; le user finit la config plus tard via UI.

**Prisma — extension de l'existant + 4 nouveaux models** :

Existants réutilisés :
- `Notification` + `NotificationPreference` (existants — étendus en queries Anubis)
- `ExternalConnector` (existant — extended via `connectorType` enum élargi : `meta-ads`, `google-ads`, `x-ads`, `tiktok-ads`, `mailgun`, `twilio` ajoutés au commentaire libre)
- `WebhookConfig` (existant)

Nouveaux (4) :
- `CommsPlan` — plan comms global pour brand/campaign (id, strategyId, campaignId?, mode, channels[], audienceId?, status, scheduledFor?)
- `BroadcastJob` — job queue persistant pour broadcasts différés (id, commsPlanId, channel, payload Json, status, attempts, errorLog Json?)
- `EmailTemplate` — template email réutilisable (id, name, subject, htmlBody, textBody, variables Json)
- `SmsTemplate` — template SMS réutilisable (id, name, body, variables Json)

→ Migration Prisma `phase15-anubis-comms`. **Pas de `db push`** — `prisma migrate dev` strict.

**Intent kinds** (~10 nouveaux + 1 conservé) :
- `ANUBIS_DRAFT_COMMS_PLAN` (existant — conservé pour Oracle dormant section devenue active)
- `ANUBIS_BROADCAST_MESSAGE`
- `ANUBIS_BUY_AD_INVENTORY`
- `ANUBIS_SEGMENT_AUDIENCE`
- `ANUBIS_TRACK_DELIVERY`
- `ANUBIS_REGISTER_CREDENTIAL`
- `ANUBIS_TEST_CHANNEL`
- `ANUBIS_SCHEDULE_BROADCAST`
- `ANUBIS_CANCEL_BROADCAST`
- `ANUBIS_FETCH_DELIVERY_REPORT`
- `ANUBIS_REVOKE_CREDENTIAL`

**Glory tools** (3 nouveaux) :
- `ad-copy-generator` (LLM) — génère 3 variants ad copy par mode manipulation
- `audience-targeter` (LLM) — propose règles segmentation pour audience cible
- `broadcast-scheduler` (CALC) — calcule fenêtres optimales d'envoi

**Sequences** (1 nouvelle) :
- `ANUBIS-CAMPAIGN-LAUNCH` — DRAFT_COMMS_PLAN → SEGMENT_AUDIENCE → AD_COPY_GENERATE → SCHEDULE_BROADCAST

**tRPC router** : `src/server/trpc/routers/anubis.ts` (NEW)

**Pages UI** :
- **Hub** `console/anubis/page.tsx` (NEW) — dashboard campaigns/broadcasts/notifications/credentials status
- **Credentials Center** `console/anubis/credentials/page.tsx` (NEW) — UI back-office pour gérer ExternalConnector entries (CRUD avec validation provider-spécifique). Pattern défini dans ADR-0021.
- **Notifications persistent center** : étend `console/messages/page.tsx` (existant) ou nouvelle page `console/anubis/notifications/page.tsx` selon décision UX (à trancher en B5 — défaut : extend existant)
- **Wirage existant** : `console/artemis/{social,pr,media,interventions,campaigns}/page.tsx` continuent de fonctionner ; les actions critiques (broadcast, schedule, buy) passent désormais par Intent kinds Anubis

### BRAINS const

`src/server/governance/manifest.ts:23` — ANUBIS déjà présent (Phase 13). Statut narratif "pré-réservé" → "actif".

### Manifest registration

Mestor registry doit importer `anubis/manifest.ts`. Test `manifest-core-import.test.ts` updated.

## Conséquences

### Positives

- **Comms sub-system (Ground #7) actif** — dernier slot canonique des 7 Neteru rempli
- **Credentials Center back-office** (ADR-0021) — pattern réutilisable pour tout futur connector externe (Imhotep peut s'y brancher pour ATS / formation providers etc.)
- **Pas de blocage credentials** — providers façades feature-flagged livrent du code utilisable même sans clés API (DEFERRED_AWAITING_CREDENTIALS state)
- **Section Oracle `anubis-comms-dormant`** devient ACTIVE
- **WebhookConfig** (existait depuis longtemps sans consumer) enfin utilisé par BroadcastJob

### Négatives

- Sprint majeur — 4 nouveaux models Prisma + migration + ~15 fichiers service + 2 nouvelles pages UI
- Connectors externes (Meta/Google/X/TikTok ads APIs, Mailgun, Twilio) livrés en façade no-op — implémentation réelle des SDKs deferred jusqu'à ce que le user ajoute les clés via Credentials Center
- Update test `oracle-imhotep-anubis-stubs-phase13.test.ts` : assertion "≤ 3 fichiers" retirée pour Anubis
- Plafond APOGEE atteint — toute fonction nouvelle exigera ADR de relèvement de plafond

## Tests bloquants

- `tests/unit/governance/imhotep-anubis-full-activation.test.ts` :
  - `anubis/manifest.ts` exporte capability `broadcastMessage`
  - 10 nouveaux Intent kinds présents
  - SLOs déclarés
  - Glory tools `ad-copy-generator`, `audience-targeter`, `broadcast-scheduler` présents
  - Manifest core importe `anubis/manifest.ts`
  - Provider façades retournent `DEFERRED_AWAITING_CREDENTIALS` quand `ExternalConnector.status !== ACTIVE`
- Migration Prisma : `prisma migrate status` clean

## Liens

- [ADR-0011](0011-neter-anubis-comms.md) — pré-réserve initiale (mythologie conservée)
- [ADR-0018](0018-anubis-partial-pre-reserve-oracle-only.md) — Superseded by this ADR
- [ADR-0019](0019-imhotep-full-activation.md) — Imhotep activation jumelle Phase 14
- [ADR-0021](0021-external-credentials-vault.md) — pattern Credentials Vault back-office
- [PANTHEON.md](../PANTHEON.md) — statut Anubis "actif", panthéon **7 actifs**
- `src/server/services/anubis/` — implémentation Phase 15
