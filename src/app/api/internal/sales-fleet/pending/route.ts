export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SALES_RUN_BLOCKING_STATUSES, salesBudgetDay, salesRunAllowedToday } from "@/domain/sales-run-claimability";
import { isSalesWorkerRequest } from "../worker-auth";

/**
 * Signal de réveil de la flotte, lu toutes les quelques secondes entre deux tours
 * complets : les vendeurs IA actifs dont une mission attend et que `claimRun`
 * prendrait maintenant (même règle, `@/domain/sales-run-claimability`).
 * Identifiants seuls, aucune clé ni donnée client, aucun effet : il ne réveille
 * ni relance ni paiement (le roster le fait) et ne prend rien.
 */
export async function GET(request: Request) {
  if (!isSalesWorkerRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const queued = await db.salesRun.findMany({ where: { status: "QUEUED" }, distinct: ["representativeId"], select: { representativeId: true } });
  const ids = queued.map(row => row.representativeId);
  const [profiles, busy] = ids.length ? await Promise.all([
    db.salesRepresentative.findMany({ where: { id: { in: ids }, status: "ACTIVE", mode: "AI" }, select: {
      id: true, budgetDay: true, dailyTokensReserved: true, dailyRunsClaimed: true, dailyTokenBudget: true, dailyRunLimit: true, maxTokens: true,
    } }),
    db.salesRun.findMany({ where: { representativeId: { in: ids }, status: { in: [...SALES_RUN_BLOCKING_STATUSES] } }, distinct: ["representativeId"], select: { representativeId: true } }),
  ]) : [[], []];
  const blocked = new Set(busy.map(row => row.representativeId));
  const today = salesBudgetDay(new Date());
  const pending = profiles.filter(profile => !blocked.has(profile.id) && salesRunAllowedToday(profile, today)).map(profile => profile.id).sort();
  return NextResponse.json({ pending }, { headers: { "Cache-Control": "no-store" } });
}
