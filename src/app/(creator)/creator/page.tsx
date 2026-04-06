"use client";

import Link from "next/link";
import {
  Briefcase,
  Clock,
  DollarSign,
  Star,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Target,
  MessageSquare,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { TierBadge } from "@/components/shared/tier-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { MissionCard } from "@/components/shared/mission-card";
import { Sparkline } from "@/components/shared/sparkline";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { AdvertisRadar } from "@/components/shared/advertis-radar";
import type { PillarKey } from "@/lib/types/advertis-vector";

type GuildTier = "APPRENTI" | "COMPAGNON" | "MAITRE" | "ASSOCIE";

const TIER_THRESHOLDS: Record<GuildTier, { next: GuildTier | null; label: string; missions: number; fpr: number; qc: number; collabs: number }> = {
  APPRENTI: { next: "COMPAGNON", label: "Compagnon", missions: 10, fpr: 70, qc: 6, collabs: 0 },
  COMPAGNON: { next: "MAITRE", label: "Maitre", missions: 30, fpr: 80, qc: 7.5, collabs: 5 },
  MAITRE: { next: "ASSOCIE", label: "Associe", missions: 60, fpr: 90, qc: 8.5, collabs: 15 },
  ASSOCIE: { next: null, label: "Max", missions: 60, fpr: 90, qc: 8.5, collabs: 15 },
};

function ProgressBar({ label, current, target, unit = "", color }: {
  label: string; current: number; target: number; unit?: string; color: string;
}) {
  const pct = Math.min((current / target) * 100, 100);
  const met = current >= target;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-foreground-secondary">{label}</span>
        <span className={met ? "font-semibold text-success" : "text-foreground"}>
          {current}{unit} / {target}{unit}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-background-overlay">
        <div
          className="h-full rounded-full transition-all duration-slower ease-out"
          style={{ width: `${pct}%`, backgroundColor: met ? "var(--color-success)" : color }}
        />
      </div>
    </div>
  );
}

export default function CreatorDashboard() {
  const profile = trpc.guilde.getMyProfile.useQuery();
  const missions = trpc.mission.list.useQuery({ limit: 10 });
  const commissions = trpc.commission.getByCreator.useQuery({});
  const reviews = trpc.qualityReview.list.useQuery({ limit: 5 });

  if (profile.isLoading) return <SkeletonPage />;

  const tier = (profile.data?.tier ?? "APPRENTI") as GuildTier;
  const thresholds = TIER_THRESHOLDS[tier];
  const activeMissions = missions.data?.filter((m) => m.status === "IN_PROGRESS") ?? [];
  const availableMissions = missions.data?.filter((m) => m.status === "DRAFT") ?? [];
  const totalMissions = profile.data?.totalMissions ?? 0;
  const firstPassRate = (profile.data?.firstPassRate ?? 0) * 100;
  const avgScore = profile.data?.avgScore ?? 0;
  const collabs = profile.data?.collabMissions ?? 0;

  const monthlyEarnings = commissions.data
    ?.filter((c) => {
      const d = new Date(c.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, c) => sum + c.netAmount, 0) ?? 0;

  const recentReviews = reviews.data?.items ?? [];
  const earningsTrend = [180, 210, 250, 280, 310, 290, 340, monthlyEarnings / 1000];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        description={`Bienvenue, ${profile.data?.displayName ?? "Createur"}`}
      >
        <TierBadge tier={tier} size="lg" />
      </PageHeader>

      {/* Tier Progression */}
      {thresholds.next && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TierBadge tier={tier} size="md" />
              <span className="text-sm text-foreground-secondary">
                Progression vers{" "}
                <span className="font-semibold text-foreground">{thresholds.label}</span>
              </span>
            </div>
          </div>
          <div className="space-y-2.5">
            <ProgressBar
              label="Missions completees"
              current={totalMissions}
              target={thresholds.missions}
              color="var(--color-tier-compagnon)"
            />
            <ProgressBar
              label="First Pass Rate"
              current={Math.round(firstPassRate)}
              target={thresholds.fpr}
              unit="%"
              color="var(--color-accent)"
            />
            <ProgressBar
              label="Score QC moyen"
              current={Number(avgScore.toFixed(1))}
              target={thresholds.qc}
              color="var(--color-primary)"
            />
            {thresholds.collabs > 0 && (
              <ProgressBar
                label="Missions collaboratives"
                current={collabs}
                target={thresholds.collabs}
                color="var(--color-division-arene)"
              />
            )}
          </div>
        </div>
      )}

      {/* Cult Impact — contribution au culte */}
      {activeMissions.length > 0 && (
        <div className="rounded-xl border border-violet-800/30 bg-gradient-to-r from-violet-950/20 to-fuchsia-950/10 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-foreground">Impact sur le culte</h3>
          </div>
          <div className="space-y-2">
            {activeMissions.slice(0, 3).map((m) => {
              const driver = (m as Record<string, unknown>).driver as Record<string, unknown> | undefined;
              const strategy = (m as Record<string, unknown>).strategy as Record<string, unknown> | undefined;
              const pillarKey = driver?.pillarKey as string | undefined;
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-lg bg-background-raised/50 px-4 py-2.5">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{m.title}</p>
                    <p className="text-xs text-foreground-muted">
                      {strategy?.name ? `Marque : ${String(strategy.name)}` : ""}
                      {pillarKey ? ` — renforce le pilier ${String(pillarKey).toUpperCase()}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[10px] text-violet-400/60">
            Chaque mission completee renforce un pilier ADVE-RTIS et rapproche la marque du superfan.
          </p>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Missions dispo." value={availableMissions.length} icon={Briefcase} trend="up" trendValue="+3" />
        <StatCard title="En cours" value={activeMissions.length} icon={Clock} />
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-foreground-muted">Gains mois</p>
            <Sparkline data={earningsTrend} width={48} height={16} />
          </div>
          <p className="mt-1 text-lg font-bold text-foreground">
            {new Intl.NumberFormat("fr-FR").format(monthlyEarnings)}
          </p>
          <p className="text-[10px] text-foreground-muted">XAF</p>
          {monthlyEarnings === 0 && (
            <p className="mt-1 text-[10px] text-foreground-muted">Completez des missions pour commencer a gagner</p>
          )}
        </div>
        <StatCard
          title="Score QC"
          value={`${avgScore.toFixed(1)}/10`}
          icon={Star}
          trend={avgScore >= 7 ? "up" : avgScore >= 5 ? "flat" : "down"}
          trendValue={avgScore >= 7 ? "Excellent" : avgScore >= 5 ? "Correct" : "A ameliorer"}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Available missions */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Missions disponibles</h3>
            <Link href="/creator/missions/available" className="flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground">
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {availableMissions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-foreground-muted">Aucune mission disponible</p>
              <Link
                href="/creator/missions/available"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
              >
                <Target className="h-3.5 w-3.5" />
                Voir les missions disponibles
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {availableMissions.slice(0, 3).map((m) => (
                <MissionCard
                  key={m.id}
                  mission={{
                    title: m.title,
                    status: m.status,
                    deadline: (m.advertis_vector as Record<string, string> | null)?.deadline,
                    driverChannel: m.driver?.channel,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Active missions */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Missions en cours</h3>
            <Link href="/creator/missions/active" className="flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground">
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {activeMissions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-foreground-muted">Aucune mission active</p>
              <Link
                href="/creator/missions/available"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-4 py-2 text-xs font-medium text-foreground-secondary transition-colors hover:bg-background-overlay/50"
              >
                Voir les missions disponibles
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeMissions.slice(0, 3).map((m) => (
                <MissionCard
                  key={m.id}
                  mission={{
                    title: m.title,
                    status: m.status,
                    deadline: (m.advertis_vector as Record<string, string> | null)?.deadline,
                    driverChannel: m.driver?.channel,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent QC */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Retours QC recents</h3>
            <Link href="/creator/qc/submitted" className="flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground">
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentReviews.length === 0 ? (
            <p className="py-8 text-center text-sm text-foreground-muted">Aucun retour QC</p>
          ) : (
            <div className="space-y-3">
              {recentReviews.slice(0, 4).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-border-subtle p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{r.deliverable?.title ?? "Livrable"}</p>
                    <p className="mt-0.5 truncate text-xs text-foreground-muted">{r.feedback?.slice(0, 80)}</p>
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{r.overallScore}/10</span>
                    <StatusBadge status={r.verdict} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Acces rapide</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/creator/missions/available", icon: Target, label: "Missions dispo.", color: "var(--color-division-signal)" },
              { href: "/creator/qc/peer", icon: CheckCircle, label: "Peer review", color: "var(--color-accent)" },
              { href: "/creator/progress/path", icon: TrendingUp, label: "Progression", color: "var(--color-primary)" },
              { href: "/creator/earnings/missions", icon: DollarSign, label: "Revenus", color: "var(--color-division-arene)" },
              { href: "/creator/learn/adve", icon: Star, label: "Apprendre ADVE", color: "var(--color-division-academie)" },
              { href: "/creator/messages", icon: MessageSquare, label: "Messages", color: "var(--color-info)" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg border border-border-subtle p-3 transition-colors hover:border-border hover:bg-background-overlay/50"
              >
                <item.icon className="h-5 w-5" style={{ color: item.color }} />
                <span className="text-sm font-medium text-foreground-secondary">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
