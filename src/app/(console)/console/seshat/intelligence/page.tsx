"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Modal } from "@/components/shared/modal";
import { Timeline } from "@/components/shared/timeline";
import {
  Radio,
  AlertTriangle,
  TrendingUp,
  Activity,
  BarChart3,
  AlertCircle,
  Zap,
  Shield,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const SEVERITY_MAP: Record<string, string> = {
  critical: "bg-error/15 text-error ring-error",
  high: "bg-warning/15 text-warning ring-warning",
  medium: "bg-yellow-400/15 text-yellow-400 ring-yellow-400/30",
  low: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
  info: "bg-surface-raised text-foreground-secondary ring-border/30",
};

const SIGNAL_TYPE_COLORS: Record<string, string> = {
  SOCIAL_METRICS: "bg-blue-500",
  MEDIA_PERFORMANCE: "bg-accent",
  PRESS_CLIPPING: "bg-success",
  INTERVENTION_REQUEST: "bg-warning",
  COMPETITOR_MOVE: "bg-error",
  MARKET_SHIFT: "bg-cyan-500",
};

type TimelineEventType = "default" | "success" | "warning" | "error" | "info";

interface EnrichedSignal {
  id: string;
  type: string;
  data: unknown;
  createdAt: Date | string;
  severity: string;
}

export default function IntelligencePage() {
  const { data: strategies } = trpc.strategy.list.useQuery({});
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<EnrichedSignal | null>(null);
  const [expandedType, setExpandedType] = useState<string | null>(null);

  const { data: signals, isLoading } = trpc.signal.list.useQuery(
    { strategyId: selectedStrategyId ?? "", limit: 50 },
    { enabled: !!selectedStrategyId },
  );

  const allStrategies = strategies ?? [];
  const signalItems = signals ?? [];

  // Enrich signals with severity
  const enrichedSignals = useMemo(
    () =>
      signalItems.map((s) => {
        const data = s.data as Record<string, unknown> | null;
        const severity = (data?.severity as string) ?? "info";
        return { ...s, severity };
      }),
    [signalItems],
  );

  // Derive stats
  const totalSignals = enrichedSignals.length;
  const criticalAlerts = enrichedSignals.filter((s) => s.severity === "critical" || s.severity === "high").length;
  const avgConfidence = totalSignals > 0
    ? enrichedSignals.reduce((sum, s) => {
        const data = s.data as Record<string, unknown> | null;
        return sum + ((data?.confidence as number) ?? 0.5);
      }, 0) / totalSignals
    : 0;

  // Count signals by type for the bar chart
  const signalsByType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of enrichedSignals) {
      counts[s.type] = (counts[s.type] ?? 0) + 1;
    }
    return counts;
  }, [enrichedSignals]);

  const maxTypeCount = Math.max(1, ...Object.values(signalsByType));

  // Critical alerts list
  const criticalSignals = enrichedSignals
    .filter((s) => s.severity === "critical" || s.severity === "high")
    .slice(0, 8);

  // Timeline events from recent signals
  const timelineEvents = enrichedSignals.slice(0, 10).map((s) => ({
    date: s.createdAt.toString(),
    title: s.type.replace(/_/g, " "),
    description: `Severity: ${s.severity}`,
    icon: s.severity === "critical" ? AlertCircle : s.severity === "high" ? AlertTriangle : Radio,
    type: (s.severity === "critical"
      ? "error"
      : s.severity === "high"
        ? "warning"
        : s.severity === "low"
          ? "info"
          : "default") as TimelineEventType,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intelligence"
        description="Tableau de bord d'intelligence signaux - vue agregee cross-piliers"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Signal" },
          { label: "Intelligence" },
        ]}
      />

      {/* Strategy selector */}
      <div className="rounded-xl border border-border bg-background/80 p-4">
        <label className="block text-sm font-medium text-foreground-secondary mb-2">Client</label>
        <select
          value={selectedStrategyId ?? ""}
          onChange={(e) => setSelectedStrategyId(e.target.value || null)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
        >
          <option value="">Selectionnez un client pour voir l&apos;intelligence</option>
          {allStrategies.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {selectedStrategyId && isLoading && <SkeletonPage />}

      {selectedStrategyId && !isLoading && (
        <>
          {/* StatCards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Signaux (30j)"
              value={totalSignals}
              icon={Radio}
              trend={totalSignals > 10 ? "up" : "flat"}
              trendValue={`${totalSignals} collectes`}
            />
            <StatCard
              title="Alertes critiques"
              value={criticalAlerts}
              icon={AlertTriangle}
              trend={criticalAlerts > 0 ? "up" : "flat"}
              trendValue={criticalAlerts > 0 ? `${criticalAlerts} actives` : "Aucune"}
            />
            <StatCard
              title="Confiance moy."
              value={`${(avgConfidence * 100).toFixed(0)}%`}
              icon={Shield}
              trend={avgConfidence > 0.7 ? "up" : avgConfidence < 0.4 ? "down" : "flat"}
              trendValue={avgConfidence > 0.7 ? "Haute" : avgConfidence < 0.4 ? "Basse" : "Moyenne"}
            />
            <StatCard
              title="Types detectes"
              value={Object.keys(signalsByType).length}
              icon={Activity}
              trendValue={`sur ${Object.keys(SIGNAL_TYPE_COLORS).length} types`}
            />
          </div>

          {/* Two-column grid: chart + alerts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left: Signal trend chart */}
            <div className="rounded-xl border border-border bg-background/80 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Repartition par type
                </h3>
                <span className="text-xs text-foreground-muted">{totalSignals} signaux</span>
              </div>
              {Object.keys(signalsByType).length === 0 ? (
                <p className="text-sm text-foreground-muted">Aucun signal a afficher.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(signalsByType)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => {
                      const isExpanded = expandedType === type;
                      const signalsOfType = enrichedSignals.filter((s) => s.type === type);
                      return (
                        <div key={type} className="space-y-1">
                          <button
                            onClick={() => setExpandedType(isExpanded ? null : type)}
                            className="flex w-full items-center justify-between text-left hover:opacity-80 transition-opacity"
                          >
                            <span className="text-xs text-foreground-secondary truncate flex items-center gap-1">
                              {type.replace(/_/g, " ")}
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </span>
                            <span className="text-xs font-medium text-white">{count}</span>
                          </button>
                          <div className="h-2 w-full rounded-full bg-background">
                            <div
                              className={`h-2 rounded-full ${SIGNAL_TYPE_COLORS[type] ?? "bg-surface-elevated"}`}
                              style={{ width: `${(count / maxTypeCount) * 100}%` }}
                            />
                          </div>
                          {isExpanded && (
                            <div className="mt-2 space-y-1 pl-2 border-l border-border">
                              {signalsOfType.slice(0, 5).map((s) => (
                                <button
                                  key={s.id}
                                  onClick={() => setSelectedSignal(s)}
                                  className="block w-full text-left rounded px-2 py-1 text-xs text-foreground-secondary hover:bg-background hover:text-white transition-colors"
                                >
                                  {new Date(s.createdAt).toLocaleDateString("fr-FR")} — {s.severity}
                                </button>
                              ))}
                              {signalsOfType.length > 5 && (
                                <p className="text-[10px] text-foreground-muted pl-2">+ {signalsOfType.length - 5} de plus</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Right: Critical alerts */}
            <div className="rounded-xl border border-border bg-background/80 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Zap className="h-4 w-4 text-error" /> Alertes critiques
                </h3>
                <span className="text-xs text-foreground-muted">{criticalAlerts} alerte(s)</span>
              </div>
              {criticalSignals.length === 0 ? (
                <p className="text-sm text-foreground-muted">Aucune alerte critique active.</p>
              ) : (
                <div className="space-y-2">
                  {criticalSignals.map((signal) => (
                    <button
                      key={signal.id}
                      onClick={() => setSelectedSignal(signal)}
                      className="flex w-full items-center justify-between rounded-lg border border-border p-3 transition-colors hover:border-border hover:bg-background/50 cursor-pointer text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {signal.severity === "critical" ? (
                            <AlertCircle className="h-4 w-4 text-error" />
                          ) : (
                            <TrendingUp className="h-4 w-4 text-warning" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{signal.type.replace(/_/g, " ")}</p>
                          <p className="text-xs text-foreground-secondary">
                            {new Date(signal.createdAt).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={signal.severity} variantMap={SEVERITY_MAP} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom: Timeline */}
          <div className="rounded-xl border border-border bg-background/80 p-6">
            <h3 className="mb-4 font-semibold text-white flex items-center gap-2">
              <Activity className="h-4 w-4" /> Fil d&apos;evenements recents
            </h3>
            {timelineEvents.length === 0 ? (
              <p className="text-sm text-foreground-muted">Aucun evenement recent.</p>
            ) : (
              <Timeline events={timelineEvents} />
            )}
          </div>
        </>
      )}

      {!selectedStrategyId && (
        <EmptyState
          icon={Radio}
          title="Selectionnez un client"
          description="Choisissez un client ci-dessus pour voir le tableau de bord d'intelligence signaux."
        />
      )}

      {/* Signal Detail Modal */}
      <Modal
        open={!!selectedSignal}
        onClose={() => setSelectedSignal(null)}
        title={selectedSignal ? selectedSignal.type.replace(/_/g, " ") : ""}
        size="lg"
      >
        {selectedSignal && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={selectedSignal.severity} variantMap={SEVERITY_MAP} />
              <span className="text-xs text-foreground-secondary">
                {new Date(selectedSignal.createdAt).toLocaleString("fr-FR")}
              </span>
            </div>
            <div className="rounded-lg bg-background/50 p-4">
              <h4 className="text-sm font-medium text-foreground-secondary mb-2">Donnees du signal</h4>
              <pre className="text-xs text-foreground-secondary whitespace-pre-wrap overflow-auto max-h-64">
                {JSON.stringify(selectedSignal.data, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
