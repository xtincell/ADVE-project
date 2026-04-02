"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Briefcase,
  Calendar,
  CheckCircle,
  ClipboardList,
  DollarSign,
  Download,
  FileText,
  FolderOpen,
  Layers,
  MapPin,
  Megaphone,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  Users,
  Zap,
} from "lucide-react";

// ─── State machine ───────────────────────────────────────────────────────────

type CampaignState =
  | "BRIEF_DRAFT" | "BRIEF_VALIDATED" | "PLANNING" | "CREATIVE_DEV"
  | "PRODUCTION" | "PRE_PRODUCTION" | "APPROVAL" | "READY_TO_LAUNCH"
  | "LIVE" | "POST_CAMPAIGN" | "ARCHIVED" | "CANCELLED";

const STATE_COLORS: Record<string, string> = {
  BRIEF_DRAFT: "bg-zinc-400/15 text-zinc-400 ring-zinc-400/30",
  BRIEF_VALIDATED: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
  PLANNING: "bg-violet-400/15 text-violet-400 ring-violet-400/30",
  CREATIVE_DEV: "bg-amber-400/15 text-amber-400 ring-amber-400/30",
  PRODUCTION: "bg-orange-400/15 text-orange-400 ring-orange-400/30",
  PRE_PRODUCTION: "bg-orange-400/15 text-orange-300 ring-orange-400/30",
  APPROVAL: "bg-yellow-400/15 text-yellow-400 ring-yellow-400/30",
  READY_TO_LAUNCH: "bg-cyan-400/15 text-cyan-400 ring-cyan-400/30",
  LIVE: "bg-emerald-400/15 text-emerald-400 ring-emerald-400/30",
  POST_CAMPAIGN: "bg-pink-400/15 text-pink-400 ring-pink-400/30",
  ARCHIVED: "bg-zinc-400/15 text-zinc-400 ring-zinc-400/30",
  CANCELLED: "bg-red-400/15 text-red-400 ring-red-400/30",
};

function StateBadge({ state }: { state: string }) {
  const c = STATE_COLORS[state] ?? STATE_COLORS.BRIEF_DRAFT;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${c}`}>
      {state.replace(/_/g, " ")}
    </span>
  );
}

// ─── Tab definitions ─────────────────────────────────────────────────────────

const TABS = [
  { key: "overview", label: "Vue d'ensemble", icon: Target },
  { key: "actions", label: "Actions", icon: Zap },
  { key: "executions", label: "Executions", icon: Layers },
  { key: "team", label: "Equipe", icon: Users },
  { key: "milestones", label: "Jalons", icon: Calendar },
  { key: "budget", label: "Budget", icon: DollarSign },
  { key: "briefs", label: "Briefs", icon: ClipboardList },
  { key: "assets", label: "Assets", icon: FolderOpen },
  { key: "aarrr", label: "AARRR", icon: BarChart3 },
  { key: "fieldops", label: "Terrain", icon: MapPin },
  { key: "reports", label: "Rapports", icon: FileText },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ─── Shared UI helpers ───────────────────────────────────────────────────────

function Section({ title, icon: Icon, action, children }: { title: string; icon?: React.ElementType; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          {Icon && <Icon className="h-4 w-4 text-zinc-400" />}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function MiniBtn({ onClick, disabled, children, variant = "default" }: { onClick: () => void; disabled?: boolean; children: React.ReactNode; variant?: "default" | "danger" | "primary" }) {
  const base = "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50";
  const v = variant === "danger" ? "border border-red-800 text-red-400 hover:bg-red-950/40" : variant === "primary" ? "bg-white text-zinc-900 hover:bg-zinc-200" : "border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700";
  return <button onClick={onClick} disabled={disabled} className={`${base} ${v}`}>{children}</button>;
}

function KV({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`text-sm text-white ${mono ? "font-mono" : ""}`}>{value ?? "—"}</p>
    </div>
  );
}

function EmptyMsg({ text }: { text: string }) {
  return <p className="py-4 text-center text-xs text-zinc-500">{text}</p>;
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const campaignQuery = trpc.campaignManager.getById.useQuery({ id: campaignId });

  if (campaignQuery.isLoading) return <SkeletonPage />;
  if (campaignQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Campagne introuvable" />
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-red-400" />
          <p className="mt-2 text-sm text-red-300">{campaignQuery.error.message}</p>
        </div>
      </div>
    );
  }

  const campaign = campaignQuery.data as Record<string, unknown>;
  const state = ((campaign.state as string) ?? (campaign.status as string) ?? "BRIEF_DRAFT") as CampaignState;
  const name = (campaign.name as string) ?? "Campagne";
  const code = campaign.code as string | undefined;
  const budget = campaign.budget as number | undefined;
  const startDate = campaign.startDate as string | undefined;
  const endDate = campaign.endDate as string | undefined;
  const strategyId = campaign.strategyId as string;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={name}
        description={code ?? undefined}
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Operations" },
          { label: "Campagnes", href: "/cockpit/operate/campaigns" },
          { label: name },
        ]}
      >
        <button
          onClick={() => router.push("/cockpit/operate/campaigns")}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour
        </button>
      </PageHeader>

      {/* State + meta bar */}
      <div className="flex flex-wrap items-center gap-3">
        <StateBadge state={state} />
        {budget != null && <span className="text-xs text-zinc-400"><DollarSign className="mr-0.5 inline h-3 w-3" />{budget.toLocaleString("fr-FR")} XAF</span>}
        {startDate && <span className="text-xs text-zinc-500">{new Date(startDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} → {endDate ? new Date(endDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "?"}</span>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/50 p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium transition-colors ${active ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "overview" && <OverviewTab campaignId={campaignId} strategyId={strategyId} state={state} onRefresh={() => campaignQuery.refetch()} />}
        {activeTab === "actions" && <ActionsTab campaignId={campaignId} />}
        {activeTab === "executions" && <ExecutionsTab campaignId={campaignId} />}
        {activeTab === "team" && <TeamTab campaignId={campaignId} />}
        {activeTab === "milestones" && <MilestonesTab campaignId={campaignId} />}
        {activeTab === "budget" && <BudgetTab campaignId={campaignId} />}
        {activeTab === "briefs" && <BriefsTab campaignId={campaignId} strategyId={strategyId} />}
        {activeTab === "assets" && <AssetsTab campaignId={campaignId} />}
        {activeTab === "aarrr" && <AARRRTab campaignId={campaignId} budget={budget} />}
        {activeTab === "fieldops" && <FieldOpsTab campaignId={campaignId} />}
        {activeTab === "reports" && <ReportsTab campaignId={campaignId} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB 1 — Overview
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewTab({ campaignId, strategyId, state, onRefresh }: { campaignId: string; strategyId: string; state: CampaignState; onRefresh: () => void }) {
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const dashboardQuery = trpc.campaignManager.dashboard.useQuery({ strategyId });
  const transitionsQuery = trpc.campaignManager.availableTransitions.useQuery({ state });
  const missionsQuery = trpc.campaign.get.useQuery({ id: campaignId });
  const depsQuery = trpc.campaignManager.listDependencies.useQuery({ campaignId });

  const transitionMut = trpc.campaignManager.transition.useMutation({
    onSuccess: () => { setTransitionError(null); onRefresh(); },
    onError: (err) => setTransitionError(err.message),
  });

  const dashboard = dashboardQuery.data as Record<string, unknown> | null;
  const transitions = (transitionsQuery.data ?? []) as string[];
  const missions = ((missionsQuery.data as Record<string, unknown>)?.missions ?? []) as Array<Record<string, unknown>>;
  const deps = (depsQuery.data ?? []) as Array<Record<string, unknown>>;

  return (
    <div className="space-y-5">
      {/* Dashboard stats */}
      {dashboard && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Missions", value: dashboard.totalMissions ?? 0 },
            { label: "Actions", value: dashboard.totalActions ?? 0 },
            { label: "Depense", value: `${((dashboard.totalSpent as number) ?? 0).toLocaleString("fr-FR")} XAF` },
            { label: "Score", value: dashboard.overallScore ?? "—" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
              <p className="text-[11px] uppercase text-zinc-500">{s.label}</p>
              <p className="text-lg font-bold text-white">{String(s.value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* State transitions */}
      <Section title="Transitions d'etat" icon={ArrowRight}>
        {transitions.length === 0 ? (
          <EmptyMsg text="Aucune transition disponible depuis cet etat." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {transitions.map((toState) => (
              <button
                key={toState}
                onClick={() => {
                  setTransitionError(null);
                  transitionMut.mutate({ campaignId, toState: toState as CampaignState });
                }}
                disabled={transitionMut.isPending}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
              >
                <ArrowRight className="h-3 w-3" />
                {toState.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        )}
        {transitionError && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-900/50 bg-red-950/20 p-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
            <p className="text-xs text-red-300">{transitionError}</p>
          </div>
        )}
      </Section>

      {/* Missions */}
      <Section title={`Missions (${missions.length})`} icon={Briefcase}>
        {missions.length === 0 ? (
          <EmptyMsg text="Aucune mission associee." />
        ) : (
          <div className="space-y-2">
            {missions.map((m) => (
              <div key={m.id as string} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <div className="flex items-center gap-2">
                  {typeof m.priority === "number" && (
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${m.priority <= 1 ? "bg-red-500/20 text-red-400" : m.priority <= 3 ? "bg-amber-500/20 text-amber-400" : "bg-zinc-700 text-zinc-400"}`}>
                      {m.priority}
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">{(m.title as string) || (m.id as string).slice(0, 8)}</p>
                    {!!m.description && <p className="text-xs text-zinc-500 line-clamp-1">{m.description as string}</p>}
                  </div>
                </div>
                <StatusBadge status={m.status as string} />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Dependencies */}
      {deps.length > 0 && (
        <Section title="Dependances" icon={Layers}>
          <div className="space-y-1.5">
            {deps.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">{(d.type as string) ?? "FINISH_TO_START"}</span>
                <span className="text-white">{(d.targetCampaignId as string)?.slice(0, 8)}...</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB 2 — Actions ATL/BTL/TTL
// ═══════════════════════════════════════════════════════════════════════════════

function ActionsTab({ campaignId }: { campaignId: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<string>("ALL");
  const [newAction, setNewAction] = useState({ actionTypeSlug: "", name: "", budget: "" });

  const actionsQuery = trpc.campaignManager.listActions.useQuery({ campaignId, category: filter === "ALL" ? undefined : filter as any });
  const typesQuery = trpc.campaignManager.getActionTypes.useQuery({ category: filter === "ALL" ? undefined : filter as any });
  const createMut = trpc.campaignManager.createAction.useMutation({
    onSuccess: () => { actionsQuery.refetch(); setShowCreate(false); setNewAction({ actionTypeSlug: "", name: "", budget: "" }); },
  });

  const actions = (actionsQuery.data ?? []) as unknown as Array<Record<string, unknown>>;
  const actionTypes = (typesQuery.data ?? []) as unknown as Array<Record<string, unknown>>;

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {["ALL", "ATL", "BTL", "TTL", "DIGITAL"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filter === cat ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              {cat}
            </button>
          ))}
        </div>
        <MiniBtn onClick={() => setShowCreate(true)} variant="primary">
          <span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Ajouter</span>
        </MiniBtn>
      </div>

      {/* Actions list */}
      {actionsQuery.isLoading ? (
        <EmptyMsg text="Chargement..." />
      ) : actions.length === 0 ? (
        <EmptyState icon={Zap} title="Aucune action" description="Ajoutez des actions ATL/BTL/TTL a cette campagne." action={{ label: "Ajouter une action", onClick: () => setShowCreate(true) }} />
      ) : (
        <div className="space-y-2">
          {actions.map((a) => (
            <div key={a.id as string} className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${a.category === "ATL" ? "bg-blue-500/15 text-blue-400" : a.category === "BTL" ? "bg-emerald-500/15 text-emerald-400" : a.category === "TTL" ? "bg-violet-500/15 text-violet-400" : "bg-amber-500/15 text-amber-400"}`}>
                      {a.category as string}
                    </span>
                    <h4 className="text-sm font-medium text-white">{a.label as string}</h4>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{a.typeCode as string}</p>
                  {!!a.kpiTarget && <p className="mt-1 text-xs text-zinc-400">KPI: {String(a.kpiTarget)}</p>}
                </div>
                <StatusBadge status={(a.status as string) ?? "PLANNED"} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle action" size="md">
        <div className="space-y-4">
          <FormField label="Type d'action" required>
            <select
              value={newAction.actionTypeSlug}
              onChange={(e) => setNewAction({ ...newAction, actionTypeSlug: e.target.value })}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600"
            >
              <option value="">Selectionner un type...</option>
              {actionTypes.map((t) => (
                <option key={t.slug as string} value={t.slug as string}>{(t.name as string) ?? (t.label as string) ?? (t.slug as string)}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Nom" required>
            <input
              type="text"
              value={newAction.name}
              onChange={(e) => setNewAction({ ...newAction, name: e.target.value })}
              placeholder="Ex: Spot TV 30s — campagne notoriete"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600"
            />
          </FormField>
          <FormField label="Budget (XAF)">
            <input
              type="number"
              value={newAction.budget}
              onChange={(e) => setNewAction({ ...newAction, budget: e.target.value })}
              placeholder="Ex: 500000"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600"
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <MiniBtn onClick={() => setShowCreate(false)}>Annuler</MiniBtn>
            <MiniBtn variant="primary" onClick={() => {
              if (!newAction.actionTypeSlug) return;
              createMut.mutate({
                campaignId,
                actionTypeSlug: newAction.actionTypeSlug,
                name: newAction.name || undefined,
                budget: newAction.budget ? parseFloat(newAction.budget) : undefined,
              });
            }} disabled={createMut.isPending}>
              {createMut.isPending ? "Creation..." : "Creer"}
            </MiniBtn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB 3 — Executions
// ═══════════════════════════════════════════════════════════════════════════════

function ExecutionsTab({ campaignId }: { campaignId: string }) {
  const execQuery = trpc.campaignManager.listExecutions.useQuery({ campaignId });
  const transitionMut = trpc.campaignManager.transitionExecution.useMutation({
    onSuccess: () => execQuery.refetch(),
  });

  const executions = (execQuery.data ?? []) as Array<Record<string, unknown>>;

  const EXEC_STATES = ["PLANNED", "IN_PRODUCTION", "IN_REVIEW", "APPROVED", "DELIVERED", "CANCELLED"];

  return (
    <Section title={`Executions (${executions.length})`} icon={Layers}>
      {execQuery.isLoading ? <EmptyMsg text="Chargement..." /> : executions.length === 0 ? (
        <EmptyMsg text="Aucune execution en cours. Les executions sont creees depuis les actions." />
      ) : (
        <div className="space-y-3">
          {executions.map((ex) => {
            const currentIdx = EXEC_STATES.indexOf(ex.state as string);
            const nextState = currentIdx >= 0 && currentIdx < EXEC_STATES.length - 2 ? EXEC_STATES[currentIdx + 1] : null;

            return (
              <div key={ex.id as string} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-white">{(ex.label as string) ?? `Execution ${(ex.id as string).slice(0, 8)}`}</h4>
                    <p className="mt-0.5 text-xs text-zinc-500">Action: {(ex.actionId as string)?.slice(0, 8)}...</p>
                    {!!ex.deliverableUrl && <p className="mt-1 text-xs text-blue-400">{ex.deliverableUrl as string}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={ex.state as string} />
                    {nextState && (
                      <MiniBtn
                        onClick={() => transitionMut.mutate({ id: ex.id as string, toState: nextState as any })}
                        disabled={transitionMut.isPending}
                      >
                        → {nextState.replace(/_/g, " ")}
                      </MiniBtn>
                    )}
                  </div>
                </div>
                {/* Progress bar based on state index */}
                <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-800">
                  <div
                    className="h-1.5 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.max(10, ((currentIdx + 1) / (EXEC_STATES.length - 1)) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB 4 — Team
// ═══════════════════════════════════════════════════════════════════════════════

function TeamTab({ campaignId }: { campaignId: string }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newMember, setNewMember] = useState({ userId: "", role: "MEMBER" });

  const teamQuery = trpc.campaignManager.getTeam.useQuery({ campaignId });
  const addMut = trpc.campaignManager.addTeamMember.useMutation({
    onSuccess: () => { teamQuery.refetch(); setShowAdd(false); setNewMember({ userId: "", role: "MEMBER" }); },
  });
  const removeMut = trpc.campaignManager.removeTeamMember.useMutation({
    onSuccess: () => teamQuery.refetch(),
  });

  const members = (teamQuery.data ?? []) as Array<Record<string, unknown>>;

  const ROLES = ["ACCOUNT_DIRECTOR", "ACCOUNT_MANAGER", "STRATEGIC_PLANNER", "CREATIVE_DIRECTOR", "ART_DIRECTOR", "COPYWRITER", "MEDIA_PLANNER", "MEDIA_BUYER", "SOCIAL_MANAGER", "PRODUCTION_MANAGER", "PROJECT_MANAGER", "DATA_ANALYST", "CLIENT"];

  return (
    <div className="space-y-5">
      <Section
        title={`Equipe (${members.length})`}
        icon={Users}
        action={<MiniBtn variant="primary" onClick={() => setShowAdd(true)}><span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Ajouter</span></MiniBtn>}
      >
        {teamQuery.isLoading ? <EmptyMsg text="Chargement..." /> : members.length === 0 ? (
          <EmptyMsg text="Aucun membre dans l'equipe." />
        ) : (
          <div className="space-y-2">
            {members.map((m) => {
              const user = m.user as Record<string, unknown> | undefined;
              return (
                <div key={m.id as string} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-white">
                      {((user?.name as string) ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{(user?.name as string) ?? (m.userId as string)?.slice(0, 8)}</p>
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">{m.role as string}</span>
                    </div>
                  </div>
                  <MiniBtn variant="danger" onClick={() => removeMut.mutate({ campaignId, userId: m.userId as string })} disabled={removeMut.isPending}>
                    <Trash2 className="h-3 w-3" />
                  </MiniBtn>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Ajouter un membre" size="sm">
        <div className="space-y-4">
          <FormField label="User ID" required>
            <input
              type="text"
              value={newMember.userId}
              onChange={(e) => setNewMember({ ...newMember, userId: e.target.value })}
              placeholder="ID utilisateur"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600"
            />
          </FormField>
          <FormField label="Role" required>
            <select
              value={newMember.role}
              onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <MiniBtn onClick={() => setShowAdd(false)}>Annuler</MiniBtn>
            <MiniBtn variant="primary" onClick={() => {
              if (!newMember.userId.trim()) return;
              addMut.mutate({ campaignId, userId: newMember.userId, role: newMember.role as any });
            }} disabled={addMut.isPending}>Ajouter</MiniBtn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB 5 — Milestones
// ═══════════════════════════════════════════════════════════════════════════════

function MilestonesTab({ campaignId }: { campaignId: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newMs, setNewMs] = useState({ title: "", dueDate: "", phase: "" });

  const msQuery = trpc.campaignManager.listMilestones.useQuery({ campaignId });
  const createMut = trpc.campaignManager.createMilestone.useMutation({
    onSuccess: () => { msQuery.refetch(); setShowCreate(false); setNewMs({ title: "", dueDate: "", phase: "" }); },
  });
  const completeMut = trpc.campaignManager.completeMilestone.useMutation({
    onSuccess: () => msQuery.refetch(),
  });
  const deleteMut = trpc.campaignManager.deleteMilestone.useMutation({
    onSuccess: () => msQuery.refetch(),
  });

  const milestones = (msQuery.data ?? []) as Array<Record<string, unknown>>;

  return (
    <div className="space-y-5">
      <Section
        title={`Jalons (${milestones.length})`}
        icon={Calendar}
        action={<MiniBtn variant="primary" onClick={() => setShowCreate(true)}><span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Ajouter</span></MiniBtn>}
      >
        {msQuery.isLoading ? <EmptyMsg text="Chargement..." /> : milestones.length === 0 ? (
          <EmptyMsg text="Aucun jalon defini." />
        ) : (
          <div className="space-y-2">
            {milestones.map((ms) => {
              const isComplete = ms.status === "COMPLETED";
              const dueDate = ms.dueDate ? new Date(ms.dueDate as string) : null;
              const isOverdue = dueDate && !isComplete && dueDate < new Date();
              return (
                <div key={ms.id as string} className={`rounded-lg border p-4 ${isComplete ? "border-emerald-900/50 bg-emerald-950/10" : isOverdue ? "border-red-900/50 bg-red-950/10" : "border-zinc-800 bg-zinc-950/50"}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {isComplete && <CheckCircle className="h-4 w-4 text-emerald-400" />}
                        <h4 className={`text-sm font-medium ${isComplete ? "text-emerald-300 line-through" : "text-white"}`}>{ms.title as string}</h4>
                      </div>
                      {!!ms.phase && <p className="mt-1 text-xs text-zinc-500">Phase: {ms.phase as string}</p>}
                      {dueDate && (
                        <p className={`mt-1 text-xs ${isOverdue ? "text-red-400 font-medium" : "text-zinc-500"}`}>
                          Echeance: {dueDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                          {isOverdue && " (en retard)"}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!isComplete && (
                        <MiniBtn onClick={() => completeMut.mutate({ id: ms.id as string })} disabled={completeMut.isPending}>
                          <CheckCircle className="h-3 w-3" />
                        </MiniBtn>
                      )}
                      <MiniBtn variant="danger" onClick={() => deleteMut.mutate({ id: ms.id as string })} disabled={deleteMut.isPending}>
                        <Trash2 className="h-3 w-3" />
                      </MiniBtn>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouveau jalon" size="md">
        <div className="space-y-4">
          <FormField label="Titre" required>
            <input type="text" value={newMs.title} onChange={(e) => setNewMs({ ...newMs, title: e.target.value })}
              placeholder="Ex: Validation du brief creatif"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600" />
          </FormField>
          <FormField label="Phase">
            <input type="text" value={newMs.phase} onChange={(e) => setNewMs({ ...newMs, phase: e.target.value })}
              placeholder="Ex: PLANNING, PRODUCTION, APPROVAL"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600" />
          </FormField>
          <FormField label="Date d'echeance" required>
            <input type="date" value={newMs.dueDate} onChange={(e) => setNewMs({ ...newMs, dueDate: e.target.value })}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600" />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <MiniBtn onClick={() => setShowCreate(false)}>Annuler</MiniBtn>
            <MiniBtn variant="primary" onClick={() => {
              if (!newMs.title.trim() || !newMs.dueDate) return;
              createMut.mutate({ campaignId, title: newMs.title, dueDate: new Date(newMs.dueDate), phase: newMs.phase || undefined });
            }} disabled={createMut.isPending}>Creer</MiniBtn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB 6 — Budget
// ═══════════════════════════════════════════════════════════════════════════════

function BudgetTab({ campaignId }: { campaignId: string }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newLine, setNewLine] = useState({ category: "", label: "", planned: "", notes: "" });

  const summaryQuery = trpc.campaignManager.getBudgetSummary.useQuery({ campaignId });
  const breakdownQuery = trpc.campaignManager.getBudgetBreakdown.useQuery({ campaignId });
  const varianceQuery = trpc.campaignManager.getBudgetVariance.useQuery({ campaignId });
  const burnQuery = trpc.campaignManager.getBurnForecast.useQuery({ campaignId });
  const linesQuery = trpc.campaignManager.listBudgetLines.useQuery({ campaignId });
  const costPerKpiQuery = trpc.campaignManager.getCostPerKPI.useQuery({ campaignId });

  const createMut = trpc.campaignManager.createBudgetLine.useMutation({
    onSuccess: () => { linesQuery.refetch(); summaryQuery.refetch(); breakdownQuery.refetch(); setShowAdd(false); setNewLine({ category: "", label: "", planned: "", notes: "" }); },
  });

  const summary = summaryQuery.data as Record<string, unknown> | null;
  const breakdown = (breakdownQuery.data as Record<string, unknown>)?.breakdown as Array<Record<string, unknown>> | undefined;
  const variance = varianceQuery.data as Record<string, unknown> | null;
  const burn = burnQuery.data as Record<string, unknown> | null;
  const lines = (linesQuery.data ?? []) as Array<Record<string, unknown>>;
  const costKpi = costPerKpiQuery.data as Record<string, unknown> | null;

  const fmt = (n: unknown) => typeof n === "number" ? n.toLocaleString("fr-FR") : "—";

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Budget total", value: `${fmt(summary?.total)} XAF`, color: "text-white" },
          { label: "Depense", value: `${fmt(summary?.spent)} XAF`, color: "text-amber-400" },
          { label: "Restant", value: `${fmt(summary?.remaining)} XAF`, color: "text-emerald-400" },
          { label: "Variance", value: `${fmt(variance?.percentage)}%`, color: typeof variance?.percentage === "number" && variance.percentage > 0 ? "text-red-400" : "text-emerald-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
            <p className="text-[11px] uppercase text-zinc-500">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Breakdown by category */}
      {breakdown && breakdown.length > 0 && (
        <Section title="Repartition par categorie" icon={BarChart3}>
          <div className="space-y-2">
            {breakdown.map((b) => {
              const pct = typeof b.percentage === "number" ? b.percentage : 0;
              return (
                <div key={b.category as string}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">{b.category as string}</span>
                    <span className="text-white">{fmt(b.amount)} XAF ({Math.round(pct)}%)</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-800">
                    <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Burn forecast */}
      {burn && (
        <Section title="Prevision de consommation" icon={RefreshCw}>
          <div className="grid grid-cols-3 gap-3">
            <KV label="Taux de burn" value={`${fmt(burn.burnRate)}/jour`} />
            <KV label="Jours restants" value={fmt(burn.daysRemaining)} />
            <KV label="Date prevue d'epuisement" value={burn.exhaustionDate ? new Date(burn.exhaustionDate as string).toLocaleDateString("fr-FR") : "—"} />
          </div>
        </Section>
      )}

      {/* Cost per KPI */}
      {costKpi && (
        <Section title="Cout par KPI" icon={Target}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(costKpi).map(([k, v]) => (
              <KV key={k} label={k} value={`${fmt(v)} XAF`} />
            ))}
          </div>
        </Section>
      )}

      {/* Budget lines */}
      <Section
        title={`Lignes budgetaires (${lines.length})`}
        icon={DollarSign}
        action={<MiniBtn variant="primary" onClick={() => setShowAdd(true)}><span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Ajouter</span></MiniBtn>}
      >
        {lines.length === 0 ? <EmptyMsg text="Aucune ligne budgetaire." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-zinc-800 text-left text-zinc-500">
                <th className="pb-2 pr-3">Categorie</th>
                <th className="pb-2 pr-3">Libelle</th>
                <th className="pb-2 pr-3 text-right">Prevu</th>
                <th className="pb-2 text-right">Realise</th>
              </tr></thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id as string} className="border-b border-zinc-800/50">
                    <td className="py-2 pr-3 text-zinc-400">{l.category as string}</td>
                    <td className="py-2 pr-3 text-white">{l.label as string}</td>
                    <td className="py-2 pr-3 text-right text-zinc-300">{fmt(l.plannedAmount)} XAF</td>
                    <td className="py-2 text-right text-amber-400">{fmt(l.actualAmount)} XAF</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nouvelle ligne budgetaire" size="md">
        <div className="space-y-4">
          <FormField label="Categorie" required>
            <select value={newLine.category} onChange={(e) => setNewLine({ ...newLine, category: e.target.value })}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600">
              <option value="">Selectionner...</option>
              {["MEDIA", "PRODUCTION", "TALENT", "LOGISTICS", "TECHNOLOGY", "LEGAL", "CONTINGENCY", "AGENCY_FEE"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>
          <FormField label="Libelle" required>
            <input type="text" value={newLine.label} onChange={(e) => setNewLine({ ...newLine, label: e.target.value })}
              placeholder="Ex: Achat media Facebook"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600" />
          </FormField>
          <FormField label="Montant prevu (XAF)" required>
            <input type="number" value={newLine.planned} onChange={(e) => setNewLine({ ...newLine, planned: e.target.value })}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600" />
          </FormField>
          <FormField label="Notes">
            <input type="text" value={newLine.notes} onChange={(e) => setNewLine({ ...newLine, notes: e.target.value })}
              placeholder="Notes optionnelles..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600" />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <MiniBtn onClick={() => setShowAdd(false)}>Annuler</MiniBtn>
            <MiniBtn variant="primary" onClick={() => {
              if (!newLine.category || !newLine.label.trim() || !newLine.planned) return;
              createMut.mutate({
                campaignId,
                category: newLine.category as any,
                label: newLine.label,
                planned: parseFloat(newLine.planned),
                notes: newLine.notes || undefined,
              });
            }} disabled={createMut.isPending}>Creer</MiniBtn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB 7 — Briefs
// ═══════════════════════════════════════════════════════════════════════════════

function BriefsTab({ campaignId, strategyId }: { campaignId: string; strategyId: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newBrief, setNewBrief] = useState({ briefType: "CREATIVE", title: "", content: "" });
  const [generating, setGenerating] = useState<string | null>(null);

  const briefsQuery = trpc.campaignManager.listBriefs.useQuery({ campaignId });
  const typesQuery = trpc.campaignManager.getBriefTypes.useQuery();
  const createMut = trpc.campaignManager.createBrief.useMutation({
    onSuccess: () => { briefsQuery.refetch(); setShowCreate(false); setNewBrief({ briefType: "CREATIVE", title: "", content: "" }); },
  });

  const genCreative = trpc.campaignManager.generateCreativeBrief.useMutation({ onSuccess: () => { briefsQuery.refetch(); setGenerating(null); } });
  const genMedia = trpc.campaignManager.generateMediaBrief.useMutation({ onSuccess: () => { briefsQuery.refetch(); setGenerating(null); } });
  const genVendor = trpc.campaignManager.generateVendorBrief.useMutation({ onSuccess: () => { briefsQuery.refetch(); setGenerating(null); } });
  const genProd = trpc.campaignManager.generateProductionBrief.useMutation({ onSuccess: () => { briefsQuery.refetch(); setGenerating(null); } });

  const briefs = (briefsQuery.data ?? []) as Array<Record<string, unknown>>;
  const types = (typesQuery.data ?? []) as Array<Record<string, unknown>>;

  const handleGenerate = (type: string) => {
    setGenerating(type);
    const params = { campaignId, strategyId };
    if (type === "CREATIVE") genCreative.mutate(params);
    else if (type === "MEDIA") genMedia.mutate(params);
    else if (type === "VENDOR") genVendor.mutate(params);
    else if (type === "PRODUCTION") genProd.mutate(params);
  };

  return (
    <div className="space-y-5">
      {/* AI Generation bar */}
      <Section title="Generation IA" icon={Sparkles}>
        <div className="flex flex-wrap gap-2">
          {[
            { type: "CREATIVE", label: "Brief creatif" },
            { type: "MEDIA", label: "Brief media" },
            { type: "VENDOR", label: "Brief prestataire" },
            { type: "PRODUCTION", label: "Brief production" },
          ].map((g) => (
            <MiniBtn
              key={g.type}
              onClick={() => handleGenerate(g.type)}
              disabled={generating === g.type}
            >
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {generating === g.type ? "Generation..." : `Generer ${g.label}`}
              </span>
            </MiniBtn>
          ))}
        </div>
      </Section>

      {/* Briefs list */}
      <Section
        title={`Briefs (${briefs.length})`}
        icon={ClipboardList}
        action={<MiniBtn variant="primary" onClick={() => setShowCreate(true)}><span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Manuel</span></MiniBtn>}
      >
        {briefsQuery.isLoading ? <EmptyMsg text="Chargement..." /> : briefs.length === 0 ? (
          <EmptyMsg text="Aucun brief. Generez-en un par IA ou creez-le manuellement." />
        ) : (
          <div className="space-y-2">
            {briefs.map((b) => (
              <div key={b.id as string} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-bold text-violet-400">{b.type as string}</span>
                      <h4 className="text-sm font-medium text-white">{(b.title as string) ?? `Brief ${(b.id as string).slice(0, 8)}`}</h4>
                    </div>
                    {!!b.version && <p className="mt-0.5 text-xs text-zinc-500">v{b.version as number}</p>}
                  </div>
                  <span className="text-xs text-zinc-500">
                    {b.createdAt ? new Date(b.createdAt as string).toLocaleDateString("fr-FR") : ""}
                  </span>
                </div>
                {!!b.content && (
                  <p className="mt-2 text-xs text-zinc-400 line-clamp-3">{typeof b.content === "string" ? b.content : JSON.stringify(b.content).slice(0, 200)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouveau brief" size="md">
        <div className="space-y-4">
          <FormField label="Type" required>
            <select value={newBrief.briefType} onChange={(e) => setNewBrief({ ...newBrief, briefType: e.target.value })}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600">
              {types.length > 0 ? types.map((t) => (
                <option key={t.code as string} value={t.code as string}>{(t.label as string) ?? (t.code as string)}</option>
              )) : ["CREATIVE", "MEDIA", "VENDOR", "PRODUCTION", "SOCIAL", "PR"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Titre" required>
            <input type="text" value={newBrief.title} onChange={(e) => setNewBrief({ ...newBrief, title: e.target.value })}
              placeholder="Ex: Brief creatif — lancement produit X"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600" />
          </FormField>
          <FormField label="Contenu" required>
            <textarea value={newBrief.content} onChange={(e) => setNewBrief({ ...newBrief, content: e.target.value })}
              rows={6} placeholder="Redigez le contenu du brief..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600" />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <MiniBtn onClick={() => setShowCreate(false)}>Annuler</MiniBtn>
            <MiniBtn variant="primary" onClick={() => {
              if (!newBrief.title.trim() || !newBrief.content.trim()) return;
              createMut.mutate({ campaignId, title: newBrief.title, content: { body: newBrief.content }, briefType: newBrief.briefType as any });
            }} disabled={createMut.isPending}>Creer</MiniBtn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB 8 — Assets
// ═══════════════════════════════════════════════════════════════════════════════

function AssetsTab({ campaignId }: { campaignId: string }) {
  const assetsQuery = trpc.campaignManager.listAssets.useQuery({ campaignId });
  const publishMut = trpc.campaignManager.publishAssetToBrandVault.useMutation({
    onSuccess: () => assetsQuery.refetch(),
  });

  const assets = (assetsQuery.data ?? []) as Array<Record<string, unknown>>;

  return (
    <Section title={`Assets (${assets.length})`} icon={FolderOpen}>
      {assetsQuery.isLoading ? <EmptyMsg text="Chargement..." /> : assets.length === 0 ? (
        <EmptyMsg text="Aucun asset associe a cette campagne." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((a) => (
            <div key={a.id as string} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-medium text-white">{(a.name as string) ?? (a.fileName as string) ?? "Asset"}</h4>
                  <p className="text-xs text-zinc-500">{a.type as string} • v{(a.version as number) ?? 1}</p>
                  {!!a.fileSize && <p className="text-xs text-zinc-600">{Math.round((a.fileSize as number) / 1024)} KB</p>}
                </div>
                {!!a.url && (
                  <a href={a.url as string} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                    <Download className="h-4 w-4" />
                  </a>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <MiniBtn onClick={() => publishMut.mutate({ id: a.id as string })} disabled={publishMut.isPending}>
                  Publier au Brand Vault
                </MiniBtn>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB 9 — AARRR
// ═══════════════════════════════════════════════════════════════════════════════

function AARRRTab({ campaignId, budget }: { campaignId: string; budget?: number }) {
  const [showRecord, setShowRecord] = useState(false);
  const [newMetric, setNewMetric] = useState({ stage: "ACQUISITION", metric: "", value: "", period: new Date().toISOString().slice(0, 7) });

  const aarrrQuery = trpc.campaignManager.getAARRReport.useQuery({ campaignId });
  const unifiedQuery = trpc.campaignManager.getUnifiedAARRR.useQuery({ campaignId });
  const recordMut = trpc.campaignManager.recordAARRMetric.useMutation({
    onSuccess: () => { aarrrQuery.refetch(); unifiedQuery.refetch(); setShowRecord(false); setNewMetric({ stage: "ACQUISITION", metric: "", value: "", period: new Date().toISOString().slice(0, 7) }); },
  });

  // Operation recommender — uses funnelStage + budget
  const recoQuery = trpc.campaignManager.getRecommendationsForFunnel.useQuery({ funnelStage: "ACQUISITION", budget: budget ?? 1000000 });

  const aarrr = aarrrQuery.data as { stages?: Array<{ stage: string; metrics?: Array<{ metric: string; value: number; target?: number }> }> } | null;
  const unified = unifiedQuery.data as Record<string, unknown> | null;
  const recos = (recoQuery.data ?? []) as Array<Record<string, unknown>>;

  const STAGES = ["ACQUISITION", "ACTIVATION", "RETENTION", "REFERRAL", "REVENUE"];
  const STAGE_COLORS: Record<string, string> = {
    ACQUISITION: "border-blue-800 bg-blue-950/20",
    ACTIVATION: "border-emerald-800 bg-emerald-950/20",
    RETENTION: "border-amber-800 bg-amber-950/20",
    REFERRAL: "border-violet-800 bg-violet-950/20",
    REVENUE: "border-pink-800 bg-pink-950/20",
  };

  return (
    <div className="space-y-5">
      {/* Funnel visualization */}
      <Section
        title="Entonnoir AARRR"
        icon={BarChart3}
        action={<MiniBtn variant="primary" onClick={() => setShowRecord(true)}><span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Enregistrer</span></MiniBtn>}
      >
        {aarrrQuery.isLoading ? <EmptyMsg text="Chargement..." /> : !aarrr?.stages || aarrr.stages.length === 0 ? (
          <EmptyMsg text="Aucune donnee AARRR. Enregistrez vos premieres metriques." />
        ) : (
          <div className="space-y-3">
            {STAGES.map((stage, idx) => {
              const stageData = aarrr.stages?.find((s) => s.stage === stage);
              const width = 100 - idx * 12; // Funnel narrowing effect
              return (
                <div key={stage} className={`rounded-lg border p-4 ${STAGE_COLORS[stage] ?? "border-zinc-800 bg-zinc-950/50"}`} style={{ marginLeft: `${idx * 2}%`, marginRight: `${idx * 2}%` }}>
                  <h5 className="mb-2 text-xs font-bold text-white">{stage}</h5>
                  {stageData?.metrics && stageData.metrics.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {stageData.metrics.map((m) => (
                        <div key={m.metric}>
                          <p className="text-[10px] text-zinc-500">{m.metric}</p>
                          <p className="text-sm font-semibold text-white">
                            {m.value.toLocaleString("fr-FR")}
                            {m.target && <span className="text-xs text-zinc-500"> / {m.target.toLocaleString("fr-FR")}</span>}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">Pas de donnees</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Unified terrain + digital */}
      {unified && (
        <Section title="Unifie Terrain + Digital" icon={Megaphone}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(unified).map(([k, v]) => (
              <KV key={k} label={k} value={typeof v === "number" ? v.toLocaleString("fr-FR") : String(v)} />
            ))}
          </div>
        </Section>
      )}

      {/* Operation recommendations */}
      {recos.length > 0 && (
        <Section title="Recommandations d'operations" icon={Sparkles}>
          <div className="space-y-2">
            {recos.map((r, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold text-violet-400">{i + 1}</span>
                <div>
                  <p className="text-sm text-white">{r.action as string}</p>
                  {!!r.reason && <p className="mt-0.5 text-xs text-zinc-500">{r.reason as string}</p>}
                  {typeof r.score === "number" && <p className="mt-1 text-xs text-zinc-400">Score: {r.score}/10</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Modal open={showRecord} onClose={() => setShowRecord(false)} title="Enregistrer une metrique AARRR" size="md">
        <div className="space-y-4">
          <FormField label="Etape" required>
            <select value={newMetric.stage} onChange={(e) => setNewMetric({ ...newMetric, stage: e.target.value })}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600">
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>
          <FormField label="Metrique" required>
            <input type="text" value={newMetric.metric} onChange={(e) => setNewMetric({ ...newMetric, metric: e.target.value })}
              placeholder="Ex: impressions, clicks, signups"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600" />
          </FormField>
          <FormField label="Valeur" required>
            <input type="number" value={newMetric.value} onChange={(e) => setNewMetric({ ...newMetric, value: e.target.value })}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600" />
          </FormField>
          <FormField label="Periode" required>
            <input type="month" value={newMetric.period} onChange={(e) => setNewMetric({ ...newMetric, period: e.target.value })}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600" />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <MiniBtn onClick={() => setShowRecord(false)}>Annuler</MiniBtn>
            <MiniBtn variant="primary" onClick={() => {
              if (!newMetric.metric.trim() || !newMetric.value) return;
              recordMut.mutate({ campaignId, stage: newMetric.stage as any, metric: newMetric.metric, value: parseFloat(newMetric.value), period: newMetric.period });
            }} disabled={recordMut.isPending}>Enregistrer</MiniBtn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB 10 — Field Operations
// ═══════════════════════════════════════════════════════════════════════════════

function FieldOpsTab({ campaignId }: { campaignId: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newOp, setNewOp] = useState({ name: "", location: "", date: "", type: "ACTIVATION" });

  const opsQuery = trpc.campaignManager.listFieldOps.useQuery({ campaignId });
  const reportsQuery = trpc.campaignManager.getFieldReportStats.useQuery({ campaignId });
  const createMut = trpc.campaignManager.createFieldOp.useMutation({
    onSuccess: () => { opsQuery.refetch(); setShowCreate(false); setNewOp({ name: "", location: "", date: "", type: "ACTIVATION" }); },
  });
  const deleteMut = trpc.campaignManager.deleteFieldOp.useMutation({
    onSuccess: () => opsQuery.refetch(),
  });

  const ops = (opsQuery.data ?? []) as Array<Record<string, unknown>>;
  const stats = reportsQuery.data as Record<string, unknown> | null;

  return (
    <div className="space-y-5">
      {/* Report stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Operations", value: stats.totalOps ?? 0 },
            { label: "Rapports", value: stats.totalReports ?? 0 },
            { label: "Valides", value: stats.validatedReports ?? 0 },
            { label: "En attente", value: stats.pendingReports ?? 0 },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
              <p className="text-[11px] uppercase text-zinc-500">{s.label}</p>
              <p className="text-lg font-bold text-white">{String(s.value)}</p>
            </div>
          ))}
        </div>
      )}

      <Section
        title={`Operations terrain (${ops.length})`}
        icon={MapPin}
        action={<MiniBtn variant="primary" onClick={() => setShowCreate(true)}><span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Ajouter</span></MiniBtn>}
      >
        {opsQuery.isLoading ? <EmptyMsg text="Chargement..." /> : ops.length === 0 ? (
          <EmptyMsg text="Aucune operation terrain." />
        ) : (
          <div className="space-y-2">
            {ops.map((op) => (
              <div key={op.id as string} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">{(op.status as string) ?? "PLANNED"}</span>
                      <h4 className="text-sm font-medium text-white">{(op.name as string) ?? (op.title as string)}</h4>
                    </div>
                    <div className="mt-1 flex gap-3 text-xs text-zinc-500">
                      {!!op.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{op.location as string}</span>}
                      {!!op.date && <span>{new Date(op.date as string).toLocaleDateString("fr-FR")}</span>}
                    </div>
                    {!!op.results && <p className="mt-1 text-xs text-zinc-400">{typeof op.results === "string" ? op.results : JSON.stringify(op.results).slice(0, 100)}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={(op.status as string) ?? "PLANNED"} />
                    <MiniBtn variant="danger" onClick={() => deleteMut.mutate({ id: op.id as string })} disabled={deleteMut.isPending}>
                      <Trash2 className="h-3 w-3" />
                    </MiniBtn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle operation terrain" size="md">
        <div className="space-y-4">
          <FormField label="Nom" required>
            <input type="text" value={newOp.name} onChange={(e) => setNewOp({ ...newOp, name: e.target.value })}
              placeholder="Ex: Activation marche central Douala"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600" />
          </FormField>
          <FormField label="Type">
            <select value={newOp.type} onChange={(e) => setNewOp({ ...newOp, type: e.target.value })}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600">
              {["ACTIVATION", "SAMPLING", "ROADSHOW", "POS_DISPLAY", "EVENT", "SURVEY", "AUDIT"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormField>
          <FormField label="Lieu">
            <input type="text" value={newOp.location} onChange={(e) => setNewOp({ ...newOp, location: e.target.value })}
              placeholder="Ex: Douala, Marche Mboppi"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600" />
          </FormField>
          <FormField label="Date">
            <input type="date" value={newOp.date} onChange={(e) => setNewOp({ ...newOp, date: e.target.value })}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600" />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <MiniBtn onClick={() => setShowCreate(false)}>Annuler</MiniBtn>
            <MiniBtn variant="primary" onClick={() => {
              if (!newOp.name.trim() || !newOp.location.trim() || !newOp.date) return;
              createMut.mutate({ campaignId, name: newOp.name, location: newOp.location, date: new Date(newOp.date), status: newOp.type as any });
            }} disabled={createMut.isPending}>Creer</MiniBtn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB 11 — Reports
// ═══════════════════════════════════════════════════════════════════════════════

function ReportsTab({ campaignId }: { campaignId: string }) {
  const [generating, setGenerating] = useState<string | null>(null);

  const reportsQuery = trpc.campaignManager.listReports.useQuery({ campaignId });
  const generateMut = trpc.campaignManager.generateReport.useMutation({
    onSuccess: () => { reportsQuery.refetch(); setGenerating(null); },
    onError: () => setGenerating(null),
  });

  const reports = (reportsQuery.data ?? []) as Array<Record<string, unknown>>;

  const REPORT_TYPES = [
    { type: "PERFORMANCE", label: "Performance", icon: BarChart3 },
    { type: "BUDGET", label: "Budget", icon: DollarSign },
    { type: "EXECUTIVE", label: "Executif", icon: Briefcase },
    { type: "CREATIVE", label: "Creatif", icon: Sparkles },
    { type: "MEDIA", label: "Media", icon: Megaphone },
    { type: "FIELD", label: "Terrain", icon: MapPin },
  ];

  return (
    <div className="space-y-5">
      {/* Generate reports */}
      <Section title="Generer un rapport" icon={FileText}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {REPORT_TYPES.map((rt) => {
            const Icon = rt.icon;
            return (
              <button
                key={rt.type}
                onClick={() => { setGenerating(rt.type); generateMut.mutate({ campaignId, reportType: rt.type as any, title: `Rapport ${rt.label} — ${new Date().toLocaleDateString("fr-FR")}` }); }}
                disabled={generating === rt.type}
                className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-left transition-colors hover:border-zinc-700 disabled:opacity-50"
              >
                <Icon className="h-4 w-4 text-zinc-400" />
                <div>
                  <p className="text-xs font-medium text-white">{rt.label}</p>
                  <p className="text-[10px] text-zinc-500">{generating === rt.type ? "Generation..." : "Cliquer pour generer"}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Reports list */}
      <Section title={`Rapports generes (${reports.length})`} icon={FileText}>
        {reportsQuery.isLoading ? <EmptyMsg text="Chargement..." /> : reports.length === 0 ? (
          <EmptyMsg text="Aucun rapport genere." />
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <div key={r.id as string} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-bold text-blue-400">{r.type as string}</span>
                      <h4 className="text-sm font-medium text-white">{(r.title as string) ?? `Rapport ${(r.id as string).slice(0, 8)}`}</h4>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {r.createdAt ? new Date(r.createdAt as string).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : ""}
                    </p>
                  </div>
                  {!!r.url && (
                    <a href={r.url as string} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                </div>
                {!!r.summary && (
                  <p className="mt-2 text-xs text-zinc-400 line-clamp-3">{r.summary as string}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
