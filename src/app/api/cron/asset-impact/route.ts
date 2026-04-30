/**
 * Cron — Seshat Asset Impact Tracker (Phase 9 résidu 3).
 *
 * Schedule : toutes les heures (`0 * * * *`).
 * Mesure le `cultIndexDeltaObserved` pour chaque AssetVersion mûre
 * (>=24h, pas encore mesurée). Persiste le delta directement sur la
 * row AssetVersion. Idempotent.
 *
 * Vercel cron entry (vercel.json) :
 *   { "path": "/api/cron/asset-impact", "schedule": "0 * * * *" }
 */

import { NextResponse } from "next/server";
import { trackAssetImpacts } from "@/server/services/seshat/asset-impact-tracker";

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await trackAssetImpacts();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
