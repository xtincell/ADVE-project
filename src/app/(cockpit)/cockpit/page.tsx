"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { AdvertisRadar } from "@/components/shared/advertis-radar";
import { ScoreBadge } from "@/components/shared/score-badge";
import { DevotionLadder } from "@/components/shared/devotion-ladder";
import { CultIndex } from "@/components/shared/cult-index";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { MissionCard } from "@/components/shared/mission-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage, SkeletonCard } from "@/components/shared/loading-skeleton";
import { Timeline } from "@/components/shared/timeline";
import { Sparkline } from "@/components/shared/sparkline";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { buildPillarContentMap } from "@/components/shared/pillar-content-card";
import {
  Activity,
  Rocket,
  AlertTriangle,
  Coins,
  Eye,
  Fingerprint,
  Target,
  Lightbulb,
} from "lucide-react";
import { PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";

/** Safely render a value that might be nested object/array */
function safeString(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  try { return JSON.stringify(val); } catch { return "[valeur complexe]"; }
}

type ViewMode = "EXECUTIVE" | "MARKETING" | "FOUNDER" | "MINIMAL";

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  EXECUTIVE: "Executive",
  MARKETING: "Marketing",
  FOUNDER: "Founder",
  MINIMAL: "Minimal",
};

export default function CockpitDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>("MARKETING");
  const strategyId = useCurrentStrategyId();

  const strategyQuery = trpc.strategy.getWithScore.useQuery(
    { id: strategyId! },
    { enabled: !!strategyId },
  );

  const devotionQuery = trpc.devotionLadder.getByStrategy.useQuery(
    { strategyId: strategyId! },
    { enabled: !!strategyId },
  );

  const missionsQuery = trpc.mission.list.useQuery(
    { strategyId: strategyId!, limit: 5 },
    { enabled: !!strategyId },
  );

  const signalsQuery = trpc.signal.list.useQuery(
    { strategyId: strategyId!, limit: 8 },
    { enabled: !!strategyId },
  );

  const scoreHistoryQuery = trpc.analytics.getScoreHistory.useQuery(
    { strategyId: strategyId!, limit: 8 },
    { enabled: !!strategyId },
  );

  const campaignsQuery = trpc.campaign.list.useQuery(
    { strategyId: strategyId ?? undefined },
    { enabled: !!strategyId },
  );

  if (!strategyId || strategyQuery.isLoading) {
    return <SkeletonPage />;
  }

  if (strategyQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cult Dashboard" />
        <div className="rounded-xl border border-destructive-subtle bg-destructive-subtle/20 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-2 text-sm text-destructive">
            Erreur de chargement : {strategyQuery.error.message}
          </p>
          <button
            onClick={() => strategyQuery.refetch()}
            className="mt-3 rounded-lg bg-background-overlay px-4 py-2 text-sm text-foreground hover:bg-border"
          >
            Reessayer
          </button>
        </div>
      </div>
    );
  }

  const strategy = strategyQuery.data;
  const vector = (strategy?.advertis_vector as Record<string, number>) ?? {};
  const scores: Partial<Record<PillarKey, number>> = {
    a: vector.a ?? 0, d: vector.d ?? 0, v: vector.v ?? 0, e: vector.e ?? 0,
    r: vector.r ?? 0, t: vector.t ?? 0, i: vector.i ?? 0, s: vector.s ?? 0,
  };
  const composite = strategy?.composite ?? 0;
  const cultIndex = Math.round(composite / 2);

  const devotion = devotionQuery.data;
  const devotionValues = {
    spectateur: devotion?.spectateur ?? 35,
    interesse: devotion?.interesse ?? 25,
    participant: devotion?.participant ?? 20,
    engage: devotion?.engage ?? 12,
    ambassadeur: devotion?.ambassadeur ?? 5,
    evangeliste: devotion?.evangeliste ?? 3,
  };

  const missions = missionsQuery.data ?? [];
  const activeMissions = missions.filter((m) => m.status === "IN_PROGRESS" || m.status === "DRAFT");
  const activeCampaigns = (campaignsQuery.data ?? []).filter((c) => c.status === "ACTIVE");
  const signals = signalsQuery.data ?? [];
  const alertSignals = signals.filter((s) => s.type === "DRIFT_ALERT" || s.type === "INTERVENTION_REQUEST");

  const timelineEvents = signals.slice(0, 6).map((s) => {
    const data = s.data as Record<string, unknown> | null;
    return {
      date: (s.createdAt as unknown as string) ?? new Date().toISOString(),
      title: (data?.title as string) ?? s.type,
      description: (data?.description as string) ?? undefined,
      type: s.type === "DRIFT_ALERT" ? ("warning" as const) : s.type === "INTERVENTION_REQUEST" ? ("error" as const) : ("info" as const),
    };
  });

  // Build sparkline from real ScoreSnapshot history (oldest to newest)
  const snapshots = scoreHistoryQuery.data ?? [];
  const sortedSnapshots = [...snapshots].reverse(); // API returns desc, we need asc for sparkline
  const scoreTrend = sortedSnapshots.map((s) => {
    const vec = s.advertis_vector as Record<string, number> | null;
    return vec
      ? ["a", "d", "v", "e", "r", "t", "i", "s"].reduce((sum, k) => sum + (vec[k] ?? 0), 0)
      : 0;
  });
  const cultTrend = scoreTrend.map((s) => Math.round(s / 2));

  // Brand content from pillars
  const pillarContentMap = buildPillarContentMap(
    (strategy as Record<string, unknown> & { pillars?: Array<{ key: string; content: unknown }> })?.pillars,
  );
  const visionContent = pillarContentMap["a"];
  const distinctionContent = pillarContentMap["d"];
  const valeurContent = pillarContentMap["v"];

  // Find weakest pillar for strategic focus
  const pillarEntries = Object.entries(scores) as [PillarKey, number][];
  const weakestPillar = pillarEntries.reduce((min, [k, v]) => (v < min[1] ? [k, v] : min), pillarEntries[0]!);
  const strongestPillar = pillarEntries.reduce((max, [k, v]) => (v > max[1] ? [k, v] : max), pillarEntries[0]!);

  const showSection = (section: "kpi" | "radar" | "devotion" | "prescriptions" | "missions" | "timeline") => {
    switch (viewMode) {
      case "EXECUTIVE": return ["kpi", "devotion", "prescriptions"].includes(section);
      case "MARKETING": return true;
      case "FOUNDER": return ["kpi", "radar", "prescriptions"].includes(section);
      case "MINIMAL": return ["prescriptions", "missions"].includes(section);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with mode selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Cult Dashboard"
          description={`Strategie : ${strategy?.name ?? "..."}`}
          breadcrumbs={[{ label: "Cockpit", href: "/cockpit" }, { label: "Dashboard" }]}
        />
        <div className="flex gap-1 rounded-lg bg-background-overlay p-1">
          {(Object.keys(VIEW_MODE_LABELS) as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === mode
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {VIEW_MODE_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      {/* Brand Story Hero */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Vision & Positionnement */}
        <div className="lg:col-span-2 rounded-xl border border-violet-800/30 bg-gradient-to-br from-violet-950/30 to-zinc-900/80 p-6">
          <div className="mb-3 flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-violet-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-400">Identite de marque</h3>
          </div>
          {visionContent?.vision ? (
            <p className="text-lg font-semibold leading-relaxed text-white">
              {safeString(visionContent.vision)}
            </p>
          ) : (
            <p className="text-sm text-zinc-500 italic">Vision non definie</p>
          )}
          {!!distinctionContent?.positioning && (
            <p className="mt-2 text-sm text-zinc-300">
              <span className="text-zinc-500">Positionnement :</span>{" "}
              {safeString(distinctionContent.positioning)}
            </p>
          )}
          {!!visionContent?.values && Array.isArray(visionContent.values) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(visionContent.values as string[]).map((v, i) => (
                <span key={i} className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-300">
                  {safeString(v)}
                </span>
              ))}
            </div>
          )}
          {!!valeurContent?.promise && (
            <p className="mt-3 text-xs text-zinc-400">
              <span className="text-zinc-500">Promesse de valeur :</span>{" "}
              {safeString(valeurContent.promise)}
            </p>
          )}
        </div>

        {/* Focus Strategique */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-amber-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400">Focus strategique</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-medium uppercase text-zinc-600">Force principale</p>
              <p className="mt-1 text-sm font-semibold text-emerald-400">
                {strongestPillar[0].toUpperCase()} — {PILLAR_NAMES[strongestPillar[0]]}
              </p>
              <p className="text-xs text-zinc-500">{strongestPillar[1].toFixed(1)}/25</p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase text-zinc-600">Priorite d'amelioration</p>
              <p className="mt-1 text-sm font-semibold text-amber-400">
                {weakestPillar[0].toUpperCase()} — {PILLAR_NAMES[weakestPillar[0]]}
              </p>
              <p className="text-xs text-zinc-500">{weakestPillar[1].toFixed(1)}/25</p>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-amber-950/20 p-3">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
              <p className="text-xs text-zinc-300">
                Renforcer {PILLAR_NAMES[weakestPillar[0]]} pour equilibrer votre profil de marque et debloquer le prochain palier.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      {showSection("kpi") && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-foreground-muted">Score ADVE-RTIS</p>
              <Sparkline data={scoreTrend} width={60} height={20} />
            </div>
            <ScoreBadge score={composite} size="md" delta={8} showRing={false} className="mt-2" />
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-foreground-muted">Cult Index</p>
              <Sparkline data={cultTrend} width={60} height={20} />
            </div>
            <CultIndex score={cultIndex} trend="up" trendValue={5} variant="compact" className="mt-2" />
          </div>

          <StatCard
            title="Missions actives"
            value={activeMissions.length}
            trend={activeMissions.length > 0 ? "up" : "flat"}
            trendValue={`${activeCampaigns.length} campagne${activeCampaigns.length > 1 ? "s" : ""}`}
            icon={Rocket}
          />

          <StatCard
            title="Alertes"
            value={alertSignals.length}
            trend={alertSignals.length > 3 ? "up" : "flat"}
            trendValue={`${alertSignals.length} prescription${alertSignals.length > 1 ? "s" : ""}`}
            icon={AlertTriangle}
          />
        </div>
      )}

      {/* Radar + Devotion Ladder */}
      {(showSection("radar") || showSection("devotion")) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {showSection("radar") && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 text-sm font-semibold text-foreground">Radar ADVE-RTIS</h3>
              <div className="flex justify-center">
                <AdvertisRadar
                  scores={scores}
                  size="md"
                  interactive
                  drillDownBasePath="/cockpit/brand/identity"
                />
              </div>
              <p className="mt-3 text-center text-xs text-foreground-muted">
                Score composite : <span className="font-semibold text-foreground">{composite}/200</span>
              </p>
            </div>
          )}

          {showSection("devotion") && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 text-sm font-semibold text-foreground">Devotion Ladder</h3>
              {devotionQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-6 animate-[shimmer_2s_linear_infinite] rounded-full bg-background-overlay" />
                  ))}
                </div>
              ) : (
                <DevotionLadder {...devotionValues} variant="pyramid" />
              )}
            </div>
          )}
        </div>
      )}

      {/* Prescriptions */}
      {showSection("prescriptions") && alertSignals.length > 0 && (
        <div className="rounded-xl border border-warning-subtle bg-warning-subtle/10 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Eye className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold text-foreground">Prescriptions actives</h3>
          </div>
          <div className="space-y-2">
            {alertSignals.slice(0, 3).map((signal, i) => {
              const data = signal.data as Record<string, unknown> | null;
              return (
                <div
                  key={signal.id ?? i}
                  className="flex items-start gap-3 rounded-lg bg-background-raised/50 px-4 py-3"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {(data?.title as string) ?? signal.type}
                    </p>
                    {!!data?.description && (
                      <p className="mt-0.5 text-xs text-foreground-secondary">{safeString(data.description)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Missions + Timeline */}
      {(showSection("missions") || showSection("timeline")) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {showSection("missions") && (
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Missions recentes</h3>
                <a href="/cockpit/operate/missions" className="text-xs text-foreground-muted hover:text-foreground">
                  Voir tout →
                </a>
              </div>
              {missionsQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : missions.length === 0 ? (
                <EmptyState icon={Rocket} title="Aucune mission" description="Les missions apparaitront ici une fois creees." />
              ) : (
                <div className="space-y-3">
                  {missions.slice(0, 4).map((m) => (
                    <MissionCard
                      key={m.id}
                      mission={{
                        title: m.title,
                        status: m.status,
                        deadline: (m.advertis_vector as Record<string, unknown>)?.deadline as string | undefined,
                        driverChannel: m.driver?.channel,
                        assignee: m.driver?.name,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {showSection("timeline") && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 text-sm font-semibold text-foreground">Activite recente</h3>
              {signalsQuery.isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="h-8 w-8 animate-pulse rounded-full bg-background-overlay" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-background-overlay" />
                        <div className="h-3 w-1/2 animate-pulse rounded bg-background-overlay" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : timelineEvents.length === 0 ? (
                <EmptyState icon={Activity} title="Aucune activite" description="L'activite recente apparaitra ici." />
              ) : (
                <Timeline events={timelineEvents} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
