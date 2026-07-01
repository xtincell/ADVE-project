"use client";

import type { CroissanceEvolutionSection } from "@/server/services/strategy-presentation/types";
import { DataTable } from "../shared/data-table";

interface Props { data: CroissanceEvolutionSection }

export function CroissanceEvolution({ data }: Props) {
  return (
    <div className="space-y-6">
      {data.bouclesCroissance.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Boucles de croissance</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.bouclesCroissance.map((b, i) => (
              <div key={i} className="rounded-lg border border-border bg-background/50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{b.nom}</p>
                  <span className="rounded bg-background px-2 py-0.5 text-[10px] text-foreground-muted">{b.type}</span>
                </div>
                <p className="mt-2 text-xs text-foreground-secondary">{b.plan}</p>
                {b.potentielViral != null && (
                  <p className="mt-1 text-xs text-emerald-400">Potentiel viral : {(b.potentielViral * 100).toFixed(0)}%</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.expansionStrategy && data.expansionStrategy.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Strategie d'expansion</h3>
          <DataTable
            headers={["Marche", "Priorite", "Plan d'entree"]}
            rows={data.expansionStrategy.map((e) => [e.marche, String(e.priorite), e.planEntree])}
          />
        </div>
      )}

      {data.evolutionMarque && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Evolution de marque</h3>
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <p className="text-sm text-foreground-secondary">{data.evolutionMarque.trajectoire}</p>
            {data.evolutionMarque.scenariosPivot.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-foreground-muted">Scenarios de pivot</p>
                <ul className="mt-1 space-y-1">
                  {data.evolutionMarque.scenariosPivot.map((s, i) => (
                    <li key={i} className="text-xs text-amber-400">• {s}</li>
                  ))}
                </ul>
              </div>
            )}
            {data.evolutionMarque.extensionsMarque.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-foreground-muted">Extensions de marque</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {data.evolutionMarque.extensionsMarque.map((e, i) => (
                    <span key={i} className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs text-accent">{e}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {data.pipelineInnovation.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Pipeline d'innovation</h3>
          <DataTable
            headers={["Initiative", "Impact", "Faisabilite", "TTM"]}
            rows={data.pipelineInnovation.map((p) => [p.initiative, p.impact, p.faisabilite, p.timeToMarket])}
          />
        </div>
      )}
    </div>
  );
}
