export const dynamic = "force-dynamic";
/**
 * Cron — Sentinel Handlers (Phase 9-suite résidu).
 *
 * Schedule : toutes les 15 minutes (`*\/15 * * * *`).
 * Consomme les IntentEmission rows en PENDING émises par
 * `/api/cron/sentinels` (toutes les 6h) et exécute le handler concret
 * pour chaque kind. Les rows passent PENDING → OK | FAILED.
 *
 * Vercel cron entry (vercel.json) :
 *   { "path": "/api/cron/sentinel-handlers", "schedule": "*\/15 * * * *" }
 */

import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { processPendingSentinels } from "@/server/services/sentinel-handlers";

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processPendingSentinels();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
