export const dynamic = "force-dynamic";
/**
 * Cron — Balayage opérationnel quotidien (Vague 10).
 *
 * Déclenché par GitHub Actions (`.github/workflows/scheduled-ops.yml`) —
 * le plan Vercel hobby n'a pas de crons. Trois balayages idempotents :
 *
 *   1. Abonnements à cycle manuel expirés (mobile money) : active →
 *      past_due quand currentPeriodEnd + 3 j de grâce est dépassé. Le
 *      tier-gate (checkPaidTier) ne compte que les `active` — le client
 *      re-paie son cycle pour réactiver (extension par webhook).
 *   2. Recommandations PENDING > 30 j → EXPIRED (hygiène du catalogue).
 *   3. `?monthly=1` (workflow du 1er du mois) : émission des relevés MCP
 *      du mois CLOS pour toutes les clés actives (skip si déjà émis).
 */

import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { db } from "@/lib/db";

const GRACE_DAYS = 3;
const RECO_MAX_AGE_DAYS = 30;

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const monthly = url.searchParams.get("monthly") === "1";

  try {
    // ── 1. Cycles manuels expirés → past_due ──
    const graceCutoff = new Date(Date.now() - GRACE_DAYS * 24 * 3600 * 1000);
    const pastDue = await db.subscription.updateMany({
      where: {
        status: "active",
        providerSubscriptionId: { startsWith: "manual:" },
        currentPeriodEnd: { lt: graceCutoff },
      },
      data: { status: "past_due" },
    });

    // ── 2. Recos PENDING périmées → EXPIRED ──
    const recoCutoff = new Date(Date.now() - RECO_MAX_AGE_DAYS * 24 * 3600 * 1000);
    const expiredRecos = await db.recommendation.updateMany({
      where: { status: "PENDING", createdAt: { lt: recoCutoff } },
      data: { status: "EXPIRED" },
    });

    // ── 3. (mensuel) Relevés MCP du mois clos ──
    let statements: { issued: number; skipped: number; errors: number } | null = null;
    if (monthly) {
      const { issueStatement, currentPeriod } = await import(
        "@/server/services/anubis/mcp-billing"
      );
      const prev = new Date();
      prev.setUTCMonth(prev.getUTCMonth() - 1);
      const period = currentPeriod(prev);
      const keys = await db.mcpApiKey.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      statements = { issued: 0, skipped: 0, errors: 0 };
      for (const key of keys) {
        try {
          await issueStatement(key.id, period);
          statements.issued += 1;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("déjà émis")) statements.skipped += 1;
          else statements.errors += 1;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      subscriptionsPastDue: pastDue.count,
      recommendationsExpired: expiredRecos.count,
      ...(statements ? { mcpStatements: statements } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
