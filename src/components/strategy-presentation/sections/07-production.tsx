"use client";

import type { ProductionLivrablesSection } from "@/server/services/strategy-presentation/types";
import { DataTable } from "../shared/data-table";

interface Props { data: ProductionLivrablesSection }

export function ProductionLivrables({ data }: Props) {
  const layers = Object.entries(data.gloryOutputsByLayer).filter(([, arr]) => arr.length > 0);
  return (
    <div className="space-y-6">
      {(data.proposedAssets?.length ?? 0) > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground-secondary">Livrables proposés</h3>
          <p className="mb-3 text-sm text-foreground-secondary">Possibilités du catalogue de marque, à choisir et préparer. Leur présence ne signifie pas qu’elles sont produites.</p>
          <DataTable headers={["Proposition", "Type", "Usage"]} rows={data.proposedAssets!.map(a => [a.asset, a.type, a.usage])} />
        </div>
      )}
      {data.missions.length === 0 && layers.length === 0 && (
        <p className="text-sm text-foreground-secondary">Aucune mission ni sortie de production enregistrée pour ce dossier.</p>
      )}
      {data.missions.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Missions</h3>
          <DataTable
            headers={["Titre", "Statut", "Mode", "Driver", "Budget", "Livrables"]}
            rows={data.missions.slice(0, 15).map((m) => [
              m.title, m.status, m.mode, m.driverName ?? "—",
              m.budget != null ? `${m.budget.toLocaleString("fr-FR")} XAF` : "—",
              m.deliverables.length.toString(),
            ])}
            compact
          />
        </div>
      )}
      {layers.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Productions enregistrées par spécialité</h3>
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
