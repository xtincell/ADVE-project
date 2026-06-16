# Source Tree Analysis

> Source: live filesystem at 2026-05-13. Anchors are clickable.
> Heavyweight reference docs: [SERVICE-MAP.md](../governance/SERVICE-MAP.md) · [ROUTER-MAP.md](../governance/ROUTER-MAP.md) · [PAGE-MAP.md](../governance/PAGE-MAP.md) · [COMPONENT-MAP.md](../governance/COMPONENT-MAP.md) · [CODE-MAP.md](../governance/CODE-MAP.md).

---

## 1. Top-level layout

```
ADVE-project/
├── src/                          # Application source (1271 .ts/.tsx files)
│   ├── domain/                   # Layer 0 — pure types, enums, Zod
│   ├── lib/                      # Layer 1 — utilities, db, auth, design tokens
│   ├── server/                   # Layers 2-4
│   │   ├── governance/           # Layer 2 — Mestor, manifests, NSP, hash-chain, tenant-scoped-db
│   │   ├── services/             # Layer 3 — 101 services (Artemis, Ptah, Seshat, LLM gateway, ...)
│   │   ├── trpc/                 # Layer 4 — 100 routers
│   │   └── mcp/                  # Aggregated MCP server (ADR-0026)
│   ├── hooks/                    # Layer 5 — React hooks (useNeteru, useNsp, useOracleStream, ...)
│   ├── components/               # Layer 5 — Neteru UI kit + 6 deck-specific dirs
│   ├── app/                      # Layer 6 — Next.js App Router (231 pages)
│   ├── styles/                   # 4-tier token cascade CSS
│   └── proxy.ts                  # Edge middleware (Next.js)
├── prisma/                       # Schema + migrations + seeds (180 models, 65 enums, 37 migrations)
├── tests/                        # Vitest + Playwright (164 test files)
│   ├── unit/                     # Vitest unit
│   ├── integration/              # Vitest integration (includes LLM smoke)
│   ├── e2e/                      # Playwright end-to-end
│   ├── a11y/                     # Playwright a11y
│   ├── i18n/                     # Playwright i18n
│   └── visual/                   # Playwright visual + Chromatic
├── scripts/                      # 100+ tsx scripts (audits, codemods, seeds, generators)
├── docs/
│   ├── governance/               # Authoritative governance corpus (NEFER, APOGEE, PANTHEON, ADRs, ...)
│   │   └── adr/                  # 101 ADRs
│   ├── scan/                     # THIS onboarding pack (generated 2026-05-13)
│   └── context/                  # Deeper semantic context
├── .github/workflows/            # 11 CI workflows (ci, golden-path, governance-drift, mission-drift, ...)
├── _bmad/                        # BMAD skill installation
├── _bmad-output/                 # BMAD generated artifacts
├── eslint-plugin-lafusee/        # Custom ESLint rules
├── packages/                     # Local "packages" (not workspaces — flat subdirs)
├── plugins/                      # Optional plugin sandboxes (ADR-0008)
├── public/                       # Static assets
├── logs/                         # Local log output (gitignored typically)
├── preview/                      # Operator preview tooling (mobile-landing snapshots)
├── Customers/                    # Operator-facing client folders (sensitive)
├── Documentation/                # Operator documentation
├── package.json                  # Dependencies + 60+ scripts
├── next.config.ts                # Next.js + Turbopack config
├── prisma.config.ts              # Prisma 7 driver adapter wiring
├── tsconfig.json                 # Strict TypeScript 6
├── eslint.config.mjs             # eslint-plugin-boundaries + lafusee custom rules
├── vitest.config.ts              # Vitest 4
├── playwright.config.ts          # Playwright 1.59
├── commitlint.config.cjs         # Conventional commits
├── chromatic.config.json         # Chromatic visual regression
├── vercel.json                   # Vercel deployment config
├── CLAUDE.md                     # AGENT ACTIVATION CONTRACT — read first
├── README.md                     # Public-facing introduction
├── CHANGELOG.md                  # v6.27.2 latest
├── ARCHITECTURE-NETERU.md        # Legacy (links to governance/PANTHEON)
├── GOVERNANCE-NETERU.md          # Legacy
└── HANDOFF-PLAN.md               # Internal handoff notes
```

---

## 2. `src/` deep dive

### 2.1 — `src/domain/` (Layer 0 — pure)

```
src/domain/
├── brand-asset-kinds.ts          # BrandAsset.kind enum + helpers
├── brand-nature-archetypes.ts    # 9 BrandNature archetypes (Phase 18, ADR-0061)
├── campaign-code.ts              # Campaign code generation
├── classification-coherence.ts   # Devotion-ladder ↔ classification coherence (ADR-0047)
├── devotion-ladder.ts            # Devotion ladder rungs
├── index.ts                      # Re-exports
├── intent-progress.ts:29         # Governor type — must stay in sync with BRAINS const (PANTHEON.md)
├── lifecycle.ts                  # Generic lifecycle helpers
├── pillars.ts                    # PILLAR_KEYS const + Pillar enum centralization (Phase 1)
├── source-certainty.ts           # Source classifier confidence levels (ADR-0032)
├── touchpoints.ts                # Touchpoint enum
└── __tests__/                    # Domain-level unit tests
```

This layer has **no dependencies** on anything else in `src/`. It is the foundation for type safety across the codebase.

### 2.2 — `src/lib/` (Layer 1 — utilities)

```
src/lib/
├── auth/                         # NextAuth v5 config + helpers
├── constants/                    # Shared constants
├── db.ts                         # PrismaClient via @prisma/adapter-pg (Prisma 7)
├── design/                       # Design system runtime helpers (CVA factories, etc.)
├── i18n/                         # i18n loader + locale router
├── topo-sort.ts                  # Generic topo-sort<T> (used by sequence-executor, ADR-0041)
├── trpc/                         # tRPC client setup (browser-side)
├── types/                        # variable-bible.ts (~300 entries), DTOs, branded types
└── utils/                        # Generic utilities
```

### 2.3 — `src/server/governance/` (Layer 2 — governance kernel)

```
src/server/governance/
├── bootstrap.ts                  # Boots manifests, registry, NSP, event bus
├── manifest.ts:23                # BRAINS const — sources de vérité Neteru
├── registry.ts                   # Service registry generated from manifests
├── registry.generated.ts         # Pre-built registry for cold-start perf
├── governed-procedure.ts         # tRPC wrapper that routes through mestor.emitIntent
├── event-bus.ts                  # In-process EventBus
├── hash-chain.ts                 # IntentEmission hash-chain (ADR-0005)
├── intent-kinds.ts               # All Intent kinds, payload schemas
├── intent-versions.ts            # Versioning for Intent payload schemas
├── pillar-readiness.ts           # Cross-pillar readiness gates (ADR-0003)
├── cost-gate.ts                  # Thot cost-gate hook (ADR-0006)
├── compensating-intents.ts       # CORRECT_INTENT family
├── post-conditions.ts            # Generic post-condition runner
├── strategy-phase.ts             # Strategy phase derivation
├── slos.ts                       # SLO config per Intent kind
├── plugin-sandbox.ts             # Plugin sandboxing (ADR-0008)
├── default-capacity-reader.ts    # Default budget capacity
├── tenant-scoped-db.ts           # Auto-injects { operatorId } on Prisma calls
├── nsp/                          # NSP SSE broker (Phase 16, ADR-0025)
├── wrappers/                     # Various procedure wrappers
└── __generated__/                # Auto-generated registry sources
```

### 2.4 — `src/server/services/` (Layer 3 — business services)

100 service directories. Each has a `manifest.ts` declaring `governor`, `acceptsIntents`, `dependsOn`, `slos`. Inventory grouped by sub-system below; for the full classification with tier and governor, see [SERVICE-MAP.md](../governance/SERVICE-MAP.md).

**Mission Tier — Propulsion (14 brief services + Ptah forge)**
`artemis/` · `glory-tools/` · `deliverable-orchestrator/` · `campaign-deliverable/` · `campaign-manager/` · `campaign-plan-generator/` · `campaign-budget-engine/` · `campaign-change-request/` · `sequence-vault/` · `brief-ingest/` · `notoria/` · `driver-engine/` · `ptah/` (forge) · `prompt-registry/` · `oracle-section/`

**Mission Tier — Guidance**
`mestor/` · `pillar-gateway/` · `pillar-maturity/` · `pillar-normalizer/` · `pillar-versioning/` · `boot-sequence/` · `brand-node/` · `brand-vault/` · `strategy-presentation/` · `strategy-archive/` · `mission-templates/` · `morning-batch/`

**Mission Tier — Telemetry**
`seshat/` · `seshat-bridge/` · `jehuty/` · `knowledge-aggregator/` · `knowledge-capture/` · `knowledge-seeder/` · `cult-index-engine/` · `devotion-engine/` · `feedback-loop/` · `feedback-processor/` · `diagnostic-engine/` · `ecosystem-engine/` · `market-intelligence/` · `sector-intelligence/` · `source-classifier/` · `cross-validator/` · `signal/` (via routers) · `advertis-scorer/` · `ai-cost-tracker/` · `audit-trail/` · `error-vault/` · `nsp/`

**Mission Tier — Sustainment**
`financial-brain/` (Thot) · `financial-engine/` · `financial-reconciliation/` · `commission-engine/` · `budget-allocator/` · `model-policy/` · `process-scheduler/` · `staleness-propagator/` · `sla-tracker/` · `monetization/` · `auto-promotion/` · `playbook-capitalization/`

**Ground Tier — Operations**
`crm-engine/` · `data-export/` · `country-registry/` · `mobile-money/` · `payment-providers/` · `upsell-detector/` · `value-report-generator/` · `ingestion-pipeline/` · `pipeline-orchestrator/` · `quick-intake/`

**Ground Tier — Crew Programs (Imhotep + satellites)**
`imhotep/` · `matching-engine/` · `talent-engine/` · `team-allocator/` · `tier-evaluator/` · `qc-router/` · `founder-psychology/`

**Ground Tier — Comms (Anubis + satellites)**
`anubis/` · `email/` · `oauth-integrations/` · `advertis-connectors/`

**Ground Tier — Admin / Infrastructure**
`operator-isolation/` · `operator-action/` · `approval-workflow/` · `mfa/` · `translation/` · `collab-doc/` · `demo-data/` · `sentinel-handlers/` · `rtis-protocols/` · `board-export/` · `asset-tagger/` · `guidelines-renderer/` · `implementation-generator/` · `vault-enrichment/` · `llm-gateway/` · `neteru-shared/` · `utils/`

**Phase 19 — Campaign Tracker**
`campaign-tracker/` — L2 Instrumental, 21 capabilities, 22 procedures, depends on mestor/artemis/thot/seshat/anubis/imhotep.

### 2.5 — `src/server/trpc/` (Layer 4 — 100 routers)

```
src/server/trpc/
├── context.ts                    # tRPC context (session, db, operatorId)
├── init.ts                       # createTRPCRouter + procedure types
├── router.ts                     # Root appRouter
├── middleware/                   # Auth, audit, governance middleware
└── routers/                      # 80 individual routers
```

100 routers grouped by sub-system in [ROUTER-MAP.md](../governance/ROUTER-MAP.md). Key ones:

- `mestor-router.ts` (governed) — chat + Intent dispatch
- `strategy-presentation.ts` (governed) — Oracle 35 sections + `enrichOracle*`
- `oracle.ts` (Phase 21 F-C) — section generation, snapshot, retry
- `pillar.ts` (35KB bypass — priority Phase 3) — pillar CRUD + previewAmend
- `glory.ts` — Glory tools catalog/invoke
- `notoria.ts` (governed) — production pipeline
- `campaign-tracker.ts` (audited) — Phase 19 L2 instrumental, 22 procedures
- `deliverable-orchestrator.ts` (governed) — Phase 17b output-first composition

### 2.6 — `src/app/` (Layer 6 — Next.js App Router)

```
src/app/
├── (agency)/                     # Agency portal (UPgraders partner network)
├── (auth)/                       # Sign-in flows
├── (cockpit)/                    # Founder cockpit (what client sees)
├── (console)/                    # UPgraders/operator portal — internal, never sold (73 pages)
├── (creator)/                    # Freelance creator portal
├── (intake)/                     # Launchpad — public intake (paid + free flows)
├── (marketing)/                  # Marketing pages
├── (public)/                     # Public pages
├── (shared)/                     # Cross-portal shared routes
├── api/                          # 17 REST route groups (see api-contracts.md)
├── portals/                      # Portal selector
├── providers.tsx                 # Client providers (TRPC, ReactQuery, theme)
├── layout.tsx                    # Root layout
├── error.tsx                     # Root error boundary
├── global-error.tsx              # Catastrophic error
├── not-found.tsx                 # 404
└── unauthorized/                 # 401 handler
```

165 pages in total. Full mapping: [PAGE-MAP.md](../governance/PAGE-MAP.md).

### 2.7 — `src/app/api/` (REST routes — 17 groups)

```
src/app/api/
├── admin/metrics/                # Admin metrics endpoint
├── auth/[...nextauth]/           # NextAuth v5 handler
├── chat/                         # Chat/stream endpoints
├── collab/                       # Collaborative doc endpoints
├── cron/                         # Cron entrypoints (Vercel cron)
├── export/                       # PDF/Excel export
├── intake/[token]/               # Token-scoped public intake
├── integrations/                 # External integration callbacks
├── mcp/                          # Aggregated MCP server endpoint (ADR-0026)
├── notifications/                # Notification feed + SSE bridge
├── nsp/                          # NSP SSE endpoint — GET ?intentId=...&since=... (also for Oracle stream)
├── payment/                      # Stripe + mobile-money webhooks
├── ptah/                         # Ptah forge webhooks (Magnific callback, Adobe Firefly, ...)
├── push/                         # Web Push subscribe + send
├── trpc/                         # tRPC HTTP handler (next-trpc)
├── webhooks/                     # Generic inbound webhook router
└── widget/                       # Embeddable widget endpoints
```

### 2.8 — `src/components/`

```
src/components/
├── primitives/                   # 36 design system primitives (button, card, dialog, ...) — all CVA-driven, all manifest.ts. See COMPONENT-MAP.md
├── neteru/                       # Layer 5 — Neteru UI Kit (MestorPlan, ArtemisExecutor, SeshatTimeline, OracleEnrichmentTracker, ...)
├── cockpit/                      # Cockpit-specific UI
├── console/                      # Console-specific UI
├── intake/                       # Launchpad UI
├── landing/                      # Marketing landing UI
├── mestor/                       # Mestor chat + plan UI
├── navigation/                   # Portal switcher, breadcrumbs
├── pillars/                      # ADVE/RTIS pillar UI components
├── portfolio/                    # Portfolio UI
├── providers/                    # Misc context providers
├── shared/                       # Cross-portal shared
├── strategy/                     # Strategy editor UI
└── strategy-presentation/        # Oracle viewer (35 sections, OracleProgressivePanel, ...)
```

### 2.9 — `src/hooks/`

```
src/hooks/
├── use-collab-doc.ts             # Collaborative doc (operational transform)
├── use-neteru.ts                 # NSP subscription for an Intent
├── use-nsp.ts                    # Generic NSP SSE subscription
├── use-oracle-stream.ts          # Oracle progressive streaming (Phase 21 F-F, ADR-0073)
└── use-scroll-reveal.ts          # Scroll-triggered reveal animations
```

### 2.10 — `src/styles/`

4-tier token cascade CSS (Reference → System → Component → Domain). See [DESIGN-SYSTEM.md](../governance/DESIGN-SYSTEM.md) and [DESIGN-TOKEN-MAP.md](../governance/DESIGN-TOKEN-MAP.md).

---

## 3. Entry points (cold-path)

| Entry | What it does |
|---|---|
| [src/app/layout.tsx](../../src/app/layout.tsx) | Root layout — boots NextAuth session, theme, locale |
| [src/app/providers.tsx](../../src/app/providers.tsx) | Client providers — TRPC, React Query, Theme |
| [src/app/api/trpc/](../../src/app/api/trpc/) | tRPC HTTP entrypoint |
| [src/app/api/nsp/](../../src/app/api/nsp/) | NSP SSE entrypoint |
| [src/proxy.ts](../../src/proxy.ts) | Edge middleware (auth + locale routing) |
| [src/server/governance/bootstrap.ts](../../src/server/governance/bootstrap.ts) | Server boot — load manifests, build registry |
| [src/server/mcp/](../../src/server/mcp/) | Aggregated MCP server (ADR-0026) |
| [src/lib/db.ts](../../src/lib/db.ts) | PrismaClient via driver adapter (Prisma 7) |

---

## 4. Critical files to read first

If you have 30 minutes before touching anything:

1. [CLAUDE.md](../../CLAUDE.md) — agent activation contract
2. [src/server/governance/manifest.ts:23](../../src/server/governance/manifest.ts) — `BRAINS` const (sources de vérité Neteru)
3. [src/server/services/mestor/intents.ts:179](../../src/server/services/mestor/intents.ts#L179) — `emitIntent` entry point
4. [src/server/governance/intent-kinds.ts](../../src/server/governance/intent-kinds.ts) — all Intent kinds
5. [src/domain/pillars.ts](../../src/domain/pillars.ts) — ADVE/RTIS canonical enum
6. [src/server/services/strategy-presentation/types.ts](../../src/server/services/strategy-presentation/types.ts) — `SECTION_REGISTRY` (35 Oracle sections)
7. [src/lib/types/variable-bible.ts](../../src/lib/types/variable-bible.ts) — ~300 editable variables
8. [docs/governance/CODE-MAP.md](../governance/CODE-MAP.md) — auto-generated synonym table (anti-doublon)

---

## 5. Auto-generated artifacts (don't hand-edit)

| File | Generator | Trigger |
|---|---|---|
| [docs/governance/CODE-MAP.md](../governance/CODE-MAP.md) | [scripts/gen-code-map.ts](../../scripts/gen-code-map.ts) | husky pre-commit (when structural entities change) |
| [docs/governance/COMPONENT-MAP.md](../governance/COMPONENT-MAP.md) | [scripts/generate-component-map.ts](../../scripts/generate-component-map.ts) | manual `npm run ds:components-map` |
| [docs/governance/DESIGN-TOKEN-MAP.md](../governance/DESIGN-TOKEN-MAP.md) | [scripts/generate-token-map.ts](../../scripts/generate-token-map.ts) | manual `npm run ds:tokens-map` |
| [docs/governance/INTENT-CATALOG.md](../governance/INTENT-CATALOG.md) | [scripts/gen-intent-catalog.ts](../../scripts/gen-intent-catalog.ts) | manual |
| [docs/governance/VARIABLE-BIBLE-CANON.md](../governance/VARIABLE-BIBLE-CANON.md) | [scripts/gen-variable-bible-canon.ts](../../scripts/gen-variable-bible-canon.ts) | manual |
| [src/server/governance/registry.generated.ts](../../src/server/governance/registry.generated.ts) | [scripts/gen-manifest-registry.ts](../../scripts/gen-manifest-registry.ts) | `npm run manifests:gen` |
| [src/server/governance/__generated__/](../../src/server/governance/__generated__/) | various | manifests build |
