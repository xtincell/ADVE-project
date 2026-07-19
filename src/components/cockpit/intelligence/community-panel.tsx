"use client";

/**
 * <CommunityPanel /> — Cockpit community tracking surface (P5).
 *
 * Three-tier separation (mirrors <OvertonPanel>) :
 *   - the route (`/cockpit/intelligence/community/page.tsx`) owns auth + framing,
 *   - this panel owns the data fetch + loading/empty boundaries,
 *   - the metric cards stay purely presentational.
 *
 * Unifies the previously-siloed community data (superfans, devotion ladder,
 * community health, follower totals) behind one paid-tier-gated query
 * (`cockpitDashboard.getCommunityDashboard`). Honest states only : tier-denial →
 * upgrade CTA, no data → EmptyState, each section absent → hidden (never a
 * fabricated zero). Zero LLM.
 */

import { useState } from "react";
import { Users, Crown, Activity, Heart, Share2, Lock, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { MetricCard } from "@/components/shared/metric-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/primitives/skeleton";
import { PricingModal } from "@/components/cockpit/pricing-modal";
import { SuperfanCandidatesPanel } from "./superfan-candidates-panel";
import { FanPassportsPanel } from "./fan-passports-panel";
import { ReferralCodeCard } from "./referral-code-card";

const DEVOTION_RUNGS: ReadonlyArray<{ key: keyof CommunityDistribution; label: string }> = [
  { key: "spectateur", label: "Spectateur" },
  { key: "interesse", label: "Intéressé" },
  { key: "participant", label: "Participant" },
  { key: "engage", label: "Engagé" },
  { key: "ambassadeur", label: "Ambassadeur" },
  { key: "evangeliste", label: "Prescripteur" },
];

interface CommunityDistribution {
  spectateur: number;
  interesse: number;
  participant: number;
  engage: number;
  ambassadeur: number;
  evangeliste: number;
}

/** Le DTO porte des fractions canon 0-1 (normalisées au boundary serveur —
    audit 2026-07-16 `devotion-rung-pct-times-100` : l'ancienne heuristique
    « v<=1 ? v*100 : v » multipliait par 100 les petits rungs réels). */
function pct(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v * 100)));
}

function CommunityPanelSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Chargement du suivi communauté">
      <div className="grid grid-cols-1 gap-4 @md:grid-cols-2 @xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} shape="rect" className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton shape="rect" className="h-48 w-full rounded-xl" />
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Users;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-accent" aria-hidden />
        {title}
      </h2>
      {children}
    </div>
  );
}

function CommunityPanelInner({ strategyId }: { strategyId: string }) {
  const [showPricing, setShowPricing] = useState(false);
  const { data, isLoading } = trpc.cockpitDashboard.getCommunityDashboard.useQuery(
    { strategyId },
    { enabled: !!strategyId },
  );

  if (isLoading || !data) return <CommunityPanelSkeleton />;

  if (data.state === "TIER_GATE_DENIED") {
    // Modale de consultation des formules — jamais une redirection immédiate
    // (mandat opérateur 2026-07-13).
    return (
      <>
        <EmptyState
          icon={Lock}
          title="Suivi communauté — réservé aux abonnements"
          description="Suivez vos superfans, l'échelle d'engagement et la santé de votre communauté en activant votre abonnement."
          action={{ label: "Découvrir les formules", onClick: () => setShowPricing(true) }}
        />
        <PricingModal open={showPricing} onClose={() => setShowPricing(false)} featureLabel="Le suivi communauté" />
      </>
    );
  }

  const { superfans, devotion, community, followers, hasAnyData } = data.data;

  if (!hasAnyData) {
    return (
      <EmptyState
        icon={Users}
        title="Pas encore de données communauté"
        description="Dès que des superfans, des followers ou un instantané de communauté sont capturés (connecteur ou saisie manuelle), votre tableau de bord s'affiche ici."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Superfan KPIs — the northstar */}
      <div className="grid grid-cols-1 gap-4 @md:grid-cols-2 @xl:grid-cols-4">
        <MetricCard label="Superfans actifs" value={superfans.active} trend={superfans.velocity.trend} />
        <MetricCard label="Prescripteurs" value={superfans.evangelistes} />
        <MetricCard label="Ratio d'activation" value={superfans.ratio} format="percent" />
        <MetricCard
          label={`Croissance (${superfans.velocity.periodDays}j)`}
          value={superfans.velocity.delta}
          trend={superfans.velocity.trend}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 @lg:grid-cols-2">
        {/* Devotion ladder distribution */}
        {devotion && (
          <SectionCard title="Échelle d'engagement" icon={Crown}>
            {/* Trajectoire du score — la donnée quotidienne n'est plus jetée
                (audit 2026-07-16 `community-timeseries-and-identities-dropped`). */}
            {devotion.history.length >= 2 && (
              <div className="mb-3 flex items-center gap-3">
                <TrendSparkline values={[...devotion.history]} />
                <span className="text-xs text-foreground-muted">
                  Trajectoire sur {devotion.history.length} relevés
                </span>
              </div>
            )}
            <ul className="space-y-2.5">
              {DEVOTION_RUNGS.map(({ key, label }) => {
                const width = pct(devotion.distribution[key]);
                return (
                  <li key={key}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-foreground-secondary">{label}</span>
                      <span className="font-medium text-foreground">{width}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-background">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${width}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        )}

        {/* Community health snapshot — les métriques non mesurées (null) sont
            masquées, jamais rendues « 0 % » (P22-2, ADR-0134). */}
        {community && (
          <SectionCard title={`Santé communauté · ${community.platform}`} icon={Heart}>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-foreground-secondary">Taille</dt>
                <dd className="text-lg font-bold text-foreground">{community.size.toLocaleString("fr-FR")}</dd>
              </div>
              {community.sentiment !== null && (
                <div>
                  <dt className="text-xs text-foreground-secondary">Sentiment</dt>
                  <dd className="text-lg font-bold text-foreground">{pct(community.sentiment)}%</dd>
                </div>
              )}
              {community.health !== null && (
                <div>
                  <dt className="text-xs text-foreground-secondary">Engagement moyen</dt>
                  <dd className="text-lg font-bold text-foreground">{pct(community.health)}%</dd>
                </div>
              )}
              {community.activeRate !== null && (
                <div>
                  <dt className="text-xs text-foreground-secondary">Taux actif</dt>
                  <dd className="text-lg font-bold text-foreground">{pct(community.activeRate)}%</dd>
                </div>
              )}
            </dl>
          </SectionCard>
        )}

        {/* Follower totals per platform */}
        {followers && (
          <SectionCard title="Audience par plateforme" icon={Share2}>
            <p className="mb-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">
                {followers.totalFollowers.toLocaleString("fr-FR")}
              </span>
              <span className="text-xs text-foreground-secondary">followers au total</span>
            </p>
            <ul className="space-y-1.5">
              {followers.byPlatform.map((p) => (
                <li key={p.platform} className="flex items-center justify-between text-sm">
                  <span className="text-foreground-secondary">{p.platform}</span>
                  <span className="font-medium text-foreground">{p.followers.toLocaleString("fr-FR")}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        {/* QUI sont les superfans — l'identité collectée n'est plus jetée à la
            projection (audit 2026-07-16 `superfan-identities-counts-only` :
            le founder ne voyait que des compteurs, jamais ses fans). */}
        <TopSuperfansCard strategyId={strategyId} />

        {/* Fans détectés dans les interactions réelles — s'auto-masque hors
            opérateur et sans candidat (revue humaine, jamais de naissance auto). */}
        <SuperfanCandidatesPanel strategyId={strategyId} />

        {/* Passeports fan (ADR-0158) — délivrance opérateur, s'auto-masque
            hors opérateur et sans profil suivi. */}
        <FanPassportsPanel strategyId={strategyId} />

        {/* Mon code de parrainage (ADR-0157, carte différée livrée avec le
            passeport fan) — visible founder. */}
        <ReferralCodeCard />

        {/* Superfan base summary */}
        <SectionCard title="Base superfans" icon={TrendingUp}>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-foreground-secondary">Total identifiés</dt>
              <dd className="text-lg font-bold text-foreground">{superfans.total.toLocaleString("fr-FR")}</dd>
            </div>
            <div>
              <dt className="text-xs text-foreground-secondary">Actifs (ambassadeur+)</dt>
              <dd className="text-lg font-bold text-foreground">{superfans.active.toLocaleString("fr-FR")}</dd>
            </div>
          </dl>
        </SectionCard>
      </div>
    </div>
  );
}

/** Mini-courbe inline (SVG pur, dimensions fixes, aucune dépendance). */
function TrendSparkline({ values }: { values: number[] }) {
  const w = 96;
  const h = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - ((v - min) / span) * (h - 4)}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="shrink-0 text-accent">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** Libellés client des segments (lexique T7 — jamais l'enum brut). */
const SEGMENT_LABELS: Record<string, string> = {
  ambassadeur: "Ambassadeur",
  evangeliste: "Prescripteur",
};

function TopSuperfansCard({ strategyId }: { strategyId: string }) {
  const { data: fans } = trpc.superfan.top.useQuery(
    { strategyId, limit: 8 },
    { enabled: !!strategyId, retry: false },
  );
  if (!fans || fans.length === 0) return null;
  return (
    <SectionCard title="Vos ambassadeurs" icon={Users}>
      <ul className="space-y-2">
        {fans.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">@{f.handle}</p>
              <p className="text-xs text-foreground-muted">
                {f.platform}
                {f.lastActiveAt ? ` · actif le ${new Date(f.lastActiveAt).toLocaleDateString("fr-FR")}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-foreground-secondary">
                {SEGMENT_LABELS[f.segment] ?? f.segment}
              </span>
              <p className="mt-0.5 text-xs text-foreground-muted">{f.interactions} interactions</p>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function CommunityPanel() {
  const strategyId = useCurrentStrategyId();

  if (!strategyId) {
    return (
      <EmptyState
        icon={Users}
        title="Aucune marque sélectionnée"
        description="Sélectionnez une marque pour visualiser le suivi de sa communauté."
      />
    );
  }

  return <CommunityPanelInner strategyId={strategyId} />;
}
