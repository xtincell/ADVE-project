import { readPublicLogo } from "@/server/services/brand-vault/public-media";

export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ editionId: string; file: string }> }) {
  const headers = { "Cache-Control": "public, max-age=0, must-revalidate", "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" };
  if (new URL(request.url).search) return new Response(null, { status: 404, headers });
  const { editionId, file } = await params;
  try {
    const logo = await readPublicLogo(editionId, file);
    if (!logo) return new Response(null, { status: 404, headers });
    const etag = `"${logo.receipt.contentHash}"`;
    if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { ...headers, ETag: etag } });
    return new Response(new Uint8Array(logo.bytes), { headers: { ...headers, ETag: etag,
      "Content-Type": logo.receipt.mediaType, "Content-Length": String(logo.bytes.length), "X-Content-SHA256": logo.receipt.contentHash } });
  } catch {
    return new Response(null, { status: 503, headers: { ...headers, "Cache-Control": "no-store" } });
  }
}
