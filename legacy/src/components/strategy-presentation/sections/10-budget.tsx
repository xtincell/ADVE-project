"use client";

import type { BudgetSection } from "@/server/services/strategy-presentation/types";
import { MetricCard } from "../shared/metric-card";
import { DataTable } from "../shared/data-table";

interface Props { data: BudgetSection }

export function BudgetDisplay({ data }: Props) {
  const ue = data.unitEconomics;
  return (
    <div className="space-y-6">
      {ue && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Unit Economics</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ue.cac != null && <MetricCard label="CAC" value={`${ue.cac.toLocaleString()} XAF`} />}
            {ue.ltv != null && <MetricCard label="LTV" value={`${ue.ltv.toLocaleString()} XAF`} />}
            {ue.ltvCacRatio != null && <MetricCard label="LTV:CAC" value={`${ue.ltvCacRatio.toFixed(1)}x`} accent="rgb(124, 179, 66)" />}
            {ue.margeNette != null && <MetricCard label="Marge nette" value={`${(ue.margeNette * 100).toFixed(0)}%`} />}
            {ue.roiEstime != null && <MetricCard label="ROI estime" value={`${(ue.roiEstime * 100).toFixed(0)}%`} accent="rgb(66, 165, 245)" />}
            {ue.budgetCom != null && <MetricCard label="Budget com" value={`${ue.budgetCom.toLocaleString()} XAF`} />}
            {ue.caVise != null && <MetricCard label="CA vise" value={`${ue.caVise.toLocaleString()} XAF`} />}
          </div>
        </div>
      )}
      {data.campaignBudgets.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Budgets par campagne</h3>
          <DataTable
            headers={["Campagne", "Budget", "Statut"]}
            rows={data.campaignBudgets.map((c) => [
              c.name, c.budget ? `${c.budget.toLocaleString()} XAF` : "—", c.status,
            ])}
          />
          <div className="mt-3 flex justify-end">
            <span className="rounded-full bg-orange-500/10 px-4 py-1 text-sm font-bold text-orange-400">
              Total: {data.totalBudget.toLocaleString()} XAF
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
