export const dynamic = "force-dynamic";
/**
 * Cron — Ptah download-before-expire (Phase 9 résidu 2).
 *
 * Schedule : toutes les 30 minutes (`*\/30 * * * *`).
 * Rapatrie les assets Magnific dont la `GenerativeTask.expiresAt < NOW + 1h`
 * vers le blob storage durable (env `BLOB_STORAGE_PUT_URL_TEMPLATE`).
 *
 * Sans `BLOB_STORAGE_PUT_URL_TEMPLATE` configuré → mode dry-run : marque
 * `metadata.archiveSkipped=true` (observable, pas bloquant).
 *
 * Vercel cron entry (vercel.json) :
 *   { "path": "/api/cron/ptah-download", "schedule": "*\/30 * * * *" }
 */

import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { runDownloadArchiver } from "@/server/services/ptah/download-archiver";

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDownloadArchiver();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
