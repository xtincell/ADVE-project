"use client";

import type { FenetreOvertonSection } from "@/server/services/strategy-presentation/types";
import { DataTable } from "../shared/data-table";
import { initiativeBudgetLabel } from "@/lib/strategy/roadmap-routes";

interface Props { data: FenetreOvertonSection }

export function FenetreOverton({ data }: Props) {
  const dash = data.computedDashboard;
  return (
    <div className="space-y-6">
      {/* Tableau de bord calculé (ADR-0088) — agrégations, aucune saisie */}
      {dash && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-background bg-background/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">Budget du plan</p>
            <p className="mt-1 text-lg font-bold text-foreground">{initiativeBudgetLabel(dash.totalBudget, dash.budgetSummary)}</p>
          </div>
          <div className="rounded-lg border border-background bg-background/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">Couverture risques</p>
            <p className="mt-1 text-lg font-bold text-foreground">{dash.riskCoverage != null ? `${dash.riskCoverage}%` : "—"}</p>
          </div>
          <div className="rounded-lg border border-background bg-background/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">Initiatives retenues</p>
            <p className="mt-1 text-lg font-bold text-foreground">{dash.selectedInitiativeCount ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-background bg-background/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">Cohérence</p>
            <p className="mt-1 text-lg font-bold text-foreground">{dash.coherenceScore != null ? `${dash.coherenceScore}/100` : "—"}</p>
          </div>
        </div>
      )}

      {/* 3 trajectoires de roadmap (ADR-0088) — projections pure-computed.
          ADR-0089 : chaque route porte son jeu de stratégie ; la route
          sélectionnée (ambition retenue par l'opérateur) est mise en avant. */}
      {data.roadmapRoutes.length > 0 ? <p className="text-xs text-foreground-muted">Scénarios proposés depuis le catalogue : les actions et budgets ne constituent pas des résultats mesurés.</p> : null}
      {data.roadmapRoutes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {data.roadmapRoutes.map((r) => {
            const highlight = r.selected || (r.recommended && !data.roadmapRoutes.some((x) => x.selected));
            return (
              <div
                key={r.key}
                className={
                  highlight
                    ? "relative rounded-xl border border-accent bg-accent/10 p-5 ring-1 ring-accent/40"
                    : "relative rounded-xl border border-background bg-background/40 p-5"
                }
              >
                <span className="absolute right-4 top-4 flex gap-1.5">
                  {r.selected && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Sélectionné
                    </span>
                  )}
                  {r.recommended && !r.selected && (
                    <span className="rounded-full bg-accent/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Recommandé
                    </span>
                  )}
                </span>
                <p className="text-sm font-semibold text-foreground">{r.label}</p>
                <p className={highlight ? "mt-3 text-4xl font-extrabold text-accent" : "mt-3 text-4xl font-extrabold text-foreground"}>
                  {r.initiativeCount !== null ? `${r.initiativeCount} action${r.initiativeCount > 1 ? "s" : ""}` : "Scénario à recalculer"}
                </p>
                {/* Jeu de stratégie de la route (ADR-0089) */}
                {(r.initiativeCount != null || r.totalBudget != null) && (
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-background/60 px-3 py-2 text-xs">
                    <span className="text-foreground-secondary">
                      {r.initiativeCount != null ? `${r.initiativeCount} initiative${r.initiativeCount > 1 ? "s" : ""}` : "—"}
                    </span>
                    <span className="font-bold text-foreground">
                      {initiativeBudgetLabel(r.totalBudget, r.budgetSummary)}
                      {r.riskCoverage != null ? ` · ${r.riskCoverage}% risques` : ""}
                    </span>
                  </div>
                )}
                <p className="mt-3 text-xs text-foreground-secondary">{r.description}</p>
                {r.initiatives?.length ? <details className="mt-3 text-xs text-foreground-secondary"><summary className="cursor-pointer">Actions du scénario</summary>
                  <ol className="mt-2 space-y-2">{r.initiatives.map(a => <li key={a.id}><strong>{a.action}</strong>{a.objectif ? <p>{a.objectif}</p> : null}</li>)}</ol>
                </details> : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Perception gap */}
      {(data.perceptionActuelle || data.perceptionCible) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-red-800/30 bg-error/20 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-error">Perception actuelle</p>
            <p className="mt-2 text-sm text-foreground">{data.perceptionActuelle ?? "Non definie"}</p>
          </div>
          <div className="rounded-lg border border-emerald-800/30 bg-emerald-950/20 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Perception cible</p>
            <p className="mt-2 text-sm text-foreground">{data.perceptionCible ?? "Non definie"}</p>
          </div>
        </div>
      )}

      {data.ecart && (
        <div className="rounded-lg border border-amber-800/30 bg-amber-950/20 p-4">
          <p className="text-xs font-bold uppercase text-amber-400">Ecart a combler</p>
          <p className="mt-1 text-sm text-foreground-secondary">{data.ecart}</p>
        </div>
      )}

      {data.strategieDeplacment.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Stratégie de déplacement</h3>
          <div className="space-y-3">
            {data.strategieDeplacment.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{s.etape}</p>
                  <p className="text-xs text-foreground-secondary">{s.action}</p>
                  <div className="mt-1 flex gap-2 text-[10px]">
                    <span className="rounded bg-background px-1.5 py-0.5 text-foreground-muted">{s.canal}</span>
                    <span className="rounded bg-background px-1.5 py-0.5 text-foreground-muted">{s.horizon}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.roadmap.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Roadmap</h3>
          <DataTable
            headers={["Phase", "Objectif", "Livrables", "Budget", "Duree"]}
            rows={data.roadmap.map((r) => [
              r.phase,
              r.objectif,
              r.livrables.join(", "),
              initiativeBudgetLabel(r.budget, r.budgetSummary),
              r.duree,
            ])}
          />
        </div>
      )}

      {data.jalons.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Jalons cles</h3>
          <div className="space-y-2">
            {data.jalons.map((j, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="shrink-0 text-xs font-mono text-foreground-muted">{j.date}</span>
                <span className="h-px flex-1 bg-background" />
                <span className="text-foreground">{j.milestone}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
