"use client";

/**
 * /console/governance/intents — admin IntentEmission explorer.
 *
 * APOGEE: Mission Control deck / Sustainment + Telemetry sub-systems.
 * The audit-trail UI surface — search, replay, diff payload v1/v2.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Activity, AlertCircle, CheckCircle2, Clock, XCircle, ArrowDown, RefreshCw } from "lucide-react";

const STATUS_CHIP: Record<string, { color: string; icon: React.ReactNode }> = {
  OK: { color: "text-emerald-400 bg-emerald-950/30 border-emerald-900/60", icon: <CheckCircle2 className="h-3 w-3" /> },
  PENDING: { color: "text-amber-400 bg-amber-950/30 border-amber-900/60", icon: <Clock className="h-3 w-3" /> },
  EXECUTING: { color: "text-blue-400 bg-blue-950/30 border-blue-900/60", icon: <Activity className="h-3 w-3 animate-pulse" /> },
  VETOED: { color: "text-zinc-400 bg-zinc-900 border-zinc-800", icon: <XCircle className="h-3 w-3" /> },
  DOWNGRADED: { color: "text-amber-300 bg-amber-950/30 border-amber-900/60", icon: <ArrowDown className="h-3 w-3" /> },
  FAILED: { color: "text-red-400 bg-red-950/30 border-red-900/60", icon: <AlertCircle className="h-3 w-3" /> },
};

export default function IntentsPage() {
  const [filter, setFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Reuse adminTransactionsSummary recent rows + add a dedicated query later.
  const { data: summary, isLoading, refetch } = trpc.monetization.adminTransactionsSummary.useQuery({ sinceDays: 7 });

  if (isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-8 p-6">
      <PageHeader title="Intents" description="Audit trail IntentEmission — explore, replay, diagnose." />

      <section className="flex items-center gap-3">
        <input
          placeholder="Filter par kind ou strategyId..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-zinc-700 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200"
        >
          <option value="">Tous statuts</option>
          <option value="OK">OK</option>
          <option value="PENDING">PENDING</option>
          <option value="VETOED">VETOED</option>
          <option value="DOWNGRADED">DOWNGRADED</option>
          <option value="FAILED">FAILED</option>
        </select>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:border-zinc-700"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-300">
          IntentEmission rolling 7 jours
        </h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="min-w-full text-xs">
            <thead className="bg-zinc-900">
              <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Référence</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2 text-right">Montant</th>
                <th className="px-3 py-2">Émis</th>
              </tr>
            </thead>
            <tbody>
              {summary?.recent
                .filter((r) => !filter || r.reference.includes(filter) || r.provider.toLowerCase().includes(filter.toLowerCase()))
                .filter((r) => !statusFilter || r.status === statusFilter)
                .map((r) => (
                  <tr key={r.reference} className="border-t border-zinc-900">
                    <td className="px-3 py-2">
                      <span className={"inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium " + (STATUS_CHIP[r.status]?.color ?? "border-zinc-800 text-zinc-400")}>
                        {STATUS_CHIP[r.status]?.icon}
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">{r.reference.slice(0, 28)}…</td>
                    <td className="px-3 py-2 font-mono text-zinc-300">{r.provider}</td>
                    <td className="px-3 py-2 text-right font-mono text-zinc-200">
                      {r.amount.toLocaleString("fr-FR")} {r.currency}
                    </td>
                    <td className="px-3 py-2 text-[10px] text-zinc-500">{new Date(r.createdAt).toLocaleString("fr-FR")}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {summary && summary.recent.length === 0 && (
          <p className="mt-4 text-center text-sm text-zinc-500">Aucune transaction récente.</p>
        )}
      </section>

      <p className="text-[10px] text-zinc-600">
        Vue complète d&apos;IntentEmission (toutes mutations, pas seulement payments) à venir en P5
        avec wiring NSP. Pour l&apos;instant : surface de paiement.
      </p>
    </div>
  );
}
