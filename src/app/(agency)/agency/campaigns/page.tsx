"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SearchFilter } from "@/components/shared/search-filter";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonTable } from "@/components/shared/loading-skeleton";
import { Megaphone, Target, DollarSign, Activity } from "lucide-react";
import { PILLAR_KEYS } from "@/lib/types/advertis-vector";

export default function AgencyCampaignsPage() {
  const { data: campaigns, isLoading } = trpc.campaign.list.useQuery({});
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Campagnes" breadcrumbs={[{ label: "Agence", href: "/agency" }, { label: "Campagnes" }]} />
        <SkeletonTable rows={6} />
      </div>
    );
  }

  const items = (campaigns ?? []) as Array<Record<string, unknown>>;
  const activeCount = items.filter((c) => c.state === "IN_PROGRESS" || c.state === "ACTIVE" || c.status === "ACTIVE").length;
  const totalBudget = items.reduce((sum, c) => sum + (Number(c.budget) || 0), 0);
  const totalMissions = items.reduce((sum, c) => sum + (Array.isArray(c.missions) ? c.missions.length : 0), 0);

  const filtered = items.filter((c) => {
    const name = String(c.name ?? "");
    if (search && !name.toLowerCase().includes(search.toLowerCase())) return false;
    const state = String(c.state ?? c.status ?? "DRAFT");
    if (filterValues.status && state !== filterValues.status) return false;
    return true;
  });

  const tableData = filtered.map((c) => {
    const missions = Array.isArray(c.missions) ? c.missions : [];
    const v = c.advertis_vector as Record<string, number> | null;
    const adveScore = v ? PILLAR_KEYS.reduce((sum, k) => sum + (v[k] ?? 0), 0) : 0;
    return {
      id: String(c.id),
      name: String(c.name ?? "-"),
      state: String(c.state ?? c.status ?? "DRAFT"),
      budget: Number(c.budget) || 0,
      missionCount: missions.length,
      adveScore,
      createdAt: c.createdAt as string | null,
    };
  });

  const columns = [
    {
      key: "name",
      header: "Campagne",
      render: (item: (typeof tableData)[0]) => <span className="text-sm font-medium text-white">{item.name}</span>,
    },
    {
      key: "state",
      header: "Statut",
      sortable: true,
      render: (item: (typeof tableData)[0]) => <StatusBadge status={item.state} />,
    },
    {
      key: "budget",
      header: "Budget",
      sortable: true,
      render: (item: (typeof tableData)[0]) => (
        <span className="text-sm text-foreground-secondary">{item.budget > 0 ? `${item.budget.toLocaleString("fr-FR")} XAF` : "-"}</span>
      ),
    },
    {
      key: "missionCount",
      header: "Missions",
      sortable: true,
      render: (item: (typeof tableData)[0]) => <span className="text-sm text-white">{item.missionCount}</span>,
    },
    {
      key: "adveScore",
      header: "Score ADVE",
      sortable: true,
      render: (item: (typeof tableData)[0]) => (
        <span className="text-sm text-white">{item.adveScore > 0 ? `${item.adveScore.toFixed(0)}/200` : "-"}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Cree le",
      sortable: true,
      render: (item: (typeof tableData)[0]) => (
        <span className="text-xs text-foreground-secondary">{item.createdAt ? new Date(item.createdAt).toLocaleDateString("fr-FR") : "-"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campagnes"
        description={`${items.length} campagnes dans votre portefeuille`}
        breadcrumbs={[{ label: "Agence", href: "/agency" }, { label: "Campagnes" }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total campagnes" value={items.length} icon={Megaphone} />
        <StatCard title="Actives" value={activeCount} icon={Activity} />
        <StatCard title="Budget total" value={`${(totalBudget / 1000).toFixed(0)}k XAF`} icon={DollarSign} />
        <StatCard title="Missions liees" value={totalMissions} icon={Target} />
      </div>

      <SearchFilter
        placeholder="Rechercher une campagne..."
        value={search}
        onChange={setSearch}
        filters={[{
          key: "status",
          label: "Statut",
          options: [
            { value: "DRAFT", label: "Brouillon" },
            { value: "BRIEF_DRAFT", label: "Brief" },
            { value: "IN_PROGRESS", label: "En cours" },
            { value: "COMPLETED", label: "Terminee" },
          ],
        }]}
        filterValues={filterValues}
        onFilterChange={(key, value) => setFilterValues((prev) => ({ ...prev, [key]: value }))}
      />

      {tableData.length === 0 ? (
        <EmptyState icon={Megaphone} title="Aucune campagne" description="Les campagnes de vos clients apparaitront ici." />
      ) : (
        <DataTable data={tableData} columns={columns} pageSize={10} />
      )}
    </div>
  );
}
