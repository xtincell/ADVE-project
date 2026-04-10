"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Tabs } from "@/components/shared/tabs";
import { SearchFilter } from "@/components/shared/search-filter";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ScoreBadge } from "@/components/shared/score-badge";
import { AdvertisRadar } from "@/components/shared/advertis-radar";
import { Modal } from "@/components/shared/modal";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import {
  Megaphone, Rocket, Factory, CheckCircle, Plus, Eye, Calendar,
  ArrowRight, DollarSign, Users, BarChart3, Layout, List,
  Target, FileText, Shield, ChevronRight,
} from "lucide-react";

const CAMPAIGN_STATES = [
  "BRIEF_DRAFT", "BRIEF_VALIDATED", "PLANNING", "CREATIVE_DEV",
  "PRODUCTION", "PRE_PRODUCTION", "APPROVAL", "READY_TO_LAUNCH",
  "LIVE", "POST_CAMPAIGN", "ARCHIVED", "CANCELLED",
];

const STATE_LABELS: Record<string, string> = {
  BRIEF_DRAFT: "Brief Draft", BRIEF_VALIDATED: "Brief Valide", PLANNING: "Planning",
  CREATIVE_DEV: "Dev Creatif", PRODUCTION: "Production", PRE_PRODUCTION: "Pre-production",
  APPROVAL: "Approbation", READY_TO_LAUNCH: "Pret au lancement", LIVE: "En cours",
  POST_CAMPAIGN: "Post-campagne", ARCHIVED: "Archive", CANCELLED: "Annule",
};

const STATE_COLORS: Record<string, string> = {
  BRIEF_DRAFT: "bg-zinc-600", BRIEF_VALIDATED: "bg-blue-600", PLANNING: "bg-indigo-600",
  CREATIVE_DEV: "bg-purple-600", PRODUCTION: "bg-orange-600", PRE_PRODUCTION: "bg-amber-600",
  APPROVAL: "bg-yellow-600", READY_TO_LAUNCH: "bg-lime-600", LIVE: "bg-emerald-600",
  POST_CAMPAIGN: "bg-teal-600", ARCHIVED: "bg-zinc-700", CANCELLED: "bg-red-600",
};

type ViewMode = "list" | "kanban";

export default function FuseeCampaignsPage() {
  const { data: campaigns, isLoading } = trpc.campaign.list.useQuery({});
  const { data: strategies } = trpc.strategy.list.useQuery({});
  const utils = trpc.useUtils();

  const createCampaign = trpc.campaignManager.create.useMutation({
    onSuccess: () => { utils.campaign.list.invalidate(); setCreateOpen(false); setCreateForm({ name: "", strategyId: "", description: "", budget: "" }); },
  });

  const transitionCampaign = trpc.campaignManager.transition.useMutation({
    onSuccess: () => { utils.campaign.list.invalidate(); if (selectedId) utils.campaignManager.getById.invalidate({ id: selectedId }); },
  });

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [detailTab, setDetailTab] = useState("overview");

  // Detail modal
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: selectedCampaign } = trpc.campaignManager.getById.useQuery(
    { id: selectedId! }, { enabled: !!selectedId },
  );
  const { data: availableTransitions } = trpc.campaignManager.availableTransitions.useQuery(
    { state: (selectedCampaign?.state ?? "BRIEF_DRAFT") as never },
    { enabled: !!selectedCampaign },
  );
  const { data: budgetData } = trpc.campaignManager.getBudgetBreakdown.useQuery(
    { campaignId: selectedId! }, { enabled: !!selectedId },
  );

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", strategyId: "", description: "", budget: "" });

  const allCampaigns = campaigns ?? [];
  const strategyList = strategies ?? [];
  const strategyMap = new Map(strategyList.map((s) => [s.id, s.name]));

  // Tab filtering
  const tabFiltered = allCampaigns.filter((c) => {
    const state = (c.state ?? c.status ?? "BRIEF_DRAFT").toString();
    switch (activeTab) {
      case "active": return ["LIVE", "READY_TO_LAUNCH"].includes(state);
      case "production": return ["PRODUCTION", "PRE_PRODUCTION", "CREATIVE_DEV", "PLANNING"].includes(state);
      case "completed": return state === "POST_CAMPAIGN";
      case "archived": return state === "ARCHIVED";
      default: return true;
    }
  });

  // Search + filter
  const filtered = tabFiltered.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterValues.state && c.state !== filterValues.state) return false;
    return true;
  });

  const tableData = filtered.map((c) => {
    const vec = c.advertis_vector as Record<string, number> | null;
    const adveScore = vec ? ["a", "d", "v", "e", "r", "t", "i", "s"].reduce((sum, k) => sum + (vec[k] ?? 0), 0) : 0;
    return {
      id: c.id, name: c.name, strategyName: strategyMap.get(c.strategyId) ?? "-",
      state: c.state ?? "BRIEF_DRAFT", status: c.status ?? "DRAFT",
      missionCount: c.missions?.length ?? 0, adveScore, createdAt: c.createdAt,
      budget: c.budget,
    };
  });

  // Stats by state
  const liveCampaigns = allCampaigns.filter((c) => ["LIVE", "READY_TO_LAUNCH"].includes(c.state ?? "")).length;
  const inProduction = allCampaigns.filter((c) => ["PRODUCTION", "PRE_PRODUCTION", "CREATIVE_DEV"].includes(c.state ?? "")).length;
  const completedCount = allCampaigns.filter((c) => c.state === "POST_CAMPAIGN").length;
  const totalBudget = allCampaigns.reduce((sum, c) => sum + (c.budget ?? 0), 0);

  const tabs = [
    { key: "all", label: "Toutes", count: allCampaigns.length },
    { key: "active", label: "Live", count: liveCampaigns },
    { key: "production", label: "Production", count: inProduction },
    { key: "completed", label: "Completees", count: completedCount },
    { key: "archived", label: "Archivees", count: allCampaigns.filter((c) => c.state === "ARCHIVED").length },
  ];

  if (isLoading) return <SkeletonPage />;

  const detail = selectedCampaign;
  const detailVec = detail?.advertis_vector as Record<string, number> | null;

  // Kanban grouping
  const kanbanStates = CAMPAIGN_STATES.filter((s) => s !== "CANCELLED" && s !== "ARCHIVED");
  const kanbanGroups = kanbanStates.reduce((acc, state) => {
    acc[state] = filtered.filter((c) => (c.state ?? "BRIEF_DRAFT") === state);
    return acc;
  }, {} as Record<string, typeof filtered>);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaign Manager 360"
        description="Orchestration complete du cycle de vie des campagnes ATL/BTL/TTL"
        breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Fusee" }, { label: "Campagnes" }]}
      >
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-zinc-700 p-0.5">
            <button onClick={() => setViewMode("list")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "list" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"}`}>
              <List className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setViewMode("kanban")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "kanban" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"}`}>
              <Layout className="h-3.5 w-3.5" />
            </button>
          </div>
          <button onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200">
            <Plus className="h-4 w-4" /> Nouvelle campagne
          </button>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total campagnes" value={allCampaigns.length} icon={Megaphone} />
        <StatCard title="Live" value={liveCampaigns} icon={Rocket} />
        <StatCard title="En production" value={inProduction} icon={Factory} />
        <StatCard title="Budget total" value={`${(totalBudget / 1000000).toFixed(1)}M XAF`} icon={DollarSign} />
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <SearchFilter
        placeholder="Rechercher une campagne..."
        value={search} onChange={setSearch}
        filters={[{
          key: "state", label: "Etat",
          options: CAMPAIGN_STATES.map((s) => ({ value: s, label: STATE_LABELS[s] ?? s })),
        }]}
        filterValues={filterValues}
        onFilterChange={(key, value) => setFilterValues((p) => ({ ...p, [key]: value }))}
      />

      {/* === LIST VIEW === */}
      {viewMode === "list" && (
        tableData.length === 0 ? (
          <EmptyState icon={Megaphone} title="Aucune campagne" description="Les campagnes apparaitront ici une fois creees." />
        ) : (
          <DataTable data={tableData} onRowClick={(item) => setSelectedId(item.id as string)} pageSize={10}
            columns={[
              { key: "name", header: "Campagne", render: (item) => (
                <div>
                  <p className="font-medium text-white">{item.name}</p>
                  <p className="text-xs text-zinc-500">{item.strategyName}</p>
                </div>
              )},
              { key: "state", header: "Etat", sortable: true, render: (item) => (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${STATE_COLORS[item.state] ?? "bg-zinc-600"}`}>
                  {STATE_LABELS[item.state] ?? item.state}
                </span>
              )},
              { key: "budget", header: "Budget", sortable: true, render: (item) => (
                <span className="text-zinc-300">{item.budget ? `${(item.budget / 1000).toFixed(0)}K` : "-"}</span>
              )},
              { key: "missionCount", header: "Missions", sortable: true, render: (item) => (
                <span className="text-zinc-300">{item.missionCount}</span>
              )},
              { key: "adveScore", header: "ADVE", sortable: true, render: (item) => (
                item.adveScore > 0 ? <ScoreBadge score={item.adveScore} size="sm" showClassification={false} /> : <span className="text-zinc-500">-</span>
              )},
              { key: "createdAt", header: "Date", sortable: true, render: (item) => (
                <span className="flex items-center gap-1 text-xs text-zinc-400">
                  <Calendar className="h-3 w-3" />{new Date(item.createdAt).toLocaleDateString("fr-FR")}
                </span>
              )},
              { key: "actions", header: "", sortable: false, render: (item) => (
                <button onClick={(e) => { e.stopPropagation(); setSelectedId(item.id as string); }}
                  className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white">
                  <Eye className="h-4 w-4" />
                </button>
              )},
            ]}
          />
        )
      )}

      {/* === KANBAN VIEW === */}
      {viewMode === "kanban" && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {kanbanStates.map((state) => {
            const items = kanbanGroups[state] ?? [];
            if (items.length === 0 && !["BRIEF_DRAFT", "LIVE", "POST_CAMPAIGN"].includes(state)) return null;
            return (
              <div key={state} className="min-w-[260px] flex-shrink-0">
                <div className="mb-2 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${STATE_COLORS[state]}`} />
                  <span className="text-xs font-medium text-zinc-400">{STATE_LABELS[state]}</span>
                  <span className="rounded-full bg-zinc-800 px-1.5 text-xs text-zinc-500">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((c) => (
                    <button key={c.id} onClick={() => setSelectedId(c.id)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-left transition-colors hover:border-zinc-700">
                      <p className="text-sm font-medium text-white truncate">{c.name}</p>
                      <p className="text-xs text-zinc-500 mt-1">{strategyMap.get(c.strategyId) ?? "-"}</p>
                      {c.budget ? <p className="text-xs text-emerald-400 mt-1">{(c.budget / 1000).toFixed(0)}K XAF</p> : null}
                    </button>
                  ))}
                  {items.length === 0 && (
                    <div className="rounded-lg border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-600">Vide</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* === DETAIL MODAL === */}
      <Modal open={!!selectedId} onClose={() => { setSelectedId(null); setDetailTab("overview"); }} title={detail?.name ?? "Campagne"} size="lg">
        {detail ? (
          <div className="space-y-4">
            {/* State machine bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white ${STATE_COLORS[detail.state] ?? "bg-zinc-600"}`}>
                {STATE_LABELS[detail.state] ?? detail.state}
              </span>
              {(availableTransitions ?? []).filter((s: string) => s !== "CANCELLED").map((targetState: string) => (
                <button key={targetState}
                  onClick={() => transitionCampaign.mutate({ campaignId: detail.id, toState: targetState as never })}
                  disabled={transitionCampaign.isPending}
                  className="flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-300 transition-colors hover:border-white hover:text-white disabled:opacity-50">
                  <ArrowRight className="h-3 w-3" />{STATE_LABELS[targetState] ?? targetState}
                </button>
              ))}
            </div>

            {/* Detail tabs */}
            <div className="flex gap-1 border-b border-zinc-800 pb-1">
              {[
                { key: "overview", label: "Vue d'ensemble", icon: Eye },
                { key: "budget", label: "Budget", icon: DollarSign },
                { key: "team", label: "Equipe", icon: Users },
                { key: "aarrr", label: "AARRR", icon: BarChart3 },
                { key: "actions", label: "Actions", icon: Target },
                { key: "briefs", label: "Briefs", icon: FileText },
                { key: "approvals", label: "Approbations", icon: Shield },
              ].map((t) => (
                <button key={t.key} onClick={() => setDetailTab(t.key)}
                  className={`flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium transition-colors ${
                    detailTab === t.key ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
                  <t.icon className="h-3.5 w-3.5" />{t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {detailTab === "overview" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                    <p className="text-xs text-zinc-500">Strategie</p>
                    <p className="mt-1 text-sm text-white">{detail.strategy?.name ?? "-"}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                    <p className="text-xs text-zinc-500">Code</p>
                    <p className="mt-1 text-sm font-mono text-white">{detail.code ?? "-"}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                    <p className="text-xs text-zinc-500">Budget</p>
                    <p className="mt-1 text-sm text-emerald-400">{detail.budget ? `${detail.budget.toLocaleString("fr-FR")} ${detail.budgetCurrency}` : "-"}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                    <p className="text-xs text-zinc-500">Periode</p>
                    <p className="mt-1 text-sm text-white">
                      {detail.startDate ? new Date(detail.startDate).toLocaleDateString("fr-FR") : "?"} - {detail.endDate ? new Date(detail.endDate).toLocaleDateString("fr-FR") : "?"}
                    </p>
                  </div>
                </div>
                {detailVec && (
                  <div className="flex justify-center rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                    <AdvertisRadar scores={detailVec} size={200} />
                  </div>
                )}
                {/* Milestones */}
                {(detail.milestones?.length ?? 0) > 0 && (
                  <div>
                    <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Milestones</h4>
                    <div className="space-y-1">
                      {detail.milestones?.map((m) => (
                        <div key={m.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2">
                          <div className="flex items-center gap-2">
                            {m.completed ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
                            <span className={`text-sm ${m.completed ? "text-zinc-400 line-through" : "text-white"}`}>{m.title}</span>
                            {m.isGateReview && <span className="rounded bg-yellow-900/50 px-1.5 text-[10px] font-medium text-yellow-400">GATE</span>}
                          </div>
                          <span className="text-xs text-zinc-500">{new Date(m.dueDate).toLocaleDateString("fr-FR")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {detailTab === "budget" && (
              <div className="space-y-4">
                {budgetData ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-center">
                        <p className="text-xs text-zinc-500">Total</p>
                        <p className="text-lg font-bold text-white">{budgetData.total.toLocaleString("fr-FR")}</p>
                      </div>
                      <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-center">
                        <p className="text-xs text-zinc-500">Actions</p>
                        <p className="text-lg font-bold text-emerald-400">{budgetData.actions.toLocaleString("fr-FR")}</p>
                      </div>
                      <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-center">
                        <p className="text-xs text-zinc-500">Media</p>
                        <p className="text-lg font-bold text-blue-400">{budgetData.amplification.toLocaleString("fr-FR")}</p>
                      </div>
                      <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-center">
                        <p className="text-xs text-zinc-500">Terrain</p>
                        <p className="text-lg font-bold text-orange-400">{budgetData.fieldOps.toLocaleString("fr-FR")}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Par categorie</h4>
                      {Object.entries(budgetData.byCategory).map(([cat, amount]) => (
                        <div key={cat} className="flex items-center justify-between py-1.5 border-b border-zinc-800/50">
                          <span className="text-sm text-zinc-300">{cat}</span>
                          <span className="text-sm font-medium text-white">{(amount as number).toLocaleString("fr-FR")} XAF</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <p className="text-sm text-zinc-500">Chargement...</p>}
              </div>
            )}

            {detailTab === "team" && (
              <div className="space-y-2">
                {(detail.teamMembers?.length ?? 0) === 0 ? (
                  <p className="text-sm text-zinc-500">Aucun membre assigne.</p>
                ) : (
                  detail.teamMembers?.map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-sm font-medium text-white">
                          {m.user?.name?.[0] ?? "?"}
                        </div>
                        <div>
                          <p className="text-sm text-white">{m.user?.name ?? m.userId}</p>
                          <p className="text-xs text-zinc-500">{m.user?.email}</p>
                        </div>
                      </div>
                      <StatusBadge status={m.role} />
                    </div>
                  ))
                )}
              </div>
            )}

            {detailTab === "aarrr" && (
              <div className="space-y-2">
                {(detail.aarrMetrics?.length ?? 0) === 0 ? (
                  <p className="text-sm text-zinc-500">Aucune metrique AARRR enregistree.</p>
                ) : (
                  ["ACQUISITION", "ACTIVATION", "RETENTION", "REVENUE", "REFERRAL"].map((stage) => {
                    const stageMetrics = detail.aarrMetrics?.filter((m) => m.stage === stage) ?? [];
                    if (stageMetrics.length === 0) return null;
                    return (
                      <div key={stage} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                        <h5 className="text-xs font-medium uppercase text-zinc-500">{stage}</h5>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {stageMetrics.map((m) => (
                            <div key={m.id} className="flex justify-between">
                              <span className="text-xs text-zinc-400">{m.metric}</span>
                              <span className="text-xs font-medium text-white">
                                {m.value}{m.target ? <span className="text-zinc-500"> / {m.target}</span> : null}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {detailTab === "actions" && (
              <div className="space-y-2">
                {(detail.actions?.length ?? 0) === 0 ? (
                  <p className="text-sm text-zinc-500">Aucune action definie.</p>
                ) : (
                  detail.actions?.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3">
                      <div>
                        <p className="text-sm text-white">{a.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`rounded px-1.5 text-[10px] font-medium ${a.category === "ATL" ? "bg-purple-900/50 text-purple-300" : a.category === "BTL" ? "bg-orange-900/50 text-orange-300" : "bg-blue-900/50 text-blue-300"}`}>
                            {a.category}
                          </span>
                          <span className="text-xs text-zinc-500">{a.actionType}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-white">{a.budget ? `${(a.budget / 1000).toFixed(0)}K` : "-"}</p>
                        <StatusBadge status={a.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {detailTab === "briefs" && (
              <div className="space-y-2">
                {(detail.briefs?.length ?? 0) === 0 ? (
                  <p className="text-sm text-zinc-500">Aucun brief cree.</p>
                ) : (
                  detail.briefs?.map((b) => (
                    <div key={b.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3">
                      <div>
                        <p className="text-sm text-white">{b.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {b.briefType && <span className="rounded bg-indigo-900/50 px-1.5 text-[10px] font-medium text-indigo-300">{b.briefType}</span>}
                          {b.generatedBy && <span className="rounded bg-emerald-900/50 px-1.5 text-[10px] font-medium text-emerald-300">IA</span>}
                          <span className="text-xs text-zinc-500">v{b.version}</span>
                        </div>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                  ))
                )}
              </div>
            )}

            {detailTab === "approvals" && (
              <div className="space-y-2">
                {(detail.approvals?.length ?? 0) === 0 ? (
                  <p className="text-sm text-zinc-500">Aucune approbation demandee.</p>
                ) : (
                  detail.approvals?.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3">
                      <div>
                        <p className="text-sm text-white">{a.approvalType ?? `${a.fromState} → ${a.toState}`}</p>
                        <p className="text-xs text-zinc-500">Round {a.round} {a.comment ? ` — ${a.comment}` : ""}</p>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
          </div>
        )}
      </Modal>

      {/* Create Campaign Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouvelle campagne">
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!createForm.name || !createForm.strategyId) return;
          createCampaign.mutate({
            name: createForm.name, strategyId: createForm.strategyId,
            description: createForm.description || undefined,
            budget: createForm.budget ? parseFloat(createForm.budget) : undefined,
          });
        }} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">Nom</label>
            <input type="text" value={createForm.name}
              onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ex: Lancement produit Q2"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600" required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">Strategie</label>
            <select value={createForm.strategyId}
              onChange={(e) => setCreateForm((p) => ({ ...p, strategyId: e.target.value }))}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600" required>
              <option value="">Selectionner...</option>
              {strategyList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">Budget (XAF)</label>
              <input type="number" value={createForm.budget}
                onChange={(e) => setCreateForm((p) => ({ ...p, budget: e.target.value }))}
                placeholder="5000000"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">Description</label>
            <textarea value={createForm.description}
              onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Description..." rows={2}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800">Annuler</button>
            <button type="submit" disabled={createCampaign.isPending}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50">
              {createCampaign.isPending ? "Creation..." : "Creer"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
