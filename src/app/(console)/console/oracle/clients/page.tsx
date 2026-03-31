"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SearchFilter } from "@/components/shared/search-filter";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ScoreBadge } from "@/components/shared/score-badge";
import { AdvertisRadar } from "@/components/shared/advertis-radar";
import { PillarProgress } from "@/components/shared/pillar-progress";
import { Modal } from "@/components/shared/modal";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage, SkeletonTable } from "@/components/shared/loading-skeleton";
import { Building2, Activity, TrendingUp, ClipboardList, ExternalLink } from "lucide-react";
import { classifyBrand, PILLAR_KEYS, type PillarKey } from "@/lib/types/advertis-vector";

const CLASSIFICATION_MAP: Record<string, string> = {
  ZOMBIE: "bg-zinc-400/15 text-zinc-400 ring-zinc-400/30",
  ORDINAIRE: "bg-yellow-400/15 text-yellow-400 ring-yellow-400/30",
  FORTE: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
  CULTE: "bg-purple-400/15 text-purple-400 ring-purple-400/30",
  ICONE: "bg-amber-400/15 text-amber-400 ring-amber-400/30",
};

export default function ClientsPage() {
  const router = useRouter();
  const { data: strategies, isLoading } = trpc.strategy.list.useQuery({});
  const { data: intakes } = trpc.quickIntake.listAll.useQuery({ limit: 100 });
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allStrategies = strategies ?? [];
  const activeStrategies = allStrategies.filter((s) => s.status === "ACTIVE");
  const pendingIntakes = (intakes?.items ?? []).filter((i) => i.status === "IN_PROGRESS").length;

  // Compute average ADVE score
  const composites = allStrategies.map((s) => {
    const v = s.advertis_vector as Record<string, number> | null;
    return v ? PILLAR_KEYS.reduce((sum, k) => sum + (v[k] ?? 0), 0) : 0;
  });
  const avgScore = composites.length > 0
    ? (composites.reduce((a, b) => a + b, 0) / composites.length).toFixed(0)
    : "0";

  const selectedStrategy = allStrategies.find((s) => s.id === selectedId);
  const selectedVector = selectedStrategy?.advertis_vector as Record<string, number> | null;
  const selectedComposite = selectedVector
    ? PILLAR_KEYS.reduce((sum, k) => sum + (selectedVector[k] ?? 0), 0)
    : 0;

  // Filter and search
  const filtered = allStrategies.filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterValues.status && s.status !== filterValues.status) return false;
    const v = s.advertis_vector as Record<string, number> | null;
    const composite = v ? PILLAR_KEYS.reduce((sum, k) => sum + (v[k] ?? 0), 0) : 0;
    const classification = classifyBrand(composite);
    if (filterValues.classification && classification !== filterValues.classification) return false;
    return true;
  });

  const tableData = filtered.map((s) => {
    const v = s.advertis_vector as Record<string, number> | null;
    const composite = v ? PILLAR_KEYS.reduce((sum, k) => sum + (v[k] ?? 0), 0) : 0;
    const classification = classifyBrand(composite);
    return {
      id: s.id,
      name: s.name,
      sector: s.description ?? "-",
      status: s.status ?? "DRAFT",
      composite,
      classification,
      pillarCount: s.pillars?.length ?? 0,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  });

  const columns = [
    {
      key: "name",
      header: "Client",
      render: (item: (typeof tableData)[0]) => (
        <div>
          <p className="font-medium text-white">{item.name}</p>
          <p className="text-xs text-zinc-500">{item.sector}</p>
        </div>
      ),
    },
    {
      key: "sector",
      header: "Secteur",
      render: (item: (typeof tableData)[0]) => (
        <span className="text-sm text-zinc-300">{item.sector}</span>
      ),
    },
    {
      key: "composite",
      header: "Score ADVE",
      sortable: true,
      render: (item: (typeof tableData)[0]) => <ScoreBadge score={item.composite} />,
    },
    {
      key: "classification",
      header: "Classification",
      sortable: true,
      render: (item: (typeof tableData)[0]) => (
        <StatusBadge status={item.classification} variantMap={CLASSIFICATION_MAP} />
      ),
    },
    {
      key: "status",
      header: "Statut",
      sortable: true,
      render: (item: (typeof tableData)[0]) => <StatusBadge status={item.status} />,
    },
    {
      key: "createdAt",
      header: "Cree le",
      sortable: true,
      render: (item: (typeof tableData)[0]) => (
        <span className="text-xs text-zinc-400">
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString("fr-FR") : "-"}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Clients & Strategies"
          breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Oracle" }, { label: "Clients" }]}
        />
        <SkeletonTable rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients & Strategies"
        description={`${allStrategies.length} strategies dans l'ecosysteme`}
        breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Oracle" }, { label: "Clients" }]}
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total strategies" value={allStrategies.length} icon={Building2} />
        <StatCard
          title="Actives"
          value={activeStrategies.length}
          icon={Activity}
          trend={activeStrategies.length > 0 ? "up" : "flat"}
          trendValue={`${((activeStrategies.length / Math.max(allStrategies.length, 1)) * 100).toFixed(0)}%`}
        />
        <StatCard title="Score ADVE moyen" value={`${avgScore}/200`} icon={TrendingUp} />
        <StatCard title="Intakes en attente" value={pendingIntakes} icon={ClipboardList} />
      </div>

      <SearchFilter
        placeholder="Rechercher un client..."
        value={search}
        onChange={setSearch}
        filters={[
          {
            key: "status",
            label: "Statut",
            options: [
              { value: "ACTIVE", label: "Actif" },
              { value: "DRAFT", label: "Brouillon" },
              { value: "ARCHIVED", label: "Archive" },
            ],
          },
          {
            key: "classification",
            label: "Classification",
            options: [
              { value: "ZOMBIE", label: "Zombie" },
              { value: "ORDINAIRE", label: "Ordinaire" },
              { value: "FORTE", label: "Forte" },
              { value: "CULTE", label: "Culte" },
              { value: "ICONE", label: "Icone" },
            ],
          },
        ]}
        filterValues={filterValues}
        onFilterChange={(key, value) => setFilterValues((prev) => ({ ...prev, [key]: value }))}
      />

      {tableData.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucun client"
          description="Les Brand Instances apparaitront ici une fois les Quick Intakes convertis."
        />
      ) : (
        <DataTable
          data={tableData}
          columns={columns}
          pageSize={10}
          onRowClick={(item) => router.push(`/console/oracle/clients/${item.id}`)}
        />
      )}

      {/* Strategy Detail Modal */}
      <Modal
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title={selectedStrategy?.name ?? "Details"}
        size="lg"
      >
        {selectedStrategy && (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-zinc-400">{selectedStrategy.description}</p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={selectedStrategy.status ?? "DRAFT"} />
                  <StatusBadge
                    status={classifyBrand(selectedComposite)}
                    variantMap={CLASSIFICATION_MAP}
                  />
                </div>
              </div>
              <ScoreBadge score={selectedComposite} size="md" />
            </div>

            {selectedVector && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <AdvertisRadar
                  scores={selectedVector as Partial<Record<PillarKey, number>>}
                  size={240}
                />
                <PillarProgress scores={selectedVector as Partial<Record<PillarKey, number>>} />
              </div>
            )}

            {/* Strategy details summary */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3 text-center">
                <p className="text-xs text-zinc-500">Piliers</p>
                <p className="mt-1 text-lg font-bold text-white">
                  {selectedStrategy.pillars?.length ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3 text-center">
                <p className="text-xs text-zinc-500">Drivers</p>
                <p className="mt-1 text-lg font-bold text-white">
                  {selectedStrategy.pillars?.reduce(
                    (sum, p) => sum + ((p as { drivers?: unknown[] }).drivers?.length ?? 0),
                    0,
                  ) ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3 text-center">
                <p className="text-xs text-zinc-500">Score</p>
                <p className="mt-1 text-lg font-bold text-white">{selectedComposite.toFixed(0)}/200</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3 text-center">
                <p className="text-xs text-zinc-500">Confiance</p>
                <p className="mt-1 text-lg font-bold text-white">
                  {selectedVector?.confidence != null
                    ? `${(selectedVector.confidence * 100).toFixed(0)}%`
                    : "-"}
                </p>
              </div>
            </div>

            {/* Link to full detail page */}
            <div className="flex justify-end pt-2">
              <Link
                href={`/console/oracle/clients/${selectedStrategy.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
              >
                Voir fiche complete
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
