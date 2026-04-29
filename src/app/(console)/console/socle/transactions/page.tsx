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
  PAID: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  PENDING: <Clock className="h-3.5 w-3.5 text-amber-500" />,
  FAILED: <XCircle className="h-3.5 w-3.5 text-red-500" />,
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
        <span className="text-xs text-zinc-500">Fenêtre :</span>
        {[7, 30, 90, 365].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setSinceDays(d)}
            className={
              "rounded-md border px-3 py-1 text-xs font-medium " +
              (sinceDays === d
                ? "border-amber-700/60 bg-amber-700/30 text-amber-100"
                : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700")
            }
          >
            {d}j
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KpiCard label="Payés" value={totalPaid} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} accent="emerald" />
        <KpiCard label="En attente" value={totalPending} icon={<Clock className="h-4 w-4 text-amber-500" />} accent="amber" />
        <KpiCard label="Échecs" value={totalFailed} icon={<AlertCircle className="h-4 w-4 text-red-500" />} accent="red" />
      </section>

      {/* By provider */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5">
        <header className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">Par provider</h2>
        </header>
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-[10px] uppercase tracking-wider text-zinc-500">
              <th className="px-3 py-2">Provider</th>
              <th className="px-3 py-2 text-right">Transactions</th>
              <th className="px-3 py-2 text-right">Volume (somme)</th>
            </tr>
          </thead>
          <tbody>
            {data.byProvider.map((p) => (
              <tr key={p.provider} className="border-b border-zinc-900 last:border-0">
                <td className="px-3 py-2 font-mono text-zinc-200">{p.provider}</td>
                <td className="px-3 py-2 text-right text-zinc-300">{p._count._all}</td>
                <td className="px-3 py-2 text-right font-mono text-zinc-300">{p._sum.amount?.toLocaleString("fr-FR") ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* By currency */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5">
        <header className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">Volume payé par devise</h2>
        </header>
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-[10px] uppercase tracking-wider text-zinc-500">
              <th className="px-3 py-2">Devise</th>
              <th className="px-3 py-2 text-right">Transactions payées</th>
              <th className="px-3 py-2 text-right">Volume</th>
            </tr>
          </thead>
          <tbody>
            {data.byCurrency.map((c) => (
              <tr key={c.currency} className="border-b border-zinc-900 last:border-0">
                <td className="px-3 py-2 font-mono text-zinc-200">{c.currency}</td>
                <td className="px-3 py-2 text-right text-zinc-300">{c._count._all}</td>
                <td className="px-3 py-2 text-right font-mono text-amber-400">{c._sum.amount?.toLocaleString("fr-FR") ?? "—"} {c.currency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Recent */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">50 dernières transactions</h2>
          <span className="text-[10px] text-zinc-500">{data.recent.length} entrées</span>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-[10px] uppercase tracking-wider text-zinc-500">
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
                <tr key={t.reference} className="border-b border-zinc-900 last:border-0">
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      {STATUS_ICON[t.status] ?? null}
                      <span className="text-zinc-400">{t.status}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">{t.reference.slice(0, 24)}…</td>
                  <td className="px-3 py-2 font-mono text-zinc-300">{t.provider}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-200">{t.amount.toLocaleString("fr-FR")}</td>
                  <td className="px-3 py-2 text-zinc-400">{t.currency}</td>
                  <td className="px-3 py-2 text-zinc-500">{new Date(t.createdAt).toLocaleString("fr-FR")}</td>
                  <td className="px-3 py-2 text-[10px] text-red-400">{t.failureReason?.slice(0, 40) ?? ""}</td>
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
    emerald: "border-emerald-900/60 bg-emerald-950/20",
    amber: "border-amber-900/60 bg-amber-950/20",
    red: "border-red-900/60 bg-red-950/20",
  };
  return (
    <div className={"rounded-xl border p-4 " + colorMap[accent]}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-zinc-400">{label}</span>
        {icon}
      </div>
      <div className="mt-2 font-mono text-3xl font-semibold text-zinc-100">{value}</div>
    </div>
  );
}
