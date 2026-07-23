"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { Section, MiniBtn, KV, EmptyMsg } from "./shared";
import { BarChart3, DollarSign, Plus, RefreshCw, Target } from "lucide-react";

export function BudgetTab({ campaignId }: { campaignId: string }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newLine, setNewLine] = useState({ category: "", label: "", planned: "", notes: "" });

  const summaryQuery = trpc.campaignManager.getBudgetSummary.useQuery({ campaignId });
  const breakdownQuery = trpc.campaignManager.getBudgetBreakdown.useQuery({ campaignId });
  const varianceQuery = trpc.campaignManager.getBudgetVariance.useQuery({ campaignId });
  const burnQuery = trpc.campaignManager.getBurnForecast.useQuery({ campaignId });
  const linesQuery = trpc.campaignManager.listBudgetLines.useQuery({ campaignId });
  const costPerKpiQuery = trpc.campaignManager.getCostPerKPI.useQuery({ campaignId });

  const createMut = trpc.campaignManager.createBudgetLine.useMutation({
    onSuccess: () => { linesQuery.refetch(); summaryQuery.refetch(); breakdownQuery.refetch(); setShowAdd(false); setNewLine({ category: "", label: "", planned: "", notes: "" }); },
  });

  const summary = summaryQuery.data as Record<string, unknown> | null;
  const breakdown = (breakdownQuery.data as Record<string, unknown>)?.breakdown as Array<Record<string, unknown>> | undefined;
  const variance = varianceQuery.data as Record<string, unknown> | null;
  const burn = burnQuery.data as Record<string, unknown> | null;
  const lines = (linesQuery.data ?? []) as Array<Record<string, unknown>>;
  const costKpi = costPerKpiQuery.data as Record<string, unknown> | null;

  const fmt = (n: unknown) => typeof n === "number" ? n.toLocaleString("fr-FR") : "—";

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Budget total", value: `${fmt(summary?.total)} XAF`, color: "text-foreground" },
          { label: "Depense", value: `${fmt(summary?.spent)} XAF`, color: "text-warning" },
          { label: "Restant", value: `${fmt(summary?.remaining)} XAF`, color: "text-success" },
          { label: "Variance", value: `${fmt(variance?.percentage)}%`, color: typeof variance?.percentage === "number" && variance.percentage > 0 ? "text-error" : "text-success" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-background/50 p-3">
            <p className="text-2xs uppercase text-foreground-muted">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Breakdown by category */}
      {breakdown && breakdown.length > 0 && (
        <Section title="Repartition par categorie" icon={BarChart3}>
          <div className="space-y-2">
            {breakdown.map((b) => {
              const pct = typeof b.percentage === "number" ? b.percentage : 0;
              return (
                <div key={b.category as string}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground-secondary">{b.category as string}</span>
                    <span className="text-foreground">{fmt(b.amount)} XAF ({Math.round(pct)}%)</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-background">
                    <div className="h-1.5 rounded-full bg-info transition-all" style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Burn forecast */}
      {burn && (
        <Section title="Prevision de consommation" icon={RefreshCw}>
          <div className="grid grid-cols-3 gap-3">
            <KV label="Taux de burn" value={`${fmt(burn.burnRate)}/jour`} />
            <KV label="Jours restants" value={fmt(burn.daysRemaining)} />
            <KV label="Date prevue d'epuisement" value={burn.exhaustionDate ? new Date(burn.exhaustionDate as string).toLocaleDateString("fr-FR") : "—"} />
          </div>
        </Section>
      )}

      {/* Cost per KPI */}
      {costKpi && (
        <Section title="Cout par KPI" icon={Target}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(costKpi).map(([k, v]) => (
              <KV key={k} label={k} value={`${fmt(v)} XAF`} />
            ))}
          </div>
        </Section>
      )}

      {/* Budget lines */}
      <Section
        title={`Lignes budgetaires (${lines.length})`}
        icon={DollarSign}
        action={<MiniBtn variant="primary" onClick={() => setShowAdd(true)}><span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Ajouter</span></MiniBtn>}
      >
        {lines.length === 0 ? <EmptyMsg text="Aucune ligne budgetaire." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border text-left text-foreground-muted">
                <th className="pb-2 pr-3">Categorie</th>
                <th className="pb-2 pr-3">Libelle</th>
                <th className="pb-2 pr-3 text-right">Prevu</th>
                <th className="pb-2 text-right">Realise</th>
              </tr></thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id as string} className="border-b border-border/50">
                    <td className="py-2 pr-3 text-foreground-secondary">{l.category as string}</td>
                    <td className="py-2 pr-3 text-foreground">{l.label as string}</td>
                    <td className="py-2 pr-3 text-right text-foreground-secondary">{fmt(l.plannedAmount)} XAF</td>
                    <td className="py-2 text-right text-warning">{fmt(l.actualAmount)} XAF</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nouvelle ligne budgetaire" size="md">
        <div className="space-y-4">
          <FormField label="Categorie" required>
            <select value={newLine.category} onChange={(e) => setNewLine({ ...newLine, category: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-border-strong">
              <option value="">Sélectionner...</option>
              {["MEDIA", "PRODUCTION", "TALENT", "LOGISTICS", "TECHNOLOGY", "LEGAL", "CONTINGENCY", "AGENCY_FEE"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>
          <FormField label="Libelle" required>
            <input type="text" value={newLine.label} onChange={(e) => setNewLine({ ...newLine, label: e.target.value })}
              placeholder="Ex: Achat media Facebook"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-foreground-muted outline-none focus:border-border-strong" />
          </FormField>
          <FormField label="Montant prevu (XAF)" required>
            <input type="number" value={newLine.planned} onChange={(e) => setNewLine({ ...newLine, planned: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-border-strong" />
          </FormField>
          <FormField label="Notes">
            <input type="text" value={newLine.notes} onChange={(e) => setNewLine({ ...newLine, notes: e.target.value })}
              placeholder="Notes optionnelles..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-foreground-muted outline-none focus:border-border-strong" />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <MiniBtn onClick={() => setShowAdd(false)}>Annuler</MiniBtn>
            <MiniBtn variant="primary" onClick={() => {
              if (!newLine.category || !newLine.label.trim() || !newLine.planned) return;
              createMut.mutate({
                campaignId,
                category: newLine.category as any,
                label: newLine.label,
                planned: parseFloat(newLine.planned),
                notes: newLine.notes || undefined,
              });
            }} disabled={createMut.isPending}>Creer</MiniBtn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
