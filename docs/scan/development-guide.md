# Development Guide

> Goal: get a new contributor (or a Claude session in a fresh checkout) to a green local dev loop.
> Authoritative for governance: [CLAUDE.md](../../CLAUDE.md) + [NEFER.md](../governance/NEFER.md).

---

## 1. Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | ≥ 20 (CI uses 20) | Next.js 16 + Turbopack |
| npm | ≥ 10 | `package-lock.json` is canonical |
| PostgreSQL | ≥ 14 | Prisma 7 + driver adapter |
| `git` | recent | Conventional Commits enforced |
| `tsx` | bundled via devDeps | All scripts run as `tsx scripts/foo.ts` |
| (optional) Husky | bundled via `prepare` script | Pre-commit hooks: regenerate CODE-MAP, lint, commitlint |

Recommended editor extensions:

- ESLint (the workspace uses `eslint-plugin-boundaries` + custom `eslint-plugin-lafusee`).
- Prisma extension.
- Tailwind CSS IntelliSense.

---

## 2. Local setup

```powershell
# 1. Clone & install
git clone <repo>
cd ADVE-project
npm ci

# 2. Configure env
cp .env.example .env.local
# Then fill in: DATABASE_URL, NEXTAUTH_SECRET, ANTHROPIC_API_KEY, optional provider keys
# Provider keys are optional — services degrade to DEFERRED_AWAITING_CREDENTIALS

# 3. Prisma — generate client + apply migrations + seed
npx prisma generate
npm run db:migrate       # prisma migrate dev — DO NOT use db:push after Phase 5
npm run db:seed:all      # base + countries + demo + spawt + wakanda

# 4. Run dev server (Turbopack)
npm run dev
# → http://localhost:3000
```

---

## 3. Environment variables

Authoritative reference: [.env.example](../../.env.example). Required for any local boot:

| Var | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (`postgresql://user:pass@host:5432/db`) |
| `NEXTAUTH_SECRET` | NextAuth v5 JWT signing secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Public URL of the app (`http://localhost:3000` locally) |
| `ANTHROPIC_API_KEY` | Anthropic SDK — primary LLM provider |

Optional (provider gateways degrade gracefully if absent — services return `DEFERRED_AWAITING_CREDENTIALS`):

| Var group | Purpose |
|---|---|
| `FREEPIK_API_KEY` / `MAGNIFIC_API_KEY` / `MAGNIFIC_BASE_URL` | Ptah forge — Magnific image/video/audio (95% of forge surface) |
| `ADOBE_FIREFLY_CLIENT_ID` + `_SECRET` | Adobe Firefly Services (OAuth 2.0 S2S) |
| `FIGMA_PAT` | Figma PAT for Variables API |
| `CANVA_ENABLED` + `CANVA_CLIENT_ID` + `CANVA_CLIENT_SECRET` + `CANVA_USER_TOKEN_DEV` | Canva Connect (feature-flagged) |
| `PTAH_WEBHOOK_BASE_URL` | Override Magnific webhook callback URL (default: `NEXTAUTH_URL`) |
| `OPENAI_API_KEY` | LLM Gateway fallback provider |
| MCP server tokens | Slack, Notion, Google Drive/Calendar, Figma, GitHub — wired via `ExternalConnector` model (Credentials Vault, [ADR-0021](../governance/adr/0021-external-credentials-vault.md)) |

**Security note** ([ADR-0075](../governance/adr/0075-payment-secrets-in-env.md)): payment provider secrets stay in env vars, never in DB. Per-operator API credentials (ad networks, MCP servers) go in the **Credentials Vault** UI at `/console/anubis/credentials`, which writes to `ExternalConnector` model.

---

## 4. Daily commands

| Goal | Command |
|---|---|
| Dev server | `npm run dev` |
| Type check | `npx tsc --noEmit` |
| Lint (everything) | `npm run lint` |
| Lint (governance rules) | `npm run lint:governance` |
| Vitest (watch) | `npm test` |
| Vitest (run once) | `npm test -- --run` |
| Vitest single file | `npm test -- path/to/file.test.ts --run` |
| LLM smoke test | `npm run test:llm` |
| Playwright e2e | `npm run test:e2e` |
| Visual regression (Playwright) | `npm run test:visual` |
| Accessibility (Playwright) | `npm run test:a11y` |
| i18n (Playwright) | `npm run test:i18n` |
| Storybook | `npm run storybook` |
| Chromatic | `npm run chromatic` |
| Build | `npm run build` |
| Start (prod) | `npm start` |

### Governance / refonte commands

| Goal | Command |
|---|---|
| Run pre-PR governance audit (full) | `npm run preflight` |
| Quick preflight | `npm run preflight:quick` |
| Audit governance rules | `npm run audit:governance` |
| Audit dependency cycles | `npm run audit:cycles` |
| Audit manifests | `npm run manifests:audit` |
| Audit pre-conditions | `npm run audit:preconditions` |
| Regenerate CODE-MAP (manual) | `npm run codemap:gen` |
| Regenerate manifest registry | `npm run manifests:gen` |
| Regenerate component map | `npm run ds:components-map` |
| Regenerate design tokens map | `npm run ds:tokens-map` |
| Audit design tokens (warn) | `npm run audit:design` |
| Audit design tokens (strict — bloque) | `npm run audit:design:strict` |
| Codemod: zinc → tokens | `npm run codemod:zinc` |
| Diagnose DB connectivity | `npm run db:diag` |
| Stress test full | `npm run stress:full` |
| Static harvest | `npm run harvest:static` (or `:fast`) |
| Dynamic harvest (per portal) | `npm run harvest:dynamic:cockpit` / `:console` / `:public` |
| Golden path E2E | `npm run test:golden-path` |
| Glory tools inventory | `npm run glory:inventory` |
| Mobile preview (Puppeteer) | `npm run preview:mobile` (variants: `:dark`, `:se`, `:pixel`) |

The full script catalogue lives in [package.json#scripts](../../package.json) — there are 60+ scripts; [scripts/](../../scripts/) holds 109 .ts/.mjs files for audits, codemods, seeds, backfills, and report generators.

---

## 5. Layering rules (enforced)

The 6-layer hierarchy described in [architecture.md §2](./architecture.md#2-layering-strict) is enforced by:

1. **`eslint-plugin-boundaries`** — configured in [eslint.config.mjs](../../eslint.config.mjs). PRs that violate layer imports fail `npm run lint`.
2. **`madge --circular`** — currently `warn`, will be `error` in Phase 4.
3. **Custom rules** in [eslint-plugin-lafusee/](../../eslint-plugin-lafusee/):
   - `design-token-only` — bans `text-zinc-500`, `bg-violet-500`, hex literals, etc. outside `src/components/primitives/**` + `src/styles/**`.
   - Phase 0 governance rules (no bypass on critical routers, no direct service-from-router calls outside strangler).

---

## 6. Editing rules of thumb

### Adding a new business operation

Before touching anything:

1. **Grep [CODE-MAP.md](../governance/CODE-MAP.md)** for synonyms (e.g., "vault", "asset rangé", "SuperAsset"). If a similar entity already exists, extend it instead of creating a new one.
2. If a new entity is unavoidable, write an **ADR** in [docs/governance/adr/](../governance/adr/) before the PR. ADR template: [adr/0001-framework-name-apogee.md](../governance/adr/0001-framework-name-apogee.md) is the gold standard.
3. Add an Intent kind in [intent-kinds.ts](../../src/server/governance/intent-kinds.ts). Declare it in the owning service's `manifest.ts` (`acceptsIntents`).
4. If it's a tRPC mutation, use `governedProcedure(intentKind)` — never `protectedProcedure` direct for new code.
5. Add the route to the appropriate router in [src/server/trpc/routers/](../../src/server/trpc/routers/).
6. Add unit tests in [tests/unit/](../../tests/unit/) and an integration test if it crosses services.
7. Run `npm run preflight` before pushing.

### Adding a new UI component

1. If it's a **primitive**, scaffold under [src/components/primitives/](../../src/components/primitives/) with a `manifest.ts` (see existing primitives — `button.manifest.ts`, etc.).
2. Use **CVA** for variants. No `.join(" ")` ternaries when variant > 1.
3. **Only token classes** — `text-fg`, `bg-card`, `border-border`. No raw Tailwind color classes.
4. Test with Storybook + Chromatic.
5. Run `npm run ds:components-map` to regenerate [COMPONENT-MAP.md](../governance/COMPONENT-MAP.md).

### Adding a new Glory tool / sequence

1. Read [ADDING-A-CAPABILITY.md](../governance/ADDING-A-CAPABILITY.md).
2. Scaffold: `npm run manifests:scaffold`.
3. Declare `outputSchema?: ZodType` (or `_noSchemaJustification` if non-LLM) — they are mutually exclusive at the type level ([ADR-0067](../governance/adr/0067-llm-output-structured-enforcement.md)).
4. If `requires` includes brief→forge handoff, declare in the manifest. Composer resolves the DAG at runtime.

---

## 7. Tests

| Suite | Where | Runner |
|---|---|---|
| Unit | [tests/unit/](../../tests/unit/) | Vitest 4 |
| Integration | [tests/integration/](../../tests/integration/) | Vitest 4 |
| LLM smoke | [tests/integration/llm-smoke.test.ts](../../tests/integration/llm-smoke.test.ts) | Vitest 4 — requires `ANTHROPIC_API_KEY` |
| E2E | [tests/e2e/](../../tests/e2e/) | Playwright 1.59 |
| A11y | [tests/a11y/](../../tests/a11y/) | Playwright |
| i18n | [tests/i18n/](../../tests/i18n/) | Playwright |
| Visual | [tests/visual/](../../tests/visual/) | Playwright + Chromatic |
| Storybook visual | [.storybook/](../../.storybook/) | Storybook + Chromatic |

**Anti-drift tests** are bundled in unit/integration. They block regressions on:

- Manifest coverage ([manifests:audit](../../scripts/audit-manifests.ts))
- Layer boundaries (eslint)
- Tier coverage on Glory tool / framework outputs
- `assembler-uses-manual-path.test.ts` (HARD baseline 0 — no `executeStructuredLLMCall` direct in Oracle Assembler handler)
- Design tokens cascade (no raw Reference tokens consumed in components/)

---

## 8. Debugging tips

| Issue | Hint |
|---|---|
| "BRAINS const doesn't match Governor type" | Run `npm run lint:governance` — `neteru-coherence.test.ts` enforces sync across the 6 sources of truth |
| "Cycle detected by madge" | A new import broke a layer rule. Check `eslint-plugin-boundaries` output for the layer pair |
| "DEFERRED_AWAITING_CREDENTIALS" in logs | The relevant `ExternalConnector` row is missing — go to `/console/anubis/credentials` |
| Prisma client out of date | `npx prisma generate` |
| Migration not applying | `npm run db:diag` first to confirm connection; then `npx prisma migrate dev` |
| Zod schema rejects LLM output | Phase 21 F-A enforces strict validation. If a Glory tool is failing, check its `outputSchema` matches what the LLM produces — bump prompt, not the schema |
| Test `governance-coherence` fails | One of the 7 sources of truth drifted (CLAUDE.md / BRAINS / Governor type / LEXICON / APOGEE / PANTHEON / SERVICE-MAP). Find the diff |

For deeper triage, the [ERROR-VAULT](../governance/adr/0022-oracle-error-codes.md) clusters runtime errors by code `ORACLE-NNN` at `/console/governance/oracle-incidents/page.tsx`.
