"use client";

import type { MediasDistributionSection } from "@/server/services/strategy-presentation/types";
import { DataTable } from "../shared/data-table";

interface Props { data: MediasDistributionSection }

export function MediasDistribution({ data }: Props) {
  const digital = data.drivers.filter((d) => d.channelType === "DIGITAL");
  const physical = data.drivers.filter((d) => d.channelType !== "DIGITAL");

  return (
    <div className="space-y-6">
      {digital.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Canaux digitaux</h3>
          <div className="flex flex-wrap gap-2">
            {digital.map((d, i) => (
              <span key={i} className="rounded-full bg-blue-900/20 px-3 py-1 text-xs font-medium text-blue-400">
                {d.name} ({d.channel})
              </span>
            ))}
          </div>
        </div>
      )}
      {physical.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Canaux physiques & media</h3>
          <div className="flex flex-wrap gap-2">
            {physical.map((d, i) => (
              <span key={i} className="rounded-full bg-orange-900/20 px-3 py-1 text-xs font-medium text-orange-400">
                {d.name} ({d.channel})
              </span>
            ))}
          </div>
        </div>
      )}
      {data.mediaActions.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Actions media</h3>
          <DataTable
            headers={["Action", "Categorie", "Budget"]}
            rows={data.mediaActions.map((a) => [
              a.name, a.category, a.budget ? `${a.budget.toLocaleString()} XAF` : "—",
            ])}
            compact
          />
        </div>
      )}
      {data.digitalPlannerOutput && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Digital Planner (Glory)</h3>
          <pre className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 font-mono text-xs text-zinc-500">
            {JSON.stringify(data.digitalPlannerOutput, null, 2).slice(0, 1500)}
          </pre>
        </div>
      )}
    </div>
  );
}
