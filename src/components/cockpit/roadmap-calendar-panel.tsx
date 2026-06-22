"use client";

/**
 * RoadmapCalendarPanel — Cockpit roadmap calendar (Phase 24, slice 3/3).
 *
 * Takes the RETAINED actions (BrandAction.selected=true — fed by the brief
 * surface / the action database) and lays them on an adjustable timeline.
 * "Auto + ajustable" : `autoSchedule` spreads them deterministically by priority
 * from a start date at a chosen cadence (zero LLM), then every action carries an
 * inline date the operator can override (`setTiming`). Distinct from the launch
 * calendar (`/cockpit/operate/calendar`) which renders Glory JSON read-only.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { CalendarRange, Wand2, Loader2, CalendarClock, X, Inbox } from "lucide-react";

const CHANNEL_LABEL: Record<string, string> = {
  DIGITAL: "Digital", SOCIAL: "Social", PR_INFLUENCE: "RP / Influence",
  EVENEMENTIEL: "Événementiel", MEDIA: "Média", RETAIL: "Retail", PARTENARIAT: "Partenariat",
};
const INPUT_CLS =
  "rounded-lg border border-white/10 bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-accent/40 focus:outline-none";

function toYmd(d: string | Date | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(dt.getTime()) ? "" : dt.toISOString().slice(0, 10);
}
function ymdToIso(ymd: string): string | null {
  return ymd ? `${ymd}T12:00:00.000Z` : null;
}
function monthLabel(d: string | Date): string {
  return new Date(d).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}
function dayLabel(d: string | Date): string {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}
function fcfa(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} k`;
  return String(Math.round(n));
}

export function RoadmapCalendarPanel() {
  const strategyId = useCurrentStrategyId();
  const [start, setStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [cadence, setCadence] = useState(14);
  const [onlyUnscheduled, setOnlyUnscheduled] = useState(true);

  const query = trpc.actions.byStrategy.useQuery(
    { strategyId: strategyId ?? "", selected: true },
    { enabled: !!strategyId },
  );
  const refetch = () => query.refetch();
  const auto = trpc.actions.autoSchedule.useMutation({ onSuccess: refetch });
  const setTiming = trpc.actions.setTiming.useMutation({ onSuccess: refetch });

  if (!strategyId || query.isLoading) return <SkeletonPage />;
  const sid = strategyId; // narrowed capture for nested closures

  const actions = query.data ?? [];
  const scheduled = [...actions]
    .filter((a) => a.timingStart)
    .sort((a, b) => new Date(a.timingStart!).getTime() - new Date(b.timingStart!).getTime());
  const unscheduled = actions.filter((a) => !a.timingStart);

  const groups: Array<{ label: string; items: typeof scheduled }> = [];
  for (const a of scheduled) {
    const label = monthLabel(a.timingStart!);
    let g = groups.find((x) => x.label === label);
    if (!g) { g = { label, items: [] }; groups.push(g); }
    g.items.push(a);
  }

  const reschedule = (actionId: string, ymd: string) =>
    setTiming.mutate({ strategyId: sid, actionId, timingStart: ymdToIso(ymd) });

  function ActionRow({ a }: { a: (typeof actions)[number] }) {
    const meta = (a.metadata ?? {}) as Record<string, unknown>;
    const ch = typeof meta.channel === "string" ? meta.channel : null;
    const pillar = typeof meta.pilierImpact === "string" ? meta.pilierImpact : null;
    const budget = fcfa(a.budgetMax ?? a.budgetMin);
    return (
      <div className="flex items-start gap-3 rounded-lg border border-white/5 bg-surface-raised px-3 py-2">
        <div className="min-w-0 flex-1">
          <span className="text-xs font-medium text-foreground">{a.title}</span>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {pillar ? <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold text-accent">{pillar}</span> : null}
            {ch ? <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-foreground-muted">{CHANNEL_LABEL[ch] ?? ch}</span> : null}
            {budget ? <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-foreground-muted">{budget} FCFA</span> : null}
            {a.priority ? <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-foreground-muted">{a.priority}</span> : null}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <input
            type="date"
            value={toYmd(a.timingStart)}
            onChange={(e) => reschedule(a.id, e.target.value)}
            className={`${INPUT_CLS} w-[8.5rem]`}
          />
          {a.timingStart ? (
            <button
              type="button"
              title="Déplanifier"
              onClick={() => setTiming.mutate({ strategyId: sid, actionId: a.id, timingStart: null })}
              className="rounded p-1 text-foreground-muted transition-colors hover:bg-white/5 hover:text-error"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-[var(--maxw-content,1200px)] px-[var(--pad-page,1.5rem)] py-8 md:py-12">
      <header className="mb-8 border-b border-border-subtle pb-6">
        <div className="mb-3 flex items-center gap-2 font-mono text-2xs uppercase tracking-widest text-foreground-muted">
          <CalendarRange className="h-3.5 w-3.5 text-accent" />
          <span>Roadmap · calendrier des actions retenues</span>
        </div>
        <h1 className="font-display font-semibold tracking-tighter leading-[0.95] text-foreground" style={{ fontSize: "var(--text-display)" }}>
          La roadmap, dans le temps.
        </h1>
        <p className="mt-3 max-w-[62ch] text-foreground-secondary" style={{ fontSize: "var(--text-lg)" }}>
          Les actions retenues, posées sur un calendrier. <span className="text-accent">Auto-planifie</span> en un clic, puis <span className="font-serif italic">ajuste chaque date</span> à la main.
        </p>
      </header>

      {actions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <p className="text-sm text-foreground-secondary">Aucune action retenue.</p>
          <p className="mt-2 text-xs text-foreground-muted">
            Retiens des actions depuis <strong>Brief → actions</strong> ou la <strong>base d&rsquo;actions</strong> pour les planifier ici.
          </p>
        </div>
      ) : (
        <>
          {/* Auto-schedule bar */}
          <div className="mb-8 flex flex-wrap items-end gap-3 rounded-lg border border-white/5 bg-surface-raised p-4">
            <label className="flex flex-col gap-1 text-2xs uppercase tracking-widest text-foreground-muted">
              Départ
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={INPUT_CLS} />
            </label>
            <label className="flex flex-col gap-1 text-2xs uppercase tracking-widest text-foreground-muted">
              Cadence (jours)
              <input type="number" min={1} max={90} value={cadence} onChange={(e) => setCadence(Math.max(1, Math.min(90, Number(e.target.value) || 14)))} className={`${INPUT_CLS} w-24`} />
            </label>
            <label className="flex items-center gap-1.5 pb-2 text-2xs text-foreground-secondary">
              <input type="checkbox" checked={onlyUnscheduled} onChange={(e) => setOnlyUnscheduled(e.target.checked)} className="accent-accent" />
              Garder les dates manuelles
            </label>
            <button
              type="button"
              disabled={auto.isPending}
              onClick={() => auto.mutate({ strategyId, startDate: ymdToIso(start) ?? undefined, cadenceDays: cadence, onlyUnscheduled })}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {auto.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              Auto-planifier
            </button>
            {auto.data ? <span className="w-full text-2xs text-success">{auto.data.scheduled} action(s) planifiée(s).</span> : null}
          </div>

          {/* Unscheduled bucket */}
          {unscheduled.length > 0 ? (
            <section className="mb-10">
              <div className="mb-3 flex items-center gap-2">
                <Inbox className="h-4 w-4 text-foreground-muted" />
                <h2 className="text-sm font-semibold text-foreground">À planifier <span className="text-foreground-muted">({unscheduled.length})</span></h2>
              </div>
              <div className="space-y-1.5">
                {unscheduled.map((a) => <ActionRow key={a.id} a={a} />)}
              </div>
            </section>
          ) : null}

          {/* Scheduled timeline grouped by month */}
          {groups.map((g) => (
            <section key={g.label} className="mb-8">
              <div className="mb-3 flex items-center gap-3">
                <CalendarClock className="h-4 w-4 text-accent" />
                <h2 className="font-display font-semibold capitalize tracking-tight text-foreground" style={{ fontSize: "var(--text-lg)" }}>{g.label}</h2>
                <div className="h-px flex-1 bg-border-subtle" />
                <span className="font-mono text-2xs uppercase tracking-widest text-foreground-muted">{g.items.length}</span>
              </div>
              <ol className="space-y-2">
                {g.items.map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <div className="flex w-12 flex-shrink-0 flex-col items-center pt-2">
                      <span className="font-mono text-2xs font-bold text-accent">{dayLabel(a.timingStart!)}</span>
                    </div>
                    <div className="flex-1"><ActionRow a={a} /></div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </>
      )}
    </article>
  );
}
