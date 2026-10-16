import { auth } from "@/lib/auth/config";
import { getOperatorContext } from "@/server/services/operator-isolation";
import { barreUpstreamUrl, canAccessBarre } from "@/server/services/brand-node/barre-connection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path?: string[] }> };
const PRIVATE = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
const READ_HEADERS = ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"];
const REQUEST_HEADERS = ["content-type", "range", "if-match", "if-none-match", "if-modified-since", "x-base"];
const message = (text: string, status: number) => new Response(text, { status, headers: PRIVATE });

async function serve(request: Request, context: Context) {
  // Next's internal Request URL can use localhost behind a TLS-terminating proxy.
  // Reuse the installation's Auth.js origin, never a caller-supplied forwarding header.
  const publicOrigin = new URL(process.env.AUTH_URL || process.env.NEXTAUTH_URL || request.url).origin;
  const session = await auth();
  if (!session?.user?.id) {
    // Navigation uses the existing login. Data requests must not receive a login page as JSON.
    if (request.method === "GET" && request.headers.get("sec-fetch-mode") === "navigate") {
      const login = new URL("/login", publicOrigin);
      const current = new URL(request.url);
      login.searchParams.set("callbackUrl", current.pathname + current.search);
      return new Response(null, { status: 307, headers: { ...PRIVATE, Location: login.href } });
    }
    return message("Connectez-vous pour ouvrir La Barre.", 401);
  }
  // Re-read the current assignment; a JWT, link or supplied operator ID is never a grant.
  const actor = await getOperatorContext(session.user.id);
  if (!canAccessBarre(actor)) return message("La Barre n’est pas reliée à votre équipe.", 403);

  const { path = [] } = await context.params;
  if (!path.length) return new Response(null, { status: 307, headers: { ...PRIVATE, Location: "/la-barre/index.html" } });
  const rel = path.join("/");
  const readOnly = request.method === "GET" || request.method === "HEAD";
  // Expose the native application and its corpus, never repository/configuration or local disk helpers.
  const readable = rel === "index.html" || /^(app|styles|corpus|sources|documents)\//.test(rel) ||
    (rel.startsWith("assets/") && !rel.startsWith("assets/production/")) ||
    /^depots\/[a-zA-Z0-9._-]+\.json$/.test(rel);
  const writable = /^depots\/[a-zA-Z0-9._-]+\.json$/.test(rel) ||
    /^assets\/review\/[a-zA-Z0-9._/-]+\.(jpg|jpeg|png|webp|mp4|webm|pdf)$/i.test(rel);
  if (!readable || path.some((part) => part.startsWith(".") || /[%\\/\u0000-\u001f\u007f]/.test(part))) return message("Introuvable.", 404);
  if (!readOnly) {
    if (!["ADMIN", "OPERATOR"].includes(actor.role)) return message("L’enregistrement dans La Barre est pris en charge par votre équipe.", 403);
    if (!writable) return message("Écriture non autorisée à cette adresse.", 403);
    const origin = request.headers.get("origin");
    if (origin !== publicOrigin) return message("Ouvrez La Barre pour enregistrer ce travail.", 403);
  }
  try {
    const target = barreUpstreamUrl(path);
    target.search = new URL(request.url).search;
    const headers = new Headers();
    for (const key of REQUEST_HEADERS) {
      const value = request.headers.get(key);
      if (value !== null) headers.set(key, value);
    }
    // Native revision checks and byte streams stay in La Barre. Never forward session cookies.
    const options: RequestInit & { duplex?: "half" } = {
      method: request.method, headers, redirect: "error", cache: "no-store",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(60_000)]),
      ...(!readOnly ? { body: request.body, duplex: "half" as const } : {}),
    };
    const upstream = await fetch(target, options);
    const responseHeaders = new Headers(PRIVATE);
    for (const key of READ_HEADERS) {
      const value = upstream.headers.get(key);
      if (value !== null) responseHeaders.set(key, value);
    }
    return new Response(request.method === "HEAD" ? null : upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return message("La Barre est momentanément indisponible. Votre travail reste dans son outil d’origine.", 503);
  }
}

export const GET = serve;
export const HEAD = serve;
export const PUT = serve;
export const POST = serve;
