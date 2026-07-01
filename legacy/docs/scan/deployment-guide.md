# Deployment Guide

> Target platform: **Vercel** ([vercel.json](../../vercel.json)) with PostgreSQL (Supabase or any Postgres).
> CI: **GitHub Actions** (11 workflows under [.github/workflows/](../../.github/workflows/)).

---

## 1. Vercel deployment

### 1.1 — Project settings

| Setting | Value |
|---|---|
| Framework preset | Next.js |
| Node.js version | 20 |
| Build command | `npm run build` |
| Install command | `npm ci` (no `--include=dev`) |
| Output directory | `.next` (default) |
| Region | Closest to PostgreSQL host (Frankfurt for EU/Africa) |

### 1.2 — Required env vars

Identical to local (see [development-guide.md §3](./development-guide.md#3-environment-variables)), with two additions:

| Var | Notes |
|---|---|
| `NEXTAUTH_URL` | Set to the deployed URL (e.g., `https://lafusee.com`). NextAuth v5 enforces this in prod. |
| `VERCEL_URL` | Auto-injected by Vercel — never set manually |

Optional in prod:

- `SLACK_OAUTH_CLIENT_ID`, `NOTION_OAUTH_CLIENT_ID`, `FIGMA_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_ID`, etc. — for MCP inbound (cf. [ADR-0048](../governance/adr/0048-glory-tools-as-primary-api-surface.md) — convention `<UPPERCASE_SERVER_NAME>_OAUTH_CLIENT_ID`).
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — Web Push (Phase 16, [ADR-0025](../governance/adr/0025-notification-real-time-stack.md)).
- Payment provider keys (Stripe, mobile money) — env vars only, never DB ([ADR-0075](../governance/adr/0075-payment-secrets-in-env.md)).

### 1.3 — Vercel cron jobs

[vercel.json](../../vercel.json) declares 8 cron jobs:

| Path | Schedule | Purpose |
|---|---|---|
| `/api/cron/scheduler` | `*/5 * * * *` | Process scheduler tick (every 5 min) |
| `/api/cron/feedback-loop` | `0 8 * * *` | Daily 08:00 UTC — feedback loop processor |
| `/api/cron/founder-digest` | `0 6 * * 1` | Mondays 06:00 UTC — founder weekly digest |
| `/api/cron/sentinels` | `0 */6 * * *` | Every 6 hours — sentinel checks |
| `/api/cron/ptah-download` | `*/30 * * * *` | Every 30 min — download assets from Ptah forge providers |
| `/api/cron/asset-impact` | `0 * * * *` | Hourly — asset impact tracker (post-Ptah) |
| `/api/cron/sentinel-handlers` | `*/15 * * * *` | Every 15 min — sentinel handlers (alerts) |
| `/api/cron/auto-promotion` | `0 6 * * *` | Daily 06:00 UTC — auto-promotion module ([ADR-0066](../governance/adr/0066-auto-promotion-module.md)) |

Crons are protected by Vercel's `x-vercel-cron-signature` header — verified in the route handlers.

---

## 2. Database (PostgreSQL)

### 2.1 — Hosting

Any PostgreSQL ≥ 14 works. Production recommendation: **Supabase** (matches the MCP integration plus pgvector for embeddings).

Driver: `@prisma/adapter-pg` (Prisma 7). The connection URL is read from `DATABASE_URL` at runtime via [src/lib/db.ts](../../src/lib/db.ts) — the Prisma schema's `datasource db` block is metadata only.

### 2.2 — Migrations

```powershell
# Development
npm run db:migrate              # prisma migrate dev — creates new migration + applies

# Production / staging
npx prisma migrate deploy       # applies pending migrations only — no schema changes
```

**Do not use `prisma db push` after Phase 5** — migrations are versioned.

### 2.3 — Seeds (one-time bootstrap)

```powershell
npm run db:seed                  # core operators, users, sectors
npm run db:seed:countries        # country reference data
npm run db:seed:demo             # demo dataset for QA
# (optional) full demo content
npm run db:seed:all
```

---

## 3. CI workflows

All 11 workflows live under [.github/workflows/](../../.github/workflows/). Summary:

| Workflow | Trigger | Purpose | Blocks merge? |
|---|---|---|---|
| [`ci.yml`](../../.github/workflows/ci.yml) | PR + push to main | typecheck, lint, lint:governance, vitest unit, prisma validate, audit:governance, madge, commitlint, phase-label-check, scope-drift-trace | yes |
| [`e2e.yml`](../../.github/workflows/e2e.yml) | PR + push | Playwright e2e against ephemeral DB | yes |
| [`golden-path.yml`](../../.github/workflows/golden-path.yml) | PR + push | E2E golden path scenario (intake → strategy → Oracle → forge → broadcast) | yes |
| [`preflight.yml`](../../.github/workflows/preflight.yml) | PR | Aggregate pre-merge checks (full preflight equivalent) | yes |
| [`slo-check.yml`](../../.github/workflows/slo-check.yml) | nightly | SLO breach detection per Intent kind | informational, alerts on breach |
| [`governance-drift.yml`](../../.github/workflows/governance-drift.yml) | cron Sun 06:00 UTC | Re-runs governance audit + hash-chain integrity on last 1000 IntentEmissions; opens issue on drift | non-blocking |
| [`mission-drift.yml`](../../.github/workflows/mission-drift.yml) | PR + push | Mission drift test ([audit-mission-drift.ts](../../scripts/audit-mission-drift.ts)) | yes |
| [`chromatic.yml`](../../.github/workflows/chromatic.yml) | PR + push | Visual regression on Storybook | informational |
| [`lighthouse.yml`](../../.github/workflows/lighthouse.yml) | nightly | Lighthouse audit on /, /intake, /cockpit | informational |
| [`claude.yml`](../../.github/workflows/claude.yml) | manual / PR comment | Triggers Claude Code on a PR | manual |
| [`release.yml`](../../.github/workflows/release.yml) | tag push | Release notes + changelog | manual |

### CI env (stubs)

CI uses stubbed values declared at the top of [ci.yml](../../.github/workflows/ci.yml):

```yaml
DATABASE_URL: postgresql://stub:stub@localhost:5432/stub
NEXTAUTH_SECRET: ci-stub
AUTH_SECRET: ci-stub
```

Real keys are never required for CI — services degrade to `DEFERRED_AWAITING_CREDENTIALS` and tests assert on that branch.

---

## 4. Webhooks

Production webhook URLs must be configured at each provider:

| Provider | URL | Verification |
|---|---|---|
| Stripe | `https://lafusee.com/api/payment/stripe` | `Stripe-Signature` header |
| Mobile money (orange / mtn / wave) | `https://lafusee.com/api/payment/mobile-money` | Per-provider HMAC |
| Magnific | `https://lafusee.com/api/ptah/webhook` | HMAC, set via `MAGNIFIC_WEBHOOK_SECRET` |
| Adobe Firefly Services | `https://lafusee.com/api/ptah/adobe-webhook` | OAuth 2.0 token verification |
| Generic inbound | `https://lafusee.com/api/webhooks/<connector-id>` | Per-`WebhookConfig` HMAC |

Webhook handling is **idempotent**. Each provider's handler dedupes on the provider-specific event ID.

---

## 5. Observability

| Surface | Where |
|---|---|
| Runtime errors | `ErrorEvent` model + `/console/governance/error-vault/page.tsx` |
| Oracle incidents | clustered by `ORACLE-NNN` code at `/console/governance/oracle-incidents/page.tsx` ([ADR-0022](../governance/adr/0022-oracle-error-codes.md)) |
| Intent log | `IntentEmission` + `IntentEmissionEvent` — replayable via NSP `since` param |
| SLOs | `slos.ts` config per Intent kind + `slo-check.yml` cron |
| Cost tracking | `AICostLog` + `CostDecision` per intent emission |
| Audit log | `AuditLog` — high-level events |
| App metrics | `/api/admin/metrics` |
| Lighthouse | nightly workflow |
| Chromatic | per-PR visual diff |

There is **no APM SDK** wired into the codebase as of 2026-05-13 — observability flows through the in-house event vault. If you add Sentry / Datadog / OTEL, document it via an ADR.

---

## 6. Rollback

| Scenario | Procedure |
|---|---|
| Bad deploy | Vercel → Deployments → Promote previous deployment. App-state changes (DB) require a separate manual rollback. |
| Bad migration | `npx prisma migrate resolve --rolled-back <migration-name>` then forward-fix migration. Never `--rolled-back` after applying in prod without backup. |
| Bad Intent kind shipped | Emit `CORRECT_INTENT` referencing the original — hash chain stays intact ([ADR-0005](../governance/adr/0005-hash-chain-immutability.md)). |
| Drift in `IntentEmission` chain | `governance-drift.yml` cron opens an issue automatically — investigate before next migration |

---

## 7. Production checklist (pre-launch / pre-release)

1. `npm run preflight` is green.
2. All migrations applied: `npx prisma migrate status` shows no pending.
3. Cron jobs are visible in Vercel dashboard.
4. `NEXTAUTH_URL` matches deployed domain.
5. Webhooks registered at every provider with the correct prod URL.
6. `VAPID_*` keys generated and stored.
7. ELB/CDN passes SSE long-poll traffic through `/api/nsp` and `/api/notifications/stream` (no idle timeout < 30 s).
8. Storybook + Chromatic baseline accepted.
9. [CHANGELOG.md](../../CHANGELOG.md) updated with the version bump.
10. Tag the release: `git tag v6.x.y && git push --tags` (triggers `release.yml`).
