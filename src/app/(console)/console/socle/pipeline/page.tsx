"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import {
  ClipboardList,
  TrendingUp,
  Zap,
  Clock,
  ArrowRight,
  Building2,
  UserCheck,
  CheckCircle,
  XCircle,
  DollarSign,
  Target,
  AlertTriangle,
  Plus,
  Phone,
  Mail,
  MessageSquare,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(v);

type DealStage = "LEAD" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST";

const STAGE_CONFIG: Record<DealStage, { label: string; icon: React.ReactNode; color: string; borderColor: string; bgColor: string }> = {
  LEAD: {
    label: "Prospects",
    icon: <ClipboardList className="h-4 w-4" />,
    color: "text-accent",
    borderColor: "border-accent/30",
    bgColor: "bg-accent/5",
  },
  QUALIFIED: {
    label: "Qualifies",
    icon: <UserCheck className="h-4 w-4" />,
    color: "text-blue-400",
    borderColor: "border-blue-500/30",
    bgColor: "bg-blue-500/5",
  },
  PROPOSAL: {
    label: "Proposition",
    icon: <Target className="h-4 w-4" />,
    color: "text-cyan-400",
    borderColor: "border-cyan-500/30",
    bgColor: "bg-cyan-500/5",
  },
  NEGOTIATION: {
    label: "Negociation",
    icon: <MessageSquare className="h-4 w-4" />,
    color: "text-warning",
    borderColor: "border-warning/30",
    bgColor: "bg-warning/5",
  },
  WON: {
    label: "Gagnes",
    icon: <CheckCircle className="h-4 w-4" />,
    color: "text-success",
    borderColor: "border-success/30",
    bgColor: "bg-success/5",
  },
  LOST: {
    label: "Perdus",
    icon: <XCircle className="h-4 w-4" />,
    color: "text-error",
    borderColor: "border-error/30",
    bgColor: "bg-error/5",
  },
};

type ViewMode = "kanban" | "forecast" | "metrics";

export default function PipelinePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [showLost, setShowLost] = useState(false);

  const { data: pipeline, isLoading: loadingPipeline } = trpc.crm.getPipeline.useQuery();
  const { data: forecast, isLoading: loadingForecast } = trpc.crm.getRevenueForecast.useQuery();
  const { data: metrics, isLoading: loadingMetrics } = trpc.crm.getConversionMetrics.useQuery();

  const isLoading = loadingPipeline || loadingForecast;

  // Active stages for Kanban (exclude LOST unless toggled)
  const kanbanStages: DealStage[] = showLost
    ? ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]
    : ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON"];

  if (isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline CRM"
        description="Entonnoir de conversion : Quick Intake -> Deal -> Brand Instance"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Socle" },
          { label: "Pipeline" },
        ]}
      />

      {/* View Mode Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        {([
          { key: "kanban", label: "Pipeline", icon: <ClipboardList className="h-3.5 w-3.5" /> },
          { key: "forecast", label: "Previsions", icon: <DollarSign className="h-3.5 w-3.5" /> },
          { key: "metrics", label: "Metriques", icon: <BarChart3 className="h-3.5 w-3.5" /> },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setViewMode(tab.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              viewMode === tab.key
                ? "bg-background text-white"
                : "text-foreground-muted hover:text-foreground-secondary"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {viewMode === "kanban" && (
            <button
              onClick={() => setShowLost(!showLost)}
              className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                showLost ? "bg-error/10 text-error" : "text-foreground-muted hover:text-foreground-secondary"
              }`}
            >
              {showLost ? "Masquer perdus" : "Afficher perdus"}
            </button>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      {forecast && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Pipeline total"
            value={fmtCurrency(forecast.totalPipeline)}
            icon={DollarSign}
          />
          <StatCard
            title="Prevision ponderee"
            value={fmtCurrency(forecast.weightedForecast)}
            icon={TrendingUp}
            trend={forecast.weightedForecast > 0 ? "up" : "flat"}
            trendValue={`${forecast.activeDeals} deals actifs`}
          />
          <StatCard
            title="Taux de conversion"
            value={`${forecast.winRate}%`}
            icon={Target}
            trend={forecast.winRate > 30 ? "up" : forecast.winRate > 15 ? "flat" : "down"}
            trendValue={`${forecast.wonDeals} gagnes / ${forecast.lostDeals} perdus`}
          />
          <StatCard
            title="Delai moyen (close)"
            value={`${forecast.avgCloseTimeDays}j`}
            icon={Clock}
            trendValue={forecast.avgDealSize > 0 ? `Moy. ${fmtCurrency(forecast.avgDealSize)}` : undefined}
          />
        </div>
      )}

      {/* Kanban View */}
      {viewMode === "kanban" && pipeline && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanStages.map((stage) => {
            const config = STAGE_CONFIG[stage];
            const stageData = pipeline[stage] ?? { count: 0, totalValue: 0, deals: [] };
            const deals = (stageData as { deals?: Array<{ id: string; companyName: string; contactName: string; contactEmail: string; value: number | null; createdAt: string | Date; source: string | null; strategy: { id: string; name: string } | null }> }).deals ?? [];

            return (
              <div
                key={stage}
                className={`flex w-72 shrink-0 flex-col rounded-xl border ${config.borderColor} ${config.bgColor}`}
              >
                {/* Column header */}
                <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={config.color}>{config.icon}</span>
                    <h3 className={`text-sm font-semibold ${config.color}`}>{config.label}</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-foreground-secondary">
                      {stageData.count}
                    </span>
                    {stageData.totalValue > 0 && (
                      <span className="text-[10px] text-foreground-muted">
                        {fmtCurrency(stageData.totalValue)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Column body */}
                <div className="flex-1 space-y-2 p-3">
                  {deals.length === 0 ? (
                    <p className="py-6 text-center text-xs text-foreground-muted">
                      Aucun deal
                    </p>
                  ) : (
                    deals.slice(0, 12).map((deal) => (
                      <div
                        key={deal.id}
                        className="group rounded-lg border border-border bg-background/80 p-3 transition-colors hover:border-border"
                      >
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-medium text-white">
                            {deal.companyName}
                          </p>
                          {deal.value && (
                            <span className="ml-2 shrink-0 rounded bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground-secondary">
                              {fmtCurrency(deal.value)}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-foreground-muted">
                          {deal.contactName}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {deal.source && (
                              <span className="rounded bg-background/60 px-1 py-0.5 text-[9px] text-foreground-muted">
                                {deal.source}
                              </span>
                            )}
                            <span className="text-[10px] text-foreground-muted">
                              {fmtDate(deal.createdAt)}
                            </span>
                          </div>
                          {deal.strategy && (
                            <Link
                              href={`/console/oracle/clients/${deal.strategy.id}`}
                              className="text-xs text-foreground-muted opacity-0 transition-all group-hover:opacity-100 hover:text-foreground-secondary"
                            >
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {deals.length > 12 && (
                    <p className="text-center text-[10px] text-foreground-muted">
                      +{deals.length - 12} autres
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Forecast View */}
      {viewMode === "forecast" && forecast && (
        <div className="space-y-6">
          {/* Revenue breakdown by stage */}
          <div className="rounded-xl border border-border bg-background/50 p-6">
            <h3 className="mb-4 text-sm font-semibold text-white">Revenue par etape</h3>
            <div className="space-y-3">
              {(["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON"] as const).map((stage) => {
                const data = forecast.byStage[stage];
                if (!data || data.count === 0) return null;
                const barWidth = forecast.totalPipeline > 0
                  ? (data.value / forecast.totalPipeline) * 100
                  : 0;
                const config = STAGE_CONFIG[stage];

                return (
                  <div key={stage} className="flex items-center gap-3">
                    <div className="w-28 shrink-0">
                      <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                    </div>
                    <div className="relative h-6 flex-1 overflow-hidden rounded-full bg-background">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-zinc-700 to-zinc-600"
                        style={{ width: `${Math.max(barWidth, 2)}%` }}
                      />
                      <div className="absolute inset-0 flex items-center px-3">
                        <span className="text-[10px] text-foreground-secondary">
                          {data.count} deals - {fmtCurrency(data.value)}
                        </span>
                      </div>
                    </div>
                    <div className="w-32 shrink-0 text-right">
                      <span className="text-xs text-foreground-muted">
                        Pondere: {fmtCurrency(data.weighted)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/50 p-4">
              <p className="text-xs text-foreground-muted">Deal moyen (clos)</p>
              <p className="mt-1 text-xl font-bold text-white">{fmtCurrency(forecast.avgDealSize)}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/50 p-4">
              <p className="text-xs text-foreground-muted">Delai de closing</p>
              <p className="mt-1 text-xl font-bold text-white">{forecast.avgCloseTimeDays} jours</p>
            </div>
            <div className="rounded-xl border border-border bg-background/50 p-4">
              <p className="text-xs text-foreground-muted">Win rate</p>
              <p className="mt-1 text-xl font-bold text-white">{forecast.winRate}%</p>
              <p className="mt-0.5 text-[10px] text-foreground-muted">
                {forecast.wonDeals}W / {forecast.lostDeals}L
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics View */}
      {viewMode === "metrics" && metrics && (
        <div className="space-y-6">
          {/* Conversion funnel */}
          <div className="rounded-xl border border-border bg-background/50 p-6">
            <h3 className="mb-4 text-sm font-semibold text-white">Entonnoir de conversion</h3>
            <div className="space-y-2">
              {Object.entries(metrics.conversionRates).map(([key, rate]) => {
                const [from, , to] = key.split("_");
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-xs text-foreground-secondary">{from}</span>
                    <ChevronRight className="h-3 w-3 text-foreground-muted" />
                    <span className="w-28 shrink-0 text-xs text-foreground-secondary">{to}</span>
                    <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-background">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-600/50 to-emerald-500/30"
                        style={{ width: `${Math.max(rate as number, 2)}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-xs font-medium text-foreground-secondary">{rate}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stage durations */}
          <div className="rounded-xl border border-border bg-background/50 p-6">
            <h3 className="mb-4 text-sm font-semibold text-white">Duree moyenne par etape</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(metrics.stageMetrics).map(([stage, data]) => {
                const config = STAGE_CONFIG[stage as DealStage];
                const isBottleneck = stage === metrics.bottleneck;
                return (
                  <div
                    key={stage}
                    className={`rounded-lg border p-3 ${
                      isBottleneck ? "border-warning/30 bg-warning/5" : "border-border bg-background/30"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {config && <span className={config.color}>{config.icon}</span>}
                      <span className="text-xs font-medium text-foreground-secondary">{stage}</span>
                      {isBottleneck && <AlertTriangle className="ml-auto h-3 w-3 text-warning" />}
                    </div>
                    <p className="mt-1 text-lg font-bold text-white">{(data as { avgDays: number }).avgDays}j</p>
                    <p className="text-[10px] text-foreground-muted">{(data as { count: number }).count} passages</p>
                  </div>
                );
              })}
            </div>
            {metrics.bottleneck && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-warning/5 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                <p className="text-xs text-warning/80">
                  Goulot d&apos;etranglement detecte: <strong>{metrics.bottleneck}</strong> ({metrics.bottleneckAvgDays}j en moyenne)
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
