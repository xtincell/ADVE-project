"use client";

import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import {
  Brain, Target, TrendingUp, BarChart3, Layers, Shield,
  Crosshair, Rocket, Fingerprint, Sparkles, Eye, Activity,
  CheckCircle2, ArrowLeft, Star, Gauge, Users, Crown,
} from "lucide-react";
import Link from "next/link";
import { CultIndex } from "@/components/shared/cult-index";
import { DevotionLadder } from "@/components/shared/devotion-ladder";

// ============================================================================
// HELPERS
// ============================================================================

function safeStr(val: unknown, fb = ""): string {
  return typeof val === "string" ? val : typeof val === "number" ? String(val) : fb;
}
function safeNum(val: unknown, fb = 0): number {
  return typeof val === "number" ? val : fb;
}
function safeArr(val: unknown): Record<string, unknown>[] {
  return Array.isArray(val) ? val : [];
}

const PILLAR_COLORS: Record<string, { accent: string; bg: string; border: string }> = {
  A: { accent: "text-accent", bg: "bg-accent/10", border: "border-accent/40" },
  D: { accent: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-800/40" },
  V: { accent: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-800/40" },
  E: { accent: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-800/40" },
  R: { accent: "text-error", bg: "bg-error/10", border: "border-red-800/40" },
  T: { accent: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-800/40" },
  I: { accent: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-800/40" },
  S: { accent: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-800/40" },
};

const PILLAR_ICONS: Record<string, React.ElementType> = {
  A: Fingerprint, D: Eye, V: TrendingUp, E: Sparkles,
  R: Shield, T: Crosshair, I: Rocket, S: Brain,
};

const FREQ_LABELS: Record<string, string> = {
  DAILY: "Quotidien",
  WEEKLY: "Hebdomadaire",
  MONTHLY: "Mensuel",
  QUARTERLY: "Trimestriel",
};

// ============================================================================
// PAGE
// ============================================================================

export default function SynthesePage() {
  const strategyId = useCurrentStrategyId();

  const pillarQuery = trpc.pillar.get.useQuery(
    { strategyId: strategyId!, key: "S" },
    { enabled: !!strategyId },
  );

  // Load strategy for branding context
  const allPillarsQuery = trpc.pillar.getAll.useQuery(
    { strategyId: strategyId! },
    { enabled: !!strategyId },
  );

  // Cult Index — the northstar engagement metric
  const cultIndexQuery = trpc.cultIndex.trend.useQuery(
    { strategyId: strategyId! },
    { enabled: !!strategyId },
  );

  // Devotion Ladder — community distribution
  const devotionQuery = trpc.devotionLadder.getByStrategy.useQuery(
    { strategyId: strategyId! },
    { enabled: !!strategyId },
  );

  // Superfan count — THE northstar metric
  const superfanCountQuery = trpc.superfan.count.useQuery(
    { strategyId: strategyId! },
    { enabled: !!strategyId },
  );

  const superfanVelocityQuery = trpc.superfan.velocity.useQuery(
    { strategyId: strategyId!, days: 30 },
    { enabled: !!strategyId },
  );

  if (!strategyId) {
    return (
      <div className="p-8">
        <PageHeader title="Synthese Strategique" />
        <p className="mt-4 text-sm text-foreground-muted">Aucune strategie selectionnee.</p>
      </div>
    );
  }

  if (pillarQuery.isLoading) return <SkeletonPage />;

  const content = (pillarQuery.data?.pillar?.content ?? {}) as Record<string, unknown>;
  const score = pillarQuery.data?.score;
  const allPillars = allPillarsQuery.data ?? {};

  // Compute ADVE-RTIS total score
  const totalScore = Object.values(allPillars).reduce((sum, p) => {
    const pillarData = p as { score: number } | undefined;
    return sum + (pillarData?.score ?? 0);
  }, 0);

  const coherenceScore = safeNum(content.coherenceScore);
  const syntheseExecutive = safeStr(content.syntheseExecutive);
  const visionStrategique = safeStr(content.visionStrategique);
  const facteursCles = safeArr(content.facteursClesSucces).map((f) => (typeof f === "string" ? f : safeStr(f)));
  const recommandations = safeArr(content.recommandationsPrioritaires);
  const axes = safeArr(content.axesStrategiques);
  const coherencePiliers = safeArr(content.coherencePiliers);
  const sprint90 = safeArr(content.sprint90Recap).map((s) => (typeof s === "string" ? s : safeStr(s)));
  const kpiDashboard = safeArr(content.kpiDashboard);

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/cockpit/brand/rtis" className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground-secondary mb-3 transition-colors">
            <ArrowLeft className="h-3 w-3" />
            Retour RTIS
          </Link>
          <PageHeader title="Synthese Strategique" />
        </div>
      </div>

      {/* Coherence indicator — subtle, not hero */}
      {coherenceScore > 0 && (
        <div className="flex items-center gap-4 text-sm text-foreground-muted">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" />
            <span>Coherence inter-piliers: <span className="text-accent font-medium">{coherenceScore}/100</span></span>
          </div>
          <span className="text-foreground-muted">|</span>
          <span>{facteursCles.length} facteurs cles</span>
          <span className="text-foreground-muted">|</span>
          <span>{recommandations.length} recommandations</span>
          <span className="text-foreground-muted">|</span>
          <span>{kpiDashboard.length} KPIs</span>
        </div>
      )}

      {/* ── NORTHSTAR: Active Superfans ─────────────── */}
      <section className="rounded-2xl border border-accent/30 bg-gradient-to-r from-violet-950/40 via-fuchsia-950/20 to-zinc-900/80 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/20 ring-1 ring-violet-500/30">
              <Crown className="h-7 w-7 text-accent" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent/80">Northstar</p>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-black tabular-nums text-white">
                  {superfanCountQuery.data?.active ?? "—"}
                </span>
                <span className="text-sm font-medium text-foreground-secondary">superfans actifs</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase text-foreground-muted">Evangelistes</p>
              <p className="text-lg font-bold text-fuchsia-400">{superfanCountQuery.data?.evangelistes ?? 0}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase text-foreground-muted">Ratio superfan</p>
              <p className="text-lg font-bold text-accent">{superfanCountQuery.data?.ratio ?? 0}%</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase text-foreground-muted">Velocite /30j</p>
              <div className="flex items-center justify-end gap-1">
                {superfanVelocityQuery.data?.trend === "up" && <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
                {superfanVelocityQuery.data?.trend === "down" && <TrendingUp className="h-3.5 w-3.5 rotate-180 text-error" />}
                <span className={`text-lg font-bold ${
                  superfanVelocityQuery.data?.trend === "up" ? "text-emerald-400" :
                  superfanVelocityQuery.data?.trend === "down" ? "text-error" : "text-foreground-secondary"
                }`}>
                  {superfanVelocityQuery.data?.delta != null
                    ? `${superfanVelocityQuery.data.delta > 0 ? "+" : ""}${superfanVelocityQuery.data.delta}`
                    : "—"}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase text-foreground-muted">Total profiles</p>
              <p className="text-lg font-bold text-foreground-secondary">{superfanCountQuery.data?.total ?? 0}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Cult Index + Devotion Ladder ─────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cult Index */}
        <div className="rounded-2xl border border-pink-800/30 bg-gradient-to-b from-pink-950/10 to-zinc-900/40 p-6">
          <h2 className="text-lg font-bold text-pink-300 mb-4 flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Cult Index
          </h2>
          {cultIndexQuery.data ? (
            <CultIndex
              score={cultIndexQuery.data.current}
              trend={cultIndexQuery.data.trend === "UP" ? "up" : cultIndexQuery.data.trend === "DOWN" ? "down" : "stable"}
              variant="gauge"
            />
          ) : (
            <div className="flex items-center justify-center h-40">
              <p className="text-sm text-foreground-muted italic">Pas encore de donnees — calculez un snapshot via le dashboard.</p>
            </div>
          )}
        </div>

        {/* Devotion Ladder */}
        <div className="rounded-2xl border border-accent/30 bg-gradient-to-b from-violet-950/10 to-zinc-900/40 p-6">
          <h2 className="text-lg font-bold text-accent mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Devotion Ladder
          </h2>
          {devotionQuery.data ? (
            <DevotionLadder
              spectateur={devotionQuery.data.spectateur}
              interesse={devotionQuery.data.interesse}
              participant={devotionQuery.data.participant}
              engage={devotionQuery.data.engage}
              ambassadeur={devotionQuery.data.ambassadeur}
              evangeliste={devotionQuery.data.evangeliste}
              variant="pyramid"
            />
          ) : (
            <div className="flex items-center justify-center h-40">
              <p className="text-sm text-foreground-muted italic">Pas encore de snapshot de devotion.</p>
            </div>
          )}
        </div>
      </section>

      {/* Executive Summary */}
      {syntheseExecutive && (
        <section className="rounded-2xl border border-pink-800/30 bg-gradient-to-b from-pink-950/10 to-zinc-900/40 p-6">
          <h2 className="text-lg font-bold text-pink-300 mb-4 flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Synthese Executive
          </h2>
          <p className="text-sm text-foreground-secondary leading-relaxed whitespace-pre-line">{syntheseExecutive}</p>
        </section>
      )}

      {/* Strategic Vision */}
      {visionStrategique && (
        <section className="rounded-2xl border border-accent/30 bg-gradient-to-b from-violet-950/10 to-zinc-900/40 p-6">
          <h2 className="text-lg font-bold text-accent mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Vision Strategique (3-5 ans)
          </h2>
          <p className="text-sm text-foreground-secondary leading-relaxed whitespace-pre-line">{visionStrategique}</p>
        </section>
      )}

      {/* Strategic Axes */}
      {axes.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-orange-400" />
            Axes Strategiques
          </h2>
          <div className="grid gap-4">
            {axes.map((axe, i) => {
              const linked = Array.isArray(axe.pillarsLinked) ? axe.pillarsLinked : [];
              const kpis = Array.isArray(axe.kpis) ? axe.kpis : [];
              return (
                <div key={i} className="rounded-xl border border-border bg-background/60 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-bold text-white">{safeStr(axe.axe, `Axe ${i + 1}`)}</h3>
                    <div className="flex gap-1">
                      {linked.map((p) => {
                        const key = typeof p === "string" ? p : "";
                        const colors = PILLAR_COLORS[key];
                        const Icon = PILLAR_ICONS[key] ?? Layers;
                        return colors ? (
                          <span key={key} className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${colors.bg} ${colors.accent}`}>
                            <Icon className="h-3 w-3" />{key}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                  {kpis.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {kpis.map((kpi, j) => (
                        <span key={j} className="rounded-full bg-background px-2.5 py-1 text-[11px] text-foreground-secondary">
                          {typeof kpi === "string" ? kpi : safeStr(kpi)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Key Success Factors */}
      {facteursCles.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-400" />
            Facteurs Cles de Succes
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {facteursCles.map((f, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-border bg-background/60 p-4">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xs font-bold text-amber-300">{i + 1}</span>
                <p className="text-sm text-foreground-secondary">{typeof f === "string" ? f : ""}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Priority Recommendations */}
      {recommandations.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Recommandations Prioritaires
          </h2>
          <div className="space-y-2">
            {recommandations.map((r, i) => {
              const source = safeStr(r.source);
              const colors = PILLAR_COLORS[source];
              return (
                <div key={i} className="flex items-center gap-4 rounded-xl border border-border bg-background/60 p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">
                    {safeNum(r.priority, i + 1)}
                  </span>
                  <p className="flex-1 text-sm text-foreground-secondary">{safeStr(r.recommendation)}</p>
                  {colors && (
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${colors.bg} ${colors.accent}`}>{source}</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Coherence Map */}
      {coherencePiliers.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-cyan-400" />
            Carte de Coherence Inter-Piliers
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs font-bold text-foreground-muted uppercase">Lien</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-foreground-muted uppercase">Contribution</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-foreground-muted uppercase">Articulation</th>
                </tr>
              </thead>
              <tbody>
                {coherencePiliers.map((c, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-background/30">
                    <td className="py-2.5 px-3 text-cyan-300 font-semibold">{safeStr(c.pilier)}</td>
                    <td className="py-2.5 px-3 text-foreground-secondary">{safeStr(c.contribution)}</td>
                    <td className="py-2.5 px-3 text-foreground-secondary">{safeStr(c.articulation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Sprint 90 Days Recap */}
      {sprint90.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Rocket className="h-5 w-5 text-orange-400" />
            Sprint 90 Jours — Recap
          </h2>
          <div className="space-y-2">
            {sprint90.map((item, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-background/60 p-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-[10px] font-bold text-orange-300">{i + 1}</span>
                <p className="text-sm text-foreground-secondary">{typeof item === "string" ? item : ""}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* KPI Dashboard */}
      {kpiDashboard.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
            Tableau de Bord KPI
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs font-bold text-foreground-muted uppercase">KPI</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-foreground-muted uppercase">Pilier</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-foreground-muted uppercase">Objectif</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-foreground-muted uppercase">Frequence</th>
                </tr>
              </thead>
              <tbody>
                {kpiDashboard.map((kpi, i) => {
                  const pillar = safeStr(kpi.pillar);
                  const colors = PILLAR_COLORS[pillar];
                  return (
                    <tr key={i} className="border-b border-border/50 hover:bg-background/30">
                      <td className="py-2.5 px-3 text-foreground font-medium">{safeStr(kpi.name)}</td>
                      <td className="py-2.5 px-3">
                        {colors ? (
                          <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${colors.bg} ${colors.accent}`}>{pillar}</span>
                        ) : (
                          <span className="text-foreground-muted">{pillar}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-foreground-secondary">{safeStr(kpi.target)}</td>
                      <td className="py-2.5 px-3 text-foreground-secondary">{FREQ_LABELS[safeStr(kpi.frequency)] ?? safeStr(kpi.frequency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Empty state */}
      {!syntheseExecutive && !visionStrategique && axes.length === 0 && (
        <div className="rounded-2xl border border-border bg-background/40 p-12 text-center">
          <Brain className="h-12 w-12 text-foreground-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground-secondary mb-2">Synthese non encore generee</h3>
          <p className="text-sm text-foreground-muted">Completez les etapes R, T, Recos et I de la cascade RTIS pour generer la synthese strategique.</p>
          <Link
            href="/cockpit/brand/rtis"
            className="inline-flex items-center gap-2 mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au workflow RTIS
          </Link>
        </div>
      )}
    </div>
  );
}
