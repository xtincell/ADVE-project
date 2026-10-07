import { auth } from "@/lib/auth/config";
import { resolveBrandSource } from "@/server/services/ingestion-pipeline/source-usage";
import { canAccessStrategy, getOperatorContext } from "@/server/services/operator-isolation";
import { readSourceOriginal } from "@/server/services/ingestion-pipeline/original";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  const session = await auth();
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (!session?.user?.id) return Response.json({ error: "Connexion requise." }, { status: 401, headers });
  const { sourceId } = await params;
  const requestedStrategy = new URL(_request.url).searchParams.get("strategyId") ?? undefined;
  const resolved = await resolveBrandSource(sourceId, requestedStrategy).catch(() => null);
  if (!resolved || !await canAccessStrategy(resolved.consumerStrategyId, await getOperatorContext(session.user.id))) {
    return Response.json({ error: "Original inaccessible." }, { status: 404, headers });
  }
  try {
    const original = await readSourceOriginal(sourceId);
    if (!original) return Response.json({ error: "L’original n’a pas encore été conservé." }, { status: 404, headers });
    return new Response(new Uint8Array(original.bytes), { headers: {
      ...headers, "Content-Type": "application/octet-stream",
      "Content-Length": String(original.bytes.length),
      "Content-Disposition": `attachment; filename="original"; filename*=UTF-8''${encodeURIComponent(original.fileName).replace(/'/g, "%27")}`,
      "X-Content-SHA256": original.receipt.contentHash,
    } });
  } catch {
    return Response.json({ error: "L’original est momentanément indisponible. Le texte conservé reste consultable." }, { status: 503, headers });
  }
}
