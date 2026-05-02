"use client";

import { BarChart3, Target, Star, Users, Briefcase, CheckCircle, Clock, MessageSquare } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SkeletonPage } from "@/components/shared/loading-skeleton";

export default function MetricsPage() {
  const profile = trpc.guilde.getMyProfile.useQuery();
  const reviews = trpc.qualityReview.list.useQuery({ limit: 100 });

  if (profile.isLoading) return <SkeletonPage />;

  const firstPassRate = (profile.data?.firstPassRate ?? 0) * 100;
  const avgScore = profile.data?.avgScore ?? 0;
  const totalMissions = profile.data?.totalMissions ?? 0;
  const collaborativeWins = profile.data?.collabMissions ?? 0;

  const allReviews = reviews.data?.items ?? [];

  // Metric grid calculations
  const completedMissions = totalMissions;
  const qcReviewsDone = allReviews.filter(
    (r) => r.reviewerId === profile.data?.userId
  ).length;
  const peerReviewsReceived = allReviews.length;
  const avgDeliveryDays = (() => {
    const deliveryTimes = allReviews
      .filter((r) => r.deliverable?.createdAt)
      .map((r) => {
        const reviewDate = new Date(r.createdAt).getTime();
        const deliverableDate = new Date(r.deliverable.createdAt).getTime();
        return (reviewDate - deliverableDate) / (1000 * 60 * 60 * 24);
      })
      .filter((days) => days >= 0);
    if (deliveryTimes.length === 0) return 0;
    return deliveryTimes.reduce((sum, d) => sum + d, 0) / deliveryTimes.length;
  })();

  // Monthly performance data (last 6 months)
  const monthLabels = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return d.toLocaleDateString("fr-FR", { month: "short" });
  });

  const monthlyScores = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.getMonth();
    const year = d.getFullYear();
    const monthReviews = allReviews.filter((r) => {
      const rd = new Date(r.createdAt);
      return rd.getMonth() === month && rd.getFullYear() === year;
    });
    if (monthReviews.length === 0) return 0;
    return (
      monthReviews.reduce((sum, r) => sum + r.overallScore, 0) /
      monthReviews.length
    );
  });

  const maxMonthlyScore = Math.max(...monthlyScores, 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Métriques"
        description="Vos indicateurs de performance personnels"
        breadcrumbs={[
          { label: "Creator", href: "/creator" },
          { label: "Progression" },
          { label: "Métriques" },
        ]}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="First Pass Rate"
          value={`${firstPassRate.toFixed(0)}%`}
          icon={Target}
          trend={firstPassRate >= 75 ? "up" : firstPassRate >= 60 ? "flat" : "down"}
          trendValue={firstPassRate >= 75 ? "Excellent" : firstPassRate >= 60 ? "Correct" : "A améliorer"}
        />
        <StatCard
          title="Score QC moyen"
          value={`${avgScore.toFixed(1)}/10`}
          icon={Star}
          trend={avgScore >= 7 ? "up" : avgScore >= 5 ? "flat" : "down"}
          trendValue={avgScore >= 7 ? "Excellent" : avgScore >= 5 ? "Correct" : "A améliorer"}
        />
        <StatCard
          title="Total Missions"
          value={totalMissions}
          icon={Briefcase}
          trend="up"
          trendValue={`${completedMissions} complétées`}
        />
        <StatCard
          title="Victoires Collaboratives"
          value={collaborativeWins}
          icon={Users}
          trend={collaborativeWins > 0 ? "up" : "flat"}
          trendValue={collaborativeWins > 0 ? `${collaborativeWins} missions` : "Aucune encore"}
        />
      </div>

      {/* Metric Card Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-background/80 p-5 transition-colors hover:border-border">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <p className="text-sm font-medium text-foreground-secondary">Missions complétées</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{completedMissions}</p>
          <div className="mt-2 h-1.5 rounded-full bg-background">
            <div
              className="h-full rounded-full bg-success transition-all"
              style={{ width: `${Math.min((completedMissions / 60) * 100, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-foreground-muted">{completedMissions}/60 objectif Associé</p>
        </div>

        <div className="rounded-xl border border-border bg-background/80 p-5 transition-colors hover:border-border">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-400" />
            <p className="text-sm font-medium text-foreground-secondary">Reviews QC faites</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{qcReviewsDone}</p>
          <div className="mt-2 h-1.5 rounded-full bg-background">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${Math.min((qcReviewsDone / 10) * 100, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-foreground-muted">{qcReviewsDone} évaluations complétées</p>
        </div>

        <div className="rounded-xl border border-border bg-background/80 p-5 transition-colors hover:border-border">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-purple-400" />
            <p className="text-sm font-medium text-foreground-secondary">Peer reviews reçues</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{peerReviewsReceived}</p>
          <div className="mt-2 h-1.5 rounded-full bg-background">
            <div
              className="h-full rounded-full bg-purple-500 transition-all"
              style={{ width: `${Math.min((peerReviewsReceived / 20) * 100, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-foreground-muted">{peerReviewsReceived} retours</p>
        </div>

        <div className="rounded-xl border border-border bg-background/80 p-5 transition-colors hover:border-border">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-warning" />
            <p className="text-sm font-medium text-foreground-secondary">Délai moyen livraison</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{avgDeliveryDays.toFixed(1)}j</p>
          <div className="mt-2 h-1.5 rounded-full bg-background">
            <div
              className="h-full rounded-full bg-warning transition-all"
              style={{ width: `${Math.min(((7 - avgDeliveryDays) / 7) * 100, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-foreground-muted">Objectif: &lt; 5 jours</p>
        </div>
      </div>

      {/* Performance Trend - Monthly bars */}
      <div className="rounded-xl border border-border bg-background/80 p-5">
        <h3 className="mb-4 font-semibold text-white">Performance mensuelle (6 derniers mois)</h3>
        <div className="space-y-3">
          {monthLabels.map((month, i) => {
            const score = monthlyScores[i] ?? 0;
            const pct = maxMonthlyScore > 0 ? (score / 10) * 100 : 0;
            return (
              <div key={month} className="flex items-center gap-3">
                <span className="w-10 text-xs text-foreground-muted">{month}</span>
                <div className="flex-1">
                  <div className="h-6 rounded-full bg-background">
                    {score > 0 && (
                      <div
                        className="flex h-full items-center justify-end rounded-full bg-gradient-to-r from-blue-600 to-purple-500 pr-2 text-xs font-semibold text-white transition-all"
                        style={{ width: `${Math.max(pct, 8)}%` }}
                      >
                        {score.toFixed(1)}
                      </div>
                    )}
                    {score === 0 && (
                      <div className="flex h-full items-center pl-3 text-xs text-foreground-muted">
                        Aucune donnée
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-foreground-muted">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            Score QC moyen par mois
          </div>
          <span>|</span>
          <span>Échelle: 0 à 10</span>
        </div>
      </div>
    </div>
  );
}
