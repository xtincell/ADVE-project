import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { canAccessStrategy, getOperatorContext } from "@/server/services/operator-isolation";
import { readPublicationImage } from "@/server/services/anubis/publication-package";
import { verifyPublicationMediaGrant } from "@/server/services/anubis/publication-access";

const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" };
const record = (v: unknown) => (v && typeof v === "object" ? v : {}) as Record<string, unknown>;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const query = new URL(request.url).searchParams;
    const grant = query.has("signature") ? verifyPublicationMediaGrant(id, query) : null;
    // A malformed/expired signed URL must never fall back to the visitor session.
    if (query.has("signature") && !grant) return new Response(null, { status: 404, headers });
    const asset = await db.brandAsset.findUnique({ where: { id }, select: { strategyId: true, state: true, metadata: true } });
    if (!asset) return new Response(null, { status: 404, headers });
    if (grant) {
      const meta = record(asset.metadata), review = record(meta.editorialReview);
      const action = await db.brandAction.findFirst({ where: { id: String(meta.actionId), strategyId: asset.strategyId }, select: { status: true, metadata: true } });
      if (asset.state !== "ACTIVE" || review.contentHash !== grant || !review.userId || !review.reviewedAt ||
          !action || !["PUBLISHING", "EXECUTED", "ACCEPTED"].includes(action.status) || record(action.metadata).publicationPackageId !== id ||
          record(record(action.metadata).socialPublish).publicationPackageHash !== grant)
        return new Response(null, { status: 404, headers });
    } else {
      const session = await auth();
      if (!session?.user?.id) return new Response(null, { status: 401, headers });
      if (!await canAccessStrategy(asset.strategyId, await getOperatorContext(session.user.id))) return new Response(null, { status: 404, headers });
    }
    const image = await readPublicationImage(id, grant ?? undefined);
    return new Response(new Uint8Array(image.bytes), { headers: { ...headers, "Content-Type": "image/jpeg", "Content-Length": String(image.bytes.length) } });
  } catch { return new Response(null, { status: 404, headers }); }
}
