/**
 * Shared cron / privileged-endpoint authorization.
 *
 * Vercel automatically attaches `Authorization: Bearer <CRON_SECRET>` to
 * scheduled cron invocations **when the `CRON_SECRET` env var is set**. We
 * require that bearer token.
 *
 * Critically, this is **fail-closed in production**: previously each cron route
 * defined its own `verifyCronSecret` that did `if (!cronSecret) return true`,
 * which meant a deployment with no `CRON_SECRET` configured authorized every
 * anonymous caller. If the secret is absent we now allow execution ONLY outside
 * production (developer convenience); in production a missing secret denies, so
 * a misconfiguration can never silently expose a job that mutates data, sends
 * email, or burns LLM/asset budget.
 *
 * To run crons in production you MUST set `CRON_SECRET` in the environment
 * (Vercel → Project → Settings → Environment Variables). Vercel then injects
 * the bearer header on its scheduled calls automatically.
 */

function isProduction(): boolean {
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  );
}

/**
 * Returns true if the request is an authorized cron / privileged invocation.
 * Fail-closed in production when `CRON_SECRET` is unset.
 */
export function verifyCronSecret(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    return request.headers.get("authorization") === `Bearer ${cronSecret}`;
  }
  // No secret configured: allow only outside production. Never fail open in prod.
  return !isProduction();
}
