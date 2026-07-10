"use client";

/**
 * MacroRoadmapPanel — vue timeline des campagnes de la stratégie (ADR-0120 PR-4c).
 *
 * Read-only : positionne les campagnes (canon + ponctuelles) sur une timeline
 * horizontale proportionnelle à leurs dates, avec une ligne « aujourd'hui ». Layout
 * 100 % déterministe (`computeRoadmapLayout`), zéro LLM. Complément macro du
 * rétroplanning (vue micro, fiche mission).
 */

import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { computeRoadmapLayout, type RoadmapCampaignInput } from "@/lib/strategy/roadmap-layout";
import { CalendarRange } from "lucide-react";

const CANON_LABEL: Record<string, string> = {
  GTM_90: "30-60-90",
  ANNUAL: "Annuelle",
  ALWAYS_ON: "Always-on",
  PUNCTUAL: "Ponctuelle",
};

const STATUS_TONE: Record<string, string> = {
  LIVE: "bg-success/30 border-success/50",
  POST_CAMPAIGN: "bg-success/20 border-success/40",
  COMPLETED: "bg-success/20 border-success/40",
  ARCHIVED: "bg-white/5 border-white/10",
  CANCELLED: "bg-error/20 border-error/40",
  PLANNING: "bg-accent/20 border-accent/40",
  DRAFT: "bg-white/5 border-white/10",
};
const tone = (status: string | null): string => (status && STATUS_TONE[status]) || "bg-accent/15 border-accent/30";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });
}

export function MacroRoadmapPanel() {
  const strategyId = useCurrentStrategyId();
  const { data, isLoading } = trpc.campaign.list.useQuery(
    { strategyId: strategyId ?? undefined },
    { enabled: !!strategyId },
  );
  if (!strategyId) return null;

  const campaigns = (data ?? []) as RoadmapCampaignInput[];
  const layout = computeRoadmapLayout(campaigns, new Date());

  return (
    <section className="rounded-xl border border-white/5 bg-surface-raised p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarRange className="h-4 w-4 text-accent" /> Macro Roadmap
        </h2>
        {layout.windowStart ? (
          <p className="text-2xs text-foreground-muted">
            {fmtDate(layout.windowStart)} → {fmtDate(layout.windowEnd)}
          </p>
        ) : null}
      </div>

      {isLoading ? (
        <p className="mt-4 text-xs text-foreground-muted">Chargement…</p>
      ) : layout.bars.length === 0 ? (
        <p className="mt-4 text-xs text-foreground-muted">
          Aucune campagne datée. Amorce les frames canon (ancrés sur la date de lancement) pour voir la timeline.
        </p>
      ) : (
        <div className="relative mt-4">
          {layout.nowPct != null ? (
            <div className="pointer-events-none absolute inset-y-0 z-10 w-px bg-foreground/40" style={{ left: `${layout.nowPct}%` }} aria-hidden />
          ) : null}
          <div className="space-y-1.5">
            {layout.bars.map((b) => (
              <div key={b.id} className="relative h-7">
                <div className="absolute inset-0 rounded bg-background/40" />
                <div
                  className={`absolute top-0 flex h-7 items-center gap-1.5 overflow-hidden rounded border px-2 ${tone(b.status)}`}
                  style={{ left: `${b.leftPct}%`, width: `${b.widthPct}%` }}
                  title={`${b.name} · ${fmtDate(b.startDate)}${b.endDate ? `–${fmtDate(b.endDate)}` : " → permanent"}`}
                >
                  <span className="truncate text-2xs font-medium text-foreground">{b.name}</span>
                  {b.canonType ? (
                    <span className="shrink-0 text-2xs text-foreground-muted">{CANON_LABEL[b.canonType] ?? b.canonType}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {layout.undated.length > 0 ? (
        <p className="mt-3 text-2xs text-foreground-muted">
          {layout.undated.length} campagne(s) sans date : {layout.undated.slice(0, 5).map((u) => u.name).join(", ")}
          {layout.undated.length > 5 ? "…" : ""}
        </p>
      ) : null}
    </section>
  );
}
