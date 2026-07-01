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
import { FileSignature, CheckCircle, Clock, AlertTriangle } from "lucide-react";

export default function AgencyContractsPage() {
  const { data: contracts, isLoading } = trpc.contract.list.useQuery({});
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Contrats" breadcrumbs={[{ label: "Agence", href: "/agency" }, { label: "Contrats" }]} />
        <SkeletonTable rows={6} />
      </div>
    );
  }

  const items = (contracts ?? []) as Array<Record<string, unknown>>;
  const activeContracts = items.filter((c) => c.status === "ACTIVE" || c.status === "SIGNED").length;
  const totalValue = items.reduce((sum, c) => sum + (Number(c.value) || 0), 0);
  const now = new Date();
  const expiringSoon = items.filter((c) => {
    if (!c.endDate) return false;
    const end = new Date(c.endDate as string);
    const diff = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 30 && c.status !== "EXPIRED";
  }).length;

  const filtered = items.filter((c) => {
    const title = String(c.title ?? "");
    if (search && !title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterValues.status && c.status !== filterValues.status) return false;
    return true;
  });

  const tableData = filtered.map((c) => ({
    id: String(c.id),
    title: String(c.title ?? "-"),
    contractType: String(c.contractType ?? "-"),
    status: String(c.status ?? "DRAFT"),
    value: Number(c.value) || 0,
    startDate: c.startDate as string | null,
    endDate: c.endDate as string | null,
    signedAt: c.signedAt as string | null,
  }));

  const columns = [
    {
      key: "title",
      header: "Contrat",
      render: (item: (typeof tableData)[0]) => (
        <div>
          <p className="text-sm font-medium text-white">{item.title}</p>
          <p className="text-xs text-zinc-500">{item.contractType}</p>
        </div>
      ),
    },
    {
      key: "value",
      header: "Valeur",
      sortable: true,
      render: (item: (typeof tableData)[0]) => (
        <span className="text-sm text-white">{item.value > 0 ? `${item.value.toLocaleString("fr-FR")} XAF` : "-"}</span>
      ),
    },
    {
      key: "status",
      header: "Statut",
      sortable: true,
      render: (item: (typeof tableData)[0]) => <StatusBadge status={item.status} />,
    },
    {
      key: "startDate",
      header: "Debut",
      sortable: true,
      render: (item: (typeof tableData)[0]) => (
        <span className="text-xs text-zinc-400">{item.startDate ? new Date(item.startDate).toLocaleDateString("fr-FR") : "-"}</span>
      ),
    },
    {
      key: "endDate",
      header: "Fin",
      sortable: true,
      render: (item: (typeof tableData)[0]) => (
        <span className="text-xs text-zinc-400">{item.endDate ? new Date(item.endDate).toLocaleDateString("fr-FR") : "-"}</span>
      ),
    },
    {
      key: "signedAt",
      header: "Signe le",
      render: (item: (typeof tableData)[0]) => (
        <span className="text-xs text-zinc-400">{item.signedAt ? new Date(item.signedAt).toLocaleDateString("fr-FR") : "-"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contrats"
        description="Gestion des contrats de votre agence"
        breadcrumbs={[{ label: "Agence", href: "/agency" }, { label: "Contrats" }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total contrats" value={items.length} icon={FileSignature} />
        <StatCard title="Actifs" value={activeContracts} icon={CheckCircle} />
        <StatCard title="Valeur totale" value={`${(totalValue / 1000).toFixed(0)}k XAF`} icon={FileSignature} />
        <StatCard title="Expirent bientot" value={expiringSoon} icon={expiringSoon > 0 ? AlertTriangle : Clock} />
      </div>

      <SearchFilter
        placeholder="Rechercher un contrat..."
        value={search}
        onChange={setSearch}
        filters={[{
          key: "status",
          label: "Statut",
          options: [
            { value: "DRAFT", label: "Brouillon" },
            { value: "ACTIVE", label: "Actif" },
            { value: "SIGNED", label: "Signe" },
            { value: "EXPIRED", label: "Expire" },
          ],
        }]}
        filterValues={filterValues}
        onFilterChange={(key, value) => setFilterValues((prev) => ({ ...prev, [key]: value }))}
      />

      {tableData.length === 0 ? (
        <EmptyState icon={FileSignature} title="Aucun contrat" description="Les contrats apparaitront ici." />
      ) : (
        <DataTable data={tableData} columns={columns} pageSize={10} />
      )}
    </div>
  );
}
