"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SearchFilter } from "@/components/shared/search-filter";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ScoreBadge } from "@/components/shared/score-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonTable } from "@/components/shared/loading-skeleton";
import { Modal } from "@/components/shared/modal";
import { Filter, Plus, CheckCircle, Clock, ArrowRight } from "lucide-react";
import { PILLAR_KEYS, classifyBrand } from "@/lib/types/advertis-vector";

export default function AgencyIntakePage() {
  const { data: intakes, isLoading } = trpc.quickIntake.listAll.useQuery({ limit: 100 });
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pipeline Intake" breadcrumbs={[{ label: "Agence", href: "/agency" }, { label: "Pipeline Intake" }]} />
        <SkeletonTable rows={6} />
      </div>
    );
  }

  const items = intakes?.items ?? [];
  const completed = items.filter((i) => i.status === "COMPLETED").length;
  const inProgress = items.filter((i) => i.status === "IN_PROGRESS").length;
  const converted = items.filter((i) => i.status === "CONVERTED").length;
  const conversionRate = completed + converted > 0 ? ((converted / (completed + converted)) * 100).toFixed(0) : "0";

  const filtered = items.filter((i) => {
    if (search && !i.companyName.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterValues.status && i.status !== filterValues.status) return false;
    return true;
  });

  const tableData = filtered.map((i) => {
    const v = i.advertis_vector as Record<string, number> | null;
    const composite = v ? PILLAR_KEYS.reduce((sum, k) => sum + (v[k] ?? 0), 0) : 0;
    return {
      id: i.id,
      companyName: i.companyName,
      contactName: i.contactName ?? "-",
      contactEmail: i.contactEmail ?? "-",
      sector: i.sector ?? "-",
      status: i.status,
      composite,
      classification: i.classification ?? (composite > 0 ? classifyBrand(composite) : "-"),
      createdAt: i.createdAt,
    };
  });

  const selected = items.find((i) => i.id === selectedId);

  const columns = [
    {
      key: "companyName",
      header: "Entreprise",
      render: (item: (typeof tableData)[0]) => (
        <div>
          <p className="text-sm font-medium text-white">{item.companyName}</p>
          <p className="text-xs text-zinc-500">{item.contactName}</p>
        </div>
      ),
    },
    {
      key: "contactEmail",
      header: "Email",
      render: (item: (typeof tableData)[0]) => <span className="text-sm text-zinc-300">{item.contactEmail}</span>,
    },
    {
      key: "sector",
      header: "Secteur",
      render: (item: (typeof tableData)[0]) => <span className="text-sm text-zinc-300">{item.sector}</span>,
    },
    {
      key: "composite",
      header: "Score ADVE",
      sortable: true,
      render: (item: (typeof tableData)[0]) => item.composite > 0 ? <ScoreBadge score={item.composite} /> : <span className="text-xs text-zinc-500">-</span>,
    },
    {
      key: "classification",
      header: "Classification",
      render: (item: (typeof tableData)[0]) => <StatusBadge status={item.classification} />,
    },
    {
      key: "status",
      header: "Statut",
      sortable: true,
      render: (item: (typeof tableData)[0]) => <StatusBadge status={item.status} />,
    },
    {
      key: "createdAt",
      header: "Date",
      sortable: true,
      render: (item: (typeof tableData)[0]) => (
        <span className="text-xs text-zinc-400">{item.createdAt ? new Date(item.createdAt).toLocaleDateString("fr-FR") : "-"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Pipeline Intake"
          description={`${items.length} intakes — taux de conversion ${conversionRate}%`}
          breadcrumbs={[{ label: "Agence", href: "/agency" }, { label: "Pipeline Intake" }]}
        />
        <Link
          href="/intake"
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition-all hover:bg-violet-500 hover:shadow-violet-500/30 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          Nouvel intake
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total intakes" value={items.length} icon={Filter} />
        <StatCard title="En cours" value={inProgress} icon={Clock} />
        <StatCard title="Completes" value={completed} icon={CheckCircle} />
        <StatCard title="Convertis" value={converted} icon={ArrowRight} trendValue={`${conversionRate}%`} />
      </div>

      <SearchFilter
        placeholder="Rechercher un intake..."
        value={search}
        onChange={setSearch}
        filters={[{
          key: "status",
          label: "Statut",
          options: [
            { value: "IN_PROGRESS", label: "En cours" },
            { value: "COMPLETED", label: "Complete" },
            { value: "CONVERTED", label: "Converti" },
            { value: "EXPIRED", label: "Expire" },
          ],
        }]}
        filterValues={filterValues}
        onFilterChange={(key, value) => setFilterValues((prev) => ({ ...prev, [key]: value }))}
      />

      {tableData.length === 0 ? (
        <EmptyState icon={Filter} title="Aucun intake" description="Lancez un diagnostic pour commencer." />
      ) : (
        <DataTable
          data={tableData}
          columns={columns}
          pageSize={10}
          onRowClick={(item) => setSelectedId(item.id)}
        />
      )}

      {/* Detail Modal */}
      <Modal open={!!selectedId} onClose={() => setSelectedId(null)} title={selected?.companyName ?? "Detail"} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-zinc-500">Contact</p>
                <p className="text-sm text-white">{selected.contactName ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Email</p>
                <p className="text-sm text-white">{selected.contactEmail ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Secteur</p>
                <p className="text-sm text-white">{selected.sector ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Pays</p>
                <p className="text-sm text-white">{selected.country ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Statut</p>
                <StatusBadge status={selected.status} />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Classification</p>
                <StatusBadge status={selected.classification ?? "-"} />
              </div>
            </div>
            {selected.positioning && (
              <div>
                <p className="text-xs text-zinc-500">Positionnement</p>
                <p className="text-sm text-zinc-300">{selected.positioning}</p>
              </div>
            )}
            {selected.shareToken && (
              <div className="pt-2 border-t border-zinc-800">
                <p className="text-xs text-zinc-500">Lien de partage</p>
                <code className="text-xs text-violet-400">/intake/{selected.shareToken}</code>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
