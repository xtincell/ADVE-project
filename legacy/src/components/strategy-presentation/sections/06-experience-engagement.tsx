"use client";

import type { ExperienceEngagementSection } from "@/server/services/strategy-presentation/types";
import { DataTable } from "../shared/data-table";
import { DevotionPyramid } from "../shared/devotion-pyramid";

interface Props { data: ExperienceEngagementSection }

export function ExperienceEngagement({ data }: Props) {
  return (
    <div className="space-y-6">
      {data.touchpoints.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Points de contact</h3>
          <DataTable
            headers={["Touchpoint", "Canal", "Qualite", "Stade AARRR"]}
            rows={data.touchpoints.map((t) => [t.nom, t.canal, t.qualite, t.stadeAarrr])}
          />
        </div>
      )}

      {data.rituels.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Rituels de marque</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.rituels.map((r, i) => (
              <div key={i} className="rounded-lg border border-border bg-background/50 p-4">
                <p className="text-sm font-semibold text-foreground">{r.nom}</p>
                <p className="mt-1 text-xs text-foreground-muted">{r.frequence}</p>
                <p className="mt-2 text-sm text-foreground-secondary">{r.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.devotionPathway && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Parcours de devotion</h3>
          <DevotionPyramid data={data.devotionPathway.currentDistribution} score={0} />
          {data.devotionPathway.conversionTriggers.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-foreground-muted">Triggers de conversion</p>
              {data.devotionPathway.conversionTriggers.map((ct, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-foreground-secondary">
                  <span className="font-medium text-foreground-secondary">{ct.from}</span>
                  <span className="text-foreground-muted">→</span>
                  <span className="font-medium text-foreground-secondary">{ct.to}</span>
                  <span className="text-foreground-muted">: {ct.trigger}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {data.communityStrategy && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Strategie communautaire</h3>
          <p className="text-sm text-foreground-secondary">{data.communityStrategy}</p>
        </div>
      )}
    </div>
  );
}
