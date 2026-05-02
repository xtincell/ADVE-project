"use client";

import type { SwotInterneSection } from "@/server/services/strategy-presentation/types";
import { DataTable } from "../shared/data-table";

interface Props { data: SwotInterneSection }

export function SwotInterne({ data }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-success/30 bg-success/20 p-4">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-success">Forces</h4>
          <ul className="space-y-1">
            {data.forces.map((f, i) => <li key={i} className="text-sm text-foreground-secondary">• {f}</li>)}
          </ul>
        </div>
        <div className="rounded-lg border border-error/30 bg-error/20 p-4">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-error">Faiblesses</h4>
          <ul className="space-y-1">
            {data.faiblesses.map((f, i) => <li key={i} className="text-sm text-foreground-secondary">• {f}</li>)}
          </ul>
        </div>
        <div className="rounded-lg border border-warning/30 bg-warning/20 p-4">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-warning">Menaces</h4>
          <ul className="space-y-1">
            {data.menaces.map((m, i) => <li key={i} className="text-sm text-foreground-secondary">• {m}</li>)}
          </ul>
        </div>
        <div className="rounded-lg border border-sky-800/30 bg-sky-950/20 p-4">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-sky-400">Opportunites</h4>
          <ul className="space-y-1">
            {data.opportunites.map((o, i) => <li key={i} className="text-sm text-foreground-secondary">• {o}</li>)}
          </ul>
        </div>
      </div>

      {data.mitigations.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Plan de mitigation</h3>
          <DataTable
            headers={["Risque", "Action", "Priorite"]}
            rows={data.mitigations.map((m) => [m.risque, m.action, m.priorite])}
          />
        </div>
      )}

      {data.artemisResults.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Diagnostics Artemis</h3>
          {data.artemisResults.map((ar, i) => (
            <div key={i} className="mb-3 rounded-lg border border-border bg-background/50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{ar.framework}</p>
                {ar.score != null && <span className="text-xs font-bold text-warning">{ar.score}/10</span>}
              </div>
              {ar.prescriptions.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {ar.prescriptions.map((p, j) => <li key={j} className="text-xs text-foreground-secondary">→ {p}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
