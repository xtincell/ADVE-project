# ADR-0031 — Feed Signal → Notification bridge (Anubis feed-bridge)

**Date** : 2026-05-03
**Statut** : Accepted
**Phase** : 16 (extension ADR-0025)
**Auteur direction** : opérateur (user)

## Contexte

Phase 16 (ADR-0025) a livré la stack notification temps-réel : `Notification` model + NSP broker SSE + bell UI + dropdown + Web Push + digest scheduler + quiet hours. Stack techniquement saine.

Diagnostic NEFER 2026-05-03 : la stack est **branchée à du vide**. `grep "anubis.pushNotification" src/` retourne **un seul hit**, dans `notification.testPush` (admin manual test). Aucun service métier n'alimente la cloche.

Conséquences en prod :

1. **Notoria** termine un `generateBatch()` → écrit un `Signal` type `NOTORIA_BATCH_READY` direct en DB ([src/server/services/notoria/engine.ts:521](../../src/server/services/notoria/engine.ts:521)) → mais aucune `Notification` row n'est créée. Le founder ne sait pas que ses 12 recos sont prêtes.
2. **Tarsis** détecte un weak signal urgency HIGH/CRITICAL → écrit un `Signal` type `WEAK_SIGNAL_ALERT` ([src/server/services/seshat/tarsis/weak-signal-analyzer.ts:152](../../src/server/services/seshat/tarsis/weak-signal-analyzer.ts:152)) → la cloche reste muette même quand un événement marché menace la marque.
3. **Jehuty** est un service de lecture pure — il agrège `Signal` + `Reco` + `Diagnostic` en `JehutyFeedItem` pour `/cockpit/brand/jehuty`. Il ne peut pas être le point de hook puisqu'il ne reçoit aucun event d'écriture. Le hook doit se faire au moment de la production des signaux, en amont du feed.

Drift typique post-Phase : feature shipped, consumers absents.

## Décision

**Pont centralisé `notifyOnFeedSignal()`** dans `src/server/services/anubis/feed-bridge.ts`, branché sur les producteurs de Signal qui alimentent le feed Jehuty. Le pont est un **wrapper non-bloquant** par-dessus `anubis.pushNotification()` qui :

1. **Filtre** par type de signal (whitelist `FEED_SIGNAL_TYPES` : `WEAK_SIGNAL_ALERT`, `MARKET_SIGNAL`, `NOTORIA_BATCH_READY`, `STRONG`, `WEAK`, `METRIC`, `SCORE_IMPROVEMENT`, `SCORE_DECLINE`).
2. **Mappe priorité** automatiquement par type (`WEAK_SIGNAL_ALERT → HIGH`, `NOTORIA_BATCH_READY → NORMAL`, `SCORE_DECLINE → HIGH`, etc.). Override `priority` paramétrable pour les cas critiques (Tarsis CRITICAL).
3. **Résout les destinataires** depuis `Strategy.userId` (le founder owner). MVP intentionnellement minimal — voir §Étapes futures.
4. **Push via `anubis.pushNotification()`** qui gère lui-même quiet hours, NotificationPreference, NSP publish (real-time SSE), et Web Push (deferred si pas de creds VAPID).
5. **Swallow errors** — la création du Signal upstream ne doit jamais casser parce que la notif foire.

## Surfaces touchées (cette PR)

| Site producer | Avant | Après |
|---|---|---|
| `notoria/engine.ts:521` (NOTORIA_BATCH_READY) | `db.signal.create()` puis silence | `db.signal.create()` + `notifyOnFeedSignal()` avec link `/cockpit/notoria?batch=<id>` |
| `seshat/tarsis/weak-signal-analyzer.ts:152` (WEAK_SIGNAL_ALERT urgency HIGH/CRITICAL) | `db.signal.create()` puis silence | `db.signal.create()` + `notifyOnFeedSignal()` × `[strategyId, ...affectedStrategyIds]` (cross-brand spread propagé) |

## Décisions explicitement rejetées

- **Brancher au router Jehuty** (`feed` query) — rejeté : Jehuty est lecture pure, le moment où un signal "arrive" pour le user n'est pas une query, c'est l'écriture upstream. Hook au mauvais endroit = invariant brisé.
- **Émettre un Intent `ANUBIS_PUSH_NOTIFICATION` via `mestor.emitIntent()` à chaque Signal** — rejeté : surcharge governance pour un side-effect informatif. La notification suit le Signal, elle ne décide rien. `pushNotification()` reste un side-effect documenté dans le manifest Anubis (`sideEffects: ["DB_WRITE", "EXTERNAL_API", "EVENT_EMIT"]`) appelé en façade locale, comme `notification.testPush` le fait déjà.
- **Notifier tous les Memberships du tenant** (UPgraders Console + founder) — reporté : MVP veut valider la boucle bell → click → page sur le founder en premier. Si UPgraders veulent leur cloche aussi, étendre `recipients` dans `feed-bridge.ts` (1 ligne, requête `Membership` par `tenantId`).
- **Brancher tous les 16 sites `db.signal.create()`** — partiel : seuls les sites où le signal est destiné à apparaître dans le feed Jehuty et a un destinataire user identifiable sont branchés cette PR. Les autres (`pr.ts`, `mission.ts`, `media-buying.ts`, `quick-intake.ts`) sont des signaux internes ou liés à des entités sans user direct — étendre au cas par cas selon valeur produit.

## Conséquences

**Positif** :
- Cloche topbar enfin vivante en prod : compteur unread monte sur events Notoria + Tarsis weak signals critiques.
- Cross-brand propagation : un weak signal Tarsis qui affecte 5 brands déclenche 5 notifs (founder de chaque brand affectée).
- NSP SSE event publié → bell UI invalide automatiquement `unreadCount` + `list` queries via `EventSource` listener.
- Quiet hours respectées : un user en mode "ne pas déranger" voit la notif persistée en DB mais pas de push poussé.

**Négatif / dette** :
- UPgraders Console pas notifiés (TODO étendre `recipients`).
- Pas de digest cadencé sur ces signaux : si Notoria génère 5 batches dans la journée → 5 notifs séparées. À reconsidérer si bruit signalé (re-router vers `anubis.runDigest()` daily).
- Si `Strategy.userId` pointe vers un user inactif/supprimé, la notif part dans le vide silencieux.

**Tests anti-drift** :
- Aucun nouveau Neter, aucun nouveau model Prisma, aucune nouvelle entité métier.
- Pas de nouvelle Capability (pas de modif manifest Anubis — `pushNotification` capability existante consommée en façade locale).
- Cap APOGEE 7/7 maintenu.

## Étapes futures

1. **UPgraders notifier** — query `Membership` par `tenantId` pour étendre `recipients`. Granularité par rôle (admin/operator/viewer) si besoin.
2. **Digest cadencé** — si volume Notoria dépasse 1 batch/jour/strategy, re-router vers digest scheduler `anubis.runDigest()` qui groupe les `FEED_SIGNAL` non lus en un email quotidien.
3. **Branchement market-intelligence** — `signal-collector.ts:136` produit aussi des `MARKET_SIGNAL` → ajouter un appel `notifyOnFeedSignal()` (pattern identique).
4. **In-app deep-link** — actuellement `/cockpit/brand/jehuty?signal=<id>`. Évaluer s'il faut une route dédiée par type (ex: `/cockpit/notoria?batch=<id>` déjà fait pour Notoria) ou un router générique `/cockpit/feed/[signalId]`.

## Références

- ADR-0011 — Anubis pré-réservé Comms
- ADR-0020 — Anubis full activation Phase 15
- ADR-0025 — Notification real-time stack (SSE + Web Push + templates + digest)
- ADR-0026 — MCP bidirectionnel
- [src/server/services/anubis/feed-bridge.ts](../../src/server/services/anubis/feed-bridge.ts) — implémentation
- [src/server/services/notoria/engine.ts](../../src/server/services/notoria/engine.ts) — site #1
- [src/server/services/seshat/tarsis/weak-signal-analyzer.ts](../../src/server/services/seshat/tarsis/weak-signal-analyzer.ts) — site #2
