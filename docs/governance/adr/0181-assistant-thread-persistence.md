# ADR-0181 — Persistance du chat Assistant (`AssistantThread` / `AssistantMessage`)

- **Status** : Accepted
- **Date** : 2026-07-26
- **Phase** : Chantier « Conseil de marque + chat Assistant + MCP réel » — WP2
- **Depends on** : ADR-0166 (ownership guard), ADR-0179 (surface streaming)
- **Supersedes** : —

## Contexte

Le chat cockpit « Assistant » n'avait **aucune persistance** : l'historique vivait
dans un `useState` React, effacé à chaque navigation/refresh. L'en-tête du module
Mestor (`mestor/index.ts`) promettait pourtant « REQ-1 Conversations (threads,
40 messages history) » — mensonge structurel.

Audit anti-doublon (grep CODE-MAP + `prisma/schema.prisma`, 2026-07-26) : les
modèles `Conversation`/`Message` existants sont l'**inbox SOCIALE** user↔user
(channels `INSTAGRAM|FACEBOOK|WHATSAPP|…`, `participants` Json, `unreadCount`) —
cycle de vie et scoping totalement différents d'un dialogue founder↔IA. Les
réutiliser mélangerait deux domaines. Décision : deux modèles NEUFS, additifs.

## Décision

### 1. Deux modèles additifs

```prisma
model AssistantThread {
  id String @id @default(cuid())
  strategyId String   // String indexée sans FK (même style que Conversation.strategyId)
  userId String
  title String?
  messages AssistantMessage[]
  @@index([strategyId, userId])
}
model AssistantMessage {
  id String @id @default(cuid())
  threadId String
  role String        // "user" | "assistant"
  content String @db.Text
  thread AssistantThread @relation(..., onDelete: Cascade)
  @@index([threadId, createdAt])
}
```

Migration `20260726103000_assistant_thread` — additive pure, backfill-safe par
construction (aucune donnée existante). v1 : **mono-thread par (strategyId, userId)**.

### 2. Écriture hors-Intent (advisory)

Le chat est un échange advisory, PAS une mutation métier de marque : il n'écrit
aucun pilier, aucun asset. Sa persistance passe donc **directement par la route**
`/api/chat` (best-effort, après la fin du flux) — pas par `emitIntent`. La lecture
(`assistantHistory`) et le clear (`assistantClear`) sont des procédures tRPC en
`strategyScopedProcedure` (ownership ADR-0166 enforcé) ; le clear est `audited`.

### 3. Historique côté serveur (anti-forgeage)

L'historique (40 derniers messages) est chargé PAR LE SERVEUR à chaque tour — le
client n'envoie plus que le message courant. Un client ne peut plus injecter un
faux historique dans le prompt.

## Conséquences

- Réalise enfin REQ-1 (threads + historique).
- La procédure morte `mestorRouter.chat` (LEGACY_MESTOR_ROUTER_CHAT, inerte) est
  déposée (kind gardé au catalogue — historique d'émissions).
- Tests : `assistant-chat-honest.test.ts` (historique serveur, persistance).
- Cap APOGEE 7/7 préservé. Anticipe le rename Mestor→Sia (R1) : tout le nouveau
  code vit sous `mestor/` ; zéro chaîne client « Mestor » (persona « Assistant »).
