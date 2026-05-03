"use client";

/**
 * JEHUTY — La Gazette Stratégique
 *
 * Mise en page éditoriale (presse / magazine) sur le DS panda + rouge fusée.
 * Dual-mode :
 * - brand : single strategy via useCurrentStrategyId()
 * - agency : multi-strategy avec metadata par dépêche
 */

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import type { JehutyCategory, JehutyFeedItem } from "@/lib/types/jehuty";
import { PILLAR_KEYS as CANONICAL_PILLAR_KEYS } from "@/domain/pillars";
import {
  Sparkles, TrendingUp, AlertTriangle, Activity,
  Stethoscope, Globe, Pin, X, Zap, Loader2,
  ChevronDown,
} from "lucide-react";

// ── Category metadata ─────────────────────────────────────────────

const CATEGORY_ICONS: Record<JehutyCategory, typeof Sparkles> = {
  RECOMMENDATION: Sparkles,
  MARKET_SIGNAL: TrendingUp,
  WEAK_SIGNAL: AlertTriangle,
  SCORE_DRIFT: Activity,
  DIAGNOSTIC: Stethoscope,
  EXTERNAL_SIGNAL: Globe,
};

const CATEGORY_RUBRIC: Record<JehutyCategory, string> = {
  RECOMMENDATION: "Recommandations",
  MARKET_SIGNAL: "Signaux marché",
  WEAK_SIGNAL: "Signaux faibles",
  SCORE_DRIFT: "Mouvements de score",
  DIAGNOSTIC: "Diagnostics",
  EXTERNAL_SIGNAL: "Le monde dehors",
};

const CATEGORY_ORDER: JehutyCategory[] = [
  "RECOMMENDATION",
  "MARKET_SIGNAL",
  "DIAGNOSTIC",
  "WEAK_SIGNAL",
  "SCORE_DRIFT",
  "EXTERNAL_SIGNAL",
];

const PILLAR_KEYS_LOWER = CANONICAL_PILLAR_KEYS.map((k) => k.toLowerCase()) as ReadonlyArray<string>;

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
      limit: 80,
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

  const items: JehutyFeedItem[] = feedQuery.data ?? [];
  const dashboard = dashboardQuery.data;

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

  // ── Derive editorial structure ──
  const { lead, byCategory } = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.priority - a.priority);
    const urgents = sorted.filter((i) => i.urgency === "NOW");
    const lead = urgents[0] ?? sorted[0] ?? null;
    const restPool = sorted.filter((i) => i.id !== lead?.id);
    const byCategory: Record<JehutyCategory, JehutyFeedItem[]> = {
      RECOMMENDATION: [], MARKET_SIGNAL: [], WEAK_SIGNAL: [],
      SCORE_DRIFT: [], DIAGNOSTIC: [], EXTERNAL_SIGNAL: [],
    };
    for (const it of restPool) byCategory[it.category].push(it);
    return { lead, byCategory };
  }, [items]);

  const today = new Date();
  const dateline = today.toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const editionNumber = useMemo(() => {
    const d = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - d.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }, [today]);

  // ── Render ──

  return (
    <article className="mx-auto max-w-[var(--maxw-content,1200px)] px-[var(--pad-page,1.5rem)] py-8 md:py-12">
      {/* ═══ Supra-header / dateline ═══════════════════════════════ */}
      <header className="border-b border-border-subtle pb-4 mb-8">
        <div className="flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-widest text-foreground-muted flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Édition n°{editionNumber}
            </span>
            <span className="opacity-50">·</span>
            <span className="capitalize">{dateline}</span>
            <span className="opacity-50">·</span>
            <span>{items.length} dépêches</span>
          </div>
          <span className="text-foreground-muted/60">Jehuty · Sous tutelle Seshat</span>
        </div>
      </header>

      {/* ═══ Masthead ═══════════════════════════════════════════════ */}
      <section className="mb-12 md:mb-16">
        <h1
          className="font-display font-semibold tracking-tighter leading-[0.9] text-foreground"
          style={{ fontSize: "var(--text-display)" }}
        >
          Jehuty.
        </h1>
        <p className="mt-3 text-foreground-secondary max-w-[60ch]" style={{ fontSize: "var(--text-lg)" }}>
          La gazette stratégique de la marque — <span className="font-serif italic">recommandations, signaux, diagnostics</span>, lus chaque matin par les opérateurs avant qu&rsquo;ils ne décident quoi forger.
        </p>
      </section>

      {/* ═══ Indicators row ═════════════════════════════════════════ */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-5 border-y border-border-subtle py-6 mb-12">
        <Indicator
          label="Dépêches"
          value={dashboard?.totalItems ?? 0}
          hint="Total intelligence active"
        />
        <Indicator
          label="Critiques"
          value={dashboard?.criticalCount ?? 0}
          hint="Urgence NOW · impact HIGH"
          accent={dashboard?.criticalCount ? "accent" : undefined}
        />
        <Indicator
          label="Acceptation"
          value={`${Math.round((dashboard?.acceptanceRate ?? 0) * 100)}%`}
          hint="Taux de pin / total proposé"
        />
        <Indicator
          label="Santé marché"
          value={`${Math.round(dashboard?.marketHealthScore ?? 0)}`}
          hint="Index Seshat · /100"
        />
      </section>

      {/* ═══ Filter strip (épuré) ══════════════════════════════════ */}
      <nav className="flex items-center gap-x-6 gap-y-3 flex-wrap mb-10 pb-4 border-b border-border-subtle">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`text-[11px] font-mono uppercase tracking-widest transition-colors ${
            !selectedCategory ? "text-foreground" : "text-foreground-muted hover:text-foreground"
          }`}
        >
          Toutes les rubriques
        </button>
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            className={`text-[11px] font-mono uppercase tracking-widest transition-colors ${
              selectedCategory === cat ? "text-accent" : "text-foreground-muted hover:text-foreground"
            }`}
          >
            {CATEGORY_RUBRIC[cat]}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-foreground-muted/60 mr-1">Pilier</span>
          {PILLAR_KEYS_LOWER.map((k) => (
            <button
              key={k}
              onClick={() => setSelectedPillar(selectedPillar === k ? null : k)}
              className={`font-mono text-[11px] font-bold w-6 h-6 rounded-full transition-colors ${
                selectedPillar === k
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground-muted/50 hover:bg-surface-elevated hover:text-foreground"
              }`}
            >
              {k.toUpperCase()}
            </button>
          ))}
        </div>
      </nav>

      {/* ═══ Loading / empty ═══════════════════════════════════════ */}
      {feedQuery.isLoading && <SkeletonPage />}
      {!feedQuery.isLoading && items.length === 0 && (
        <div className="py-24 text-center border-y border-border-subtle">
          <p className="font-serif italic text-2xl text-foreground-secondary">Le journal est vide ce matin.</p>
          <p className="font-mono text-[11px] uppercase tracking-widest text-foreground-muted mt-3">
            Les signaux et recommandations apparaîtront ici dès que Seshat les capture.
          </p>
        </div>
      )}

      {/* ═══ À la une — Lead story ═════════════════════════════════ */}
      {lead && (
        <section className="mb-16">
          <RubricHeader label="À la une" suffix={lead.urgency === "NOW" ? "Urgent" : null} />
          <LeadStory
            item={lead}
            isExpanded={expandedItems.has(lead.id)}
            mode={mode}
            onToggleExpand={(id) => {
              const s = new Set(expandedItems);
              if (s.has(id)) s.delete(id); else s.add(id);
              setExpandedItems(s);
            }}
            onPin={() => handleCurate(lead, "PINNED")}
            onUnpin={() => handleUnpin(lead)}
            onDismiss={() => handleCurate(lead, "DISMISSED")}
            onNotoria={() => handleTriggerNotoria(lead)}
            isNotoriaPending={triggerNotoriaMutation.isPending}
          />
        </section>
      )}

      {/* ═══ Sections par rubrique ═════════════════════════════════ */}
      {CATEGORY_ORDER.map((cat) => {
        const list = byCategory[cat];
        if (list.length === 0) return null;
        return (
          <section key={cat} className="mb-16">
            <RubricHeader label={CATEGORY_RUBRIC[cat]} suffix={`${list.length}`} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
              {list.map((item) => (
                <Dispatch
                  key={item.id}
                  item={item}
                  mode={mode}
                  isExpanded={expandedItems.has(item.id)}
                  onToggleExpand={(id) => {
                    const s = new Set(expandedItems);
                    if (s.has(id)) s.delete(id); else s.add(id);
                    setExpandedItems(s);
                  }}
                  onPin={() => handleCurate(item, "PINNED")}
                  onUnpin={() => handleUnpin(item)}
                  onDismiss={() => handleCurate(item, "DISMISSED")}
                  onNotoria={() => handleTriggerNotoria(item)}
                  isNotoriaPending={triggerNotoriaMutation.isPending}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* ═══ Footer / colophon ═════════════════════════════════════ */}
      <footer className="border-t border-border-subtle pt-6 mt-12 flex items-center justify-between flex-wrap gap-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-foreground-muted/60">
          Jehuty · Telemetry sous Seshat · Les dépêches se rafraîchissent toutes les 30s.
        </p>
        <p className="font-serif italic text-sm text-foreground-muted">
          « Avant de forger, lire le monde. »
        </p>
      </footer>
    </article>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function Indicator({ label, value, hint, accent }: {
  label: string;
  value: string | number;
  hint: string;
  accent?: "accent";
}) {
  return (
    <div>
      <div
        className={`font-display font-semibold tracking-tighter leading-none ${accent === "accent" ? "text-accent" : "text-foreground"}`}
        style={{ fontSize: "var(--text-3xl)" }}
      >
        {value}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-foreground mt-2">{label}</div>
      <div className="text-xs text-foreground-muted mt-0.5">{hint}</div>
    </div>
  );
}

function RubricHeader({ label, suffix }: { label: string; suffix?: string | null }) {
  return (
    <div className="flex items-baseline gap-3 mb-6">
      <h2
        className="font-display font-semibold tracking-tight text-foreground"
        style={{ fontSize: "var(--text-2xl)" }}
      >
        {label}
      </h2>
      <div className="flex-1 h-px bg-border-subtle" />
      {suffix && (
        <span className="font-mono text-[10px] uppercase tracking-widest text-foreground-muted">
          {suffix}
        </span>
      )}
    </div>
  );
}

interface DispatchActionsProps {
  item: JehutyFeedItem;
  isPinned: boolean;
  isTriggered: boolean;
  onPin: () => void;
  onUnpin: () => void;
  onDismiss: () => void;
  onNotoria: () => void;
  isNotoriaPending: boolean;
}

function DispatchActions({
  item, isPinned, isTriggered, onPin, onUnpin, onDismiss, onNotoria, isNotoriaPending,
}: DispatchActionsProps) {
  return (
    <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-widest">
      {isPinned ? (
        <button onClick={onUnpin} className="flex items-center gap-1.5 text-accent hover:opacity-80 transition-opacity">
          <Pin className="h-3 w-3" /> Retirer
        </button>
      ) : (
        <button onClick={onPin} className="flex items-center gap-1.5 text-foreground-muted hover:text-foreground transition-colors">
          <Pin className="h-3 w-3" /> Épingler
        </button>
      )}
      <button onClick={onDismiss} className="flex items-center gap-1.5 text-foreground-muted hover:text-error transition-colors">
        <X className="h-3 w-3" /> Écarter
      </button>
      {item.sourceType === "SIGNAL" && !isTriggered && (
        <button
          onClick={onNotoria}
          disabled={isNotoriaPending}
          className="flex items-center gap-1.5 text-accent hover:opacity-80 transition-opacity disabled:opacity-40"
        >
          {isNotoriaPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
          Activer Notoria
        </button>
      )}
    </div>
  );
}

interface LeadStoryProps {
  item: JehutyFeedItem;
  isExpanded: boolean;
  mode: "brand" | "agency";
  onToggleExpand: (id: string) => void;
  onPin: () => void;
  onUnpin: () => void;
  onDismiss: () => void;
  onNotoria: () => void;
  isNotoriaPending: boolean;
}

function LeadStory({
  item, isExpanded, mode, onToggleExpand,
  onPin, onUnpin, onDismiss, onNotoria, isNotoriaPending,
}: LeadStoryProps) {
  const Icon = CATEGORY_ICONS[item.category];
  const isPinned = item.curation?.action === "PINNED";
  const isTriggered = item.curation?.action === "NOTORIA_TRIGGERED";
  const summary = item.summary?.trim() ?? "";
  const dropCap = summary.charAt(0);
  const restSummary = summary.slice(1);
  const hasDetails = Boolean(item.advantages?.length || item.disadvantages?.length);

  return (
    <article className={`grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-x-10 gap-y-6 ${isPinned ? "border-l-2 border-accent pl-6" : ""}`}>
      {/* Body */}
      <div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-foreground-muted mb-3">
          <Icon className="h-3.5 w-3.5 text-accent" />
          <span>{CATEGORY_RUBRIC[item.category]}</span>
          {item.pillarKey && (
            <>
              <span className="opacity-50">·</span>
              <span className="text-accent">Pilier {item.pillarKey.toUpperCase()}</span>
            </>
          )}
          {mode === "agency" && item.strategyName && (
            <>
              <span className="opacity-50">·</span>
              <span>{item.strategyName}</span>
            </>
          )}
          <span className="opacity-50">·</span>
          <span>{new Date(item.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
        </div>

        <h3
          className="font-display font-semibold tracking-tight leading-[1.05] text-foreground mb-5"
          style={{ fontSize: "var(--text-3xl)" }}
        >
          {item.title}
        </h3>

        {summary && (
          <p
            className="font-serif text-foreground-secondary leading-[1.55] max-w-[58ch]"
            style={{ fontSize: "var(--text-lg)" }}
          >
            <span
              className="float-left font-display font-semibold leading-[0.85] mr-2 mt-1 text-accent"
              style={{ fontSize: "calc(var(--text-3xl) * 1.7)" }}
            >
              {dropCap}
            </span>
            {restSummary}
          </p>
        )}

        <div className="mt-6 flex items-center gap-6 flex-wrap">
          <DispatchActions
            item={item}
            isPinned={isPinned}
            isTriggered={isTriggered}
            onPin={onPin}
            onUnpin={onUnpin}
            onDismiss={onDismiss}
            onNotoria={onNotoria}
            isNotoriaPending={isNotoriaPending}
          />
          {item.source && (
            <span className="font-mono text-[10px] uppercase tracking-widest text-foreground-muted/60 ml-auto">
              source · {item.source}
            </span>
          )}
        </div>
      </div>

      {/* Aside — pull quote des avantages/inconvénients */}
      {hasDetails ? (
        <aside className="border-l border-border-subtle pl-6 lg:pl-8 self-start">
          <p className="font-mono text-[10px] uppercase tracking-widest text-foreground-muted mb-3">L&rsquo;analyse</p>
          {item.advantages?.length ? (
            <div className="mb-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-success mb-2">Avantages</p>
              <ul className="space-y-2 font-serif text-foreground-secondary leading-snug">
                {item.advantages.map((a, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-success">+</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {item.disadvantages?.length ? (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-error mb-2">Risques</p>
              <ul className="space-y-2 font-serif text-foreground-secondary leading-snug">
                {item.disadvantages.map((d, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-error">−</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      ) : (
        <aside className="border-l border-border-subtle pl-6 lg:pl-8 self-start">
          <p className="font-mono text-[10px] uppercase tracking-widest text-foreground-muted mb-3">Qualification</p>
          <dl className="space-y-3">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-foreground-muted/60">Urgence</dt>
              <dd className="font-display text-2xl font-semibold tracking-tight text-foreground">{item.urgency}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-foreground-muted/60">Impact</dt>
              <dd className="font-display text-2xl font-semibold tracking-tight text-foreground">{item.impact}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-foreground-muted/60">Confiance</dt>
              <dd className="font-display text-2xl font-semibold tracking-tight text-foreground">{Math.round(item.confidence * 100)}%</dd>
            </div>
          </dl>
        </aside>
      )}

      {hasDetails && !isExpanded && (
        <button
          onClick={() => onToggleExpand(item.id)}
          className="lg:col-span-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-foreground-muted hover:text-foreground transition-colors mt-1"
        >
          <ChevronDown className="h-3 w-3" /> Lire la qualification complète
        </button>
      )}

      {isTriggered && (
        <div className="lg:col-span-2 border-t border-border-subtle pt-4 -mt-2 font-mono text-[10px] uppercase tracking-widest text-accent flex items-center gap-2">
          <Zap className="h-3 w-3" /> Notoria activée — recommandation en cours d&rsquo;exécution
        </div>
      )}
    </article>
  );
}

interface DispatchProps {
  item: JehutyFeedItem;
  mode: "brand" | "agency";
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onPin: () => void;
  onUnpin: () => void;
  onDismiss: () => void;
  onNotoria: () => void;
  isNotoriaPending: boolean;
}

function Dispatch({
  item, mode, isExpanded, onToggleExpand,
  onPin, onUnpin, onDismiss, onNotoria, isNotoriaPending,
}: DispatchProps) {
  const Icon = CATEGORY_ICONS[item.category];
  const isPinned = item.curation?.action === "PINNED";
  const isTriggered = item.curation?.action === "NOTORIA_TRIGGERED";
  const hasDetails = Boolean(item.advantages?.length || item.disadvantages?.length);

  return (
    <article className={`flex flex-col ${isPinned ? "border-l-2 border-accent pl-4 -ml-4" : ""}`}>
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-foreground-muted mb-2.5">
        <Icon className="h-3 w-3 text-accent" />
        {item.pillarKey && <span className="text-foreground">{item.pillarKey.toUpperCase()}</span>}
        {item.urgency === "NOW" && (
          <>
            <span className="opacity-50">·</span>
            <span className="text-error">Urgent</span>
          </>
        )}
        {mode === "agency" && item.strategyName && (
          <>
            <span className="opacity-50">·</span>
            <span className="truncate">{item.strategyName}</span>
          </>
        )}
        <span className="opacity-50 ml-auto">·</span>
        <span>{new Date(item.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
      </div>

      <h3
        className="font-display font-semibold tracking-tight leading-[1.15] text-foreground mb-2"
        style={{ fontSize: "var(--text-xl)" }}
      >
        {item.title}
      </h3>

      <p className="font-serif text-foreground-secondary leading-snug text-base flex-1" style={{ fontSize: "var(--text-base)" }}>
        {item.summary}
      </p>

      {hasDetails && (
        <button
          onClick={() => onToggleExpand(item.id)}
          className="flex items-center gap-1.5 mt-3 font-mono text-[10px] uppercase tracking-widest text-foreground-muted hover:text-foreground transition-colors"
        >
          <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          {isExpanded ? "Replier" : "L'analyse"}
        </button>
      )}

      {isExpanded && hasDetails && (
        <div className="mt-3 pt-3 border-t border-border-subtle space-y-2">
          {item.advantages?.map((a, i) => (
            <p key={`a-${i}`} className="flex gap-2 font-serif italic text-sm text-foreground-secondary leading-snug">
              <span className="text-success not-italic">+</span><span>{a}</span>
            </p>
          ))}
          {item.disadvantages?.map((d, i) => (
            <p key={`d-${i}`} className="flex gap-2 font-serif italic text-sm text-foreground-secondary leading-snug">
              <span className="text-error not-italic">−</span><span>{d}</span>
            </p>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border-subtle">
        <DispatchActions
          item={item}
          isPinned={isPinned}
          isTriggered={isTriggered}
          onPin={onPin}
          onUnpin={onUnpin}
          onDismiss={onDismiss}
          onNotoria={onNotoria}
          isNotoriaPending={isNotoriaPending}
        />
      </div>

      {isTriggered && (
        <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-accent flex items-center gap-1.5">
          <Zap className="h-3 w-3" /> Notoria activée
        </div>
      )}
    </article>
  );
}

