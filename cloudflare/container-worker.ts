/**
 * Cloudflare Container — routing Worker.
 *
 * La Fusée OS is too large for a single Cloudflare Worker (the bundled app is
 * ~14.5 MB gzip, over the 10 MB paid Worker limit). Instead the full Next.js
 * Node server runs in a Container (built from the repo Dockerfile, `next start`
 * on the standalone output), and this thin Worker forwards every request to it.
 *
 * The Container has no script-size limit and runs the unmodified Node runtime:
 * Prisma + node-postgres, NextAuth, the NSP SSE stream, and puppeteer/Chromium
 * (PDF) all work as on any Node host.
 *
 * Secrets/vars set on the Worker (`wrangler secret put …` or the dashboard) are
 * forwarded into the container process as environment variables — DATABASE_URL,
 * NEXTAUTH_SECRET, ANTHROPIC_API_KEY, payment/connector keys, etc.
 *
 * This file is bundled by `wrangler` (esbuild), not by Next — it is excluded
 * from the app's tsconfig. Worker/DO globals come from `wrangler types`
 * (`worker-configuration.d.ts`).
 */
import { Container, getContainer } from "@cloudflare/containers";

interface Env {
  LAFUSEE_CONTAINER: DurableObjectNamespace<LaFuseeContainer>;
  [key: string]: unknown;
}

export class LaFuseeContainer extends Container<Env> {
  /** The Next.js standalone server listens on this port (see Dockerfile). */
  defaultPort = 3000;
  /** Sleep the instance after 5 min idle; it wakes on the next request. */
  sleepAfter = "5m";
  /** The app reaches an external DB (Supabase) + LLM/payment APIs. */
  enableInternet = true;

  constructor(ctx: DurableObject["ctx"], env: Env) {
    super(ctx, env);
    // Forward every string-valued Worker var/secret into the container process.
    // Bindings (objects) are skipped — only scalar env reaches Node.
    const forwarded: Record<string, string> = {};
    for (const [key, value] of Object.entries(env)) {
      if (typeof value === "string") forwarded[key] = value;
    }
    forwarded.PORT = String(this.defaultPort);
    forwarded.HOSTNAME = "0.0.0.0";
    forwarded.NODE_ENV = "production";
    this.envVars = forwarded;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Route all traffic to a single warm app instance. Next.js keeps in-memory
    // caches and serves long-lived SSE, so a stable singleton is the right
    // default; scale out later with `loadBalance(env.LAFUSEE_CONTAINER, N)`.
    const container = getContainer(env.LAFUSEE_CONTAINER, "lafusee");
    return container.fetch(request);
  },
};
