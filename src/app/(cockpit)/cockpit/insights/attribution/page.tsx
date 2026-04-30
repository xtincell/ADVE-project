"use client";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { PILLAR_KEYS, PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Filter,
  Zap,
  Radio,
  Target,
  Megaphone,
  Globe,
  Calendar,
} from "lucide-react";

const SIGNAL_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof Zap }
> = {
  DRIFT_ALERT: {
    label: "Derive",
    color: "text-error",
    bg: "bg-error/10",
    icon: AlertTriangle,
  },
  INTERVENTION_REQUEST: {
    label: "Intervention",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    icon: Radio,
  },
  SCORE_UPDATE: {
    label: "Score",
    color: "text-accent",
    bg: "bg-accent/10",
    icon: Target,
  },
  CAMPAIGN_SIGNAL: {
    label: "Campagne",
    color: "text-sky-400",
    bg: "bg-sky-400/10",
    icon: Megaphone,
  },
  SOCIAL_SIGNAL: {
    label: "Social",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    icon: Globe,
  },
  MISSION_COMPLETE: {
    label: "Mission",
    color: "text-pink-400",
    bg: "bg-pink-400/10",
    icon: Zap,
  },
};

const PILLAR_BADGE_COLORS: Record<PillarKey, string> = {
  a: "bg-accent/10 text-accent",
  d: "bg-blue-400/10 text-blue-400",
  v: "bg-emerald-400/10 text-emerald-400",
  e: "bg-amber-400/10 text-amber-400",
  r: "bg-error/10 text-error",
  t: "bg-sky-400/10 text-sky-400",
  i: "bg-orange-400/10 text-orange-400",
  s: "bg-pink-400/10 text-pink-400",
};

const DEFAULT_SIGNAL_CONFIG = {
  label: "Signal",
  color: "text-foreground-secondary",
  bg: "bg-zinc-400/10",
  icon: Activity,
};

function getSignalConfig(type: string) {
  return SIGNAL_TYPE_CONFIG[type] ?? DEFAULT_SIGNAL_CONFIG;
}

export default function AttributionPage() {
  return (
    <Suspense fallback={<SkeletonPage />}>
      <AttributionContent />
    </Suspense>
  );
}

function AttributionContent() {
  const strategyId = useCurrentStrategyId();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read initial filter values from URL params
  const initialPillar = (searchParams.get("pillar") ?? "all") as PillarKey | "all";
  const initialType = searchParams.get("type") ?? "all";

  const [filterPillar, setFilterPillarState] = useState<PillarKey | "all">(initialPillar);
  const [filterType, setFilterTypeState] = useState<string>(initialType);
  const [filterRange, setFilterRange] = useState<string>("all");

  const updateUrlParams = useCallback(
    (pillar: string, type: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (pillar === "all") params.delete("pillar");
      else params.set("pillar", pillar);
      if (type === "all") params.delete("type");
      else params.set("type", type);
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const setFilterPillar = (val: PillarKey | "all") => {
    setFilterPillarState(val);
    updateUrlParams(val, filterType);
  };

  const setFilterType = (val: string) => {
    setFilterTypeState(val);
    updateUrlParams(filterPillar, val);
  };

  const signalsQuery = trpc.signal.list.useQuery(
    { strategyId: strategyId! },
    { enabled: !!strategyId },
  );

  if (!strategyId || signalsQuery.isLoading) {
    return <SkeletonPage />;
  }

  if (signalsQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Attribution" />
        <div className="rounded-xl border border-red-900/50 bg-error/20 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-error" />
          <p className="mt-2 text-sm text-error">
            {signalsQuery.error.message}
          </p>
        </div>
      </div>
    );
  }

  const rawSignals = (signalsQuery.data ?? []) as unknown as Array<{
    id: string;
    type: string;
    data: Record<string, unknown> | null;
    advertis_vector: Record<string, number> | null;
    createdAt: string;
  }>;

  // Parse signals with attribution data
  const signals = rawSignals.map((s) => {
    const data = (s.data ?? {}) as Record<string, unknown>;
    const pillar = (data.pillar as PillarKey) ?? null;
    const impact = (data.impact as number) ?? 0;
    const source = (data.source as string) ?? s.type;
    const description =
      (data.description as string) ?? (data.title as string) ?? s.type;
    return {
      ...s,
      pillar,
      impact,
      source,
      description,
      date: new Date(s.createdAt),
    };
  });

  // Time range filter
  const now = new Date();
  const filteredByRange = signals.filter((s) => {
    if (filterRange === "all") return true;
    const diff = now.getTime() - s.date.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    if (filterRange === "7d") return days <= 7;
    if (filterRange === "30d") return days <= 30;
    if (filterRange === "90d") return days <= 90;
    return true;
  });

  // Pillar filter
  const filteredByPillar = filteredByRange.filter((s) => {
    if (filterPillar === "all") return true;
    return s.pillar === filterPillar;
  });

  // Type filter
  const filtered = filteredByPillar.filter((s) => {
    if (filterType === "all") return true;
    return s.type === filterType;
  });

  // Stats
  const totalSignals = signals.length;
  const positiveImpact = signals
    .filter((s) => s.impact > 0)
    .reduce((sum, s) => sum + s.impact, 0);
  const negativeImpact = signals
    .filter((s) => s.impact < 0)
    .reduce((sum, s) => sum + Math.abs(s.impact), 0);

  // Unique signal types for filter
  const signalTypes = Array.from(new Set(signals.map((s) => s.type)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attribution"
        description="Identifiez quelles actions ont contribue aux changements de score"
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Insights" },
          { label: "Attribution" },
        ]}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Signaux suivis"
          value={totalSignals}
          trend="flat"
          trendValue={`${filtered.length} affiches`}
          icon={Activity}
        />
        <StatCard
          title="Impact positif"
          value={`+${positiveImpact.toFixed(1)}`}
          trend="up"
          trendValue="pts cumules"
          icon={TrendingUp}
        />
        <StatCard
          title="Impacts negatifs"
          value={`-${negativeImpact.toFixed(1)}`}
          trend={negativeImpact > 0 ? "down" : "flat"}
          trendValue="pts cumules"
          icon={TrendingDown}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background/80 p-4">
        <Filter className="h-4 w-4 text-foreground-secondary" />
        <span className="text-sm font-medium text-foreground-secondary">Filtres :</span>

        <select
          value={filterPillar}
          onChange={(e) =>
            setFilterPillar(e.target.value as PillarKey | "all")
          }
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-white"
        >
          <option value="all">Tous les piliers</option>
          {PILLAR_KEYS.map((k) => (
            <option key={k} value={k}>
              {k.toUpperCase()} - {PILLAR_NAMES[k]}
            </option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-white"
        >
          <option value="all">Tous les types</option>
          {signalTypes.map((t) => (
            <option key={t} value={t}>
              {getSignalConfig(t).label}
            </option>
          ))}
        </select>

        <select
          value={filterRange}
          onChange={(e) => setFilterRange(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-white"
        >
          <option value="all">Toute la periode</option>
          <option value="7d">7 derniers jours</option>
          <option value="30d">30 derniers jours</option>
          <option value="90d">90 derniers jours</option>
        </select>
      </div>

      {/* Signal timeline */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Aucun signal"
          description="Les signaux d'attribution apparaitront ici lorsque des actions affecteront le score."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((signal) => {
            const config = getSignalConfig(signal.type);
            const IconComponent = config.icon;
            return (
              <div
                key={signal.id}
                className="rounded-xl border border-border bg-background/80 p-4 transition-colors hover:border-border"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.bg}`}
                  >
                    <IconComponent
                      className={`h-5 w-5 ${config.color}`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${config.bg} ${config.color}`}
                        >
                          {config.label}
                        </span>
                        <p className="mt-1 text-sm text-foreground-secondary">
                          {signal.description}
                        </p>
                        {signal.pillar && (
                          <p className="mt-1 text-xs italic text-foreground-muted">
                            Ce signal impacte {PILLAR_NAMES[signal.pillar]} de votre identite de marque.
                          </p>
                        )}
                      </div>

                      {signal.impact !== 0 && (
                        <span
                          className={`shrink-0 rounded-lg px-3 py-1 text-sm font-bold ${
                            signal.impact > 0
                              ? "bg-emerald-400/10 text-emerald-400"
                              : "bg-error/10 text-error"
                          }`}
                        >
                          {signal.impact > 0 ? "+" : ""}
                          {signal.impact.toFixed(1)} pts
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-foreground-muted">
                      {signal.pillar && (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${PILLAR_BADGE_COLORS[signal.pillar] ?? "bg-zinc-400/10 text-foreground-secondary"}`}>
                          {signal.pillar.toUpperCase()} - {PILLAR_NAMES[signal.pillar]}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {signal.date.toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-foreground-muted">
                        Source : {signal.source}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
