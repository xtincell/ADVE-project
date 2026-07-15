/**
 * La moulinette jusqu'au leaderboard — parcours turnkey d'une marque vers la
 * force révélée /200 (ADR-0149). Réutilisable (Motion19, Panzani, …).
 *
 *   npx tsx scripts/run-moulinette.ts <strategyId> [scale] [addressableAudience]
 *
 * Étapes :
 *   1. Résout la stratégie + sa ligue (secteur normalisé, échelle, pays).
 *   2. Si `scale` fourni ET `marketScale` non déclarée → DÉCLARE (ADR-0126 :
 *      l'échelle est déclarée par l'opérateur, jamais devinée). Sans arg et
 *      déjà déclarée → on garde le déclaré.
 *   3. Lance `scoreBrand(persist:true)` → un ScoreVerdict (leaderboard).
 *   4. Affiche le verdict + le placement dans la ligue.
 *
 * Frictions honnêtes attendues : une marque fraîchement onboardée sans épreuves
 * accumulées (superfans identifiés, transitions Overton, contests A/D/V) sort à
 * faible couverture — c'est la vérité (on révèle la force par les victoires, on
 * ne fabrique rien). Zéro LLM.
 */

import { db } from "@/lib/db";
import { scoreBrand, resolveLeagueForStrategy } from "@/server/services/seshat/scoreur";
import { MARKET_SCALES, type MarketScale } from "@/domain/market-scale";

function parseScale(raw: string | undefined): MarketScale | null {
  if (!raw) return null;
  const up = raw.toUpperCase();
  return (MARKET_SCALES as readonly string[]).includes(up) ? (up as MarketScale) : null;
}

async function main() {
  const [strategyId, scaleArg, audienceArg] = process.argv.slice(2);
  if (!strategyId) {
    console.error("usage: run-moulinette.ts <strategyId> [scale] [addressableAudience]");
    process.exit(1);
  }

  const strat = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { id: true, name: true, marketScale: true, countryCode: true, addressableAudience: true, client: { select: { sector: true } } },
  });
  if (!strat) {
    console.error(`Stratégie introuvable : ${strategyId}`);
    process.exit(1);
  }

  console.log(`\n▶ Moulinette — ${strat.name}`);
  console.log(`  secteur=${strat.client?.sector ?? "—"} · pays=${strat.countryCode ?? "—"} · échelle=${strat.marketScale ?? "NON DÉCLARÉE"}`);

  // ── Étape 2 : déclaration d'échelle (opérateur, ADR-0126) ──────────────────
  const declaredScale = parseScale(scaleArg);
  if (declaredScale && !strat.marketScale) {
    const addressable = audienceArg ? Math.round(Number(audienceArg)) : null;
    await db.strategy.update({
      where: { id: strategyId },
      data: {
        marketScale: declaredScale,
        ...(addressable && Number.isFinite(addressable) && addressable > 0 ? { addressableAudience: addressable } : {}),
      },
    });
    console.log(`  ✓ échelle DÉCLARÉE (opérateur) : ${declaredScale}${addressable ? ` · audience adressable ${addressable}` : ""}`);
  } else if (!strat.marketScale && !declaredScale) {
    console.log("  ⚠ échelle non déclarée — le classement sera INDICATIF (défaut). Passe un arg <scale> pour la déclarer.");
  }

  const league = await resolveLeagueForStrategy(strategyId);
  console.log(`  ligue : ${league.sectorSlug} · ${league.marketScale ?? "échelle non déclarée"} · ${league.countryCode ?? "—"}`);

  // ── Étape 3 : score (persist) ──────────────────────────────────────────────
  const r = await scoreBrand(strategyId, { persist: true });
  const v = r.verdict;
  console.log("\n  === VERDICT (force révélée) ===");
  console.log(`  force   : ${v.force}/200`);
  console.log(`  palier  : ${v.tier}${v.cappedReason ? ` (${v.cappedReason})` : ""}`);
  console.log(`  cohérence: ${v.coherence}   couverture: ${v.coveragePct}%`);
  console.log(`  arènes  : ${v.arenas.map((a) => `${a.arena}=${a.force}(${a.epreuveCount}é)`).join(" ")}`);
  console.log(`  superfans identifiés: ${r.superfanCount}   épreuves totales: ${r.epreuveCount}`);

  // ── Étape 4 : placement leaderboard ────────────────────────────────────────
  const leagueKey = { sectorSlug: league.sectorSlug, marketScale: league.marketScale, countryCode: league.countryCode };
  const peers = await db.scoreVerdict.findMany({
    where: { sectorSlug: leagueKey.sectorSlug, marketScale: leagueKey.marketScale, countryCode: leagueKey.countryCode },
    orderBy: { computedAt: "desc" },
  });
  // dernier verdict par sujet
  const latest = new Map<string, { label: string; force: number; id: string }>();
  for (const p of peers) {
    const key = p.subjectStrategyId ?? p.subjectBrandRefId ?? p.subjectLabel;
    if (!latest.has(key)) latest.set(key, { label: p.subjectLabel, force: p.force, id: p.subjectStrategyId ?? key });
  }
  const ranked = [...latest.values()].sort((a, b) => b.force - a.force);
  const rank = ranked.findIndex((x) => x.id === strategyId) + 1;
  console.log(`\n  === LEADERBOARD (ligue ${league.sectorSlug} · ${league.marketScale ?? "n.d."}) ===`);
  ranked.forEach((x, i) => {
    const me = x.id === strategyId ? " ◀ CETTE MARQUE" : "";
    console.log(`  #${i + 1}  ${x.force}/200  ${x.label}${me}`);
  });
  console.log(`\n✅ ${strat.name} historisé au leaderboard — rang ${rank}/${ranked.length} de sa ligue.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
