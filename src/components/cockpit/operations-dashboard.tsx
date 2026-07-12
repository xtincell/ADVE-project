"use client";

/**
 * Dashboard OPÉRATIONNEL (mandat opérateur 2026-07-12 — « un Dashboard
 * stratégique et un Dashboard opérationnel ») : la vue « ce qui se passe
 * aujourd'hui » calquée sur la référence visuelle (campagne du moment,
 * tuiles d'activité, courbe communauté, répartition, publications, veille,
 * réseaux). Chaque bloc consomme une source RÉELLE du système ; ce qui n'a
 * pas de source branchée (portée/engagement par post, ventes) l'affiche
 * honnêtement avec le geste qui le débloque — jamais un chiffre inventé.
 */
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { CampaignShowcase } from "@/components/cockpit/campaign-showcase";
import { SocialHubCard } from "@/components/cockpit/social/social-hub-card";
import { MarketFeedCard } from "@/components/cockpit/social/market-feed-card";
import {
  Users, CalendarClock, Rocket, Radio, TrendingUp, ShoppingCart,
  ListChecks, ArrowRight,
} from "lucide-react";

const PLATFORM_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook", INSTAGRAM: "Instagram", TIKTOK: "TikTok",
  YOUTUBE: "YouTube", X: "X", LINKEDIN: "LinkedIn",
};

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 10_000) return `${Math.round(n / 1000)} k`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)} k`;
  return String(n);
}

function fmtDay(iso: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }); }
  catch { return "—"; }
}

/** Courbe multi-plateformes minimaliste (SVG pur, couleurs via classes tokens). */
function CommunityChart({ series }: {
  series: Array<{ platform: string; followers: number; at: string }>;
}) {
  const byPlatform = new Map<string, Array<{ t: number; v: number }>>();
  for (const p of series) {
    const arr = byPlatform.get(p.platform) ?? [];
    arr.push({ t: new Date(p.at).getTime(), v: p.followers });
    byPlatform.set(p.platform, arr);
  }
  const all = [...byPlatform.values()].flat();
  if (all.length === 0) return null;
  const tMin = Math.min(...all.map((p) => p.t));
  const tMax = Math.max(...all.map((p) => p.t));
  const vMax = Math.max(...all.map((p) => p.v), 1);
  const W = 560, H = 120, PAD = 6;
  const x = (t: number) => tMax === tMin ? W / 2 : PAD + ((t - tMin) / (tMax - tMin)) * (W - 2 * PAD);
  const y = (v: number) => H - PAD - (v / vMax) * (H - 2 * PAD);

  return (
    <svg className="ck-ops__chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Évolution des abonnés par réseau">
      {[...byPlatform.entries()].map(([platform, pts], i) => {
        const sorted = [...pts].sort((a, b) => a.t - b.t);
        const d = sorted.map((p, j) => `${j === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
        return (
          <g key={platform} className={`ck-ops__line ck-ops__line--${(i % 4) + 1}`}>
            <path d={d} fill="none" strokeWidth="2" strokeLinecap="round" />
            {sorted.map((p) => (
              <circle key={p.t} cx={x(p.t)} cy={y(p.v)} r="3" />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export function OperationsDashboard({ strategyId }: { strategyId: string }) {
  const { data, isLoading } = trpc.cockpitDashboard.getOperationsSnapshot.useQuery(
    { strategyId },
    { staleTime: 60_000 },
  );

  const community = data?.community;
  const calendar = data?.calendar;
  const platforms = community?.platforms ?? [];
  const total = community?.totalFollowers ?? 0;

  return (
    <div className="ck-dash">
      {/* ── Campagne du moment + créations récentes ─────────────── */}
      <CampaignShowcase strategyId={strategyId} />

      {/* ── Tuiles d'activité (sources réelles ; la portée se débloque
             en connectant les réseaux — état honnête, pas de zéro fabriqué) */}
      <div className="ck-grid ck-ops__tiles">
        <div className="ck-card ck-ops__tile">
          <p className="ck-ops__tile-k"><Users />Communauté</p>
          <p className="ck-ops__tile-v">{isLoading ? "…" : fmtCount(total)}</p>
          <p className="ck-ops__tile-d">
            {community?.totalDelta != null
              ? <span className="ck-ops__delta" data-up={community.totalDelta >= 0 ? 1 : 0}>{community.totalDelta >= 0 ? "+" : ""}{fmtCount(community.totalDelta)} depuis le dernier relevé</span>
              : "abonnés cumulés"}
          </p>
        </div>
        <div className="ck-card ck-ops__tile">
          <p className="ck-ops__tile-k"><CalendarClock />Publications à venir</p>
          <p className="ck-ops__tile-v">{isLoading ? "…" : calendar?.upcoming.length ?? 0}</p>
          <p className="ck-ops__tile-d">planifiées sous 14 jours</p>
        </div>
        <div className="ck-card ck-ops__tile">
          <p className="ck-ops__tile-k"><Rocket />Missions actives</p>
          <p className="ck-ops__tile-v">{isLoading ? "…" : data?.openMissions ?? 0}</p>
          <p className="ck-ops__tile-d">confiées à votre équipe</p>
        </div>
        {data?.posts && data.posts.count > 0 ? (
          <div className="ck-card ck-ops__tile">
            <p className="ck-ops__tile-k"><TrendingUp />Engagement récent</p>
            <p className="ck-ops__tile-v">{fmtCount(data.posts.totalEngagement)}</p>
            <p className="ck-ops__tile-d">
              sur {data.posts.count} publications collectées
              {data.posts.totalReach > 0 ? ` · ${fmtCount(data.posts.totalReach)} vues` : ""}
            </p>
          </div>
        ) : (
          <div className="ck-card ck-ops__tile ck-ops__tile--deferred">
            <p className="ck-ops__tile-k"><TrendingUp />Portée & engagement</p>
            <p className="ck-ops__tile-v ck-ops__tile-v--muted">à connecter</p>
            <p className="ck-ops__tile-d">
              <Link href="/cockpit#reseaux" className="ck-card__link">Connectez vos réseaux <ArrowRight /></Link>
            </p>
          </div>
        )}
      </div>

      {/* ── Courbe communauté + répartition par réseau ──────────── */}
      <div className="ck-grid ck-grid--2">
        <div className="ck-card">
          <p className="ck-card__eyebrow"><TrendingUp />Évolution de la communauté</p>
          {community?.hasHistory ? (
            <CommunityChart series={community.series} />
          ) : platforms.length > 0 ? (
            <p className="ck-ops__note">
              Premier relevé enregistré — l&apos;historique se construit à chaque
              actualisation de vos réseaux (la courbe apparaît dès deux relevés).
            </p>
          ) : (
            <p className="ck-ops__note">Connectez vos réseaux pour suivre votre communauté ici.</p>
          )}
        </div>
        <div className="ck-card">
          <p className="ck-card__eyebrow"><Radio />Répartition par réseau</p>
          {platforms.length > 0 ? (
            <div className="ck-ops__split">
              {platforms.map((p) => {
                // lafusee:allow-adhoc-completion: part d'audience par réseau (répartition), pas une complétion pilier
                const pct = total > 0 ? Math.round((p.followers / total) * 100) : 0;
                return (
                  <div className="ck-ops__split-row" key={p.platform}>
                    <span className="ck-ops__split-name">{PLATFORM_LABELS[p.platform] ?? p.platform}</span>
                    <span className="ck-ops__split-bar"><span style={{ width: `${pct}%` }} /></span>
                    <span className="ck-ops__split-val">{fmtCount(p.followers)} · {pct}%</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="ck-ops__note">Aucun relevé d&apos;audience pour le moment.</p>
          )}
        </div>
      </div>

      {/* ── Meilleures publications (réelles — dès la première collecte) ── */}
      {data?.posts && data.posts.top.length > 0 && (
        <div className="ck-card">
          <p className="ck-card__eyebrow"><TrendingUp />Meilleures publications</p>
          <div className="ck-ops__list">
            {data.posts.top.map((p) => (
              <div className="ck-ops__row" key={p.id}>
                <span className="ck-ops__row-date">{PLATFORM_LABELS[p.platform] ?? p.platform}</span>
                <span className="ck-ops__row-title">{p.content ?? "(sans texte)"}</span>
                <span className="ck-ops__split-val">
                  {fmtCount(p.engagement)} interactions{p.reach > 0 ? ` · ${fmtCount(p.reach)} vues` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Calendrier éditorial (réel) + Ventes (non branché, honnête) ── */}
      <div className="ck-grid ck-grid--2">
        <div className="ck-card">
          <p className="ck-card__eyebrow"><ListChecks />Publications & actions</p>
          {(calendar?.upcoming.length ?? 0) + (calendar?.recent.length ?? 0) > 0 ? (
            <div className="ck-ops__list">
              {calendar!.upcoming.map((a) => (
                <div className="ck-ops__row" key={a.id}>
                  <span className="ck-ops__row-date">{fmtDay(a.at)}</span>
                  <span className="ck-ops__row-title">{a.title}</span>
                  <span className="ck-ops__row-chip" data-k="next">à venir</span>
                </div>
              ))}
              {calendar!.recent.map((a) => (
                <div className="ck-ops__row" key={a.id}>
                  <span className="ck-ops__row-date">{fmtDay(a.at)}</span>
                  <span className="ck-ops__row-title">{a.title}</span>
                  <span className="ck-ops__row-chip" data-k="done">publiée</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="ck-ops__note">Rien de planifié sous 14 jours.</p>
          )}
          <Link href="/cockpit/operate/calendar" className="ck-card__link">Ouvrir le calendrier <ArrowRight /></Link>
        </div>
        <div className="ck-card">
          <p className="ck-card__eyebrow"><ShoppingCart />Ventes & commandes</p>
          <p className="ck-ops__note">
            Votre canal de vente n&apos;est pas encore relié — quand il le sera,
            vos commandes du jour et vos meilleures ventes vivront ici.
          </p>
          <Link href="/cockpit/operate/requests" className="ck-card__link">
            Demander le branchement <ArrowRight />
          </Link>
        </div>
      </div>

      {/* ── Réseaux + veille (mêmes cartes que la vue stratégique) ── */}
      <div className="ck-grid ck-grid--2">
        <SocialHubCard strategyId={strategyId} />
        <MarketFeedCard strategyId={strategyId} />
      </div>
    </div>
  );
}
