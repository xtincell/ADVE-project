/**
 * ADR-0149 — Leaderboard PUBLIC de la force révélée. Historise le dernier verdict
 * par marque, classé par force, PAR LIGUE (polity). Données de verdict seulement
 * (aucune PII). Server component, lecture directe (comme /b/[slug]).
 */
import "@/styles/leaderboard.css";
import { db } from "@/lib/db";
import { MARKET_SCALE_LABELS, type MarketScale } from "@/domain/market-scale";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Leaderboard — la force révélée des marques | La Fusée",
  description: "Le championnat des marques : force θ révélée par les épreuves du réel, par ligue. Zéro jury, zéro IA.",
};

interface Row {
  subjectLabel: string;
  force: number;
  tier: string;
  coherence: number;
  coveragePct: number;
  cappedReason: string | null;
  sectorSlug: string;
  marketScale: string | null;
  countryCode: string | null;
  subjectKey: string;
  computedAt: Date;
}

function leagueLabel(sectorSlug: string, marketScale: string | null, countryCode: string | null): string {
  const sector = sectorSlug.replace(/-/g, " ");
  const scale = marketScale ? MARKET_SCALE_LABELS[marketScale as MarketScale] : "échelle non déclarée";
  const country = countryCode ? ` · ${countryCode}` : "";
  return `${sector} · ${scale}${country}`;
}

export default async function LeaderboardPage() {
  const verdicts = await db.scoreVerdict.findMany({
    orderBy: { computedAt: "desc" },
    take: 1000,
  });

  // Dernier verdict par sujet.
  const latest = new Map<string, Row>();
  for (const v of verdicts) {
    const subjectKey = v.subjectStrategyId ?? v.subjectBrandRefId ?? v.subjectLabel;
    if (latest.has(subjectKey)) continue;
    latest.set(subjectKey, {
      subjectLabel: v.subjectLabel,
      force: v.force,
      tier: v.tier,
      coherence: v.coherence,
      coveragePct: v.coveragePct,
      cappedReason: v.cappedReason,
      sectorSlug: v.sectorSlug,
      marketScale: v.marketScale,
      countryCode: v.countryCode,
      subjectKey,
      computedAt: v.computedAt,
    });
  }

  // Regroupe par ligue, classe par force.
  const byLeague = new Map<string, Row[]>();
  for (const row of latest.values()) {
    const key = `${row.sectorSlug}|${row.marketScale ?? "*"}|${row.countryCode ?? "*"}`;
    const arr = byLeague.get(key) ?? [];
    arr.push(row);
    byLeague.set(key, arr);
  }
  const leagues = [...byLeague.entries()]
    .map(([key, rows]) => ({ key, rows: rows.sort((a, b) => b.force - a.force) }))
    .sort((a, b) => (b.rows[0]?.force ?? 0) - (a.rows[0]?.force ?? 0));

  return (
    <main className="lb">
      <div className="lb__wrap">
        <div className="lb__eyebrow">La Fusée · la force révélée · zéro jury, zéro IA</div>
        <h1 className="lb__title">
          Un <em>championnat</em>, pas un jury.
        </h1>
        <p className="lb__lede">
          La force d&apos;une marque ne se note pas — elle se révèle par les épreuves qu&apos;elle gagne
          ou perd dans le réel. Voici le classement, par ligue, à force θ révélée (Bradley-Terry
          ancré sur les étalons). Chaque score se lit avec sa couverture d&apos;épreuves.
        </p>

        <div className="lb__cta">
          <div className="lb__cta-txt">
            <strong>Où se classe VOTRE marque ?</strong>
            <span>Scorez-la gratuitement en 30 secondes — sans email.</span>
          </div>
          <a href="/scorer" className="lb__ctabtn">Scorer ma marque</a>
        </div>

        {leagues.length === 0 ? (
          <div className="lb__empty">Aucun verdict historisé pour l&apos;instant.</div>
        ) : (
          leagues.map((league) => {
            const first = league.rows[0]!;
            return (
              <section className="lb__league" key={league.key}>
                <h2>{leagueLabel(first.sectorSlug, first.marketScale, first.countryCode)}</h2>
                <div className="lb__tablewrap">
                  <table className="lb__table">
                    <thead>
                      <tr>
                        <th className="lb__rank">#</th>
                        <th>Marque</th>
                        <th>Palier</th>
                        <th>Force</th>
                        <th>Couverture</th>
                        <th>Cohérence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {league.rows.map((row, i) => (
                        <tr key={row.subjectKey}>
                          <td className="lb__rank">{i + 1}</td>
                          <td className="lb__brand">
                            {row.subjectLabel}
                            {row.cappedReason ? <div className="lb__cap">{row.cappedReason}</div> : null}
                          </td>
                          <td>
                            <span className="lb__tier">{row.tier}</span>
                          </td>
                          <td className="lb__force">{row.force}/200</td>
                          <td className="lb__cov">{row.coveragePct}%</td>
                          <td className="lb__cov">{row.coherence}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })
        )}

        <div className="lb__method">
          <h3>Comment lire ce classement</h3>
          <p>
            <strong>Force θ</strong> = le nombre qui explique le mieux l&apos;ensemble des résultats
            observés (recherche, premium, rétention, cadre culturel), ancré sur des étalons à θ fixé.
          </p>
          <p>
            <strong>Couverture</strong> = part des 5 arènes (A·D·V·E·T) où la marque a réellement
            joué des épreuves. Peu d&apos;épreuves ⇒ incertitude large — un score se publie toujours
            avec sa couverture.
          </p>
          <p>
            <strong>Palier</strong> = min(bande de force, items must-have franchis). Une force haute
            sans les portes franchies reste plafonnée. Chaque marque est mesurée dans SA ligue.
          </p>
        </div>
      </div>
    </main>
  );
}
