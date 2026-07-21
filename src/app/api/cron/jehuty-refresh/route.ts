export const dynamic = "force-dynamic";
/**
 * Cron — Rafraîchit la Gazette (`jehuty.feed`) de toutes les marques actives.
 *
 * Ferme le trou « la marque est initiée depuis des jours mais la Gazette reste
 * vide » : avant ce cron, l'Intent `JEHUTY_FEED_REFRESH` était déclaré sans
 * handler et AUCUN process ne peuplait les 6 rubriques. Chaque passage exécute,
 * par marque et best-effort, les producteurs déterministes (veille externe,
 * diagnostic, score+drift, signaux marché depuis l'audience réelle, signaux
 * faibles dérivés de la veille). 100 % vraie donnée, zéro fabrication
 * (ADR-0046/0134).
 *
 * Recommandations (unique étape LLM) : OPT-IN via `?recos=1` — coupées par
 * défaut pour garder le passage quotidien déterministe et bon marché ; le
 * fondateur les déclenche à la demande via le bouton « Rafraîchir » du Cockpit.
 *
 * Déclenchement :
 *   - Self-host (pm2/Coolify) : curl avec CRON_SECRET, 1×/jour (matin).
 *   - Vercel : { "path": "/api/cron/jehuty-refresh", "schedule": "0 6 * * *" }.
 */
import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { claimOnce } from "@/lib/redis";
import { db } from "@/lib/db";
import { refreshBrandGazette } from "@/server/services/jehuty/refresh";

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Sérialisation : un seul tick concurrent (le lot peut être long).
  if (!(await claimOnce("cron:jehuty-refresh:tick", 1800))) {
    return NextResponse.json({ skipped: "already-running" });
  }

  const withRecos = new URL(request.url).searchParams.get("recos") === "1";

  const strategies = await db.strategy.findMany({
    where: { status: "ACTIVE", isDummy: false },
    select: { id: true, name: true },
  });

  let refreshed = 0;
  let filledSections = 0;
  const errors: Array<{ strategyId: string; error: string }> = [];
  for (const s of strategies) {
    try {
      const res = await refreshBrandGazette(s.id, { withRecos, force: true });
      refreshed += 1;
      filledSections += res.sections.filter((x) => x.status === "FILLED").length;
    } catch (e) {
      errors.push({ strategyId: s.id, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({
    ok: true,
    strategies: strategies.length,
    refreshed,
    filledSections,
    withRecos,
    errors: errors.slice(0, 20),
  });
}
