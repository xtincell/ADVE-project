"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { FormField } from "@/components/shared/form-field";
import { SelectInput } from "@/components/shared/select-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
import { SkeletonPage, SkeletonList } from "@/components/shared/loading-skeleton";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import {
  Zap,
  Send,
  AlertTriangle,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  ArrowRight,
  BarChart3,
  Inbox,
  Timer,
} from "lucide-react";

/* ---- constants ---- */

const URGENCY_OPTIONS = [
  { value: "low", label: "Faible" },
  { value: "medium", label: "Moyenne" },
  { value: "high", label: "Haute" },
  { value: "critical", label: "Critique" },
];

const TYPE_OPTIONS = [
  { value: "one_off", label: "Ponctuelle" },
  { value: "recurring", label: "Recurrente" },
  { value: "emergency", label: "Urgence" },
];

const ASSIGNEE_OPTIONS = [
  { value: "", label: "Non assigne" },
  { value: "Equipe Creative", label: "Equipe Creative" },
  { value: "Equipe Media", label: "Equipe Media" },
  { value: "Direction", label: "Direction" },
  { value: "Technique", label: "Technique" },
];

const URGENCY_VARIANTS: Record<string, string> = {
  low: "bg-surface-raised text-foreground-secondary ring-border/30",
  medium: "bg-warning/15 text-warning ring-warning",
  high: "bg-orange-400/15 text-orange-400 ring-orange-400/30",
  critical: "bg-error/15 text-error ring-error",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Ouvert",
  ASSIGNED: "Assigne",
  IN_PROGRESS: "En cours",
  RESOLVED: "Resolu",
  pending: "En attente",
  converted: "Converti",
  dismissed: "Rejete",
};

const STATUS_VARIANTS: Record<string, string> = {
  OPEN: "bg-warning/15 text-warning ring-warning",
  ASSIGNED: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
  IN_PROGRESS: "bg-accent/15 text-accent ring-accent/30",
  RESOLVED: "bg-success/15 text-success ring-success",
  pending: "bg-warning/15 text-warning ring-warning",
  converted: "bg-success/15 text-success ring-success",
  dismissed: "bg-surface-raised text-foreground-secondary ring-border/30",
};

const RESOLUTION_FLOW = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED"] as const;

const SLA_HOURS: Record<string, number> = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 168, // 7 days
};

/* ---- SLA indicator ---- */
function SlaIndicator({ createdAt, urgency }: { createdAt: string; urgency: string }) {
  const elapsed = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  const slaLimit = SLA_HOURS[urgency] ?? 72;
  const remaining = slaLimit - elapsed;
  const pct = Math.min((elapsed / slaLimit) * 100, 100);

  let color = "text-success";
  let bgColor = "bg-success";
  if (remaining <= 0) {
    color = "text-error animate-pulse";
    bgColor = "bg-error";
  } else if (remaining < slaLimit * 0.25) {
    color = "text-error";
    bgColor = "bg-error";
  } else if (remaining < slaLimit * 0.5) {
    color = "text-warning";
    bgColor = "bg-warning";
  }

  const formatTime = (h: number) => {
    if (h < 0) return `depasse de ${Math.abs(Math.round(h))}h`;
    if (h < 1) return `${Math.round(h * 60)}min`;
    if (h < 24) return `${Math.round(h)}h`;
    return `${Math.round(h / 24)}j`;
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className={color}>
          {remaining <= 0 ? "SLA depasse" : `${formatTime(remaining)} restant`}
        </span>
        <span className="text-foreground-muted">SLA: {formatTime(slaLimit)}</span>
      </div>
      <div className="h-1 w-full rounded-full bg-background">
        <div
          className={`h-full rounded-full transition-all ${bgColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ---- Resolution workflow buttons ---- */
function ResolutionWorkflow({ currentStatus }: { currentStatus: string }) {
  const currentIdx = RESOLUTION_FLOW.indexOf(currentStatus as (typeof RESOLUTION_FLOW)[number]);
  return (
    <div className="flex items-center gap-1">
      {RESOLUTION_FLOW.map((s, i) => {
        const done = i <= currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={s} className="flex items-center">
            <div
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                isCurrent
                  ? "bg-accent/20 text-accent ring-1 ring-accent/30"
                  : done
                    ? "bg-success/15 text-success"
                    : "bg-background text-foreground-muted"
              }`}
            >
              {STATUS_LABELS[s] ?? s}
            </div>
            {i < RESOLUTION_FLOW.length - 1 && (
              <ArrowRight className={`mx-0.5 h-3 w-3 ${done ? "text-success/50" : "text-foreground-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---- type distribution bars ---- */
function TypeDistribution({ requests }: { requests: Array<Record<string, unknown>> }) {
  const counts: Record<string, number> = {};
  for (const r of requests) {
    const data = r.data as Record<string, unknown> | null;
    const t = (data?.requestType as string) ?? "one_off";
    counts[t] = (counts[t] ?? 0) + 1;
  }
  const total = requests.length || 1;
  const labels: Record<string, string> = {
    one_off: "Ponctuelle",
    recurring: "Recurrente",
    emergency: "Urgence",
  };
  const colors: Record<string, string> = {
    one_off: "bg-blue-500",
    recurring: "bg-accent",
    emergency: "bg-error",
  };

  return (
    <div className="space-y-2">
      {Object.entries(counts).map(([type, count]) => (
        <div key={type} className="space-y-0.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-foreground-secondary">{labels[type] ?? type}</span>
            <span className="text-foreground-muted">{count}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-background">
            <div
              className={`h-full rounded-full transition-all ${colors[type] ?? "bg-surface-raised"}`}
              style={{ width: `${(count / total) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---- main ---- */

export default function RequestsPage() {
  const strategyId = useCurrentStrategyId();
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    urgency: "medium",
    type: "one_off",
    assignee: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const requestsQuery = trpc.intervention.list.useQuery(
    { strategyId: strategyId ?? undefined },
    { enabled: !!strategyId },
  );

  const createMutation = trpc.intervention.create.useMutation({
    onSuccess: () => {
      requestsQuery.refetch();
      setForm({ title: "", description: "", urgency: "medium", type: "one_off", assignee: "" });
      setErrors({});
    },
  });

  const requests = (requestsQuery.data ?? []) as Array<Record<string, unknown> & { id: string; createdAt: unknown }>;

  /* ---- stats ---- */
  const stats = useMemo(() => {
    const open = requests.filter((r) => {
      const data = r.data as Record<string, unknown> | null;
      const status = (data?.status as string) ?? "pending";
      return status === "pending" || status === "OPEN" || status === "ASSIGNED" || status === "IN_PROGRESS";
    }).length;

    // Avg resolution time (for resolved requests)
    const resolved = requests.filter((r) => {
      const data = r.data as Record<string, unknown> | null;
      return (data?.status as string) === "converted" || (data?.status as string) === "RESOLVED";
    });
    let avgResolution = 0;
    if (resolved.length > 0) {
      const totalHours = resolved.reduce((sum, r) => {
        const data = r.data as Record<string, unknown> | null;
        const resolvedAt = data?.resolvedAt as string | undefined;
        if (resolvedAt) {
          return sum + (new Date(resolvedAt).getTime() - new Date(r.createdAt as string).getTime()) / (1000 * 60 * 60);
        }
        return sum + 24; // default estimate
      }, 0);
      avgResolution = totalHours / resolved.length;
    }

    return { total: requests.length, open, avgResolution };
  }, [requests]);

  if (!strategyId) {
    return <SkeletonPage />;
  }

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Le titre est requis.";
    if (!form.description.trim()) e.description = "La description est requise.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !strategyId) return;
    createMutation.mutate({
      strategyId,
      title: form.title,
      description: form.description,
      urgency: form.urgency as "low" | "medium" | "high" | "critical",
      type: form.type as "one_off" | "recurring" | "emergency",
    });
  };

  const selectedData = selectedRequest
    ? requests.find((r) => r.id === selectedRequest)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demandes d'intervention"
        description="Soumettez une demande ponctuelle a votre equipe ou signalez un besoin urgent."
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Operations" },
          { label: "Interventions" },
        ]}
      />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Demandes ouvertes" value={stats.open} icon={Inbox} />
        <StatCard title="Total demandes" value={stats.total} icon={Zap} />
        <StatCard
          title="Temps moyen de resolution"
          value={stats.avgResolution > 0 ? `${Math.round(stats.avgResolution)}h` : "--"}
          icon={Timer}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Form */}
        <div className="rounded-xl border border-border bg-background/80 p-6">
          <h3 className="mb-4 font-semibold text-white">Nouvelle demande</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Titre" required error={errors.title}>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Mise a jour urgente du logo"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
              />
            </FormField>

            <FormField label="Description" required error={errors.description}>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={4}
                placeholder="Decrivez votre besoin en detail..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Type">
                <SelectInput
                  options={TYPE_OPTIONS}
                  value={form.type}
                  onChange={(v) => setForm({ ...form, type: v as string })}
                />
              </FormField>
              <FormField label="Urgence">
                <SelectInput
                  options={URGENCY_OPTIONS}
                  value={form.urgency}
                  onChange={(v) =>
                    setForm({ ...form, urgency: v as string })
                  }
                />
              </FormField>
            </div>

            <FormField label="Assigne a">
              <SelectInput
                options={ASSIGNEE_OPTIONS}
                value={form.assignee}
                onChange={(v) => setForm({ ...form, assignee: v as string })}
                placeholder="Selectionner une equipe..."
              />
            </FormField>

            {createMutation.error && (
              <div className="rounded-lg border border-error/50 bg-error/20 p-3 text-sm text-error">
                <AlertTriangle className="mr-2 inline h-4 w-4" />
                {createMutation.error.message}
              </div>
            )}

            {createMutation.isSuccess && (
              <div className="rounded-lg border border-success/50 bg-success/20 p-3 text-sm text-success">
                <CheckCircle className="mr-2 inline h-4 w-4" />
                Demande envoyee avec succes.
              </div>
            )}

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-foreground-muted hover:bg-foreground disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {createMutation.isPending ? "Envoi..." : "Envoyer la demande"}
            </button>
          </form>
        </div>

        {/* Right column: type distribution + request list */}
        <div className="space-y-4">
          {/* Type distribution */}
          {requests.length > 0 && (
            <div className="rounded-xl border border-border bg-background/80 p-5">
              <h4 className="mb-3 text-sm font-semibold text-white flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-foreground-secondary" />
                Repartition par type
              </h4>
              <TypeDistribution requests={requests as Array<Record<string, unknown>>} />
            </div>
          )}

          {/* Request cards */}
          <div className="rounded-xl border border-border bg-background/80 p-6">
            <h3 className="mb-4 font-semibold text-white">Historique</h3>
            {requestsQuery.isLoading ? (
              <SkeletonList items={3} />
            ) : requests.length === 0 ? (
              <EmptyState
                icon={Zap}
                title="Aucune demande"
                description="Vos demandes d'intervention apparaitront ici."
              />
            ) : (
              <div className="space-y-3">
                {requests.map((r) => {
                  const data = r.data as Record<string, unknown> | null;
                  const urgency = (data?.urgency as string) ?? "medium";
                  const status = (data?.status as string) ?? "pending";
                  const reqType = (data?.requestType as string) ?? "one_off";
                  const assignee = data?.assignee as string | undefined;
                  const updatedAt = data?.updatedAt as string | undefined;
                  const createdStr = r.createdAt as unknown as string;

                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRequest(r.id)}
                      className="w-full rounded-lg border border-border bg-background/50 p-4 text-left transition-colors hover:border-border"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-medium text-white">
                              {(data?.title as string) ?? "Intervention"}
                            </h4>
                            <StatusBadge
                              status={urgency}
                              variantMap={URGENCY_VARIANTS}
                            />
                            <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-foreground-secondary">
                              {reqType === "one_off" ? "Ponctuelle" : reqType === "recurring" ? "Recurrente" : "Urgence"}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-foreground-secondary line-clamp-2">
                            {(data?.description as string) ?? ""}
                          </p>
                        </div>
                        <StatusBadge
                          status={STATUS_LABELS[status] ?? status}
                          variantMap={STATUS_VARIANTS}
                        />
                      </div>

                      <div className="mt-2 flex items-center gap-3 text-xs text-foreground-muted">
                        {assignee && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {assignee}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(createdStr).toLocaleDateString("fr-FR")}
                        </span>
                        {updatedAt && (
                          <span className="text-foreground-muted">
                            MAJ: {new Date(updatedAt).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                      </div>

                      {/* SLA indicator */}
                      {status !== "RESOLVED" && status !== "converted" && status !== "dismissed" && (
                        <div className="mt-2">
                          <SlaIndicator createdAt={createdStr} urgency={urgency} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Request detail modal */}
      <Modal
        open={!!selectedData}
        onClose={() => setSelectedRequest(null)}
        title={(selectedData?.data as Record<string, unknown> | null)?.title as string ?? "Detail de la demande"}
        size="lg"
      >
        {selectedData && (() => {
          const data = selectedData.data as Record<string, unknown> | null;
          const urgency = (data?.urgency as string) ?? "medium";
          const status = (data?.status as string) ?? "pending";
          const reqType = (data?.requestType as string) ?? "one_off";
          const assignee = data?.assignee as string | undefined;
          const createdStr = selectedData.createdAt as unknown as string;

          return (
            <div className="space-y-4">
              {/* Status + urgency */}
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={STATUS_LABELS[status] ?? status} variantMap={STATUS_VARIANTS} />
                <StatusBadge status={urgency} variantMap={URGENCY_VARIANTS} />
                <span className="rounded-full bg-background px-2.5 py-0.5 text-xs font-medium text-foreground-secondary">
                  {reqType === "one_off" ? "Ponctuelle" : reqType === "recurring" ? "Recurrente" : "Urgence"}
                </span>
              </div>

              {/* Resolution workflow */}
              <div>
                <p className="mb-2 text-xs font-medium text-foreground-muted uppercase">Workflow de resolution</p>
                <ResolutionWorkflow currentStatus={status.toUpperCase()} />
              </div>

              {/* Description */}
              <div className="rounded-lg border border-border bg-background/50 p-4">
                <p className="text-sm leading-relaxed text-foreground-secondary">
                  {(data?.description as string) ?? "Aucune description."}
                </p>
              </div>

              {/* SLA */}
              {status !== "RESOLVED" && status !== "converted" && status !== "dismissed" && (
                <div className="rounded-lg border border-border bg-background/50 p-4">
                  <p className="mb-2 text-xs font-medium text-foreground-muted uppercase">SLA</p>
                  <SlaIndicator createdAt={createdStr} urgency={urgency} />
                </div>
              )}

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {assignee && (
                  <div>
                    <p className="text-xs font-medium text-foreground-muted">Assigne a</p>
                    <p className="mt-1 text-white flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-foreground-secondary" />
                      {assignee}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-foreground-muted">Cree le</p>
                  <p className="mt-1 text-white">
                    {new Date(createdStr).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
