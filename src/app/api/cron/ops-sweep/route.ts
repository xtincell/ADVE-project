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
        // Audit 2026-07-16 `manual-wa-subscription-never-expires` : le filtre
        // « manual: » ratait la voie de production « manual-wa: » (et les
        // grants « admin-free: ») — une demande WhatsApp validée une fois
        // restait active À VIE. Tous les rails non-provider expirent ici.
        OR: [
          { providerSubscriptionId: { startsWith: "manual:" } },
          { providerSubscriptionId: { startsWith: "manual-wa:" } },
          { providerSubscriptionId: { startsWith: "admin-free:" } },
        ],
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

    // ── 4. Refresh nocturne des sections Oracle STALE (ADR-0137) ──
    // La cascade de staleness (ADR-0134) marque les sections COMPLETE→STALE
    // quand un pilier mute ; personne ne les régénérait automatiquement.
    // On ré-assemble scope=STALE UNIQUEMENT pour les stratégies qui ont des
    // sections périmées (ciblé, pas de balayage à vide). ASSEMBLE_ORACLE émet
    // GENERATE_ORACLE_SECTION × N (fallback composers déterministes ADR-0091
    // sans clés LLM). Best-effort par stratégie.
    const staleGroups = await db.oracleSection.groupBy({
      by: ["strategyId"],
      where: { status: "STALE" },
    });
    const oracleRefresh = { strategies: staleGroups.length, emitted: 0, skipped: 0, failed: 0 };
    if (staleGroups.length > 0) {
      const { emitIntent } = await import("@/server/services/mestor/intents");
      const strategies = await db.strategy.findMany({
        where: { id: { in: staleGroups.map((g) => g.strategyId) } },
        select: { id: true, operatorId: true },
      });
      const operatorById = new Map(strategies.map((s) => [s.id, s.operatorId]));
      for (const g of staleGroups) {
        const operatorId = operatorById.get(g.strategyId);
        if (!operatorId) {
          // Pas d'operator → pas de contexte d'assemblage (skip honnête).
          oracleRefresh.skipped += 1;
          continue;
        }
        try {
          await emitIntent(
            { kind: "ASSEMBLE_ORACLE", strategyId: g.strategyId, scope: "STALE", operatorId },
            { caller: "cron:ops-sweep:oracle-stale" },
          );
          oracleRefresh.emitted += 1;
        } catch {
          oracleRefresh.failed += 1;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      subscriptionsPastDue: pastDue.count,
      recommendationsExpired: expiredRecos.count,
      oracleStaleRefresh: oracleRefresh,
      ...(statements ? { mcpStatements: statements } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
