"use client";

/**
 * MarketFeedCard — « Veille & actualités » (dashboard cockpit, ADR-0128).
 *
 * Agrégation d'articles de presse spécialisée du couple (secteur × pays) de
 * la marque — l'esprit d'un lecteur de flux, alimenté par la collecte
 * automatique. Chaque état est honnête : secteur/pays absents → CTA pour
 * compléter la fiche ; pas encore de collecte → on le dit ; jamais de flux
 * fabriqué.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Newspaper } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { EmptyState } from "@/components/shared/empty-state";

function relativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const mins = Math.floor((Date.now() - t) / 60_000);
  if (mins < 60) return `il y a ${Math.max(1, mins)} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hier";
  return `il y a ${days} j`;
}

export function MarketFeedCard({ strategyId }: { strategyId: string }) {
  const router = useRouter();
  const feedQuery = trpc.cockpitDashboard.getMarketFeed.useQuery({ strategyId });
  const feed = feedQuery.data;

  return (
    <div className="ck-card">
      <div className="ck-card__head">
        <h3 className="ck-card__t">Veille &amp; actualités</h3>
        {feed?.sector && (
          <span className="ck-card__sub">
            <Newspaper />
            {feed.sector}
            {feed.countryCode ? ` · ${feed.countryCode}` : ""}
          </span>
        )}
      </div>

      {feedQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-[shimmer_2s_linear_infinite] rounded-lg bg-surface-overlay" />
          ))}
        </div>
      ) : !feed || !feed.configured ? (
        <EmptyState
          className="py-10"
          icon={Newspaper}
          title="Veille non activée"
          description="Précisez le secteur et le pays de votre marque pour recevoir automatiquement l'actualité de votre marché."
          action={{ label: "Compléter ma fiche marque", onClick: () => router.push("/cockpit/brand/fondation") }}
        />
      ) : feed.articles.length === 0 ? (
        <EmptyState
          className="py-10"
          icon={Newspaper}
          title="Collecte en préparation"
          description={`La veille ${feed.sector ?? ""} s'alimentera automatiquement dès la prochaine collecte — revenez d'ici demain.`}
        />
      ) : (
        <>
          {feed.themes.length > 0 && (
            <div className="ck-feed__themes">
              {feed.themes.map((t) => (
                <span className="ck-feed__theme" key={t}>{t}</span>
              ))}
            </div>
          )}
          <div className="ck-feed">
            {feed.articles.slice(0, 6).map((a, i) => {
              const when = relativeTime(a.publishedAt);
              const body = (
                <>
                  <p className="ck-feed__title">{a.title}</p>
                  <p className="ck-feed__meta">
                    {a.source ?? "Presse spécialisée"}
                    {when ? ` · ${when}` : ""}
                  </p>
                </>
              );
              return a.link ? (
                <a
                  className="ck-feed__item"
                  key={`${a.title}-${i}`}
                  href={a.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="ck-feed__body">{body}</span>
                  <ExternalLink className="ck-feed__ext" />
                </a>
              ) : (
                <div className="ck-feed__item" key={`${a.title}-${i}`}>
                  <span className="ck-feed__body">{body}</span>
                </div>
              );
            })}
          </div>
          <div className="ck-feed__foot">
            {feed.lastDigestAt && <span>Dernière collecte : {relativeTime(feed.lastDigestAt)}</span>}
            <Link href="/cockpit/brand/jehuty" className="ck-card__link">
              Toute la Gazette →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
