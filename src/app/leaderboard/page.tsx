/**
 * ADR-0149 — Leaderboard PUBLIC de la force révélée. Historise le dernier verdict
 * par marque, classé par force, PAR LIGUE (polity). Données de verdict seulement
 * (aucune PII). Server component, lecture directe (comme /b/[slug]).
 */
import "@/styles/leaderboard.css";
import { db } from "@/lib/db";
import { type MarketScale } from "@/domain/market-scale";
import { listPublicDossiers } from "@/server/services/seshat/argos";
import { NewsletterCapture } from "@/components/public/newsletter-capture";
import { getServerLocale } from "@/lib/i18n/server";
import { t, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Leaderboard — la force révélée des marques | La Fusée",
  description: "Le championnat des marques : force θ révélée par les épreuves du réel, par ligue. Zéro jury, zéro IA.",
  openGraph: {
    title: "Le championnat des marques — La Fusée",
    description: "Force révélée par les épreuves du réel, par ligue. Zéro jury, zéro IA. Où se classe votre marque ?",
  },
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

const ARENA_KEYS: Record<string, string> = {
  A: "lb.arena.A",
  D: "lb.arena.D",
  V: "lb.arena.V",
  E: "lb.arena.E",
  T: "lb.arena.T",
};

const SCALE_KEYS: Record<MarketScale, string> = {
  QUARTIER: "lb.scale.QUARTIER",
  VILLE: "lb.scale.VILLE",
  REGION: "lb.scale.REGION",
  NATION: "lb.scale.NATION",
  CONTINENT: "lb.scale.CONTINENT",
  MONDE: "lb.scale.MONDE",
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

function leagueLabel(sectorSlug: string, marketScale: string | null, countryCode: string | null, locale: Locale): string {
  const sector = sectorSlug.replace(/-/g, " ");
  const scaleKey = marketScale && marketScale in SCALE_KEYS ? SCALE_KEYS[marketScale as MarketScale] : "lb.scale.undeclared";
  const scale = t(scaleKey, locale);
  const country = countryCode ? ` · ${countryCode}` : "";
  return `${sector} · ${scale}${country}`;
}

function fmtDate(d: Date, locale: Locale): string {
  const intl = locale === "en" ? "en-GB" : locale === "zh" ? "zh-CN" : "fr-FR";
  return d.toLocaleDateString(intl, { day: "numeric", month: "long", year: "numeric" });
}

export default async function LeaderboardPage() {
  const locale = await getServerLocale();
  const verdicts = await db.scoreVerdict.findMany({
    orderBy: { computedAt: "desc" },
    take: 1000,
  });
  // Phase A état-final — le championnat et sa rédaction sont UN média :
  // les derniers dossiers Argos publiés (PASS uniquement) en pied de page.
  const dossiers = await listPublicDossiers({ limit: 3 }).catch(() => []);

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
        <div className="lb__eyebrow">{t("lb.eyebrow", locale)}</div>
        <h1 className="lb__title">
          {t("lb.title.before", locale)}<em>{t("lb.title.em", locale)}</em>{t("lb.title.after", locale)}
        </h1>
        <p className="lb__lede">
          {t("lb.lede", locale)}
        </p>

        {/* Copy honnête (audit 2026-07-16 `cta-scorer-fausse-promesse`) : /scorer
            donne un score d'empreinte /100 instantané — l'entrée AU CHAMPIONNAT
            passe par une mesure officielle (épreuves validées). Ne pas promettre
            l'un pour l'autre. */}
        <div className="lb__cta">
          <div className="lb__cta-txt">
            <strong>{t("lb.cta.title", locale)}</strong>
            <span>
              {t("lb.cta.body", locale)}
            </span>
          </div>
          <a href="/scorer" className="lb__ctabtn">{t("lb.cta.btn", locale)}</a>
        </div>

        {leagues.length === 0 ? (
          <div className="lb__empty">
            <strong>{t("lb.empty.title", locale)}</strong>
            <span>
              {t("lb.empty.body", locale)}
            </span>
            <a href="/scorer" className="lb__ctabtn">{t("lb.empty.btn", locale)}</a>
          </div>
        ) : (
          leagues.map((league) => {
            const first = league.rows[0]!;
            return (
              <section className="lb__league" key={league.key}>
                <h2>{leagueLabel(first.sectorSlug, first.marketScale, first.countryCode, locale)}</h2>
                <div className="lb__tablewrap">
                  {/* Grille dépliable (zéro JS) : chaque ligne s'ouvre sur son
                      PALMARÈS — arènes, victoires/défaites, portes, épreuves.
                      Le verdict n'est plus un chiffre nu (audit 2026-07-16). */}
                  <div className="lb__gridhead" aria-hidden>
                    <span className="lb__rank">#</span>
                    <span>{t("lb.col.brand", locale)}</span>
                    <span>{t("lb.col.tier", locale)}</span>
                    <span>{t("lb.col.force", locale)}</span>
                    <span>{t("lb.col.coverage", locale)}</span>
                    <span>{t("lb.col.coherence", locale)}</span>
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
                            <p className="lb__palmares-h">{t("lb.palmares.title", locale)}</p>
                            <div className="lb__arenas">
                              {row.arenas.map((a) => (
                                <div className="lb__arena" key={a.arena}>
                                  <b>{ARENA_KEYS[a.arena] ? t(ARENA_KEYS[a.arena]!, locale) : a.arena}</b>
                                  <span className="lb__wl">{a.wins}{t("lb.palmares.win", locale)} · {a.losses}{t("lb.palmares.loss", locale)}</span>
                                  <span>{t("lb.palmares.force", locale)} {Math.round(a.force * 10) / 10}/25 ±{Math.round(a.rd * 10) / 10}</span>
                                  <span>{a.epreuveCount} {t(a.epreuveCount > 1 ? "lb.trial.many" : "lb.trial.one", locale)}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : null}
                        {row.gates.length > 0 ? (
                          <>
                            <p className="lb__palmares-h">{t("lb.gates.title", locale)}</p>
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
                          {row.epreuveCount} {t(row.epreuveCount > 1 ? "lb.trial.many" : "lb.trial.one", locale)}{t("lb.meta.totalSuffix", locale)} ·
                          {" "}{t("lb.meta.measured", locale)} {fmtDate(row.computedAt, locale)}
                        </p>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            );
          })
        )}

        {/* Phase A état-final — la rédaction du championnat : derniers dossiers
            Argos publiés (PASS + revue), et la newsletter possédée en propre. */}
        {dossiers.length > 0 ? (
          <section className="lb__league">
            <h2>{t("lb.argos.title", locale)}</h2>
            <div className="lb__tablewrap">
              {dossiers.map((d) => (
                <a key={d.ref} href={`/argos/${d.ref}`} className="lb__row-details" style={{ display: "block", padding: "12px 16px", textDecoration: "none", color: "inherit" }}>
                  <strong>{d.brand}</strong>
                  {d.campaign ? <span> — {d.campaign}</span> : null}
                  {d.sector ? <span className="lb__cap"> · {d.sector}</span> : null}
                </a>
              ))}
            </div>
            <p className="lb__lede" style={{ marginTop: 12 }}>
              <a href="/argos" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>{t("lb.argos.all", locale)}</a>
            </p>
          </section>
        ) : null}

        <div className="lb__cta" style={{ marginTop: 24 }}>
          <div className="lb__cta-txt">
            <strong>{t("lb.newsletter.title", locale)}</strong>
            <span>{t("lb.newsletter.body", locale)}</span>
          </div>
          <NewsletterCapture source="leaderboard" />
        </div>

        <p className="lb__lede" style={{ marginTop: 16 }}>
          <a href="/paris" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
            {t("lb.parisLink", locale)}
          </a>
        </p>

        <div className="lb__method">
          <h3>{t("lb.method.title", locale)}</h3>
          <p>
            <strong>{t("lb.method.force.term", locale)}</strong> {t("lb.method.force.def", locale)}
          </p>
          <p>
            <strong>{t("lb.method.coverage.term", locale)}</strong> {t("lb.method.coverage.def", locale)}
          </p>
          <p>
            <strong>{t("lb.method.tier.term", locale)}</strong> {t("lb.method.tier.def", locale)}
          </p>
        </div>
      </div>
    </main>
  );
}
