"use client";

import { BudgetPanel, DevotionTargets } from "@/components/cockpit/pillars/pillar-s-fields";
import type { BudgetSection } from "@/server/services/strategy-presentation/types";
import { MetricCard } from "../shared/metric-card";
import { DataTable } from "../shared/data-table";
import { aggregateCampaignBudgets, campaignBudgetLabel } from "@/lib/strategy/roadmap-routes";
import { unitEconomicsMetricRows } from "@/domain/unit-economics";

interface Props { data: BudgetSection }

export function BudgetDisplay({ data }: Props) {
  const ue = data.unitEconomics;
  // Recompute from the snapshot's rows too: older snapshots have no summary.
  const campaignSummary = aggregateCampaignBudgets(data.campaignBudgets);
  return (
    <div className="space-y-6">
      {ue && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Unit Economics</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {unitEconomicsMetricRows(ue).filter(r => r.value !== "—").map(r => <MetricCard key={r.key} label={r.label} value={r.value} />)}
          </div>
          {ue.commentaire ? <p className="mt-2 whitespace-pre-line text-xs text-foreground-muted">{ue.commentaire}</p> : null}
        </div>
      )}
      {data.globalBudget !== null || data.strategyBudgetSummary ? <BudgetPanel breakdown={data.budgetBreakdown} byDevotion={data.budgetByDevotion} total={data.globalBudget} summary={data.strategyBudgetSummary} status="CALCULATED" /> : null}
      <DevotionTargets items={data.devotionFunnel} />
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
