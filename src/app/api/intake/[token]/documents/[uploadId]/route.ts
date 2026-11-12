import { readIntakeOriginal } from "@/server/services/quick-intake/document-input";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ token: string; uploadId: string }> }) {
  const { token, uploadId } = await params;
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
  try {
    const original = await readIntakeOriginal(token, uploadId);
    if (!original) return Response.json({ error: "Original inaccessible pour ce diagnostic." }, { status: 404, headers });
    return new Response(new Uint8Array(original.bytes), { headers: { ...headers,
      "Content-Type": "application/octet-stream", "Content-Length": String(original.bytes.length),
      "Content-Disposition": `attachment; filename="original"; filename*=UTF-8''${encodeURIComponent(original.fileName).replace(/'/g, "%27")}`,
      "X-Content-SHA256": original.receipt.contentHash,
    } });
  } catch {
    return Response.json({ error: "L’original est momentanément indisponible. Les reçus restent conservés ; reprenez le dépôt si nécessaire." }, { status: 503, headers });
  }
}
