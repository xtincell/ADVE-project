"use client";

/**
 * /console/socle/transactions — Operations admin: rolling transactions explorer.
 *
 * APOGEE: Mission Control deck / Operations sub-system / Ground Tier.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { TrendingUp, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";

const STATUS_ICON: Record<string, React.ReactNode> = {
  PAID: <CheckCircle2 className="h-3.5 w-3.5 text-success" />,
  PENDING: <Clock className="h-3.5 w-3.5 text-warning" />,
  FAILED: <XCircle className="h-3.5 w-3.5 text-error" />,
};

export default function TransactionsAdminPage() {
  const [sinceDays, setSinceDays] = useState(30);
  const { data, isLoading } = trpc.monetization.adminTransactionsSummary.useQuery({ sinceDays });
  if (isLoading) return <SkeletonPage />;
  if (!data) return null;

  const totalPaid = data.byStatus.find((s) => s.status === "PAID")?._count._all ?? 0;
  const totalPending = data.byStatus.find((s) => s.status === "PENDING")?._count._all ?? 0;
  const totalFailed = data.byStatus.find((s) => s.status === "FAILED")?._count._all ?? 0;

  return (
    <div className="space-y-8 p-6">
      <PageHeader
        title="Transactions"
        description={`Historique paiement intake — fenêtre rolling ${sinceDays} jours.`}
      />

      <div className="flex items-center gap-3">
        <span className="text-xs text-foreground-muted">Fenêtre :</span>
        {[7, 30, 90, 365].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setSinceDays(d)}
            className={
              "rounded-md border px-3 py-1 text-xs font-medium " +
              (sinceDays === d
                ? "border-warning/60 bg-warning/30 text-warning"
                : "border-border bg-background text-foreground-secondary hover:border-border")
            }
          >
            {d}j
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KpiCard label="Payés" value={totalPaid} icon={<CheckCircle2 className="h-4 w-4 text-success" />} accent="emerald" />
        <KpiCard label="En attente" value={totalPending} icon={<Clock className="h-4 w-4 text-warning" />} accent="amber" />
        <KpiCard label="Échecs" value={totalFailed} icon={<AlertCircle className="h-4 w-4 text-error" />} accent="red" />
      </section>

      {/* By provider */}
      <section className="rounded-xl border border-border bg-background/60 p-5">
        <header className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-foreground-secondary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Par provider</h2>
        </header>
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-foreground-muted">
              <th className="px-3 py-2">Provider</th>
              <th className="px-3 py-2 text-right">Transactions</th>
              <th className="px-3 py-2 text-right">Volume (somme)</th>
            </tr>
          </thead>
          <tbody>
            {data.byProvider.map((p) => (
              <tr key={p.provider} className="border-b border-border last:border-0">
                <td className="px-3 py-2 font-mono text-foreground">{p.provider}</td>
                <td className="px-3 py-2 text-right text-foreground-secondary">{p._count._all}</td>
                <td className="px-3 py-2 text-right font-mono text-foreground-secondary">{p._sum.amount?.toLocaleString("fr-FR") ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* By currency */}
      <section className="rounded-xl border border-border bg-background/60 p-5">
        <header className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Volume payé par devise</h2>
        </header>
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-foreground-muted">
              <th className="px-3 py-2">Devise</th>
              <th className="px-3 py-2 text-right">Transactions payées</th>
              <th className="px-3 py-2 text-right">Volume</th>
            </tr>
          </thead>
          <tbody>
            {data.byCurrency.map((c) => (
              <tr key={c.currency} className="border-b border-border last:border-0">
                <td className="px-3 py-2 font-mono text-foreground">{c.currency}</td>
                <td className="px-3 py-2 text-right text-foreground-secondary">{c._count._all}</td>
                <td className="px-3 py-2 text-right font-mono text-warning">{c._sum.amount?.toLocaleString("fr-FR") ?? "—"} {c.currency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Recent */}
      <section className="rounded-xl border border-border bg-background/60 p-5">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-secondary">50 dernières transactions</h2>
          <span className="text-[10px] text-foreground-muted">{data.recent.length} entrées</span>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-foreground-muted">
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Référence</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2 text-right">Montant</th>
                <th className="px-3 py-2">Devise</th>
                <th className="px-3 py-2">Créé</th>
                <th className="px-3 py-2">Échec ?</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((t) => (
                <tr key={t.reference} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      {STATUS_ICON[t.status] ?? null}
                      <span className="text-foreground-secondary">{t.status}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] text-foreground-muted">{t.reference.slice(0, 24)}…</td>
                  <td className="px-3 py-2 font-mono text-foreground-secondary">{t.provider}</td>
                  <td className="px-3 py-2 text-right font-mono text-foreground">{t.amount.toLocaleString("fr-FR")}</td>
                  <td className="px-3 py-2 text-foreground-secondary">{t.currency}</td>
                  <td className="px-3 py-2 text-foreground-muted">{new Date(t.createdAt).toLocaleString("fr-FR")}</td>
                  <td className="px-3 py-2 text-[10px] text-error">{t.failureReason?.slice(0, 40) ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent: "emerald" | "amber" | "red" }) {
  const colorMap = {
    emerald: "border-success/60 bg-success/20",
    amber: "border-warning/60 bg-warning/20",
    red: "border-error/60 bg-error/20",
  };
  return (
    <div className={"rounded-xl border p-4 " + colorMap[accent]}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-foreground-secondary">{label}</span>
        {icon}
      </div>
      <div className="mt-2 font-mono text-3xl font-semibold text-foreground">{value}</div>
    </div>
  );
}
