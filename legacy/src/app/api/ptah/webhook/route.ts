/**
 * POST /api/ptah/webhook?taskId=…&secret=…
 *
 * Endpoint webhook providers Ptah (principalement Magnific).
 *
 * Sécurité (Magnific n'a pas de signature HMAC documentée) :
 *   - taskId + secret en query params
 *   - secret comparé à GenerativeTask.webhookSecret en DB (timing-safe)
 *   - fail-closed si mismatch
 *
 * Cf. ADR-0009 §4.6 Webhook handler.
 */

import { NextResponse } from "next/server";
import { reconcileTask, findTaskBySecretAndId } from "@/server/services/ptah";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const taskId = url.searchParams.get("taskId");
  const secret = url.searchParams.get("secret");

  if (!taskId || !secret) {
    return NextResponse.json(
      { error: "Missing taskId or secret query param" },
      { status: 400 },
    );
  }

  const { ok } = await findTaskBySecretAndId(taskId, secret);
  if (!ok) {
    return NextResponse.json({ error: "Invalid taskId/secret" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const result = await reconcileTask(taskId, payload);
    return NextResponse.json({
      ok: true,
      taskId: result.taskId,
      assetVersionIds: result.assetVersionIds,
      realisedCostUsd: result.realisedCostUsd,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "ptah-webhook",
    description:
      "POST endpoint for Ptah forge provider webhooks. Magnific webhook URL must include taskId + secret query params.",
  });
}
