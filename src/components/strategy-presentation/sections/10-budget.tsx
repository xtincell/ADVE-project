"use client";

import type { BudgetSection } from "@/server/services/strategy-presentation/types";
import { MetricCard } from "../shared/metric-card";
import { DataTable } from "../shared/data-table";
import { aggregateCampaignBudgets, campaignBudgetLabel } from "@/lib/strategy/roadmap-routes";
import { unitEconomicsRatio } from "@/domain/unit-economics";

interface Props { data: BudgetSection }

export function BudgetDisplay({ data }: Props) {
  const ue = data.unitEconomics;
  const ratio = unitEconomicsRatio(ue?.cac, ue?.ltv, ue?.ltvCacRatio);
  // Recompute from the snapshot's rows too: older snapshots have no summary.
  const campaignSummary = aggregateCampaignBudgets(data.campaignBudgets);
  return (
    <div className="space-y-6">
      {ue && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Unit Economics</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ue.cac != null && <MetricCard label="CAC" value={`${ue.cac.toLocaleString("fr-FR")} XAF`} />}
            {ue.ltv != null && <MetricCard label="LTV" value={`${ue.ltv.toLocaleString("fr-FR")} XAF`} />}
            {ratio !== null && <MetricCard label="LTV/CAC calculé" value={`${ratio.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}x`} accent="rgb(124, 179, 66)" />}
            {ue.margeNette != null && <MetricCard label="Marge nette" value={`${(ue.margeNette * 100).toFixed(0)}%`} />}
            {ue.roiEstime != null && <MetricCard label="ROI estime" value={`${(ue.roiEstime * 100).toFixed(0)}%`} accent="rgb(66, 165, 245)" />}
            {ue.budgetCom != null && <MetricCard label="Budget com" value={`${ue.budgetCom.toLocaleString("fr-FR")} XAF`} />}
            {ue.caVise != null && <MetricCard label="CA vise" value={`${ue.caVise.toLocaleString("fr-FR")} XAF`} />}
          </div>
          {ue.commentaire ? <p className="mt-2 whitespace-pre-line text-xs text-foreground-muted">{ue.commentaire}</p> : null}
        </div>
      )}
      {data.campaignBudgets.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Budgets par campagne</h3>
          <DataTable
            headers={["Campagne", "Budget", "Statut"]}
            rows={data.campaignBudgets.map((c) => [
              c.name, c.budget != null
                ? `${c.budget.toLocaleString("fr-FR")} ${c.budgetCurrency?.trim() || "· devise à préciser"}`
                : "—", c.status,
            ])}
          />
          <div className="mt-3 flex justify-end">
            <span className="rounded-full bg-orange-500/10 px-4 py-1 text-sm font-bold text-orange-400">
              {campaignBudgetLabel(campaignSummary)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
