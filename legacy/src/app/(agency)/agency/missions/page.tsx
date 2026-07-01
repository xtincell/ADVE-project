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
import { Target, AlertTriangle, Clock, CheckCircle } from "lucide-react";

export default function AgencyMissionsPage() {
  const { data: missions, isLoading } = trpc.mission.list.useQuery({});
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Missions" breadcrumbs={[{ label: "Agence", href: "/agency" }, { label: "Missions" }]} />
        <SkeletonTable rows={6} />
      </div>
    );
  }

  const items = (missions ?? []) as Array<Record<string, unknown>>;
  const inProgress = items.filter((m) => m.status === "IN_PROGRESS").length;
  const pendingQC = items.filter((m) => m.status === "PENDING_QC" || m.status === "IN_QC").length;
  const slaAlerts = items.filter((m) => {
    if (!m.slaDeadline) return false;
    const deadline = new Date(m.slaDeadline as string);
    return deadline < new Date() && m.status !== "COMPLETED" && m.status !== "ARCHIVED";
  }).length;

  const filtered = items.filter((m) => {
    const title = String(m.title ?? "");
    if (search && !title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterValues.status && m.status !== filterValues.status) return false;
    return true;
  });

  const tableData = filtered.map((m) => {
    const campaign = m.campaign as Record<string, unknown> | null;
    const driver = m.driver as Record<string, unknown> | null;
    const deliverables = Array.isArray(m.deliverables) ? m.deliverables : [];
    const slaDeadline = m.slaDeadline ? new Date(m.slaDeadline as string) : null;
    const isOverdue = slaDeadline && slaDeadline < new Date() && m.status !== "COMPLETED" && m.status !== "ARCHIVED";
    return {
      id: String(m.id),
      title: String(m.title ?? "-"),
      status: String(m.status ?? "DRAFT"),
      priority: String(m.priority ?? "-"),
      campaignName: campaign ? String(campaign.name ?? "-") : "-",
      driverChannel: driver ? String(driver.channel ?? "-") : "-",
      deliverableCount: deliverables.length,
      budget: Number(m.budget) || 0,
      slaDeadline,
      isOverdue,
      updatedAt: m.updatedAt as string | null,
    };
  });

  const columns = [
    {
      key: "title",
      header: "Mission",
      render: (item: (typeof tableData)[0]) => (
        <div>
          <p className="text-sm font-medium text-white">{item.title}</p>
          <p className="text-xs text-zinc-500">{item.campaignName}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Statut",
      sortable: true,
      render: (item: (typeof tableData)[0]) => <StatusBadge status={item.status} />,
    },
    {
      key: "priority",
      header: "Priorite",
      sortable: true,
      render: (item: (typeof tableData)[0]) => <span className="text-sm text-zinc-300">{item.priority}</span>,
    },
    {
      key: "driverChannel",
      header: "Canal",
      render: (item: (typeof tableData)[0]) => <span className="text-sm text-zinc-300">{item.driverChannel}</span>,
    },
    {
      key: "deliverableCount",
      header: "Livrables",
      sortable: true,
      render: (item: (typeof tableData)[0]) => <span className="text-sm text-white">{item.deliverableCount}</span>,
    },
    {
      key: "slaDeadline",
      header: "Deadline",
      sortable: true,
      render: (item: (typeof tableData)[0]) => (
        <span className={`text-xs ${item.isOverdue ? "font-semibold text-red-400" : "text-zinc-400"}`}>
          {item.slaDeadline ? item.slaDeadline.toLocaleDateString("fr-FR") : "-"}
          {item.isOverdue && " !"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Missions"
        description={`${items.length} missions dans votre portefeuille`}
        breadcrumbs={[{ label: "Agence", href: "/agency" }, { label: "Missions" }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total missions" value={items.length} icon={Target} />
        <StatCard title="En cours" value={inProgress} icon={Clock} />
        <StatCard title="En QC" value={pendingQC} icon={CheckCircle} />
        <StatCard title="Alertes SLA" value={slaAlerts} icon={AlertTriangle} trend={slaAlerts > 0 ? "down" : undefined} />
      </div>

      <SearchFilter
        placeholder="Rechercher une mission..."
        value={search}
        onChange={setSearch}
        filters={[{
          key: "status",
          label: "Statut",
          options: [
            { value: "DRAFT", label: "Brouillon" },
            { value: "OPEN", label: "Ouverte" },
            { value: "IN_PROGRESS", label: "En cours" },
            { value: "PENDING_QC", label: "En QC" },
            { value: "COMPLETED", label: "Terminee" },
          ],
        }]}
        filterValues={filterValues}
        onFilterChange={(key, value) => setFilterValues((prev) => ({ ...prev, [key]: value }))}
      />

      {tableData.length === 0 ? (
        <EmptyState icon={Target} title="Aucune mission" description="Les missions de vos clients apparaitront ici." />
      ) : (
        <DataTable data={tableData} columns={columns} pageSize={10} />
      )}
    </div>
  );
}
