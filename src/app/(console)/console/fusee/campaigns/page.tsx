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
  Megaphone,
  Rocket,
  Factory,
  CheckCircle,
  Plus,
  Eye,
  Calendar,
} from "lucide-react";

export default function FuseeCampaignsPage() {
  const { data: campaigns, isLoading } = trpc.campaign.list.useQuery({});
  const { data: strategies } = trpc.strategy.list.useQuery({});
  const utils = trpc.useUtils();
  const createCampaign = trpc.campaign.create.useMutation({
    onSuccess: () => {
      utils.campaign.list.invalidate();
      setCreateOpen(false);
      setCreateForm({ name: "", strategyId: "", description: "" });
    },
  });

  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // Detail modal
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: selectedCampaign } = trpc.campaign.get.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId },
  );

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    strategyId: "",
    description: "",
  });

  const allCampaigns = campaigns ?? [];
  const strategyList = strategies ?? [];
  const strategyMap = new Map(strategyList.map((s) => [s.id, s.name]));

  // Tab filtering
  const tabFiltered = allCampaigns.filter((c) => {
    const status = (c.status ?? "DRAFT").toUpperCase();
    switch (activeTab) {
      case "active":
        return status === "ACTIVE";
      case "production":
        return status === "IN_PROGRESS";
      case "completed":
        return status === "COMPLETED";
      case "archived":
        return status === "ARCHIVED";
      default:
        return true;
    }
  });

  // Search + filter
  const filtered = tabFiltered.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    if (filterValues.status && c.status !== filterValues.status) return false;
    return true;
  });

  const tableData = filtered.map((c) => {
    const vec = c.advertis_vector as Record<string, number> | null;
    const adveScore = vec
      ? ["a", "d", "v", "e", "r", "t", "i", "s"].reduce(
          (sum, k) => sum + (vec[k] ?? 0),
          0,
        )
      : 0;
    return {
      id: c.id,
      name: c.name,
      strategyName: strategyMap.get(c.strategyId) ?? "-",
      status: c.status ?? "DRAFT",
      missionCount: c.missions?.length ?? 0,
      adveScore,
      createdAt: c.createdAt,
    };
  });

  // Stats
  const activeCampaigns = allCampaigns.filter(
    (c) => c.status === "ACTIVE",
  ).length;
  const inProduction = allCampaigns.filter(
    (c) => c.status === "IN_PROGRESS",
  ).length;
  const completedCount = allCampaigns.filter(
    (c) => c.status === "COMPLETED",
  ).length;

  // Tab config
  const tabs = [
    { key: "all", label: "Toutes", count: allCampaigns.length },
    { key: "active", label: "Actives", count: activeCampaigns },
    { key: "production", label: "Production", count: inProduction },
    { key: "completed", label: "Completees", count: completedCount },
    {
      key: "archived",
      label: "Archivees",
      count: allCampaigns.filter((c) => c.status === "ARCHIVED").length,
    },
  ];

  if (isLoading) return <SkeletonPage />;

  // Selected campaign detail
  const detail = selectedCampaign;
  const detailVec = detail?.advertis_vector as Record<string, number> | null;
  const detailScore = detailVec
    ? ["a", "d", "v", "e", "r", "t", "i", "s"].reduce(
        (sum, k) => sum + (detailVec[k] ?? 0),
        0,
      )
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campagnes"
        description="Gestion de toutes les campagnes cross-client"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Fusee" },
          { label: "Campagnes" },
        ]}
      >
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200"
        >
          <Plus className="h-4 w-4" /> Nouvelle campagne
        </button>
      </PageHeader>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total campagnes"
          value={allCampaigns.length}
          icon={Megaphone}
        />
        <StatCard title="Actives" value={activeCampaigns} icon={Rocket} />
        <StatCard title="En production" value={inProduction} icon={Factory} />
        <StatCard
          title="Completees"
          value={completedCount}
          icon={CheckCircle}
        />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Search + Filters */}
      <SearchFilter
        placeholder="Rechercher une campagne..."
        value={search}
        onChange={setSearch}
        filters={[
          {
            key: "status",
            label: "Statut",
            options: [
              { value: "DRAFT", label: "Brouillon" },
              { value: "ACTIVE", label: "Active" },
              { value: "IN_PROGRESS", label: "En production" },
              { value: "COMPLETED", label: "Completee" },
              { value: "ARCHIVED", label: "Archivee" },
            ],
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
          icon={Megaphone}
          title="Aucune campagne"
          description="Les campagnes apparaitront ici une fois creees."
        />
      ) : (
        <DataTable
          data={tableData}
          onRowClick={(item) => setSelectedId(item.id as string)}
          columns={[
            {
              key: "name",
              header: "Campagne",
              render: (item) => (
                <div>
                  <p className="font-medium text-white">{item.name}</p>
                  <p className="text-xs text-zinc-500">{item.strategyName}</p>
                </div>
              ),
            },
            {
              key: "status",
              header: "Statut",
              sortable: true,
              render: (item) => <StatusBadge status={item.status} />,
            },
            {
              key: "missionCount",
              header: "Missions",
              sortable: true,
              render: (item) => (
                <span className="text-zinc-300">{item.missionCount}</span>
              ),
            },
            {
              key: "adveScore",
              header: "Score ADVE",
              sortable: true,
              render: (item) =>
                item.adveScore > 0 ? (
                  <ScoreBadge
                    score={item.adveScore}
                    size="sm"
                    showClassification={false}
                  />
                ) : (
                  <span className="text-zinc-500">-</span>
                ),
            },
            {
              key: "createdAt",
              header: "Creee le",
              sortable: true,
              render: (item) => (
                <span className="flex items-center gap-1 text-xs text-zinc-400">
                  <Calendar className="h-3 w-3" />
                  {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                </span>
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
          pageSize={10}
        />
      )}

      {/* Detail Modal */}
      <Modal
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title={detail?.name ?? "Campagne"}
        size="lg"
      >
        {detail ? (
          <div className="space-y-6">
            {/* Strategy info */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Strategie
              </p>
              <p className="mt-1 text-sm text-white">
                {detail.strategy?.name ?? "-"}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Statut: {detail.status ?? "DRAFT"}
              </p>
            </div>

            {/* ADVE Score + Radar */}
            {detailVec && detailScore > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                  <ScoreBadge score={detailScore} size="md" />
                </div>
                <div className="flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                  <AdvertisRadar scores={detailVec} size={220} />
                </div>
              </div>
            )}

            {/* Missions list */}
            <div>
              <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Missions ({detail.missions?.length ?? 0})
              </h4>
              {(detail.missions?.length ?? 0) === 0 ? (
                <p className="text-sm text-zinc-500">
                  Aucune mission associee.
                </p>
              ) : (
                <div className="space-y-2">
                  {detail.missions?.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm text-white">{m.title}</p>
                        <p className="text-xs text-zinc-500">
                          {new Date(m.createdAt).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Timeline
              </p>
              <div className="mt-3 space-y-2">
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
                  <span className="text-zinc-400">Derniere modification</span>
                  <span className="text-white">
                    {new Date(detail.updatedAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
          </div>
        )}
      </Modal>

      {/* Create Campaign Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nouvelle campagne"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!createForm.name || !createForm.strategyId) return;
            createCampaign.mutate({
              name: createForm.name,
              strategyId: createForm.strategyId,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Nom de la campagne
            </label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) =>
                setCreateForm((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="Ex: Lancement produit Q2"
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
              onChange={(e) =>
                setCreateForm((p) => ({ ...p, strategyId: e.target.value }))
              }
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
              required
            >
              <option value="">Selectionner une strategie...</option>
              {strategyList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Description (optionnel)
            </label>
            <textarea
              value={createForm.description}
              onChange={(e) =>
                setCreateForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Description de la campagne..."
              rows={3}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
          </div>

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
              disabled={createCampaign.isPending}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
            >
              {createCampaign.isPending ? "Creation..." : "Creer"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
