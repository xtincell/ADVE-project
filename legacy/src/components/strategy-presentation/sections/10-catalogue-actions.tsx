"use client";

import type { CatalogueActionsSection } from "@/server/services/strategy-presentation/types";
import { DataTable } from "../shared/data-table";
import { MetricCard } from "../shared/metric-card";

interface Props { data: CatalogueActionsSection }

export function CatalogueActions({ data }: Props) {
  const canaux = Object.keys(data.parCanal);
  const piliers = Object.keys(data.parPilier);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <MetricCard label="Total actions possibles" value={String(data.totalActions)} />
        <MetricCard label="Canaux actifs" value={String(canaux.length)} />
      </div>

      {canaux.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Par canal</h3>
          {canaux.map((canal) => (
            <div key={canal} className="mb-4">
              <p className="mb-2 text-xs font-bold uppercase text-accent">{canal}</p>
              <DataTable
                headers={["Action", "Format", "Cout", "Impact"]}
                rows={data.parCanal[canal]!.map((a) => [a.action, a.format, a.cout ?? "—", a.impact])}
              />
            </div>
          ))}
        </div>
      )}

      {piliers.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Par pilier ADVE-RTIS</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {piliers.map((pilier) => (
              <div key={pilier} className="rounded-lg border border-border bg-background/50 p-4">
                <p className="text-xs font-bold uppercase text-foreground-secondary">{pilier.toUpperCase()}</p>
                <ul className="mt-2 space-y-1">
                  {data.parPilier[pilier]!.map((a, i) => (
                    <li key={i} className="text-xs text-foreground-secondary">
                      <span className="text-foreground-muted">{a.objectif}</span> → {a.action}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.drivers.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Drivers actifs</h3>
          <div className="flex flex-wrap gap-2">
            {data.drivers.map((d, i) => (
              <span key={i} className={`rounded-full px-3 py-1 text-xs font-medium ${
                d.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400" : "bg-background text-foreground-muted"
              }`}>
                {d.name} ({d.channel})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
