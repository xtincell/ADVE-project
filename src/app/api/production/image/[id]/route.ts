import { createHash } from "node:crypto";
import sharp from "sharp";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { ssrfSafeFetch } from "@/lib/net/ssrf-guard";
import { canAccessStrategy, getOperatorContext } from "@/server/services/operator-isolation";
import { readMediaBytes } from "@/server/services/seshat/creative-intelligence/media-observations";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" };
const maxBytes = 25_000_000;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response(null, { status: 401, headers });
  const { id } = await params;
  const where = { id, kind: { in: ["image", "icon", "design"] } };
  const asset = await db.assetVersion.findFirst({ where, select: { strategyId: true } });
  if (!asset?.strategyId || !await canAccessStrategy(asset.strategyId, await getOperatorContext(session.user.id)))
    return new Response(null, { status: 404, headers });
  const file = await db.assetVersion.findFirst({ where: { ...where, strategyId: asset.strategyId }, select: { url: true, cdnUrl: true, fileSizeBytes: true, metadata: true } });
  if (!file) return new Response(null, { status: 404, headers });
  try {
    let bytes: Buffer;
    const inline = /^data:image\/(?:png|jpeg|webp);base64,/.exec(file.url);
    if (inline && file.url.length <= Math.ceil(maxBytes / 3) * 4 + inline[0].length) {
      bytes = Buffer.from(file.url.slice(inline[0].length), "base64");
    } else {
      const metadata = file.metadata as { archiveHash?: string } | null;
      const digest = metadata?.archiveHash;
      if (!file.cdnUrl || !digest || !file.fileSizeBytes || file.fileSizeBytes > maxBytes)
        return new Response(null, { status: 404, headers });
      const res = await ssrfSafeFetch(file.cdnUrl, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw new Error("Archive indisponible.");
      bytes = await readMediaBytes(res, maxBytes);
      if (bytes.length !== file.fileSizeBytes || createHash("sha256").update(bytes).digest("hex") !== digest)
        throw new Error("Archive modifiée.");
    }
    const decoder = sharp(bytes, { limitInputPixels: 40_000_000 });
    if (!["png", "jpeg", "webp"].includes((await decoder.metadata()).format ?? ""))
      return new Response(null, { status: 415, headers });
    const thumb = await decoder.resize({ width: 1100, withoutEnlargement: true }).webp().toBuffer();
    return new Response(new Uint8Array(thumb), { headers: { ...headers, "Content-Type": "image/webp" } });
  } catch { return new Response(null, { status: 422, headers }); }
}
