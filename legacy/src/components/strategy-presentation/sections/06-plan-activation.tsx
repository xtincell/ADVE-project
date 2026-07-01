"use client";

import type { PlanActivationSection } from "@/server/services/strategy-presentation/types";
import { DataTable } from "../shared/data-table";
import { AARRRFunnel } from "../shared/aarrr-funnel";

interface Props { data: PlanActivationSection }

export function PlanActivation({ data }: Props) {
  return (
    <div className="space-y-6">
      {/* AARRR Funnel */}
      <AARRRFunnel data={data.aarrr} />

      {/* Campaigns architecture */}
      {data.campaigns.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Architecture de campagne</h3>
          {data.campaigns.map((c, i) => (
            <div key={i} className="mb-4 rounded-xl border border-border bg-background/50 p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground">{c.name}</h4>
                <span className="rounded-full bg-background px-2 py-0.5 text-xs text-foreground-secondary">{c.status}</span>
              </div>
              {(c.startDate || c.budget) && (
                <div className="mt-2 flex gap-4 text-xs text-foreground-muted">
                  {c.startDate && <span>Debut: {new Date(c.startDate).toLocaleDateString("fr")}</span>}
                  {c.endDate && <span>Fin: {new Date(c.endDate).toLocaleDateString("fr")}</span>}
                  {c.budget && <span>Budget: {c.budget.toLocaleString()} XAF</span>}
                </div>
              )}
              {c.actions.length > 0 && (
                <div className="mt-3">
                  <DataTable
                    headers={["Action", "Categorie", "Type", "Budget", "Stage AARRR"]}
                    rows={c.actions.map((a) => [
                      a.name,
                      a.category,
                      a.actionType,
                      a.budget ? `${a.budget.toLocaleString()} XAF` : "—",
                      a.aarrStage ?? "—",
                    ])}
                    compact
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Touchpoints */}
      {data.touchpoints.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Touchpoints</h3>
          <DataTable
            headers={["Nom", "Canal", "Type", "Stage AARRR", "Niveau devotion"]}
            rows={data.touchpoints.map((t) => [t.nom, t.canal, t.type, t.stadeAarrr, t.niveauDevotion])}
            compact
          />
        </div>
      )}

      {/* Rituels */}
      {data.rituels.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Rituels de marque</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.rituels.map((r, i) => (
              <div key={i} className="rounded-lg border border-border bg-background/50 p-3">
                <p className="text-sm font-semibold text-foreground">{r.nom}</p>
                <p className="text-xs text-orange-400">{r.frequence}</p>
                {r.description && <p className="mt-1 text-xs text-foreground-muted">{r.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drivers actifs */}
      {data.drivers.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Canaux actifs</h3>
          <div className="flex flex-wrap gap-2">
            {data.drivers.map((d, i) => (
              <span key={i} className={`rounded-full px-3 py-1 text-xs font-medium ${d.status === "ACTIVE" ? "bg-emerald-900/30 text-emerald-400" : "bg-background text-foreground-muted"}`}>
                {d.name} ({d.channel})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
