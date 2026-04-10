"use client";

import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Zap, AlertTriangle, TrendingUp, Shield, Clock, Target } from "lucide-react";

const INSIGHT_TYPES: Record<string, { label: string; icon: typeof Zap; color: string }> = {
  COHERENCE: { label: "Coherence", icon: Shield, color: "text-violet-400" },
  STALE: { label: "Staleness", icon: Clock, color: "text-amber-400" },
  SIGNAL: { label: "Signal", icon: TrendingUp, color: "text-blue-400" },
  CULT_INDEX: { label: "Cult Index", icon: Target, color: "text-emerald-400" },
  SLA: { label: "SLA", icon: AlertTriangle, color: "text-red-400" },
  OPPORTUNITY: { label: "Opportunite", icon: Zap, color: "text-amber-300" },
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: "border-red-500/30 bg-red-500/5",
  high: "border-amber-500/30 bg-amber-500/5",
  medium: "border-blue-500/20 bg-blue-500/5",
  low: "border-border-subtle bg-card",
};

export default function MestorInsightsPage() {
  const { data: strategies, isLoading } = trpc.strategy.list.useQuery({});

  if (isLoading) return <SkeletonPage />;

  const activeStrategies = (strategies ?? []).filter((s) => s.status === "ACTIVE");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insights Proactifs"
        description="Le swarm Mestor detecte coherence, staleness, signaux, SLA, opportunites — rule-based + AI"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Mestor", href: "/console/mestor" },
          { label: "Insights" },
        ]}
      />

      {/* Insight type legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(INSIGHT_TYPES).map(([key, { label, icon: Icon, color }]) => (
          <div key={key} className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-2 py-1">
            <Icon className={`h-3 w-3 ${color}`} />
            <span className="text-[10px] font-medium text-foreground-muted">{label}</span>
          </div>
        ))}
      </div>

      {/* Per-strategy insights */}
      {activeStrategies.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Zap className="mx-auto mb-3 h-8 w-8 text-foreground-muted" />
          <p className="text-sm text-foreground-muted">Aucune strategie active. Les insights apparaissent quand les piliers ont du contenu.</p>
        </div>
      ) : (
        activeStrategies.map((s) => (
          <div key={s.id} className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">{s.name}</h3>
            <div className="space-y-2">
              {/* These will be populated by trpc.mestor.getInsights when wired */}
              <div className={`rounded-lg border ${SEVERITY_STYLES.medium} p-3`}>
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-violet-400" />
                  <span className="text-xs font-medium text-foreground">Analyse de coherence</span>
                  <span className="ml-auto rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] text-blue-300">medium</span>
                </div>
                <p className="mt-1 text-[10px] text-foreground-muted">Les insights rule-based seront generes automatiquement quand les piliers ADVE-RTIS contiennent des donnees.</p>
              </div>
              <div className={`rounded-lg border ${SEVERITY_STYLES.low} p-3`}>
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-amber-300" />
                  <span className="text-xs font-medium text-foreground">Insights AI</span>
                  <span className="ml-auto rounded bg-foreground-muted/15 px-1.5 py-0.5 text-[10px] text-foreground-muted">low</span>
                </div>
                <p className="mt-1 text-[10px] text-foreground-muted">Le Commandant peut generer des insights strategiques profonds via LLM Gateway.</p>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Architecture note */}
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-6">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Deux couches d'insights</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-foreground">Rule-based (instantane)</p>
            <p className="text-[10px] text-foreground-muted">Coherence cross-pilier, staleness, SLA, cult index drops, devotion regression. Zero LLM, zero cout.</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">AI-powered (Commandant)</p>
            <p className="text-[10px] text-foreground-muted">Analyse strategique profonde, opportunites detectees, arbitrages recommandes. Via LLM Gateway.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
