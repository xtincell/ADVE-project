/**
 * /api/nsp — Neteru Streaming Protocol HTTP endpoint.
 *
 * GET /api/nsp?intentId=<id>&since=<iso>
 *   → SSE stream of NspEnvelope JSON.
 *
 * DELETE /api/nsp?intentId=<id>
 *   → asks the server to close the stream early (used by useNeteru.cancel).
 *
 * Edge runtime is intentionally NOT used: SSE on Vercel Edge requires Web
 * Streams API and we want to share the in-process EventBus with the Node
 * tRPC handlers. Node runtime keeps things simple.
 */

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { canAccessStrategy, getOperatorContext } from "@/server/services/operator-isolation";
import { subscribeToIntent } from "@/server/governance/nsp/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Auth + ownership de l'intent (audit adversarial 2026-07-22) : sans garde,
 * (GET) n'importe qui streamait la télémétrie d'un intent d'une AUTRE marque
 * via un intentId deviné, et (DELETE) marquait n'importe quel intent VETOED
 * (déni de service sur l'audit). On résout intentId → IntentEmission.strategyId
 * → canAccessStrategy. Renvoie la Response d'erreur, ou null si autorisé.
 */
async function guardIntent(
  req: NextRequest,
  intentId: string,
): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const emission = await db.intentEmission.findUnique({
    where: { id: intentId },
    select: { strategyId: true },
  });
  if (!emission) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const opCtx = await getOperatorContext(session.user.id);
  if (!(await canAccessStrategy(emission.strategyId, opCtx))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const intentId = req.nextUrl.searchParams.get("intentId");
  const since = req.nextUrl.searchParams.get("since") ?? undefined;
  if (!intentId) {
    return NextResponse.json({ error: "intentId required" }, { status: 400 });
  }

  const denied = await guardIntent(req, intentId);
  if (denied) return denied;

  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  let closed = false;
  const transport = {
    write(line: string) {
      if (closed) return;
      writer.write(encoder.encode(line)).catch(() => undefined);
    },
    close() {
      if (closed) return;
      closed = true;
      writer.close().catch(() => undefined);
    },
  };

  // Fire and forget — `subscribeToIntent` writes to the transport over
  // the stream lifetime.
  void subscribeToIntent({ intentId, transport, db, since });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function DELETE(req: NextRequest) {
  // Symbolic cancel — the SSE source is closed by the client; this DELETE
  // is here so the operator can also flag the intent as cancelled in the
  // audit log. The actual cancellation policy lives in mestor.
  const intentId = req.nextUrl.searchParams.get("intentId");
  if (!intentId) {
    return NextResponse.json({ error: "intentId required" }, { status: 400 });
  }

  const denied = await guardIntent(req, intentId);
  if (denied) return denied;

  // Non-terminal uniquement : un cancel ne doit JAMAIS réécrire l'issue d'un
  // intent déjà clos (OK/FAILED/DOWNGRADED) — sinon on falsifie l'audit d'une
  // combustion réussie. `updateMany` avec filtre de statut = no-op si terminal.
  await db.intentEmission
    .updateMany({
      where: { id: intentId, status: { in: ["PENDING", "QUEUED"] } },
      data: { status: "VETOED" },
    })
    .catch(() => undefined);
  return NextResponse.json({ ok: true });
}
