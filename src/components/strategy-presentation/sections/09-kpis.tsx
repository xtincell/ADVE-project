"use client";

import type { KpisMesureSection } from "@/server/services/strategy-presentation/types";
import { DataTable } from "../shared/data-table";
import { DevotionPyramid } from "../shared/devotion-pyramid";
import { CultIndexGauge } from "../shared/cult-index-gauge";
import { AARRRFunnel } from "../shared/aarrr-funnel";
import { MetricCard } from "../shared/metric-card";

interface Props { data: KpisMesureSection }

export function KpisMesure({ data }: Props) {
  return (
    <div className="space-y-6">
      {/* KPI table */}
      {data.kpis.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">KPIs methode ADVE</h3>
          <DataTable
            headers={["KPI", "Type", "Cible", "Frequence"]}
            rows={data.kpis.map((k) => [k.name, k.metricType, k.target, k.frequency])}
          />
        </div>
      )}

      {/* Devotion + Cult Index side by side */}
      <div className="grid gap-6 sm:grid-cols-2">
        {data.devotion && (
          <DevotionPyramid
            data={{
              spectateur: data.devotion.spectateur,
              interesse: data.devotion.interesse,
              participant: data.devotion.participant,
              engage: data.devotion.engage,
              ambassadeur: data.devotion.ambassadeur,
              evangeliste: data.devotion.evangeliste,
            }}
            score={data.devotion.devotionScore}
          />
        )}
        {data.cultIndex && (
          <div className="flex flex-col items-center justify-center gap-4">
            <CultIndexGauge score={data.cultIndex.compositeScore} tier={data.cultIndex.tier} />
            <div className="grid grid-cols-2 gap-2">
              {data.cultIndex.engagementVelocity != null && (
                <MetricCard label="Engagement Velocity" value={data.cultIndex.engagementVelocity.toFixed(1)} />
              )}
              {data.cultIndex.communityHealth != null && (
                <MetricCard label="Community Health" value={data.cultIndex.communityHealth.toFixed(1)} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Superfans */}
      {data.superfans.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Top Superfans ({data.superfans.length})
          </h3>
          <DataTable
            headers={["Plateforme", "Handle", "Engagement Depth", "Segment"]}
            rows={data.superfans.slice(0, 10).map((sf) => [
              sf.platform, sf.handle, sf.engagementDepth.toFixed(2), sf.segment ?? "—",
            ])}
            compact
          />
        </div>
      )}

      {/* Community */}
      {data.communitySnapshots.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Communaute</h3>
          <DataTable
            headers={["Plateforme", "Taille", "Engagement", "Croissance"]}
            rows={data.communitySnapshots.map((cs) => [
              cs.platform,
              cs.size.toLocaleString(),
              cs.engagement?.toFixed(2) ?? "—",
              cs.growth?.toFixed(2) ?? "—",
            ])}
            compact
          />
        </div>
      )}

      {/* AARRR */}
      {data.aarrr && <AARRRFunnel data={data.aarrr} />}
    </div>
  );
}
