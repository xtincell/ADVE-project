# API Contracts

> Two surfaces: **tRPC** (100 routers under [src/server/trpc/routers/](../../src/server/trpc/routers/)) and **REST** (19 route groups under [src/app/api/](../../src/app/api/)).
> Authoritative drill-down: [ROUTER-MAP.md](../governance/ROUTER-MAP.md) and [INTENT-CATALOG.md](../governance/INTENT-CATALOG.md).

---

## 1. tRPC — primary surface

**Stack**: `@trpc/server@11`, `@trpc/next@11`, `@trpc/react-query@11`, `superjson` serialization, Zod input validation.

| Concept | Where |
|---|---|
| Root router | [src/server/trpc/router.ts](../../src/server/trpc/router.ts) |
| Context (session, db, operatorId) | [src/server/trpc/context.ts](../../src/server/trpc/context.ts) |
| Procedure factories | [src/server/trpc/init.ts](../../src/server/trpc/init.ts) |
| Middleware (auth, audit, governance) | [src/server/trpc/middleware/](../../src/server/trpc/middleware/) |
| Routers | [src/server/trpc/routers/](../../src/server/trpc/routers/) (80 files) |
| HTTP transport | [src/app/api/trpc/](../../src/app/api/trpc/) |
| Client wiring (React) | [src/lib/trpc/](../../src/lib/trpc/) + [src/app/providers.tsx](../../src/app/providers.tsx) |

### 1.1 — Procedure types (governance ladder)

| Type | Purpose | Effect |
|---|---|---|
| `publicProcedure` | Pre-auth (rare — landing, public widgets) | No session required |
| `protectedProcedure` | Auth required | Adds session to ctx |
| `operatorProcedure` | Auth + operator scope | Adds `operatorId` to ctx, runs through `tenantScopedDb` |
| `auditedProcedure(scope)` | **Strangler pattern** ([ADR-0004](../governance/adr/0004-strangler-audited-procedure.md)) | Logs every call to `AuditLog`. Used during migration to `governedProcedure`. |
| `governedProcedure(intentKind)` | **Final form** — routes through `mestor.emitIntent()` | Hash-chained, cost-gated, NSP-streamed, replayable. Cf. [governed-procedure.ts](../../src/server/governance/governed-procedure.ts). |
| `adminProcedure` | Admin role required | Operator + role check |

Migration status (from [ROUTER-MAP.md](../governance/ROUTER-MAP.md)):

- **6 routers governed** out of 80 (8.5%) at last audit.
- Target Phase 3: **100% of mutations** through `mestor.emitIntent`.
- Migration waves prioritized in [REFONTE-PLAN.md](../governance/REFONTE-PLAN.md) — `pillar.ts` and `strategy.ts` first (the two biggest bypass surfaces).

### 1.2 — Router inventory by sub-system

Counts and statuses below come from [ROUTER-MAP.md](../governance/ROUTER-MAP.md); see that file for the cell-by-cell governance status. Recent additions not yet in ROUTER-MAP (visible in `src/server/trpc/routers/`): `oracle.ts`, `phase18-residuals.ts`, `monetization.ts`, `morning-batch.ts`, `source-classifier.ts`, `governance.ts`, `market-study-ingestion.ts`, `brand-node.ts`, `anubis.ts`, `imhotep.ts`, `ptah.ts`, `operator-action.ts`, `campaign-change-request.ts`, `campaign-deliverable.ts`, `campaign-tracker.ts`, `deliverable-orchestrator.ts`.

| Sub-system | Tier | Count | Examples |
|---|---|---|---|
| Propulsion | M | 13+ | `glory`, `campaign`, `campaign-manager`, `mission`, `notoria`, `sequence-vault`, `deliverable-orchestrator` |
| Guidance | M | 11+ | `mestor-router`, `pillar`, `strategy`, `strategy-presentation`, `oracle`, `framework`, `guidelines`, `boot-sequence`, `brand-vault`, `brand-node`, `campaign-tracker` |
| Telemetry | M | 14+ | `seshat-search`, `jehuty`, `signal`, `attribution-router`, `analytics`, `cult-index`, `devotion-ladder`, `superfan`, `ambassador`, `advertis-scorer`, `knowledge-graph`, `market-intelligence`, `error-vault` |
| Sustainment | M | 5+ | `process`, `staleness`, `quality-review`, `deliverable-tracking`, `connectors`, `monetization`, `morning-batch` |
| Operations | G | 11+ | `client`, `crm`, `contract`, `commission`, `payment`, `mobile-money`, `value-report`, `upsell`, `market-pricing`, `onboarding`, `brief-ingest` |
| Crew Programs | G | 11+ | `guilde`, `guild-tier`, `guild-org`, `club`, `event`, `membership`, `matching`, `learning`, `boutique`, `quick-intake`, `ingestion`, `imhotep` |
| Comms | G | 2+ | `messaging`, `notification`, `anubis` |
| Admin | G | 5+ | `auth`, `operator`, `system-config`, `translation`, `cockpit-router`, `governance`, `phase18-residuals`, `operator-action` |
| **Total** | | **80** | — |

### 1.3 — Conventions

- **Input validation** — every mutation takes a Zod schema input. No raw `unknown`/`any` inputs.
- **Output type** — inferred from the procedure return; no manual generic typing on the consumer side.
- **Error codes** — `TRPCError({ code, message, cause })`. Server errors map to typed front-end variants in the client.
- **Tenant scoping** — `operatorProcedure` automatically applies `tenantScopedDb` (no manual `where: { operatorId }` needed).
- **Audit trail** — `auditedProcedure(scope)` writes to `AuditLog`. Mandatory for all current `bypass` mutations during the strangler phase.
- **Governance gate** — `governedProcedure(intentKind)` is the destination. It calls `mestor.emitIntent({ kind, payload })`, which:
  1. Validates the kind exists in the intent registry.
  2. Persists an `IntentEmission` row with hash chain.
  3. Calls Thot for cost gate (`VETO` / `DOWNGRADE` / `OK`).
  4. Dispatches to the service declared in the manifest as `acceptsIntents: [kind]`.
  5. Streams progress on NSP SSE.
  6. Persists post-conditions (`SUCCESS` / `FAILED` + cost USD).

---

## 2. REST surface (17 route groups)

REST routes live under [src/app/api/](../../src/app/api/). They handle:

- Things tRPC can't (webhooks, streaming/SSE, file uploads, external callbacks).
- Public surfaces that don't need a client SDK.
- Browser-native APIs (`EventSource`, Web Push).

| Route group | Purpose | Notes |
|---|---|---|
| [`api/admin/metrics/`](../../src/app/api/admin/metrics/) | Admin Prometheus-style metrics | Auth: admin role |
| [`api/auth/[...nextauth]/`](../../src/app/api/auth/) | NextAuth v5 handler | Sign-in/out, callbacks, JWT |
| [`api/chat/`](../../src/app/api/chat/) | LLM chat streaming | Server-Sent Events |
| [`api/collab/`](../../src/app/api/collab/) | Collaborative doc operational transforms | Used by `useCollabDoc` hook |
| [`api/cron/`](../../src/app/api/cron/) | Vercel cron entrypoints | Mission drift, staleness propagation, morning batch, etc. |
| [`api/export/`](../../src/app/api/export/) | PDF/Excel export (jspdf, xlsx, mammoth, html2canvas, pdf-parse) | Used by Oracle PDF snapshot ([ADR-0016](../governance/adr/0016-oracle-pdf-auto-snapshot.md)) |
| [`api/intake/[token]/`](../../src/app/api/intake/) | Public token-scoped intake submit | No auth — token in URL is the credential |
| [`api/integrations/`](../../src/app/api/integrations/) | External integration callbacks | OAuth redirects, etc. |
| [`api/mcp/`](../../src/app/api/mcp/) | **Aggregated MCP server** exposed to Claude Desktop, Cursor, etc. | [ADR-0026](../governance/adr/0026-mcp-bidirectional-anubis.md). API key = `McpApiKey` model |
| [`api/notifications/`](../../src/app/api/notifications/) | Notification feed + SSE bridge | Phase 16 |
| [`api/nsp/`](../../src/app/api/nsp/) | **NSP SSE** — `GET ?intentId=<id>&since=<iso>` | Heartbeat 15s. Replay from `IntentEmissionEvent` |
| [`api/payment/`](../../src/app/api/payment/) | Stripe + mobile-money webhooks | Idempotent webhook handling |
| [`api/ptah/`](../../src/app/api/ptah/) | **Ptah forge webhooks** (Magnific async callback, Adobe Firefly, …) | Signed webhook verify per provider |
| [`api/push/`](../../src/app/api/push/) | Web Push subscribe + send (VAPID/FCM) | Phase 16, [ADR-0025](../governance/adr/0025-notification-real-time-stack.md) |
| [`api/trpc/`](../../src/app/api/trpc/) | tRPC HTTP transport | next-trpc adapter |
| [`api/webhooks/`](../../src/app/api/webhooks/) | Generic inbound webhook router | Wired via `WebhookConfig` model + Anubis MCP inbound |
| [`api/widget/`](../../src/app/api/widget/) | Embeddable widget endpoints | Public, CORS-scoped |

---

## 3. Intent kinds (the real public API)

Beyond tRPC routers, the **stable contract** between client and server is the **Intent kind registry** in [src/server/governance/intent-kinds.ts](../../src/server/governance/intent-kinds.ts).

Each Intent kind has:

- A unique `kind` string (`PROMOTE_SEQUENCE_LIFECYCLE`, `ASSEMBLE_ORACLE`, `GENERATE_ORACLE_SECTION`, `COMPOSE_DELIVERABLE`, `OPERATOR_AMEND_PILLAR`, `ANUBIS_OAUTH_DEVICE_FLOW_START`, etc.).
- A Zod input schema.
- An owning manifest (`acceptsIntents`) — exactly one service per kind.
- An SLO (target latency, target cost).
- A version (`intent-versions.ts`).

Catalogue: [INTENT-CATALOG.md](../governance/INTENT-CATALOG.md) (961 lines, auto-generated).

**Lifecycle** — `PROPOSED → DELIBERATED → DISPATCHED → EXECUTING → OBSERVED → COMPLETED` (or `FAILED` / `VETOED` / `DOWNGRADED`). All states streamed via NSP.

**Versioning** — when an Intent payload changes shape, bump its version in `intent-versions.ts`. Old emissions are replayable with their original payload schema.

---

## 4. NSP — Server-Sent Events

| Detail | Value |
|---|---|
| Endpoint | `GET /api/nsp?intentId=<id>&since=<iso-timestamp>` |
| Auth | Bearer token (NextAuth session) OR `McpApiKey` |
| Content | `text/event-stream`, one event per intent state transition |
| Heartbeat | 15 seconds (defeats reverse-proxy idle buffering) |
| Fallback | EventSource → long-poll for flaky mobile networks |
| Replay | `since=<iso>` re-reads `IntentEmissionEvent` rows from that timestamp |
| Phase 16 sub-kinds (Oracle) | `oracle_section_started/completed/failed`, `oracle_assembler_started/progress/done` ([ADR-0072](../governance/adr/0072-oracle-progress-streaming.md)) |
| Client hooks | [`useNeteru(intentId)`](../../src/hooks/use-neteru.ts), [`useNsp()`](../../src/hooks/use-nsp.ts), [`useOracleStream(strategyId)`](../../src/hooks/use-oracle-stream.ts) |

---

## 5. MCP — bidirectional

**Outbound** (server, `/api/mcp`): La Fusée exposes its capabilities as an MCP server consumed by Claude Desktop, Cursor, etc. Auth via `McpApiKey` model. ToolInvocations logged in `McpToolInvocation`. See [src/server/mcp/](../../src/server/mcp/).

**Inbound** (client): La Fusée consumes external MCP servers (Slack, Notion, Drive, Calendar, Figma, GitHub, Higgsfield, …) via the **Credentials Vault** ([ADR-0021](../governance/adr/0021-external-credentials-vault.md)) + OAuth 2.1 device flow ([ADR-0048](../governance/adr/0048-glory-tools-as-primary-api-surface.md)). Refresh tokens handled transparently in [mcp-client.ts](../../src/server/services/anubis/mcp-client.ts).

Registry: `McpRegistry` (per-tool) + `McpServerConfig` (per-server). Per-tool invocations tracked in `McpToolInvocation`.

---

## 6. Auth model

| Layer | Mechanism |
|---|---|
| Web sessions | NextAuth v5 JWT sessions, Prisma adapter |
| Server-to-server (MCP outbound) | `McpApiKey` model — per-operator API keys |
| External OAuth (ad networks, MCP inbound) | `ExternalConnector` model — per-operator OAuth tokens with refresh |
| Webhooks (Stripe, Magnific, mobile-money) | Per-provider HMAC signature verification |
| MFA | TOTP via `MfaSecret` model |
| Tenant scoping | `tenantScopedDb` auto-injects `where: { operatorId }` on all CRUD |
| Default-deny | Any model not in `GLOBAL_TABLES` requires `operatorId` (compile-time enforced + runtime guarded) |
