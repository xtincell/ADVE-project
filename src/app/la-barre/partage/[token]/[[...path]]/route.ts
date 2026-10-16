import { randomBytes } from "node:crypto";
import { readPublishedBarreDocument } from "@/server/services/brand-node/barre-document";
import { barreUpstreamUrl } from "@/server/services/brand-node/barre-connection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ token: string; path?: string[] }> };
const PRIVATE = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow" };
const CSP = "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'; script-src 'none'";
const refused = () => new Response("Ce lien ne donne pas accès à un document publié. Il a pu être renouvelé ou révoqué.", { status: 404, headers: { ...PRIVATE, "Content-Security-Policy": CSP } });

async function serve(request: Request, context: Context) {
  const { token, path = [] } = await context.params;
  if (!/^[a-f0-9]{24}$/.test(token) || path.some((p) => !p || p.startsWith(".") || /[%\\/\u0000-\u001f\u007f]/.test(p))) return refused();
  try {
    // Current source grant on every request, including fonts, ranges and HEAD.
    const document = await readPublishedBarreDocument(token);
    if (!document) return refused();
    if (!path.length) return new Response(null, { status: 307, headers: { ...PRIVATE, Location: `/la-barre/partage/${token}/document` } });
    if (path.join("/") === "document") {
      const nonce = randomBytes(18).toString("base64");
      const styles = document.stylePaths.map((p) => `<link rel="stylesheet" href="${p.split("/").map(encodeURIComponent).join("/")}">`).join("");
      const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Douala" }).format(new Date(document.publishedAt));
      const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Document partagé — La Barre</title>${styles}</head><body data-vue="partage" style="display:block"><div class="pt-page" style="padding-bottom:0"><div class="pt-tete"><p>Édition partagée le ${date}</p><div class="pt-tete-d"><button id="imprimer-document" type="button" class="b">Imprimer ce document</button></div></div></div><main>${document.html}</main><script nonce="${nonce}">document.getElementById('imprimer-document').addEventListener('click',function(){window.print()});</script></body></html>`;
      return new Response(request.method === "HEAD" ? null : html, { headers: { ...PRIVATE, "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": CSP.replace("script-src 'none'", `script-src 'nonce-${nonce}'`) } });
    }
    const rel = path[0] === "media" ? path.slice(1).join("/") : path.join("/");
    const allowed = path[0] === "media" ? document.mediaPaths.includes(rel)
      : document.stylePaths.includes(rel) || /^styles\/polices\/[a-zA-Z0-9_-]+\.woff2?$/.test(rel);
    if (!allowed) return refused();
    const response = await fetch(barreUpstreamUrl(rel.split("/")), {
      method: request.method, cache: "no-store", redirect: "error",
      headers: request.headers.has("range") ? { range: request.headers.get("range")! } : {},
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(60_000)]),
    });
    const headers = new Headers({ ...PRIVATE, "Content-Security-Policy": CSP });
    for (const key of ["content-type", "content-length", "content-range", "accept-ranges", "etag"])
      if (response.headers.has(key)) headers.set(key, response.headers.get(key)!);
    return new Response(request.method === "HEAD" ? null : response.body, { status: response.status, headers });
  } catch {
    return new Response("Le document n’a pas pu être relu. Réessayez depuis ce même lien.", { status: 503, headers: { ...PRIVATE, "Content-Security-Policy": CSP } });
  }
}

export const GET = serve;
export const HEAD = serve;
