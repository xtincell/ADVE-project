"use client";

import type { ExecutiveSummarySection } from "@/server/services/strategy-presentation/types";
import { RadarMini } from "../shared/radar-mini";
import { MetricCard } from "../shared/metric-card";

interface Props { data: ExecutiveSummarySection }

function clampComposite(score: number): number {
  return Math.min(200, Math.max(0, score));
}

export function ExecutiveSummary({ data }: Props) {
  const composite = clampComposite(data.vector.composite);
  return (
    <div className="space-y-6">
      {/* Hero: Radar + Classification */}
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <RadarMini vector={data.vector} size={200} />
        <div className="flex-1 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-foreground-muted">Classification</p>
            <p className="text-3xl font-black" style={{ color: data.classification === "ICONE" ? "rgb(232, 75, 34)" : data.classification === "CULTE" ? "rgb(245, 124, 0)" : "rgb(158, 158, 158)" }}>
              {data.classification}
            </p>
            <p className="text-sm text-foreground-secondary">{data.brandName}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="Composite" value={`${composite.toFixed(0)}/200`} />
            <MetricCard label="Confiance" value={`${(typeof data.vector.confidence === "number" && !isNaN(data.vector.confidence) ? (data.vector.confidence * 100).toFixed(0) : "—")}%`} />
            <MetricCard label="Cult Index" value={data.cultIndex?.score.toFixed(1) ?? "—"} subtitle={data.cultIndex?.tier ?? ""} />
            <MetricCard label="Superfans" value={data.superfanCount} />
          </div>
        </div>
      </div>

      {/* Strengths & Weaknesses — qualitative content from pillar R globalSwot
          (textual statements, not pillar score numbers). */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/20 p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">Forces</h4>
          {data.topStrengths.length > 0 ? (
            <ul className="space-y-1.5">
              {data.topStrengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground-secondary">
                  <span className="text-emerald-400" aria-hidden>•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs italic text-foreground-muted">SWOT à compléter — pilier R `globalSwot.strengths`.</p>
          )}
        </div>
        <div className="rounded-xl border border-red-900/30 bg-error/20 p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-error">Faiblesses</h4>
          {data.topWeaknesses.length > 0 ? (
            <ul className="space-y-1.5">
              {data.topWeaknesses.map((w, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground-secondary">
                  <span className="text-error" aria-hidden>•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs italic text-foreground-muted">SWOT à compléter — pilier R `globalSwot.weaknesses`.</p>
          )}
        </div>
      </div>

      {/* Highlights */}
      {data.highlights.length > 0 && (
        <div className="space-y-1">
          {data.highlights.map((h, i) => (
            <p key={i} className="text-sm text-foreground-secondary">— {h}</p>
          ))}
        </div>
      )}
    </div>
  );
}
