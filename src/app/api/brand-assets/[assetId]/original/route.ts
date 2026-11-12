import sharp from "sharp";
import { Readable } from "node:stream";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { canAccessStrategy, getOperatorContext } from "@/server/services/operator-isolation";
import { streamAssetOriginal } from "@/server/services/brand-vault/original";

export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" };
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Connexion requise." }, { status: 401, headers });
  const { assetId } = await params;
  const asset = await db.brandAsset.findUnique({ where: { id: assetId }, select: { strategyId: true } });
  if (!asset || !await canAccessStrategy(asset.strategyId, await getOperatorContext(session.user.id))) {
    return Response.json({ error: "Original inaccessible." }, { status: 404, headers });
  }
  try {
    const original = await streamAssetOriginal(assetId);
    if (!original) return Response.json({ error: "Aucun original conservé pour cet actif." }, { status: 404, headers });
    if (new URL(request.url).searchParams.get("preview") === "1") {
      // Only decoded raster bytes are shown inline. SVG, documents, archives and
      // fonts remain attachments; a caller-provided MIME cannot turn them active.
      if (original.receipt.byteLength > 10 * 1024 * 1024) {
        await original.body.return(undefined);
        return Response.json({ error: "Téléchargez l’original pour consulter ce fichier volumineux." }, { status: 415, headers });
      }
      const parts: Buffer[] = [];
      for await (const part of original.body) parts.push(part);
      const b = Buffer.concat(parts);
      const raster = b.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))
        || b.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex")) || /^GIF8[79]a/.test(b.toString("ascii", 0, 6))
        || (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP");
      if (!raster) return Response.json({ error: "Téléchargez l’original pour consulter ce format." }, { status: 415, headers });
      const preview = await sharp(b, { limitInputPixels: 20_000_000 }).resize({ width: 1000, height: 1000, fit: "inside", withoutEnlargement: true }).png().toBuffer();
      return new Response(new Uint8Array(preview), { headers: { ...headers, "Content-Type": "image/png" } });
    }
    return new Response(Readable.toWeb(Readable.from(original.body, { objectMode: false, highWaterMark: 64 * 1024 })) as ReadableStream<Uint8Array>, { headers: { ...headers,
      "Content-Type": "application/octet-stream", "Content-Length": String(original.receipt.byteLength),
      "Content-Disposition": `attachment; filename="original"; filename*=UTF-8''${encodeURIComponent(original.fileName).replace(/'/g, "%27")}`,
      "X-Content-SHA256": original.receipt.contentHash,
    } });
  } catch {
    return Response.json({ error: "Original momentanément indisponible. Redéposez le même fichier si sa conservation est inachevée." }, { status: 503, headers });
  }
}
