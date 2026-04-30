"use client";

/**
 * Console /console/governance/error-vault — Phase 11.
 *
 * Vue admin des erreurs runtime collectées (server, client, Prisma, NSP, Ptah,
 * stress-test, cron, webhook). Groupées par signature, triées par fréquence.
 * Actions : mark resolved, mark known false positive, batch clear par source.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import {
  AlertTriangle,
  CheckCircle2,
  Bug,
  Activity,
  Server,
  Layers,
  Database,
  Hammer,
  X,
} from "lucide-react";

const SOURCE_ICONS: Record<string, typeof Server> = {
  SERVER: Server,
  CLIENT: Activity,
  PRISMA: Database,
  NSP: Layers,
  PTAH: Hammer,
  STRESS_TEST: Bug,
  CRON: Activity,
  WEBHOOK: Activity,
  UNKNOWN: AlertTriangle,
};

const SEVERITY_COLORS: Record<string, string> = {
  TRACE: "text-foreground-secondary bg-zinc-500/10",
  DEBUG: "text-foreground-secondary bg-zinc-500/10",
  INFO: "text-blue-300 bg-blue-500/10",
  WARN: "text-amber-300 bg-amber-500/10",
  ERROR: "text-error bg-error/10",
  CRITICAL: "text-error bg-error/20 ring-1 ring-red-500/40",
};

export default function ErrorVaultPage() {
  const [showResolved, setShowResolved] = useState(false);
  const [expandedSig, setExpandedSig] = useState<string | null>(null);

  const { data: stats } = trpc.errorVault.stats.useQuery({ sinceHours: 24 });
  const { data: clusters, refetch } = trpc.errorVault.groupBySignature.useQuery({
    resolved: showResolved,
    limit: 100,
  });

  const resolveMut = trpc.errorVault.markResolved.useMutation({ onSuccess: () => refetch() });
  const batchMut = trpc.errorVault.batchMarkResolved.useMutation({ onSuccess: () => refetch() });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Error Vault — observabilité runtime"
        description="Erreurs collectées (24h dernières) — clusters par signature. Phase 11 (ADR-0013)."
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Governance", href: "/console/governance" },
          { label: "Error Vault" },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total 24h" value={stats?.total ?? 0} color="text-foreground" />
        <StatTile
          label="Non résolus"
          value={stats?.unresolved ?? 0}
          color={stats && stats.unresolved > 0 ? "text-error" : "text-emerald-300"}
        />
        <StatTile label="Clusters actifs" value={clusters?.length ?? 0} color="text-amber-300" />
        <StatTile
          label="Critical"
          value={
            stats?.bySeverity.find((s) => s.severity === "CRITICAL")?._count._all ?? 0
          }
          color="text-error"
        />
      </div>

      {/* Source breakdown */}
      {stats?.bySource && stats.bySource.length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-secondary">
            Par source
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.bySource.map((s) => {
              const Icon = SOURCE_ICONS[s.source] ?? AlertTriangle;
              return (
                <button
                  key={s.source}
                  onClick={() =>
                    confirm(`Marquer toutes les erreurs ${s.source} comme résolues ?`) &&
                    batchMut.mutate({ source: s.source as never, reason: "Batch cleanup" })
                  }
                  className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
                >
                  <Icon className="h-3 w-3" />
                  <span className="font-medium">{s.source}</span>
                  <span className="text-foreground-tertiary">{s._count._all}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Toggle resolved/unresolved */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowResolved(false)}
          className={`rounded-full px-3 py-1 text-xs ${!showResolved ? "bg-error/15 text-error" : "bg-white/5 text-foreground-secondary"}`}
        >
          Non résolus
        </button>
        <button
          onClick={() => setShowResolved(true)}
          className={`rounded-full px-3 py-1 text-xs ${showResolved ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-foreground-secondary"}`}
        >
          Résolus
        </button>
      </div>

      {/* Clusters */}
      {!clusters || clusters.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-400" />
          <p className="text-sm text-foreground-secondary">
            {showResolved ? "Aucun cluster résolu." : "Aucune erreur active. Le vault est propre."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {clusters.map((c) => {
            const Icon = SOURCE_ICONS[c.sample.source] ?? AlertTriangle;
            const expanded = expandedSig === c.signature;
            return (
              <div
                key={c.signature}
                className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]"
              >
                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="flex flex-1 items-start gap-3 min-w-0">
                    <Icon className="h-4 w-4 flex-shrink-0 text-foreground-secondary mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SEVERITY_COLORS[c.sample.severity]}`}>
                          {c.sample.severity}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-foreground-tertiary">{c.sample.source}</span>
                        {c.sample.code && (
                          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-foreground-secondary">
                            {c.sample.code}
                          </span>
                        )}
                        <span className="text-[10px] text-foreground-secondary">×{c.totalOccurrences}</span>
                      </div>
                      <div className="mt-1 truncate text-sm text-foreground">{c.sample.message}</div>
                      {(c.sample.trpcProcedure || c.sample.route) && (
                        <div className="mt-1 text-[10px] text-foreground-tertiary">
                          {c.sample.trpcProcedure ?? c.sample.route}
                        </div>
                      )}
                      <div className="mt-1 text-[10px] text-foreground-tertiary">
                        Premier vu : {new Date(c.firstSeenAt).toLocaleString()} · Dernier : {new Date(c.lastSeenAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <button
                      onClick={() => setExpandedSig(expanded ? null : c.signature)}
                      className="rounded bg-white/5 px-2 py-1 text-[10px] hover:bg-white/10"
                    >
                      {expanded ? "Réduire" : "Détail"}
                    </button>
                    {!showResolved && (
                      <>
                        <button
                          onClick={() =>
                            resolveMut.mutate({
                              id: c.sample.id,
                              reason: "Marked resolved from vault UI",
                            })
                          }
                          className="rounded bg-emerald-500/15 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/25"
                        >
                          ✓ Résoudre
                        </button>
                        <button
                          onClick={() =>
                            confirm(`Marquer cette signature comme false positive (auto-resolve futurs occurrences) ?`) &&
                            batchMut.mutate({
                              signature: c.signature,
                              reason: "Known false positive",
                              knownFalsePositive: true,
                            })
                          }
                          className="rounded bg-amber-500/15 px-2 py-1 text-[10px] text-amber-300 hover:bg-amber-500/25"
                        >
                          FP
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {expanded && c.sample.stack && (
                  <pre className="border-t border-white/5 bg-black/40 p-3 text-[10px] text-foreground-tertiary overflow-x-auto">
                    {c.sample.stack}
                  </pre>
                )}
                {expanded && c.sample.context && (
                  <pre className="border-t border-white/5 bg-black/40 p-3 text-[10px] text-foreground-tertiary overflow-x-auto">
                    {JSON.stringify(c.sample.context, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="text-xs uppercase tracking-wider text-foreground-tertiary">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
