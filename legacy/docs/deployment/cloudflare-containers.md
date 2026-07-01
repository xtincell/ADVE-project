# Deploying La Fusée on Cloudflare Containers

La Fusée runs as a full **Next.js Node server inside a Cloudflare Container**,
fronted by a thin routing Worker. This is the supported Cloudflare path for this
app — it does **not** fit in a single Cloudflare Worker (the OpenNext-bundled app
is ~14.5 MB gzip, over the 10 MB paid Worker limit). The container has no script
size limit and runs the unmodified Node runtime, so Prisma + node-postgres,
NextAuth, the NSP SSE stream and puppeteer/Chromium (PDF) all work as on any
Node host.

## Architecture

```
request ─▶ Worker (cloudflare/container-worker.ts) ─▶ Container (Dockerfile, `node server.js`)
                                                         └─ Next.js standalone server (port 3000)
```

- **`cloudflare/container-worker.ts`** — routing Worker + `LaFuseeContainer`
  Durable Object class. Forwards every request to one warm container instance
  and forwards all string Worker vars/secrets into the container env.
- **`Dockerfile`** — multi-stage build of the Next.js `output: "standalone"`
  bundle + system Chromium for PDF.
- **`wrangler.jsonc`** — `containers` + `durable_objects` + `migrations`.

## Prerequisites

- A Cloudflare account on the **Workers Paid** plan (Containers require it).
- **Docker** running locally (or use Cloudflare's build — `wrangler` builds the
  image at deploy time and needs the Docker CLI + daemon).
- `wrangler` authenticated: `npx wrangler login`.

## One-time setup — secrets

Secrets are set on the Worker and forwarded into the container. At minimum:

```bash
npx wrangler secret put DATABASE_URL          # Supabase TRANSACTION pooler, port 6543
npx wrangler secret put NEXTAUTH_SECRET       # openssl rand -base64 32
npx wrangler secret put NEXTAUTH_URL          # https://<your-domain>
npx wrangler secret put AUTH_URL              # https://<your-domain>
npx wrangler secret put NEXT_PUBLIC_BASE_URL  # https://<your-domain>
npx wrangler secret put ANTHROPIC_API_KEY
# …plus any payment / connector keys from .env.example you want live.
```

> **DATABASE_URL must use the Supabase transaction-mode pooler** (port 6543,
> `?pgbouncer=true&connection_limit=1`). Session mode (5432) saturates on a
> stateless/concurrent runtime. See `.env.example` and `src/lib/db.ts`.

## Database migrations

Migrations do **not** run inside the container build. Run them against the
production DB from your machine / CI before (or after) deploying:

```bash
DATABASE_URL="<direct session-mode URL, port 5432>" npx prisma migrate deploy
```

## Deploy

```bash
npx wrangler deploy        # builds the image, pushes, deploys
```

`wrangler` builds the Docker image, pushes it to Cloudflare's registry, applies
the Durable Object migration, and deploys the Worker. It is invoked on demand
via `npx` — `wrangler` is **no longer a pinned dependency** (its transitive
`esbuild`/`miniflare`/`undici`/`ws` CVEs polluted `npm audit` while Vercel, not
Cloudflare, is the canonical deploy target).

## Notes

- **PDF / puppeteer** — the runner image installs system Chromium and points
  puppeteer at it (`PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`). To slim the
  image by ~300 MB, remove the Chromium `apt-get` block + the two `PUPPETEER_*`
  envs from the Dockerfile; the PDF routes then return a clean 500.
- **`changelog` page** is baked at build time (`force-static`) — it reads git,
  which isn't present in the runtime image.
- **Scaling** — the Worker routes to a single warm instance (good for in-memory
  caches + SSE). To scale out, switch `getContainer(...)` to
  `loadBalance(env.LAFUSEE_CONTAINER, N)` and raise `max_instances`.
- **`instance_type: "standard-1"`** (4 GiB) is billable while awake; the instance
  sleeps after 5 min idle (`sleepAfter`) and wakes on the next request.
- **Vercel still works** — `vercel.json` is untouched; `output: "standalone"` is
  ignored by Vercel. This repo can deploy to either target.
