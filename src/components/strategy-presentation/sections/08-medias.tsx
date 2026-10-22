"use client";

import type { MediasDistributionSection } from "@/server/services/strategy-presentation/types";
import { DataTable } from "../shared/data-table";
import { GloryBlock } from "./05-territoire-creatif";

interface Props { data: MediasDistributionSection }

export function MediasDistribution({ data }: Props) {
  const digital = data.drivers.filter((d) => d.channelType === "DIGITAL");
  const physical = data.drivers.filter((d) => d.channelType !== "DIGITAL");

  return (
    <div className="space-y-6">
      {digital.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Canaux digitaux</h3>
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
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Canaux physiques & media</h3>
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
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Actions media</h3>
          {data.mediaActions.some(a => a.proposed) && <p className="mb-3 text-xs text-foreground-muted">Les actions proposées appartiennent au catalogue de possibilités ; leurs montants ne constituent pas un budget engagé ou une dépense mesurée.</p>}
          <DataTable
            headers={["Action", "Categorie", "Budget"]}
            rows={data.mediaActions.map((a) => [
              a.name, a.category, a.budgetLabel ?? (a.budget != null ? `${a.budget.toLocaleString("fr-FR")} XAF` : "—"),
            ])}
            compact
          />
        </div>
      )}
      {data.digitalPlannerOutput && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Plan de diffusion</h3>
          <GloryBlock data={data.digitalPlannerOutput} />
        </div>
      )}
    </div>
  );
}
