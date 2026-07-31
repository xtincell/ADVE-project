/**
 * Recalcul des scores d'intakes déjà produits (utilitaire opérateur,
 * guardé `CRON_SECRET` — même esprit que `/api/admin/prod-finish`).
 *
 * ── Pourquoi (2026-07-31) ──
 *
 * Un correctif de calcul ne répare que les rapports À VENIR. Après l'ADR-0189,
 * les rapports déjà livrés gardaient en base le vecteur faux : Irawo affichait
 * `e = 0` alors que le même contenu, recompté, donne 3,25. Un rapport payant
 * continuait de porter un chiffre que le code savait faux.
 *
 * **Aucun appel externe, aucun LLM, aucune re-collecte** : on ne re-scanne pas,
 * on RECOMPTE ce qui est déjà en base. Gratuit et idempotent — deux exécutions
 * successives rendent le même résultat.
 *
 * POST /api/admin/rescore-intakes?token=<shareToken>
 * POST /api/admin/rescore-intakes?all=1&limit=50
 * POST /api/admin/rescore-intakes?token=<shareToken>&mode=rescan
 *   Header: Authorization: Bearer <CRON_SECRET>
 *
 * ── `mode=rescan` : re-collecte COMPLÈTE ──
 *
 * Le recalcul (défaut) est gratuit mais ne ramasse rien de neuf : il recompte
 * ce qui est déjà en base. Le rescan relance la collecte publique ET la
 * ré-extraction — il **consomme** donc des appels externes (Apify, PageSpeed,
 * Maps) et des jetons LLM. À réserver aux cas où le COLLECTEUR a changé, pas
 * seulement le calcul.
 *
 * `regenerateAnalysis` n'était exposé qu'en `adminProcedure` tRPC, donc
 * inatteignable sans session navigateur — d'où cette porte serveur, guardée
 * par le même secret que le reste des utilitaires opérateur.
 *
 * La réponse porte l'AVANT et l'APRÈS de chaque intake : un recalcul muet
 * serait invérifiable, et c'est précisément ce qu'on reproche au défaut qu'il
 * corrige.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { verifyCronSecret } from "@/lib/cron-auth";
import { rescoreIntake, regenerateAnalysis } from "@/server/services/quick-intake";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Borne de sécurité : un recalcul de masse reste une écriture en base. */
const MAX_BATCH = 100;

export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const all = url.searchParams.get("all") === "1";
  const rescan = url.searchParams.get("mode") === "rescan";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 25) || 25, MAX_BATCH);

  if (!token && !all) {
    return NextResponse.json({ error: "Passer ?token=<shareToken> ou ?all=1" }, { status: 400 });
  }

  // Un rescan consomme des appels externes payants : il reste NOMINATIF. Le
  // lancer en masse par mégarde coûterait un budget Apify sans que personne
  // l'ait décidé.
  if (rescan && !token) {
    return NextResponse.json(
      { error: "mode=rescan exige ?token=<shareToken> — la re-collecte est payante, jamais en masse" },
      { status: 400 },
    );
  }

  if (rescan && token) {
    const before = await db.quickIntake.findUnique({
      where: { shareToken: token },
      select: { companyName: true, advertis_vector: true },
    });

    // ── Vider le cache d'empreinte, sinon le rescan ne rescanne pas ──
    //
    // Mesuré en production le 2026-07-31 : un premier `mode=rescan` a tourné
    // 156 s sans rien recollecter. `complete()` reprend `intake.webFootprint`
    // quand il existe et SAUTE la collecte — seule la ré-extraction LLM avait
    // tourné. Le pilier E restait sans `structured` ni `feed`, avec 4 réseaux
    // au lieu de 5, alors que le collecteur corrigé était bien déployé.
    //
    // Une porte qui annonce « rescan » et sert du cache ment sur ce qu'elle
    // fait : c'est le reproche adressé au reste du système, il ne peut pas
    // valoir pour l'outillage.
    await db.quickIntake.update({
      where: { shareToken: token },
      data: { webFootprint: Prisma.DbNull },
    });

    const r = await regenerateAnalysis(token, { force: true });
    const after = await db.quickIntake.findUnique({
      where: { shareToken: token },
      select: { advertis_vector: true, diagnostic: true },
    });
    const beforeVec = (before?.advertis_vector ?? null) as Record<string, number> | null;
    const afterVec = (after?.advertis_vector ?? null) as Record<string, number> | null;
    return NextResponse.json({
      mode: "rescan",
      token,
      companyName: before?.companyName ?? null,
      strategyId: r.strategyId,
      classification: r.classification,
      before: beforeVec,
      after: afterVec,
    });
  }

  const tokens: string[] = token
    ? [token]
    : (
        await db.quickIntake.findMany({
          where: { status: "COMPLETED", convertedToId: { not: null } },
          orderBy: { createdAt: "desc" },
          take: limit,
          select: { shareToken: true },
        })
      )
        .map((i) => i.shareToken)
        .filter((t): t is string => Boolean(t));

  const results: Array<Record<string, unknown>> = [];
  for (const t of tokens) {
    try {
      const r = await rescoreIntake(t);
      const beforeE = r.before?.e ?? null;
      const afterE = r.after.e ?? 0;
      results.push({
        token: t,
        companyName: r.companyName,
        e: { before: beforeE, after: afterE },
        composite: { before: r.before?.composite ?? null, after: r.after.composite ?? 0 },
        level: { before: r.levelBefore, after: r.levelAfter },
        changed: beforeE !== afterE || r.before?.composite !== r.after.composite,
      });
    } catch (err) {
      // Un intake illisible ne doit pas arrêter le lot — et son échec est DIT,
      // jamais avalé.
      results.push({ token: t, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({
    scanned: results.length,
    changed: results.filter((r) => r.changed === true).length,
    failed: results.filter((r) => r.error).length,
    results,
  });
}
