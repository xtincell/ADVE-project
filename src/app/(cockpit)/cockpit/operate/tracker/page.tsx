"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import {
  LineChart,
  Target,
  Users,
  MapPin,
  Calendar,
  Zap,
  PlusCircle,
  BarChart3,
  TrendingUp,
  Award,
  AlertTriangle,
  Upload,
  CheckCircle,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function CampaignTrackerPage() {
  const strategyId = useCurrentStrategyId();
  const [selectedFieldOpId, setSelectedFieldOpId] = useState<string | null>(null);
  const [reportForm, setReportForm] = useState({
    reporterName: "",
    notes: "",
    acquisition: 0,
    activation: 0,
    retention: 0,
    revenue: 0,
    referral: 0,
  });

  // Queries
  const summaryQuery = trpc.campaignTracker.getOperationalSummary.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: Boolean(strategyId) }
  );

  const fieldOpsQuery = trpc.operationsOverview.fieldOpProgress.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: Boolean(strategyId) }
  );

  const campaignsQuery = trpc.campaignManager.getByStrategy.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: Boolean(strategyId) }
  );

  // Mutations
  const reportMutation = trpc.campaignTracker.reportFieldProgress.useMutation({
    onSuccess: () => {
      summaryQuery.refetch();
      fieldOpsQuery.refetch();
      setSelectedFieldOpId(null);
      setReportForm({
        reporterName: "",
        notes: "",
        acquisition: 0,
        activation: 0,
        retention: 0,
        revenue: 0,
        referral: 0,
      });
    }
  });

  if (!strategyId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          icon={LineChart}
          title="Sélectionnez une marque"
          description="Cette surface nécessite de sélectionner une stratégie active dans le menu supérieur."
        />
      </div>
    );
  }

  if (summaryQuery.isLoading || fieldOpsQuery.isLoading || campaignsQuery.isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-background/40 rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-background/40 rounded-xl border border-border" />
          ))}
        </div>
        <div className="h-80 bg-background/40 rounded-xl border border-border" />
      </div>
    );
  }

  const summary = summaryQuery.data ?? {
    campaigns: { total: 0, live: 0 },
    missions: { total: 0, active: 0 },
    fieldOps: { total: 0, completed: 0 },
    aarrrTotals: { acquisition: 0, activation: 0, retention: 0, revenue: 0, referral: 0 },
    devisTotalAmount: 0,
  };

  const fieldOps = fieldOpsQuery.data ?? [];
  const campaigns = campaignsQuery.data ?? [];

  const selectedOp = fieldOps.find(o => o.id === selectedFieldOpId);

  async function handleReportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFieldOpId) return;

    await reportMutation.mutateAsync({
      fieldOpId: selectedFieldOpId,
      reporterName: reportForm.reporterName,
      data: { notes: reportForm.notes },
      metrics: {
        acquisitionCount: reportForm.acquisition,
        activationCount: reportForm.activation,
        retentionCount: reportForm.retention,
        revenueCount: reportForm.revenue,
        referralCount: reportForm.referral,
      }
    });
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Campaign Tracker"
        description="Pilotez l'exécution opérationnelle en temps réel : avancement des jalons, rapports terrain et indicateurs AARRR."
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Opérations" },
          { label: "Campaign Tracker" },
        ]}
      />

      {/* KPI stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Campagnes Actives (LIVE)"
          value={summary.campaigns.live}
          icon={Target}
          trend={summary.campaigns.live > 0 ? "up" : "flat"}
          trendValue={`${summary.campaigns.live} en cours`}
        />
        <StatCard
          title="Opérations Terrain"
          value={summary.fieldOps.total}
          icon={MapPin}
          trend="flat"
          trendValue={`${summary.fieldOps.completed} terminées`}
        />
        <StatCard
          title="Missions Guilde Actives"
          value={summary.missions.active}
          icon={Users}
          trend={summary.missions.active > 0 ? "up" : "flat"}
          trendValue={`${summary.missions.active} en cours`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* AARRR Aggregated Funnel */}
        <div className="rounded-xl border border-border bg-background/80 p-5 lg:col-span-1 space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <BarChart3 className="h-5 w-5 text-accent" />
            <h3 className="font-bold text-white">Entonnoir AARRR terrain</h3>
          </div>

          <div className="space-y-4">
            {[
              { label: "Acquisition", count: summary.aarrrTotals.acquisition, color: "bg-info" },
              { label: "Activation", count: summary.aarrrTotals.activation, color: "bg-accent" },
              { label: "Rétention", count: summary.aarrrTotals.retention, color: "bg-warning" },
              { label: "Revenu", count: summary.aarrrTotals.revenue, color: "bg-error" },
              { label: "Recommandation", count: summary.aarrrTotals.referral, color: "bg-success" }
            ].map((stage, idx, arr) => {
              const maxCount = Math.max(...arr.map(s => s.count)) || 1;
              const widthPct = (stage.count / maxCount) * 100;

              return (
                <div key={stage.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-white">{stage.label}</span>
                    <span className="text-foreground-secondary">{stage.count.toLocaleString()}</span>
                  </div>
                  <div className="h-3 w-full bg-background border border-border rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", stage.color)}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Field operations tracking */}
        <div className="rounded-xl border border-border bg-background/80 p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent" />
              <h3 className="font-bold text-white">Opérations terrain & Check-ins</h3>
            </div>
          </div>

          {fieldOps.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="Aucune opération terrain"
              description="Créez des actions terrain (animations, sampling) pour consigner les rapports du superviseur."
            />
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {fieldOps.map((op) => {
                const statusColors: Record<string, string> = {
                  PLANNED: "bg-zinc-500/20 text-foreground-secondary border-zinc-500/30",
                  IN_PROGRESS: "bg-accent/20 text-accent border-accent/30",
                  COMPLETED: "bg-success/15 text-success border-success/30",
                };

                return (
                  <div key={op.id} className="rounded-lg border border-border bg-background p-4 hover:border-foreground-muted transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-3xs font-semibold px-2 py-0.5 rounded border uppercase", statusColors[op.status] ?? "bg-border/20 text-foreground-muted border-border/30")}>
                          {op.status}
                        </span>
                        <span className="text-2xs text-foreground-secondary flex items-center gap-1">
                          <Target className="h-3.5 w-3.5" />
                          {op.campaign.name}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white">{op.name}</h4>
                      
                      <div className="flex items-center gap-4 text-2xs text-foreground-muted flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {op.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(op.date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {op.reportsCount} rapports soumis
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedFieldOpId(op.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/40 hover:bg-background px-3 py-1.5 text-xs text-foreground-secondary hover:text-white transition-colors shrink-0"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Check-in / Rapport
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Check-in Report Modal */}
      <Modal
        open={!!selectedOp}
        onClose={() => setSelectedFieldOpId(null)}
        title={selectedOp ? `Rapport terrain : ${selectedOp.name}` : ""}
        size="lg"
      >
        {selectedOp && (
          <form onSubmit={handleReportSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Nom du superviseur" required>
                <input
                  type="text"
                  required
                  value={reportForm.reporterName}
                  onChange={(e) => setReportForm({ ...reportForm, reporterName: e.target.value })}
                  placeholder="Ex: William Mandengue"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-foreground-muted outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
                />
              </FormField>

              <FormField label="Notes / Observations terrain">
                <input
                  type="text"
                  value={reportForm.notes}
                  onChange={(e) => setReportForm({ ...reportForm, notes: e.target.value })}
                  placeholder="Observations clés de l'opération..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-foreground-muted outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
                />
              </FormField>
            </div>

            <div className="border-t border-border pt-4">
              <h4 className="text-2xs font-semibold text-foreground-secondary uppercase tracking-wider mb-3">
                Mesures AARRR de la journée
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { field: "acquisition", label: "Acquisition (leads/tests)" },
                  { field: "activation", label: "Activation (essais)" },
                  { field: "retention", label: "Rétention (re-achats)" },
                  { field: "revenue", label: "Revenu (ventes)" },
                  { field: "referral", label: "Recommandation (parrainages)" }
                ].map((item) => (
                  <div key={item.field} className="space-y-1">
                    <label className="text-3xs text-foreground-secondary font-medium block truncate" title={item.label}>
                      {item.label}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={reportForm[item.field as keyof typeof reportForm]}
                      onChange={(e) => setReportForm({ ...reportForm, [item.field]: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-white outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
                    />
                  </div>
                ))}
              </div>
            </div>

            {reportMutation.error && (
              <div className="rounded-lg border border-error/50 bg-error/20 p-3 text-sm text-error flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {reportMutation.error.message}
              </div>
            )}

            {reportMutation.isSuccess && (
              <div className="rounded-lg border border-success/50 bg-success/20 p-3 text-sm text-success flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Rapport envoyé avec succès.
              </div>
            )}

            <button
              type="submit"
              disabled={reportMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-background hover:bg-accent/90 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {reportMutation.isPending ? "Envoi..." : "Soumettre le rapport terrain"}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
