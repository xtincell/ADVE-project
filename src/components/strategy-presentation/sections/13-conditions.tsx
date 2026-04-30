"use client";

import type { ConditionsEtapesSection } from "@/server/services/strategy-presentation/types";
import { DataTable } from "../shared/data-table";

interface Props { data: ConditionsEtapesSection }

export function ConditionsEtapes({ data }: Props) {
  return (
    <div className="space-y-6">
      {data.client && (
        <div className="rounded-xl border border-border bg-background/50 p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Client</h3>
          <p className="text-sm text-foreground-secondary">{data.client.contactName ?? "—"}</p>
          {data.client.contactEmail && <p className="text-xs text-foreground-muted">{data.client.contactEmail}</p>}
          {data.client.sector && <p className="text-xs text-foreground-muted">Secteur: {data.client.sector}</p>}
        </div>
      )}
      {data.contracts.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Contrats</h3>
          <DataTable
            headers={["Titre", "Type", "Statut", "Valeur", "Debut", "Fin", "Signe"]}
            rows={data.contracts.map((c) => [
              c.title, c.contractType, c.status,
              c.value ? `${c.value.toLocaleString()} XAF` : "—",
              c.startDate ? new Date(c.startDate).toLocaleDateString("fr") : "—",
              c.endDate ? new Date(c.endDate).toLocaleDateString("fr") : "—",
              c.signedAt ? new Date(c.signedAt).toLocaleDateString("fr") : "Non signe",
            ])}
          />
        </div>
      )}
      <div className="rounded-xl border border-border bg-background/50 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Conditions generales</h3>
        <ul className="space-y-1 text-sm text-foreground-secondary">
          <li>Validite de la proposition : 30 jours a compter de la date d'emission</li>
          <li>Propriete intellectuelle : creations cedees au client apres paiement integral</li>
          <li>Modifications hors scope : facturees selon barème</li>
          <li>Annulation : travaux realises factures au prorata</li>
          <li>Delais : conditionnes au respect des delais de validation client</li>
        </ul>
      </div>
      <div className="rounded-xl border border-orange-900/30 bg-orange-950/10 p-4 text-center">
        <p className="text-sm text-foreground-secondary">
          Nous avons hate de transformer ce defi en resultats.
        </p>
        <p className="mt-1 text-xs text-foreground-muted">Statut: {data.strategyStatus}</p>
      </div>
    </div>
  );
}
