# ADR-0155 — Canal de remontée feedback / bug des testeurs

- **Statut** : Accepted
- **Date** : 2026-07-15
- **Gouverneur** : INFRASTRUCTURE (Console/Admin)
- **Cap APOGEE** : 7/7 — 0 LLM, 1 modèle additif

## Contexte

Le produit passe en test avec de vrais testeurs. L'opérateur veut qu'ils puissent
**remonter un bug / un retour** depuis l'app, et **lire ces remontées** dans une
inbox propre côté console. Audit : **rien n'existe** (0 bouton, 0 modèle, 0 inbox
— tous les `feedback` du repo sont d'autres concepts : QC créateur, boucle
stratégie mensuelle, états RAG).

## Décision

Un canal dédié, minimal, gouverné.

### Anti-doublon (grep-négatif + justification)

`grep ^model.*Feedback` négatif. Réutilisations écartées, justifiées :
- **`InterventionRequest`** (type/priorité/statut/résolution) est **interne
  opérateur** (interventions Artemis/Fusée) — y router des remontées de testeurs
  mélangerait deux flux et deux surfaces console.
- **`Conversation`/`Message`** (messagerie interne) : une remontée n'est pas une
  conversation ; polluerait l'inbox de messagerie.
- **`CrmContact`/`CrmMessage`** : orienté prospection commerciale, pas support.

→ **1 modèle dédié `Feedback`** (testeur-facing, capture page/contexte, cycle de
tri propre NEW→TRIAGED→RESOLVED). On **réutilise `Notification`** pour alerter les
admins d'une nouvelle remontée (pas de nouveau canal de notif).

### Modèle `Feedback` (additif)

`id · userId? · operatorId? · email? · kind(BUG|IDEA|OTHER) · message · pageUrl? ·
userAgent? · status(NEW|TRIAGED|RESOLVED) · resolvedBy? · resolvedAt? · createdAt`.
Index `[status, createdAt]`. `pageUrl`/`userAgent` capturés côté client pour
situer le bug ; PII minimale (email optionnel, saisi par le testeur).

### 2 kinds gouvernés (governor INFRASTRUCTURE)

- `SUBMIT_FEEDBACK` (sync, **sans `requireOperator`**) — un testeur **connecté**
  (cockpit/crew) est l'acteur. Persiste + `Notification` best-effort aux admins.
- `TRIAGE_FEEDBACK` (sync, **`requireOperator`**) — l'opérateur change le statut
  (TRIAGED/RESOLVED) depuis l'inbox.

Intents directs sans Glory tool : primitives de persistance/statut d'un item de
support, pas de production d'asset (NEFER §3.1). **Single-writer**
`services/infrastructure/feedback/index.ts`.

### Surfaces

- **Bouton flottant `<FeedbackButton/>`** monté une fois dans `AppShell` → tous
  les portails authentifiés (cockpit = les testeurs). Modal : `kind` + message ;
  `pageUrl`/`userAgent` auto. Vocabulaire client (pas de jargon interne).
- **Inbox `/console/socle/feedback`** (opérateur) : liste par statut, « Pris en
  compte » / « Résolu ». Badge de non-lus. Jamais exposée au client.

## Conséquences

- Les testeurs remontent un bug en 2 clics ; l'opérateur trie dans une inbox
  propre. 0 LLM. 1 migration additive. Cap APOGEE 7/7.
- PROPAGATION-MAP entrée A16 (feedback testeur → Feedback → inbox opérateur).
- Verrous : single-writer `Feedback` ; `SUBMIT_FEEDBACK` gouverné (kind catalogué).

## Déféré (RESIDUAL-DEBT)

- Capture d'écran / pièce jointe (upload) — post-MVP.
- Bouton feedback sur les surfaces **publiques** (non authentifiées) — nécessite
  une voie anonyme rate-limitée (comme `footprint.scoreInstant`).
