# ADR-0026 — MCP bidirectionnel sous Anubis

**Date** : 2026-05-02
**Statut** : Accepted
**Phase** : 16 (post Phase 15 Anubis full activation, ADR-0020 + ADR-0021)
**Auteur direction** : opérateur (user)

## Contexte

Le repo contient depuis V5 une infrastructure MCP partielle : 10 sous-dossiers `src/server/mcp/{advertis-inbound, artemis, creative, guild, intelligence, notoria, operations, ptah, pulse, seshat}` exposant chacun des `ToolDefinition[]` typés Zod (~4500 LoC distribuées), et le SDK `@modelcontextprotocol/sdk@^1.5.0` est en deps.

**Trois trous structurels** :
1. **Endpoints API incomplets** : seuls 4 endpoints `/api/mcp/{advertis-inbound, guild, ptah, seshat}/route.ts` existaient. 6 serveurs (artemis, creative, intelligence, notoria, operations, pulse) étaient orphelins — pas de surface HTTP pour les appeler.
2. **Pas de manifest racine** : un client MCP externe (Claude Desktop, Claude Code, autres IDEs) ne pouvait pas découvrir l'ensemble des serveurs via un seul `GET /api/mcp`.
3. **Aucun MCP client** : aucun mécanisme pour que les Neteru consomment des MCP servers externes (Slack, Notion, Drive, Calendar, Figma, GitHub, etc.) — pourtant ces serveurs sont des canaux de comms clés pour la mission (recrutement superfan via Slack/Notion communities, distribution via Calendar/Drive).

CODE-MAP.md ne référençait pas MCP (entité non documentée). Pas d'ADR antérieur sur le sujet.

## Décision

**MCP est un canal de comms gouverné par Anubis** (Comms, Ground Tier #7 — ADR-0011 + ADR-0020). Anubis ajoute 3 capabilities et 3 Intent kinds pour absorber la couche bidirectionnelle :

- `ANUBIS_MCP_INVOKE_TOOL` — appel **sortant** (Anubis → MCP server externe). Crée un `McpToolInvocation`, lié à `IntentEmission.id` si appelé via `mestor.emitIntent`.
- `ANUBIS_MCP_SYNC_REGISTRY` — découverte des tools d'un MCP server externe enregistré (refresh du `toolsCache`).
- `ANUBIS_MCP_REGISTER_SERVER` — CRUD d'un `McpRegistry` (direction `INBOUND` consommé / `OUTBOUND` exposé).

### Schéma data

Deux nouveaux models Prisma :

```prisma
model McpRegistry {
  id            String   @id @default(cuid())
  operatorId    String
  direction     String   // INBOUND | OUTBOUND
  serverName    String   // ex: "slack", "notion", "drive"
  endpoint      String?  // null si OUTBOUND
  credentialRef String?  // ExternalConnector.id
  toolsCache    Json     // dernière liste tools découverte
  status        String   @default("INACTIVE")
  lastSyncAt    DateTime?
  // ...
  @@unique([operatorId, direction, serverName])
}

model McpToolInvocation {
  id           String      @id @default(cuid())
  registryId   String
  registry     McpRegistry @relation(...)
  toolName     String
  inputs       Json
  output       Json?
  status       String      // PENDING|OK|FAILED|DEFERRED_AWAITING_CREDENTIALS
  costUsd      Decimal?
  durationMs   Int?
  intentId     String?     // lien IntentEmission
  errorMessage String?
  // ...
}
```

### Surfaces API

- **Serveurs sortants** (couche transport HTTP) :
  - `/api/mcp/{server}/route.ts` × 10 (les 6 manquants ajoutés à pattern identique).
  - `/api/mcp/route.ts` racine — `GET` retourne `McpAggregatedManifest`, `POST { server, tool, params }` dispatcher unifié.
  - Auth : ADMIN-only sur POST (`mcpGate` helper réutilisable). GET demande seulement une session valide pour permettre la découverte tools sans privilège exécution.

- **Client entrant** : `src/server/services/anubis/mcp-client.ts` — `invokeExternalTool / syncRegistry / registerServer`. Transport HTTP fallback (`POST {endpoint}/tools/invoke`) — le SDK officiel sera branché en PR ultérieure si stdio/SSE-MCP est nécessaire.

### Credentials Vault — pattern transverse (ADR-0021)

Les credentials des MCP servers entrants se stockent dans `ExternalConnector` avec `connectorType="mcp:<serverName>"`. Si absents → handler retourne `DEFERRED_AWAITING_CREDENTIALS` avec `configureUrl` vers `/console/anubis/credentials`. Le code reste ship-able sans clés.

### UI back-office

`/console/anubis/mcp` avec 3 onglets :
- **Inbound** : register/sync/invoke + log invocations.
- **Outbound** : manifest agrégé read-only + snippet config Claude Desktop copy-to-clipboard.
- **Templates** : CRUD `NotificationTemplate` (couplage avec ADR-0025).

## Conséquences

✅ Le repo expose un endpoint unifié `/api/mcp` consommable par tout client MCP (Claude Desktop, etc.).
✅ Les Neteru peuvent invoquer Slack/Notion/Drive/Calendar/Figma/GitHub via un seul flow gouverné (Mestor → ANUBIS_MCP_INVOKE_TOOL → Anubis client → external).
✅ Pattern Credentials Vault réutilisé sans duplication.
✅ Pas de 8ème Neter — cap APOGEE 7/7 maintenu (NEFER §3 interdit absolu).
✅ Audit replay possible : chaque invocation MCP entrante a un `McpToolInvocation` + lien `intentId`.

⚠️ Rate limiting MCP outbound non implémenté Phase 16 — RESIDUAL-DEBT. La surface ADMIN-only limite le risque immédiat.
⚠️ Pas de validation Zod côté client externe lors de l'invocation entrante (le SDK MCP runtime peut le faire — branché en PR future si nécessaire).
⚠️ La liste `MCP_SERVER_NAMES` est statique dans `mcp-server.ts`. Ajout d'un nouveau Neter MCP server impose une PR explicite (volontaire — pas de chargement dynamique pour préserver la traçabilité Phase 5 audits).

## Alternatives rejetées

- **Nouveau Neter MCP** — viole NEFER §3 (cap APOGEE 7/7). Le besoin est un canal, pas un domaine business indépendant.
- **MCP via Mestor directement** — disrupte le rôle de Mestor (dispatcher, pas executeur). Anubis reste l'aiguilleur des comms entrantes/sortantes.
- **MCP comme plugin sandboxé (ADR-0008)** — viable mais ajoute une couche d'abstraction ; les MCP servers du repo sont contrôlés (pas tiers untrusted), le sandbox ADR-0008 reste pertinent pour des plugins futurs externes.

## Références

- ADR-0011 — Neter Anubis Comms (pré-réserve)
- ADR-0020 — Anubis full activation
- ADR-0021 — External Credentials Vault
- ADR-0025 — Notification real-time stack (couplé)
- `src/server/services/anubis/mcp-server.ts` (sortant)
- `src/server/services/anubis/mcp-client.ts` (entrant)
- `src/app/api/mcp/route.ts` (manifest racine)
- `src/app/(console)/console/anubis/mcp/page.tsx` (UI)
