"use client";

/**
 * /console/governance/intents — admin IntentEmission explorer.
 *
 * APOGEE: Mission Control deck / Sustainment + Telemetry sub-systems.
 * Surface the audit trail (every governed mutation) + compensating
 * intent UI (Tier 3.8 of the residual debt).
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowDown,
  RefreshCw,
  Undo2,
  Lock,
} from "lucide-react";

const STATUS_CHIP: Record<string, { color: string; icon: React.ReactNode }> = {
  OK: { color: "text-emerald-400 bg-emerald-950/30 border-emerald-900/60", icon: <CheckCircle2 className="h-3 w-3" /> },
  PENDING: { color: "text-amber-400 bg-amber-950/30 border-amber-900/60", icon: <Clock className="h-3 w-3" /> },
  EXECUTING: { color: "text-blue-400 bg-blue-950/30 border-blue-900/60", icon: <Activity className="h-3 w-3 animate-pulse" /> },
  VETOED: { color: "text-zinc-400 bg-zinc-900 border-zinc-800", icon: <XCircle className="h-3 w-3" /> },
  DOWNGRADED: { color: "text-amber-300 bg-amber-950/30 border-amber-900/60", icon: <ArrowDown className="h-3 w-3" /> },
  FAILED: { color: "text-red-400 bg-red-950/30 border-red-900/60", icon: <AlertCircle className="h-3 w-3" /> },
};

const STATUSES = ["", "OK", "PENDING", "EXECUTING", "VETOED", "DOWNGRADED", "FAILED"] as const;

export default function IntentsPage() {
  const [filter, setFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [kindFilter, setKindFilter] = useState<string>("");
  const [sinceDays, setSinceDays] = useState<number>(7);

  const list = trpc.governance.listIntents.useQuery(
    {
      sinceDays,
      ...(statusFilter ? { status: statusFilter as "OK" | "PENDING" | "EXECUTING" | "VETOED" | "DOWNGRADED" | "FAILED" } : {}),
      ...(kindFilter ? { kind: kindFilter } : {}),
    },
    { staleTime: 5_000 },
  );
  const stats = trpc.governance.statsByKind.useQuery({ sinceDays });
  const compensate = trpc.governance.compensate.useMutation({
    onSuccess: () => {
      void list.refetch();
      void stats.refetch();
    },
  });

  const visibleItems = useMemo(() => {
    if (!list.data) return [];
    return list.data.items.filter(
      (r) =>
        !filter ||
        r.intentKind.toLowerCase().includes(filter.toLowerCase()) ||
        (r.strategyId ?? "").toLowerCase().includes(filter.toLowerCase()) ||
        r.id.toLowerCase().includes(filter.toLowerCase()),
    );
  }, [list.data, filter]);

  const handleCompensate = async (intentId: string, kind: string) => {
    const reason = window.prompt(
      `Compensate ${kind}?\nMotif (visible dans l'audit trail) :`,
    );
    if (!reason || reason.trim().length < 3) return;
    compensate.mutate({ originalIntentId: intentId, reason: reason.trim() });
  };

  if (list.isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-8 p-6">
      <PageHeader
        title="Intents"
        description="Audit trail IntentEmission — explore, compensate, diagnose."
      />

      {/* Stats by kind */}
      {stats.data && stats.data.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Top intent kinds — {sinceDays}j
          </h2>
          <div className="flex flex-wrap gap-2">
            {stats.data.slice(0, 12).map((s) => (
              <button
                key={s.kind}
                type="button"
                onClick={() => setKindFilter(kindFilter === s.kind ? "" : s.kind)}
                className={
                  "inline-flex items-center gap-2 rounded border px-2.5 py-1 text-[10px] font-mono transition " +
                  (kindFilter === s.kind
                    ? "border-emerald-700 bg-emerald-950/40 text-emerald-300"
                    : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700")
                }
              >
                <span>{s.kind}</span>
                <span className="text-zinc-500">{s.count}</span>
                {s.reversible && <Undo2 className="h-3 w-3 text-blue-400" />}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Filters */}
      <section className="flex flex-wrap items-center gap-3">
        <input
          placeholder="Filtre kind / strategyId / intentId..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 min-w-[260px] rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-zinc-700 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || "Tous statuts"}</option>
          ))}
        </select>
        <select
          value={sinceDays}
          onChange={(e) => setSinceDays(Number(e.target.value))}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200"
        >
          <option value={1}>24h</option>
          <option value={7}>7j</option>
          <option value={30}>30j</option>
          <option value={90}>90j</option>
        </select>
        <button
          type="button"
          onClick={() => list.refetch()}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:border-zinc-700"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </section>

      {/* Intent table */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-300">
          IntentEmission rolling {sinceDays}j {visibleItems.length > 0 && `· ${visibleItems.length} entrées`}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="min-w-full text-xs">
            <thead className="bg-zinc-900">
              <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2">Strategy</th>
                <th className="px-3 py-2">Caller</th>
                <th className="px-3 py-2">Hash</th>
                <th className="px-3 py-2">Émis</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((r) => (
                <tr key={r.id} className="border-t border-zinc-900">
                  <td className="px-3 py-2">
                    <span className={"inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium " + (STATUS_CHIP[r.status]?.color ?? "border-zinc-800 text-zinc-400")}>
                      {STATUS_CHIP[r.status]?.icon}
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-zinc-300">{r.intentKind}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">{r.strategyId.slice(0, 12)}{r.strategyId.length > 12 ? "…" : ""}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">{r.caller}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-zinc-600">{r.selfHash ? r.selfHash.slice(0, 8) : "—"}</td>
                  <td className="px-3 py-2 text-[10px] text-zinc-500">{new Date(r.emittedAt).toLocaleString("fr-FR")}</td>
                  <td className="px-3 py-2 text-right">
                    {r.status === "OK" && r.reversible ? (
                      <button
                        type="button"
                        onClick={() => handleCompensate(r.id, r.intentKind)}
                        disabled={compensate.isPending}
                        className="inline-flex items-center gap-1 rounded border border-blue-900/60 bg-blue-950/30 px-2 py-0.5 text-[10px] font-medium text-blue-300 hover:border-blue-700 disabled:opacity-50"
                      >
                        <Undo2 className="h-3 w-3" /> Compensate
                      </button>
                    ) : r.irreversible ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-zinc-600" title="Irreversible kind">
                        <Lock className="h-3 w-3" /> final
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-700">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visibleItems.length === 0 && (
          <p className="mt-4 text-center text-sm text-zinc-500">Aucun intent dans la fenêtre.</p>
        )}
      </section>

      <p className="text-[10px] text-zinc-600">
        Compensate : émet un intent inverse (ROLLBACK_*, DEMOTE_*, DISCARD_*) qui sera traité par le service responsable.
        Les kinds &laquo; irreversible &raquo; (PDF envoyé, retainer activé, GLORY tool exécuté) ne peuvent pas être compensés —
        seule une correction explicite (CORRECT_INTENT) référençant l&apos;original est admise.
      </p>
    </div>
  );
}
