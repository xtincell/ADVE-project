"use client";

/**
 * /console/governance/intents — admin IntentEmission explorer.
 *
 * APOGEE: Mission Control deck / Sustainment + Telemetry sub-systems.
 * Surface the audit trail (every governed mutation) + compensating
 * intent UI (Tier 3.8 of the residual debt).
 */

import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Modal } from "@/components/shared/modal";
import { Button } from "@/components/primitives/button";
import { Textarea } from "@/components/primitives/textarea";
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
  VETOED: { color: "text-foreground-secondary bg-background border-border", icon: <XCircle className="h-3 w-3" /> },
  DOWNGRADED: { color: "text-amber-300 bg-amber-950/30 border-amber-900/60", icon: <ArrowDown className="h-3 w-3" /> },
  FAILED: { color: "text-error bg-error/30 border-red-900/60", icon: <AlertCircle className="h-3 w-3" /> },
};

const STATUSES = ["", "OK", "PENDING", "EXECUTING", "VETOED", "DOWNGRADED", "FAILED"] as const;

export default function IntentsPage() {
  const [filter, setFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [kindFilter, setKindFilter] = useState<string>("");
  const [sinceDays, setSinceDays] = useState<number>(7);
  const [compensationTarget, setCompensationTarget] = useState<{ id: string; kind: string } | null>(null);
  const [compensationReason, setCompensationReason] = useState("");
  const [compensationNotice, setCompensationNotice] = useState<string | null>(null);

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
    onSuccess: (data) => {
      void list.refetch();
      void stats.refetch();
      setCompensationTarget(null);
      setCompensationReason("");
      // Le reçu serveur distingue un handler exécuté d'une trace sans restauration.
      setCompensationNotice(data.executed
        ? `« ${data.reverseKind} » traité. Le résultat est conservé dans le journal ; un effet déjà enregistré n'est pas rejoué.`
        : `« ${data.reverseKind} » enregistré EN AUDIT UNIQUEMENT : RIEN n'a été restauré. Ce type ne dispose pas encore d'un traitement de restauration.`);
    },
  });
  const closeCompensation = useCallback(() => {
    if (!compensate.isPending) setCompensationTarget(null);
  }, [compensate.isPending]);

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

  const handleCompensate = (intentId: string, kind: string) => {
    compensate.reset();
    setCompensationNotice(null);
    setCompensationReason("");
    setCompensationTarget({ id: intentId, kind });
  };

  if (list.isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-8 p-6">
      <PageHeader
        title="Intents"
        description="Audit trail IntentEmission — explore, compensate, diagnose."
      />
      {compensationNotice && (
        <p role="status" className="rounded-lg border border-border bg-surface-raised p-4 text-sm text-foreground">
          {compensationNotice}
        </p>
      )}
      <Modal open={compensationTarget !== null} onClose={closeCompensation} title="Annuler cette action" size="sm" dismissOnBackdrop={!compensate.isPending}>
        <form onSubmit={(event) => {
          event.preventDefault();
          if (!compensationTarget || compensationReason.trim().length < 3 || compensate.isPending) return;
          compensate.mutate({ originalIntentId: compensationTarget.id, reason: compensationReason.trim() });
        }} className="space-y-4">
          <p className="text-sm text-foreground-secondary">
            L’action inverse sera tracée. Un conflit ou un historique insuffisant entraîne un refus explicite.
          </p>
          <p className="break-all font-mono text-xs text-foreground-muted">{compensationTarget?.kind}</p>
          <label className="block space-y-2 text-sm text-foreground">
            <span>Motif visible dans le journal</span>
            <Textarea value={compensationReason} onChange={(event) => setCompensationReason(event.target.value)} disabled={compensate.isPending} minLength={3} required />
          </label>
          {compensate.error && <p role="alert" className="text-sm text-error">{compensate.error.message}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeCompensation} disabled={compensate.isPending}>Retour</Button>
            <Button type="submit" loading={compensate.isPending} disabled={compensationReason.trim().length < 3}>Exécuter l’action inverse</Button>
          </div>
        </form>
      </Modal>

      {/* Stats by kind */}
      {stats.data && stats.data.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-secondary">
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
                    : "border-border bg-background text-foreground-secondary hover:border-border")
                }
              >
                <span>{s.kind}</span>
                <span className="text-foreground-muted">{s.count}</span>
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
          className="flex-1 min-w-[260px] rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder-zinc-500 focus:border-border focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || "Tous statuts"}</option>
          ))}
        </select>
        <select
          value={sinceDays}
          onChange={(e) => setSinceDays(Number(e.target.value))}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground"
        >
          <option value={1}>24h</option>
          <option value={7}>7j</option>
          <option value={30}>30j</option>
          <option value={90}>90j</option>
        </select>
        <button
          type="button"
          onClick={() => list.refetch()}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:border-border"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </section>

      {/* Intent table */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-secondary">
          IntentEmission rolling {sinceDays}j {visibleItems.length > 0 && `· ${visibleItems.length} entrées`}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-xs">
            <thead className="bg-background">
              <tr className="text-left text-[10px] uppercase tracking-wider text-foreground-muted">
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
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <span className={"inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium " + (STATUS_CHIP[r.status]?.color ?? "border-border text-foreground-secondary")}>
                      {STATUS_CHIP[r.status]?.icon}
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-foreground-secondary">{r.intentKind}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-foreground-muted">{r.strategyId.slice(0, 12)}{r.strategyId.length > 12 ? "…" : ""}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-foreground-muted">{r.caller}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-foreground-muted">{r.selfHash ? r.selfHash.slice(0, 8) : "—"}</td>
                  <td className="px-3 py-2 text-[10px] text-foreground-muted">{new Date(r.emittedAt).toLocaleString("fr-FR")}</td>
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
                      <span className="inline-flex items-center gap-1 text-[10px] text-foreground-muted" title="Irreversible kind">
                        <Lock className="h-3 w-3" /> final
                      </span>
                    ) : (
                      <span className="text-[10px] text-foreground-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visibleItems.length === 0 && (
          <p className="mt-4 text-center text-sm text-foreground-muted">Aucun intent dans la fenêtre.</p>
        )}
      </section>

      <p className="text-[10px] text-foreground-muted">
        Compensate : émet un intent inverse (ROLLBACK_*, DEMOTE_*, DISCARD_*) qui sera traité par le service responsable.
        Les kinds &laquo; irreversible &raquo; (PDF envoyé, retainer activé, GLORY tool exécuté) ne peuvent pas être compensés —
        seule une correction explicite (CORRECT_INTENT) référençant l&apos;original est admise.
      </p>
    </div>
  );
}
