"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { AdvertisRadar } from "@/components/shared/advertis-radar";
import { DevotionLadder } from "@/components/shared/devotion-ladder";
import { CultIndex } from "@/components/shared/cult-index";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { MissionCard } from "@/components/shared/mission-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage, SkeletonCard } from "@/components/shared/loading-skeleton";
import { Timeline } from "@/components/shared/timeline";
import { Sparkline } from "@/components/shared/sparkline";
import { PipelineProgress, buildPipelineSteps } from "@/components/shared/pipeline-progress";
import { AiBadge } from "@/components/shared/ai-badge";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { buildPillarContentMap } from "@/components/shared/pillar-content-card";
import Link from "next/link";
import {
  Activity,
  Rocket,
  AlertTriangle,
  Eye,
  Fingerprint,
  Target,
  Lightbulb,
  Users,
  TrendingUp,
  Crown,
  Heart,
  Brain,
  ArrowRight,
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

  const superfanCountQuery = trpc.superfan.count.useQuery(
    { strategyId: strategyId! },
    { enabled: !!strategyId },
  );

  const superfanVelocityQuery = trpc.superfan.velocity.useQuery(
    { strategyId: strategyId!, days: 30 },
    { enabled: !!strategyId },
  );

  const cultIndexQuery = trpc.cultIndex.trend.useQuery(
    { strategyId: strategyId! },
    { enabled: !!strategyId },
  );

  const mestorInsightsQuery = trpc.mestor.getInsights.useQuery(
    { strategyId: strategyId! },
    { enabled: !!strategyId, staleTime: 5 * 60_000 },
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

  // Brand content from pillars (field names match Zod schemas: pillar-schemas.ts)
  const pillarContentMap = buildPillarContentMap(
    (strategy as Record<string, unknown> & { pillars?: Array<{ key: string; content: unknown }> })?.pillars,
  );
  const authContent = pillarContentMap["a"];   // A: noyauIdentitaire, prophecy, valeurs, archetype...
  const distContent = pillarContentMap["d"];   // D: positionnement, promesseMaitre, tonDeVoix...
  const valeurContent = pillarContentMap["v"]; // V: produitsCatalogue, unitEconomics...
  const engageContent = pillarContentMap["e"]; // E: rituels, touchpoints, kpis...

  // Extract key qualitative text per pillar — values, not scores
  function getPillarHeadline(key: string): string {
    const c = pillarContentMap[key.toLowerCase()];
    if (!c) return "";
    switch (key.toLowerCase()) {
      case "a": return safeString(c.prophecy) || safeString(c.noyauIdentitaire) || "";
      case "d": return safeString(c.promesseMaitre) || safeString(c.positionnement) || "";
      case "v": {
        const cat = c.produitsCatalogue;
        if (Array.isArray(cat) && cat.length > 0) {
          const first = cat[0] as Record<string, unknown>;
          return safeString(first?.nom) || safeString(first?.categorie) || "";
        }
        return "";
      }
      case "e": {
        const tp = c.touchpoints;
        if (Array.isArray(tp) && tp.length > 0) {
          const first = tp[0] as Record<string, unknown>;
          return safeString(first?.canal) || safeString(first?.role) || "";
        }
        const rit = c.rituels;
        if (Array.isArray(rit) && rit.length > 0) {
          const first = rit[0] as Record<string, unknown>;
          return safeString(first?.nom) || safeString(first?.description) || "";
        }
        return "";
      }
      case "r": {
        const swot = c.globalSwot as Record<string, unknown> | undefined;
        if (swot) {
          const strengths = swot.strengths;
          if (Array.isArray(strengths) && strengths.length > 0) return safeString(strengths[0]);
        }
        const miti = c.mitigationPriorities;
        if (Array.isArray(miti) && miti.length > 0) return safeString((miti[0] as Record<string, unknown>)?.action) || "";
        return "";
      }
      case "t": {
        const tri = c.triangulation as Record<string, unknown> | undefined;
        return safeString(tri?.trendAnalysis)?.substring(0, 120) || "";
      }
      case "i": return safeString(c.syntheseExecutive)?.substring(0, 120) || "";
      case "s": return safeString(c.visionStrategique)?.substring(0, 120) || safeString(c.syntheseExecutive)?.substring(0, 120) || "";
      default: return "";
    }
  }

  // Find weakest/strongest RTIS pillars (ADVE is qualitative, focus scoring on RTIS)
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
          description={`Marque : ${strategy?.name ?? "..."}`}
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
        {/* Identite & Positionnement */}
        <div className="lg:col-span-2 rounded-xl border border-violet-800/30 bg-gradient-to-br from-violet-950/30 to-zinc-900/80 p-6">
          <div className="mb-3 flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-violet-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-400">Identite de marque</h3>
          </div>
          {authContent?.noyauIdentitaire || authContent?.prophecy ? (
            <p className="text-lg font-semibold leading-relaxed text-white">
              {safeString(authContent.noyauIdentitaire || authContent.prophecy)}
            </p>
          ) : (
            <p className="text-sm text-zinc-500 italic">Noyau identitaire non defini — remplissez le pilier A (Authenticite)</p>
          )}
          {!!distContent?.positionnement && (
            <p className="mt-2 text-sm text-zinc-300">
              <span className="text-zinc-500">Positionnement :</span>{" "}
              {safeString(distContent.positionnement)}
            </p>
          )}
          {!!distContent?.promesseMaitre && (
            <p className="mt-2 text-sm font-medium text-violet-300 italic">
              &ldquo;{safeString(distContent.promesseMaitre)}&rdquo;
            </p>
          )}
          {!!authContent?.valeurs && Array.isArray(authContent.valeurs) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(authContent.valeurs as Array<Record<string, unknown>>).slice(0, 6).map((v, i) => (
                <span key={i} className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-300">
                  {safeString(v.customName || v.value || v)}
                </span>
              ))}
            </div>
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
              {getPillarHeadline(strongestPillar[0]) ? (
                <p className="mt-0.5 text-xs text-zinc-400 line-clamp-2">{getPillarHeadline(strongestPillar[0])}</p>
              ) : (
                <p className="text-xs text-zinc-600">{strongestPillar[1].toFixed(1)}/25</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase text-zinc-600">Priorite d'amelioration</p>
              <p className="mt-1 text-sm font-semibold text-amber-400">
                {weakestPillar[0].toUpperCase()} — {PILLAR_NAMES[weakestPillar[0]]}
              </p>
              {getPillarHeadline(weakestPillar[0]) ? (
                <p className="mt-0.5 text-xs text-zinc-400 line-clamp-2">{getPillarHeadline(weakestPillar[0])}</p>
              ) : (
                <p className="text-xs text-zinc-600 italic">Contenu a remplir</p>
              )}
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-amber-950/20 p-3">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
              <p className="text-xs text-zinc-300">
                Renforcer {PILLAR_NAMES[weakestPillar[0]]} pour convertir plus de superfans et debloquer le prochain palier.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* NORTHSTAR: Active Superfans Hero */}
      {showSection("kpi") && (
        <>
          <div className="rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-950/40 via-fuchsia-950/20 to-zinc-900/80 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/20 ring-1 ring-violet-500/30">
                  <Crown className="h-7 w-7 text-violet-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400/80">Northstar</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-black tabular-nums text-white">
                      {superfanCountQuery.data?.active ?? "—"}
                    </span>
                    <span className="text-sm font-medium text-zinc-400">superfans actifs</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 sm:gap-6">
                <div className="text-right">
                  <p className="text-[10px] font-medium uppercase text-zinc-500">Evangelistes</p>
                  <p className="text-lg font-bold text-fuchsia-400">{superfanCountQuery.data?.evangelistes ?? 0}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-medium uppercase text-zinc-500">Ratio superfan</p>
                  <p className="text-lg font-bold text-violet-300">{superfanCountQuery.data?.ratio ?? 0}%</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-medium uppercase text-zinc-500">Velocite /30j</p>
                  <div className="flex items-center justify-end gap-1">
                    {superfanVelocityQuery.data?.trend === "up" && <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
                    {superfanVelocityQuery.data?.trend === "down" && <TrendingUp className="h-3.5 w-3.5 rotate-180 text-red-400" />}
                    <span className={`text-lg font-bold ${
                      superfanVelocityQuery.data?.trend === "up" ? "text-emerald-400" :
                      superfanVelocityQuery.data?.trend === "down" ? "text-red-400" : "text-zinc-400"
                    }`}>
                      {superfanVelocityQuery.data?.delta != null
                        ? `${superfanVelocityQuery.data.delta > 0 ? "+" : ""}${superfanVelocityQuery.data.delta}`
                        : "—"}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-medium uppercase text-zinc-500">Total profiles</p>
                  <p className="text-lg font-bold text-zinc-300">{superfanCountQuery.data?.total ?? 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-foreground-muted">Cult Index</p>
                <Sparkline data={cultTrend} width={60} height={20} />
              </div>
              <CultIndex
                score={cultIndexQuery.data?.current ?? cultIndex}
                trend={(cultIndexQuery.data?.trend?.toLowerCase() as "up" | "down" | "stable") ?? "stable"}
                trendValue={Math.abs(cultIndexQuery.data?.delta ?? 0)}
                variant="compact"
                className="mt-2"
              />
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

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-foreground-muted">Score ADVE-RTIS</p>
                <Sparkline data={scoreTrend} width={60} height={20} />
              </div>
              <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">{Math.round(composite)}<span className="text-xs text-foreground-muted">/200</span></p>
            </div>
          </div>
        </>
      )}

      {/* Radar + Devotion Ladder */}
      {(showSection("radar") || showSection("devotion")) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {showSection("radar") && (
            <div className="space-y-4">
              {/* Pipeline ADVE → RTIS */}
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Pipeline de transformation</h3>
                  <Link href="/cockpit/insights/diagnostics" className="text-[10px] text-foreground-muted hover:text-foreground">
                    Voir le radar →
                  </Link>
                </div>
                <PipelineProgress steps={buildPipelineSteps(scores, {})} />
              </div>
              {/* Acces direct L'Oracle */}
              <Link
                href="/cockpit/brand/proposition"
                className="flex items-center gap-3 rounded-xl border border-violet-800/30 bg-violet-950/20 p-4 transition-colors hover:bg-violet-950/30"
              >
                <Brain className="h-5 w-5 text-violet-400" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-violet-300">L'Oracle</p>
                  <p className="text-[10px] text-violet-400/60">Proposition strategique vivante</p>
                </div>
                <ArrowRight className="h-4 w-4 text-violet-400/40" />
              </Link>
            </div>
          )}

          {showSection("devotion") && (
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Devotion Ladder</h3>
                <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                  <Heart className="h-3 w-3 text-violet-400" />
                  <span>{superfanCountQuery.data?.active ?? 0} superfans actifs</span>
                </div>
              </div>
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

      {/* Prescriptions Mestor */}
      {showSection("prescriptions") && (
        <div className="rounded-xl border border-amber-800/30 bg-amber-950/10 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Brain className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-foreground">Prescriptions Mestor</h3>
            <AiBadge />
          </div>
          {mestorInsightsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 animate-[shimmer_2s_linear_infinite] rounded-lg bg-background-overlay" />
              ))}
            </div>
          ) : (mestorInsightsQuery.data ?? []).length > 0 ? (
            <div className="space-y-2">
              {(mestorInsightsQuery.data ?? []).slice(0, 4).map((insight: { type: string; severity: string; title: string; description: string; suggestedAction?: string }, i: number) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg bg-background-raised/50 px-4 py-3"
                >
                  <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                    insight.severity === "CRITICAL" ? "bg-red-500" :
                    insight.severity === "HIGH" ? "bg-amber-500" :
                    insight.severity === "MEDIUM" ? "bg-yellow-500" : "bg-zinc-500"
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium uppercase text-amber-400/70">{insight.type}</span>
                      <p className="text-sm font-medium text-foreground">{insight.title}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-foreground-secondary">{insight.description}</p>
                    {insight.suggestedAction && (
                      <p className="mt-1 text-xs font-medium text-amber-400">→ {insight.suggestedAction}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : alertSignals.length > 0 ? (
            <div className="space-y-2">
              {alertSignals.slice(0, 3).map((signal, i) => {
                const data = signal.data as Record<string, unknown> | null;
                return (
                  <div key={signal.id ?? i} className="flex items-start gap-3 rounded-lg bg-background-raised/50 px-4 py-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{(data?.title as string) ?? signal.type}</p>
                      {!!data?.description && <p className="mt-0.5 text-xs text-foreground-secondary">{safeString(data.description)}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-foreground-muted">Aucune prescription active — Mestor surveille votre marque.</p>
          )}
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
