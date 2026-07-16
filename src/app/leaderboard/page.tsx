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

interface ArenaRow {
  arena: string;
  force: number;
  rd: number;
  epreuveCount: number;
  wins: number;
  losses: number;
}

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
  /** Le palmarès — la PREUVE du verdict (persisté depuis toujours, jamais
      projeté avant l'audit 2026-07-16 `leaderboard-palmares-jete`). */
  arenas: ArenaRow[];
  gates: Array<{ label: string; ok: boolean }>;
  epreuveCount: number;
}

const ARENA_LABELS: Record<string, string> = {
  A: "Authenticité",
  D: "Distinction",
  V: "Valeur",
  E: "Engagement",
  T: "Track",
};

function toArenas(value: unknown): ArenaRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
    .map((a) => ({
      arena: String(a.arena ?? ""),
      force: typeof a.force === "number" ? a.force : 0,
      rd: typeof a.rd === "number" ? a.rd : 0,
      epreuveCount: typeof a.epreuveCount === "number" ? a.epreuveCount : 0,
      wins: typeof a.wins === "number" ? a.wins : 0,
      losses: typeof a.losses === "number" ? a.losses : 0,
    }));
}

function toGates(value: unknown): Array<{ label: string; ok: boolean }> {
  if (!Array.isArray(value)) return [];
  return value
    .filter((g): g is Record<string, unknown> => !!g && typeof g === "object")
    .map((g) => ({ label: String(g.label ?? ""), ok: Boolean(g.ok) }));
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
      arenas: toArenas(v.arenas),
      gates: toGates(v.gates),
      epreuveCount: v.epreuveCount,
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

        {/* Copy honnête (audit 2026-07-16 `cta-scorer-fausse-promesse`) : /scorer
            donne un score d'empreinte /100 instantané — l'entrée AU CHAMPIONNAT
            passe par une mesure officielle (épreuves validées). Ne pas promettre
            l'un pour l'autre. */}
        <div className="lb__cta">
          <div className="lb__cta-txt">
            <strong>Où se classe VOTRE marque ?</strong>
            <span>
              Commencez par scorer votre empreinte publique — gratuit, 30 secondes, sans email.
              L&apos;entrée au championnat se fait ensuite, par une mesure officielle sur épreuves.
            </span>
          </div>
          <a href="/scorer" className="lb__ctabtn">Scorer mon empreinte</a>
        </div>

        {leagues.length === 0 ? (
          <div className="lb__empty">
            <strong>Le championnat n&apos;a pas encore de participants.</strong>
            <span>
              Le classement se remplit dès qu&apos;une marque est mesurée par une épreuve du réel
              (mesure officielle, validée par un opérateur). En attendant, scorez votre empreinte
              publique — gratuit, instantané — puis demandez votre mesure officielle.
            </span>
            <a href="/scorer" className="lb__ctabtn">Scorer mon empreinte — gratuit</a>
          </div>
        ) : (
          leagues.map((league) => {
            const first = league.rows[0]!;
            return (
              <section className="lb__league" key={league.key}>
                <h2>{leagueLabel(first.sectorSlug, first.marketScale, first.countryCode)}</h2>
                <div className="lb__tablewrap">
                  {/* Grille dépliable (zéro JS) : chaque ligne s'ouvre sur son
                      PALMARÈS — arènes, victoires/défaites, portes, épreuves.
                      Le verdict n'est plus un chiffre nu (audit 2026-07-16). */}
                  <div className="lb__gridhead" aria-hidden>
                    <span className="lb__rank">#</span>
                    <span>Marque</span>
                    <span>Palier</span>
                    <span>Force</span>
                    <span>Couverture</span>
                    <span>Cohérence</span>
                  </div>
                  {league.rows.map((row, i) => (
                    <details className="lb__row-details" key={row.subjectKey}>
                      <summary>
                        <div className="lb__sumrow">
                          <span className="lb__rank">{i + 1}</span>
                          <span className="lb__brand">
                            <span className="lb__chev" aria-hidden>▸</span> {row.subjectLabel}
                            {row.cappedReason ? <span className="lb__cap"> · {row.cappedReason}</span> : null}
                          </span>
                          <span><span className="lb__tier">{row.tier}</span></span>
                          <span className="lb__force">{row.force}/200</span>
                          <span className="lb__cov">{row.coveragePct}%</span>
                          <span className="lb__cov">{row.coherence}</span>
                        </div>
                      </summary>
                      <div className="lb__palmares">
                        {row.arenas.length > 0 ? (
                          <>
                            <p className="lb__palmares-h">Palmarès par arène</p>
                            <div className="lb__arenas">
                              {row.arenas.map((a) => (
                                <div className="lb__arena" key={a.arena}>
                                  <b>{ARENA_LABELS[a.arena] ?? a.arena}</b>
                                  <span className="lb__wl">{a.wins}V · {a.losses}D</span>
                                  <span>force {Math.round(a.force * 10) / 10}/25 ±{Math.round(a.rd * 10) / 10}</span>
                                  <span>{a.epreuveCount} épreuve{a.epreuveCount > 1 ? "s" : ""}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : null}
                        {row.gates.length > 0 ? (
                          <>
                            <p className="lb__palmares-h">Portes de palier</p>
                            <div className="lb__gates">
                              {row.gates.map((g) => (
                                <span className="lb__gate" data-ok={g.ok ? "1" : "0"} key={g.label}>
                                  {g.ok ? "✓" : "—"} {g.label}
                                </span>
                              ))}
                            </div>
                          </>
                        ) : null}
                        <p className="lb__palmares-meta">
                          {row.epreuveCount} épreuve{row.epreuveCount > 1 ? "s" : ""} au total ·
                          mesuré le {row.computedAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      </div>
                    </details>
                  ))}
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
