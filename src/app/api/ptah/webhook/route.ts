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
import { findTaskBySecretAndId } from "@/server/services/ptah";
import { emitIntent } from "@/server/services/mestor/intents";
import type { ForgeReconciled } from "@/server/services/ptah/types";

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

  const { ok, task } = await findTaskBySecretAndId(taskId, secret);
  if (!ok) {
    return NextResponse.json({ error: "Invalid taskId/secret" }, { status: 403 });
  }

  if (!task?.strategyId) return NextResponse.json({ ok: false, error: "PTAH_TASK_SCOPE_MISMATCH" }, { status: 409 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const receipt = await emitIntent({ kind: "PTAH_RECONCILE_TASK",
      strategyId: task.strategyId, taskId, webhookPayload: payload }, { caller: "webhook:ptah", operatorId: task.operatorId });
    if (receipt.status !== "OK" || !receipt.output) {
      return NextResponse.json({ ok: false, error: receipt.reason ?? receipt.summary },
        { status: receipt.status === "VETOED" ? 409 : 500 });
    }
    const result = receipt.output as ForgeReconciled;
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
