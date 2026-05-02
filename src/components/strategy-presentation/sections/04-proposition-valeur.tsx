"use client";

import type { PropositionValeurSection } from "@/server/services/strategy-presentation/types";
import { MetricCard } from "../shared/metric-card";

interface Props { data: PropositionValeurSection }

export function PropositionValeur({ data }: Props) {
  return (
    <div className="space-y-6">
      {data.pricing && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Strategie de prix</h3>
          <div className="rounded-lg border border-border bg-background/50 p-4 space-y-2">
            <p className="text-sm text-foreground-secondary">{data.pricing.strategy}</p>
            <p className="text-xs text-foreground-muted">{data.pricing.ladderDescription}</p>
            {data.pricing.competitorComparison && (
              <p className="text-xs text-warning/80">vs. Concurrence : {data.pricing.competitorComparison}</p>
            )}
          </div>
        </div>
      )}

      {data.proofPoints.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Preuves de valeur</h3>
          <ul className="space-y-1.5">
            {data.proofPoints.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground-secondary">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.guarantees.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Garanties</h3>
          <div className="flex flex-wrap gap-2">
            {data.guarantees.map((g, i) => (
              <span key={i} className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">{g}</span>
            ))}
          </div>
        </div>
      )}

      {data.unitEconomics && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Unit Economics</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="CAC" value={data.unitEconomics.cac != null ? `${data.unitEconomics.cac.toLocaleString()} FCFA` : "—"} />
            <MetricCard label="LTV" value={data.unitEconomics.ltv != null ? `${data.unitEconomics.ltv.toLocaleString()} FCFA` : "—"} />
            <MetricCard label="LTV/CAC" value={data.unitEconomics.ltvCacRatio != null ? `${data.unitEconomics.ltvCacRatio.toFixed(1)}x` : "—"} />
          </div>
        </div>
      )}

      {data.innovationPipeline.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Pipeline d'innovation</h3>
          <ul className="space-y-1.5">
            {data.innovationPipeline.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground-secondary">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
