"use client";

import { trpc } from "@/lib/trpc/client";
import { AdvertisRadar } from "@/components/shared/advertis-radar";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { AiBadge } from "@/components/shared/ai-badge";
import { PILLAR_KEYS, PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Shield,
  Stethoscope,
  Loader2,
} from "lucide-react";

const CONFIDENCE_LABELS: Record<string, { label: string; color: string }> = {
  high: { label: "Haute", color: "text-success" },
  medium: { label: "Moyenne", color: "text-warning" },
  low: { label: "Faible", color: "text-error" },
};

function getConfidenceLevel(score: number): string {
  if (score >= 18) return "high";
  if (score >= 10) return "medium";
  return "low";
}

function getDriftIndicator(
  signals: Array<{ data: Record<string, unknown> | null }>,
  pillar: PillarKey,
) {
  const pillarSignals = signals.filter((s) => {
    const data = s.data as Record<string, unknown> | null;
    return data?.pillar === pillar;
  });
  if (pillarSignals.length === 0) return "stable";
  const latest = pillarSignals[0]!;
  const data = latest.data as Record<string, unknown> | null;
  const impact = (data?.impact as number) ?? 0;
  if (impact > 0) return "up";
  if (impact < 0) return "down";
  return "stable";
}

export default function DiagnosticsPage() {
  const strategyId = useCurrentStrategyId();

  const strategyQuery = trpc.strategy.getWithScore.useQuery(
    { id: strategyId! },
    { enabled: !!strategyId },
  );

  const signalsQuery = trpc.signal.list.useQuery(
    { strategyId: strategyId! },
    { enabled: !!strategyId },
  );

  if (!strategyId || strategyQuery.isLoading) {
    return <SkeletonPage />;
  }

  if (strategyQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Diagnostics ADVE" />
        <div className="rounded-xl border border-error/50 bg-error/20 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-error" />
          <p className="mt-2 text-sm text-error">
            {strategyQuery.error.message}
          </p>
        </div>
      </div>
    );
  }

  const strategy = strategyQuery.data;
  const vector = (strategy?.advertis_vector as Record<string, number>) ?? {};
  const scores: Partial<Record<PillarKey, number>> = {};
  for (const k of PILLAR_KEYS) {
    scores[k] = vector[k] ?? 0;
  }
  const composite = strategy?.composite ?? 0;

  const signals = (signalsQuery.data ?? []) as unknown as Array<{
    data: Record<string, unknown> | null;
    createdAt: string;
  }>;

  const weakPillars = PILLAR_KEYS.filter((k) => (scores[k] ?? 0) < 15);
  const strongPillars = PILLAR_KEYS.filter((k) => (scores[k] ?? 0) >= 20);

  const recalculateMutation = trpc.advertisScorer.scoreObject.useMutation({
    onSuccess: () => {
      strategyQuery.refetch();
      signalsQuery.refetch();
    },
  });

  const handleDiagnostic = () => {
    if (!strategyId) return;
    recalculateMutation.mutate({ type: "strategy", id: strategyId });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diagnostics ADVE"
        description="Analyse pilier par pilier du vecteur ADVE-RTIS"
        badge={<AiBadge />}
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Insights" },
          { label: "Diagnostics" },
        ]}
      />

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Score composite"
          value={composite.toFixed(0)}
          trend={composite > 120 ? "up" : composite > 80 ? "flat" : "down"}
          trendValue="/ 200"
          icon={Activity}
        />
        <StatCard
          title="Piliers forts"
          value={strongPillars.length}
          trend={strongPillars.length >= 4 ? "up" : "flat"}
          trendValue="score >= 20/25"
          icon={Shield}
        />
        <StatCard
          title="Piliers faibles"
          value={weakPillars.length}
          trend={weakPillars.length > 2 ? "down" : "flat"}
          trendValue="score < 15/25"
          icon={AlertTriangle}
        />
      </div>

      {/* Radar - large centered */}
      <div className="rounded-xl border border-border bg-background/80 p-6">
        <h3 className="mb-4 text-center font-semibold text-white">
          Vecteur ADVE-RTIS actuel
        </h3>
        <AdvertisRadar scores={scores} size={400} className="flex justify-center" />
      </div>

      {/* 8 Pillar cards - 2 column grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {PILLAR_KEYS.map((key) => {
          const score = scores[key] ?? 0;
          const confidence = getConfidenceLevel(score);
          const confInfo = CONFIDENCE_LABELS[confidence] ?? { label: "Inconnu", color: "text-foreground-secondary" };
          const drift = getDriftIndicator(signals, key);
          const isWeak = score < 15;

          const lastSignal = signals.find((s) => {
            const data = s.data as Record<string, unknown> | null;
            return data?.pillar === key;
          });
          const lastSignalDate = lastSignal
            ? new Date(lastSignal.createdAt ?? Date.now()).toLocaleDateString("fr-FR")
            : "Aucun";

          return (
            <div
              key={key}
              className={`rounded-xl border p-5 transition-colors ${
                isWeak
                  ? "border-warning/50 bg-warning/10"
                  : "border-border bg-background/80 hover:border-border"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold text-white ${
                      isWeak ? "bg-warning/50" : "bg-background"
                    }`}
                  >
                    {key.toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {PILLAR_NAMES[key]}
                    </p>
                    <p className="text-xs text-foreground-secondary">
                      {score.toFixed(1)} / 25
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {drift === "up" && (
                    <TrendingUp className="h-4 w-4 text-success" />
                  )}
                  {drift === "down" && (
                    <TrendingDown className="h-4 w-4 text-error" />
                  )}
                  {drift === "stable" && (
                    <Minus className="h-4 w-4 text-foreground-muted" />
                  )}
                  {isWeak && (
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 h-2.5 rounded-full bg-background">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isWeak
                      ? "bg-warning"
                      : score >= 20
                        ? "bg-success"
                        : "bg-accent"
                  }`}
                  style={{ width: `${(score / 25) * 100}%` }}
                />
              </div>

              {/* Meta row */}
              <div className="mt-3 flex items-center justify-between text-xs text-foreground-muted">
                <span>
                  Confiance :{" "}
                  <span className={confInfo.color}>{confInfo.label}</span>
                </span>
                <span>Dernier signal : {lastSignalDate}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Weak pillars warning section */}
      {weakPillars.length > 0 && (
        <div className="rounded-xl border border-warning/50 bg-warning/10 p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h3 className="font-semibold text-warning">
              Piliers necessitant une attention
            </h3>
          </div>
          <p className="mt-2 text-sm text-warning/70">
            {weakPillars.length} pilier{weakPillars.length > 1 ? "s" : ""} en
            dessous de 15/25 :{" "}
            {weakPillars
              .map(
                (k) =>
                  `${PILLAR_NAMES[k]} (${(scores[k] ?? 0).toFixed(1)})`,
              )
              .join(", ")}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {weakPillars.map((k) => (
              <div
                key={k}
                className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/20 p-3"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/30 text-xs font-bold text-warning">
                  {k.toUpperCase()}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-warning">
                    {PILLAR_NAMES[k]}
                  </p>
                  <div className="mt-1 h-1.5 rounded-full bg-warning/30">
                    <div
                      className="h-full rounded-full bg-warning"
                      style={{
                        width: `${((scores[k] ?? 0) / 25) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold text-warning">
                  {(scores[k] ?? 0).toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action: request diagnostic */}
      <div className="flex justify-center">
        <button
          onClick={handleDiagnostic}
          disabled={recalculateMutation.isPending}
          className="flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-accent disabled:opacity-50"
        >
          {recalculateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Stethoscope className="h-4 w-4" />
          )}
          {recalculateMutation.isPending ? "Diagnostic en cours..." : "Demander un Diagnostic"}
        </button>
        {recalculateMutation.isSuccess && (
          <p className="text-xs text-success mt-2">Diagnostic termine avec succes.</p>
        )}
        {recalculateMutation.isError && (
          <p className="text-xs text-error mt-2">{recalculateMutation.error.message}</p>
        )}
      </div>
    </div>
  );
}
