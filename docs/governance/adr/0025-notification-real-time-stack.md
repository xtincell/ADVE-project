# ADR-0025 — Notification real-time stack (SSE + Web Push + templates + digest)

**Date** : 2026-05-02
**Statut** : Accepted
**Phase** : 16
**Auteur direction** : opérateur (user)

## Contexte

Phase 15 (ADR-0020) a livré Anubis full activation : broadcast multi-canal email/SMS/ad networks, Notification model persistant, NotificationPreference. Mais 4 trous subsistaient :

1. **Aucune UI bell / dropdown** dans le header — `src/components/neteru/notification-*.tsx` n'existaient pas. Les notifications dormaient en DB sans surface d'accès.
2. **Aucun real-time** — `notification.list` est en query/polling. Les BroadcastJob/IntentEmissionEvent persistent les events mais pas de transport SSE/WebSocket vers le client.
3. **Aucun Web Push** — `NotificationChannel.PUSH` enum existait mais aucune subscription model, aucun Service Worker push handler, aucune façade VAPID.
4. **`NotificationPreference.quiet` et `digestFrequency` jamais consommés** — pas de scheduler digest, pas de gating quiet hours.

`IntentEmissionEvent` (Prisma) servait de model persistant pour le streaming async — mais sans utilitaires runtime pour pousser vers le client.

## Décision

**Stack notification temps-réel à 4 dimensions, gouvernée par Anubis** :

### 1. NSP — Neteru Streaming Protocol (couche transport)

Nouveau service utilitaire `src/server/services/nsp/` (pas de manifest — couche infrastructure pure) :

- `sse-broker.ts` : pubsub in-memory keyed par `userId`. API `subscribe(userId, listener) → unsubscribe` + `publish(userId, event)`.
- `event-types.ts` : union `NspEvent = NotificationEvent | IntentProgressEvent | McpInvocationEvent`.

**Ship single-instance** (Vercel serverless ou Node.js cluster). Pour multi-instance : remplacer `listeners` par Redis pubsub via le même contrat (`publish/subscribe`). Pas implémenté Phase 16 — RESIDUAL-DEBT si scale horizontal devient nécessaire.

### 2. SSE endpoint

`src/app/api/notifications/stream/route.ts` :
- Runtime `nodejs` (longue durée), `maxDuration: 300`.
- `GET` authentifié → `ReadableStream` qui branche un listener NSP, encode `event: <kind>\ndata: <json>\n\n`.
- Heartbeat `: heartbeat\n\n` toutes les 25s pour traverser les proxies.
- Cleanup sur `request.signal.abort`.

### 3. Web Push (VAPID + FCM)

- Nouveau model Prisma `PushSubscription { id, userId, endpoint UNIQUE, p256dh, auth, userAgent, isActive }`.
- Provider façade `src/server/services/anubis/providers/web-push.ts` — lit `ExternalConnector connectorType="vapid"` (pattern ADR-0021), retourne `DEFERRED_AWAITING_CREDENTIALS` si non configuré. Wrappe `web-push` npm.
- Provider façade `src/server/services/anubis/providers/fcm.ts` — mobile, Firebase Cloud Messaging, idem pattern.
- `public/sw.js` étendu avec listeners `push` + `notificationclick` (ne casse pas la stratégie cache existante).
- Endpoint `/api/push/vapid-key` GET → expose la clé pub VAPID au client pour `pushManager.subscribe`.
- Provider client `src/components/providers/push-provider.tsx` — `usePush()` hook avec `state` (`idle|registering|subscribed|denied|unsupported`) + `requestPushPermission/unsubscribe`.

### 4. Templates engine + digest scheduler

- Nouveau model `NotificationTemplate { slug UNIQUE, channel, subject?, bodyHbs, bodyMjml?, variables, category }`.
- `src/server/services/anubis/templates.ts` — `renderTemplate(slug, vars)` :
  - Compile Handlebars (subset minimal — pas de helpers Turing-complet, anti-XSS).
  - Compile MJML→HTML pour body email si présent.
  - Retourne `{ subject?, html?, text }`.
- `src/server/services/anubis/digest-scheduler.ts` — `runDigest(frequency)` :
  - Lit `NotificationPreference` filtré par `digestFrequency`.
  - Groupe les notifications IN_APP non-lues du user dans la fenêtre temporelle.
  - Render template `notification-digest`, envoi email via provider mailgun (existant).
  - Plug ultérieur : cron `0 8 * * *` (DAILY) + `0 8 * * 1` (WEEKLY) — à câbler dans `process-scheduler` Phase 16.1.

### 5. Anubis capabilities

7 nouvelles Intent kinds gouvernés ANUBIS (cf. ADR-0026 pour les 3 MCP) :

```ts
ANUBIS_PUSH_NOTIFICATION          // p95 500ms — fan-out unifié
ANUBIS_REGISTER_PUSH_SUBSCRIPTION // p95 500ms — CRUD PushSubscription
ANUBIS_RENDER_TEMPLATE            // p95 200ms — pure compute
ANUBIS_RUN_DIGEST                 // p95 60s, async — cron daily/weekly
```

(les 3 autres : `ANUBIS_MCP_INVOKE_TOOL`, `ANUBIS_MCP_SYNC_REGISTRY`, `ANUBIS_MCP_REGISTER_SERVER` — ADR-0026.)

### 6. UI

- `<NotificationBell />` dans `src/components/neteru/` — branche `EventSource("/api/notifications/stream")`, badge unread live, dropdown sur click.
- `<NotificationCenter />` — variants priority via CVA (DS Tier 3 tokens `--priority-{low,normal,high,critical}`), filtres Tous/Non lus/Mentions/Système.
- Intégré dans `src/components/navigation/topbar.tsx` (4 portails — le Topbar est partagé via `app-shell`).
- Page back-office `/console/anubis/notifications` — preferences UI (channels, quiet hours, digest, push subs).

## Conséquences

✅ Le user voit en temps-réel les notifications poussées par les Neteru (Mestor intent progress, Anubis broadcast delivery, etc.).
✅ Le user peut choisir quels canaux reçoivent quoi, et bloquer pendant ses heures silencieuses (sauf CRITICAL).
✅ Web Push fonctionne hors-app via le Service Worker existant — bonus offline-first.
✅ Templates centralisés dans Prisma — diff trackable, multi-tenant via `operatorId`, helpers escape par défaut.
✅ Pattern Credentials Vault (ADR-0021) réutilisé pour VAPID + FCM — code ship-able sans clés.
✅ Pas de WebSocket — on reste sur HTTP/1.1 + SSE simple, cohérent avec serverless edge.

⚠️ NSP single-instance (RESIDUAL-DEBT — Redis pubsub si scale horizontal nécessaire).
⚠️ Digest scheduler pas câblé sur cron Phase 16 — manuel pour l'instant via mutation `runDigest` (TODO Phase 16.1).
⚠️ EMAIL/SMS via NotificationChannel ne sont pas envoyés directement par `pushNotification` — délégué au flow broadcast existant (CommsPlan + BroadcastJob). Documenté via `deferred: ["email:via_broadcast_flow"]`.

## Alternatives rejetées

- **WebSocket dédié** — overkill pour push notifications uni-directionnelles ; plus complexe à serverless-déployer.
- **Polling** — UX dégradée, charge DB inutile.
- **Stockage des subscriptions VAPID dans `User`** — viole single-responsibility ; un user peut avoir plusieurs devices.
- **Templates en `src/templates/*.hbs`** (filesystem) — moins flexible (pas de CRUD UI, pas de multi-tenant).

## Références

- ADR-0020 — Anubis full activation
- ADR-0021 — External Credentials Vault
- ADR-0026 — MCP bidirectional (couplé)
- `src/server/services/nsp/` (broker SSE)
- `src/app/api/notifications/stream/route.ts` (SSE endpoint)
- `src/server/services/anubis/{notifications,templates,digest-scheduler}.ts`
- `src/components/neteru/notification-{bell,center}.tsx`
- `public/sw.js` (Service Worker push handler)
