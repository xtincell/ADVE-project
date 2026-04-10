"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Lock, CheckCircle, XCircle, Clock, Trash2, RotateCcw, Building2 } from "lucide-react";

const STATUS_CONFIG = {
  PENDING: { label: "En attente", icon: Clock, color: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/5" },
  ACCEPTED: { label: "Acceptes", icon: CheckCircle, color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/5" },
  REJECTED: { label: "Rejetes", icon: XCircle, color: "text-red-400", border: "border-red-500/20", bg: "bg-red-500/5" },
} as const;

export default function VaultPage() {
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);

  const { data: strategies, isLoading: ls } = trpc.strategy.list.useQuery({});
  const activeStrategies = (strategies ?? []).filter((s) => s.status === "ACTIVE");

  // Load executions for selected strategy
  const { data: executions, isLoading: le, refetch } = trpc.sequenceVault.list.useQuery(
    { strategyId: selectedStrategy ?? "", currentOnly: true },
    { enabled: !!selectedStrategy },
  );

  const acceptMutation = trpc.sequenceVault.accept.useMutation({
    onSuccess: () => refetch(),
  });
  const rejectMutation = trpc.sequenceVault.reject.useMutation({
    onSuccess: () => refetch(),
  });
  const deleteMutation = trpc.sequenceVault.delete.useMutation({
    onSuccess: () => refetch(),
  });

  if (ls) return <SkeletonPage />;

  const pendingExecs = (executions ?? []).filter((e) => e.approval === "PENDING");
  const acceptedExecs = (executions ?? []).filter((e) => e.approval === "ACCEPTED");
  const rejectedExecs = (executions ?? []).filter((e) => e.approval === "REJECTED");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sequence Vault"
        description="Review les outputs de sequences — accepte pour promouvoir en BrandAsset, rejette pour re-run"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Artemis", href: "/console/artemis" },
          { label: "Vault" },
        ]}
      />

      {/* Strategy selector */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <Building2 className="h-4 w-4 text-foreground-muted" />
        <select
          value={selectedStrategy ?? ""}
          onChange={(e) => setSelectedStrategy(e.target.value || null)}
          className="flex-1 rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="">Selectionnez une marque</option>
          {activeStrategies.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {!selectedStrategy ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Lock className="mx-auto mb-3 h-8 w-8 text-foreground-muted" />
          <p className="text-sm text-foreground-muted">Selectionnez une marque pour voir les executions de sequences.</p>
        </div>
      ) : le ? (
        <SkeletonPage />
      ) : (
        /* Kanban columns */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {(["PENDING", "ACCEPTED", "REJECTED"] as const).map((status) => {
            const config = STATUS_CONFIG[status];
            const Icon = config.icon;
            const items = status === "PENDING" ? pendingExecs : status === "ACCEPTED" ? acceptedExecs : rejectedExecs;

            return (
              <div key={status} className={`rounded-xl border ${config.border} ${config.bg}`}>
                <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <h3 className="text-sm font-semibold text-foreground">{config.label}</h3>
                  <span className="ml-auto rounded-full bg-background-overlay px-2 py-0.5 text-[10px] font-bold text-foreground-muted">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-2 p-3">
                  {items.length === 0 ? (
                    <p className="py-4 text-center text-xs text-foreground-muted">
                      {status === "PENDING" ? "Aucune execution en attente" : status === "ACCEPTED" ? "Aucun output accepte" : "Aucun rejet"}
                    </p>
                  ) : (
                    items.map((exec) => (
                      <div key={exec.id} className="rounded-lg border border-border-subtle bg-card p-3">
                        {/* Header */}
                        <div className="mb-2 flex items-center justify-between">
                          <div>
                            <span className="font-mono text-xs font-bold text-foreground-muted">{exec.sequenceKey}</span>
                            <span className="ml-2 text-[10px] text-foreground-muted">v{exec.version} — T{exec.tier}</span>
                          </div>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            exec.status === "COMPLETED" ? "bg-emerald-500/15 text-emerald-300"
                            : exec.status === "PARTIAL" ? "bg-amber-500/15 text-amber-300"
                            : "bg-red-500/15 text-red-300"
                          }`}>
                            {exec.status}
                          </span>
                        </div>

                        {/* Outputs count */}
                        <p className="mb-2 text-[10px] text-foreground-muted">
                          {exec.gloryOutputs.length} output(s) — {exec.totalDurationMs ? `${(exec.totalDurationMs / 1000).toFixed(1)}s` : "?"}
                          {exec.qualityScore !== null && exec.qualityScore !== undefined && (
                            <> — qualite: {Math.round(exec.qualityScore * 100)}%</>
                          )}
                        </p>

                        {/* Promoted assets */}
                        {exec.promotedAssets.length > 0 && (
                          <div className="mb-2">
                            <p className="text-[10px] font-semibold text-emerald-400">{exec.promotedAssets.length} asset(s) promu(s)</p>
                          </div>
                        )}

                        {/* Review notes */}
                        {exec.reviewNotes && (
                          <p className="mb-2 text-[10px] italic text-foreground-muted">&quot;{exec.reviewNotes}&quot;</p>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          {status === "PENDING" && (
                            <>
                              <button
                                onClick={() => acceptMutation.mutate({ executionId: exec.id })}
                                disabled={acceptMutation.isPending}
                                className="rounded-md bg-emerald-500/20 px-2 py-1 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                              >
                                <CheckCircle className="mr-1 inline h-3 w-3" /> Accepter
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt("Raison du rejet:");
                                  if (reason) rejectMutation.mutate({ executionId: exec.id, reason });
                                }}
                                disabled={rejectMutation.isPending}
                                className="rounded-md bg-red-500/20 px-2 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-500/30 disabled:opacity-50"
                              >
                                <XCircle className="mr-1 inline h-3 w-3" /> Rejeter
                              </button>
                            </>
                          )}
                          {status === "REJECTED" && (
                            <>
                              <a
                                href="/console/artemis/skill-tree"
                                className="rounded-md bg-blue-500/20 px-2 py-1 text-[10px] font-semibold text-blue-300 hover:bg-blue-500/30"
                              >
                                <RotateCcw className="mr-1 inline h-3 w-3" /> Re-run
                              </a>
                              <button
                                onClick={() => deleteMutation.mutate({ executionId: exec.id })}
                                disabled={deleteMutation.isPending}
                                className="rounded-md bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                              >
                                <Trash2 className="mr-1 inline h-3 w-3" /> Supprimer
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* How it works */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Cycle de vie</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {[
            { step: "1", title: "Lancer", desc: "Skill Tree → selectionnez marque → lancez sequence", color: "bg-blue-500/15 text-blue-300" },
            { step: "2", title: "Review", desc: "Les outputs arrivent ici dans PENDING", color: "bg-amber-500/15 text-amber-300" },
            { step: "3", title: "Accepter", desc: "Outputs promus en BrandAsset officiel", color: "bg-emerald-500/15 text-emerald-300" },
            { step: "4", title: "Debloquer", desc: "Les sequences dependantes se debloquent dans le Skill Tree", color: "bg-violet-500/15 text-violet-300" },
          ].map((s) => (
            <div key={s.step} className="flex gap-3">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${s.color}`}>{s.step}</div>
              <div>
                <p className="text-xs font-semibold text-foreground">{s.title}</p>
                <p className="text-[10px] text-foreground-muted">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
