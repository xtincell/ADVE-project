"use client";

/**
 * JEHUTY — Strategic Intelligence Feed
 *
 * Bloomberg Terminal for brand strategy. Dual-mode:
 * - brand: single strategy via useCurrentStrategyId()
 * - agency: multi-strategy with selector
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { CATEGORY_CONFIG, type JehutyCategory, type JehutyFeedItem } from "@/lib/types/jehuty";
import {
  Newspaper, Sparkles, TrendingUp, AlertTriangle, Activity,
  Stethoscope, Globe, Pin, X, Zap, Eye, Loader2,
  CheckCircle, Shield, ChevronDown,
} from "lucide-react";

// ── Category icon mapping ─────────────────────────────────────────

const CATEGORY_ICONS: Record<JehutyCategory, typeof Sparkles> = {
  RECOMMENDATION: Sparkles,
  MARKET_SIGNAL: TrendingUp,
  WEAK_SIGNAL: AlertTriangle,
  SCORE_DRIFT: Activity,
  DIAGNOSTIC: Stethoscope,
  EXTERNAL_SIGNAL: Globe,
};

const PILLAR_LABELS: Record<string, string> = {
  a: "A", d: "D", v: "V", e: "E", r: "R", t: "T", i: "I", s: "S",
};

// ── Component ─────────────────────────────────────────────────────

interface JehutyFeedPageProps {
  mode: "brand" | "agency";
}

export function JehutyFeedPage({ mode }: JehutyFeedPageProps) {
  const strategyIdFromContext = useCurrentStrategyId();
  const strategyId = mode === "brand" ? strategyIdFromContext : undefined;

  const [selectedCategory, setSelectedCategory] = useState<JehutyCategory | null>(null);
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // ── Queries ──
  const feedQuery = trpc.jehuty.feed.useQuery(
    {
      strategyId: strategyId ?? undefined,
      category: selectedCategory ?? undefined,
      pillarKey: selectedPillar ?? undefined,
      limit: 50,
    },
    { enabled: mode === "agency" || !!strategyId, refetchInterval: 30_000 },
  );

  const dashboardQuery = trpc.jehuty.dashboard.useQuery(
    { strategyId: strategyId ?? undefined },
    { enabled: mode === "agency" || !!strategyId },
  );

  // ── Mutations ──
  const curateMutation = trpc.jehuty.curate.useMutation({
    onSuccess: () => feedQuery.refetch(),
  });
  const removeCurationMutation = trpc.jehuty.removeCuration.useMutation({
    onSuccess: () => feedQuery.refetch(),
  });
  const triggerNotoriaMutation = trpc.jehuty.triggerNotoria.useMutation({
    onSuccess: () => feedQuery.refetch(),
  });

  if (mode === "brand" && !strategyId) return <SkeletonPage />;

  const items = feedQuery.data ?? [];
  const dashboard = dashboardQuery.data;
  const categories = Object.keys(CATEGORY_CONFIG) as JehutyCategory[];

  const handleCurate = (item: JehutyFeedItem, action: "PINNED" | "DISMISSED") => {
    if (!item.strategyId) return;
    const [sourceType] = item.id.split(":");
    const itemType = sourceType === "signal" ? "SIGNAL" : sourceType === "reco" ? "RECOMMENDATION" : "DIAGNOSTIC";
    curateMutation.mutate({ strategyId: item.strategyId, itemType: itemType as "SIGNAL" | "RECOMMENDATION" | "DIAGNOSTIC", itemId: item.sourceId, action });
  };

  const handleUnpin = (item: JehutyFeedItem) => {
    if (!item.strategyId) return;
    const [sourceType] = item.id.split(":");
    const itemType = sourceType === "signal" ? "SIGNAL" : sourceType === "reco" ? "RECOMMENDATION" : "DIAGNOSTIC";
    removeCurationMutation.mutate({ strategyId: item.strategyId, itemType: itemType as "SIGNAL" | "RECOMMENDATION" | "DIAGNOSTIC", itemId: item.sourceId });
  };

  const handleTriggerNotoria = (item: JehutyFeedItem) => {
    if (item.sourceType !== "SIGNAL" || !item.strategyId) return;
    triggerNotoriaMutation.mutate({ strategyId: item.strategyId, signalId: item.sourceId });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      {/* ═══ Header ═══════════════════════════════════════════════ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Newspaper className="h-6 w-6 text-cyan-400" />
          <div>
            <h1 className="text-lg font-bold text-white">Jehuty</h1>
            <p className="text-xs text-foreground-muted">Intelligence Strategique</p>
          </div>
        </div>
        {items.length > 0 && (
          <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-xs font-bold text-cyan-300">
            {items.length} items
          </span>
        )}
      </div>

      {/* ═══ Dashboard strip ═══════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <DashCard label="Total Intelligence" value={dashboard?.totalItems ?? 0} icon={<Newspaper className="h-4 w-4 text-cyan-400" />} />
        <DashCard label="Critiques" value={dashboard?.criticalCount ?? 0} icon={<AlertTriangle className="h-4 w-4 text-red-400" />} accent={dashboard?.criticalCount ? "border-red-500/20" : undefined} />
        <DashCard label="Taux Acceptation" value={`${Math.round((dashboard?.acceptanceRate ?? 0) * 100)}%`} icon={<CheckCircle className="h-4 w-4 text-emerald-400" />} />
        <DashCard label="Sante Marche" value={`${Math.round(dashboard?.marketHealthScore ?? 0)}%`} icon={<Shield className="h-4 w-4 text-blue-400" />} />
      </div>

      {/* ═══ Filter bar ═══════════════════════════════════════════ */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${!selectedCategory ? "bg-white/10 text-white" : "bg-white/[0.03] text-foreground-muted hover:text-white"}`}
        >
          Tous
        </button>
        {categories.map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          const Icon = CATEGORY_ICONS[cat];
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${selectedCategory === cat ? cfg.color : "bg-white/[0.03] text-foreground-muted hover:text-white"}`}
            >
              <Icon className="h-3 w-3" />
              {cfg.label}
            </button>
          );
        })}

        {/* Pillar filter */}
        <div className="ml-auto flex items-center gap-1">
          {["a", "d", "v", "e", "r", "t", "i", "s"].map((k) => (
            <button
              key={k}
              onClick={() => setSelectedPillar(selectedPillar === k ? null : k)}
              className={`rounded px-1.5 py-0.5 text-[9px] font-bold transition-colors ${selectedPillar === k ? "bg-white/10 text-white" : "text-foreground-muted/50 hover:text-foreground-muted"}`}
            >
              {k.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Feed ═════════════════════════════════════════════════ */}
      <div className="space-y-2">
        {feedQuery.isLoading && <SkeletonPage />}

        {!feedQuery.isLoading && items.length === 0 && (
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-12 text-center">
            <Newspaper className="mx-auto h-8 w-8 text-foreground-muted/30 mb-2" />
            <p className="text-sm text-foreground-muted">Aucune intelligence disponible.</p>
            <p className="text-xs text-foreground-muted/50 mt-1">Les signaux et recommandations apparaitront ici.</p>
          </div>
        )}

        {items.map((item) => {
          const cfg = CATEGORY_CONFIG[item.category];
          const Icon = CATEGORY_ICONS[item.category];
          const isPinned = item.curation?.action === "PINNED";
          const isTriggered = item.curation?.action === "NOTORIA_TRIGGERED";
          const isExpanded = expandedItems.has(item.id);

          // Priority dot color
          const dotColor = item.priority > 0.5 ? "bg-red-400" : item.priority > 0.25 ? "bg-amber-400" : item.priority > 0.1 ? "bg-blue-400" : "bg-zinc-600";

          return (
            <div
              key={item.id}
              className={`rounded-lg border p-3 transition-colors ${
                isPinned
                  ? "border-l-2 border-l-cyan-400 border-t-white/5 border-r-white/5 border-b-white/5 bg-cyan-500/[0.03]"
                  : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              {/* Row 1: Category + Title + Pillar + Urgency + Priority */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-md ${cfg.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-medium text-white truncate">{item.title}</span>
                      {item.pillarKey && (
                        <span className="rounded bg-white/5 px-1 py-0.5 text-[8px] font-bold text-foreground-muted">
                          {PILLAR_LABELS[item.pillarKey] ?? item.pillarKey.toUpperCase()}
                        </span>
                      )}
                      {item.urgency === "NOW" && (
                        <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[8px] font-bold text-red-300">URGENT</span>
                      )}
                      {mode === "agency" && item.strategyName && (
                        <span className="rounded bg-white/5 px-1 py-0.5 text-[8px] text-foreground-muted/70">{item.strategyName}</span>
                      )}
                      {isTriggered && (
                        <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[8px] font-bold text-violet-300">Notoria ✓</span>
                      )}
                    </div>
                    <p className="text-[11px] text-foreground-muted line-clamp-2 mt-0.5">{item.summary}</p>
                  </div>
                </div>

                {/* Priority dot + actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className={`h-2 w-2 rounded-full ${dotColor}`} title={`Priorite: ${(item.priority * 100).toFixed(0)}`} />
                  <span className="text-[8px] text-foreground-muted/50">
                    {new Date(item.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </span>
                </div>
              </div>

              {/* Row 2: Advantages/Disadvantages (expandable) */}
              {(item.advantages?.length || item.disadvantages?.length) ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const s = new Set(expandedItems);
                    if (isExpanded) s.delete(item.id); else s.add(item.id);
                    setExpandedItems(s);
                  }}
                  className="flex items-center gap-1 mt-1.5 text-[9px] text-foreground-muted/50 hover:text-foreground-muted"
                >
                  <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  Details
                </button>
              ) : null}
              {isExpanded && (
                <div className="mt-1 pl-8 space-y-0.5">
                  {item.advantages?.map((a, i) => (
                    <div key={i} className="flex items-start gap-1 text-[10px] text-emerald-300/70">
                      <span>+</span><span>{a}</span>
                    </div>
                  ))}
                  {item.disadvantages?.map((d, i) => (
                    <div key={i} className="flex items-start gap-1 text-[10px] text-red-300/70">
                      <span>-</span><span>{d}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Row 3: Actions */}
              <div className="flex items-center gap-1 mt-2 pl-8">
                {isPinned ? (
                  <button onClick={() => handleUnpin(item)} className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20">
                    <Pin className="h-2.5 w-2.5" /> Unpin
                  </button>
                ) : (
                  <button onClick={() => handleCurate(item, "PINNED")} className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] text-foreground-muted hover:text-white hover:bg-white/5">
                    <Pin className="h-2.5 w-2.5" /> Pin
                  </button>
                )}
                <button onClick={() => handleCurate(item, "DISMISSED")} className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] text-foreground-muted hover:text-red-300 hover:bg-red-500/10">
                  <X className="h-2.5 w-2.5" /> Dismiss
                </button>
                {item.sourceType === "SIGNAL" && !isTriggered && (
                  <button
                    onClick={() => handleTriggerNotoria(item)}
                    disabled={triggerNotoriaMutation.isPending}
                    className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 disabled:opacity-40"
                  >
                    {triggerNotoriaMutation.isPending ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Zap className="h-2.5 w-2.5" />}
                    Notoria
                  </button>
                )}
                <span className="ml-auto text-[8px] text-foreground-muted/30">{item.source}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function DashCard({ label, value, icon, accent }: { label: string; value: string | number; icon: React.ReactNode; accent?: string }) {
  return (
    <div className={`rounded-lg border p-3 ${accent ?? "border-white/5"} bg-surface-raised`}>
      <div className="flex items-center justify-between">
        {icon}
        <span className="text-lg font-bold text-white">{value}</span>
      </div>
      <p className="text-[10px] text-foreground-muted mt-1">{label}</p>
    </div>
  );
}
