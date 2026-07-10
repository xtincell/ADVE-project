"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  ClipboardList,
  Target,
  Users,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Briefcase,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Shield,
  BadgeAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function OperationsCenter({ strategyId }: { strategyId: string }) {
  const [showDoneActions, setShowDoneActions] = useState(false);
  
  // Queries
  const { data: operator } = trpc.operator.getOwn.useQuery();
  const overviewQuery = trpc.operationsOverview.overview.useQuery({ strategyId });
  const todayActionsQuery = trpc.operationsOverview.todayActions.useQuery({ strategyId });
  const teamWorkloadQuery = trpc.operationsOverview.teamWorkload.useQuery({ strategyId });
  const budgetQuery = trpc.operationsOverview.budgetConsolidation.useQuery({ strategyId });
  const activeCampaignsQuery = trpc.campaignManager.getByStrategy.useQuery({ strategyId });

  // Mutations
  const utils = trpc.useUtils();
  const toggleActionMutation = trpc.operatorAction.toggleDone.useMutation({
    onSuccess: () => {
      utils.operationsOverview.todayActions.invalidate();
    }
  });

  const transitionMissionMutation = trpc.mission.update.useMutation({
    onSuccess: () => {
      utils.operationsOverview.todayActions.invalidate();
    }
  });

  if (overviewQuery.isLoading || todayActionsQuery.isLoading || teamWorkloadQuery.isLoading || budgetQuery.isLoading || activeCampaignsQuery.isLoading || !operator) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-background/40 border border-border" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-background/40 border border-border" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="h-64 rounded-xl bg-background/40 border border-border" />
          <div className="h-64 rounded-xl bg-background/40 border border-border" />
        </div>
      </div>
    );
  }

  const overview = overviewQuery.data ?? {
    missions: {},
    openApplications: 0,
    devis: [],
    budgets: [],
    commissions: { pendingCount: 0, pendingNetTotal: 0 }
  };

  const actions = todayActionsQuery.data ?? [];
  const workload = teamWorkloadQuery.data ?? [];
  const budgetLines = budgetQuery.data ?? [];
  const campaigns = activeCampaignsQuery.data ?? [];

  // Filter actions
  const activeActions = actions.filter(a => a.status === "PENDING" || a.status === "IN_PROGRESS" || a.status === "DRAFT" || a.status === "REVIEW");
  const completedActions = actions.filter(a => a.status === "DONE" || a.status === "COMPLETED");

  const totalPlanned = budgetLines.reduce((acc, b) => acc + b.planned, 0);
  const totalSpent = budgetLines.reduce((acc, b) => acc + b.spent, 0);
  const totalRemaining = totalPlanned - totalSpent;

  return (
    <div className="space-y-6">
      {/* ── SECTION 1 : HERO KPI BAR ──────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Actions à traiter"
          value={activeActions.length}
          icon={ClipboardList}
          trend={activeActions.length === 0 ? "flat" : "down"}
          trendValue={`${activeActions.length} restantes`}
        />
        <StatCard
          title="Campagnes Actives"
          value={campaigns.filter(c => c.state === "LIVE").length}
          icon={Target}
          trend="flat"
          trendValue={`${campaigns.length} au total`}
        />
        <StatCard
          title="Budget Dépensé"
          value={`${totalSpent.toLocaleString()} XAF`}
          icon={DollarSign}
          trend="flat"
          trendValue={`Sur ${totalPlanned.toLocaleString()} alloués`}
        />
        <StatCard
          title="Candidatures Guilde"
          value={overview.openApplications}
          icon={Users}
          trend={overview.openApplications > 0 ? "up" : "flat"}
          trendValue={`${overview.openApplications} en attente`}
        />
      </div>

      {/* ── SECTION 2 : MA JOURNÉE (Actions & Missions) ──────────────────────────── */}
      <section className="rounded-xl border border-border bg-background/80 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-accent" />
            <h2 className="text-base font-bold text-white">Ma Journée (SLA & Actions prioritaires)</h2>
          </div>
          <button
            onClick={() => setShowDoneActions(!showDoneActions)}
            className="text-xs text-foreground-secondary hover:text-white transition-colors"
          >
            {showDoneActions ? "Masquer les tâches finies" : "Afficher l'historique de la journée"}
          </button>
        </div>

        {activeActions.length === 0 && (!showDoneActions || completedActions.length === 0) ? (
          <EmptyState
            icon={CheckCircle2}
            title="Journée complétée !"
            description="Toutes les actions du jour et les jalons de campagne sont bouclés. Bravo !"
          />
        ) : (
          <div className="divide-y divide-border">
            {(showDoneActions ? actions : activeActions).map((action) => {
              const isMission = action.type === "MISSION";
              const isCompleted = action.status === "DONE" || action.status === "COMPLETED";
              
              const priorityColors: Record<string, string> = {
                CRITIQUE: "border-error text-error bg-error/10",
                HAUTE: "border-warning text-warning bg-warning/10",
                MOYENNE: "border-accent text-accent bg-accent/10",
                BASSE: "border-zinc-500 text-foreground-secondary bg-zinc-500/10"
              };

              return (
                <div key={action.id} className={cn("py-3 flex items-center justify-between gap-4 transition-colors hover:bg-background/20 px-2 rounded-lg", isCompleted && "opacity-60")}>
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={async () => {
                        if (isMission) {
                          await transitionMissionMutation.mutateAsync({
                            id: action.id,
                            status: isCompleted ? "IN_PROGRESS" : "COMPLETED"
                          });
                        } else {
                          await toggleActionMutation.mutateAsync({
                            strategyId,
                            operatorId: operator.id,
                            actionId: action.id,
                            done: !isCompleted,
                          });
                        }
                      }}
                      className={cn(
                        "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-foreground-muted transition-colors hover:border-accent hover:bg-accent/10",
                        isCompleted && "bg-accent/25 border-accent text-accent"
                      )}
                    >
                      {isCompleted && <CheckCircle2 className="h-4 w-4" />}
                    </button>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded border leading-none uppercase tracking-wide", priorityColors[action.priority] ?? "border-border text-foreground-secondary")}>
                          {action.priority}
                        </span>
                        <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-background border border-border text-foreground-muted">
                          {action.type === "MISSION" ? "MISSION (GUILDE)" : "TÂCHE OPÉRATIONNELLE"}
                        </span>
                        {action.campaign && (
                          <span className="text-2xs text-foreground-secondary flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {action.campaign.name}
                          </span>
                        )}
                      </div>
                      <p className={cn("text-sm font-medium text-white break-words", isCompleted && "line-through text-foreground-muted")}>
                        {action.title}
                      </p>
                      {action.dueDate && (
                        <p className="text-2xs text-foreground-muted flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          SLA : {new Date(action.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {action.assignee ? (
                      <div className="flex items-center gap-1.5" title={action.assignee.name ?? ""}>
                        {action.assignee.image ? (
                          <img src={action.assignee.image} alt="" className="h-6 w-6 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">
                            {action.assignee.name?.slice(0, 2).toUpperCase() ?? "OP"}
                          </div>
                        )}
                        <span className="text-xs text-foreground-secondary hidden sm:inline max-w-[80px] truncate">
                          {action.assignee.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-2xs text-warning border border-warning/30 bg-warning/5 px-2 py-0.5 rounded">
                        Non assignée
                      </span>
                    )}

                    {isMission && (
                      <Link
                        href={`/cockpit/operate/missions?id=${action.id}`}
                        className="p-1 rounded hover:bg-background text-foreground-secondary hover:text-white transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── SECTION 3 : CAMPAGNES ACTIVES ──────────────────────────── */}
      <section className="rounded-xl border border-border bg-background/80 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            <h2 className="text-base font-bold text-white">Campagnes & Projets Actifs</h2>
          </div>
        </div>

        {campaigns.length === 0 ? (
          <EmptyState
            icon={Target}
            title="Aucune campagne active"
            description="Validez un S dans la Forge pour générer de nouveaux projets et démarrer."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((camp) => {
              const missionsCount = camp.missions?.length ?? 0;
              const activeMissions = camp.missions?.filter((m) => m.status !== "COMPLETED" && m.status !== "CANCELLED").length ?? 0;
              
              // Status color mapping
              const statusColors: Record<string, string> = {
                BRIEF_DRAFT: "bg-zinc-500/20 text-foreground-secondary border-zinc-500/30",
                LIVE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                PLANNING: "bg-sky-500/20 text-sky-400 border-sky-500/30",
                PRODUCTION: "bg-amber-500/20 text-amber-400 border-amber-500/30"
              };

              return (
                <div key={camp.id} className="rounded-lg border border-border bg-background p-4 flex flex-col justify-between hover:border-foreground-muted transition-colors">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-2xs font-semibold font-mono text-accent">
                        {camp.code}
                      </span>
                      <span className={cn("text-3xs font-semibold px-2 py-0.5 rounded border uppercase", statusColors[camp.state] ?? "bg-border/20 text-foreground-muted border-border/30")}>
                        {camp.state}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white line-clamp-1">
                      {camp.name}
                    </h3>
                    <p className="text-xs text-foreground-secondary line-clamp-2">
                      {((camp.objectives as any)?.description) || "Aucune description fournie."}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-foreground-secondary">
                    <div>
                      <span className="font-semibold text-white">{activeMissions}</span>/{missionsCount} missions actives
                    </div>
                    
                    <Link
                      href={`/cockpit/operate/campaigns?id=${camp.id}`}
                      className="text-accent hover:underline flex items-center gap-1"
                    >
                      Détails <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* ── SECTION 4 : VUE ÉQUIPE ──────────────────────────── */}
        <section className="rounded-xl border border-border bg-background/80 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Users className="h-5 w-5 text-accent" />
            <h2 className="text-base font-bold text-white">Gestion de Charge de l'Équipe</h2>
          </div>

          {workload.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Aucun membre dans l'équipe"
              description="Assignez des responsables aux missions pour suivre leur charge de travail."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-foreground-secondary border-b border-border pb-2">
                    <th className="py-2 font-semibold">Membre</th>
                    <th className="py-2 font-semibold text-center">Projets (Campagnes)</th>
                    <th className="py-2 font-semibold text-center">Missions actives</th>
                    <th className="py-2 font-semibold text-right">Charge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {workload.map((member) => {
                    const statusConfig = {
                      LOW: { label: "Fluide", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" },
                      MEDIUM: { label: "Soutenue", color: "text-amber-400 border-amber-500/20 bg-amber-500/5" },
                      HIGH: { label: "Surcharge", color: "text-error border-error/20 bg-error/5" }
                    };
                    const cfg = statusConfig[member.workloadLevel] ?? statusConfig.LOW;

                    return (
                      <tr key={member.user.id} className="hover:bg-background/20 transition-colors">
                        <td className="py-3 flex items-center gap-2">
                          {member.user.image ? (
                            <img src={member.user.image} alt="" className="h-6 w-6 rounded-full object-cover border border-border" />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">
                              {member.user.name?.slice(0, 2).toUpperCase() ?? "OP"}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-white">{member.user.name}</p>
                            <p className="text-2xs text-foreground-muted">{member.user.email}</p>
                          </div>
                        </td>
                        <td className="py-3 text-center text-white">{member.campaignCount}</td>
                        <td className="py-3 text-center text-white">{member.activeMissionsCount}</td>
                        <td className="py-3 text-right">
                          <span className={cn("px-2 py-0.5 rounded border text-3xs font-semibold uppercase tracking-wider", cfg.color)}>
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── SECTION 5 : BUDGET CONSOLIDATION ──────────────────────────── */}
        <section className="rounded-xl border border-border bg-background/80 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <DollarSign className="h-5 w-5 text-accent" />
            <h2 className="text-base font-bold text-white">Consolidation Budgétaire</h2>
          </div>

          {budgetLines.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="Aucun budget défini"
              description="Spécifiez des budgets lors de la validation du S pour suivre les dépenses."
            />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 border border-border bg-background/40 p-3 rounded-lg text-center">
                <div>
                  <p className="text-2xs text-foreground-secondary">Enveloppe prévue</p>
                  <p className="text-sm font-bold text-white">{totalPlanned.toLocaleString()} XAF</p>
                </div>
                <div>
                  <p className="text-2xs text-foreground-secondary">Dépensé live</p>
                  <p className="text-sm font-bold text-accent">{totalSpent.toLocaleString()} XAF</p>
                </div>
                <div>
                  <p className="text-2xs text-foreground-secondary">Restant</p>
                  <p className="text-sm font-bold text-emerald-400">{totalRemaining.toLocaleString()} XAF</p>
                </div>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {budgetLines.map((b) => {
                  const spendPct = b.planned > 0 ? (b.spent / b.planned) * 100 : 0;
                  
                  return (
                    <div key={b.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">{b.name}</span>
                        <span className="text-foreground-secondary">
                          {b.spent.toLocaleString()} / {b.planned.toLocaleString()} XAF
                        </span>
                      </div>
                      
                      <div className="h-2 w-full rounded-full bg-background border border-border overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            spendPct > 100 ? "bg-error" : spendPct > 80 ? "bg-warning" : "bg-accent"
                          )}
                          style={{ width: `${Math.min(100, spendPct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
