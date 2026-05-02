/**
 * SSE stream — push live notifications to authenticated client.
 *
 * Cf. ADR-0024. Branchement direct sur le NSP broker (in-memory) côté server,
 * encodage SSE côté wire. Le client (NotificationBell) ouvre `EventSource`
 * et reçoit `data: {json}\n\n` à chaque event.
 *
 * Runtime nodejs (pas Edge) pour bénéficier des connexions longue durée.
 * Heartbeat toutes les 25s pour éviter timeout proxy.
 */

import { auth } from "@/lib/auth/config";
import { subscribe } from "@/server/services/nsp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const HEARTBEAT_MS = 25_000;

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      safeEnqueue(`event: ready\ndata: {"userId":"${userId}"}\n\n`);

      const unsubscribe = subscribe(userId, (event) => {
        safeEnqueue(`event: ${event.kind}\ndata: ${JSON.stringify(event)}\n\n`);
      });

      const heartbeat = setInterval(() => {
        safeEnqueue(`: heartbeat\n\n`);
      }, HEARTBEAT_MS);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
      connection: "keep-alive",
    },
  });
}
