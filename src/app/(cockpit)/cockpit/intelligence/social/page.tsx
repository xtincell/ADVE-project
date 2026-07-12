"use client";

/**
 * Performance sociale — le rapport de pilotage des réseaux (ADR-0133,
 * mandat « les statistiques, les rapports de performances »).
 *
 * 100 % déterministe côté serveur : uniquement ce qui a été RÉELLEMENT
 * collecté. La portée (reach) n'est totalisée que sur les publications
 * mesurées — le rapport dit combien le sont ; l'absence de mesure n'est
 * jamais un zéro.
 */
import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { BarChart3, ArrowRight, TrendingUp, Users, MessageCircle } from "lucide-react";

const PLATFORM_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook", INSTAGRAM: "Instagram", TIKTOK: "TikTok",
  YOUTUBE: "YouTube", TWITTER: "X", LINKEDIN: "LinkedIn",
};

function fmt(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 10_000) return `${Math.round(n / 1000)} k`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)} k`;
  return String(n);
}

export default function SocialReportPage() {
  const strategyId = useCurrentStrategyId();
  const [days, setDays] = useState<30 | 90>(30);
  const report = trpc.social.getSocialReport.useQuery(
    { strategyId: strategyId ?? "", days },
    { enabled: !!strategyId },
  );

  if (!strategyId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState icon={BarChart3} title="Sélectionnez une marque" description="Choisissez une marque pour voir sa performance sociale." />
      </div>
    );
  }

  const r = report.data;

  return (
    <div className="container mx-auto px-4 py-6 space-y-5">
      <PageHeader
        title="Performance sociale"
        description="Publications, engagement, portée mesurée et audience — sur la période, réseau par réseau."
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Mon marché" },
          { label: "Performance sociale" },
        ]}
      >
        <div className="ck-inbox__tabs" role="tablist" aria-label="Période">
          {([30, 90] as const).map((d) => (
            <button
              key={d}
              role="tab"
              type="button"
              aria-selected={days === d}
              className="ck-inbox__tab"
              data-active={days === d || undefined}
              onClick={() => setDays(d)}
            >
              {d} jours
            </button>
          ))}
        </div>
      </PageHeader>

      {report.isLoading ? (
        <p className="ck-ops__note">Calcul du rapport…</p>
      ) : !r || (r.totals.posts === 0 && r.totals.followers == null) ? (
        <div className="ck-card">
          <EmptyState
            icon={BarChart3}
            title="Pas encore de données sur la période"
            description="Connectez vos réseaux puis lancez une synchronisation — le rapport se remplit avec vos données réelles, jamais des estimations."
          />
          <div className="flex justify-center pb-4">
            <Link className="ck-dash-switch" href="/cockpit/settings/connections">
              Connexions <ArrowRight />
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="ck-grid ck-grid--4">
            <div className="ck-card ck-report__kpi">
              <p className="ck-card__eyebrow"><TrendingUp />Publications</p>
              <p className="ck-report__val">{fmt(r.totals.posts)}</p>
              <p className="ck-ops__note">{r.totals.engagement > 0 ? `${fmt(r.totals.engagement)} interactions` : "—"}</p>
            </div>
            <div className="ck-card ck-report__kpi">
              <p className="ck-card__eyebrow"><MessageCircle />Engagement</p>
              <p className="ck-report__val">{fmt(r.totals.likes + r.totals.comments + r.totals.shares)}</p>
              <p className="ck-ops__note">{fmt(r.totals.likes)} j&apos;aime · {fmt(r.totals.comments)} comm. · {fmt(r.totals.shares)} partages</p>
            </div>
            <div className="ck-card ck-report__kpi">
              <p className="ck-card__eyebrow"><BarChart3 />Portée mesurée</p>
              <p className="ck-report__val">{fmt(r.totals.reach)}</p>
              <p className="ck-ops__note">
                {r.totals.postsWithReach > 0
                  ? `${r.totals.postsWithReach}/${r.totals.posts} publications mesurées`
                  : "reconnectez pour activer la mesure"}
              </p>
            </div>
            <div className="ck-card ck-report__kpi">
              <p className="ck-card__eyebrow"><Users />Audience</p>
              <p className="ck-report__val">{fmt(r.totals.followers)}</p>
              <p className="ck-ops__note">
                {r.totals.followersDelta != null
                  ? `${r.totals.followersDelta >= 0 ? "+" : ""}${fmt(r.totals.followersDelta)} sur ${days} j`
                  : "historique en construction"}
              </p>
            </div>
          </div>

          <div className="ck-card">
            <p className="ck-card__eyebrow">Par réseau</p>
            <div className="ck-report__table" role="table">
              <div className="ck-report__row ck-report__row--head" role="row">
                <span>Réseau</span><span>Posts</span><span>J&apos;aime</span><span>Comm.</span>
                <span>Partages</span><span>Portée</span><span>Eng./post</span><span>Abonnés</span>
              </div>
              {r.platforms.map((p) => (
                <div key={p.platform} className="ck-report__row" role="row">
                  <span>{PLATFORM_LABELS[p.platform] ?? p.platform}</span>
                  <span>{fmt(p.posts)}</span>
                  <span>{fmt(p.likes)}</span>
                  <span>{fmt(p.comments)}</span>
                  <span>{fmt(p.shares)}</span>
                  <span>{p.reach != null ? `${fmt(p.reach)} (${p.postsWithReach} mes.)` : "—"}</span>
                  <span>{p.posts > 0 ? p.avgEngagementPerPost : "—"}</span>
                  <span>
                    {fmt(p.followerCount)}
                    {p.followerDelta != null ? ` (${p.followerDelta >= 0 ? "+" : ""}${fmt(p.followerDelta)})` : ""}
                  </span>
                </div>
              ))}
            </div>
            {r.connectedWithoutData.length > 0 ? (
              <p className="ck-ops__note">
                Connecté mais sans donnée sur la période : {r.connectedWithoutData.map((p) => PLATFORM_LABELS[p] ?? p).join(", ")} — lancez une synchronisation depuis le tableau de bord.
              </p>
            ) : null}
          </div>

          <div className="ck-grid ck-grid--2">
            <div className="ck-card">
              <p className="ck-card__eyebrow"><TrendingUp />Meilleures publications</p>
              {r.topPosts.length === 0 ? (
                <p className="ck-ops__note">Aucune publication collectée sur la période.</p>
              ) : (
                <div className="ck-ops__list">
                  {r.topPosts.map((p) => (
                    <div className="ck-ops__row" key={p.id}>
                      {p.mediaUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="ck-ops__thumb" src={p.mediaUrl} alt="" loading="lazy" />
                      ) : null}
                      <span className="ck-ops__row-date">{PLATFORM_LABELS[p.platform] ?? p.platform}</span>
                      {p.permalinkUrl ? (
                        <a className="ck-ops__row-title ck-ops__row-link" href={p.permalinkUrl} target="_blank" rel="noreferrer">
                          {p.content ?? "(sans texte)"}
                        </a>
                      ) : (
                        <span className="ck-ops__row-title">{p.content ?? "(sans texte)"}</span>
                      )}
                      <span className="ck-ops__split-val">
                        {fmt(p.engagement)} inter.{p.reach > 0 ? ` · ${fmt(p.reach)} vues` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="ck-card">
              <p className="ck-card__eyebrow"><MessageCircle />Interactions reçues</p>
              <p className="ck-report__val">{fmt(r.inbox.received)}</p>
              <p className="ck-ops__note">
                {r.inbox.replied} réponse{r.inbox.replied > 1 ? "s" : ""} apportée{r.inbox.replied > 1 ? "s" : ""} sur la période.
              </p>
              <Link href="/cockpit/operate/inbox" className="ck-card__link">
                Ouvrir la boîte de réception <ArrowRight />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
