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
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonTable } from "@/components/shared/loading-skeleton";
import { Building, Building2, Plus, TrendingUp } from "lucide-react";
import { PILLAR_KEYS } from "@/lib/types/advertis-vector";

export default function AgencyClientsPage() {
  const router = useRouter();
  const { data: clients, isLoading } = trpc.brandClient.list.useQuery({});
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const allClients = clients?.items ?? [];

  const filtered = allClients.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterValues.status && c.status !== filterValues.status) return false;
    return true;
  });

  const tableData = filtered.map((c) => {
    const brandCount = c._count?.strategies ?? 0;
    let avgScore = 0;
    if (c.strategies.length > 0) {
      const total = c.strategies.reduce((sum, s) => {
        const v = s.advertis_vector as Record<string, number> | null;
        return sum + (v ? PILLAR_KEYS.reduce((acc, k) => acc + (v[k] ?? 0), 0) : 0);
      }, 0);
      avgScore = total / c.strategies.length;
    }
    return {
      id: c.id,
      name: c.name,
      contactName: c.contactName ?? "-",
      sector: c.sector ?? "-",
      brandCount,
      avgScore,
      status: c.status,
      createdAt: c.createdAt,
    };
  });

  const columns = [
    {
      key: "name",
      header: "Client",
      render: (item: (typeof tableData)[0]) => (
        <div>
          <p className="font-medium text-white">{item.name}</p>
          <p className="text-xs text-zinc-500">{item.contactName}</p>
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
      key: "brandCount",
      header: "Marques",
      sortable: true,
      render: (item: (typeof tableData)[0]) => (
        <span className="text-sm font-medium text-white">{item.brandCount}</span>
      ),
    },
    {
      key: "avgScore",
      header: "Score ADVE moyen",
      sortable: true,
      render: (item: (typeof tableData)[0]) => (
        <span className="text-sm text-white">{item.avgScore.toFixed(0)}/200</span>
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
          title="Clients"
          breadcrumbs={[{ label: "Agence", href: "/agency" }, { label: "Clients" }]}
        />
        <SkeletonTable rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Clients"
          description={`${allClients.length} clients dans votre portefeuille`}
          breadcrumbs={[{ label: "Agence", href: "/agency" }, { label: "Clients" }]}
        />
        <Link
          href="/intake"
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition-all hover:bg-violet-500 hover:shadow-violet-500/30 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          Creer un client
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Total clients" value={allClients.length} icon={Building} />
        <StatCard
          title="Total marques"
          value={allClients.reduce((sum, c) => sum + (c._count?.strategies ?? 0), 0)}
          icon={Building2}
        />
        <StatCard title="Score ADVE moyen" value={`${tableData.length > 0 ? (tableData.reduce((s, c) => s + c.avgScore, 0) / tableData.length).toFixed(0) : 0}/200`} icon={TrendingUp} />
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
              { value: "PROSPECT", label: "Prospect" },
              { value: "ARCHIVED", label: "Archive" },
            ],
          },
        ]}
        filterValues={filterValues}
        onFilterChange={(key, value) => setFilterValues((prev) => ({ ...prev, [key]: value }))}
      />

      {tableData.length === 0 ? (
        <EmptyState
          icon={Building}
          title="Aucun client"
          description="Creez votre premier client via l'intake."
        />
      ) : (
        <DataTable
          data={tableData}
          columns={columns}
          pageSize={10}
          onRowClick={(item) => router.push(`/agency/clients/${item.id}`)}
        />
      )}
    </div>
  );
}
