"use client";

import type { ExecutiveSummarySection } from "@/server/services/strategy-presentation/types";
import { RadarMini } from "../shared/radar-mini";
import { MetricCard } from "../shared/metric-card";

interface Props { data: ExecutiveSummarySection }

export function ExecutiveSummary({ data }: Props) {
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
            <MetricCard label="Composite" value={`${data.vector.composite}/200`} />
            <MetricCard label="Confiance" value={`${(typeof data.vector.confidence === "number" && !isNaN(data.vector.confidence) ? (data.vector.confidence * 100).toFixed(0) : "—")}%`} />
            <MetricCard label="Cult Index" value={data.cultIndex?.score.toFixed(0) ?? "—"} subtitle={data.cultIndex?.tier ?? ""} />
            <MetricCard label="Superfans" value={data.superfanCount} />
          </div>
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/20 p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">Forces</h4>
          {data.topStrengths.map((s) => (
            <div key={s.pillar} className="flex items-center justify-between py-1">
              <span className="text-sm text-foreground-secondary">{s.name}</span>
              <span className="text-sm font-bold text-emerald-400">{s.score}/25</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-red-900/30 bg-error/20 p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-error">Faiblesses</h4>
          {data.topWeaknesses.map((w) => (
            <div key={w.pillar} className="flex items-center justify-between py-1">
              <span className="text-sm text-foreground-secondary">{w.name}</span>
              <span className="text-sm font-bold text-error">{w.score}/25</span>
            </div>
          ))}
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
