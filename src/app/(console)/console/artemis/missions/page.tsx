"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Tabs } from "@/components/shared/tabs";
import { SearchFilter } from "@/components/shared/search-filter";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Modal } from "@/components/shared/modal";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import {
  Rocket,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileCheck,
  Eye,
  Radio,
  User,
  Calendar,
  ShieldAlert,
  Plus,
} from "lucide-react";

export default function FuseeMissionsPage() {
  const { data: missions, isLoading } = trpc.mission.list.useQuery({
    limit: 200,
  });
  const { data: slaAlerts } = trpc.mission.checkSla.useQuery();
  const { data: strategies } = trpc.strategy.list.useQuery({});
  const { data: campaignsList } = trpc.campaign.list.useQuery({});
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    strategyId: "",
    campaignId: "",
  });
  const createMission = trpc.mission.create.useMutation({
    onSuccess: () => {
      utils.mission.list.invalidate();
      setCreateOpen(false);
      setCreateForm({ title: "", strategyId: "", campaignId: "" });
    },
  });

  // Detail modal
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: selectedMission } = trpc.mission.get.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId },
  );

  const allMissions = missions ?? [];
  const alerts = slaAlerts ?? [];
  const alertIds = new Set(alerts.map((a) => a.missionId));
  const strategyMap = new Map(
    (strategies ?? []).map((s) => [s.id, s.name]),
  );
  const campaignMap = new Map(
    (campaignsList ?? []).map((c) => [c.id, c.name]),
  );

  // Derive channels from missions
  const driverChannels = Array.from(
    new Set(allMissions.map((m) => m.driver?.channel).filter(Boolean)),
  ) as string[];

  // Tab filtering
  const tabFiltered = allMissions.filter((m) => {
    const status = (m.status ?? "DRAFT").toUpperCase();
    const meta = m.advertis_vector as Record<string, unknown> | null;
    const deadline = meta?.deadline as string | undefined;
    const isOverdue =
      deadline && new Date(deadline).getTime() < Date.now() && status !== "COMPLETED";

    switch (activeTab) {
      case "draft":
        return status === "DRAFT";
      case "in_progress":
        return status === "IN_PROGRESS";
      case "qc_review":
        return status === "ASSIGNED" || (m.deliverables?.some((d) => d.status === "PENDING") ?? false);
      case "completed":
        return status === "COMPLETED";
      case "overdue":
        return isOverdue;
      default:
        return true;
    }
  });

  // Search + filters
  const filtered = tabFiltered.filter((m) => {
    if (search && !m.title.toLowerCase().includes(search.toLowerCase()))
      return false;
    if (filterValues.status && m.status !== filterValues.status) return false;
    if (filterValues.mode) {
      const meta = m.advertis_vector as Record<string, unknown> | null;
      const mode = (meta?.mode as string) ?? "";
      if (mode !== filterValues.mode) return false;
    }
    if (filterValues.channel && m.driver?.channel !== filterValues.channel)
      return false;
    return true;
  });

  // Build table data
  const tableData = filtered.map((m) => {
    const meta = m.advertis_vector as Record<string, unknown> | null;
    const deadline = meta?.deadline as string | undefined;
    const mode = (meta?.mode as string) ?? "-";
    const assignee = (meta?.assignee as string) ?? "-";
    const isOverdue =
      deadline &&
      new Date(deadline).getTime() < Date.now() &&
      m.status !== "COMPLETED";

    return {
      id: m.id,
      title: m.title,
      strategyId: m.strategyId,
      strategyName: strategyMap.get(m.strategyId) ?? "-",
      campaignName: m.campaignId ? (campaignMap.get(m.campaignId) ?? "-") : "-",
      driverChannel: m.driver?.channel ?? "-",
      status: m.status,
      mode,
      deadline: deadline ?? "",
      assignee,
      hasSlaAlert: alertIds.has(m.id),
      isOverdue: !!isOverdue,
      deliverableCount: m.deliverables?.length ?? 0,
      createdAt: m.createdAt,
    };
  });

  // Stats
  const byStatus = (s: string) =>
    allMissions.filter((m) => m.status === s).length;
  const pendingQcCount = allMissions.filter(
    (m) => m.deliverables?.some((d) => d.status === "PENDING"),
  ).length;

  // Tab config
  const tabs = [
    { key: "all", label: "Toutes", count: allMissions.length },
    { key: "draft", label: "Brouillon", count: byStatus("DRAFT") },
    { key: "in_progress", label: "En cours", count: byStatus("IN_PROGRESS") },
    { key: "qc_review", label: "QC Review", count: pendingQcCount },
    { key: "completed", label: "Completees", count: byStatus("COMPLETED") },
    {
      key: "overdue",
      label: "En retard",
      count: allMissions.filter((m) => {
        const meta = m.advertis_vector as Record<string, unknown> | null;
        const dl = meta?.deadline as string | undefined;
        return dl && new Date(dl).getTime() < Date.now() && m.status !== "COMPLETED";
      }).length,
    },
  ];

  if (isLoading) return <SkeletonPage />;

  // Detail
  const detail = selectedMission;
  const detailMeta = detail?.advertis_vector as Record<string, unknown> | null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Missions"
        description="Vue d'ensemble de toutes les missions cross-strategies"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Fusee" },
          { label: "Missions" },
        ]}
      >
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200"
        >
          <Plus className="h-4 w-4" /> Nouvelle mission
        </button>
      </PageHeader>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total missions"
          value={allMissions.length}
          icon={Rocket}
        />
        <StatCard
          title="En cours"
          value={byStatus("IN_PROGRESS")}
          icon={Clock}
        />
        <StatCard
          title="QC en attente"
          value={pendingQcCount}
          icon={FileCheck}
          trend={pendingQcCount > 0 ? "up" : "flat"}
          trendValue={pendingQcCount > 0 ? "a valider" : ""}
        />
        <StatCard
          title="Alertes SLA"
          value={alerts.length}
          icon={AlertTriangle}
          trend={alerts.length > 0 ? "down" : "flat"}
          trendValue={alerts.length > 0 ? "urgentes" : "aucune"}
        />
      </div>

      {/* SLA Alerts Banner */}
      {alerts.length > 0 && (
        <div className="rounded-xl border-2 border-red-500/30 bg-red-500/5 p-4">
          <h3 className="flex items-center gap-2 font-medium text-red-400">
            <AlertTriangle className="h-4 w-4" /> Alertes SLA ({alerts.length})
          </h3>
          <div className="mt-2 space-y-1">
            {alerts.slice(0, 5).map((a) => (
              <div
                key={a.missionId}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-zinc-300">
                  {a.title} -{" "}
                  <span className="text-zinc-500">{a.strategyName}</span>
                  {a.driverChannel && (
                    <span className="ml-2 text-xs text-zinc-600">
                      [{a.driverChannel}]
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    status={a.severity}
                    variantMap={{
                      breached:
                        "bg-red-400/15 text-red-400 ring-red-400/30",
                      urgent:
                        "bg-amber-400/15 text-amber-400 ring-amber-400/30",
                      warning:
                        "bg-yellow-400/15 text-yellow-400 ring-yellow-400/30",
                    }}
                  />
                  <span className="text-xs text-zinc-400">
                    {a.hoursRemaining}h
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Search + Filters */}
      <SearchFilter
        placeholder="Rechercher une mission..."
        value={search}
        onChange={setSearch}
        filters={[
          {
            key: "status",
            label: "Statut",
            options: [
              { value: "DRAFT", label: "Brouillon" },
              { value: "IN_PROGRESS", label: "En cours" },
              { value: "ASSIGNED", label: "Assignee" },
              { value: "COMPLETED", label: "Completee" },
              { value: "CANCELLED", label: "Annulee" },
            ],
          },
          {
            key: "mode",
            label: "Mode",
            options: [
              { value: "DISPATCH", label: "Dispatch" },
              { value: "COLLABORATIF", label: "Collaboratif" },
            ],
          },
          {
            key: "channel",
            label: "Canal",
            options: driverChannels.map((c) => ({ value: c, label: c })),
          },
        ]}
        filterValues={filterValues}
        onFilterChange={(key, value) =>
          setFilterValues((p) => ({ ...p, [key]: value }))
        }
      />

      {/* Data Table */}
      {tableData.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="Aucune mission"
          description="Les missions apparaitront ici une fois creees depuis les campagnes."
        />
      ) : (
        <DataTable
          data={tableData}
          onRowClick={(item) => setSelectedId(item.id as string)}
          columns={[
            {
              key: "title",
              header: "Mission",
              render: (item) => (
                <div className="flex items-center gap-2">
                  {(item.hasSlaAlert || item.isOverdue) && (
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                    </span>
                  )}
                  <div>
                    <p className="font-medium text-white">{item.title}</p>
                    <p className="text-xs text-zinc-500">
                      {item.strategyName}
                    </p>
                  </div>
                </div>
              ),
            },
            {
              key: "campaignName",
              header: "Campagne",
              render: (item) => (
                <span className="text-xs text-zinc-300">
                  {item.campaignName}
                </span>
              ),
            },
            {
              key: "driverChannel",
              header: "Driver",
              render: (item) => (
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                  {item.driverChannel}
                </span>
              ),
            },
            {
              key: "status",
              header: "Statut",
              sortable: true,
              render: (item) => <StatusBadge status={item.status} />,
            },
            {
              key: "mode",
              header: "Mode",
              render: (item) => (
                <span className="text-xs text-zinc-400">{item.mode}</span>
              ),
            },
            {
              key: "deadline",
              header: "Deadline",
              sortable: true,
              render: (item) =>
                item.deadline ? (
                  <span
                    className={`flex items-center gap-1 text-xs ${
                      item.isOverdue ? "text-red-400" : "text-zinc-400"
                    }`}
                  >
                    <Calendar className="h-3 w-3" />
                    {new Date(item.deadline).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                ) : (
                  <span className="text-xs text-zinc-600">-</span>
                ),
            },
            {
              key: "assignee",
              header: "Assignee",
              render: (item) => (
                <span className="text-xs text-zinc-400">{item.assignee}</span>
              ),
            },
            {
              key: "actions",
              header: "",
              sortable: false,
              render: (item) => (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(item.id as string);
                  }}
                  className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <Eye className="h-4 w-4" />
                </button>
              ),
            },
          ]}
          pageSize={15}
        />
      )}

      {/* Detail Modal */}
      <Modal
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title={detail?.title ?? "Mission"}
        size="lg"
      >
        {detail ? (
          <div className="space-y-6">
            {/* Mission info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Strategie
                </p>
                <p className="mt-1 text-sm text-white">
                  {detail.strategy?.name ?? "-"}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Campagne
                </p>
                <p className="mt-1 text-sm text-white">
                  {detail.campaign?.name ?? "-"}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Driver
                </p>
                <p className="mt-1 text-sm text-white">
                  {detail.driver ? (
                    <span className="flex items-center gap-2">
                      <Radio className="h-3.5 w-3.5 text-zinc-400" />
                      {detail.driver.name} ({detail.driver.channel})
                    </span>
                  ) : (
                    "-"
                  )}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Statut / Mode
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge status={detail.status} />
                  {!!detailMeta?.mode && (
                    <span className="text-xs text-zinc-400">
                      {String(detailMeta.mode)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Deadline */}
            {!!detailMeta?.deadline && (
              <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <Clock className="h-4 w-4 text-zinc-400" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Deadline
                  </p>
                  <p className="mt-0.5 text-sm text-white">
                    {new Date(
                      detailMeta.deadline as string,
                    ).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                {alertIds.has(detail.id) && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-red-400">
                    <ShieldAlert className="h-3.5 w-3.5" /> Alerte SLA
                  </span>
                )}
              </div>
            )}

            {/* Deliverables */}
            <div>
              <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Livrables ({detail.deliverables?.length ?? 0})
              </h4>
              {(detail.deliverables?.length ?? 0) === 0 ? (
                <p className="text-sm text-zinc-500">
                  Aucun livrable soumis.
                </p>
              ) : (
                <div className="space-y-2">
                  {detail.deliverables?.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <FileCheck className="h-4 w-4 text-zinc-500" />
                        <div>
                          <p className="text-sm text-white">{d.title}</p>
                          <p className="text-xs text-zinc-500">
                            {new Date(
                              d.createdAt as unknown as string,
                            ).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={d.status} />
                        {d.qualityReviews && d.qualityReviews.length > 0 && (
                          <span className="text-xs text-zinc-500">
                            {d.qualityReviews.length} QC
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Commissions */}
            {detail.commissions && detail.commissions.length > 0 && (
              <div>
                <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Commissions ({detail.commissions.length})
                </h4>
                <div className="space-y-2">
                  {detail.commissions.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-zinc-500" />
                        <p className="text-sm text-white">
                          {new Intl.NumberFormat("fr-FR").format(
                            c.commissionAmount ?? 0,
                          )}{" "}
                          XAF
                        </p>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
              <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Timeline
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-zinc-400">Creee le</span>
                  <span className="text-white">
                    {new Date(detail.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  <span className="text-zinc-400">Modifiee le</span>
                  <span className="text-white">
                    {new Date(detail.updatedAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {!!detailMeta?.deadline && (
                  <div className="flex items-center gap-3 text-sm">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        new Date(detailMeta.deadline as string).getTime() <
                        Date.now()
                          ? "bg-red-400"
                          : "bg-amber-400"
                      }`}
                    />
                    <span className="text-zinc-400">Deadline</span>
                    <span className="text-white">
                      {new Date(
                        detailMeta.deadline as string,
                      ).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
          </div>
        )}
      </Modal>

      {/* Create Mission Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nouvelle mission"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!createForm.title || !createForm.strategyId) return;
            createMission.mutate({
              title: createForm.title,
              strategyId: createForm.strategyId,
              ...(createForm.campaignId ? { campaignId: createForm.campaignId } : {}),
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Titre de la mission
            </label>
            <input
              type="text"
              value={createForm.title}
              onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Ex: Creation visuel campagne Q2"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Strategie
            </label>
            <select
              value={createForm.strategyId}
              onChange={(e) => setCreateForm((p) => ({ ...p, strategyId: e.target.value }))}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
              required
            >
              <option value="">Selectionner une strategie...</option>
              {(strategies ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Campagne (optionnel)
            </label>
            <select
              value={createForm.campaignId}
              onChange={(e) => setCreateForm((p) => ({ ...p, campaignId: e.target.value }))}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            >
              <option value="">Aucune campagne</option>
              {(campaignsList ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {createMission.error && (
            <p className="text-sm text-red-400">{createMission.error.message}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createMission.isPending}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
            >
              {createMission.isPending ? "Creation..." : "Creer"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
