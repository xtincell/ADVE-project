"use client";

/**
 * Console — Traque opérationnelle unifiée (Vague 7).
 * Missions en cours, candidatures en attente, devis (CampaignExecution),
 * budgets planifiés vs réels, commissions à payer. Lecture déterministe.
 */

import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Briefcase, FileText, Wallet, Users, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";

function fcfa(n: number | null | undefined): string {
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(n ?? 0))} FCFA`;
}

export default function OperationsPage() {
  const utils = trpc.useUtils();
  const { data: overview, isLoading } = trpc.operationsOverview.overview.useQuery();
  const { data: missions } = trpc.operationsOverview.activeMissions.useQuery({});
  const { data: pendingApps } = trpc.missionApplication.listPending.useQuery({});
  const decide = trpc.missionApplication.decide.useMutation({
    onSuccess: () => {
      utils.missionApplication.listPending.invalidate();
      utils.operationsOverview.overview.invalidate();
      utils.operationsOverview.activeMissions.invalidate();
    },
  });
  const [notes, setNotes] = useState<Record<string, string>>({});

  if (isLoading) return <SkeletonPage />;

  const inProgress = overview?.missions?.IN_PROGRESS ?? 0;
  const drafts = overview?.missions?.DRAFT ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opérations"
        description="Traque opérationnelle : missions en cours, candidatures, devis et budgets — l'état réel de la production, sans narration."
        breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Opérations" }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Missions en cours" value={inProgress} icon={Briefcase} />
        <StatCard title="Missions ouvertes (DRAFT)" value={drafts} icon={Briefcase} />
        <StatCard title="Candidatures en attente" value={overview?.openApplications ?? 0} icon={Users} />
        <StatCard
          title="Commissions à payer"
          value={`${overview?.commissions.pendingCount ?? 0} · ${fcfa(overview?.commissions.pendingNetTotal)}`}
          icon={Wallet}
        />
      </div>

      {/* Candidatures en attente — décision inline */}
      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Candidatures en attente de décision</h2>
        </div>
        <div className="divide-y divide-border">
          {(pendingApps ?? []).length === 0 && (
            <div className="p-6 text-center text-sm text-foreground-muted">Aucune candidature en attente.</div>
          )}
          {pendingApps?.map((app) => (
            <div key={app.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {app.applicant.name ?? app.applicant.email}{" "}
                  <span className="rounded-full bg-bg-subtle px-2 py-0.5 font-mono text-[10px] text-foreground-muted">{app.applicant.role}</span>
                  <span className="text-foreground-muted"> → </span>
                  {app.mission.title}
                </p>
                <p className="text-xs text-foreground-muted">
                  {app.message ? `« ${app.message.slice(0, 140)} » · ` : ""}
                  {app.proposedRate ? `Taux proposé ${fcfa(app.proposedRate)} · ` : ""}
                  déposée {new Date(app.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  placeholder="Note de décision"
                  value={notes[app.id] ?? ""}
                  onChange={(e) => setNotes({ ...notes, [app.id]: e.target.value })}
                  className="w-40 rounded-lg border border-border bg-bg px-2 py-1.5 text-xs"
                />
                <button
                  onClick={() => decide.mutate({ applicationId: app.id, decision: "ACCEPTED", note: notes[app.id] || undefined })}
                  disabled={decide.isPending}
                  className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90 disabled:opacity-40"
                >
                  <CheckCircle2 className="h-3 w-3" /> Attribuer
                </button>
                <button
                  onClick={() => decide.mutate({ applicationId: app.id, decision: "REJECTED", note: notes[app.id] || undefined })}
                  disabled={decide.isPending}
                  className="flex items-center gap-1 rounded-lg border border-error/40 px-3 py-1.5 text-xs text-error hover:bg-error/10 disabled:opacity-40"
                >
                  <XCircle className="h-3 w-3" /> Refuser
                </button>
              </div>
            </div>
          ))}
        </div>
        {decide.error && <p className="p-3 text-xs text-error">{decide.error.message}</p>}
      </section>

      {/* Missions actives */}
      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Missions actives</h2>
        </div>
        <div className="divide-y divide-border">
          {(missions ?? []).length === 0 && (
            <div className="p-6 text-center text-sm text-foreground-muted">Aucune mission active.</div>
          )}
          {missions?.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">{m.title}</p>
                <p className="text-xs text-foreground-muted">
                  {m.strategy?.name ?? "—"} · {m._count.applications} candidature(s) · {m._count.deliverables} livrable(s)
                  {m.slaDeadline ? ` · SLA ${new Date(m.slaDeadline).toLocaleDateString("fr-FR")}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${
                  m.status === "IN_PROGRESS" ? "bg-accent/15 text-accent" : m.status === "REVIEW" ? "bg-warning/15 text-warning" : "bg-bg-subtle text-foreground-muted"
                }`}>{m.status}</span>
                {m.budget != null && <span className="font-mono text-foreground">{fcfa(m.budget)}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Devis en cours */}
      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileText className="h-4 w-4" /> Devis en cours (production campagnes)
          </h2>
        </div>
        <div className="divide-y divide-border">
          {(overview?.devis ?? []).length === 0 && (
            <div className="p-6 text-center text-sm text-foreground-muted">Aucune exécution au stade DEVIS.</div>
          )}
          {overview?.devis.map((d) => (
            <div key={d.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-foreground">{d.action ?? "Action"} <span className="text-foreground-muted">· {d.campaign ?? "—"}</span></p>
                <p className="text-xs text-foreground-muted">
                  {d.category ?? ""} {d.vendor ? `· ${d.vendor}` : ""} {d.dueDate ? `· échéance ${new Date(d.dueDate).toLocaleDateString("fr-FR")}` : ""}
                </p>
              </div>
              <span className="font-mono text-sm text-foreground">{d.amount != null ? fcfa(d.amount) : "—"}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Budgets par catégorie */}
      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Wallet className="h-4 w-4" /> Budgets — planifié vs réel (toutes campagnes)
          </h2>
        </div>
        {(overview?.budgets ?? []).length === 0 ? (
          <EmptyState icon={Wallet} title="Aucune ligne budgétaire" description="Les BudgetLines des campagnes alimenteront cette vue." />
        ) : (
          <div className="divide-y divide-border">
            {overview?.budgets.map((b) => {
              const ratio = b.planned > 0 ? Math.min(1.5, b.actual / b.planned) : 0;
              return (
                <div key={b.category} className="p-4">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-mono text-foreground">{b.category}</span>
                    <span className="text-foreground-muted">
                      {fcfa(b.actual)} / {fcfa(b.planned)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-bg-subtle">
                    <div
                      className={`h-full ${ratio > 1 ? "bg-error" : "bg-accent"}`}
                      style={{ width: `${Math.min(100, ratio * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
