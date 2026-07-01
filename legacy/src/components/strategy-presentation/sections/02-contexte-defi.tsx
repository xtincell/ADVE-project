"use client";

import type { ContexteDefiSection } from "@/server/services/strategy-presentation/types";
import { DataTable } from "../shared/data-table";

interface Props { data: ContexteDefiSection }

export function ContexteDefi({ data }: Props) {
  const bc = data.businessContext;
  return (
    <div className="space-y-6">
      {/* Contexte marche */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Contexte marche</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {bc.sector && <InfoBlock label="Secteur" value={bc.sector} />}
          {bc.businessModel && <InfoBlock label="Business Model" value={bc.businessModel} />}
          {bc.positioningArchetype && <InfoBlock label="Archetype de positionnement" value={bc.positioningArchetype} />}
          {bc.economicModels.length > 0 && <InfoBlock label="Modeles economiques" value={bc.economicModels.join(", ")} />}
          {bc.salesChannels.length > 0 && <InfoBlock label="Canaux de vente" value={bc.salesChannels.join(", ")} />}
          {data.client?.country && <InfoBlock label="Marche" value={data.client.country} />}
        </div>
      </div>

      {/* Defi reformule */}
      {data.enemy && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">L'ennemi identifie</h3>
          <div className="rounded-xl border border-red-900/30 bg-error/10 p-4">
            <p className="text-lg font-bold text-error">{data.enemy.name}</p>
            {data.enemy.manifesto && <p className="mt-1 text-sm text-foreground-secondary">{data.enemy.manifesto}</p>}
            {data.enemy.narrative && <p className="mt-2 text-sm italic text-foreground-muted">{data.enemy.narrative}</p>}
          </div>
        </div>
      )}

      {data.prophecy && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">La prophetie</h3>
          <div className="rounded-xl border border-orange-900/30 bg-orange-950/10 p-4">
            <p className="text-sm text-foreground-secondary">{data.prophecy.worldTransformed}</p>
            {data.prophecy.urgency && <p className="mt-2 text-xs text-orange-400">Urgence: {data.prophecy.urgency}</p>}
            {data.prophecy.horizon && <p className="text-xs text-foreground-muted">Horizon: {data.prophecy.horizon}</p>}
          </div>
        </div>
      )}

      {/* Cibles */}
      {data.personas.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Cibles</h3>
          <DataTable
            headers={["Segment", "Age", "CSP", "Insight cle", "Freins"]}
            rows={data.personas.map((p) => [
              p.nom,
              p.trancheAge,
              p.csp,
              p.insightCle,
              p.freinsAchat.join(", ") || "—",
            ])}
          />
        </div>
      )}
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-3">
      <p className="text-xs text-foreground-muted">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground-secondary">{value}</p>
    </div>
  );
}
