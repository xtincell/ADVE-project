"use client";

import type { ProductionLivrablesSection } from "@/server/services/strategy-presentation/types";
import { DataTable } from "../shared/data-table";

interface Props { data: ProductionLivrablesSection }

export function ProductionLivrables({ data }: Props) {
  const layers = Object.entries(data.gloryOutputsByLayer).filter(([, arr]) => arr.length > 0);
  return (
    <div className="space-y-6">
      {data.missions.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Missions</h3>
          <DataTable
            headers={["Titre", "Statut", "Mode", "Driver", "Budget", "Livrables"]}
            rows={data.missions.slice(0, 15).map((m) => [
              m.title, m.status, m.mode, m.driverName ?? "—",
              m.budget ? `${m.budget.toLocaleString()} XAF` : "—",
              m.deliverables.length.toString(),
            ])}
            compact
          />
        </div>
      )}
      {layers.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Outputs Glory par layer</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {layers.map(([layer, outputs]) => (
              <div key={layer} className="rounded-xl border border-border bg-background/50 p-4">
                <h4 className="mb-2 text-xs font-bold uppercase text-orange-400">{layer}</h4>
                {outputs.map((o, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-sm text-foreground-secondary">{o.toolName}</span>
                    <span className="text-xs text-foreground-muted">{new Date(o.createdAt).toLocaleDateString("fr")}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
