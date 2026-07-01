"use client";

import type { SwotExterneSection } from "@/server/services/strategy-presentation/types";
import { DataTable } from "../shared/data-table";
import { MetricCard } from "../shared/metric-card";

interface Props { data: SwotExterneSection }

export function SwotExterne({ data }: Props) {
  return (
    <div className="space-y-6">
      {(data.marche.tam || data.marche.sam || data.marche.som) && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Taille du marche</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="TAM (Total)" value={data.marche.tam ?? "—"} />
            <MetricCard label="SAM (Adressable)" value={data.marche.sam ?? "—"} />
            <MetricCard label="SOM (Obtenable)" value={data.marche.som ?? "—"} />
          </div>
          {data.marche.growth && <p className="mt-2 text-xs text-foreground-muted">Croissance : {data.marche.growth}</p>}
        </div>
      )}

      {data.concurrents.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Benchmark concurrentiel</h3>
          <DataTable
            headers={["Concurrent", "Forces", "Faiblesses", "PDM"]}
            rows={data.concurrents.map((c) => [
              c.nom,
              c.forces.join(", "),
              c.faiblesses.join(", "),
              c.partDeMarche ?? "—",
            ])}
          />
        </div>
      )}

      {data.tendances.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Tendances marche</h3>
          <ul className="space-y-1.5">
            {data.tendances.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground-secondary">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.brandMarketFit && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Brand-Market Fit</h3>
          <div className="rounded-lg border border-border bg-background/50 p-4">
            {data.brandMarketFit.score != null && (
              <p className="text-lg font-bold text-sky-400">{data.brandMarketFit.score}/10</p>
            )}
            {data.brandMarketFit.gaps.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-foreground-muted">Gaps</p>
                <ul className="mt-1 space-y-1">
                  {data.brandMarketFit.gaps.map((g, i) => <li key={i} className="text-xs text-error">• {g}</li>)}
                </ul>
              </div>
            )}
            {data.brandMarketFit.opportunities.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-foreground-muted">Opportunites</p>
                <ul className="mt-1 space-y-1">
                  {data.brandMarketFit.opportunities.map((o, i) => <li key={i} className="text-xs text-emerald-400">• {o}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
