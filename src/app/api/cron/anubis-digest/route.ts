export const dynamic = "force-dynamic";
/**
 * Cron — Anubis notification digests (RESIDUAL-DEBT Phase 16 « Digest cron
 * pas câblé ») : `runDigest()` existait depuis Phase 16 (ADR-0025) sans
 * aucune entrée cron. Câblé sur le pattern canonique des crons serverfull
 * (Coolify : scheduler curl + CRON_SECRET ; Vercel : entrée vercel.json).
 *
 * Appels attendus :
 *   - quotidien : /api/cron/anubis-digest?frequency=DAILY  (ex. 07:00 UTC)
 *   - hebdo     : /api/cron/anubis-digest?frequency=WEEKLY (ex. lundi 07:30 UTC)
 */

import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { runDigest } from "@/server/services/anubis/digest-scheduler";

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const raw = (url.searchParams.get("frequency") ?? "DAILY").toUpperCase();
  const frequency = raw === "WEEKLY" ? "WEEKLY" : "DAILY";

  try {
    const result = await runDigest(frequency);
    return NextResponse.json({ ok: true, frequency, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, frequency, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
