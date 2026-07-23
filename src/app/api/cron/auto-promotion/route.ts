export const dynamic = "force-dynamic";
/**
 * Cron — Auto-promotion (ADR-0066).
 *
 * Cadence : toutes les 6 h — `scheduled-ops.yml` (sixhourly) + `ops-daemon.ts`
 * (cadence "sixhourly"). Gardé time/cycle/quality → un tick plus fréquent est
 * inoffensif (idempotent). Pas de `vercel.json` dans ce repo (round-15b : commentaire
 * « daily/vercel.json » corrigé).
 * Évalue les 3 résidus calendar-locked (DRAFT→STABLE sequences/wrappers
 * + quality-gate soft→hard) et émet les Intents de promotion via
 * `mestor.emitIntent({ kind: "AUTO_PROMOTION_EVALUATE" })`.
 *
 * En mode dry-run par défaut (sécurité). Pour exécuter réellement :
 *  - Requête avec header `x-auto-promotion-mode: live` (admin-only)
 *  - OU env `AUTO_PROMOTION_LIVE=true` (cron production)
 *
 * Respecte ADR-0040+0041+0042 : zero force-promotion. Les conditions
 * de temps + cycle + qualité sont évaluées strictement par le module
 * `auto-promotion`.
 */

import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";

function isLiveMode(request: Request): boolean {
  if (process.env.AUTO_PROMOTION_LIVE === "true") return true;
  return request.headers.get("x-auto-promotion-mode") === "live";
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = !isLiveMode(request);
  const startedAt = new Date().toISOString();

  try {
    const { emitIntent } = await import("@/server/services/mestor/intents");
    const result = await emitIntent(
      {
        kind: "AUTO_PROMOTION_EVALUATE",
        strategyId: "(governance)",
        operatorId: "system-cron-auto-promotion",
        dryRun,
      },
      { caller: "cron:auto-promotion" },
    );

    return NextResponse.json({
      ok: true,
      startedAt,
      completedAt: new Date().toISOString(),
      mode: dryRun ? "DRY_RUN" : "LIVE",
      intent: {
        status: result.status,
        summary: result.summary,
        output: result.output,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        startedAt,
        completedAt: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
